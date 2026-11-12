import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker file via Vite URL resolution or fallback to unpkg
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('Worker URL resolution fallback:', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

import { PDFDocument } from 'pdf-lib';

export interface RenderedPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Searches the first 4096 bytes for the "%PDF" magic signature (0x25, 0x50, 0x44, 0x46).
 * Returns the byte index of the start of the PDF header, or -1 if not found.
 */
export function findPdfHeaderOffset(bytes: Uint8Array): number {
  const limit = Math.min(bytes.length - 4, 4096);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 // F
    ) {
      return i;
    }
  }
  return -1;
}

export async function loadPdfDocument(data: ArrayBuffer | Uint8Array) {
  let rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // 1. Strip any leading Byte Order Mark (BOM), whitespace, or scanner headers before %PDF
  const offset = findPdfHeaderOffset(rawBytes);
  if (offset > 0) {
    rawBytes = rawBytes.subarray(offset);
  }

  // Always clone the incoming data so that PDF.js worker transfer never detaches the original buffer
  const clonedBytes = new Uint8Array(rawBytes.byteLength);
  clonedBytes.set(rawBytes);

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: clonedBytes,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    return await loadingTask.promise;
  } catch (err: any) {
    console.warn('PDF.js initial parse failed, attempting pdf-lib structural repair:', err?.message || err);

    // 2. Self-repair attempt using pdf-lib: re-saves the document to rebuild corrupted XRef tables
    try {
      const repairDoc = await PDFDocument.load(rawBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });
      const repairedBytes = await repairDoc.save();
      const retryTask = pdfjsLib.getDocument({
        data: repairedBytes,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });
      return await retryTask.promise;
    } catch (repairErr) {
      console.error('PDF structural repair also failed:', repairErr);
      throw err;
    }
  }
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<RenderedPageInfo> {
  // If a previous render task is still in progress on this canvas, cancel it cleanly
  const prevTask = (canvas as any)._activeRenderTask;
  if (prevTask) {
    try {
      prevTask.cancel();
      await prevTask.promise.catch(() => {});
    } catch {
      // Ignore cancellation exceptions from previous task
    }
    (canvas as any)._activeRenderTask = null;
  }

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Handle device pixel ratio for super-crisp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  // @ts-expect-error pdfjs-dist types
  const renderTask = page.render(renderContext);
  (canvas as any)._activeRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    // Gracefully handle cancelled tasks without throwing unhandled exceptions
    if (
      err?.name === 'RenderingCancelledException' ||
      err?.message?.toLowerCase().includes('cancelled')
    ) {
      const originalViewport = page.getViewport({ scale: 1.0 });
      return {
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        originalWidth: originalViewport.width,
        originalHeight: originalViewport.height,
      };
    }
    throw err;
  } finally {
    if ((canvas as any)._activeRenderTask === renderTask) {
      (canvas as any)._activeRenderTask = null;
    }
  }

  const originalViewport = page.getViewport({ scale: 1.0 });

  return {
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    originalWidth: originalViewport.width,
    originalHeight: originalViewport.height,
  };
}

export interface ExtractedTextLine {
  pageNumber: number;
  text: string;
  xMin: number;
  xMax: number;
  y: number;
  pageWidth: number;
  pageHeight: number;
  isCentered: boolean;
}

interface PositionedTextChunk {
  str: string;
  vx: number;
  vy: number;
  width: number;
}

export async function extractFullTextFromPdf(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<{
  fullText: string;
  pagesText: { pageNumber: number; text: string }[];
  linesInfo: ExtractedTextLine[];
}> {
  const pagesText: { pageNumber: number; text: string }[] = [];
  const linesInfo: ExtractedTextLine[] = [];
  let combined = '';

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const m = viewport.transform;
      const pageWidth = viewport.width || 612;
      const pageHeight = viewport.height || 792;

      const chunks: PositionedTextChunk[] = [];

      for (const item of textContent.items) {
        if ('str' in item) {
          const textItem = item as {
            str: string;
            width?: number;
            hasEOL?: boolean;
            transform?: number[];
          };
          const rawStr = textItem.str;
          if (!rawStr || !rawStr.trim()) continue;

          const t = textItem.transform;
          let vx = 0;
          let vy = 0;
          if (t && t.length >= 6) {
            vx = m[0] * t[4] + m[2] * t[5] + m[4];
            vy = m[1] * t[4] + m[3] * t[5] + m[5];
          }

          const estimatedWidth =
            typeof textItem.width === 'number' && textItem.width > 0
              ? textItem.width
              : rawStr.trim().length * 5;

          chunks.push({
            str: rawStr,
            vx,
            vy,
            width: estimatedWidth,
          });
        }
      }

      // Sort visually top-to-bottom (vy ascending in viewport coords), then left-to-right (vx ascending)
      chunks.sort((a, b) => {
        if (Math.abs(a.vy - b.vy) > 5) {
          return a.vy - b.vy;
        }
        return a.vx - b.vx;
      });

      // Group chunks into visual horizontal lines using a 5pt vertical tolerance
      const rows: { anchorY: number; items: PositionedTextChunk[] }[] = [];
      for (const chunk of chunks) {
        const existingRow = rows.find((r) => Math.abs(r.anchorY - chunk.vy) <= 5);
        if (existingRow) {
          existingRow.items.push(chunk);
        } else {
          rows.push({ anchorY: chunk.vy, items: [chunk] });
        }
      }

      const pageLines: string[] = [];

      for (const row of rows) {
        row.items.sort((a, b) => a.vx - b.vx);

        let lineText = '';
        let prevEndX: number | null = null;
        let xMin = Infinity;
        let xMax = -Infinity;

        for (const chunk of row.items) {
          const trimmedChunk = chunk.str.trim();
          if (!trimmedChunk) continue;

          if (chunk.vx < xMin) xMin = chunk.vx;
          if (chunk.vx + chunk.width > xMax) xMax = chunk.vx + chunk.width;

          if (lineText.length === 0) {
            lineText = chunk.str.trimStart();
          } else {
            const gap = prevEndX !== null ? chunk.vx - prevEndX : 0;
            const needsSpace =
              !lineText.endsWith(' ') &&
              !chunk.str.startsWith(' ') &&
              (gap > 1.5 || lineText.endsWith(':') || /^[A-Za-z0-9]/.test(trimmedChunk));
            lineText += (needsSpace ? ' ' : '') + chunk.str.trimStart();
          }
          prevEndX = chunk.vx + chunk.width;
        }

        const cleanedLine = lineText.replace(/\s+/g, ' ').trim();
        if (!cleanedLine) continue;

        pageLines.push(cleanedLine);

        if (xMin < Infinity && xMax > -Infinity) {
          const leftMargin = Math.max(0, xMin);
          const rightMargin = Math.max(0, pageWidth - xMax);
          const lineWidth = Math.max(0, xMax - xMin);
          const lineCenter = (xMin + xMax) / 2;
          const centerOffset = Math.abs(lineCenter - pageWidth / 2);
          const marginDiff = Math.abs(leftMargin - rightMargin);

          // Centered detection: midpoint close to page center and balanced/indented margins
          // Excludes wide full-width justified paragraph lines starting at normal left margins
          const isCentered =
            lineWidth > 0 &&
            centerOffset <= pageWidth * 0.12 &&
            ((leftMargin >= pageWidth * 0.17 && rightMargin >= pageWidth * 0.17 && lineWidth < pageWidth * 0.68) ||
              (leftMargin >= pageWidth * 0.13 &&
                rightMargin >= pageWidth * 0.13 &&
                marginDiff <= pageWidth * 0.08 &&
                lineWidth < pageWidth * 0.74 &&
                cleanedLine.length <= 95));

          linesInfo.push({
            pageNumber: i,
            text: cleanedLine,
            xMin,
            xMax,
            y: row.anchorY,
            pageWidth,
            pageHeight,
            isCentered,
          });
        }
      }

      const trimmedPageStr = pageLines.join('\n').trim();
      pagesText.push({ pageNumber: i, text: trimmedPageStr });
      combined += (combined ? '\n\n' : '') + `[PAGE ${i}]\n` + trimmedPageStr;
    } catch (e) {
      console.warn(`Error extracting text from page ${i}:`, e);
    }
  }

  return { fullText: combined, pagesText, linesInfo };
}

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

export async function extractFullTextFromPdf(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<{
  fullText: string;
  pagesText: { pageNumber: number; text: string }[];
}> {
  const pagesText: { pageNumber: number; text: string }[] = [];
  let combined = '';

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      let pageStr = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ('str' in item) {
          const textItem = item as { str: string; hasEOL?: boolean; transform?: number[] };
          const str = textItem.str;
          if (!str && !textItem.hasEOL) continue;

          const transform = textItem.transform;
          const currentY = transform && transform.length >= 6 ? transform[5] : null;
          const hasEOL = Boolean(textItem.hasEOL);

          const isNewline =
            hasEOL ||
            (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4);

          if (isNewline) {
            if (pageStr.length > 0 && !pageStr.endsWith('\n')) {
              pageStr += '\n';
            }
            pageStr += str;
          } else {
            if (pageStr.length > 0 && !pageStr.endsWith('\n') && !pageStr.endsWith(' ') && str.length > 0) {
              pageStr += ' ';
            }
            pageStr += str;
          }

          if (currentY !== null) {
            lastY = currentY;
          }
        }
      }

      const trimmedPageStr = pageStr.trim();
      pagesText.push({ pageNumber: i, text: trimmedPageStr });
      combined += (combined ? '\n\n' : '') + `[PAGE ${i}]\n` + trimmedPageStr;
    } catch (e) {
      console.warn(`Error extracting text from page ${i}:`, e);
    }
  }

  return { fullText: combined, pagesText };
}


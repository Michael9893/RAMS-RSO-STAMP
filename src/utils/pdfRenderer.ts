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

export interface RenderedPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export async function loadPdfDocument(data: ArrayBuffer | Uint8Array) {
  // Always clone the incoming data so that PDF.js worker transfer never detaches the original buffer
  const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const clonedBytes = new Uint8Array(rawBytes.byteLength);
  clonedBytes.set(rawBytes);

  const loadingTask = pdfjsLib.getDocument({
    data: clonedBytes,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });
  return await loadingTask.promise;
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
      const strings = textContent.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .filter((s) => s.trim().length > 0);
      const pageStr = strings.join(' ');
      pagesText.push({ pageNumber: i, text: pageStr });
      combined += (combined ? '\n\n' : '') + `[PAGE ${i}]\n` + pageStr;
    } catch (e) {
      console.warn(`Error extracting text from page ${i}:`, e);
    }
  }

  return { fullText: combined, pagesText };
}


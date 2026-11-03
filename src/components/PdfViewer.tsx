import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import { renderPdfPageToCanvas, RenderedPageInfo } from '../utils/pdfRenderer';
import { StampConfig } from '../utils/pdfStamper';
import { StampOverlay } from './StampOverlay';

interface PdfViewerProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  stamp: StampConfig;
  onPageChange: (newPage: number) => void;
  onStampPositionChange: (xPercent: number, yPercent: number) => void;
  onStampNudge: (deltaX: number, deltaY: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  currentPage,
  totalPages,
  stamp,
  onPageChange,
  onStampPositionChange,
  onStampNudge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [renderedInfo, setRenderedInfo] = useState<RenderedPageInfo | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isStampSelected, setIsStampSelected] = useState<boolean>(true);

  // Render current page when document, page number, or scale changes
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) return;
      setIsRendering(true);
      try {
        const info = await renderPdfPageToCanvas(
          pdfDocument,
          currentPage,
          canvasRef.current,
          scale
        );
        if (!isCancelled) {
          setRenderedInfo(info);
        }
      } catch (err) {
        console.error('Failed to render PDF page:', err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, currentPage, scale]);

  // Handle keyboard arrow keys for nudging the stamp
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const step = e.shiftKey ? 1.0 : 0.2; // percentage points

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStampNudge(-step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStampNudge(step, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onStampNudge(0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onStampNudge(0, step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStampNudge]);

  // Click on canvas to jump the stamp to that location
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
      return;
    }

    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    onStampPositionChange(
      Number(Math.max(0, Math.min(95, xPercent)).toFixed(2)),
      Number(Math.max(0, Math.min(95, yPercent)).toFixed(2))
    );
    setIsStampSelected(true);
  };

  const handleZoomIn = () => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))));
  const handleZoomReset = () => setScale(1.0);
  const handleFitWidth = () => {
    if (containerRef.current && renderedInfo) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const newScale = containerWidth / renderedInfo.originalWidth;
      setScale(Number(Math.max(0.6, Math.min(2.2, newScale)).toFixed(2)));
    }
  };

  const shouldDisplayStampOnThisPage =
    stamp.applyToAllPages || stamp.pageNumber === currentPage;

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative">
      {/* Viewport Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Page Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-slate-700 tabular-nums">
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tip / Stamping Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
          <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
          <span>Click anywhere to move stamp · Drag or use Arrow keys to nudge</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomReset}
            className="px-2 py-1 text-xs font-mono text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Reset to 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFitWidth}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Fit to width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center cursor-crosshair relative"
        onClick={handleCanvasClick}
      >
        <div className="relative shadow-xl bg-white border border-slate-300 rounded-xs select-none">
          {/* PDF Page Canvas */}
          <canvas ref={canvasRef} className="block pointer-events-none" />

          {/* Stamped Number Overlay */}
          {shouldDisplayStampOnThisPage && renderedInfo && (
            <StampOverlay
              stamp={stamp}
              containerWidth={renderedInfo.width}
              containerHeight={renderedInfo.height}
              scale={scale}
              isSelected={isStampSelected}
              onSelect={() => setIsStampSelected(true)}
              onPositionChange={onStampPositionChange}
            />
          )}

          {/* Render spinner */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center z-30">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 text-white rounded-lg text-xs font-medium">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Rendering Page...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

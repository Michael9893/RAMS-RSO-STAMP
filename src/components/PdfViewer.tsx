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
  AlignLeft,
  FileText,
  Search,
  Copy,
  Check,
  Columns,
  Hash,
  Sparkles,
} from 'lucide-react';
import { renderPdfPageToCanvas, RenderedPageInfo } from '../utils/pdfRenderer';
import { StampConfig } from '../utils/pdfStamper';
import { StampOverlay } from './StampOverlay';

interface PdfViewerProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  stamp: StampConfig;
  extractedFullText?: string;
  pagesText?: { pageNumber: number; text: string }[];
  onPageChange: (newPage: number) => void;
  onStampPositionChange: (xPercent: number, yPercent: number) => void;
  onStampNudge: (deltaX: number, deltaY: number) => void;
  onApplyStampNumber?: (text: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  currentPage,
  totalPages,
  stamp,
  extractedFullText = '',
  pagesText = [],
  onPageChange,
  onStampPositionChange,
  onStampNudge,
  onApplyStampNumber,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [renderedInfo, setRenderedInfo] = useState<RenderedPageInfo | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isStampSelected, setIsStampSelected] = useState<boolean>(true);

  // View Mode: 'document' (visual canvas), 'split' (both), or 'text' (extracted text only)
  const [viewMode, setViewMode] = useState<'document' | 'split' | 'text'>('document');
  const [selectedTextPage, setSelectedTextPage] = useState<number | 'all'>('all');
  const [textSearchQuery, setTextSearchQuery] = useState<string>('');
  const [isTextCopied, setIsTextCopied] = useState<boolean>(false);

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
      const containerWidth = containerRef.current.clientWidth - 48;
      const newScale = containerWidth / renderedInfo.originalWidth;
      setScale(Number(Math.max(0.6, Math.min(2.2, newScale)).toFixed(2)));
    }
  };

  const shouldDisplayStampOnThisPage =
    stamp.applyToAllPages || stamp.pageNumber === currentPage;

  // Active text to display in text inspector
  const displayText =
    selectedTextPage === 'all'
      ? extractedFullText
      : pagesText.find((p) => p.pageNumber === selectedTextPage)?.text ||
        `[No text content extracted on Page ${selectedTextPage}]`;

  const wordCount = displayText.split(/\s+/).filter(Boolean).length;
  const totalExtractedWords = extractedFullText.split(/\s+/).filter(Boolean).length;

  const handleCopyText = () => {
    navigator.clipboard.writeText(displayText);
    setIsTextCopied(true);
    setTimeout(() => setIsTextCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden relative">
      {/* Viewport Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        {/* Left: View Mode Tabs (Visual Canvas, Split View, Extracted Text) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('document')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'document'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visual document preview with draggable stamp"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Visual PDF</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="View visual PDF and extracted text side-by-side"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Split View</span>
          </button>

          <button
            onClick={() => setViewMode('text')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'text'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="View all text extracted from the PDF file"
          >
            <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Extracted Text</span>
            {totalExtractedWords > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.2 rounded-full font-bold">
                {totalExtractedWords}w
              </span>
            )}
          </button>
        </div>

        {/* Center: Page Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
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

        {/* Right: Zoom Controls */}
        {viewMode !== 'text' && (
          <div className="flex items-center gap-1">
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
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors hidden sm:block"
              title="Fit to width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        {/* 1. VISUAL PDF CANVAS VIEWPORT (Shown in 'document' or 'split') */}
        {viewMode !== 'text' && (
          <div
            ref={containerRef}
            className={`flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center cursor-crosshair relative ${
              viewMode === 'split' ? 'border-r border-slate-200' : ''
            }`}
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
        )}

        {/* 2. EXTRACTED PDF TEXT SECTION (Shown in 'split' or 'text') */}
        {(viewMode === 'text' || viewMode === 'split') && (
          <div
            className={`${
              viewMode === 'text' ? 'flex-1' : 'w-full md:w-96 lg:w-[460px]'
            } flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden shadow-xs`}
          >
            {/* Extracted Text Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Extracted Text from PDF
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {wordCount} words
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                    title="Copy displayed text to clipboard"
                  >
                    {isTextCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Page Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setSelectedTextPage('all')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded whitespace-nowrap transition-colors ${
                    selectedTextPage === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  All Pages ({totalPages})
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedTextPage(p)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded whitespace-nowrap transition-colors ${
                      selectedTextPage === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    Page {p}
                  </button>
                ))}
              </div>

              {/* Text Search Filter */}
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={textSearchQuery}
                  onChange={(e) => setTextSearchQuery(e.target.value)}
                  placeholder="Find text or numbers in document..."
                  className="w-full pl-7 pr-3 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Extracted Text Content Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs leading-relaxed text-slate-800 bg-slate-50/50">
              {pagesText.length > 0 ? (
                pagesText
                  .filter((p) => selectedTextPage === 'all' || p.pageNumber === selectedTextPage)
                  .map((pageItem) => {
                    const pageText = pageItem.text.trim();
                    const words = pageText.split(/\s+/).filter(Boolean);

                    return (
                      <div
                        key={pageItem.pageNumber}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-slate-500 text-[11px]">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>PAGE {pageItem.pageNumber} OF {totalPages}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {words.length} words
                          </span>
                        </div>

                        {/* Page Extracted Content */}
                        <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-800 select-text font-mono">
                          {pageText || (
                            <span className="text-slate-400 italic">
                              (No readable text detected on this page - scanned or graphical page)
                            </span>
                          )}
                        </div>

                        {/* Detected numbers/codes in this page */}
                        {onApplyStampNumber && words.some((w) => /\d/.test(w)) && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block mb-1">
                              Detected numbers/codes (click to stamp):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(words.filter((w) => /\d/.test(w) && w.length >= 3)))
                                .slice(0, 6)
                                .map((numCode) => (
                                  <button
                                    key={numCode}
                                    onClick={() => onApplyStampNumber(numCode.replace(/[^\w-]/g, ''))}
                                    className="px-2 py-0.5 text-[10px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold transition-colors flex items-center gap-1"
                                    title={`Click to set stamp to "${numCode}"`}
                                  >
                                    <Hash className="w-2.5 h-2.5" />
                                    <span>{numCode}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <AlignLeft className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600 text-xs">
                    No text extracted yet
                  </p>
                  <p className="text-[11px]">
                    Text will appear automatically when a PDF is loaded.
                  </p>
                </div>
              )}
            </div>

            {/* Extracted Text Footer */}
            <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span>Extracted directly from PDF content streams</span>
              <button
                onClick={() => setViewMode('document')}
                className="text-blue-700 font-semibold hover:underline"
              >
                Back to Visual Canvas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

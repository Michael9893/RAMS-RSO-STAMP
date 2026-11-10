import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  CheckCircle2,
  X,
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  Crosshair,
  RefreshCw,
  Check,
} from 'lucide-react';
import { StampConfig, stampPdfDocument } from '../utils/pdfStamper';
import { loadPdfDocument, renderPdfPageToCanvas } from '../utils/pdfRenderer';

interface DownloadModalProps {
  isOpen: boolean;
  pdfBytes: ArrayBuffer | null;
  filename: string;
  totalPages: number;
  currentPage: number;
  stamp: StampConfig;
  isProcessing: boolean;
  onClose: () => void;
  onConfirmDownload: (selectedPages: number[], customFilename: string) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  pdfBytes,
  filename,
  totalPages,
  currentPage,
  stamp,
  isProcessing,
  onClose,
  onConfirmDownload,
}) => {
  // Array of selected 1-indexed page numbers
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState<string>('');

  // Live Stamped PDF Preview state
  const [previewPageNumber, setPreviewPageNumber] = useState<number>(currentPage || 1);
  const [previewScale, setPreviewScale] = useState<number>(1.1);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [showAlignmentCrosshair, setShowAlignmentCrosshair] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize selected pages when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewPageNumber(currentPage || 1);
      if (totalPages <= 1) {
        setSelectedPages([1]);
        setRangeInput('1');
      } else {
        const all = Array.from({ length: totalPages }, (_, i) => i + 1);
        setSelectedPages(all);
        setRangeInput(`1-${totalPages}`);
      }
    }
  }, [isOpen, totalPages, currentPage]);

  const baseDocName = (filename || 'document').replace(/\.pdf$/i, '');
  const cleanStampNum = stamp.number.replace(/[^\w-]/g, '_') || 'stamped';

  const getSuggestedFilename = (pages: number[]) => {
    const prefixTag = stamp.prefix ? stamp.prefix.replace(/[^\w-]/g, '').trim() + '_' : '';
    if (pages.length === totalPages) {
      return `${baseDocName}_${prefixTag}${cleanStampNum}.pdf`;
    } else if (pages.length === 1) {
      return `${baseDocName}_p${pages[0]}_${prefixTag}${cleanStampNum}.pdf`;
    } else {
      const pageListStr = pages.slice(0, 3).join('_');
      const moreStr = pages.length > 3 ? `_and_${pages.length - 3}more` : '';
      return `${baseDocName}_pages_${pageListStr}${moreStr}_${prefixTag}${cleanStampNum}.pdf`;
    }
  };

  const [outputFilename, setOutputFilename] = useState<string>('');

  useEffect(() => {
    if (selectedPages.length > 0) {
      setOutputFilename(getSuggestedFilename(selectedPages));
    }
  }, [selectedPages, totalPages, stamp.prefix, stamp.number]);

  // Generate and render the actual stamped PDF page onto preview canvas
  useEffect(() => {
    const sourceBytes = pdfBytes;
    if (!isOpen || !sourceBytes) return;

    let isMounted = true;

    async function generateAndRenderPreview() {
      if (!sourceBytes) return;
      setIsPreviewLoading(true);
      try {
        // Generate stamped PDF in memory
        const stampedBytes = await stampPdfDocument(sourceBytes.slice(0), stamp);
        if (!isMounted) return;

        // Load into PDF.js
        const stampedPdf = await loadPdfDocument(stampedBytes);
        if (!isMounted) return;

        if (previewCanvasRef.current) {
          await renderPdfPageToCanvas(
            stampedPdf,
            previewPageNumber,
            previewCanvasRef.current,
            previewScale
          );
        }
      } catch (err: any) {
        if (
          err?.name !== 'RenderingCancelledException' &&
          !err?.message?.toLowerCase().includes('cancelled')
        ) {
          console.error('Failed to generate stamped preview:', err);
        }
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false);
        }
      }
    }

    generateAndRenderPreview();

    return () => {
      isMounted = false;
      if (previewCanvasRef.current && (previewCanvasRef.current as any)._activeRenderTask) {
        try {
          (previewCanvasRef.current as any)._activeRenderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, pdfBytes, stamp, previewPageNumber, previewScale]);

  if (!isOpen) return null;

  // Toggle a single page checkbox
  const togglePage = (pageNum: number) => {
    let next: number[];
    if (selectedPages.includes(pageNum)) {
      if (selectedPages.length === 1) return;
      next = selectedPages.filter((p) => p !== pageNum);
    } else {
      next = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(next);
    setRangeInput(formatPageNumbersToRange(next));
  };

  const handleSelectAll = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(totalPages > 1 ? `1-${totalPages}` : '1');
  };

  const handleSelectCurrentOnly = () => {
    setSelectedPages([previewPageNumber]);
    setRangeInput(String(previewPageNumber));
  };

  const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parsePageRangeString(val, totalPages);
    if (parsed.length > 0) {
      setSelectedPages(parsed);
    }
  };

  const isAllSelected = selectedPages.length === totalPages;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                Live Alignment Preview & PDF Download
              </h3>
              <p className="text-[11px] text-slate-500">
                Inspect the actual generated PDF stamp alignment before downloading
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2-column on desktop (Left: Stamped PDF Canvas Preview, Right: Download Settings) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* LEFT: LIVE STAMPED PDF ALIGNMENT PREVIEW */}
          <div className="flex-1 flex flex-col bg-slate-100 border-r border-slate-200 overflow-hidden relative">
            {/* Preview Toolbar */}
            <div className="p-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-800 text-[11px]">Actual Stamped PDF Preview</span>
                {totalPages > 1 && (
                  <select
                    value={previewPageNumber}
                    onChange={(e) => setPreviewPageNumber(Number(e.target.value))}
                    className="ml-1 text-[11px] font-medium border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p} of {totalPages}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Zoom & Alignment Guide Toggle */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAlignmentCrosshair((prev) => !prev)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border transition-colors ${
                    showAlignmentCrosshair
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Toggle alignment guide lines"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Guide</span>
                </button>

                <button
                  onClick={() => setPreviewScale((s) => Math.max(0.7, Number((s - 0.2).toFixed(1))))}
                  className="p-1 rounded text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>

                <span className="text-[10px] font-mono text-slate-600 px-1">
                  {Math.round(previewScale * 100)}%
                </span>

                <button
                  onClick={() => setPreviewScale((s) => Math.min(2.2, Number((s + 0.2).toFixed(1))))}
                  className="p-1 rounded text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Canvas Scroll Container */}
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-auto p-4 flex items-start justify-center relative select-none"
            >
              <div className="relative shadow-md bg-white border border-slate-300 rounded-xs">
                {/* The actual stamped PDF canvas */}
                <canvas ref={previewCanvasRef} className="block" />

                {/* Alignment Crosshair / Indicator Overlay */}
                {showAlignmentCrosshair && (
                  <div
                    style={{
                      left: `${stamp.xPercent}%`,
                      top: `${stamp.yPercent}%`,
                    }}
                    className="absolute pointer-events-none transform -translate-x-1 -translate-y-1 border border-blue-500/80 bg-blue-500/10 rounded-xs px-1.5 py-0.5"
                  >
                    <span className="text-[9px] font-mono text-blue-800 font-bold bg-white/90 px-1 rounded shadow-2xs">
                      Alignment: {stamp.xPercent.toFixed(1)}%, {stamp.yPercent.toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Loading indicator */}
                {isPreviewLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span>Rendering Stamped PDF...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Alignment Verification Tip Banner */}
            <div className="p-2 bg-blue-50/80 border-t border-blue-200 flex items-center justify-between text-[11px] text-blue-900 shrink-0 px-3">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong>100% Vector Output Verified:</strong> Stamp is rendered directly into the PDF stream.
                </span>
              </span>
              <span className="font-mono text-[10px] text-blue-700">
                {stamp.prefix}{stamp.number} ({stamp.fontSize}pt {stamp.fontFamily})
              </span>
            </div>
          </div>

          {/* RIGHT: DOWNLOAD OPTIONS & PAGE SELECTION */}
          <div className="w-full md:w-80 lg:w-92 p-4 bg-white flex flex-col justify-between overflow-y-auto shrink-0 space-y-4">
            <div className="space-y-4">
              {/* Active Stamp Summary Badge */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Stamp to bake:</span>
                <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 truncate max-w-[140px]">
                  {stamp.prefix}{stamp.number}{stamp.suffix}
                </span>
              </div>

              {/* Page Selection Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pages to Download:</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedPages.length} of {totalPages} selected
                  </span>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                      isAllSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Pages ({totalPages})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectCurrentOnly}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                      selectedPages.length === 1 && selectedPages[0] === previewPageNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Page {previewPageNumber} only
                  </button>
                </div>

                {/* Interactive Page Selection Grid */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Click page to include or exclude:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isSelected = selectedPages.includes(pageNum);
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => togglePage(pageNum)}
                          className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 select-none ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                          }`}
                        >
                          <span className="text-[10px]">P.{pageNum}</span>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Page Range text input */}
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">
                    Page range (e.g. 1, 3-4):
                  </span>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={handleRangeInputChange}
                    placeholder="e.g. 1, 3-4"
                    className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Output Filename */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Downloaded File Name:
                </label>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  placeholder="document_stamped.pdf"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                disabled={isProcessing || selectedPages.length === 0}
                onClick={() => onConfirmDownload(selectedPages, outputFilename)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-99 text-white font-bold text-xs md:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Baking & Downloading PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      Download {selectedPages.length === 1 ? '1 Page' : `${selectedPages.length} Pages`}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back to Document Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatPageNumbersToRange(pages: number[]): string {
  if (pages.length === 0) return '';
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      if (start === prev) {
        parts.push(String(start));
      } else if (prev === start + 1) {
        parts.push(`${start}, ${prev}`);
      } else {
        parts.push(`${start}-${prev}`);
      }
      start = current;
      prev = current;
    }
  }

  return parts.join(', ');
}

function parsePageRangeString(str: string, maxPages: number): number[] {
  const result = new Set<number>();
  const tokens = str.split(/[,;\s]+/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    if (token.includes('-')) {
      const [fromStr, toStr] = token.split('-');
      const from = parseInt(fromStr, 10);
      const to = parseInt(toStr, 10);
      if (!isNaN(from) && !isNaN(to)) {
        const lower = Math.max(1, Math.min(from, to));
        const upper = Math.min(maxPages, Math.max(from, to));
        for (let i = lower; i <= upper; i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(token, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        result.add(num);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

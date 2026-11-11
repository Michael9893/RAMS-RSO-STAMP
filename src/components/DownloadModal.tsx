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
  FileCheck2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { StampConfig, stampPdfDocument } from '../utils/pdfStamper';
import { loadPdfDocument, renderPdfPageToCanvas } from '../utils/pdfRenderer';
import { CategorizedDocumentInfo } from '../types/documentMetadata';
import {
  generateGovernmentFilename,
  GOVERNMENT_DOC_TYPES,
  GovernmentDocType,
  detectGovernmentDocType,
  extractSeriesYear,
} from '../utils/filenameGenerator';

interface DownloadModalProps {
  isOpen: boolean;
  pdfBytes: ArrayBuffer | null;
  filename: string;
  totalPages: number;
  currentPage: number;
  stamp: StampConfig;
  metadata?: CategorizedDocumentInfo;
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
  metadata,
  isProcessing,
  onClose,
  onConfirmDownload,
}) => {
  // Array of selected 1-indexed page numbers
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState<string>('');

  // Government Filename Generation State
  const initialDocType = detectGovernmentDocType(stamp, metadata);
  const [activeDocType, setActiveDocType] = useState<GovernmentDocType>(initialDocType);
  const [customSubject, setCustomSubject] = useState<string>(metadata?.subject || 'AUTHORITY TO TRAVEL ON OFFICIAL TIME');
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [isManualFilenameEdit, setIsManualFilenameEdit] = useState<boolean>(false);

  // Live Stamped PDF Preview state
  const [previewPageNumber, setPreviewPageNumber] = useState<number>(currentPage || 1);
  const [previewScale, setPreviewScale] = useState<number>(1.1);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [showAlignmentCrosshair, setShowAlignmentCrosshair] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize selected pages and doc type when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewPageNumber(currentPage || 1);
      const detected = detectGovernmentDocType(stamp, metadata);
      setActiveDocType(detected);
      if (metadata?.subject) {
        setCustomSubject(metadata.subject);
      }

      if (totalPages <= 1) {
        setSelectedPages([1]);
        setRangeInput('1');
      } else {
        const all = Array.from({ length: totalPages }, (_, i) => i + 1);
        setSelectedPages(all);
        setRangeInput(`1-${totalPages}`);
      }

      // Generate initial standard government filename
      const generated = generateGovernmentFilename(stamp, metadata, {
        docTypeOverride: detected,
        customSubject: metadata?.subject,
        selectedPages: totalPages > 1 ? Array.from({ length: totalPages }, (_, i) => i + 1) : [1],
        totalPages,
      });
      setOutputFilename(generated);
      setIsManualFilenameEdit(false);
    }
  }, [isOpen, totalPages, currentPage, stamp.documentType, stamp.prefix, stamp.number, metadata]);

  // Update generated filename when activeDocType, stamp.number, customSubject, or selectedPages changes
  useEffect(() => {
    if (isOpen && !isManualFilenameEdit) {
      const generated = generateGovernmentFilename(stamp, metadata, {
        docTypeOverride: activeDocType,
        customSubject,
        selectedPages: selectedPages.length > 0 ? selectedPages : [1],
        totalPages,
      });
      setOutputFilename(generated);
    }
  }, [activeDocType, stamp.number, customSubject, selectedPages, totalPages, metadata, isOpen, isManualFilenameEdit]);

  // Generate and render the actual stamped PDF page onto preview canvas
  useEffect(() => {
    const sourceBytes = pdfBytes;
    if (!isOpen || !sourceBytes) return;

    let isMounted = true;

    async function generateAndRenderPreview() {
      if (!sourceBytes) return;
      setIsPreviewLoading(true);
      try {
        const stampedBytes = await stampPdfDocument(sourceBytes.slice(0), stamp);
        if (!isMounted) return;

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

  // Switch government document type and refresh filename
  const handleDocTypeSelect = (docType: GovernmentDocType) => {
    setActiveDocType(docType);
    setIsManualFilenameEdit(false);
    const generated = generateGovernmentFilename(stamp, metadata, {
      docTypeOverride: docType,
      customSubject,
      selectedPages,
      totalPages,
    });
    setOutputFilename(generated);
  };

  const handleResetFilename = () => {
    setIsManualFilenameEdit(false);
    const generated = generateGovernmentFilename(stamp, metadata, {
      docTypeOverride: activeDocType,
      customSubject,
      selectedPages,
      totalPages,
    });
    setOutputFilename(generated);
  };

  const isAllSelected = selectedPages.length === totalPages;
  const currentSeriesYear = extractSeriesYear(metadata?.series, metadata?.dates?.documentDate);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                Official Stamped PDF Download & Verification
              </h3>
              <p className="text-[11px] text-slate-500">
                Preview stamp alignment and generate government filename format: <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">[TYPE] [NUMBER] s [YEAR]-[SUBJECT]</code>
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

        {/* Modal Body: Split 2-column on desktop (Left: Stamped PDF Canvas Preview, Right: Filename & Page Options) */}
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
            <div className="p-2.5 bg-blue-50/80 border-t border-blue-200 flex items-center justify-between text-[11px] text-blue-900 shrink-0 px-3">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong>Vector Stamp Alignment:</strong> Verified directly on line <code>No. __________</code>
                </span>
              </span>
              <span className="font-mono text-[10px] text-blue-700">
                {stamp.prefix}{stamp.number} ({stamp.fontSize}pt {stamp.fontFamily})
              </span>
            </div>
          </div>

          {/* RIGHT: FILENAME GENERATOR & PAGE SELECTION */}
          <div className="w-full md:w-88 lg:w-96 p-4 bg-white flex flex-col justify-between overflow-y-auto shrink-0 space-y-4">
            <div className="space-y-4">
              
              {/* 1. GOVERNMENT FILENAME GENERATOR CARD */}
              <div className="p-3 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 border-2 border-blue-200 rounded-xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900 text-xs">Generated Government Filename</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilename}
                    className="text-[10px] text-blue-700 hover:text-blue-900 flex items-center gap-1 font-medium"
                    title="Re-generate format"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Auto-Format</span>
                  </button>
                </div>

                {/* Document Type Selector Chips for Filename */}
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">
                    Select Document Type for Filename:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {GOVERNMENT_DOC_TYPES.map((type) => {
                      const isSelected = activeDocType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleDocTypeSelect(type)}
                          className={`py-1 px-1.5 rounded-md text-[10px] font-mono font-bold transition-all text-center border truncate ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title={`Generate with ${type}`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Component for Filename */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Subject Component:</span>
                    <span className="text-[9px] text-slate-400 font-mono">Series: s {currentSeriesYear}</span>
                  </div>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => {
                      setCustomSubject(e.target.value);
                      setIsManualFilenameEdit(false);
                    }}
                    placeholder="e.g. Confirmation of Travel"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Filename Output Preview & Editable Field */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-slate-700 font-bold">Generated Output Filename:</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-semibold">Ready to Save</span>
                  </div>
                  <input
                    type="text"
                    value={outputFilename}
                    onChange={(e) => {
                      setOutputFilename(e.target.value);
                      setIsManualFilenameEdit(true);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600 bg-white text-slate-900 shadow-2xs"
                    placeholder="RSO 2544 s 2026-Confirmation of Travel.pdf"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">
                    Standard: <code className="font-mono text-slate-700">[TYPE] [NUMBER] s [YEAR]-[SUBJECT].pdf</code>
                  </p>
                </div>
              </div>

              {/* 2. PAGE SELECTION CONTROLS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pages to Include in Download:</span>
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
                  <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-0.5">
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

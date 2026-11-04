import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  CheckCircle2,
  X,
  File,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';
import { StampConfig } from '../utils/pdfStamper';

interface DownloadModalProps {
  isOpen: boolean;
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
  filename,
  totalPages,
  currentPage,
  stamp,
  isProcessing,
  onClose,
  onConfirmDownload,
}) => {
  // Array of selected 1-indexed page numbers, e.g. [1, 2, 3, 4] or [1, 3]
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState<string>('');

  // Initialize selected pages when modal opens
  useEffect(() => {
    if (isOpen) {
      if (totalPages <= 1) {
        setSelectedPages([1]);
        setRangeInput('1');
      } else {
        // By default, select all pages
        const all = Array.from({ length: totalPages }, (_, i) => i + 1);
        setSelectedPages(all);
        setRangeInput(`1-${totalPages}`);
      }
    }
  }, [isOpen, totalPages]);

  const baseDocName = (filename || 'document').replace(/\.pdf$/i, '');
  const cleanStampNum = stamp.number.replace(/[^\w-]/g, '_') || 'stamped';

  const getSuggestedFilename = (pages: number[]) => {
    if (pages.length === totalPages) {
      return `${baseDocName}_stamped_${cleanStampNum}.pdf`;
    } else if (pages.length === 1) {
      return `${baseDocName}_p${pages[0]}_stamped_${cleanStampNum}.pdf`;
    } else {
      const pageListStr = pages.slice(0, 4).join('_');
      const moreStr = pages.length > 4 ? `_and_${pages.length - 4}more` : '';
      return `${baseDocName}_pages_${pageListStr}${moreStr}_stamped_${cleanStampNum}.pdf`;
    }
  };

  const [outputFilename, setOutputFilename] = useState<string>('');

  useEffect(() => {
    if (selectedPages.length > 0) {
      setOutputFilename(getSuggestedFilename(selectedPages));
    }
  }, [selectedPages, totalPages]);

  if (!isOpen) return null;

  // Toggle a single page checkbox
  const togglePage = (pageNum: number) => {
    let next: number[];
    if (selectedPages.includes(pageNum)) {
      if (selectedPages.length === 1) {
        // Keep at least one page selected
        return;
      }
      next = selectedPages.filter((p) => p !== pageNum);
    } else {
      next = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(next);
    setRangeInput(formatPageNumbersToRange(next));
  };

  // Quick preset handlers
  const handleSelectAll = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(totalPages > 1 ? `1-${totalPages}` : '1');
  };

  const handleSelectCurrentOnly = () => {
    setSelectedPages([currentPage]);
    setRangeInput(String(currentPage));
  };

  const handleSelectOdd = () => {
    const odd = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
    setSelectedPages(odd);
    setRangeInput(formatPageNumbersToRange(odd));
  };

  const handleSelectEven = () => {
    const even = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
    if (even.length > 0) {
      setSelectedPages(even);
      setRangeInput(formatPageNumbersToRange(even));
    }
  };

  // Parse custom range input (e.g. "1, 3-4")
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Download Stamped PDF</h3>
            <p className="text-xs text-slate-500">
              Select which pages to include in your downloaded PDF
            </p>
          </div>
        </div>

        {/* Active Stamp Badge */}
        <div className="my-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Document Stamp:</span>
          <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
            {stamp.prefix}{stamp.number}{stamp.suffix}
          </span>
        </div>

        {/* Multi-Page Selection Section */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Pages to Download:</span>
            </label>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {selectedPages.length} of {totalPages} page{totalPages > 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
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
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                selectedPages.length === 1 && selectedPages[0] === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Current Page ({currentPage})
            </button>
            {totalPages >= 3 && (
              <>
                <button
                  type="button"
                  onClick={handleSelectOdd}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Odd Pages
                </button>
                <button
                  type="button"
                  onClick={handleSelectEven}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                >
                  Even Pages
                </button>
              </>
            )}
          </div>

          {/* Interactive Page Selection Grid */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[10px] text-slate-500 font-medium block">
              Click any page box to check or uncheck:
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isSelected = selectedPages.includes(pageNum);
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => togglePage(pageNum)}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 select-none ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs scale-102 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <span className="text-xs">Page {pageNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Page Range Text Input */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Or type page range (e.g. 1, 3-4):
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={handleRangeInputChange}
              placeholder="e.g. 1, 3-4"
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>

          {/* Summary Banner */}
          <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-center justify-between">
            <span className="font-medium">
              Export summary:
            </span>
            <span className="font-bold">
              {selectedPages.length === 1
                ? `1-Page PDF (Page ${selectedPages[0]})`
                : `${selectedPages.length}-Page PDF (Pages ${selectedPages.join(', ')})`}
            </span>
          </div>

          {/* Output Filename field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              File Name:
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              placeholder="document_stamped.pdf"
            />
          </div>
        </div>

        {/* Download Action Footer */}
        <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isProcessing || selectedPages.length === 0}
            onClick={() => onConfirmDownload(selectedPages, outputFilename)}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  Download {selectedPages.length === 1 ? 'Single Page' : `${selectedPages.length} Selected Pages`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to format an array of numbers like [1, 2, 3, 5] into "1-3, 5"
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

// Helper to parse strings like "1, 3-4" into [1, 3, 4]
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

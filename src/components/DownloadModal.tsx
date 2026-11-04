import React, { useState } from 'react';
import { Download, FileText, CheckCircle2, X, File, Layers, Sparkles } from 'lucide-react';
import { StampConfig } from '../utils/pdfStamper';

interface DownloadModalProps {
  isOpen: boolean;
  filename: string;
  totalPages: number;
  currentPage: number;
  stamp: StampConfig;
  isProcessing: boolean;
  onClose: () => void;
  onConfirmDownload: (scope: 'all' | 'current' | 'specific', specificPage: number, customFilename: string) => void;
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
  const [downloadScope, setDownloadScope] = useState<'all' | 'current' | 'specific'>(
    totalPages === 1 ? 'all' : 'current'
  );
  const [chosenPage, setChosenPage] = useState<number>(currentPage);

  const baseDocName = (filename || 'document').replace(/\.pdf$/i, '');
  const cleanStampNum = stamp.number.replace(/[^\w-]/g, '_') || 'stamped';
  
  const getSuggestedFilename = (scope: 'all' | 'current' | 'specific', pageNum: number) => {
    if (scope === 'all') {
      return `${baseDocName}_stamped_${cleanStampNum}.pdf`;
    } else {
      const pageToUse = scope === 'current' ? currentPage : pageNum;
      return `${baseDocName}_p${pageToUse}_stamped_${cleanStampNum}.pdf`;
    }
  };

  const [outputFilename, setOutputFilename] = useState<string>(
    getSuggestedFilename(totalPages === 1 ? 'all' : 'current', currentPage)
  );

  const handleScopeChange = (newScope: 'all' | 'current' | 'specific') => {
    setDownloadScope(newScope);
    setOutputFilename(getSuggestedFilename(newScope, chosenPage));
  };

  const handlePageChange = (p: number) => {
    setChosenPage(p);
    if (downloadScope === 'specific') {
      setOutputFilename(getSuggestedFilename('specific', p));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
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
            <p className="text-xs text-slate-500">Choose single file export options</p>
          </div>
        </div>

        {/* Active Stamp Badge */}
        <div className="my-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Document Stamp:</span>
          <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
            {stamp.prefix}{stamp.number}{stamp.suffix}
          </span>
        </div>

        {/* Single File Options */}
        <div className="space-y-2 mt-4">
          <label className="text-xs font-semibold text-slate-800 block">
            Choose which file to export:
          </label>

          {/* Option 1: Complete Document (All Pages) */}
          <label
            onClick={() => handleScopeChange('all')}
            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
              downloadScope === 'all'
                ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="downloadOption"
              checked={downloadScope === 'all'}
              onChange={() => handleScopeChange('all')}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">Single Combined PDF (All {totalPages} Pages)</span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">1 File</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download the complete document with stamped numbers on all pages in a single PDF.
              </p>
            </div>
          </label>

          {/* Option 2: Current Page Only (Single Page File) */}
          <label
            onClick={() => handleScopeChange('current')}
            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
              downloadScope === 'current'
                ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="downloadOption"
              checked={downloadScope === 'current'}
              onChange={() => handleScopeChange('current')}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">Current Page Only (Page {currentPage})</span>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-1.5 py-0.5 rounded">Single Page File</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Extract and download just the active stamped page as a standalone 1-page PDF file.
              </p>
            </div>
          </label>

          {/* Option 3: Pick a Specific Single Page */}
          {totalPages > 1 && (
            <label
              onClick={() => handleScopeChange('specific')}
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                downloadScope === 'specific'
                  ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="downloadOption"
                checked={downloadScope === 'specific'}
                onChange={() => handleScopeChange('specific')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Pick Specific Single Page</span>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">1 File</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-600">Choose Page:</span>
                  <select
                    value={chosenPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    disabled={downloadScope !== 'specific'}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p} of {totalPages}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </label>
          )}
        </div>

        {/* Output Filename field */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            File Name:
          </label>
          <input
            type="text"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="document_stamped.pdf"
          />
        </div>

        {/* Download Action */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onConfirmDownload(downloadScope, chosenPage, outputFilename)}
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
                <span>Download File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

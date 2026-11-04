import React from 'react';
import { FileText, Download, RotateCcw, Upload, CheckCircle2, ListFilter, Sparkles } from 'lucide-react';

interface TopNavbarProps {
  filename: string | null;
  totalPages: number;
  currentPage: number;
  currentNumber: string;
  isProcessing: boolean;
  onDownload: () => void;
  onResetStamp: () => void;
  onOpenUploadModal: () => void;
  onLoadSample: () => void;
  onOpenMetadataModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  filename,
  totalPages,
  currentPage,
  currentNumber,
  isProcessing,
  onDownload,
  onResetStamp,
  onOpenUploadModal,
  onLoadSample,
  onOpenMetadataModal,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs z-30">
      {/* Zone 1: Brand & Document Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm shrink-0">
          6D
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-base tracking-tight whitespace-nowrap">
              DocStamp 6D
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">|</span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline truncate max-w-[200px] md:max-w-[280px]">
              {filename || 'PDF Number Stamper'}
            </span>
          </div>
          {filename && (
            <p className="text-xs text-slate-400 truncate hidden md:block">
              Page {currentPage} of {totalPages} · Stamping No. <span className="font-mono font-semibold text-blue-700">{currentNumber}</span>
            </p>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation & Quick Utilities */}
      <nav className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Upload a new PDF document"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>

        <button
          onClick={onLoadSample}
          className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Load official sample document"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Sample Doc</span>
        </button>

        <button
          onClick={onOpenMetadataModal}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border border-slate-200 shadow-2xs"
          title="View categorized PDF details (Name, Subject, Date, Approval)"
        >
          <ListFilter className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Document Info</span>
        </button>

        <button
          onClick={onResetStamp}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Reset stamp position and settings"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Reset</span>
        </button>
      </nav>

      {/* Zone 3: Primary Download CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDownload}
          disabled={!filename || isProcessing}
          className={`px-4 py-2 text-xs md:text-sm font-semibold text-white rounded-lg transition-all flex items-center gap-2 shadow-sm whitespace-nowrap ${
            !filename || isProcessing
              ? 'bg-slate-300 cursor-not-allowed text-slate-500'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/20'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Stamping...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Stamped PDF</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

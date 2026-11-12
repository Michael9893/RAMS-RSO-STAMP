import React from 'react';
import { Download, RotateCcw, Upload, ListFilter, History } from 'lucide-react';

interface TopNavbarProps {
  filename: string | null;
  totalPages: number;
  currentPage: number;
  currentNumber: string;
  trackedCount: number;
  isProcessing: boolean;
  onDownload: () => void;
  onResetStamp: () => void;
  onOpenUploadModal: () => void;
  onOpenMetadataModal: () => void;
  onOpenTrackerModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  filename,
  totalPages,
  currentPage,
  currentNumber,
  trackedCount,
  isProcessing,
  onDownload,
  onResetStamp,
  onOpenUploadModal,
  onOpenMetadataModal,
  onOpenTrackerModal,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs z-30">
      {/* Zone 1: Brand & Document Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="px-2 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-[11px] tracking-wider shadow-sm shrink-0">
          RAMS
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm md:text-base tracking-tight truncate">
              OFFICIAL RAMS ISSUANCES STAMPER
            </span>
            {filename && (
              <>
                <span className="text-xs text-slate-400 hidden lg:inline">|</span>
                <span className="text-xs text-slate-500 font-medium hidden lg:inline truncate max-w-[180px]">
                  {filename}
                </span>
              </>
            )}
          </div>
          {filename && (
            <p className="text-xs text-slate-400 truncate hidden md:block">
              Page {currentPage} of {totalPages} · Stamping No. <span className="font-mono font-semibold text-blue-700">{currentNumber}</span>
            </p>
          )}
        </div>
      </div>

      {/* Zone 2: Navigation & Quick Utilities */}
      <nav className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Upload a new PDF or image document"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>

        <button
          onClick={onOpenTrackerModal}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border border-slate-200 shadow-2xs"
          title="View Recent Tracker for RSO, MEMO ES/FWA, MEMO_ATT/ATA, RAO_RMC, U_MEMO, NOV"
        >
          <History className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Recent Tracker</span>
          {trackedCount > 0 && (
            <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
              {trackedCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenMetadataModal}
          disabled={!filename}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border shadow-2xs ${
            !filename
              ? 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
          }`}
          title="View categorized PDF details (Name, Subject, Date, Approval)"
        >
          <ListFilter className={`w-3.5 h-3.5 ${!filename ? 'text-slate-300' : 'text-blue-600'}`} />
          <span className="hidden sm:inline">Document Info</span>
        </button>

        <button
          onClick={onResetStamp}
          disabled={!filename}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            !filename
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Reset stamp position and settings"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${!filename ? 'text-slate-300' : 'text-slate-500'}`} />
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

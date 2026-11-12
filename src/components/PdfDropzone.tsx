import React, { useRef, useState } from 'react';
import { UploadCloud, Stamp, History, Clock, Plus } from 'lucide-react';
import { GOVERNMENT_DOC_TYPES, GovernmentDocType } from '../utils/filenameGenerator';
import { incrementDocumentNumber } from '../utils/pdfStamper';
import { RecentTrackerState, formatRelativeTime } from '../utils/recentTracker';

interface PdfDropzoneProps {
  onFileSelected: (file: File) => void;
  trackerState?: RecentTrackerState;
  onOpenTrackerModal?: () => void;
  onUseTrackedNumber?: (docType: GovernmentDocType, stampNumber: string) => void;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFileSelected,
  trackerState,
  onOpenTrackerModal,
  onUseTrackedNumber,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md mb-3 border border-blue-100">
          <Stamp className="w-3.5 h-3.5" />
          <span>Official Document 6-Digit Numbering</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
          Stamp 6-Digit Document Numbers on Any PDF
        </h1>
        <p className="mt-2 text-sm md:text-base text-slate-600 max-w-xl mx-auto">
          Upload any official order, memo, or invoice. Adjust the 6-digit number by simply typing, drag to align on blank lines, and download your stamped PDF immediately.
        </p>
      </div>

      {/* Main Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all bg-white ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400'
        } shadow-sm`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-semibold text-slate-800">
          Choose a PDF file or drag & drop it here
        </h3>
        <p className="text-xs md:text-sm text-slate-500 mt-1 mb-6">
          Supports any PDF document · Single or multi-page · Stays 100% private in your browser
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-98"
          >
            Browse PDF Document
          </button>
        </div>
      </div>

      {/* Recent Stamped & Downloaded Tracker (Front Page Summary) */}
      {trackerState && (
        <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Recent Stamped & Downloaded Tracker
                </h4>
                <p className="text-[11px] text-slate-500">
                  Last stamped number and downloaded file for each document category
                </p>
              </div>
            </div>
            {onOpenTrackerModal && (
              <button
                type="button"
                onClick={onOpenTrackerModal}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                Full History Log ({trackerState.history.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {GOVERNMENT_DOC_TYPES.map((type) => {
              const record = trackerState.lastByType[type];
              const nextNum = record ? incrementDocumentNumber(record.stampNumber, 1) : null;
              return (
                <div
                  key={type}
                  className={`rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                    record
                      ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                      : 'bg-slate-50/40 border-slate-200/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate">
                        {type}
                      </span>
                      {record && (
                        <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(record.downloadedAt)}
                        </span>
                      )}
                    </div>

                    {record ? (
                      <>
                        <div className="font-mono text-sm font-extrabold text-blue-700 tracking-wide my-1">
                          {record.stampNumber}
                        </div>
                        <div
                          className="text-[10px] text-slate-600 truncate"
                          title={record.filename}
                        >
                          {record.filename}
                        </div>
                      </>
                    ) : (
                      <div className="py-2 text-[10px] text-slate-400">
                        Not yet stamped
                      </div>
                    )}
                  </div>

                  {record && nextNum && onUseTrackedNumber && (
                    <button
                      type="button"
                      onClick={() => onUseTrackedNumber(type, nextNum)}
                      className="mt-2 w-full py-1 px-1.5 bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded text-[10px] font-bold font-mono transition-colors flex items-center justify-center gap-0.5"
                      title={`Queue next ${type} number (${nextNum})`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Next {nextNum}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Attribution */}
      <div className="mt-8 text-center">
        <p className="text-xs font-medium text-slate-500 tracking-wide">
          Powered by <span className="font-bold text-slate-700">MJB</span> since 2026
        </p>
      </div>
    </div>
  );
};

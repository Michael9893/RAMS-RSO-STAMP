import React, { useState } from 'react';
import {
  X,
  History,
  Clock,
  Hash,
  FileCheck2,
  Trash2,
  ArrowRight,
  Plus,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { GOVERNMENT_DOC_TYPES, GovernmentDocType } from '../utils/filenameGenerator';
import { GOVERNMENT_DOCUMENT_TYPES, incrementDocumentNumber } from '../utils/pdfStamper';
import {
  RecentTrackerState,
  formatRelativeTime,
  formatFullTimestamp,
} from '../utils/recentTracker';

interface RecentTrackerModalProps {
  isOpen: boolean;
  trackerState: RecentTrackerState;
  hasActiveDocument: boolean;
  onClose: () => void;
  onUseNumber: (docType: GovernmentDocType, stampNumber: string) => void;
  onClearTracker: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export const RecentTrackerModal: React.FC<RecentTrackerModalProps> = ({
  isOpen,
  trackerState,
  hasActiveDocument,
  onClose,
  onUseNumber,
  onClearTracker,
  onDeleteHistoryItem,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const totalTrackedTypes = GOVERNMENT_DOC_TYPES.filter(
    (type) => Boolean(trackerState.lastByType[type])
  ).length;

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Recent Stamped & Downloaded Tracker
                </h3>
                <span className="text-[10px] font-mono font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {totalTrackedTypes}/6 Categories Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tracks the last stamped number and downloaded file for RSO, MEMO ES/FWA, MEMO_ATT/ATA, RAO_RMC, U_MEMO, and NOV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trackerState.history.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-semibold text-rose-800">Clear all?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearTracker();
                      setConfirmClear(false);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
          {/* Section 1: Last Stamped & Downloaded by Document Type */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Latest Stamped Number per Category</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {hasActiveDocument
                  ? 'Click "+1 Next" to continue numbering your open PDF'
                  : 'Click "+1 Next" to queue the next number for your next upload'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {GOVERNMENT_DOC_TYPES.map((type) => {
                const record = trackerState.lastByType[type];
                const meta = GOVERNMENT_DOCUMENT_TYPES.find((d) => d.id === type);
                const nextNumber = record ? incrementDocumentNumber(record.stampNumber, 1) : null;

                return (
                  <div
                    key={type}
                    className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                      record
                        ? 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {type}
                        </span>
                        {record ? (
                          <span
                            className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"
                            title={formatFullTimestamp(record.downloadedAt)}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(record.downloadedAt)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">No downloads yet</span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mb-2" title={meta?.fullName}>
                        {meta?.fullName}
                      </p>

                      {record ? (
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-baseline justify-between bg-blue-50/70 border border-blue-200/80 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] font-semibold text-blue-800 uppercase">Last No.</span>
                            <span className="font-mono text-base font-extrabold text-blue-700 tracking-wide">
                              {record.stampNumber}
                            </span>
                          </div>
                          <div
                            className="text-[11px] font-medium text-slate-700 truncate bg-slate-50 px-2 py-1 rounded border border-slate-100"
                            title={record.filename}
                          >
                            {record.filename}
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg mb-3">
                          Waiting for first {type} download
                        </div>
                      )}
                    </div>

                    {record && nextNumber && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            onUseNumber(type, record.stampNumber);
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors truncate"
                          title={`Reuse last stamp number (${record.stampNumber})`}
                        >
                          Use {record.stampNumber}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUseNumber(type, nextNumber);
                            onClose();
                          }}
                          className="flex-1 py-1.5 px-2 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1 truncate shadow-2xs"
                          title={`Apply next sequential number (${nextNumber})`}
                        >
                          <Plus className="w-3 h-3 shrink-0" />
                          <span>Next: {nextNumber}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Chronological Download & Stamp Log */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Download & Stamp History Log ({trackerState.history.length})</span>
              </h4>
            </div>

            {trackerState.history.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No stamped downloads recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Every time you stamp and download a PDF, its category, number, filename, and timestamp will be logged here automatically.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Stamped No.</th>
                        <th className="py-2.5 px-3">Downloaded File & Subject</th>
                        <th className="py-2.5 px-3">Pages</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trackerState.history.map((item) => {
                        const nextSeq = incrementDocumentNumber(item.stampNumber, 1);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.docType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-blue-700">
                              <span className="inline-flex items-center gap-1">
                                <Hash className="w-3 h-3 text-blue-400" />
                                {item.stampNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 max-w-[260px]">
                              <div className="font-medium text-slate-900 truncate" title={item.filename}>
                                {item.filename}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate" title={item.subject}>
                                {item.subject}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-600">
                              {item.selectedPages.length === item.totalPages
                                ? `All (${item.totalPages})`
                                : `p.${item.selectedPages.join(', ')} / ${item.totalPages}`}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-500" title={formatFullTimestamp(item.downloadedAt)}>
                              <div>{formatRelativeTime(item.downloadedAt)}</div>
                              <div className="text-[10px] text-slate-400">
                                {formatFullTimestamp(item.downloadedAt)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUseNumber(item.docType, nextSeq);
                                    onClose();
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors inline-flex items-center gap-1"
                                  title={`Queue next number ${nextSeq}`}
                                >
                                  <span>+1 ({nextSeq})</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteHistoryItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Remove entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

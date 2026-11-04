import React, { useState } from 'react';
import {
  X,
  FileText,
  Calendar,
  Users,
  Building,
  MapPin,
  Check,
  Copy,
  Plus,
  Trash2,
  Search,
  Download,
  Tag,
  Hash,
  ShieldCheck,
  Edit2,
  Save,
} from 'lucide-react';
import { CategorizedDocumentInfo, DocumentPersonnel } from '../types/documentMetadata';

interface DocumentInfoModalProps {
  isOpen: boolean;
  metadata: CategorizedDocumentInfo;
  onClose: () => void;
  onUpdateMetadata: (updated: Partial<CategorizedDocumentInfo>) => void;
  onApplyStampNumber: (number: string) => void;
}

export const DocumentInfoModal: React.FC<DocumentInfoModalProps> = ({
  isOpen,
  metadata,
  onClose,
  onUpdateMetadata,
  onApplyStampNumber,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'subject' | 'personnel' | 'dates' | 'approval'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable local state
  const [editSubject, setEditSubject] = useState(metadata.subject);
  const [editTitle, setEditTitle] = useState(metadata.title);
  const [editSeries, setEditSeries] = useState(metadata.series);
  const [editDocNumber, setEditDocNumber] = useState(metadata.documentNumber);
  const [editApprovedBy, setEditApprovedBy] = useState(metadata.approval.approvedBy);
  const [editOffice, setEditOffice] = useState(metadata.approval.issuingOffice);
  const [editTravelDate, setEditTravelDate] = useState(metadata.dates.effectiveDateRange);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = `
=== CATEGORIZED DOCUMENT DETAILS ===
TITLE: ${metadata.title}
DOCUMENT NUMBER: ${metadata.documentNumber} (${metadata.series})
SUBJECT: ${metadata.subject}
TYPE: ${metadata.documentType}

--- DATES ---
Document Date: ${metadata.dates.documentDate}
Effective / Travel Date: ${metadata.dates.effectiveDateRange}
Stamped Date: ${metadata.dates.stampedDate}

--- PERSONNEL & NAMES ---
${metadata.personnel
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} - ${p.position} (${p.division}) [${p.classification}]`
  )
  .join('\n')}

--- APPROVAL & ISSUANCE ---
Approved By: ${metadata.approval.approvedBy} (${metadata.approval.approverPosition})
Issuing Office: ${metadata.approval.issuingOffice}
Reference: ${metadata.approval.annexRef}

--- PURPOSE & VENUE ---
Purpose: ${metadata.event.purpose}
Venue: ${metadata.event.venue}
`.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveEdits = () => {
    onUpdateMetadata({
      title: editTitle,
      subject: editSubject,
      series: editSeries,
      documentNumber: editDocNumber,
      approval: {
        ...metadata.approval,
        approvedBy: editApprovedBy,
        issuingOffice: editOffice,
      },
      dates: {
        ...metadata.dates,
        effectiveDateRange: editTravelDate,
      },
    });
    setIsEditing(false);
  };

  const handleAddPersonnel = () => {
    const newPerson: DocumentPersonnel = {
      id: `p_${Date.now()}`,
      name: 'New Personnel Member',
      position: 'Staff / Representative',
      division: 'Regional Office',
      classification: 'Local Travel',
    };
    onUpdateMetadata({
      personnel: [...metadata.personnel, newPerson],
    });
  };

  const handleRemovePersonnel = (id: string) => {
    onUpdateMetadata({
      personnel: metadata.personnel.filter((p) => p.id !== id),
    });
  };

  const filteredPersonnel = metadata.personnel.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.division.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full h-[90vh] max-h-[750px] shadow-2xl flex flex-col relative border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Categorized Document Information
                </h3>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {metadata.documentType}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Categorized by Subject, Names, Dates, Approval & Details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Copy all details to clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Filter Tabs */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setActiveTab('subject')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'subject'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Subject & Title
            </button>
            <button
              onClick={() => setActiveTab('personnel')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'personnel'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Personnel & Names ({metadata.personnel.length})
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'dates'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Dates & Timeline
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'approval'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Signatories & Office
            </button>
          </div>

          <button
            onClick={() => {
              if (isEditing) {
                handleSaveEdits();
              } else {
                setIsEditing(true);
              }
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {isEditing ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Fields</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. SUBJECT & DOCUMENT CLASSIFICATION */}
          {(activeTab === 'all' || activeTab === 'subject') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Document Subject & Identity</span>
                </h4>
                <button
                  onClick={() => onApplyStampNumber(metadata.documentNumber)}
                  className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Hash className="w-3 h-3" />
                  <span>Use Document No. in Stamp</span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Document Title:
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Subject:
                      </label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Document Number:
                        </label>
                        <input
                          type="text"
                          value={editDocNumber}
                          onChange={(e) => setEditDocNumber(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Series:
                        </label>
                        <input
                          type="text"
                          value={editSeries}
                          onChange={(e) => setEditSeries(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          Official Order
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {metadata.title}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Ref Number
                        </span>
                        <div className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                          No. {metadata.documentNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">{metadata.series}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                        Subject
                      </span>
                      <p className="text-sm font-bold text-slate-800 leading-snug">
                        {metadata.subject}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {metadata.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. DATES & TIMELINE CATEGORY */}
          {(activeTab === 'all' || activeTab === 'dates') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Date & Timeline Details</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                    Travel / Effective Date
                  </span>
                  <div className="text-sm font-bold text-emerald-950 mt-1">
                    {metadata.dates.effectiveDateRange}
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    Event Attendance Period
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                    Document Issuance Date
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {metadata.dates.documentDate}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Order Creation
                  </span>
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <span className="text-[10px] font-semibold text-blue-800 uppercase block">
                    Date Stamped
                  </span>
                  <div className="text-sm font-bold text-blue-950 mt-1">
                    {metadata.dates.stampedDate}
                  </div>
                  <span className="text-[10px] text-blue-600 mt-0.5 block">
                    Document Number Attached
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. PERSONNEL & NAMES CATEGORY */}
          {(activeTab === 'all' || activeTab === 'personnel') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Authorized Personnel (Categorized by Name)</span>
                </h4>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search names or positions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleAddPersonnel}
                    className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Personnel Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3">Division / Section</th>
                      <th className="py-2.5 px-3">Travel Type</th>
                      <th className="py-2.5 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPersonnel.map((person, idx) => (
                      <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {person.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {person.position}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {person.division}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {person.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={() => handleRemovePersonnel(person.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredPersonnel.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                          No personnel matching "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. APPROVAL & VENUE DETAILS */}
          {(activeTab === 'all' || activeTab === 'approval') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Approval, Issuing Authority & Venue</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>Issuing Authority</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Approved By:</span>
                    <div className="font-bold text-slate-900 text-sm">
                      {metadata.approval.approvedBy}
                    </div>
                    <div className="text-xs text-slate-500">
                      {metadata.approval.approverPosition}
                    </div>
                  </div>
                  <div className="pt-1 text-xs text-slate-600">
                    <span className="text-[10px] text-slate-400 uppercase block">Office:</span>
                    {metadata.approval.issuingOffice}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 pt-1">
                    Reference: {metadata.approval.annexRef}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Venue & Purpose Details</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Official Purpose:</span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {metadata.event.purpose}
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 uppercase">Venue Location:</span>
                    <p className="text-xs text-slate-800 font-medium">
                      {metadata.event.venue}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. PDF TECHNICAL SPECIFICATIONS */}
          {activeTab === 'all' && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                PDF File Specifications
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">File Name</span>
                  <span className="font-mono text-slate-800 truncate block">
                    {metadata.technical.filename}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">File Size</span>
                  <span className="font-mono text-slate-800">
                    {metadata.technical.fileSizeFormatted}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Total Pages</span>
                  <span className="font-mono text-slate-800">
                    {metadata.technical.totalPages} Page
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Dimensions</span>
                  <span className="font-mono text-slate-800">
                    {metadata.technical.dimensions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Details synced with document index</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

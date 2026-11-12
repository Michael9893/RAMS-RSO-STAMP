import React, { useState, useEffect } from 'react';
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
  AlignLeft,
  FileCode,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'all' | 'fulltext' | 'subject' | 'personnel' | 'dates' | 'approval'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedFullText, setIsCopiedFullText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable local state
  const [editSubject, setEditSubject] = useState(metadata.subject);
  const [editTitle, setEditTitle] = useState(metadata.title);
  const [editSeries, setEditSeries] = useState(metadata.series);
  const [editDocNumber, setEditDocNumber] = useState(metadata.documentNumber);
  const [editBody, setEditBody] = useState(metadata.bodyParagraph);
  const [editIssuanceLocation, setEditIssuanceLocation] = useState(metadata.issuanceLocation);
  const [editApprovedBy, setEditApprovedBy] = useState(metadata.approval.approvedBy);
  const [editOffice, setEditOffice] = useState(metadata.approval.issuingOffice);
  const [editTravelDate, setEditTravelDate] = useState(metadata.dates.effectiveDateRange);
  const [editFullText, setEditFullText] = useState(metadata.fullVerbatimText);

  useEffect(() => {
    if (isOpen) {
      setEditSubject(metadata.subject);
      setEditTitle(metadata.title);
      setEditSeries(metadata.series);
      setEditDocNumber(metadata.documentNumber);
      setEditBody(metadata.bodyParagraph);
      setEditIssuanceLocation(metadata.issuanceLocation);
      setEditApprovedBy(metadata.approval.approvedBy);
      setEditOffice(metadata.approval.issuingOffice);
      setEditTravelDate(metadata.dates.effectiveDateRange);
      setEditFullText(metadata.fullVerbatimText);
    }
  }, [isOpen, metadata]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = `
=== CATEGORIZED DOCUMENT DETAILS ===
ANNEX REF: ${metadata.annexRef}
HEADER: ${metadata.headerLogosText}
TITLE: ${metadata.title}
DOCUMENT NUMBER: ${metadata.documentNumber} (${metadata.series})
SUBJECT: ${metadata.subject}
TYPE: ${metadata.documentType}

--- FULL BODY NARRATIVE TEXT ---
${metadata.bodyParagraph}

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

--- ISSUANCE & APPROVAL ---
Issuance Location: ${metadata.issuanceLocation}
Approved By: ${metadata.approval.approvedBy} (${metadata.approval.approverPosition})
Issuing Office: ${metadata.approval.issuingOffice}
Reference: ${metadata.approval.annexRef}

--- PURPOSE & VENUE ---
Purpose: ${metadata.event.purpose}
Venue: ${metadata.event.venue}

--- COMPLETE VERBATIM PDF TRANSCRIPT ---
${metadata.fullVerbatimText}
`.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCopyFullVerbatim = () => {
    navigator.clipboard.writeText(metadata.fullVerbatimText);
    setIsCopiedFullText(true);
    setTimeout(() => setIsCopiedFullText(false), 2500);
  };

  const handleSaveEdits = () => {
    onUpdateMetadata({
      title: editTitle,
      subject: editSubject,
      series: editSeries,
      documentNumber: editDocNumber,
      bodyParagraph: editBody,
      issuanceLocation: editIssuanceLocation,
      fullVerbatimText: editFullText,
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
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[92vh] max-h-[820px] shadow-2xl flex flex-col relative border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Categorized Document Information & Verbatim Text
                </h3>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {metadata.documentType}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                All text extracted from the PDF categorized by Subject, Full Narrative, Personnel, Dates & Approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Copy all categorized details to clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Summary!</span>
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
              onClick={() => setActiveTab('fulltext')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'fulltext'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Full Verbatim PDF Text</span>
            </button>
            <button
              onClick={() => setActiveTab('subject')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'subject'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Subject & Narrative
            </button>
            <button
              onClick={() => setActiveTab('personnel')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'personnel'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Personnel & Table ({metadata.personnel.length})
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
              Approval & Office
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* TAB: 100% VERBATIM FULL PDF TEXT */}
          {(activeTab === 'fulltext' || activeTab === 'all') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-blue-600" />
                  <span>Complete Verbatim PDF Text (All Extracted Text)</span>
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metadata.fullVerbatimText.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    onClick={handleCopyFullVerbatim}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1"
                  >
                    {isCopiedFullText ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Verbatim Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={9}
                  value={editFullText}
                  onChange={(e) => setEditFullText(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              ) : (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text border border-slate-800 shadow-inner max-h-64 overflow-y-auto">
                  {metadata.fullVerbatimText}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                Tip: You can select any text or numbers above to copy or set as your stamp number.
              </p>
            </div>
          )}

          {/* TAB: SUBJECT & FULL NARRATIVE TEXT */}
          {(activeTab === 'subject' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Document Subject & Narrative Text</span>
                </h4>
                <button
                  onClick={() => onApplyStampNumber(metadata.documentNumber)}
                  className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Hash className="w-3 h-3" />
                  <span>Use Document No. ({metadata.documentNumber}) in Stamp</span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Header / Logos Text:
                      </label>
                      <input
                        type="text"
                        value={metadata.headerLogosText}
                        onChange={(e) => onUpdateMetadata({ headerLogosText: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
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
                          Annex Ref:
                        </label>
                        <input
                          type="text"
                          value={metadata.annexRef}
                          onChange={(e) => onUpdateMetadata({ annexRef: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
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
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Full Body Authorization Narrative:
                      </label>
                      <textarea
                        rows={3}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Issuance Location / Date Line:
                      </label>
                      <input
                        type="text"
                        value={editIssuanceLocation}
                        onChange={(e) => setEditIssuanceLocation(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Logos & Reference */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-500">
                      <div className="font-semibold text-xs text-slate-700">
                        {metadata.headerLogosText}
                      </div>
                      <div className="font-mono font-bold text-xs bg-slate-200/80 px-2 py-0.5 rounded text-slate-800">
                        {metadata.annexRef}
                      </div>
                    </div>

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

                    {/* Subject Line */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                        Subject
                      </span>
                      <p className="text-sm font-bold text-slate-800 leading-snug">
                        {metadata.subject}
                      </p>
                    </div>

                    {/* Full Body Narrative Paragraph */}
                    <div className="pt-2 border-t border-slate-200 bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block mb-1">
                        Full Authorization Narrative Text:
                      </span>
                      <p className="text-xs text-slate-800 leading-relaxed font-normal">
                        {metadata.bodyParagraph}
                      </p>
                    </div>

                    {/* Issuance Location Line */}
                    <div className="pt-1 text-slate-600 italic">
                      {metadata.issuanceLocation}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: PERSONNEL & TABLE CATEGORY */}
          {(activeTab === 'personnel' || activeTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Authorized Personnel Table ({metadata.personnel.length} Listed)</span>
                </h4>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name or division..."
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
                    <span>Add Person</span>
                  </button>
                </div>
              </div>

              {/* Personnel Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3">Division / Section</th>
                      <th className="py-2.5 px-3">Classification of Travel¹</th>
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

          {/* TAB: DATES & TIMELINE */}
          {(activeTab === 'dates' || activeTab === 'all') && (
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
                    Official Time Period
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
                    Regional Order Date
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

          {/* TAB: APPROVAL, ISSUING OFFICE & VENUE */}
          {(activeTab === 'approval' || activeTab === 'all') && (
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
                    <span className="text-[10px] text-slate-400 uppercase">APPROVED BY:</span>
                    <div className="font-bold text-slate-900 text-sm">
                      {metadata.approval.approvedBy}
                    </div>
                    <div className="text-xs text-slate-500">
                      {metadata.approval.approverPosition}
                    </div>
                  </div>
                  <div className="pt-1 text-xs text-slate-600">
                    <span className="text-[10px] text-slate-400 uppercase block">Issuing Office:</span>
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

          {/* TECHNICAL SPECIFICATIONS */}
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
          <span>All text extracted and synchronized with PDF document</span>
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

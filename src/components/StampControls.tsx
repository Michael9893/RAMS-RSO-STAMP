import React, { useState, useEffect } from 'react';
import {
  Hash,
  Palette,
  Type,
  Maximize,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  Settings2,
  FileCheck2,
  ShieldAlert,
  Award,
  Sparkles,
  HelpCircle,
  RotateCcw,
  History,
  Plus,
} from 'lucide-react';
import {
  StampConfig,
  formatDocumentNumber,
  incrementDocumentNumber,
  GOVERNMENT_DOCUMENT_TYPES,
  GOVERNMENT_STANDARD_STAMP,
} from '../utils/pdfStamper';
import { CategorizedDocumentInfo } from '../types/documentMetadata';
import { generateGovernmentFilename, GOVERNMENT_DOC_TYPES, GovernmentDocType } from '../utils/filenameGenerator';
import { RecentTrackerState, formatRelativeTime } from '../utils/recentTracker';

interface StampControlsProps {
  stamp: StampConfig;
  metadata?: CategorizedDocumentInfo;
  trackerState?: RecentTrackerState;
  currentPage: number;
  totalPages: number;
  isProcessing: boolean;
  onStampChange: (updated: Partial<StampConfig>) => void;
  onStampNudge: (deltaX: number, deltaY: number) => void;
  onDownload: () => void;
  onOpenTrackerModal?: () => void;
  onUseTrackedNumber?: (docType: GovernmentDocType, stampNumber: string) => void;
}

const INK_COLORS = [
  { name: 'Official Blue', hex: '#0038a8', desc: 'Government Standard Ink' },
  { name: 'Stamp Red', hex: '#b91c1c', desc: 'Urgent / Priority' },
  { name: 'Official Black', hex: '#111827', desc: 'Standard Black' },
  { name: 'Registry Purple', hex: '#6b21a8', desc: 'Registry Stamp' },
  { name: 'Approval Green', hex: '#047857', desc: 'Approval Green' },
];

const PRESET_POSITIONS = [
  { name: 'Order No. Underline', xPercent: 16.5, yPercent: 13.8, desc: 'Exact "No. ______" Line' },
  { name: 'Top-Right Header', xPercent: 72, yPercent: 6.5, desc: 'Barcode / Doc #' },
  { name: 'Top-Left Header', xPercent: 8.5, yPercent: 6.5, desc: 'Reference Code' },
  { name: 'Bottom Signoff', xPercent: 68, yPercent: 88, desc: 'Approval Line' },
];

const QUICK_SYMBOLS = ['#', '-', '/', '_', '.', 'No.', '2026', '()'];

export const StampControls: React.FC<StampControlsProps> = ({
  stamp,
  metadata,
  trackerState,
  currentPage,
  totalPages,
  isProcessing,
  onStampChange,
  onStampNudge,
  onDownload,
  onOpenTrackerModal,
  onUseTrackedNumber,
}) => {
  const [typedInput, setTypedInput] = useState(stamp.number);
  const liveFilenamePreview = generateGovernmentFilename(stamp, metadata);

  // Keep typed input in sync when stamp.number is updated externally
  useEffect(() => {
    setTypedInput(stamp.number);
  }, [stamp.number]);

  // Direct typing handler for Document Number (text, numbers, special characters)
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setTypedInput(rawValue);
    onStampChange({ number: rawValue });
  };

  const handleBlur = () => {
    if (stamp.padWithZeros) {
      const formatted = formatDocumentNumber(typedInput, true);
      setTypedInput(formatted);
      onStampChange({ number: formatted });
    }
  };

  const handleInsertSymbol = (sym: string) => {
    const nextVal = typedInput + sym;
    setTypedInput(nextVal);
    onStampChange({ number: nextVal });
  };

  const handleIncrement = (amount: number) => {
    const nextNum = incrementDocumentNumber(stamp.number, amount);
    setTypedInput(nextNum);
    onStampChange({ number: nextNum });
  };

  // Apply single official government format and size
  const handleApplyGovernmentStandard = () => {
    onStampChange({
      ...GOVERNMENT_STANDARD_STAMP,
      // Keep number, position, and prefix
    });
  };

  // Handle Document Type selection (RSO, MEMO ES/FWA, MEMO_ATT/ATA, RAO_RMC, U_MEMO, NOV)
  const handleSelectDocType = (docTypeId: string, defaultPrefix: string) => {
    if (stamp.documentType === docTypeId) {
      // Toggle off / clear prefix
      onStampChange({
        documentType: 'NONE',
        prefix: '',
      });
    } else {
      onStampChange({
        documentType: docTypeId as any,
        prefix: defaultPrefix,
      });
    }
  };

  const handleClearPrefix = () => {
    onStampChange({
      documentType: 'NONE',
      prefix: '',
    });
  };

  const isGovStandardActive =
    stamp.fontFamily === 'TimesRoman' &&
    stamp.fontSize === 15 &&
    stamp.color.toLowerCase() === '#0038a8' &&
    stamp.rotation === 0 &&
    stamp.boxStyle === 'none';

  return (
    <aside className="w-full md:w-84 lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0 shadow-xs z-20">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Document Stamp Controls
          </h2>
        </div>
        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[130px]">
          {stamp.prefix}{stamp.number}
        </span>
      </div>

      {/* Scrollable Control Settings */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">


        {/* B. GOVERNMENT DOCUMENT TYPE SELECTION (RSO, MEMO ES/FWA, MEMO_ATT/ATA, RAO_RMC, U_MEMO, NOV) */}
        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Document Type Prefix</span>
            </label>
            <button
              type="button"
              onClick={handleClearPrefix}
              className="text-[10px] text-slate-500 hover:text-blue-600 font-medium underline"
              title="Clear prefix (Number only)"
            >
              Number Only (No Prefix)
            </button>
          </div>

          <p className="text-[10px] text-slate-500">
            Select an official Philippine Government document type to attach to your stamp:
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {GOVERNMENT_DOCUMENT_TYPES.map((docType) => {
              const isSelected = stamp.documentType === docType.id || stamp.prefix.startsWith(docType.id);
              const lastRecord = trackerState?.lastByType[docType.id as GovernmentDocType];
              return (
                <button
                  key={docType.id}
                  type="button"
                  onClick={() => handleSelectDocType(docType.id, docType.defaultPrefix)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200'
                  }`}
                  title={`${docType.fullName} (${docType.defaultPrefix})`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono tracking-tight">{docType.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {lastRecord ? `Last: ${lastRecord.stampNumber}` : docType.fullName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom / Editable Prefix & Suffix input */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Active Prefix:</span>
              <input
                type="text"
                value={stamp.prefix}
                onChange={(e) => onStampChange({ prefix: e.target.value, documentType: 'CUSTOM' })}
                placeholder='e.g. "RSO No. "'
                className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Suffix (Optional):</span>
              <input
                type="text"
                value={stamp.suffix}
                onChange={(e) => onStampChange({ suffix: e.target.value })}
                placeholder='e.g. " - 2026"'
                className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Live Government Filename Preview */}
          <div className="pt-1.5 border-t border-slate-200/80">
            <div className="p-2 bg-blue-50/90 border border-blue-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-[10px] text-blue-900 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Download Filename Preview:</span>
                </span>
                <span className="text-[9px] text-blue-600 font-mono">Format: [TYPE] [NO] s [YR]-[SUBJ]</span>
              </div>
              <div className="font-mono text-[10px] font-bold text-slate-900 break-all bg-white p-1.5 rounded border border-blue-300 shadow-2xs">
                {liveFilenamePreview}
              </div>
            </div>
          </div>

          {/* Compact Recent Tracker Strip */}
          {trackerState && (
            <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <History className="w-3 h-3 text-blue-600" />
                  <span>Last Stamped & Downloaded</span>
                </span>
                {onOpenTrackerModal && (
                  <button
                    type="button"
                    onClick={onOpenTrackerModal}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    View Tracker ({trackerState.history.length})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {GOVERNMENT_DOC_TYPES.map((type) => {
                  const rec = trackerState.lastByType[type];
                  const nextNum = rec ? incrementDocumentNumber(rec.stampNumber, 1) : null;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between gap-1 bg-white border border-slate-200 rounded px-1.5 py-1 text-[10px]"
                      title={rec ? `${rec.filename} (${formatRelativeTime(rec.downloadedAt)})` : `No ${type} downloaded yet`}
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-700 block truncate text-[9px]">{type}</span>
                        <span className={`font-mono font-bold ${rec ? 'text-blue-700' : 'text-slate-300'}`}>
                          {rec ? rec.stampNumber : '------'}
                        </span>
                      </div>
                      {rec && nextNum && onUseTrackedNumber && (
                        <button
                          type="button"
                          onClick={() => onUseTrackedNumber(type, nextNum)}
                          className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded font-mono text-[9px] font-bold transition-colors shrink-0 flex items-center gap-0.5"
                          title={`Set number to next ${type} (${nextNum})`}
                        >
                          <Plus className="w-2.5 h-2.5" />1
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* C. PRIMARY DOCUMENT NUMBER INPUT (TEXT, NUMBERS, & SPECIAL CHARACTERS) */}
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              <span>Document Number</span>
            </label>
            <span className="text-[10px] text-blue-700 font-medium">Type any number or text</span>
          </div>

          {/* Big Number / Text Input Field */}
          <div className="relative">
            <input
              type="text"
              value={typedInput}
              onChange={handleNumberInputChange}
              onBlur={handleBlur}
              maxLength={36}
              placeholder="002852"
              className="w-full h-11 bg-white border-2 border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-lg text-center font-mono text-xl font-bold tracking-wider text-slate-900 outline-none tabular-nums shadow-xs px-2"
            />
          </div>

          {/* Quick Special Characters & Symbol Toolbar */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-medium">Quick Special Characters:</span>
            <div className="flex flex-wrap gap-1">
              {QUICK_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleInsertSymbol(sym)}
                  className="px-2 py-0.5 bg-white hover:bg-blue-100 hover:text-blue-800 border border-slate-300 text-slate-700 font-mono text-xs font-semibold rounded transition-colors shadow-2xs"
                  title={`Insert ${sym}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Increment / Decrement Steppers */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => handleIncrement(-1)}
              className="py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Decrement number by 1"
            >
              -1
            </button>
            <button
              onClick={() => handleIncrement(1)}
              className="py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Increment number by 1"
            >
              +1
            </button>
            <button
              onClick={() => handleIncrement(10)}
              className="py-1 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Increment number by 10"
            >
              +10
            </button>
            <button
              onClick={() => {
                setTypedInput('002852');
                onStampChange({ number: '002852' });
              }}
              className="py-1 bg-blue-100/80 hover:bg-blue-200/80 text-blue-800 font-mono font-medium rounded-md transition-colors text-[11px]"
              title="Reset to 002852 (from official sample)"
            >
              002852
            </button>
          </div>

          {/* Auto 6-Digit Padding Option */}
          <div className="flex items-center justify-between pt-1 text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stamp.padWithZeros}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onStampChange({ padWithZeros: checked });
                  if (checked) {
                    const padded = formatDocumentNumber(typedInput, true);
                    setTypedInput(padded);
                    onStampChange({ number: padded });
                  }
                }}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-[11px] font-medium">Standard 6-digit zero padding (002852)</span>
            </label>
          </div>
        </div>

        {/* D. PRESET LOCATIONS ON DOCUMENT WITH PRECISE UNDERLINE ALIGNMENT */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-slate-500" />
              <span>Alignment Presets</span>
            </span>
            <span className="text-[10px] text-blue-600 font-medium">Draggable on page</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_POSITIONS.map((preset) => (
              <button
                key={preset.name}
                onClick={() =>
                  onStampChange({
                    xPercent: preset.xPercent,
                    yPercent: preset.yPercent,
                  })
                }
                className={`px-2.5 py-1.5 border rounded-md text-left transition-colors ${
                  Math.abs(stamp.xPercent - preset.xPercent) < 1 &&
                  Math.abs(stamp.yPercent - preset.yPercent) < 1
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">{preset.name}</div>
                <div className="text-[9px] text-slate-400 truncate">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* E. INK COLOR PICKER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>Stamp Ink Color</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">{stamp.color}</span>
          </div>
          <div className="flex items-center gap-2">
            {INK_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => onStampChange({ color: c.hex })}
                style={{ backgroundColor: c.hex }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                  stamp.color.toLowerCase() === c.hex.toLowerCase()
                    ? 'ring-2 ring-offset-2 ring-blue-600 scale-110 shadow-sm'
                    : 'hover:scale-105'
                }`}
                title={`${c.name} (${c.desc})`}
              >
                {stamp.color.toLowerCase() === c.hex.toLowerCase() && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            ))}
            <input
              type="color"
              value={stamp.color}
              onChange={(e) => onStampChange({ color: e.target.value })}
              className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
              title="Custom Color"
            />
          </div>
        </div>

        {/* F. TYPOGRAPHY & FRAME */}
        <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-blue-600" />
                <span>Stamp Typography</span>
              </label>
              {isGovStandardActive && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                  <Check className="w-3 h-3" /> Standard Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button
                onClick={() => onStampChange({ fontFamily: 'TimesRoman' })}
                className={`py-1.5 px-2 text-[11px] font-serif font-bold rounded-md border text-center transition-colors ${
                  stamp.fontFamily === 'TimesRoman'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Formal Serif
              </button>
              <button
                onClick={() => onStampChange({ fontFamily: 'Courier' })}
                className={`py-1.5 px-2 text-[11px] font-mono font-semibold rounded-md border text-center transition-colors ${
                  stamp.fontFamily === 'Courier'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Courier (Gov)
              </button>
              <button
                onClick={() => onStampChange({ fontFamily: 'Helvetica' })}
                className={`py-1.5 px-2 text-[11px] font-sans font-bold rounded-md border text-center transition-colors ${
                  stamp.fontFamily === 'Helvetica'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Clean Sans
              </button>
            </div>

            {/* Simple button: Standard Government Format */}
            <button
              type="button"
              onClick={handleApplyGovernmentStandard}
              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border shadow-2xs ${
                isGovStandardActive
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-300'
              }`}
              title="Apply Standard Government Format: 15pt Formal Serif Bold, Official Blue (#0038a8), 0.0° Horizontal"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Standard Government Format (15pt Blue)</span>
              {isGovStandardActive && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              Frame / Border
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { id: 'none', label: 'None' },
                  { id: 'underline', label: 'Underline' },
                  { id: 'box', label: 'Box' },
                  { id: 'double-box', label: 'Double' },
                ] as const
              ).map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => onStampChange({ boxStyle: frame.id })}
                  className={`py-1 text-[11px] font-medium rounded-md border text-center transition-colors ${
                    stamp.boxStyle === frame.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* G. SIZE & ROTATION SLIDERS */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-800">Stamp Size</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-700">{stamp.fontSize} pt</span>
                {stamp.fontSize === 15 && (
                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-semibold">Standard</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="32"
                value={stamp.fontSize}
                onChange={(e) => onStampChange({ fontSize: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onStampChange({ fontSize: 15 })}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded text-[10px] font-mono whitespace-nowrap border border-slate-200"
                title="Reset to 15pt standard"
              >
                15pt
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-800">Rotation Angle</span>
              <span className="font-mono text-slate-600">{stamp.rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={stamp.rotation}
                onChange={(e) => onStampChange({ rotation: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <button
                onClick={() => onStampChange({ rotation: 0 })}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono whitespace-nowrap"
                title="Reset to 0°"
              >
                0°
              </button>
            </div>
          </div>
        </div>

        {/* H. PRECISION FINE-TUNING NUDGE D-PAD */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Precision Alignment Nudge</span>
            <span className="text-[10px] text-slate-400">0.2% per click</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="grid grid-cols-3 gap-1 w-28">
              <div />
              <button
                onClick={() => onStampNudge(0, -0.2)}
                className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Up (ArrowUp)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div />

              <button
                onClick={() => onStampNudge(-0.2, 0)}
                className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Left (ArrowLeft)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center justify-center text-[10px] font-mono text-slate-400">
                ·
              </div>
              <button
                onClick={() => onStampNudge(0.2, 0)}
                className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Right (ArrowRight)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div />
              <button
                onClick={() => onStampNudge(0, 0.2)}
                className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Down (ArrowDown)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div>
                X: <span className="font-mono font-bold text-slate-900">{stamp.xPercent.toFixed(1)}%</span>
              </div>
              <div>
                Y: <span className="font-mono font-bold text-slate-900">{stamp.yPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* I. PAGE STAMPING SCOPE */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="font-bold text-slate-900 block">Page Stamping Scope</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pageScope"
                checked={!stamp.applyToAllPages}
                onChange={() => onStampChange({ applyToAllPages: false })}
                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Current Page only (Page {currentPage} of {totalPages})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pageScope"
                checked={stamp.applyToAllPages}
                onChange={() => onStampChange({ applyToAllPages: true })}
                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Stamp on All Pages ({totalPages} pages)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Primary Download CTA Footer in Sidebar */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-1.5">
        <button
          onClick={onDownload}
          disabled={isProcessing}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-99 text-white font-bold text-xs md:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Preview & Download PDF</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-500">
          Includes Live Alignment Verification Preview
        </p>
      </div>
    </aside>
  );
};



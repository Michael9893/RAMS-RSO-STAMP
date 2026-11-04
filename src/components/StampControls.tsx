import React, { useState, useEffect } from 'react';
import {
  Hash,
  Palette,
  Type,
  Maximize,
  RotateCw,
  Sliders,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Sparkles,
  Check,
  Settings2,
  FileCheck2,
  Code2,
} from 'lucide-react';
import {
  StampConfig,
  formatDocumentNumber,
  incrementDocumentNumber,
} from '../utils/pdfStamper';

interface StampControlsProps {
  stamp: StampConfig;
  currentPage: number;
  totalPages: number;
  isProcessing: boolean;
  onStampChange: (updated: Partial<StampConfig>) => void;
  onStampNudge: (deltaX: number, deltaY: number) => void;
  onDownload: () => void;
}

const INK_COLORS = [
  { name: 'Official Blue', hex: '#0038a8', desc: 'Agency Stamp Ink' },
  { name: 'Stamp Red', hex: '#b91c1c', desc: 'Urgent / Control' },
  { name: 'Document Black', hex: '#111827', desc: 'Standard Black' },
  { name: 'Registry Purple', hex: '#6b21a8', desc: 'Registry Stamp' },
  { name: 'Office Green', hex: '#047857', desc: 'Approval Green' },
];

const PRESET_POSITIONS = [
  { name: 'Order No. Underline', xPercent: 16.5, yPercent: 14.2, desc: 'Next to No. ______' },
  { name: 'Top-Right Header', xPercent: 72, yPercent: 6.5, desc: 'Barcode / Doc #' },
  { name: 'Top-Left Header', xPercent: 8.5, yPercent: 6.5, desc: 'Reference Code' },
  { name: 'Bottom-Right Signoff', xPercent: 68, yPercent: 88, desc: 'Approval Line' },
];

const QUICK_SYMBOLS = ['#', '-', '/', '_', '.', 'No.', 'RSO-', '2026', '()'];

export const StampControls: React.FC<StampControlsProps> = ({
  stamp,
  currentPage,
  totalPages,
  isProcessing,
  onStampChange,
  onStampNudge,
  onDownload,
}) => {
  const [typedInput, setTypedInput] = useState(stamp.number);

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

  return (
    <aside className="w-full md:w-80 lg:w-92 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0 shadow-xs z-20">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-sm text-slate-900 tracking-tight">
            Document Stamp Controls
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[120px]">
          {stamp.number}
        </span>
      </div>

      {/* Scrollable Control Settings */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700">
        {/* 1. PRIMARY DOCUMENT NUMBER INPUT (TEXT, NUMBERS, & SPECIAL CHARACTERS) */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              <span>Document Number & Text</span>
            </label>
            <span className="text-[10px] text-blue-700 font-medium">Text & symbols supported</span>
          </div>

          {/* Big Number / Text Input Field */}
          <div className="relative">
            <input
              type="text"
              value={typedInput}
              onChange={handleNumberInputChange}
              onBlur={handleBlur}
              maxLength={36}
              placeholder="002852 or RSO-2026-002852"
              className="w-full h-12 bg-white border-2 border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-lg text-center font-mono text-xl font-bold tracking-wider text-slate-900 outline-none tabular-nums shadow-xs px-2"
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

          {/* Quick Increment / Decrement Steppers (Preserves text prefix/symbols!) */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => handleIncrement(-1)}
              className="py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Decrement number by 1"
            >
              -1
            </button>
            <button
              onClick={() => handleIncrement(1)}
              className="py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Increment number by 1"
            >
              +1
            </button>
            <button
              onClick={() => handleIncrement(10)}
              className="py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-md transition-colors text-xs"
              title="Increment number by 10"
            >
              +10
            </button>
            <button
              onClick={() => {
                setTypedInput('002852');
                onStampChange({ number: '002852' });
              }}
              className="py-1.5 bg-blue-100/80 hover:bg-blue-200/80 text-blue-800 font-medium rounded-md transition-colors text-[11px]"
              title="Reset to 002852"
            >
              002852
            </button>
          </div>

          {/* Format Presets Chips */}
          <div className="pt-1 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setTypedInput('RSO-2026-002852');
                onStampChange({ number: 'RSO-2026-002852' });
              }}
              className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 hover:border-blue-400 rounded text-slate-600 transition-colors"
            >
              RSO-2026-002852
            </button>
            <button
              type="button"
              onClick={() => {
                setTypedInput('No. #002852');
                onStampChange({ number: 'No. #002852' });
              }}
              className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 hover:border-blue-400 rounded text-slate-600 transition-colors"
            >
              No. #002852
            </button>
            <button
              type="button"
              onClick={() => {
                setTypedInput('SO/2852-A');
                onStampChange({ number: 'SO/2852-A' });
              }}
              className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 hover:border-blue-400 rounded text-slate-600 transition-colors"
            >
              SO/2852-A
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
              <span className="text-[11px] font-medium">Auto-pad numeric sequence to 6 digits</span>
            </label>
          </div>
        </div>

        {/* 2. OPTIONAL PREFIX & SUFFIX */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span>Prefix & Suffix Text</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Prefix (e.g. "No. ")</span>
              <input
                type="text"
                value={stamp.prefix}
                onChange={(e) => onStampChange({ prefix: e.target.value })}
                placeholder="No. "
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Suffix (Optional)</span>
              <input
                type="text"
                value={stamp.suffix}
                onChange={(e) => onStampChange({ suffix: e.target.value })}
                placeholder=" - 2026"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. PRESET LOCATIONS ON DOCUMENT */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-slate-500" />
              <span>Quick Position Presets</span>
            </span>
            <span className="text-[10px] text-slate-400">or click document</span>
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
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left transition-colors"
              >
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {preset.name}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. INK COLOR PICKER */}
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

        {/* 5. FONT FAMILY & BORDER FRAME */}
        <div className="space-y-3">
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              Stamp Typography Style
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onStampChange({ fontFamily: 'Courier' })}
                className={`py-1.5 px-2 text-[11px] font-mono font-semibold rounded-md border text-center transition-colors ${
                  stamp.fontFamily === 'Courier'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mechanical
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
            </div>
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
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6. SIZE & ROTATION SLIDERS */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-800">Stamp Size</span>
              <span className="font-mono text-slate-500">{stamp.fontSize} pt</span>
            </div>
            <input
              type="range"
              min="10"
              max="36"
              value={stamp.fontSize}
              onChange={(e) => onStampChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-800">Stamp Tilt Angle</span>
              <span className="font-mono text-slate-500">{stamp.rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={stamp.rotation}
                onChange={(e) => onStampChange({ rotation: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <button
                onClick={() => onStampChange({ rotation: 0 })}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-mono whitespace-nowrap"
                title="Reset to 0°"
              >
                0°
              </button>
              <button
                onClick={() => onStampChange({ rotation: -1.5 })}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-mono whitespace-nowrap"
                title="Real hand stamp slight tilt"
              >
                -1.5°
              </button>
            </div>
          </div>
        </div>

        {/* 7. PAGE SCOPE & MULTI-PAGE SEQUENCING */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
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

          {stamp.applyToAllPages && totalPages > 1 && (
            <div className="pl-5 pt-1 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stamp.sequential}
                  onChange={(e) => onStampChange({ sequential: e.target.checked })}
                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-700 font-semibold">
                  Sequential (+1 per page, e.g. {stamp.number} →{' '}
                  {incrementDocumentNumber(stamp.number, 1)})
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 8. FINE-TUNING NUDGE D-PAD */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Precision Nudge Controls</span>
            <span className="text-[10px] text-slate-400">Arrow keys supported</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="grid grid-cols-3 gap-1 w-28">
              <div />
              <button
                onClick={() => onStampNudge(0, -0.3)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div />

              <button
                onClick={() => onStampNudge(-0.3, 0)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center justify-center text-[10px] font-mono text-slate-400">
                1px
              </div>
              <button
                onClick={() => onStampNudge(0.3, 0)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div />
              <button
                onClick={() => onStampNudge(0, 0.3)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center transition-colors"
                title="Nudge Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>

            <div className="text-[10px] text-slate-500 space-y-1">
              <div>
                X: <span className="font-mono font-semibold text-slate-800">{stamp.xPercent}%</span>
              </div>
              <div>
                Y: <span className="font-mono font-semibold text-slate-800">{stamp.yPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Download CTA Footer in Sidebar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <button
          onClick={onDownload}
          disabled={isProcessing}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-99 text-white font-bold text-xs md:text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating Stamped PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download Stamped PDF</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          Crisp vector output · 100% original quality preserved
        </p>
      </div>
    </aside>
  );
};

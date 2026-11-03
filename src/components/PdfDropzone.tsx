import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Shield, Stamp, Hash } from 'lucide-react';

interface PdfDropzoneProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFileSelected,
  onLoadSample,
  isLoadingSample,
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
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onFileSelected(file);
      }
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
          accept="application/pdf"
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
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-98"
          >
            Browse PDF Document
          </button>

          <span className="text-xs text-slate-400 font-medium">or</span>

          <button
            type="button"
            onClick={onLoadSample}
            disabled={isLoadingSample}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            {isLoadingSample ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-blue-600" />
            )}
            <span>Try Sample Document (DSWD Special Order)</span>
          </button>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
            <Hash className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Type Any 6-Digit Number</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Type directly to change the number (e.g. <span className="font-mono text-blue-700 font-semibold">002852</span>). Auto-zero padding, quick +/- buttons, and optional series prefixes.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
            <Stamp className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Pixel-Perfect Drag & Align</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Drag the stamp directly onto the signature underline or blank slot. Arrow-key nudge controls ensure exact alignment.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Authentic Office Ink</h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Choose mechanical rotary stamp font, authentic government blue ink, red verification stamp, or clean black.
          </p>
        </div>
      </div>
    </div>
  );
};

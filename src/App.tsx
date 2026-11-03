import React, { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { TopNavbar } from './components/TopNavbar';
import { PdfDropzone } from './components/PdfDropzone';
import { PdfViewer } from './components/PdfViewer';
import { StampControls } from './components/StampControls';
import {
  StampConfig,
  stampPdfDocument,
  createSampleDocumentPdf,
  downloadPdfBlob,
} from './utils/pdfStamper';
import { loadPdfDocument } from './utils/pdfRenderer';

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Default stamp config initialized to match the user's sample document photo
  const [stamp, setStamp] = useState<StampConfig>({
    id: 'default-stamp',
    number: '002852',
    prefix: '',
    suffix: '',
    xPercent: 16.5,
    yPercent: 14.2,
    pageNumber: 1,
    applyToAllPages: false,
    sequential: false,
    fontSize: 16,
    fontFamily: 'Courier',
    color: '#0038a8', // Official DSWD blue stamp ink
    opacity: 0.95,
    rotation: -0.5,
    boxStyle: 'none',
    padWithZeros: true,
    letterSpacing: 0,
    isStampDistressed: true,
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to load a PDF from ArrayBuffer or Uint8Array
  const loadPdfBytes = async (data: ArrayBuffer | Uint8Array, name: string) => {
    setIsProcessing(true);
    try {
      const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      const masterCopy = new Uint8Array(rawBytes.byteLength);
      masterCopy.set(rawBytes);

      const doc = await loadPdfDocument(masterCopy);
      setPdfBytes(masterCopy.buffer);
      setPdfDocument(doc);
      setFilename(name);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setStamp((prev) => ({ ...prev, pageNumber: 1 }));
      showToast(`Loaded ${name} (${doc.numPages} page${doc.numPages > 1 ? 's' : ''})`);
    } catch (err) {
      console.error('Failed to load PDF bytes:', err);
      showToast('Could not parse PDF. Please verify it is a valid PDF document.', 'error');
    } finally {
      setIsProcessing(false);
      setIsUploadModalOpen(false);
    }
  };

  // Automatically load the sample DSWD document on initial launch
  useEffect(() => {
    let isMounted = true;

    async function initSample() {
      setIsLoadingSample(true);
      try {
        const sample = await createSampleDocumentPdf();
        if (isMounted) {
          await loadPdfBytes(sample.data, sample.filename);
        }
      } catch (err) {
        console.error('Failed to auto-load sample:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSample(false);
        }
      }
    }

    initSample();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileSelected = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    await loadPdfBytes(arrayBuffer, file.name);
  };

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const sample = await createSampleDocumentPdf();
      await loadPdfBytes(sample.data, sample.filename);
      // Reset position to underline in the sample
      setStamp((prev) => ({
        ...prev,
        xPercent: 16.5,
        yPercent: 14.2,
        number: '002852',
        color: '#0038a8',
      }));
    } catch (err) {
      console.error('Failed to load sample document:', err);
      showToast('Failed to load sample document', 'error');
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleResetStamp = () => {
    setStamp((prev) => ({
      ...prev,
      xPercent: 16.5,
      yPercent: 14.2,
      number: '002852',
      rotation: 0,
      fontSize: 16,
      boxStyle: 'none',
      color: '#0038a8',
    }));
    showToast('Stamp reset to default settings');
  };

  const handleStampChange = (updated: Partial<StampConfig>) => {
    setStamp((prev) => ({ ...prev, ...updated }));
  };

  const handleStampPositionChange = (xPercent: number, yPercent: number) => {
    setStamp((prev) => ({ ...prev, xPercent, yPercent }));
  };

  const handleStampNudge = useCallback((deltaX: number, deltaY: number) => {
    setStamp((prev) => {
      const newX = Math.max(0, Math.min(95, Number((prev.xPercent + deltaX).toFixed(2))));
      const newY = Math.max(0, Math.min(95, Number((prev.yPercent + deltaY).toFixed(2))));
      return { ...prev, xPercent: newX, yPercent: newY };
    });
  }, []);

  const handleDownloadStampedPdf = async () => {
    if (!pdfBytes) {
      showToast('No PDF loaded to stamp', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const stampedPdfBytes = await stampPdfDocument(pdfBytes.slice(0), stamp);
      const cleanBaseName = (filename || 'document').replace(/\.pdf$/i, '');
      const downloadName = `${cleanBaseName}_stamped_${stamp.number}.pdf`;
      downloadPdfBlob(stampedPdfBytes, downloadName);
      showToast(`Stamped PDF saved as "${downloadName}"!`);
    } catch (err) {
      console.error('Error stamping PDF document:', err);
      showToast('Error stamping PDF. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <TopNavbar
        filename={filename}
        totalPages={totalPages}
        currentPage={currentPage}
        currentNumber={stamp.number}
        isProcessing={isProcessing}
        onDownload={handleDownloadStampedPdf}
        onResetStamp={handleResetStamp}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onLoadSample={handleLoadSample}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {pdfDocument ? (
          <>
            {/* Center: Interactive PDF Page Canvas Viewport */}
            <div className="flex-1 h-full overflow-hidden flex flex-col">
              <PdfViewer
                pdfDocument={pdfDocument}
                currentPage={currentPage}
                totalPages={totalPages}
                stamp={stamp}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  if (!stamp.applyToAllPages) {
                    setStamp((prev) => ({ ...prev, pageNumber: page }));
                  }
                }}
                onStampPositionChange={handleStampPositionChange}
                onStampNudge={handleStampNudge}
              />
            </div>

            {/* Right: Stamp Number & Styling Sidebar */}
            <StampControls
              stamp={stamp}
              currentPage={currentPage}
              totalPages={totalPages}
              isProcessing={isProcessing}
              onStampChange={handleStampChange}
              onStampNudge={handleStampNudge}
              onDownload={handleDownloadStampedPdf}
            />
          </>
        ) : (
          /* Empty / Initial Dropzone View */
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <PdfDropzone
              onFileSelected={handleFileSelected}
              onLoadSample={handleLoadSample}
              isLoadingSample={isLoadingSample}
            />
          </div>
        )}
      </main>

      {/* 3. UPLOAD MODAL (when document is already open) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload New Document</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select or drop a new PDF file to stamp with 6-digit numbers.
            </p>

            <PdfDropzone
              onFileSelected={handleFileSelected}
              onLoadSample={handleLoadSample}
              isLoadingSample={isLoadingSample}
            />
          </div>
        </div>
      )}

      {/* 4. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-medium animate-in slide-in-from-bottom-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}

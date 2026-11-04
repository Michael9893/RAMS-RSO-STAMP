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
  ListFilter,
  Sparkles,
} from 'lucide-react';
import { TopNavbar } from './components/TopNavbar';
import { PdfDropzone } from './components/PdfDropzone';
import { PdfViewer } from './components/PdfViewer';
import { StampControls } from './components/StampControls';
import { DownloadModal } from './components/DownloadModal';
import { DocumentInfoModal } from './components/DocumentInfoModal';
import {
  StampConfig,
  stampPdfDocument,
  stampAndExtractSinglePagePdf,
  stampAndExtractSelectedPagesPdf,
  createSampleDocumentPdf,
  downloadPdfBlob,
} from './utils/pdfStamper';
import { loadPdfDocument, extractFullTextFromPdf } from './utils/pdfRenderer';
import {
  CategorizedDocumentInfo,
  DEFAULT_DSWD_METADATA,
} from './types/documentMetadata';
import { parseDocumentInfoFromExtractedText } from './utils/textParser';

export default function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Categorized Document Information (Name, Subject, Dates, Personnel, Approval)
  const [metadata, setMetadata] = useState<CategorizedDocumentInfo>(DEFAULT_DSWD_METADATA);

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

      // Extract verbatim text from PDF
      let extractedFullText = '';
      let extractedPages: { pageNumber: number; text: string }[] = [];
      try {
        const textResult = await extractFullTextFromPdf(doc);
        extractedFullText = textResult.fullText;
        extractedPages = textResult.pagesText;
      } catch (err) {
        console.warn('Text extraction fallback:', err);
      }

      // Check if loading the built-in sample document
      const isSample =
        name === 'Regional_Special_Order_DSWD.pdf' ||
        name === 'Sample_Official_Order.pdf';

      if (isSample) {
        setMetadata(DEFAULT_DSWD_METADATA);
      } else {
        // Automatically extract all text and parse into Categorized Document Info for the new PDF
        const newDocMetadata = parseDocumentInfoFromExtractedText(
          extractedFullText,
          name,
          doc.numPages,
          masterCopy.byteLength,
          extractedPages
        );
        setMetadata(newDocMetadata);

        // If a document number was detected in the new PDF, set stamp number to match
        if (newDocMetadata.documentNumber && newDocMetadata.documentNumber !== '000001') {
          setStamp((prev) => ({
            ...prev,
            number: newDocMetadata.documentNumber,
          }));
        }
      }

      showToast(`Loaded ${name} (${doc.numPages} page${doc.numPages > 1 ? 's' : ''}) - Document Info updated!`);
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
      setMetadata(DEFAULT_DSWD_METADATA);
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
    setStamp((prev) => {
      const next = { ...prev, ...updated };
      if (updated.number !== undefined) {
        // Keep metadata documentNumber in sync
        setMetadata((m) => ({ ...m, documentNumber: updated.number! }));
      }
      return next;
    });
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

  // Opens the single file / download options modal
  const handleOpenDownloadModal = () => {
    if (!pdfBytes) {
      showToast('No PDF loaded to stamp', 'error');
      return;
    }
    setIsDownloadModalOpen(true);
  };

  // Executes download based on user's selected pages
  const handleConfirmDownload = async (
    selectedPages: number[],
    customFilename: string
  ) => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    try {
      // Extract and stamp only the chosen pages (e.g. [1, 3, 4] of 4)
      const finalBytes = await stampAndExtractSelectedPagesPdf(
        pdfBytes.slice(0),
        stamp,
        selectedPages
      );

      downloadPdfBlob(finalBytes, customFilename);
      setIsDownloadModalOpen(false);
      showToast(
        selectedPages.length === totalPages
          ? `Downloaded all ${totalPages} pages: "${customFilename}"!`
          : `Downloaded ${selectedPages.length} selected page${selectedPages.length > 1 ? 's' : ''} (Pages ${selectedPages.join(', ')}): "${customFilename}"!`
      );
    } catch (err) {
      console.error('Error stamping PDF document:', err);
      showToast('Error generating PDF file. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMetadata = (updated: Partial<CategorizedDocumentInfo>) => {
    setMetadata((prev) => ({ ...prev, ...updated }));
  };

  const handleApplyStampNumber = (num: string) => {
    handleStampChange({ number: num });
    showToast(`Applied "${num}" to stamp number!`);
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
        onDownload={handleOpenDownloadModal}
        onResetStamp={handleResetStamp}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onLoadSample={handleLoadSample}
        onOpenMetadataModal={() => setIsMetadataModalOpen(true)}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {pdfDocument ? (
          <>
            {/* Center: Interactive PDF Page Canvas Viewport */}
            <div className="flex-1 h-full overflow-hidden flex flex-col relative">
              <PdfViewer
                pdfDocument={pdfDocument}
                currentPage={currentPage}
                totalPages={totalPages}
                stamp={stamp}
                extractedFullText={metadata.fullVerbatimText}
                pagesText={metadata.pagesText}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  if (!stamp.applyToAllPages) {
                    setStamp((prev) => ({ ...prev, pageNumber: page }));
                  }
                }}
                onStampPositionChange={handleStampPositionChange}
                onStampNudge={handleStampNudge}
                onApplyStampNumber={handleApplyStampNumber}
              />

              {/* Quick Floating Pill: Document Info Drawer Access */}
              <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setIsMetadataModalOpen(true)}
                  className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold rounded-lg shadow-md border border-slate-200 backdrop-blur-xs flex items-center gap-2 transition-all hover:scale-102"
                  title="View full categorized details by Subject, Names, and Dates"
                >
                  <ListFilter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Subject: <strong className="text-slate-900 truncate max-w-[160px] inline-block align-bottom">{metadata.subject}</strong></span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                    {metadata.personnel.length} Names
                  </span>
                </button>
              </div>
            </div>

            {/* Right: Stamp Number & Styling Sidebar */}
            <StampControls
              stamp={stamp}
              currentPage={currentPage}
              totalPages={totalPages}
              isProcessing={isProcessing}
              onStampChange={handleStampChange}
              onStampNudge={handleStampNudge}
              onDownload={handleOpenDownloadModal}
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

      {/* 3. DOWNLOAD MODAL (Choose single file / specific page) */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        filename={filename || 'document.pdf'}
        totalPages={totalPages}
        currentPage={currentPage}
        stamp={stamp}
        isProcessing={isProcessing}
        onClose={() => setIsDownloadModalOpen(false)}
        onConfirmDownload={handleConfirmDownload}
      />

      {/* 4. CATEGORIZED DOCUMENT INFO & METADATA MODAL */}
      <DocumentInfoModal
        isOpen={isMetadataModalOpen}
        metadata={metadata}
        onClose={() => setIsMetadataModalOpen(false)}
        onUpdateMetadata={handleUpdateMetadata}
        onApplyStampNumber={handleApplyStampNumber}
      />

      {/* 5. UPLOAD MODAL (when document is already open) */}
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
              Select or drop a new PDF file to stamp with numbers, text, or symbols.
            </p>

            <PdfDropzone
              onFileSelected={handleFileSelected}
              onLoadSample={handleLoadSample}
              isLoadingSample={isLoadingSample}
            />
          </div>
        </div>
      )}

      {/* 6. TOAST NOTIFICATION */}
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

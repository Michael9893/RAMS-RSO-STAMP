import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

// Standard font metrics constants for pixel-perfect PDF alignment
const FONT_METRICS: Record<string, { capHeightRatio: number; descentRatio: number }> = {
  Courier: { capHeightRatio: 0.68, descentRatio: 0.22 },
  Helvetica: { capHeightRatio: 0.72, descentRatio: 0.21 },
  TimesRoman: { capHeightRatio: 0.68, descentRatio: 0.22 },
};

// Standard padding around stamp in PDF points
export const STAMP_PAD_X_PT = 4;
export const STAMP_PAD_Y_PT = 2;

export interface StampConfig {
  id: string;
  number: string; // 6 digits or alphanumeric, e.g. "002852"
  prefix: string; // e.g. "RSO No. " or ""
  suffix: string; // e.g. ""
  xPercent: number; // 0 to 100 (% of page width)
  yPercent: number; // 0 to 100 (% of page height from top)
  pageNumber: number; // 1-indexed
  applyToAllPages: boolean;
  sequential: boolean; // increment number per page
  fontSize: number; // in points (e.g. 15 for government standard)
  fontFamily: 'Courier' | 'Helvetica' | 'TimesRoman';
  color: string; // hex color e.g. "#0038a8"
  opacity: number; // 0.1 to 1.0
  rotation: number; // in degrees (-45 to 45)
  boxStyle: 'none' | 'box' | 'underline' | 'double-box';
  padWithZeros: boolean;
  letterSpacing: number; // slight spacing between digits for mechanical stamp feel
  isStampDistressed?: boolean; // slight rubber stamp ink variation
  documentType?: 'RSO' | 'MEMO ES/FWA' | 'MEMO_ATT/ATA' | 'RAO_RMC' | 'U_MEMO' | 'NOV' | 'CUSTOM' | 'NONE';
}

// Government Standard Preset values for professional numbering
export const GOVERNMENT_STANDARD_STAMP: Partial<StampConfig> = {
  fontFamily: 'Courier',
  fontSize: 15,
  color: '#0038a8', // Official Philippine Government Blue Ink
  opacity: 0.96,
  rotation: 0,
  boxStyle: 'none',
  padWithZeros: true,
  isStampDistressed: true,
};

export const GOVERNMENT_DOCUMENT_TYPES = [
  { id: 'RSO', label: 'RSO', fullName: 'Regional Special Order', defaultPrefix: 'RSO No. ' },
  { id: 'MEMO ES/FWA', label: 'MEMO ES/FWA', fullName: 'Memo - Executive Services / FWA', defaultPrefix: 'MEMO ES/FWA No. ' },
  { id: 'MEMO_ATT/ATA', label: 'MEMO_ATT/ATA', fullName: 'Memo - Authority to Travel / Attend', defaultPrefix: 'MEMO_ATT/ATA No. ' },
  { id: 'RAO_RMC', label: 'RAO_RMC', fullName: 'Regional Admin Order / Memo Circular', defaultPrefix: 'RAO_RMC No. ' },
  { id: 'U_MEMO', label: 'U_MEMO', fullName: 'Unnumbered / Unit Memorandum', defaultPrefix: 'U_MEMO No. ' },
  { id: 'NOV', label: 'NOV', fullName: 'Notice of Violation', defaultPrefix: 'NOV No. ' },
] as const;

export function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) {
    return rgb(0, 0.22, 0.65); // Default official blue
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return rgb(r / 255, g / 255, b / 255);
}

export function sanitizeForPdfFont(text: string): string {
  // Normalize typography characters to standard ASCII printable range (32 to 126)
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x20-\x7E]/g, '');
}

export function formatDocumentNumber(value: string, padNumericPart: boolean = true): string {
  if (!value) return padNumericPart ? '000000' : '';

  if (!padNumericPart) {
    return value.slice(0, 36);
  }

  // If input is purely numeric, pad to 6 digits
  if (/^\d+$/.test(value)) {
    return value.padStart(6, '0').slice(0, 12);
  }

  // If input has text prefix and ends with numbers (e.g. "RSO-2026-42" or "No. 42")
  const match = value.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numPart = match[2];
    if (numPart.length < 6) {
      return `${prefix}${numPart.padStart(6, '0')}`;
    }
  }

  return value.slice(0, 36);
}

export const formatSixDigits = formatDocumentNumber;

export function incrementDocumentNumber(currentVal: string, incrementBy: number = 1): string {
  if (!currentVal) return '000001';

  // Match the last sequence of digits anywhere in the string
  const lastNumMatch = currentVal.match(/(.*?)(\d+)(.*?)$/);
  if (lastNumMatch) {
    const prefix = lastNumMatch[1];
    const digitsStr = lastNumMatch[2];
    const suffix = lastNumMatch[3];
    const originalLen = digitsStr.length;
    const num = parseInt(digitsStr, 10);
    const nextNum = Math.max(0, num + incrementBy);
    const nextDigitsStr = String(nextNum).padStart(originalLen, '0');
    return `${prefix}${nextDigitsStr}${suffix}`;
  }

  return `${currentVal}-${String(incrementBy).padStart(6, '0')}`;
}

export const incrementSixDigitNumber = incrementDocumentNumber;

export async function stampAndExtractSinglePagePdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  stamp: StampConfig,
  targetPageNumber: number // 1-indexed
): Promise<Uint8Array> {
  return stampAndExtractSelectedPagesPdf(pdfBytes, stamp, [targetPageNumber]);
}

export async function stampAndExtractSelectedPagesPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  stamp: StampConfig,
  selectedPageNumbers: number[] // 1-indexed, e.g. [1, 3, 4]
): Promise<Uint8Array> {
  const stampedBytes = await stampPdfDocument(pdfBytes, stamp);
  const stampedDoc = await PDFDocument.load(stampedBytes);
  const totalPages = stampedDoc.getPageCount();

  // Deduplicate and filter valid page numbers
  const validPages = Array.from(new Set(selectedPageNumbers))
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  if (validPages.length === 0 || validPages.length === totalPages) {
    return stampedBytes;
  }

  const pageIndicesToCopy = validPages.map((p) => p - 1);
  const selectedDoc = await PDFDocument.create();
  const copiedPages = await selectedDoc.copyPages(stampedDoc, pageIndicesToCopy);
  copiedPages.forEach((page) => selectedDoc.addPage(page));

  return await selectedDoc.save();
}

/**
 * Stamps the PDF document with mathematical coordinate alignment matching the interactive screen overlay.
 */
export async function stampPdfDocument(
  pdfBytes: ArrayBuffer | Uint8Array,
  stamp: StampConfig
): Promise<Uint8Array> {
  // Ensure we pass a fresh cloned copy so detached buffers never cause an error
  const rawBytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const clonedBytes = new Uint8Array(rawBytes.byteLength);
  clonedBytes.set(rawBytes);

  const pdfDoc = await PDFDocument.load(clonedBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Select font
  let font;
  let fontKey = 'Courier';
  if (stamp.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.CourierBold);
    fontKey = 'Courier';
  } else if (stamp.fontFamily === 'TimesRoman') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    fontKey = 'TimesRoman';
  } else {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontKey = 'Helvetica';
  }

  const metrics = FONT_METRICS[fontKey] || FONT_METRICS.Courier;
  const textColor = hexToRgb(stamp.color);

  // Determine pages to stamp
  const targetPageIndices: number[] = [];
  if (stamp.applyToAllPages) {
    for (let i = 0; i < totalPages; i++) {
      targetPageIndices.push(i);
    }
  } else {
    const targetIdx = Math.max(0, Math.min(totalPages - 1, stamp.pageNumber - 1));
    targetPageIndices.push(targetIdx);
  }

  for (let idx = 0; idx < targetPageIndices.length; idx++) {
    const pageIndex = targetPageIndices[idx];
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Calculate sequential number if applicable
    let currentNumberStr = stamp.number;
    if (stamp.applyToAllPages && stamp.sequential) {
      currentNumberStr = incrementDocumentNumber(stamp.number, idx);
    }

    const fullStampText = sanitizeForPdfFont(`${stamp.prefix}${currentNumberStr}${stamp.suffix}`) || ' ';
    const textWidth = font.widthOfTextAtSize(fullStampText, stamp.fontSize);
    const textHeight = font.heightAtSize(stamp.fontSize);

    // EXACT COORDINATE MATH TO MATCH SCREEN OVERLAY:
    // In StampOverlay, the bounding box top-left is placed at:
    // left: (stamp.xPercent / 100) * containerWidth
    // top:  (stamp.yPercent / 100) * containerHeight
    // with padding STAMP_PAD_X_PT and STAMP_PAD_Y_PT.
    const padX = STAMP_PAD_X_PT;
    const padY = STAMP_PAD_Y_PT;

    // Outer box top-left in PDF points (measuring from top):
    const boxLeft = (stamp.xPercent / 100) * pageWidth;
    const boxTopFromPageTop = (stamp.yPercent / 100) * pageHeight;

    const boxWidth = textWidth + padX * 2;
    const boxHeight = textHeight + padY * 2;

    // In PDF space, origin is bottom-left.
    // The bottom of the outer box is:
    const boxBottomPdf = pageHeight - (boxTopFromPageTop + boxHeight);

    // Font cap height (distance from baseline to top of capital letters)
    const capHeight = stamp.fontSize * metrics.capHeightRatio;

    // The text in StampOverlay is placed at (boxLeft + padX, boxTopFromPageTop + padY)
    // In PDF, page.drawText's Y is the font BASELINE.
    // Therefore, baseline from page top is: boxTopFromPageTop + padY + capHeight.
    // In PDF coordinate space (y=0 at bottom), baseline Y is:
    const stampTextX = boxLeft + padX;
    const stampTextY = pageHeight - (boxTopFromPageTop + padY + capHeight);

    page.pushOperators();

    // Handle box or underline frames
    if (stamp.boxStyle === 'box') {
      page.drawRectangle({
        x: boxLeft,
        y: boxBottomPdf,
        width: boxWidth,
        height: boxHeight,
        borderColor: textColor,
        borderWidth: 1.5,
        opacity: stamp.opacity,
        rotate: degrees(stamp.rotation),
      });
    } else if (stamp.boxStyle === 'double-box') {
      page.drawRectangle({
        x: boxLeft,
        y: boxBottomPdf,
        width: boxWidth,
        height: boxHeight,
        borderColor: textColor,
        borderWidth: 1.5,
        opacity: stamp.opacity,
        rotate: degrees(stamp.rotation),
      });
      page.drawRectangle({
        x: boxLeft - 2.5,
        y: boxBottomPdf - 2.5,
        width: boxWidth + 5,
        height: boxHeight + 5,
        borderColor: textColor,
        borderWidth: 0.8,
        opacity: stamp.opacity * 0.8,
        rotate: degrees(stamp.rotation),
      });
    } else if (stamp.boxStyle === 'underline') {
      const underlineY = stampTextY - 2;
      page.drawLine({
        start: { x: boxLeft, y: underlineY },
        end: { x: boxLeft + boxWidth, y: underlineY },
        color: textColor,
        thickness: 1.5,
        opacity: stamp.opacity,
      });
    }

    // Draw main stamped text at precision baseline
    page.drawText(fullStampText, {
      x: stampTextX,
      y: stampTextY,
      size: stamp.fontSize,
      font: font,
      color: textColor,
      opacity: stamp.opacity,
      rotate: degrees(stamp.rotation),
    });

    // If distress/ink texture is enabled, add subtle authentic mechanical ink artifact
    if (stamp.isStampDistressed) {
      page.drawText(fullStampText, {
        x: stampTextX + 0.35,
        y: stampTextY - 0.25,
        size: stamp.fontSize,
        font: font,
        color: textColor,
        opacity: stamp.opacity * 0.32,
        rotate: degrees(stamp.rotation),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Creates a sample PDF containing the exact government memorandum from the user's uploaded attachment,
 * or a clean structured document vector layout as a fallback.
 */
/**
 * Safely embeds any image format into a PDFDocument.
 * Attempts native pdf-lib PNG/JPG first, then falls back to browser canvas rasterization
 * which seamlessly handles WebP, interlaced PNGs, indexed palettes, GIFs, and BMPs.
 */
export async function embedImageSafely(
  pdfDoc: PDFDocument,
  imageBytes: ArrayBuffer | Uint8Array
) {
  const rawBytes = imageBytes instanceof Uint8Array ? imageBytes : new Uint8Array(imageBytes);

  // 1. Direct PNG embed
  try {
    return await pdfDoc.embedPng(rawBytes);
  } catch {
    // 2. Direct JPG embed
    try {
      return await pdfDoc.embedJpg(rawBytes);
    } catch {
      // 3. Fallback to HTML canvas rendering
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        return await new Promise<any>((resolve, reject) => {
          const blob = new Blob([rawBytes.buffer as ArrayBuffer]);
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(url);
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width || 800;
              canvas.height = img.naturalHeight || img.height || 1000;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas 2d context'));
                return;
              }
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);

              canvas.toBlob(
                async (blobResult) => {
                  if (!blobResult) {
                    reject(new Error('Canvas rasterization failed'));
                    return;
                  }
                  try {
                    const buf = await blobResult.arrayBuffer();
                    const embedded = await pdfDoc.embedJpg(buf);
                    resolve(embedded);
                  } catch (e) {
                    reject(e);
                  }
                },
                'image/jpeg',
                0.95
              );
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image failed to load in browser rasterizer'));
          };
          img.src = url;
        });
      }
      throw new Error('Could not embed image into PDF document');
    }
  }
}

/**
 * Creates the sample PDF document using the Regional Special Order asset
 * or a clean structured document vector layout as a fallback.
 */
export async function createSampleDocumentPdf(): Promise<{ data: Uint8Array; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  
  try {
    const response = await fetch('/assets/aistudio/image_f1584ad3.png');
    if (response.ok) {
      const imageBytes = await response.arrayBuffer();
      const img = await embedImageSafely(pdfDoc, imageBytes);
      
      // Standard A4 dimensions in points: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      const margin = 20;
      const availableW = pageWidth - margin * 2;
      const availableH = pageHeight - margin * 2;
      
      const imgAspect = img.width / img.height;
      let renderW = availableW;
      let renderH = availableW / imgAspect;
      
      if (renderH > availableH) {
        renderH = availableH;
        renderW = availableH * imgAspect;
      }
      
      const renderX = (pageWidth - renderW) / 2;
      const renderY = pageHeight - margin - renderH;
      
      page.drawImage(img, {
        x: renderX,
        y: renderY,
        width: renderW,
        height: renderH,
      });

      // Remove printed "00 2852" from the sample document line to provide a clean, blank line for stamping
      const blankX = renderX + (154 / 1031) * renderW;
      const blankW = (150 / 1031) * renderW;
      const blankY = renderY + renderH - (286 / 812) * renderH;
      const blankH = ((286 - 236) / 812) * renderH;

      page.drawRectangle({
        x: blankX - 2,
        y: blankY - 1,
        width: blankW + 4,
        height: blankH + 2,
        color: rgb(1, 1, 1),
      });

      // Redraw crisp underline matching the "No. ________" line
      page.drawLine({
        start: { x: blankX - 2, y: blankY },
        end: { x: blankX + blankW + 4, y: blankY },
        thickness: 0.8,
        color: rgb(0.2, 0.2, 0.2),
      });

      const pdfBytes = await pdfDoc.save();
      return { data: pdfBytes, filename: 'Regional_Special_Order_DSWD.pdf' };
    }
  } catch (err) {
    console.warn('Could not load sample image from assets, generating vector sample:', err);
  }

  // Fallback: Generate a crisp official document layout
  return createFallbackSampleVectorPdf(pdfDoc);
}

/**
 * Creates sample PDF containing the Authority to Travel memorandum (image_5839a483.png)
 * with explicit subject "AUTHORITY TO TRAVEL".
 */
export async function createAuthorityToTravelSamplePdf(): Promise<{ data: Uint8Array; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  try {
    const response = await fetch('/assets/aistudio/image_5839a483.png');
    if (response.ok) {
      const imageBytes = await response.arrayBuffer();
      const img = await embedImageSafely(pdfDoc, imageBytes);
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const margin = 20;
      const availableW = pageWidth - margin * 2;
      const availableH = pageHeight - margin * 2;
      const imgAspect = img.width / img.height;
      let renderW = availableW;
      let renderH = availableW / imgAspect;
      if (renderH > availableH) {
        renderH = availableH;
        renderW = availableH * imgAspect;
      }
      const renderX = (pageWidth - renderW) / 2;
      const renderY = pageHeight - margin - renderH;
      page.drawImage(img, {
        x: renderX,
        y: renderY,
        width: renderW,
        height: renderH,
      });
      const pdfBytes = await pdfDoc.save();
      return { data: pdfBytes, filename: 'Authority_to_Travel_Order.pdf' };
    }
  } catch (err) {
    console.warn('Failed to load image_5839a483.png:', err);
  }
  return createSampleDocumentPdf();
}

/**
 * Converts any user-uploaded image file into a standardized printable PDF.
 */
export async function convertImageToPdfBytes(
  imageBytes: ArrayBuffer | Uint8Array,
  filename: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const img = await embedImageSafely(pdfDoc, imageBytes);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const margin = 20;
  const availableW = pageWidth - margin * 2;
  const availableH = pageHeight - margin * 2;
  const imgAspect = img.width / img.height;
  let renderW = availableW;
  let renderH = availableW / imgAspect;
  if (renderH > availableH) {
    renderH = availableH;
    renderW = availableH * imgAspect;
  }
  const renderX = (pageWidth - renderW) / 2;
  const renderY = pageHeight - margin - renderH;
  page.drawImage(img, { x: renderX, y: renderY, width: renderW, height: renderH });
  return await pdfDoc.save();
}

async function createFallbackSampleVectorPdf(pdfDoc: PDFDocument): Promise<{ data: Uint8Array; filename: string }> {

  // Fallback: Generate a crisp official document layout
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  
  page.drawText('Republic of the Philippines', { x: 230, y: 790, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('DEPARTMENT OF SOCIAL WELFARE AND DEVELOPMENT', { x: 130, y: 775, size: 12, font: fontBold, color: rgb(0.05, 0.05, 0.05) });
  page.drawText('ANNEX I.1', { x: 480, y: 750, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  page.drawText('REGIONAL SPECIAL ORDER', { x: 70, y: 710, size: 14, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText('No. __________________', { x: 70, y: 690, size: 12, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Series of 2026', { x: 70, y: 672, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  page.drawText('SUBJECT: AUTHORITY TO TRAVEL ON OFFICIAL TIME', { x: 140, y: 630, size: 12, font: fontBold, color: rgb(0, 0, 0) });

  const bodyText = 'In the exigency of service, the following Officials / Employees of the Department are\nhereby authorized to travel on official business to attend the Regional Conference.';
  page.drawText(bodyText, { x: 70, y: 590, size: 10, font: fontTimes, lineHeight: 15, color: rgb(0.15, 0.15, 0.15) });

  // Draw sample table box
  page.drawRectangle({
    x: 70,
    y: 470,
    width: 455,
    height: 90,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 1,
  });
  page.drawLine({ start: { x: 70, y: 535 }, end: { x: 525, y: 535 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Name', { x: 80, y: 543, size: 9, font: fontBold });
  page.drawText('Position', { x: 200, y: 543, size: 9, font: fontBold });
  page.drawText('Division / Section', { x: 340, y: 543, size: 9, font: fontBold });
  page.drawText('Classification', { x: 445, y: 543, size: 9, font: fontBold });

  page.drawText('1. Marites C. Ysip', { x: 80, y: 515, size: 9, font: fontRegular });
  page.drawText('SWO IV / Vice-Chairperson', { x: 200, y: 515, size: 9, font: fontRegular });
  page.drawText('PromSD - SLP', { x: 340, y: 515, size: 9, font: fontRegular });
  page.drawText('Local Travel', { x: 445, y: 515, size: 9, font: fontRegular });

  page.drawText('2. Eliza M. Aromin', { x: 80, y: 490, size: 9, font: fontRegular });
  page.drawText('SWO II / Secretary', { x: 200, y: 490, size: 9, font: fontRegular });
  page.drawText('ProtSD - SPPMO', { x: 340, y: 490, size: 9, font: fontRegular });
  page.drawText('Local Travel', { x: 445, y: 490, size: 9, font: fontRegular });

  page.drawText('APPROVED BY:', { x: 360, y: 390, size: 10, font: fontBold });
  page.drawText('Regional Director', { x: 360, y: 340, size: 9, font: fontRegular });

  const pdfBytes = await pdfDoc.save();
  return { data: pdfBytes, filename: 'Sample_Official_Order.pdf' };
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

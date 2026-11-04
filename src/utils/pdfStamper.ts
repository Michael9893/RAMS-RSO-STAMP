import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export interface StampConfig {
  id: string;
  number: string; // 6 digits, e.g. "002852"
  prefix: string; // e.g. "No. " or ""
  suffix: string; // e.g. ""
  xPercent: number; // 0 to 100 (% of page width)
  yPercent: number; // 0 to 100 (% of page height from top)
  pageNumber: number; // 1-indexed
  applyToAllPages: boolean;
  sequential: boolean; // increment number per page
  fontSize: number; // in points (e.g. 18)
  fontFamily: 'Courier' | 'Helvetica' | 'TimesRoman';
  color: string; // hex color e.g. "#0038A8"
  opacity: number; // 0.1 to 1.0
  rotation: number; // in degrees (-45 to 45)
  boxStyle: 'none' | 'box' | 'underline' | 'double-box';
  padWithZeros: boolean;
  letterSpacing: number; // slight spacing between digits for mechanical stamp feel
  isStampDistressed?: boolean; // slight rubber stamp ink variation
}

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
  const stampedBytes = await stampPdfDocument(pdfBytes, stamp);
  const stampedDoc = await PDFDocument.load(stampedBytes);
  const totalPages = stampedDoc.getPageCount();
  const safePageIdx = Math.max(0, Math.min(totalPages - 1, targetPageNumber - 1));

  const singlePageDoc = await PDFDocument.create();
  const [copiedPage] = await singlePageDoc.copyPages(stampedDoc, [safePageIdx]);
  singlePageDoc.addPage(copiedPage);

  return await singlePageDoc.save();
}

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
  if (stamp.fontFamily === 'Courier') {
    font = await pdfDoc.embedFont(StandardFonts.CourierBold);
  } else if (stamp.fontFamily === 'TimesRoman') {
    font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

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

    // Convert percentage (from top-left of page) to PDF points (origin at bottom-left)
    const stampX = (stamp.xPercent / 100) * pageWidth;
    // in canvas, y=0 is top. In PDF, y=0 is bottom.
    const stampYFromTop = (stamp.yPercent / 100) * pageHeight;
    const stampY = pageHeight - stampYFromTop;

    // Save graphics state & draw text
    page.pushOperators();

    // Handle box or underline frames
    const paddingX = 6;
    const paddingY = 4;
    const boxX = stampX - paddingX;
    const boxY = stampY - paddingY;
    const boxW = textWidth + paddingX * 2;
    const boxH = textHeight + paddingY * 2;

    if (stamp.boxStyle === 'box') {
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        borderColor: textColor,
        borderWidth: 1.5,
        opacity: stamp.opacity,
        rotate: degrees(stamp.rotation),
      });
    } else if (stamp.boxStyle === 'double-box') {
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        borderColor: textColor,
        borderWidth: 1.5,
        opacity: stamp.opacity,
        rotate: degrees(stamp.rotation),
      });
      page.drawRectangle({
        x: boxX - 2.5,
        y: boxY - 2.5,
        width: boxW + 5,
        height: boxH + 5,
        borderColor: textColor,
        borderWidth: 0.8,
        opacity: stamp.opacity * 0.8,
        rotate: degrees(stamp.rotation),
      });
    } else if (stamp.boxStyle === 'underline') {
      page.drawLine({
        start: { x: boxX, y: boxY },
        end: { x: boxX + boxW, y: boxY },
        color: textColor,
        thickness: 1.5,
        opacity: stamp.opacity,
      });
    }

    // Draw main text
    page.drawText(fullStampText, {
      x: stampX,
      y: stampY,
      size: stamp.fontSize,
      font: font,
      color: textColor,
      opacity: stamp.opacity,
      rotate: degrees(stamp.rotation),
    });

    // If distress/ink texture is enabled, add subtle realistic ink artifact
    if (stamp.isStampDistressed) {
      page.drawText(fullStampText, {
        x: stampX + 0.4,
        y: stampY - 0.3,
        size: stamp.fontSize,
        font: font,
        color: textColor,
        opacity: stamp.opacity * 0.3,
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
export async function createSampleDocumentPdf(): Promise<{ data: Uint8Array; filename: string }> {
  const pdfDoc = await PDFDocument.create();
  
  try {
    const response = await fetch('/assets/aistudio/image_f1584ad3.png');
    if (response.ok) {
      const imageBytes = await response.arrayBuffer();
      const img = await pdfDoc.embedPng(imageBytes);
      
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
      
      const pdfBytes = await pdfDoc.save();
      return { data: pdfBytes, filename: 'Regional_Special_Order_DSWD.pdf' };
    }
  } catch (err) {
    console.warn('Could not load sample image from assets, generating vector sample:', err);
  }

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

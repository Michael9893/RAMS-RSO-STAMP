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

export function formatSixDigits(value: string, padWithZeros: boolean = true): string {
  // Strip non-digits or allow letters if user typed custom serial
  const digitsOnly = value.replace(/\D/g, '');
  if (!padWithZeros) {
    return digitsOnly.slice(0, 8);
  }
  if (digitsOnly.length === 0) {
    return '000000';
  }
  // If digits are less than 6, pad start
  if (digitsOnly.length <= 6) {
    return digitsOnly.padStart(6, '0');
  }
  // If more, take last 6 or first 6 (first 6 is standard)
  return digitsOnly.slice(0, 6);
}

export function incrementSixDigitNumber(currentNum: string, incrementBy: number = 1): string {
  const clean = currentNum.replace(/\D/g, '') || '0';
  const num = parseInt(clean, 10);
  const next = Math.max(0, num + incrementBy);
  return String(next).padStart(6, '0').slice(-6);
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

  const baseNumberInt = parseInt(stamp.number.replace(/\D/g, '') || '0', 10);

  for (let idx = 0; idx < targetPageIndices.length; idx++) {
    const pageIndex = targetPageIndices[idx];
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Calculate sequential number if applicable
    let currentNumberStr = stamp.number;
    if (stamp.applyToAllPages && stamp.sequential) {
      const pageOffset = idx;
      currentNumberStr = String(baseNumberInt + pageOffset).padStart(6, '0');
    }

    const fullStampText = `${stamp.prefix}${currentNumberStr}${stamp.suffix}`;
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

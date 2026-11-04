import { CategorizedDocumentInfo, DocumentPersonnel } from '../types/documentMetadata';

/**
 * Intelligently analyzes extracted text from any uploaded PDF file
 * and categorizes it into Title, Subject, Document Number, Dates,
 * Personnel, Approval, Body narrative, and 100% verbatim text.
 */
export function parseDocumentInfoFromExtractedText(
  fullText: string,
  filename: string,
  totalPages: number,
  fileSizeBytes: number,
  pagesText: { pageNumber: number; text: string }[]
): CategorizedDocumentInfo {
  const cleanFilename = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  const lines = fullText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('[PAGE'));

  // 1. Extract Document Title
  let title = cleanFilename.toUpperCase();
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (
      /order|memorandum|resolution|notice|circular|certificate|invoice|contract|statement|agreement|voucher|report|authority/i.test(
        line
      )
    ) {
      title = line;
      break;
    }
  }

  // 2. Extract Document Number
  let documentNumber = '000001';
  const numMatch = fullText.match(
    /(?:No\.|Number|Order\s+No\.|Ref(?:erence)?\s*(?:No\.?)?|Serial\s*(?:No\.?)?|#)\s*([A-Za-z0-9-_/]+)/i
  );
  if (numMatch && numMatch[1]) {
    documentNumber = numMatch[1];
  } else {
    // Check for any 6-digit sequence
    const sixDigitMatch = fullText.match(/\b(\d{6})\b/);
    if (sixDigitMatch) {
      documentNumber = sixDigitMatch[1];
    }
  }

  // 3. Extract Subject
  let subject = 'GENERAL DOCUMENT';
  const subjectMatch = fullText.match(/(?:SUBJECT|RE|REGARDING|TITLE)\s*:\s*([^\n\r]+)/i);
  if (subjectMatch && subjectMatch[1]) {
    subject = subjectMatch[1].trim();
  } else if (lines.length > 2) {
    // Pick first substantial line that isn't the title or number
    const candidate = lines.find(
      (l) => l !== title && !l.toLowerCase().includes('page') && l.length > 15
    );
    if (candidate) {
      subject = candidate.slice(0, 100);
    }
  }

  // 4. Extract Series / Year
  let series = `Series of ${new Date().getFullYear()}`;
  const seriesMatch = fullText.match(/Series\s+of\s+(\d{4})/i);
  if (seriesMatch) {
    series = `Series of ${seriesMatch[1]}`;
  } else {
    const yearMatch = fullText.match(/\b(202[0-9]|201[0-9])\b/);
    if (yearMatch) {
      series = `Series of ${yearMatch[1]}`;
    }
  }

  // 5. Extract Dates
  const today = new Date().toISOString().split('T')[0];
  let documentDate = today;
  let effectiveDateRange = 'N/A';

  const dateMatch = fullText.match(
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i
  );
  if (dateMatch) {
    documentDate = dateMatch[1];
  }

  const travelDateMatch = fullText.match(
    /(?:on|dated|period|effective)\s+([0-9\s–\-to]+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i
  );
  if (travelDateMatch) {
    effectiveDateRange = travelDateMatch[1].trim();
  }

  // 6. Extract Signatory / Approval
  let approvedBy = 'Authorized Signatory';
  let approverPosition = 'Department Head / Supervisor';
  const approvedMatch = fullText.match(/(?:APPROVED|SIGNED|ISSUED|CERTIFIED)\s+BY\s*:\s*([^\n\r]+)/i);
  if (approvedMatch && approvedMatch[1]) {
    approvedBy = approvedMatch[1].trim();
  }

  let issuingOffice = 'Regional Field Office';
  const officeMatch = fullText.match(/(?:Issued at|Office of the|Department of)\s*([^\n\r.]+)/i);
  if (officeMatch && officeMatch[1]) {
    issuingOffice = officeMatch[0].trim();
  }

  // 7. Extract Body Narrative Paragraph
  let bodyParagraph = '';
  // Look for paragraph containing "exigency", "hereby", "authorized", "pursuant to", or longest paragraph
  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !p.toLowerCase().includes('table'));

  if (paragraphs.length > 0) {
    const narrativeCandidate =
      paragraphs.find((p) =>
        /authorized|hereby|pursuant|in\s+the\s+exigency|resolved|certif/i.test(p)
      ) || paragraphs[0];
    bodyParagraph = narrativeCandidate.replace(/\s+/g, ' ');
  } else {
    bodyParagraph = lines.slice(3, 8).join(' ');
  }

  // 8. Extract Personnel / Names
  const personnel: DocumentPersonnel[] = [];
  // Match numbered entries like "1. Name" or lines with person names
  const personMatches = fullText.matchAll(
    /(?:^|\n)\s*(\d+)[.)\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s+([^\n\r]+)/g
  );

  let count = 1;
  for (const m of personMatches) {
    personnel.push({
      id: `p_${Date.now()}_${count}`,
      name: m[2].trim(),
      position: m[3].slice(0, 50).trim() || 'Official / Staff',
      division: 'Department Office',
      classification: 'Official Business',
    });
    count++;
    if (count > 8) break; // Limit to reasonable list
  }

  // If no numbered personnel were parsed, add a default placeholder from the document
  if (personnel.length === 0) {
    personnel.push({
      id: `p_${Date.now()}_1`,
      name: 'Document Subject Personnel',
      position: 'Appointee / Staff',
      division: issuingOffice.slice(0, 30),
      classification: 'Official Business',
    });
  }

  // 9. Document Type
  let documentType = 'Document';
  if (/special order/i.test(fullText)) documentType = 'Special Order';
  else if (/memorandum/i.test(fullText)) documentType = 'Memorandum';
  else if (/resolution/i.test(fullText)) documentType = 'Resolution';
  else if (/invoice/i.test(fullText)) documentType = 'Invoice';
  else if (/certificate/i.test(fullText)) documentType = 'Certificate';
  else if (/notice/i.test(fullText)) documentType = 'Notice';

  return {
    title,
    subject,
    documentType,
    documentNumber,
    series,
    annexRef: fullText.match(/ANNEX\s+[A-Za-z0-9.]+/i)?.[0] || 'REF-DOC',
    headerLogosText: lines[0] || 'Official Document Header',
    bodyParagraph: bodyParagraph || 'Primary document narrative content extracted from PDF file.',
    issuanceLocation: issuingOffice,
    tableHeaders: ['No.', 'Name', 'Position', 'Division/Section', 'Classification'],
    dates: {
      documentDate,
      effectiveDateRange: effectiveDateRange !== 'N/A' ? effectiveDateRange : documentDate,
      stampedDate: today,
    },
    personnel,
    approval: {
      approvedBy,
      approverPosition,
      issuingOffice,
      annexRef: fullText.match(/ANNEX\s+[A-Za-z0-9.]+/i)?.[0] || 'REF-DOC',
    },
    event: {
      purpose: subject,
      venue: issuingOffice,
    },
    fullVerbatimText: fullText.trim() || `(No extractable text in ${filename} - graphical or scanned document)`,
    pagesText: pagesText.length > 0 ? pagesText : [{ pageNumber: 1, text: fullText }],
    technical: {
      filename,
      fileSizeBytes,
      fileSizeFormatted: `${(fileSizeBytes / 1024).toFixed(1)} KB`,
      totalPages,
      dimensions: 'Standard PDF Points',
      pdfVersion: '1.7',
    },
    notes: `Document text successfully extracted from ${filename} with ${totalPages} page(s).`,
    tags: [documentType, series, 'Extracted PDF'],
  };
}

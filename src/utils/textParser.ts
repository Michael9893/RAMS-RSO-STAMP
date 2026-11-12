import { CategorizedDocumentInfo, DocumentPersonnel } from '../types/documentMetadata';
import { ExtractedTextLine } from './pdfRenderer';

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
  pagesText: { pageNumber: number; text: string }[],
  linesInfo?: ExtractedTextLine[]
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

  // 2. Extract Document Number (skip pure blank underscores like "NO. ________")
  let documentNumber = '000001';
  const numMatches = fullText.matchAll(
    /(?:No\.|Number|Order\s+No\.|Ref(?:erence)?\s*(?:No\.?)?|Serial\s*(?:No\.?)?|#)\s*[:\-]?\s*_*\s*([A-Za-z0-9][A-Za-z0-9-/]*)/gi
  );
  for (const m of numMatches) {
    const candidate = m[1]?.replace(/_+/g, '').trim();
    if (candidate && /\d/.test(candidate)) {
      documentNumber = candidate;
      break;
    }
  }
  if (documentNumber === '000001') {
    const sixDigitMatch = fullText.match(/\b(\d{6})\b/);
    if (sixDigitMatch) {
      documentNumber = sixDigitMatch[1];
    }
  }

  // 3. Extract Subject - Prioritize centered subject text on Page 1 & explicit SUBJECT: anchors
  let subject = extractSubjectFromPdfText(fullText, linesInfo);
  if (!subject && lines.length > 2) {
    // Fallback only if no centered subject or explicit SUBJECT line exists
    const candidate = lines.find(
      (l) =>
        l !== title &&
        !isBoilerplateHeaderOrDateLine(l) &&
        l.length > 5 &&
        l.length <= 90
    );
    if (candidate) {
      subject = cleanExtractedSubjectText(candidate).slice(0, 80).trim() || 'OFFICIAL ISSUANCE';
    } else {
      subject = 'OFFICIAL ISSUANCE';
    }
  }
  if (!subject) {
    subject = 'OFFICIAL ISSUANCE';
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

/**
 * Common standard body delimiters in Philippine and government issuances
 * that mark the end of the SUBJECT statement and the start of the body paragraph.
 */
const GOVERNMENT_BODY_DELIMITERS = [
  'in the exigency of service',
  'in the exigency of the service',
  'in the interest of service',
  'in the interest of the service',
  'the above-mentioned personnel',
  'the following officials',
  'the following personnel',
  'in view of',
  'in line with',
  'pursuant to',
  'please be informed',
  'please find',
  'this is to authorize',
  'this office hereby',
  'this office',
  'herewith is',
  'relative to',
  'this has reference',
  'in accordance with',
  'hereby authorized',
  'authorized to travel',
  'whereas,',
  'whereas',
  'notice is hereby',
  'be it resolved',
  'table of authorized',
  'table of',
  'particulars',
  'amount fund source',
  'name position',
  'annex',
  'date:',
  'from:',
  'to:',
  'thru:',
  'for:',
  'memorandum',
  'regional special order',
];

const BODY_PARAGRAPH_OPENERS = [
  'in the exigency of service',
  'in the exigency of the service',
  'in the interest of service',
  'in the interest of the service',
  'the above-mentioned personnel',
  'the following officials',
  'the following personnel',
  'in view of',
  'in line with',
  'pursuant to',
  'please be informed',
  'please find',
  'this is to authorize',
  'this office hereby',
  'this office',
  'herewith is',
  'relative to',
  'this has reference',
  'in accordance with',
  'hereby authorized',
  'authorized to travel',
  'whereas,',
  'whereas',
  'notice is hereby',
  'be it resolved',
];

function startsWithBodyDelimiter(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  return BODY_PARAGRAPH_OPENERS.some((d) => lower.startsWith(d));
}

function isBoilerplateHeaderOrDateLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^\[PAGE\s+\d+\]$/i.test(trimmed)) return true;
  if (/^[_—–\-=.\s]+$/.test(trimmed)) return true;
  if (
    /^(?:republic of the philippines|department of|dswd|bagong pilipinas|regional field office|field office|office of the|regional special order|special order|memorandum|regional memorandum|administrative order|notice of violation|unnumbered memorandum|series\s+of\b|no\.?\s*[:\-_0-9]*$|annex\b|page\s+\d+)/i.test(
      trimmed
    )
  ) {
    return true;
  }
  // Standalone date line like "5 November 2026" or "November 5, 2026"
  if (
    /^\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i.test(
      trimmed
    ) ||
    /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}$/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (startsWithBodyDelimiter(trimmed)) return true;
  return false;
}

function cleanExtractedSubjectText(raw: string): string {
  if (!raw) return '';
  let candidate = raw.trim();

  // Strip embedded long underline bars (e.g. "Official Station ______")
  candidate = candidate.replace(/_{2,}/g, ' ');

  // Stop before any government body paragraph opener that might have merged onto the same line
  const lowerCandidate = candidate.toLowerCase();
  let cutIndex = -1;

  for (const delimiter of GOVERNMENT_BODY_DELIMITERS) {
    const delimIdx = lowerCandidate.indexOf(delimiter);
    if (delimIdx >= 0 && (cutIndex === -1 || delimIdx < cutIndex)) {
      cutIndex = delimIdx;
    }
  }

  if (cutIndex === 0) {
    return '';
  }
  if (cutIndex > 0) {
    candidate = candidate.slice(0, cutIndex);
  }

  // Clean up leading and trailing punctuation, quotes, underscores, asterisks
  candidate = candidate
    .replace(/^[\s:"'–—\-_]+/, '')
    .replace(/[\s:"'–—\-_.;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return candidate;
}

/**
 * Collects consecutive centered continuation lines immediately following a subject anchor line
 * (for multi-line centered subjects) before body text or unrelated sections begin.
 */
function collectCenteredContinuation(
  pageLines: ExtractedTextLine[],
  startIdx: number,
  initialValue: string
): string {
  const parts: string[] = initialValue ? [initialValue] : [];
  let prevY = pageLines[startIdx].y;

  for (let i = startIdx + 1; i < pageLines.length; i++) {
    const next = pageLines[i];
    if (!next.isCentered) break;
    if (next.y - prevY > 28) break;
    if (isBoilerplateHeaderOrDateLine(next.text)) break;
    if (/^(?:subject|subj|subject\s+matter|re|regarding)\s*[:\-–—]/i.test(next.text)) break;

    const cleanedNext = cleanExtractedSubjectText(next.text);
    if (!cleanedNext) break;
    parts.push(cleanedNext);
    prevY = next.y;
    if (parts.join(' ').length >= 120) break;
  }

  return cleanExtractedSubjectText(parts.join(' '));
}

/**
 * Extracts the exact subject from PDF text, always prioritizing the centered
 * subject text on Page 1 (e.g. "Subject: Official Station" or "SUBJECT: AUTHORITY TO TRAVEL").
 */
export function extractSubjectFromPdfText(
  fullText: string,
  linesInfo?: ExtractedTextLine[]
): string {
  if (!fullText && (!linesInfo || linesInfo.length === 0)) return '';

  const page1Lines = (linesInfo || []).filter((l) => l.pageNumber === 1);

  // 1. PRIORITY: Centered line on Page 1 containing explicit "Subject:" / "SUBJ:"
  if (page1Lines.length > 0) {
    for (let i = 0; i < page1Lines.length; i++) {
      const line = page1Lines[i];
      if (!line.isCentered) continue;

      const centeredAnchor = line.text.match(
        /^\s*(?:SUBJECT|SUBJ|SUBJECT\s+MATTER)\s*[:\-–—]\s*(.*)$/i
      );
      if (centeredAnchor) {
        const inlinePart = cleanExtractedSubjectText(centeredAnchor[1] || '');
        const combined = collectCenteredContinuation(page1Lines, i, inlinePart);
        if (combined.length >= 2) {
          return combined;
        }
      }
    }

    // 2. Any line on Page 1 with explicit "Subject:" / "SUBJ:" (and check centered continuation below it)
    for (let i = 0; i < page1Lines.length; i++) {
      const line = page1Lines[i];
      const anchorMatch = line.text.match(
        /\b(?:SUBJECT|SUBJ|SUBJECT\s+MATTER)\s*[:\-–—]\s*(.*)$/i
      );
      if (anchorMatch) {
        const inlinePart = cleanExtractedSubjectText(anchorMatch[1] || '');
        if (inlinePart.length >= 2) {
          const combined = collectCenteredContinuation(page1Lines, i, inlinePart);
          if (combined.length >= 2) return combined;
          return inlinePart;
        }
        // "Subject:" was alone on the line — grab the immediate next non-boilerplate centered/next line
        for (let j = i + 1; j < Math.min(i + 4, page1Lines.length); j++) {
          if (isBoilerplateHeaderOrDateLine(page1Lines[j].text)) continue;
          const nextClean = cleanExtractedSubjectText(page1Lines[j].text);
          if (nextClean.length >= 2) {
            return collectCenteredContinuation(page1Lines, j, nextClean) || nextClean;
          }
          break;
        }
      }
    }

    // 3. Unlabeled centered subject block on Page 1 (between header/series lines and body paragraph)
    const bodyStartIdx = page1Lines.findIndex(
      (l) =>
        startsWithBodyDelimiter(l.text) ||
        (!l.isCentered && l.text.length > 75 && /[.!?]$/.test(l.text))
    );
    const searchLimit = bodyStartIdx !== -1 ? bodyStartIdx : page1Lines.length;

    let headerEndIdx = -1;
    for (let i = 0; i < searchLimit; i++) {
      if (
        /^(?:regional\s+special\s+order|special\s+order|memorandum|regional\s+memorandum|administrative\s+order|series\s+of\b|no\.(?:\s|$|[:\-_0-9]))/i.test(
          page1Lines[i].text
        )
      ) {
        headerEndIdx = i;
      }
    }

    const centeredCandidates: { idx: number; line: ExtractedTextLine }[] = [];
    for (let i = Math.max(0, headerEndIdx + 1); i < searchLimit; i++) {
      const line = page1Lines[i];
      if (!line.isCentered) continue;
      if (isBoilerplateHeaderOrDateLine(line.text)) continue;
      // Ignore very top agency banner area if above header order title
      if (headerEndIdx === -1 && line.y < line.pageHeight * 0.14) continue;
      centeredCandidates.push({ idx: i, line });
    }

    if (centeredCandidates.length > 0) {
      const first = centeredCandidates[0];
      const cleanedFirst = cleanExtractedSubjectText(
        first.line.text.replace(/^(?:SUBJECT|SUBJ|RE)\s*[:\-–—]?\s*/i, '')
      );
      const combined = collectCenteredContinuation(page1Lines, first.idx, cleanedFirst);
      if (combined.length >= 2) {
        return combined;
      }
    }
  }

  // 4. Plain-text fallback: look for explicit word-bounded "SUBJECT:" / "SUBJ:" anchor
  const explicitSubjectRegex = /\b(?:SUBJECT|SUBJ|SUBJECT\s+MATTER)\s*[:\-–—]\s*/i;
  const match = fullText.match(explicitSubjectRegex);

  if (match && match.index !== undefined) {
    const startIdx = match.index + match[0].length;
    const afterMatch = fullText.slice(startIdx);
    const firstLineBreak = afterMatch.indexOf('\n');
    let candidate =
      firstLineBreak !== -1 ? afterMatch.slice(0, firstLineBreak).trim() : afterMatch.trim();

    if (candidate.length === 0) {
      const remainingLines = afterMatch
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (remainingLines.length > 0) {
        candidate = remainingLines[0];
      }
    }

    const cleaned = cleanExtractedSubjectText(candidate);
    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  // 5. Line-by-line scan for unpunctuated "SUBJECT ..." or line-start "RE: ..." / "REGARDING: ..."
  const lines = fullText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const subjLineMatch = line.match(
      /^(?:SUBJECT|SUBJ|SUBJECT\s+MATTER|RE|REGARDING)\s*[:\-–—]\s*(.*)$/i
    ) || line.match(/^SUBJECT\s+(.+)$/i);

    if (subjLineMatch) {
      let rawPart = (subjLineMatch[1] || '').trim();
      if (!rawPart && i + 1 < lines.length) {
        rawPart = lines[i + 1];
      }
      const cleaned = cleanExtractedSubjectText(rawPart);
      if (cleaned.length >= 2) {
        return cleaned;
      }
    }
  }

  return '';
}



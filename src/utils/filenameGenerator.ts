import { StampConfig } from './pdfStamper';
import { CategorizedDocumentInfo } from '../types/documentMetadata';

export const GOVERNMENT_DOC_TYPES = [
  'RSO',
  'MEMO ES/FWA',
  'MEMO_ATT/ATA',
  'RAO_RMC',
  'U_MEMO',
  'NOV',
] as const;

export type GovernmentDocType = (typeof GOVERNMENT_DOC_TYPES)[number];

/**
 * Extracts a 4-digit series year from the metadata series text, dates, or defaults to the current year.
 */
export function extractSeriesYear(series?: string, date?: string): string {
  if (series) {
    const match = series.match(/\b(20\d{2}|19\d{2})\b/);
    if (match) return match[1];
  }
  if (date) {
    const match = date.match(/\b(20\d{2}|19\d{2})\b/);
    if (match) return match[1];
  }
  return String(new Date().getFullYear());
}

/**
 * Detects the official government document type from the stamp configuration or document metadata.
 */
export function detectGovernmentDocType(
  stamp: StampConfig,
  metadata?: CategorizedDocumentInfo
): GovernmentDocType {
  // 1. Direct documentType assigned on stamp
  if (stamp.documentType && (GOVERNMENT_DOC_TYPES as readonly string[]).includes(stamp.documentType)) {
    return stamp.documentType as GovernmentDocType;
  }

  // 2. Check stamp prefix string
  const prefixUpper = (stamp.prefix || '').toUpperCase();
  if (prefixUpper.includes('RSO')) return 'RSO';
  if (
    prefixUpper.includes('MEMO ES') ||
    prefixUpper.includes('ES/FWA') ||
    prefixUpper.includes('ES-FWA') ||
    prefixUpper.includes('ES_FWA')
  ) {
    return 'MEMO ES/FWA';
  }
  if (
    prefixUpper.includes('MEMO_ATT') ||
    prefixUpper.includes('MEMO ATT') ||
    prefixUpper.includes('ATT/ATA') ||
    prefixUpper.includes('ATT-ATA') ||
    prefixUpper.includes('ATT_ATA')
  ) {
    return 'MEMO_ATT/ATA';
  }
  if (
    prefixUpper.includes('RAO_RMC') ||
    prefixUpper.includes('RAO/RMC') ||
    prefixUpper.includes('RAO-RMC') ||
    prefixUpper.includes('RAO RMC')
  ) {
    return 'RAO_RMC';
  }
  if (
    prefixUpper.includes('U_MEMO') ||
    prefixUpper.includes('U-MEMO') ||
    prefixUpper.includes('U MEMO') ||
    prefixUpper.includes('UNNUMBERED')
  ) {
    return 'U_MEMO';
  }
  if (prefixUpper.includes('NOV')) return 'NOV';

  // 3. Fallback to metadata classification
  if (metadata) {
    const titleUpper = `${metadata.title || ''} ${metadata.documentType || ''}`.toUpperCase();
    if (titleUpper.includes('REGIONAL SPECIAL ORDER') || titleUpper.includes('SPECIAL ORDER')) {
      return 'RSO';
    }
    if (
      titleUpper.includes('MEMORANDUM') &&
      (titleUpper.includes('EXECUTIVE') || titleUpper.includes('FWA'))
    ) {
      return 'MEMO ES/FWA';
    }
    if (titleUpper.includes('TRAVEL') || titleUpper.includes('ATTEND') || titleUpper.includes('ATT/ATA')) {
      return 'MEMO_ATT/ATA';
    }
    if (titleUpper.includes('ADMINISTRATIVE ORDER') || titleUpper.includes('CIRCULAR')) {
      return 'RAO_RMC';
    }
    if (titleUpper.includes('UNNUMBERED')) {
      return 'U_MEMO';
    }
    if (titleUpper.includes('NOTICE OF VIOLATION')) {
      return 'NOV';
    }
  }

  return 'RSO';
}

/**
 * Strips OS-illegal characters and collapses redundant whitespace.
 */
export function sanitizeFilenamePart(text: string): string {
  return text
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates the standardized official government filename format:
 * [DOC_TYPE] [STAMP_NUMBER] s [YEAR]-[SUBJECT].pdf
 *
 * Example:
 * "RSO 2544 s 2026-Confirmation of Travel.pdf"
 */
export function generateGovernmentFilename(
  stamp: StampConfig,
  metadata?: CategorizedDocumentInfo,
  options?: {
    selectedPages?: number[];
    totalPages?: number;
    docTypeOverride?: GovernmentDocType;
    customSubject?: string;
  }
): string {
  // 1. Document Type: RSO, MEMO ES/FWA, MEMO_ATT/ATA, RAO_RMC, U_MEMO, NOV
  const docType = options?.docTypeOverride || detectGovernmentDocType(stamp, metadata);

  // 2. Stamp Number (e.g. 2544 or 002852)
  let rawNumber = stamp.number || '000000';
  // Strip any accidental leading "No. " or "#" typed into the number field
  const numMatch = rawNumber.match(/(?:No\.?\s*|#\s*)?([A-Za-z0-9_-]+)/i);
  const cleanNumber = sanitizeFilenamePart(numMatch ? numMatch[1] : rawNumber);

  // 3. Series Year: e.g. "s 2026"
  const year = extractSeriesYear(metadata?.series, metadata?.dates?.documentDate);

  // 4. Subject: e.g. "Confirmation of Travel" or "AUTHORITY TO TRAVEL ON OFFICIAL TIME"
  let subject = options?.customSubject || metadata?.subject || 'Official Issuance';
  subject = sanitizeFilenamePart(subject);

  // If subject is completely empty or generic, use clean default
  if (!subject) {
    subject = 'Official Document';
  }

  // Truncate overly long subjects to keep filename within standard filesystem 255-char limit
  if (subject.length > 70) {
    subject = subject.slice(0, 67).trim() + '...';
  }

  // Construct base name: "[DOC_TYPE] [STAMP_NUMBER] s [YEAR]-[SUBJECT]"
  let filename = `${docType} ${cleanNumber} s ${year}-${subject}`;

  // If downloading only a single page from a multi-page document
  if (options?.selectedPages && options?.totalPages && options.totalPages > 1) {
    if (options.selectedPages.length === 1) {
      filename += ` (p${options.selectedPages[0]})`;
    } else if (options.selectedPages.length < options.totalPages) {
      filename += ` (p${options.selectedPages.join(',')})`;
    }
  }

  return `${filename}.pdf`;
}

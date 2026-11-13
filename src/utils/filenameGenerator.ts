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

export const PRESET_FILENAME_SUBJECTS = [
  'Authority to Travel',
  'Render Extra Services',
  'Confirmation of Authority to Render Overtime',
  'Confirmation of Official Station',
] as const;

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
    const subjectUpper = (metadata.subject || '').toUpperCase();
    if (titleUpper.includes('REGIONAL SPECIAL ORDER') || titleUpper.includes('SPECIAL ORDER')) {
      return 'RSO';
    }
    if (
      titleUpper.includes('MEMORANDUM') &&
      (titleUpper.includes('EXECUTIVE') || titleUpper.includes('FWA'))
    ) {
      return 'MEMO ES/FWA';
    }
    if (
      titleUpper.includes('TRAVEL') ||
      titleUpper.includes('ATTEND') ||
      titleUpper.includes('ATT/ATA') ||
      (titleUpper.includes('MEMORANDUM') &&
        (subjectUpper.includes('AUTHORITY TO TRAVEL') || subjectUpper.includes('TRAVEL')))
    ) {
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
 * Converts a string to clean Sentence case (first letter capitalized, rest lowercase).
 * Example: "AUTHORITY TO TRAVEL" -> "Authority to travel"
 */
export function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .replace(/^([^a-zA-Z]*)([a-zA-Z])/, (_, prefix, firstChar) => `${prefix}${firstChar.toUpperCase()}`);
}

export interface GovernmentFilenameParts {
  docType: GovernmentDocType;
  cleanNumber: string;
  year: string;
  prefixPart: string;
  subjectPart: string;
  suffixPart: string;
  fullFilename: string;
}

/**
 * Computes the structured parts of the official government filename:
 * [DOC_TYPE] [STAMP_NUMBER] s [YEAR]-[Subject in sentence case].pdf
 */
export function getGovernmentFilenameParts(
  stamp: StampConfig,
  metadata?: CategorizedDocumentInfo,
  options?: {
    selectedPages?: number[];
    totalPages?: number;
    docTypeOverride?: GovernmentDocType;
    customSubject?: string;
  }
): GovernmentFilenameParts {
  const docType = options?.docTypeOverride || detectGovernmentDocType(stamp, metadata);

  const rawNumber = stamp.number || '000000';
  const numMatch = rawNumber.match(/(?:No\.?\s*|#\s*)?([A-Za-z0-9_-]+)/i);
  const cleanNumber = sanitizeFilenamePart(numMatch ? numMatch[1] : rawNumber);

  const year = extractSeriesYear(metadata?.series, metadata?.dates?.documentDate);

  const rawSubject =
    options?.customSubject !== undefined && options.customSubject.trim().length > 0
      ? options.customSubject
      : metadata?.subject || 'Official issuance';
  let subjectPart = sanitizeFilenamePart(rawSubject);

  if (!subjectPart) {
    subjectPart = 'Official issuance';
  }

  subjectPart = toSentenceCase(subjectPart);

  if (subjectPart.length > 80) {
    subjectPart = subjectPart.slice(0, 77).trim() + '...';
  }

  let pageSuffix = '';
  if (options?.selectedPages && options?.totalPages && options.totalPages > 1) {
    if (options.selectedPages.length === 1) {
      pageSuffix = ` (p${options.selectedPages[0]})`;
    } else if (options.selectedPages.length < options.totalPages) {
      pageSuffix = ` (p${options.selectedPages.join(',')})`;
    }
  }

  const prefixPart = `${docType} ${cleanNumber} s ${year}-`;
  const suffixPart = `${pageSuffix}.pdf`;

  return {
    docType,
    cleanNumber,
    year,
    prefixPart,
    subjectPart,
    suffixPart,
    fullFilename: `${prefixPart}${subjectPart}${suffixPart}`,
  };
}

/**
 * Generates the standardized official government filename format:
 * [DOC_TYPE] [STAMP_NUMBER] s [YEAR]-[Subject in sentence case].pdf
 *
 * Example:
 * "RSO 2544 s 2026-Confirmation of travel.pdf"
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
  return getGovernmentFilenameParts(stamp, metadata, options).fullFilename;
}


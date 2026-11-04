export interface DocumentPersonnel {
  id: string;
  name: string;
  position: string;
  division: string;
  classification: string;
}

export interface CategorizedDocumentInfo {
  // 1. Identity & Classification
  title: string;
  subject: string;
  documentType: string;
  documentNumber: string;
  series: string;

  // 2. Dates Categorization
  dates: {
    documentDate: string;
    effectiveDateRange: string;
    stampedDate: string;
  };

  // 3. Personnel & Names Categorization
  personnel: DocumentPersonnel[];

  // 4. Issuance, Authority & Approval
  approval: {
    approvedBy: string;
    approverPosition: string;
    issuingOffice: string;
    annexRef: string;
  };

  // 5. Purpose, Venue & Event Details
  event: {
    purpose: string;
    venue: string;
  };

  // 6. PDF Technical Specifications
  technical: {
    filename: string;
    fileSizeBytes: number;
    fileSizeFormatted: string;
    totalPages: number;
    dimensions: string;
    pdfVersion: string;
  };

  // 7. Custom Tags & Notes
  notes: string;
  tags: string[];
}

export const DEFAULT_DSWD_METADATA: CategorizedDocumentInfo = {
  title: 'REGIONAL SPECIAL ORDER',
  subject: 'AUTHORITY TO TRAVEL ON OFFICIAL TIME',
  documentType: 'Special Order',
  documentNumber: '002852',
  series: 'Series of 2026',
  dates: {
    documentDate: '2026-09-28',
    effectiveDateRange: '1 – 2 October 2026',
    stampedDate: new Date().toISOString().split('T')[0],
  },
  personnel: [
    {
      id: 'p1',
      name: 'Marites C. Ysip',
      position: 'SWO IV / Vice-Chairperson, Credit Committee',
      division: 'PromSD – SLP',
      classification: 'Local Travel',
    },
    {
      id: 'p2',
      name: 'Eliza M. Aromin',
      position: 'SWO II / Secretary',
      division: 'ProtSD – SPPMO',
      classification: 'Local Travel',
    },
  ],
  approval: {
    approvedBy: 'Anniel J. Ferrer',
    approverPosition: 'Regional Director / Authorized Official',
    issuingOffice: 'DSWD Field Office I, City of San Fernando, La Union',
    annexRef: 'ANNEX I.1',
  },
  event: {
    purpose: 'Attend the DSWD Field Office 1 Employees Credit Cooperative 16th Anniversary Celebration',
    venue: 'Patio by Balai Norte, Panicsican, San Juan, La Union',
  },
  technical: {
    filename: 'Regional_Special_Order_DSWD.pdf',
    fileSizeBytes: 245760,
    fileSizeFormatted: '240 KB',
    totalPages: 1,
    dimensions: '595.28 × 841.89 pt (A4 Standard)',
    pdfVersion: '1.7',
  },
  notes: 'Authority to travel on official business time. Travel expenses and registration covered under official credit coop representation.',
  tags: ['Special Order', 'Official Travel', 'DSWD FO-I', 'Annex I.1', '2026'],
};

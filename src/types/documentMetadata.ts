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
  annexRef: string;
  headerLogosText: string;

  // 2. Full Body Narrative Text
  bodyParagraph: string;
  issuanceLocation: string;

  // 3. Dates Categorization
  dates: {
    documentDate: string;
    effectiveDateRange: string;
    stampedDate: string;
  };

  // 4. Personnel & Names Categorization
  personnel: DocumentPersonnel[];
  tableHeaders: string[];

  // 5. Issuance, Authority & Approval
  approval: {
    approvedBy: string;
    approverPosition: string;
    issuingOffice: string;
    annexRef: string;
  };

  // 6. Purpose, Venue & Event Details
  event: {
    purpose: string;
    venue: string;
  };

  // 7. Complete Verbatim PDF Text (100% of all text found in the PDF)
  fullVerbatimText: string;
  pagesText?: { pageNumber: number; text: string }[];

  // 8. PDF Technical Specifications
  technical: {
    filename: string;
    fileSizeBytes: number;
    fileSizeFormatted: string;
    totalPages: number;
    dimensions: string;
    pdfVersion: string;
  };

  // 9. Custom Tags & Notes
  notes: string;
  tags: string[];
}

export const DSWD_VERBATIM_TEXT = `DSWD Department of Social Welfare and Development · BAGONG PILIPINAS
ANNEX I.1

REGIONAL SPECIAL ORDER
No. 002852
Series of 2026

SUBJECT: AUTHORITY TO TRAVEL ON OFFICIAL TIME

In the exigency of service, the following Officials / Employees of the Department are hereby authorized to travel on 1 – 2 October 2026 at the Patio by Balai Norte, Panicsican, San Juan, La Union to attend the DSWD Field Office 1 Employees Credit Cooperative 16th Anniversary Celebration.

TABLE OF AUTHORIZED PERSONNEL:
| No. | Name | Position | Division/Section/ POO/ C/MOO | Classification of Travel¹ |
| 1 | Marites C. Ysip | SWO IV / Vice-Chairperson, Credit Committee | PromSD – SLP | Local Travel |
| 2 | Eliza M. Aromin | SWO II / Secretary | ProtSD – SPPMO | Local Travel |

Issued at DSWD Field Office I in the City of San Fernando, La Union.

APPROVED BY:
Anniel J. Ferrer
Regional Director / Authorized Official`;

export const DEFAULT_DSWD_METADATA: CategorizedDocumentInfo = {
  title: 'REGIONAL SPECIAL ORDER',
  subject: 'AUTHORITY TO TRAVEL ON OFFICIAL TIME',
  documentType: 'Special Order',
  documentNumber: '002852',
  series: 'Series of 2026',
  annexRef: 'ANNEX I.1',
  headerLogosText: 'DSWD Department of Social Welfare and Development · BAGONG PILIPINAS',
  bodyParagraph:
    'In the exigency of service, the following Officials / Employees of the Department are hereby authorized to travel on 1 – 2 October 2026 at the Patio by Balai Norte, Panicsican, San Juan, La Union to attend the DSWD Field Office 1 Employees Credit Cooperative 16th Anniversary Celebration.',
  issuanceLocation: 'Issued at DSWD Field Office I in the City of San Fernando, La Union.',
  tableHeaders: ['No.', 'Name', 'Position', 'Division/Section/POO/ C/MOO', 'Classification of Travel¹'],
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
  fullVerbatimText: DSWD_VERBATIM_TEXT,
  pagesText: [{ pageNumber: 1, text: DSWD_VERBATIM_TEXT }],
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

export const MODESTA_TRAVEL_VERBATIM_TEXT = `SUBJECT: AUTHORITY TO TRAVEL

In the exigency of service, Ms. Modesta L. Baguingan, Project Development Officer II of the Promotive Services Division under Sustainable Livelihood Program, is hereby authorized to travel on 10 November 2026 (inclusive of travel time) at Puerto De San Juan Beach Resort Hotel, Ili Sur, San Juan, La Union to facilitate the conduct bookkeeping training to 7 SLPAs of San Juan, La Union.

The above-mentioned personnel is authorized to claim travelling expenses¹ through reimbursement based on actual cost incurred OR cash advance based on the estimated Itinerary of Travel subject to actual liquidation of cost incurred, related in the performance of the said official activity upon submission of complete documentary requirements subject to the usual government accounting and auditing rules and regulations.

Further, she is entitled to claim Hazard Pay, subject to availability of funds and usual accounting and auditing rules and regulations.

TABLE OF PARTICULARS:
| Particulars | Amount | Fund Source |
| Hazard Pay | N/A | N/A |

It is further understood that the duly-signed Certificate of Appearance/Attendance/Participation from the place visited and other documentary evidence...`;

export const DEFAULT_MODESTA_METADATA: CategorizedDocumentInfo = {
  title: 'AUTHORITY TO TRAVEL ORDER',
  subject: 'AUTHORITY TO TRAVEL',
  documentType: 'MEMO_ATT/ATA',
  documentNumber: '002852',
  series: 'Series of 2026',
  annexRef: 'MEMO-ATT-2026',
  headerLogosText: 'Department of Social Welfare and Development · Sustainable Livelihood Program',
  bodyParagraph:
    'In the exigency of service, Ms. Modesta L. Baguingan, Project Development Officer II of the Promotive Services Division under Sustainable Livelihood Program, is hereby authorized to travel on 10 November 2026 (inclusive of travel time) at Puerto De San Juan Beach Resort Hotel, Ili Sur, San Juan, La Union to facilitate the conduct bookkeeping training to 7 SLPAs of San Juan, La Union.',
  issuanceLocation: 'Issued at DSWD Field Office I in the City of San Fernando, La Union.',
  tableHeaders: ['Particulars', 'Amount', 'Fund Source'],
  dates: {
    documentDate: '2026-11-10',
    effectiveDateRange: '10 November 2026 (inclusive of travel time)',
    stampedDate: new Date().toISOString().split('T')[0],
  },
  personnel: [
    {
      id: 'p1',
      name: 'Ms. Modesta L. Baguingan',
      position: 'Project Development Officer II',
      division: 'Promotive Services Division (Sustainable Livelihood Program)',
      classification: 'Official Travel',
    },
  ],
  approval: {
    approvedBy: 'Regional Director / Authorized Official',
    approverPosition: 'Regional Director',
    issuingOffice: 'DSWD Field Office I, City of San Fernando, La Union',
    annexRef: 'MEMO-ATT-2026',
  },
  event: {
    purpose: 'Facilitate the conduct bookkeeping training to 7 SLPAs of San Juan, La Union',
    venue: 'Puerto De San Juan Beach Resort Hotel, Ili Sur, San Juan, La Union',
  },
  fullVerbatimText: MODESTA_TRAVEL_VERBATIM_TEXT,
  pagesText: [{ pageNumber: 1, text: MODESTA_TRAVEL_VERBATIM_TEXT }],
  technical: {
    filename: 'Authority_to_Travel_Order.pdf',
    fileSizeBytes: 198400,
    fileSizeFormatted: '194 KB',
    totalPages: 1,
    dimensions: '595.28 × 841.89 pt (A4 Standard)',
    pdfVersion: '1.7',
  },
  notes: 'Travel order for bookkeeping training facilitation. Travelling expenses authorized through reimbursement or cash advance.',
  tags: ['Authority to Travel', 'SLPA Training', 'Modesta Baguingan', 'San Juan La Union', '2026'],
};

export const EMPTY_DOCUMENT_METADATA: CategorizedDocumentInfo = {
  title: '',
  subject: '',
  documentType: 'Document',
  documentNumber: '000001',
  series: `Series of ${new Date().getFullYear()}`,
  annexRef: '',
  headerLogosText: '',
  bodyParagraph: '',
  issuanceLocation: '',
  tableHeaders: ['No.', 'Name', 'Position', 'Division/Section', 'Classification'],
  dates: {
    documentDate: new Date().toISOString().split('T')[0],
    effectiveDateRange: '',
    stampedDate: new Date().toISOString().split('T')[0],
  },
  personnel: [],
  approval: {
    approvedBy: '',
    approverPosition: '',
    issuingOffice: '',
    annexRef: '',
  },
  event: {
    purpose: '',
    venue: '',
  },
  fullVerbatimText: '',
  pagesText: [],
  technical: {
    filename: '',
    fileSizeBytes: 0,
    fileSizeFormatted: '0 KB',
    totalPages: 0,
    dimensions: 'Standard PDF Points',
    pdfVersion: '1.7',
  },
  notes: '',
  tags: [],
};


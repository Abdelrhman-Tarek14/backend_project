export interface SheetRow {
  actionType: string;
  syncStatus: string;
  timestamp: string;
  agentEmail: string;
  caseNumber: string;
  caseType: string;
  breakMins: string;
  items: string;
  choices: string;
  description: string;
  images: string;
  tmpAreas: string;
  eta: string;
}

export interface BackendCasePayload {
  caseNumber: string;     // Col E (4)
  caseOwner: string;      // Col D (3)
  formType: string;       // Col F (5)
  formSubmitTime: string; // Col C (2)
  breakMins: number;
  items: number;          // Col H (7)
  choices: number;        // Col I (8)
  description: number;    // Col J (9)
  images: number;         // Col K (10)
  tmpAreas: number;       // Col L (11)
  eta: number | null;     // Col M (12)
}

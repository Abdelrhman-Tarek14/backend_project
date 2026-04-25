export interface ImportantLink {
  id: string;
  key: string;
  title: string;
  category: 'FORMS' | 'SHEETS' | 'WEBSITES' | 'DRIVE';
  is_available: boolean;
  is_multi_country: boolean;
  url?: string;
  urls?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportantLinkResources {
  resources: {
    forms: Record<string, ImportantLink>;
    sheets: Record<string, ImportantLink>;
    websites: Record<string, ImportantLink>;
    drive: Record<string, ImportantLink>;
  };
}

export interface UpdateLinkDto {
  title?: string;
  is_available?: boolean;
  is_multi_country?: boolean;
  url?: string;
  urls?: Record<string, string>;
}

export interface BulkUpdateLinksDto {
  links: (UpdateLinkDto & { id: string })[];
}

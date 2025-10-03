export type LibraryCategory = {
  id: string;
  name: string;
  icon: string; // emoji or icon ref
  description?: string;
};

export type PromptIndexItem = {
  id: string;
  title: string;
  shortDescription: string;
  categoryId: string;
  subcategory?: string;
  tags?: string[];
  keywords?: string[];
  patientFacingTags?: string[];
  situationTags?: string[];
  audienceTags?: string[];
  searchBoost?: number;
  createdAt?: string; // ISO
  featuredWeight?: number;
  contentType?: string;
  audiences?: string[];
  languages?: string[];
  updatedAt?: string; // ISO
};

export type PromptBody = PromptIndexItem & {
  body: string; // full content
};

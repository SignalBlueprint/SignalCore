/**
 * SiteForge domain schemas
 */

export type SiteProjectStatus = "draft" | "queued" | "generating" | "ready" | "failed";

export interface SiteProject {
  id: string;
  businessName: string;
  domain: string;
  niche: string;
  notes?: string;
  status: SiteProjectStatus;
  generatedSite?: GeneratedSite;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type GenerationJobStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  projectId: string;
  status: GenerationJobStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/**
 * Generated website content and metadata
 */
export interface GeneratedSite {
  html: string;
  metadata: SiteMetadata;
  components: PageComponent[];
  generatedAt: string;
}

/**
 * Website metadata for SEO and social sharing
 */
export interface SiteMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  favicon?: string;
  themeColor: string;
}

/**
 * Individual page components/sections
 */
export interface PageComponent {
  id: string;
  type: ComponentType;
  content: ComponentContent;
  order: number;
}

export type ComponentType =
  | "hero"
  | "features"
  | "about"
  | "services"
  | "pricing"
  | "testimonials"
  | "cta"
  | "contact"
  | "footer";

export interface ComponentContent {
  heading?: string;
  subheading?: string;
  body?: string;
  items?: Array<{
    title?: string;
    description?: string;
    icon?: string;
    price?: string;
  }>;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

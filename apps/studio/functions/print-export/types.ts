/**
 * Shared types for the Sanity → InDesign print export pipeline.
 *
 * These mirror the Sanity schema shapes after GROQ projection.
 * They are NOT the raw Sanity document types — they represent
 * the resolved, dereferenced data we get back from our queries.
 */

// --- Portable Text types ---

export interface PortableTextSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks: string[];
}

export interface MarkDef {
  _key: string;
  _type: string;
  href?: string;
  reference?: { _ref: string };
}

export interface PortableTextBlock {
  _type: 'block';
  _key: string;
  style: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  children: PortableTextSpan[];
  markDefs: MarkDef[];
}

export interface ImageAsset {
  _id: string;
  url: string;
  originalFilename?: string;
  metadata?: {
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export interface ImageBlock {
  _type: 'image';
  _key: string;
  asset: ImageAsset;
  hotspot?: { x: number; y: number; width: number; height: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  caption?: string;
  credit?: string;
  alt?: string;
}

/** Custom block types from the existing KB schema — handled gracefully */
export interface CodeBlock {
  _type: 'codeBlock';
  _key: string;
  language?: string;
  code: string;
  filename?: string;
}

export interface CalloutBlock {
  _type: 'callout';
  _key: string;
  tone?: 'info' | 'warning' | 'tip';
  body?: PortableTextBlock[];
}

export type BodyBlock = PortableTextBlock | ImageBlock | CodeBlock | CalloutBlock | UnknownBlock;

export interface UnknownBlock {
  _type: string;
  _key: string;
  [key: string]: unknown;
}

// --- Resolved article shape (post-GROQ) ---

export interface PrintAuthor {
  name: string;
  title?: string;
}

export interface PrintImage {
  asset: ImageAsset;
  hotspot?: { x: number; y: number; width: number; height: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  caption?: string;
  credit?: string;
}

export interface PrintArticle {
  _id: string;
  _rev: string;
  title: string;
  headline: string;
  deck?: string;
  section?: string;
  priority?: number;
  author?: PrintAuthor;
  publishedAt?: string;
  slug?: { current: string };
  body: BodyBlock[];
  heroImage?: PrintImage;
}

// --- Serializer options ---

export interface SerializerOptions {
  /** @sanity/image-url builder instance, pre-configured with project/dataset */
  imageUrlBuilder: ImageUrlBuilder;
}

/**
 * Minimal interface for @sanity/image-url builder.
 * We only use the fluent chain: .image().quality().fit().url()
 */
export interface ImageUrlBuilder {
  image(source: unknown): ImageUrlBuilderChain;
}

export interface ImageUrlBuilderChain {
  quality(q: number): ImageUrlBuilderChain;
  fit(mode: string): ImageUrlBuilderChain;
  url(): string;
}

// --- Function event types ---

export interface PrintExportEvent {
  data: {
    _id: string;
    title: string;
    section?: string;
  };
}

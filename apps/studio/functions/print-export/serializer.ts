/**
 * Portable Text → InDesign XML serializer.
 *
 * Converts Sanity's Portable Text JSON into XML that InDesign can
 * import with automatic style mapping via aid:pstyle / aid:cstyle
 * attributes (Adobe InDesign namespace).
 *
 * Design decisions:
 * - Images are CDN URLs, not local files. InDesign fetches at import time.
 * - Unknown block types are serialized as comments, not silently dropped.
 * - The serializer is a pure function — no side effects, no network calls.
 * - All text is XML-escaped. No innerHTML-style injection possible.
 */

import { buildPrintImageUrl } from './image-urls.js';
import type {
  BodyBlock,
  PortableTextBlock,
  PortableTextSpan,
  MarkDef,
  ImageBlock,
  CodeBlock,
  CalloutBlock,
  SerializerOptions,
} from './types.js';

// --- Paragraph style mapping ---
// Maps Portable Text `style` values to InDesign paragraph style names.
// These must match styles defined in the InDesign template.

const PARAGRAPH_STYLES: Record<string, string> = {
  normal: 'Body',
  h1: 'Headline_1',
  h2: 'Headline_2',
  h3: 'Headline_3',
  h4: 'Headline_4',
  blockquote: 'Pullquote',
};

const LIST_STYLES: Record<string, string> = {
  bullet: 'List_Bullet',
  number: 'List_Number',
};

// --- Character style mapping ---
// Maps Portable Text mark decorators to InDesign character style names.

const CHARACTER_STYLES: Record<string, string> = {
  strong: 'Bold',
  em: 'Italic',
  underline: 'Underline',
  'strike-through': 'Strikethrough',
  code: 'Code',
};

/**
 * Serialize an array of Portable Text blocks to InDesign XML.
 *
 * Returns the inner XML content (no root element or XML declaration).
 * The caller wraps this in the full document structure.
 */
export function portableTextToInDesignXML(blocks: BodyBlock[], options: SerializerOptions): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block._type) {
      case 'block':
        parts.push(serializeTextBlock(block as PortableTextBlock));
        break;
      case 'image':
        parts.push(serializeImageBlock(block as ImageBlock, options));
        break;
      case 'codeBlock':
        parts.push(serializeCodeBlock(block as CodeBlock));
        break;
      case 'callout':
        parts.push(serializeCalloutBlock(block as CalloutBlock, options));
        break;
      default:
        // Don't silently drop content — make it visible that something was skipped
        parts.push(
          `  <!-- Unsupported block type: ${escapeXML(block._type)} (key: ${escapeXML(block._key)}) -->`,
        );
        break;
    }
  }

  return parts.join('\n');
}

// --- Block serializers ---

function serializeTextBlock(block: PortableTextBlock): string {
  const style = block.listItem
    ? (LIST_STYLES[block.listItem] ?? 'List_Bullet')
    : (PARAGRAPH_STYLES[block.style ?? 'normal'] ?? 'Body');

  const content = serializeSpans(block.children, block.markDefs);

  return `  <paragraph aid:pstyle="${style}">${content}</paragraph>`;
}

function serializeImageBlock(block: ImageBlock, options: SerializerOptions): string {
  if (!block.asset) {
    return `  <!-- Image block missing asset reference (key: ${escapeXML(block._key)}) -->`;
  }

  const printUrl = buildPrintImageUrl(options.imageUrlBuilder, block);
  const dims = block.asset.metadata?.dimensions;

  const attrs = [
    `href="${escapeXML(printUrl)}"`,
    dims ? `width="${dims.width}" height="${dims.height}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const children: string[] = [];
  if (block.caption) {
    children.push(`    <caption aid:pstyle="Image_Caption">${escapeXML(block.caption)}</caption>`);
  }
  if (block.credit) {
    children.push(`    <credit aid:pstyle="Image_Credit">${escapeXML(block.credit)}</credit>`);
  }

  if (children.length > 0) {
    return `  <image ${attrs}>\n${children.join('\n')}\n  </image>`;
  }
  return `  <image ${attrs} />`;
}

function serializeCodeBlock(block: CodeBlock): string {
  // Code blocks in print: render as preformatted text with a Code paragraph style.
  // Strip syntax highlighting — InDesign handles monospace via the style.
  return `  <paragraph aid:pstyle="Code">${escapeXML(block.code)}</paragraph>`;
}

function serializeCalloutBlock(block: CalloutBlock, options: SerializerOptions): string {
  const tone = block.tone ?? 'info';
  const styleMap: Record<string, string> = {
    info: 'Callout_Info',
    warning: 'Callout_Warning',
    tip: 'Callout_Tip',
  };
  const style = styleMap[tone] ?? 'Callout_Info';

  if (!block.body || block.body.length === 0) {
    return `  <!-- Empty callout block (key: ${escapeXML(block._key)}) -->`;
  }

  // Callout body is nested Portable Text — serialize recursively
  const innerParts = block.body.map((b) => serializeTextBlock(b));
  // Override the paragraph style to the callout variant
  const reStyled = innerParts.map((p) => p.replace(/aid:pstyle="[^"]*"/, `aid:pstyle="${style}"`));

  return reStyled.join('\n');
}

// --- Span serializer ---

function serializeSpans(spans: PortableTextSpan[], markDefs: MarkDef[]): string {
  return spans.map((span) => serializeSpan(span, markDefs)).join('');
}

function serializeSpan(span: PortableTextSpan, markDefs: MarkDef[]): string {
  let text = escapeXML(span.text);

  if (!span.marks || span.marks.length === 0) {
    return text;
  }

  // Process marks inside-out: decorators first, then annotations
  for (const mark of span.marks) {
    if (mark in CHARACTER_STYLES) {
      text = `<inline aid:cstyle="${CHARACTER_STYLES[mark]}">${text}</inline>`;
    } else {
      // Annotation — look up in markDefs
      const def = markDefs?.find((d) => d._key === mark);
      if (def?._type === 'link' && def.href) {
        text = `<link href="${escapeXML(def.href)}">${text}</link>`;
      } else if (def?._type === 'internalLink') {
        // Internal links don't make sense in print — render as plain text
        // but leave a comment for the layout team
        text = `${text}<!-- internal link -->`;
      }
      // Unknown annotations: leave text as-is (don't wrap in anything)
    }
  }

  return text;
}

// --- XML utilities ---

export function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the complete InDesign XML document for an article.
 *
 * This is the top-level assembly function that wraps the serialized
 * body content in the full XML structure with namespaces, metadata,
 * and hero image.
 */
export function buildArticleXML(
  article: {
    _id: string;
    headline: string;
    deck?: string;
    section?: string;
    priority?: number;
    author?: { name: string };
    heroImage?: {
      asset?: { metadata?: { dimensions?: { width: number; height: number } } };
      caption?: string;
      credit?: string;
    };
    body: BodyBlock[];
  },
  options: SerializerOptions & {
    heroImageUrl?: string;
  },
): string {
  const bodyXML = portableTextToInDesignXML(article.body ?? [], options);

  const heroXML = buildHeroImageXML(article.heroImage, options.heroImageUrl);

  const deckXML = article.deck
    ? `    <deck aid:pstyle="Deck">${escapeXML(article.deck)}</deck>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/"
      xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/">
  <article id="${escapeXML(article._id)}"
           section="${escapeXML(article.section ?? '')}"
           priority="${article.priority ?? 1}">

    <headline aid:pstyle="Headline_1">${escapeXML(article.headline)}</headline>

${deckXML ? deckXML + '\n' : ''}    <byline aid:pstyle="Byline">By ${escapeXML(article.author?.name ?? 'Staff')}</byline>

${heroXML ? heroXML + '\n' : ''}    <body>
${bodyXML}
    </body>

  </article>
</Root>`;
}

function buildHeroImageXML(
  heroImage:
    | {
        asset?: { metadata?: { dimensions?: { width: number; height: number } } };
        caption?: string;
        credit?: string;
      }
    | undefined,
  heroImageUrl: string | undefined,
): string {
  if (!heroImage?.asset || !heroImageUrl) {
    return '';
  }

  const dims = heroImage.asset.metadata?.dimensions;
  const attrs = [
    `href="${escapeXML(heroImageUrl)}"`,
    dims ? `width="${dims.width}" height="${dims.height}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const children: string[] = [];
  if (heroImage.caption) {
    children.push(
      `      <caption aid:pstyle="Image_Caption">${escapeXML(heroImage.caption)}</caption>`,
    );
  }
  if (heroImage.credit) {
    children.push(
      `      <credit aid:pstyle="Image_Credit">${escapeXML(heroImage.credit)}</credit>`,
    );
  }

  if (children.length > 0) {
    return `    <heroImage ${attrs}>\n${children.join('\n')}\n    </heroImage>`;
  }
  return `    <heroImage ${attrs} />`;
}

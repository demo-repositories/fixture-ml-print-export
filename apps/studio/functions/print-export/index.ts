/**
 * Sanity Function: print-export
 *
 * Triggered when an article is published with printSettings.printReady == true.
 * Generates InDesign-compatible XML and uploads it as a Sanity asset.
 *
 * Flow:
 * 1. Receive document publish event
 * 2. Fetch full article via GROQ (resolves all references)
 * 3. Serialize Portable Text → InDesign XML (images as CDN URLs)
 * 4. Upload XML as a Sanity file asset
 * 5. Patch article with reference to the generated XML + timestamp
 */

import { documentEventHandler } from '@sanity/functions';
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import { PRINT_ARTICLE_QUERY } from './queries.js';
import { buildArticleXML } from './serializer.js';
import { buildPrintImageUrl } from './image-urls.js';
import type { PrintArticle } from './types.js';

export const handler = documentEventHandler(async ({ context, event }) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2026-02-10',
    useCdn: false, // Always read from Content Lake, not CDN cache
  });

  const articleId: string = event.data._id;
  const articleTitle: string = event.data.title;

  console.log(`📰 Print export triggered for: ${articleTitle} (${articleId})`);

  // 1. Fetch full article data
  const article: PrintArticle | null = await client.fetch(PRINT_ARTICLE_QUERY, {
    articleId,
  });

  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // 2. Build image URL builder
  const imgBuilder = imageUrlBuilder(client);

  // 3. Build hero image URL (if present)
  let heroImageUrl: string | undefined;
  if (article.heroImage?.asset) {
    heroImageUrl = buildPrintImageUrl(imgBuilder, article.heroImage);
  }

  // 4. Generate complete InDesign XML
  const xmlContent = buildArticleXML(article, {
    imageUrlBuilder: imgBuilder,
    heroImageUrl,
  });

  // 5. Upload XML as a Sanity file asset
  const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
  const slug = article.slug?.current ?? article._id;
  const filename = `print-${slug}-${Date.now()}.xml`;

  const asset = await client.assets.upload('file', xmlBuffer, {
    filename,
    contentType: 'application/xml',
  });

  console.log(`✅ XML uploaded as asset: ${asset._id} (${filename})`);

  // 6. Patch article with export metadata
  await client
    .patch(article._id)
    .set({
      'printSettings.lastExport': {
        _type: 'object',
        exportedAt: new Date().toISOString(),
        xmlAsset: {
          _type: 'file',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
      },
    })
    .commit();

  console.log(`✅ Print export complete for: ${article.headline}`);
  console.log(`   Section: ${article.section ?? '(none)'}, Priority: ${article.priority ?? 1}`);
});

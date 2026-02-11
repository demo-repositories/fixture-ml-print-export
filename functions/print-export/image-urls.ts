/**
 * CDN URL builder for print-quality images.
 *
 * Instead of downloading images, we build Sanity CDN URLs with
 * print-optimized parameters. InDesign fetches images directly
 * from these URLs during XML import.
 *
 * Parameters applied:
 * - q=100     → no lossy compression
 * - fit=max   → preserve full resolution (no downscaling)
 * - cs=cmyk   → CMYK color space for print output
 */

import type { ImageUrlBuilder } from './types.js';

/**
 * Build a print-resolution CDN URL for an image.
 *
 * Uses @sanity/image-url to respect crop/hotspot settings,
 * then appends CMYK color space (not exposed by the builder API).
 */
export function buildPrintImageUrl(
  builder: ImageUrlBuilder,
  imageRef: unknown,
): string {
  const url = builder
    .image(imageRef)
    .quality(100)
    .fit('max')
    .url();

  // @sanity/image-url doesn't expose a .colorSpace() method,
  // so we append cs=cmyk manually to the query string.
  return url + (url.includes('?') ? '&' : '?') + 'cs=cmyk';
}

/**
 * Build a direct download URL for the original uploaded file.
 * Use this when the layout team needs the absolute original
 * (e.g., TIFF, RAW) rather than a CDN-transformed version.
 */
export function buildOriginalDownloadUrl(assetUrl: string): string {
  return assetUrl + (assetUrl.includes('?') ? '&' : '?') + 'dlRaw=original';
}

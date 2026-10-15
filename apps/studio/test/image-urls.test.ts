/**
 * Tests for the CDN URL builder for print images.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPrintImageUrl,
  buildOriginalDownloadUrl,
} from '../functions/print-export/image-urls.js';
import type { ImageUrlBuilder } from '../functions/print-export/types.js';

function mockBuilder(baseUrl: string): ImageUrlBuilder {
  return {
    image(_source: unknown) {
      return {
        quality(q: number) {
          (this as any)._q = q;
          return this;
        },
        fit(mode: string) {
          (this as any)._fit = mode;
          return this;
        },
        url() {
          return `${baseUrl}?q=${(this as any)._q}&fit=${(this as any)._fit}`;
        },
      };
    },
  };
}

describe('buildPrintImageUrl', () => {
  it('appends cs=cmyk to URL with existing query params', () => {
    const builder = mockBuilder('https://cdn.sanity.io/images/proj/ds/img.jpg');
    const url = buildPrintImageUrl(builder, { _ref: 'image-abc' });

    expect(url).toContain('q=100');
    expect(url).toContain('fit=max');
    expect(url).toContain('cs=cmyk');
    expect(url).toContain('&cs=cmyk'); // appended with &
  });

  it('uses ? separator when URL has no query params', () => {
    // Edge case: builder returns URL without query string
    const builder: ImageUrlBuilder = {
      image() {
        return {
          quality() {
            return this;
          },
          fit() {
            return this;
          },
          url() {
            return 'https://cdn.sanity.io/images/proj/ds/img.jpg';
          },
        };
      },
    };
    const url = buildPrintImageUrl(builder, {});
    expect(url).toBe('https://cdn.sanity.io/images/proj/ds/img.jpg?cs=cmyk');
  });
});

describe('buildOriginalDownloadUrl', () => {
  it('appends dlRaw=original to clean URL', () => {
    const url = buildOriginalDownloadUrl('https://cdn.sanity.io/files/proj/ds/file-abc.tiff');
    expect(url).toBe('https://cdn.sanity.io/files/proj/ds/file-abc.tiff?dlRaw=original');
  });

  it('appends with & when URL already has query params', () => {
    const url = buildOriginalDownloadUrl(
      'https://cdn.sanity.io/files/proj/ds/file-abc.tiff?token=xyz',
    );
    expect(url).toBe('https://cdn.sanity.io/files/proj/ds/file-abc.tiff?token=xyz&dlRaw=original');
  });
});

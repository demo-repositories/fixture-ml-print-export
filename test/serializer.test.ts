/**
 * Tests for the Portable Text → InDesign XML serializer.
 *
 * These validate the core transformation logic without needing
 * a Sanity instance. The serializer is a pure function — given
 * Portable Text JSON, it produces XML strings.
 */

import { describe, it, expect } from 'vitest';
import {
  portableTextToInDesignXML,
  buildArticleXML,
  escapeXML,
} from '../functions/print-export/serializer.js';
import type {
  PortableTextBlock,
  ImageBlock,
  CodeBlock,
  CalloutBlock,
  BodyBlock,
  ImageUrlBuilder,
} from '../functions/print-export/types.js';

// --- Test helpers ---

/** Mock image URL builder that returns predictable URLs */
function mockImageUrlBuilder(): ImageUrlBuilder {
  return {
    image(_source: unknown) {
      return {
        quality(_q: number) {
          return this;
        },
        fit(_mode: string) {
          return this;
        },
        url() {
          return 'https://cdn.sanity.io/images/proj/dataset/image-abc-1200x800-jpg';
        },
      };
    },
  };
}

function makeTextBlock(
  text: string,
  overrides: Partial<PortableTextBlock> = {},
): PortableTextBlock {
  return {
    _type: 'block',
    _key: 'block1',
    style: 'normal',
    children: [{ _type: 'span', _key: 'span1', text, marks: [] }],
    markDefs: [],
    ...overrides,
  };
}

function makeImageBlock(
  overrides: Partial<ImageBlock> = {},
): ImageBlock {
  return {
    _type: 'image',
    _key: 'img1',
    asset: {
      _id: 'image-abc',
      url: 'https://cdn.sanity.io/images/proj/dataset/image-abc.jpg',
      metadata: { dimensions: { width: 1200, height: 800 } },
    },
    caption: 'A test image',
    credit: 'Photo by Test',
    ...overrides,
  };
}

// --- Tests ---

describe('escapeXML', () => {
  it('escapes all XML special characters', () => {
    expect(escapeXML('Tom & Jerry <"friends"> aren\'t')).toBe(
      'Tom &amp; Jerry &lt;&quot;friends&quot;&gt; aren&apos;t',
    );
  });

  it('handles empty string', () => {
    expect(escapeXML('')).toBe('');
  });

  it('passes through safe text unchanged', () => {
    expect(escapeXML('Hello world 123')).toBe('Hello world 123');
  });
});

describe('portableTextToInDesignXML', () => {
  const options = { imageUrlBuilder: mockImageUrlBuilder() };

  describe('text blocks', () => {
    it('serializes a normal paragraph', () => {
      const blocks: BodyBlock[] = [makeTextBlock('Hello world')];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="Body"');
      expect(xml).toContain('Hello world');
    });

    it('maps heading styles correctly', () => {
      const styles = [
        ['h1', 'Headline_1'],
        ['h2', 'Headline_2'],
        ['h3', 'Headline_3'],
        ['h4', 'Headline_4'],
        ['blockquote', 'Pullquote'],
      ] as const;

      for (const [ptStyle, indesignStyle] of styles) {
        const blocks: BodyBlock[] = [
          makeTextBlock('Test', { style: ptStyle }),
        ];
        const xml = portableTextToInDesignXML(blocks, options);
        expect(xml).toContain(`aid:pstyle="${indesignStyle}"`);
      }
    });

    it('handles bullet list items', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('Item one', { listItem: 'bullet' }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="List_Bullet"');
    });

    it('handles numbered list items', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('Step one', { listItem: 'number' }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="List_Number"');
    });

    it('falls back to Body for unknown styles', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('Unknown', { style: 'some-custom-style' }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="Body"');
    });
  });

  describe('character styles (marks)', () => {
    it('wraps bold text in inline with Bold cstyle', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('', {
          children: [
            { _type: 'span', _key: 's1', text: 'bold text', marks: ['strong'] },
          ],
        }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<inline aid:cstyle="Bold">bold text</inline>');
    });

    it('wraps italic text in inline with Italic cstyle', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('', {
          children: [
            { _type: 'span', _key: 's1', text: 'italic text', marks: ['em'] },
          ],
        }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<inline aid:cstyle="Italic">italic text</inline>');
    });

    it('nests multiple marks', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('', {
          children: [
            {
              _type: 'span',
              _key: 's1',
              text: 'bold italic',
              marks: ['strong', 'em'],
            },
          ],
        }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      // Both marks should be present, nested
      expect(xml).toContain('aid:cstyle="Bold"');
      expect(xml).toContain('aid:cstyle="Italic"');
      expect(xml).toContain('bold italic');
    });

    it('handles links as annotations', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('', {
          children: [
            {
              _type: 'span',
              _key: 's1',
              text: 'click here',
              marks: ['link1'],
            },
          ],
          markDefs: [
            { _key: 'link1', _type: 'link', href: 'https://example.com' },
          ],
        }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<link href="https://example.com">click here</link>');
    });

    it('renders internal links as plain text with comment', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('', {
          children: [
            {
              _type: 'span',
              _key: 's1',
              text: 'related article',
              marks: ['ilink1'],
            },
          ],
          markDefs: [
            {
              _key: 'ilink1',
              _type: 'internalLink',
              reference: { _ref: 'article-123' },
            },
          ],
        }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('related article');
      expect(xml).toContain('<!-- internal link -->');
      // Should NOT wrap in a link element
      expect(xml).not.toContain('<link');
    });
  });

  describe('image blocks', () => {
    it('serializes image with CDN URL, dimensions, caption, and credit', () => {
      const blocks: BodyBlock[] = [makeImageBlock()];
      const xml = portableTextToInDesignXML(blocks, options);

      expect(xml).toContain('<image');
      expect(xml).toContain('href="');
      expect(xml).toContain('cs=cmyk');
      expect(xml).toContain('width="1200"');
      expect(xml).toContain('height="800"');
      expect(xml).toContain('aid:pstyle="Image_Caption"');
      expect(xml).toContain('A test image');
      expect(xml).toContain('aid:pstyle="Image_Credit"');
      expect(xml).toContain('Photo by Test');
    });

    it('renders self-closing tag when no caption or credit', () => {
      const blocks: BodyBlock[] = [
        makeImageBlock({ caption: undefined, credit: undefined }),
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<image');
      expect(xml).toContain('/>');
      expect(xml).not.toContain('</image>');
    });

    it('emits comment for image block with missing asset', () => {
      const blocks: BodyBlock[] = [
        { _type: 'image', _key: 'img-broken', asset: undefined as any },
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<!-- Image block missing asset');
    });
  });

  describe('code blocks', () => {
    it('serializes code block with Code paragraph style', () => {
      const blocks: BodyBlock[] = [
        {
          _type: 'codeBlock',
          _key: 'code1',
          code: 'const x = 1;',
          language: 'javascript',
        } as CodeBlock,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="Code"');
      expect(xml).toContain('const x = 1;');
    });

    it('escapes XML in code content', () => {
      const blocks: BodyBlock[] = [
        {
          _type: 'codeBlock',
          _key: 'code2',
          code: '<div class="test">hello</div>',
        } as CodeBlock,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('&lt;div');
      expect(xml).not.toContain('<div class');
    });
  });

  describe('callout blocks', () => {
    it('serializes callout with tone-specific style', () => {
      const blocks: BodyBlock[] = [
        {
          _type: 'callout',
          _key: 'callout1',
          tone: 'warning',
          body: [makeTextBlock('Watch out!')],
        } as CalloutBlock,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="Callout_Warning"');
      expect(xml).toContain('Watch out!');
    });

    it('defaults to info tone', () => {
      const blocks: BodyBlock[] = [
        {
          _type: 'callout',
          _key: 'callout2',
          body: [makeTextBlock('FYI')],
        } as CalloutBlock,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('aid:pstyle="Callout_Info"');
    });

    it('emits comment for empty callout', () => {
      const blocks: BodyBlock[] = [
        { _type: 'callout', _key: 'callout3', body: [] } as CalloutBlock,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<!-- Empty callout');
    });
  });

  describe('unknown block types', () => {
    it('emits a comment instead of silently dropping', () => {
      const blocks: BodyBlock[] = [
        { _type: 'dataTable', _key: 'dt1' } as any,
      ];
      const xml = portableTextToInDesignXML(blocks, options);
      expect(xml).toContain('<!-- Unsupported block type: dataTable');
    });
  });

  describe('mixed content', () => {
    it('serializes a realistic article body', () => {
      const blocks: BodyBlock[] = [
        makeTextBlock('The Grand Cayman economy grew 5% this quarter.', {
          style: 'normal',
        }),
        makeTextBlock('Key Findings', { style: 'h2', _key: 'b2' }),
        makeTextBlock('Tourism revenue increased significantly.', {
          _key: 'b3',
          children: [
            { _type: 'span', _key: 's1', text: 'Tourism revenue ', marks: [] },
            {
              _type: 'span',
              _key: 's2',
              text: 'increased significantly',
              marks: ['strong'],
            },
            { _type: 'span', _key: 's3', text: '.', marks: [] },
          ],
        }),
        makeImageBlock({ _key: 'img1' }),
        makeTextBlock('Source: Government statistics', {
          _key: 'b4',
          style: 'blockquote',
        }),
      ];

      const xml = portableTextToInDesignXML(blocks, options);

      // Verify structure
      expect(xml).toContain('aid:pstyle="Body"');
      expect(xml).toContain('aid:pstyle="Headline_2"');
      expect(xml).toContain('aid:cstyle="Bold"');
      expect(xml).toContain('<image');
      expect(xml).toContain('aid:pstyle="Pullquote"');
    });
  });
});

describe('buildArticleXML', () => {
  const options = {
    imageUrlBuilder: mockImageUrlBuilder(),
    heroImageUrl: 'https://cdn.sanity.io/images/proj/dataset/hero.jpg?q=100&fit=max&cs=cmyk',
  };

  it('produces valid XML structure with namespaces', () => {
    const xml = buildArticleXML(
      {
        _id: 'article-123',
        headline: 'Test Headline',
        deck: 'A test deck',
        section: 'local',
        priority: 1,
        author: { name: 'Jane Reporter' },
        heroImage: {
          asset: { metadata: { dimensions: { width: 2000, height: 1200 } } },
          caption: 'Hero caption',
          credit: 'Hero credit',
        },
        body: [makeTextBlock('Article body text.')],
      },
      options,
    );

    // XML declaration
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);

    // Namespaces
    expect(xml).toContain('xmlns:aid="http://ns.adobe.com/AdobeInDesign/4.0/"');
    expect(xml).toContain('xmlns:aid5="http://ns.adobe.com/AdobeInDesign/5.0/"');

    // Article metadata
    expect(xml).toContain('id="article-123"');
    expect(xml).toContain('section="local"');
    expect(xml).toContain('priority="1"');

    // Content
    expect(xml).toContain('aid:pstyle="Headline_1"');
    expect(xml).toContain('Test Headline');
    expect(xml).toContain('aid:pstyle="Deck"');
    expect(xml).toContain('A test deck');
    expect(xml).toContain('aid:pstyle="Byline"');
    expect(xml).toContain('By Jane Reporter');

    // Hero image
    expect(xml).toContain('<heroImage');
    expect(xml).toContain('Hero caption');
    expect(xml).toContain('Hero credit');

    // Body
    expect(xml).toContain('<body>');
    expect(xml).toContain('Article body text.');
    expect(xml).toContain('</body>');
  });

  it('omits deck when not provided', () => {
    const xml = buildArticleXML(
      {
        _id: 'art-1',
        headline: 'No Deck',
        body: [makeTextBlock('Text.')],
      },
      { ...options, heroImageUrl: undefined },
    );

    expect(xml).not.toContain('aid:pstyle="Deck"');
  });

  it('defaults author to Staff', () => {
    const xml = buildArticleXML(
      {
        _id: 'art-2',
        headline: 'No Author',
        body: [makeTextBlock('Text.')],
      },
      { ...options, heroImageUrl: undefined },
    );

    expect(xml).toContain('By Staff');
  });

  it('omits hero image when no URL provided', () => {
    const xml = buildArticleXML(
      {
        _id: 'art-3',
        headline: 'No Hero',
        body: [makeTextBlock('Text.')],
      },
      { ...options, heroImageUrl: undefined },
    );

    expect(xml).not.toContain('<heroImage');
  });

  it('escapes special characters in all text fields', () => {
    const xml = buildArticleXML(
      {
        _id: 'art-4',
        headline: 'Tom & Jerry\'s "Adventure"',
        deck: 'A <special> deck',
        author: { name: 'O\'Brien & Associates' },
        body: [makeTextBlock('Text with <html> & "quotes".')],
      },
      { ...options, heroImageUrl: undefined },
    );

    expect(xml).toContain('Tom &amp; Jerry&apos;s &quot;Adventure&quot;');
    expect(xml).toContain('A &lt;special&gt; deck');
    expect(xml).toContain('O&apos;Brien &amp; Associates');
    expect(xml).not.toContain('<html>');
  });
});

/**
 * Generate a sample InDesign XML file from realistic test data.
 * Run with: npx tsx test/generate-sample.ts
 */

import { buildArticleXML } from '../functions/print-export/serializer.js';
import type { BodyBlock, ImageUrlBuilder } from '../functions/print-export/types.js';

const mockBuilder: ImageUrlBuilder = {
  image(source: any) {
    const assetId = source?.asset?._id ?? 'image-unknown';
    return {
      quality(_q: number) {
        return this;
      },
      fit(_mode: string) {
        return this;
      },
      url() {
        return `https://cdn.sanity.io/images/example/production/${assetId}-1200x800-jpg?q=100&fit=max`;
      },
    };
  },
};

const sampleBody: BodyBlock[] = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's1',
        text: 'The regional economy posted a ',
        marks: [],
      },
      {
        _type: 'span',
        _key: 's2',
        text: 'record-breaking 5.2% growth',
        marks: ['strong'],
      },
      {
        _type: 'span',
        _key: 's3',
        text: ' in the fourth quarter of 2025, driven primarily by a surge in tourism arrivals and continued strength in the financial services sector.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'h2',
    children: [{ _type: 'span', _key: 's4', text: 'Tourism Leads the Way', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b3',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's5',
        text: 'Stayover arrivals reached 520,000 for the quarter, a 12% increase over the same period last year. The ',
        marks: [],
      },
      {
        _type: 'span',
        _key: 's6',
        text: 'Department of Tourism',
        marks: ['em'],
      },
      {
        _type: 'span',
        _key: 's7',
        text: ' attributed the growth to expanded airlift from major hubs and the opening of two new luxury resorts along the coast.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'image',
    _key: 'img1',
    asset: {
      _id: 'image-coastal-sunset-abc123',
      url: 'https://cdn.sanity.io/images/example/production/image-coastal-sunset-abc123.jpg',
      metadata: { dimensions: { width: 2400, height: 1600 } },
    },
    caption: 'Coastal view at sunset, with the new resort extension visible in the background.',
    credit: 'Photo: Jane Smith / Sample News',
  },
  {
    _type: 'block',
    _key: 'b4',
    style: 'blockquote',
    children: [
      {
        _type: 'span',
        _key: 's8',
        text: '"This is the strongest quarter we\'ve seen since the pandemic recovery began. The numbers speak for themselves."',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b5',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's9',
        text: '— Rosa Harris, Director of Tourism',
        marks: ['em'],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b6',
    style: 'h2',
    children: [{ _type: 'span', _key: 's10', text: 'Financial Services Remain Strong', marks: [] }],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b7',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's11',
        text: 'The financial services sector contributed an estimated $1.8 billion to GDP, with fund administration and insurance-linked securities showing particular strength. Key highlights include:',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b8',
    style: 'normal',
    listItem: 'bullet' as const,
    children: [
      {
        _type: 'span',
        _key: 's12',
        text: 'Fund registrations up 8% year-over-year',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b9',
    style: 'normal',
    listItem: 'bullet' as const,
    children: [
      {
        _type: 'span',
        _key: 's13',
        text: 'New company incorporations reached a five-year high',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b10',
    style: 'normal',
    listItem: 'bullet' as const,
    children: [
      {
        _type: 'span',
        _key: 's14',
        text: 'Insurance-linked securities market grew to $12.4 billion',
        marks: ['strong'],
      },
    ],
    markDefs: [],
  },
];

const xml = buildArticleXML(
  {
    _id: 'article-q4-economy-2025',
    headline: 'Regional Economy Posts Record Q4 Growth',
    deck: 'Tourism surge and financial services strength drive 5.2% expansion in final quarter of 2025',
    section: 'business',
    priority: 1,
    author: { name: 'Sarah Mitchell' },
    heroImage: {
      asset: {
        metadata: { dimensions: { width: 3000, height: 2000 } },
      },
      caption: 'Downtown financial district skyline.',
      credit: 'Photo: Sample News Archive',
    },
    body: sampleBody,
  },
  {
    imageUrlBuilder: mockBuilder,
    heroImageUrl:
      'https://cdn.sanity.io/images/example/production/image-downtown-skyline-def456-3000x2000-jpg?q=100&fit=max&cs=cmyk',
  },
);

console.log(xml);

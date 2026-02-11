# Caymanian Journal — Print Export Pipeline

Sanity Function that automatically generates InDesign-compatible XML when an article is published with "Ready for Print" checked.

## How It Works

1. Editor marks article as **print ready** in Sanity Studio
2. On publish, a Sanity Function fires automatically
3. Function fetches the full article via GROQ (resolves all references)
4. Portable Text body is serialized to InDesign XML with `aid:pstyle`/`aid:cstyle` attributes
5. Images are referenced via Sanity CDN URLs with `?cs=cmyk&q=100` (no downloads)
6. XML is uploaded as a Sanity file asset
7. Article is patched with a reference to the export + timestamp

The layout team downloads the XML from Sanity Studio and imports it into an InDesign template. Content flows into styled frames automatically.

## Project Structure

```
├── sanity.blueprint.ts              # Function trigger config
├── functions/
│   └── print-export/
│       ├── index.ts                 # Function entry point
│       ├── serializer.ts            # Portable Text → InDesign XML
│       ├── queries.ts               # GROQ queries
│       ├── image-urls.ts            # CDN URL builder (CMYK, full quality)
│       └── types.ts                 # TypeScript types
├── schemas/
│   └── documents/
│       └── article.ts               # Reference schema with printSettings
└── test/
    ├── serializer.test.ts           # 28 tests
    ├── image-urls.test.ts           # 4 tests
    └── generate-sample.ts           # Sample XML generator
```

## Setup

```bash
npm install
```

## Development

```bash
# Run tests
npm test

# Generate sample XML output
npx tsx test/generate-sample.ts

# Local function development
npm run functions:dev

# Deploy function
npm run deploy:functions

# Stream function logs
npm run functions:logs
```

## Configuration

Before deploying, update `sanity.config.ts` with the actual project ID and dataset.

The function trigger is defined in `sanity.blueprint.ts` — it fires on article publish when `printSettings.printReady == true`.

## InDesign Template Requirements

The XML uses these paragraph styles (`aid:pstyle`):

| Style | Usage |
|-------|-------|
| `Headline_1` – `Headline_4` | Heading levels |
| `Deck` | Article summary/subhead |
| `Byline` | Author attribution |
| `Body` | Body text |
| `Pullquote` | Block quotes |
| `Image_Caption` | Photo captions |
| `Image_Credit` | Photo credits |
| `List_Bullet` / `List_Number` | Lists |
| `Code` | Code blocks |
| `Callout_Info` / `Callout_Warning` / `Callout_Tip` | Callout boxes |

And these character styles (`aid:cstyle`):

| Style | Usage |
|-------|-------|
| `Bold` | Strong emphasis |
| `Italic` | Emphasis |
| `Underline` | Underlined text |
| `Strikethrough` | Struck-through text |
| `Code` | Inline code |

Create these styles in the InDesign template, then use **Map Tags to Styles** to link them.

/**
 * GROQ queries for the print export pipeline.
 *
 * These queries resolve all references inline so the serializer
 * gets a flat, fully-hydrated article object — no further fetches needed.
 */

/**
 * Full article query for single-article print export.
 * Expects `$articleId` parameter.
 *
 * Resolves:
 * - author reference → { name, title }
 * - inline image assets → { _id, url, metadata.dimensions }
 * - hero image asset → same shape
 * - printSettings fields projected to top level for convenience
 */
export const PRINT_ARTICLE_QUERY = `
  *[_type == "article" && _id == $articleId][0]{
    _id,
    _rev,
    title,
    "headline": coalesce(printSettings.printHeadline, title),
    "deck": printSettings.printSummary,
    "section": printSettings.printSection,
    "priority": printSettings.printPriority,
    "author": author->{name, title},
    publishedAt,
    slug,

    // Portable Text body — resolve image asset references inline
    body[]{
      ...,
      _type == "image" => {
        ...,
        "asset": asset->{
          _id,
          url,
          originalFilename,
          "metadata": metadata{
            dimensions
          }
        },
        caption,
        credit
      }
    },

    // Hero/lead image with resolved asset
    "heroImage": mainImage{
      ...,
      "asset": asset->{
        _id,
        url,
        originalFilename,
        "metadata": metadata{
          dimensions
        }
      },
      caption,
      credit
    }
  }
`;

/**
 * Batch query: all print-ready articles for a full issue export.
 * No parameters — returns all articles with printReady == true,
 * ordered by section then priority.
 */
export const PRINT_ISSUE_QUERY = `
  *[_type == "article" && printSettings.printReady == true]
    | order(printSettings.printSection asc, printSettings.printPriority asc)
  {
    _id,
    "headline": coalesce(printSettings.printHeadline, title),
    "deck": printSettings.printSummary,
    "section": printSettings.printSection,
    "priority": printSettings.printPriority,
    "author": author->{name},
    publishedAt,
    body[]{
      ...,
      _type == "image" => {
        ...,
        "asset": asset->{_id, url, originalFilename, metadata}
      }
    },
    "heroImage": mainImage{
      ...,
      "asset": asset->{_id, url, originalFilename, metadata}
    }
  }
`;

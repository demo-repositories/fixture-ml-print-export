/**
 * Article schema for print export.
 *
 * This extends a typical news article schema with printSettings —
 * fields that control the Sanity → InDesign print export pipeline.
 *
 * NOTE: This is a reference schema for the PoC. The client's actual
 * article schema will differ — the key addition is the `printSettings`
 * object, which can be grafted onto any existing article document type.
 */

import { defineType, defineField, defineArrayMember } from "sanity";

export const article = defineType({
  name: "article",
  title: "Article",
  type: "document",
  icon: () => "📰",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "print", title: "Print Settings" },
    { name: "meta", title: "Metadata" },
  ],
  fields: [
    // --- Content fields ---

    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(200),
    }),

    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      group: "content",
    }),

    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "caption",
          type: "string",
          title: "Caption",
        }),
        defineField({
          name: "credit",
          type: "string",
          title: "Credit",
        }),
        defineField({
          name: "alt",
          type: "string",
          title: "Alt Text",
          validation: (rule) =>
            rule.warning("Alt text improves accessibility."),
        }),
      ],
    }),

    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H1", value: "h1" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Underline", value: "underline" },
              { title: "Strikethrough", value: "strike-through" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    type: "url",
                    title: "URL",
                    validation: (rule) =>
                      rule.uri({
                        allowRelative: true,
                        scheme: ["http", "https", "mailto"],
                      }),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "caption",
              type: "string",
              title: "Caption",
            }),
            defineField({
              name: "credit",
              type: "string",
              title: "Credit",
            }),
            defineField({
              name: "alt",
              type: "string",
              title: "Alt Text",
            }),
          ],
        }),
      ],
      validation: (rule) => rule.required(),
    }),

    // --- Print Settings ---
    // This is the key addition for the print pipeline.
    // Graft this onto any existing article schema.

    defineField({
      name: "printSettings",
      title: "Print Settings",
      type: "object",
      group: "print",
      fields: [
        defineField({
          name: "printReady",
          title: "Ready for Print",
          type: "boolean",
          description:
            "Mark as ready for print export. Publishing with this checked triggers automatic XML generation.",
          initialValue: false,
        }),
        defineField({
          name: "printHeadline",
          title: "Print Headline",
          type: "string",
          description:
            "Override headline for print (optional — falls back to main title).",
        }),
        defineField({
          name: "printSection",
          title: "Print Section",
          type: "string",
          options: {
            list: [
              { title: "Front Page", value: "front" },
              { title: "Local News", value: "local" },
              { title: "Business", value: "business" },
              { title: "Sports", value: "sports" },
              { title: "Opinion", value: "opinion" },
              { title: "Lifestyle", value: "lifestyle" },
              { title: "Classifieds", value: "classifieds" },
            ],
          },
        }),
        defineField({
          name: "printPriority",
          title: "Print Priority",
          type: "number",
          description: "Order within section (1 = lead story).",
          validation: (rule) => rule.min(1).max(99),
        }),
        defineField({
          name: "printSummary",
          title: "Print Summary / Deck",
          type: "text",
          rows: 2,
          description: "Short summary for print layout (deck/subhead).",
        }),
        defineField({
          name: "lastExport",
          title: "Last Print Export",
          type: "object",
          // readOnly: true,
          description:
            "Automatically populated when the print export function runs.",
          fields: [
            defineField({
              name: "exportedAt",
              title: "Exported At",
              type: "datetime",
            }),
            defineField({
              name: "xmlAsset",
              title: "XML File",
              type: "file",
              description: "The generated InDesign XML — click to download.",
            }),
          ],
        }),
      ],
    }),

    // --- Metadata ---

    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      group: "meta",
    }),

    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "meta",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "category" }],
        }),
      ],
    }),
  ],

  preview: {
    select: {
      title: "title",
      author: "author.name",
      printReady: "printSettings.printReady",
      section: "printSettings.printSection",
      media: "mainImage",
    },
    prepare({ title, author, printReady, section, media }) {
      const subtitle = [
        author && `by ${author}`,
        printReady && `🖨️ ${section ?? "print ready"}`,
      ]
        .filter(Boolean)
        .join(" · ");
      return { title, subtitle, media };
    },
  },
});

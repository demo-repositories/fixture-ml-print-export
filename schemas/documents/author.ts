/**
 * Author schema — referenced by articles for byline.
 */

import { defineType, defineField } from 'sanity';

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  icon: () => '✍️',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title / Role',
      type: 'string',
      description: 'e.g. "Senior Reporter", "Editor-in-Chief"',
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'title',
      media: 'image',
    },
  },
});

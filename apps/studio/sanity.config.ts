import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { article } from './schemas/documents/article';
import { author } from './schemas/documents/author';
import { category } from './schemas/documents/category';

export default defineConfig({
  name: 'print-export-poc',
  title: 'Print Export PoC',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || '3ehlmxn3',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool()],
  mediaLibrary: {enabled: true},

  schema: {
    types: [article, author, category],
  },

  auth: {
    providers: (prev) => [
      ...prev,
      {
        name: 'saml',
        title: 'Sanity SSO',
        url: 'https://api.sanity.io/v2021-10-01/auth/saml/login/a9fd8216',
      },
    ],
  },
});

/**
 * Sanity Blueprint configuration.
 *
 * Defines the print-export function trigger:
 * - Fires on article publish
 * - Only when printSettings.printReady == true
 * - Projects minimal data for the event payload (full fetch happens in the handler)
 *
 * Deploy with: `sanity blueprints deploy`
 */

import { defineBlueprint, defineDocumentFunction } from '@sanity/blueprints';

export default defineBlueprint({
  blueprintVersion: '2024-10-01',
  resources: [
    defineDocumentFunction({
      name: 'print-export',

      event: {
        on: ['create', 'update'],
        filter:
          '_type == "article" && printSettings.printReady == true && !defined(printSettings.lastExport.xmlAsset)',
        projection: '{_id, title, "section": printSettings.printSection}',

        resource: {
          type: 'dataset',
          id: `${process.env.SANITY_STUDIO_PROJECT_ID}.${process.env.SANITY_STUDIO_DATASET ?? 'production'}`,
        },
      },

      project: process.env.SANITY_STUDIO_PROJECT_ID,
    }),
  ],
});

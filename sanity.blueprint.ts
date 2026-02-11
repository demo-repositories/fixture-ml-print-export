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
  resources: [
    defineDocumentFunction({
      name: 'print-export',
      event: {
        on: ['publish'],
        filter: '_type == "article" && printSettings.printReady == true',
        projection: '{_id, title, "section": printSettings.printSection}',
      },
    }),
  ],
});

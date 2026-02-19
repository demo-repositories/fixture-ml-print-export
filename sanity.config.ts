import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { article } from "./schemas/documents/article";
import { author } from "./schemas/documents/author";
import { category } from "./schemas/documents/category";

export default defineConfig({
  name: "print-export-poc",
  title: "Print Export PoC",

  projectId: "3ehlmxn3",
  dataset: "production",

  plugins: [structureTool()],

  schema: {
    types: [article, author, category],
  },
});

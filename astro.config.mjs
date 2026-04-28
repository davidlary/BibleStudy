// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// Astro 5 — content-collections backed static site.
// See ../BibleStudyTool/docs/STATIC_SITE_ARCHITECTURE.md §6 for design.
export default defineConfig({
    site: "https://davidlary.github.io",
    base: "/BibleStudy",
    trailingSlash: "always",
    integrations: [mdx()],
    output: "static",
    build: {
        // Inline asset threshold — keep small CSS in HTML, hash larger files.
        inlineStylesheets: "auto",
    },
});

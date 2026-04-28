# BibleStudy

> A custom-translated, statically-generated study Bible.
> Chapter pages with inline-expandable verse-level Detail panels —
> interlinear, exegesis, cross-references, chronology, maps, slides, song.
> Built from [BibleStudyTool](https://github.com/davidlary/BibleStudyTool)'s
> emitter; deployed to GitHub Pages + Cloudflare Pages.

| | |
|---|---|
| GitHub Pages | https://davidlary.github.io/BibleStudy/ |
| Cloudflare Pages | https://biblestudy.pages.dev/ |

## Architecture (briefly)

This is **Tier 3** of a three-tier system:

```
Tier 1: Biblical Tools Framework  (sibling project; data layer)
                ↓ pip dep + DuckDB ATTACH
Tier 2: BibleStudyTool  (interactive tool + emitter)
                ↓ emit MDX
Tier 3: BibleStudy  (this repo — static site)
```

See [BibleStudyTool/docs/STATIC_SITE_ARCHITECTURE.md](https://github.com/davidlary/BibleStudyTool/blob/main/docs/STATIC_SITE_ARCHITECTURE.md)
for the full design.

## Stack

- **[Astro 5](https://astro.build)** with content collections + MDX.
- **EB Garamond** body type, **Inter** chrome.
- **[Pagefind](https://pagefind.app)** client-side search.
- **[MapLibre GL](https://maplibre.org)** maps with self-hosted PMTiles.
- **[vis-timeline](https://visjs.github.io/vis-timeline/)** chronology.
- Dual-deploy via GitHub Actions: GitHub Pages + Cloudflare Pages.

## Local dev

```bash
npm install
npm run dev          # local Astro dev server
npm run build        # build dist/ + Pagefind index
npm run preview      # preview the built dist/
```

## Status

Initial Phase C scaffold — chapter route serves a placeholder Genesis 1
with KJV text. Detail panels land in Phase D as the BibleStudyTool
emitter wires them. Deploy pipeline is alive on day 1 so any future
content change gets pushed to both targets automatically.

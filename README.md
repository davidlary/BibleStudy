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
- Custom autoscaled chronology timeline (CSS-only, no JS lib) — window
  adapts per verse to the finest event precision: year ⇒ ≥±10y,
  month ⇒ ≥±1y, day ⇒ ≥±a few days.
- Dual-deploy via GitHub Actions: GitHub Pages + Cloudflare Pages.

## Layout

Reading column is `--col: 720px` (~62ch in EB Garamond 19/1.75 — Bringhurst
sweet spot). When a verse's Detail panel is opened on screens ≥ 1100px,
the panel breaks out of the reading column to fill `--col-wide: 1100px`
so interlinear tables and exegesis sub-tabs use the available horizontal
space rather than crowding into the reading width. Page-level container
caps at `--col-page: 1400px` so the layout doesn't sprawl on 4K monitors.

## Live data sources

| Panel | Source | Status |
|---|---|---|
| Translations | KJV, ASV, BSB, Darby, YLT, Webster, Weymouth, CPDV (8 PD) | live |
| Interlinear  | OSHB (Hebrew OT) + MorphGNT/SBLGNT (Greek NT) | live |
| Cross-refs   | OpenBible TSK (~607K rows) | live |
| Places       | OpenBible Bible-Geocoding-Data (1,341 places, per-verse OSIS refs) | live |
| Chronology   | Ussher 1658 (year-precision OT, day-precision Crucifixion + Pentecost) | live |
| Exegesis     | BibleStudyTool runs (per-phase A-G + Memory Anchor + Devotional + Quiz) | live where generated |
| Slides       | BibleStudyTool 4K decks | live where generated |
| Song         | BibleStudyTool song module | live where generated |

## Local dev

```bash
npm install
npm run dev          # local Astro dev server
npm run build        # build dist/ + Pagefind index
npm run preview      # preview the built dist/
```

## Refreshing content

Content is emitted from BibleStudyTool. After running ingest /
generating exegesis there, refresh this repo with:

```bash
# In the BibleStudyTool checkout:
bst emit-static --book Acts --chapter 14 --include-exegesis \
                --codes asv,bsb,kjv,darby,ylt,webster,weymouth,cpdv
bst publish push     # commits + pushes here
```

## Status

Live: Genesis 1 + Acts 14 with full panels (translations, interlinear,
cross-refs, places, chronology, exegesis). The pipeline supports the
whole 66-book canon — chapters fill in as their exegesis runs land.

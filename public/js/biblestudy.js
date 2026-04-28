/* BibleStudy client-side bundle.
 *
 * Phases D2 + D3 + D4 + D5 + D6 + D7 + D8 + D9.
 *
 * Self-contained vanilla JS — no framework, no bundler. Loaded once
 * per chapter page; idempotent (handlers attach via delegation so a
 * second load is a no-op).
 *
 * Provides:
 *   - Verse-number click → toggles inline panel (D2)
 *   - Tab switching inside a panel (D2)
 *   - Lazy hydration of Maps (D4), Chronology (D5), Slides (D6), Song (D7)
 *   - Compare drawer keyboard shortcut `c` (D3)
 *   - Translation toggle 1/2/3 (D3)
 *   - Settings persistence via localStorage (D8)
 *   - Cmd+K palette (D9)
 *
 * Hard-fail discipline: every dynamic load surfaces errors via a
 * banner element appended at the top of the affected panel — never
 * silent.
 */
(function () {
    "use strict";

    if (window.__biblestudy_loaded) return;
    window.__biblestudy_loaded = true;

    const SETTINGS_KEY = "biblestudy.settings.v1";

    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        } catch {
            return {};
        }
    }
    function saveSettings(s) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        } catch (e) {
            console.error("[biblestudy] failed to persist settings:", e);
        }
    }
    window.bsSettings = { load: loadSettings, save: saveSettings };

    // -----------------------------------------------------------------
    // Theme — apply saved theme on load
    // -----------------------------------------------------------------
    (function applyTheme() {
        const s = loadSettings();
        if (s.theme && s.theme !== "auto") {
            document.documentElement.dataset.theme = s.theme;
        }
    })();

    // -----------------------------------------------------------------
    // D2: verse-number click → toggle panel
    // -----------------------------------------------------------------
    document.addEventListener("click", (e) => {
        const num = e.target.closest(".verse-num");
        if (!num) return;
        const verse = num.closest(".verse");
        if (!verse) return;
        e.preventDefault();
        const expanded = verse.dataset.expanded === "true";
        verse.dataset.expanded = expanded ? "false" : "true";
    });

    // -----------------------------------------------------------------
    // G2: Exegesis sub-tab switching (per-phase)
    // -----------------------------------------------------------------
    document.addEventListener("click", (e) => {
        const sub = e.target.closest(".vp-subtab");
        if (!sub) return;
        const tabs = sub.closest(".vp-exegesis-tabs");
        if (!tabs) return;
        const which = sub.dataset.subtab;
        tabs.querySelectorAll(".vp-subtab").forEach((b) => {
            const active = b === sub;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-selected", String(active));
        });
        tabs.querySelectorAll(".vp-subpane").forEach((p) => {
            const show = p.dataset.subpane === which;
            p.toggleAttribute("hidden", !show);
            p.classList.toggle("is-active", show);
        });
    });

    // G3: audit-metadata visibility — three input sources, OR-ed:
    //   - URL `?audit=1` (per-visit power-user override)
    //   - Settings { audit_default_open: true } (persistent)
    //   - explicit user-click on the <details> element (default closed)
    function _shouldOpenAudit() {
        if (new URLSearchParams(location.search).get("audit")) return true;
        const s = loadSettings();
        return !!s.audit_default_open;
    }
    function _applyAuditPolicy(root) {
        if (!_shouldOpenAudit()) return;
        root.querySelectorAll(".vp-audit-toggle").forEach((d) => { d.open = true; });
    }
    _applyAuditPolicy(document);

    // G3: open the user's preferred default exegesis sub-tab when
    // a verse panel switches to the Exegesis pane for the first time.
    function _applyDefaultPhase(panel) {
        const s = loadSettings();
        const want = s.phase || "phase_a_text";
        const tabs = panel.querySelector(".vp-exegesis-tabs");
        if (!tabs) return;
        const target = tabs.querySelector(`.vp-subtab[data-subtab="${want}"]`);
        if (!target || target.classList.contains("is-active")) return;
        target.click();
    }

    // -----------------------------------------------------------------
    // D2/D3-D7: tab switching + lazy hydration
    // -----------------------------------------------------------------
    document.addEventListener("click", (e) => {
        const tab = e.target.closest(".vp-tab");
        if (!tab) return;
        const panel = tab.closest(".verse-panel");
        if (!panel) return;
        const which = tab.dataset.tab;
        panel.querySelectorAll(".vp-tab").forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
        });
        panel.querySelectorAll(".vp-section").forEach((s) => {
            const show = s.dataset.pane === which;
            s.toggleAttribute("hidden", !show);
            s.classList.toggle("is-active", show);
            if (show && s.dataset.hydrated !== "true" && tab.dataset.lazy === "true") {
                hydratePane(s, which);
                s.dataset.hydrated = "true";
            }
        });
        // Phase G3: when the Exegesis pane first opens, jump to the
        // user's preferred phase sub-tab.
        if (which === "exegesis") {
            _applyDefaultPhase(panel);
            _applyAuditPolicy(panel);
        }
    });

    async function hydratePane(section, paneName) {
        try {
            if (paneName === "places") return await hydrateMap(section);
            if (paneName === "chronology") return await hydrateTimeline(section);
            if (paneName === "slides") return; // already lazy-loaded via <img loading="lazy">
            if (paneName === "song") return;
        } catch (err) {
            console.error("[biblestudy] lazy hydration failed:", err);
            const banner = document.createElement("div");
            banner.className = "vp-banner vp-banner-red";
            banner.textContent = `Failed to load ${paneName}: ${err.message}`;
            section.prepend(banner);
        }
    }

    // -----------------------------------------------------------------
    // D4: lazy MapLibre
    // -----------------------------------------------------------------
    let _maplibreP = null;
    async function loadMapLibre() {
        if (_maplibreP) return _maplibreP;
        _maplibreP = new Promise((resolve, reject) => {
            // CSS
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
            document.head.appendChild(css);
            // JS
            const s = document.createElement("script");
            s.src = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
            s.onload = () => resolve(window.maplibregl);
            s.onerror = () => reject(new Error("MapLibre GL failed to load (check connectivity / CSP)."));
            document.head.appendChild(s);
        });
        return _maplibreP;
    }

    async function hydrateMap(section) {
        const mapEl = section.querySelector(".vp-map");
        if (!mapEl) return;
        const places = JSON.parse(mapEl.dataset.places || "[]");
        if (places.length === 0) return;
        const maplibregl = await loadMapLibre();
        // Center on the centroid of all places.
        const lats = places.map((p) => p.latitude).filter((x) => x != null);
        const lons = places.map((p) => p.longitude).filter((x) => x != null);
        const centerLat = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 31.78;
        const centerLon = lons.length ? lons.reduce((a, b) => a + b, 0) / lons.length : 35.23;
        const map = new maplibregl.Map({
            container: mapEl,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: "raster",
                        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                        tileSize: 256,
                        attribution: "© OpenStreetMap contributors",
                    },
                },
                layers: [
                    { id: "osm", type: "raster", source: "osm" },
                ],
            },
            center: [centerLon, centerLat],
            zoom: 5,
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        for (const p of places) {
            if (p.latitude == null || p.longitude == null) continue;
            const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
                `<strong>${p.primary_name}</strong>` +
                (p.modern_name ? `<br/><em>modern: ${p.modern_name}</em>` : "") +
                (p.alt_names && p.alt_names.length
                    ? `<br/>also: ${p.alt_names.join(", ")}`
                    : "")
            );
            new maplibregl.Marker({ color: "#8b6f3f" })
                .setLngLat([p.longitude, p.latitude])
                .setPopup(popup)
                .addTo(map);
        }
    }

    // -----------------------------------------------------------------
    // D5: lazy vis-timeline
    // -----------------------------------------------------------------
    let _visP = null;
    async function loadVis() {
        if (_visP) return _visP;
        _visP = new Promise((resolve, reject) => {
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = "https://unpkg.com/vis-timeline@7.7.3/styles/vis-timeline-graph2d.min.css";
            document.head.appendChild(css);
            const s = document.createElement("script");
            s.src = "https://unpkg.com/vis-timeline@7.7.3/standalone/umd/vis-timeline-graph2d.min.js";
            s.onload = () => resolve(window.vis);
            s.onerror = () => reject(new Error("vis-timeline failed to load."));
            document.head.appendChild(s);
        });
        return _visP;
    }

    async function hydrateTimeline(section) {
        const tEl = section.querySelector(".vp-timeline");
        if (!tEl) return;
        const events = JSON.parse(tEl.dataset.events || "[]");
        if (events.length === 0) return;
        const vis = await loadVis();
        // vis-timeline can't render BC dates < year 0; use AM (Anno
        // Mundi) offset internally then label with BC/AD.
        const items = events.map((e, i) => ({
            id: i,
            content: e.event,
            start: bcAdToIso(e.bc_ad_year),
            className: `era-${e.era}`,
        })).filter((x) => x.start != null);
        if (items.length === 0) return;
        // Replace existing list with the timeline; keep list as fallback.
        const container = document.createElement("div");
        container.className = "vp-vis-timeline";
        container.style.height = "180px";
        tEl.prepend(container);
        new vis.Timeline(container, new vis.DataSet(items), {
            zoomMin: 1000 * 60 * 60 * 24 * 365,
        });
    }

    function bcAdToIso(year) {
        if (year == null) return null;
        // vis-timeline supports negative years for BC.
        const y = String(Math.abs(year)).padStart(4, "0");
        return year < 0 ? `-${y}-01-01` : `${y}-01-01`;
    }

    // -----------------------------------------------------------------
    // D7: copy lyrics to clipboard
    // -----------------------------------------------------------------
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".vp-suno-copy");
        if (!btn) return;
        const lyrics = btn.parentElement.querySelector(".vp-lyrics");
        if (!lyrics) return;
        try {
            await navigator.clipboard.writeText(lyrics.textContent);
            const orig = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => (btn.textContent = orig), 1500);
        } catch (err) {
            alert("Could not copy lyrics: " + err.message);
        }
    });

    // -----------------------------------------------------------------
    // D3: compare drawer
    // -----------------------------------------------------------------
    let drawerEl = null;
    function ensureDrawer() {
        if (drawerEl) return drawerEl;
        drawerEl = document.createElement("aside");
        drawerEl.className = "compare-drawer";
        drawerEl.innerHTML =
            '<button class="compare-close" aria-label="Close">×</button>' +
            '<div class="compare-body"></div>';
        drawerEl.querySelector(".compare-close").addEventListener("click", () => {
            drawerEl.classList.remove("is-open");
        });
        document.body.appendChild(drawerEl);
        return drawerEl;
    }
    function openCompareForVerse(verseEl) {
        const verseId = verseEl.dataset.verseId;
        if (!verseId) return;
        const panel = verseEl.parentElement.querySelector(
            `.verse-panel[data-verse-id="${verseId}"]`
        );
        if (!panel) return;
        const trans = panel.querySelector('.vp-section[data-pane="translations"]');
        if (!trans) return;
        const drawer = ensureDrawer();
        drawer.querySelector(".compare-body").innerHTML =
            `<h3>${verseId}</h3>` + trans.innerHTML;
        drawer.classList.add("is-open");
    }

    document.addEventListener("keydown", (e) => {
        // Cmd+K palette
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            togglePalette();
            return;
        }
        // Ignore modifiers for the rest
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        // Don't hijack typing in inputs
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
            return;
        }
        // Compare drawer for the verse the user is hovered on; or
        // the first expanded verse if none is hovered.
        if (e.key === "c") {
            const expanded = document.querySelector('.verse[data-expanded="true"]');
            if (expanded) openCompareForVerse(expanded);
            return;
        }
        // Translation toggle 1/2/3 swaps the displayed translation
        // across all rendered verses (uses primaryCodes attached at
        // chapter-render time as a global by the emitter).
        if (e.key === "1" || e.key === "2" || e.key === "3") {
            const idx = parseInt(e.key, 10) - 1;
            const codes = window.__bs_primaryCodes || [];
            if (idx < codes.length) swapPrimary(codes[idx]);
        }
    });

    function swapPrimary(code) {
        document.querySelectorAll(".verse[data-translations]").forEach((v) => {
            try {
                const map = JSON.parse(v.dataset.translations);
                if (map[code]) v.dataset.primaryCode = code;
                const txt = v.querySelector(".verse-text");
                if (txt && map[code]) txt.textContent = map[code];
            } catch {}
        });
        const note = document.querySelector(".provenance-active");
        if (note) note.textContent = `Showing: ${code.toUpperCase()}`;
    }

    // -----------------------------------------------------------------
    // D9: Cmd+K palette
    // -----------------------------------------------------------------
    let paletteEl = null;
    let recentPassages = JSON.parse(localStorage.getItem("biblestudy.recent") || "[]");

    function ensurePalette() {
        if (paletteEl) return paletteEl;
        paletteEl = document.createElement("div");
        paletteEl.className = "cmdk-overlay";
        paletteEl.innerHTML = `
            <div class="cmdk-box" role="dialog" aria-label="Jump to passage">
              <input class="cmdk-input" type="text" placeholder="Type a passage (e.g. john 3.16, gen 1, romans 8) — ESC to close" autofocus>
              <ul class="cmdk-results"></ul>
            </div>`;
        document.body.appendChild(paletteEl);

        const input = paletteEl.querySelector(".cmdk-input");
        const results = paletteEl.querySelector(".cmdk-results");

        input.addEventListener("input", () => updatePaletteResults(input.value, results));
        input.addEventListener("keydown", (e) => {
            const items = results.querySelectorAll(".cmdk-result");
            const cur = results.querySelector(".cmdk-result.is-active");
            if (e.key === "Escape") togglePalette();
            else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!cur && items.length) items[0].classList.add("is-active");
                else if (cur && cur.nextElementSibling) {
                    cur.classList.remove("is-active");
                    cur.nextElementSibling.classList.add("is-active");
                }
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (cur && cur.previousElementSibling) {
                    cur.classList.remove("is-active");
                    cur.previousElementSibling.classList.add("is-active");
                }
            } else if (e.key === "Enter") {
                e.preventDefault();
                const target = (cur || items[0]);
                if (target) navigatePalette(target.dataset.href);
            }
        });

        paletteEl.addEventListener("click", (e) => {
            if (e.target === paletteEl) togglePalette();
            const r = e.target.closest(".cmdk-result");
            if (r) navigatePalette(r.dataset.href);
        });

        return paletteEl;
    }

    function togglePalette() {
        const el = ensurePalette();
        const open = el.classList.toggle("is-open");
        if (open) {
            const inp = el.querySelector(".cmdk-input");
            inp.value = "";
            inp.focus();
            updatePaletteResults("", el.querySelector(".cmdk-results"));
        }
    }

    // Lightweight book-name → slug map matching emitter's _BOOK_SLUGS.
    const BOOK_SLUGS = {
        gen: "genesis", genesis: "genesis", exo: "exodus", exod: "exodus", exodus: "exodus",
        lev: "leviticus", num: "numbers", deut: "deuteronomy", josh: "joshua", judg: "judges",
        ruth: "ruth", "1sam": "1-samuel", "2sam": "2-samuel", "1kgs": "1-kings", "2kgs": "2-kings",
        "1chr": "1-chronicles", "2chr": "2-chronicles", ezra: "ezra", neh: "nehemiah", esth: "esther",
        job: "job", ps: "psalms", psalm: "psalms", psalms: "psalms", prov: "proverbs",
        eccl: "ecclesiastes", song: "song-of-solomon", isa: "isaiah", jer: "jeremiah",
        lam: "lamentations", ezek: "ezekiel", dan: "daniel", hos: "hosea", joel: "joel",
        amos: "amos", obad: "obadiah", jonah: "jonah", mic: "micah", nah: "nahum",
        hab: "habakkuk", zeph: "zephaniah", hag: "haggai", zech: "zechariah", mal: "malachi",
        matt: "matthew", mt: "matthew", mark: "mark", mk: "mark", luke: "luke", lk: "luke",
        john: "john", jn: "john", acts: "acts", rom: "romans", "1cor": "1-corinthians",
        "2cor": "2-corinthians", gal: "galatians", eph: "ephesians", phil: "philippians",
        col: "colossians", "1thess": "1-thessalonians", "2thess": "2-thessalonians",
        "1tim": "1-timothy", "2tim": "2-timothy", titus: "titus", phlm: "philemon",
        heb: "hebrews", jas: "james", "1pet": "1-peter", "2pet": "2-peter",
        "1john": "1-john", "1jn": "1-john", "2john": "2-john", "2jn": "2-john",
        "3john": "3-john", "3jn": "3-john", jude: "jude", rev: "revelation",
    };

    function parseQuery(q) {
        if (!q.trim()) return null;
        const m = q.toLowerCase().match(/^([1-3]?\s*[a-z]+)\s*\.?\s*(\d+)?(?:[:.](\d+))?/);
        if (!m) return null;
        const bookKey = m[1].replace(/\s+/g, "");
        const slug = BOOK_SLUGS[bookKey];
        if (!slug) return null;
        const chap = m[2] ? parseInt(m[2], 10) : 1;
        const verse = m[3] ? parseInt(m[3], 10) : null;
        const base = (window.__BS_BASE || "/BibleStudy") + "/";
        return {
            label: `${slug.replace(/-/g, " ")} ${chap}${verse ? `:${verse}` : ""}`,
            href: `${base}${slug}/${chap}/${verse ? `#v${verse}` : ""}`,
        };
    }

    function updatePaletteResults(q, listEl) {
        listEl.innerHTML = "";
        const parsed = parseQuery(q);
        if (parsed) {
            const li = document.createElement("li");
            li.className = "cmdk-result is-active";
            li.dataset.href = parsed.href;
            li.innerHTML = `<span>Go to <strong>${parsed.label}</strong></span><span class="cmdk-result-hint">${parsed.href}</span>`;
            listEl.appendChild(li);
        }
        // Recent passages (max 5)
        const recents = JSON.parse(localStorage.getItem("biblestudy.recent") || "[]");
        for (const r of recents.slice(0, 5)) {
            const li = document.createElement("li");
            li.className = "cmdk-result";
            li.dataset.href = r.href;
            li.innerHTML = `<span>${r.label}</span><span class="cmdk-result-hint">recent</span>`;
            listEl.appendChild(li);
        }
        if (!q.trim() && listEl.children.length === 0) {
            listEl.innerHTML = '<li class="cmdk-result"><em>Type a passage to navigate</em></li>';
        }
    }

    function navigatePalette(href) {
        if (!href) return;
        // Save to recents.
        try {
            const recents = JSON.parse(localStorage.getItem("biblestudy.recent") || "[]");
            const filtered = recents.filter((r) => r.href !== href);
            filtered.unshift({ href, label: href });
            localStorage.setItem("biblestudy.recent", JSON.stringify(filtered.slice(0, 10)));
        } catch {}
        window.location.href = href;
    }
})();

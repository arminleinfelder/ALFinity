# Implementation Plan: Home Page with Menu and Info Pages (Milestone 1.2)

**Branch**: `002-home-and-info-pages` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-home-and-info-pages/spec.md`

## Summary

ALFinity gets a home page at the app's main address with a full-screen fractal
background and a menu (*Introduction*, *Explorer*, *Credits*, *About me*). The current
app moves unchanged to `explorer.html`; its "ALFinity" label becomes the link back home.
Old share links that open the main address are forwarded to the explorer before the
home page draws. The three info pages are static HTML sharing the app's theme, work
offline through the existing service worker, and the README invites visitors to the
hosted app. Version 1.2.0.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules), as in 001

**Primary Dependencies**: None (Constitution I)

**Storage**: None new; the explorer's localStorage/IndexedDB data is untouched

**Testing**: `node --test` logic tests (unchanged); browser tests with
`tests/browser/run.mjs` (Chrome via DevTools protocol, no packages): new `pages` suite,
extended `offline` suite; manual checks per [quickstart.md](quickstart.md)

**Target Platform**: current Safari on iOS/iPadOS, Safari and Chrome on macOS; GitHub
Pages (static hosting, HTTPS)

**Project Type**: static web app (multi-page site + existing single-page explorer)

**Performance Goals**: home menu usable within 1 s on a current iPhone before the
background has loaded (SC-002); explorer performance unchanged

**Constraints**: offline-capable; no external requests; no build step; old share links
and home-screen shortcuts keep working; readable from 320 px phones to 4K

**Scale/Scope**: 4 new HTML pages, 1 moved page, 1 new CSS file, 1 new small JS module,
5 images; small edits to toolbar, service worker, manifest (none expected), workflow,
README, version, tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Plain Web Stack | Plain HTML/CSS/JS; formulas in HTML, no math library (R7); no new tools | PASS |
| II. Responsive on Every Screen | Pages tested on desktop, 4K, iPad, iPhone portrait/landscape (R10); reading width limited; 4K scaling inherited from `app.css`; touch targets ≥ 44 pt; background 3840 px for sharpness (R4) | PASS |
| III. Approachable for Non-Mathematicians | Introduction in plain language, math in optional boxes (R7), pictures and live examples (R8, R9); explorer unchanged | PASS |
| IV. Performance-Conscious Rendering | No rendering changes; info pages do not start WebGL or workers (R1); background loads without blocking the menu (R4) | PASS |
| V. Explore and Keep | Share links forwarded (R2), stored data untouched, favorites unaffected | PASS |
| VI. Simplicity (YAGNI) | Static pages, no router; one inline forwarding script; one small module for SW + version (R6). Extra files justified below | PASS |
| Technical Constraints | Static files only; offline via existing SW (R6); nothing leaves the device (FR-018) | PASS |
| Development Workflow | Spec Kit flow followed; phone/tablet/desktop checks in quickstart | PASS |

**Post-design re-check (after Phase 1)**: unchanged, all PASS. The design adds files but
no abstractions; see Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-home-and-info-pages/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R10
├── data-model.md        # Phase 1: pages, background, example links, profile
├── quickstart.md        # Phase 1: validation guide
├── contracts/
│   └── pages.md         # Page addresses and forwarding rules
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
index.html              # NEW CONTENT: home page (old content moves to explorer.html);
                        #   inline script forwards #s=… to explorer.html (R2)
explorer.html           # MOVED from index.html, unchanged except the title/brand link
introduction.html       # NEW: fractals, Mandelbrot, Julia, colors, examples (FR-009–012)
credits.html            # NEW: mathematicians, tools, sources (FR-013)
about-me.html           # NEW: profile with marked placeholders (FR-014)
css/
├── app.css             # explorer + theme; brand link styles on narrow screens (R3)
└── pages.css           # NEW: home + info page layout (R5)
js/
├── site.js             # NEW: service worker registration + version for info pages (R6)
├── ui/toolbar.js       # brand becomes "‹ ALFinity" link to ./ (R3)
├── version.js          # 1.2.0
└── …                   # explorer modules unchanged
images/                 # NEW, deployed
├── background.png      # owner's original background (3840 × 2160, not deployed)
├── background.jpg      # web copy shown on the home page, replaceable (R4)
├── banner.jpg, …       # README pictures (folder renamed from docs/)
└── intro-*.jpg         # 4 introduction pictures (R9)
sw.js                   # new files listed, CACHE = alfinity-v4 (R6)
manifest.webmanifest    # unchanged: start_url "./" now opens home (FR-005)
.github/workflows/pages.yml   # also copies *.html and images/
README.md               # "Try ALFinity" link below the banner (FR-020); docs updated
tests/browser/
├── lib/page.mjs        # default path explorer.html?nosw (R10)
├── run.mjs             # registers the pages suite
└── suites/
    ├── pages.mjs       # NEW: navigation, forwarding, layout on all devices, examples
    └── offline.mjs     # also opens home + info pages offline
```

**Structure Decision**: Keep the existing flat static layout (one folder, no build). The
explorer keeps its own HTML and modules; the new pages are siblings at the root so
relative links and the service-worker scope stay simple. Images for pages live in a new
`images/` folder (renamed from `docs/`, which held the README pictures); only its
JPEG files are deployed.

## Implementation Notes

- **Order**: (1) move `index.html` → `explorer.html` and point tests at it (explorer
  tests must stay green); (2) home page with forwarding; (3) brand link; (4) info pages;
  (5) images; (6) offline + deploy; (7) README + version.
- **Introduction content outline**: What is a fractal (self-similarity, coastline,
  fern) · The Mandelbrot set (start at 0, square and add c, stays small → black; with
  "math (optional)" box z₀ = 0, zₙ₊₁ = zₙ² + c, |z| > 2 escapes) · Julia sets (c fixed,
  start point varies; c inside the Mandelbrot set → connected shape, outside → dust;
  ALFinity's Julia map) · What the colors mean (how many steps until a point runs
  away; smooth vs. banded; palettes are a choice, not math) · Read more (Wikipedia:
  Fractal, Mandelbrot set, Julia set).
- **Credits outline**: Mathematicians — Gaston Julia and Pierre Fatou (iteration of
  complex functions, 1917–1920), Benoît Mandelbrot (fractal geometry, first computer
  pictures 1980), Adrien Douady and John H. Hubbard (named and proved key properties of
  the Mandelbrot set) · Tools — GitHub Spec Kit, Claude Code with Claude by Anthropic,
  GitHub Pages · Sources — the Wikipedia articles used for the texts.
- **Texts are drafts** for the owner's review before the release (spec Assumptions).
- **Owner input still needed**: background picture (placeholder until then) and the
  About me text/photo/links.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| 4 more HTML files | Each page needs its own address and title (FR-019), Back button, no router | A JS router conflicts with `#s=` share links and starts the explorer for every page (R1) |
| `css/pages.css` | Info pages scroll and need reading layout; explorer must stay untouched | Adding page rules to `app.css` mixes a fixed full-screen app with scrolling pages |
| `js/site.js` (~20 lines) | Offline copy must be installed from any page (R6) | Inline script on every page duplicates the registration rules four times |

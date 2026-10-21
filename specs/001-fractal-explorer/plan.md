# Implementation Plan: ALFinity Fractal Explorer

**Branch**: `001-fractal-explorer` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-fractal-explorer/spec.md`

## Summary

ALFinity is a static, single-page web app for exploring the Mandelbrot and Julia sets on
iPhone, iPad and desktop up to 4K. Pictures are calculated by a **hybrid renderer**: a
WebGL2 GPU engine for near-instant shallow zoom, and a Web Worker CPU engine with 64-bit
precision for deep zoom (owner decision, [research.md](research.md) R1). Both engines
produce the same per-pixel "smooth iteration value", and a single shared coloring shader
turns it into colors, so pictures look identical and recoloring never recomputes the
shape. Favorites, custom palettes and the last view are stored in localStorage, with
JSON file export/import, share links and PNG image export. Plain HTML, CSS and JavaScript
modules; no libraries, no build step.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules), GLSL ES 3.00 (WebGL2 shaders)

**Primary Dependencies**: None. Browser-native APIs only: Canvas, WebGL2, Web Workers,
Pointer Events, ResizeObserver, localStorage, Service Worker

**Storage**: Browser localStorage (favorites, custom palettes, last setting); JSON files for
export/import

**Testing**: Node built-in test runner (`node --test`) for pure logic modules (dev tool only);
manual validation per [quickstart.md](quickstart.md) on phone, tablet and 4K desktop

**Target Platform**: Current Safari on iOS/iPadOS, current Safari and Chrome on macOS;
WebGL2 required

**Project Type**: Static single-page web application (no backend)

**Performance Goals**: Preview ≤ 0.2 s and full picture ≤ 2 s after zoom/pan (SC-002);
recolor < 0.1 s (SC-003); UI never blocked > 0.1 s (SC-007); 60 fps GPU rendering during
gestures at shallow zoom

**Constraints**: No dependencies without owner approval; no data leaves the device;
offline-capable; zoom up to the 64-bit precision limit (~10¹²–10¹³×); iOS canvas area limit
(~16.7 MP) for image export

**Scale/Scope**: Single user per device; 2 fractal types; ≥ 10 palettes; hundreds of
favorites; one screen with a few panels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Plain Web Stack | No frameworks/libraries; only browser APIs; Node and Python are dev tools only | ✅ Pass |
| II. Responsive | DPR-aware canvas, responsive panels, touch + mouse input (R7, R8) | ✅ Pass |
| III. Approachable | Zero-config first picture, presets, sliders, hidden "Details", undo/reset | ✅ Pass |
| IV. Performance | Hybrid GPU/CPU renderer, progressive preview, cancellation — **approved by owner 2026-10-17** | ✅ Pass |
| V. Explore and Keep | Named favorites, persistence, file export/import, share links | ✅ Pass |
| VI. Simplicity | Two engines add complexity → justified below | ⚠️ Justified |

**Post-design re-check (after Phase 1)**: ✅ All gates still pass. The design adds no
dependencies; the render-engine contract keeps the two engines interchangeable; the only
added complexity is the second engine (see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-fractal-explorer/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R12
├── data-model.md        # Phase 1: entities, storage keys, validation
├── quickstart.md        # Phase 1: run + validation guide
├── contracts/
│   ├── favorites-file.md   # export/import format
│   ├── share-link.md       # URL format
│   └── render-engine.md    # internal contract both engines follow
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
index.html                 # single page: canvas, toolbar, panels
manifest.webmanifest       # "Add to Home Screen"
sw.js                      # service worker: offline cache
icons/                     # app icons

css/
└── app.css                # layout, responsive panels, themes

js/
├── main.js                # startup, wires modules together
├── state.js               # current FractalSetting, undo/redo history
├── defaults.js            # default setting, built-in palettes, Julia presets
├── view.js                # PURE: pixel↔complex mapping, zoom/pan, max-zoom rule
├── fractal.js             # PURE: iteration + smooth value, auto maxIter (used by CPU worker)
├── palette.js             # PURE: palette → 1024-entry color table
├── settings.js            # PURE: validate, clamp, serialize, share-link + file encoding
├── storage.js             # localStorage favorites/palettes/last setting
├── input.js               # pointer, pinch, wheel, double-tap, keyboard
├── export.js              # tiled PNG image export
├── version.js             # app version and release date (shown in About)
├── render/
│   ├── renderer.js        # picks engine, progressive passes, cancellation
│   ├── gpu.js             # WebGL2 engine
│   ├── cpu.js             # worker pool manager
│   ├── worker.js          # CPU worker (imports fractal.js)
│   └── shaders.js         # GLSL sources incl. shared colorize()
└── ui/
    ├── toolbar.js         # zoom buttons, undo/redo, reset, type switch
    ├── colors.js          # palette gallery, sliders, custom palette editor
    ├── favorites.js       # list, save, rename, delete, import/export
    ├── julia.js           # mini-map point picker, presets
    ├── details.js         # optional math parameters
    └── about.js           # About panel: purpose, author, repo link, version (issue #3)

tests/
├── view.test.js
├── fractal.test.js
├── palette.test.js
├── settings.test.js
├── engines.consistency.md # manual GPU/CPU comparison guide
└── browser/               # automated browser tests (added 2026-10-18, research.md R14)
    ├── run.mjs            # runner: own server + temporary headless Chrome
    ├── lib/               # chrome.mjs, server.mjs, page.mjs (DevTools Protocol helpers)
    └── suites/            # load, explore, panels, touch, rendering, offline, perf
```

**Structure Decision**: A single static project at the repository root, served as-is. Pure
modules (marked PURE) have no DOM access so they run both in the browser and in Node tests.
UI code is split per panel to keep each file small and readable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two render engines (GPU + CPU) | Owner chose instant shallow rendering *and* correct deep zoom (R1) | CPU-only is slower (1–3 s on 4K); GPU-only cannot reach the required zoom depth |
| Service worker | Constitution: app SHOULD work offline | Without it the app fails without network (~40 lines of code) |

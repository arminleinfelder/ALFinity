---

description: "Task list for ALFinity Fractal Explorer"
---

# Tasks: ALFinity Fractal Explorer

**Input**: Design documents from `specs/001-fractal-explorer/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included for the PURE modules only (constitution: pure logic SHOULD have
lightweight tests; [research.md](research.md) R11). Tests use Node's built-in runner
(`import { test } from "node:test"; import assert from "node:assert/strict";`) and run with
`node --test "tests/*.test.js"`. UI, input and rendering are verified manually per
[quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested on its own.

**Ground rules for every task** (Constitution Principle I): plain HTML/CSS/JS ES modules,
no libraries, no build step, no npm packages. PURE modules (`js/view.js`, `js/fractal.js`,
`js/palette.js`, `js/settings.js`) MUST NOT touch `window`, `document` or other DOM APIs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)

## Path Conventions

Single static project at the repository root (see [plan.md](plan.md) Project Structure):
`index.html`, `css/`, `js/`, `js/render/`, `js/ui/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton that opens in the browser

- [X] T001 Create the folder layout from plan.md: `css/`, `js/`, `js/render/`, `js/ui/`, `icons/`, `tests/` (add a `.gitkeep` to empty folders)
- [X] T002 Create `index.html`: `<!doctype html>`, `lang="en"`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, title "ALFinity", a full-screen `<canvas id="view">`, an empty `<header id="toolbar">`, an empty `<aside id="panel">`, a `<div id="status" aria-live="polite">`, link to `css/app.css`, and `<script type="module" src="js/main.js">`
- [X] T003 [P] Create `css/app.css` base: CSS custom properties for colors/spacing, dark UI theme, `html, body` full height with no margin and no scroll, canvas `position: fixed; inset: 0; width: 100%; height: 100%; touch-action: none`, safe-area padding via `env(safe-area-inset-*)`, toolbar overlay at the top, `#panel` as bottom sheet below 768px width and as a 360px right side panel at ≥768px, touch targets ≥ 44px
- [X] T004 [P] Create `js/main.js` stub that logs "ALFinity starting" and checks for WebGL2 support (`canvas.getContext("webgl2")`); if missing, show the message "This browser is not supported. Please use a current Safari or Chrome." in `#status`
- [X] T005 [P] Create `README.md` at repo root with: what ALFinity is, how to run (`python3 -m http.server 8000`, open http://localhost:8000), how to test on iPhone/iPad (`ipconfig getifaddr en0`), and how to run tests (`node --test "tests/*.test.js"`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure math, coloring core and both render engines — every story needs a picture

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Implement `js/defaults.js`: export `DEFAULT_SETTING` = `{ schemaVersion: 1, type: "mandelbrot", julia: { re: -0.8, im: 0.156 }, view: { cx: -0.6, cy: 0, width: 3.2 }, detail: 1, maxIter: null, color: { paletteId: "ocean", shift: 0, density: 2, smooth: true, inside: "#000000" } }`, plus `BUILTIN_PALETTES` containing at least the "ocean" palette (`{ id, name, stops: [hex…], builtIn: true }`); more palettes are added in US2
- [X] T007 [P] Implement PURE `js/view.js` per [contracts/render-engine.md](contracts/render-engine.md): `pixelScale(view, W, H)` (`s = view.width / min(W, H)`), `pixelToComplex(view, W, H, px, py)` (pixel centers at +0.5, y axis up), `complexToPixel(...)`, `zoomAt(view, W, H, px, py, factor)` (keeps the complex point under (px, py) fixed), `pan(view, W, H, dxPx, dyPx)`, `zoomFactor(view)` = `3.2 / view.width`, `isAtMaxZoom(view, W, H)` = `pixelSize < max(|cx|, |cy|, 1) × 2⁻⁵⁰`, `clampView(view, W, H)` enforcing width ≤ 8, center in [−4, 4] and the max-zoom limit, and `engineFor(view, W, H)` returning `"gpu"` while `pixelSize ≥ max(|cx|, |cy|, 1) × 2⁻²⁰` else `"cpu"` (thresholds as named exported constants, [research.md](research.md) R3)
- [X] T008 [P] Implement PURE `js/fractal.js`: `ESCAPE_RADIUS = 256`; `smoothIterations(type, zx, zy, cx, cy, maxIter)` returning `n + 1 − log2(log(|zₙ|))` on escape or `−1` inside, with Mandelbrot `z₀ = 0, c = pixel` and Julia `z₀ = pixel, c = julia`; `autoMaxIter(zoom, detail)` = `round(clamp((200 + 120 × log10(zoom)²) × detail, 50, 10000))`, using `max(zoom, 1)` ([research.md](research.md) R6); `effectiveMaxIter(setting)` (uses `setting.maxIter` if not null)
- [X] T009 [P] Implement PURE `js/palette.js`: `hexToRgb`, `buildColorTable(stops, size = 1024)` returning a `Uint8Array` of RGBA with smooth, cyclic interpolation between evenly spaced stops (last stop blends back to the first)
- [X] T010 [P] Write `tests/view.test.js`: round-trip pixel↔complex, `zoomAt` keeps the point under the cursor fixed (within 1e-12 relative), `pan` by W pixels moves the center by one view width, `isAtMaxZoom` true for width 1e-13 on 3840×2160 and false for the default view, `engineFor` returns "gpu" for the default view and "cpu" at width 1e-7
- [X] T011 [P] Write `tests/fractal.test.js`: point (0,0) Mandelbrot → −1; point (2,2) escapes quickly with a positive value; values are continuous (two neighboring points differ by < 1); `autoMaxIter(1, 1) = 200`, never exceeds 10000 or goes below 50
- [X] T012 [P] Write `tests/palette.test.js`: table length 1024×4, first entry equals first stop, the table is cyclic (last entry close to first stop), 2-stop and 8-stop palettes work
- [X] T013 Implement `js/render/shaders.js` exporting GLSL ES 3.00 source strings: (a) a shared `COLORIZE_GLSL` function `vec4 colorize(float nu)` using uniforms `u_palette` (sampler2D 1024×1), `u_shift`, `u_density`, `u_smooth` (bool), `u_inside` (vec3): if `nu < 0` return inside color; `t = fract(nu * u_density / 100.0 + u_shift)`; if not smooth, use `floor(nu)` instead of `nu`; sample the palette at `t`. (b) `GPU_FRAGMENT` (iterates per pixel with `highp float`, loop bound uniform `u_maxIter` up to 10000, same escape radius and smooth formula as `js/fractal.js`, uniforms for type, julia, center, scale, then calls `colorize`). (c) `CPU_FRAGMENT` (samples an R32F texture of ν values with NEAREST filtering and calls `colorize`). (d) a full-screen-triangle vertex shader. Depends on T008 (formulas must match exactly)
- [X] T014 Implement `js/render/gpu.js`: class `GpuEngine(gl)` that compiles programs from `shaders.js`, uploads the palette table as a 1024×1 RGBA texture (`setPalette(table)`), sets color uniforms (`setColor(colorSetting)`), `draw(setting, W, H)` for the GPU engine, `drawNuTexture(float32Array, w, h)` for the CPU path (uploads R32F texture and draws with `CPU_FRAGMENT`, scaling up preview textures to full canvas), and `redraw()` that re-renders the last frame with new colors (FR-016). Handle `webglcontextlost`/`restored` by recompiling
- [X] T015 Implement `js/render/worker.js` (module worker) per the CPU message protocol in [contracts/render-engine.md](contracts/render-engine.md): on `job` store params and send `need-strip`; on `strip` compute rows `y0..y1` with step 1 or 4 using `smoothIterations` from `../fractal.js`, return `strip-done` with a transferred `Float32Array`, then send `need-strip`; ignore strips whose `jobId` is older than the latest job
- [X] T016 Implement `js/render/cpu.js`: class `CpuEngine` with a pool of `max(2, navigator.hardwareConcurrency − 1)` workers (`new Worker(new URL("./worker.js", import.meta.url), { type: "module" })`), `render(params) → { promise, cancel }` that hands out 32-row strips on demand, assembles them into one `Float32Array`, reports progress, and discards results from older `jobId`s ([research.md](research.md) R4)
- [X] T017 Implement `js/render/renderer.js` with the interface in [contracts/render-engine.md](contracts/render-engine.md): `render(setting, { width, height })` picks the engine via `engineFor`; GPU path draws at full resolution (drops to half resolution during gestures if a frame took > 16 ms); CPU path runs a preview pass (step 4) and draws it immediately, then a full pass (step 1); keeps the latest ν buffer so `recolor(colorSetting)` never recomputes; cancels any running job when a new render starts; emits `onStatus("rendering" | "done", progress)`
- [X] T018 Write `tests/engines.consistency.md` checklist (manual, browser): open `?debug=compare` (see T019) and confirm GPU and CPU pictures of 3 reference views at zoom 100× are visually identical and the reported max ν difference is < 0.01, per [contracts/render-engine.md](contracts/render-engine.md) Consistency check
- [X] T019 In `js/main.js`, add a debug mode `?debug=compare` that renders the current view with both engines into offscreen buffers, logs the max ν difference to the console and shows the two halves side by side (used by T018 and later tuning of the R3 threshold)

**Checkpoint**: Foundation ready — `node --test "tests/*.test.js"` passes; the default Mandelbrot can be drawn by either engine

---

## Phase 3: User Story 1 - Explore the Mandelbrot set by zooming and panning (Priority: P1) 🎯 MVP

**Goal**: Open the app → beautiful Mandelbrot; zoom/pan with touch, mouse and trackpad; undo/redo/reset; responsive and sharp on all screens

**Independent Test**: On phone, tablet and desktop, with no setup, zoom ≥ 1,000× into a region, pan around, undo, then reset the view ([quickstart.md](quickstart.md) US1)

### Implementation for User Story 1

- [X] T020 [US1] Implement `js/state.js`: holds the current FractalSetting (starts as a deep copy of `DEFAULT_SETTING`), `get()`, `update(partial, { record })` that notifies subscribers, `subscribe(fn)`, and undo/redo stacks of snapshots "max 50 entries each" (FR-005); a new change clears the redo stack; `record` is true only when a gesture ends or a control is released
- [X] T021 [US1] In `js/main.js`, size the canvas backing store to CSS size × `devicePixelRatio` using a `ResizeObserver`, keeping view center and width on resize/rotation (FR-006, [research.md](research.md) R7), and re-render on every state change via `renderer.render` (call `requestAnimationFrame` to coalesce multiple changes per frame)
- [X] T022 [US1] Implement `js/input.js` with Pointer Events ([research.md](research.md) R8): one-pointer drag → `pan`; two-pointer pinch → `zoomAt` around the pinch midpoint combined with pan; `wheel` → `zoomAt` at the cursor (trackpad pinch arrives with `ctrlKey`; use a gentler factor for it); double-tap/double-click → zoom 2× at the point; keyboard `+`/`−`/arrow keys/`0` (reset); all coordinates converted to device pixels; emits `onGestureStart`, `onGestureChange(view)`, `onGestureEnd(view)`
- [X] T023 [US1] Wire input to state in `js/main.js`: during gestures update the view without recording history and ask the renderer for interactive quality; on gesture end record a history entry and render at full quality; clamp every view with `clampView` and, when `isAtMaxZoom` is reached, show "Maximum zoom reached" in `#status` for 2 s (FR-012)
- [X] T024 [P] [US1] Implement `js/ui/toolbar.js`: buttons with icons and accessible labels for Zoom in, Zoom out (zoom 2× around the screen center), Undo, Redo, Reset view (restores `DEFAULT_SETTING.view`, recorded in history, FR-004); disable Undo/Redo when the stacks are empty
- [X] T025 [US1] Show render progress in `#status` (small unobtrusive indicator while the CPU engine is working, hidden when done; FR-025) and remember the current engine name for the debug overlay
- [X] T026 [US1] Style the toolbar in `css/app.css` for phone portrait, tablet and 4K desktop: icons scale with `rem`, toolbar never covers more than 15% of a phone screen, no horizontal scrolling (FR-007, SC-006)
- [ ] T027 [US1] Validate US1 manually with [quickstart.md](quickstart.md) US1 on Chrome DevTools phone/tablet sizes and on a desktop; tune the GPU→CPU threshold constant in `js/view.js` using `?debug=compare` so the switch is not visible

**Checkpoint**: MVP — a working, responsive Mandelbrot explorer

---

## Phase 4: User Story 2 - Play with colors (Priority: P2)

**Goal**: Palette gallery, live color sliders, custom palettes; recoloring is instant

**Independent Test**: Switch between ≥ 5 palettes and move every color slider; picture updates instantly without re-calculating the shape ([quickstart.md](quickstart.md) US2)

### Implementation for User Story 2

- [X] T028 [P] [US2] Add at least 10 built-in palettes to `BUILTIN_PALETTES` in `js/defaults.js` (e.g. Ocean, Fire, Rainbow, Sunset, Forest, Ice, Grayscale, Neon, Candy, Gold), each with "2–8 hex colors, evenly spaced, cyclic" and `builtIn: true` (FR-013)
- [X] T029 [US2] Implement `js/ui/colors.js` panel: a gallery of palette swatches (preview strip drawn from `buildColorTable`) with names; sliders for Color shift "[0, 1), position offset in the palette; wraps", Color density "[0.1, 20]" (logarithmic slider), a Smooth/Banded toggle, and an Inside color picker (`<input type="color">`, "Hex color `#rrggbb`"); every change calls `state.update` with `record: false` while dragging and `record: true` on release; "Reset colors" restores `DEFAULT_SETTING.color` (FR-014)
- [X] T030 [US2] Make color changes call `renderer.recolor` instead of a full render (detect that only `color` changed in `js/main.js`), so recoloring takes < 0.1 s on both engines (FR-016, SC-003)
- [X] T031 [US2] Add a custom palette editor in `js/ui/colors.js`: choose "2–8 hex colors", name "1–40 characters", save as `{ id: "custom-<uuid>", name, stops, builtIn: false }`; edit and delete custom palettes (FR-015)
- [X] T032 [US2] Implement custom palette persistence in `js/storage.js`: `loadPalettes()` / `savePalettes(list)` under key `alfinity.palettes.v1`, wrapped in try/catch; if storage is unavailable, show "Your palettes cannot be stored in this browser" once
- [X] T033 [US2] Add a "Colors" button to `js/ui/toolbar.js` that opens/closes the panel (`#panel`); on phones the panel is a bottom sheet that can be dragged down and covers at most half the picture (FR-007)
- [ ] T034 [US2] Validate US2 manually with [quickstart.md](quickstart.md) US2, including recoloring at deep zoom (CPU engine)

**Checkpoint**: US1 + US2 work together and on their own

---

## Phase 5: User Story 3 - Save and reuse favorite settings (Priority: P3)

**Goal**: Named favorites with thumbnails, persistence, rename/delete, export/import, last-view restore, share link

**Independent Test**: Save 3 favorites, restart the browser, reopen each; export/import on another device ([quickstart.md](quickstart.md) US3)

### Tests for User Story 3

- [X] T035 [P] [US3] Write `tests/settings.test.js`: `validateSetting` drops unknown fields, clamps out-of-range numbers (e.g. `detail` to [0.25, 4], `maxIter` to [50, 10000], `density` to [0.1, 20]), rejects non-finite numbers, falls back to palette "ocean" for unknown palettes; share-link encode→decode round trip keeps full number precision; favorites-file encode→decode round trip; import with an existing id assigns a new id; a file with `app ≠ "ALFinity"` is rejected; a newer `formatVersion` is imported with a warning

### Implementation for User Story 3

- [X] T036 [US3] Implement PURE `js/settings.js` per [data-model.md](data-model.md) Validation rules: `validateSetting(obj, knownPaletteIds) → { setting, warnings }` enforcing `type` `"mandelbrot" | "julia"`, `julia` re/im "each in [−2, 2]", `view.cx`/`view.cy` "finite, each in [−4, 4]", `view.width` "at most 8" and > 0, `detail` "[0.25, 4], default 1", `maxIter` "`null` = Auto; otherwise [50, 10000]", ColorSetting fields with their ranges, `schemaVersion` 1
- [X] T037 [US3] Add share-link encoding to `js/settings.js` per [contracts/share-link.md](contracts/share-link.md): `encodeShareLink(setting, customPalette?)` → `#s=<base64url(JSON)>` with the short keys `v t j c d i k p`, and `decodeShareLink(hash)` (UTF-8 safe base64url, full precision numbers)
- [X] T038 [US3] Add favorites-file encoding to `js/settings.js` per [contracts/favorites-file.md](contracts/favorites-file.md): `buildFavoritesFile(favorites, customPalettes)` (only palettes used by the exported favorites), `parseFavoritesFile(json, existing) → { favorites, palettes, summary }` applying the "import never overwrites" rules and listing skipped entries
- [X] T039 [US3] Extend `js/storage.js`: favorites under `alfinity.favorites.v1` (`{ id: crypto.randomUUID(), name "1–60 characters, trimmed; duplicates allowed", setting, thumbnail, created, modified }` with ISO 8601 timestamps), and the last setting under `alfinity.last.v1`; all reads validated with `validateSetting`; all writes in try/catch with a quota/unavailable message that suggests export (spec edge case)
- [X] T040 [US3] Add `renderer.thumbnail(setting) → dataURL` in `js/render/renderer.js`: render at 192×108 (GPU engine, or CPU engine at deep zoom) and encode with `canvas.toDataURL("image/jpeg", 0.8)`
- [X] T041 [US3] Implement `js/ui/favorites.js` panel: "Save" (name prompt in an in-page dialog, default name "Favorite N"), list with thumbnail, name and date, tap to open (recorded in undo history), rename inline, delete with an in-page confirmation (FR-017, FR-018)
- [X] T042 [US3] Add Export and Import buttons to `js/ui/favorites.js`: export downloads `alfinity-favorites-YYYY-MM-DD.alfinity.json` via a Blob link; import uses `<input type="file" accept=".json">`, shows the import summary, regenerates missing thumbnails (FR-020)
- [X] T043 [US3] In `js/main.js`: on start, open a `#s=` share link if present (then remove the fragment with `history.replaceState`), else restore `alfinity.last.v1`, else the default (FR-021); save the last setting (debounced 1 s) after each recorded change; add a "Copy link" button that copies `encodeShareLink` to the clipboard (FR-022)
- [X] T044 [US3] Add a "Favorites" button to `js/ui/toolbar.js` that opens the favorites panel
- [X] T061 [US3] Add `loadMeta()` / `saveMeta(partial)` to `js/storage.js` for key `alfinity.meta.v1` with fields `{ persistRequested: boolean, persistGranted: boolean | null, installHintShown: boolean, changesSinceExport: integer ≥ 0, backupReminder: boolean (default true) }`; in `js/ui/favorites.js`, when the first favorite is saved and `persistRequested` is false, call `navigator.storage?.persist?.()` and store the result (FR-019a, [research.md](research.md) R9a). Depends on T039, T041
- [X] T062 [US3] In `js/ui/favorites.js`, after the first favorite is saved on iPhone/iPad (detect via `navigator.maxTouchPoints > 1` plus an iOS/iPadOS user agent) and the app is not standalone (`navigator.standalone !== true` and `matchMedia("(display-mode: standalone)")` does not match), show once a dismissible notice: "Tip: tap Share → Add to Home Screen so Safari keeps your favorites." and set `installHintShown` (FR-019b). Depends on T061
- [X] T063 [US3] Backup reminder in `js/ui/favorites.js`: increment `changesSinceExport` on every favorite save, rename or delete, reset it to 0 after a successful export (T042); when it reaches 5 and `backupReminder` is true, show a dismissible notice "You have unsaved changes to your favorites — export a backup file?" with buttons "Export now", "Later" (resets the counter to 0) and "Don't remind me" (sets `backupReminder: false`) (FR-019c). Depends on T042, T061
- [ ] T045 [US3] Validate US3 manually with [quickstart.md](quickstart.md) US3 and Share link, including a private window with storage blocked, the home-screen hint on iPhone/iPad, and the backup reminder after 5 changes

**Checkpoint**: US1–US3 work; nice views are never lost

---

## Phase 6: User Story 4 - Discover Julia sets without math (Priority: P4)

**Goal**: Julia mode chosen by picking a point on a Mandelbrot mini-map or a named preset; optional Details

**Independent Test**: Switch to Julia, choose 3 presets, pick 3 points on the mini-map; each gives a distinct picture that can be zoomed, colored and saved ([quickstart.md](quickstart.md) US4)

### Implementation for User Story 4

- [X] T046 [P] [US4] Add `JULIA_PRESETS` to `js/defaults.js`: at least 6 named points (e.g. Dragon −0.8+0.156i, Spiral 0.285+0.01i, Snowflake −0.4+0.6i, Lightning −0.7269+0.1889i, Galaxy 0.355+0.355i, Coral −0.1+0.651i), each with a default view
- [X] T047 [US4] Add a Mandelbrot/Julia switch to `js/ui/toolbar.js`: switching to Julia sets `type: "julia"`, uses the current `julia` point and resets the view to center (0, 0), width 3.2; switching back restores the Mandelbrot view from before (FR-008)
- [X] T048 [US4] Implement `js/ui/julia.js`: a small Mandelbrot mini-map (its own small canvas rendered with the GPU engine) with a draggable marker for the Julia point; dragging updates `julia` continuously without recording history (preview quality) and records on release; a list of preset buttons with tiny thumbnails (FR-009)
- [X] T049 [US4] Implement `js/ui/details.js`: a collapsible "Details" section (closed by default) showing and editing Julia point re/im, center, zoom, "More detail" slider ("[0.25, 4], default 1"), and an Auto/manual max-iterations field ("[50, 10000]"), each with a one-sentence plain-language explanation; invalid input is clamped with a short note (FR-010, FR-011)
- [ ] T050 [US4] Validate US4 manually with [quickstart.md](quickstart.md) US4 on phone and desktop

**Checkpoint**: US1–US4 work

---

## Phase 7: User Story 5 - Save the picture as an image (Priority: P5)

**Goal**: Download the current picture as PNG at Screen, HD, 4K or custom size, keeping the framing

**Independent Test**: Export the same view at Screen and 4K; both files show the same framing, 4K with more detail ([quickstart.md](quickstart.md) US5)

### Implementation for User Story 5

- [X] T051 [US5] Add `renderer.renderTile(setting, fullW, fullH, rect)` in `js/render/renderer.js` per [contracts/render-engine.md](contracts/render-engine.md): renders the given sub-rectangle of a large image (choosing the engine by the *export* pixel size) into an RGBA pixel buffer
- [X] T052 [US5] Implement `js/export.js`: `exportImage(setting, W, H, onProgress) → Blob` rendering tiles of ≤ 2048 px per side, drawing them into one 2D canvas and saving with `canvas.toBlob("image/png")`; yields between tiles so the UI stays responsive (SC-007); can be cancelled; before starting, if `W × H` exceeds 16.7 megapixels on iOS/iPadOS (or the browser's canvas limit), show "This size is too large for this device — try 4K" (spec edge case)
- [X] T053 [US5] Add an "Save image" dialog in `js/ui/toolbar.js`: sizes Screen (canvas pixel size), Wallpaper HD 1920×1080, 4K 3840×2160, custom up to 7680×4320 (FR-023); the aspect ratio of the chosen size keeps the same framing via the `view.width` rule; shows progress and a Cancel button; downloads `alfinity-YYYYMMDD-HHMMSS.png`
- [ ] T054 [US5] Validate US5 manually with [quickstart.md](quickstart.md) US5, including the 8K warning on iPhone

**Checkpoint**: All five user stories work

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Offline use, accessibility, final validation

- [X] T055 [P] Create `manifest.webmanifest` (name "ALFinity", `display: "standalone"`, dark theme color, icons) and app icons `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (render them from a nice ALFinity view via the image export); link them from `index.html`
- [X] T056 [P] Create `sw.js`: on install cache all static files (`index.html`, `css/app.css`, all `js/**` files, manifest, icons) under a versioned cache name; serve cache-first; delete old caches on activate; register it from `js/main.js` (skip on `localhost` when `?nosw` is set, for development) ([research.md](research.md) R10)
- [X] T057 [P] Accessibility pass in `index.html`, `css/app.css` and `js/ui/*.js`: every button has an `aria-label`, panels are reachable by keyboard, focus is visible, `prefers-reduced-motion` disables panel animations, color contrast of UI text ≥ 4.5:1
- [ ] T058 Performance check against SC-001, SC-002, SC-003 and SC-007 on a recent iPhone and the MacBook with 4K monitor (Chrome DevTools Performance panel); record results in `specs/001-fractal-explorer/quickstart.md` under a new "Measured results" section and propose any further speed-ups to the owner before adding them (Constitution IV)
- [ ] T059 Run the full [quickstart.md](quickstart.md) validation on iPhone, iPad and 4K desktop (constitution Development Workflow), plus `node --test "tests/*.test.js"`, and fix any issues found
- [X] T060 [P] Update `README.md` with features, keyboard shortcuts and a screenshot

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–7)**: Depend on Foundational; done in priority order P1 → P5
- **Polish (Phase 8)**: After the desired user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational. No other story needed
- **US2 (P2)**: After Foundational; uses the toolbar/panel from US1 (T024, T026) but is testable on its own
- **US3 (P3)**: After Foundational; uses state and history from US1 (T020); a favorite's colors come from US2 if present
- **US4 (P4)**: After Foundational; uses toolbar from US1; Julia math is already in the engines (T008, T013)
- **US5 (P5)**: After Foundational; uses toolbar from US1

### Within Each Phase

- PURE modules and their tests before the code that uses them
- `shaders.js` (T013) before `gpu.js` (T014); `worker.js` (T015) before `cpu.js` (T016); both before `renderer.js` (T017)
- `settings.js` (T036–T038) before `storage.js` extension (T039) and favorites UI (T041–T042)
- Data-safety tasks T061–T063 (added 2026-10-17, numbered after T060 to keep existing IDs stable) run after T042 and before the US3 validation T045
- Validate each story (its last task) before starting the next

### Parallel Opportunities

- Setup: T003, T004, T005
- Foundational: T006–T012 (separate files) all in parallel; then T013–T016 in pairs (T013→T014 and T015→T016)
- US2: T028 alongside T029
- US3: T035 alongside T036–T038 (write tests first)
- US4: T046 alongside T047
- Polish: T055, T056, T057, T060

---

## Parallel Example: Foundational phase

```bash
Task: "Implement PURE js/view.js (T007)"
Task: "Implement PURE js/fractal.js (T008)"
Task: "Implement PURE js/palette.js (T009)"
Task: "Write tests/view.test.js (T010)"
Task: "Write tests/fractal.test.js (T011)"
Task: "Write tests/palette.test.js (T012)"
```

## Parallel Example: User Story 3

```bash
Task: "Write tests/settings.test.js (T035)"
Task: "Implement PURE js/settings.js validation (T036)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (both engines, tested math)
3. Phase 3: US1
4. **STOP and VALIDATE** on iPhone, iPad and 4K desktop
5. Demo the MVP

### Incremental Delivery

1. Setup + Foundational → a picture renders
2. + US1 → explore (MVP)
3. + US2 → colors
4. + US3 → favorites, links
5. + US4 → Julia sets
6. + US5 → image export
7. Polish → offline, accessibility, measured performance

---

## Implementation deviations (2026-10-17)

- **T047–T049**: instead of a type switch in the toolbar plus separate panels, one **Shape**
  panel (toolbar button) holds the Mandelbrot/Julia switch, the mini-map, presets and the
  Details section (`js/ui/julia.js`, `js/ui/details.js`). Fewer toolbar buttons fit on phones.
- **T053**: the "Save image" dialog is a panel (`js/ui/image.js`) like the others, using
  `js/export.js`; tiles are 1024 px on the GPU (shorter page stalls) and 2048 px on the CPU.
- **T040/T051**: `renderer.renderPixels()` renders any setting offscreen with its own CPU
  workers, so thumbnails, presets and exports never interrupt the picture on screen; tiles
  use `tileView()` in `js/view.js` (tested).
- **T055**: icons are drawn by `scripts/make-icons.mjs` (Node built-ins, same fractal code)
  instead of via the in-app export.
- **T056**: the service worker uses **network first** (not cache first): online users and
  developers always get the newest files; offline the cached copy is used.
- **Extra**: `index.html` shows a hint when opened from `file://`; on phones (≤ 520 px) the
  zoom buttons are hidden because pinch replaces them.
- **T060**: no screenshot in the README yet (needs a browser run).

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Commit after each task or logical group
- Stop at any checkpoint to validate the story
- Any new dependency or speed-up technique not listed in [research.md](research.md) must be proposed to the owner first (Constitution I and IV)

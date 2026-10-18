# Quickstart & Validation: ALFinity Fractal Explorer

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Prerequisites

- macOS with `python3` (preinstalled) to serve the files.
- Node.js (already installed) **only** to run the logic tests.
- Test devices: an iPhone, an iPad, and Chrome on a MacBook plus a 4K monitor. For phone
  and tablet you can also use Chrome DevTools device mode, but test on real devices before
  calling a story done (constitution, Development Workflow).

## Run the app

```bash
cd /path/to/ALFinity
python3 -m http.server 8000
```

- Desktop: open <http://localhost:8000>.
- iPhone/iPad on the same Wi-Fi: open `http://<Mac's local IP>:8000`
  (find the IP with `ipconfig getifaddr en0`).

## Run the logic tests

```bash
node --test "tests/*.test.js"
```

Expected: all tests pass (fractal math, view mapping, palettes, settings, file/link
encoding).

## Run the browser tests

```bash
node tests/browser/run.mjs          # ≈ 3 minutes, add --perf for the speed table
```

Expected: "98 of 98 checks passed" and exit code 0. The runner covers most scenarios below
automatically in Chrome at desktop, 4K, iPad and iPhone sizes (emulated touch); screenshots
are in `tests/browser/output/screens/`. Real iPhones and iPads still need the manual run.

## Validation scenarios

Each scenario maps to a user story in [spec.md](spec.md). Run on phone, tablet and 4K
desktop.

### US1 – Explore

1. Open the app → a colored Mandelbrot fills the screen within 2 s (SC-001).
2. Pinch / scroll into the "seahorse valley" (left of the main bulb's neck) → preview
   within 0.2 s, sharp within 2 s (SC-002).
3. Drag around while a render runs → UI stays smooth (SC-007).
4. Keep zooming past 10⁵× → no color jump when the engine switches (render-engine
   contract); keep going to the limit → "Maximum zoom reached" (FR-012).
5. Undo / redo / Reset view work (FR-004, FR-005).
6. Rotate the device / resize the window → same center and zoom.

### US2 – Colors

1. Switch through 5 palettes; move shift, density, smooth/banded → updates feel instant
   (SC-003), also at deep zoom (CPU engine).
2. Create a custom palette of 3 colors → picture uses it; reload → palette still there.

### US3 – Favorites

1. Save 3 favorites; close browser; reopen; open each → matches thumbnail (SC-005).
2. Rename and delete (with confirmation).
3. Export; import on another device → same pictures, no overwrites
   ([favorites-file contract](contracts/favorites-file.md)).
4. In a private window with storage blocked → friendly message, export still works.
5. Save the first favorite in Chrome → DevTools console:
   `await navigator.storage.persisted()` returns the stored answer (FR-019a).
6. On iPhone/iPad in Safari (not from the home screen), save the first favorite → the
   "Add to Home Screen" tip appears once; reload and save again → it does not reappear
   (FR-019b). Opened from the home screen → no tip.
7. Make 5 favorite changes → backup reminder appears; "Later" postpones it for 5 more;
   "Export now" downloads the file and resets the counter; "Don't remind me" stops it
   (FR-019c).

### US4 – Julia

1. Switch to Julia → default picture appears. Drag the point on the mini-map → picture
   follows smoothly. Try 3 presets. Open Details → numbers shown and editable.

### US5 – Image export

1. Export at Screen and 4K → files open, same framing; UI stays usable during 4K export.
2. On iPhone, request 8K → warning suggesting a smaller size.

### Share link

1. Copy a share link, open on another device → same picture
   ([share-link contract](contracts/share-link.md)).

### Offline

1. Load once, turn off Wi-Fi, reload → app still works.

## Measured results (T058, 2026-10-18)

Automated in a separate headless Chrome 155 (Metal GPU) controlled through the DevTools
Protocol, on a 4-core macOS virtual machine; iPhone and iPad sizes are emulated (screen size,
pixel ratio, touch, user agent). Real Apple devices are usually faster, especially the CPU.

| Criterion | Desktop 2880×1800 | iPhone 1170×2532 | 4K 3840×2160 | Target |
|---|---|---|---|---|
| SC-001 first picture after page start | 0.30 s | 0.43 s | 0.41 s | < 2 s ✔ |
| Gestures on the GPU (frame time) | 16.7 ms, max 17 ms | 16.7 ms, max 17 ms | 16.7 ms, max 17 ms | 60 fps ✔ |
| SC-003 recolor (GPU / CPU view) | 34 / 28 ms | 83 / 78 ms | 33 / 29 ms | < 0.1 s ✔ |
| SC-007 main thread blocked > 0.1 s | never | never | never | never ✔ |
| SC-002 full picture, zoom 10⁴ | 1.5 s (CPU) | 0.35 s (GPU) | 2.1 s (CPU) | < 2 s ✔ / 4K ✖ |
| SC-002 full picture, zoom 10⁵ | 1.7 s | 1.1 s | 2.4 s | < 2 s ✔ / 4K ✖ |
| SC-002 full picture, zoom 10⁶ | 14.8 s | 5.6 s | 21.9 s | < 2 s ✖ |
| SC-002 full picture, zoom 10⁸ | 9.7 s | 8.3 s | 15.5 s | < 2 s ✖ |

Times for zoomed views are measured from page start (including ≈ 0.3 s page load) at the
detailed point −0.743643887037151 + 0.13182590420533i. During gestures at CPU depth the last
picture follows the finger immediately (CSS transform); the 1/4-resolution preview arrived
0.4–1.7 s after page start.

**Finding**: deep views (≥ 10⁶) miss SC-002. In views with large black areas most time goes to
points inside the set, which run through all 4,500–7,900 iterations; in views without inside
points (10⁸, 10¹²) the points escape only after thousands of iterations. Cycle detection was
approved and tried on 2026-10-18 but does not help here (see [research.md](research.md) R13).

Other results of the automated run: all panel, touch, export, share-link, persistence and
offline checks passed after fixing two bugs (blank CPU tiles in exports and deep thumbnails —
a WebGL feedback loop; stale files after updates — the service worker now revalidates).

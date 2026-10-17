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

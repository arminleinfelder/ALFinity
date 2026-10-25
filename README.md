# ALFinity

![The Mandelbrot set in golden colors, drawn with ALFinity](images/banner.jpg)

**[▶ Try ALFinity in your browser](https://arminleinfelder.github.io/ALFinity/)** – no installation
needed, works on phone, tablet and desktop.

ALFinity is a fractal explorer for the browser. Zoom into the Mandelbrot set, discover Julia
sets, play with colors and keep your favorite pictures, with no math knowledge needed. It
works on iPhone, iPad and desktop up to 4K screens.

It is plain HTML, CSS and JavaScript: no libraries, no build step.

## Pages

- **Home**: the start page with the menu.
- **Introduction**: what fractals are and how the Mandelbrot and Julia sets are made, in plain
  words, with optional formulas and examples that open in the explorer.
- **Explorer**: the fractal explorer itself (`explorer.html`).
- **Credits**: the mathematicians, tools and sources behind ALFinity.
- **About me**: about the author.

## Features

- **Explore**: drag, pinch, scroll and double-tap; undo/redo; zooms up to the limit of
  normal number precision (about 1–10 trillion times, depending on screen size).
- **Fast**: the graphics card draws normal zoom levels instantly; deeper views are computed
  on all CPU cores with a quick preview first.
- **Shape**: Mandelbrot or Julia. Pick Julia shapes on a small map or from named presets;
  exact numbers are optional under *Details*.
- **Colors**: 10 palettes, color shift, density, smooth or banded colors, inside color, and
  your own palettes.
- **Favorites**: save pictures with thumbnails, rename, delete, export/import as a file,
  share a picture as a link.
- **Save image**: PNG at screen size, HD, 4K or a custom size up to 7680 × 4320.
- **Offline**: once loaded over HTTPS or localhost, it keeps working without a network and
  can be added to the iPhone/iPad home screen.
- **Private**: everything stays in your browser; nothing is sent anywhere.

## Run it

The app must be served by a web server (browsers block its scripts from `file://`):

```bash
cd ALFinity
python3 -m http.server 8000
```

Then open <http://localhost:8000> for the home page, or <http://localhost:8000/explorer.html>
for the explorer directly.

**On iPhone / iPad**: keep the server running, connect the device to the same Wi-Fi and open
`http://<your Mac's IP>:8000`. Find the IP under System Settings → Wi-Fi → Details, or with:

```bash
ipconfig getifaddr en0
```

Over plain `http` on the local network, offline mode and "Copy link" to the clipboard are not
available (browsers allow them only on HTTPS or localhost); everything else works.

## Controls

| Action | Touch | Mouse / trackpad | Keyboard |
|---|---|---|---|
| Move | Drag | Drag | Arrow keys |
| Zoom | Pinch | Scroll wheel / pinch | `+` / `-` |
| Zoom in 2× at a point | Double-tap | Double-click | |
| Zoom out 2× at a point | | Shift + double-click | |
| Undo / Redo | Toolbar | Toolbar | ⌘Z / ⇧⌘Z |
| Reset view | Toolbar | Toolbar | `0` |
| Close a panel | Drag the sheet down | ✕ | Esc |

## Tests

The math, view, palette and settings logic has tests that use Node's built-in test runner
(Node is only needed for the tests, never for the app):

```bash
node --test "tests/*.test.js"
```

### Browser tests

The whole app (rendering, gestures, panels, favorites, exports, offline mode, home and info
pages, old share links) is tested
automatically in Chrome at desktop, 4K, iPad and iPhone sizes:

```bash
node tests/browser/run.mjs            # all functional checks, about 3 minutes
node tests/browser/run.mjs --headed   # watch it in a visible Chrome window
node tests/browser/run.mjs --perf     # also measure speed against the success criteria
node tests/browser/run.mjs --only=touch,panels
```

The runner starts its own web server on a free port and a separate Chrome with an empty,
temporary profile, so your normal browser and its data are never used. It needs Google
Chrome, Python 3 and Node (no packages). Screenshots and downloaded files end up in
`tests/browser/output/`. Set `CHROME_PATH` if Chrome is installed somewhere else.

Real iPhones and iPads (Safari) still need a manual check with
[quickstart.md](specs/001-fractal-explorer/quickstart.md).

## Developer notes

- `?debug=compare` adds a **Compare** button that draws the current view with both render
  engines (graphics card and CPU) side by side and reports how much they differ.
- `?nosw` turns off the offline service worker. It uses "network first", so during
  development you always get the newest files when the server is running.
- When adding or renaming a file, add it to the list in `sw.js` and bump `CACHE`.
- Share links made with version 1.1 point to the main address; the home page forwards them to
  `explorer.html` ([contract](specs/002-home-and-info-pages/contracts/pages.md)).
- The home page background is `images/background.jpg` (2560 px wide, subject near the
  center). To replace it with a new picture (the large original stays outside the repository):

  ```bash
  sips -Z 2560 -s format jpeg -s formatOptions 65 /path/to/original.png --out images/background.jpg
  ```
- `node scripts/make-icons.mjs` redraws the app icons in `icons/`.
- The texts of the Introduction, Credits and About me pages are written in
  [docs/introduction.md](docs/introduction.md), [docs/credits.md](docs/credits.md) and
  [docs/about.md](docs/about.md); the HTML pages are derived from them (`docs/` is not
  published).

## Project documents

The specification, plan and task list of each feature are in `specs/`:

- [001-fractal-explorer](specs/001-fractal-explorer/): the explorer (versions 1.0 and 1.1)
- [002-home-and-info-pages](specs/002-home-and-info-pages/): home page, introduction, credits
  and about me (version 1.2)

## Learning project

ALFinity is a personal, non-commercial learning project documenting my journey into spec-driven development (SDD) and AI-assisted vibe coding.
This application is provided for educational and experimental purposes only. No commercial services are offered.

It is quite impressive to see how quickly such an app can be implemented: With help of GitHub SpecKit and Claude Code model Opus 5.5 it took less than 8 hours to specify, build, test and deploy the initial version of this app.
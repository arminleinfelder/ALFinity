# ALFinity

ALFinity is a fractal explorer for the browser. Zoom into the Mandelbrot set, play with
colors and keep your favorite pictures, with no math knowledge needed. It works on iPhone,
iPad and desktop up to 4K screens.

It is plain HTML, CSS and JavaScript: no libraries, no build step.

## Run it

The app must be served by a web server (background workers do not run from `file://`):

```bash
cd ALFinity
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

**On iPhone / iPad**: keep the server running, connect the device to the same Wi-Fi and open
`http://<your Mac's IP>:8000`. Find the IP with:

```bash
ipconfig getifaddr en0
```

## Controls

| Action | Touch | Mouse / trackpad | Keyboard |
|---|---|---|---|
| Move | Drag | Drag | Arrow keys |
| Zoom | Pinch | Scroll wheel / pinch | `+` / `-` |
| Zoom in 2× at a point | Double-tap | Double-click | |
| Undo / Redo | Toolbar | Toolbar | ⌘Z / ⇧⌘Z |
| Reset view | Toolbar | Toolbar | `0` |

## Tests

The math, palette and view logic has tests that use Node's built-in test runner (Node is
only needed for the tests, never for the app):

```bash
node --test "tests/*.test.js"
```

## Developer tools

- `?debug=compare` adds a **Compare** button that draws the current view with both render
  engines (graphics card and CPU) side by side and reports how much they differ.

## Project documents

The specification, plan and task list are in [specs/001-fractal-explorer](specs/001-fractal-explorer/).

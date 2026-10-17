# Research: ALFinity Fractal Explorer

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-17

Every decision below uses only browser-native APIs; no third-party libraries are needed
(Constitution Principle I).

## R1. Rendering engine (owner decision, 2026-10-17)

- **Decision**: Hybrid. A **GPU engine** (WebGL2 fragment shader) renders shallow and medium
  zoom levels; a **CPU engine** (pool of Web Workers, 64-bit numbers) takes over
  automatically when GPU precision runs out, up to the precision limit of ~10¹²–10¹³× (FR-012).
- **Rationale**: The owner chose the best experience: near-instant pictures for most
  exploration, and correct pictures at deep zoom. GPU `highp float` is 32-bit (about
  7 significant digits), so pixels become blocky beyond ~10⁵× zoom; JavaScript numbers are
  64-bit (about 16 digits), enough for ~10¹³×.
- **Alternatives considered**: CPU-only (simplest, 1–3 s on 4K); GPU-only (fastest but fails
  FR-012 without "double-float" emulation, which is complex and slower than it sounds on
  mobile GPUs).

## R2. Keeping both engines visually identical

- **Decision**: Separate *what the fractal is* from *how it is colored*:
  1. Both engines produce the same quantity per pixel: a **smooth iteration value**
     `ν = n + 1 − log₂(log|zₙ|)` (or `−1` for points inside the set), using the same escape
     radius (256) and the same max-iteration rule.
  2. Coloring happens in **one shared GLSL function** `colorize(ν, colorSettings)`. The GPU
     engine calls it directly in its shader. The CPU engine uploads its `Float32Array` of ν
     values as a float texture, and a tiny shader calls the *same* function.
- **Rationale**: Coloring code exists exactly once, so palettes, shift, density, banding and
  inner color are pixel-identical in both engines. Switching engines while zooming only
  changes sharpness at deep zoom, never colors.
- **Alternatives considered**: Duplicating coloring in JS and GLSL (two implementations to
  keep in sync; rejected). Rendering ν into a float render target on the GPU (needs the
  `EXT_color_buffer_float` extension; unnecessary because a GPU re-render is fast enough).

## R3. When to switch from GPU to CPU

- **Decision**: Use the GPU while `pixelSize ≥ max(|cx|, |cy|, 1) × 2⁻²⁰` (`pixelSize` =
  complex-plane width of one screen pixel, `cx, cy` = view center); otherwise use the CPU.
  The threshold is one constant, tuned during implementation by comparing both engines on
  test views.
- **Rationale**: 32-bit floats have 24 bits of mantissa; leaving ~4 bits of headroom avoids
  visible banding before the switch.
- **Alternatives considered**: A fixed zoom number (wrong when the center is far from 0).
- **Maximum zoom (FR-012)**: the same rule with 64-bit numbers. Zooming stops when
  `pixelSize < max(|cx|, |cy|, 1) × 2⁻⁵⁰`. In practice this is about 10¹²× on a 4K screen
  and about 10¹³× on a phone (fewer pixels across). This is "the limit of standard number
  precision" that the spec refers to; going further would need deep-zoom techniques,
  which are out of scope.

## R4. CPU engine: workers, progressive rendering, cancellation

- **Decision**:
  - Worker pool of `max(2, navigator.hardwareConcurrency − 1)` module workers.
  - The image is split into horizontal strips handed out dynamically (workers ask for the
    next strip), so slow strips near the set boundary do not stall others.
  - Two passes: a **preview at 1/4 resolution** (shown scaled up within ~0.2 s), then **full
    resolution**.
  - Every render job carries a `jobId`; when a new view is requested, the job counter
    increases and workers drop results of older jobs. Workers check for a newer job between
    strips.
  - Strips are returned as transferable `Float32Array` buffers (no copying).
- **Rationale**: Meets FR-024/FR-025 and SC-002/SC-007 with plain JS.
- **Alternatives considered**: `OffscreenCanvas` drawing inside workers (not needed, since
  workers produce numbers and coloring happens on the GPU); `SharedArrayBuffer` (requires
  special server headers, so rejected for simple static hosting).

## R5. GPU engine details

- **Decision**: WebGL2, one full-screen triangle, a fragment shader that iterates per pixel
  with a loop bound passed as a uniform (`maxIter` up to 10,000). The palette is a
  1024×1 RGBA texture. During interaction (dragging/pinching) the GPU renders at reduced
  resolution if a frame takes more than 16 ms, then at full resolution when the
  interaction stops.
- **Rationale**: WebGL2 is supported in current Safari (iOS/iPadOS/macOS) and Chrome, and
  supports float textures for the CPU path (R2).
- **Alternatives considered**: WebGPU (excellent, but support on older iOS devices still
  varies; reconsider later); WebGL1 (lacks the float textures needed in R2).
- **Fallback**: If WebGL2 is unavailable, the app shows a clear "This browser is not
  supported" message (the target browsers all have it).

## R6. Automatic detail (iteration depth)

- **Decision**: `maxIter = round(clamp((200 + 120 × log₁₀(zoom)²) × detail, 50, 10000))`,
  where `zoom = initialWidth / currentWidth` and the user's "More detail" slider sets
  `detail` from 0.25× to 4× (default 1×). Exact coefficients are tuned on reference views.
- **Rationale**: Deeper views need more iterations to show structure (spec edge case);
  a single slider is understandable for non-mathematicians (FR-010).

## R7. High-DPI and responsive canvas

- **Decision**: Canvas backing size = CSS size × `devicePixelRatio`, updated with a
  `ResizeObserver`. On resize/rotation the view keeps its center and zoom (spec edge case).
  The UI is a full-bleed canvas with a compact toolbar; panels are a bottom sheet on
  narrow screens and a side panel on wide ones (CSS media/container queries only).
- **Rationale**: FR-006, FR-007, SC-006.

## R8. Input (touch, mouse, trackpad)

- **Decision**: Pointer Events for drag and two-finger pinch (tracking active pointers),
  `wheel` for mouse/trackpad zoom (trackpad pinch arrives as `wheel` with `ctrlKey` in
  Safari/Chrome), double-tap/double-click zooms 2× at the point, and on-screen +/− buttons.
  `touch-action: none` on the canvas prevents the browser's page zoom.
  While a gesture is in progress, the last frame is transformed with CSS for instant
  feedback, and a render starts when the gesture pauses.
- **Rationale**: FR-002, FR-003, one code path for all devices.

## R9. Storage, sharing and export

- **Decision**:
  - **localStorage** (key prefix `alfinity.`) for favorites, custom palettes and the last
    setting. Thumbnails are 192×108 JPEG data URLs (~6–10 KB), so hundreds of favorites
    fit in the ~5 MB quota. If storage is unavailable or full, a message suggests export
    (spec edge case).
  - **Share link**: the setting is encoded as compact JSON in the URL fragment
    (`#s=<base64url>`), so nothing is sent to a server (FR-022, FR-026).
  - **Favorites file**: a JSON file `*.alfinity.json` with a `formatVersion` field (FR-020).
  - **Image export**: render in tiles (≤ 2048 px per side) with the same engines, assemble
    them into one canvas, save as PNG via `canvas.toBlob`. Before starting, the app checks
    the size against device limits (iOS Safari caps canvas area at ~16.7 megapixels) and
    suggests a smaller size if needed (spec edge case).
- **Rationale**: Simplest built-in options that meet the requirements.
- **Alternatives considered**: IndexedDB (more capacity, more code; not needed at this
  scale).

## R10. Offline use

- **Decision**: A small service worker caches the app's static files on first load, and a
  web app manifest allows "Add to Home Screen" on iPhone/iPad.
- **Rationale**: The constitution says the app SHOULD work offline; this costs ~40 lines.

## R11. Testing without dependencies

- **Decision**: Pure modules (fractal math, view transforms, palette building, settings
  validation/serialization) contain no DOM code and are tested with **Node's built-in test
  runner** (`node --test`, Node is already installed on the dev machine). Rendering, input
  and layout are verified manually with the [quickstart](quickstart.md) checklist on phone,
  tablet and desktop viewports.
- **Rationale**: No packages, no build step (Principle I). Node is a developer tool only;
  the app itself never needs it.

## R12. Local development server

- **Decision**: `python3 -m http.server 8000` (preinstalled on macOS). Module workers and
  service workers do not run from `file://` URLs, so a simple server is required.

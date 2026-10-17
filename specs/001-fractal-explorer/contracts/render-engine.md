# Contract: Render Engines (internal)

ALFinity has two render engines (see [research.md](../research.md) R1–R5). Both MUST follow
this contract so the renderer can switch between them and pictures look identical.

## Shared definitions

- **Smooth iteration value** per pixel:
  - escaped after `n` iterations: `ν = n + 1 − log₂(log(|zₙ|))`, escape radius 256
  - not escaped within `maxIter`: `ν = −1` (inside the set)
- **Pixel → complex mapping**: pixel `(px, py)` (origin top-left, pixel centers at +0.5)
  maps to `cx + (px + 0.5 − W/2) × s`, `cy − (py + 0.5 − H/2) × s`, where
  `s = view.width / min(W, H)`.
- **Iteration**: Mandelbrot `z₀ = 0, c = pixel`; Julia `z₀ = pixel, c = julia`;
  `zₙ₊₁ = zₙ² + c`.
- **Coloring**: only through the shared GLSL `colorize(ν, ColorSetting)` function.

## Renderer interface

```text
renderer.render(setting, { width, height, quality: "preview" | "full" }) → job
job.cancel()
job.onProgress(fraction)
job.done → resolves when the full-quality picture is shown
renderer.recolor(colorSetting)        // no recomputation of ν (FR-016)
renderer.renderTile(setting, rect)    // used by image export
renderer.engineFor(setting, width, height) → "gpu" | "cpu"
```

## CPU worker messages

Workers are stateless: every strip message carries the full job parameters.

```text
main → worker  { jobId, p: { type, jre, jim, cx, cy, s, W, H, maxIter, step, gw }, y0, y1 }
               // step = 4 for the preview, 1 for full quality; rows y0..y1 of the grid
worker → main  { jobId, y0, y1, data: Float32Array }   // transferred, not copied
```

The main thread sends the next strip to whichever worker just finished. Results whose
`jobId` is older than the current job are discarded and the worker gets a strip of the
current job.

## Consistency check

The GPU engine only outputs colors (reading ν back would need a float render target), so
the check compares colors: `?debug=compare` renders the same view with both engines and
reports the largest color difference and the share of visibly different pixels
(see [tests/engines.consistency.md](../../../tests/engines.consistency.md)).

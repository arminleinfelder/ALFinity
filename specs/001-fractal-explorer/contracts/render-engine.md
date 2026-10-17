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

```text
main → worker  { kind: "job", jobId, type, julia, cx, cy, s, width, height,
                 maxIter, step }      // step = 4 for preview, 1 for full
worker → main  { kind: "need-strip", jobId }
main → worker  { kind: "strip", jobId, y0, y1 } | { kind: "idle" }
worker → main  { kind: "strip-done", jobId, y0, y1, data: Float32Array }  // transferred
```

Results whose `jobId` is older than the current job are discarded.

## Consistency check

A reference test renders the same small views with both engines and compares ν values
(within 0.01) and resulting colors, at a zoom level both engines can handle.

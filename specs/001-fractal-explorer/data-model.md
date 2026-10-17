# Data Model: ALFinity Fractal Explorer

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

All data lives in the browser. Plain JSON objects; `schemaVersion` fields allow later
migrations.

## FractalSetting

A complete, reproducible description of one picture (spec Key Entity).

| Field | Type | Rules |
|---|---|---|
| `type` | `"mandelbrot"` \| `"julia"` | Required (FR-008) |
| `julia` | `{ re: number, im: number }` | Required when `type = "julia"`; each in [−2, 2] |
| `view.cx`, `view.cy` | number | View center; finite, each in [−4, 4] |
| `view.width` | number | Complex-plane width of the visible area; at most 8; lower limit set by the max-zoom rule in [research.md](research.md) R3 (FR-012) |
| `detail` | number | Iteration multiplier, [0.25, 4], default 1 (FR-010) |
| `maxIter` | integer \| `null` | `null` = Auto; otherwise [50, 10000] |
| `color` | ColorSetting | Required |
| `schemaVersion` | integer | Currently `1` |

- The visible height follows from the screen aspect ratio; `view.width` is defined for the
  shorter screen side so a picture keeps its framing on portrait and landscape screens.
- Defaults (first load, FR-001): Mandelbrot, center (−0.6, 0), width 3.2, Auto detail,
  palette "Ocean".

## ColorSetting

| Field | Type | Rules |
|---|---|---|
| `paletteId` | string | ID of a built-in or custom Palette |
| `shift` | number | [0, 1), position offset in the palette; wraps (FR-014) |
| `density` | number | [0.1, 20], how many times the palette repeats per 100 iterations |
| `smooth` | boolean | `true` = smooth gradient, `false` = banded |
| `inside` | string | Hex color `#rrggbb` for points inside the set |

## Palette

| Field | Type | Rules |
|---|---|---|
| `id` | string | Built-in: `"fire"`, `"ocean"`, … Custom: `"custom-<uuid>"` |
| `name` | string | 1–40 characters |
| `stops` | `string[]` | 2–8 hex colors, evenly spaced, cyclic (FR-015) |
| `builtIn` | boolean | Built-in palettes are read-only |

At least 10 built-in palettes (FR-013). Each palette is turned into a 1024-entry color
table before drawing.

## Favorite

| Field | Type | Rules |
|---|---|---|
| `id` | string | UUID (`crypto.randomUUID()`) |
| `name` | string | 1–60 characters, trimmed; duplicates allowed |
| `setting` | FractalSetting | Must validate |
| `thumbnail` | string | JPEG data URL, 192×108 |
| `created`, `modified` | string | ISO 8601 timestamps |

**Lifecycle**: created (Save) → renamed (updates `modified`) → deleted (after confirmation,
FR-018). Opening a favorite copies its setting into the current state, recorded in undo
history.

## FavoritesFile (export/import)

See [contracts/favorites-file.md](contracts/favorites-file.md).

## History (in memory only)

An undo stack and a redo stack of FractalSetting snapshots, max 50 entries each (FR-005).
A new entry is recorded when a gesture ends or a control is released, not on every frame.
Any new change clears the redo stack.

## Storage keys (localStorage)

| Key | Content |
|---|---|
| `alfinity.favorites.v1` | `Favorite[]` |
| `alfinity.palettes.v1` | custom `Palette[]` |
| `alfinity.last.v1` | last FractalSetting (FR-021) |

## Validation rules

- Every setting coming from storage, a file or a link is validated: unknown fields are
  dropped, out-of-range numbers are clamped, invalid entries are reported and skipped
  (spec edge case), and a missing custom palette falls back to "Ocean".
- A file with a newer `formatVersion` than the app knows is imported best-effort with a
  warning.

# Data Model: Home Page with Menu and Info Pages

This feature stores no new data. The explorer's stored data (favorites, palettes, last
view) and its share-link format are unchanged (see
[001 data-model.md](../001-fractal-explorer/data-model.md)). What follows describes the
pages and their content as fixed parts of the app.

## Page

| Field | Value |
|---|---|
| file | `index.html`, `introduction.html`, `explorer.html`, `credits.html`, `about-me.html` |
| title | Browser tab title, e.g. "Introduction – ALFinity" (home and explorer: "ALFinity") |
| menu label | "Introduction", "Explorer", "Credits", "About me" (home has none) |
| menu order | 1–4 as listed; fixed (FR-001) |

Navigation rules (FR-001, FR-003, FR-004):

```text
            ┌──────────────── Home (index.html) ────────────────┐
            │            │              │             │          │
       Introduction   Explorer        Credits       About me     │
            │  ▲          │  ▲            │  ▲          │  ▲      │
            └──┼──────────┼──┼────────────┴──┼──────────┘  │      │
               └── each info page: "Home" + "Open the explorer" + footer menu
Explorer: "‹ ALFinity" → Home
```

## Background picture

| Field | Value |
|---|---|
| file | `images/background.jpg` (the only file to replace, FR-007), made from the owner's 3840 × 2160 PNG (not stored in the repository) |
| size | 2560 × 1440, JPEG quality 65 (≈ 1.5 MB); original 3840 × 2160; main subject near the center |
| fallback | page background color `--bg` while loading or if missing |

## Explorer example link

| Field | Value |
|---|---|
| href | `explorer.html#s=<base64url(JSON)>`, format per [001 share-link contract](../001-fractal-explorer/contracts/share-link.md) |
| label | e.g. "See it in the explorer" |
| validation | must decode to a valid setting (checked by the `pages` browser test) |

## Profile (About me)

| Field | Required | Until the owner supplies it |
|---|---|---|
| name | yes | "Armin Leinfelder" (already public in the About panel) |
| bio | yes | placeholder text, visibly marked (FR-014) |
| photo | no | placeholder box, visibly marked; later `images/about-me.jpg` |
| links | no | placeholder list, visibly marked; GitHub repository link may stay |

Placeholders use one marker (`class="placeholder"` with a visible "Placeholder" label),
so they are easy to find and remove.

## Version

`js/version.js`: `VERSION = "1.2.0"`, `RELEASE_DATE` = the release day (FR-021).

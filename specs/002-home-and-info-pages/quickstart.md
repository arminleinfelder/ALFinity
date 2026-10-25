# Quickstart: Validate Milestone 1.2

How to check that the home page, info pages and the moved explorer work. Run the app as
described in the [README](../../README.md#run-it) (`python3 -m http.server 8000`).

## Prerequisites

- Before switching to this branch, open the explorer of version 1.1 (`main`) and use
  **Favorites → Copy link** for at least five pictures: Mandelbrot, Julia, a built-in
  palette, a custom palette, a deep zoom. Keep the links in a text file (SC-003).
- Optional: add 1.1 to the iPhone/iPad home screen (needs HTTPS, e.g. the hosted app).

## Automated checks

```bash
node --test "tests/*.test.js"
node tests/browser/run.mjs             # includes the new "pages" suite and offline pages
node tests/browser/run.mjs --only=pages
```

Expected: all checks pass; screenshots of every page and device in
`tests/browser/output/screens/`.

## Manual checks (phone, tablet, large desktop — Constitution, Development Workflow)

| # | Do | Expect |
|---|---|---|
| 1 | Open `http://localhost:8000/` | Home: background picture, "ALFinity", tagline, menu *Introduction · Explorer · Credits · About me*; on a phone in portrait all visible without scrolling |
| 2 | Choose each menu entry | The page opens; it has "Home" and "Open the explorer" links |
| 3 | Open the explorer, zoom somewhere, tap "‹ ALFinity" | Home page; choose *Explorer* again → same view |
| 4 | In the explorer open **About** | Version 1.2.0 with date |
| 5 | Open each saved 1.1 share link (change only the host if needed) | Explorer opens directly with exactly that picture; Back does not show the home page |
| 6 | Copy a new share link in the explorer | It contains `explorer.html#s=`; opening it shows the picture |
| 7 | In the introduction, follow every "See it in the explorer" link | The described picture opens |
| 8 | Read the introduction without the "math (optional)" boxes | Black area and colors are still explained |
| 9 | Follow external links on Introduction and Credits | Open in a new tab |
| 10 | About me | Every placeholder is visibly marked "Placeholder" |
| 11 | Throttle the network (DevTools "Slow 4G") and reload home | Menu usable before the picture appears |
| 12 | Rotate phone/tablet; open on a 4K monitor | No horizontal scrolling, text width comfortable, nothing clipped |
| 13 | On HTTPS or localhost: visit home once, stop the server (or go offline), open all five pages and a share link | All work |
| 14 | Launch the home-screen app made with 1.1 (after the update is deployed) | Home page opens |
| 15 | GitHub repository page | "Try ALFinity" link right below the banner opens the hosted home page |

## Replacing the background picture

Keep the original as `images/background.png` and save a web copy as `images/background.jpg`
(`sips -Z 2560 -s format jpeg -s formatOptions 65 images/background.png --out images/background.jpg`;
at least 2560 px wide, subject near the
center) and reload. No other change is needed: the file name stays the same, and the
offline copy picks up the new picture on the next online visit.

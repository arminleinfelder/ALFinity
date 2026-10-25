# Research: Home Page with Menu and Info Pages

Decisions for [plan.md](plan.md). Each entry: decision, rationale, alternatives considered.

## R1 – Separate HTML pages, explorer moves to `explorer.html`

**Decision**: One static HTML file per page: `index.html` (home), `explorer.html` (the
current app, moved unchanged), `introduction.html`, `credits.html`, `about-me.html`.

**Rationale**: The app address must show the home page (FR-001) while the explorer stays
unchanged (FR-004). Separate pages need no router, work with the Back button, give every
page its own title (FR-019) and can be read without JavaScript. The explorer's code keeps
its single entry point (`js/main.js`) and does not load anything for the info pages.

**Alternatives considered**:
- *One page with views switched by JavaScript (hash router)*: clashes with share links,
  which already use the URL fragment (`#s=…`); needs a router and history handling;
  would start WebGL and the workers even when someone only reads the introduction.
- *Keep the explorer at `index.html` and put home at `home.html`*: then the app address
  and home-screen launches would not show the home page (FR-001, FR-005).

## R2 – Old share links: forward from the home page before it draws

**Decision**: A short inline script at the top of `index.html`'s `<head>` checks
`location.hash`; if it starts with `#s=`, it calls
`location.replace("explorer.html" + location.search + location.hash)`. New share links
point to `explorer.html` by themselves, because the explorer builds them from
`location.pathname` (no code change).

**Rationale**: Old links (`…/ALFinity/#s=…` and `…/ALFinity/index.html#s=…`) both load
`index.html`. Running before the body is parsed means the home page never flashes, and
`replace` keeps the Back button clean (Back does not land on a page that forwards again).
It works offline because `explorer.html` is in the offline copy. The explorer then reads
and removes the fragment exactly as today (contracts in 001 unchanged).

**Alternatives considered**:
- *Forward with `<meta http-equiv="refresh">`*: cannot look at the fragment, so it would
  forward every visit.
- *Server redirect*: GitHub Pages has none, and the fragment never reaches a server.

## R3 – Way back home from the explorer: the "ALFinity" name becomes a link

**Decision**: The toolbar's existing "ALFinity" label becomes a link to the home page
(`./`), shown as "‹ ALFinity" with the accessible name and tooltip "Home". On narrow
screens it stays at the bottom center (as in 1.1) but now accepts taps; it is a small
pill, so gestures elsewhere still reach the picture.

**Rationale**: A logo that leads home is a familiar web convention, needs no new button
and keeps the toolbar width unchanged. On an iPhone (390 px) the toolbar already uses
eight 42 px buttons in one row; a ninth would not fit (the load test checks this).

**Alternatives considered**:
- *A separate Home button in the toolbar*: does not fit on phones; the house icon is
  already used by "Reset view", so it would also need a new reset icon.
- *A "Home" entry in the About panel*: two taps and hard to find.

## R4 – Background picture: the owner's picture as a 2560 px JPEG, `cover`, dark overlay

**Decision** (updated 2026-10-25 when the owner supplied `background.png`, 3840 × 2160,
15 MB): the original is not stored in the repository; the page uses
`images/background.jpg`, scaled to 2560 × 1440, JPEG quality 65 (≈ 1.5 MB; at 3840 px it
would be 3–4.5 MB because of the fine detail), shown with `background-size: cover` and
centered. A dark gradient over the picture keeps the title and menu readable (FR-008). A
new picture replaces the file with the same name (FR-007); recommended: at least 2560 px
wide, with the main subject near the center because phones in portrait show only the
middle strip.

**Rationale**: 2560 px stays sharp enough on 4K behind the dark overlay at a tenth of the
original's size; one file keeps replacing it trivial. A CSS background loads in parallel, so the menu is usable before the picture
arrives (SC-002, edge case "picture slow or missing": the page background color stays).

**Alternatives considered**:
- *Several sizes with `srcset`/`image-set`*: smaller downloads on phones, but the owner
  would have to produce and replace several files. Can be added later if needed.
- *Reuse `images/banner.jpg`*: 3.2 : 1 is too wide; a portrait phone would show a sliver.
- *Render a live fractal on the home page*: would load WebGL and the workers on the
  home page; slower start, more code.

## R5 – Shared styles: info pages load `app.css` plus a new `pages.css`

**Decision**: Home and info pages link `css/app.css` (colors, type, glass surfaces, 4K
scaling) and `css/pages.css` (page layout, scrolling, reading width, menu, formulas,
placeholders). `pages.css` re-enables normal scrolling, which `app.css` turns off for
the explorer.

**Rationale**: One place for the theme (FR-015); no duplicated color values; the
explorer's styles are not touched. The unused explorer rules cost a few KB that are
cached anyway.

**Alternatives considered**:
- *Move the theme into a third file `base.css` used by both*: cleaner in theory, but it
  changes the explorer's files for no user benefit.
- *Copy the variables into `pages.css`*: two places to keep in sync.

## R6 – Offline: register the service worker on every page; list all new files

**Decision**: A small module `js/site.js` is loaded by the home and info pages. It
registers `sw.js` with the same rules as the explorer (HTTPS or localhost, not with
`?nosw`) and writes the version into elements marked `data-version`. All new HTML, CSS,
JS and image files are added to the list in `sw.js`, and `CACHE` becomes
`alfinity-v4`. The deploy workflow copies `*.html` and `images/`.

**Rationale**: A visitor who only opens the home page should also get the offline copy
of everything (FR-016, SC-007). The service worker already handles "network first" and
removes old caches on activation, so old and new files never mix.

**Alternatives considered**:
- *Register only in the explorer*: someone who reads the introduction and goes offline
  would have no copy.

## R7 – Formulas: plain HTML in an "optional" box

**Decision**: Formulas are written with HTML (`<var>`, `<sub>`, `<sup>`, Unicode such as
→ and ²) in an `<aside class="math">` titled "The math (optional)". The plain-language
text before and after explains the same idea without symbols.

**Rationale**: Reads fine on every device, needs no library (Constitution I) and makes
"optional" visible (FR-010). The formulas are short (z → z² + c).

**Alternatives considered**:
- *MathJax / KaTeX*: a dependency of several hundred KB for three short formulas.
- *MathML*: supported by current Safari and Chrome, but more verbose to write and
  maintain than the HTML above; the result looks the same for these formulas.
- *Hide formulas in `<details>`*: works, but readers who like math might miss them.

## R8 – "See it in the explorer" links: fixed share links in the page

**Decision**: Each example link is a plain `<a href="explorer.html#s=…">` with a share
link made once with the explorer's own "Copy link" (format from 001's share-link
contract). A comment next to each link names the view.

**Rationale**: Works without JavaScript and offline, uses the existing, tested format
(FR-011), needs no new code.

**Alternatives considered**:
- *Build the links at runtime from data attributes*: more code for the same result.

## R9 – Example pictures for the introduction

**Decision**: Four pictures made with ALFinity, saved as JPEG about 1600 px wide
(target under 250 KB each) in `images/`: the whole Mandelbrot set, a zoomed detail that
shows a small copy of the set (self-similarity), a connected Julia set and a "dust"
Julia set. Shown with `width`/`height` set and `loading="lazy"`.

**Rationale**: Pictures explain fractals better than words (SC-005); local files work
offline and send nothing to other servers (FR-018).

**Alternatives considered**:
- *Images from Wikipedia*: external loads and licensing notes; not offline.
- *Reuse the README pictures* (`banner.jpg`, `julia.jpg`, `mandelbrot.jpg`): they are
  0.2–0.8 MB at sizes meant for the README.

## R10 – Tests

**Decision**:
- The browser test helper opens `explorer.html?nosw` by default instead of `?nosw`;
  the explorer suites stay otherwise unchanged (SC-004).
- A new suite `pages` checks: the home page shows four menu entries in the right order;
  each menu entry opens its page; every info page links back to home and to the explorer;
  the explorer's "ALFinity" link goes home; an old-style link `./#s=…` and
  `./index.html#s=…` opens the explorer with that picture; no horizontal scrolling and
  no clipped menu on desktop, 4K, iPad, iPhone and iPhone landscape; no console errors;
  every `explorer.html#s=…` link in the introduction decodes to a valid picture.
- The offline suite also opens the home page and the three info pages with the server
  stopped.
- Real iPhone/iPad Safari is checked by hand with [quickstart.md](quickstart.md).

**Rationale**: Reuses the existing Node + Chrome runner without packages; covers the
P1 risks (navigation, old links, offline) automatically.

---

description: "Task list for 002-home-and-info-pages (Milestone 1.2)"
---

# Tasks: Home Page with Menu and Info Pages (Milestone 1.2)

**Input**: Design documents from `specs/002-home-and-info-pages/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/pages.md](contracts/pages.md),
[quickstart.md](quickstart.md)

**Tests**: Included. SC-004 requires the existing explorer tests to keep passing, and
research R10 adds a `pages` browser suite and offline checks for the new pages.

**Organization**: Tasks are grouped by user story so each story can be built and checked
on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: Which user story this task belongs to (US1–US6 from spec.md)

## Path Conventions

Flat static web app at the repository root (plan.md, Project Structure): pages at the
root, `css/`, `js/`, `images/`, `tests/browser/`.

---

## Phase 1: Setup

**Purpose**: Folders and the shared page styles/script every new page uses.

- [X] T001 Rename the folder `docs/` to `images/` and update the README banner path; create `images/background.jpg` from the owner's `background.png`, which is then removed from the repository (15 MB) (2560 px wide, JPEG quality 65, research R4)
- [X] T002 [P] Create `css/pages.css` (research R5), loaded after `css/app.css` on home and info pages only: re-enable normal scrolling (`html, body { height: auto; overflow: auto; overscroll-behavior: auto; }`); a page header bar with the "‹ ALFinity" home link on the left and an "Open the explorer" button on the right (glass `.surface` style, touch targets ≥ `var(--tap)`, visible `:focus-visible` outline in `--accent`); `main` with `max-width: 42rem`, centered, side padding `max(1rem, env(safe-area-inset-left/right))`; headings, paragraphs, lists and links in the app's colors (`--text`, `--muted`, `--accent`); `figure`/`img` responsive (`max-width: 100%; height: auto`, rounded `--radius`); `.math` box (`aside`, `--surface-solid` background, `--border`, small "The math (optional)" heading in `--muted`); `.placeholder` (dashed `--accent` border, with a visible "Placeholder" label via `::before`); a footer with the page menu (Home · Introduction · Explorer · Credits · About me), wrapping on narrow screens; no horizontal scrolling down to 320 px; the 4K font scaling from `app.css` applies automatically
- [X] T003 [P] Create `js/site.js` (ES module, research R6) for home and info pages: register `sw.js` only if `"serviceWorker" in navigator`, `window.isSecureContext` and the URL has no `nosw` parameter (same rules as `registerServiceWorker()` in `js/main.js`), log a `console.warn` on failure; import `VERSION` and `RELEASE_DATE` from `./version.js` and write `${VERSION} · ${RELEASE_DATE}` into every element with a `data-version` attribute; mark the footer link of the current page with `aria-current="page"` (compare link `href` with `location.pathname`'s file name, empty name = `index.html`). Header comment in the style of the other modules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Move the explorer to its own address so the main address is free for the
home page. All explorer tests must still pass afterwards.

**⚠️ CRITICAL**: No user story can start until this phase is complete.

- [X] T004 Move the explorer: `git mv index.html explorer.html` (content unchanged for now), then create a temporary `index.html` that only contains the forwarding script from T009 plus `<meta http-equiv="refresh" content="0; url=explorer.html">` so the app keeps opening during development (replaced in T008)
- [X] T005 In `tests/browser/lib/page.mjs`, change the default of `open(path = "?nosw")` to `open(path = "explorer.html?nosw")`; in `tests/browser/suites/offline.mjs`, open `"explorer.html"` instead of `""` in both places (research R10)
- [X] T006 In `sw.js`, add `"explorer.html"` to `FILES` (keep `"./"` and `"index.html"`) and change `CACHE` to `"alfinity-v4"`
- [X] T007 Run `node --test "tests/*.test.js"` and `node tests/browser/run.mjs`; all checks must pass unchanged (SC-004). Fix only paths, never explorer behavior

**Checkpoint**: The explorer works at `explorer.html`; all existing tests green.

---

## Phase 3: User Story 1 - Land on a welcoming home page and reach the explorer (Priority: P1) 🎯 MVP

**Goal**: The app address shows the home page with background and menu; *Explorer*
opens the unchanged explorer; "‹ ALFinity" in the explorer goes back home.

**Independent Test**: Open `/` on phone, tablet and desktop sizes → background, name,
tagline, four menu entries without scrolling; *Explorer* → explorer with last view;
"‹ ALFinity" → home; About panel shows 1.2.0.

### Tests for User Story 1

- [X] T008 [P] [US1] Create `tests/browser/suites/pages.mjs` (export `description` and `run(t)` like the other suites) with the US1 checks, for each device in `["desktop", "4k", "ipad", "iphone", "iphone-landscape"]`: open `"?nosw"`; the menu has exactly the links "Introduction", "Explorer", "Credits", "About me" in this order, pointing to `introduction.html`, `explorer.html`, `credits.html`, `about-me.html`; the title, tagline and every menu entry are fully inside the viewport (no scrolling needed, `getBoundingClientRect`), each menu link is at least 44 × 44 CSS px; `document.documentElement.scrollWidth <= innerWidth`; screenshot `pages-home-<device>`; `t.noProblems(page)`. On desktop also: click *Explorer* → `#toolbar` exists and `document.title === "ALFinity"`; click the brand link `#toolbar a.brand` → back on the home page (menu present). Register `"pages"` in `SUITES` in `tests/browser/run.mjs` before `"offline"`

### Implementation for User Story 1

- [X] T009 [US1] Write the new `index.html` (home, FR-001, FR-007, FR-008, FR-019): `<!doctype html>`, `lang="en"`, the same `<meta>` tags, manifest, icons and `theme-color` as `explorer.html`; title "ALFinity"; as the **first** element of `<head>` an inline script per [contracts/pages.md](contracts/pages.md): `if (location.hash.startsWith("#s=")) location.replace("explorer.html" + location.search + location.hash);` with a one-line comment; links to `css/app.css` and `css/pages.css`; `<script type="module" src="js/site.js">`. Body: a full-screen `.home` section with the app name as `<h1>ALFinity</h1>`, the tagline "Explore the endless beauty of fractals." and a `<nav aria-label="Main menu">` with four large glass links in this order — *Introduction* ("What fractals are and how they are made"), *Explorer* ("Zoom, color and save your own pictures"), *Credits* ("The people and tools behind ALFinity"), *About me* ("Who made this") — and a small footer line "Version <span data-version></span> · <a href=\"https://github.com/arminleinfelder/ALFinity\" target=\"_blank\" rel=\"noopener\">Source code</a>"
- [X] T010 [US1] Add the home layout to `css/pages.css`: `.home` fills the screen (`min-height: 100svh` with `100vh` fallback, safe-area padding), centered column; background `var(--bg) url("../images/background.jpg") center / cover no-repeat` with a dark gradient overlay (e.g. `linear-gradient(rgba(5,7,12,.35), rgba(5,7,12,.75))`) so text contrast is at least 4.5 : 1 (FR-008); `h1` large (`clamp(2.5rem, 8vw, 5rem)`), tagline in `--muted`; menu links as `.surface` cards in a single column on phones and a 2 × 2 grid at ≥ 768 px, each at least `var(--tap)` high, with a title and a one-line description; on iPhone landscape (height ≤ 430 px) reduce spacing so all four entries stay visible without scrolling; hover/focus states; respects `prefers-reduced-motion` (no transitions)
- [X] T011 [P] [US1] Background picture: supplied by the owner as a 3840 × 2160 PNG; web copy `images/background.jpg` made in T001
- [X] T012 [US1] Make the explorer's name a link home (research R3): in `js/ui/toolbar.js` replace `<span class="brand surface">ALFinity</span>` with `<a class="brand surface" href="./" aria-label="Home" title="Home"><span aria-hidden="true">‹ </span>ALFinity</a>`; in `css/app.css` give `.brand` `color: inherit; text-decoration: none;` and a `:focus-visible` outline, and inside `@media (max-width: 640px)` change the brand's `pointer-events: none` to `pointer-events: auto` (update the comment: the name is now a link; gestures elsewhere still reach the picture)
- [X] T013 [US1] In `explorer.html` keep everything; only check that the `file:` warning script and all paths still work from the new file name
- [X] T014 [US1] Run `node tests/browser/run.mjs --only=load,pages`; check the screenshots in `tests/browser/output/screens/` for all five devices

**Checkpoint**: Home page and explorer navigation work (MVP).

---

## Phase 4: User Story 2 - Old links keep working (Priority: P1)

**Goal**: Share links to `./#s=…` and `./index.html#s=…` open the explorer directly with
that picture, online and offline; new links point to `explorer.html`.

**Independent Test**: Open five 1.1-style links (Mandelbrot, Julia, built-in palette,
custom palette, deep zoom) → each shows exactly that picture; Back does not show home.

### Tests for User Story 2

- [X] T015 [US2] Add to `tests/browser/suites/pages.mjs` (desktop): build five share links in the page with `import("./js/settings.js")` → `encodeShareLink(setting, palette)` for (a) default Mandelbrot zoomed (`view.width = 0.8`), (b) Julia `c = −0.8 + 0.156i`, (c) palette `"fire"`, (d) a custom palette `{ id: "custom-test", stops: ["#000000", "#ff0000", "#ffff00"] }`, (e) deep zoom `view.width = 1e-9`; open each as `"#s=…"` (old main address) and as `"index.html#s=…"`; check that `location.pathname` ends with `explorer.html`, `location.hash === ""` and the app's current setting equals the encoded one (type, view, palette id and stops, using the same helper as `panels.mjs`, `page.setting()`); then `history.back()` must not land on the home page with a fragment (`location.hash` never starts with `#s=` on `index.html`). Also check that the explorer's "Copy link" produces a link containing `explorer.html#s=`

### Implementation for User Story 2

- [X] T016 [US2] Verify the forwarding script from T009 handles `?nosw` and `?debug=compare` (passes `location.search` on) and ignores other fragments; adjust `index.html` only if T015 fails
- [X] T017 [US2] Update `specs/001-fractal-explorer/contracts/share-link.md`: the URL form becomes `https://<host>/<path>/explorer.html#s=…`, with one sentence that links to the main address are forwarded ([contracts/pages.md](contracts/pages.md))
- [X] T018 [US2] Run `node tests/browser/run.mjs --only=panels,pages`

**Checkpoint**: All share links, old and new, open the right picture.

---

## Phase 5: User Story 3 - Learn what fractals are (Priority: P2)

**Goal**: An introduction page in plain language with optional formulas, pictures,
explorer examples and Wikipedia links (FR-009 – FR-012, resolves issue #1).

**Independent Test**: Open *Introduction*: sections on fractals, Mandelbrot, Julia,
colors; math boxes are optional; at least two "See it in the explorer" links open the
described picture.

### Tests for User Story 3

- [X] T019 [US3] Add to `tests/browser/suites/pages.mjs`: on every device open `introduction.html?nosw` → no horizontal scrolling, all images loaded (`img.complete && img.naturalWidth > 0`), screenshot; on desktop collect every `a[href^="explorer.html#s="]` (expect ≥ 2) and decode each with `decodeShareLink(hash, ["ocean", …builtin ids])` from `js/settings.js` → not null; every external link (`a[href^="http"]`) has `target="_blank"` and `rel` containing `noopener`; there are links to `en.wikipedia.org/wiki/Fractal`, `…/Mandelbrot_set` and `…/Julia_set`

### Implementation for User Story 3

- [X] T020 [P] [US3] Create four pictures with ALFinity's **Save image** (custom 1600 × 1000), convert to JPEG quality ~80 (< 250 KB each) in `images/` (research R9): `intro-mandelbrot.jpg` (whole set, default view), `intro-minibrot.jpg` (a zoomed detail showing a small copy of the set, e.g. near `−1.7549 + 0i`), `intro-julia-connected.jpg` (`c = −0.8 + 0.156i`), `intro-julia-dust.jpg` (`c` just outside the set, e.g. `0.3 + 0.5i`). For each, copy the explorer's share link (**Favorites → Copy link**) and keep it for T021
- [X] T021 [US3] Create `introduction.html` (same `<head>` pattern as `index.html` without the forwarding script; title "Introduction – ALFinity"; `css/app.css`, `css/pages.css`, `js/site.js`), with the page header from T002, the footer menu, and these sections in plain English, short paragraphs, no jargon without explanation (outline in plan.md, Implementation Notes): **What is a fractal?** (shapes whose small parts look like the whole; endless detail; examples coastlines, ferns, Romanesco); **The Mandelbrot set** (every point of the picture is a number *c*; start at 0, square, add *c*, repeat; if the result stays small forever the point is black, otherwise it runs away) with `<aside class="math">` "The math (optional)": z₀ = 0, zₙ₊₁ = zₙ² + c, a point escapes once |zₙ| > 2, complex numbers in one sentence; picture `intro-mandelbrot.jpg` + "See it in the explorer"; **Zooming in** (small copies of the whole set appear again and again) with `intro-minibrot.jpg` + explorer link; **Julia sets** (same rule, but *c* stays fixed and the starting point changes; every *c* gives a different shape; *c* inside the Mandelbrot set → one connected shape, outside → scattered dust; ALFinity's Shape panel picks *c* on a small map) with math box (c fixed, z₀ = the point) and `intro-julia-connected.jpg`, `intro-julia-dust.jpg` + explorer links; **What do the colors mean?** (how many steps until a point runs away; black = never; smooth vs. banded colors; palettes are an artistic choice, not math); **Read more** (Wikipedia: Fractal, Mandelbrot set, Julia set; `target="_blank" rel="noopener"`). Every `<img>` has `alt`, `width`, `height` and `loading="lazy"` (except the first). Example links use the share links from T020 as `explorer.html#s=…`, each with an HTML comment naming the view (research R8)
- [X] T022 [US3] Run `node tests/browser/run.mjs --only=pages`; read the page on the iPhone screenshot for readability

**Checkpoint**: Introduction complete; issue #1 can be closed by the PR.

---

## Phase 6: User Story 4 - See who and what made ALFinity possible (Priority: P3)

**Goal**: Credits page with mathematicians, tools and sources (FR-013).

**Independent Test**: Open *Credits*: three groups; every entry has a short note; every
external link opens in a new tab.

- [X] T023 [P] [US4] Create `credits.html` (same head/header/footer pattern as T021; title "Credits – ALFinity") with three sections, each entry a name, one or two sentences and a link (Wikipedia or official site, `target="_blank" rel="noopener"`): **Mathematicians** — Gaston Julia (1893–1978) and Pierre Fatou (1878–1929): studied what happens when a function is repeated on complex numbers (1917–1920), the basis of Julia sets; Benoît B. Mandelbrot (1924–2010): coined "fractal" (1975), made the first computer pictures of the set at IBM (1980) and showed fractals in nature; Adrien Douady (1935–2006) and John H. Hubbard (born 1945): named the Mandelbrot set and proved it is connected (1982) · **Tools** — GitHub Spec Kit (spec-driven development; https://github.com/github/spec-kit), Claude Code with Claude by Anthropic (https://www.anthropic.com/claude-code), GitHub Pages (hosting) · **Sources** — the Wikipedia articles on Fractal, Mandelbrot set and Julia set used for the introduction. Double-check every date and claim against the linked Wikipedia article while writing
- [X] T024 [US4] Add to `tests/browser/suites/pages.mjs`: `credits.html?nosw` on every device → no horizontal scrolling, screenshot; on desktop: three `section` elements with headings "Mathematicians", "Tools", "Sources"; every external link has `target="_blank"` and `rel` with `noopener`

**Checkpoint**: Credits page complete.

---

## Phase 7: User Story 5 - Get to know the author (Priority: P3)

**Goal**: *About me* page with the profile structure and marked placeholders (FR-014).

**Independent Test**: Open *About me*: name, bio area, photo and links places; every
placeholder visibly labelled "Placeholder".

- [X] T025 [P] [US5] Create `about-me.html` (same pattern; title "About me – ALFinity") per [data-model.md](data-model.md) Profile: `<h1>Armin Leinfelder</h1>`; a photo place as `<div class="placeholder photo" role="img" aria-label="Photo placeholder">` (square, max 12rem; later replaced by `<img src="images/about-me.jpg">`); a bio `<p class="placeholder">` with neutral filler such as "A few sentences about me will follow here."; a links list `<ul class="placeholder">` with "LinkedIn / website / e-mail — to follow"; and a non-placeholder line linking to the GitHub repository. Add an HTML comment at the top of `<main>` explaining how to replace the placeholders (remove `class="placeholder"`, put the photo at `images/about-me.jpg` and add it to `sw.js`)
- [X] T026 [US5] Add to `tests/browser/suites/pages.mjs`: `about-me.html?nosw` on every device → no horizontal scrolling, screenshot; on desktop: at least one `.placeholder` exists and each shows the "Placeholder" label (`getComputedStyle(el, "::before").content` contains "Placeholder")

**Checkpoint**: About me ready for the owner's text.

---

## Phase 8: User Story 6 - Invitation in the README (Priority: P3)

**Goal**: A "try it" link right below the README banner (FR-020).

**Independent Test**: On GitHub, the invitation is visible right below the banner and
opens https://arminleinfelder.github.io/ALFinity/.

- [X] T027 [P] [US6] In `README.md`, directly after the banner image add a line such as `**[▶ Try ALFinity in your browser](https://arminleinfelder.github.io/ALFinity/)** — no installation needed, works on phone, tablet and desktop.`

**Checkpoint**: README invites visitors.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Offline, deploy, every-page navigation checks, docs, version.

- [X] T028 Add to `tests/browser/suites/pages.mjs` (desktop): from each info page, the header "‹ ALFinity" link opens the home page and "Open the explorer" opens `explorer.html`; the footer menu on each info page has all five entries and marks the current page with `aria-current="page"` (FR-003, SC-001)
- [X] T029 In `sw.js`, add every new file to `FILES` in alphabetical order within its group: `about-me.html`, `credits.html`, `introduction.html`, `css/pages.css`, `js/site.js`, `images/background.jpg`, `images/intro-julia-connected.jpg`, `images/intro-julia-dust.jpg`, `images/intro-mandelbrot.jpg`, `images/intro-minibrot.jpg` (CACHE stays `alfinity-v4`, already bumped in T006)
- [X] T030 In `tests/browser/suites/offline.mjs`, register the service worker from the **home page** (`page.open("")`) instead of the explorer, and with the server stopped also open `""`, `introduction.html`, `credits.html`, `about-me.html` and `explorer.html`, checking each page's `document.title` and that the home menu / explorer toolbar is present (FR-016, SC-007)
- [X] T031 In `.github/workflows/pages.yml`, change the copy step to `cp -R *.html manifest.webmanifest sw.js css js icons _site/` plus `mkdir _site/images && cp images/*.jpg _site/images/` (only the pictures the pages and README use) and update the header comment
- [X] T032 [P] In `js/version.js`, set `VERSION = "1.2.0"` and `RELEASE_DATE` to the release day (FR-021)
- [X] T033 [P] Update `README.md`: "Run it" mentions the home page and that the explorer is at `explorer.html`; a short "Pages" list (Home, Introduction, Explorer, Credits, About me); developer note on replacing `images/background.jpg` (quickstart.md, "Replacing the background picture"); "Project documents" links both `specs/001-fractal-explorer` and `specs/002-home-and-info-pages`; browser-test list mentions the new `pages` suite
- [X] T034 Run the full suite `node --test "tests/*.test.js"` and `node tests/browser/run.mjs`; all checks pass
- [ ] T035 Walk through [quickstart.md](quickstart.md) manual checks 1–13 at phone, tablet and 4K desktop sizes (Constitution, Development Workflow); note anything that needs real-device Safari for the owner
- [ ] T036 Ask the owner to review the introduction and credits texts, then mark all tasks done in this file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: After Setup — BLOCKS all user stories (the main address must be free)
- **US1 (Phase 3)**: After Foundational
- **US2 (Phase 4)**: After US1's T009 (the forwarding script lives in the new `index.html`)
- **US3–US5 (Phases 5–7)**: After Foundational; independent of each other; they reuse the page pattern from T002/T003; the "‹ ALFinity" link targets the home page from US1
- **US6 (Phase 8)**: No dependencies; can be done any time
- **Polish (Phase 9)**: After all stories (T029 needs every new file)

### Within Each Phase

- Tests are written alongside the story's page and must pass at the story's last task
- Pictures (T011, T020) before the pages that show them are checked visually
- T021 needs the share links from T020

### Parallel Opportunities

- Setup: T002, T003
- US1: T008, T011 alongside T009/T010
- US3–US6 pages: T020, T023, T025, T027 in parallel (different files)
- Polish: T032, T033

---

## Parallel Example: Info pages

```bash
Task: "Create images/intro-*.jpg with Save image (T020)"
Task: "Create credits.html (T023)"
Task: "Create about-me.html (T025)"
Task: "Add the try-it link to README.md (T027)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phases 1–2: move the explorer, tests green
2. Phase 3 (US1): home page, brand link → **check on all sizes**
3. Phase 4 (US2): old links verified → nothing that worked before is broken

### Incremental Delivery

4. US3 introduction → US4 credits → US5 about me (placeholders) → US6 README
5. Polish: offline for all pages, deploy workflow, docs, version 1.2.0

Commit after each phase locally; push and open **one** pull request only at the end (owner's
request). Owner input still open: the About me text, photo and links.

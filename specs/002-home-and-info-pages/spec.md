# Feature Specification: Home Page with Menu and Info Pages (Milestone 1.2)

**Feature Branch**: `002-home-and-info-pages`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Milestone 1.2: Home page with menu and info pages. README: add a prominent link to the hosted app on GitHub Pages inviting visitors to try ALFinity themselves. The app gets a new start page (home) with a menu and a full-screen background image (supplied by the owner later; until then a fractal picture rendered by ALFinity). The menu leads to four sub-pages: Introduction (fractal theory: what fractals are, the recursive formulas of the Mandelbrot and Julia sets, what the colors mean, links to Wikipedia; resolves issue #1), Explorer (the existing app, unchanged in function), Credits (mathematicians, tools such as GitHub Spec Kit and Claude Code, other sources), About me (the owner's personal profile; text supplied later, placeholder until then). All new pages in English. The explorer's About panel stays; the explorer gets a way back to the home page. Existing share links and home-screen shortcuts must keep working. New pages work offline and look good on iPhone, iPad, MacBook and 4K. Plain HTML/CSS/JS, no dependencies. Version 1.2.0."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on a welcoming home page and reach the explorer (Priority: P1)

A visitor opens ALFinity and sees a full-screen fractal picture as background with the
app name, a one-line tagline and a short menu: *Introduction*, *Explorer*, *Credits*,
*About me*. Choosing *Explorer* opens the fractal explorer they know from version 1.1,
working exactly as before. From the explorer they can get back to the home page at any
time.

**Why this priority**: The home page and the path to the explorer are the frame every
other page hangs on. Without it the info pages cannot be reached, and the explorer must
stay as easy to reach as before.

**Independent Test**: Open the app address on a phone, a tablet and a desktop; the home
page appears with background and menu; choose *Explorer*, zoom around, then go back to
the home page and open the explorer again.

**Acceptance Scenarios**:

1. **Given** a visitor opens the app address, **When** the page has loaded, **Then** the
   home page shows the background picture, the app name, a tagline and the four menu
   entries, all visible without scrolling on a phone in portrait.
2. **Given** the home page, **When** the visitor chooses *Explorer*, **Then** the
   fractal explorer opens and behaves as in version 1.1 (same view, controls, panels,
   favorites and colors as last time).
3. **Given** the explorer, **When** the visitor uses the "Home" control, **Then** the
   home page is shown, and returning to the explorer restores the last view.
4. **Given** the explorer is open, **When** the visitor opens the About panel, **Then**
   it still shows purpose, author, source code link and version (now 1.2.0).

---

### User Story 2 - Old links keep working (Priority: P1)

Someone opens a picture link that was shared with version 1.1 (or later), or launches
ALFinity from the iPhone/iPad home screen. The picture from the link opens in the
explorer directly, without a detour; nothing that worked before is broken.

**Why this priority**: Share links are already out in the world and favorites are a core
promise of the app (Constitution V). Breaking them would lose people's work.

**Independent Test**: Create a share link with version 1.1, update to 1.2, open the link:
the explorer shows exactly that picture. Launch the home-screen app: the home page
opens.

**Acceptance Scenarios**:

1. **Given** a share link created with version 1.1, **When** it is opened with version
   1.2, **Then** the explorer opens directly with exactly that picture (shape, view,
   colors).
2. **Given** a share link created with version 1.2, **When** it is opened, **Then** the
   same happens.
3. **Given** ALFinity was added to the home screen with version 1.1, **When** it is
   launched after the update, **Then** the home page opens without an error.

---

### User Story 3 - Learn what fractals are (Priority: P2)

A curious visitor chooses *Introduction* and reads, in plain language, what a fractal
is, how the Mandelbrot set and Julia sets come from repeating one simple calculation, and
what the colors in the pictures mean. Readers who like math can look at the formulas;
others can skip them and still understand the idea. Example pictures illustrate the
text, and links let the reader see a described shape live in the explorer or read more
on Wikipedia.

**Why this priority**: It answers issue #1 and turns ALFinity from a toy into something
that also explains what you are looking at, but the explorer is usable without it.

**Independent Test**: Give the page to someone without a math background; afterwards
they can say in their own words what the black area and the colors mean, and they can
open at least one example from the page in the explorer.

**Acceptance Scenarios**:

1. **Given** the home page, **When** the visitor chooses *Introduction*, **Then** the
   introduction page opens with sections on fractals in general, the Mandelbrot set,
   Julia sets and the meaning of the colors.
2. **Given** the introduction, **When** the visitor reads the Mandelbrot section,
   **Then** it explains the rule "start at 0, repeatedly square and add c" and that a
   point belongs to the set when the numbers never run away.
3. **Given** the introduction, **When** the visitor reads the Julia section, **Then** it
   explains that c is fixed and the starting point varies, and how each point of the
   Mandelbrot set relates to a connected Julia set.
4. **Given** the introduction, **When** the visitor follows a "see it in the explorer"
   link, **Then** the explorer opens showing that example.
5. **Given** a formula block, **When** the visitor is not interested in math, **Then**
   the surrounding plain-language text is understandable without it.

---

### User Story 4 - See who and what made ALFinity possible (Priority: P3)

A visitor chooses *Credits* and finds the mathematicians behind the fractals (such as
Gaston Julia, Pierre Fatou and Benoît Mandelbrot), the tools used to build the app (GitHub
Spec Kit, Claude Code with Claude by Anthropic) and the sources used, each with a short
note and a link where available.

**Why this priority**: Giving credit is right and part of the learning-project story,
but it adds no function.

**Independent Test**: Open *Credits*; every listed person or tool has a one- or
two-sentence note, and every external link opens the right page in a new tab.

**Acceptance Scenarios**:

1. **Given** the home page, **When** the visitor chooses *Credits*, **Then** the credits
   page lists mathematicians, tools and sources in separate groups.
2. **Given** the credits page, **When** the visitor follows an external link, **Then**
   it opens in a new tab and ALFinity stays open.

---

### User Story 5 - Get to know the author (Priority: P3)

A visitor chooses *About me* and finds the owner's personal profile. Until the owner
supplies the text, the page shows clearly marked placeholder content so the structure
(name, short bio, optional photo, optional links) can be reviewed.

**Why this priority**: Personal and valuable for the owner, but the content is not yet
available and the app works without it.

**Independent Test**: Open *About me*; the page shows the profile layout; placeholder
text is visibly marked as such; replacing it needs only a text edit.

**Acceptance Scenarios**:

1. **Given** the home page, **When** the visitor chooses *About me*, **Then** the profile
   page opens showing the author's name and a short bio area.
2. **Given** the owner has not yet supplied text, **When** the page is viewed, **Then**
   every placeholder is visibly marked as placeholder.

---

### User Story 6 - Invitation in the README (Priority: P3)

A person browsing the GitHub repository sees right at the top of the README a clear
invitation with a link to try ALFinity in their browser, without installing anything.

**Why this priority**: Small, independent and quick, but it lets repository visitors
become users.

**Independent Test**: Open the repository page on GitHub; the invitation link is visible
without scrolling past the banner and opens the hosted app.

**Acceptance Scenarios**:

1. **Given** the repository page on GitHub, **When** it is viewed, **Then** an
   invitation such as "Try ALFinity in your browser" with the hosted address appears
   directly below the title or banner.
2. **Given** the invitation, **When** it is followed, **Then** the hosted ALFinity home
   page opens.

---

### Edge Cases

- A share link is opened while offline: the explorer still opens with the picture
  (as in version 1.1).
- The background picture fails to load or is slow: the home page shows a dark background
  in the app's colors and the menu is fully usable immediately.
- The browser does not support the explorer's graphics: the home page and info pages
  still work; only the explorer shows the existing "not supported" message.
- The visitor uses the browser's Back button: it moves between home, info pages and
  explorer in the expected order; leaving the explorer and coming back keeps the view.
- A user's device still holds the offline copy of version 1.1: after the update the new
  pages appear on the next visit and old and new files are never mixed.
- Very large screens (4K) and very small phones (portrait and landscape): text stays
  readable (limited line length), the menu is never cut off and there is no horizontal
  scrolling.
- The owner replaces the background picture later: no other change is needed.
- Visitors who prefer reduced motion see no animated effects.

## Clarifications

### Session 2026-10-25

- Q: Where does a launch from the iPhone/iPad home screen open? → A: The home page,
  the same as in the browser (FR-005).

## Requirements *(mandatory)*

### Functional Requirements

**Home page and navigation**

- **FR-001**: Opening the app address MUST show the home page with a full-screen
  background picture, the app name, a one-line tagline and a menu with exactly these
  entries in this order: *Introduction*, *Explorer*, *Credits*, *About me*.
- **FR-002**: The menu MUST be operable by touch, mouse and keyboard, with touch targets
  of at least 44 × 44 points and a visible keyboard focus.
- **FR-003**: Every info page (*Introduction*, *Credits*, *About me*) MUST offer a way
  back to the home page and a way to open the explorer directly.
- **FR-004**: The explorer MUST offer a "Home" control that returns to the home page;
  the explorer's own controls, panels and behavior MUST otherwise be unchanged.
- **FR-005**: Launching ALFinity from the iPhone/iPad home screen MUST open the home
  page, the same as opening the app address in the browser; shortcuts created with
  version 1.1 MUST keep working and also open the home page.
- **FR-006**: A share link (from version 1.1 or later) MUST open the explorer directly
  with exactly the shared picture, both online and offline.
- **FR-007**: Until the owner supplies a background picture, the home page MUST use a
  fractal picture made with ALFinity; swapping the picture MUST require replacing only
  one image file.
- **FR-008**: The background picture MUST look sharp and fill the screen on every
  supported device without distorting, and text on top of it MUST stay readable
  (sufficient contrast).

**Introduction**

- **FR-009**: The introduction MUST explain, in plain language: what a fractal is
  (self-similarity, endless detail), how the Mandelbrot set is made, how Julia sets are
  made, how the two relate, and what the colors in the pictures mean (how quickly a
  point runs away).
- **FR-010**: The introduction MUST show the formulas of the Mandelbrot set
  (z₀ = 0, zₙ₊₁ = zₙ² + c) and of Julia sets (c fixed, z₀ = the point) in a form that is
  clearly optional to read; the text around them MUST be understandable without them.
- **FR-011**: The introduction MUST contain example pictures and at least two links that
  open the described shape in the explorer.
- **FR-012**: The introduction MUST link to the Wikipedia articles on fractals, the
  Mandelbrot set and Julia sets.

**Credits**

- **FR-013**: The credits page MUST list, in separate groups: the mathematicians (at
  least Gaston Julia, Pierre Fatou, Benoît Mandelbrot, and Adrien Douady and John H.
  Hubbard who named and studied the Mandelbrot set), the tools (GitHub Spec Kit, Claude
  Code and Claude by Anthropic) and the sources used for the texts; each entry has a
  short note and a link where one exists.

**About me**

- **FR-014**: The *About me* page MUST provide places for the author's name, a short
  bio, an optional photo and optional links; until the owner supplies content, every
  placeholder MUST be visibly marked as placeholder.

**All new pages**

- **FR-015**: All new pages MUST be in English and match the explorer's look (dark
  theme, same type and colors).
- **FR-016**: All new pages MUST work offline once ALFinity has been loaded over HTTPS or
  localhost, like the explorer.
- **FR-017**: All new pages MUST be usable and look polished on iPhone, iPad, MacBook and
  4K screens, in portrait and landscape, without horizontal scrolling; body text MUST
  keep a comfortable line length on wide screens.
- **FR-018**: External links MUST open in a new tab; no page MAY send data anywhere or
  load anything from other servers.
- **FR-019**: Each page MUST have its own title so visitors can tell browser tabs apart.

**README and version**

- **FR-020**: The README MUST show, directly below the title or banner, an invitation to
  try ALFinity with a link to https://arminleinfelder.github.io/ALFinity/.
- **FR-021**: The app version MUST be 1.2.0 with the release date, shown in the
  explorer's About panel.

### Key Entities

- **Page**: one of Home, Introduction, Explorer, Credits, About me; has a title and a
  place in the menu.
- **Background picture**: one image file shown behind the home page; replaceable by the
  owner.
- **Explorer example link**: a link from the introduction that opens a specific picture
  (shape, view, colors) in the explorer, using the existing share-link format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the home page, every sub-page is reachable with one tap or click, and
  the home page is reachable from every sub-page with one tap or click.
- **SC-002**: The home page menu is usable within 1 second of opening the app on a
  current iPhone over a normal connection, even before the background picture has fully
  loaded.
- **SC-003**: 100% of share links created with version 1.1 open the same picture in
  version 1.2 (verified with a set of at least five stored links covering Mandelbrot,
  Julia, built-in and custom palettes).
- **SC-004**: All existing automated tests of the explorer pass unchanged, apart from
  the explorer's new address.
- **SC-005**: After reading the introduction, a person without a math background can
  correctly explain what the black area and the colors of a Mandelbrot picture mean.
- **SC-006**: All pages pass a check on phone, tablet and 4K desktop sizes with no
  horizontal scrolling, no clipped text and no overlapping controls.
- **SC-007**: With the network turned off after one visit, all five pages open.

## Assumptions

- The explorer gets its own address; the home page takes over the app's main address.
  This is the only way the home page can be "the start page" while the explorer stays
  unchanged.
- The explorer's remembered last view (already stored on the device) is what "restores
  the last view" means; nothing new is stored.
- Example pictures in the introduction may reuse the existing README pictures (folder `images/`, formerly `docs/`)
  or new ones made with ALFinity; no external images are used.
- Introduction and credits texts are drafted for the owner, who reviews them before the
  release.
- Formulas are shown as readable text with simple formatting; no math typesetting
  library is added (Constitution I).
- The About panel inside the explorer keeps its current content; only the version
  changes.
- Rotation (issue #2) is not part of this milestone.

# Feature Specification: ALFinity Fractal Explorer

**Feature Branch**: `001-fractal-explorer`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "ALFinity: a browser-based fractal explorer for non-mathematicians. Users create fractal pictures such as the Mandelbrot set and Julia sets. It runs in the browser and is responsive, looking good on iPhone, iPad, and a MacBook / Chrome on a 4K monitor. Users can zoom and pan to explore, configure the fractal very easily without math knowledge, experiment with color palettes and color settings, and save nice settings (fractal, view, colors) under a name for later reuse. Rendering should feel fast."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore the Mandelbrot set by zooming and panning (Priority: P1)

A visitor opens ALFinity and immediately sees a colorful, full-screen picture of the
Mandelbrot set. Without reading anything, they tap, pinch, drag, click or scroll to zoom
into interesting regions and move around. The picture quickly shows a rough version of
each new view and then sharpens. A "reset view" action brings them back to the start.

**Why this priority**: This is the core experience. On its own it is already a usable,
enjoyable fractal explorer.

**Independent Test**: Open the app on a phone, a tablet and a desktop; with no setup,
zoom into a region at least 1,000× and pan around, then reset the view.

**Acceptance Scenarios**:

1. **Given** the app is opened for the first time, **When** it finishes loading, **Then**
   a colored Mandelbrot picture fills the available screen area with no configuration.
2. **Given** a picture is shown on a touch device, **When** the user pinches outward on a
   region, **Then** the view zooms into that region, centered on the fingers.
3. **Given** a picture is shown on a desktop, **When** the user scrolls the wheel or
   trackpad over a point, **Then** the view zooms in or out around that point.
4. **Given** any view, **When** the user drags, **Then** the picture moves with the pointer
   or finger.
5. **Given** any zoomed view, **When** the user chooses "Reset view", **Then** the initial
   full view is restored.
6. **Given** a new view is requested, **When** rendering is in progress, **Then** the
   controls stay responsive and a preview appears before the full-quality picture.

---

### User Story 2 - Play with colors (Priority: P2)

The user opens a color panel and picks from a gallery of named palettes (e.g. "Fire",
"Ocean", "Rainbow"). They adjust simple sliders such as color shift, color density
(how quickly colors repeat) and smoothness, and choose the color of the inner region.
Changes appear immediately on the current picture.

**Why this priority**: Coloring is what turns a fractal into a beautiful picture and is a
main reason the user wants the app.

**Independent Test**: On any view, switch between at least five palettes and move each
color slider; each change visibly updates the picture without recomputing the shape
from scratch.

**Acceptance Scenarios**:

1. **Given** a rendered picture, **When** the user selects a different palette, **Then** the
   picture re-colors within a moment while keeping the same view.
2. **Given** the color panel, **When** the user moves the color shift slider, **Then** the
   colors cycle smoothly in real time.
3. **Given** the color panel, **When** the user creates a custom palette by choosing a few
   colors, **Then** the picture uses a smooth blend of those colors.
4. **Given** any color changes, **When** the user chooses "Reset colors", **Then** the
   default coloring returns.

---

### User Story 3 - Save and reuse favorite settings (Priority: P3)

When the user finds a picture they like, they tap "Save", give it a name and later find it
in a "My favorites" list with a small thumbnail. Opening a favorite restores exactly the
same fractal, view and colors. Favorites can be renamed and deleted, and exported to a
file and imported on another device.

**Why this priority**: Finding a beautiful view takes effort; keeping it makes the app
worth coming back to. It depends on Stories 1 and 2 having something worth saving.

**Independent Test**: Save three favorites, close and reopen the browser, reopen each and
compare with the saved thumbnail; export them, import on a second device and confirm they
look the same.

**Acceptance Scenarios**:

1. **Given** any picture, **When** the user saves it under a name, **Then** it appears in the
   favorites list with that name and a thumbnail.
2. **Given** a saved favorite, **When** the browser is closed and reopened and the user
   opens the favorite, **Then** the same fractal, view and colors are shown.
3. **Given** a favorite, **When** the user renames or deletes it, **Then** the list updates
   (deletion asks for confirmation).
4. **Given** several favorites, **When** the user exports them, **Then** a single file is
   downloaded; **When** that file is imported elsewhere, **Then** the favorites are added
   without overwriting existing ones with the same name.

---

### User Story 4 - Discover Julia sets without math (Priority: P4)

The user switches to "Julia" mode. Instead of typing complex numbers, they pick a point on
a small Mandelbrot map (or tap a point on the main picture in "pick Julia" mode) and the
matching Julia picture appears. A few named presets ("Dragon", "Spiral", "Snowflake",
etc.) give instant attractive starting points. An optional "Details" section shows the
exact numbers for those who want them.

**Why this priority**: Julia sets greatly widen the variety of pictures, but the app is
valuable without them.

**Independent Test**: Switch to Julia mode, choose three presets, then pick three points on
the map; each produces a distinct Julia picture that can be zoomed, colored and saved.

**Acceptance Scenarios**:

1. **Given** Mandelbrot mode, **When** the user switches to Julia mode, **Then** a Julia
   picture based on a sensible default point is shown.
2. **Given** Julia mode, **When** the user drags the point on the Mandelbrot map, **Then**
   the Julia picture updates continuously (preview quality while dragging).
3. **Given** Julia mode, **When** the user picks a named preset, **Then** the matching
   picture appears.
4. **Given** the "Details" section is opened, **Then** the current point and other
   parameters are shown with one-sentence explanations and can be edited.

---

### User Story 5 - Save the picture as an image (Priority: P5)

The user downloads the current picture as an image file, choosing from simple size options
("Screen", "Wallpaper HD", "4K", or custom), to use as a wallpaper or print.

**Why this priority**: The user wants to *create* pictures; exporting makes them usable
outside the app. It builds on all earlier stories.

**Independent Test**: Export the same view at screen size and at 4K and open both files;
both show the same view and colors, the 4K one with more detail.

**Acceptance Scenarios**:

1. **Given** any picture, **When** the user exports at "Screen" size, **Then** an image file
   of the visible picture is downloaded.
2. **Given** any picture, **When** the user exports at 4K, **Then** progress is shown, the
   app stays usable, and the downloaded image is 3840×2160 with the same framing.

---

### Edge Cases

- The user zooms in so far that numeric precision runs out: the app shows a friendly
  message ("Maximum zoom reached") instead of a blocky or broken picture.
- A deep view looks flat or empty because detail needs more calculation: an
  easy "More detail" control (iteration depth) is offered, with an "Auto" default that
  increases with zoom.
- The device is rotated or the window resized: the picture re-fits, keeping the same
  center and zoom.
- Browser storage is full, unavailable or blocked (e.g. private browsing): the app explains
  that favorites cannot be stored and offers export as a fallback.
- An imported file is invalid or from a newer app version: the app reports what could not be
  imported and imports the rest.
- The user starts a new zoom while a render is still running: the old render is abandoned
  immediately in favor of the new one.
- Very large exports exceed what the device can handle: the app warns and suggests a
  smaller size.

## Requirements *(mandatory)*

### Functional Requirements

**Viewing and navigation**

- **FR-001**: The app MUST show an attractive Mandelbrot picture on first load with no
  configuration.
- **FR-002**: Users MUST be able to zoom with pinch, mouse wheel/trackpad, double-tap /
  double-click, and on-screen zoom buttons, centered on the indicated point.
- **FR-003**: Users MUST be able to pan by dragging with touch or mouse.
- **FR-004**: Users MUST be able to reset the view to the initial framing.
- **FR-005**: The app MUST provide undo and redo for view and setting changes (at least the
  last 50 steps).
- **FR-006**: The picture MUST use the full pixel density of the screen, so it looks sharp
  on high-resolution phone, tablet and 4K displays.
- **FR-007**: The layout MUST adapt to portrait phones, tablets and large desktop screens;
  on small screens controls collapse into panels that do not permanently cover the
  picture.

**Fractal configuration**

- **FR-008**: The app MUST offer exactly two fractal types: Mandelbrot and Julia. Other
  types (Burning Ship, Tricorn, Multibrot, Newton, …) are out of scope for this version.
- **FR-009**: In Julia mode, users MUST be able to choose the Julia shape by picking a point
  on a Mandelbrot map and from named presets, without typing numbers.
- **FR-010**: The app MUST provide a "detail" setting with an "Auto" default that adapts to
  zoom depth, plus a simple manual slider.
- **FR-011**: All mathematical parameters MUST be optional, shown in a collapsible
  "Details" area with one-sentence plain-language explanations.
- **FR-012**: Zooming MUST work cleanly up to the limit of standard number precision,
  about 1–10 trillion times depending on screen size (more pixels across means a lower
  limit); beyond that the app MUST stop zooming and show a friendly
  "Maximum zoom reached" message. Unlimited deep zoom is out of scope.

**Coloring**

- **FR-013**: The app MUST provide a gallery of at least 10 named, preview-thumbnailed color
  palettes.
- **FR-014**: Users MUST be able to adjust color shift, color density and smooth vs.
  banded coloring, and choose the inner-region color, with live updates.
- **FR-015**: Users MUST be able to create a custom palette from 2–8 chosen colors and keep
  it for reuse.
- **FR-016**: Changing colors MUST NOT require recomputing the fractal shape; recoloring the
  current view MUST feel immediate.

**Saving and reuse**

- **FR-017**: Users MUST be able to save the complete current setting (fractal type and
  parameters, view, detail level and coloring) as a named favorite with a thumbnail.
- **FR-018**: Users MUST be able to list, open, rename and delete favorites; deletion
  requires confirmation.
- **FR-019**: Favorites MUST persist on the device across browser restarts.
- **FR-020**: Users MUST be able to export all or selected favorites to a single file and
  import such a file, without overwriting existing favorites.
- **FR-021**: The app SHOULD restore the last viewed setting when reopened.
- **FR-022**: Users SHOULD be able to share a setting as a link that opens the same picture.

**Image export**

- **FR-023**: Users MUST be able to download the current picture as an image at screen size,
  common presets (HD, 4K) or a custom size up to at least 7680×4320, keeping the framing.

**Performance and feedback**

- **FR-024**: The interface MUST stay responsive during rendering; new interactions
  cancel outdated renders.
- **FR-025**: The app MUST show a quick preview of each new view, then refine it to full
  quality, and indicate when rendering is in progress.

**Privacy**

- **FR-026**: The app MUST work without an account and MUST NOT send any user data off the
  device.

### Key Entities

- **Fractal Setting**: a complete, reproducible description of a picture: fractal type,
  type-specific parameters (e.g. the Julia point), view (center and zoom), detail
  level and color setting.
- **Color Setting**: palette reference or custom colors, color shift, color density,
  smoothing mode and inner-region color.
- **Palette**: a named ordered list of colors; built-in or user-created.
- **Favorite**: a named Fractal Setting with a thumbnail and creation/modified dates.
- **Favorites File**: an exported collection of favorites and custom palettes, with a
  format version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user sees a complete colored picture within 2 seconds of opening
  the app on a recent iPhone, iPad or MacBook.
- **SC-002**: After any zoom or pan, a preview of the new view appears within 0.2 seconds
  and the full-quality picture within 2 seconds at typical zoom depths on a recent laptop.
- **SC-003**: Changing a palette or color slider updates the picture in under 0.1 seconds,
  so it feels instant.
- **SC-004**: 9 of 10 first-time users without a math background can zoom into a region,
  change the colors and save a favorite within 3 minutes, without help.
- **SC-005**: A reopened favorite matches its saved thumbnail exactly (same framing and
  colors) on the same device and on another device after export/import.
- **SC-006**: On iPhone, iPad and a 4K desktop screen, all controls are reachable without
  horizontal scrolling and the picture shows no visible pixelation at native resolution.
- **SC-007**: The interface never stops responding to touches or clicks for more than
  0.1 seconds, including during 4K image export.

## Assumptions

- Target browsers are current Safari on iPhone/iPad and current Safari and Chrome on macOS;
  older browsers are not supported.
- A single user per device; no accounts, cloud sync or multi-user sharing (moving favorites
  between devices happens via export/import files or links).
- The interface language is English for the first version.
- "Fast" is judged on recent devices (roughly the last 4 years); older devices may be
  slower but must remain usable.
- Built-in palettes and Julia presets are curated by the project and are not user-editable
  (users create their own custom palettes instead).
- View rotation, animations, video export
  and 3D fractals are out of scope for this version.

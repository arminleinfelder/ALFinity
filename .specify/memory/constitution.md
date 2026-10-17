# ALFinity Constitution

## Core Principles

### I. Plain Web Stack

- ALFinity MUST be built with plain HTML, vanilla JavaScript (ES modules allowed) and CSS.
- No framework, library, build tool or package manager dependency MAY be added without the
  project owner's explicit approval.
- Every proposed dependency MUST come with a written explanation: what it does, why plain
  code is insufficient, its size/maintenance cost, and the alternative without it.
- Browser-native APIs (Canvas, Web Workers, OffscreenCanvas, WebGL, localStorage,
  IndexedDB) are part of the platform and are not considered dependencies.

**Rationale**: The code must stay readable and maintainable by one person, run without a
build step, and avoid dependency churn.

### II. Responsive on Every Screen

- The app MUST be usable and visually polished on iPhone, iPad, and desktop Chrome on a
  MacBook and on a 4K external monitor.
- Layouts MUST adapt from small portrait phones to large landscape displays without
  horizontal scrolling or clipped controls.
- Input MUST work with touch (tap, pinch-zoom, drag) and with mouse/trackpad (click,
  wheel, drag).
- Rendered images MUST honor `devicePixelRatio` so fractals look sharp on Retina and 4K
  displays.

**Rationale**: The owner uses all these devices; a fractal explorer that looks blurry or
cramped on any of them fails its purpose.

### III. Approachable for Non-Mathematicians

- Every setting MUST have a plain-language label and a sensible default; the app MUST
  produce an attractive image on first load with zero configuration.
- Controls MUST favor direct manipulation (sliders, color pickers, presets, click-to-zoom)
  over typing numbers.
- Mathematical parameters (e.g. complex constants, iteration counts, escape radius) MAY be
  exposed, but MUST be optional, explained in one sentence, and hideable.
- Any change a user makes MUST be undoable or easily reset to defaults.

**Rationale**: The target user wants beautiful pictures, not a math lesson.

### IV. Performance-Conscious Rendering

- Rendering MUST NOT freeze the user interface; long computations MUST run off the main
  thread or in yielding chunks.
- The app MUST give fast visual feedback (e.g. a low-resolution preview first, then
  refinement).
- When a meaningful speed-up exists (Web Workers, progressive rendering, WebGL shaders,
  OffscreenCanvas, caching), it MUST be proposed to the owner with its trade-offs before
  adoption, and it MUST respect Principle I.

**Rationale**: Exploring fractals means constant re-rendering; sluggishness kills
exploration.

### V. Explore and Keep

- Users MUST be able to experiment freely with fractal type, position, zoom and colors.
- Users MUST be able to save a complete setting (fractal, view and coloring) under a name,
  and later reload, rename or delete it.
- Saved settings MUST persist in the browser across sessions and SHOULD be exportable and
  importable as a file so they can move between devices.

**Rationale**: Finding a beautiful view takes effort; it must never be lost.

### VI. Simplicity (YAGNI)

- Build only what a current specification requires; no speculative features or
  abstractions.
- Prefer a small number of clear files over deep module hierarchies.
- Any added complexity MUST be justified in the plan's Complexity Tracking section.

**Rationale**: A small, simple codebase is easier to understand, change and keep fast.

## Technical Constraints

- The app MUST run as static files opened from a simple local or static web server; no
  backend is required.
- Target browsers: current Safari on iOS/iPadOS, current Safari and Chrome on macOS.
- No user data leaves the device; storage is local to the browser.
- The app SHOULD work offline once loaded.

## Development Workflow

- Features follow the Spec Kit flow: specify → (clarify) → plan → tasks → implement.
- Each plan MUST include a Constitution Check against Principles I–VI.
- Each feature MUST be verified manually on a phone-sized viewport, a tablet-sized viewport
  and a large desktop viewport before it is considered done.
- Pure computation logic (fractal math, color mapping, settings serialization) SHOULD have
  lightweight tests runnable in the browser or with Node, without adding dependencies.

## Governance

- This constitution supersedes other practices for ALFinity. Plans and reviews MUST verify
  compliance; deviations MUST be documented and approved by the project owner.
- Amendments are made via `/speckit-constitution`, recorded with a version bump:
  MAJOR for removing or redefining a principle, MINOR for adding or materially expanding
  one, PATCH for wording clarifications.
- The project owner is the final authority on dependency approvals (Principle I) and
  performance trade-offs (Principle IV).

**Version**: 1.0.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-17

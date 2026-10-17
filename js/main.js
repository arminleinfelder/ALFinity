// ALFinity startup: wires state, input, renderer, toolbar and panels together.

import { DEFAULT_SETTING, BUILTIN_PALETTES, getPalette } from "./defaults.js";
import { State } from "./state.js";
import { clampView, zoomAt } from "./view.js";
import { attachInput } from "./input.js";
import { validateSetting, encodeShareLink, decodeShareLink, newId } from "./settings.js";
import {
  loadPalettes, savePalettes, loadFavorites, saveFavorites, loadLast, saveLast,
} from "./storage.js";
import { Renderer } from "./render/renderer.js";
import { createToolbar } from "./ui/toolbar.js";
import { createStatus } from "./ui/status.js";
import { createPanel } from "./ui/panel.js";
import { createColorsPanel } from "./ui/colors.js";
import { createFavoritesPanel } from "./ui/favorites.js";
import { createShapePanel } from "./ui/julia.js";
import { createImagePanel } from "./ui/image.js";

const START_VIEWS = { mandelbrot: DEFAULT_SETTING.view, julia: { cx: 0, cy: 0, width: 3.2 } };

const canvas = document.getElementById("view");
const status = createStatus(document.getElementById("status"));
const params = new URLSearchParams(location.search);
const debugMode = params.get("debug");

function supportsWebGL2() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

if (supportsWebGL2()) {
  start();
  registerServiceWorker();
} else {
  status.error("This browser is not supported. Please use a current Safari or Chrome.");
}

/** Offline support (research.md R10). Needs HTTPS or localhost; ?nosw turns it off. */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext || params.has("nosw")) return;
  navigator.serviceWorker.register("sw.js").catch((err) => console.warn("ALFinity: offline mode unavailable", err));
}

function start() {
  const builtinIds = BUILTIN_PALETTES.map((p) => p.id);

  // ---- Palettes: built-in, the user's own, and an unsaved one being edited ----

  let customPalettes = loadPalettes();
  let draftPalette = null;
  let paletteWarned = false;
  const knownPaletteIds = () => [...builtinIds, ...customPalettes.map((p) => p.id)];
  const paletteFor = (id) =>
    (draftPalette?.id === id && draftPalette) ||
    customPalettes.find((p) => p.id === id) ||
    getPalette(id);

  function storePalettes(list) {
    customPalettes = list;
    const ok = savePalettes(list);
    if (!ok && !paletteWarned) {
      paletteWarned = true;
      status.flash("Your palettes cannot be stored in this browser", 4000);
    }
    return ok;
  }

  /** Makes a palette from a share link available here; returns the id to use. */
  function adoptSharedPalette({ id, stops }) {
    const same = customPalettes.find((p) => p.stops.join() === stops.join());
    if (same) return same.id;
    const newPaletteId = customPalettes.some((p) => p.id === id) || !id.startsWith("custom-") ? newId("custom-") : id;
    storePalettes([...customPalettes, { id: newPaletteId, name: "Shared palette", stops, builtIn: false }]);
    return newPaletteId;
  }

  // ---- Start picture: share link, else the last view, else the default (FR-021, FR-022) ----

  let initial = DEFAULT_SETTING;
  if (location.hash.startsWith("#s=")) {
    const link = decodeShareLink(location.hash, knownPaletteIds());
    if (link) {
      initial = link.setting;
      if (link.palette) {
        initial = { ...initial, color: { ...initial.color, paletteId: adoptSharedPalette(link.palette) } };
      }
    } else {
      setTimeout(() => status.flash("This link could not be opened — showing the start picture", 4000), 0);
    }
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    initial = loadLast(knownPaletteIds()) ?? DEFAULT_SETTING;
  }

  const state = new State(initial);
  let favorites = loadFavorites(knownPaletteIds());
  let W = 0;
  let H = 0;
  let renderedView = null; // view of the picture currently on the canvas
  let frameRequested = false;
  let frameInteractive = true;
  let previewTimer = 0;
  let recolorRequested = false;
  const typeViews = { ...START_VIEWS };

  const renderer = new Renderer(canvas, {
    paletteFor,
    onFrame(view) {
      renderedView = view;
      updateTransform();
    },
    onStatus({ state: s, progress }) {
      if (s === "rendering") status.progress(progress);
      else status.done();
    },
    onRestored: () => requestRender(false),
  });

  // ---- Rendering, at most once per animation frame ----

  function requestRender(interactive) {
    frameInteractive = frameRequested ? frameInteractive && interactive : interactive;
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      draw(frameInteractive);
    });
  }

  /** Only the colors changed: recolor the picture on screen, at most once per frame (FR-016). */
  function requestRecolor() {
    if (recolorRequested) return;
    recolorRequested = true;
    requestAnimationFrame(() => {
      recolorRequested = false;
      if (!frameRequested) renderer.recolor(state.get());
    });
  }

  /** Redraws after a jump (undo, opening a favorite): recolor if only the colors differ. */
  function refreshAfter(previous) {
    const { color: a, ...restA } = previous;
    const { color: b, ...restB } = state.get();
    if (JSON.stringify(restA) === JSON.stringify(restB)) requestRecolor();
    else requestRender(false);
  }

  function draw(interactive) {
    if (!W || !H) return;
    const setting = state.get();
    clearTimeout(previewTimer);
    if (interactive && renderer.engineFor(setting, W, H) === "cpu") {
      // Deep zoom: move the last picture instantly, compute when the gesture pauses.
      updateTransform();
      previewTimer = setTimeout(() => requestRender(false), 250);
      return;
    }
    renderer.render(setting, { width: W, height: H, interactive });
  }

  /** Moves/scales the last picture with CSS so it follows the gesture immediately. */
  function updateTransform() {
    const v = state.get().view;
    const r = renderedView;
    if (!r || (r.cx === v.cx && r.cy === v.cy && r.width === v.width)) {
      canvas.style.transform = "";
      return;
    }
    const sCur = v.width / Math.min(W, H);
    const k = r.width / v.width;
    const ratio = W / canvas.clientWidth;
    const tx = (r.cx - v.cx) / sCur / ratio;
    const ty = (v.cy - r.cy) / sCur / ratio;
    canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
  }

  // ---- Canvas size: CSS size × devicePixelRatio, kept sharp on every screen ----

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === W && h === H) return;
    W = canvas.width = w;
    H = canvas.height = h;
    renderedView = null;
    canvas.style.transform = "";
    requestRender(false);
  }
  new ResizeObserver(resize).observe(canvas);
  (function watchPixelRatio() {
    // Fires when the window moves between e.g. the MacBook screen and an external monitor.
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", () => { resize(); watchPixelRatio(); }, { once: true });
  })();

  // ---- Changing the setting ----

  function applyView(fn, { record }) {
    const s = state.get();
    const { view, limited } = clampView(fn(s.view, W, H), W, H);
    if (limited) status.flash("Maximum zoom reached");
    state.set({ ...s, view }, { record });
    requestRender(!record);
  }

  /** Any change to the whole setting (panels, favorites): validated and view-clamped. */
  function applySetting(next, { record }) {
    const previous = state.get();
    const { setting } = validateSetting(next, [...knownPaletteIds(), ...(draftPalette ? [draftPalette.id] : [])]);
    if (!setting) return;
    const { view, limited } = clampView(setting.view, W || 1, H || 1);
    if (limited) status.flash("Maximum zoom reached");
    state.set({ ...setting, view }, { record });
    const { color: a, ...restA } = previous;
    const { color: b, ...restB } = state.get();
    if (JSON.stringify(restA) === JSON.stringify(restB)) requestRecolor();
    else requestRender(!record);
  }

  /** Mandelbrot ⇄ Julia; each type remembers its own view (FR-008). */
  function setType(type) {
    const s = state.get();
    typeViews[s.type] = s.view;
    applySetting({ ...s, type, view: { ...typeViews[type] } }, { record: true });
  }

  const actions = {
    zoomIn: () => applyView((v) => zoomAt(v, W, H, W / 2, H / 2, 2), { record: true }),
    zoomOut: () => applyView((v) => zoomAt(v, W, H, W / 2, H / 2, 0.5), { record: true }),
    undo: () => {
      const previous = state.get();
      if (state.undo()) refreshAfter(previous);
    },
    redo: () => {
      const previous = state.get();
      if (state.redo()) refreshAfter(previous);
    },
    // Reset returns to the start framing of the current type.
    reset: () => applyView(() => ({ ...START_VIEWS[state.get().type] }), { record: true }),
  };

  // ---- Panels ----

  const colorsPanel = createColorsPanel({
    getColor: () => state.get().color,
    setColor(color, { record }) {
      state.set({ ...state.get(), color }, { record });
      requestRecolor();
    },
    getCustomPalettes: () => customPalettes,
    saveCustomPalettes: storePalettes,
    previewPalette(p) {
      draftPalette = p;
    },
  });

  const favoritesPanel = createFavoritesPanel({
    getSetting: () => state.get(),
    openSetting: (setting) => applySetting(structuredClone(setting), { record: true }),
    makeThumbnail: (setting) => renderer.thumbnail(setting),
    getFavorites: () => favorites,
    setFavorites(list) {
      favorites = list;
      return saveFavorites(list);
    },
    getCustomPalettes: () => customPalettes,
    addPalettes: (list) => storePalettes([...customPalettes, ...list]),
    builtinPaletteIds: builtinIds,
    shareLink() {
      const s = state.get();
      const custom = customPalettes.find((p) => p.id === s.color.paletteId) ?? null;
      return `${location.origin}${location.pathname}${encodeShareLink(s, custom)}`;
    },
    status,
  });

  const shapePanel = createShapePanel({
    getSetting: () => state.get(),
    setSetting: applySetting,
    setType,
    renderPixels: (setting, w, h) => renderer.renderPixels(setting, w, h),
    status,
  });

  const imagePanel = createImagePanel({
    getSetting: () => state.get(),
    getScreenSize: () => ({ W, H }),
    renderer,
    status,
  });

  const panels = {
    shape: { title: "Shape", ui: shapePanel },
    colors: { title: "Colors", ui: colorsPanel },
    favorites: { title: "Favorites", ui: favoritesPanel },
    image: { title: "Save image", ui: imagePanel },
  };
  for (const [name, { title, ui }] of Object.entries(panels)) {
    actions[name] = () => panel.toggle(name, title, () => {
      ui.refresh();
      return ui.element;
    });
  }

  const panel = createPanel(document.getElementById("panel"), {
    onChange(name) {
      if (name !== "colors") colorsPanel.cancelEdit();
      toolbar.setOpenPanel(name);
    },
  });

  attachInput(canvas, {
    gesture: (fn) => applyView(fn, { record: false }),
    commit: () => {
      state.set(state.get(), { record: true });
      requestRender(false);
    },
    step: (fn) => applyView(fn, { record: true }),
    reset: () => actions.reset(),
    undo: actions.undo,
    redo: actions.redo,
  });

  // ---- Toolbar ----

  const extra = [];
  if (debugMode === "compare") {
    actions.compare = async () => {
      const { compareEngines } = await import("./debug.js");
      await compareEngines(renderer, state.get(), W, H);
      requestRender(false);
    };
    extra.push({ action: "compare", label: "Compare" });
  }
  const toolbar = createToolbar(document.getElementById("toolbar"), actions, extra);
  const updateToolbar = () => toolbar.update({ canUndo: state.canUndo, canRedo: state.canRedo });

  // ---- Keep panels in sync and remember the last view ----

  let lastColorKey = JSON.stringify(state.get().color);
  let saveTimer = 0;
  state.subscribe((s) => {
    updateToolbar();
    const colorKey = JSON.stringify(s.color);
    if (colorKey !== lastColorKey) shapePanel.invalidatePictures();
    if (panel.current === "colors" && colorKey !== lastColorKey) colorsPanel.refresh();
    if (panel.current === "shape") shapePanel.refresh();
    lastColorKey = colorKey;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Never store an unsaved palette that is still being edited.
      if (!draftPalette || s.color.paletteId !== draftPalette.id) saveLast(s);
    }, 1000);
  });
  updateToolbar();

  resize();
  status.flash("Pinch or scroll to zoom · Drag to move · Double-tap to zoom in", 5000);
}

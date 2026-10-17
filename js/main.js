// ALFinity startup: wires state, input, renderer and toolbar together.

import { DEFAULT_SETTING, getPalette } from "./defaults.js";
import { State } from "./state.js";
import { clampView, zoomAt } from "./view.js";
import { attachInput } from "./input.js";
import { loadPalettes, savePalettes } from "./storage.js";
import { Renderer } from "./render/renderer.js";
import { createToolbar } from "./ui/toolbar.js";
import { createStatus } from "./ui/status.js";
import { createPanel } from "./ui/panel.js";
import { createColorsPanel } from "./ui/colors.js";

const canvas = document.getElementById("view");
const status = createStatus(document.getElementById("status"));
const debugMode = new URLSearchParams(location.search).get("debug");

function supportsWebGL2() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

if (supportsWebGL2()) {
  start();
} else {
  status.error("This browser is not supported. Please use a current Safari or Chrome.");
}

function start() {
  const state = new State(DEFAULT_SETTING);
  let W = 0;
  let H = 0;
  let renderedView = null; // view of the picture currently on the canvas
  let frameRequested = false;
  let frameInteractive = true;
  let previewTimer = 0;
  let recolorRequested = false;

  // ---- Palettes: built-in, the user's own, and an unsaved one being edited ----

  let customPalettes = loadPalettes();
  let draftPalette = null;
  let storageWarned = false;
  const paletteFor = (id) =>
    (draftPalette?.id === id && draftPalette) ||
    customPalettes.find((p) => p.id === id) ||
    getPalette(id);

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

  /** Redraws after a jump in history: recolor if only the colors differ. */
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

  // ---- Changing the view ----

  function applyView(fn, { record }) {
    const s = state.get();
    const { view, limited } = clampView(fn(s.view, W, H), W, H);
    if (limited) status.flash("Maximum zoom reached");
    state.set({ ...s, view }, { record });
    requestRender(!record);
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
    reset: () => applyView(() => ({ ...DEFAULT_SETTING.view }), { record: true }),
    colors: () => panel.toggle("colors", "Colors", () => {
      colorsPanel.refresh();
      return colorsPanel.element;
    }),
  };

  // ---- Colors (US2) ----

  const colorsPanel = createColorsPanel({
    getColor: () => state.get().color,
    setColor(color, { record }) {
      state.set({ ...state.get(), color }, { record });
      requestRecolor();
    },
    getCustomPalettes: () => customPalettes,
    saveCustomPalettes(list) {
      customPalettes = list;
      const ok = savePalettes(list);
      if (!ok && !storageWarned) {
        storageWarned = true;
        status.flash("Your palettes cannot be stored in this browser", 4000);
      }
      return ok;
    },
    previewPalette(p) {
      draftPalette = p;
    },
  });

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
    reset: actions.reset,
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
  let lastColorKey = "";
  state.subscribe((s) => {
    updateToolbar();
    const key = JSON.stringify(s.color);
    if (key !== lastColorKey && panel.current === "colors") colorsPanel.refresh();
    lastColorKey = key;
  });
  updateToolbar();

  resize();
  status.flash("Pinch or scroll to zoom · Drag to move · Double-tap to zoom in", 5000);
}

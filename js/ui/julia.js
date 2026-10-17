// "Shape" panel: choose Mandelbrot or Julia; pick Julia shapes on a small Mandelbrot map
// or from named presets, without typing numbers (US4, FR-008, FR-009). Includes Details.

import { JULIA_PRESETS } from "../defaults.js";
import { pointToComplex, complexToPoint } from "../view.js";
import { createDetails } from "./details.js";

const MAP_W = 320;
const MAP_H = 200;
const MAP_VIEW = { cx: -0.6, cy: 0, width: 2.6 };
const PRESET_W = 96;
const PRESET_H = 54;

/**
 * getSetting(), setSetting(setting, { record }), setType(type),
 * renderPixels(setting, w, h) → Promise<RGBA pixels>, status.
 */
export function createShapePanel({ getSetting, setSetting, setType, renderPixels, status }) {
  const root = document.createElement("div");
  root.className = "shape";
  root.innerHTML = `
    <section class="panel-section">
      <div class="segmented" role="group" aria-label="Fractal type">
        <button type="button" data-type="mandelbrot" aria-pressed="false">Mandelbrot</button>
        <button type="button" data-type="julia" aria-pressed="false">Julia</button>
      </div>
      <p class="hint" data-type-hint></p>
    </section>

    <section class="panel-section" data-julia hidden>
      <h3>Pick a point on the map</h3>
      <div class="minimap" data-map>
        <canvas width="${MAP_W}" height="${MAP_H}" aria-label="Mandelbrot map. Drag the marker to change the Julia shape."></canvas>
        <span class="marker" data-marker></span>
      </div>
      <p class="hint">Points near the edge of the black shape give the most interesting pictures.</p>
      <h3>Or choose a shape</h3>
      <div class="preset-grid" data-presets>
        ${JULIA_PRESETS.map((p) => `
          <button type="button" class="preset" data-preset="${p.id}">
            <canvas width="${PRESET_W}" height="${PRESET_H}" aria-hidden="true"></canvas>
            <span>${p.name}</span>
          </button>`).join("")}
      </div>
    </section>

    <section class="panel-section" data-details></section>`;

  const $ = (sel) => root.querySelector(sel);
  const details = createDetails({ getSetting, setSetting, status });
  $("[data-details]").append(details.element);

  const map = $("[data-map]");
  const mapCanvas = map.querySelector("canvas");
  const marker = $("[data-marker]");
  let mapDrawn = false;
  let presetsDrawn = false;

  async function draw(canvas, setting, w, h) {
    try {
      const pixels = await renderPixels(setting, w, h);
      canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer), w, h), 0, 0);
    } catch {
      // A cancelled background render; the picture is drawn next time.
    }
  }

  /** The map and preset pictures use the current colors; drawn once per panel opening. */
  async function drawPictures() {
    const s = getSetting();
    const base = { ...s, maxIter: null, detail: 1 };
    if (!mapDrawn) {
      mapDrawn = true;
      await draw(mapCanvas, { ...base, type: "mandelbrot", view: MAP_VIEW }, MAP_W, MAP_H);
    }
    if (!presetsDrawn) {
      presetsDrawn = true;
      for (const p of JULIA_PRESETS) {
        const canvas = root.querySelector(`[data-preset="${p.id}"] canvas`);
        await draw(canvas, { ...base, type: "julia", julia: p.julia, view: p.view }, PRESET_W, PRESET_H);
      }
    }
  }

  // ---- Type switch ----

  root.querySelector(".segmented").addEventListener("click", (e) => {
    const type = e.target.closest("[data-type]")?.dataset.type;
    if (type && type !== getSetting().type) setType(type);
  });

  // ---- Mini-map: drag the marker to choose the Julia point ----

  function pointFromEvent(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const y = ((e.clientY - rect.top) / rect.height) * MAP_H;
    const p = pointToComplex(MAP_VIEW, MAP_W, MAP_H, x, y);
    const clamp = (v) => Math.min(2, Math.max(-2, v));
    return { re: clamp(p.re), im: clamp(p.im) };
  }

  let dragging = false;
  map.addEventListener("pointerdown", (e) => {
    dragging = true;
    map.setPointerCapture(e.pointerId);
    setSetting({ ...getSetting(), julia: pointFromEvent(e) }, { record: false });
  });
  map.addEventListener("pointermove", (e) => {
    if (dragging) setSetting({ ...getSetting(), julia: pointFromEvent(e) }, { record: false });
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    setSetting(getSetting(), { record: true });
  };
  map.addEventListener("pointerup", endDrag);
  map.addEventListener("pointercancel", endDrag);

  // ---- Presets ----

  $("[data-presets]").addEventListener("click", (e) => {
    const id = e.target.closest("[data-preset]")?.dataset.preset;
    const p = JULIA_PRESETS.find((x) => x.id === id);
    if (p) setSetting({ ...getSetting(), type: "julia", julia: { ...p.julia }, view: { ...p.view } }, { record: true });
  });

  function refresh() {
    const s = getSetting();
    for (const b of root.querySelectorAll("[data-type]")) {
      b.setAttribute("aria-pressed", String(b.dataset.type === s.type));
    }
    $("[data-type-hint]").textContent = s.type === "julia"
      ? "Julia pictures change shape with the point you pick below."
      : "The classic Mandelbrot set. Switch to Julia for a whole family of other shapes.";
    $("[data-julia]").hidden = s.type !== "julia";
    if (s.type === "julia") {
      const p = complexToPoint(MAP_VIEW, MAP_W, MAP_H, s.julia.re, s.julia.im);
      marker.style.left = `${(p.x / MAP_W) * 100}%`;
      marker.style.top = `${(p.y / MAP_H) * 100}%`;
      drawPictures();
    }
    details.refresh();
  }

  return {
    element: root,
    refresh,
    /** Colors changed: the map and presets are redrawn next time they are shown. */
    invalidatePictures() {
      mapDrawn = presetsDrawn = false;
    },
  };
}

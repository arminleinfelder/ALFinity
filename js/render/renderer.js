// Renderer: picks the engine for each view, shows a quick preview first on the CPU path,
// cancels outdated work, and recolors without recomputing (contracts/render-engine.md).

import { GpuEngine } from "./gpu.js";
import { CpuEngine } from "./cpu.js";
import { engineFor, pixelScale } from "../view.js";
import { effectiveMaxIter } from "../fractal.js";
import { getPalette } from "../defaults.js";

/** WebGL reads rows bottom-up; images are stored top-down. */
function flipRows(pixels, w, h) {
  const out = new Uint8Array(pixels.length);
  const row = w * 4;
  for (let y = 0; y < h; y++) out.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  return out;
}

const PREVIEW_STEP = 4;
const PREVIEW_SHARE = 1 / (PREVIEW_STEP * PREVIEW_STEP); // share of work in the preview pass

export class Renderer {
  /**
   * onFrame(view): a new picture of `view` is on screen.
   * onStatus({ state: "rendering" | "done", engine, progress }).
   * onRestored(): the graphics context came back and the picture must be redrawn.
   * paletteFor(id): the palette for an id (built-in or custom).
   */
  constructor(canvas, {
    onFrame = () => {}, onStatus = () => {}, onRestored = () => {}, paletteFor = getPalette,
  } = {}) {
    this.gpu = new GpuEngine(canvas, onRestored);
    this.cpu = new CpuEngine();
    this.onFrame = onFrame;
    this.onStatus = onStatus;
    this.paletteFor = paletteFor;
    this.last = null;
    this.token = 0;
    this.interactiveScale = 1;
    this.lastInteractiveAt = 0;
  }

  engineFor(setting, W, H) {
    return engineFor(setting.view, W, H);
  }

  /** Draws `setting` at W×H device pixels. `interactive` = a gesture is in progress. */
  render(setting, { width: W, height: H, interactive = false }) {
    const token = ++this.token;
    const engine = this.engineFor(setting, W, H);
    const maxIter = effectiveMaxIter(setting);
    this.screenColor = setting.color;
    this.#setColor(setting.color);

    if (engine === "gpu") {
      this.cpu.cancel();
      const scale = interactive ? this.#adaptScale() : 1;
      if (!interactive) this.lastInteractiveAt = 0;
      this.gpu.drawFractal(setting, W, H, { maxIter, scale });
      this.last = { engine, setting, W, H, maxIter };
      this.onFrame(setting.view);
      this.onStatus({ state: "done", engine });
      return;
    }
    this.#renderCpu(setting, W, H, maxIter, token);
  }

  async #renderCpu(setting, W, H, maxIter, token) {
    const p = {
      type: setting.type,
      jre: setting.julia.re,
      jim: setting.julia.im,
      cx: setting.view.cx,
      cy: setting.view.cy,
      s: pixelScale(setting.view, W, H),
      W,
      H,
      maxIter,
    };
    const passes = [PREVIEW_STEP, 1];
    for (const step of passes) {
      const [base, share] = step === 1 ? [PREVIEW_SHARE, 1 - PREVIEW_SHARE] : [0, PREVIEW_SHARE];
      this.onStatus({ state: "rendering", engine: "cpu", progress: base });
      const job = this.cpu.render({ ...p, step }, (f) =>
        this.onStatus({ state: "rendering", engine: "cpu", progress: base + share * f }));
      const result = await job.promise;
      if (!result || token !== this.token) return;
      this.#setColor(this.screenColor); // an offscreen render may have used other colors
      this.gpu.drawNu(result.data, result.gw, result.gh, step, W, H);
      this.last = { engine: "cpu", setting, W, H, maxIter, result, step };
      this.onFrame(setting.view);
    }
    this.onStatus({ state: "done", engine: "cpu" });
  }

  /** Applies new colors to the picture on screen without recomputing it (FR-016). */
  recolor(setting) {
    const last = this.last;
    if (!last) return;
    this.screenColor = setting.color;
    this.#setColor(setting.color);
    last.setting = { ...last.setting, color: setting.color };
    if (last.engine === "gpu") {
      this.gpu.drawFractal(last.setting, last.W, last.H, { maxIter: last.maxIter });
    } else {
      const { data, gw, gh } = last.result;
      this.gpu.drawNu(data, gw, gh, last.step, last.W, last.H);
    }
  }

  /** Redraws the last screen picture as it was (e.g. after the debug comparison). */
  redraw() {
    if (this.last) this.recolor(this.last.setting);
  }

  cancel() {
    this.token++;
    this.cpu.cancel();
  }

  /**
   * Renders `setting` at w×h without touching the screen and returns RGBA pixels, rows
   * top-down. Uses its own CPU workers so thumbnails and image export never interrupt the
   * picture on screen. `engine` and `maxIter` default to what the setting itself needs.
   */
  async renderPixels(setting, w, h, { engine = this.engineFor(setting, w, h), maxIter = effectiveMaxIter(setting) } = {}) {
    let pixels;
    if (engine === "gpu") {
      this.#setColor(setting.color);
      this.gpu.drawFractal(setting, w, h, { maxIter, offscreen: true });
      pixels = this.gpu.readPixels(w, h);
    } else {
      this.offscreenCpu ??= new CpuEngine();
      const result = await this.offscreenCpu.render({
        type: setting.type, jre: setting.julia.re, jim: setting.julia.im,
        cx: setting.view.cx, cy: setting.view.cy, s: pixelScale(setting.view, w, h),
        W: w, H: h, maxIter, step: 1,
      }).promise;
      if (!result) throw new Error("Rendering was cancelled");
      this.#setColor(setting.color); // after the await: the screen may have changed colors
      this.gpu.drawNu(result.data, result.gw, result.gh, 1, w, h, { offscreen: true });
      pixels = this.gpu.readPixels(w, h);
    }
    return flipRows(pixels, w, h);
  }

  /** Stops an offscreen render in progress (e.g. a cancelled image export). */
  cancelOffscreen() {
    this.offscreenCpu?.cancel();
  }

  /** A small JPEG picture of `setting` for the favorites list. */
  async thumbnail(setting, w = 192, h = 108) {
    const pixels = await this.renderPixels(setting, w, h);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer), w, h), 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  #setColor(color) {
    this.gpu.setPalette(this.paletteFor(color.paletteId).stops);
    this.gpu.setColor(color);
  }

  /** Lowers the GPU resolution during gestures when frames come too slowly. */
  #adaptScale() {
    const now = performance.now();
    const dt = now - this.lastInteractiveAt;
    this.lastInteractiveAt = now;
    if (dt < 100) {
      if (dt > 25) this.interactiveScale = Math.max(0.25, this.interactiveScale * 0.75);
      else if (dt < 18) this.interactiveScale = Math.min(1, this.interactiveScale * 1.1);
    }
    return this.interactiveScale;
  }
}

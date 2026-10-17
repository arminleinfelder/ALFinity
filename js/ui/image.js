// "Save image" panel: choose a size and download the picture as PNG (US5, FR-023).

import { exportImage, sizeProblem, MAX_EXPORT_W, MAX_EXPORT_H } from "../export.js";
import { download, stamp } from "./download.js";

const PRESETS = [
  { id: "screen", label: "Screen" },
  { id: "hd", label: "Wallpaper HD", w: 1920, h: 1080 },
  { id: "4k", label: "4K", w: 3840, h: 2160 },
  { id: "custom", label: "Custom size" },
];

/** getSetting(), getScreenSize() → { W, H }, renderer, status. */
export function createImagePanel({ getSetting, getScreenSize, renderer, status }) {
  const root = document.createElement("div");
  root.className = "image";
  root.innerHTML = `
    <section class="panel-section">
      <h3>Size</h3>
      <div class="size-options" role="radiogroup" aria-label="Image size">
        ${PRESETS.map((p, i) => `
          <label class="size-option">
            <input type="radio" name="image-size" value="${p.id}" ${i === 0 ? "checked" : ""}>
            <span class="size-label">${p.label}</span>
            <span class="size-dims" data-dims="${p.id}">${p.w ? `${p.w} × ${p.h}` : ""}</span>
          </label>`).join("")}
      </div>
      <div class="field-pair" data-custom hidden>
        <label class="field">Width<input type="number" min="16" max="${MAX_EXPORT_W}" value="3840" data-cw></label>
        <label class="field">Height<input type="number" min="16" max="${MAX_EXPORT_H}" value="2160" data-ch></label>
      </div>
      <p class="hint">Up to ${MAX_EXPORT_W} × ${MAX_EXPORT_H}. The picture keeps its center and zoom;
        a different shape shows a little more or less at the sides.</p>
    </section>
    <section class="panel-section">
      <button type="button" class="btn primary" data-start>Save image</button>
      <div class="export-progress" data-progress hidden>
        <span class="progress-track"><span class="progress-fill" data-fill></span></span>
        <button type="button" class="btn" data-cancel>Cancel</button>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  let controller = null;

  function chosenSize() {
    const id = root.querySelector('input[name="image-size"]:checked').value;
    if (id === "screen") return getScreenSize();
    if (id === "custom") {
      const clamp = (v, max) => Math.round(Math.min(max, Math.max(16, Number(v) || 16)));
      return { W: clamp($("[data-cw]").value, MAX_EXPORT_W), H: clamp($("[data-ch]").value, MAX_EXPORT_H) };
    }
    const p = PRESETS.find((x) => x.id === id);
    return { W: p.w, H: p.h };
  }

  root.addEventListener("change", (e) => {
    if (e.target.name === "image-size") $("[data-custom]").hidden = e.target.value !== "custom";
  });

  $("[data-start]").addEventListener("click", async () => {
    const { W, H } = chosenSize();
    const problem = sizeProblem(W, H);
    if (problem) {
      status.flash(problem, 5000);
      return;
    }
    controller = new AbortController();
    $("[data-start]").hidden = true;
    $("[data-progress]").hidden = false;
    $("[data-fill]").style.width = "0";
    try {
      const blob = await exportImage(renderer, getSetting(), W, H, {
        signal: controller.signal,
        onProgress: (f) => ($("[data-fill]").style.width = `${Math.round(f * 100)}%`),
      });
      download(blob, `alfinity-${stamp(true)}.png`);
      status.flash(`Saved a ${W} × ${H} image`);
    } catch (err) {
      status.flash(err.name === "AbortError" || /cancel/i.test(err.message) ? "Export cancelled" : err.message, 4000);
    } finally {
      controller = null;
      $("[data-start]").hidden = false;
      $("[data-progress]").hidden = true;
    }
  });

  $("[data-cancel]").addEventListener("click", () => controller?.abort());

  function refresh() {
    const { W, H } = getScreenSize();
    $('[data-dims="screen"]').textContent = `${W} × ${H}`;
  }

  return { element: root, refresh };
}

// "Details": the exact numbers behind the picture, for those who want them (FR-010, FR-011).
// Closed by default; everything here can also be done without numbers.

import { zoomFactor, INITIAL_WIDTH } from "../view.js";
import { autoMaxIter } from "../fractal.js";

const DETAIL_MIN = 0.25;
const DETAIL_MAX = 4;
const toDetail = (t) => DETAIL_MIN * (DETAIL_MAX / DETAIL_MIN) ** t;
const fromDetail = (d) => Math.log(d / DETAIL_MIN) / Math.log(DETAIL_MAX / DETAIL_MIN);

/** setSetting(setting, { record }) applies a change; status shows short notes. */
export function createDetails({ getSetting, setSetting, status }) {
  const root = document.createElement("details");
  root.className = "details";
  root.innerHTML = `
    <summary>Details</summary>
    <div class="control">
      <div class="control-row"><label for="d-detail">More detail</label><output data-out="detail"></output></div>
      <input id="d-detail" type="range" min="0" max="1" step="0.001" data-detail>
      <p class="hint">Higher values show finer detail in deep zooms but take longer.</p>
    </div>
    <div class="control">
      <div class="control control-inline">
        <label for="d-auto">Automatic steps</label>
        <input id="d-auto" type="checkbox" class="switch" data-auto>
      </div>
      <label class="field" data-iter-field>Steps per point
        <input type="number" min="50" max="10000" step="50" inputmode="numeric" data-iter>
      </label>
      <p class="hint">How long each point is tested. Automatic adapts it to the zoom.</p>
    </div>
    <div class="field-pair" data-julia-fields>
      <label class="field">Julia point (x)<input type="number" step="any" data-jre></label>
      <label class="field">Julia point (y)<input type="number" step="any" data-jim></label>
    </div>
    <p class="hint" data-julia-hint>The point that shapes the Julia picture. Picking on the map sets it.</p>
    <div class="field-pair">
      <label class="field">Center (x)<input type="number" step="any" data-cx></label>
      <label class="field">Center (y)<input type="number" step="any" data-cy></label>
    </div>
    <p class="hint">Position of the middle of the picture.</p>
    <label class="field">Zoom<input type="number" step="any" min="0.4" data-zoom></label>
    <p class="hint">How many times the picture is magnified compared to the start.</p>`;

  const $ = (sel) => root.querySelector(sel);
  const fields = {
    detail: $("[data-detail]"), auto: $("[data-auto]"), iter: $("[data-iter]"),
    jre: $("[data-jre]"), jim: $("[data-jim]"), cx: $("[data-cx]"), cy: $("[data-cy]"), zoom: $("[data-zoom]"),
  };

  /** Reads a number field; clamps it and says so when it was out of range. */
  function readNumber(input, lo, hi, fallback) {
    const v = Number(input.value);
    if (input.value.trim() === "" || !Number.isFinite(v)) {
      status.flash("Please enter a number");
      return fallback;
    }
    if (v < lo || v > hi) {
      status.flash(`Adjusted to the allowed range (${lo} to ${hi})`);
      return Math.min(hi, Math.max(lo, v));
    }
    return v;
  }

  fields.detail.addEventListener("input", () => {
    const detail = Math.round(toDetail(Number(fields.detail.value)) * 100) / 100;
    setSetting({ ...getSetting(), detail }, { record: false });
  });
  fields.detail.addEventListener("change", () => setSetting(getSetting(), { record: true }));

  fields.auto.addEventListener("change", () => {
    const s = getSetting();
    const maxIter = fields.auto.checked ? null : autoMaxIter(zoomFactor(s.view), s.detail);
    setSetting({ ...s, maxIter }, { record: true });
  });
  fields.iter.addEventListener("change", () => {
    const s = getSetting();
    setSetting({ ...s, maxIter: Math.round(readNumber(fields.iter, 50, 10000, s.maxIter ?? 200)) }, { record: true });
  });

  for (const key of ["jre", "jim"]) {
    fields[key].addEventListener("change", () => {
      const s = getSetting();
      const part = key === "jre" ? "re" : "im";
      const value = readNumber(fields[key], -2, 2, s.julia[part]);
      setSetting({ ...s, julia: { ...s.julia, [part]: value } }, { record: true });
    });
  }
  for (const key of ["cx", "cy"]) {
    fields[key].addEventListener("change", () => {
      const s = getSetting();
      setSetting({ ...s, view: { ...s.view, [key]: readNumber(fields[key], -4, 4, s.view[key]) } }, { record: true });
    });
  }
  fields.zoom.addEventListener("change", () => {
    const s = getSetting();
    const zoom = readNumber(fields.zoom, 0.4, 1e16, zoomFactor(s.view));
    setSetting({ ...s, view: { ...s.view, width: INITIAL_WIDTH / zoom } }, { record: true });
  });

  function refresh() {
    const s = getSetting();
    const active = document.activeElement;
    const set = (input, value) => {
      if (input !== active) input.value = value;
    };
    set(fields.detail, fromDetail(s.detail));
    $('[data-out="detail"]').textContent = `${s.detail.toFixed(2)}×`;
    fields.auto.checked = s.maxIter == null;
    $("[data-iter-field]").hidden = s.maxIter == null;
    set(fields.iter, s.maxIter ?? autoMaxIter(zoomFactor(s.view), s.detail));
    const julia = s.type === "julia";
    $("[data-julia-fields]").hidden = $("[data-julia-hint]").hidden = !julia;
    set(fields.jre, s.julia.re);
    set(fields.jim, s.julia.im);
    set(fields.cx, s.view.cx);
    set(fields.cy, s.view.cy);
    set(fields.zoom, Number(zoomFactor(s.view).toPrecision(6)));
  }

  return { element: root, refresh };
}

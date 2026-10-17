// Colors panel: palette gallery, color sliders and the custom palette editor (US2).

import { BUILTIN_PALETTES, DEFAULT_SETTING } from "../defaults.js";
import { newId } from "../storage.js";

const DENSITY_MIN = 0.1;
const DENSITY_MAX = 20;
const MIN_STOPS = 2;
const MAX_STOPS = 8;

/** The density slider is logarithmic: small values need fine control. */
const toDensity = (t) => DENSITY_MIN * (DENSITY_MAX / DENSITY_MIN) ** t;
const fromDensity = (d) => Math.log(d / DENSITY_MIN) / Math.log(DENSITY_MAX / DENSITY_MIN);

/** CSS preview of a cyclic palette (same linear blend as the color table). */
const gradient = (stops) => `linear-gradient(90deg, ${[...stops, stops[0]].join(", ")})`;

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * getColor()                     – current ColorSetting
 * setColor(color, { record })    – apply a ColorSetting (record = one undo step)
 * getCustomPalettes()            – the user's palettes
 * saveCustomPalettes(list)       – store them; returns false if storage failed
 * previewPalette(paletteOrNull)  – show an unsaved palette while editing
 */
export function createColorsPanel({ getColor, setColor, getCustomPalettes, saveCustomPalettes, previewPalette }) {
  const root = document.createElement("div");
  root.className = "colors";
  root.innerHTML = `
    <section class="panel-section" data-section="palettes">
      <h3>Palette</h3>
      <div class="palette-grid" data-grid></div>
      <button type="button" class="btn" data-new>+ New palette</button>
    </section>

    <section class="panel-section" data-section="adjust">
      <h3>Adjust</h3>
      <div class="control">
        <div class="control-row"><label for="c-shift">Color shift</label><output data-out="shift"></output></div>
        <input id="c-shift" type="range" min="0" max="0.999" step="0.001" data-ctl="shift">
        <p class="hint">Moves the colors through the picture.</p>
      </div>
      <div class="control">
        <div class="control-row"><label for="c-density">Color density</label><output data-out="density"></output></div>
        <input id="c-density" type="range" min="0" max="1" step="0.001" data-ctl="density">
        <p class="hint">How quickly the colors repeat. Higher values give more stripes.</p>
      </div>
      <div class="control control-inline">
        <label for="c-smooth">Smooth colors</label>
        <input id="c-smooth" type="checkbox" class="switch" data-ctl="smooth">
      </div>
      <p class="hint">Off shows the colors as distinct bands.</p>
      <div class="control control-inline">
        <label for="c-inside">Inside color</label>
        <input id="c-inside" type="color" data-ctl="inside">
      </div>
      <p class="hint">Color of the area inside the shape.</p>
      <button type="button" class="btn" data-reset>Reset colors</button>
    </section>

    <section class="panel-section" data-section="editor" hidden>
      <h3 data-editor-title>New palette</h3>
      <label class="field">Name
        <input type="text" maxlength="40" required data-name>
      </label>
      <div class="editor-preview" data-preview></div>
      <div class="editor-stops" data-stops></div>
      <button type="button" class="btn" data-add-stop>+ Add color</button>
      <p class="hint">2 to 8 colors. They repeat in a loop across the picture.</p>
      <div class="editor-actions">
        <button type="button" class="btn primary" data-save>Save</button>
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="button" class="btn danger" data-delete>Delete</button>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const sections = {
    palettes: $('[data-section="palettes"]'),
    adjust: $('[data-section="adjust"]'),
    editor: $('[data-section="editor"]'),
  };
  const grid = $("[data-grid]");
  const ctl = {
    shift: $('[data-ctl="shift"]'),
    density: $('[data-ctl="density"]'),
    smooth: $('[data-ctl="smooth"]'),
    inside: $('[data-ctl="inside"]'),
  };
  const out = { shift: $('[data-out="shift"]'), density: $('[data-out="density"]') };

  // ---- Gallery ----

  let gridKey = "";

  function renderGrid() {
    const selected = getColor().paletteId;
    const all = [...BUILTIN_PALETTES, ...getCustomPalettes()];
    const key = JSON.stringify([selected, all]);
    if (key === gridKey) return; // unchanged; avoid rebuilding while a slider moves
    gridKey = key;
    grid.innerHTML = all.map((p) => `
      <div class="palette-item">
        <button type="button" class="palette" data-palette="${p.id}"
                aria-pressed="${p.id === selected}" title="${escapeHtml(p.name)}">
          <span class="swatch" style="background:${gradient(p.stops)}"></span>
          <span class="palette-name">${escapeHtml(p.name)}</span>
        </button>
        ${p.builtIn ? "" : `<button type="button" class="palette-edit" data-edit="${p.id}"
            aria-label="Edit ${escapeHtml(p.name)}" title="Edit">✎</button>`}
      </div>`).join("");
  }

  grid.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-palette]");
    const edit = e.target.closest("[data-edit]");
    if (edit) openEditor(getCustomPalettes().find((p) => p.id === edit.dataset.edit));
    else if (pick) setColor({ ...getColor(), paletteId: pick.dataset.palette }, { record: true });
  });

  $("[data-new]").addEventListener("click", () => openEditor(null));

  // ---- Sliders and switches ----

  function readControls() {
    return {
      ...getColor(),
      shift: Number(ctl.shift.value),
      density: Math.round(toDensity(Number(ctl.density.value)) * 100) / 100,
      smooth: ctl.smooth.checked,
      inside: ctl.inside.value,
    };
  }

  for (const input of Object.values(ctl)) {
    // "input" fires continuously while dragging; "change" once on release.
    input.addEventListener("input", () => setColor(readControls(), { record: false }));
    input.addEventListener("change", () => setColor(readControls(), { record: true }));
  }

  $("[data-reset]").addEventListener("click", () =>
    setColor({ ...DEFAULT_SETTING.color }, { record: true }));

  // ---- Custom palette editor ----

  let draft = null; // { id, name, stops, isNew }
  let colorBeforeEdit = null;
  let deleteArmed = false;

  function openEditor(existing) {
    colorBeforeEdit = getColor();
    const count = getCustomPalettes().length + 1;
    draft = existing
      ? { ...existing, stops: [...existing.stops], isNew: false }
      : { id: newId("custom-"), name: `My palette ${count}`, stops: ["#1a0533", "#ff6b35", "#ffe66d"], isNew: true };
    $("[data-editor-title]").textContent = draft.isNew ? "New palette" : "Edit palette";
    $("[data-name]").value = draft.name;
    $("[data-delete]").hidden = draft.isNew;
    $("[data-save]").disabled = false;
    disarmDelete();
    sections.palettes.hidden = sections.adjust.hidden = true;
    sections.editor.hidden = false;
    renderStops();
    showDraft();
  }

  function closeEditor() {
    draft = null;
    previewPalette(null);
    sections.palettes.hidden = sections.adjust.hidden = false;
    sections.editor.hidden = true;
    refresh();
  }

  function renderStops() {
    $("[data-stops]").innerHTML = draft.stops.map((c, i) => `
      <div class="stop">
        <input type="color" value="${c}" data-stop="${i}" aria-label="Color ${i + 1}">
        <button type="button" class="tool" data-remove="${i}" aria-label="Remove color ${i + 1}"
                ${draft.stops.length <= MIN_STOPS ? "disabled" : ""}>✕</button>
      </div>`).join("");
    $("[data-add-stop]").disabled = draft.stops.length >= MAX_STOPS;
  }

  /** Shows the unsaved palette on the picture while editing. */
  function showDraft() {
    $("[data-preview]").style.background = gradient(draft.stops);
    previewPalette({ id: draft.id, name: draft.name, stops: [...draft.stops], builtIn: false });
    setColor({ ...colorBeforeEdit, paletteId: draft.id }, { record: false });
  }

  $("[data-stops]").addEventListener("input", (e) => {
    const i = e.target.dataset.stop;
    if (i === undefined) return;
    draft.stops[Number(i)] = e.target.value;
    showDraft();
  });
  $("[data-stops]").addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove]");
    if (!button || draft.stops.length <= MIN_STOPS) return;
    draft.stops.splice(Number(button.dataset.remove), 1);
    renderStops();
    showDraft();
  });
  $("[data-add-stop]").addEventListener("click", () => {
    if (draft.stops.length >= MAX_STOPS) return;
    draft.stops.push(draft.stops[draft.stops.length - 1]);
    renderStops();
    showDraft();
  });
  $("[data-name]").addEventListener("input", (e) => {
    $("[data-save]").disabled = e.target.value.trim().length === 0;
  });

  $("[data-save]").addEventListener("click", () => {
    const name = $("[data-name]").value.trim().slice(0, 40);
    if (!name) return;
    const saved = { id: draft.id, name, stops: [...draft.stops], builtIn: false };
    const list = getCustomPalettes().filter((p) => p.id !== saved.id);
    const index = getCustomPalettes().findIndex((p) => p.id === saved.id);
    if (index >= 0) list.splice(index, 0, saved);
    else list.push(saved);
    saveCustomPalettes(list);
    const color = { ...colorBeforeEdit, paletteId: saved.id };
    closeEditor();
    setColor(color, { record: true });
  });

  $("[data-cancel]").addEventListener("click", () => {
    const color = colorBeforeEdit;
    closeEditor();
    setColor(color, { record: false });
  });

  function disarmDelete() {
    deleteArmed = false;
    $("[data-delete]").textContent = "Delete";
  }

  $("[data-delete]").addEventListener("click", () => {
    if (!deleteArmed) {
      deleteArmed = true;
      $("[data-delete]").textContent = "Tap again to delete";
      return;
    }
    const id = draft.id;
    saveCustomPalettes(getCustomPalettes().filter((p) => p.id !== id));
    const before = colorBeforeEdit;
    closeEditor();
    if (before.paletteId === id) setColor({ ...before, paletteId: DEFAULT_SETTING.color.paletteId }, { record: true });
    else setColor(before, { record: false });
  });

  // ---- Sync with the current setting (e.g. after undo) ----

  function refresh() {
    if (draft) return; // the editor owns the picture's colors while open
    const c = getColor();
    ctl.shift.value = c.shift;
    ctl.density.value = fromDensity(c.density);
    ctl.smooth.checked = c.smooth;
    ctl.inside.value = c.inside;
    out.shift.textContent = c.shift.toFixed(2);
    out.density.textContent = c.density.toFixed(2);
    renderGrid();
  }

  return {
    element: root,
    refresh,
    /** Called when the panel closes: an unsaved palette edit is discarded. */
    cancelEdit() {
      if (!draft) return;
      const color = colorBeforeEdit;
      closeEditor();
      setColor(color, { record: false });
    },
  };
}

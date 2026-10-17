// PURE: validation and encoding of settings, share links and favorites files.
// Everything that comes from storage, a file or a link passes through validateSetting
// (data-model.md, contracts/share-link.md, contracts/favorites-file.md).

import { DEFAULT_SETTING } from "./defaults.js";

const HEX = /^#[0-9a-f]{6}$/i;
const FORMAT_VERSION = 1;

/** A random id; crypto.randomUUID needs HTTPS, which local network testing lacks. */
export function newId(prefix = "") {
  const uuid = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}${uuid}`;
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Checks and repairs a FractalSetting. Unknown fields are dropped, out-of-range numbers
 * clamped, invalid values replaced by defaults. Returns { setting: null } for non-objects.
 */
export function validateSetting(input, knownPaletteIds = []) {
  const warnings = [];
  if (!isObject(input)) return { setting: null, warnings: ["Not a valid setting"] };
  const D = DEFAULT_SETTING;

  function num(value, fallback, lo, hi, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      if (value !== undefined) warnings.push(`${label}: invalid value replaced`);
      return fallback;
    }
    if (value < lo || value > hi) {
      warnings.push(`${label}: out of range, adjusted`);
      return Math.min(hi, Math.max(lo, value));
    }
    return value;
  }

  const type = input.type === "julia" || input.type === "mandelbrot" ? input.type : D.type;
  if (type !== input.type) warnings.push("type: unknown, using Mandelbrot");

  const j = isObject(input.julia) ? input.julia : {};
  const julia = {
    re: num(j.re, D.julia.re, -2, 2, "julia.re"),
    im: num(j.im, D.julia.im, -2, 2, "julia.im"),
  };

  const v = isObject(input.view) ? input.view : {};
  let width = num(v.width, D.view.width, 0, 8, "view.width");
  if (width <= 0) {
    warnings.push("view.width: must be positive");
    width = D.view.width;
  }
  const view = {
    cx: num(v.cx, D.view.cx, -4, 4, "view.cx"),
    cy: num(v.cy, D.view.cy, -4, 4, "view.cy"),
    width,
  };

  const detail = num(input.detail, D.detail, 0.25, 4, "detail");
  let maxIter = null;
  if (input.maxIter !== null && input.maxIter !== undefined) {
    maxIter = Math.round(num(input.maxIter, 200, 50, 10000, "maxIter"));
  }

  const c = isObject(input.color) ? input.color : {};
  let paletteId = c.paletteId;
  if (typeof paletteId !== "string" || !knownPaletteIds.includes(paletteId)) {
    if (paletteId !== undefined) warnings.push("color.paletteId: unknown palette, using Ocean");
    paletteId = D.color.paletteId;
  }
  let shift = num(c.shift, D.color.shift, -Infinity, Infinity, "color.shift");
  if (shift < 0 || shift >= 1) shift = ((shift % 1) + 1) % 1; // wraps around
  const color = {
    paletteId,
    shift,
    density: num(c.density, D.color.density, 0.1, 20, "color.density"),
    smooth: typeof c.smooth === "boolean" ? c.smooth : D.color.smooth,
    inside: typeof c.inside === "string" && HEX.test(c.inside) ? c.inside.toLowerCase() : D.color.inside,
  };
  if (c.inside !== undefined && color.inside !== String(c.inside).toLowerCase()) {
    warnings.push("color.inside: invalid color replaced");
  }

  return {
    setting: { schemaVersion: 1, type, julia, view, detail, maxIter, color },
    warnings,
  };
}

// ---- base64url with UTF-8 ----

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
}

// ---- Share links (contracts/share-link.md) ----

/** Encodes a setting as "#s=…". Pass the custom palette if the setting uses one. */
export function encodeShareLink(setting, customPalette = null) {
  const s = setting;
  const short = {
    v: 1,
    t: s.type === "julia" ? "j" : "m",
    j: [s.julia.re, s.julia.im],
    c: [s.view.cx, s.view.cy, s.view.width],
    d: s.detail,
    k: [s.color.paletteId, s.color.shift, s.color.density, s.color.smooth ? 1 : 0, s.color.inside],
  };
  if (s.maxIter != null) short.i = s.maxIter;
  if (customPalette) short.p = customPalette.stops;
  return `#s=${toBase64Url(JSON.stringify(short))}`;
}

/**
 * Decodes "#s=…". Returns { setting, palette, warnings } or null for unreadable links.
 * `palette` is { id, stops } when the link carries a custom palette.
 */
export function decodeShareLink(hash, knownPaletteIds = []) {
  const m = /^#?s=([A-Za-z0-9_-]+)$/.exec(hash ?? "");
  if (!m) return null;
  let short;
  try {
    short = JSON.parse(fromBase64Url(m[1]));
  } catch {
    return null;
  }
  if (!isObject(short)) return null;
  const arr = (a, n) => (Array.isArray(a) ? a : []).concat(Array(n).fill(undefined)).slice(0, n);
  const [cx, cy, width] = arr(short.c, 3);
  const [re, im] = arr(short.j, 2);
  const [paletteId, shift, density, smooth, inside] = arr(short.k, 5);

  let palette = null;
  const known = [...knownPaletteIds];
  if (Array.isArray(short.p) && short.p.length >= 2 && short.p.length <= 8 &&
      short.p.every((x) => typeof x === "string" && HEX.test(x)) && typeof paletteId === "string") {
    palette = { id: paletteId, stops: short.p.map((x) => x.toLowerCase()) };
    known.push(paletteId);
  }

  const { setting, warnings } = validateSetting({
    type: short.t === "j" ? "julia" : "mandelbrot",
    julia: { re, im },
    view: { cx, cy, width },
    detail: short.d,
    maxIter: short.i ?? null,
    color: { paletteId, shift, density, smooth: smooth === undefined ? undefined : smooth === 1, inside },
  }, known);
  return setting ? { setting, palette, warnings } : null;
}

// ---- Favorites file (contracts/favorites-file.md) ----

function validPalette(p) {
  return isObject(p) && typeof p.id === "string" && p.id.startsWith("custom-") &&
    Array.isArray(p.stops) && p.stops.length >= 2 && p.stops.length <= 8 &&
    p.stops.every((x) => typeof x === "string" && HEX.test(x));
}

function cleanName(name, fallback, max) {
  const n = typeof name === "string" ? name.trim().slice(0, max) : "";
  return n || fallback;
}

/** Builds the export object; only custom palettes used by the favorites are included. */
export function buildFavoritesFile(favorites, customPalettes, now = new Date()) {
  const used = new Set(favorites.map((f) => f.setting.color.paletteId));
  return {
    app: "ALFinity",
    formatVersion: FORMAT_VERSION,
    exported: now.toISOString(),
    palettes: customPalettes
      .filter((p) => used.has(p.id))
      .map(({ id, name, stops }) => ({ id, name, stops })),
    favorites: favorites.map(({ id, name, created, modified, thumbnail, setting }) =>
      ({ id, name, created, modified, thumbnail, setting })),
  };
}

/**
 * Reads an exported file (string or object). Never overwrites anything in `existing`
 * ({ favorites, palettes }). Returns the NEW favorites and palettes to add, plus a summary.
 * Throws an Error with a friendly message for files that are not ALFinity files.
 */
export function parseFavoritesFile(input, existing, builtinPaletteIds, now = new Date()) {
  let file = input;
  if (typeof input === "string") {
    try {
      file = JSON.parse(input);
    } catch {
      throw new Error("This file could not be read. Is it an ALFinity favorites file?");
    }
  }
  if (!isObject(file) || file.app !== "ALFinity") {
    throw new Error("This is not an ALFinity favorites file.");
  }
  const warnings = [];
  if (typeof file.formatVersion === "number" && file.formatVersion > FORMAT_VERSION) {
    warnings.push("The file comes from a newer version of ALFinity; some details may be missing.");
  }

  // Palettes: reuse identical ones, rename clashing ids, add the rest.
  const existingById = new Map(existing.palettes.map((p) => [p.id, p]));
  const remap = new Map();
  const newPalettes = [];
  for (const p of Array.isArray(file.palettes) ? file.palettes : []) {
    if (!validPalette(p)) continue;
    const stops = p.stops.map((x) => x.toLowerCase());
    const same = existing.palettes.find((e) => e.stops.join() === stops.join());
    if (same) {
      remap.set(p.id, same.id);
      continue;
    }
    const id = existingById.has(p.id) ? newId("custom-") : p.id;
    remap.set(p.id, id);
    newPalettes.push({ id, name: cleanName(p.name, "Imported palette", 40), stops, builtIn: false });
  }

  const known = [...builtinPaletteIds, ...existing.palettes.map((p) => p.id), ...newPalettes.map((p) => p.id)];
  const usedIds = new Set(existing.favorites.map((f) => f.id));
  const favorites = [];
  const skipped = [];
  for (const f of Array.isArray(file.favorites) ? file.favorites : []) {
    const name = cleanName(f?.name, "Imported favorite", 60);
    const raw = isObject(f?.setting) ? structuredClone(f.setting) : null;
    if (raw && isObject(raw.color) && remap.has(raw.color.paletteId)) {
      raw.color.paletteId = remap.get(raw.color.paletteId);
    }
    const { setting } = validateSetting(raw, known);
    if (!setting) {
      skipped.push(name);
      continue;
    }
    const stamp = now.toISOString();
    const id = typeof f.id === "string" && f.id && !usedIds.has(f.id) ? f.id : newId();
    usedIds.add(id);
    favorites.push({
      id,
      name,
      setting,
      thumbnail: typeof f.thumbnail === "string" && f.thumbnail.startsWith("data:image/") ? f.thumbnail : null,
      created: typeof f.created === "string" ? f.created : stamp,
      modified: typeof f.modified === "string" ? f.modified : stamp,
    });
  }
  return {
    favorites,
    palettes: newPalettes,
    summary: { imported: favorites.length, skipped, warnings },
  };
}

// Browser storage (localStorage). Every access is wrapped: storage can be full, blocked
// (private browsing) or unavailable, and the app must keep working without it.

import { validateSetting, newId } from "./settings.js";

export { newId };

const KEYS = {
  palettes: "alfinity.palettes.v1",
  favorites: "alfinity.favorites.v1",
  last: "alfinity.last.v1",
  meta: "alfinity.meta.v1",
};

const HEX = /^#[0-9a-f]{6}$/i;

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Returns true if the value was stored. */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** True if this browser lets the app store anything at all. */
export function storageAvailable() {
  try {
    const probe = "alfinity.probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// ---- Custom palettes ----

/** Checks a custom palette: "2–8 hex colors", name "1–40 characters". */
export function isValidPalette(p) {
  return !!p && typeof p.id === "string" && p.id.startsWith("custom-") &&
    typeof p.name === "string" && p.name.trim().length >= 1 && p.name.trim().length <= 40 &&
    Array.isArray(p.stops) && p.stops.length >= 2 && p.stops.length <= 8 &&
    p.stops.every((s) => typeof s === "string" && HEX.test(s));
}

/** Custom palettes saved on this device; invalid entries are skipped. */
export function loadPalettes() {
  const list = read(KEYS.palettes);
  if (!Array.isArray(list)) return [];
  return list.filter(isValidPalette).map((p) => ({
    id: p.id, name: p.name.trim(), stops: p.stops.map((s) => s.toLowerCase()), builtIn: false,
  }));
}

/** Returns false if the palettes could not be stored. */
export function savePalettes(list) {
  return write(KEYS.palettes, list.map(({ id, name, stops }) => ({ id, name, stops })));
}

// ---- Favorites ----

/** Favorites saved on this device, each setting validated; broken entries are skipped. */
export function loadFavorites(knownPaletteIds) {
  const list = read(KEYS.favorites);
  if (!Array.isArray(list)) return [];
  const result = [];
  for (const f of list) {
    if (!f || typeof f.id !== "string" || typeof f.name !== "string") continue;
    const { setting } = validateSetting(f.setting, knownPaletteIds);
    if (!setting) continue;
    result.push({
      id: f.id,
      name: f.name.trim().slice(0, 60) || "Favorite",
      setting,
      thumbnail: typeof f.thumbnail === "string" ? f.thumbnail : null,
      created: typeof f.created === "string" ? f.created : new Date().toISOString(),
      modified: typeof f.modified === "string" ? f.modified : new Date().toISOString(),
    });
  }
  return result;
}

export function saveFavorites(list) {
  return write(KEYS.favorites, list);
}

// ---- Last setting (FR-021) ----

export function loadLast(knownPaletteIds) {
  return validateSetting(read(KEYS.last), knownPaletteIds).setting;
}

export function saveLast(setting) {
  return write(KEYS.last, setting);
}

// ---- App bookkeeping (FR-019a–c) ----

const META_DEFAULTS = {
  persistRequested: false,
  persistGranted: null,
  installHintShown: false,
  changesSinceExport: 0,
  backupReminder: true,
};

export function loadMeta() {
  const m = read(KEYS.meta);
  const meta = { ...META_DEFAULTS };
  if (m && typeof m === "object") {
    for (const key of Object.keys(META_DEFAULTS)) {
      if (typeof m[key] === typeof META_DEFAULTS[key] || (key === "persistGranted" && typeof m[key] === "boolean")) {
        meta[key] = m[key];
      }
    }
    meta.changesSinceExport = Math.max(0, Math.floor(meta.changesSinceExport) || 0);
  }
  return meta;
}

/** Merges `partial` into the stored meta data and returns the result. */
export function saveMeta(partial) {
  const meta = { ...loadMeta(), ...partial };
  write(KEYS.meta, meta);
  return meta;
}

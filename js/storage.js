// Browser storage (localStorage). Every access is wrapped: storage can be full, blocked
// (private browsing) or unavailable, and the app must keep working without it.

const KEYS = {
  palettes: "alfinity.palettes.v1",
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

/** A short random id; crypto.randomUUID needs HTTPS, which local network testing lacks. */
export function newId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}${uuid}`;
}

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

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSetting, encodeShareLink, decodeShareLink,
  buildFavoritesFile, parseFavoritesFile,
} from "../js/settings.js";
import { DEFAULT_SETTING, BUILTIN_PALETTES } from "../js/defaults.js";

const builtinIds = BUILTIN_PALETTES.map((p) => p.id);
const clone = (x) => structuredClone(x);

test("a valid setting passes unchanged", () => {
  const { setting, warnings } = validateSetting(clone(DEFAULT_SETTING), builtinIds);
  assert.deepEqual(setting, DEFAULT_SETTING);
  assert.equal(warnings.length, 0);
});

test("unknown fields are dropped", () => {
  const input = { ...clone(DEFAULT_SETTING), hacked: true, view: { ...DEFAULT_SETTING.view, extra: 1 } };
  const { setting } = validateSetting(input, builtinIds);
  assert.equal("hacked" in setting, false);
  assert.equal("extra" in setting.view, false);
});

test("out-of-range numbers are clamped", () => {
  const input = clone(DEFAULT_SETTING);
  input.detail = 99;
  input.maxIter = 5;
  input.color.density = 500;
  input.color.shift = 1.25;
  input.view.width = 100;
  input.julia.re = -7;
  const { setting, warnings } = validateSetting(input, builtinIds);
  assert.equal(setting.detail, 4);
  assert.equal(setting.maxIter, 50);
  assert.equal(setting.color.density, 20);
  assert.equal(setting.color.shift, 0.25);
  assert.equal(setting.view.width, 8);
  assert.equal(setting.julia.re, -2);
  assert.ok(warnings.length > 0);
});

test("non-finite numbers are rejected and replaced by defaults", () => {
  const input = clone(DEFAULT_SETTING);
  input.view.cx = NaN;
  input.detail = Infinity;
  input.julia.im = "abc";
  const { setting, warnings } = validateSetting(input, builtinIds);
  assert.equal(setting.view.cx, DEFAULT_SETTING.view.cx);
  assert.equal(setting.detail, 1);
  assert.equal(setting.julia.im, DEFAULT_SETTING.julia.im);
  assert.ok(warnings.length >= 3);
});

test("unknown palettes and bad colors fall back to defaults", () => {
  const input = clone(DEFAULT_SETTING);
  input.color.paletteId = "custom-gone";
  input.color.inside = "blue";
  const { setting } = validateSetting(input, builtinIds);
  assert.equal(setting.color.paletteId, "ocean");
  assert.equal(setting.color.inside, "#000000");
});

test("non-objects are rejected", () => {
  assert.equal(validateSetting(null, builtinIds).setting, null);
  assert.equal(validateSetting("x", builtinIds).setting, null);
});

test("share link round trip keeps full number precision", () => {
  const s = clone(DEFAULT_SETTING);
  s.type = "julia";
  s.view = { cx: -0.743643887037158704752191506114774, cy: 0.131825904205311970493132056385139, width: 3.1e-12 };
  s.maxIter = 4321;
  s.color = { paletteId: "fire", shift: 0.37, density: 3.3, smooth: false, inside: "#112233" };
  const hash = encodeShareLink(s);
  assert.ok(hash.startsWith("#s="));
  assert.match(hash.slice(3), /^[A-Za-z0-9_-]+$/);
  const { setting } = decodeShareLink(hash, builtinIds);
  assert.deepEqual(setting, s);
});

test("share link carries a custom palette", () => {
  const s = clone(DEFAULT_SETTING);
  s.color.paletteId = "custom-abc";
  const palette = { id: "custom-abc", name: "Mine", stops: ["#010203", "#fafafa"] };
  const decoded = decodeShareLink(encodeShareLink(s, palette), builtinIds);
  assert.deepEqual(decoded.palette.stops, palette.stops);
  assert.equal(decoded.setting.color.paletteId, "custom-abc");
});

test("broken share links return null", () => {
  assert.equal(decodeShareLink("#s=!!!", builtinIds), null);
  assert.equal(decodeShareLink("#other", builtinIds), null);
});

const fav = (id, name, paletteId = "ocean") => ({
  id, name, created: "2026-10-17T10:00:00.000Z", modified: "2026-10-17T10:00:00.000Z",
  thumbnail: "data:image/jpeg;base64,AAAA",
  setting: { ...clone(DEFAULT_SETTING), color: { ...DEFAULT_SETTING.color, paletteId } },
});

test("favorites file round trip includes only used custom palettes", () => {
  const palettes = [
    { id: "custom-1", name: "Used", stops: ["#000000", "#ff0000"] },
    { id: "custom-2", name: "Unused", stops: ["#000000", "#00ff00"] },
  ];
  const file = buildFavoritesFile([fav("a", "One", "custom-1"), fav("b", "Two")], palettes);
  assert.equal(file.app, "ALFinity");
  assert.equal(file.formatVersion, 1);
  assert.deepEqual(file.palettes.map((p) => p.id), ["custom-1"]);

  const result = parseFavoritesFile(JSON.stringify(file), { favorites: [], palettes: [] }, builtinIds);
  assert.equal(result.favorites.length, 2);
  assert.equal(result.palettes.length, 1);
  assert.equal(result.favorites[0].setting.color.paletteId, "custom-1");
  assert.equal(result.summary.imported, 2);
});

test("import never overwrites: existing ids get new ids", () => {
  const existing = { favorites: [fav("a", "Mine")], palettes: [] };
  const file = buildFavoritesFile([fav("a", "Theirs")], []);
  const result = parseFavoritesFile(file, existing, builtinIds);
  assert.notEqual(result.favorites[0].id, "a");
  assert.equal(result.favorites[0].name, "Theirs");
});

test("a palette id clash with different colors is imported under a new id", () => {
  const existing = { favorites: [], palettes: [{ id: "custom-1", name: "Mine", stops: ["#111111", "#222222"] }] };
  const file = buildFavoritesFile([fav("x", "Theirs", "custom-1")],
    [{ id: "custom-1", name: "Theirs", stops: ["#333333", "#444444"] }]);
  const result = parseFavoritesFile(file, existing, builtinIds);
  assert.equal(result.palettes.length, 1);
  assert.notEqual(result.palettes[0].id, "custom-1");
  assert.equal(result.favorites[0].setting.color.paletteId, result.palettes[0].id);
});

test("same palette already present is reused", () => {
  const stops = ["#111111", "#222222"];
  const existing = { favorites: [], palettes: [{ id: "custom-1", name: "Mine", stops }] };
  const file = buildFavoritesFile([fav("x", "Theirs", "custom-1")], [{ id: "custom-1", name: "Mine", stops }]);
  const result = parseFavoritesFile(file, existing, builtinIds);
  assert.equal(result.palettes.length, 0);
  assert.equal(result.favorites[0].setting.color.paletteId, "custom-1");
});

test("files from other apps are rejected", () => {
  assert.throws(() => parseFavoritesFile({ app: "Other", formatVersion: 1, favorites: [] },
    { favorites: [], palettes: [] }, builtinIds), /not an ALFinity/);
  assert.throws(() => parseFavoritesFile("not json", { favorites: [], palettes: [] }, builtinIds));
});

test("a newer format version is imported with a warning; bad entries are skipped", () => {
  const file = buildFavoritesFile([fav("a", "Good")], []);
  file.formatVersion = 9;
  file.favorites.push({ name: "Broken", setting: 42 });
  const result = parseFavoritesFile(file, { favorites: [], palettes: [] }, builtinIds);
  assert.equal(result.favorites.length, 1);
  assert.equal(result.summary.skipped.length, 1);
  assert.ok(result.summary.warnings.some((w) => /newer/.test(w)));
});

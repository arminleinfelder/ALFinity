// Draws the app icons with ALFinity's own fractal code and writes them as PNG files.
// Developer tool only (Node built-ins, no packages):  node scripts/make-icons.mjs

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { valueAt } from "../js/fractal.js";
import { buildColorTable, hexToRgb, TABLE_SIZE } from "../js/palette.js";
import { getPalette } from "../js/defaults.js";

const VIEW = { cx: -0.65, cy: 0, width: 2.9 };
const COLOR = { paletteId: "ocean", shift: 0.05, density: 4, inside: "#05070c" };
const MAX_ITER = 400;
const SAMPLES = 3; // per axis, for smooth edges

const table = buildColorTable(getPalette(COLOR.paletteId).stops);
const inside = hexToRgb(COLOR.inside);

/** Same mapping as the shared coloring shader (linear palette lookup, wrapping). */
function colorize(nu) {
  if (nu < 0) return inside;
  const t = ((nu * COLOR.density) / 100 + COLOR.shift) % 1;
  const pos = t * TABLE_SIZE - 0.5;
  const i0 = (Math.floor(pos) + TABLE_SIZE) % TABLE_SIZE;
  const i1 = (i0 + 1) % TABLE_SIZE;
  const f = pos - Math.floor(pos);
  return [0, 1, 2].map((c) => table[i0 * 4 + c] * (1 - f) + table[i1 * 4 + c] * f);
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = VIEW.width / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const re = VIEW.cx + (x + (sx + 0.5) / SAMPLES - size / 2) * s;
          const im = VIEW.cy - (y + (sy + 0.5) / SAMPLES - size / 2) * s;
          const c = colorize(valueAt("mandelbrot", re, im, 0, 0, MAX_ITER));
          for (let k = 0; k < 3; k++) acc[k] += c[k];
        }
      }
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) rgba[o + k] = Math.round(acc[k] / (SAMPLES * SAMPLES));
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

// ---- Minimal PNG encoder ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  writeFileSync(new URL(`../icons/${name}`, import.meta.url), png(size, render(size)));
  console.log(`icons/${name} (${size}×${size})`);
}

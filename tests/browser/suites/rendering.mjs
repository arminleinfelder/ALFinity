// Picture content: both engines agree, exports and thumbnails are never blank
// (regression test for the WebGL feedback loop that left CPU-rendered images empty).
import { wait } from "../lib/page.mjs";

export const description = "engine agreement and non-blank exports/thumbnails (desktop)";

const SEAHORSE = { cx: -0.743643887037151, cy: 0.13182590420533 };

/** In-page: renders a setting with both engines at w×h and compares 16×16-pixel block averages. */
const COMPARE = `async (setting, w, h) => {
  const { GpuEngine } = await import("/js/render/gpu.js");
  const { CpuEngine } = await import("/js/render/cpu.js");
  const { getPalette } = await import("/js/defaults.js");
  const { effectiveMaxIter } = await import("/js/fractal.js");
  const { pixelScale } = await import("/js/view.js");
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const gpu = new GpuEngine(canvas);
  gpu.setPalette(getPalette(setting.color.paletteId).stops);
  gpu.setColor(setting.color);
  const maxIter = effectiveMaxIter(setting);
  gpu.drawFractal(setting, w, h, { maxIter, offscreen: true });
  const a = gpu.readPixels(w, h);
  const r = await new CpuEngine().render({ type: setting.type, jre: setting.julia.re, jim: setting.julia.im,
    cx: setting.view.cx, cy: setting.view.cy, s: pixelScale(setting.view, w, h), W: w, H: h, maxIter, step: 1 }).promise;
  gpu.drawNu(r.data, r.gw, r.gh, 1, w, h, { offscreen: true });
  const b = gpu.readPixels(w, h);
  const B = 16;
  let diff = 0, blocks = 0;
  for (let by = 0; by + B <= h; by += B) for (let bx = 0; bx + B <= w; bx += B) {
    for (let ch = 0; ch < 3; ch++) {
      let sa = 0, sb = 0;
      for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) {
        sa += a[(y * w + x) * 4 + ch]; sb += b[(y * w + x) * 4 + ch];
      }
      diff += Math.abs(sa - sb) / (B * B);
    }
    blocks++;
  }
  return { blockDiff: diff / (blocks * 3), maxIter };
}`;

export async function run(t) {
  const page = await t.open("desktop");
  const settingOf = (view) => ({ schemaVersion: 1, type: "mandelbrot", julia: { re: -0.8, im: 0.156 }, view, detail: 1,
    maxIter: null, color: { paletteId: "ocean", shift: 0, density: 2, smooth: true, inside: "#000000" } });
  await page.open();
  await page.eval("localStorage.clear()");

  // Engines agree: at 100× and right at the switching point (pixel = 2^-22 of the coordinates)
  const W = 960, H = 600;
  for (const [label, width] of [["100×", 3.2 / 100], ["switching point", 2 ** -22 * H]]) {
    const r = await page.eval(`(${COMPARE})(${JSON.stringify(settingOf({ ...SEAHORSE, width }))}, ${W}, ${H})`);
    t.check(`graphics card and CPU pictures agree at ${label}`, r.blockDiff < 6, `average block difference ${r.blockDiff.toFixed(2)}/255`);
  }

  // Graphics-card export (4K) and CPU export (deep view, HD) contain a real picture
  async function exportAndInspect(sizeId) {
    await page.click('[data-action="image"]');
    await wait(200);
    await page.click(`input[value="${sizeId}"]`);
    await page.click("[data-start]");
    const download = await page.takeDownload();
    const stats = download && await page.imageStats();
    await page.escape();
    return stats;
  }
  await page.open();
  await wait(1000);
  let st = await exportAndInspect("4k");
  t.check("4K export (graphics card) has a full picture", st && st.width === 3840 && st.transparent === 0 && st.spread > 10,
    st && `${st.width}×${st.height}, brightness spread ${st.spread.toFixed(0)}`);

  await page.startAt({ ...SEAHORSE, width: 3.2e-7 });
  await page.open();
  await page.waitForCpuRender();
  st = await exportAndInspect("hd");
  t.check("deep HD export (CPU tiles) has a full picture", st && st.width === 1920 && st.transparent === 0 && st.spread > 10,
    st && `${st.width}×${st.height}, brightness spread ${st.spread.toFixed(0)}`);

  // Thumbnail of a favorite saved at CPU depth
  await page.click('[data-action="favorites"]');
  await page.click("[data-save]");
  await page.click('[data-save-form] button[type="submit"]');
  let thumb = null;
  for (let i = 0; i < 100 && !thumb; i++) {
    await wait(200);
    thumb = await page.eval(`JSON.parse(localStorage.getItem("alfinity.favorites.v1") ?? "[]")[0]?.thumbnail ?? null`);
  }
  st = thumb && await page.imageStats(thumb);
  t.check("thumbnail of a deep favorite shows the picture", st && st.spread > 10, st && `brightness spread ${st.spread.toFixed(0)}`);
  await page.shot("rendering-deep-favorite");

  t.noProblems(page);
  await page.close();
}

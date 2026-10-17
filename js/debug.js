// Developer tool (?debug=compare): draws the current view with both engines and reports
// how much they differ. Used to check the engines match and to tune GPU_PRECISION.

import { pixelScale } from "./view.js";
import { effectiveMaxIter } from "./fractal.js";

const SIZE = 480; // compare at a small size so the CPU side is quick

export async function compareEngines(renderer, setting, W, H) {
  const scale = Math.min(1, SIZE / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));
  const maxIter = effectiveMaxIter(setting);

  renderer.cancel();
  renderer.gpu.drawFractal(setting, w, h, { maxIter, offscreen: true });
  const gpuPixels = renderer.gpu.readPixels(w, h);

  const job = renderer.cpu.render({
    type: setting.type, jre: setting.julia.re, jim: setting.julia.im,
    cx: setting.view.cx, cy: setting.view.cy, s: pixelScale(setting.view, w, h),
    W: w, H: h, maxIter, step: 1,
  });
  const result = await job.promise;
  if (!result) return null;
  renderer.gpu.drawNu(result.data, result.gw, result.gh, 1, w, h, { offscreen: true });
  const cpuPixels = renderer.gpu.readPixels(w, h);

  let maxDiff = 0;
  let differing = 0;
  for (let i = 0; i < gpuPixels.length; i += 4) {
    const d = Math.max(
      Math.abs(gpuPixels[i] - cpuPixels[i]),
      Math.abs(gpuPixels[i + 1] - cpuPixels[i + 1]),
      Math.abs(gpuPixels[i + 2] - cpuPixels[i + 2]),
    );
    maxDiff = Math.max(maxDiff, d);
    if (d > 16) differing++;
  }
  const stats = {
    size: `${w}×${h}`,
    maxIter,
    maxChannelDiff: maxDiff,
    differingPercent: (100 * differing) / (w * h),
  };
  console.log("ALFinity engine comparison", stats);
  showOverlay(gpuPixels, cpuPixels, w, h, stats);
  return stats;
}

function showOverlay(gpuPixels, cpuPixels, w, h, stats) {
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w * 2, h);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4; // GL rows are bottom-up
    image.data.set(gpuPixels.subarray(src, src + w * 4), y * w * 8);
    image.data.set(cpuPixels.subarray(src, src + w * 4), y * w * 8 + w * 4);
  }
  ctx.putImageData(image, 0, 0);

  const overlay = document.createElement("div");
  overlay.className = "compare-overlay";
  overlay.innerHTML = `
    <div>Left: graphics card · Right: CPU</div>
    <div>${stats.size}, ${stats.maxIter} iterations — max color difference
      ${stats.maxChannelDiff}/255, ${stats.differingPercent.toFixed(2)}% of pixels differ visibly</div>
    <div style="opacity:.7">Tap to close</div>`;
  overlay.insertBefore(canvas, overlay.children[1]);
  overlay.addEventListener("click", () => overlay.remove());
  document.body.append(overlay);
}

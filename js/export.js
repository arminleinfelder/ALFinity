// Image export: renders large pictures tile by tile and saves them as PNG (US5, FR-023).

import { tileView, engineFor } from "./view.js";
import { effectiveMaxIter } from "./fractal.js";

// Smaller GPU tiles: reading pixels back waits for the graphics card, which briefly blocks the page.
const TILE = { gpu: 1024, cpu: 2048 };
export const MAX_EXPORT_W = 7680;
export const MAX_EXPORT_H = 4320;
const IOS_MAX_PIXELS = 16_777_216; // Safari's canvas area limit on iPhone/iPad

function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Returns a message if this device cannot make an image of this size, else null. */
export function sizeProblem(W, H) {
  if (isAppleTouchDevice() && W * H > IOS_MAX_PIXELS) {
    return "This size is too large for this device — try 4K.";
  }
  return null;
}

const nextTask = () => new Promise((r) => setTimeout(r, 0));

/**
 * Renders `setting` at W×H and returns a PNG Blob.
 * onProgress(fraction); `signal` (AbortSignal) cancels the export.
 */
export async function exportImage(renderer, setting, W, H, { onProgress = () => {}, signal } = {}) {
  const problem = sizeProblem(W, H);
  if (problem) throw new Error(problem);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This size is too large for this device — try a smaller size.");

  // One engine and one iteration depth for the whole picture, so the tiles match.
  const engine = engineFor(setting.view, W, H);
  const maxIter = effectiveMaxIter(setting);
  const size = TILE[engine];
  const tiles = [];
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) tiles.push([x, y, Math.min(size, W - x), Math.min(size, H - y)]);
  }

  const onAbort = () => renderer.cancelOffscreen();
  signal?.addEventListener("abort", onAbort);
  try {
    for (let i = 0; i < tiles.length; i++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const [x, y, tw, th] = tiles[i];
      const tile = { ...setting, view: tileView(setting.view, W, H, x, y, tw, th) };
      const pixels = await renderer.renderPixels(tile, tw, th, { engine, maxIter });
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer), tw, th), x, y);
      onProgress((i + 1) / tiles.length);
      await nextTask(); // keep the app responsive between tiles (SC-007)
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The image could not be created — try a smaller size.");
  return blob;
}

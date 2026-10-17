// CPU engine worker: computes smooth iteration values for a strip of grid rows.
// Message protocol: contracts/render-engine.md.

import { valueAt } from "../fractal.js";

self.onmessage = ({ data: msg }) => {
  const { jobId, p, y0, y1 } = msg;
  const { type, jre, jim, cx, cy, s, W, H, step, gw, maxIter } = p;
  const out = new Float32Array((y1 - y0) * gw);
  const half = step / 2;
  let i = 0;
  for (let gy = y0; gy < y1; gy++) {
    const im = cy - (gy * step + half - H / 2) * s;
    for (let gx = 0; gx < gw; gx++) {
      const re = cx + (gx * step + half - W / 2) * s;
      out[i++] = valueAt(type, re, im, jre, jim, maxIter);
    }
  }
  self.postMessage({ jobId, y0, y1, data: out }, [out.buffer]);
};

// Speed against the success criteria (only with --perf). Timing hooks are injected before the
// page loads; the app itself is unchanged. SC-002 for deep views is reported, not checked.
import { wait } from "../lib/page.mjs";

export const description = "speed: SC-001 first picture, SC-002 deep views, SC-003 recolor, SC-007 responsiveness";

const HOOKS = `
  window.__perf = { draws: [], longtasks: [], frames: [] };
  const draw = WebGL2RenderingContext.prototype.drawArrays;
  WebGL2RenderingContext.prototype.drawArrays = function (...a) {
    const r = draw.apply(this, a);
    window.__perf.draws.push(performance.now());
    return r;
  };
  new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__perf.longtasks.push(e.duration)))
    .observe({ type: "longtask", buffered: true });
  let prev = 0;
  (function tick(time) { if (prev) window.__perf.frames.push(time - prev); prev = time; requestAnimationFrame(tick); })(0);
`;

const SEAHORSE = { cx: -0.743643887037151, cy: 0.13182590420533 };

export async function run(t) {
  for (const device of ["desktop", "iphone", "4k"]) {
    const page = await t.open(device);
    const check = (label, ok, detail) => t.check(`${device}: ${label}`, ok, detail);
    const perf = () => page.eval("window.__perf");
    const reset = () => page.eval("Object.assign(window.__perf, { draws: [], longtasks: [], frames: [] }); performance.now()");
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: HOOKS });
    await page.open();
    await page.eval("localStorage.clear()");
    await page.open();
    await wait(2000);
    let p = await perf();
    check("SC-001 first picture in under 2 s", p.draws[0] < 2000, `${Math.round(p.draws[0])} ms after page start`);

    const { width: cw, height: ch } = page.device;
    await reset();
    for (let i = 0; i < 40; i++) {
      await page.wheel(cw * 0.4, ch * 0.45, -60);
      await wait(16);
    }
    await wait(300);
    p = await perf();
    const frames = p.frames.filter((f) => f < 1000);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    check("zooming on the graphics card runs smoothly", avg < 25 && Math.max(...frames) < 100,
      `${(1000 / avg).toFixed(0)} fps, slowest frame ${Math.round(Math.max(...frames))} ms`);

    await page.click('[data-action="colors"]');
    await wait(300);
    let t0 = await reset();
    await page.click('[data-palette="fire"]');
    await wait(500);
    p = await perf();
    const recolor = p.draws.find((d) => d > t0) - t0;
    check("SC-003 recolor in under 0.1 s (graphics card view)", recolor < 100, `${Math.round(recolor)} ms`);
    await page.escape();

    for (const zoom of [1e5, 1e6, 1e8]) {
      await page.startAt({ ...SEAHORSE, width: 3.2 / zoom });
      await page.open();
      const cpu = await page.waitForCpuRender(120000);
      await wait(100);
      p = await perf();
      const blocked = p.longtasks.filter((d) => d > 100);
      const full = p.draws[p.draws.length - 1];
      console.log(`    · zoom ${zoom.toExponential(0)}: ${cpu ? "CPU" : "GPU"}, preview after ${Math.round(p.draws[0])} ms, ` +
        `full picture after ${Math.round(full)} ms (SC-002 target 2000 ms, incl. page load)`);
      check(`SC-007 page stays responsive during the zoom ${zoom.toExponential(0)} render`, blocked.length === 0,
        blocked.length ? `${blocked.length} pauses, longest ${Math.round(Math.max(...blocked))} ms` : "");
      if (zoom === 1e6 && cpu) {
        await page.click('[data-action="colors"]');
        await wait(300);
        t0 = await reset();
        await page.click('[data-palette="ice"]');
        await wait(400);
        p = await perf();
        const rc = p.draws.find((d) => d > t0) - t0;
        check("SC-003 recolor in under 0.1 s (CPU view, no recalculation)", rc < 100, `${Math.round(rc)} ms`);
        await page.escape();
      }
    }
    t.noProblems(page);
    await page.close();
  }
}

// Exploring on desktop: wheel, drag, double-click, undo/redo, keys, max zoom, resize, deep zoom.
import { wait } from "../lib/page.mjs";

export const description = "zoom, pan, undo/redo, keyboard, maximum zoom, resize, deep zoom (desktop)";

const SEAHORSE = { cx: -0.743643887037151, cy: 0.13182590420533 };

export async function run(t) {
  const page = await t.open("desktop");
  await page.open();
  await page.eval("localStorage.clear()");
  await page.open();
  await wait(1200);
  const zoom = (s) => 3.2 / s.view.width;

  for (let i = 0; i < 5; i++) await page.wheel(500, 450, -240);
  const s1 = await page.setting();
  t.check("mouse wheel zooms in toward the pointer", zoom(s1) > 2 && s1.view.cx < -0.6, `zoom ${zoom(s1).toFixed(2)}`);

  await page.drag(700, 450, 900, 520);
  const s2 = await page.setting();
  t.check("dragging moves the picture with the pointer", s2.view.cx < s1.view.cx && s2.view.cy > s1.view.cy);

  await page.doubleClick(720, 450);
  const s3 = await page.setting();
  t.check("double-click zooms in 2×", Math.abs(zoom(s3) / zoom(s2) - 2) < 1e-9);

  await page.click('[data-action="undo"]');
  const s4 = await page.setting();
  await page.click('[data-action="redo"]');
  const s5 = await page.setting();
  t.check("undo and redo restore exact views", s4.view.width === s2.view.width && s5.view.width === s3.view.width);

  await page.key("0", { code: "Digit0", keyCode: 48, text: "0" });
  const s6 = await page.setting();
  t.check("key 0 resets the view", s6.view.cx === -0.6 && s6.view.width === 3.2);

  await page.key("ArrowRight", { code: "ArrowRight", keyCode: 39 });
  await page.key("-", { code: "Minus", keyCode: 189, text: "-" });
  const s7 = await page.setting();
  t.check("arrow right moves the view right, minus zooms out", s7.view.cx > s6.view.cx && s7.view.width === 6.4);

  // Maximum zoom
  await page.startAt({ ...SEAHORSE, width: 4e-12 });
  await page.open();
  await wait(800);
  for (let i = 0; i < 6; i++) await page.click('[data-action="zoomIn"]');
  const msg = await page.message();
  const s8 = await page.setting();
  t.check("zooming stops at the precision limit with a message", /Maximum zoom/.test(msg) && zoom(s8) < 1e13,
    `zoom ${zoom(s8).toExponential(2)}`);

  // Resize keeps center and zoom
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 700, deviceScaleFactor: 2, mobile: false });
  await wait(1200);
  const size = await page.eval(`[document.getElementById("view").width, document.getElementById("view").height]`);
  const s9 = await page.setting();
  t.check("resizing the window keeps center and zoom", size.join() === "2000,1400" &&
    s9.view.cx === s8.view.cx && s9.view.width === s8.view.width);
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  // Deep zoom on the CPU engine
  await page.startAt({ ...SEAHORSE, width: 3.2e-6 });
  const t0 = Date.now();
  await page.open();
  const cpu = await page.waitForCpuRender();
  t.check("deep view (10⁶×) is drawn by the CPU engine", cpu, `${Date.now() - t0} ms incl. page load`);
  await wait(300);
  await page.shot("explore-deep-1e6");

  t.noProblems(page);
  await page.close();
}

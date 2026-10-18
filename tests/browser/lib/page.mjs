// A browser tab controlled through the Chrome DevTools Protocol (Node built-ins only):
// device emulation, touch and mouse input, screenshots, console messages.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPADOS = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** Screen sizes in CSS pixels; dpr = device pixel ratio. */
export const DEVICES = {
  desktop: { width: 1440, height: 900, dpr: 2, mobile: false },
  "4k": { width: 1920, height: 1080, dpr: 2, mobile: false },
  ipad: { width: 820, height: 1180, dpr: 2, mobile: true, ua: IPADOS },
  iphone: { width: 390, height: 844, dpr: 3, mobile: true, ua: IOS },
  "iphone-landscape": { width: 844, height: 390, dpr: 3, mobile: true, ua: IOS },
};

/**
 * Catches the files the app offers for download (favorites export, images) inside the page,
 * so tests can check them without Chrome's download machinery (which blocks repeated
 * automatic downloads when nobody can answer its prompt).
 */
const DOWNLOAD_HOOK = `
  window.__downloads = [];
  const create = URL.createObjectURL;
  URL.createObjectURL = (blob) => { window.__lastBlob = blob; return create.call(URL, blob); };
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) window.__downloads.push({ name: this.download, blob: window.__lastBlob });
  };
`;

/** In-page: size, transparent pixels and brightness spread of an image Blob or data URL. */
const IMAGE_STATS = `async (source) => {
  const img = typeof source === "string"
    ? await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = source; })
    : await createImageBitmap(source);
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let transparent = 0, sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 7) {
    if (d[i + 3] < 255) transparent++;
    const y = 0.3 * d[i] + 0.6 * d[i + 1] + 0.1 * d[i + 2];
    sum += y; sum2 += y * y; n++;
  }
  return { width: c.width, height: c.height, transparent, spread: Math.sqrt(Math.max(0, sum2 / n - (sum / n) ** 2)) };
}`;

/** Opens a new tab emulating `deviceName`. ctx = { port, base, output }. */
export async function openPage(ctx, deviceName = "desktop") {
  const device = { name: deviceName, ...DEVICES[deviceName] };
  const target = await (await fetch(`http://127.0.0.1:${ctx.port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  const logs = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result);
      return;
    }
    for (const fn of listeners.get(msg.method) ?? []) fn(msg.params, msg.sessionId);
  };

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };
  const once = (method, timeout = 20000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeout);
    const fn = (params) => {
      clearTimeout(timer);
      listeners.set(method, listeners.get(method).filter((f) => f !== fn));
      resolve(params);
    };
    on(method, fn);
  });

  // Console output and errors of the page and its workers
  const describe = (a) => (a.value !== undefined ? (typeof a.value === "string" ? a.value : JSON.stringify(a.value))
    : a.description ?? a.unserializableValue ?? a.type);
  on("Runtime.consoleAPICalled", (p, sid) =>
    logs.push({ level: p.type, text: `${sid ? "[worker] " : ""}${p.args.map(describe).join(" ")}` }));
  on("Runtime.exceptionThrown", (p, sid) => {
    const d = p.exceptionDetails;
    logs.push({ level: "exception", text: `${sid ? "[worker] " : ""}${d.exception?.description ?? d.text}` });
  });
  on("Log.entryAdded", (p) => logs.push({ level: p.entry.level, text: p.entry.text }));
  on("Target.attachedToTarget", async (p) => {
    await send("Runtime.enable", {}, p.sessionId).catch(() => {});
    await send("Runtime.runIfWaitingForDebugger", {}, p.sessionId).catch(() => {});
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true }); // always test the current files
  await send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true }); // clipboard needs a focused page
  await send("Emulation.setDeviceMetricsOverride", {
    width: device.width, height: device.height, deviceScaleFactor: device.dpr, mobile: device.mobile,
  });
  if (device.mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (device.ua) await send("Emulation.setUserAgentOverride", { userAgent: device.ua, platform: "iPhone" });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: DOWNLOAD_HOOK });

  const page = {
    device, logs, send, on, once,

    /** Navigates to a path of the app (relative to the test server) or a full URL. */
    async open(path = "?nosw") {
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: new URL(path, ctx.base).href });
      await loaded;
    },

    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    },

    /** The app saves its current setting 1 s after a change; this waits and reads it. */
    async setting() {
      await wait(1300);
      return page.eval(`JSON.parse(localStorage.getItem("alfinity.last.v1"))`);
    },

    /** Stores a setting as the "last view", so the next page load starts there. */
    async startAt(view, extra = {}) {
      const s = {
        schemaVersion: 1, type: "mandelbrot", julia: { re: -0.8, im: 0.156 }, view, detail: 1, maxIter: null,
        color: { paletteId: "ocean", shift: 0, density: 2, smooth: true, inside: "#000000" }, ...extra,
      };
      await page.eval(`localStorage.setItem("alfinity.last.v1", ${JSON.stringify(JSON.stringify(s))})`);
    },

    /** Waits until a CPU render has finished (progress 100 %); returns false for GPU views. */
    async waitForCpuRender(timeout = 60000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const fill = await page.eval(`document.querySelector(".progress-fill")?.style.width ?? ""`);
        if (fill === "100%") return true;
        if (!fill && Date.now() - start > 1500) return false;
        await wait(25);
      }
      throw new Error("CPU render did not finish");
    },

    visible(selector) {
      return page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
        return !!el && !!el.offsetParent && !el.closest("[hidden]"); })()`);
    },

    text(selector) {
      return page.eval(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`);
    },

    /** The current status message (bottom of the screen). */
    message() {
      return page.text('[data-role="message"]');
    },

    /** Screenshot in CSS pixels; saved to output/screens/<name>.png. */
    async shot(name) {
      const dir = join(ctx.output, "screens");
      mkdirSync(dir, { recursive: true });
      const r = await send("Page.captureScreenshot", {
        format: "png", clip: { x: 0, y: 0, width: device.width, height: device.height, scale: 1 / device.dpr },
      });
      const file = join(dir, `${name}.png`);
      writeFileSync(file, Buffer.from(r.data, "base64"));
      return file;
    },

    async center(selector) {
      const box = await page.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.width > 0 && r.height > 0 };
      })()`);
      if (!box) throw new Error(`not found: ${selector}`);
      return box;
    },

    /** Clicks (desktop) or taps (touch devices) the middle of an element. */
    async click(selector) {
      await page.eval(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "nearest" })`);
      const c = await page.center(selector);
      if (!c.visible) throw new Error(`not visible: ${selector}`);
      if (device.mobile) await page.tap(c.x, c.y);
      else await page.mouseClick(c.x, c.y);
    },

    async mouseClick(x, y, { clickCount = 1 } = {}) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount });
    },

    async doubleClick(x, y) {
      await page.mouseClick(x, y, { clickCount: 1 });
      await page.mouseClick(x, y, { clickCount: 2 });
    },

    async wheel(x, y, deltaY) {
      await send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
    },

    async drag(x1, y1, x2, y2, steps = 12) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x1, y: y1 });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x1, y: y1, button: "left", buttons: 1, clickCount: 1 });
      for (let i = 1; i <= steps; i++) {
        await send("Input.dispatchMouseEvent", {
          type: "mouseMoved", x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps, button: "left", buttons: 1,
        });
        await wait(16);
      }
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y: y2, button: "left", buttons: 0, clickCount: 1 });
    },

    async tap(x, y) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      await wait(30);
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    },

    async touchDrag(x1, y1, x2, y2, steps = 12) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x1, y: y1, id: 1 }] });
      for (let i = 1; i <= steps; i++) {
        await send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps, id: 1 }],
        });
        await wait(16);
      }
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    },

    /** Two-finger pinch around (cx, cy): the finger distance changes by `scale`. */
    async pinch(cx, cy, scale, { d0 = 80, steps = 15 } = {}) {
      const pts = (d) => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(d0) });
      for (let i = 1; i <= steps; i++) {
        await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d0 * (1 + ((scale - 1) * i) / steps)) });
        await wait(16);
      }
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    },

    async key(key, { code = key, keyCode = 0, text } = {}) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, text });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
    },

    escape() {
      return page.key("Escape", { code: "Escape", keyCode: 27 });
    },

    /**
     * Waits for the next file the app offers for download; saves a copy to output/downloads/
     * and returns { name, type, size, file, text } (text only for JSON files).
     */
    async takeDownload(timeout = 120000) {
      const start = Date.now();
      while (!(await page.eval("window.__downloads.length > 0"))) {
        if (Date.now() - start > timeout) return null;
        await wait(100);
      }
      const d = await page.eval(`(async () => {
        const { name, blob } = window.__downloads.shift();
        window.__download = blob;
        const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
        return { name, type: blob.type, size: blob.size, base64: url.slice(url.indexOf(",") + 1),
          text: blob.type.includes("json") ? await blob.text() : null };
      })()`);
      const dir = join(ctx.output, "downloads");
      mkdirSync(dir, { recursive: true });
      const file = join(dir, d.name);
      writeFileSync(file, Buffer.from(d.base64, "base64"));
      return { name: d.name, type: d.type, size: d.size, file, text: d.text };
    },

    /** Image statistics of the last download (or of a data URL). */
    imageStats(dataUrl) {
      return page.eval(`(${IMAGE_STATS})(${dataUrl ? JSON.stringify(dataUrl) : "window.__download"})`);
    },

    /** Console errors, exceptions and warnings collected so far. */
    problems() {
      return logs.filter((l) => ["error", "exception", "warning", "assert"].includes(l.level)).map((l) => `${l.level}: ${l.text}`);
    },

    async close() {
      ws.close();
      await fetch(`http://127.0.0.1:${ctx.port}/json/close/${target.id}`).catch(() => {});
    },
  };
  return page;
}

// Touch, mouse, trackpad and keyboard input (research.md R8).
//
// Handlers:
//   gesture(fn)  – continuous change during a gesture; fn(view, W, H) → new view
//   commit()     – the gesture ended
//   step(fn)     – one discrete change (double-tap, keyboard), recorded in history
//   reset(), undo(), redo()

import { pan, zoomAt } from "./view.js";

const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 350;
const TAP_SLOP_CSS = 10;
const WHEEL_END_MS = 250;

export function attachInput(canvas, handlers) {
  const pointers = new Map();
  let last = null; // { count, x, y, dist }
  let down = null; // first pointer of a gesture: { time, x, y, moved }
  let lastTap = null;
  let wheelTimer = 0;
  let gestureScale = 1;

  /** Device-pixel ratio of the canvas (CSS transforms do not affect clientWidth). */
  const ratio = () => canvas.width / canvas.clientWidth;
  const pos = (e) => ({ x: e.clientX * ratio(), y: e.clientY * ratio() });

  function summary() {
    const pts = [...pointers.values()];
    if (pts.length === 0) return null;
    if (pts.length === 1) return { count: 1, x: pts[0].x, y: pts[0].y, dist: 0 };
    const [a, b] = pts;
    return {
      count: pts.length,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      dist: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) down = { time: e.timeStamp, x: p.x, y: p.y, moved: false };
    else if (down) down.moved = true; // multi-finger gestures are never taps
    last = summary();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, pos(e));
    const cur = summary();
    if (down && !down.moved &&
        Math.hypot(cur.x - down.x, cur.y - down.y) > TAP_SLOP_CSS * ratio()) {
      down.moved = true;
    }
    if (last && cur.count === last.count && (!down || down.moved)) {
      const dx = cur.x - last.x;
      const dy = cur.y - last.y;
      const factor = cur.count >= 2 && last.dist > 0 ? cur.dist / last.dist : 1;
      handlers.gesture((v, W, H) => {
        let n = pan(v, W, H, dx, dy);
        if (factor !== 1) n = zoomAt(n, W, H, cur.x, cur.y, factor);
        return n;
      });
      last = cur;
    } else if (!last || cur.count !== last.count) {
      last = cur;
    }
  });

  function onPointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    last = summary();
    if (pointers.size > 0) return;
    handlers.commit();
    if (e.type === "pointerup" && down && !down.moved && e.timeStamp - down.time < TAP_MAX_MS) {
      onTap(down, e);
    }
    down = null;
  }
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);

  function onTap(tap, e) {
    const isDouble = lastTap && tap.time - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 4 * TAP_SLOP_CSS * ratio();
    if (isDouble) {
      const factor = e.shiftKey || e.altKey ? 0.5 : 2;
      handlers.step((v, W, H) => zoomAt(v, W, H, tap.x, tap.y, factor));
      lastTap = null;
    } else {
      lastTap = tap;
    }
  }

  // Mouse wheel and Chrome's trackpad pinch (sent as wheel events with ctrlKey).
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const k = e.ctrlKey ? 0.01 : 0.002;
    const factor = Math.exp(-e.deltaY * unit * k);
    const p = pos(e);
    handlers.gesture((v, W, H) => zoomAt(v, W, H, p.x, p.y, factor));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(handlers.commit, WHEEL_END_MS);
  }, { passive: false });

  // Safari sends trackpad pinch as gesture events. On iPhone/iPad the pointers already
  // handle the pinch, so these events are only used when no pointers are down.
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault();
    gestureScale = 1;
  });
  canvas.addEventListener("gesturechange", (e) => {
    e.preventDefault();
    if (pointers.size > 0) return;
    const factor = e.scale / gestureScale;
    gestureScale = e.scale;
    const p = pos(e);
    handlers.gesture((v, W, H) => zoomAt(v, W, H, p.x, p.y, factor));
  });
  canvas.addEventListener("gestureend", (e) => {
    e.preventDefault();
    if (pointers.size === 0) handlers.commit();
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) handlers.redo();
      else handlers.undo();
      return;
    }
    if (mod || e.altKey) return;
    const center = (fn) => handlers.step((v, W, H) => fn(v, W, H));
    const move = 0.1;
    switch (e.key) {
      case "+": case "=": center((v, W, H) => zoomAt(v, W, H, W / 2, H / 2, 2)); break;
      case "-": case "_": center((v, W, H) => zoomAt(v, W, H, W / 2, H / 2, 0.5)); break;
      case "ArrowLeft": center((v, W, H) => pan(v, W, H, Math.min(W, H) * move, 0)); break;
      case "ArrowRight": center((v, W, H) => pan(v, W, H, -Math.min(W, H) * move, 0)); break;
      case "ArrowUp": center((v, W, H) => pan(v, W, H, 0, Math.min(W, H) * move)); break;
      case "ArrowDown": center((v, W, H) => pan(v, W, H, 0, -Math.min(W, H) * move)); break;
      case "0": handlers.reset(); break;
      default: return;
    }
    e.preventDefault();
  });
}

// The panel: a side panel on wide screens, a bottom sheet on phones that can be dragged down
// to close (FR-007). One panel is shown at a time (colors, later favorites, …).

const CLOSE_DRAG_PX = 80;

export function createPanel(el, { onChange = () => {} } = {}) {
  el.setAttribute("role", "dialog");
  el.innerHTML = `
    <div class="sheet-handle" aria-hidden="true"></div>
    <div class="panel-header">
      <h2 class="panel-title"></h2>
      <button type="button" class="tool" data-close aria-label="Close panel" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="panel-body"></div>`;
  const title = el.querySelector(".panel-title");
  const body = el.querySelector(".panel-body");
  let current = null;

  function open(name, heading, content) {
    current = name;
    title.textContent = heading;
    el.setAttribute("aria-label", heading);
    body.replaceChildren(content);
    el.hidden = false;
    el.style.transform = "";
    onChange(current);
  }

  function close() {
    if (!current) return;
    current = null;
    el.hidden = true;
    onChange(null);
  }

  el.querySelector("[data-close]").addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && current) close();
  });

  // Drag the handle or header down to close the bottom sheet (phones only).
  let dragStart = null;
  for (const handle of [el.querySelector(".sheet-handle"), el.querySelector(".panel-header")]) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || matchMedia("(min-width: 768px)").matches) return;
      dragStart = e.clientY;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (dragStart == null) return;
      el.style.transform = `translateY(${Math.max(0, e.clientY - dragStart)}px)`;
    });
    const end = (e) => {
      if (dragStart == null) return;
      const dy = e.clientY - dragStart;
      dragStart = null;
      el.style.transform = "";
      if (dy > CLOSE_DRAG_PX) close();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  return {
    open,
    close,
    toggle(name, heading, makeContent) {
      if (current === name) close();
      else open(name, heading, makeContent());
    },
    get current() {
      return current;
    },
  };
}

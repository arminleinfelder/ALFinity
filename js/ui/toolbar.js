// Toolbar: zoom, undo/redo and reset buttons (FR-002, FR-004, FR-005).

const icon = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  zoomIn: icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 8v6M8 11h6"/>'),
  zoomOut: icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>'),
  undo: icon('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: icon('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  reset: icon('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  colors: icon('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>'),
};

const BUTTONS = [
  { action: "zoomIn", label: "Zoom in" },
  { action: "zoomOut", label: "Zoom out" },
  "sep",
  { action: "undo", label: "Undo" },
  { action: "redo", label: "Redo" },
  { action: "reset", label: "Reset view" },
  "sep",
  { action: "colors", label: "Colors", toggle: true },
];

/** `actions` maps action names to functions; `extra` adds text buttons (e.g. debug tools). */
export function createToolbar(el, actions, extra = []) {
  const buttons = BUTTONS.map((b) =>
    b === "sep"
      ? '<span class="tool-sep" aria-hidden="true"></span>'
      : `<button type="button" class="tool" data-action="${b.action}"
                 ${b.toggle ? 'aria-pressed="false"' : ""}
                 aria-label="${b.label}" title="${b.label}">${ICONS[b.action]}</button>`,
  );
  for (const b of extra) {
    buttons.push(`<button type="button" class="tool tool-text" data-action="${b.action}">${b.label}</button>`);
  }
  el.innerHTML = `
    <span class="brand surface">ALFinity</span>
    <div class="tools surface">${buttons.join("")}</div>`;

  el.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    if (button && !button.disabled) actions[button.dataset.action]?.();
  });

  const undoButton = el.querySelector('[data-action="undo"]');
  const redoButton = el.querySelector('[data-action="redo"]');
  return {
    update({ canUndo, canRedo }) {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
    },
    /** Marks which panel button is active (or none). */
    setOpenPanel(name) {
      for (const button of el.querySelectorAll("[aria-pressed]")) {
        button.setAttribute("aria-pressed", String(button.dataset.action === name));
      }
    },
  };
}

// Favorites panel: save, open, rename, delete, export/import, share link, and the
// measures that keep favorites safe from automatic deletion (US3, FR-017–FR-022).

import { buildFavoritesFile, parseFavoritesFile, newId } from "../settings.js";
import { loadMeta, saveMeta } from "../storage.js";
import { download, stamp } from "./download.js";

const REMINDER_AFTER = 5;
const ARM_MS = 3000;

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
}

/**
 * getSetting()                – current setting
 * openSetting(setting)        – show a saved setting (one undo step)
 * makeThumbnail(setting)      – Promise of a JPEG data URL
 * getFavorites() / setFavorites(list) – list in memory; setFavorites returns false if not stored
 * getCustomPalettes() / addPalettes(list)
 * builtinPaletteIds           – ids of built-in palettes
 * shareLink()                 – full URL that opens the current picture
 * status                      – status messages
 */
export function createFavoritesPanel(opts) {
  const { getSetting, openSetting, makeThumbnail, getFavorites, setFavorites, status } = opts;

  const root = document.createElement("div");
  root.className = "favorites";
  root.innerHTML = `
    <section class="panel-section">
      <div class="button-row">
        <button type="button" class="btn primary" data-save>☆ Save this picture</button>
        <button type="button" class="btn" data-copy>Copy link</button>
      </div>
      <form class="save-form" data-save-form hidden>
        <label class="field">Name
          <input type="text" maxlength="60" required data-save-name>
        </label>
        <div class="button-row">
          <button type="submit" class="btn primary">Save</button>
          <button type="button" class="btn" data-save-cancel>Cancel</button>
        </div>
      </form>
      <div class="notice" data-notice hidden></div>
    </section>

    <section class="panel-section">
      <h3>My favorites</h3>
      <p class="hint" data-empty>No favorites yet. Find a view you like and save it.</p>
      <ul class="fav-list" data-list></ul>
    </section>

    <section class="panel-section">
      <h3>Backup</h3>
      <div class="button-row">
        <button type="button" class="btn" data-export>Export all</button>
        <button type="button" class="btn" data-import>Import…</button>
        <input type="file" accept=".json,application/json" data-file hidden>
      </div>
      <p class="hint">Save your favorites to a file to keep a backup or move them to another
        device. Tick favorites in the list to export only those.</p>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const list = $("[data-list]");
  const notice = $("[data-notice]");
  const selected = new Set();
  let generating = false;

  // ---- Notices (install hint, backup reminder, link fallback) ----

  function showNotice(html, handlers = {}) {
    notice.innerHTML = html;
    notice.hidden = false;
    notice.onclick = (e) => {
      const action = e.target.closest("[data-notice-action]")?.dataset.noticeAction;
      if (!action) return;
      handlers[action]?.();
      if (action !== "keep") notice.hidden = true;
    };
  }

  // ---- List ----

  function render() {
    const favorites = getFavorites();
    $("[data-empty]").hidden = favorites.length > 0;
    for (const id of [...selected]) if (!favorites.some((f) => f.id === id)) selected.delete(id);
    list.innerHTML = favorites.map((f) => `
      <li class="fav" data-id="${f.id}">
        <input type="checkbox" class="fav-check" data-check aria-label="Select ${escapeHtml(f.name)} for export"
               ${selected.has(f.id) ? "checked" : ""}>
        <button type="button" class="fav-open" data-open title="Open ${escapeHtml(f.name)}">
          ${f.thumbnail ? `<img src="${f.thumbnail}" alt="" width="96" height="54">` : '<span class="fav-thumb-empty"></span>'}
          <span class="fav-text">
            <span class="fav-name">${escapeHtml(f.name)}</span>
            <span class="fav-date">${new Date(f.modified).toLocaleDateString()}</span>
          </span>
        </button>
        <button type="button" class="tool" data-rename aria-label="Rename ${escapeHtml(f.name)}" title="Rename">✎</button>
        <button type="button" class="tool fav-delete" data-delete aria-label="Delete ${escapeHtml(f.name)}" title="Delete">✕</button>
      </li>`).join("");
    $("[data-export]").textContent = selected.size ? `Export selected (${selected.size})` : "Export all";
    $("[data-export]").disabled = favorites.length === 0;
    fillMissingThumbnails();
  }

  /** Imported favorites may come without thumbnails; draw them one by one. */
  async function fillMissingThumbnails() {
    if (generating) return;
    generating = true;
    try {
      for (;;) {
        const f = getFavorites().find((x) => !x.thumbnail);
        if (!f) break;
        const thumbnail = await makeThumbnail(f.setting).catch(() => "");
        store(getFavorites().map((x) => (x.id === f.id ? { ...x, thumbnail } : x)), { quiet: true });
      }
    } finally {
      generating = false;
    }
    if (!root.isConnected) return;
    const missing = list.querySelector(".fav-thumb-empty");
    if (missing) render();
  }

  function store(next, { quiet = false, counts = false } = {}) {
    const ok = setFavorites(next);
    if (!ok && !quiet) {
      status.flash("Favorites cannot be stored in this browser — use Export to keep them.", 5000);
    }
    if (counts) countChange();
    if (root.isConnected) render();
    return ok;
  }

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".fav");
    if (!item) return;
    const fav = getFavorites().find((f) => f.id === item.dataset.id);
    if (!fav) return;
    if (e.target.closest("[data-open]")) openSetting(fav.setting);
    else if (e.target.closest("[data-rename]")) startRename(item, fav);
    else if (e.target.closest("[data-delete]")) armDelete(e.target.closest("[data-delete]"), fav);
  });

  list.addEventListener("change", (e) => {
    if (!e.target.matches("[data-check]")) return;
    const id = e.target.closest(".fav").dataset.id;
    if (e.target.checked) selected.add(id);
    else selected.delete(id);
    $("[data-export]").textContent = selected.size ? `Export selected (${selected.size})` : "Export all";
  });

  function startRename(item, fav) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 60;
    input.value = fav.name;
    input.className = "fav-rename";
    input.setAttribute("aria-label", "New name");
    item.querySelector(".fav-open").replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const name = input.value.trim().slice(0, 60);
      if (save && name && name !== fav.name) {
        store(getFavorites().map((f) =>
          (f.id === fav.id ? { ...f, name, modified: new Date().toISOString() } : f)), { counts: true });
      } else {
        render();
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") {
        e.stopPropagation(); // do not close the panel
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  function armDelete(button, fav) {
    if (button.dataset.armed) {
      store(getFavorites().filter((f) => f.id !== fav.id), { counts: true });
      status.flash(`Deleted “${fav.name}”`);
      return;
    }
    button.dataset.armed = "1";
    button.textContent = "Delete?";
    button.classList.add("armed");
    setTimeout(() => {
      if (!button.isConnected) return;
      delete button.dataset.armed;
      button.textContent = "✕";
      button.classList.remove("armed");
    }, ARM_MS);
  }

  // ---- Saving ----

  const form = $("[data-save-form]");
  $("[data-save]").addEventListener("click", () => {
    form.hidden = false;
    const input = $("[data-save-name]");
    input.value = `Favorite ${getFavorites().length + 1}`;
    input.focus();
    input.select();
  });
  $("[data-save-cancel]").addEventListener("click", () => {
    form.hidden = true;
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("[data-save-name]").value.trim().slice(0, 60);
    if (!name) return;
    form.hidden = true;
    const setting = getSetting();
    const thumbnail = await makeThumbnail(setting).catch(() => null);
    const now = new Date().toISOString();
    const first = getFavorites().length === 0;
    const ok = store([{ id: newId(), name, setting, thumbnail, created: now, modified: now }, ...getFavorites()],
      { counts: true });
    if (ok) status.flash(`Saved “${name}”`);
    if (ok && first) afterFirstFavorite();
  });

  // ---- Keeping favorites safe (FR-019a–c) ----

  async function afterFirstFavorite() {
    const meta = loadMeta();
    if (!meta.persistRequested && navigator.storage?.persist) {
      let granted = null;
      try {
        granted = await navigator.storage.persist();
      } catch {
        granted = null;
      }
      saveMeta({ persistRequested: true, persistGranted: granted });
    }
    if (!loadMeta().installHintShown && isAppleTouchDevice() && !isStandalone()) {
      saveMeta({ installHintShown: true });
      showNotice(`<p>Tip: tap <strong>Share → Add to Home Screen</strong> so Safari keeps your
        favorites. Safari may delete website data that has not been used for a week.</p>
        <button type="button" class="btn" data-notice-action="close">Got it</button>`);
    }
  }

  function countChange() {
    const meta = saveMeta({ changesSinceExport: loadMeta().changesSinceExport + 1 });
    if (!meta.backupReminder || meta.changesSinceExport < REMINDER_AFTER) return;
    showNotice(`<p>You have unsaved changes to your favorites — export a backup file?</p>
      <div class="button-row">
        <button type="button" class="btn primary" data-notice-action="export">Export now</button>
        <button type="button" class="btn" data-notice-action="later">Later</button>
        <button type="button" class="btn" data-notice-action="never">Don't remind me</button>
      </div>`, {
      export: () => exportFavorites(getFavorites()),
      later: () => saveMeta({ changesSinceExport: 0 }),
      never: () => saveMeta({ backupReminder: false }),
    });
  }

  // ---- Export / import (FR-020) ----

  function exportFavorites(favorites) {
    const file = buildFavoritesFile(favorites, opts.getCustomPalettes());
    download(new Blob([JSON.stringify(file, null, 1)], { type: "application/json" }),
      `alfinity-favorites-${stamp()}.alfinity.json`);
    saveMeta({ changesSinceExport: 0 });
    status.flash(`Exported ${favorites.length} favorite${favorites.length === 1 ? "" : "s"}`);
  }

  $("[data-export]").addEventListener("click", () => {
    const all = getFavorites();
    exportFavorites(selected.size ? all.filter((f) => selected.has(f.id)) : all);
  });

  const fileInput = $("[data-file]");
  $("[data-import]").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const result = parseFavoritesFile(await file.text(),
        { favorites: getFavorites(), palettes: opts.getCustomPalettes() }, opts.builtinPaletteIds);
      if (result.palettes.length) opts.addPalettes(result.palettes);
      store([...getFavorites(), ...result.favorites]);
      const { imported, skipped, warnings } = result.summary;
      let text = `Imported ${imported} favorite${imported === 1 ? "" : "s"}`;
      if (skipped.length) text += `, skipped ${skipped.length}: ${skipped.join(", ")}`;
      status.flash([text, ...warnings].join(". "), 6000);
    } catch (err) {
      status.flash(err.message, 5000);
    }
  });

  // ---- Share link (FR-022) ----

  $("[data-copy]").addEventListener("click", async () => {
    const link = opts.shareLink();
    try {
      await navigator.clipboard.writeText(link);
      status.flash("Link copied — paste it anywhere to share this picture");
    } catch {
      // No clipboard access (e.g. plain http on the local network): let the user copy it.
      showNotice(`<p>Copy this link:</p>
        <input type="text" class="link-field" readonly value="${escapeHtml(link)}" aria-label="Share link">
        <button type="button" class="btn" data-notice-action="close">Done</button>`);
      notice.querySelector(".link-field").select();
    }
  });

  return { element: root, refresh: render };
}

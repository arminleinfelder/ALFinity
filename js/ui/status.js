// Small status messages at the bottom of the screen: render progress and short notices.

export function createStatus(el) {
  el.innerHTML = `
    <div class="pill surface progress" data-role="progress">
      <span>Rendering</span>
      <span class="progress-track"><span class="progress-fill"></span></span>
    </div>
    <div class="pill surface" data-role="message"></div>`;
  const progressEl = el.querySelector('[data-role="progress"]');
  const fill = el.querySelector(".progress-fill");
  const messageEl = el.querySelector('[data-role="message"]');
  let messageTimer = 0;
  let showTimer = 0;

  return {
    /** Shows render progress (0–1). Only appears if rendering takes longer than a moment. */
    progress(fraction) {
      fill.style.width = `${Math.round(fraction * 100)}%`;
      if (!showTimer && !progressEl.classList.contains("show")) {
        showTimer = setTimeout(() => progressEl.classList.add("show"), 300);
      }
    },
    done() {
      clearTimeout(showTimer);
      showTimer = 0;
      progressEl.classList.remove("show");
    },
    /** Shows a short notice for `ms` milliseconds. */
    flash(text, ms = 2000) {
      messageEl.textContent = text;
      messageEl.classList.remove("error");
      messageEl.classList.add("show");
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => messageEl.classList.remove("show"), ms);
    },
    /** Shows a permanent error. */
    error(text) {
      messageEl.textContent = text;
      messageEl.classList.add("show", "error");
      clearTimeout(messageTimer);
    },
  };
}

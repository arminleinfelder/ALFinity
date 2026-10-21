// "About" panel: what the app is for, who made it, where the code is, and the version (issue #3).

import { VERSION, RELEASE_DATE } from "../version.js";

const REPO_URL = "https://github.com/arminleinfelder/ALFinity";

export function createAboutPanel() {
  const root = document.createElement("div");
  root.className = "about";
  root.innerHTML = `
    <section class="panel-section">
      <p>ALFinity lets you explore the
        <a href="https://en.wikipedia.org/wiki/Mandelbrot_set" target="_blank" rel="noopener">Mandelbrot</a> and
        <a href="https://en.wikipedia.org/wiki/Julia_set" target="_blank" rel="noopener">Julia</a> sets: zoom into endless detail, play
        with colors, keep your favorite pictures and save them as images. No math knowledge needed.</p>
      <p class="hint">Everything you create stays on this device; nothing is sent to a server.</p>
    </section>
    <section class="panel-section">
      <h3>Author</h3>
      <p>Armin Leinfelder</p>
    </section>
    <section class="panel-section">
      <h3>Source code</h3>
      <p><a href="${REPO_URL}" target="_blank" rel="noopener">github.com/arminleinfelder/ALFinity</a></p>
      <p class="hint">Free and open source under the MIT License.</p>
    </section>
    <section class="panel-section">
      <h3>Version</h3>
      <p data-version>${VERSION} · ${RELEASE_DATE}</p>
    </section>`;

  return { element: root, refresh() {} };
}

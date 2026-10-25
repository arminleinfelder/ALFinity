// Home and info pages: offline copy, version number and the current page in the footer menu
// (research.md R6 of 002). The explorer does the same in main.js.

import { VERSION, RELEASE_DATE } from "./version.js";

const params = new URLSearchParams(location.search);

// Same rules as the explorer: needs HTTPS or localhost; ?nosw turns it off.
if ("serviceWorker" in navigator && window.isSecureContext && !params.has("nosw")) {
  navigator.serviceWorker.register("sw.js").catch((err) => console.warn("ALFinity: offline mode unavailable", err));
}

for (const el of document.querySelectorAll("[data-version]")) {
  el.textContent = `${VERSION} · ${RELEASE_DATE}`;
}

const current = location.pathname.split("/").pop() || "index.html";
for (const link of document.querySelectorAll(".site-footer a")) {
  if (link.getAttribute("href") === current) link.setAttribute("aria-current", "page");
}

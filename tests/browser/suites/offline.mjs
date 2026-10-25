// Offline: the service worker keeps a copy of the app; with the server stopped every page loads.
import { readFileSync } from "node:fs";
import { wait } from "../lib/page.mjs";

export const description = "offline mode with the server stopped (desktop)";

const PAGES = [
  ["", "ALFinity", ".home-menu"],
  ["introduction.html", "Introduction – ALFinity", ".site-footer"],
  ["credits.html", "Credits – ALFinity", ".site-footer"],
  ["about-me.html", "About me – ALFinity", ".site-footer"],
];

export async function run(t) {
  // Visiting only the home page must install the offline copy of everything.
  let page = await t.open("desktop");
  await page.open(""); // without ?nosw, so the service worker is registered
  await page.eval(`localStorage.clear(); localStorage.setItem("alfinity.favorites.v1", "[]")`);
  await page.eval("navigator.serviceWorker.ready.then(() => true)");
  await wait(2500); // let the install step cache all files
  const sw = await page.eval(`caches.keys().then(async (keys) => ({ keys,
    files: keys.length ? (await (await caches.open(keys[0])).keys()).length : 0,
    controlled: !!navigator.serviceWorker.controller }))`);
  const listed = readFileSync(new URL("../../../sw.js", import.meta.url), "utf8").match(/^ {2}"[^"]+",$/gm).length;
  t.check("service worker caches every app file", sw.controlled && sw.files >= listed,
    `${sw.files} of ${listed} files in ${sw.keys.join(", ")}`);
  await page.close();

  await t.server.stop();
  try {
    page = await t.open("desktop");
    await page.open("explorer.html");
    await wait(2500);
    const info = await page.eval(`({ title: document.title, buttons: document.querySelectorAll("#toolbar button").length,
      canvas: document.getElementById("view").width, controlled: !!navigator.serviceWorker.controller })`);
    t.check("the explorer loads with the server stopped", info.title === "ALFinity" && info.buttons >= 9 && info.controlled);
    await page.shot("offline");

    for (const [path, title, selector] of PAGES) {
      await page.open(path);
      await wait(300);
      const p = await page.eval(`({ title: document.title, found: !!document.querySelector(${JSON.stringify(selector)}) })`);
      await page.eval(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.decode().catch(() => {}); }))`);
      const images = await page.eval(`[...document.images].every((i) => i.complete && i.naturalWidth > 0)`);
      t.check(`${path || "home page"} loads with the server stopped`, p.title === title && p.found && images, p.title);
    }
    t.noProblems(page);
    await page.close();
  } finally {
    await t.server.start();
  }
}

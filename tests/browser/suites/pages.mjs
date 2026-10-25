// Home and info pages (002): menu, navigation, forwarding of old share links, layout on
// every screen size, introduction examples, credits, about me.
import { wait } from "../lib/page.mjs";

export const description = "home page, info pages, navigation and old share links (all sizes)";

const DEVICES = ["desktop", "4k", "ipad", "iphone", "iphone-landscape"];
const MENU = [
  ["Introduction", "introduction.html"], ["Explorer", "explorer.html"],
  ["Credits", "credits.html"], ["About me", "about-me.html"],
];
const INFO_PAGES = ["introduction.html", "credits.html", "about-me.html"];

/** In-page: no horizontal scrolling, the home content is fully on screen, smallest menu entry. */
const HOME_LAYOUT = `(() => {
  const box = (el) => el.getBoundingClientRect();
  const onScreen = (r) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  const links = [...document.querySelectorAll(".home-menu a")];
  return {
    noScroll: document.documentElement.scrollWidth <= innerWidth,
    inside: [...document.querySelectorAll(".home h1, .tagline"), ...links].every((el) => onScreen(box(el))),
    smallest: Math.min(...links.map((el) => Math.min(box(el).width, box(el).height))),
  };
})()`;

/** Clicks a link and waits for the next page to load. */
async function follow(page, selector) {
  const loaded = page.once("Page.loadEventFired");
  await page.click(selector);
  await loaded;
  await wait(300);
}

export async function run(t) {
  // ---- US1: home page on every screen size ----
  for (const device of DEVICES) {
    const page = await t.open(device);
    await page.open("?nosw");
    await wait(400);
    const menu = await page.eval(`[...document.querySelectorAll(".home-menu a")]
      .map((a) => [a.querySelector(".menu-title").textContent, a.getAttribute("href")])`);
    t.check(`${device}: home menu shows Introduction, Explorer, Credits, About me in order`,
      JSON.stringify(menu) === JSON.stringify(MENU));
    const info = await page.eval(HOME_LAYOUT);
    t.check(`${device}: title, tagline and menu fit on screen without scrolling`, info.noScroll && info.inside);
    t.check(`${device}: menu entries are at least 44 px`, info.smallest >= 44, `${Math.round(info.smallest)} px`);
    await page.shot(`pages-home-${device}`);
    t.noProblems(page);

    for (const file of INFO_PAGES) {
      await page.open(`${file}?nosw`);
      await page.eval(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.decode().catch(() => {}); }))`);
      const p = await page.eval(`({ noScroll: document.documentElement.scrollWidth <= innerWidth,
        images: [...document.images].every((i) => i.complete && i.naturalWidth > 0) })`);
      t.check(`${device}: ${file} has no horizontal scrolling and all pictures load`, p.noScroll && p.images);
      await page.shot(`pages-${file.replace(".html", "")}-${device}`);
    }
    t.noProblems(page, "info pages without console errors or warnings");
    await page.close();
  }

  const page = await t.open("desktop");
  await page.open("?nosw");
  await page.eval("localStorage.clear()");

  // ---- US1: home ⇄ explorer ----
  await follow(page, '.home-menu a[href="explorer.html"]');
  const explorer = await page.eval(`({ title: document.title, toolbar: !!document.querySelector("#toolbar .tools"),
    path: location.pathname })`);
  t.check("Explorer in the menu opens the explorer", explorer.title === "ALFinity" && explorer.toolbar &&
    explorer.path.endsWith("/explorer.html"));
  await follow(page, "#toolbar a.brand");
  t.check("‹ ALFinity in the explorer goes back to the home page", await page.eval(`!!document.querySelector(".home-menu")`));

  // ---- Every info page: header links and footer menu (FR-003, SC-001) ----
  for (const file of INFO_PAGES) {
    await page.open(`${file}?nosw`);
    const nav = await page.eval(`({
      home: document.querySelector(".page-header a.page-link:not(.primary)")?.getAttribute("href"),
      explorer: document.querySelector(".page-header a.primary")?.getAttribute("href"),
      footer: [...document.querySelectorAll(".site-footer nav a")].map((a) => a.getAttribute("href")),
      current: document.querySelector(".site-footer [aria-current=page]")?.getAttribute("href"),
      title: document.title,
      external: [...document.querySelectorAll('a[href^="http"]')].every((a) => a.target === "_blank" && a.rel.includes("noopener")),
    })`);
    t.check(`${file}: links home and to the explorer, footer menu marks this page`,
      nav.home === "./" && nav.explorer === "explorer.html" &&
      JSON.stringify(nav.footer) === JSON.stringify(["./", ...MENU.map((m) => m[1])]) && nav.current === file,
      JSON.stringify(nav.footer));
    t.check(`${file}: own title, external links open in a new tab`, nav.title.endsWith("– ALFinity") && nav.external, nav.title);
  }
  await page.open("credits.html?nosw");
  await follow(page, ".page-header a.page-link:not(.primary)");
  t.check("the header link of an info page opens the home page", await page.eval(`!!document.querySelector(".home-menu")`));
  await page.open("credits.html?nosw");
  await follow(page, ".page-header a.primary");
  t.check("“Open the explorer” on an info page opens the explorer", await page.eval(`location.pathname.endsWith("/explorer.html")`));

  // ---- US2: old share links (main address) open the explorer with that picture ----
  const links = await page.eval(`import("./js/settings.js").then(({ encodeShareLink }) => {
    const base = { schemaVersion: 1, type: "mandelbrot", julia: { re: -0.8, im: 0.156 },
      view: { cx: -0.6, cy: 0, width: 3.2 }, detail: 1, maxIter: null,
      color: { paletteId: "ocean", shift: 0, density: 2, smooth: true, inside: "#000000" } };
    const custom = { id: "custom-test", stops: ["#000000", "#ff0000", "#ffff00"] };
    return [
      ["Mandelbrot zoomed", encodeShareLink({ ...base, view: { cx: -0.7, cy: 0.2, width: 0.8 } })],
      ["Julia", encodeShareLink({ ...base, type: "julia", julia: { re: -0.8, im: 0.156 }, view: { cx: 0, cy: 0, width: 3.2 } })],
      ["built-in palette", encodeShareLink({ ...base, color: { ...base.color, paletteId: "fire", shift: 0.3 } })],
      ["custom palette", encodeShareLink({ ...base, color: { ...base.color, paletteId: custom.id } }, custom)],
      ["deep zoom", encodeShareLink({ ...base, view: { cx: -0.743643887037151, cy: 0.13182590420533, width: 1e-9 } })],
    ];
  })`);
  for (const [name, hash] of links) {
    const expected = await page.eval(`import("./js/settings.js").then(({ decodeShareLink }) =>
      decodeShareLink(${JSON.stringify(hash)}, ["ocean", "fire"]))`);
    for (const prefix of ["", "index.html"]) {
      await page.open("about:blank");
      await page.open(`${prefix}?nosw${hash}`);
      await wait(800);
      const got = await page.eval(`({ path: location.pathname, hash: location.hash,
        last: JSON.parse(localStorage.getItem("alfinity.last.v1")),
        palettes: JSON.parse(localStorage.getItem("alfinity.palettes.v1") ?? "[]") })`);
      const s = got.last ?? {};
      const stops = expected.palette ? got.palettes.find((p) => p.id === s.color?.paletteId)?.stops : null;
      const same = s.type === expected.setting.type && JSON.stringify(s.view) === JSON.stringify(expected.setting.view) &&
        JSON.stringify(s.julia) === JSON.stringify(expected.setting.julia) &&
        (expected.palette ? JSON.stringify(stops) === JSON.stringify(expected.palette.stops)
          : s.color?.paletteId === expected.setting.color.paletteId && s.color?.shift === expected.setting.color.shift);
      t.check(`old link to ./${prefix} (${name}) opens the explorer with that picture`,
        got.path.endsWith("/explorer.html") && got.hash === "" && same, got.path);
    }
  }
  // Back from a forwarded link must not return to a page that forwards again.
  await page.eval("setTimeout(() => history.back(), 0)");
  await wait(600);
  t.check("Back after a forwarded link does not forward again",
    await page.eval(`!(location.pathname.endsWith("/") || location.pathname.endsWith("index.html")) || !location.hash.startsWith("#s=")`));

  // New share links point to explorer.html.
  await page.open("explorer.html?nosw");
  await wait(800);
  await page.click('[data-action="favorites"]');
  await wait(200);
  await page.click("[data-copy]");
  await wait(300);
  const copied = await page.eval(`navigator.clipboard.readText().catch(() => "")`);
  t.check("Copy link makes a link to explorer.html", copied.includes("/explorer.html#s="), copied.slice(0, 60));

  // ---- US3: introduction examples and further reading ----
  await page.open("introduction.html?nosw");
  const intro = await page.eval(`Promise.all([import("./js/settings.js"), import("./js/defaults.js")])
  .then(([{ decodeShareLink }, { BUILTIN_PALETTES }]) => {
    const ids = BUILTIN_PALETTES.map((p) => p.id);
    const hrefs = [...document.querySelectorAll('a[href^="explorer.html#s="]')].map((a) => a.getAttribute("href"));
    const wiki = [...document.querySelectorAll('a[href^="https://en.wikipedia.org/wiki/"]')].map((a) => a.href);
    return { count: hrefs.length, valid: hrefs.every((h) => decodeShareLink(h.slice(h.indexOf("#")), ids) !== null),
      wiki: ["Fractal", "Mandelbrot_set", "Julia_set"].every((w) => wiki.some((h) => h.endsWith("/" + w))),
      math: document.querySelectorAll("aside.math").length };
  })`);
  t.check("introduction: at least two explorer examples, all valid", intro.count >= 2 && intro.valid, `${intro.count} links`);
  t.check("introduction: links to Wikipedia (Fractal, Mandelbrot set, Julia set)", intro.wiki);
  t.check("introduction: formulas are in optional math boxes", intro.math >= 2);
  await follow(page, 'a[href^="explorer.html#s="]');
  t.check("an introduction example opens in the explorer",
    await page.eval(`location.pathname.endsWith("/explorer.html") && !!JSON.parse(localStorage.getItem("alfinity.last.v1"))`));

  // ---- US4: credits groups ----
  await page.open("credits.html?nosw");
  const groups = await page.eval(`[...document.querySelectorAll("main section > h2")].map((h) => h.textContent)`);
  t.check("credits: Mathematicians, Tools and Sources", JSON.stringify(groups) === JSON.stringify(["Mathematicians", "Tools", "Sources"]),
    groups.join(", "));

  // ---- US5: about me placeholders are marked ----
  await page.open("about-me.html?nosw");
  const marked = await page.eval(`[...document.querySelectorAll(".placeholder")]
    .map((el) => getComputedStyle(el, "::before").content.includes("Placeholder"))`);
  t.check("about me: every placeholder is visibly marked", marked.length > 0 && marked.every(Boolean), `${marked.length} placeholders`);

  t.noProblems(page);
  await page.close();
}

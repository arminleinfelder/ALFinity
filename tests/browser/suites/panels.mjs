// The panels: colors, custom palettes, favorites (save, rename, export, import, delete,
// share link), persistence after reload, Shape/Julia with Details, and image export.
import { wait } from "../lib/page.mjs";

export const description = "colors, palettes, favorites, share link, Julia, Details, image export (desktop, iPhone)";

export async function run(t) {
  for (const device of ["desktop", "iphone"]) await runOn(t, device);
}

async function runOn(t, device) {
  const page = await t.open(device);
  const check = (label, ok, detail) => t.check(`${device}: ${label}`, ok, detail);
  const favorites = () => page.eval(`JSON.parse(localStorage.getItem("alfinity.favorites.v1") ?? "[]")`);
  const setRange = (selector, value) => page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${value}; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await page.open();
  await page.eval("localStorage.clear()");
  await page.open();
  await wait(1200);

  // ---- Colors ----
  await page.click('[data-action="colors"]');
  await wait(300);
  check("colors panel shows 10 palettes", (await page.eval(`document.querySelectorAll("[data-palette]").length`)) === 10);
  await page.click('[data-palette="fire"]');
  let s = await page.setting();
  check("choosing a palette", s.color.paletteId === "fire");
  await page.shot(`panels-${device}-colors`);
  await setRange('[data-ctl="shift"]', 0.4);
  s = await page.setting();
  check("color shift slider", Math.abs(s.color.shift - 0.4) < 1e-9);
  await page.click('[data-ctl="smooth"]');
  s = await page.setting();
  const banded = s.color.smooth === false;
  await page.click('[data-action="undo"]');
  s = await page.setting();
  check("smooth/banded switch and undo", banded && s.color.smooth === true);

  await page.click("[data-new]");
  await wait(200);
  await page.click("[data-save]");
  await wait(300);
  const pals = await page.eval(`JSON.parse(localStorage.getItem("alfinity.palettes.v1"))`);
  s = await page.setting();
  check("custom palette saved and used", pals?.length === 1 && s.color.paletteId === pals[0].id);
  await page.click("[data-edit]");
  await page.click("[data-delete]");
  await page.click("[data-delete]");
  s = await page.setting();
  check("custom palette deleted (two taps), picture falls back to Ocean",
    (await page.eval(`JSON.parse(localStorage.getItem("alfinity.palettes.v1")).length`)) === 0 && s.color.paletteId === "ocean");
  await page.escape();
  await wait(200);
  check("Escape closes the panel", await page.eval(`document.getElementById("panel").hidden`));

  // ---- Favorites ----
  await page.click('[data-action="favorites"]');
  await wait(200);
  await page.click("[data-save]");
  await wait(150);
  check("save form suggests a name", (await page.eval(`document.querySelector("[data-save-name]").value`)) === "Favorite 1");
  await page.click('[data-save-form] button[type="submit"]');
  await wait(900);
  let favs = await favorites();
  check("favorite saved with a thumbnail", favs.length === 1 && favs[0].thumbnail?.startsWith("data:image/jpeg"));
  await page.shot(`panels-${device}-favorites`);

  await page.click("[data-rename]");
  await page.eval(`document.querySelector(".fav-rename").select()`);
  await page.send("Input.insertText", { text: "Whole set" });
  await page.key("Enter", { code: "Enter", keyCode: 13 });
  await wait(200);
  check("rename", (await favorites())[0].name === "Whole set");

  await page.click("[data-export]");
  const exported = await page.takeDownload(10000);
  const file = exported && JSON.parse(exported.text);
  check("export offers a favorites file", file?.app === "ALFinity" && file.favorites.length === 1 &&
    /^alfinity-favorites-\d{4}-\d\d-\d\d\.alfinity\.json$/.test(exported.name), exported?.name);

  if (exported) {
    const input = await page.send("Runtime.evaluate", { expression: `document.querySelector("[data-file]")` });
    await page.send("DOM.enable");
    await page.send("DOM.setFileInputFiles", { files: [exported.file], objectId: input.result.objectId });
    await wait(800);
    favs = await favorites();
    check("import adds a copy and never overwrites", favs.length === 2 && favs[0].id !== favs[1].id);
  }
  await page.click("[data-delete]");
  await page.click("[data-delete]");
  await wait(200);
  check("delete needs a second tap", (await favorites()).length === 1);

  // Share link (of a zoomed view, so it differs from the start view)
  await page.escape();
  await page.key("+", { code: "Equal", keyCode: 187, text: "+" });
  await page.key("+", { code: "Equal", keyCode: 187, text: "+" });
  await page.click('[data-action="favorites"]');
  await wait(200);
  await page.click("[data-copy]");
  await wait(300);
  const link = await page.eval(`navigator.clipboard.readText().catch(() => "")`);
  check("copy link puts a share link on the clipboard", link.includes("#s="));
  await page.escape();

  // ---- Persistence ----
  await page.key("+", { code: "Equal", keyCode: 187, text: "+" });
  const zoomed = await page.setting();
  await page.open();
  await wait(1200);
  const restored = await page.setting();
  check("last view and favorites survive a reload",
    restored.view.width === zoomed.view.width && (await favorites()).length === 1);

  if (link.includes("#s=")) {
    // Read the zoom the app really shows (Details field), not what is stored
    const shownZoom = async (p) => {
      await p.click('[data-action="shape"]');
      await p.eval(`document.querySelector("details.details").open = true`);
      const z = Number(await p.eval(`document.querySelector("[data-zoom]").value`));
      await p.escape();
      return z;
    };
    await page.startAt({ cx: 0.3, cy: 0.5, width: 0.1 }); // stored last view differs from the link
    const other = await t.open(device);
    await other.open(link);
    await wait(800);
    const z1 = await shownZoom(other);
    const hashGone = await other.eval("location.hash === ''");
    await other.open();
    await wait(800);
    const z2 = await shownZoom(other);
    check("a share link opens the shared picture, also after a reload", z1 === 4 && z2 === 4 && hashGone, `zoom ${z1} → ${z2}`);
    await other.close();
  }

  // ---- Shape / Julia / Details ----
  await page.click('[data-action="shape"]');
  await wait(200);
  await page.click('[data-type="julia"]');
  await wait(1200);
  s = await page.setting();
  check("switch to Julia", s.type === "julia" && s.view.cx === 0);
  check("Julia map and 6 presets", (await page.visible("[data-map]")) &&
    (await page.eval(`document.querySelectorAll("[data-preset]").length`)) === 6);
  await wait(600);
  await page.shot(`panels-${device}-julia`);
  await page.click('[data-preset="spiral"]');
  s = await page.setting();
  check("preset changes the Julia shape", s.julia.re === 0.285 && s.julia.im === 0.01);
  const map = await page.center("[data-map] canvas");
  await page.drag(map.x - 40, map.y - 10, map.x + 20, map.y - 30, 8);
  s = await page.setting();
  check("dragging on the mini-map picks a new Julia point", s.julia.re !== 0.285);
  await page.eval(`document.querySelector("details.details").open = true`);
  await page.eval(`(() => { const z = document.querySelector("[data-zoom]"); z.value = "10";
    z.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  s = await page.setting();
  check("Details: typing a zoom value", Math.abs(3.2 / s.view.width - 10) < 1e-9);
  await page.click('[data-type="mandelbrot"]');
  s = await page.setting();
  check("back to Mandelbrot restores its view", s.type === "mandelbrot" && s.view.width === restored.view.width);
  await page.escape();

  // ---- Save image ----
  await page.click('[data-action="image"]');
  await wait(200);
  await page.click('input[value="hd"]');
  await page.click("[data-start]");
  const png = await page.takeDownload();
  const st = png && await page.imageStats();
  check("HD image export (1920×1080 PNG with a full picture)", png?.type === "image/png" && st.width === 1920 &&
    st.height === 1080 && st.transparent === 0 && st.spread > 10, png?.name);
  await page.escape();

  // ---- About ----
  await page.click('[data-action="about"]');
  await wait(200);
  const about = await page.eval(`(() => {
    const panel = document.getElementById("panel");
    const link = panel.querySelector('a[href^="https://github.com/arminleinfelder/ALFinity"]');
    const wiki = [...panel.querySelectorAll('a[href^="https://en.wikipedia.org/wiki/"]')].map((a) => a.textContent + " " + a.href);
    return { open: !panel.hidden, text: panel.textContent.replace(/\\s+/g, " "), wiki, link: link?.target === "_blank",
             version: /^\\d+\\.\\d+\\.\\d+ · \\d{4}-\\d{2}-\\d{2}$/.test(panel.querySelector("[data-version]")?.textContent ?? "") };
  })()`);
  check("About panel: purpose, author, repo link, version and date", about.open && about.link && about.version &&
    /Mandelbrot and Julia/.test(about.text) && /Armin Leinfelder/.test(about.text));
  check("About panel: Mandelbrot and Julia link to Wikipedia",
    about.wiki.join() === "Mandelbrot https://en.wikipedia.org/wiki/Mandelbrot_set,Julia https://en.wikipedia.org/wiki/Julia_set",
    about.wiki.join());
  await page.shot(`panels-${device}-about`);
  await page.escape();

  t.noProblems(page);
  await page.close();
}

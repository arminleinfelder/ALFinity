// Touch devices: finger drag, pinch, double-tap, bottom sheet, home-screen tip, size warning.
import { wait } from "../lib/page.mjs";

export const description = "touch gestures and phone layout (iPhone, iPad)";

export async function run(t) {
  for (const device of ["iphone", "ipad"]) {
    const page = await t.open(device);
    const check = (label, ok, detail) => t.check(`${device}: ${label}`, ok, detail);
    const { width: W, height: H } = page.device;
    const zoom = (s) => 3.2 / s.view.width;
    await page.open();
    await page.eval("localStorage.clear()");
    await page.open();
    await wait(1200);

    await page.touchDrag(W / 2, H / 2, W / 2 + 80, H / 2 + 40);
    let s = await page.setting();
    check("finger drag moves the picture", s.view.cx < -0.6 && s.view.cy > 0);

    await page.pinch(W / 2, H / 2, 2);
    s = await page.setting();
    check("pinch zooms", Math.abs(zoom(s) - 2) < 0.05, `zoom ${zoom(s).toFixed(3)}`);

    const z0 = zoom(s);
    await page.tap(W / 2, H / 2);
    await wait(120);
    await page.tap(W / 2, H / 2);
    s = await page.setting();
    check("double-tap zooms in 2×", Math.abs(zoom(s) / z0 - 2) < 0.01);

    await wait(500);
    await page.tap(W / 3, H / 3);
    const s2 = await page.setting();
    check("a single tap does not zoom", zoom(s2) === zoom(s));

    if (device === "iphone") {
      await page.click('[data-action="colors"]');
      await wait(400);
      const sheet = await page.eval(`(() => { const r = document.getElementById("panel").getBoundingClientRect();
        return { height: r.height, bottom: r.bottom }; })()`);
      check("panels open as a bottom sheet covering at most half the screen",
        sheet.height <= H / 2 + 1 && Math.abs(sheet.bottom - H) < 2, `${Math.round(sheet.height)} of ${H} px`);
      const header = await page.center(".panel-header");
      await page.touchDrag(header.x - 60, header.y, header.x - 60, header.y + 160, 10);
      await wait(300);
      check("swiping the sheet down closes it", await page.eval(`document.getElementById("panel").hidden`));
    }

    await page.click('[data-action="favorites"]');
    await wait(300);
    await page.click("[data-save]");
    await page.click('[data-save-form] button[type="submit"]');
    await wait(1200);
    const notice = await page.eval(`(() => { const n = document.querySelector("[data-notice]"); return n && !n.hidden ? n.innerText : ""; })()`);
    check("first favorite shows the Add-to-Home-Screen tip", /Add to Home Screen/.test(notice));
    if (device === "iphone") {
      const pos = await page.eval(`(() => ({ msg: document.querySelector('[data-role="message"]').getBoundingClientRect().bottom,
        sheet: document.getElementById("panel").getBoundingClientRect().top }))()`);
      check("messages appear above an open sheet", pos.msg <= pos.sheet);
      await page.shot(`touch-${device}-favorites`);
    }
    await page.escape();

    if (device === "iphone") {
      await page.click('[data-action="image"]');
      await wait(300);
      await page.click('input[value="custom"]');
      await page.eval(`document.querySelector("[data-cw]").value = 7680; document.querySelector("[data-ch]").value = 4320;`);
      await page.click("[data-start]");
      await wait(300);
      check("8K export on iPhone warns that the size is too large", /too large/.test(await page.message()));
      await page.escape();
    }

    t.noProblems(page);
    await page.close();
  }
}

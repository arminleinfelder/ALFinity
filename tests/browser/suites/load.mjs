// First load on every screen size: sharp canvas, graphics card, toolbar fits, no errors.
import { wait } from "../lib/page.mjs";

export const description = "first load on desktop, 4K, iPad and iPhone sizes";

export async function run(t) {
  for (const device of ["desktop", "4k", "ipad", "iphone", "iphone-landscape"]) {
    const page = await t.open(device);
    await page.open();
    await page.eval("localStorage.clear()");
    await page.open();
    await wait(1500);
    const info = await page.eval(`(() => {
      const c = document.getElementById("view");
      const gl = document.createElement("canvas").getContext("webgl2");
      const tools = document.querySelector(".tools").getBoundingClientRect();
      return {
        canvas: [c.width, c.height], expected: [Math.round(c.clientWidth * devicePixelRatio), Math.round(c.clientHeight * devicePixelRatio)],
        webgl2: !!gl, buttons: document.querySelectorAll("#toolbar button").length,
        toolbarInside: tools.left >= 0 && tools.right <= innerWidth,
        noScroll: document.documentElement.scrollWidth <= innerWidth,
      };
    })()`);
    t.check(`${device}: WebGL2 available and canvas uses all device pixels`,
      info.webgl2 && info.canvas.join() === info.expected.join(), `${info.canvas.join("×")}`);
    t.check(`${device}: toolbar fits, no horizontal scrolling`, info.toolbarInside && info.noScroll && info.buttons >= 9);
    await page.shot(`load-${device}`);
    t.noProblems(page);
    await page.close();
  }
}

// Automated browser tests for ALFinity (developer tool; Node built-ins, Chrome and Python only).
//
//   node tests/browser/run.mjs            all functional checks (a few minutes)
//   node tests/browser/run.mjs --headed   show the test Chrome window while it runs
//   node tests/browser/run.mjs --perf     also measure speed against the success criteria
//   node tests/browser/run.mjs --only=touch,panels
//
// Starts its own web server on a free port and a separate Chrome with an empty temporary
// profile, so nothing of your normal browser is used or changed. Screenshots and downloads
// are written to tests/browser/output/.

import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { launchChrome } from "./lib/chrome.mjs";
import { startServer } from "./lib/server.mjs";
import { openPage } from "./lib/page.mjs";

const SUITES = ["load", "explore", "panels", "touch", "rendering", "pages", "offline"]; // offline must be last
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUTPUT = fileURLToPath(new URL("./output/", import.meta.url));

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const perf = args.includes("--perf");
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
let names = only ?? [...SUITES];
if (perf && !names.includes("perf")) names.splice(names.indexOf("offline") >= 0 ? names.indexOf("offline") : names.length, 0, "perf");

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(OUTPUT, { recursive: true });

const server = await startServer(ROOT);
const chrome = await launchChrome({ headed });
await chrome.command("Browser.grantPermissions", {
  origin: new URL(server.url).origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
});
console.log(`ALFinity browser tests — app at ${server.url}, Chrome ${headed ? "window" : "headless"}`);

const results = [];
const ctx = { port: chrome.port, base: server.url, output: OUTPUT };
const t = {
  ctx,
  server,
  open: (device) => openPage(ctx, device),

  check(label, ok, detail = "") {
    results.push({ label, ok: !!ok });
    console.log(`  ${ok ? "✔" : "✖"} ${label}${detail ? ` — ${detail}` : ""}`);
    return !!ok;
  },

  /** Fails if the page logged errors, exceptions or warnings. */
  noProblems(page, label = "no console errors or warnings") {
    const problems = page.problems();
    return t.check(`${label} (${page.device.name})`, problems.length === 0, problems.slice(0, 3).join(" | "));
  },
};

const started = Date.now();
for (const name of names) {
  const suite = await import(`./suites/${name}.mjs`);
  console.log(`\n▸ ${name}: ${suite.description}`);
  try {
    await suite.run(t);
  } catch (err) {
    t.check(`${name} finished without an error`, false, err.message);
  }
}

await chrome.close();
await server.stop();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed in ${Math.round((Date.now() - started) / 1000)} s.` +
  (failed.length ? `\nFailed:\n${failed.map((f) => `  ✖ ${f.label}`).join("\n")}` : "") +
  `\nScreenshots: ${join(OUTPUT, "screens")}`);
process.exit(failed.length ? 1 : 0);

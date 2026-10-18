// Starts a separate Chrome with an empty temporary profile and DevTools remote control.
// It never touches the user's normal Chrome profile.

import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      return execFileSync("which", [name]).toString().trim();
    } catch {
      // try the next name
    }
  }
  throw new Error("Chrome not found. Set CHROME_PATH to the Chrome executable.");
}

/** Returns { port, command(method, params), close() } for a fresh Chrome instance. */
export async function launchChrome({ headed = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "alfinity-chrome-"));
  const args = [
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0", // Chrome picks a free port and writes it to DevToolsActivePort
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,900",
    "--enable-unsafe-swiftshader", // software WebGL when no graphics card is available (CI)
    ...(headed ? [] : ["--headless=new"]),
    "about:blank",
  ];
  const proc = spawn(findChrome(), args, { stdio: "ignore" });

  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await wait(100);
  if (!existsSync(portFile)) throw new Error("Chrome did not start");
  const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);

  // Browser-level connection (downloads, permissions)
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  return {
    port,
    command(method, params = {}) {
      return new Promise((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    async close() {
      ws.close();
      proc.kill();
      await wait(300);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

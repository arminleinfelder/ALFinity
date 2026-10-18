// A private static web server for the test run (python3 -m http.server on a free port).

import { spawn } from "node:child_process";
import { createServer, connect } from "node:net";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** True if something accepts connections on the port (a plain TCP probe, no connection reuse). */
function listening(port) {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

/** Returns { url, stop(), start() }; the server can be stopped and restarted (offline test). */
export async function startServer(root) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;
  let proc = null;

  async function start() {
    proc = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: root, stdio: "ignore" });
    for (let i = 0; i < 100; i++) {
      if (await listening(port)) return;
      await wait(100);
    }
    throw new Error(`test server did not start on ${url}`);
  }

  async function stop() {
    if (!proc) return;
    const exited = new Promise((resolve) => proc.once("exit", resolve));
    proc.kill();
    await exited;
    proc = null;
    for (let i = 0; i < 50 && (await listening(port)); i++) await wait(100);
  }

  await start();
  return { url, start, stop };
}

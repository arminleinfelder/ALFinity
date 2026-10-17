// CPU engine: a pool of workers computing smooth iteration values with 64-bit numbers.
// Strips are handed out one at a time, so fast workers take more of the work.

const PIXELS_PER_STRIP = 32768;

export class CpuEngine {
  #slots = [];
  #job = null;
  #nextId = 0;

  constructor() {
    const count = Math.max(2, (navigator.hardwareConcurrency || 4) - 1);
    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
      const slot = { worker, busy: false };
      worker.onmessage = (e) => this.#onResult(slot, e.data);
      worker.onerror = (e) => console.error("ALFinity worker error:", e.message);
      this.#slots.push(slot);
    }
  }

  get workerCount() {
    return this.#slots.length;
  }

  /**
   * Starts a job. p = { type, jre, jim, cx, cy, s, W, H, maxIter, step }.
   * Returns { promise, cancel }; the promise resolves to { data, gw, gh },
   * or to null if the job was cancelled or replaced by a newer one.
   */
  render(p, onProgress) {
    this.cancel();
    const gw = Math.ceil(p.W / p.step);
    const gh = Math.ceil(p.H / p.step);
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    const job = {
      id: ++this.#nextId,
      p: { ...p, gw },
      gw,
      gh,
      rows: Math.max(1, Math.floor(PIXELS_PER_STRIP / gw)),
      next: 0,
      done: 0,
      data: new Float32Array(gw * gh),
      resolve,
      onProgress,
    };
    this.#job = job;
    this.#dispatch();
    return {
      promise,
      cancel: () => {
        if (this.#job === job) this.cancel();
      },
    };
  }

  cancel() {
    if (!this.#job) return;
    this.#job.resolve(null);
    this.#job = null;
  }

  #dispatch() {
    const job = this.#job;
    if (!job) return;
    for (const slot of this.#slots) {
      if (job.next >= job.gh) break;
      if (slot.busy) continue;
      const y0 = job.next;
      const y1 = Math.min(job.gh, y0 + job.rows);
      job.next = y1;
      slot.busy = true;
      slot.worker.postMessage({ jobId: job.id, p: job.p, y0, y1 });
    }
  }

  #onResult(slot, msg) {
    slot.busy = false;
    const job = this.#job;
    if (job && msg.jobId === job.id) {
      job.data.set(msg.data, msg.y0 * job.gw);
      job.done += msg.y1 - msg.y0;
      job.onProgress?.(job.done / job.gh);
      if (job.done === job.gh) {
        this.#job = null;
        job.resolve({ data: job.data, gw: job.gw, gh: job.gh });
        return;
      }
    }
    this.#dispatch(); // results of older jobs are dropped; the worker gets new work
  }
}

// Current fractal setting with undo/redo (FR-005).
// Settings are treated as immutable: always pass a new object to set().

const MAX_HISTORY = 50;

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class State {
  #current;
  #committed; // last state recorded in history
  #undo = [];
  #redo = [];
  #subscribers = new Set();

  constructor(initial) {
    this.#current = this.#committed = structuredClone(initial);
  }

  get() {
    return this.#current;
  }

  /**
   * Replaces the current setting. With record: false (during a gesture or while a slider
   * moves) nothing is added to the history; record: true commits the change as one step.
   */
  set(next, { record = true } = {}) {
    this.#current = next;
    if (record) this.#commit();
    this.#emit();
  }

  #commit() {
    if (same(this.#committed, this.#current)) return;
    this.#undo.push(this.#committed);
    if (this.#undo.length > MAX_HISTORY) this.#undo.shift();
    this.#redo = [];
    this.#committed = this.#current;
  }

  get canUndo() {
    return this.#undo.length > 0;
  }

  get canRedo() {
    return this.#redo.length > 0;
  }

  undo() {
    if (!this.canUndo) return false;
    this.#redo.push(this.#committed);
    this.#committed = this.#current = this.#undo.pop();
    this.#emit();
    return true;
  }

  redo() {
    if (!this.canRedo) return false;
    this.#undo.push(this.#committed);
    this.#committed = this.#current = this.#redo.pop();
    this.#emit();
    return true;
  }

  subscribe(fn) {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  #emit() {
    for (const fn of this.#subscribers) fn(this.#current);
  }
}

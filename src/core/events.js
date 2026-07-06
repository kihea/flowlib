export class EventEmitter {
  #listeners = new Map();

  on(type, listener) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set());
    }
    this.#listeners.get(type).add(listener);
    return () => this.off(type, listener);
  }

  once(type, listener) {
    const off = this.on(type, (event) => {
      off();
      listener(event);
    });
    return off;
  }

  off(type, listener) {
    const listeners = this.#listeners.get(type);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) {
      this.#listeners.delete(type);
    }
    return removed;
  }

  emit(type, event = {}) {
    const listeners = this.#listeners.get(type);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener({ type, target: this, ...event });
    }
  }

  clearListeners(type) {
    if (type) {
      this.#listeners.delete(type);
      return;
    }
    this.#listeners.clear();
  }
}

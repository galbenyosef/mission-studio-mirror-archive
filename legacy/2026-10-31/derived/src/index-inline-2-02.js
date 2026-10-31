// index-inline-2 02 — cur
// Lines 258-374 of readable/index-inline-2.pretty.js (statement-aligned).
const Planner = {
  worker: null,
  url: null,
  seq: 0,
  cur: null,
  cache: new Map(),
  useWorker: true,
  ensure() {
    if (this.worker || !this.useWorker) return;
    try {
      if (!this.url)
        this.url = URL.createObjectURL(
          new Blob(
            [
              document.getElementById("engine-src").textContent +
                "\n" +
                WORKER_MAIN,
            ],
            { type: "text/javascript" },
          ),
        );
      this.worker = new Worker(this.url);
      this.worker.onmessage = (e) => this.onMsg(e.data);
      this.worker.onerror = (e) => {
        const c = this.cur;
        this.kill();
        this.useWorker = false;
        if (c) this.runMain(c);
      };
    } catch (e) {
      this.useWorker = false;
      this.worker = null;
    }
  },
  kill() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  },
  onMsg(d) {
    const c = this.cur;
    if (!c || d.id !== c.id) return;
    if (d.type === "progress") c.onProgress && c.onProgress(d.msg);
    else if (d.type === "done") {
      this.cur = null;
      const M = rehydrate(d.M);
      this.store(c.key, M);
      c.resolve(M);
    } else if (d.type === "error") {
      this.cur = null;
      c.reject(new Error(d.message));
    }
  },
  store(key, M) {
    this.cache.set(key, M);
    while (this.cache.size > 5)
      this.cache.delete(this.cache.keys().next().value);
  },
  runMain(c) {
    setTimeout(() => {
      try {
        const M = planScenario(
          JSON.parse(c.key),
          (m) => c.onProgress && c.onProgress(m),
        );
        this.store(c.key, M);
        if (this.cur === c) this.cur = null;
        c.resolve(M);
      } catch (err) {
        if (this.cur === c) this.cur = null;
        c.reject(err);
      }
    }, 30);
  },
  plan(cfg, onProgress) {
    const key = JSON.stringify(cfg);
    if (this.cache.has(key)) {
      const M = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, M);
      return Promise.resolve(M);
    }
    if (this.cur && this.cur.key === key) {
      // same request already running: chain
      const c = this.cur;
      const prev = c.onProgress;
      c.onProgress = (m) => {
        prev && prev(m);
        onProgress && onProgress(m);
      };
      return c.promise;
    }
    if (this.cur) {
      this.cur.reject(
        Object.assign(new Error("superseded"), { superseded: true }),
      );
      this.cur = null;
      this.kill();
    }
    const id = ++this.seq;
    const c = { id, key, onProgress };
    c.promise = new Promise((res, rej) => {
      c.resolve = res;
      c.reject = rej;
    });
    this.cur = c;
    this.ensure();
    if (this.worker) this.worker.postMessage({ id, cfg: JSON.parse(key) });
    else this.runMain(c);
    return c.promise;
  },
};

// ============================================================================
// Derived mission data used by the viewer (phases, tanks, cumulative Δv …)
// ============================================================================

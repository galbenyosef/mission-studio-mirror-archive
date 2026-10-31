// index-inline-2 43 — three
// Lines 12025-12368 of readable/index-inline-2.pretty.js (statement-aligned).
class Trail {
  constructor(o, md, primary) {
    this.o = o;
    this.md = md;
    this.primary = primary;
    this.cache = {};
    this.mat = new THREE.ShaderMaterial({
      vertexShader: GLSL_TRAIL_V,
      fragmentShader: GLSL_TRAIL_F,
      uniforms: {
        uNow: { value: 0 },
        uFuture: { value: 0.45 },
        uAlpha: { value: primary ? 0.95 : 0.7 },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
    });
    this.line = new THREE.LineSegments(new THREE.BufferGeometry(), this.mat);
    this.line.frustumCulled = false;
    this.line.renderOrder = 3;
    const U = this.mat.uniforms;
    this.fatMat = new THREE.ShaderMaterial({
      vertexShader: GLSL_FAT_V,
      fragmentShader: GLSL_FAT_F,
      uniforms: {
        uNow: U.uNow,
        uFuture: U.uFuture,
        uAlpha: { value: primary ? 0.97 : 0.85 },
        uRes: TRAIL_U.uRes,
        uWidth: TRAIL_U.uWidth,
        uCol: { value: new THREE.Color(PCOL.burn) },
        uCore: { value: new THREE.Color(PCOL.burnCore) },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.fat = new THREE.Mesh(new THREE.BufferGeometry(), this.fatMat);
    this.fat.frustumCulled = false;
    this.fat.renderOrder = 4;
    this.fat.visible = false;
    this.line.add(this.fat);
    this.mkMat = new THREE.ShaderMaterial({
      vertexShader: GLSL_MK_V,
      fragmentShader: GLSL_MK_F,
      uniforms: {
        uNow: U.uNow,
        uFuture: U.uFuture,
        uSize: TRAIL_U.uMk,
        uCol: { value: new THREE.Color(PCOL.burn) },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
    });
    this.mk = new THREE.Points(new THREE.BufferGeometry(), this.mkMat);
    this.mk.frustumCulled = false;
    this.mk.renderOrder = 5;
    this.mk.visible = false;
    this.line.add(this.mk);
    R.scene.add(this.line);
    this.sample();
  }
  sample() {
    const o = this.o,
      ts = [],
      P = [],
      brk = [],
      pw = [];
    const imp = this.md.impList.filter((x) => x.obj === o.id); // burns applied as an instant Δv: sample their real duration too
    const inImp = (t) => {
      for (const x of imp) if (t >= x.t0 && t < x.t1) return true;
      return false;
    };
    let lastEnd = null;
    for (const sg of o.segs) {
      if (sg.type === "surface") {
        lastEnd = null;
        continue;
      }
      const push = (t, s, b) => {
        const H = helio(s.ref, t).r;
        ts.push(t);
        P.push(H[0] + s.r[0], H[1] + s.r[1], H[2] + s.r[2]);
        brk.push(b ? 1 : 0);
        pw.push(s.T > 0 || (imp.length && inImp(t)) ? 1 : 0);
      };
      let first = lastEnd == null || sg.t0 - lastEnd > 2;
      {
        let t = sg.t0;
        const span = sg.t1 - sg.t0;
        const s0 = sg.stateAt(t);
        const el = rv2coe(s0.r, s0.v, BODIES[s0.ref].mu);
        let k = 0.016;
        if (el.e < 1 && el.period && span / el.period > 25)
          k = 0.016 * Math.min(4, span / el.period / 25);
        let n = 0;
        while (t < sg.t1 && n < 200000) {
          const s = sg.stateAt(t);
          push(t, s, first);
          first = false;
          n++;
          const rr = vnorm(s.r),
            vv = Math.max(vnorm(s.v), 1e-4);
          let dt = (k * rr) / vv;
          dt = clamp(
            dt,
            s.ref === "sun" ? 1800 : 0.5,
            s.ref === "sun" ? 2 * DAY : 0.5 * DAY,
          );
          if (sg.type === "burn")
            dt = Math.min(dt, Math.max((sg.t1 - sg.t0) / 20, 0.5));
          if (sg.type === "samples")
            dt = Math.min(
              dt,
              Math.max((4 * (sg.t1 - sg.t0)) / Math.max(sg.n - 1, 1), 0.5),
            );
          for (const x of imp) {
            if (x.t0 > t && x.t0 < t + dt) dt = x.t0 - t;
            else if (t >= x.t0 && t < x.t1)
              dt = Math.min(dt, Math.max((x.t1 - x.t0) / 12, 0.5), x.t1 - t);
          }
          t += dt;
        }
        const s = sg.stateAt(sg.t1);
        push(sg.t1, s, false);
      }
      lastEnd = sg.t1;
    }
    this.ts = Float64Array.from(ts);
    this.P = Float64Array.from(P);
    this.brk = Uint8Array.from(brk);
    this.pw = Uint8Array.from(pw);
    const n = this.ts.length,
      tt = new Float32Array(n);
    for (let i = 0; i < n; i++) tt[i] = this.ts[i] - this.md.M.t0;
    this.tt = tt;
    this.colorize();
    const idx = [];
    for (let i = 0; i + 1 < n; i++) if (!this.brk[i + 1]) idx.push(i, i + 1);
    this.idx = idx.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
    const ps = [];
    for (let i = 0; i + 1 < n; i++)
      if (this.pw[i] && !this.brk[i + 1]) ps.push(i);
    this.pwSegs = ps;
    // burn markers at the middle of each engine-on interval of this craft
    const mt = [],
      mP = [];
    for (const x of this.md.powered) {
      if (x.obj !== o.id) continue;
      const tm = (x.t0 + x.t1) / 2;
      const s = o.stateAt(tm);
      if (!s || s.surface) continue;
      const H = helio(s.ref, tm).r;
      mt.push(tm);
      mP.push(H[0] + s.r[0], H[1] + s.r[1], H[2] + s.r[2]);
    }
    this.mts = Float64Array.from(mt);
    this.mP = Float64Array.from(mP);
  }
  colorize() {
    // coasting arcs: cool blue (or the mission-phase colour); engine-on arcs: hot orange
    const n = this.ts.length,
      col = new Float32Array(3 * n);
    const byPhase = !!MV.layers.phasecol;
    const coast = hexToRgb(
        this.primary ? PCOL.coast : this.o.color || "#7fd1ff",
      ),
      burn = hexToRgb(PCOL.burn);
    for (let i = 0; i < n; i++) {
      let c = coast;
      if (this.pw[i]) c = burn;
      else if (this.primary && byPhase) {
        const ph = this.md.phaseAt(this.ts[i]);
        if (ph && ph.color) c = hexToRgb(ph.color);
      }
      col[3 * i] = c[0];
      col[3 * i + 1] = c[1];
      col[3 * i + 2] = c[2];
    }
    this.col = col;
    this.byPhase = byPhase;
  }
  frameCoords(frame) {
    if (!this.cache[frame])
      this.cache[frame] = toFrameArr(frame, this.ts, this.P);
    return this.cache[frame];
  }
  markerCoords(frame) {
    const k = "mk:" + frame;
    if (!this.cache[k]) this.cache[k] = toFrameArr(frame, this.mts, this.mP);
    return this.cache[k];
  }
  build(frame, anchor, tNow) {
    // with a time window (Earth-orbit flights: a few orbits of a two-week flight), only the points inside it go to the GPU
    const F = this.frameCoords(frame),
      N = this.ts.length,
      wP = TRAIL_U.uWinP.value,
      wF = TRAIL_U.uWinF.value,
      win = wP < 1e11 && tNow != null;
    let i0 = 0,
      i1 = N - 1;
    if (win) {
      const lo = tNow - wP - TRAIL_PAD,
        hi = tNow + wF + TRAIL_PAD;
      i0 = Math.max(0, bsearch(this.ts, lo));
      i1 = Math.min(N - 1, bsearch(this.ts, hi) + 1);
    }
    const n = Math.max(0, i1 - i0 + 1),
      pos = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const k = 3 * (i0 + i);
      pos[3 * i] = F[k] - anchor[0];
      pos[3 * i + 1] = F[k + 1] - anchor[1];
      pos[3 * i + 2] = F[k + 2] - anchor[2];
    }
    const g = this.line.geometry;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute(
      "aC",
      new THREE.BufferAttribute(
        win ? this.col.subarray(3 * i0, 3 * (i1 + 1)) : this.col,
        3,
      ),
    );
    g.setAttribute(
      "aT",
      new THREE.BufferAttribute(
        win ? this.tt.subarray(i0, i1 + 1) : this.tt,
        1,
      ),
    );
    let idx = this.idx;
    if (win) {
      const a = [];
      for (let i = i0; i < i1; i++)
        if (!this.brk[i + 1]) a.push(i - i0, i + 1 - i0);
      idx = n > 65535 ? new Uint32Array(a) : new Uint16Array(a);
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    // engine-on ribbon: 4 corners per segment; the far-end corners carry the opposite side sign because their "other" point is behind them
    const segs = win
        ? this.pwSegs.filter((i) => i >= i0 && i < i1).map((i) => i - i0)
        : this.pwSegs,
      m = segs.length,
      ttW = win ? this.tt.subarray(i0, i1 + 1) : this.tt;
    if (m) {
      const P4 = new Float32Array(12 * m),
        O4 = new Float32Array(12 * m),
        S4 = new Float32Array(4 * m),
        E4 = new Float32Array(4 * m),
        T4 = new Float32Array(4 * m),
        I6 = 4 * m > 65535 ? new Uint32Array(6 * m) : new Uint16Array(6 * m);
      for (let k = 0; k < m; k++) {
        const i = segs[k],
          j = i + 1,
          v = 4 * k,
          o12 = 12 * k;
        for (let q = 0; q < 3; q++) {
          const A = pos[3 * i + q],
            B = pos[3 * j + q];
          P4[o12 + q] = A;
          P4[o12 + 3 + q] = A;
          P4[o12 + 6 + q] = B;
          P4[o12 + 9 + q] = B;
          O4[o12 + q] = B;
          O4[o12 + 3 + q] = B;
          O4[o12 + 6 + q] = A;
          O4[o12 + 9 + q] = A;
        }
        S4[v] = 1;
        S4[v + 1] = -1;
        S4[v + 2] = -1;
        S4[v + 3] = 1; // offset sign (relative to each corner's own direction)
        E4[v] = 1;
        E4[v + 1] = -1;
        E4[v + 2] = 1;
        E4[v + 3] = -1; // which edge of the ribbon the corner is on (for the soft edge)
        T4[v] = T4[v + 1] = ttW[i];
        T4[v + 2] = T4[v + 3] = ttW[j];
        I6[6 * k] = v;
        I6[6 * k + 1] = v + 1;
        I6[6 * k + 2] = v + 2;
        I6[6 * k + 3] = v + 1;
        I6[6 * k + 4] = v + 3;
        I6[6 * k + 5] = v + 2;
      }
      const fg = this.fat.geometry;
      fg.setAttribute("position", new THREE.BufferAttribute(P4, 3));
      fg.setAttribute("aOther", new THREE.BufferAttribute(O4, 3));
      fg.setAttribute("aSide", new THREE.BufferAttribute(S4, 1));
      fg.setAttribute("aEdge", new THREE.BufferAttribute(E4, 1));
      fg.setAttribute("aT", new THREE.BufferAttribute(T4, 1));
      fg.setIndex(new THREE.BufferAttribute(I6, 1));
    }
    this.fat.visible = m > 0;
    const nm = this.mts.length;
    if (nm) {
      const MF = this.markerCoords(frame),
        mp = new Float32Array(3 * nm),
        mt = new Float32Array(nm);
      for (let i = 0; i < nm; i++) {
        mp[3 * i] = MF[3 * i] - anchor[0];
        mp[3 * i + 1] = MF[3 * i + 1] - anchor[1];
        mp[3 * i + 2] = MF[3 * i + 2] - anchor[2];
        mt[i] = this.mts[i] - this.md.M.t0;
      }
      const mg = this.mk.geometry;
      mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
      mg.setAttribute("aT", new THREE.BufferAttribute(mt, 1));
    }
    this.mk.visible = nm > 0;
    this.anchor = anchor.slice();
    this.frame = frame;
    this.builtT = tNow;
  }
  dispose() {
    R.scene.remove(this.line);
    this.line.geometry.dispose();
    this.fat.geometry.dispose();
    this.mk.geometry.dispose();
    this.mat.dispose();
    this.fatMat.dispose();
    this.mkMat.dispose();
  }
}
// Earth–Moon rotating frame: columns x̂ (to Moon), ŷ, ẑ (orbit normal); returns row-major matrix with those columns
function emRot(t) {
  const m = moonGeo(t);
  const x = vunit(m.r),
    z = vunit(vcross(m.r, m.v)),
    y = vcross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}
function frameOrigin(frame, t) {
  return frame === "sun"
    ? [0, 0, 0]
    : helio(frame === "emrot" ? "earth" : frame, t).r;
}

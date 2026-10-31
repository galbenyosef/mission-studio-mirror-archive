// index-inline-2 18 — three
// Lines 4803-5092 of readable/index-inline-2.pretty.js (statement-aligned).
function plasmaGeometry(model) {
  const ud = model.userData;
  if (ud.plasmaGeo) return ud.plasmaGeo;
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(),
    M = new THREE.Matrix4(),
    NM = new THREE.Matrix3();
  const tri = [],
    cum = [],
    lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  let total = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    na = new THREE.Vector3(),
    nb = new THREE.Vector3(),
    nc = new THREE.Vector3(),
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  model.traverse((o) => {
    if (
      !o.isMesh ||
      !o.visible ||
      !o.geometry ||
      !o.geometry.attributes.position ||
      !o.material ||
      o.material.transparent ||
      o.material.isShaderMaterial
    )
      return;
    M.multiplyMatrices(inv, o.matrixWorld);
    NM.getNormalMatrix(M);
    const g = o.geometry,
      P = g.attributes.position,
      N = g.attributes.normal,
      I = g.index,
      n = Math.floor((I ? I.count : P.count) / 3);
    for (let i = 0; i < n; i++) {
      const i0 = I ? I.getX(3 * i) : 3 * i,
        i1 = I ? I.getX(3 * i + 1) : 3 * i + 1,
        i2 = I ? I.getX(3 * i + 2) : 3 * i + 2;
      a.fromBufferAttribute(P, i0).applyMatrix4(M);
      b.fromBufferAttribute(P, i1).applyMatrix4(M);
      c.fromBufferAttribute(P, i2).applyMatrix4(M);
      e1.subVectors(b, a).cross(e2.subVectors(c, a));
      const ar = e1.length() / 2;
      if (!(ar > 1e-6)) continue;
      if (N) {
        na.fromBufferAttribute(N, i0).applyMatrix3(NM);
        nb.fromBufferAttribute(N, i1).applyMatrix3(NM);
        nc.fromBufferAttribute(N, i2).applyMatrix3(NM);
      } else {
        e1.normalize();
        na.copy(e1);
        nb.copy(e1);
        nc.copy(e1);
      }
      tri.push(
        a.x,
        a.y,
        a.z,
        b.x,
        b.y,
        b.z,
        c.x,
        c.y,
        c.z,
        na.x,
        na.y,
        na.z,
        nb.x,
        nb.y,
        nb.z,
        nc.x,
        nc.y,
        nc.z,
      );
      total += ar;
      cum.push(total);
      for (const p of [a, b, c])
        for (let k = 0; k < 3; k++) {
          const x = p.getComponent(k);
          if (x < lo[k]) lo[k] = x;
          if (x > hi[k]) hi[k] = x;
        }
    }
  });
  const rnd = mulberry32(20261012),
    L = ud.len || 8,
    out = cum.length ? outsideField(tri, lo, hi) : null;
  const make = (n) => {
    const pos = new Float32Array(3 * n),
      nrm = new Float32Array(3 * n),
      r = new Float32Array(n),
      ph = new Float32Array(n),
      jit = new Float32Array(3 * n);
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 16; tries++) {
        // a point on a face open to the outside (after 16 misses, one that will not glow)
        let lo = 0,
          hi = cum.length - 1;
        const x = rnd() * total;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (cum[m] < x) lo = m + 1;
          else hi = m;
        }
        let u = rnd(),
          v = rnd();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const w = 1 - u - v,
          T = 18 * lo;
        for (let j = 0; j < 3; j++) {
          pos[3 * k + j] =
            w * tri[T + j] + u * tri[T + 3 + j] + v * tri[T + 6 + j];
          nrm[3 * k + j] =
            w * tri[T + 9 + j] + u * tri[T + 12 + j] + v * tri[T + 15 + j];
        }
        const nl = Math.hypot(nrm[3 * k], nrm[3 * k + 1], nrm[3 * k + 2]) || 1;
        for (let j = 0; j < 3; j++) nrm[3 * k + j] /= nl;
        const px = pos[3 * k],
          py = pos[3 * k + 1],
          pz = pos[3 * k + 2],
          d = out.step,
          nx = nrm[3 * k],
          ny = nrm[3 * k + 1],
          nz = nrm[3 * k + 2];
        if (out(px + d * nx, py + d * ny, pz + d * nz)) break;
        if (out(px - d * nx, py - d * ny, pz - d * nz)) {
          for (let j = 0; j < 3; j++) nrm[3 * k + j] *= -1;
          break;
        }
        if (tries === 15) for (let j = 0; j < 3; j++) nrm[3 * k + j] = 0;
      }
      r[k] = rnd();
      ph[k] = rnd();
      const z = 2 * rnd() - 1,
        th = TAU * rnd(),
        s = Math.sqrt(1 - z * z);
      jit[3 * k] = s * Math.cos(th);
      jit[3 * k + 1] = s * Math.sin(th);
      jit[3 * k + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aN", new THREE.BufferAttribute(nrm, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(r, 1));
    g.setAttribute("aP", new THREE.BufferAttribute(ph, 1));
    g.setAttribute("aJ", new THREE.BufferAttribute(jit, 3));
    return g;
  };
  if (!cum.length) {
    ud.plasmaGeo = {
      shell: new THREE.BufferGeometry(),
      halo: new THREE.BufferGeometry(),
      wake: new THREE.BufferGeometry(),
      L,
    };
    return ud.plasmaGeo;
  }
  const shell = make(PLASMA_N),
    halo = new THREE.BufferGeometry(); // the halo: a few of the shell's points, drawn wide
  for (const k in shell.attributes) halo.setAttribute(k, shell.attributes[k]);
  halo.setDrawRange(0, HALO_N);
  ud.plasmaGeo = { shell, halo, wake: make(WAKE_N), L };
  return ud.plasmaGeo;
}

// ==== 31_apollo.js
// ============================================================================
// Apollo command and service modules (metres, +Y along the stack, Y = 0 at the module's base).
// Command module: 3.91 m across, 3.23 m tall with its heat shield (3.48 m with the docking probe). Y = 0 at the toroidal
// shoulder where the aft heat shield (a 4.69 m-radius dome, 0.43 m deep) meets the 33° cone; the docking ring on top is
// CM_TOP up. The cone is covered in silver Mylar tape; five windows (two forward-looking rendezvous windows, two side
// windows, one in the hatch), the side hatch and the RCS thrusters. On the pad the boost protective cover and the launch
// escape tower sit on it. Service module: 3.91 m across, 4.52 m from its aft bulkhead to the CM's shoulder (a 3.94 m
// cylinder and the 0.58 m forward fairing with its eight radiators); four RCS quads, the two large radiator panels, the
// high-gain antenna at the aft end and the SPS engine, whose 2.5 m bell reaches 2.97 m below.
// ============================================================================
const CM_TOP = 2.8; // m above the shoulder: the top of the docking ring (where the LM's drogue meets it)
const SM_LEN = 4.52,
  SM_CYL = 3.94; // m: aft bulkhead to the CM's shoulder, and to the top of the cylinder (the fairing above)
const APOLLO = {};
// crinkled foil, Mylar or Kapton: a colour map and a matching normal map (a height field of soft creases), cached
function foilTex(base, hi, lo, seed = 1, w = 256, creases = 420) {
  const key = "tex" + base + hi + lo + seed + w;
  if (APOLLO[key]) return APOLLO[key];
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const H = new Float32Array(w * w);
  for (let n = 0; n < creases; n++) {
    const x0 = rnd() * w,
      y0 = rnd() * w,
      ang = rnd() * Math.PI,
      len = 10 + rnd() * w * 0.22,
      amp = (rnd() - 0.5) * 2,
      wid = 1 + rnd() * 4,
      dx = Math.cos(ang),
      dy = Math.sin(ang);
    for (let t = -len / 2; t < len / 2; t += 1) {
      const cx = x0 + dx * t,
        cy = y0 + dy * t;
      for (let o = -wid; o <= wid; o++) {
        const px = Math.round(cx - dy * o),
          py = Math.round(cy + dx * o);
        H[(((py % w) + w) % w) * w + (((px % w) + w) % w)] +=
          amp * (1 - Math.abs(o) / (wid + 1)) * 0.12;
      }
    }
  }
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = w;
    return c;
  };
  const col = mk(),
    nor = mk(),
    g = col.getContext("2d"),
    gn = nor.getContext("2d"),
    img = g.createImageData(w, w),
    imn = gn.createImageData(w, w);
  const cB = new THREE.Color(base),
    cH = new THREE.Color(hi),
    cL = new THREE.Color(lo),
    c = new THREE.Color();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x,
        hx = H[y * w + ((x + 1) % w)] - H[y * w + ((x + w - 1) % w)],
        hy = H[((y + 1) % w) * w + x] - H[((y + w - 1) % w) * w + x];
      const sh = clamp(0.5 + hx * 1.6 - hy * 0.8, 0, 1);
      if (sh > 0.5) c.copy(cB).lerp(cH, (sh - 0.5) * 2);
      else c.copy(cL).lerp(cB, sh * 2);
      img.data[4 * k] = c.r * 255;
      img.data[4 * k + 1] = c.g * 255;
      img.data[4 * k + 2] = c.b * 255;
      img.data[4 * k + 3] = 255;
      const nx = -hx * 3,
        ny = -hy * 3,
        nl = Math.hypot(nx, ny, 1);
      imn.data[4 * k] = ((nx / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 1] = ((ny / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 2] = ((1 / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  gn.putImageData(imn, 0, 0);
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const nmap = new THREE.CanvasTexture(nor);
  nmap.wrapS = nmap.wrapT = THREE.RepeatWrapping;
  return (APOLLO[key] = { map, nmap });
}
// foil materials: 'mylar' (the CM's silver tape), 'gold', 'amber' (Kapton), 'black'; repeat: tiles per UV unit
function foilMat(kind, repeat = 1) {
  const key = "mat" + kind + repeat;
  if (APOLLO[key]) return APOLLO[key];
  const T = {
    mylar: ["#c9ccd1", "#f4f6f8", "#7c8086", 2],
    gold: ["#d6a43a", "#f8e08c", "#7c5516", 3],
    amber: ["#c8862c", "#efbb5c", "#6a3f10", 5],
    black: ["#1d1e21", "#55575c", "#060607", 7],
  }[kind];
  const t = foilTex(T[0], T[1], T[2], T[3]),
    map = t.map.clone(),
    nmap = t.nmap.clone();
  map.repeat.set(repeat, repeat);
  nmap.repeat.set(repeat, repeat);
  map.needsUpdate = nmap.needsUpdate = true;
  const p = {
    mylar: [0.3, 0.55],
    gold: [0.34, 0.7],
    amber: [0.38, 0.6],
    black: [0.6, 0.15],
  }[kind];
  return (APOLLO[key] = new THREE.MeshStandardMaterial({
    map,
    normalMap: nmap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: p[0],
    metalness: p[1],
  }));
}
// the service module's skin: aluminium panels, the two large radiator panels and the panel seams, wrapped around once

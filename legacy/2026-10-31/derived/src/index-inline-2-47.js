// index-inline-2 47 — three
// Lines 13361-13607 of readable/index-inline-2.pretty.js (statement-aligned).
function runwayTexture(rw) {
  const lake = rw.surface === "lakebed",
    W = 128,
    Hh = 4096,
    c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d"),
    mPerPx = (rw.len * 1000) / Hh,
    px = (m) => m / mPerPx,
    wPx = (m) => (m / (rw.wid * 1000)) * W;
  g.fillStyle = lake ? "#d9cdb2" : "#6d6c69";
  g.fillRect(0, 0, W, Hh);
  if (!lake)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + Math.random() * 0.05})`;
      g.fillRect(
        Math.random() * W,
        Math.random() * Hh,
        2 + Math.random() * 10,
        2 + Math.random() * 30,
      );
    }
  const paint = lake ? "#1d1c1a" : "#f2f1ec";
  g.fillStyle = paint;
  // centreline dashes, edge stripes, threshold bars and touchdown-zone marks at both ends
  for (let y = px(120); y < Hh - px(120); y += px(60))
    g.fillRect(W / 2 - wPx(0.45), y, wPx(0.9), px(36));
  g.fillRect(wPx(1.5), 0, wPx(lake ? 3 : 0.9), Hh);
  g.fillRect(W - wPx(1.5) - wPx(lake ? 3 : 0.9), 0, wPx(lake ? 3 : 0.9), Hh);
  for (const end of [0, 1]) {
    const y0 = end ? Hh - px(8) - px(45) : px(8);
    if (!lake)
      for (let k = 0; k < 16; k++) {
        const x = wPx(4) + (k * (W - wPx(8))) / 16;
        g.fillRect(x, y0, wPx(1.8), px(45));
      }
    else g.fillRect(wPx(2), y0 + px(20), W - wPx(4), px(6));
    for (const d of [150, 300, 450, 600]) {
      const y = end ? Hh - px(d) - px(22) : px(d);
      g.fillRect(W / 2 - wPx(14), y, wPx(3), px(22));
      g.fillRect(W / 2 + wPx(11), y, wPx(3), px(22));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(16, R.maxAniso || 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function buildRunway(md) {
  disposeRunway();
  const rw = md.cfg.runway && RUNWAYS[md.cfg.runway];
  if (!rw) return;
  const b = R.bodies.earth,
    Rm = (b.R + rw.elev + SH_RWY_TOP) * 1000; // m, a few centimetres above the sphere
  const C = meshDir(rw.lat, rw.lon),
    { E, N } = meshEN(rw.lat, rw.lon),
    hd = rw.hdg * DEG;
  const f = vadd(vscale(E, Math.sin(hd)), vscale(N, Math.cos(hd))),
    l = vcross(C, f);
  const L = rw.len * 1000,
    Wd = rw.wid * 1000,
    nL = 64;
  const at = (x, y) =>
    vscale(
      vunit(vadd(vscale(C, b.R * 1000), vadd(vscale(f, x), vscale(l, y)))),
      Rm,
    ); // point on the sphere, m (mesh frame)
  const Pc = at(L / 2, 0),
    pos = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= nL; i++)
    for (const j of [0, 1]) {
      const p = at((L * i) / nL, (j - 0.5) * Wd);
      pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
      uv.push(1 - j, i / nL);
    }
  for (let i = 0; i < nL; i++) {
    const a = 2 * i,
      bq = a + 1,
      cq = a + 2,
      d = a + 3;
    idx.push(a, cq, bq, bq, cq, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      map: runwayTexture(rw),
      roughness: 0.92,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const grp = new THREE.Group();
  grp.add(m);
  // edge lights every 60 m, green threshold bars, red end bars
  const lp = [],
    lc = [],
    add = (x, y, col) => {
      const p = at(x, y);
      lp.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2] + 0);
      const cc = new THREE.Color(col);
      lc.push(cc.r, cc.g, cc.b);
    };
  for (let x = 0; x <= L + 1; x += 60)
    for (const s of [-1, 1]) add(x, s * (Wd / 2 + 1.5), "#fff1cf");
  for (let k = -12; k <= 12; k++) {
    add(-3, (k * Wd) / 24, "#7dff9a");
    add(L + 3, (k * Wd) / 24, "#ff5a4a");
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
  const lights = new THREE.Points(
    lg,
    new THREE.PointsMaterial({
      size: 3.2,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lights.renderOrder = 6;
  grp.add(lights);
  // place the group at the runway centre in the planet's mesh frame (unit sphere scaled by R): metres → mesh units
  const k = 1 / (b.R * 1000);
  grp.position.set(Pc[0] * k, Pc[1] * k, Pc[2] * k);
  grp.scale.setScalar(k);
  b.mesh.add(grp);
  SHV.runway = grp;
  SHV.lights = lights;
  SHV.rwy = rw;
}
function disposeRunway() {
  if (!SHV.runway) return;
  const g = SHV.runway;
  g.parent && g.parent.remove(g);
  g.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) {
      if (n.material.map) n.material.map.dispose();
      n.material.dispose();
    }
  });
  SHV.runway = null;
  SHV.lights = null;
  SHV.rwy = null;
}
function updateRunway(t) {
  // lights on between dusk and dawn
  if (!SHV.lights) return;
  const rw = SHV.rwy;
  const r = sitePosEcl("earth", rw.lat, rw.lon, 0, t),
    sun = vunit(vscale(helio("earth", t).r, -1));
  const el = vdot(vunit(r), sun);
  SHV.lights.material.opacity = clamp((0.05 - el) / 0.1, 0, 1);
}

// ==== 45_rover.js
// ============================================================================
// Surface: craft standing exactly on the ground that is drawn (the flat facets of the
// high-resolution surface patch), contact shadows, and a rover that drives after landing
// (first drive as flown, then illustrative daily commutes) leaving wheel tracks.
// ============================================================================
const _qG = new THREE.Quaternion(),
  _vG = new THREE.Vector3(),
  _rayG = new THREE.Ray(),
  _ta = new THREE.Vector3(),
  _tb = new THREE.Vector3(),
  _tc = new THREE.Vector3(),
  _td = new THREE.Vector3(),
  _hitG = new THREE.Vector3();
// d: unit direction [x, y, z] in the planet mesh's own frame → point on the drawn ground (planet-radius units), or null outside the patches
function capHitLocal(body, d) {
  for (const ci of MV.capInfo) {
    if (ci.body !== body || !ci.mesh) continue;
    const C = ci.mesh.geometry.userData.center,
      G = ci.mesh.geometry.userData.grid;
    if (!G) continue;
    if (d[0] * C[0] + d[1] * C[1] + d[2] * C[2] < Math.cos(ci.ang * DEG))
      continue;
    let phi = Math.atan2(d[2], -d[0]);
    while (phi < G.phiStart) phi += TAU;
    while (phi >= G.phiStart + TAU) phi -= TAU;
    const fx = ((phi - G.phiStart) / G.phiLength) * G.seg,
      fy =
        ((Math.acos(clamp(d[1], -1, 1)) - G.thetaStart) / G.thetaLength) *
        G.seg;
    if (fx < 0 || fy < 0 || fx >= G.seg || fy >= G.seg) continue;
    const ix = Math.floor(fx),
      iy = Math.floor(fy),
      W = G.seg + 1,
      P = ci.mesh.geometry.attributes.position;
    _ta.fromBufferAttribute(P, iy * W + ix + 1);
    _tb.fromBufferAttribute(P, iy * W + ix);
    _tc.fromBufferAttribute(P, (iy + 1) * W + ix);
    _td.fromBufferAttribute(P, (iy + 1) * W + ix + 1);
    _rayG.origin.set(-C[0], -C[1], -C[2]);
    _rayG.direction.set(d[0], d[1], d[2]);
    if (
      _rayG.intersectTriangle(_ta, _tb, _td, false, _hitG) ||
      _rayG.intersectTriangle(_tb, _tc, _td, false, _hitG)
    )
      return [_hitG.x + C[0], _hitG.y + C[1], _hitG.z + C[2]];
  }
  return null;
}
const meshDir = (lat, lon) => {
  const cl = Math.cos(lat * DEG);
  return [
    cl * Math.cos(lon * DEG),
    Math.sin(lat * DEG),
    -cl * Math.sin(lon * DEG),
  ];
};
const meshEN = (lat, lon) => {
  const cl = Math.cos(lat * DEG),
    sl = Math.sin(lat * DEG),
    co = Math.cos(lon * DEG),
    so = Math.sin(lon * DEG);
  return { E: [-so, 0, -co], N: [-sl * co, cl, sl * so] };
};
// mesh-frame vector → ecliptic (body-relative) at time t
function meshToEcl(body, v, t) {
  bodyQuat(body, t, _qG);
  _vG.set(v[0], v[1], v[2]).applyQuaternion(_qG);
  return [_vG.x, _vG.y, _vG.z];
}
function eclToMesh(body, v, t) {
  bodyQuat(body, t, _qG);
  _vG.set(v[0], v[1], v[2]).applyQuaternion(_qG.invert());
  return [_vG.x, _vG.y, _vG.z];
}

// ---------------- rover drive plan ----------------

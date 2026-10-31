// index-inline-2 54 — wpx
// Lines 15176-15484 of readable/index-inline-2.pretty.js (statement-aligned).
function runwayRadius(body, dLoc) {
  const rw = SHV.rwy;
  if (!rw || body !== "earth") return null;
  const b = R.bodies.earth,
    C = meshDir(rw.lat, rw.lon),
    { E, N } = meshEN(rw.lat, rw.lon),
    hd = rw.hdg * DEG;
  const f = vadd(vscale(E, Math.sin(hd)), vscale(N, Math.cos(hd))),
    l = vcross(C, f),
    d = vsub(dLoc, C);
  const x = vdot(d, f) * b.R,
    y = vdot(d, l) * b.R; // km along the runway from its threshold, and across
  if (x < -0.1 || x > rw.len + 0.1 || Math.abs(y) > rw.wid / 2 + 0.05)
    return null;
  return b.R + rw.elev + SH_RWY_TOP;
}
// ---------------- the runway ----------------
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

// ==== 43_terrain.js
// ============================================================================
// The real ground round the American launch and landing sites, drawn from data rather than photographed: the relief
// from the USGS elevation model, the sea, lagoons, rivers, lakes and marsh from the National Hydrography Dataset, the
// roads from the Census Bureau, the land coloured by the National Land Cover Database (tools/terrain/fetch.mjs writes
// each site as assets/terrain_<id>.json; all of it public domain). The buildings are drawn by hand (app/44_buildings.js)
// since no public-domain dataset has them.
// The site is a square draped over the sphere in the planet's mesh frame, as the runway is (app/42_shuttleview.js): a
// grid of heights with vertex colours and a fine scrub texture, water as flat polygons at their level, streams and roads
// as strips on the ground. Where a pad or a runway stands the ground is flattened to its level so the pad's slab and the
// runway lie on it; toward the rim the ground fades out and the globe's own map shows through. Without a site file the
// pad's procedural ground stays, as before.
// ============================================================================
const TERRAIN_SITES = {
  ksc: { lat: 28.615, lon: -80.655, km: 32 },
  starbase: { lat: 25.997, lon: -97.155, km: 12 },
  edwards: { lat: 34.93, lon: -117.85, km: 48 },
  whitesands: { lat: 32.99, lon: -106.425, km: 32 },
};
const TER = { groups: [], missing: {}, pending: 0, anim: [] }; // anim: materials with a time (the flags)
// the land's colours by NLCD class (sRGB), with how rough the scrub texture should show on each
const TER_COVER = {
  0: ["#8d8a60", 1],
  11: ["#3d6a86", 0.2],
  12: ["#e8ecf0", 0.3],
  21: ["#8f9478", 0.7],
  22: ["#8a8c80", 0.5],
  23: ["#7d7e78", 0.4],
  24: ["#6c6c6a", 0.3],
  31: ["#c9bea4", 0.6],
  41: ["#55733c", 1.2],
  42: ["#3d5c34", 1.2],
  43: ["#4f6b3c", 1.2],
  51: ["#9c925e", 1],
  52: ["#8f8c5e", 1],
  71: ["#a6a26c", 0.9],
  72: ["#aaa878", 0.8],
  73: ["#9aa070", 0.8],
  74: ["#8fa07e", 0.8],
  81: ["#93a65c", 0.7],
  82: ["#a89060", 0.6],
  90: ["#4e6a45", 1.1],
  95: ["#7a8a58", 0.9],
};
const TER_WATER = {
  sea: "#22486b",
  bay: "#23486a",
  estuary: "#264c69",
  lake: "#254a68",
  reservoir: "#254a68",
  river: "#284e6a",
  swamp: "#3d5c56",
  playa: "#cfc6ae",
  water: "#254a68",
};
const TER_ROAD = {
  primary: [18, "#4c4e52"],
  secondary: [12, "#55575a"],
  local: [7, "#62625e"],
}; // (a little wider than life, so they read from a few kilometres up)
// the site whose square holds the point (a little inside its edge)
function terrainSiteFor(lat, lon) {
  for (const [id, S] of Object.entries(TERRAIN_SITES)) {
    const dN = (lat - S.lat) * 110.574,
      dE = (lon - S.lon) * 111.32 * Math.cos(S.lat * DEG),
      h = S.km / 2 - 0.5;
    if (Math.abs(dN) < h && Math.abs(dE) < h && !TER.missing[id]) return id;
  }
  return null;
}
function b64(s, T) {
  const bin = atob(s),
    u8 = new Uint8Array(bin.length);
  for (let i = 0; i < u8.length; i++) u8[i] = bin.charCodeAt(i);
  return new T(u8.buffer);
}
// the mission's sites: the launch site and, on a Shuttle flight, the landing runway
function buildTerrain(md) {
  disposeTerrain();
  const want = new Set(),
    S = LAUNCH_SITES[md.cfg.site],
    rw = md.cfg.runway && RUNWAYS[md.cfg.runway];
  for (const p of [S, rw]) {
    if (!p) continue;
    const id = terrainSiteFor(p.lat, p.lon);
    if (id) want.add(id);
  }
  for (const id of want) loadTerrain(id, md);
}
function loadTerrain(id, md) {
  TER.pending++;
  fetch(ASSET(`terrain_${id}.json`))
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((T) => {
      if (MV.md === md) terrainBuild(id, T, md);
    })
    .catch(() => {
      TER.missing[id] = true;
    }) // (no file for this site: the pad's procedural ground stays)
    .finally(() => {
      TER.pending--;
    });
}
function disposeTerrain() {
  for (const g of TER.groups) {
    g.parent && g.parent.remove(g);
    g.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material && n.material !== padGround.mat) n.material.dispose();
    });
  }
  TER.groups = [];
  TER.anim = [];
  if (MV.pad)
    MV.pad.traverse((n) => {
      if (n.userData.padGround) n.visible = true;
    });
}
// ---- the build ----

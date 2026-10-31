// index-inline-2 20 — three
// Lines 5373-5717 of readable/index-inline-2.pretty.js (statement-aligned).
function apolloSM(damaged, stowed = false) {
  // stowed: on the launch pad, the high-gain antenna folded inside the adapter
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_CYL, 64, 1, true),
    smSkinMat(),
  );
  body.geometry.translate(0, SM_CYL / 2, 0);
  g.add(body);
  const aft = new THREE.Mesh(
    new THREE.CircleGeometry(1.955, 64),
    mat("#3a3c40", "dark"),
  );
  aft.rotation.x = Math.PI / 2;
  g.add(aft); // aft bulkhead
  const fwd = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 64),
    mat("#5d6166", "metal"),
  );
  fwd.rotation.x = -Math.PI / 2;
  fwd.position.y = SM_CYL;
  g.add(fwd); // forward bulkhead, under the CM
  const fair = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_LEN - SM_CYL, 64, 1, true),
    fairingMat(),
  );
  fair.geometry.translate(0, (SM_CYL + SM_LEN) / 2, 0);
  g.add(fair); // the forward fairing
  const ring = cyl(1.968, 1.968, 0.05, mat("#9ca1a8", "metal"), 64);
  ring.position.y = SM_CYL - 0.025;
  g.add(ring); // the seam below the fairing
  // four RCS quads: a housing on the skin with four nozzles (up, down and both ways round)
  const noz = mat("#2a2622", "metal", { side: THREE.DoubleSide }),
    housing = mat("#d8dadd", "metal");
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 7.25 * DEG,
      ux = Math.sin(a),
      uz = Math.cos(a),
      q = new THREE.Group();
    q.position.set(ux * 2.02, 2.95, uz * 2.02);
    q.rotation.y = a;
    g.add(q);
    const h = box(0.55, 0.62, 0.16, housing);
    h.position.y = -0.31;
    q.add(h);
    for (const d of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
    ]) {
      const b = bell(0.24, 0.09, noz);
      b.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(...d),
      );
      b.position.set(d[0] * 0.28, d[1] * 0.31, 0.12);
      q.add(b);
    }
  }
  // the high-gain antenna on its boom at the aft end: four dishes round a wide-beam horn
  if (!stowed) {
    const a = Math.PI * 1.25,
      ux = Math.sin(a),
      uz = Math.cos(a),
      dishM = mat("#e9e9e6", "paint", { side: THREE.DoubleSide });
    const p0 = [ux * 1.9, 0.35, uz * 1.9],
      p1 = [ux * 2.9, -0.55, uz * 2.9];
    g.add(lmRodA(p0, p1, 0.06, mat("#9aa0a6", "metal")));
    const hg = new THREE.Group();
    hg.position.set(...p1);
    hg.rotation.y = a;
    hg.rotation.x = 0.6;
    g.add(hg);
    for (const [x, y] of [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ]) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 6, 0, TAU, 0, Math.PI / 5),
        dishM,
      );
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, y, 0.15);
      hg.add(d);
    }
    const horn = cyl(0.12, 0.05, 0.3, dishM, 12);
    horn.rotation.x = -Math.PI / 2;
    hg.add(horn);
  }
  // the SPS engine: the combustion chamber and nozzle throat (dark) and the radiation-cooled extension (lighter)
  {
    const L = 2.97,
      R = 1.25,
      prof = [
        [R * 0.34, L],
        [R * 0.3, L * 0.9],
        [R * 0.48, L * 0.65],
        [R * 0.72, L * 0.35],
        [R, 0],
      ].map((p) => [p[0], p[1] - L]);
    const split = 2;
    g.add(
      lathe(
        prof.slice(0, split + 1),
        mat("#2b2c2f", "dark", { side: THREE.DoubleSide }),
        32,
      ),
    );
    g.add(
      lathe(
        prof.slice(split),
        mat("#8b9097", "metal", { side: THREE.DoubleSide }),
        32,
      ),
    );
  }
  if (damaged) {
    // Apollo 13: the outer panel of bay 4 blown away, the bay's shelves and tanks exposed
    const a = 0.8,
      hole = cmlessPanel(1.6, 3.1, a, 1.75, mat("#2a1d12", "dark"));
    g.add(hole);
    for (let k = 0; k < 7; k++) {
      const sh = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.25 + 0.1 * (k % 3), 0.05),
        new THREE.Vector2(0.1, 0.3),
      ]);
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(sh),
        mat("#9aa0a6", "metal", { side: THREE.DoubleSide }),
      );
      m.position.set(
        Math.sin(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
        0.4 + k * 0.42,
        Math.cos(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
      );
      m.rotation.y = a;
      g.add(m);
    }
  }
  g.userData.len = SM_LEN;
  g.userData.engineY = -2.97;
  g.userData.engineR = 1.25;
  return g;
}
// the forward fairing: eight electrical-power radiators (white, with their tubes) between narrow aluminium strips
function fairingMat() {
  if (APOLLO.fairing) return APOLLO.fairing;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#b9bec4";
  g.fillRect(0, 0, 1024, 64);
  for (let k = 0; k < 8; k++) {
    const x0 = k * 128 + 10;
    g.fillStyle = "#eceef0";
    g.fillRect(x0, 6, 108, 52);
    g.strokeStyle = "rgba(150,156,162,0.9)";
    g.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo(x0 + i * 12, 8);
      g.lineTo(x0 + i * 12, 56);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (APOLLO.fairing = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.45,
    metalness: 0.35,
  }));
}
// a dark, recessed panel on the service module's cylinder (azimuth a from +Z, centred at height y)
function cmlessPanel(w, h, a, y, m) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(Math.sin(a) * 1.96, y, Math.cos(a) * 1.96);
  p.rotation.y = a;
  return p;
}

// ==== 32_shuttle.js
// ============================================================================
// Space Shuttle models (metres): the orbiter, the launch stack (External Tank, two boosters, the orbiter on the
// tank's belly side), the International Space Station and the Hubble Space Telescope.
// Orbiter axes: +Y nose, +Z top (payload bay side), +X right (starboard) wing. Y = 0 at the aft end of the
// fuselage (the base heat shield), Z = 0 at the payload bay centreline (structural plane Zo 400).
// Dimensions follow the orbiter structure: mid fuselage 18.4 m long, 5.2 m wide; aft fuselage 6.7 m wide and
// 6.1 m high; OMS pods 6.6 m long; wing root chord 18 m; vertical tail 8 m tall, swept 45°.
// The orbiter is drawn with the Smithsonian's 3D scan of Discovery (assets/orbiter.glb, built by tools/models: the body,
// the two payload bay doors and the landing gear apart). The built-in model below stands in while it loads; the landing
// gear, the engine nozzles and the payload bay follow the scan's measurements in both.
// ============================================================================
const SH_COL = {
  white: "#efede7",
  black: "#141517",
  rcc: "#3c3d41",
  grey: "#a3a8ae",
  bay: "#d4d7da",
  rad: "#e6ebf0",
  gold: "#c8a24a",
  base: "#2c2e31",
};
// Where the tyres touch the ground with the gear down, [Y, Z] (from the scan). The nose wheels touch 1.55 m higher than the
// main wheels, so the orbiter stands 4.4° nose down on its gear.
const SH_MAIN_CONTACT = [8.8, -6.03],
  SH_NOSE_CONTACT = [29.0, -4.48],
  SH_MAIN_TRACK = 3.72; // main wheels ±3.72 m out
const SH_GEAR_H = -SH_MAIN_CONTACT[1]; // m: the reference plane (Z = 0) above the main wheels' contact, wings level (the flight planner's gear height)
const SH_STANCE = -Math.atan2(
  SH_NOSE_CONTACT[1] - SH_MAIN_CONTACT[1],
  SH_NOSE_CONTACT[0] - SH_MAIN_CONTACT[0],
); // rad: the attitude on the ground, −4.4°
// engine nozzle exits (from the scan): [x, exit Y, z]; three RS-25s (2.29 m exits) and the two OMS engines
const SH_SSME = [
    [0.02, -1.81, 1.96],
    [-1.56, -2.49, -0.95],
    [1.58, -2.47, -1.01],
  ],
  SH_OMSE = [
    [-2.97, -1.0, 2.28],
    [2.97, -1.0, 2.28],
  ];
const SH_BAY = [5.6, 23.9]; // payload bay doors, Y range
const SH_HINGE = 24 * DEG; // door hinge on the fuselage section (superellipse angle)
const SH_OMS_X = 2.6; // OMS pod centrelines
const SH_E = 2 / 2.6,
  SH_EB = 2 / 4.5; // superellipse exponents: rounded-square top, flat belly
function vcMat(extra = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.66,
    metalness: 0.03,
    ...extra,
  });
}
// colour every vertex of a geometry from its position and normal
function paintGeo(g, fn) {
  const p = g.attributes.position,
    n = g.attributes.normal,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    col.set(
      fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)),
    );
    c[3 * i] = col.r;
    c[3 * i + 1] = col.g;
    c[3 * i + 2] = col.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}
// point on a fuselage section s = [y, zc, a (half width), bTop, bBot] at angle th (0 = starboard side, 90° = top)
function shRing(s, th) {
  const c = Math.cos(th),
    sn = Math.sin(th);
  const x = s[2] * Math.sign(c) * Math.pow(Math.abs(c), sn >= 0 ? SH_E : SH_EB);
  const z =
    sn >= 0
      ? s[1] + s[3] * Math.pow(Math.abs(sn), SH_E)
      : s[1] - s[4] * Math.pow(Math.abs(sn), SH_EB);
  return [x, s[0], z];
}
// lofted surface through sections; skip(yMid, thMid) leaves quads out (the payload bay opening)
function loftGeo(st, nSeg, skip) {
  const pos = [],
    idx = [];
  for (const s of st)
    for (let k = 0; k <= nSeg; k++) pos.push(...shRing(s, (k / nSeg) * TAU));
  for (let i = 0; i < st.length - 1; i++)
    for (let k = 0; k < nSeg; k++) {
      if (
        skip &&
        skip(0.5 * (st[i][0] + st[i + 1][0]), ((k + 0.5) / nSeg) * TAU)
      )
        continue;
      const a = i * (nSeg + 1) + k,
        b = a + 1,
        c = a + nSeg + 1,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// flat cap closing a section (facing −Y when back = true)
function capGeo(s, nSeg, back) {
  const pos = [0, s[0], s[1]],
    idx = [];
  for (let k = 0; k <= nSeg; k++) pos.push(...shRing(s, (k / nSeg) * TAU));
  for (let k = 1; k <= nSeg; k++)
    back ? idx.push(0, k, k + 1) : idx.push(0, k + 1, k);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const SH_STATIONS = [
  [0.0, 0.35, 3.25, 2.95, 2.95],
  [2.6, 0.3, 3.1, 2.85, 2.9],
  [SH_BAY[0], -0.1, 2.62, 2.5, 2.5],
  [SH_BAY[1], -0.1, 2.62, 2.5, 2.5],
  [25.0, 0.05, 2.56, 2.75, 2.6],
  [26.8, 0.35, 2.45, 2.95, 2.75],
  [28.6, 0.2, 2.2, 2.6, 2.45],
  [30.3, -0.15, 1.75, 1.95, 2.0],
  [31.6, -0.55, 1.15, 1.25, 1.45],
  [32.35, -0.85, 0.6, 0.62, 0.85],
  [32.75, -1.0, 0.06, 0.06, 0.08],
];
function shuttleFuselage() {
  const bay = (y, th) =>
    y > SH_BAY[0] && y < SH_BAY[1] && th > SH_HINGE && th < Math.PI - SH_HINGE;
  const g = loftGeo(SH_STATIONS, 64, bay);
  paintGeo(g, (x, y, z, nx, ny, nz) => {
    if (
      y > 25.6 &&
      y < 28.9 &&
      z > 1.95 &&
      Math.abs(x) < 2.0 &&
      (nz > 0.3 || ny > 0.35)
    )
      return SH_COL.black; // flight-deck windows and their frame
    if (y > 31.3) return SH_COL.black; // nose cap
    if (nz < -0.3 || (y > 28.5 && nz < 0.1)) return SH_COL.black; // belly tiles, wrapping up around the chin
    return SH_COL.white;
  });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, vcMat()));
  grp.add(
    new THREE.Mesh(capGeo(SH_STATIONS[0], 64, true), mat(SH_COL.base, "dark")),
  ); // base heat shield around the main engines
  return grp;
}

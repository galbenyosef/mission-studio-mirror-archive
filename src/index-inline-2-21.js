// index-inline-2 21 — three
// Lines 5689-6002 of readable/index-inline-2.pretty.js (statement-aligned).
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
function shuttleWing(side) {
  // double-delta planform: 81° glove, 45° main wing; dark leading edges, black underside
  const P = [
    [2.6, 1.0],
    [11.9, 2.3],
    [11.95, 4.4],
    [4.9, 11.4],
    [3.6, 16.0],
    [2.6, 19.6],
  ];
  const sh = new THREE.Shape();
  P.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 1.3,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const k = 1 - 0.75 * clamp((x - 2.6) / 9.4, 0, 1);
    p.setZ(i, z * k);
  } // thinner toward the tip
  if (side < 0) {
    for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
    const ix = g.index;
    if (ix)
      for (let i = 0; i < ix.count; i += 3) {
        const t = ix.getX(i + 1);
        ix.setX(i + 1, ix.getX(i + 2));
        ix.setX(i + 2, t);
      }
    else {
      for (let i = 0; i < p.count; i += 3)
        for (let k = 0; k < 3; k++) {
          const t = p.getComponent(i + 1, k);
          p.setComponent(i + 1, k, p.getComponent(i + 2, k));
          p.setComponent(i + 2, k, t);
        }
    }
  }
  g.computeVertexNormals();
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    nz < -0.35
      ? SH_COL.black
      : nz < 0.45 && (ny > 0.3 || Math.abs(nx) > 0.6)
        ? SH_COL.rcc
        : SH_COL.white,
  );
  const m = new THREE.Mesh(g, vcMat());
  m.position.z = -2.45;
  return m;
}
function shuttleFin() {
  // vertical tail with the split rudder / speed brake
  const sh = new THREE.Shape();
  [
    [5.8, 0],
    [-1.2, 0],
    [-5.1, 8.0],
    [-2.3, 8.0],
  ].forEach(([y, z], i) => (i ? sh.lineTo(y, z) : sh.moveTo(y, z)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  });
  const p = g.attributes.position; // shape (y, z) in the XY plane, extruded along Z: map to model (x = extrusion, y, z)
  for (let i = 0; i < p.count; i++) {
    const sy = p.getX(i),
      sz = p.getY(i),
      ex = p.getZ(i);
    const k = 1 - 0.55 * clamp(sz / 8, 0, 1);
    p.setXYZ(i, (ex - 0.25) * k, sy, sz);
  }
  g.computeVertexNormals();
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    ny > 0.5 && Math.abs(nx) < 0.7 ? SH_COL.rcc : SH_COL.white,
  );
  const m = new THREE.Mesh(g, vcMat());
  m.position.z = 3.05;
  return m;
}
function shuttleOmsPod(side) {
  // OMS/RCS pod: 6.6 m long, 2.6 m wide in front, 3.5 m at the aft end
  const g = loftGeo(
    [
      [-0.75, 0.0, 1.45, 1.05, 1.0],
      [-0.55, 0.0, 1.6, 1.12, 1.05],
      [2.4, 0.0, 1.5, 1.12, 1.05],
      [4.6, -0.05, 1.2, 0.9, 1.0],
      [5.6, -0.25, 0.8, 0.55, 0.9],
      [5.95, -0.4, 0.15, 0.12, 0.3],
    ],
    32,
  );
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    nz > 0.15 && y > -0.4 && y < 5.4
      ? SH_COL.white
      : y <= -0.6
        ? SH_COL.base
        : SH_COL.grey,
  );
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, vcMat()));
  grp.add(
    new THREE.Mesh(
      capGeo([-0.75, 0.0, 1.45, 1.05, 1.0], 32, true),
      mat(SH_COL.base, "dark"),
    ),
  ); // aft end around the OMS engine
  grp.position.set(side * SH_OMS_X, 0, 2.6);
  return grp;
}
// one payload bay door, built at its hinge so it can swing open (175.5° when fully open); white outside, radiators inside
function shuttleBayDoor(side, open) {
  const s = SH_STATIONS[2],
    H = shRing(s, SH_HINGE),
    hx = H[0],
    hz = H[2],
    n = 20,
    ys = [SH_BAY[0], SH_BAY[1]];
  const pos = [];
  for (const y of ys)
    for (let k = 0; k <= n; k++) {
      const th = SH_HINGE + ((Math.PI / 2 - SH_HINGE) * k) / n;
      const q = shRing(s, th);
      pos.push(side * (q[0] - hx), y, q[2] - hz);
    }
  const outer = [],
    inner = [];
  for (let k = 0; k < n; k++) {
    const a = k,
      b = k + 1,
      c = n + 1 + k,
      d = c + 1;
    if (side > 0) {
      outer.push(a, c, b, b, c, d);
      inner.push(a, b, c, b, d, c);
    } else {
      outer.push(a, b, c, b, d, c);
      inner.push(a, c, b, b, c, d);
    }
  }
  const mk = (ix, m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    return new THREE.Mesh(g, m);
  };
  const grp = new THREE.Group();
  grp.add(mk(outer, mat(SH_COL.white, "paint")));
  grp.add(mk(inner, mat(SH_COL.rad, "metal")));
  grp.position.set(side * hx, 0, hz);
  if (open) grp.rotation.y = side * SH_DOOR.open;
  return grp;
}
// The payload bay's geometry: the door hinges (x, z) on the sills, the side walls, the floor and, for the scan, the arch of
// the fuselage's top (an ellipse over the walls) that the end bulkheads fill when the doors are open
const SH_BAY_BUILTIN = (() => {
  const H = shRing(SH_STATIONS[2], SH_HINGE);
  return { hx: H[0], hz: H[2], wall: H[0] - 0.12, floor: -2.25 };
})();
const SH_BAY_SCAN = {
  hx: 2.7,
  hz: 0.6,
  wall: 2.47,
  floor: -2.3,
  arch: [0.95, 1.4],
}; // the scan's skin is 2.67–2.72 m out; arch: centre z, height

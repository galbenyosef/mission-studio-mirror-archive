// index-inline-2 21 — three
// Lines 5718-6037 of readable/index-inline-2.pretty.js (statement-aligned).
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
function shuttleBayInterior(B = SH_BAY_BUILTIN) {
  const g = new THREE.Group(),
    m = mat(SH_COL.bay, "paint", { side: THREE.DoubleSide }),
    L = SH_BAY[1] - SH_BAY[0],
    yc = (SH_BAY[0] + SH_BAY[1]) / 2;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2 * B.wall + 0.1, L, 0.1),
    m,
  );
  floor.position.set(0, yc, B.floor);
  g.add(floor);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, L, B.hz - B.floor),
      m,
    );
    wall.position.set(s * B.wall, yc, (B.hz + B.floor) / 2);
    g.add(wall);
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, L, 0.16),
      mat("#b8bdc2", "metal"),
    );
    sill.position.set(s * (B.wall + 0.05), yc, B.hz - 0.04);
    g.add(sill); // the sill longeron, inside the skin
  }
  const bulk = (y, col, kind) => {
    let geo;
    if (B.arch) {
      // the walls, then the arch of the fuselage's top
      const [zc, b] = B.arch,
        sh = new THREE.Shape();
      sh.moveTo(-B.wall, B.floor);
      sh.lineTo(B.wall, B.floor);
      sh.lineTo(B.wall, zc);
      for (let k = 1; k <= 24; k++) {
        const t = (k / 24) * Math.PI;
        sh.lineTo(B.wall * Math.cos(t), zc + b * Math.sin(t));
      }
      sh.lineTo(-B.wall, B.floor);
      geo = new THREE.ShapeGeometry(sh);
      geo.rotateX(Math.PI / 2);
    } else {
      const st = SH_STATIONS[2];
      geo = capGeo(
        [0, st[1], st[2] * 0.985, st[3] * 0.985, st[4] * 0.985],
        48,
        false,
      );
    }
    const b = new THREE.Mesh(geo, mat(col, kind, { side: THREE.DoubleSide }));
    b.position.y = y;
    g.add(b);
  };
  bulk(SH_BAY[0] + 0.06, SH_COL.gold, "gold");
  bulk(SH_BAY[1] - 0.06, "#dfe2e5", "paint");
  return g;
}
function shuttleMainEngines() {
  // three RS-25s in a triangle, nozzles pointing aft (−Y), throats just inside the base
  const g = new THREE.Group();
  for (const [x, ey, z] of SH_SSME) {
    const len = 0.3 - ey,
      b = bell(len, 1.145, mat("#4d5055", "metal", { side: THREE.DoubleSide }));
    b.position.set(x, ey, z);
    g.add(b);
  }
  return g;
}
function shuttleGear(down) {
  // two-wheel main gears (1.13 m tyres) and the nose gear (0.81 m), tyres touching at the scan's contact points
  const g = new THREE.Group();
  if (!down) return g;
  const strutM = mat("#b9bec4", "metal"),
    tyre = mat("#1a1a1a", "dark");
  const wheel = (r, w) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), tyre);
    c.rotation.z = Math.PI / 2;
    return c;
  };
  const strut = (x, y, z0, z1, r) => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, z0 - z1, 10),
      strutM,
    );
    c.rotation.x = Math.PI / 2;
    c.position.set(x, y, (z0 + z1) / 2);
    return c;
  };
  const [ym, zm] = SH_MAIN_CONTACT,
    [yn, zn] = SH_NOSE_CONTACT,
    rw = 0.565,
    rn = 0.405;
  for (const s of [-1, 1]) {
    const x = s * SH_MAIN_TRACK;
    g.add(strut(x, ym, -3.5, zm + rw, 0.17));
    for (const dx of [-0.4, 0.4]) {
      const w = wheel(rw, 0.4);
      w.position.set(x + dx, ym, zm + rw);
      g.add(w);
    }
  }
  g.add(strut(0, yn, -3.1, zn + rn, 0.13));
  for (const dx of [-0.26, 0.26]) {
    const w = wheel(rn, 0.3);
    w.position.set(dx, yn, zn + rn);
    g.add(w);
  }
  return g;
}
// The scan's wheel wells with their doors closed: plates on the belly's tiles (the scan has the doors open, hanging beside
// the gear). Corners [x, y, z]: the main wells under the wing roots and the nose well.
function shuttleWellCovers() {
  const g = new THREE.Group(),
    m = mat("#17181a", "tile", { side: THREE.DoubleSide });
  const quad = (c) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(c.flat(), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  };
  for (const s of [-1, 1])
    g.add(
      quad([
        [s * 2.42, 7.8, -3.57],
        [s * 4.68, 7.8, -3.33],
        [s * 4.68, 12.6, -3.11],
        [s * 2.42, 12.6, -3.44],
      ]),
    );
  g.add(
    quad([
      [-0.82, 28.2, -3.2],
      [0.82, 28.2, -3.2],
      [0.82, 31.3, -3.18],
      [-0.82, 31.3, -3.18],
    ]),
  );
  return g;
}

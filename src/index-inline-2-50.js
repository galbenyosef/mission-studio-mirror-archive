// index-inline-2 50 — math
// Lines 14275-14459 of readable/index-inline-2.pretty.js (statement-aligned).
function padArm(len, w, hgt, m, o = {}) {
  const k = padKit(),
    M = padMats(),
    b = 0.28;
  const top = [
      [-w / 2, hgt],
      [w / 2, hgt],
    ],
    bot = [
      [-w / 2, 0],
      [w / 2, 0],
    ];
  for (const [x, y] of [...top, ...bot])
    k.beam(m, new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -len), b);
  const nb = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= nb; i++) {
    const z = (-len * i) / nb,
      z2 = (-len * (i + 1)) / nb;
    k.beam(
      m,
      new THREE.Vector3(-w / 2, 0, z),
      new THREE.Vector3(w / 2, 0, z),
      b * 0.7,
    );
    k.beam(
      m,
      new THREE.Vector3(-w / 2, hgt, z),
      new THREE.Vector3(w / 2, hgt, z),
      b * 0.7,
    );
    for (const x of [-w / 2, w / 2]) {
      k.beam(
        m,
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, hgt, z),
        b * 0.7,
      );
      if (i < nb)
        k.beam(
          m,
          new THREE.Vector3(x, 0, z),
          new THREE.Vector3(x, hgt, z2),
          b * 0.55,
        );
    }
  }
  k.box(M.floor, 0, 0.05, -len / 2, w * 0.9, 0.12, len); // walkway
  if (o.room) {
    const r = o.room;
    const g = new THREE.BoxGeometry(r[0], r[1], r[2]);
    g.translate(0, r[1] / 2, -len + r[2] / 2 - 0.2);
    k.geo(o.roomMat || M.white, g);
  } // the white room at the end
  if (o.line)
    k.rod(
      M.steelD,
      new THREE.Vector3(0, -0.4, 0),
      new THREE.Vector3(0, -0.4, -len - 0.4),
      0.18,
    ); // a propellant line under it
  return k.build();
}
// a sphere tank on a ring of legs (LOX and LH2 storage)
function padSphere(k, e, n, r, m) {
  const M = padMats(),
    y = r * 1.25;
  k.sphere(m || M.white, e, y, n, r, 28);
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    k.beam(
      M.galv,
      PV(e + Math.cos(a) * r * 0.9, 0, n + Math.sin(a) * r * 0.9),
      PV(e + Math.cos(a) * r * 0.97, y, n + Math.sin(a) * r * 0.97),
      0.6,
    );
  }
  k.box(M.concreteD, e, 0, n, r * 2.4, 0.4, r * 2.4);
}
// a water tower: a cylindrical tank on a lattice of legs
function padWaterTower(k, e, n, h, rTank, hTank) {
  const M = padMats(),
    y0 = h - hTank;
  k.cyl(M.greyL, e, y0, n, rTank, rTank, hTank, 28);
  k.cyl(M.greyL, e, h, n, rTank, rTank * 0.3, 2.5, 28);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6,
      a2 = ((i + 1) * TAU) / 6,
      rb = rTank * 1.15,
      rt = rTank * 0.75;
    k.beam(
      M.galv,
      PV(e + Math.cos(a) * rb, 0, n + Math.sin(a) * rb),
      PV(e + Math.cos(a) * rt, y0, n + Math.sin(a) * rt),
      0.9,
    );
    for (let j = 1; j < 4; j++) {
      const f = j / 4,
        y = y0 * f,
        r = rb + (rt - rb) * f;
      k.beam(
        M.galv,
        PV(e + Math.cos(a) * r, y, n + Math.sin(a) * r),
        PV(e + Math.cos(a2) * r, y, n + Math.sin(a2) * r),
        0.4,
      );
    }
  }
  k.cyl(M.galv, e, 0, n, 1.2, 1.2, y0, 12);
}
// a lightning tower: a steel lattice of triangular section (side w) h tall, a fibreglass mast on top
function padLightningTower(k, e, n, h, mast, w = 3.2) {
  const M = padMats(),
    r = w / Math.sqrt(3),
    C = [0, 1, 2].map((i) => [
      Math.cos((i * TAU) / 3 + 0.5) * r,
      Math.sin((i * TAU) / 3 + 0.5) * r,
    ]);
  const top = r * 0.35,
    lv = Math.round(h / 5);
  for (const [a, b] of C)
    k.beam(
      M.galv,
      PV(e + a, 0, n + b),
      PV(e + (a * top) / r, h, n + (b * top) / r),
      0.45,
    );
  for (let i = 0; i < lv; i++) {
    const f = i / lv,
      f2 = (i + 1) / lv,
      s = 1 + (top / r - 1) * f,
      s2 = 1 + (top / r - 1) * f2;
    for (let c = 0; c < 3; c++) {
      const [a1, b1] = C[c],
        [a2, b2] = C[(c + 1) % 3];
      k.beam(
        M.galv,
        PV(e + a1 * s, h * f, n + b1 * s),
        PV(e + a2 * s, h * f, n + b2 * s),
        0.25,
      );
      k.beam(
        M.galv,
        PV(e + a1 * s, h * f, n + b1 * s),
        PV(e + a2 * s2, h * f2, n + b2 * s2),
        0.2,
      );
    }
  }
  k.cyl(M.fibre, e, h, n, 0.45, 0.18, mast, 10);
  return PV(e, h + mast, n);
}
// The automatic camera's launch shot looks at the vehicle from wherever the light is best; these are the directions it
// should not take, because a tower would stand in front of the vehicle: [azimuth, half-width] in degrees, the azimuth
// counted from east toward north as the chase camera counts it, for a structure centred at (e, n) w across (half-width)
// beside a vehicle rv across
const padBlock = (e, n, w, rv) => [
  Math.atan2(n, e) * RAD,
  Math.asin(Math.min(1, (w + rv * 0.5) / Math.hypot(e, n))) * RAD + 4,
];
const KSC_SPHERES = [
  [-260, 290],
  [270, 300],
]; // the oxygen (northwest) and hydrogen (northeast) spheres of Pads 39A and 39B
// a propellant sphere stands about half as far out as the launch shot's camera and would loom large in the frame: keep it
// out of the picture (w: the sideways clearance that takes, from the camera's usual distance)
const sphereBlock = (e, n, w = 140) => padBlock(e, n, w, 0);
// a sagging wire between two points (a lightning catenary)
function padWire(g, a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const f = i / 24;
    const p = a.clone().lerp(b, f);
    p.y -= sag * 4 * f * (1 - f);
    pts.push(p);
  }
  g.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      padMats().wire,
    ),
  );
}
// The ground around a pad: scrub and grass (a repeating mottled texture, 80 m to a tile) out to r, cut off at the coast
// (o.sea: the bearing of the sea, degrees; o.shore: the shoreline's distance) with a beach before it, and the roads given
// as strips [[e0, n0, e1, n1, width] …]. Without it the pad would stand on the globe's coarse texture (often sea there).

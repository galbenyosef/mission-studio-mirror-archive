// index-inline-2 19 — math
// Lines 5083-5372 of readable/index-inline-2.pretty.js (statement-aligned).
const CM_CONE = { r0: 1.91, y0: 0.16, tan: Math.tan(32.7 * DEG) };
function cmConePatch(shape, a, y, m, lift = 0.012) {
  const r = CM_CONE.r0 - (y - CM_CONE.y0) * CM_CONE.tan,
    th = 32.7 * DEG;
  const n = new THREE.Vector3(
      Math.cos(th) * Math.sin(a),
      Math.sin(th),
      Math.cos(th) * Math.cos(a),
    ),
    t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)),
    b = new THREE.Vector3().crossVectors(n, t);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), m);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, b, n));
  mesh.position
    .set(Math.sin(a) * r, y, Math.cos(a) * r)
    .addScaledVector(n, lift);
  return mesh;
}
const rectShape = (w, h, rr = 0.03) => {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
};
function apolloCM(withLES, probe = !withLES) {
  const g = new THREE.Group();
  // aft heat shield (ablator) and the toroidal shoulder
  const hs = [];
  for (let i = 0; i <= 10; i++) {
    const r = (1.93 * i) / 10;
    hs.push([r, -0.43 + (4.69 - Math.sqrt(4.69 * 4.69 - r * r))]);
  }
  hs.push([1.955, 0.0], [1.95, 0.07]);
  g.add(lathe(hs, mat("#4a3424", "dark")));
  g.add(
    lathe(
      [
        [1.95, 0.07],
        [1.935, 0.12],
        [1.91, 0.16],
      ],
      mat("#4a3424", "dark"),
    ),
  );
  // the cone in silver Mylar tape, the forward heat shield, the docking tunnel and ring, the probe
  const coneTop = CM_CONE.y0 + (CM_CONE.r0 - 0.6) / CM_CONE.tan; // r 0.6
  g.add(
    lathe(
      [
        [1.91, 0.16],
        [0.6, coneTop],
      ],
      foilMat("mylar", 3),
    ),
  );
  g.add(
    lathe(
      [
        [0.6, coneTop],
        [0.55, coneTop + 0.12],
        [0.46, coneTop + 0.22],
        [0.42, coneTop + 0.26],
      ],
      foilMat("mylar", 1),
    ),
  );
  g.add(
    lathe(
      [
        [0.42, coneTop + 0.26],
        [0.42, CM_TOP - 0.1],
        [0.47, CM_TOP - 0.1],
        [0.47, CM_TOP],
        [0.3, CM_TOP],
      ],
      mat("#b9bec4", "metal"),
    ),
  );
  if (probe) {
    g.add(
      lmRodA(
        [0, CM_TOP - 0.2, 0],
        [0, CM_TOP + 0.25, 0],
        0.05,
        mat("#cfd3d8", "metal"),
      ),
    );
    const tip = cyl(0.09, 0.02, 0.08, mat("#cfd3d8", "metal"), 12);
    tip.position.y = CM_TOP + 0.25;
    g.add(tip);
  }
  // windows: two rendezvous windows looking forward, two side windows, one in the hatch; the hatch and its outline
  const glass = mat("#06080b", "glass"),
    frame = mat("#2a2c30", "dark");
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(rectShape(0.3, 0.36, 0.05), s * 0.42, 1.78, frame, 0.008),
    );
    g.add(
      cmConePatch(rectShape(0.22, 0.28, 0.04), s * 0.42, 1.78, glass, 0.014),
    );
  }
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(
        rectShape(0.4, 0.4, 0.06),
        (s * Math.PI) / 2,
        1.05,
        frame,
        0.008,
      ),
    );
    g.add(
      cmConePatch(
        rectShape(0.3, 0.3, 0.05),
        (s * Math.PI) / 2,
        1.05,
        glass,
        0.014,
      ),
    );
  }
  g.add(
    cmConePatch(
      rectShape(0.95, 1.05, 0.08),
      0,
      0.95,
      mat("#aeb3b9", "metal"),
      0.006,
    ),
  ); // hatch
  g.add(cmConePatch(rectShape(0.24, 0.24, 0.04), 0, 1.15, glass, 0.012));
  // RCS thruster ports (pitch, yaw and roll pairs) as dark recesses
  const port = mat("#1a1b1e", "dark");
  for (const [a, y] of [
    [0.2, 2.05],
    [-0.2, 2.05],
    [Math.PI + 0.2, 2.05],
    [Math.PI - 0.2, 2.05],
    [Math.PI / 2 + 0.25, 0.42],
    [Math.PI / 2 - 0.25, 0.42],
    [-Math.PI / 2 + 0.25, 0.42],
    [-Math.PI / 2 - 0.25, 0.42],
    [Math.PI + 0.6, 1.45],
    [Math.PI - 0.6, 1.45],
  ])
    g.add(cmConePatch(rectShape(0.13, 0.13, 0.03), a, y, port, 0.01));
  let len = CM_TOP;
  if (withLES) {
    const les = apolloLES();
    g.add(les);
    len = les.userData.top;
  }
  g.userData.len = len;
  g.userData.r = 1.96;
  return g;
}
// The launch escape system on the pad: the boost protective cover over the CM (white, one window left open), the tower
// (a four-legged truss, red), the escape motor with its four canted nozzles, the pitch-control motor and canard section,
// and the nose cone with the Q-ball. 10.2 m from the tower's base to the tip.
function apolloLES() {
  const g = new THREE.Group(),
    white = mat("#ecebe6", "paint"),
    red = mat("#c4441f", "paint"),
    black = mat("#151517", "dark");
  const bpcTop = CM_TOP + 0.08; // the cover closes over the docking tunnel; the tower stands on it
  const coneTopR = 0.62,
    coneTopY = CM_CONE.y0 + (CM_CONE.r0 + 0.07 - coneTopR) / CM_CONE.tan;
  g.add(
    lathe(
      [
        [1.99, 0.02],
        [1.98, 0.16],
        [coneTopR, coneTopY],
        [0.56, bpcTop - 0.06],
        [0.5, bpcTop],
        [0, bpcTop],
      ],
      white,
    ),
  );
  g.add(
    cmConePatch(
      rectShape(0.26, 0.32, 0.04),
      0.42,
      1.78,
      mat("#06080b", "glass"),
      0.068,
    ),
  ); // the commander's window, uncovered
  const t0 = bpcTop,
    t1 = t0 + 3.0,
    rb = 0.62,
    rt = 0.36;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2,
      a2 = a + Math.PI / 2;
    g.add(
      lmRodA(
        [Math.cos(a) * rb, t0, Math.sin(a) * rb],
        [Math.cos(a) * rt, t1, Math.sin(a) * rt],
        0.06,
        red,
      ),
    );
    for (const [y0, y1] of [
      [t0, t0 + 1.5],
      [t0 + 1.5, t1],
    ]) {
      const r0 = rb + ((rt - rb) * (y0 - t0)) / 3,
        r1 = rb + ((rt - rb) * (y1 - t0)) / 3;
      g.add(
        lmRodA(
          [Math.cos(a) * r0, y0, Math.sin(a) * r0],
          [Math.cos(a2) * r1, y1, Math.sin(a2) * r1],
          0.03,
          red,
        ),
      );
    }
  }
  const m0 = t1;
  g.add(
    lathe(
      [
        [0.36, m0 - 0.05],
        [0.42, m0 + 0.15],
        [0.33, m0 + 0.4],
      ],
      black,
    ),
  ); // nozzle skirt
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4,
      b = bell(0.5, 0.17, black);
    b.position.set(Math.cos(a) * 0.3, m0 + 0.25, Math.sin(a) * 0.3);
    b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(b);
  }
  const motor = cyl(0.33, 0.33, 4.3, white, 32);
  motor.position.y = m0 + 0.4;
  g.add(motor);
  const band = cyl(0.335, 0.335, 0.25, black, 32);
  band.position.y = m0 + 3.2;
  g.add(band);
  const can = cyl(0.33, 0.27, 1.1, white, 32);
  can.position.y = m0 + 4.7;
  g.add(can);
  for (const s of [-1, 1]) {
    const c = box(0.03, 0.6, 0.45, white);
    c.position.set(s * 0.42, m0 + 5.0, 0);
    g.add(c);
  } // canards (folded)
  const nose = lathe(
    [
      [0.27, 0],
      [0.22, 0.45],
      [0.12, 0.9],
      [0.05, 1.05],
      [0, 1.1],
    ],
    black,
  );
  nose.position.y = m0 + 5.8;
  g.add(nose);
  g.userData.top = m0 + 6.9;
  return g;
}
function lmRodA(p0, p1, r, m) {
  // a cylinder between two points
  const a = new THREE.Vector3(...p0),
    b = new THREE.Vector3(...p1),
    d = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, d.length(), 8),
    m,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}

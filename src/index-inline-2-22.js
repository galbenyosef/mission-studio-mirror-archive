// index-inline-2 22 — three
// Lines 6003-6349 of readable/index-inline-2.pretty.js (statement-aligned).
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
function shuttleChute() {
  // 40-ft (12 m) ring-sail drag chute trailing behind the tail on a long riser
  const g = new THREE.Group();
  const c = new THREE.Mesh(
    new THREE.SphereGeometry(6.1, 24, 8, 0, TAU, 0, Math.PI / 2.3),
    patternMat("chute", "#e0662c"),
  );
  c.rotation.x = Math.PI;
  c.position.set(0, -40, 3.2);
  g.add(c); // crown trailing aft, mouth facing the orbiter
  const yM = -40 - 6.1 * Math.cos(Math.PI / 2.3),
    rM = 6.1 * Math.sin(Math.PI / 2.3);
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    pts.push(
      new THREE.Vector3(Math.cos(a) * rM, yM, 3.2 + Math.sin(a) * rM),
      new THREE.Vector3(0, -13.0, 2.6),
    );
  }
  pts.push(new THREE.Vector3(0, -13.0, 2.6), new THREE.Vector3(0, -1.6, 2.9));
  g.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );
  return g;
}
// Robot arm (Canadarm) on the port sill: the shoulder near the front of the bay, the upper boom 6.37 m and the lower boom
// 7.06 m to the wrist, then the wrist joints and end effector, 1.6 m, on to a grapple fixture. armRig(B): userData.pose(W,
// dir) bends it to put the wrist at W (or as near as it reaches), elbow up, the end effector along dir (else on along the
// lower boom). shuttleRMS: the arm in a fixed pose.
const RMS = { l1: 6.37, l2: 7.06, ee: 1.6 };
function rmsShoulder(B) {
  return new THREE.Vector3(-B.wall + 0.22, 22.9, B.hz + 0.25);
} // on the port sill, under the closed door
function armRig(B = SH_BAY_BUILTIN) {
  const g = new THREE.Group(),
    m = mat("#ecebe5", "paint"),
    jm = mat("#9aa0a6", "metal"),
    S = rmsShoulder(B);
  const rod = (r, mm) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), mm);
    g.add(c);
    return c;
  };
  const up = rod(0.19, m),
    lo = rod(0.17, m),
    ee = rod(0.2, jm);
  const J = [0, 1, 2].map(() => {
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), jm);
    g.add(j);
    return j;
  });
  const Y = new THREE.Vector3(0, 1, 0),
    Z = new THREE.Vector3(0, 0, 1),
    u = new THREE.Vector3(),
    side = new THREE.Vector3(),
    perp = new THREE.Vector3();
  const E = new THREE.Vector3(),
    Wr = new THREE.Vector3(),
    Tip = new THREE.Vector3(),
    d0 = new THREE.Vector3();
  const place = (c, A, P) => {
    c.scale.y = Math.max(A.distanceTo(P), 1e-3);
    c.position.copy(A).add(P).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(Y, d0.copy(P).sub(A).normalize());
  };
  g.userData.pose = (W, dir) => {
    u.copy(W).sub(S);
    const d = Math.min(u.length(), RMS.l1 + RMS.l2 - 0.005);
    u.normalize();
    side.crossVectors(u, Z);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    perp.crossVectors(side, u).normalize();
    if (perp.z < 0) perp.negate();
    const a = Math.acos(
      clamp(
        (RMS.l1 * RMS.l1 + d * d - RMS.l2 * RMS.l2) / (2 * RMS.l1 * d),
        -1,
        1,
      ),
    );
    E.copy(S)
      .addScaledVector(u, RMS.l1 * Math.cos(a))
      .addScaledVector(perp, RMS.l1 * Math.sin(a));
    Wr.copy(S).addScaledVector(u, d); // the wrist, where the arm reaches
    Tip.copy(Wr).addScaledVector(
      dir ? d0.copy(dir).normalize() : d0.copy(Wr).sub(E).normalize(),
      RMS.ee,
    );
    place(up, S, E);
    place(lo, E, Wr);
    place(ee, Wr, Tip);
    J[0].position.copy(S);
    J[1].position.copy(E);
    J[2].position.copy(Wr);
    g.userData.wrist = Wr;
  };
  return g;
}
function shuttleRMS(pose, B = SH_BAY_BUILTIN) {
  const g = armRig(B),
    S = rmsShoulder(B);
  g.userData.pose(
    pose === "raised"
      ? new THREE.Vector3(0.4, 14.5, 11.6)
      : pose === "grapple"
        ? new THREE.Vector3(0, 11.3, 3.0)
        : new THREE.Vector3(S.x, 8.9, S.z),
  );
  g.userData.wrist = g.userData.wrist.clone();
  return g;
}
// The Hubble deploy in motion (STS-31), from the mission's timeline: flags.armT, absolute times of the grapple (gr), the
// unberth (un), the arrays (arr) and the release (rel). Over the 25 minutes before the grapple the arm unstows and reaches
// down to the telescope's grapple fixture. From the unberth it lifts the telescope straight up out of the bay, 2.8 m in
// 8 minutes, clear of the sills (a few centimetres to spare), then in 20 minutes swings it upright above the bay, aperture
// to space. The solar arrays and antennas unfurl over 12 minutes from the arrays time. After the release the end effector
// backs off along the fixture and, half an hour later, the arm folds back onto the sill. The telescope is drawn here until
// the release (flags.armPay); from then on it flies on its own.
const HST_BAY = {
  p: new THREE.Vector3(0, 14.3, -0.05),
  q: new THREE.Quaternion(),
}; // in the bay, aperture forward
const HST_LIFT = {
  p: new THREE.Vector3(0, 14.3, 2.75),
  q: new THREE.Quaternion(),
};
const HST_UP = {
  p: new THREE.Vector3(0, 17.5, 12.0),
  q: new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  ),
}; // released here
const HST_GRASP = new THREE.Vector3(0, -3.0, 4.15); // the wrist, in the telescope's frame: out along the grapple fixture at (0, −3.0, 2.3)
function deployRig(flags, B) {
  const T = flags.armT,
    g = new THREE.Group(),
    arm = armRig(B);
  g.add(arm);
  const S = rmsShoulder(B),
    Wst = new THREE.Vector3(S.x, 8.9, S.z),
    V = () => new THREE.Vector3();
  const hub = flags.armPay
    ? hubbleModel({ arrays: true, deployable: true })
    : null;
  if (hub) g.add(hub);
  const grasp = (P, out) => out.copy(HST_GRASP).applyQuaternion(P.q).add(P.p);
  const Wgr = grasp(HST_BAY, V()),
    Whov = Wgr.clone().add(new THREE.Vector3(0, 0, 1.5)),
    Wup = grasp(HST_UP, V());
  const fixUp = new THREE.Vector3(0, 0, 1).applyQuaternion(HST_UP.q),
    Wback = Wup.clone().addScaledVector(fixUp, 1.6);
  const P = { p: V(), q: new THREE.Quaternion() },
    W = V(),
    dir = V(),
    lift = V();
  const sm = (t, a, b) => smoothstep(clamp((t - a) / (b - a), 0, 1));
  const arc = (A, Bv, f, h, out) =>
    out.lerpVectors(A, Bv, f).add(lift.set(0, 0, h * Math.sin(Math.PI * f))); // up over the sill on the way
  g.userData.update = (t) => {
    if (t < T.un + 480) {
      P.p.lerpVectors(HST_BAY.p, HST_LIFT.p, sm(t, T.un, T.un + 480));
      P.q.copy(HST_BAY.q);
    } else {
      const f = sm(t, T.un + 480, T.un + 1680);
      P.p.lerpVectors(HST_LIFT.p, HST_UP.p, f);
      P.q.slerpQuaternions(HST_LIFT.q, HST_UP.q, f);
    }
    if (hub) {
      hub.position.copy(P.p);
      hub.quaternion.copy(P.q);
      hub.userData.deploy(clamp((t - T.arr) / 720, 0, 1));
    }
    let reach = true; // the end effector lined up on the fixture (reaching for it, holding it, just let go of it)
    if (t < T.gr - 1500) {
      W.copy(Wst);
      reach = false;
    } else if (t < T.gr - 300) {
      arc(Wst, Whov, sm(t, T.gr - 1500, T.gr - 300), 3.0, W);
      reach = false;
    } else if (t < T.gr) W.lerpVectors(Whov, Wgr, sm(t, T.gr - 300, T.gr));
    else if (t < T.rel) grasp(P, W);
    else if (t < T.rel + 180)
      W.lerpVectors(Wup, Wback, sm(t, T.rel, T.rel + 180));
    else {
      arc(Wback, Wst, sm(t, T.rel + 1800, T.rel + 3000), 2.0, W);
      reach = false;
    }
    arm.userData.pose(
      W,
      reach
        ? dir.set(0, 0, -1).applyQuaternion(t < T.rel ? P.q : HST_UP.q)
        : null,
    );
  };
  g.userData.update(T.gr - 3600);
  return g;
}

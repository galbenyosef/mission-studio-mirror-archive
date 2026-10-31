// index-inline-2 64 — math
// Lines 18215-18563 of readable/index-inline-2.pretty.js (statement-aligned).
function padShuttle(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    b39 = md.cfg.site === "KSC39B",
    h = b39 ? 15.0 : 12.8,
    deck = h + 14.3;
  const SRB = LAUNCHERS.shuttle.stages[0],
    stand = deck + 1.5 - SRB.eng.len,
    year = tToDate(md.M.t0).getUTCFullYear(),
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  // the platform: solid but for its three openings (main engines: e ±5.2, n −13.7…−4.3; boosters: e ±3.35…9.45, n ±6.4)
  const by = deck - 7.6,
    n0 = -22,
    n1 = 26.8,
    H7 = 7.6;
  const slab = (e0, e1, nA, nB) =>
    k.box(M.grey, (e0 + e1) / 2, by, (nA + nB) / 2, e1 - e0, H7, nB - nA);
  slab(-20.55, 20.55, n0, -13.7);
  slab(-20.55, -5.2, -13.7, -6.4);
  slab(5.2, 20.55, -13.7, -6.4);
  slab(-20.55, -9.45, -6.4, 6.4);
  slab(9.45, 20.55, -6.4, 6.4);
  slab(-3.35, 3.35, -4.3, 6.4);
  slab(-5.2, -3.35, -6.4, -4.3);
  slab(3.35, 5.2, -6.4, -4.3);
  slab(-20.55, 20.55, 6.4, n1);
  for (const [e, n] of [
    [-15, -16],
    [15, -16],
    [-15, 2],
    [15, 2],
    [-15, 21],
    [15, 21],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  for (const sd of [-1, 1]) {
    k.box(M.greyD, sd * 7.7, deck, -9.2, 4.6, 9.4, 2.7); // tail service masts
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      k.cyl(
        M.steelD,
        sd * 6.4 + Math.cos(a) * 2.4,
        deck,
        Math.sin(a) * 2.4,
        1.0,
        0.45,
        1.5,
        10,
      );
    }
  } // booster hold-down posts
  for (let i = 0; i < 6; i++)
    k.cyl(M.greyL, -12.5 + i * 5, deck, 22, 0.6, 0.45, 3.7, 10); // rainbirds
  // the fixed service structure, west of the stack
  const fe = -28,
    top = h + 75.3;
  padLattice(k, M.grey, fe, 0, 12.2, h, 75.3, {
    step: 6.1,
    core: 4,
    coreMat: M.greyD,
    floorEvery: 2,
  });
  if (year < 1994) {
    k.box(M.grey, fe, top, 0, 12.6, 1.0, 12.6);
    k.cyl(M.greyD, fe, top + 1, 0, 2, 2, 3, 12);
    k.beam(
      M.grey,
      PV(fe - 8, top + 4.5, 0),
      PV(fe + 20, top + 4.5, 0),
      1.4,
      1.8,
    );
  }
  k.beam(M.grey, PV(fe, top, 0), PV(fe, top + 6, 0), 1.2);
  k.cyl(M.fibre, fe, top + 6, 0, 0.5, 0.15, 24.4, 10); // the lightning mast
  // the rotating service structure, parked: its hinge column by the fixed tower's southeast corner, the structure 17–49 m
  // out from it on a bearing of 210°, 18–58 m up, its outer end on a column down to the wheels on the circular rail
  const hE = -21,
    hN = -10,
    br = 210 * DEG,
    ue = Math.sin(br),
    un = Math.cos(br);
  padLattice(k, M.greyL, hE, hN, 4, h, 58, { step: 6, floors: false });
  {
    const a0 = 17,
      a1 = 48.8,
      mid = (a0 + a1) / 2,
      cE = hE + ue * mid,
      cN = hN + un * mid,
      y0 = h + 18;
    padTrussBox(k, M.greyL, cE, cN, y0, 15.2, a1 - a0, 39.6, br, {
      bay: 6.3,
      step: 6.6,
      beam: 0.55,
    });
    // the payload changeout room, clad, filling most of the frame; the frame's roof
    const geo = new THREE.BoxGeometry(12.2, 27, a1 - a0 - 6);
    geo.rotateY(-Math.atan2(-ue, un));
    geo.translate(-cE, y0 + 4 + 13.5, cN);
    k.geo(M.white, geo);
    const roof = new THREE.BoxGeometry(15.2, 0.6, a1 - a0);
    roof.rotateY(-Math.atan2(-ue, un));
    roof.translate(-cE, y0 + 39.6, cN);
    k.geo(M.greyL, roof);
    k.beam(
      M.greyL,
      PV(hE, h + 50, hN),
      PV(hE + ue * a0, h + 50, hN + un * a0),
      2.5,
    );
    k.beam(
      M.greyL,
      PV(hE, h + 22, hN),
      PV(hE + ue * a0, h + 22, hN + un * a0),
      2.5,
    );
    k.box(M.greyD, hE + ue * (a1 - 2), h, hN + un * (a1 - 2), 4, 18, 4);
    // its circular rail on the pad, from the stack (bearing 90°) round to where it is parked
    for (let i = 0; i < 24; i++) {
      const b1 = (90 + (120 * i) / 24) * DEG,
        b2 = (90 + (120 * (i + 1)) / 24) * DEG;
      for (const rr of [a1 - 3.2, a1 - 0.8])
        k.beam(
          M.steelD,
          PV(hE + Math.sin(b1) * rr, h + 0.12, hN + Math.cos(b1) * rr),
          PV(hE + Math.sin(b2) * rr, h + 0.12, hN + Math.cos(b2) * rr),
          0.3,
          0.2,
        );
    }
  }
  // water tower, propellant spheres, the hypergolic farms
  padWaterTower(k, 130, 90, 88.4, 6.6, 9);
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  for (const e of [-230, 230])
    for (let i = 0; i < 3; i++) k.cyl(M.white, e + i * 9, 0, -260, 3, 3, 8, 16);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  // arms on the fixed tower (hinged on its east face, reaching east): the orbiter access arm with its white room, the oxygen
  // vent arm with its hood over the tank's nose; [height above the pad, reach, swing-away start and end (s from liftoff)]
  const face = fe + 6.1,
    etTop = stand + 9.26 + 46.9,
    arms = [];
  const mk = (y, nH, reach, t0, t1, sw, o) => {
    const a = padArm(reach, 2.0, 2.3, M.grey, o),
      piv = new THREE.Group();
    piv.position.copy(PV(face, y, nH));
    piv.add(a);
    g.add(piv);
    const tgt = PV(0, y, o.toN ?? 0),
      b0 = Math.atan2(tgt.x - piv.position.x, tgt.z - piv.position.z) + Math.PI;
    arms.push({ piv, b0, t0, t1, sw });
    return piv;
  };
  mk(h + 44.8, -4.5, 19.8, -444, -414, -70 * DEG, {
    room: [3.0, 3.0, 3.2],
    roomMat: M.white,
    toN: -8.5,
  }); // to the crew hatch on the orbiter's left side
  const gox = mk(etTop - 2.5, 0, Math.abs(face) - 2.2, -105, -80, 80 * DEG, {
    toN: 0,
  }); // to the tank's nose
  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.3, 2.8, 20),
    M.white,
  );
  hood.position.set(0, 1.4, -(Math.abs(face) - 0.6));
  gox.children[0].add(hood); // over the top of the nose cone
  const h2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 1, 8),
    M.steelD,
  );
  g.add(h2);
  const h2a = PV(face, h + 51, 0.5),
    h2b = PV(-4.0, stand + 9.26 + 31.0, 0.5); // the hydrogen vent line to the tank's intertank
  // lightning cable over the mast
  const tip = PV(fe, top + 30.4, 0);
  padWire(g, PV(fe, 2, 335), tip, 8);
  padWire(g, tip, PV(fe, 2, -335), 8);
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 + A.sw * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
    hood.position.y = 1.4 + 3.0 * smoothstep(clamp((tl + 150) / 25, 0, 1)); // the hood lifts off the vents before the arm swings back
    const drop = smoothstep(clamp(tl / 2.5, 0, 1)); // at liftoff the vent line lets go and swings down against the tower
    const b = h2b.clone().lerp(PV(face + 0.5, h + 40, 0.5), drop);
    h2.position.copy(h2a).add(b).multiplyScalar(0.5);
    h2.scale.y = h2a.distanceTo(b);
    h2.quaternion.setFromUnitVectors(_padY, b.clone().sub(h2a).normalize());
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    animate,
    foot: 12,
    trenchD: 95,
    block: [
      padBlock(fe, 0, 6.1, 8.4),
      padBlock(hE + ue * 32.9, hN + un * 32.9, 16, 8.4),
      ...KSC_SPHERES.map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- SLS: Mobile Launcher 1 on Pad 39B (Artemis) ----------------
// The launcher's base 50.3 × 41.1 × 7.6 m, deck 14.3 m above the pad, its exhaust opening 19.5 m across the boosters' line
// by 10.4 m; the grey tower, 12.2 m square, rises 105 m from the deck north of the rocket, flat-topped. Its arms reach south:
// the core stage's intertank umbilical (42.7 m above the deck), forward skirt umbilical (54.9), the vehicle stabiliser
// (61), the upper stage's umbilical (73.2), the crew access arm (83.5) and Orion's service module umbilical (85.3); the
// crew access arm swings back after the hatch is closed, the rest in the seconds after liftoff. Two tail service masts on
// the deck south of the core stage; eight posts under the boosters. A "clean pad": three 181-m lightning towers (steel
// lattice and fibreglass mast) with wires between their tips; the water tower; the oxygen sphere and the two hydrogen
// spheres (the 2022 one 25 m across).
function padSLS(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 15.0,
    deck = h + 14.3,
    stand = deck - 3.3,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  const by = deck - 7.6,
    n0 = -20,
    n1 = 30.3,
    hx = 19.5 / 2,
    hn = 10.4 / 2;
  const slab = (e0, e1, nA, nB) =>
    k.box(M.greyL, (e0 + e1) / 2, by, (nA + nB) / 2, e1 - e0, 7.6, nB - nA);
  slab(-20.55, 20.55, n0, -hn);
  slab(-20.55, 20.55, hn, n1);
  slab(-20.55, -hx, -hn, hn);
  slab(hx, 20.55, -hn, hn);
  for (const [e, n] of [
    [-15, -14],
    [15, -14],
    [-15, 6],
    [15, 6],
    [-15, 26],
    [15, 26],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  for (const sd of [-1, 1]) {
    k.box(M.greyL, sd * 4.2, deck, -7.6, 4.0, 10.1, 3.0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      k.cyl(
        M.steelD,
        sd * 6.1 + Math.cos(a) * 2.3,
        deck,
        Math.sin(a) * 2.3,
        0.6,
        0.4,
        1.5,
        8,
      );
    }
  }
  const tn = 18.5 + 6.1,
    ttop = deck + 105.2;
  padLattice(k, M.greyL, 0, tn, 12.2, deck, 105.2, {
    step: 6.1,
    core: 5,
    coreMat: M.grey,
    floorEvery: 2,
  });
  k.box(M.greyL, 0, ttop, tn, 12.6, 1.2, 12.6);
  k.cyl(M.fibre, 0, ttop + 1.2, tn, 0.4, 0.12, 8, 8);
  // lightning towers (northwest, northeast, south) and their wires
  const T1 = padLightningTower(k, -175, 160, 152, 29),
    T2 = padLightningTower(k, 175, 160, 152, 29),
    T3 = padLightningTower(k, 0, -235, 152, 29);
  padWaterTower(k, 115, 70, 88.4, 6.6, 9);
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  padSphere(k, 300, 215, 12.6);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  padWire(g, T1, T2, 18);
  padWire(g, T2, T3, 18);
  padWire(g, T3, T1, 18);
  for (const T of [T1, T2, T3])
    for (const d of [-1, 1])
      padWire(
        g,
        T,
        T.clone().add(new THREE.Vector3(d * 60, -T.y + 1, -T.z * 0.15)),
        6,
      );
  const face = tn - 6.1,
    arms = [];
  const ARMS = [
    [42.7, 4.2, 0, 4],
    [54.9, 4.2, 0, 4.5],
    [61.0, 4.2, 0, 5],
    [73.2, 2.6, 0, 5.5],
    [83.5, 2.5, -1500, -1440, true],
    [85.3, 2.5, 0, 6],
  ]; // above the deck; rocket radius; swing-away; white room
  ARMS.forEach(([y, r, t0, t1, room], i) => {
    const he = i % 2 ? 4.0 : -4.0,
      H = PV(he, deck + y, face),
      len = Math.hypot(H.x, H.z) - r - (room ? 1.0 : 0.6);
    const a = padArm(
      len,
      room ? 2.4 : 1.8,
      room ? 2.6 : 2.0,
      room ? M.white : M.greyL,
      { room: room ? [3.0, 3.0, 3.4] : null, roomMat: M.white, line: !room },
    );
    const piv = new THREE.Group();
    piv.position.copy(H);
    piv.add(a);
    g.add(piv);
    arms.push({ piv, t0, t1, b0: Math.atan2(H.x, H.z), dir: H.x > 0 ? 1 : -1 });
  });
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 +
        A.dir * 1.35 * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    animate,
    foot: 9,
    trenchD: 95,
    block: [
      padBlock(0, tn, 8, 8),
      ...[T1, T2, T3].map((T) => padBlock(-T.x, T.z, 2, 8)),
      ...[...KSC_SPHERES, [300, 215]].map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- Falcon Heavy on Pad 39A (SpaceX) ----------------
// The rocket stands on SpaceX's launch mount over the covered flame trench, held by the transporter-erector: a 73-m steel
// strongback on its south side that brought it up the ramp from the hangar and raised it. A few minutes before launch it
// leans back 1.5°; at liftoff it swings clear. West of the pad the old fixed service structure, grey, with its lightning
// mast and SpaceX's crew access arm (66 m up, swung away for an uncrewed flight); the rotating structure is gone. The
// Horizontal Integration Facility 500 m south at the foot of the ramp; SpaceX's Starship tower 300 m east.

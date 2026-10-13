// index-inline-2 54 — three
// Lines 15193-15497 of readable/index-inline-2.pretty.js (statement-aligned).
function padFH(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 12.8,
    mountTop = h + 6.5,
    stand = mountTop - LAUNCHERS.falconHeavy.stages[1].eng.len,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  k.box(M.concreteD, 0, h, -2, 24, 6.5, 18);
  k.box(M.greyD, 0, mountTop - 0.4, 0, 14, 0.4, 7); // the launch mount
  const fe = -28,
    top = h + 75.3;
  padLattice(k, M.grey, fe, 0, 12.2, h, 75.3, {
    step: 6.1,
    core: 4,
    coreMat: M.greyD,
    floorEvery: 2,
  });
  k.beam(M.grey, PV(fe, top, 0), PV(fe, top + 6, 0), 1.2);
  k.cyl(M.fibre, fe, top + 6, 0, 0.5, 0.15, 24.4, 10);
  {
    const piv = PV(fe + 6.1, h + 66.1, 0);
    const geo = new THREE.BoxGeometry(2.8, 3.0, 25.9);
    geo.translate(0, 1.5, -12.95);
    geo.rotateY(-0.35 - Math.PI / 2 - 1.3);
    geo.translate(piv.x, piv.y, piv.z);
    k.geo(M.white, geo);
  } // the crew access arm, swung back
  // the hangar at the foot of the ramp; SpaceX's Starship tower to the east
  k.box(M.white, 0, 0, -500, 87, 26, 37);
  k.box(M.greyL, 0, 0, -481.4, 60, 22, 0.4);
  padStarshipTower(k, 300, 0, 0);
  padWaterTower(k, 130, 90, 88.4, 6.6, 9);
  padSphere(k, -260, 290, 10.5);
  for (let i = 0; i < 3; i++)
    k.cyl(M.white, 240 + i * 9, 0, 250, 3.5, 3.5, 14, 16);
  k.build(g);
  padGround(g, {
    ...KSC_GROUND(h),
    roads: [[0, -59.5 - 2.5 * h - h / 0.05, 0, -480, 30]],
  });
  const tip = PV(fe, top + 30.4, 0);
  padWire(g, PV(fe, 2, 335), tip, 8);
  padWire(g, tip, PV(fe, 2, -335), 8);
  // the transporter-erector: its hinge at the launch mount's south edge, the strongback standing against the cores
  const te = new THREE.Group();
  te.position.copy(PV(0, mountTop - 1, -4.6));
  g.add(te);
  {
    const kk = padKit(),
      W = 9.5,
      L = 72.5;
    for (const sx of [-W / 2, W / 2])
      for (const sz of [0, -2.2])
        kk.beam(
          M.greyL,
          new THREE.Vector3(sx, 0, sz),
          new THREE.Vector3(sx, L, sz),
          0.55,
        );
    for (let i = 0; i <= 24; i++) {
      const y = (L * i) / 24,
        y2 = (L * (i + 1)) / 24;
      kk.beam(
        M.greyL,
        new THREE.Vector3(-W / 2, y, 0),
        new THREE.Vector3(W / 2, y, 0),
        0.4,
      );
      kk.beam(
        M.greyL,
        new THREE.Vector3(-W / 2, y, -2.2),
        new THREE.Vector3(W / 2, y, -2.2),
        0.4,
      );
      if (i < 24) {
        kk.beam(
          M.greyL,
          new THREE.Vector3(-W / 2, y, 0),
          new THREE.Vector3(W / 2, y2, 0),
          0.3,
        );
        kk.beam(
          M.greyL,
          new THREE.Vector3(-W / 2, y, -2.2),
          new THREE.Vector3(W / 2, y2, -2.2),
          0.3,
        );
      }
    }
    for (const y of [22, 40, 58])
      kk.beam(
        M.greyD,
        new THREE.Vector3(0, y, 0),
        new THREE.Vector3(0, y, 2.4),
        0.8,
      ); // clamp arms to the centre core
    kk.build(te);
  }
  const animate = (t) => {
    const tl = t - md.M.t0;
    te.rotation.x = -(
      1.5 * DEG * smoothstep(clamp((tl + 240) / 20, 0, 1)) +
      22 * DEG * smoothstep(clamp(tl / 4, 0, 1))
    );
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: mountTop,
    animate,
    foot: 7,
    trenchD: 95,
    block: [[270, 30], padBlock(fe, 0, 6.1, 5.6), sphereBlock(-260, 290)],
  }; // the erector stands against the cores' south side
}
// SpaceX's launch and catch tower ("Mechazilla", as at Starbase and on Pad 39A): 143 m of dark steel modules, about 12 m
// square, a 3-m lightning rod; the two 36-m catch arms ("chopsticks") on their carriage and the ship's quick-disconnect
// arm, both reaching toward the launch mount (facing +E from a tower at e, n: arms toward dir, radians from east)
function padStarshipTower(k, e, n, dir = 0) {
  const M = padMats(),
    w = 12;
  padLattice(k, M.black, e, n, w, 0, 143, {
    step: 6,
    core: 6,
    coreMat: M.greyD,
    floors: false,
    col: 1.1,
    beam: 0.7,
  });
  k.cyl(M.galv, e, 143, n, 0.25, 0.1, 3, 6);
  const ce = Math.cos(dir),
    cn = Math.sin(dir),
    pe = -cn,
    pn = ce,
    y = 74,
    f0 = PV(e + (ce * w) / 2, y, n + (cn * w) / 2);
  k.box(M.greyD, e + ce * (w / 2 + 1), y - 3, n + cn * (w / 2 + 1), 5, 7, 5);
  for (const s of [-1, 1])
    k.beam(
      M.greyD,
      f0.clone().add(PV(pe * s * 3, 0, pn * s * 3)),
      PV(
        e + ce * (w / 2 + 34) + pe * s * 7,
        y,
        n + cn * (w / 2 + 34) + pn * s * 7,
      ),
      1.6,
      3.2,
    ); // the chopsticks, opened
  k.beam(
    M.greyD,
    PV(e + (ce * w) / 2, 91, n + (cn * w) / 2),
    PV(e + ce * (w / 2 + 14), 91, n + cn * (w / 2 + 14)),
    1.4,
    2.0,
  ); // the ship's quick-disconnect arm
}
// ---------------- Atlas V on Space Launch Complex 41 (Perseverance, 2020) ----------------
// A "clean pad": the rocket rolls the 550 m from the Vertical Integration Facility on its Mobile Launch Platform (16.8 ×
// 13.7 m, its 56-m umbilical mast on the north side carrying the Centaur's lines) and stands over the flame duct between
// four lightning towers (about 105 m, steel with a fibreglass mast) whose wires cage the pad. The Crew Access Tower (61 m,
// 2016) stands to the northwest, its arm (52 m up) swung away; the 89-m integration building to the south.
function padSLC41(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 9.0,
    stand = deck + 0.5 - LAUNCHERS.atlasV541.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 70, 0.3, 90);
  k.box(M.soot, 0, 0.3, 0, 9, 0.05, 30); // the pad apron and the duct's grating
  k.box(M.white, 0, 1.2, 0, 16.8, deck - 1.2, 13.7);
  k.box(M.greyD, 0, 0, 0, 14, 1.2, 11); // the platform on its trucks
  for (const e of [-3.6, 3.6]) k.box(M.steelD, e, 0, -300, 0.4, 0.3, 600); // the rails to the integration building
  padLattice(k, M.white, 0, 9.6, 4.2, deck, 47.4, {
    step: 4.8,
    floors: false,
    col: 0.5,
    beam: 0.3,
  });
  k.cyl(M.greyD, 0, deck + 47.4, 9.6, 0.9, 0.9, 2.2, 10); // the umbilical mast, its wind damper
  for (const y of [deck + 26, deck + 40])
    k.beam(M.greyD, PV(0, y, 7.5), PV(0, y - 1.5, 2.2), 0.5); // the Centaur's umbilicals
  padLattice(k, M.grey, -18, 26, 6.1, 0, 61, {
    step: 8.5,
    core: 2.2,
    coreMat: M.greyD,
    col: 0.55,
    beam: 0.35,
  }); // crew access tower
  {
    const geo = new THREE.BoxGeometry(2.4, 2.6, 13);
    geo.translate(0, 1.3, -6.5);
    geo.rotateY(Math.PI * 0.85);
    geo.translate(18 + 3, 52.4, 26 - 3);
    k.geo(M.white, geo);
  }
  const T = [
    [-80, 75],
    [80, 75],
    [80, -75],
    [-80, -75],
  ].map(([e, n]) => padLightningTower(k, e, n, 75, 30, 2.8));
  k.box(M.white, 0, 0, -549, 40, 89, 35);
  k.box(M.greyL, 0, 0, -531.4, 12.5, 83.8, 0.4); // the integration building and its door
  padSphere(k, -150, 130, 7.5);
  k.box(M.greyL, 0, 0, 60, 26, 7, 14); // oxygen sphere, the pad equipment building
  k.build(g);
  padGround(g, { sea: 80, shore: 900, roads: [[0, -60, 0, -530, 14]] });
  for (let i = 0; i < 4; i++) {
    padWire(g, T[i], T[(i + 1) % 4], 12);
    padWire(g, T[i], T[(i + 2) % 4], 16);
  }
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(9, 30), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 5,
    trenchD: 30,
    block: [
      padBlock(0, 9.6, 2.1, 3.5),
      padBlock(-18, 26, 3.05, 3.5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.6, 3.5)),
      sphereBlock(-150, 130, 87),
    ],
  };
}
// ---------------- Atlas-Agena on Launch Complex 12 (Mariner 4, 1964) ----------------
// The launch stand: a 6.1-m concrete pedestal (18 × 24 m) with the launcher ring on top, the flame bucket under it opening
// to the east, a ramp up its southwest side; the umbilical tower (31 m) beside the rocket with booms to the Atlas and the
// Agena; the red service tower (about 50 m, an A-frame), rolled back 90 m on its rails; the domed blockhouse 230 m west.
function padLC12(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 6.1,
    stand = deck + 0.6 - LAUNCHERS.atlasAgena.stages[0].eng.len;
  k.box(M.concrete, 0, 0, 0, 18.3, deck, 23.8);
  k.box(M.soot, 0, 0, 0, 7, 0.05, 40);
  k.box(M.steelD, 0, deck, 0, 6.2, 0.6, 6.2);
  k.quads(M.concrete, [
    [
      PV(-9.15, deck, -8),
      PV(-9.15, deck, -0.5),
      PV(-36, 0, -0.5),
      PV(-36, 0, -8),
    ],
  ]); // the ramp
  padLattice(k, M.red, -6.5, 0, 3.0, deck, 25, {
    step: 3.1,
    floors: false,
    col: 0.4,
    beam: 0.25,
  }); // umbilical tower
  for (const y of [deck + 14, deck + 23])
    k.beam(M.redD, PV(-5, y, 0), PV(-1.4, y - 1, 0), 0.4);
  // the service tower, rolled 90 m north along its rails
  const sn = 95;
  for (const e of [-6, 6]) k.box(M.steelD, e, 0, sn / 2, 0.4, 0.3, sn + 20);
  for (const sd of [-1, 1])
    for (const se of [-1, 1])
      k.beam(
        M.red,
        PV(sd * 9, 0, sn + se * 8),
        PV(sd * 4, 50, sn + se * 5),
        1.2,
      );
  padLattice(k, M.red, 0, sn, 8, 0, 50, {
    step: 5,
    floors: true,
    col: 0.5,
    beam: 0.35,
  });
  k.sphere(M.concrete, -230, -6, 0, 13, 24); // the blockhouse's dome
  k.build(g);
  padGround(g, { sea: 95, shore: 300, roads: [[-230, 0, -30, 0, 8]] });
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(7, 20), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.3;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 3,
    trenchD: 22,
    block: [padBlock(-6.5, 0, 1.5, 3), padBlock(0, sn, 9, 3)],
  };
}
// ---------------- Long March 5 on Wenchang LC-101 (2020) ----------------
// The rocket rolls 2.8 km from its 99-m assembly building on a 2,000-t mobile launch platform (16 wheels on 20-m-gauge
// rails) and stands beside the 91.7-m fixed service tower (12 levels, its three sets of rotating work platforms swung
// open for launch) over the two-way flame trench; four 120-m lightning towers with wires between them; the sea 600 m to
// the southeast.

// index-inline-2 66 — deck
// Lines 18839-19098 of readable/index-inline-2.pretty.js (statement-aligned).
function padLC12(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 6.1,
    stand = deck + 0.6 - LAUNCHERS.atlasAgena.stages[0].eng.len;
  k.box(M.concrete, 0, 0, 0, 18.3, deck, 23.8);
  k.box(M.soot, 0, 0, 0, 7, 0.05, 40);
  // the launcher: a steel ring stand on four legs over the deflector's opening, the hold-down arms at the tank's foot
  k.box(M.black, 0, deck - 0.02, 0, 5.4, 0.04, 5.4);
  for (const [e, n] of [
    [-2.6, -2.6],
    [2.6, -2.6],
    [2.6, 2.6],
    [-2.6, 2.6],
  ])
    k.box(M.steelD, e, deck, n, 0.7, 0.6, 0.7);
  k.cyl(M.steelD, 0, deck + 0.6, 0, 2.2, 2.2, 0.5, 32);
  k.cyl(M.steel, 0, deck + 1.1, 0, 1.75, 1.75, 0.25, 32, true);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    k.box(
      M.yellow,
      Math.cos(a) * 2.1,
      deck + 1.1,
      Math.sin(a) * 2.1,
      0.5,
      1.0,
      0.5,
      -a,
    );
  }
  // the deck: railings round its edge, the stair down its east side, cable trays and pipes from the tower to the stand
  const rail = (a, b) => {
    k.beam(M.galv, a, b, 0.06, 0.06);
    const n = Math.max(1, Math.round(a.distanceTo(b) / 2));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      k.beam(M.galv, p.clone().setY(deck), p, 0.06);
    }
  };
  const dy = deck + 1.05,
    E = 9.15,
    N = 11.9;
  rail(PV(-E, dy, -N), PV(-E, dy, -8.4));
  rail(PV(-E, dy, -0.1), PV(-E, dy, N));
  rail(PV(-E, dy, N), PV(E, dy, N));
  rail(PV(E, dy, N), PV(E, dy, -N));
  rail(PV(E, dy, -N), PV(-E, dy, -N));
  for (let i = 0; i < 12; i++)
    k.box(
      M.galv,
      E + 1.2,
      (deck * (i + 1)) / 12 - 0.1,
      2.5 - i * 0.3,
      2.0,
      0.1,
      0.3,
    );
  k.box(M.galv, E + 1.2, 0, 4.2, 2.2, deck, 0.2);
  for (const n of [-1.2, 1.2]) k.box(M.greyD, -3.4, deck, n, 4.0, 0.3, 0.5);
  k.rod(M.steel, PV(-5, deck + 0.5, 1.9), PV(-1.9, deck + 0.5, 1.9), 0.18);
  k.rod(M.steel, PV(-5, deck + 0.8, 2.3), PV(-1.9, deck + 0.8, 2.3), 0.12);
  for (const [e, n, w] of [
    [6, -8, 2.2],
    [6, -4.5, 1.6],
    [-6, 9, 2.0],
  ])
    k.box(M.grey, e, deck, n, w, 1.4, 1.0); // equipment cabinets
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
  for (const y of [deck + 6.2, deck + 12.4, deck + 18.6])
    k.box(M.floor, -6.5, y, 0, 3.4, 0.2, 3.4);
  k.box(M.greyD, -6.5, deck + 25, 0, 2.0, 2.4, 2.0); // its landings and the hoist house on top
  for (const y of [deck + 8, deck + 17])
    k.rod(M.galv, PV(-5, y, 0), PV(-1.6, y, 0), 0.08); // the umbilical lines
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
function padWenchang(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 9.0,
    stand = deck + 1.0 - LAUNCHERS.lm5.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 80, 0.3, 80);
  k.box(M.soot, 0, 0.3, 0, 10, 0.05, 70);
  k.box(M.greyL, 0, 1.5, 0, 26, deck - 1.5, 22);
  for (const e of [-10, 10]) k.box(M.greyD, e, 0, 0, 4, 1.5, 20); // the platform on its bogies
  for (const e of [-10, 10]) {
    k.box(M.steelD, e, 0, -900, 0.5, 0.3, 1800);
  }
  // the fixed service tower, west of the rocket, its platforms swung open
  const fe = -17;
  padLattice(k, M.greyL, fe, 0, 10, 0, 91.7, {
    step: 7.6,
    core: 5,
    coreMat: M.white,
    floorEvery: 1,
  });
  for (const y of [28, 46, 64])
    for (const s of [-1, 1]) {
      const geo = new THREE.BoxGeometry(8, 2.2, 3);
      geo.translate(4, 1.1, 0);
      geo.rotateY(s * 1.2);
      geo.translate(-(fe + 5), y, s * 5);
      k.geo(M.white, geo);
    }
  k.box(M.white, fe, 91.7, 0, 10.5, 2.5, 10.5);
  const T = [
    [-70, 70],
    [70, 70],
    [70, -70],
    [-70, -70],
  ].map(([e, n]) => padLightningTower(k, e, n, 92, 28, 3.0));
  k.box(M.white, -1400, 0, 2400, 60, 99.4, 45); // the assembly building, 2.8 km up the rails
  k.build(g);
  padGround(g, { sea: 135, shore: 600, r: 3000 });
  for (let i = 0; i < 4; i++) padWire(g, T[i], T[(i + 1) % 4], 12);
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 7,
    trenchD: 40,
    block: [
      padBlock(fe, 0, 5, 5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.5, 5)),
    ],
  };
}
// ---------------- Ariane 5 on ELA-3, Kourou ----------------
// The launch table: a 900-t steel platform rolled out on rails from the final-assembly building 2.8 km away, the 58-m
// umbilical mast standing on it; the concrete launch zone under it with three flame trenches (one for each booster,
// one for the core) running north; the water tower, the four lightning masts at the zone's corners; jungle round it.
function padELA3(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    top = 8.0,
    stand = top - LAUNCHERS.ariane5ECA.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 90, 0.3, 90);
  for (const e of [-4.3, 0, 4.3]) k.box(M.soot, e, 0.3, 30, 6, 0.05, 60); // the zone and its three trenches
  k.box(M.greyL, 0, 1.2, 0, 25, top - 1.2, 21);
  for (const e of [-9, 9]) k.box(M.greyD, e, 0, 0, 4, 1.2, 18); // the table on its bogies
  k.box(M.black, 0, top - 0.02, 0, 12, 0.04, 8);
  for (const e of [-4.3, 4.3]) k.cyl(M.steelD, e, top, 0, 2.0, 2.0, 0.6, 24);
  k.cyl(M.steelD, 0, top, 0, 2.9, 2.9, 0.6, 32); // the exhaust ducts' rims, the core's and the boosters' support rings
  for (const e of [-10, 10]) k.box(M.steelD, e, 0, -1400, 0.5, 0.3, 2800); // the rails west to the BAF
  const mn = 9.5;
  padLattice(k, M.white, 0, mn, 6, top, 58, {
    step: 5.8,
    core: 3,
    coreMat: M.greyL,
    floorEvery: 2,
  }); // the umbilical mast on the table's north edge
  for (const y of [top + 24, top + 41, top + 50])
    k.beam(M.greyL, PV(0, y, mn - 3), PV(0, y - 0.6, 3.2), 0.5); // the umbilical arms to the core and the upper stage
  k.box(M.greyL, 0, top + 58, mn, 6.5, 1.5, 6.5);
  k.cyl(M.fibre, 0, top + 59.5, mn, 0.3, 0.1, 6, 8);
  padWaterTower(k, 80, 20, 90, 7, 10);
  const T = [
    [-90, 90],
    [90, 90],
    [90, -90],
    [-90, -90],
  ].map(([e, n]) => padLightningTower(k, e, n, 70, 22, 2.8));
  k.box(M.greyL, -2800, 0, 0, 90, 90, 60); // the final-assembly building, down the rails
  k.build(g);
  padGround(g, {
    sea: 60,
    shore: 1800,
    r: 6500,
    roads: [
      [0, -60, -2800, -60, 10],
      [60, 0, 2000, 0, 8],
    ],
  }); // (the disc reaches past the ground camera, 5.9 km out)
  for (let i = 0; i < 4; i++) padWire(g, T[i], T[(i + 1) % 4], 10);
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(16, 40), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  lit.position.z = 20;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: top,
    foot: 6,
    trenchD: 40,
    block: [
      padBlock(0, mn, 3, 5),
      padBlock(80, 20, 8, 5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.4, 5)),
    ],
  };
}
// ---------------- Starship at Starbase, Texas ----------------
// The orbital launch mount: a ring-shaped table on six legs, its top 20 m up, with twenty clamps for the booster; the water-
// cooled steel plate under it; the launch and catch tower 28 m west (143 m, its chopsticks and the ship's quick-disconnect
// arm toward the mount); the tank farm's white tanks to the west; the beach 700 m east.

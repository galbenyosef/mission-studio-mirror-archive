// index-inline-2 52 — box
// Lines 14702-14843 of readable/index-inline-2.pretty.js (statement-aligned).
function padApollo(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 12.8,
    deck = h + 14.3,
    stand = deck + 3.35 - LAUNCHERS.saturnV.stages[0].eng.len,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  // the launcher's base around its exhaust opening, on its pedestals
  const hw = 13.7 / 2,
    by = deck - 7.6;
  k.box(M.grey, 0, by, (30.5 + hw) / 2, 41.1, 7.6, 30.5 - hw).box(
    M.grey,
    0,
    by,
    (-18.3 - hw) / 2,
    41.1,
    7.6,
    18.3 - hw,
  );
  for (const sd of [-1, 1])
    k.box(M.grey, (sd * (hw + 20.55)) / 2, by, 0, 20.55 - hw, 7.6, 2 * hw);
  k.box(M.greyD, 0, deck - 0.05, 6, 41.1, 0.1, 48.8 - 0.4); // deck plating
  for (const [e, n] of [
    [-15, -14],
    [15, -14],
    [-15, 6],
    [15, 6],
    [-15, 26],
    [15, 26],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  // the umbilical tower, its crane and the arms' hinge posts
  const tn = 24.4,
    top = deck + 115.8;
  padLattice(k, M.red, 0, tn, 12.2, deck, 115.8, {
    step: 6.1,
    core: 4.5,
    coreMat: M.redD,
    floorEvery: 3,
  });
  k.box(M.red, 0, top, tn, 12.6, 1.2, 12.6); // the crane's deck
  k.cyl(M.redD, 0, top + 1.2, tn, 2.2, 2.2, 3.5, 12); // slewing ring and cab
  k.beam(
    M.red,
    PV(0, top + 5.2, tn + 9),
    PV(0, top + 5.2, tn - 25.9),
    1.6,
    2.2,
  ); // the boom, over the rocket
  k.box(M.redD, 0, top + 3.2, tn + 7, 3, 3, 4); // counterweight
  // hold-down arms under the first stage's base and tail service masts, between the fins (the fins point northeast,
  // northwest, southeast and southwest)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.box(
      M.steelD,
      Math.cos(a) * 5.6,
      deck,
      Math.sin(a) * 5.6,
      2.0,
      3.35,
      3.0,
      -a,
    );
  }
  for (const a of [0, Math.PI / 2, Math.PI])
    k.box(
      M.greyD,
      Math.cos(a) * 10.5,
      deck,
      Math.sin(a) * 10.5,
      1.6,
      7.5,
      2.2,
      -a,
    );
  // propellant spheres at the pad's northwest (oxygen) and northeast (hydrogen) corners
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  // the swing arms: hinged on the tower's south face, reaching south to the rocket; [height above the nozzles, radius of
  // the rocket there, retract start and end (s after liftoff), white room]
  const face = tn - 6.1;
  const ARMS = [
    [22, 5.05, -30, -17],
    [39, 5.05, -16.2, -11],
    [48, 5.05, -900, -880],
    [58, 5.05, 0, 6.4],
    [65, 5.05, 0, 7.4],
    [72, 3.3, 0, 7.7],
    [84, 3.3, 0, 8.4],
    [96, 1.96, 0, 9.0],
    [100.5, 1.96, -300, -290, true],
  ];
  const arms = ARMS.map(([y, r, t0, t1, room], i) => {
    const he = i % 2 ? 4.4 : -4.4,
      H = PV(he, stand + y - 1.0, face); // hinged near a corner of the face, alternately east and west
    const len = Math.hypot(H.x, H.z) - r - (room ? 1.2 : 0.5),
      a = padArm(len, room ? 2.2 : 1.6, room ? 2.4 : 1.8, M.red, {
        room: room ? [3.2, 3.0, 3.4] : null,
        roomMat: M.white,
        line: !room,
      });
    const piv = new THREE.Group();
    piv.position.copy(H);
    piv.add(a);
    g.add(piv);
    return { piv, t0, t1, b0: Math.atan2(H.x, H.z), dir: H.x > 0 ? 1 : -1 }; // b0 aims the arm (local −Z) at the rocket's axis
  });
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 +
        A.dir * 1.4 * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
  }; // swinging back along the tower's face
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
      padBlock(0, tn, 8, 5),
      ...KSC_SPHERES.map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- Space Shuttle: Pads 39A and 39B with the fixed and rotating service structures ----------------
// The Mobile Launcher Platform (48.8 × 41.1 × 7.6 m, its deck 14.3 m above the pad) with the main engines' opening south
// of the tank and the boosters' openings east and west of it, two tail service masts beside the orbiter's tail and six
// sound-suppression water towers ("rainbirds") at its north end. West of the stack the Fixed Service Structure, 12.2 m
// square and 75.3 m tall, with its hammerhead crane (until 1994) and the 24.4-m fibreglass lightning mast topping out at
// 105.8 m, a cable from it to anchors 335 m north and south; the orbiter access arm (44.8 m up, retracted at T−7:24), the
// tank's oxygen vent arm with its hood (the "beanie cap" over the tank's nose: lifted at T−2:30, the arm swung back at
// T−1:45) and the hydrogen vent line, which falls away at liftoff. The Rotating Service Structure, 31 × 15 × 40 m on its
// hinge column, swung back 120° to the southwest. The 88-m water tower to the northeast; the propellant spheres.

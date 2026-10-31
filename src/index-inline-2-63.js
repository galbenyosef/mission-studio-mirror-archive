// index-inline-2 63 — math
// Lines 17877-18214 of readable/index-inline-2.pretty.js (statement-aligned).
function padGround(g, o = {}) {
  const M = padMats(),
    R = o.r || 2200,
    tex = padGroundTex();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const sea = o.sea != null ? o.sea * DEG : null,
    se = sea != null ? Math.sin(sea) : 0,
    sn = sea != null ? Math.cos(sea) : 0,
    shore = o.shore || 1e9;
  // the land: the disc on this side of the shoreline, as rings of modest triangles (long thin ones lose depth precision
  // at a distance, and the beach and roads on them flicker)
  const RINGS = [0, 0.03, 0.07, 0.13, 0.22, 0.35, 0.52, 0.75, 1],
    NA = 96,
    pt = (i, j) => {
      const a = (i * TAU) / NA,
        r = RINGS[j] * R;
      let e = Math.sin(a) * r,
        n = Math.cos(a) * r;
      const d = e * se + n * sn;
      if (sea != null && d > shore) {
        e -= (d - shore) * se;
        n -= (d - shore) * sn;
      }
      return [e, n];
    };
  const P = [],
    U = [],
    V = (e, n) => {
      P.push(-e, 0.03, n);
      U.push(-e / 80, n / 80);
    };
  for (let j = 0; j < RINGS.length - 1; j++)
    for (let i = 0; i < NA; i++) {
      const a = pt(i, j),
        b = pt(i + 1, j),
        c = pt(i + 1, j + 1),
        d = pt(i, j + 1);
      V(...a);
      V(...d);
      V(...c);
      if (j > 0) {
        V(...a);
        V(...c);
        V(...b);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  geo.computeVertexNormals();
  if (!padGround.mat) {
    // the texture again at two larger scales, so its 80-m tiles do not show as a grid
    const m = (padGround.mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    }));
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader
        .replace("#include <logdepthbuf_fragment>", LOGDEPTH_EXACT)
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
      float pgA = texture2D(map, vMapUv * 0.071 + vec2(0.37, 0.11)).g, pgB = texture2D(map, vMapUv * 0.23 + vec2(0.71, 0.53)).g;
      diffuseColor.rgb *= 0.45 + 0.55 * (pgA + pgB) / (2.0 * 0.2);`,
        );
    };
    m.customProgramCacheKey = () => "padGround";
  }
  const land = new THREE.Mesh(geo, padGround.mat);
  land.userData.padGround = true;
  g.add(land);
  const k = padKit();
  // strips on the land (the beach along the shoreline, the roads), cut into pieces of about 80 m for the same reason
  const strip = (m, e0, n0, e1, n1, w, y) => {
    const dx = e1 - e0,
      dn = n1 - n0,
      l = Math.hypot(dx, dn),
      px = ((-dn / l) * w) / 2,
      pn = ((dx / l) * w) / 2,
      ns = Math.max(1, Math.ceil(l / 80));
    for (let s = 0; s < ns; s++) {
      const f0 = s / ns,
        f1 = (s + 1) / ns,
        A0 = e0 + dx * f0,
        B0 = n0 + dn * f0,
        A1 = e0 + dx * f1,
        B1 = n0 + dn * f1;
      k.quads(m, [
        [
          PV(A0 + px, y, B0 + pn),
          PV(A1 + px, y, B1 + pn),
          PV(A1 - px, y, B1 - pn),
          PV(A0 - px, y, B0 - pn),
        ],
      ]);
    }
  };
  if (sea != null) {
    const L = Math.sqrt(Math.max(R * R - shore * shore, 0)),
      b = 45,
      c = shore - b / 2; // the beach along the shoreline
    strip(
      M.sand,
      c * se + sn * L,
      c * sn - se * L,
      c * se - sn * L,
      c * sn + se * L,
      b,
      0.07,
    );
  }
  for (const [e0, n0, e1, n1, w] of o.roads || [])
    strip(o.roadMat || M.rock, e0, n0, e1, n1, w, 0.1);
  const built = new THREE.Group();
  k.build(built);
  built.userData.padGround = true;
  g.add(built); // (hidden when the site's terrain is drawn, app/43_terrain.js)
}
// Launch Complex 39's raised pad: a flat concrete top 99 m east–west by 119 m north–south, h above the ground on a mound
// sloping out at 1 in 2.5 (grassed); the flame trench, 17.7 m wide with its floor at ground level, cut through it north–
// south, the flame deflector in it under the vehicle; the crawlerway climbing to it from the south at 5 %, its two lanes
// either side of the trench.
function ksc39Hardstand(k, h, glow) {
  const M = padMats(),
    W = 99.1 / 2,
    D = 118.9 / 2,
    tw = 17.7 / 2,
    s = 2.5 * h;
  for (const sd of [-1, 1]) {
    // the east and west halves, either side of the trench
    const P = (e, y, n) => PV(sd * e, y, n);
    const A = P(tw, h, -D),
      B = P(W, h, -D),
      C = P(W, h, D),
      Dd = P(tw, h, D),
      A0 = P(tw, 0, -D - s),
      B0 = P(W + s, 0, -D - s),
      C0 = P(W + s, 0, D + s),
      D0 = P(tw, 0, D + s);
    const out = PV(sd, 0.4, 0).normalize();
    k.quads(M.concrete, [[A, Dd, C, B]]);
    k.quads(M.grass, [[B, C, C0, B0]], out);
    k.quads(M.grass, [[Dd, D0, C0, C]], new THREE.Vector3(0, 0.4, 1));
    k.quads(M.grass, [[A, B, B0, A0]], new THREE.Vector3(0, 0.4, -1));
    k.quads(M.concreteD, [[A, A0, D0, Dd]], PV(-sd, 0, 0)); // the trench wall
  }
  k.box(M.soot, 0, 0, 0, 2 * tw, 0.08, 2 * (D + s) + 40); // the trench floor
  // the flame deflector: an inverted V across the trench, its ridge under the engines
  const dw = 14.9 / 2,
    dl = 22.9 / 2,
    dh = Math.min(11.9, h - 0.5);
  k.quads(
    glow,
    [[PV(dw, dh, 0), PV(-dw, dh, 0), PV(-dw, 0, dl), PV(dw, 0, dl)]],
    new THREE.Vector3(0, 1, 1),
  );
  k.quads(
    glow,
    [[PV(-dw, dh, 0), PV(dw, dh, 0), PV(dw, 0, -dl), PV(-dw, 0, -dl)]],
    new THREE.Vector3(0, 1, -1),
  ); // glowing while the engines fire
  // the ramp up the south side, two 12-m lanes of crushed river rock either side of the trench
  const rl = h / 0.05;
  for (const sd of [-1, 1]) {
    const e0 = sd * (tw + 1),
      e1 = sd * (tw + 13);
    k.quads(M.rock, [
      [
        PV(e0, h + 0.05, -D),
        PV(e1, h + 0.05, -D),
        PV(e1, 0.05, -D - rl),
        PV(e0, 0.05, -D - rl),
      ],
    ]);
  }
}
// the land round Pads 39A and 39B: the Atlantic 400 m to the east, the crawlerway from the foot of the ramp south and then
// west toward the Vehicle Assembly Building; out to 7 km, past the ground observer (6 km south-southwest)
const KSC_GROUND = (h) => ({
  r: 7000,
  sea: 75,
  shore: 420,
  roads: [
    [0, -59.5 - 2.5 * h - h / 0.05, 0, -560, 40],
    [0, -560, -5000, -560, 40],
  ],
});
// ---------------- Apollo: Mobile Launcher with its Launch Umbilical Tower on Pad 39A ----------------
// The launcher's base 48.8 m (north–south) × 41.1 m × 7.6 m on six 6.7-m pedestals, its deck 14.3 m above the pad, with a
// 13.7-m square opening for the exhaust; the red umbilical tower, 12.2 m square, rises 115.8 m from the deck at the north
// end, its centre 24.4 m north of the rocket's, with the 25-t hammerhead crane on top. Nine swing arms reach the rocket:
// four had swung clear before liftoff (the first stage's intertank and forward arms, the second stage's aft arm, the
// command module's access arm with its white room), five swung away in the seconds after it. Four hold-down arms (3.35 m)
// carry the first stage; three tail service masts stand between its fins.
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

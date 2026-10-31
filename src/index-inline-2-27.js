// index-inline-2 27 — add
// Lines 7476-7781 of readable/index-inline-2.pretty.js (statement-aligned).
function m20DescentStage() {
  const g = new THREE.Group(),
    alu = mat("#c3c7cc", "metal"),
    grey = mat("#7b8086", "metal", { side: THREE.DoubleSide }),
    mli = foilMat("mylar", 2),
    mounts = [];
  const RB = 1.05,
    RT = 0.78,
    YT = 0.85,
    corner = (r, k, y) => m20Polar(r, ((k + 0.5) * TAU) / 8, y); // the frame's foot and top (octagons, by their corners)
  for (let k = 0; k < 8; k++) {
    g.add(m20Beam(corner(RB, k, 0.04), corner(RB, k + 1, 0.04), 0.07, alu));
    g.add(m20Beam(corner(RT, k, YT), corner(RT, k + 1, YT), 0.06, alu));
    g.add(m20Beam(corner(RB, k, 0.04), corner(RT, k, YT), 0.055, alu));
    if (k % 2 === 0)
      g.add(
        m20Beam(corner(RB, k, 0.06), corner(RT, k + 1, YT - 0.02), 0.035, alu),
      );
  }
  g.add(m20Beam([-0.68, YT, -0.28], [0.68, YT, -0.28], 0.06, alu));
  g.add(m20Beam([0.28, YT, -0.68], [0.28, YT, 0.68], 0.06, alu)); // two beams across the top
  // three sides closed by panels with equipment behind them; the deck at the foot
  for (const k of [1, 4, 6]) {
    const q = [
        corner(RB, k, 0.04),
        corner(RB, k + 1, 0.04),
        corner(RT, k + 1, YT),
        corner(RT, k, YT),
      ],
      geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]],
        3,
      ),
    );
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, grey));
  }
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(RB * 0.96, RB * 0.96, 0.03, 8),
    mat("#9fa4aa", "metal"),
  );
  deck.rotation.y = TAU / 16;
  deck.position.y = 0.02;
  g.add(deck);
  // propellant tanks and pressurant tanks, in blankets; electronics
  for (const a of [0, 120, 240]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), mli);
    t.position.set(...m20Polar(0.5, a * DEG, 0.42));
    g.add(t);
  }
  for (const a of [60, 300]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), mli);
    t.position.set(...m20Polar(0.74, a * DEG, 0.55));
    g.add(t);
  }
  for (const [a, w] of [
    [180, 0.42],
    [100, 0.3],
  ]) {
    const b = box(w, 0.22, 0.26, foilMat("mylar", 1));
    b.position.set(...m20Polar(0.62, a * DEG, 0.06));
    b.rotation.y = a * DEG;
    g.add(b);
  }
  // the keel under the centre and the bridle device at its point
  const keel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.12, 0.5, 4, 1),
    grey,
  );
  keel.rotation.y = Math.PI / 4;
  keel.position.y = -0.25;
  g.add(keel);
  const bud = cyl(0.15, 0.15, 0.1, mat("#a9adb3", "metal"), 20);
  bud.position.y = -M20_BUD;
  g.add(bud);
  // four engine pods on outriggers at the diagonals, two engines each
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      P = m20Polar(1.55, a, 0.08),
      pod = new THREE.Group();
    pod.position.set(...P);
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.44, 0.14, 0.24, grey));
    for (const [s, cant] of [
      [-1, k % 2 ? 22.5 : 5],
      [1, k % 2 ? 5 : 22.5],
    ]) {
      const e = m20Engine(cant);
      e.position.set(s * 0.12, 0.02, 0);
      pod.add(e);
      const ex = new THREE.Vector3(0, -0.6, 0)
        .applyEuler(e.rotation)
        .add(e.position)
        .applyEuler(pod.rotation)
        .add(pod.position);
      const d = new THREE.Vector3(0, -1, 0)
        .applyEuler(e.rotation)
        .applyEuler(pod.rotation);
      mounts.push({
        x: ex.x,
        y: ex.y,
        z: ex.z,
        r: 0.12,
        tag: "DS",
        cant,
        d: [d.x, d.y, d.z],
      });
    }
    for (const j of [2 * k, 2 * k + 1]) {
      g.add(m20Bar(corner(RB, j, 0.04), [P[0], 0.14, P[2]], 0.024, alu));
      g.add(m20Bar(corner(RT, j, YT), [P[0], 0.2, P[2]], 0.02, alu));
    }
    const fit = cyl(0.05, 0.05, 0.06, mat("#c9a04a", "gold"), 12);
    fit.position.set(...corner(RT, 2 * k, YT + 0.03));
    g.add(fit); // where it hangs from the backshell
  }
  // the radar's six antennas on a plate on the −X side, tilted down and out
  const rad = new THREE.Group();
  rad.position.set(-1.12, -0.14, 0);
  rad.rotation.set(0, -Math.PI / 2, 0);
  rad.rotateX(-0.35);
  g.add(rad);
  rad.add(box(0.9, 0.04, 0.4, mat("#dedcd5", "paint")));
  for (let i = 0; i < 6; i++) {
    const d = cyl(0.075, 0.075, 0.03, mat("#6d5c3e", "metal"), 16);
    d.position.set(
      ((i % 3) - 1) * 0.28,
      -0.06,
      (Math.floor(i / 3) - 0.5) * 0.19,
    );
    d.rotation.set((Math.floor(i / 3) - 0.5) * 0.5, 0, ((i % 3) - 1) * 0.35);
    rad.add(d);
  }
  g.add(m20Bar(corner(RB, 5, 0.04), [-1.05, -0.1, -0.25], 0.02, alu));
  g.add(m20Bar(corner(RB, 6, 0.04), [-1.05, -0.1, 0.25], 0.02, alu));
  g.add(
    m20Bar(
      [0.45, YT, 0.3],
      [0.45, YT + 0.5, 0.3],
      0.016,
      mat("#1d1e21", "dark"),
    ),
  ); // UHF antenna
  g.userData.len = YT;
  g.userData.mounts = mounts;
  return g;
}
// The stack inside the aeroshell: the descent stage's foot 1.35 m above the heat shield's nose (its top just under the
// backshell), the bridle device 0.6 m below it, the rover's deck against the device. Lowered, the rover hangs 6.4 m further
// down: the descent stage stands M20_HANG above the ground when the rover's wheels touch it (edl.hang in src/vehicles.js).
const M20_DS = 1.35,
  M20_BUD = 0.6,
  M20_DECK = 1.13,
  M20_BRIDLE = 6.4,
  M20_HANG = M20_BUD + M20_BRIDLE + M20_DECK;
// the assemblies the app shows, by part (buildSC 'msl'): the stack in cruise; the entry vehicle (with or without its heat
// shield; the descent stage and rover inside show once it is gone); the heat shield, backshell or cruise stage on their
// own (flags.rest: lying on the ground); the descent stage with the rover (stowed, then lowered from flags.skyT); the
// descent stage alone, flying away; the rover on the ground
function m20Assembly(P, flags) {
  const g = new THREE.Group();
  const mounts = [];
  let len = M20_TOP;
  if (P.has("cruise")) {
    g.add(m20HeatShield());
    g.add(m20Backshell({ cbm: true }));
    const cs = m20CruiseStage();
    g.add(cs);
    mounts.push(...cs.userData.mounts);
  } else if (P.has("cruisestage")) {
    const cs = m20CruiseStage();
    cs.position.y = -M20_BIP[1];
    g.add(cs);
    for (const m of cs.userData.mounts)
      mounts.push({ ...m, y: m.y - M20_BIP[1] });
    len = 0.7;
  } else if (P.has("aeroshell")) {
    if (flags.hs !== false) g.add(m20HeatShield());
    g.add(m20Backshell({}));
    if (flags.hs === false) {
      const ds = m20DescentStage();
      ds.position.y = M20_DS;
      g.add(ds);
      const rv = roverD(false, true);
      rv.position.y = M20_DS - M20_BUD - M20_DECK;
      g.add(rv);
    }
    g.userData.chuteY = M20_TOP;
    g.userData.capsuleR = 2.25;
    g.userData.dgb = true;
  } else if (P.has("heatshield")) {
    g.add(m20HeatShield());
    g.userData.footY = flags.rest ? 0 : 1.35;
  } else if (P.has("backshell")) {
    g.add(m20Backshell({}));
    g.userData.chuteY = M20_TOP;
    g.userData.capsuleR = 2.25;
    g.userData.dgb = true;
    g.userData.footY = flags.rest ? M20_SEAL[1] : 1.35;
  } else if (P.has("descentstage")) {
    const ds = m20DescentStage();
    g.add(ds);
    mounts.push(...ds.userData.mounts);
    len = 1;
    g.userData.yc0 = 0;
  } else if (P.has("lander")) {
    if (flags.landed) {
      const rv = roverD(true);
      g.add(rv);
      g.userData.footY = 0;
      len = 2.2;
    } else {
      const ds = m20DescentStage();
      g.add(ds);
      mounts.push(
        ...ds.userData.mounts.filter(
          (m) => !(flags.skyT != null && m.cant > 10),
        ),
      ); // four engines shut down for the sky crane
      const rv = roverD(false, true);
      rv.position.y = -M20_BUD - M20_DECK;
      g.add(rv);
      // three bridles from the bridle device down to the rover's deck, and the umbilical beside them; the rover's wheels
      // unfold a second after it starts down
      const lines = [
        [0.55, 0.45, 0.012],
        [-0.55, 0.45, 0.012],
        [0, -0.62, 0.012],
        [0.16, 0.05, 0.022],
      ].map(([x, z, w]) => {
        const l = new THREE.Mesh(
          new THREE.CylinderGeometry(w, w, 1, 6),
          mat(w > 0.015 ? "#3b3d41" : "#d9d4c6", "fabric"),
        );
        l.visible = false;
        g.add(l);
        return { l, a: new THREE.Vector3(x * 0.25, -M20_BUD, z * 0.25), x, z };
      });
      const b = new THREE.Vector3();
      if (flags.skyT != null)
        g.userData.animate = (t) => {
          const s = t - flags.skyT,
            d = M20_BRIDLE * smoothstep(clamp(s / 6.5, 0, 1));
          rv.position.y = -M20_BUD - M20_DECK - d;
          if (rv.userData.mobility)
            rv.userData.mobility(smoothstep(clamp((s - 1) / 2.5, 0, 1)));
          for (const L of lines) {
            b.set(L.x, rv.position.y + M20_DECK, L.z);
            const n = b.distanceTo(L.a);
            L.l.visible = d > 0.02;
            L.l.position.copy(L.a).add(b).multiplyScalar(0.5);
            L.l.scale.y = n;
            L.l.quaternion.setFromUnitVectors(M20_UP, b.sub(L.a).normalize());
          }
        };
      g.userData.yc0 = 0;
      len = 1;
    }
  }
  g.userData.len = g.userData.len || len;
  return { inner: g, mounts };
}

// ==== 34_hubble.js
// ============================================================================
// The Hubble Space Telescope as it was launched in 1990 (STS-31). Sizes from the HST media reference guide: the aft shroud,
// 4.3 m across and 3.5 m long, closed by the flat aft bulkhead; the equipment section, a ring of twelve bays as wide as the
// shroud and 1.1 m long, round the primary mirror; the forward shell and the light shield, 3.05 m across and 4 m long
// each; the aperture door, 3 m across, which opens 105°. Most of the outside is blanketed: aluminised Teflon over the
// forward shell and light shield, a quilt of blankets with the shell's reinforcing rings showing as bands; silvered tape on
// the aft shroud and the bays' doors. Yellow handrails run round it and along it; four magnetic torquers lie along the
// forward shell, 90° apart.
// The first solar arrays, ESA's: two "double roll-out" wings 12.1 m long and 2.5 m wide, each a pair of blankets rolled out
// both ways from a drum along two booms, the drum on a 1.2 m mast from the aft end of the forward shell; stowed, mast and
// drum lie folded forward along the forward shell. Two high-gain antennas, dishes on masts, stowed along the light shield
// and the forward shell.
// +Y toward the aperture; origin at the middle of the 13.2 m body; the arrays on ±X, the antennas and the grapple fixture
// (on the equipment section) on ±Z.
// ============================================================================
const HST = {
  mats: {},
  aft: -6.6,
  es: -3.1,
  fwd: -2.0,
  door: 6.45,
  R: 2.15,
  r: 1.53,
};
function hstCanvas(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let hstSeed = 3;
const hstRnd = () => (hstSeed = (hstSeed * 9301 + 49297) % 233280) / 233280;
// the blankets over the forward shell and light shield (8.45 m, the map's height, from the shell's aft end): panels about
// 1.2 m round and 1.4 m along, each a slightly different silver, with darker seams; the shell's rings as bands under them

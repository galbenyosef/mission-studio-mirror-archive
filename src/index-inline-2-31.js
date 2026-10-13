// index-inline-2 31 — add
// Lines 8658-8975 of readable/index-inline-2.pretty.js (statement-aligned).
function twOrbiter(flags = {}) {
  const g = new THREE.Group(),
    { R, H } = TWO,
    rf = R * Math.cos(Math.PI / 6);
  const gold = foilMat("gold", 2),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    dark = mat("#2c2e33", "dark"),
    grey = mat("#8c9197", "metal");
  const face = (k, y = H / 2, out = 0) => {
    const a = (30 + 60 * k) * DEG;
    return { a, p: [Math.sin(a) * (rf + out), y, Math.cos(a) * (rf + out)] };
  };
  g.add(twPrismSides(6, R, 0, H, 30 * DEG, () => gold));
  g.add(
    twDeck(
      6,
      R,
      H,
      30 * DEG,
      mat("#d3d6da", "metal", { side: THREE.DoubleSide }),
      TWO.ring,
    ),
  );
  g.add(
    twDeck(
      6,
      R,
      0,
      30 * DEG,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0.6,
      true,
    ),
  );
  // radiators (white, inside a gold border) on the faces at 30° and 150°; the flag at the top of the 30° face
  for (const k of [0, 2]) {
    const { a, p } = face(k, H / 2 - 0.1, 0.004);
    const r = new THREE.Mesh(
      new THREE.PlaneGeometry(R - 0.22, H - 0.75),
      white,
    );
    r.position.set(...p);
    r.rotation.y = a;
    g.add(r);
  }
  {
    const { a, p } = face(0, H - 0.28, 0.006);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.36), cnFlagMat());
    f.position.set(...p);
    f.rotation.y = a;
    g.add(f);
  }
  // the central cone: its ring on the deck, the cone going down inside
  const ring = cyl(TWO.ring + 0.05, TWO.ring, 0.06, alu, 40);
  ring.position.y = H;
  g.add(ring);
  const cone = cyl(
    0.55,
    TWO.ring,
    0.9,
    mat("#55585e", "metal", { side: THREE.DoubleSide }),
    40,
    true,
  );
  cone.position.y = H - 0.9;
  g.add(cone);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32), dark);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = H - 0.88;
  g.add(floor);
  for (let k = 0; k < 6; k++) {
    const b = box(0.1, 0.07, 0.12, mat("#c9a04a", "gold"));
    b.position.set(...m20Polar(TWO.ring + 0.02, (k * TAU) / 6, H + 0.06));
    b.rotation.y = (k * TAU) / 6;
    g.add(b);
  } // the separation fittings
  // the launch adapter's ring and the main engine inside it; thruster pairs at the six lower corners
  const lv = cyl(0.62, 0.6, 0.12, alu, 40, true);
  lv.position.y = -0.12;
  g.add(lv);
  const valve = cyl(0.13, 0.13, 0.16, grey, 16);
  valve.position.y = -0.16;
  g.add(valve);
  const eng = bell(
    TWO.eng,
    0.22,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -TWO.eng;
  g.add(eng);
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.12, a, 0.04));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.16, 0.08, 0.12, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.1,
        0.035,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      const e = new THREE.Group();
      e.position.set(s * 0.05, 0, 0.03);
      e.rotation.x = 0.5;
      e.add(n);
      n.position.y = -0.1;
      pod.add(e);
    }
  }
  // star trackers and low-gain antennas on the deck
  for (const [a, r] of [
    [200, 1.0],
    [235, 1.0],
  ]) {
    const st = box(0.14, 0.12, 0.14, dark);
    st.position.set(...m20Polar(r, a * DEG, H));
    g.add(st);
    const sh = cyl(
      0.05,
      0.08,
      0.1,
      mat("#1c1d20", "dark", { side: THREE.DoubleSide }),
      14,
      true,
    );
    sh.position.set(...m20Polar(r, a * DEG, H + 0.12));
    g.add(sh);
  }
  for (const [a, y] of [
    [120, H],
    [300, H],
  ]) {
    const l = cyl(0.07, 0.03, 0.16, mat("#e9e7e1", "paint"), 14);
    l.position.set(...m20Polar(1.05, a * DEG, y));
    g.add(l);
  }
  // the high-resolution camera on the 150° face, looking down; the medium-resolution camera beside it
  {
    const { a, p } = face(2, 0.75, 0.3);
    const c = cyl(0.24, 0.24, 0.8, mat("#e4e3de", "paint"), 24);
    c.position.set(p[0], 0.35, p[2]);
    g.add(c);
    const hood = cyl(
      0.25,
      0.25,
      0.22,
      mat("#1e1f22", "dark", { side: THREE.DoubleSide }),
      24,
      true,
    );
    hood.position.set(p[0], 0.13, p[2]);
    g.add(hood);
    const br = box(0.3, 0.5, 0.12, grey);
    br.position.set(Math.sin(a) * (rf + 0.06), 0.5, Math.cos(a) * (rf + 0.06));
    br.rotation.y = a;
    g.add(br);
    const m = box(0.16, 0.18, 0.16, dark);
    m.position.set(...face(2, 0, 0.12).p);
    m.position.y = 1.3;
    g.add(m);
  }
  // the solar wings: a yoke and three panels (1.3 × 2.0 m) on hinges, folded like an accordion against the face when stowed
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Group();
    w.position.set(s * rf, H / 2, 0);
    if (s < 0) w.rotation.z = Math.PI;
    g.add(w);
    const yoke = [twBarMesh(0.022, alu), twBarMesh(0.022, alu)];
    w.add(...yoke);
    const root = box(0.12, 0.3, 0.12, grey);
    root.position.set(0.04, -0.15, 0);
    w.add(root);
    const h0 = new THREE.Group();
    w.add(h0);
    const hs = [h0];
    let par = h0;
    for (let i = 0; i < 3; i++) {
      par.add(twPanel(1.3, 2.0, 6, 9));
      if (i < 2) {
        const h = new THREE.Group();
        h.position.set(1.3, 0, i ? -0.035 : 0.035);
        par.add(h);
        hs.push(h);
        par = h;
      }
    }
    wings.push({ yoke, hs });
  }
  // the high-gain antenna: a dish 2.5 m across with its subreflector, on a boom from the +Z corner
  const hga = new THREE.Group();
  g.add(hga);
  const dish = twDish(
    1.25,
    0.28,
    mat("#efeee9", "paint", { side: THREE.DoubleSide }),
    48,
  );
  dish.rotation.x = Math.PI / 2;
  hga.add(dish);
  const hub = cyl(0.12, 0.12, 0.2, grey, 16);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.12;
  hga.add(hub);
  const sub = cyl(0.12, 0.12, 0.03, mat("#d9d8d2", "paint"), 20);
  sub.rotation.x = Math.PI / 2;
  sub.position.z = 0.55;
  hga.add(sub);
  for (let k = 0; k < 4; k++)
    hga.add(
      m20Bar(
        [
          Math.sin((k * TAU) / 4 + 0.785) * 0.85,
          Math.cos((k * TAU) / 4 + 0.785) * 0.85,
          0.15,
        ],
        [
          Math.sin((k * TAU) / 4 + 0.785) * 0.1,
          Math.cos((k * TAU) / 4 + 0.785) * 0.1,
          0.54,
        ],
        0.012,
        alu,
      ),
    );
  const feed = cyl(0.06, 0.04, 0.3, grey, 12);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.02;
  hga.add(feed);
  const boom = twBarMesh(0.05, alu, 12);
  g.add(boom);
  // the magnetometer's boom on the 210° face
  const mag = new THREE.Group();
  mag.rotation.order = "YXZ";
  {
    const { a, p } = face(3, H - 0.15, 0.08);
    mag.position.set(...p);
    mag.rotation.y = a;
    g.add(mag);
  }
  {
    const b = cyl(0.025, 0.025, 2.2, alu, 8);
    mag.add(b);
    const sn = box(0.12, 0.1, 0.12, mat("#d7d6d0", "paint"));
    sn.position.y = 2.2;
    mag.add(sn);
    const sn2 = box(0.08, 0.08, 0.08, mat("#c9a04a", "gold"));
    sn2.position.y = 1.4;
    mag.add(sn2);
  }
  // stowed (f = 0) → deployed (1): the wings open first, then the antenna swings out, then the magnetometer's boom
  const pose = (f) => {
    const fw = twPhase(f, 0, 0.5),
      fa = twPhase(f, 0.45, 0.8),
      fm = twPhase(f, 0.75, 1);
    for (const { yoke, hs } of wings) {
      const fu = twPhase(fw, 0, 0.35),
        fo = twPhase(fw, 0.25, 1); // the stack swings off the face, then unfolds
      hs[0].position.set(twLerp(0.14, 0.4, fu), 0, twLerp(0.65, 0, fu));
      hs[0].rotation.y = twLerp(Math.PI / 2, 0, fo);
      hs[1].rotation.y = twLerp(-Math.PI, 0, fo);
      hs[2].rotation.y = twLerp(Math.PI, 0, fo);
      const t0 = hs[0].position;
      twSetBar(yoke[0], [0, 0.55, 0], [t0.x, 0.25, t0.z]);
      twSetBar(yoke[1], [0, -0.55, 0], [t0.x, -0.25, t0.z]);
    }
    const v = [0, twLerp(1.1, 1.35, fa), twLerp(R + 0.42, R + 1.05, fa)];
    hga.position.set(...v);
    hga.rotation.x = -twLerp(0, 0.45, fa);
    twSetBar(boom, [0, 1.0, R - 0.1], [0, v[1] - 0.05, v[2] - 0.14]);
    mag.rotation.x = twLerp(Math.PI, Math.PI / 2 - 0.15, fm);
  };
  if (flags.deployT != null)
    g.userData.animate = (t) =>
      pose(clamp((t - flags.deployT - 30) / 300, 0, 1));
  pose(flags.stowed || flags.deployT != null ? 0 : 1);
  g.userData.len = H;
  g.userData.mounts = [{ y: -TWO.eng, r: 0.22, tag: "ORB" }];
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The entry capsule (y = 0 at the heat shield's nose): the heat shield, a 70° sphere-cone 3.4 m across (nose radius
// 0.85 m, rounded at its shoulder); the backshell, two cones (25° and 45° from the axis) up to the ring where it sits on
// the orbiter, the parachute's canister and its lid above that, 2.5 m from the nose; the trim wing hinged above the seal.
const TWC = {
  R: 1.7,
  seal: [1.681, 0.671],
  hip: [1.3, 1.49],
  bip: [0.62, 2.17],
  can: [0.5, 2.42],
  top: 2.5,
};
function twHeatShieldProfile() {
  const p = [],
    Rn = 0.85;
  for (let a = 0; a <= 20; a += 2)
    p.push([Rn * Math.sin(a * DEG), Rn * (1 - Math.cos(a * DEG))]);
  for (let a = -70; a <= 40; a += 6)
    p.push([1.62 + 0.08 * Math.cos(a * DEG), 0.62 + 0.08 * Math.sin(a * DEG)]); // the shoulder (centre r 1.62, y 0.62)
  p.push(TWC.seal);
  return p;
}
function twBackshellProfile() {
  const p = [TWC.seal, TWC.hip, TWC.bip, [TWC.can[0], TWC.bip[1]], TWC.can];
  for (let k = 1; k <= 5; k++) {
    const a = ((k / 5) * Math.PI) / 2;
    p.push([
      TWC.can[0] * Math.cos(a),
      TWC.can[1] + (TWC.top - TWC.can[1]) * Math.sin(a),
    ]);
  }
  return p;
}
// the heat shield's ablator: dark grey-brown, a faint grid of the honeycomb's panels, a mottle

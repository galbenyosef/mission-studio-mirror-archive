// index-inline-2 33 — add
// Lines 9174-9493 of readable/index-inline-2.pretty.js (statement-aligned).
function zhurong() {
  const g = new THREE.Group(),
    white = mat("#ecebe7", "paint"),
    alu = mat("#b8bdc3", "metal"),
    grey = mat("#7e838a", "metal"),
    dark = mat("#222428", "dark"),
    gold = foilMat("gold", 1);
  const { WR, WX, WZ } = TWZ;
  const body = new THREE.Group();
  g.add(body);
  body.add(box(0.84, 0.3, 1.3, white));
  for (const s of [-1, 1]) {
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), gold);
    sp.position.set(s * 0.421, 0.15, 0);
    sp.rotation.y = (s * Math.PI) / 2;
    body.add(sp);
  }
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.2),
    foilMat("mylar", 1),
  );
  back.position.set(0, 0.15, -0.651);
  back.rotation.y = Math.PI;
  body.add(back);
  for (const x of [-0.17, 0.17]) {
    const w = cyl(0.12, 0.12, 0.012, mat("#c9a04a", "gold"), 28);
    w.position.set(x, 0.3, -0.3);
    body.add(w);
    const gl = cyl(0.1, 0.1, 0.014, mat("#141a24", "glass"), 28);
    gl.position.set(x, 0.302, -0.3);
    body.add(gl);
  } // the windows
  for (const x of [-0.12, 0.12]) {
    const c = box(0.08, 0.06, 0.05, dark);
    c.position.set(x, 0.17, 0.66);
    body.add(c);
  } // front hazard cameras
  for (const x of [-0.25, 0.25]) {
    const r = box(0.12, 0.03, 0.4, grey);
    r.position.set(x, -0.03, 0.42);
    body.add(r);
  } // the radar's antennas under the front
  // wheels on their steering posts
  const wheels = [];
  for (const s of [-1, 1])
    for (const z of WZ) {
      const w = new THREE.Group();
      w.position.set(s * WX, WR, z);
      g.add(w);
      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(WR, WR, 0.17, 20),
        mat("#a7acb2", "metal"),
      );
      tyre.rotation.z = Math.PI / 2;
      w.add(tyre);
      for (let k = 0; k < 10; k++) {
        const a = (k * TAU) / 10,
          c = box(0.17, 0.018, 0.03, mat("#6c7076", "metal"));
        c.geometry.translate(0, -0.009, 0);
        c.position.set(0, Math.cos(a) * WR, Math.sin(a) * WR);
        c.rotation.x = a;
        w.add(c);
      }
      const hubc = cyl(0.05, 0.05, 0.02, dark, 14);
      hubc.rotation.z = Math.PI / 2;
      hubc.position.x = s * 0.09;
      w.add(hubc);
      const post = cyl(0.035, 0.035, 0.12, grey, 10);
      post.position.set(s * WX, 2 * WR, z);
      g.add(post);
      wheels.push(w);
    }
  // the suspension's arms (placed by pose)
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const b = twBarMesh(0.022, alu);
    g.add(b);
    arms.push(b);
  }
  // solar wings: front and rear on each side, hinged along the deck's edges (the right pair just below the left, so that
  // folded over the deck they lie one on the other)
  const wings = [];
  for (const s of [1, -1])
    for (const zc of [0.33, -0.33]) {
      const h = new THREE.Group();
      h.position.set(s * 0.42, s > 0 ? 0.32 : 0.355, zc);
      if (s < 0) h.rotation.y = Math.PI;
      body.add(h);
      const p = twPanel(0.95, 0.57, 6, 4, "#c7cacd");
      p.rotation.x = -Math.PI / 2;
      h.add(p);
      wings.push(h);
    }
  // the mast and its head; the high-gain dish
  const mast = new THREE.Group();
  mast.position.set(0, 0.42, 0.5);
  body.add(mast);
  const ped = cyl(0.06, 0.06, 0.12, grey, 12);
  ped.position.set(0, 0.3, 0.5);
  body.add(ped);
  mast.add(cyl(0.035, 0.035, 0.92, white, 12));
  const head = new THREE.Group();
  head.position.y = 0.92;
  mast.add(head);
  head.add(box(0.34, 0.13, 0.15, white));
  for (const [x, r] of [
    [-0.12, 0.028],
    [0.12, 0.028],
    [0.0, 0.045],
  ]) {
    const l = cyl(r, r, 0.03, dark, 16);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, 0.065, 0.085);
    head.add(l);
  }
  const dishP = new THREE.Group();
  dishP.position.set(0.25, 0.38, -0.5);
  body.add(dishP);
  const dd = twDish(
    0.17,
    0.05,
    mat("#f0efea", "paint", { side: THREE.DoubleSide }),
    24,
  );
  dd.position.y = 0.05;
  dishP.add(dd);
  const dpost = cyl(0.02, 0.02, 0.13, grey, 8);
  dpost.position.y = -0.08;
  dishP.add(dpost);
  const pose = ({
    lift = 1,
    wings: fw = 1,
    mast: fm = 1,
    dish: fd = 1,
  } = {}) => {
    const yb = twLerp(0.25, 0.38, lift);
    body.position.y = yb;
    for (const h of wings) h.rotation.z = twLerp(Math.PI - 0.02, 18 * DEG, fw);
    mast.rotation.x = twLerp(-Math.PI / 2, 0, fm);
    dishP.rotation.x = twLerp(0, -0.7, fd);
    for (const [i, s] of [
      [0, 1],
      [4, -1],
    ]) {
      // the rocker from the front wheel to the body's side, back to the bogie; the bogie to the middle and rear wheels
      const piv = [s * 0.43, yb + 0.1, 0.12],
        bog = [s * WX, 2 * WR + 0.2, -0.31],
        top = (z) => [s * WX, 2 * WR + 0.12, z];
      twSetBar(arms[i], top(WZ[0]), piv);
      twSetBar(arms[i + 1], piv, bog);
      twSetBar(arms[i + 2], bog, top(WZ[1]));
      twSetBar(arms[i + 3], bog, top(WZ[2]));
    }
  };
  g.userData.pose = pose;
  g.userData.wheelsZ = wheels;
  pose();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The landing platform (y = 0 at the foot of its body): an octagonal body 2.24 m across its corners and 0.45 m deep in gold
// blankets, the national flag on its +X side; four legs that fold up inside the capsule and open out to stand it 0.85 m
// off the ground (its deck 1.3 m up); the engine under its centre; two rails across the deck that carry the rover, and two
// ramps hinged at the front edge, folded back over the rover's front wheels until they swing down and run out to the
// ground. Zhurong sits on the rails, facing the ramps. pose: { legs(f), ramp(f) }.
const TWP = {
  R: 1.12,
  H: 0.45,
  clear: 0.85,
  roverZ: -0.2,
  rail: 0.03,
  ramp: 2.75,
};
function twPlatform() {
  const g = new THREE.Group(),
    { R, H } = TWP,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#dcdcd8", "paint", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#55585e", "metal", { side: THREE.DoubleSide }),
      0,
      true,
    ),
  );
  {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.32), cnFlagMat());
    f.position.set(rf + 0.005, H / 2, 0);
    f.rotation.y = Math.PI / 2;
    g.add(f);
  }
  const eng = bell(
    0.6,
    0.25,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -0.6;
  g.add(eng);
  const ch = cyl(0.12, 0.12, 0.12, grey, 16);
  ch.position.y = -0.12;
  g.add(ch);
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(rf - 0.1, a, 0));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.18, 0.08, 0.12, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.12,
        0.04,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.position.set(s * 0.05, -0.12, 0.02);
      pod.add(n);
    }
  }
  for (const [x, z] of [
    [0.45, -0.35],
    [-0.45, -0.35],
  ]) {
    const r = box(0.22, 0.06, 0.16, dark);
    r.position.set(x, -0.06, z);
    g.add(r);
  } // the radar and the laser altimeter
  // the rails on the deck
  for (const s of [-1, 1]) {
    const r = box(0.3, TWP.rail, 1.9, alu);
    r.position.set(s * TWZ.WX, H, 0.07);
    g.add(r);
  }
  // legs at the four diagonals: the main strut (it telescopes), two side struts, the footpad
  const legs = [];
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      L = new THREE.Group();
    L.position.set(...m20Polar(1.0, a, 0.32));
    L.rotation.y = a - Math.PI / 2;
    g.add(L);
    const main = twBarMesh(0.045, alu, 10),
      inner = twBarMesh(0.032, mat("#d9dcdf", "metal"), 10),
      side = [twBarMesh(0.022, alu), twBarMesh(0.022, alu)];
    const pad = cyl(0.19, 0.17, 0.06, mat("#c9a04a", "gold"), 18);
    L.add(main, inner, ...side, pad);
    legs.push({ main, inner, side, pad });
  }
  // the ramps: an outer rail and two that slide out of it, on a hinge at the deck's front edge
  const ramps = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.position.set(s * TWZ.WX, H + TWP.rail, rf);
    g.add(h);
    const secs = [0.95, 0.92, 0.92].map((l, i) => {
      // a channel: its floor and two lips, each section a little narrower than the last
      const b = new THREE.Group(),
        w = 0.24 - i * 0.025,
        m = i ? mat("#cfd3d7", "metal") : alu;
      h.add(b);
      const fl = box(w, 0.012, l, m);
      fl.geometry.translate(0, -0.012 - i * 0.006, l / 2);
      b.add(fl);
      for (const s of [-1, 1]) {
        const lp = box(0.014, 0.05, l, m);
        lp.geometry.translate(s * (w / 2 - 0.007), -0.012 - i * 0.006, l / 2);
        b.add(lp);
      }
      return b;
    });
    ramps.push({ h, secs });
  }
  const legPose = (f) => {
    const len = twLerp(0.75, 1.36, f),
      b = twLerp(35, 33, f) * DEG,
      e = [len * Math.sin(b), -len * Math.cos(b), 0];
    for (const l of legs) {
      twSetBar(l.main, [0, 0, 0], [e[0] * 0.55, e[1] * 0.55, 0]);
      twSetBar(l.inner, [e[0] * 0.5, e[1] * 0.5, 0], e);
      twSetBar(l.side[0], [-0.22, -0.32, 0.33], [e[0] * 0.55, e[1] * 0.55, 0]);
      twSetBar(l.side[1], [-0.22, -0.32, -0.33], [e[0] * 0.55, e[1] * 0.55, 0]);
      l.pad.position.set(e[0], e[1] - 0.03, 0);
    }
  };
  const drop = H + TWP.rail + TWP.clear,
    ang = Math.asin(drop / TWP.ramp); // the ramp's slope to the ground
  const rampPose = (f) => {
    const fr = twPhase(f, 0, 0.55),
      fx = twPhase(f, 0.45, 1);
    for (const { h, secs } of ramps) {
      h.rotation.x = twLerp(-140 * DEG, ang, fr);
      secs[1].position.z = twLerp(0.02, 0.92, fx);
      secs[2].position.z = twLerp(0.04, 1.83, fx);
    }
  };
  g.userData.pose = { legs: legPose, ramp: rampPose };
  g.userData.slope = ang;
  legPose(1);
  rampPose(0);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The assemblies the app shows, by part (buildSC 'tianwen'): the orbiter carrying the capsule (flags.stowed in the
// fairing; flags.deployT: it unfolds after separation); the orbiter alone; the capsule (flags.trimT: the trim wing swings
// out, flags.trim: it is out; flags.hs === false: the heat shield gone and the platform's legs opening from flags.hsT); the
// heat shield and the backshell on their own (flags.rest: on the ground); the platform with the rover (flags.powered: on
// its engine; flags.landed: on the ground, the rover unfolding from flags.wingsT, the ramp from flags.rampT, and the rover
// driving down it from flags.rollT).

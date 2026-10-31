// index-inline-2 29 — add
// Lines 8170-8503 of readable/index-inline-2.pretty.js (statement-aligned).
const STAGE_LOOK = {
  // the booster section: the skirt round the foot of the tank (3 m up), the two engine fairings on its sides, a dark base
  atlasBooster(g) {
    const steel = mat("#b3b8be", "metal"),
      dark = mat("#2b2c2f", "dark");
    const skirt = cyl(
      1.6,
      1.58,
      3.0,
      mat("#b3b8be", "metal", { side: THREE.DoubleSide }),
      48,
      true,
    );
    g.add(skirt); // (an open ring once it slides off the tank)
    const base = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), dark);
    base.rotation.x = Math.PI / 2;
    base.position.y = 0.01;
    g.add(base);
    for (const s of [-1, 1]) {
      const pod = cyl(0.82, 0.82, 2.1, steel, 24);
      pod.position.set(s * 1.6, 0, 0);
      g.add(pod);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 24, 10, 0, TAU, 0, Math.PI / 2),
        steel,
      );
      top.position.set(s * 1.6, 2.1, 0);
      top.scale.y = 1.05;
      g.add(top); // the fairing's rounded top
      const pb = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24), dark);
      pb.rotation.x = Math.PI / 2;
      pb.position.set(s * 1.6, 0.01, 0);
      g.add(pb);
    }
  },
  // the sustainer: the steel tank, the vernier engines (±Z) just above the skirt, a cone up to the Agena
  atlasSustainer(g) {
    const tank = g.children[0];
    if (tank && tank.isMesh) tank.material = atlasSteelMat();
    for (const s of [-1, 1]) {
      const v = new THREE.Group();
      v.position.set(0, 2.5, s * 1.6);
      v.rotation.x = -s * 0.25;
      g.add(v); // canted outboard
      v.add(box(0.22, 0.18, 0.22, mat("#7d8288", "metal")));
      const b = bell(
        0.38,
        0.11,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      b.position.y = -0.38;
      v.add(b);
    }
    const ring = cyl(1.535, 1.535, 0.12, mat("#8f949a", "metal"), 48, true);
    ring.position.y = 19.0 - 0.06;
    g.add(ring); // where the cone meets the tank
  },
  // the Agena-D: aft rack (y 0–0.7) round the top of the engine, propellant tanks (0.7–4.2), forward section (4.2–5.4)
  agenaD(g) {
    const body = g.children[0];
    if (body && body.isMesh) g.remove(body);
    const silver = mat("#d3d6da", "metal"),
      white = mat("#e7e6e1", "paint"),
      grey = mat("#8d9298", "metal"),
      dark = mat("#2e3034", "dark");
    const tanks = cyl(0.76, 0.76, 3.5, white, 40);
    tanks.position.y = 0.7;
    g.add(tanks);
    const fwd = cyl(0.76, 0.76, 1.2, silver, 40);
    fwd.position.y = 4.2;
    g.add(fwd);
    for (let k = 0; k < 8; k++) {
      const p = box(0.32, 0.5, 0.02, k % 2 ? dark : mat("#bfc3c8", "metal"));
      const a = ((k + 0.5) * TAU) / 8;
      p.position.set(Math.sin(a) * 0.765, 4.45, Math.cos(a) * 0.765);
      p.rotation.y = a;
      g.add(p);
    } // equipment panels
    const band = cyl(0.77, 0.77, 0.08, grey, 40, true);
    band.position.y = 4.18;
    g.add(band);
    // the aft rack: rings and struts round the engine, the pressure spheres, the jets on the rim
    const rim = cyl(0.76, 0.76, 0.08, grey, 40, true);
    rim.position.y = 0.62;
    g.add(rim);
    const foot = cyl(0.55, 0.55, 0.06, grey, 24, true);
    foot.position.y = 0.04;
    g.add(foot);
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8,
        b = ((k + 1) * TAU) / 8;
      const st = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1, 6),
          grey,
        ),
        p0 = new THREE.Vector3(Math.sin(a) * 0.74, 0.62, Math.cos(a) * 0.74),
        p1 = new THREE.Vector3(Math.sin(b) * 0.53, 0.07, Math.cos(b) * 0.53);
      st.scale.y = p0.distanceTo(p1);
      st.position.copy(p0).add(p1).multiplyScalar(0.5);
      st.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p1.clone().sub(p0).normalize(),
      );
      g.add(st);
    }
    for (const a of [0.6, 2.2, 3.7, 5.3]) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 16, 12),
        mat("#c7a24f", "gold"),
      );
      s.position.set(Math.sin(a) * 0.5, 0.36, Math.cos(a) * 0.5);
      g.add(s);
    }
    for (const a of [0, Math.PI]) {
      const j = box(0.16, 0.14, 0.16, grey);
      j.position.set(Math.sin(a) * 0.82, 0.25, Math.cos(a) * 0.82);
      g.add(j);
    }
    const chamber = cyl(0.2, 0.2, 0.55, mat("#6a6e74", "metal"), 16);
    chamber.position.y = 0.0;
    g.add(chamber);
    // the spacecraft adapter on top
    const ad = cyl(0.76, 0.6, 0.35, grey, 32);
    ad.position.y = 5.4;
    g.add(ad);
  },
};

// ==== 36_mariner.js
// ============================================================================
// Mariner 4 (1964): an octagonal bus 1.27 m across its corners and 0.457 m high, louvres for its temperature on four of its
// sides; four solar panels, 1.76 × 0.90 m, from the top edge of the other four, each with a solar pressure vane at its tip
// (the vanes steered it a little by the push of sunlight); the elliptical high-gain dish, 1.17 × 0.53 m, on top; the low-
// gain antenna on a mast, 2.89 m from the foot of the bus to its tip, the magnetometer part way up; the television camera
// on its scan platform under the bus; the midcourse motor's nozzle on one side. For launch the panels are folded up
// round the mast, inside the shroud (flags.stowed); they open out after the spacecraft leaves the Agena (flags.deployT).
// y = 0 at the foot of the bus.
// ============================================================================
function marinerPanel() {
  // a solar panel along +X from its hinge, the cells on top; its vane at the tip (userData.vane)
  const g = new THREE.Group(),
    L = 1.76,
    W = 0.9;
  const cells = box(L, 0.03, W, mat("#1b2550", "solar"));
  cells.position.set(L / 2, 0, 0);
  cells.geometry.translate(0, -0.015, 0);
  g.add(cells);
  const frame = box(L + 0.02, 0.035, 0.03, mat("#c8ccd1", "metal"));
  for (const z of [-W / 2, W / 2]) {
    const f = frame.clone();
    f.position.set(L / 2, -0.02, z);
    g.add(f);
  }
  for (let i = 1; i < 6; i++) {
    const ln = box(0.012, 0.032, W, mat("#9aa0a8", "metal"));
    ln.position.set((i * L) / 6, -0.019, 0);
    g.add(ln);
  }
  const vane = new THREE.Group();
  vane.position.set(L, 0, 0);
  g.add(vane);
  const v = box(0.62, 0.012, 0.66, mat("#e3e5e8", "metal"));
  v.position.set(0.31, 0, 0);
  v.geometry.translate(0, -0.006, 0);
  vane.add(v);
  const act = cyl(0.03, 0.03, 0.1, mat("#5c6066", "metal"), 8);
  act.rotation.x = Math.PI / 2;
  act.position.set(0.02, 0.02, 0);
  vane.add(act);
  g.userData.vane = vane;
  return g;
}
function marinerModel(flags = {}) {
  const g = new THREE.Group(),
    H = 0.457,
    Rc = 0.635,
    Rf = Rc * Math.cos(Math.PI / 8);
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(Rc, Rc, H, 8, 1),
    mat("#3c3f45", "metal", { flatShading: true }),
  );
  bus.rotation.y = Math.PI / 8;
  bus.position.y = H / 2;
  g.add(bus);
  // the sides: louvres (bright slats) between the panel hinges, gold foil where the panels are
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      side = new THREE.Group();
    side.position.set(
      Math.sin(a) * (Rf + 0.006),
      H / 2,
      Math.cos(a) * (Rf + 0.006),
    );
    side.rotation.y = a;
    g.add(side);
    if (k % 2) {
      side.add(box(0.4, 0.36, 0.01, mat("#2a2c30", "dark")));
      for (let i = 0; i < 6; i++) {
        const s = box(0.05, 0.34, 0.015, mat("#e2e4e8", "metal"));
        s.position.set(-0.16 + i * 0.064, -0.17, 0.008);
        s.rotation.y = 0.5;
        side.add(s);
      }
    } else {
      const f = box(0.46, 0.4, 0.01, foilMat("gold", 1));
      f.position.y = -0.2;
      side.add(f);
    }
  }
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(Rc * 0.98, Rc * 0.98, 0.03, 8),
    mat("#9da2a8", "metal"),
  );
  lid.rotation.y = Math.PI / 8;
  lid.position.y = H + 0.015;
  g.add(lid);
  // high-gain dish (elliptical) on a short support, tilted; low-gain antenna mast with the magnetometer
  const hga = new THREE.Group();
  hga.position.set(0, H + 0.3, 0.08);
  hga.rotation.x = 0.35;
  g.add(hga);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 32, 8, 0, TAU, 0, 0.62),
    mat("#eef0f2", "paint", { side: THREE.DoubleSide }),
  );
  dish.rotation.x = Math.PI;
  dish.position.y = 0.62;
  dish.scale.set(1.62, 1, 0.74);
  hga.add(dish); // 1.17 × 0.53 m
  for (const [x, z] of [
    [-0.18, -0.08],
    [0.18, -0.08],
    [0, 0.14],
  ])
    hga.add(
      m20Bar(
        [x * 1.6, -0.3, z],
        [x * 0.3, 0.02, z * 0.3],
        0.012,
        mat("#9aa0a6", "metal"),
      ),
    ); // its tripod
  const feed = cyl(0.025, 0.025, 0.32, mat("#7f848a", "metal"), 8);
  feed.position.y = 0.05;
  hga.add(feed);
  const mx = -0.3,
    mz = -0.25,
    top = 2.89;
  g.add(
    m20Bar([mx, H, mz], [mx, top - 0.12, mz], 0.022, mat("#c9cdd2", "metal")),
  );
  const lga = cyl(0.06, 0.06, 0.12, mat("#e6e6e2", "paint"), 12);
  lga.position.set(mx, top - 0.12, mz);
  g.add(lga);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 6, 0, TAU, 0, Math.PI / 2),
    mat("#e6e6e2", "paint"),
  );
  dome.position.set(mx, top, mz);
  g.add(dome);
  const mag = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 14, 10),
    mat("#d7a94a", "gold"),
  );
  mag.position.set(mx, 1.75, mz);
  g.add(mag);
  // the scan platform and the camera under the bus; the midcourse motor's nozzle
  const plat = cyl(0.2, 0.2, 0.04, mat("#55595f", "metal"), 16);
  plat.position.set(0.15, -0.06, 0.1);
  g.add(plat);
  const cam = cyl(0.07, 0.07, 0.32, mat("#2c2e33", "dark"), 14);
  cam.rotation.z = 0.5;
  cam.position.set(0.15, -0.3, 0.1);
  g.add(cam);
  const noz = bell(
    0.12,
    0.05,
    mat("#4a4c50", "metal", { side: THREE.DoubleSide }),
  );
  noz.position.set(0, -0.12, 0);
  g.add(noz);
  // the four solar panels on the louvre-free sides (±X, ±Z)
  const panels = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2,
      piv = new THREE.Group();
    piv.position.set(Math.sin(a) * Rf, H - 0.02, Math.cos(a) * Rf);
    piv.rotation.y = a - Math.PI / 2;
    g.add(piv);
    const p = marinerPanel();
    piv.add(p);
    panels.push({ p, vane: p.userData.vane });
  }
  // folded (f = 0): panels up along the mast, vanes folded back flat; deployed (1): out flat, the vanes turned 25°
  const pose = (f) => {
    for (const { p, vane } of panels) {
      p.rotation.z = (Math.PI / 2) * (1 - f);
      vane.rotation.z = Math.PI * (1 - f) + 0.44 * f;
    }
  };
  if (flags.deployT != null)
    g.userData.animate = (t) =>
      pose(smoothstep(clamp((t - flags.deployT - 20) / 60, 0, 1)));
  pose(flags.stowed || flags.deployT != null ? 0 : 1);
  g.userData.len = H;
  return g;
}

// ==== 37_tianwen.js
// ============================================================================
// Tianwen-1 (2020–21), metres: the orbiter, which carried the entry capsule to Mars on its top; the capsule, heat shield
// and backshell; inside it the landing platform with the Zhurong rover on its deck.
// Published: the orbiter is an outer hexagonal prism round a central load-bearing cone, with a 3000 N main engine; the
// capsule's heat shield is a blunt 70° sphere-cone 3.4 m across, and a trim wing on the backshell swings out before the
// parachute opens; the platform comes down on a 7500 N throttleable engine and lets the rover down a two-rail ramp;
// Zhurong is 1.85 m tall and about 2.6 × 3.0 m with its four solar wings open, 240 kg, on six wheels with an active
// suspension, with two round windows on its deck over its heat-storing tanks. The rest (the orbiter's size, its wings and
// antenna, the backshell's shape, the platform's) is estimated and made to fit: the platform and the folded rover inside
// the capsule, the capsule on the orbiter, the whole in Long March 5's fairing.
// ============================================================================
const TW = { mats: {} };
const twMat = (key, make) => TW.mats[key] || (TW.mats[key] = make());
// a canvas texture for flat parts (upright on a PlaneGeometry)
function twTex(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// the national flag of China (3:2): the large star, and four small ones each pointing at the large one's centre

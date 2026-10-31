// index-inline-2 26 — three
// Lines 7243-7475 of readable/index-inline-2.pretty.js (statement-aligned).
function m20CruiseStage() {
  const g = new THREE.Group(),
    R = 2.25,
    top = M20_CS_TOP,
    y0 = top - 0.05,
    H = 0.75,
    yb = y0 - H,
    mounts = [];
  const white = mat("#ecebe6", "paint", { side: THREE.DoubleSide }),
    alu = mat("#b9bdc3", "metal"),
    copper = mat("#a86c3e", "metal"),
    dark = mat("#2b2c30", "dark");
  // the solar array: the cells outward, the panels' backs inward, its edge
  const face = new THREE.Mesh(
    new THREE.RingGeometry(0.7, R, 120, 2),
    new THREE.MeshStandardMaterial({
      map: m20SolarTex(),
      roughness: 0.32,
      metalness: 0.35,
    }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = top;
  g.add(face);
  const back = new THREE.Mesh(
    new THREE.RingGeometry(0.7, R, 120, 1),
    mat("#62666c", "metal"),
  );
  back.rotation.x = Math.PI / 2;
  back.position.y = y0;
  g.add(back);
  const edge = cyl(R, R, 0.05, mat("#26272a", "dark"), 120, true);
  edge.position.y = y0;
  g.add(edge);
  // the central cylinder, from the interface plate up through the array
  const core = cyl(
    0.7,
    0.7,
    top - M20_BIP[1],
    mat("#aeb2b8", "metal", { side: THREE.DoubleSide }),
    40,
    true,
  );
  core.position.y = M20_BIP[1];
  g.add(core);
  const flange = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.82, 40),
    mat("#9da2a8", "metal", { side: THREE.DoubleSide }),
  );
  flange.rotation.x = -Math.PI / 2;
  flange.position.y = M20_BIP[1] + 0.006;
  g.add(flange);
  // ten radiators round the rim, a wider gap at +Z for the medium-gain antenna; the cooling loop's pipes along them
  for (let k = 0; k < 10; k++) {
    const a0 = (k * 36 + 1.2 + (k === 0 ? 3.8 : 0)) * DEG,
      a1 = ((k + 1) * 36 - 1.2 - (k === 9 ? 3.8 : 0)) * DEG;
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(
        R - 0.012,
        R - 0.012,
        H,
        8,
        1,
        true,
        a0,
        a1 - a0,
      ),
      white,
    );
    p.position.y = yb + H / 2;
    g.add(p);
  }
  for (const y of [yb + 0.07, y0 - 0.12]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(R - 0.07, 0.016, 6, 96),
      copper,
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  // ribs under the array, struts from the central cylinder down and out to the radiators' feet
  for (let k = 0; k < 10; k++) {
    const a = (k * TAU) / 10;
    g.add(
      m20Beam(
        m20Polar(0.72, a, y0 - 0.04),
        m20Polar(R - 0.05, a, y0 - 0.04),
        0.06,
        alu,
      ),
    );
    g.add(
      m20Bar(
        m20Polar(0.72, a, M20_BIP[1] + 0.1),
        m20Polar(R - 0.06, a, yb + 0.06),
        0.022,
        copper,
      ),
    );
  }
  // propellant tanks, electronics in gold blankets
  for (const a of [60, 240]) {
    const t = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 16),
      mat("#b08a5c", "metal"),
    );
    t.position.set(...m20Polar(1.6, a * DEG, yb + 0.32));
    g.add(t);
    g.add(
      m20Bar(
        m20Polar(1.6, a * DEG, yb + 0.5),
        m20Polar(1.6, a * DEG, y0 - 0.05),
        0.02,
        alu,
      ),
    );
  }
  for (const [a, w] of [
    [125, 0.4],
    [162, 0.3],
    [302, 0.36],
    [338, 0.3],
    [205, 0.32],
  ]) {
    const b = box(w, 0.2, 0.28, foilMat("gold", 1));
    b.position.set(...m20Polar(1.75, a * DEG, y0 - 0.3));
    b.rotation.y = a * DEG;
    g.add(b);
  }
  // two thruster clusters below the rim (±X), four nozzles each pointing down and out
  for (const s of [-1, 1]) {
    const cl = new THREE.Group();
    cl.position.set(s * (R + 0.06), yb - 0.05, 0);
    cl.rotation.y = (s * Math.PI) / 2;
    g.add(cl);
    cl.add(box(0.26, 0.08, 0.14, mat("#8c9096", "metal")));
    for (let i = 0; i < 4; i++) {
      const n = bell(
        0.09,
        0.028,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      const e = new THREE.Group();
      e.position.set((i - 1.5) * 0.06, 0, 0.03);
      e.rotation.x = -0.55;
      e.add(n);
      n.position.y = -0.09;
      cl.add(e);
    }
    g.add(
      m20Bar(
        [s * (R + 0.04), yb - 0.01, 0],
        [s * (R - 0.15), yb + 0.25, 0],
        0.016,
        alu,
      ),
    );
    const d = new THREE.Vector3(0, -1, 0)
        .applyEuler(new THREE.Euler(-0.55, 0, 0))
        .applyEuler(cl.rotation),
      ex = new THREE.Vector3(0, -0.09, 0)
        .applyEuler(new THREE.Euler(-0.55, 0, 0))
        .add(new THREE.Vector3(0, 0, 0.03))
        .applyEuler(cl.rotation)
        .add(cl.position);
    mounts.push({
      x: ex.x,
      y: ex.y,
      z: ex.z,
      r: 0.04,
      tag: "CRUISE",
      d: [d.x, d.y, d.z],
    });
  }
  // the medium-gain antenna's horn, looking out through the gap at +Z; a star scanner and sun sensors on the array
  const horn = cyl(
    0.07,
    0.15,
    0.3,
    mat("#2c2d31", "dark", { side: THREE.DoubleSide }),
    24,
    true,
  );
  horn.rotation.x = Math.PI / 2;
  horn.position.set(0, y0 - 0.22, R - 0.42);
  g.add(horn);
  const throat = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), dark);
  throat.position.set(0, y0 - 0.22, R - 0.42);
  g.add(throat);
  g.add(m20Bar([0, y0 - 0.05, R - 0.3], [0, y0 - 0.16, R - 0.3], 0.02, alu));
  const ss = box(0.16, 0.12, 0.16, dark);
  ss.position.set(...m20Polar(1.2, 200 * DEG, top));
  g.add(ss);
  const shade = cyl(
    0.06,
    0.09,
    0.12,
    mat("#1c1d20", "dark", { side: THREE.DoubleSide }),
    16,
    true,
  );
  shade.position.set(...m20Polar(1.2, 200 * DEG, top + 0.12));
  g.add(shade);
  for (const a of [100, 280]) {
    const sn = box(0.07, 0.04, 0.07, mat("#cfa64a", "gold"));
    sn.position.set(...m20Polar(2.1, a * DEG, top));
    g.add(sn);
  }
  g.userData.len = top;
  g.userData.mounts = mounts;
  return g;
}
// one descent engine: valve and chamber over its bell, canted outboard (+Z) by cant (deg); its exit 0.6 m below the origin
function m20Engine(cant) {
  const e = new THREE.Group();
  e.rotation.x = -cant * DEG;
  const v = box(0.13, 0.07, 0.11, mat("#8b8f95", "metal"));
  v.position.y = -0.07;
  e.add(v);
  const ch = cyl(0.072, 0.072, 0.21, mat("#b8bcc2", "metal"), 16);
  ch.position.y = -0.28;
  e.add(ch);
  const b = bell(
    0.32,
    0.12,
    mat("#6a6b6f", "metal", { side: THREE.DoubleSide }),
  );
  b.position.y = -0.6;
  e.add(b);
  return e;
}
// the descent stage, y = 0 at the foot of its frame; userData.mounts: its eight engines (tag DS, cant, exhaust direction d)

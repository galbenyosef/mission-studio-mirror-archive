// index-inline-2 20 — three
// Lines 5337-5688 of readable/index-inline-2.pretty.js (statement-aligned).
function apolloLES() {
  const g = new THREE.Group(),
    white = mat("#ecebe6", "paint"),
    red = mat("#c4441f", "paint"),
    black = mat("#151517", "dark");
  const bpcTop = CM_TOP + 0.08; // the cover closes over the docking tunnel; the tower stands on it
  const coneTopR = 0.62,
    coneTopY = CM_CONE.y0 + (CM_CONE.r0 + 0.07 - coneTopR) / CM_CONE.tan;
  g.add(
    lathe(
      [
        [1.99, 0.02],
        [1.98, 0.16],
        [coneTopR, coneTopY],
        [0.56, bpcTop - 0.06],
        [0.5, bpcTop],
        [0, bpcTop],
      ],
      white,
    ),
  );
  g.add(
    cmConePatch(
      rectShape(0.26, 0.32, 0.04),
      0.42,
      1.78,
      mat("#06080b", "glass"),
      0.068,
    ),
  ); // the commander's window, uncovered
  const t0 = bpcTop,
    t1 = t0 + 3.0,
    rb = 0.62,
    rt = 0.36;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2,
      a2 = a + Math.PI / 2;
    g.add(
      lmRodA(
        [Math.cos(a) * rb, t0, Math.sin(a) * rb],
        [Math.cos(a) * rt, t1, Math.sin(a) * rt],
        0.06,
        red,
      ),
    );
    for (const [y0, y1] of [
      [t0, t0 + 1.5],
      [t0 + 1.5, t1],
    ]) {
      const r0 = rb + ((rt - rb) * (y0 - t0)) / 3,
        r1 = rb + ((rt - rb) * (y1 - t0)) / 3;
      g.add(
        lmRodA(
          [Math.cos(a) * r0, y0, Math.sin(a) * r0],
          [Math.cos(a2) * r1, y1, Math.sin(a2) * r1],
          0.03,
          red,
        ),
      );
    }
  }
  const m0 = t1;
  g.add(
    lathe(
      [
        [0.36, m0 - 0.05],
        [0.42, m0 + 0.15],
        [0.33, m0 + 0.4],
      ],
      black,
    ),
  ); // nozzle skirt
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4,
      b = bell(0.5, 0.17, black);
    b.position.set(Math.cos(a) * 0.3, m0 + 0.25, Math.sin(a) * 0.3);
    b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(b);
  }
  const motor = cyl(0.33, 0.33, 4.3, white, 32);
  motor.position.y = m0 + 0.4;
  g.add(motor);
  const band = cyl(0.335, 0.335, 0.25, black, 32);
  band.position.y = m0 + 3.2;
  g.add(band);
  const can = cyl(0.33, 0.27, 1.1, white, 32);
  can.position.y = m0 + 4.7;
  g.add(can);
  for (const s of [-1, 1]) {
    const c = box(0.03, 0.6, 0.45, white);
    c.position.set(s * 0.42, m0 + 5.0, 0);
    g.add(c);
  } // canards (folded)
  const nose = lathe(
    [
      [0.27, 0],
      [0.22, 0.45],
      [0.12, 0.9],
      [0.05, 1.05],
      [0, 1.1],
    ],
    black,
  );
  nose.position.y = m0 + 5.8;
  g.add(nose);
  g.userData.top = m0 + 6.9;
  return g;
}
function lmRodA(p0, p1, r, m) {
  // a cylinder between two points
  const a = new THREE.Vector3(...p0),
    b = new THREE.Vector3(...p1),
    d = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, d.length(), 8),
    m,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
function apolloSM(damaged, stowed = false) {
  // stowed: on the launch pad, the high-gain antenna folded inside the adapter
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_CYL, 64, 1, true),
    smSkinMat(),
  );
  body.geometry.translate(0, SM_CYL / 2, 0);
  g.add(body);
  const aft = new THREE.Mesh(
    new THREE.CircleGeometry(1.955, 64),
    mat("#3a3c40", "dark"),
  );
  aft.rotation.x = Math.PI / 2;
  g.add(aft); // aft bulkhead
  const fwd = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 64),
    mat("#5d6166", "metal"),
  );
  fwd.rotation.x = -Math.PI / 2;
  fwd.position.y = SM_CYL;
  g.add(fwd); // forward bulkhead, under the CM
  const fair = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_LEN - SM_CYL, 64, 1, true),
    fairingMat(),
  );
  fair.geometry.translate(0, (SM_CYL + SM_LEN) / 2, 0);
  g.add(fair); // the forward fairing
  const ring = cyl(1.968, 1.968, 0.05, mat("#9ca1a8", "metal"), 64);
  ring.position.y = SM_CYL - 0.025;
  g.add(ring); // the seam below the fairing
  // four RCS quads: a housing on the skin with four nozzles (up, down and both ways round)
  const noz = mat("#2a2622", "metal", { side: THREE.DoubleSide }),
    housing = mat("#d8dadd", "metal");
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 7.25 * DEG,
      ux = Math.sin(a),
      uz = Math.cos(a),
      q = new THREE.Group();
    q.position.set(ux * 2.02, 2.95, uz * 2.02);
    q.rotation.y = a;
    g.add(q);
    const h = box(0.55, 0.62, 0.16, housing);
    h.position.y = -0.31;
    q.add(h);
    for (const d of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
    ]) {
      const b = bell(0.24, 0.09, noz);
      b.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(...d),
      );
      b.position.set(d[0] * 0.28, d[1] * 0.31, 0.12);
      q.add(b);
    }
  }
  // the two scimitar antennas, blades on the skin low on opposite sides; the CM–SM umbilical's fairing at the top
  for (const a of [0.55, 0.55 + Math.PI]) {
    const bl = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.42, 0.04),
      mat("#d8dadd", "metal"),
    );
    bl.position.set(Math.sin(a) * 2.0, 0.9, Math.cos(a) * 2.0);
    bl.rotation.y = a;
    g.add(bl);
  }
  {
    const a = 2.7,
      u = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.9, 0.3),
        mat("#cfd2d6", "metal"),
      );
    u.position.set(Math.sin(a) * 2.05, SM_LEN - 0.4, Math.cos(a) * 2.05);
    u.rotation.y = a;
    g.add(u);
  }
  // the high-gain antenna on its boom at the aft end: four dishes round a wide-beam horn
  if (!stowed) {
    const a = Math.PI * 1.25,
      ux = Math.sin(a),
      uz = Math.cos(a),
      dishM = mat("#e9e9e6", "paint", { side: THREE.DoubleSide });
    const p0 = [ux * 1.9, 0.35, uz * 1.9],
      p1 = [ux * 2.9, -0.55, uz * 2.9];
    g.add(lmRodA(p0, p1, 0.06, mat("#9aa0a6", "metal")));
    const hg = new THREE.Group();
    hg.position.set(...p1);
    hg.rotation.y = a;
    hg.rotation.x = 0.6;
    g.add(hg);
    for (const [x, y] of [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ]) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 6, 0, TAU, 0, Math.PI / 5),
        dishM,
      );
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, y, 0.15);
      hg.add(d);
    }
    const horn = cyl(0.12, 0.05, 0.3, dishM, 12);
    horn.rotation.x = -Math.PI / 2;
    hg.add(horn);
  }
  // the SPS engine: the combustion chamber and nozzle throat (dark) and the radiation-cooled extension (lighter)
  {
    const L = 2.97,
      R = 1.25,
      prof = [
        [R * 0.34, L],
        [R * 0.3, L * 0.9],
        [R * 0.48, L * 0.65],
        [R * 0.72, L * 0.35],
        [R, 0],
      ].map((p) => [p[0], p[1] - L]);
    const split = 2;
    g.add(
      lathe(
        prof.slice(0, split + 1),
        mat("#2b2c2f", "dark", { side: THREE.DoubleSide }),
        32,
      ),
    );
    g.add(
      lathe(
        prof.slice(split),
        mat("#8b9097", "metal", { side: THREE.DoubleSide }),
        32,
      ),
    );
  }
  if (damaged) {
    // Apollo 13: the outer panel of bay 4 blown away, the bay's shelves and tanks exposed
    const a = 0.8,
      hole = cmlessPanel(1.6, 3.1, a, 1.75, mat("#2a1d12", "dark"));
    g.add(hole);
    for (let k = 0; k < 7; k++) {
      const sh = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.25 + 0.1 * (k % 3), 0.05),
        new THREE.Vector2(0.1, 0.3),
      ]);
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(sh),
        mat("#9aa0a6", "metal", { side: THREE.DoubleSide }),
      );
      m.position.set(
        Math.sin(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
        0.4 + k * 0.42,
        Math.cos(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
      );
      m.rotation.y = a;
      g.add(m);
    }
  }
  g.userData.len = SM_LEN;
  g.userData.engineY = -2.97;
  g.userData.engineR = 1.25;
  return g;
}
// the forward fairing: eight electrical-power radiators (white, with their tubes) between narrow aluminium strips
function fairingMat() {
  if (APOLLO.fairing) return APOLLO.fairing;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#b9bec4";
  g.fillRect(0, 0, 1024, 64);
  for (let k = 0; k < 8; k++) {
    const x0 = k * 128 + 10;
    g.fillStyle = "#eceef0";
    g.fillRect(x0, 6, 108, 52);
    g.strokeStyle = "rgba(150,156,162,0.9)";
    g.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo(x0 + i * 12, 8);
      g.lineTo(x0 + i * 12, 56);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (APOLLO.fairing = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.45,
    metalness: 0.35,
  }));
}
// a dark, recessed panel on the service module's cylinder (azimuth a from +Z, centred at height y)
function cmlessPanel(w, h, a, y, m) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(Math.sin(a) * 1.96, y, Math.cos(a) * 1.96);
  p.rotation.y = a;
  return p;
}

// ==== 32_shuttle.js
// ============================================================================
// Space Shuttle models (metres): the orbiter, the launch stack (External Tank, two boosters, the orbiter on the
// tank's belly side), the International Space Station and the Hubble Space Telescope.
// Orbiter axes: +Y nose, +Z top (payload bay side), +X right (starboard) wing. Y = 0 at the aft end of the
// fuselage (the base heat shield), Z = 0 at the payload bay centreline (structural plane Zo 400).
// Dimensions follow the orbiter structure: mid fuselage 18.4 m long, 5.2 m wide; aft fuselage 6.7 m wide and
// 6.1 m high; OMS pods 6.6 m long; wing root chord 18 m; vertical tail 8 m tall, swept 45°.
// The orbiter is drawn with the Smithsonian's 3D scan of Discovery (assets/orbiter.glb, built by tools/models: the body,
// the two payload bay doors and the landing gear apart). The built-in model below stands in while it loads; the landing
// gear, the engine nozzles and the payload bay follow the scan's measurements in both.
// ============================================================================
const SH_COL = {
  white: "#efede7",
  black: "#141517",
  rcc: "#3c3d41",
  grey: "#a3a8ae",
  bay: "#d4d7da",
  rad: "#e6ebf0",
  gold: "#c8a24a",
  base: "#2c2e31",
};
// Where the tyres touch the ground with the gear down, [Y, Z] (from the scan). The nose wheels touch 1.55 m higher than the
// main wheels, so the orbiter stands 4.4° nose down on its gear.

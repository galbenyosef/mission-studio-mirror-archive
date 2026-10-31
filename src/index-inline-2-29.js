// index-inline-2 29 — add
// Lines 8001-8278 of readable/index-inline-2.pretty.js (statement-aligned).
function hubbleModel(flags = {}) {
  const g = new THREE.Group(),
    H = HST,
    dark = mat("#141517", "dark", { side: THREE.DoubleSide });
  // aft bulkhead and shroud, the ring of bays, the forward shell and light shield in their blankets
  const shroud = cyl(H.R, H.R, H.es - H.aft, hstShroudMat(), 48, true);
  shroud.position.y = H.aft;
  g.add(shroud);
  const bulk = new THREE.Mesh(
    new THREE.CircleGeometry(H.R, 48),
    mat("#b8bcc1", "metal"),
  );
  bulk.rotation.x = Math.PI / 2;
  bulk.position.y = H.aft;
  g.add(bulk);
  for (let k = 0; k < 3; k++) {
    const b = box(0.12, 0.08, H.R * 1.9, mat("#8b9096", "metal"));
    b.rotation.y = (k * TAU) / 3;
    b.position.y = H.aft - 0.08;
    g.add(b);
  } // its radial beams
  const bays = new THREE.Mesh(
    new THREE.CylinderGeometry(H.R, H.R, H.fwd - H.es, 12, 1, true),
    mat("#c3c7cc", "metal", { flatShading: true }),
  );
  bays.position.y = (H.es + H.fwd) / 2;
  bays.rotation.y = TAU / 24;
  g.add(bays);
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12,
      d = box(0.9, 0.85, 0.02, mat("#d8dbdf", "metal"));
    d.position.set(
      Math.sin(a) * H.R * 0.985,
      H.es + 0.12,
      Math.cos(a) * H.R * 0.985,
    );
    d.rotation.y = a;
    g.add(d); // the bays' doors
    const hd = box(0.5, 0.04, 0.04, hstYellow());
    hd.position.set(
      Math.sin(a) * (H.R + 0.05),
      H.es + 0.55,
      Math.cos(a) * (H.R + 0.05),
    );
    hd.rotation.y = a;
    g.add(hd);
  }
  const step = new THREE.Mesh(
    new THREE.RingGeometry(H.r, H.R, 48),
    mat("#a4a9af", "paint", { side: THREE.DoubleSide, roughness: 0.7 }),
  );
  step.rotation.x = -Math.PI / 2;
  step.position.y = H.fwd;
  g.add(step); // the bays' forward face, blanketed
  const tube = cyl(H.r, H.r, H.door - H.fwd, hstBlanketMat(), 48, true);
  tube.position.y = H.fwd;
  g.add(tube);
  const rim = cyl(
    H.r + 0.03,
    H.r + 0.03,
    0.12,
    mat("#9ea3a9", "metal"),
    48,
    true,
  );
  rim.position.y = H.door - 0.12;
  g.add(rim);
  // inside the aperture: the dark light shield and its baffles, the secondary mirror's spider far down
  const inside = cyl(H.r - 0.02, H.r - 0.02, 3.0, dark, 32, true);
  inside.position.y = H.door - 3.0;
  g.add(inside);
  for (let k = 0; k < 4; k++) {
    const b = new THREE.Mesh(
      new THREE.RingGeometry(H.r - 0.22, H.r - 0.02, 32),
      dark,
    );
    b.rotation.x = -Math.PI / 2;
    b.position.y = H.door - 0.4 - k * 0.7;
    g.add(b);
  }
  const ap = new THREE.Mesh(
    new THREE.CircleGeometry(H.r - 0.02, 32),
    mat("#050506", "dark"),
  );
  ap.rotation.x = -Math.PI / 2;
  ap.position.y = H.door - 3.0;
  g.add(ap);
  // the aperture door, hinged at +Z
  const dg = new THREE.Group();
  dg.position.set(0, H.door + 0.06, H.r);
  g.add(dg);
  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.52, 0.1, 40),
    mat("#dfe2e5", "metal"),
  );
  door.position.set(0, 0, -H.r);
  dg.add(door);
  const hinge = cyl(0.08, 0.08, 0.6, mat("#8f949a", "metal"), 10);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(-0.3, 0, 0);
  dg.add(hinge);
  if (flags.doorT != null)
    g.userData.animate = (t) => {
      dg.rotation.x =
        105 * DEG * smoothstep(clamp((t - flags.doorT) / 60, 0, 1));
    }; // up and over, forward
  else if (flags.door) dg.rotation.x = 105 * DEG;
  // handrails: rings round the light shield and the shroud, rails along them; the magnetic torquers; sun sensors; the
  // low-gain antennas; trunnions; the grapple fixture
  for (const y of [3.2, 5.6]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(H.r + 0.1, 0.018, 6, 64),
      hstYellow(),
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  for (const y of [H.aft + 0.4]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(H.R + 0.1, 0.02, 6, 64),
      hstYellow(),
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * TAU) / 8,
      r = cyl(0.02, 0.02, 2.8, hstYellow(), 6);
    r.position.set(
      Math.sin(a) * (H.R + 0.1),
      H.aft + 0.4,
      Math.cos(a) * (H.R + 0.1),
    );
    g.add(r);
  }
  for (const a of [0.6, 2.2, 3.8, 5.3]) {
    const r = cyl(0.018, 0.018, 3.4, hstYellow(), 6);
    r.position.set(Math.sin(a) * (H.r + 0.1), 2.2, Math.cos(a) * (H.r + 0.1));
    g.add(r);
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2,
      m = box(0.1, 2.5, 0.1, mat("#5b5f65", "metal"));
    m.position.set(
      Math.sin(a) * (H.r + 0.14),
      -0.6,
      Math.cos(a) * (H.r + 0.14),
    );
    g.add(m);
  }
  for (const x of [-0.45, 0.45]) {
    const s = box(0.16, 0.12, 0.12, mat("#2c2e32", "dark"));
    s.position.set(x, H.door - 0.3, H.r + 0.06);
    g.add(s);
  }
  for (const [y, z, up] of [
    [H.door - 1.0, -(H.r + 0.05), 0],
    [H.aft - 0.05, -1.2, 1],
  ]) {
    const c = cyl(0.12, 0.02, 0.3, mat("#d9d9d4", "paint"), 12);
    if (up) {
      c.rotation.x = Math.PI;
      c.position.set(0.6, y, z);
    } else {
      c.rotation.x = -Math.PI / 2;
      c.position.set(0, y, z);
    }
    g.add(c);
  }
  for (const s of [-1, 1]) {
    const tr = cyl(0.1, 0.1, 0.45, hstSilver(), 10);
    tr.rotation.z = Math.PI / 2;
    tr.position.set(s * (H.R + 0.22), H.es + 0.3, 0);
    g.add(tr);
  } // aft trunnions
  const keel = cyl(0.1, 0.1, 0.4, hstSilver(), 10);
  keel.rotation.x = Math.PI / 2;
  keel.position.set(0, -0.2, -(H.r + 0.2));
  g.add(keel);
  const fix = cyl(0.25, 0.25, 0.15, mat("#e0e0e0", "metal"), 12);
  fix.rotation.x = Math.PI / 2;
  fix.position.set(0, -3.0, H.R + 0.07);
  g.add(fix); // grapple fixture
  const pin = cyl(0.04, 0.04, 0.3, mat("#d0d0d0", "metal"), 8);
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, -3.0, H.R + 0.27);
  g.add(pin);
  // the solar array wings (±X) and the high-gain antennas (±Z), from the aft end of the forward shell
  const wings = [-1, 1].map((s) => {
    const piv = new THREE.Group();
    piv.position.set(s * (H.r + 0.12), H.fwd + 0.15, 0);
    g.add(piv);
    const w = hstWing();
    if (s < 0) w.rotation.z = Math.PI;
    piv.add(w);
    return { piv, w, s };
  }); // (both wings' cells face +Z)
  const ants = [-1, 1].map((s) => {
    const piv = new THREE.Group();
    piv.position.set(0, H.fwd + 0.3, s * (H.r + 0.15));
    g.add(piv);
    const a = hstAntenna();
    if (s < 0) a.rotation.y = Math.PI;
    piv.add(a);
    return { piv, s, dish: a.userData.dish };
  });
  // f: 0 stowed (masts and drums folded forward along the forward shell, the blankets rolled up; the antenna masts along the
  // shell and light shield, dishes forward), 1 deployed. Wings swing out to f 0.25 and unroll to f 1; antennas out by f 0.4.
  const pose = (f) => {
    const sw = smoothstep(clamp(f / 0.25, 0, 1)),
      un = smoothstep(clamp((f - 0.25) / 0.75, 0, 1)),
      bm = smoothstep(clamp(f / 0.4, 0, 1));
    for (const { piv, w, s } of wings) {
      piv.rotation.z = ((s * Math.PI) / 2) * (1 - sw);
      w.userData.unroll(un);
    }
    for (const { piv, s, dish } of ants) {
      piv.rotation.x = ((-s * Math.PI) / 2) * (1 - bm);
      dish.rotation.x = (Math.PI / 2) * (1 - bm);
    }
  };
  if (flags.arrays && flags.deployable) g.userData.deploy = pose;
  pose(flags.arrays ? (flags.deployable ? 0 : 1) : 0);
  g.userData.len = 13.2;
  g.userData.yc0 = 0;
  return g;
}

// ==== 35_atlas.js
// ============================================================================
// Atlas LV-3 Agena-D as it launched Mariner 4 (1964), drawn over its stages' plain geometry (src/vehicles.js, look; called
// from buildStage with the stage's group, bottom at y = 0). The Atlas: a stainless-steel balloon tank 3.05 m across, its
// sheets welded in rings; the booster section a skirt round the foot of the tank with the two booster engines in fairings
// on its sides (±X), making the base 4.9 m wide; the sustainer engine in the middle, under the tank; two small vernier
// engines low on the tank's sides (±Z); a cone up to the Agena. The Agena-D, 1.52 m across: the aft rack, an open frame
// round the engine's top with the pressure spheres and the attitude-control jets; the propellant tanks; the forward
// equipment section; the adapter the spacecraft sits on.
// ============================================================================
const ATLAS = { mats: {} };
let atlasSeed = 21;
const atlasRnd = () =>
  (atlasSeed = (atlasSeed * 9301 + 49297) % 233280) / 233280;
// the Atlas tank's steel: faint seams between the welded rings (about 0.8 m tall) and along each sheet
function atlasSteelMat() {
  if (ATLAS.mats.steel) return ATLAS.mats.steel;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#bcc1c7";
  g.fillRect(0, 0, 512, 1024);
  atlasSeed = 21;
  for (let i = 0; i < 1600; i++) {
    g.fillStyle =
      atlasRnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(40,44,50,0.05)";
    g.fillRect(
      atlasRnd() * 512,
      atlasRnd() * 1024,
      1 + atlasRnd() * 3,
      6 + atlasRnd() * 40,
    );
  } // the sheets' grain, along the tank
  g.fillStyle = "rgba(85,90,96,0.45)";
  for (let y = 0; y < 1024; y += 43) g.fillRect(0, y, 512, 2);
  for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 2, 1024);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.anisotropy = 4;
  return (ATLAS.mats.steel = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.3,
    metalness: 0.75,
  }));
}

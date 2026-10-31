// index-inline-2 23 — add
// Lines 6350-6695 of readable/index-inline-2.pretty.js (statement-aligned).
function shuttlePayload(kind, flags = {}, B = SH_BAY_BUILTIN) {
  const g = new THREE.Group();
  if (kind === "dfi") {
    const p = box(3.6, 3.0, 1.6, mat("#c9c6bd", "metal"));
    p.position.set(0, 8.4, -2.2);
    g.add(p);
    const t = cyl(0.5, 0.5, 1.6, mat("#d8d4c8", "paint"));
    t.rotation.x = Math.PI / 2;
    t.position.set(1.1, 12.2, -1.4);
    g.add(t);
  }
  if (kind === "hst") {
    const h = hubbleModel({ arrays: false });
    h.position.set(0, 14.3, -0.05);
    g.add(h);
  }
  if (kind === "mplm") {
    const c = cyl(2.25, 2.25, 6.4, mat("#e7e5df", "paint"), 32);
    c.position.set(0, 8.2, -0.05);
    g.add(c);
    const cap = cyl(2.25, 1.1, 0.9, mat("#d5d3cc", "paint"), 32);
    cap.position.set(0, 14.6, -0.05);
    g.add(cap);
    const cap2 = cyl(1.1, 2.25, 0.6, mat("#d5d3cc", "paint"), 32);
    cap2.position.set(0, 7.6, -0.05);
    g.add(cap2);
  }
  if (flags.ods) {
    // orbiter docking system: external airlock with the docking mechanism on top, at the front of the bay
    const al = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 2.9, 24),
      mat("#e9e7e1", "paint"),
    );
    al.rotation.x = Math.PI / 2;
    al.position.set(0, 21.5, -0.65);
    g.add(al);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.8, 24),
      mat("#a6abb1", "metal"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 21.5, 1.2);
    g.add(ring);
    const tr = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.4, 0.2),
      mat("#c4c8cc", "metal"),
    );
    tr.position.set(0, 21.5, 0.75);
    g.add(tr);
  }
  if (flags.obss) {
    const b = cyl(0.2, 0.2, 15.2, mat("#d8d6cf", "paint"), 10);
    b.position.set(B.wall - 0.22, 6.9, B.hz + 0.25);
    g.add(b);
  } // the boom on the starboard sill
  return g;
}
// Each flight's orbiter in its own markings. The scan is Discovery as she was retired, in the markings of 1998 on; for the
// orbiters of the app's flights tools/livery repaints its colour map as they flew them: Columbia in 1981 (the name on the
// payload bay doors, "USA" on the right wing, a flag on the left, the black chines), Discovery in 1990 (the NASA logotype
// on the wing and the doors, "USA" and a flag on the left wing, no insignia), Atlantis in 2011 (the scan's scheme, her name).
const ORBITER_LIVERY = {
  "OV-102": "columbia-1981",
  "OV-103": "discovery-1990",
  "OV-104": "atlantis-2011",
};
const LIVERIES = {};
let SCAN_MAT = null; // (the scan's own material, which a livery replaces)
function orbiterLivery(id) {
  // a promise of the scan's material with this orbiter's colour map (null: keep the scan's own)
  const key = ORBITER_LIVERY[id];
  if (!key) return Promise.resolve(null);
  if (!LIVERIES[key])
    LIVERIES[key] = detailFile("orbiter").then(
      (P) =>
        new Promise((ok) => {
          let base = null;
          if (P && P.body)
            P.body.traverse((o) => {
              if (
                !base &&
                o.isMesh &&
                o.material &&
                o.material.map &&
                o.material.name === "default"
              )
                base = o.material;
            });
          if (!base) return ok(null);
          SCAN_MAT = base;
          const done = (t) => {
            const b = base.map;
            t.flipY = false;
            t.colorSpace = b.colorSpace;
            t.wrapS = b.wrapS;
            t.wrapT = b.wrapT;
            t.magFilter = b.magFilter;
            t.minFilter = b.minFilter;
            t.anisotropy = b.anisotropy;
            t.needsUpdate = true;
            const m = base.clone();
            m.map = t;
            m.userData.livery = key;
            ok(m);
          };
          const file = ASSET("orbiter-" + key + ".webp"),
            fail = () => {
              console.warn(
                `Livery ${key} could not be loaded; the orbiter keeps the scan's markings.`,
              );
              ok(null);
            };
          // as the glTF loader reads the scan's own maps: decoded off the main thread where the browser can, not flipped
          const safari = /^((?!chrome|android).)*safari/i.test(
            navigator.userAgent,
          );
          if (typeof createImageBitmap === "function" && !safari)
            new THREE.ImageBitmapLoader()
              .setOptions({ premultiplyAlpha: "none" })
              .load(
                file,
                (bmp) => done(new THREE.Texture(bmp)),
                undefined,
                fail,
              );
          else new THREE.TextureLoader().load(file, done, undefined, fail);
        }),
    );
  return LIVERIES[key];
}
// the scan's parts in a model take the livery's material (when it has arrived)
function wearLivery(g, id) {
  orbiterLivery(id).then((m) => {
    if (m)
      g.traverse((o) => {
        if (o.isMesh && o.material === SCAN_MAT) o.material = m;
      });
  });
}
// The orbiter: the scan's body, doors (swung open 175.5° in orbit) and landing gear, with the payload bay's lining, the robot
// arm and the payloads; the built-in model until the scan arrives (or if it cannot be loaded).
function buildOrbiter(flags = {}) {
  const fb = orbiterBuiltIn(flags),
    open = flags.bay === "open";
  fb.userData.wingtips = [
    [-11.9, 2.3, -2.5],
    [11.9, 2.3, -2.5],
  ]; // the wing tips' trailing corners in the orbiter's frame (the wing lies low on the fuselage, 2.45 m below the axis), for the vortex trails of the glide home (app/49_contrail.js)
  const g = detailPart("orbiter", "body", fb, {
    extra: (d) => {
      const P = DETAIL.ready.orbiter,
        doors = {};
      for (const [k, side] of [
        ["doorL", -1],
        ["doorR", 1],
      ])
        if (P[k]) {
          const n = P[k].clone();
          if (open) n.rotation.y = side * SH_DOOR.open;
          d.add(n);
          doors[k] = n;
        }
      if (flags.gear && P.gear) d.add(P.gear.clone());
      else if (!flags.gear) d.add(shuttleWellCovers());
      d.userData.doors = doors;
      d.userData.rig = orbiterFittings(d, flags, SH_BAY_SCAN);
      wearLivery(d, flags.orbiter);
    },
  });
  // doors and arm in motion (bay doors opening or closing from flags.bayT, the deploy from flags.armT)
  if (flags.bayT != null || flags.armT)
    g.userData.animate = (t) => {
      const D = g.userData.doors,
        [aL, aR] = bayDoorAngles(flags, t);
      if (D && flags.bayT != null) {
        if (D.doorL) D.doorL.rotation.y = -aL;
        if (D.doorR) D.doorR.rotation.y = aR;
      }
      if (g.userData.rig) g.userData.rig.userData.update(t);
    };
  return g;
}
// Payload bay doors in motion. Each swings out about its hinge on the sill, its free edge rising off the centreline and over
// the side (a turn about +Y of +angle for the right door, −angle for the left). The right door's edge laps over the left's
// on the centreline, so the right door opens first and closes last. Opening, from bayT: the latches let go (60 s), the
// right door swings open (63 s), and 15 s later the left; closing, from bayT: the left door, then the right, then the
// latches. The angles [left, right] at t (0 = shut).
const SH_DOOR = { latch: 60, swing: 63, gap: 15, open: 175.5 * DEG };
function bayDoorAngles(flags, t) {
  const A = SH_DOOR.open,
    sw = (x) => smoothstep(clamp(x / SH_DOOR.swing, 0, 1));
  if (flags.bayT == null) return flags.bay === "open" ? [A, A] : [0, 0];
  const d = t - flags.bayT;
  if (flags.bay === "open")
    return [
      A * sw(d - SH_DOOR.latch - SH_DOOR.swing - SH_DOOR.gap),
      A * sw(d - SH_DOOR.latch),
    ];
  return [A * (1 - sw(d)), A * (1 - sw(d - SH_DOOR.swing - SH_DOOR.gap))];
}
function orbiterBuiltIn(flags) {
  const g = new THREE.Group(),
    open = flags.bay === "open";
  g.add(shuttleFuselage());
  g.add(shuttleWing(1));
  g.add(shuttleWing(-1));
  g.add(shuttleFin());
  g.add(shuttleOmsPod(1));
  g.add(shuttleOmsPod(-1));
  const doorR = shuttleBayDoor(1, open),
    doorL = shuttleBayDoor(-1, open);
  g.add(doorR);
  g.add(doorL);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(6.3, 2.6, 0.42), vcMat());
  paintGeo(flap.geometry, (x, y, z, nx, ny, nz) =>
    nz > 0.5 ? SH_COL.white : SH_COL.black,
  );
  flap.position.set(0, -1.3, -2.38);
  g.add(flap); // body flap
  g.add(shuttleMainEngines());
  for (const [x, ey, z] of SH_OMSE) {
    const b = bell(
      1.45,
      0.58,
      mat("#5a5d62", "metal", { side: THREE.DoubleSide }),
    );
    b.position.set(x, ey, z);
    g.add(b);
  }
  g.add(shuttleGear(!!flags.gear));
  const rig = orbiterFittings(g, flags, SH_BAY_BUILTIN);
  // mounts: three main engines (used by the launch stack) and the two OMS engines; plumes along −Y
  const mounts = SH_SSME.map(([x, y, z]) => ({
    y,
    x,
    z,
    r: 1.145,
    tag: "ssme",
  })).concat(SH_OMSE.map(([x, y, z]) => ({ y, x, z, r: 0.58, tag: "OMS" })));
  g.userData = {
    len: 32.75,
    mounts,
    nose: true,
    yc0: 14.7,
    capsuleR: 5,
    doors: { doorL, doorR },
    rig,
  };
  return g;
}
// what goes in and on the payload bay, for a bay of geometry B: lining, payloads, the robot arm (and Hubble on it), drag chute
// (returns the deploy rig when the arm is in motion)
function orbiterFittings(g, flags, B) {
  g.add(shuttleBayInterior(B));
  if (flags.pay) g.add(shuttlePayload(flags.pay, {}, B));
  if (flags.orbiter === "OV-104" || flags.pay === "mplm" || flags.ods)
    g.add(shuttlePayload(null, { ods: true, obss: true }, B));
  let rig = null;
  if (flags.armT) {
    rig = deployRig(flags, B);
    g.add(rig);
  } else {
    const arm = shuttleRMS(flags.rms || "stowed", B);
    g.add(arm);
    if (flags.payArm) {
      const h = hubbleModel({ arrays: !!flags.payArrays });
      h.rotation.x = Math.PI / 2;
      h.position.copy(arm.userData.wrist).add(new THREE.Vector3(0, 1.8, 3.0));
      g.add(h);
    }
  } // held upright, aperture away from the bay
  if (flags.dragChute) g.add(shuttleChute());
  return rig;
}
// the stack on the pad and during ascent: tank in the middle, boosters on its sides (±X), orbiter on −Z
const SH_STACK = { orbY: -1.0, orbZ: -8.55 }; // orbiter reference plane 336.5 in from the tank's
function buildShuttleStack(L, c) {
  const g = new THREE.Group(),
    mounts = [],
    ET = L.stages[1],
    SRB = L.stages[0];
  const white = c.variant === "sts1";
  const etStage = buildStage(
    white
      ? {
          ...ET,
          geom: ET.geom.map((p) => [
            p[0],
            p[1],
            p[2],
            p[3] === "#4a4a4a" ? p[3] : "#e9e7e0",
            p[4],
          ]),
        }
      : ET,
    { white },
  );
  g.add(etStage.group);
  for (const s of [-1, 1]) {
    const bp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2.0, 8),
      mat("#9aa0a6", "metal"),
    );
    bp.rotation.x = Math.PI / 2;
    bp.rotation.y = s * 0.35;
    bp.position.set(s * 0.35, SH_STACK.orbY + 28.6, -5.1);
    g.add(bp);
  } // forward bipod
  if (c.boosters)
    for (const s of [-1, 1]) {
      const b = buildStage(SRB);
      b.group.position.set(s * SRB.booster.offset, SRB.booster.y0, 0);
      if (s < 0) b.group.scale.x = -1;
      g.add(b.group); // the left booster is the right one's mirror image
      mounts.push({
        y: SRB.booster.y0 - SRB.eng.len,
        x: s * SRB.booster.offset,
        z: 0,
        r: 1.5,
        tag: "stage:SRB",
        prop: "solid",
        idx: 0,
      });
    }
  const orb = buildOrbiter({ bay: "closed", gear: false, orbiter: c.orbiter });
  orb.rotation.y = Math.PI;
  orb.position.set(0, SH_STACK.orbY, SH_STACK.orbZ);
  g.add(orb);
  for (const m of orb.userData.mounts.filter((m) => m.tag === "ssme"))
    mounts.push({
      y: SH_STACK.orbY + m.y,
      x: -m.x,
      z: SH_STACK.orbZ - m.z,
      r: m.r,
      tag: "stage:ET",
      prop: "hydrolox",
      idx: 1,
    });
  g.userData = { len: 46.9, mounts };
  return g;
}
// International Space Station as in July 2011. Axes: +Y forward (direction of flight), +Z zenith, X along the main truss
// (+X starboard). The docking port (PMA-2 on Harmony) faces +Y at ISS_DOCK; the origin is 21.5 m behind it on the axis of
// the US modules. Drawn with NASA's model (assets/iss.glb: the IGOAL lab's model set back to 2011 by tools/models); the
// built-in one below stands in while it loads.
const ISS_DOCK = [0, 21.5, 0]; // m, PMA-2 docking interface

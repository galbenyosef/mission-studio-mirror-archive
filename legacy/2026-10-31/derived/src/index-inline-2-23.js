// index-inline-2 23 — add
// Lines 6386-6729 of readable/index-inline-2.pretty.js (statement-aligned).
function buildOrbiter(flags = {}) {
  const fb = orbiterBuiltIn(flags),
    open = flags.bay === "open";
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
function issModel(flags = {}) {
  return detailPart("iss", "iss", issBuiltIn(flags), {
    extra: (g) => {
      if (flags.mplm) g.add(issMplm());
    },
  });
}
// the logistics module (Raffaello on STS-135) on Harmony's nadir port
function issMplm() {
  const g = new THREE.Group(),
    m = mat("#e7e5df", "paint");
  const c = cyl(2.25, 2.25, 4.9, m, 32);
  c.position.y = -4.9 / 2;
  g.add(c);
  const a = cyl(2.25, 1.1, 0.8, mat("#d5d3cc", "paint"), 32);
  a.position.y = 2.45;
  g.add(a); // the berthing end, up against Harmony
  const b = cyl(1.6, 2.25, 0.6, mat("#d5d3cc", "paint"), 32);
  b.position.y = -3.05;
  g.add(b);
  g.rotation.x = Math.PI / 2;
  g.position.set(0, 15.0, -2.2 - 3.25);
  return g;
}
function issBuiltIn(flags = {}) {
  const g = new THREE.Group(),
    white = mat("#e9e8e3", "paint"),
    metal = mat("#b8bcc1", "metal"),
    arr = mat("#a77a3a", "solar"),
    rad = mat("#f2f2ee", "paint", { side: THREE.DoubleSide });
  const yT = 7.3; // the integrated truss sits on top of the Destiny laboratory
  const T = new THREE.Mesh(new THREE.BoxGeometry(109, 3.6, 3.6), metal);
  T.position.set(0, yT, 5.6);
  g.add(T);
  for (const s of [-1, 1])
    for (const x0 of [33, 46])
      for (const dz of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.08, 34), arr);
        w.position.set(s * x0, yT, 5.6 + dz * 19.5);
        g.add(w); // solar array wings (each pair 73 m tip to tip)
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 34, 6),
          metal,
        );
        mast.rotation.x = Math.PI / 2;
        mast.position.set(s * x0, yT - 0.2, 5.6 + dz * 19.5);
        g.add(mast);
      }
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 13), rad);
      r.position.set(s * (14 + k * 3.4), yT, 5.6 - 8.5);
      g.add(r);
    } // radiators
  const mod = (r, len, y, x = 0, z = 0, rx = 0, rz = 0, m = white) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), m);
    c.position.set(x, y, z);
    c.rotation.set(rx, 0, rz);
    g.add(c);
    return c;
  };
  mod(2.2, 7.2, 15.1); // Harmony
  mod(1.1, 2.8, 20.1, 0, 0, 0, 0, metal); // PMA-2
  mod(2.2, 8.5, 7.3); // Destiny
  mod(2.2, 5.5, 0.6); // Unity
  mod(2.05, 12.6, -8.6); // Zarya
  mod(2.1, 13.1, -21.5); // Zvezda
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.06, 3.2),
      mat("#1d2a4a", "solar"),
    );
    w.position.set(s * 7.4, -24.5, 0);
    g.add(w);
  }
  mod(2.25, 6.9, 15.1, 5.6, 0, 0, Math.PI / 2); // Columbus (starboard)
  mod(2.2, 11.2, 15.1, -7.8, 0, 0, Math.PI / 2); // Kibo (port)
  mod(2.2, 6.7, 0.6, -5.6, 0, 0, Math.PI / 2); // Tranquility
  if (flags.mplm) mod(2.25, 6.6, 15.1, 0, -2.2 - 3.3, Math.PI / 2, 0); // the logistics module on Harmony's nadir port
  g.userData.len = 60;
  g.userData.yc0 = 0;
  return g;
}

// ==== 33_mars2020.js
// ============================================================================
// Mars 2020's flight system apart from the rover (metres): the cruise stage, the aeroshell (heat shield and backshell) and
// the descent stage, the "sky crane". Mars 2020 was built to Mars Science Laboratory's drawings, so the shapes are MSL's.
// Axes: +Y along the axis from the heat shield's nose (Y = 0) toward the cruise stage; the heat shield leads into the air.
// The parts' proportions and layout follow NASA's exploded drawing of the spacecraft (PIA24128) and photographs of it
// being put together (PIA23887, PIA23886; MSL's descent stage, PIA11425).
//
// Aeroshell (MSL entry papers: Edquist 2009, Johansen 2011, Schoenenberger 2013): 4.5 m across. The heat shield is a 70°
// sphere-cone (nose radius 1.125 m) rounded at its shoulder (radius 0.126 m), 0.835 m from the nose to its widest point,
// covered in about a hundred PICA tiles (dark) with filled gaps between them. The backshell, painted white, is two cones
// (half-angles 36.9° and 59.7°, meeting at the 3.04 m "hip") up to the backshell interface plate (1.31 m across); on it the
// 29° parachute closeout cone and its lid, which the parachute is fired through, 3.0 m from the nose. A row of round ports
// and an access panel on the lower cone, a gold-rimmed port on the upper cone, bolts round the interface plate.
// Cruise stage: a disc as wide as the aeroshell, its outward face covered in solar cells, bolted to the interface plate
// round the parachute cone; ten radiator panels hang from its rim toward the aeroshell, so that it looks like a drum. Inside
// it: two propellant tanks, the cooling loop's pipes, electronics in gold blankets; two clusters of four thrusters on
// struts below the rim, on opposite sides; the medium-gain antenna's horn in a gap between two radiators. The cruise stage
// and the aeroshell together are 3.0 m tall (MSL launch press kit).
// Descent stage: a tapered octagonal frame, wider at its foot, holding three propellant tanks and two pressurant tanks in
// blankets; below its centre a keel with the bridle device at its point; eight throttleable engines in pairs on outriggers
// at the four diagonals, one of each pair canted 5° outboard and the other 22.5°; the radar's six antennas on a plate on one
// side. The rover hangs under the keel with its wheels folded up beside its body until it is lowered on three bridles and
// an umbilical, 6.4 m long (Perseverance's: Curiosity's were 7.5 m).
// ============================================================================
const M20 = { mats: {} };
// the profile [r, y] of the aeroshell's outer surface, resampled evenly along its length (so a texture's rows follow it)
function m20Resample(pts, n) {
  const L = [0];
  for (let i = 1; i < pts.length; i++)
    L.push(
      L[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L[L.length - 1] * k) / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / Math.max(L[j + 1] - L[j], 1e-9);
    out.push([
      pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f,
      pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f,
    ]);
  }
  out.len = L[L.length - 1];
  out.at = (s) => {
    let i = 0;
    while (i < L.length - 2 && L[i + 1] < s) i++;
    const f = (s - L[i]) / Math.max(L[i + 1] - L[i], 1e-9);
    return [
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ];
  };
  out.sOf = L;
  return out;
}
// heat shield: nose sphere to its tangent cone (20° from the axis), the 70° cone, the shoulder round to the seal with the backshell

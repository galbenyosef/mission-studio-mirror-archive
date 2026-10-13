// index-inline-2 22 — three
// Lines 6038-6385 of readable/index-inline-2.pretty.js (statement-aligned).
function shuttleChute() {
  // 40-ft (12 m) ring-sail drag chute trailing behind the tail on a long riser
  const g = new THREE.Group();
  const c = new THREE.Mesh(
    new THREE.SphereGeometry(6.1, 24, 8, 0, TAU, 0, Math.PI / 2.3),
    patternMat("chute", "#e0662c"),
  );
  c.rotation.x = Math.PI;
  c.position.set(0, -40, 3.2);
  g.add(c); // crown trailing aft, mouth facing the orbiter
  const yM = -40 - 6.1 * Math.cos(Math.PI / 2.3),
    rM = 6.1 * Math.sin(Math.PI / 2.3);
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    pts.push(
      new THREE.Vector3(Math.cos(a) * rM, yM, 3.2 + Math.sin(a) * rM),
      new THREE.Vector3(0, -13.0, 2.6),
    );
  }
  pts.push(new THREE.Vector3(0, -13.0, 2.6), new THREE.Vector3(0, -1.6, 2.9));
  g.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );
  return g;
}
// Robot arm (Canadarm) on the port sill: the shoulder near the front of the bay, the upper boom 6.37 m and the lower boom
// 7.06 m to the wrist, then the wrist joints and end effector, 1.6 m, on to a grapple fixture. armRig(B): userData.pose(W,
// dir) bends it to put the wrist at W (or as near as it reaches), elbow up, the end effector along dir (else on along the
// lower boom). shuttleRMS: the arm in a fixed pose.
const RMS = { l1: 6.37, l2: 7.06, ee: 1.6 };
function rmsShoulder(B) {
  return new THREE.Vector3(-B.wall + 0.22, 22.9, B.hz + 0.25);
} // on the port sill, under the closed door
function armRig(B = SH_BAY_BUILTIN) {
  const g = new THREE.Group(),
    m = mat("#ecebe5", "paint"),
    jm = mat("#9aa0a6", "metal"),
    S = rmsShoulder(B);
  const rod = (r, mm) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), mm);
    g.add(c);
    return c;
  };
  const up = rod(0.19, m),
    lo = rod(0.17, m),
    ee = rod(0.2, jm);
  const J = [0, 1, 2].map(() => {
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), jm);
    g.add(j);
    return j;
  });
  const Y = new THREE.Vector3(0, 1, 0),
    Z = new THREE.Vector3(0, 0, 1),
    u = new THREE.Vector3(),
    side = new THREE.Vector3(),
    perp = new THREE.Vector3();
  const E = new THREE.Vector3(),
    Wr = new THREE.Vector3(),
    Tip = new THREE.Vector3(),
    d0 = new THREE.Vector3();
  const place = (c, A, P) => {
    c.scale.y = Math.max(A.distanceTo(P), 1e-3);
    c.position.copy(A).add(P).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(Y, d0.copy(P).sub(A).normalize());
  };
  g.userData.pose = (W, dir) => {
    u.copy(W).sub(S);
    const d = Math.min(u.length(), RMS.l1 + RMS.l2 - 0.005);
    u.normalize();
    side.crossVectors(u, Z);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    perp.crossVectors(side, u).normalize();
    if (perp.z < 0) perp.negate();
    const a = Math.acos(
      clamp(
        (RMS.l1 * RMS.l1 + d * d - RMS.l2 * RMS.l2) / (2 * RMS.l1 * d),
        -1,
        1,
      ),
    );
    E.copy(S)
      .addScaledVector(u, RMS.l1 * Math.cos(a))
      .addScaledVector(perp, RMS.l1 * Math.sin(a));
    Wr.copy(S).addScaledVector(u, d); // the wrist, where the arm reaches
    Tip.copy(Wr).addScaledVector(
      dir ? d0.copy(dir).normalize() : d0.copy(Wr).sub(E).normalize(),
      RMS.ee,
    );
    place(up, S, E);
    place(lo, E, Wr);
    place(ee, Wr, Tip);
    J[0].position.copy(S);
    J[1].position.copy(E);
    J[2].position.copy(Wr);
    g.userData.wrist = Wr;
  };
  return g;
}
function shuttleRMS(pose, B = SH_BAY_BUILTIN) {
  const g = armRig(B),
    S = rmsShoulder(B);
  g.userData.pose(
    pose === "raised"
      ? new THREE.Vector3(0.4, 14.5, 11.6)
      : pose === "grapple"
        ? new THREE.Vector3(0, 11.3, 3.0)
        : new THREE.Vector3(S.x, 8.9, S.z),
  );
  g.userData.wrist = g.userData.wrist.clone();
  return g;
}
// The Hubble deploy in motion (STS-31), from the mission's timeline: flags.armT, absolute times of the grapple (gr), the
// unberth (un), the arrays (arr) and the release (rel). Over the 25 minutes before the grapple the arm unstows and reaches
// down to the telescope's grapple fixture. From the unberth it lifts the telescope straight up out of the bay, 2.8 m in
// 8 minutes, clear of the sills (a few centimetres to spare), then in 20 minutes swings it upright above the bay, aperture
// to space. The solar arrays and antennas unfurl over 12 minutes from the arrays time. After the release the end effector
// backs off along the fixture and, half an hour later, the arm folds back onto the sill. The telescope is drawn here until
// the release (flags.armPay); from then on it flies on its own.
const HST_BAY = {
  p: new THREE.Vector3(0, 14.3, -0.05),
  q: new THREE.Quaternion(),
}; // in the bay, aperture forward
const HST_LIFT = {
  p: new THREE.Vector3(0, 14.3, 2.75),
  q: new THREE.Quaternion(),
};
const HST_UP = {
  p: new THREE.Vector3(0, 17.5, 12.0),
  q: new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  ),
}; // released here
const HST_GRASP = new THREE.Vector3(0, -3.0, 4.15); // the wrist, in the telescope's frame: out along the grapple fixture at (0, −3.0, 2.3)
function deployRig(flags, B) {
  const T = flags.armT,
    g = new THREE.Group(),
    arm = armRig(B);
  g.add(arm);
  const S = rmsShoulder(B),
    Wst = new THREE.Vector3(S.x, 8.9, S.z),
    V = () => new THREE.Vector3();
  const hub = flags.armPay
    ? hubbleModel({ arrays: true, deployable: true })
    : null;
  if (hub) g.add(hub);
  const grasp = (P, out) => out.copy(HST_GRASP).applyQuaternion(P.q).add(P.p);
  const Wgr = grasp(HST_BAY, V()),
    Whov = Wgr.clone().add(new THREE.Vector3(0, 0, 1.5)),
    Wup = grasp(HST_UP, V());
  const fixUp = new THREE.Vector3(0, 0, 1).applyQuaternion(HST_UP.q),
    Wback = Wup.clone().addScaledVector(fixUp, 1.6);
  const P = { p: V(), q: new THREE.Quaternion() },
    W = V(),
    dir = V(),
    lift = V();
  const sm = (t, a, b) => smoothstep(clamp((t - a) / (b - a), 0, 1));
  const arc = (A, Bv, f, h, out) =>
    out.lerpVectors(A, Bv, f).add(lift.set(0, 0, h * Math.sin(Math.PI * f))); // up over the sill on the way
  g.userData.update = (t) => {
    if (t < T.un + 480) {
      P.p.lerpVectors(HST_BAY.p, HST_LIFT.p, sm(t, T.un, T.un + 480));
      P.q.copy(HST_BAY.q);
    } else {
      const f = sm(t, T.un + 480, T.un + 1680);
      P.p.lerpVectors(HST_LIFT.p, HST_UP.p, f);
      P.q.slerpQuaternions(HST_LIFT.q, HST_UP.q, f);
    }
    if (hub) {
      hub.position.copy(P.p);
      hub.quaternion.copy(P.q);
      hub.userData.deploy(clamp((t - T.arr) / 720, 0, 1));
    }
    let reach = true; // the end effector lined up on the fixture (reaching for it, holding it, just let go of it)
    if (t < T.gr - 1500) {
      W.copy(Wst);
      reach = false;
    } else if (t < T.gr - 300) {
      arc(Wst, Whov, sm(t, T.gr - 1500, T.gr - 300), 3.0, W);
      reach = false;
    } else if (t < T.gr) W.lerpVectors(Whov, Wgr, sm(t, T.gr - 300, T.gr));
    else if (t < T.rel) grasp(P, W);
    else if (t < T.rel + 180)
      W.lerpVectors(Wup, Wback, sm(t, T.rel, T.rel + 180));
    else {
      arc(Wback, Wst, sm(t, T.rel + 1800, T.rel + 3000), 2.0, W);
      reach = false;
    }
    arm.userData.pose(
      W,
      reach
        ? dir.set(0, 0, -1).applyQuaternion(t < T.rel ? P.q : HST_UP.q)
        : null,
    );
  };
  g.userData.update(T.gr - 3600);
  return g;
}
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

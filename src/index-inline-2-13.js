// index-inline-2 13 — add
// Lines 3403-3707 of readable/index-inline-2.pretty.js (statement-aligned).
const ROVER_STOW = [
  // wheel0 … wheel5 (rear, middle, front; left, right): its centre when stowed, and its turn (x, y, z, rad)
  [
    [-0.97, 0.97, -1.02],
    [0.35, 0, 0.3],
  ],
  [
    [0.97, 0.97, -1.02],
    [0.35, 0, -0.3],
  ],
  [
    [-1.0, 0.98, -0.07],
    [0, 0, 0.15],
  ],
  [
    [1.0, 0.98, -0.07],
    [0, 0, -0.15],
  ],
  [
    [-0.97, 0.97, 0.98],
    [-0.35, 0, 0.3],
  ],
  [
    [0.97, 0.97, 0.98],
    [-0.35, 0, -0.3],
  ],
];
function roverD(landed, stowed) {
  let f = stowed ? 0 : 1,
    legs = null;
  const W = [],
    q0 = new THREE.Quaternion();
  const pose = () => {
    for (const w of W) {
      w.piv.position.lerpVectors(w.p1, w.p0, f);
      w.piv.quaternion.slerpQuaternions(w.q1, q0, f);
    }
    if (legs) legs.visible = f > 0.85;
  };
  const g = detailPart("perseverance", "body", rover(1), {
    extra: (g) => {
      const P = DETAIL.ready.perseverance;
      for (let i = 0; i < 6; i++)
        if (P["wheel" + i]) {
          // each wheel in a pivot of its own (the wheel itself turns as it rolls)
          const w = P["wheel" + i].clone(),
            piv = new THREE.Group();
          piv.position.copy(w.position);
          w.position.set(0, 0, 0);
          piv.add(w);
          g.add(piv);
          W.push({
            piv,
            p0: piv.position.clone(),
            p1: new THREE.Vector3(...ROVER_STOW[i][0]),
            q1: new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...ROVER_STOW[i][1]),
            ),
          });
        }
      if (P.legs) {
        legs = P.legs.clone();
        g.add(legs);
      }
      if (P.mast) {
        const m = P.mast.clone(),
          d = m.userData.deploy;
        if (landed && d)
          m.quaternion.setFromAxisAngle(
            new THREE.Vector3(d[0], d[1], d[2]),
            d[3],
          );
        g.add(m);
      }
      pose();
    },
  });
  g.userData.mobility = (x) => {
    if (x !== f) {
      f = x;
      pose();
    }
  };
  return g;
}
function lmDescentD(landed) {
  return detailPart("apollo_lm", "descent", lmDescent(landed));
}
// Saturn V: a textured model (CC BY: BoldlyBuilding, credited in the README and the app), cut into its stages and stretched
// to their published lengths by tools/models; a stage of a launcher with detail: <file> is its part of that file, named
// after the stage, in the stage's own frame. The S-II's aft interstage is a part of its own, there until it is dropped.
// The model is a shell: where it is cut the stages are open, and the J-2s inside the interstages are not in it. These are
// added: a bulkhead or heat shield across each open end ([y, r, kind]) and the bells.
const STAGE_D = {
  "saturnv:S-IC": { caps: [[38.6, 5.0, "metal"]] }, // the forward bulkhead, under the top of the forward skirt
  "saturnv:S-II": {
    caps: [
      [5.52, 5.0, "dark"],
      [24.87, 5.0, "metal"],
    ],
    bells: true,
  }, // the heat shield at the base of the aft skirt; the forward bulkhead inside the cone
  "saturnv:S-IVB": {
    caps: [
      [0.3, 3.25, "dark"],
      [14.47, 3.25, "metal"],
    ],
    bells: true,
  }, // the thrust structure above the cone; the top of the instrument unit
  "ariane5:EPC": { caps: [[30.45, 2.65, "metal"]] }, // the forward dome, seen once the upper stage has gone
  "ariane5:ESC-A": { caps: [[0.05, 2.65, "dark"]], bells: true }, // its HM7B, hidden in the core's top until separation
};
// Space Shuttle: the external tank and the boosters of a CC BY model of the stack (paburoviii, credited in the README and the
// app), scaled to their published sizes by tools/models; the orbiter is the Smithsonian's scan. STS-1 and STS-2 flew tanks
// painted white (opts.white): the foam's colour map turns to white paint over the same foam, its texture and the darker
// intertank showing through more faintly (0.188: the map's mean luminance).
const ET_WHITE = new WeakMap();
function etWhite(foam) {
  let m = ET_WHITE.get(foam);
  if (m) return m;
  m = foam.clone();
  m.roughness = 0.6;
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = vec3(0.79, 0.776, 0.716) * mix(1.0, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / 0.188, 0.55);",
    );
  };
  m.customProgramCacheKey = () => "etWhite";
  ET_WHITE.set(foam, m);
  return m;
}
function stageD(st, fallback, opts) {
  const D = STAGE_D[st.detail + ":" + st.id] || {};
  return detailPart(st.detail, st.id, fallback, {
    extra: (g) => {
      const P = DETAIL.ready[st.detail];
      if (opts.white)
        g.traverse((o) => {
          if (
            o.isMesh &&
            o.material &&
            o.material.map &&
            /Orange/.test(o.material.name)
          )
            o.material = etWhite(o.material);
        });
      if (P.IST && st.geom[0][4] && st.geom[0][4].ist && opts.ist !== false)
        g.add(P.IST.clone());
      for (const [y, r, kind] of D.caps || []) {
        const c = cyl(
          r,
          r,
          0.06,
          kind === "dark" ? mat("#2e3135", "dark") : mat("#9a9fa5", "metal"),
          32,
        );
        c.position.y = y - 0.03;
        g.add(c);
      }
      if (D.bells)
        for (const p of engineLayout(st.eng)) {
          const b = bell(st.eng.len, st.eng.r);
          b.position.set(p[0], st.eng.y0 ?? -st.eng.len, p[1]);
          g.add(b);
        }
    },
  });
}
function lmAscentD() {
  return detailPart("apollo_lm", "ascent", lmAscent(), {
    y: -0.195,
    extra: (g) => {
      const b = bell(0.75, 0.39);
      b.position.y = -0.85;
      g.add(b);
    },
  });
}
function solarWing(len, width, panels, color = "#1b2a4a") {
  const g = new THREE.Group();
  const pw = len / panels;
  for (let i = 0; i < panels; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(pw * 0.96, 0.05, width),
      mat(color, "solar"),
    );
    p.position.x = pw * (i + 0.5);
    g.add(p);
  }
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.08, 0.08),
    mat("#9aa0a6", "metal"),
  );
  boom.position.x = len / 2;
  g.add(boom);
  return g;
}
function orionCM(withLAS) {
  const g = new THREE.Group();
  const cm = cyl(2.51, 0.75, 3.3, mat("#b7bcc2", "metal"));
  g.add(cm);
  const hs = cyl(2.52, 2.51, 0.2, mat("#5a3b22", "dark"));
  hs.position.y = -0.2;
  g.add(hs);
  const win = box(0.35, 0.3, 0.05, mat("#0a0c10", "glass"));
  win.position.set(0, 1.6, 1.62);
  g.add(win);
  if (withLAS) {
    const fair = cyl(2.6, 0.7, 3.9, mat("#ecebe6"));
    fair.position.y = -0.1;
    g.add(fair);
    const tower = cyl(0.45, 0.45, 9.0, mat("#ecebe6"));
    tower.position.y = 3.8;
    g.add(tower);
    const nose = cyl(0.45, 0.05, 1.6, mat("#ecebe6"));
    nose.position.y = 12.8;
    g.add(nose);
    for (let k = 0; k < 4; k++) {
      const nz = cyl(0.25, 0.4, 0.6, mat("#2b2b2b", "dark"));
      const a = (k * Math.PI) / 2;
      nz.position.set(Math.cos(a) * 0.5, 4.3, Math.sin(a) * 0.5);
      g.add(nz);
    }
  }
  g.userData.len = withLAS ? 14.4 : 3.5;
  g.userData.r = 2.51;
  return g;
}
function orionESM(folded) {
  const g = new THREE.Group();
  const body = cyl(2.05, 2.05, 4.0, mat("#e9e7e2", "paint"));
  g.add(body);
  const top = cyl(2.05, 2.5, 0.6, mat("#d6d6d0", "paint"));
  top.position.y = 4.0;
  g.add(top);
  if (!folded)
    for (let k = 0; k < 4; k++) {
      const w = solarWing(7.0, 2.0, 3);
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      w.position.set(Math.cos(a) * 2.05, 1.2, Math.sin(a) * 2.05);
      w.rotation.y = -a;
      w.rotation.z = -0.35;
      g.add(w);
    }
  const b = bell(1.9, 0.6);
  b.position.y = -1.9;
  g.add(b);
  g.userData.len = 4.6;
  g.userData.engineY = -1.9;
  g.userData.engineR = 0.6;
  return g;
}
function probeBus(w, hgt, d, color = "#c9a043", kind = "gold") {
  return box(w, hgt, d, mat(color, kind));
}
function dish(r, color = "#ececec") {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 10, 0, TAU, 0, Math.PI / 3.2),
    mat(color, "paint", { side: THREE.DoubleSide }),
  );
  return m;
}
function legsQuad(r, h2, color = "#c9a043") {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const p0 = new THREE.Vector3(
        Math.cos(a) * r * 0.7,
        0.3,
        Math.sin(a) * r * 0.7,
      ),
      p1 = new THREE.Vector3(Math.cos(a) * r * 1.5, -h2, Math.sin(a) * r * 1.5);
    const s = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
      mat(color, "gold"),
    );
    s.scale.y = p0.distanceTo(p1);
    s.position.copy(p0).add(p1).multiplyScalar(0.5);
    s.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      p1.clone().sub(p0).normalize(),
    );
    g.add(s);
    const pad = cyl(0.22, 0.22, 0.05, mat(color, "gold"));
    pad.position.copy(p1);
    g.add(pad);
  }
  return g;
}
function aeroshell(r, backH, color = "#e9e6df") {
  const g = new THREE.Group();
  const hs = cyl(r, r * 0.25, r * 0.36, mat("#6b4a2c", "dark"));
  hs.rotation.x = Math.PI;
  hs.position.y = r * 0.36;
  g.add(hs); // 70° sphere-cone, nose down
  const bs = cyl(r, r * 0.42, backH, mat(color, "paint"));
  bs.position.y = r * 0.36;
  g.add(bs);
  const cap = cyl(r * 0.42, r * 0.3, backH * 0.2, mat(color, "paint"));
  cap.position.y = r * 0.36 + backH;
  g.add(cap);
  g.userData.len = r * 0.36 + backH * 1.2;
  return g;
}

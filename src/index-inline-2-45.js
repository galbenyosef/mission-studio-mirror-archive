// index-inline-2 45 — three
// Lines 12459-12708 of readable/index-inline-2.pretty.js (statement-aligned).
const MV = {
  md: null,
  crafts: [],
  trails: [],
  caps: [],
  capInfo: [],
  frame: "earth",
  frameSel: "auto",
  layers: {},
  labels: [],
  vecs: [],
  tNow: 0,
};
const PROP_LOOK = {
  // plume look per propellant: [intensity, diamonds, core]
  kerolox: [1.25, 0.25, "#fff2c8"],
  solid: [1.5, 0.15, "#fffbe8"],
  hydrolox: [0.55, 0.9, "#e8f2ff"],
  methalox: [0.8, 0.6, "#eef0ff"],
  hypergolic: [0.5, 0.0, "#fff0dc"],
  udmh: [0.6, 0.1, "#fff0dc"],
  mmh: [0.45, 0.0, "#fff2e6"],
  hydrazine: [0.3, 0.0, "#f4f8ff"],
  xenon: [0.4, 0, "#e0e8ff"],
};
function disposeTree(o) {
  o.traverse((n) => {
    if (n.userData.keep) return;
    if (n.geometry) n.geometry.dispose();
    if (
      n.material &&
      !Object.values(MATS).includes(n.material) &&
      !Object.values(TEX).includes(n.material)
    ) {
      if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
      else n.material.dispose();
    }
  });
}
function clearMissionView() {
  for (const c of MV.crafts) {
    contrailDispose(c);
    R.scene.remove(c.node);
    disposeTree(c.node);
    c.label && c.label.remove();
    if (c.shadow) {
      R.scene.remove(c.shadow);
      c.shadow.geometry.dispose();
      c.shadow.material.dispose();
    }
  }
  if (MV.tracks) {
    MV.tracks.parent && MV.tracks.parent.remove(MV.tracks);
    MV.tracks.geometry.dispose();
    MV.tracks.material.dispose();
    MV.tracks = null;
  }
  for (const tr of MV.trails) tr.dispose();
  for (const cp of MV.caps) {
    cp.parent && cp.parent.remove(cp);
    cp.geometry.dispose();
  }
  if (MV.pad) {
    R.scene.remove(MV.pad);
    disposeTree(MV.pad);
    MV.pad = null;
  }
  disposeExhaust();
  disposeRunway();
  disposeTerrain();
  MV.crafts = [];
  MV.trails = [];
  MV.caps = [];
  MV.capInfo = [];
}
function setupMissionView(md) {
  clearMissionView();
  MV.md = md;
  const M = md.M;
  for (const o of M.objects) {
    const node = new THREE.Group();
    node.visible = false;
    R.scene.add(node);
    const c = {
      o,
      node,
      models: new Map(),
      cur: null,
      curKey: null,
      q: new THREE.Quaternion(),
      qInit: false,
      plumes: [],
      chute: null,
      chuteKey: null,
      plasma: null,
      P: null,
      s: null,
    };
    for (let i = 0; i < 8; i++) {
      const p = makePlume();
      p.visible = false;
      node.add(p);
      c.plumes.push(p);
    }
    c.plasma = makePlasma();
    c.plasma.visible = false;
    node.add(c.plasma);
    const isPrim = o.id === "ship";
    c.label = h(
      "div",
      {
        class: "lbl craft" + (isPrim ? " primary" : ""),
        style: `color:${isPrim ? "var(--amber)" : o.kind === "craft" ? "#7fd1ff" : "#9aa3ad"}`,
      },
      h("span", { class: "dot" }),
      h("span", { class: "nm" }, o.name),
      h("span", { class: "eng" }, "ENGINE ON"),
      h("span", { class: "sub" }),
    );
    c.label.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      setTarget("obj:" + o.id);
    });
    c.label.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.detail === 1) setTarget("obj:" + o.id);
    });
    $("#labels").append(c.label);
    MV.crafts.push(c);
    if (o.trail !== false && o.segs.length && o.kind !== "debris")
      MV.trails.push(new Trail(o, md, isPrim));
  }
  // Earth-orbit flights circle the planet hundreds of times: draw about two orbits behind and one ahead
  const leo = (md.cfg.profile || "").startsWith("leo");
  TRAIL_U.uWinP.value = leo ? 2 * 5560 : 1e12;
  TRAIL_U.uWinF.value = leo ? 5560 : 1e12;
  buildSurfaceCaps(md);
  buildTracks(md);
  buildPad(md);
  buildTerrain(md); // the real ground round the site, where its data is in assets/ (app/43_terrain.js)
  buildExhaust(md); // the trail through the air after liftoff (app/47_exhaust.js)
  MV.frameBuilt = null;
}
function craftById(id) {
  return MV.crafts.find((c) => c.o.id === id);
}

// ---------------- state helpers ----------------
function padState(md, t) {
  // the vehicle standing on the pad before liftoff
  const S = LAUNCH_SITES[md.cfg.site];
  const r = sitePosEcl("earth", S.lat, S.lon, 0, t);
  return {
    ref: "earth",
    r,
    v: vcross(bodyOmegaEcl("earth", t), r),
    m: 0,
    T: 0,
    dir: vunit(r),
    D: [0, 0, 0],
    extra: { phase: "on the pad", alt: 0 },
    pad: true,
    surface: true,
  };
}
function craftState(c, t) {
  let s = c.o.stateAt(t);
  if (!s && c.o.id === "ship" && t < c.o.t0 && t > c.o.t0 - 4 * 3600) {
    s = padState(MV.md, t);
    const s0 = c.o.segs[0] && c.o.segs[0].stateAt(c.o.t0);
    if (s0 && s0.m) s.m = s0.m;
    const ig = padIgnition(MV.md, t); // engines lit, clamps still holding
    if (ig && ig.f > 0) {
      s.T = ig.thrust;
      s.ign = ig;
      s.extra.phase = "ignition";
      s.extra.stage = ig.core;
      s.extra.throttle = ig.f;
    }
  }
  return s;
}
function cfgAt(c, t) {
  const x = c.o.configAt(t);
  if (x) return x.label;
  return c.o.configs.length ? c.o.configs[0].label : null;
}

// ---------------- crafts ----------------
const _q1 = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _q3 = new THREE.Quaternion(),
  _vDock = new THREE.Vector3(),
  _axTumble = new THREE.Vector3(0.3, 0.2, 1).normalize();
const _qHalfY = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI,
);
function basisQuat(nose, upRef, q) {
  const Y = new THREE.Vector3(nose[0], nose[1], nose[2]).normalize();
  let U = new THREE.Vector3(upRef[0], upRef[1], upRef[2]);
  if (Math.abs(U.clone().normalize().dot(Y)) > 0.98)
    U =
      Math.abs(Y.z) < 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(1, 0, 0);
  const X = new THREE.Vector3().crossVectors(Y, U).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  _m4.makeBasis(X, Y, Z);
  return q.setFromRotationMatrix(_m4);
}
function activeMounts(c, s, t, cfgL, model) {
  const out = [];
  if (!(s.T > 0)) return out;
  const mounts = model.userData.mounts || [];
  if (cfgL && cfgL.key === "launch") {
    const st = s.extra && s.extra.stage;
    const L = LAUNCHERS[cfgL.launcher];
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    for (const m of mounts) {
      if (!m.tag.startsWith("stage:")) continue;
      const id = m.tag.slice(6);
      if (id === st) out.push(m);
      else if (bst && id === bst.id && cfgL.boosters) {
        const tb = t - MV.md.M.t0;
        if (tb < 0 && bst.prop === "solid") continue;
        const tEnd = bst.curve
          ? bst.curve.filter((p) => p[1] > 0.1).slice(-1)[0][0] + 1
          : (1.15 * bst.propMass) / (bst.thrustSL / (bst.ispSL * G0));
        if (tb < tEnd) out.push(m);
      } // a thrust curve tells when the solid motors burn out
    }
    return out;
  }
  const b = MV.md.burnAt(t, c.o.id);
  let tag = null;
  if (b) {
    const tk = MV.md.tanks.find((k) => k.engine === b.engine);
    tag = tk ? tk.id : null;
  }
  if (b && /\bRCS\b/.test(b.engine || "") && !tag) return out; // small reaction-control jets: no main-engine plume
  if (cfgL && cfgL.key === "stack") tag = "upper";
  const ms = tag ? mounts.filter((mm) => mm.tag === tag) : []; // every engine of that tank (e.g. the orbiter's two OMS engines)
  if (!ms.length) {
    const m = mounts.find((mm) => mm.tag === "upper") || mounts[0];
    if (m) ms.push(...mounts.filter((mm) => mm.tag === m.tag));
  } // no burn on record (a powered descent): the engines of the first mount's kind
  out.push(...ms);
  return out;
}

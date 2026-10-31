// index-inline-2 38 — ce5
// Lines 10468-10809 of readable/index-inline-2.pretty.js (statement-aligned).
function ce5Assembly(P, flags) {
  const g = new THREE.Group(),
    mounts = [],
    H3 = 3600,
    has = (k) => P.has(k);
  const ascOnLander = (ln) => {
    const a = ce5Ascender();
    a.position.y = CE5.L.H + CE5.A.gap;
    ln.add(a);
    return a;
  };
  const dockedAsc = () => {
    const a = ce5Ascender();
    a.rotation.x = Math.PI;
    a.position.y = CE5.dockY + CE5.A.H;
    return a;
  };
  if (has("orbiter") && has("lander")) {
    const o = ce5Orbiter({
      support: true,
      claws: "open",
      stowed: flags.stowed,
      deployT: flags.deployT,
    });
    g.add(o);
    mounts.push(...o.userData.mounts);
    const ln = ce5Lander();
    ln.position.y = CE5.L.y0;
    g.add(ln);
    ascOnLander(ln);
    for (let k = 0; k < 4; k++) {
      const a = (45 + 90 * k) * DEG;
      g.add(
        m20Bar(
          m20Polar(CE5.D.r - 0.05, a, CE5.D.y + CE5.D.h),
          m20Polar(0.9, a, CE5.L.y0),
          0.04,
          mat("#b9bec4", "metal"),
        ),
      );
    }
    const lp = ln.userData.pose,
      fold = (f) => {
        lp.legs(twPhase(f, 0.5, 1));
        lp.wings(twLerp(-Math.PI / 2, 0, twPhase(f, 0, 0.5)));
      };
    if (flags.deployT != null) {
      const oa = o.userData.animate;
      g.userData.animate = (t) => {
        oa(t);
        fold(clamp((t - flags.deployT - 240) / 240, 0, 1));
      };
    }
    fold(flags.stowed || flags.deployT != null ? 0 : 1);
    g.userData.len = CE5.L.y0 + CE5.L.H + CE5.A.gap + CE5.A.H + 0.36;
    g.userData.yc0 = 2.4;
  } else if (has("orbiter") && has("ascent")) {
    const o = ce5Orbiter({ support: true, claws: "closed", channel: true });
    g.add(o, dockedAsc());
    mounts.push(...o.userData.mounts);
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } else if (has("orbiter")) {
    const sup = flags.dock !== false,
      o = ce5Orbiter({ support: sup, claws: "open", channel: sup });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("service")) {
    const o = ce5Orbiter({ returner: false });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("ascent") && flags.dock) {
    g.add(ce5Upper({ claws: "closed", channel: true }), dockedAsc());
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } // released with the docking and support modules (in the orbiter's frame)
  else if (has("ascent")) {
    const a = ce5Ascender();
    g.add(a);
    mounts.push({ y: -CE5.A.eng, r: 0.2, tag: "ASC" });
    g.userData.footY = -(CE5.L.H + CE5.A.gap + CE5.L.foot);
    g.userData.len = CE5.A.H;
  } else if (has("lander") || has("descent")) {
    const ln = ce5Lander();
    g.add(ln);
    const lp = ln.userData.pose;
    g.userData.footY = -CE5.L.foot;
    g.userData.len = has("lander") ? CE5.L.H + CE5.A.gap + CE5.A.H : CE5.L.H;
    if (has("lander")) ascOnLander(ln);
    if (has("descent")) {
      lp.wings(0.6);
      lp.flag(1);
    } else if (!flags.landed)
      mounts.push({ y: -CE5.L.eng, r: 0.3, tag: "LDR" });
    else if (flags.tLand != null) {
      const T = flags.tLand,
        h = (t) => (t - T) / H3,
        [d0, d1] = CE5_HOURS.drill,
        [a0, a1] = CE5_HOURS.arm;
      g.userData.animate = (t) => {
        const x = h(t);
        lp.wings(twLerp(0, 0.6, clamp(x / 0.1, 0, 1)));
        lp.drill(
          x < d0
            ? 0
            : x < d1 - 0.7
              ? (1.3 * (x - d0)) / (d1 - 0.7 - d0)
              : 1.3 * clamp((d1 - x) / 0.7, 0, 1),
        );
        lp.arm(
          x <= a0 || x >= a1
            ? lp.ARM.stow
            : ce5ArmAt(lp.ARM, (x - a0) / (a1 - a0)),
        );
        lp.flag(clamp((x - CE5_HOURS.flag) / 0.05, 0, 1));
      };
      g.userData.animate(T);
    } else lp.wings(0.6);
  } else if (has("capsule")) {
    g.add(ce5Returner());
    g.userData.chuteY = CE5.RET.h;
    g.userData.capsuleR = CE5.RET.r;
    g.userData.len = CE5.RET.h;
  }
  g.userData.len = g.userData.len || 2;
  return { inner: g, mounts };
}

// ==== 40_missionview.js
// ============================================================================
// Mission view: craft nodes (models, plumes, chutes, plasma), trajectory
// lines in selectable frames, labels, vectors, osculating orbit, surface caps.
// ============================================================================
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

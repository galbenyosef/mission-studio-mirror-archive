// index-inline-2 48 — math
// Lines 13292-13614 of readable/index-inline-2.pretty.js (statement-aligned).
function updatePlumes(c, s, t, act, model) {
  let i = 0;
  c.flameLen = 0;
  c.flameLum = 0;
  if (act.length && s.T > 0) {
    const alt = vnorm(s.r) - surfaceRadius(s.ref);
    const pr =
      s.ref === "earth"
        ? Math.exp(-Math.max(alt, 0) / 7.2)
        : s.ref === "mars"
          ? 0.006 * Math.exp(-Math.max(alt, 0) / 11)
          : 0;
    const vac = 1 - Math.min(1, pr * 1.2);
    const bal =
      s.ref === "earth"
        ? Math.max(
            Math.min(Math.pow(1 / Math.max(pr, 1e-12), 0.3), 20) - 3.5,
            0,
          ) *
          (1 - smoothstep((alt - 80) / 60))
        : 0; // the envelope's swelling, 0 below 30 km
    const g0 = 1.3 + 5.5 * vac,
      g1 = g0 + 1.5 * bal;
    const cfgL = cfgAt(c, t);
    for (const m of act) {
      if (i >= c.plumes.length) break;
      let prop = m.prop;
      if (!prop) {
        const b = MV.md.burnAt(t, c.o.id);
        prop =
          b && b.propType
            ? b.propType
            : cfgL && cfgL.key === "stack"
              ? LAUNCHERS[cfgL.launcher].stages[cfgL.stage].prop
              : "mmh";
        if (
          !b &&
          s.extra &&
          /powered|descent|landing/.test(s.extra.phase || "")
        )
          prop =
            (MV.md.SC.modules.DS || MV.md.SC.modules.LDR)?.engine?.prop || prop;
      }
      if (
        c.o.model === "starshipPayload" ||
        (cfgL && cfgL.launcher === "starship" && cfgL.key !== "launch")
      )
        prop = "methalox";
      const look = PROP_LOOK[prop] || PROP_LOOK.mmh;
      const colr = (PROP[prop] || PROP.mmh).plume;
      const p = c.plumes[i++];
      p.visible = true;
      const mf = mountFlow(c, s, t, m, act, cfgL),
        thr = clamp(mf.f, s.pad ? 0.04 : 0.2, 1);
      const Lsl =
        PLUME.k *
        Math.sqrt(Math.max(mf.flow, 0)) *
        (prop === "solid" ? PLUME.solid : 1); // m, at sea level
      const r0 = m.r * 0.85,
        len = Math.max(
          Lsl * (1 + PLUME.grow * vac * vac + 0.25 * bal),
          m.r * 1.5,
        );
      shapePlume(p, r0, Math.max(r0 * g1, r0 + (0.06 + 0.12 * vac) * Lsl), len);
      const yc = model.userData.yc || 0;
      p.position.set(
        m.x || 0,
        m.y - yc + (c.yOff || 0),
        (m.z || 0) + (c.zOff || 0),
      );
      if (m.d)
        p.quaternion.setFromUnitVectors(
          _vDown,
          _vPd.set(m.d[0], m.d[1], m.d[2]),
        );
      else p.rotation.set(m.flip ? Math.PI : 0, 0, 0); // a canted engine's exhaust leaves along its axis
      const u = p.material.uniforms;
      u.uColor.value.set(colr);
      u.uCore.value.set(look[2]);
      u.uI.value =
        look[0] *
        (0.35 + 0.65 * (1 - vac * 0.6)) *
        thr *
        Math.pow(g0 / g1, 0.7);
      u.uDiam.value = look[1] * (1 - vac);
      u.uTime.value = clockMs() / 1000;
      if (!u.tNoise.value) {
        if (!EXH.tex) initExhaust();
        u.tNoise.value = EXH.tex;
      }
      c.flameLen = Math.max(c.flameLen, len);
      c.flameLum = Math.max(c.flameLum, look[0] * thr * (1 - 0.7 * vac)); // for the smoke it lights (app/47_exhaust.js)
      const dl = 5 * m.r;
      u.uDF.value = (46 * len) / dl;
      u.uDL.value = clamp(dl / len, 0.03, 1); // diamonds as before, within ~5 nozzle radii
      u.uCF.value = clamp(
        ((9 * m.r) / len) * (prop === "solid" ? 1.8 : 1),
        0.12,
        0.45,
      ); // the white-hot core: a few nozzle diameters long
      u.uSoot.value =
        prop === "kerolox"
          ? 1
          : prop === "solid"
            ? 0.25
            : /hypergolic|udmh|mmh/.test(prop)
              ? 0.4
              : 0; // kerosene burns rich and sooty; the hypergolics a little; hydrogen and methane clean
    }
  }
  for (; i < c.plumes.length; i++) c.plumes[i].visible = false;
}

// ---------------- launch pad & surface caps ----------------
const PAD_TOP = 0.8; // m: the deck top stands this far above the ground (never coplanar with it, so the two cannot z-fight)
// the height of the vehicle's lowest nozzle above the ground on its pad (the pad's own figure, or the generic pad's)
function padStandH() {
  return MV.pad && MV.pad.userData.stand != null
    ? MV.pad.userData.stand
    : PAD_TOP + MOUNT_H;
}
const MOUNT_H = 6; // m: the vehicle stands on hold-down posts this high above the deck; the exhaust goes down through an opening
// liquid engines lighting on the pad before liftoff: share of liftoff thrust built up so far (null outside the hold-down period)
function padIgnition(md, t) {
  const L = md.L,
    IG = L.ign;
  if (!IG || !(IG.t > 0) || t >= md.M.t0) return null;
  const dt = t - (md.M.t0 - IG.t);
  if (dt < 0) return null;
  const nG = IG.stagger ? 3 : 1;
  let f = 0;
  for (let k = 0; k < nG; k++)
    f +=
      smoothstep(
        clamp((dt - k * (IG.stagger || 0)) / Math.max(IG.ramp, 0.1), 0, 1),
      ) / nG;
  const liq = liftoffStages(L).filter((s) => s.prop !== "solid");
  return {
    f,
    full: f > 0.985,
    thrust: liq.reduce((a, s) => a + s.thrustSL, 0) * f,
    core: (liq.find((s) => !s.parallel) || liq[0] || {}).id,
    liq,
    dt,
  };
}
const hash01 = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function buildPad(md) {
  const L = md.L,
    P = padModel(md);
  let g = new THREE.Group(),
    holeMat,
    foot,
    stand = PAD_TOP + MOUNT_H,
    deckY = PAD_TOP,
    trenchD = 70;
  if (P) {
    g = P.group;
    holeMat = P.glow;
    foot = P.foot;
    stand = P.stand;
    deckY = P.deckY;
    trenchD = P.trenchD || trenchD;
  } // the real pad (app/46_pads.js)
  else {
    // a generic pad
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    foot = Math.max(
      L.diameter / 2,
      bst && bst.booster ? bst.booster.offset + bst.geom[0][1] : 0,
    ); // footprint radius, m
    const hTower = Math.max(60, L.height * 0.95 + MOUNT_H);
    const tower = box(10, hTower, 10, mat("#8a2f22", "metal"));
    tower.position.set(foot + 15, 0, 0);
    g.add(tower);
    const deck = cyl(90, 90, 6 + PAD_TOP, mat("#a7a39a", "dark"), 8);
    deck.position.y = -6;
    g.add(deck);
    // flame trench across the deck, the exhaust opening under the engines (it glows while they fire) and the hold-down posts
    const trench = box(16, 0.15, 180, mat("#34312c", "dark"));
    trench.position.set(0, PAD_TOP, 0);
    g.add(trench);
    holeMat = new THREE.MeshBasicMaterial({ color: "#141210" });
    const hole = box(foot * 2 + 4, 0.2, foot * 2 + 4, holeMat);
    hole.position.y = PAD_TOP + 0.05;
    g.add(hole);
    const postMat = mat("#6d6a64", "metal"),
      rP = foot + 1.8;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const p = box(2.4, MOUNT_H, 2.4, postMat);
      p.position.set(Math.cos(a) * rP, PAD_TOP, Math.sin(a) * rP);
      g.add(p);
    }
  }
  const cloud = buildPadCloud();
  g.add(cloud); // fire, exhaust and steam billowing out of the flame trench (app/48_padcloud.js)
  g.scale.setScalar(0.001);
  g.userData = {
    site: LAUNCH_SITES[md.cfg.site],
    hole: holeMat,
    cloud,
    foot,
    stand,
    deckY,
    trenchD,
    animate: P && P.animate,
    block: P && P.block,
  };
  R.scene.add(g);
  MV.pad = g;
}
function updatePad(t) {
  const g = MV.pad;
  if (!g) return;
  const S = g.userData.site;
  const O = R.O;
  const md = MV.md;
  const r = sitePosEcl("earth", S.lat, S.lon, 0, t);
  const E = helio("earth", t).r;
  g.position.set(E[0] + r[0] - O[0], E[1] + r[1] - O[1], E[2] + r[2] - O[2]);
  basisQuat(vunit(r), localFrame("earth", r, t).north, g.quaternion);
  g.visible = camDistTo(g.position) < 400; // (whenever the camera is near: a return to the launch site lands beside the tower)
  if (!g.visible) return;
  if (g.userData.animate) g.userData.animate(t); // arms swinging away
  const t0 = md.M.t0,
    IG = md.L.ign || { t: 0 },
    tIgn = t0 - (IG.t || 0);
  const ship = craftById("ship");
  const altM = (te) => {
    if (te < t0) return 0;
    const s = ship && ship.o.stateAt(te);
    return s ? (vnorm(s.r) - BODIES.earth.R) * 1000 : 1e9;
  };
  // how hard the exhaust hits the pad at time te: engine build-up before liftoff, fading as the vehicle climbs away — once it
  // is about one and a half flame lengths up. Bigger engines (more propellant per second) throw out more fire and smoke.
  const sC = blastScale(md.L),
    fadeAlt = Math.max(110, 1.5 * PLUME.k * Math.sqrt(liftoffFlow(md.L)));
  const blast = (te) => {
    if (te < tIgn) return 0;
    if (te < t0) {
      const ig = padIgnition(md, te);
      return ig ? ig.f : 0;
    }
    return clamp(1 - altM(te) / fadeAlt, 0, 1);
  };
  const bNow = blast(t);
  g.userData.hole.color.setRGB(
    0.08 + 0.92 * bNow,
    0.07 + 0.55 * bNow,
    0.06 + 0.2 * bNow,
  );
  const span = (IG.t || 0) + 24;
  updatePadCloud(g, t, tIgn, span, blast, sC, md.L, sunUpAt(E, r));
}
const sunUpAt = (E, r) => vdot(vunit(vscale(E, -1)), vunit(r)); // the Sun's elevation (sine) at the pad
function camDistTo(v) {
  return R.camera.position.distanceTo(v);
}
// local high-resolution patch of a planet's surface around a site; an elevation offset (e.g. a crater floor
// below the Martian datum) blends smoothly back to the mean radius at the patch edge
const capW = (f) => 1 - smoothstep((f - 0.5) / 0.42);
function capGeometry(lat, lon, ang, seg, Rb, elev = 0) {
  const dl = ang / Math.max(Math.cos(lat * DEG), 0.2);
  const g = new THREE.SphereGeometry(
    1,
    seg,
    seg,
    (lon - dl + 180) * DEG,
    2 * dl * DEG,
    (90 - lat - ang) * DEG,
    2 * ang * DEG,
  );
  const pos = g.attributes.position,
    uv = g.attributes.uv;
  const loc = new Float32Array(pos.count * 2),
    capA = new Float32Array(pos.count).fill(1);
  const cl = Math.cos(lat * DEG),
    sl = Math.sin(lat * DEG),
    co = Math.cos(lon * DEG),
    so = Math.sin(lon * DEG);
  const C = [cl * co, sl, -cl * so],
    E = [-so, 0, -co],
    N = [-sl * co, cl, sl * so];
  const p0 = (lon - dl + 180) * DEG,
    pL = 2 * dl * DEG,
    t0 = (90 - lat - ang) * DEG,
    tL = 2 * ang * DEG;
  for (let i = 0; i < pos.count; i++) {
    // the point on the unit sphere worked out again in double precision (as SphereGeometry places it): its own 32-bit
    // copy is up to 3e-8 out — 20 cm on Earth, enough to lift the ground through a launch pad's
    const ph = p0 + ((i % (seg + 1)) / seg) * pL,
      th0 = t0 + (Math.floor(i / (seg + 1)) / seg) * tL;
    const x = -Math.cos(ph) * Math.sin(th0),
      y = Math.cos(th0),
      z = Math.sin(ph) * Math.sin(th0);
    let phi = Math.atan2(z, -x);
    if (phi < 0) phi += TAU;
    uv.setXY(i, phi / TAU, 1 - Math.acos(clamp(y, -1, 1)) / Math.PI);
    loc[2 * i] = Rb * (x * E[0] + y * E[1] + z * E[2]);
    loc[2 * i + 1] = Rb * (x * N[0] + y * N[1] + z * N[2]);
    const th = Math.acos(clamp(x * C[0] + y * C[1] + z * C[2], -1, 1)) * RAD;
    const k = 1 + (elev / Rb) * capW(th / ang);
    // vertices are stored relative to the site, and the mesh sits at the site: the large planet-radius offsets then
    // cancel on the CPU in double precision, so the ground near the pad does not jitter (and flicker) in 32-bit floats
    pos.setXYZ(i, x * k - C[0], y * k - C[1], z * k - C[2]);
  }
  g.setAttribute("aLocal", new THREE.BufferAttribute(loc, 2));
  g.setAttribute("aCap", new THREE.BufferAttribute(capA, 1));
  if (elev) g.computeVertexNormals();
  g.userData.center = C;
  g.userData.grid = {
    phiStart: (lon - dl + 180) * DEG,
    phiLength: 2 * dl * DEG,
    thetaStart: (90 - lat - ang) * DEG,
    thetaLength: 2 * ang * DEG,
    seg,
  };
  return g;
}

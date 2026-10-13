// index-inline-2 40 — cfgl
// Lines 11157-11506 of readable/index-inline-2.pretty.js (statement-aligned).
function updateCraft(c, t, camPos) {
  const s = c.s;
  if (!s) {
    c.node.visible = false;
    return;
  }
  const P = c.P;
  const O = R.O;
  c.node.position.set(P[0] - O[0], P[1] - O[1], P[2] - O[2]);
  c.node.visible = true;
  const cfgL = cfgAt(c, t);
  const key = JSON.stringify(cfgL || {}) + "|" + c.o.model;
  if (key !== c.curKey) {
    const m = craftModel(c, cfgL);
    if (c.cur) c.node.remove(c.cur);
    if (c.cur && c.qInit && shuttleHalfTurn(c, c.curCfg, cfgL))
      c.q.multiply(_qHalfY);
    c.node.add(m);
    c.cur = m;
    c.curKey = key;
    c.curCfg = cfgL;
  }
  const model = c.cur;
  const act = activeMounts(c, s, t, cfgL, model);
  craftAttitude(c, s, t, cfgL, act, _q1);
  const realDt = MV.realDt || 0.016;
  const jump =
    Math.abs(t - (c.lastT ?? t)) > Math.max(30, (MV.rate || 1) * 0.5) ||
    !c.qInit;
  // On the ground, ease relative to the turning planet: carry last frame's attitude round with it first. Easing in
  // inertial space lets the model trail the planet's spin, and under a fast time-warp (a frame can be most of a sol)
  // a lander standing still would lean and tumble end over end.
  if (!jump && s.surface && c.qGround === s.ref && t !== c.lastT) {
    bodyQuat(s.ref, c.lastT, _q2).invert();
    c.q.premultiply(_q2).premultiply(bodyQuat(s.ref, t, _q2));
  }
  if (jump) c.q.copy(_q1);
  else c.q.slerp(_q1, 1 - Math.exp(-realDt * 5));
  c.qInit = true;
  c.lastT = t;
  c.qGround = s.surface ? s.ref : null;
  c.node.quaternion.copy(c.q);
  // scale: metres → km; optionally enlarge distant craft
  const dist = Math.max(1e-9, camPos.distanceTo(c.node.position));
  let sc = 0.001;
  if (MV.layers.bigcraft) {
    const pxPerKm = R.pxPerRad / dist;
    const lenKm = (model.userData.len || 10) * 0.001;
    const px = lenKm * pxPerKm;
    if (px < 26) sc *= 26 / Math.max(px, 1e-6);
  }
  c.node.scale.setScalar(sc);
  const ud = model.userData;
  model.position.z = 0;
  if (c.o.model === "shuttle" && cfgL && cfgL.key === "sc")
    model.position.y = 0; // the orbiter's state is its reference point, in flight and on its wheels (shuttleGround)
  else
    model.position.y =
      anchorY(c, cfgL, model, s) + stagingShift(c, t, cfgL, model, s);
  const so = shuttleSepShift(c, t, cfgL, model, s);
  if (so) {
    model.position.y += so[1];
    model.position.z += so[2];
  }
  c.yOff = model.position.y;
  c.zOff = model.position.z;
  if (ud.wheels && ud.wheels.length) {
    const wo = s.rover ? s.rover.wodo : 0;
    for (const w of ud.wheels) w.rotation.x = -wo / w.userData.wheel;
  }
  if (ud.animate) ud.animate(t); // parts in motion on their own timeline (the Shuttle's bay doors and robot arm, Hubble's door)
  // plumes
  updatePlumes(c, s, t, act, model);
  // parachutes
  const ch =
    cfgL && (cfgL.chutes || cfgL.chute) ? cfgL.chutes || cfgL.chute : 0;
  const chKey = ch ? cfgL.key + ch + (model.userData.dgb ? "d" : "") : null;
  if (chKey !== c.chuteKey) {
    if (c.chute) {
      c.node.remove(c.chute);
      disposeTree(c.chute);
      c.chute = null;
    }
    if (chKey) {
      const capR = model.userData.capsuleR || 2;
      const dgb = model.userData.dgb;
      const n = dgb ? 1 : ch >= 2 ? (capR > 1.5 ? 3 : 1) : 2;
      const diam = dgb
        ? c.o.model === "msl"
          ? 21.5
          : 16
        : ch >= 2
          ? capR > 2.2
            ? 35
            : capR > 1.5
              ? 25.4
              : 9
          : capR > 1.5
            ? 5
            : 2;
      c.chute = makeChutes(dgb ? "dgb" : "ring", n, diam, capR);
      c.chute.position.y =
        (model.userData.chuteY || 3) - model.userData.yc + (c.yOff || 0);
      c.node.add(c.chute);
    }
    c.chuteKey = chKey;
  }
  updatePlasma(c, s, t, model, !!ch);
}
// the shock layer and wake of an entry (makePlasma), and the light it throws on the vehicle
const _vPl = new THREE.Vector3(),
  _qPl = new THREE.Quaternion();
function updatePlasma(c, s, t, model, chutes) {
  const heat = (s.extra && s.extra.heat) || 0,
    G = c.plasma,
    U = G.userData;
  if (heat > 0.3 && !model.userData.plasmaGeo && !U.pending) {
    // scatter the points over the model ahead of the glow, when the browser is idle (~0.2 s)
    U.pending = true;
    (window.requestIdleCallback || setTimeout)(() => {
      plasmaGeometry(model);
      U.pending = false;
    });
  }
  if (!(heat > 3) || chutes) {
    G.visible = false;
    return;
  }
  const k = clamp((Math.log10(heat) - 0.5) / 1.6, 0.05, 1.1),
    P = plasmaGeometry(model); // faint at first (a few W/cm²), full by ~70 W/cm²
  if (U.geo !== P) {
    U.shell.geometry = P.shell;
    U.halo.geometry = P.halo;
    U.wake.geometry = P.wake;
    U.geo = P;
  }
  G.visible = true;
  G.position.copy(model.position);
  G.quaternion.copy(model.quaternion);
  const vAir =
      s.ref === "earth" || s.ref === "mars"
        ? vsub(s.v, vcross(bodyOmegaEcl(s.ref, t), s.r))
        : s.v,
    dir = vunit(vAir); // through the air, which turns with the planet
  _vPl
    .set(dir[0], dir[1], dir[2])
    .applyQuaternion(
      _qPl.copy(c.node.quaternion).multiply(model.quaternion).invert(),
    );
  const L = P.L,
    sc = c.node.scale.x,
    px =
      (R.height * R.renderer.getPixelRatio()) /
      (2 * Math.tan((R.camera.fov * DEG) / 2));
  for (const p of [U.shell, U.halo, U.wake]) {
    const u = p.material.uniforms;
    u.uV.value.copy(_vPl);
    u.uHeat.value = k;
    u.uTime.value = R.clock;
    u.uPx.value = px;
    R.renderer.getDrawingBufferSize(u.uScreen.value);
    u.uScale.value = sc;
    u.uOff.value = L * 0.025;
    u.uSize.value = L * 0.11;
    u.uLen.value = L * (1.5 + 5 * k);
    u.uSpread.value = 0.05; // stand-off and point size (m), length of the wake
  }
  U.halo.material.uniforms.uSize.value *= 3.5;
  U.halo.material.uniforms.uOff.value *= 2.5; // the halo: wide points, further off
  U.shell.material.uniforms.uI.value = 0.22 * Math.min(k, 0.9);
  U.halo.material.uniforms.uI.value = 0.5 * k;
  U.wake.material.uniforms.uI.value = 0.065 * k;
  const d = c.node.position.distanceTo(R.camera.position); // one light, from the glowing craft nearest the camera
  if (!R.plasmaPick || d < R.plasmaPick.d)
    R.plasmaPick = { c, d, k, L: L * sc, dir };
}
function updatePlasmaLight() {
  const Lt = R.plasmaLight,
    p = R.plasmaPick;
  R.plasmaPick = null;
  if (!Lt) return;
  if (!p) {
    Lt.intensity = 0;
    return;
  }
  const n = p.c.node.position;
  Lt.position.set(
    n.x + p.dir[0] * p.L * 0.45,
    n.y + p.dir[1] * p.L * 0.45,
    n.z + p.dir[2] * p.L * 0.45,
  ); // in the shock layer, on the windward side
  Lt.distance = p.L * 3;
  Lt.intensity = 2.2 * p.k;
}
// ---------------- exhaust plumes, sized by propellant mass flow ----------------
// The visible flame of a rocket engine at sea level grows with the square root of the propellant it burns per second
// (a nozzle's area scales with its flow): about 1.6 m per √(kg/s), so the Saturn V's five F-1s (13 t/s) trail a flame
// longer than the rocket while a lunar module's descent engine (15 kg/s) shows a few metres. In thinning air the plume
// lengthens and balloons out; climbing through Earth's upper atmosphere it keeps swelling (the exhaust leaves the nozzles
// at far more than the air's pressure and spreads until it matches it) into a glowing envelope many times the vehicle's
// width, which fades above 100 km, where there is no air left for the exhaust to burn in.
const PLUME = { k: 1.6, solid: 1.25, grow: 1.6 };
const stageFlow = (st) => st.thrustVac / (st.ispVac * G0); // kg/s at full thrust
function curveAt(curve, x) {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++)
    if (x <= curve[i][0]) {
      const a = curve[i - 1],
        b = curve[i];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
  return curve[curve.length - 1][1];
}
// propellant flow through one drawn plume (kg/s) and its share of full thrust. Launch-vehicle stages: solid boosters follow
// their thrust curve, liquid engines their throttle, shared by the boosters or engines drawn for that stage. A spacecraft or
// an upper stage flying alone: its current thrust over the engine's specific impulse, shared by the engines firing.
function mountFlow(c, s, t, m, act, cfgL) {
  const same = act.filter((x) => x.tag === m.tag).length || 1;
  const thr = s.extra && s.extra.throttle != null ? s.extra.throttle : 1;
  if (cfgL && cfgL.key === "launch" && m.idx != null) {
    const st = LAUNCHERS[cfgL.launcher].stages[m.idx];
    const f = st.parallel
      ? st.curve
        ? Math.max(curveAt(st.curve, t - MV.md.M.t0), 0)
        : 1
      : thr;
    return { flow: (stageFlow(st) * f) / same, f };
  }
  let isp = 0;
  if (cfgL && cfgL.key === "stack")
    isp = LAUNCHERS[cfgL.launcher].stages[cfgL.stage].ispVac;
  else {
    const b = MV.md.burnAt(t, c.o.id);
    if (b && b.isp) isp = b.isp;
  }
  if (!isp) {
    const mod = MV.md.SC.modules.DS || MV.md.SC.modules.LDR;
    isp = (mod && mod.engine && mod.engine.isp) || 300;
  }
  return { flow: (s.T || 0) / (isp * G0) / act.length, f: thr };
}
// all the propellant the vehicle burns at liftoff (kg/s): sizes the fire and smoke at the pad and the trail behind the rocket
function liftoffFlow(L) {
  return liftoffStages(L).reduce((a, st) => a + stageFlow(st), 0);
}
const blastScale = (L) => clamp(Math.sqrt(liftoffFlow(L) / 13000), 0.35, 1.35); // 1 for the Saturn V
const _vDown = new THREE.Vector3(0, -1, 0),
  _vPd = new THREE.Vector3();
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
      u.uTime.value = performance.now() / 1000;
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
    }
  }
  for (; i < c.plumes.length; i++) c.plumes[i].visible = false;
}

// ---------------- launch pad & surface caps ----------------

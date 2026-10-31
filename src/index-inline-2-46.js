// index-inline-2 46 — cfgl
// Lines 12709-13021 of readable/index-inline-2.pretty.js (statement-aligned).
function noseDirection(c, s, t, cfgL, act) {
  const rD = c.rD || s.r,
    vD = c.vD || s.v,
    body = c.dom || s.ref;
  const up = vunit(rD),
    ex = s.extra || {};
  const rot = body === "earth" || body === "mars";
  const vAir = rot ? vsub(vD, vcross(bodyOmegaEcl(body, t), rD)) : vD;
  const alt = body === "sun" ? 1e9 : vnorm(rD) - surfaceRadius(body);
  if (MV.md && MV.md.shPrep !== null && isShuttle(MV.md)) {
    const sh = shuttleAttitude(c, s, t, cfgL);
    if (sh) return sh;
  }
  // near the ground the roll comes from the ground frame (41_attitude.js), handing over to the flight reference as a craft climbs away
  const G = groundFrame(c, t),
    upR = flightSign(c, t) < 0 ? vscale(up, -1) : up;
  const att = (nose, ref) => {
    if (!G) return { nose, roll: ref };
    const g = G.z ? G.P : vcross(G.P, nose);
    return G.w >= 1
      ? { nose, roll: g }
      : { nose, roll: g, roll2: ref, w2: 1 - G.w };
  };
  if (
    s.surface ||
    s.pad ||
    (cfgL && cfgL.landed) ||
    ex.phase === "landed" ||
    ex.phase === "touchdown" ||
    ex.phase === "recovery"
  )
    return s.rover && s.hdg
      ? { nose: up, roll: s.hdg }
      : att(up, s.hdg || vperp(up));
  // Starship lights its engines for landing while still lying belly-first and pitches up onto them over a few seconds
  const belly = (H) => {
    const va = vnorm(vAir) > 1e-9 ? vunit(vAir) : vscale(up, -1),
      e = Math.max(0, 60 * DEG - Math.asin(clamp(-vdot(va, up), -1, 1)));
    return { va, nose: vadd(vscale(H, Math.cos(e)), vscale(up, Math.sin(e))) };
  };
  if (s.T > 0 && s.dir && vnorm(s.dir) > 0.5) {
    const flip = act[0] && act[0].flip;
    let n = flip ? vscale(s.dir, -1) : s.dir;
    const ti = G && G.ep.tIgn;
    if (ti != null && t >= ti && t < ti + ATT.flip)
      n = pitchToward(
        belly(vunit(vcross(G.P, up))).nose,
        n,
        G.P,
        smoothstep((t - ti) / ATT.flip),
      );
    return att(n, upR);
  }
  // the seconds between one stage letting go and the next lighting up: the stack holds the attitude its guidance commands
  const asc = c.o.id === "ship" && c.o.segs[0];
  if (
    cfgL &&
    cfgL.key === "launch" &&
    !s.pad &&
    asc &&
    t > asc.t0 &&
    t < asc.t1 &&
    s.dir &&
    vnorm(s.dir) > 0.5
  )
    return att(vunit(s.dir), upR);
  if (
    cfgL &&
    (cfgL.key === "capsule" ||
      (cfgL.parts &&
        (cfgL.parts.includes("aeroshell") || cfgL.parts.includes("backshell"))))
  ) {
    if (cfgL.chutes || cfgL.chute || ex.chute) return att(up, vperp(up)); // hanging under its parachute (a backshell let go keeps its own)
    const vv = alt < 200 ? vAir : vD;
    return att(vscale(vunit(vv), -1), upR);
  }
  if (
    c.o.model === "starshipPayload" &&
    alt < 160 &&
    (body === "earth" || body === "mars") &&
    cfgL &&
    cfgL.key !== "launch"
  ) {
    // belly first into the airflow, the heat-shield tiles (−X) facing it: nose about 60° above the flight path at hypersonic
    // speed, level once the ship falls more steeply than that (the belly-flop). Heading: along the ground track until it
    // falls steeply toward the landing site, then the heading it will land with
    const hz = vsub(vAir, vscale(up, vdot(vAir, up)));
    const { va, nose } = belly(
      G ? vunit(vcross(G.P, up)) : vnorm(hz) > 1e-7 ? vunit(hz) : vperp(up),
    );
    return att(nose, vcross(nose, va));
  }
  if (cfgL && cfgL.key === "launch" && t < MV.md.M.t0 + 1)
    return att(up, vperp(up));
  if (c.o.model === "jwst" && cfgL && cfgL.key === "sc") {
    const a = att(vunit(c.P), [0, 0, 1]);
    a.coast = true;
    return a;
  } // Webb flies sunshield to the Sun, the telescope (+Y) away from it
  const v = vnorm(vD) > 1e-6 ? vD : up;
  const a = att(vunit(v), upR);
  a.coast = true;
  return a;
}
// Where a model sits along its axis relative to the craft's position: feet on the ground when standing on a surface, the base
// for the whole launch stack (its state is its base) and for a spent stage or booster (it lets go from where it was in the
// stack); otherwise centred.
function anchorY(c, cfgL, model, s) {
  const ud = model.userData,
    altK = vnorm(s.r) - surfaceRadius(s.ref);
  const launch = cfgL && cfgL.key === "launch",
    debris = c.o.kind === "debris";
  if (!(
    s.surface ||
    s.pad ||
    (cfgL && cfgL.landed) ||
    launch ||
    debris ||
    (ud.footY != null && altK < 3)
  ))
    return 0;
  let fy = ud.footY;
  if (fy == null) {
    const ms = (ud.mounts || []).map((m) => m.y);
    fy = ms.length ? Math.min(...ms) : 0;
  }
  if (debris && fy === 0 && ud.bbY) fy = ud.bbY[0] + ud.yc; // boosters carry no mounts: their lowest point
  return (
    ud.yc - fy + ((launch || debris) && s.ref === "earth" ? padStandH() : 0)
  );
}
// When a stage drops away (or the launch stack becomes the orbital stack) the rest of the vehicle stays where it was: the
// model takes the offset that keeps its nose in place and lets it go over several seconds of flight.
const STAGE_TAU = 8; // s
function stagingShift(c, t, cfgL, model, s) {
  if (s.surface || s.pad || !cfgL) return 0;
  const cf = c.o.configs;
  let k = -1;
  for (let i = 0; i < cf.length && cf[i].t <= t; i++) k = i;
  if (k < 1 || t - cf[k].t > 6 * STAGE_TAU) return 0;
  const pl = cf[k - 1].label;
  if (
    !pl ||
    pl.key !== "launch" ||
    !(
      cfgL.key === "stack" ||
      (cfgL.key === "launch" && (cfgL.stFrom || 0) > (pl.stFrom || 0))
    )
  )
    return 0;
  const pm = craftModel(c, pl),
    top0 = anchorY(c, pl, pm, s) + pm.userData.bbY[1],
    top1 = anchorY(c, cfgL, model, s) + model.userData.bbY[1];
  return (top0 - top1) * Math.exp(-(t - cf[k].t) / STAGE_TAU);
}
function craftModel(c, cfgL) {
  const key = JSON.stringify(cfgL || {}) + "|" + c.o.model;
  let m = c.models.get(key);
  if (!m) {
    m = modelForConfig(
      cfgL || { key: "sc", sc: c.o.model, parts: ["orbiter"] },
      c.o.model,
    );
    c.models.set(key, m);
  }
  return m;
}
// a spent stage or booster keeps the attitude the stack had when it let go, then tumbles slowly
function sepAttitude(c) {
  if (c.sepQ !== undefined) return c.sepQ;
  c.sepQ = null;
  const ship = craftById("ship");
  if (!ship || ship === c) return null;
  const t = c.o.t0 - 0.02,
    tmp = { ...ship };
  computeCraft(tmp, t);
  if (!tmp.s) return null;
  const cfgL = cfgAt(ship, t);
  c.sepQ = craftAttitude(
    tmp,
    tmp.s,
    t,
    cfgL,
    activeMounts(tmp, tmp.s, t, cfgL, craftModel(ship, cfgL)),
    new THREE.Quaternion(),
  );
  return c.sepQ;
}
// A coasting craft turns to a burn's attitude over the minute before it lights its engines and holds the attitude a burn
// ended with for half a minute, instead of snapping between flying nose-first and the direction of the burn.
const BURN_PRE = 60,
  BURN_HOLD = 30; // s
function burnHold(c, t) {
  const md = MV.md;
  if (!md || !md.powered) return null;
  let prev = null,
    next = null;
  for (const x of md.powered) {
    if (x.obj !== c.o.id) continue;
    if (x.t1 <= t && t - x.t1 < BURN_HOLD && (!prev || x.t1 > prev.t1))
      prev = x;
    if (x.t0 >= t && x.t0 - t < BURN_PRE && (!next || x.t0 < next.t0)) next = x;
  }
  let x = null,
    edge = 0,
    w = 0;
  if (next && (!prev || (next.t0 - t) / BURN_PRE < (t - prev.t1) / BURN_HOLD)) {
    x = next;
    edge = next.t0 + 0.3;
    w = smoothstep(1 - (next.t0 - t) / BURN_PRE);
  } else if (prev) {
    x = prev;
    edge = prev.t1 - 0.3;
    w = 1 - smoothstep((t - prev.t1) / BURN_HOLD);
  }
  if (!x || w <= 0) return null;
  const q = burnEdgeQ(c, x, edge);
  return q ? { q, w } : null;
}
// the attitude at the start or end of a burn (cached: an attitude held in inertial space)
function burnEdgeQ(c, x, edge) {
  c.burnQ = c.burnQ || new Map();
  const k = x.t0 + ":" + edge;
  if (c.burnQ.has(k)) return c.burnQ.get(k);
  const tmp = { ...c };
  computeCraft(tmp, edge);
  let q = null;
  if (tmp.s && tmp.s.T > 0 && !tmp.s.surface) {
    const cfgL = cfgAt(c, edge);
    q = craftAttitude(
      tmp,
      tmp.s,
      edge,
      cfgL,
      activeMounts(tmp, tmp.s, edge, cfgL, craftModel(c, cfgL)),
      new THREE.Quaternion(),
    );
  }
  c.burnQ.set(k, q);
  return q;
}
// the attitude a craft is turning toward at t (the drawn one eases into it), into quaternion q
function craftAttitude(c, s, t, cfgL, act, q) {
  const hangs = cfgL && cfgL.chute; // under a parachute: no tumbling
  if (c.o.kind === "debris" && !s.surface && !hangs && sepAttitude(c)) {
    q.copy(c.sepQ);
    _q2.setFromAxisAngle(_axTumble, (t - c.o.t0) * 0.035);
    return q.multiply(_q2);
  }
  const nd = noseDirection(c, s, t, cfgL, act);
  basisQuat(nd.nose, nd.roll, q);
  if (nd.roll2 && nd.w2 > 0) {
    basisQuat(nd.nose, nd.roll2, _q3);
    q.slerp(_q3, nd.w2);
  } // handing over between two roll references
  applyShuttleSpin(nd, q);
  if (nd.coast && c.o.kind === "craft" && !s.surface && !s.pad) {
    const bh = burnHold(c, t);
    if (bh) q.slerp(bh.q, bh.w);
  }
  if (
    !s.surface &&
    !s.pad &&
    !hangs &&
    (c.o.kind === "debris" || (c.o.kind === "stage" && !(s.T > 0)))
  ) {
    // slow tumble after separation (not once it rests on a surface, e.g. the LM descent stage left on the Moon)
    const age = c.o.id === "et" ? Math.max(0, t - c.o.t0 - 90) : t - c.o.t0; // the Shuttle's tank drifts clear before it starts to tumble
    _q2.setFromAxisAngle(_axTumble, age * 0.035);
    q.multiply(_q2);
  }
  return q;
}
function computeCraft(c, t) {
  const s = craftState(c, t);
  c.s = s;
  if (!s) {
    c.P = null;
    return;
  }
  if (s.surface && !s.pad && MV.md) groundCraft(c, s, t);
  if (c.o.model === "shuttle" && MV.md && isShuttle(MV.md))
    shuttleGround(c, s, t);
  if (!(s.T > 0) && !s.surface && MV.md) {
    // a burn the plan applies as an instant Δv: show it firing for its real duration
    const x = MV.md.impAt(t, c.o.id);
    if (x) {
      const b = x.burn,
        dur = Math.max(x.t1 - x.t0, 1),
        m = s.m > 0 ? s.m : b.m0 || 1000;
      s.T = (m * (b.dv || 0)) / dur;
      s.dir =
        x.dir ||
        (/insertion|capture|braking|descent|deorbit|retro/i.test(x.name)
          ? vscale(vunit(s.v), -1)
          : vunit(s.v));
      s.imp = true;
    }
  }
  const Hs = helio(s.ref, t);
  c.P = vadd(Hs.r, s.r);
  c.Vh = vadd(Hs.v, s.v);
  const b = s.surface || s.pad ? s.ref : dominantBody(c.P, t);
  c.dom = b;
  if (b === s.ref) {
    c.rD = s.r;
    c.vD = s.v;
  } else {
    const B = helio(b, t);
    c.rD = vsub(c.P, B.r);
    c.vD = vsub(c.Vh, B.v);
  }
}

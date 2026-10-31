// index-inline-2 53 — math
// Lines 14838-15175 of readable/index-inline-2.pretty.js (statement-aligned).
function groundFrame(c, t) {
  const eps = attEpisodes(c);
  if (!eps.length) return null;
  const e = eps.find((e) => t >= e.tA && t <= e.tB);
  if (!e) return null;
  const rB = c.dom === e.body ? c.rD : vsub(c.P, helio(e.body, t).r);
  if (!rB) return null;
  const lf = localFrame(e.body, rB, t);
  let P;
  if (e.kind === "launch") {
    // across the launch plane, after the roll program (if any) from the pad azimuth
    const hp = vsub(e.h, vscale(lf.up, vdot(e.h, lf.up)));
    P = vunit(vscale(hp, -1));
    const d = e.RP
      ? e.d0 *
        (1 - smoothstep((t - e.t0 - e.RP.t[0]) / (e.RP.t[1] - e.RP.t[0])))
      : 0;
    if (d)
      P = vadd(vscale(P, Math.cos(d)), vscale(vcross(P, lf.up), Math.sin(d)));
  } else P = azDir(lf, e.az(t));
  const w = e.out ? 1 - smoothstep((t - (e.tB - ATT.ramp)) / ATT.ramp) : 1;
  return { P, z: e.z, w, ep: e };
}
// turn unit vector a toward b about axis P by the fraction f of the way, the short way round (any part along P blends linearly)
function pitchToward(a, b, P, f) {
  const ap = vunit(vsub(a, vscale(P, vdot(a, P)))),
    bp = vunit(vsub(b, vscale(P, vdot(b, P))));
  const ang = Math.atan2(vdot(P, vcross(ap, bp)), vdot(ap, bp)) * f,
    cs = Math.cos(ang),
    sn = Math.sin(ang);
  const along = vdot(a, P) * (1 - f) + vdot(b, P) * f;
  return vunit(
    vadd(
      vscale(
        vadd(vscale(ap, cs), vscale(vcross(P, ap), sn)),
        Math.sqrt(Math.max(0, 1 - along * along)),
      ),
      vscale(P, along),
    ),
  ); // Rodrigues, ap square to P
}

// ==== 42_shuttleview.js
// ============================================================================
// The Space Shuttle in the mission view: attitudes (the roll program and the roll to heads-up during ascent,
// proximity operations around the ISS, the robot-arm deploy, the deorbit burn, entry at high angle of attack
// with banked turns, the approach, flare and rollout), the orbiter rolling on its landing gear, and the runway
// with its lights.
// ============================================================================
const SHV = { runway: null, lights: null, rwy: null };
const _qS = new THREE.Quaternion(),
  _axY = new THREE.Vector3(0, 1, 0),
  _axX = new THREE.Vector3(1, 0, 0);
const SH_MAIN_GEAR = [SH_MAIN_CONTACT[0] - 14.7, SH_MAIN_CONTACT[1]]; // main wheel contact relative to the orbiter's reference point (Y 14.7): [along, down] (m)
// the reference point's height above the ground with every wheel down, at the 4.4° nose-down stance
const SH_STAND_H = -(
  SH_MAIN_GEAR[0] * Math.sin(SH_STANCE) +
  SH_MAIN_GEAR[1] * Math.cos(SH_STANCE)
);
function isShuttle(md) {
  return !!(md && md.L && md.L.sideMount);
}
// per mission: launch plane, roll program, deorbit burn, runway
function shuttlePrep(md) {
  if (md.shPrep !== undefined) return md.shPrep;
  if (!isShuttle(md) || !md.ship || !md.ship.segs.length) {
    md.shPrep = null;
    return null;
  }
  const asc = md.ship.segs[0],
    sE = asc.stateAt(asc.t1),
    t0 = md.M.t0;
  const h = vunit(vcross(sE.r, sE.v)); // orbit normal: the launch plane
  // roll program: from the pad orientation (orbiter on the south side of the tank, tail facing south) to heads-down
  const S = LAUNCH_SITES[md.cfg.site],
    rP = sitePosEcl("earth", S.lat, S.lon, 0, t0),
    lf = localFrame("earth", rP, t0);
  const up = lf.up,
    A = vunit(vcross(h, up)),
    ref = vunit(vsub(up, A));
  basisQuat(up, ref, _qS);
  const Xw = new THREE.Vector3(1, 0, 0).applyQuaternion(_qS),
    Zw = new THREE.Vector3(0, 0, 1).applyQuaternion(_qS);
  const N = lf.north,
    phi0 = Math.atan2(
      N[0] * Xw.x + N[1] * Xw.y + N[2] * Xw.z,
      N[0] * Zw.x + N[1] * Zw.y + N[2] * Zw.z,
    );
  const deorbit =
    md.burns.find((b) => b.obj === "ship" && /^Deorbit/.test(b.name)) || null;
  const et = md.M.obj("et"),
    tSep = et ? et.t0 : asc.t1 + 18;
  md.shPrep = {
    h,
    phi0,
    deorbit,
    rwy: RUNWAYS[md.cfg.runway] || null,
    tHU: md.cfg.headsUpMET ? t0 + md.cfg.headsUpMET : null,
    t0,
    tSep,
  };
  return md.shPrep;
}
// At tank separation the vehicle stops being drawn as the stack, which stands ahead of its state (the state is its base),
// and the orbiter (centred on its state) and the tank are drawn on their own. Each starts where it was drawn in the stack
// and lets that offset go: the part they share over a few seconds, the rest (how far the tank's own state is from where
// it sat in the stack) over a minute or two, so neither jumps and they do not slide against each other.
// Returns the offset along the model's axes (model units), or null.
const SH_SEP_TAU = 12,
  SH_SEP_DRIFT = 60; // s
const _vSep = new THREE.Vector3(),
  _qSep = new THREE.Quaternion();
function shuttleSepShift(c, t, cfgL, model, s) {
  const md = MV.md;
  if (!md || !isShuttle(md) || s.surface || s.pad) return null;
  const orb =
      c.o.id === "ship" && cfgL && cfgL.key === "sc" && cfgL.sc === "shuttle",
    tank = c.o.id === "et";
  if (!orb && !tank) return null;
  const P = shuttlePrep(md);
  if (!P) return null;
  const dt = t - P.tSep;
  if (dt < 0 || dt > 8 * SH_SEP_DRIFT) return null;
  if (c.sepFor !== P) {
    c.sepFor = P;
    c.sepW = shuttleSepWorld(c, P, model);
  }
  const W = c.sepW;
  if (!W) return null;
  const fo = Math.exp(-dt / SH_SEP_TAU),
    fr = Math.exp(-dt / SH_SEP_DRIFT);
  _vSep
    .set(W[0] * fo + W[3] * fr, W[1] * fo + W[4] * fr, W[2] * fo + W[5] * fr)
    .applyQuaternion(_qSep.copy(c.node.quaternion).invert());
  return [_vSep.x, _vSep.y, _vSep.z];
}
// the offsets at separation, in the scene's axes: [shared part, the tank's remainder]
function shuttleSepWorld(c, P, model) {
  const ship = craftById("ship"),
    tB = P.tSep - 0.05,
    cfgS = ship && cfgAt(ship, tB);
  if (!cfgS || cfgS.key !== "launch") return null;
  const tmp = { ...ship };
  computeCraft(tmp, tB);
  if (!tmp.s) return null;
  const sm = craftModel(ship, cfgS),
    A =
      anchorY(ship, cfgS, sm, tmp.s) +
      stagingShift(ship, tB, cfgS, sm, tmp.s) -
      sm.userData.yc; // the stack's own origin (the tank's) along its axis
  const qS = craftAttitude(
    tmp,
    tmp.s,
    tB,
    cfgS,
    activeMounts(tmp, tmp.s, tB, cfgS, sm),
    new THREE.Quaternion(),
  );
  const rot = (v) =>
    new THREE.Vector3(v[0], v[1], v[2]).applyQuaternion(qS).toArray();
  // the orbiter: its reference point in the stack less where its own model puts it (the model is the stack's turned half
  // round about Y, which moves neither the origin nor the axis)
  const ycO = craftModel(ship, cfgAt(ship, P.tSep + 1)).userData.yc,
    So = rot([0, A + SH_STACK.orbY + ycO, SH_STACK.orbZ]);
  if (c.o.id === "ship") return [...So, 0, 0, 0];
  // the tank: its origin in the stack less where its own state and model put it (it leaves with the stack's attitude)
  const tA = P.tSep + 0.001,
    a = { ...ship },
    b = { ...c };
  computeCraft(a, tA);
  computeCraft(b, tA);
  if (!a.P || !b.P) return null;
  const k = 1 / (c.node.scale.x || 0.001),
    d = vsub(a.P, b.P),
    r = rot([0, A - (model.position.y - model.userData.yc), 0]);
  const Se = [d[0] * k + r[0], d[1] * k + r[1], d[2] * k + r[2]];
  return [...So, Se[0] - So[0], Se[1] - So[1], Se[2] - So[2]];
}
// the orbiter sits in the stack model turned half round about its long axis (buildShuttleStack): going between the two
// models, its eased attitude takes the half turn too instead of rolling over on screen
function shuttleHalfTurn(c, a, b) {
  const st = (x) => x && x.key === "launch",
    ob = (x) => x && x.key === "sc" && x.sc === "shuttle";
  return c.o.model === "shuttle" && ((st(a) && ob(b)) || (ob(a) && st(b)));
}
function runwayDir(rwy, rD, t) {
  const lf = localFrame("earth", rD, t),
    a = rwy.hdg * DEG;
  return vunit(
    vadd(vscale(lf.north, Math.cos(a)), vscale(lf.east, Math.sin(a))),
  );
}
// attitude {nose, roll, spin (about the nose), pitch (about the wings)} or null for the generic rules
function shuttleAttitude(c, s, t, cfgL) {
  const md = MV.md,
    P = shuttlePrep(md);
  if (!P || !cfgL) return null;
  const rD = c.rD || s.r,
    vD = c.vD || s.v,
    up = vunit(rD),
    ex = s.extra || {};
  if (cfgL.key === "launch") {
    // the stack: heads-down after the roll program, heads-up later on some flights
    const A = vunit(vcross(P.h, up)),
      ref = vunit(vsub(up, A));
    const nose =
      s.pad || t < P.t0
        ? up
        : s.T > 0 && s.dir && vnorm(s.dir) > 0.5
          ? s.dir
          : vunit(vD);
    let spin = P.phi0 * (1 - smoothstep((t - P.t0 - 7) / 13));
    if (P.tHU && t > P.tHU) spin += Math.PI * smoothstep((t - P.tHU) / 36);
    return { nose, roll: ref, spin };
  }
  if (c.o.model === "hubble") return { nose: up, roll: vscale(vunit(vD), -1) }; // released upright, as the arm held it
  if (c.o.id === "et") {
    const A = vunit(vcross(P.h, up));
    return {
      nose: vunit(vD),
      roll: vunit(vsub(up, A)),
      spin: P.tHU ? Math.PI : 0,
    };
  } // as it left the stack
  if (cfgL.sc !== "shuttle") return null;
  const w = bodyOmegaEcl("earth", t),
    vAir = vsub(vD, vcross(w, rD));
  if (s.surface)
    return {
      nose: P.rwy ? runwayDir(P.rwy, rD, t) : vperp(up),
      roll: up,
      pitch: SH_STANCE,
    }; // standing nose down on its gear
  const att = cfgL.att;
  if (att === "entry") {
    // along the airflow, raised by the angle of attack, the lift vector banked about the flight path
    let f = vunit(vAir);
    if (vnorm(vAir) < 0.004 && P.rwy) f = runwayDir(P.rwy, rD, t);
    const u0 = vsub(up, vscale(f, vdot(up, f))),
      u = vnorm(u0) > 1e-9 ? vunit(u0) : vperp(f),
      right = vcross(f, u);
    const mu = (ex.bank ?? 0) * DEG,
      al = (ex.alpha ?? 40) * DEG;
    const lift = vadd(vscale(u, Math.cos(mu)), vscale(right, Math.sin(mu)));
    return {
      nose: vadd(vscale(f, Math.cos(al)), vscale(lift, Math.sin(al))),
      roll: lift,
    };
  }
  const dB = P.deorbit; // deorbit: tail first and upside down, until the pitch-around to the entry attitude
  if (dB && t >= dB.t - 1200 && t <= dB.t + dB.dur + 600)
    return { nose: vscale(vunit(vD), -1), roll: vscale(up, -1) };
  // heads-down flights: the orbiter leaves the tank upside down and rolls over ten minutes later
  const spin = P.tHU ? 0 : Math.PI * (1 - smoothstep((t - P.tSep - 600) / 60));
  if (s.T > 0 && s.dir && vnorm(s.dir) > 0.5)
    return { nose: s.dir, roll: up, spin };
  if (att === "rbar" || att === "rpm" || att === "vbar" || att === "fly") {
    const iss = craftById("iss");
    const F =
      iss && iss.s ? lvlh(iss.rD || iss.s.r, iss.vD || iss.s.v) : lvlh(rD, vD);
    if (att === "rbar") return { nose: F.x, roll: F.z }; // payload bay up toward the station
    if (att === "rpm")
      return {
        nose: F.x,
        roll: F.z,
        pitch: TAU * smoothstep((t - cfgL.rpm0) / (cfgL.rpm1 - cfgL.rpm0)),
      }; // the back-flip
    if (att === "vbar")
      return {
        nose: F.x,
        roll: F.z,
        pitch:
          (Math.PI / 2) *
          (cfgL.sw0 != null
            ? smoothstep((t - cfgL.sw0) / (cfgL.sw1 - cfgL.sw0))
            : 1),
      }; // nose up, bay facing the station
    const rel = iss && iss.P ? toLvlh(F, vsub(c.P, iss.P)) : [1, 0, 0]; // flyaround: the bay keeps facing the station
    return {
      nose: F.x,
      roll: F.z,
      pitch: Math.PI / 2 + Math.atan2(rel[2], rel[0]),
    };
  }
  return { nose: vunit(vD), roll: up, spin }; // in orbit: nose forward, payload bay facing space
}
// rotate the attitude quaternion by the extra spin/pitch of a shuttle attitude
function applyShuttleSpin(nd, q) {
  if (nd.spin) {
    _qS.setFromAxisAngle(_axY, nd.spin);
    q.multiply(_qS);
  }
  if (nd.pitch) {
    _qS.setFromAxisAngle(_axX, nd.pitch);
    q.multiply(_qS);
  }
}
// With the gear down near the runway, the main wheels on the ground whatever the pitch: in the flare the reference point is
// raised where the planned path (for wings level and the reference plane at gear height) would sink them, and on the runway
// it rides at the height that keeps them on the paint as the nose comes down to the 4.4° stance. Standing after wheel stop
// it stays at that height (the ground under it is where groundCraft put the state): the chase camera and the scene's origin
// follow the reference point, and would drop 5.6 m at wheel stop if it went down to the ground.
function shuttleGround(c, s, t) {
  const P = shuttlePrep(MV.md);
  if (!P || !P.rwy || s.pad) return;
  const cf = c.o.configAt(t),
    lab = cf && cf.label;
  if (s.surface) {
    if (lab && lab.key === "sc") {
      s.r = vscale(s.r, 1 + SH_STAND_H / 1000 / vnorm(s.r));
      s.v = vcross(bodyOmegaEcl("earth", t), s.r);
    }
    return;
  }
  if (!lab || !lab.gear) return;
  const Rr = R_E + P.rwy.elev,
    h = vnorm(s.r) - Rr;
  if (h > 0.015) return;
  const al = ((s.extra && s.extra.alpha) || 0) * DEG,
    hMin =
      (-SH_MAIN_GEAR[0] * Math.sin(al) - SH_MAIN_GEAR[1] * Math.cos(al)) /
        1000 +
      SH_RWY_TOP +
      0.00002;
  const rolling = s.extra && /rollout|wheel stop/.test(s.extra.phase || "");
  if (h < hMin || rolling) s.r = vscale(s.r, (Rr + hMin) / vnorm(s.r)); // tyres 2 cm above the paint, as standing craft are
  if (rolling) {
    // and moving over it, not into it: the nose follows the way it rolls even as it comes to rest
    const w = vcross(bodyOmegaEcl("earth", t), s.r),
      up = vunit(s.r),
      vg = vsub(s.v, w);
    s.v = vadd(w, vsub(vg, vscale(up, vdot(vg, up))));
  }
}
// The runway is drawn on the true sphere, SH_RWY_TOP above its elevation, while the surface patch under it is made of flat
// facets that sag up to ~0.7 m below the sphere between their corners. Radius (km) of the drawn runway under a direction
// in the planet's mesh frame, or null off the runway: what an orbiter standing on it rests on.
const SH_RWY_TOP = 0.0006; // (60 cm: above the site's terrain too, app/43_terrain.js)

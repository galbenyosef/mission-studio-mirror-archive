// index-inline-1 40 — math
// Lines 13219-13697 of readable/index-inline-1.pretty.js (statement-aligned).
function shuttleApproach(start, rwy, opt) {
  const g = 9.80665,
    t0 = start.t,
    Rb = R_E + rwy.elev,
    gearH = 0.00603,
    ogs = (opt.ogs || 19) * DEG; // gearH: the orbiter's reference plane above the main wheels, wings level
  const omega = bodyOmegaEcl("earth", t0),
    Mb = bodyFixedToEcl("earth", t0),
    toBF = (v) => mvec(mT(Mb), v);
  const rB = toBF(start.r),
    vB = toBF(vsub(start.v, vcross(omega, start.r)));
  const U = llToBF(rwy.lat, rwy.lon),
    Tp = vscale(U, Rb),
    E = vunit(vcross([0, 0, 1], U)),
    N = vcross(U, E);
  const f = vadd(
      vscale(N, Math.cos(rwy.hdg * DEG)),
      vscale(E, Math.sin(rwy.hdg * DEG)),
    ),
    lf = vcross(U, f);
  const toXY = (p) => {
    const d = vunit(p),
      k = Rb / vdot(d, U);
    return [k * vdot(d, f), k * vdot(d, lf)];
  }; // the inverse of posBF below: the path starts where the entry ends (a plain projection put it 400–600 m off)
  const P0 = toXY(rB),
    h0 = vnorm(rB) - Rb,
    upL = vunit(rB);
  const vh = vsub(vB, vscale(upL, vdot(vB, upL)));
  const dir0 = (() => {
    const d = [vdot(vh, f), vdot(vh, lf)],
      n = Math.hypot(d[0], d[1]);
    return [d[0] / n, d[1] / n];
  })();
  const gam0 = Math.asin(clamp(vdot(vB, upL) / vnorm(vB), -1, 1));
  const XA = -2.29,
    XE = -12.0,
    rH = 5.5,
    hE = (XA - XE) * Math.tan(ogs),
    XTD = 0.762;
  // heading alignment cone: pick the side whose tangent line asks for the least turn at the start
  const opts = [1, -1]
    .map((s) => {
      const C = [XE, s * rH],
        d = Math.hypot(P0[0] - C[0], P0[1] - C[1]);
      if (d < rH * 1.3) return null;
      const be = Math.atan2(P0[1] - C[1], P0[0] - C[0]),
        thQ = s > 0 ? be + Math.acos(rH / d) : be - Math.acos(rH / d);
      const Q = [C[0] + rH * Math.cos(thQ), C[1] + rH * Math.sin(thQ)],
        dQ =
          s > 0
            ? [-Math.sin(thQ), Math.cos(thQ)]
            : [Math.sin(thQ), -Math.cos(thQ)];
      const thE = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      let dth = s > 0 ? thE - thQ : thQ - thE;
      dth = ((dth % TAU) + TAU) % TAU;
      const lq = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]),
        dirPQ = [(Q[0] - P0[0]) / lq, (Q[1] - P0[1]) / lq];
      const hd = Math.acos(
        clamp(dirPQ[0] * dir0[0] + dirPQ[1] * dir0[1], -1, 1),
      );
      return {
        s,
        C,
        thQ,
        Q,
        dQ,
        dth,
        cost: hd + (dth < 100 * DEG ? 0.6 : 0) + (dth > 320 * DEG ? 0.6 : 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.cost - b.cost);
  const hac = opts[0];
  // ground path: Bézier to the cone, arc around it, straight in along the centreline
  const pts = [];
  {
    const lq = Math.hypot(hac.Q[0] - P0[0], hac.Q[1] - P0[1]),
      a = 0.42 * lq;
    const B1 = [P0[0] + a * dir0[0], P0[1] + a * dir0[1]],
      B2 = [hac.Q[0] - a * hac.dQ[0], hac.Q[1] - a * hac.dQ[1]];
    const n = Math.max(60, Math.ceil(lq / 0.4));
    for (let i = 0; i < n; i++) {
      const u = i / n,
        w = 1 - u;
      pts.push({
        x:
          w * w * w * P0[0] +
          3 * w * w * u * B1[0] +
          3 * w * u * u * B2[0] +
          u * u * u * hac.Q[0],
        y:
          w * w * w * P0[1] +
          3 * w * w * u * B1[1] +
          3 * w * u * u * B2[1] +
          u * u * u * hac.Q[1],
        seg: "taem",
      });
    }
  }
  const nA = Math.max(30, Math.ceil(hac.dth / (1 * DEG)));
  for (let i = 0; i < nA; i++) {
    const th = hac.thQ + (hac.s * hac.dth * i) / nA;
    pts.push({
      x: hac.C[0] + rH * Math.cos(th),
      y: hac.C[1] + rH * Math.sin(th),
      seg: "hac",
    });
  }
  const xEnd = XTD + rwy.len * 0.95;
  for (let x = XE; x <= xEnd; x += x < XTD - 1 ? 0.1 : 0.01)
    pts.push({ x, y: 0, seg: x < XTD ? "final" : "roll" });
  let L = 0;
  pts[0].l = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    pts[i].l = L;
  }
  const iE = pts.findIndex((p) => p.seg === "final"),
    lE = pts[iE].l;
  // altitude: monotone cubic from the TAEM state down to the cone exit, then the glideslopes
  const dH = hE - h0;
  let m0 = Math.tan(gam0) * lE,
    m1 = -Math.tan(ogs) * lE;
  {
    const a = m0 / dH,
      b = m1 / dH;
    if (a < 0) m0 = 0;
    if (b < 0) m1 = 0;
    const rr = Math.hypot(m0 / dH, m1 / dH);
    if (rr > 3) {
      m0 *= 3 / rr;
      m1 *= 3 / rr;
    }
  }
  const hAt = (p) => {
    if (p.seg === "taem" || p.seg === "hac") {
      const u = p.l / lE,
        u2 = u * u,
        u3 = u2 * u;
      return (
        (2 * u3 - 3 * u2 + 1) * h0 +
        (u3 - 2 * u2 + u) * m0 +
        (-2 * u3 + 3 * u2) * hE +
        (u3 - u2) * m1
      );
    }
    if (p.seg === "roll") return gearH;
    const hPf = 0.533,
      xPf = XA - hPf / Math.tan(ogs);
    if (p.x <= xPf) return (XA - p.x) * Math.tan(ogs);
    const u = (p.x - xPf) / (XTD - xPf),
      u2 = u * u,
      u3 = u2 * u,
      Dx = XTD - xPf,
      s0 = -Math.tan(ogs) * Dx,
      s1 = -0.012 * Dx;
    return (
      (2 * u3 - 3 * u2 + 1) * hPf +
      (u3 - 2 * u2 + u) * s0 +
      (-2 * u3 + 3 * u2) * gearH +
      (u3 - u2) * s1
    );
  };
  for (const p of pts) p.h = hAt(p);
  // speed: equivalent airspeed held near 290 knots (150 m/s), true airspeed follows the air density
  const rho0 = 1.225,
    sig = (hh) => earthAtmos(hh + rwy.elev).rho / rho0;
  const eas0 = vnorm(vB) * 1000 * Math.sqrt(sig(h0)),
    xPf = XA - 0.533 / Math.tan(ogs);
  const vTD = 100 / Math.sqrt(sig(0));
  for (const p of pts) {
    if (p.seg === "taem" || p.seg === "hac") {
      const u = clamp(p.l / lE, 0, 1);
      p.v = (eas0 + (150 - eas0) * smoothstep(u)) / Math.sqrt(sig(p.h));
    } else if (p.seg === "final") {
      const eas =
        p.x <= xPf ? 150 : 150 + ((100 - 150) * (p.x - xPf)) / (XTD - xPf);
      p.v = eas / Math.sqrt(sig(p.h));
    }
  }
  // rollout: decelerate on the runway (aero drag and rolling, then brakes, plus the drag chute when fitted)
  const iTD = pts.findIndex((p) => p.seg === "roll");
  let tt = 0;
  for (let i = 1; i < iTD; i++) {
    const p = pts[i],
      q = pts[i - 1],
      ds = (p.l - q.l) * 1000,
      dh = (p.h - q.h) * 1000,
      vg = Math.max(0.5 * (p.v + q.v), 1) * Math.cos(Math.atan2(dh, ds));
    tt += ds / vg;
    p.t = tt;
  }
  pts[0].t = 0;
  const tTD = pts[iTD - 1].t + 0.2,
    chuteT = opt.chute ? tTD + 5.6 : null,
    noseT = tTD + 10;
  // rollout: aerodynamic drag and rolling friction, the drag chute, then the brakes below 140 knots; the braking is
  // scaled to the flight's recorded rollout distance
  const rollRun = (k) => {
    let v = vTD,
      x = pts[iTD].x,
      tR = tTD,
      chuteJet = null;
    const roll = [];
    while (v > 0.05 && roll.length < 6000) {
      let a = 1.0;
      if (tR > noseT && v < 74) a += 1.6 * k;
      if (chuteT && tR > chuteT + 2 && !chuteJet) a += 0.7;
      if (chuteT && !chuteJet && v < 31) chuteJet = tR;
      if (v < 3) a = Math.min(a, v / 0.8 + 0.3);
      const dt = 0.1;
      x += ((v - 0.5 * a * dt) * dt) / 1000;
      v = Math.max(0, v - a * dt);
      tR += dt;
      roll.push({ t: tR, x, v });
    }
    return { roll, chuteJet, tStop: tR, dist: x - pts[iTD].x };
  };
  let kb = 1,
    RR = rollRun(kb);
  for (
    let it = 0;
    it < 12 && Math.abs(RR.dist - (opt.rollout || 2.7)) > 0.02;
    it++
  ) {
    kb = clamp(kb * Math.pow(RR.dist / (opt.rollout || 2.7), 1.6), 0.3, 4);
    RR = rollRun(kb);
  }
  const roll = RR.roll,
    chuteJet = RR.chuteJet,
    tStop = RR.tStop;
  // samples on a regular clock, converted to ECL
  const P = pts.slice(0, iTD);
  const posBF = (px, py, hh) =>
    vscale(vunit(vadd(Tp, vadd(vscale(f, px), vscale(lf, py)))), Rb + hh);
  const curv = (i) => {
    const a = P[Math.max(0, i - 3)],
      b = P[i],
      c = P[Math.min(P.length - 1, i + 3)];
    const ax = b.x - a.x,
      ay = b.y - a.y,
      bx = c.x - b.x,
      by = c.y - b.y;
    const cr = ax * by - ay * bx,
      la = Math.hypot(ax, ay),
      lb = Math.hypot(bx, by),
      lc = Math.hypot(c.x - a.x, c.y - a.y);
    return la * lb * lc > 1e-9 ? (2 * cr) / (la * lb * lc) : 0;
  };
  const samples = [],
    events = [];
  const at = (tq) => {
    // state on the path at time tq (s after TAEM)
    if (tq >= tTD) {
      let k = roll.findIndex((r) => r.t >= tq);
      if (k < 0) k = roll.length - 1;
      const r = roll[k],
        x0 = r.x;
      return {
        x: x0,
        y: 0,
        h: gearH,
        v: r.v,
        seg: "roll",
        dir: [1, 0],
        vh: 0,
        kap: 0,
      };
    }
    let j = P.findIndex((p) => p.t >= tq);
    if (j < 0) j = P.length - 1;
    if (j < 1) j = 1; // past the last approach point (touchdown is 0.2 s later): hold it, not the start of TAEM
    const a = P[j - 1],
      b = P[j],
      w = clamp((tq - a.t) / Math.max(b.t - a.t, 1e-6), 0, 1);
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
    return {
      x: a.x + (b.x - a.x) * w,
      y: a.y + (b.y - a.y) * w,
      h: a.h + (b.h - a.h) * w,
      v: a.v + (b.v - a.v) * w,
      seg: w < 0.5 ? a.seg : b.seg,
      dir: [(b.x - a.x) / dl, (b.y - a.y) / dl],
      vh: ((b.h - a.h) * 1000) / Math.max(b.t - a.t, 1e-6),
      kap: curv(j),
    };
  };
  let bankS = 0,
    lastT = 0,
    machOne = false,
    hacEv = false,
    alEv = false,
    pfEv = false,
    gearT = null;
  const tEnd = tStop;
  for (let tq = 0; tq <= tEnd + 1e-6; tq += tq < tTD - 40 ? 1 : 0.5) {
    const s = at(tq),
      tAbs = t0 + tq;
    const hAbs = s.h + rwy.elev,
      atm = earthAtmos(hAbs),
      vms = s.v,
      mach = vms / atm.a,
      q = 0.5 * atm.rho * vms * vms;
    const bankT =
      s.seg === "roll" ? 0 : -Math.atan((vms * vms * s.kap) / 1000 / g) * RAD;
    bankS += (bankT - bankS) * clamp((tq - lastT) / 2.5, 0, 1);
    lastT = tq;
    let alpha =
      mach > 1
        ? 9 + 5 * clamp((mach - 1) / 1.5, 0, 1)
        : s.seg === "final"
          ? s.x > xPf
            ? 6 + 4 * clamp((s.x - xPf) / (XTD - xPf), 0, 1)
            : 6
          : 8;
    if (s.seg === "roll")
      alpha = 10 - (10 + 4.39) * smoothstep((tq - tTD - 4) / 6); // derotation: the nose comes down until the nose wheels touch, the orbiter 4.39° nose down on its gear
    const pB = posBF(s.x, s.y, s.h);
    const dB = vadd(vscale(f, s.dir[0]), vscale(lf, s.dir[1]));
    const upB = vunit(pB),
      dBh = vunit(vsub(dB, vscale(upB, vdot(dB, upB))));
    const vBv = vadd(
      vscale(dBh, Math.sqrt(Math.max(vms * vms - s.vh * s.vh, 0)) / 1000),
      vscale(upB, s.vh / 1000),
    );
    const M_ = bodyFixedToEcl("earth", tAbs),
      w = bodyOmegaEcl("earth", tAbs),
      r = mvec(M_, pB),
      vv = vadd(mvec(M_, vBv), vcross(w, r));
    const phase =
      s.seg === "taem"
        ? mach > 1
          ? "TAEM — supersonic glide"
          : "TAEM — subsonic glide"
        : s.seg === "hac"
          ? "heading alignment cone"
          : s.seg === "final"
            ? s.x > xPf
              ? "flare — inner glideslope"
              : "final approach — outer glideslope"
            : tq < tStop - 0.01
              ? "rollout"
              : "wheel stop";
    samples.push({
      t: tAbs,
      r,
      v: vv,
      m: opt.m,
      T: 0,
      thrDir: null,
      D: [0, 0, 0],
      alt: hAbs,
      q,
      mach,
      heat: 0,
      gload: 1 / Math.cos(bankS * DEG),
      phase,
      bank: bankS,
      alpha,
      _va: mvec(M_, vBv),
      _vs: vms,
      _vh: s.vh,
    });
    if (!machOne && mach < 1) {
      machOne = true;
      events.push({
        t: tAbs,
        name: "Sonic booms",
        desc: `The orbiter slows below the speed of sound ${Math.round(hAbs)} km up. A moment later the twin “ba-boom” of its bow and tail shock waves rolls across ${rwy.short.split(" Runway")[0]}: the signal for spectators that the orbiter is coming in.`,
        kind: "info",
      });
    }
    if (!hacEv && s.seg === "hac") {
      hacEv = true;
      events.push({
        t: tAbs,
        name: "Heading alignment cone",
        desc: `The orbiter banks into a ${Math.round(hac.dth * RAD)}° turn around an imaginary cone ${rH.toFixed(1)} km in radius, spiralling down to line up with ${rwy.short}. The radius of the turn is the energy control: wider to fly a longer path, tighter to cut it short.`,
        kind: "info",
      });
    }
    if (!alEv && s.seg === "final") {
      alEv = true;
      events.push({
        t: tAbs,
        name: "Approach and landing",
        desc: `On the centreline, ${((hAbs * 1000) / 0.3048 / 1000).toFixed(0)},000 ft up at 290 knots: the orbiter dives down the ${(ogs * RAD).toFixed(0)}° outer glideslope, about seven times steeper than an airliner’s, with the speed brake (the split rudder) holding the airspeed.`,
        kind: "approach",
      });
    }
    if (!pfEv && s.seg === "final" && s.x > xPf) {
      pfEv = true;
      events.push({
        t: tAbs,
        name: "Preflare",
        desc: "At 1,750 ft the commander pulls the nose up, flattening the dive onto the 1.5° inner glideslope.",
        kind: "approach",
      });
    }
    if (gearT == null && s.seg === "final" && s.h < 0.09) {
      gearT = tAbs;
      events.push({
        t: tAbs,
        name: "Landing gear down",
        desc: "The pilot arms and deploys the landing gear at about 300 ft — late, because the gear doors are part of the heat shield and the extended gear adds drag. Gravity and springs lower it in seconds.",
        kind: "info",
      });
    }
  }
  // drag (and on the runway, braking) from the along-path balance: dV/dt = −D/m − g·sin γ
  const Dacc = samples.map((s, i) => {
    const a = samples[Math.max(0, i - 1)],
      b = samples[Math.min(samples.length - 1, i + 1)];
    const dVdt = b.t > a.t ? (b._vs - a._vs) / (b.t - a.t) : 0,
      sg = s._vs > 1 ? clamp(s._vh / s._vs, -1, 1) : 0;
    return Math.max(0, -dVdt - g * sg);
  });
  samples.forEach((s, i) => {
    if (vnorm(s._va) > 1e-9) s.D = vscale(vunit(s._va), -opt.m * Dacc[i]);
    delete s._va;
    delete s._vs;
    delete s._vh;
  });
  const roll0 = roll[0],
    tdV = vTD;
  events.push({
    t: t0 + tTD,
    name: "Main gear touchdown",
    desc: `${Math.round(tdV / 0.5144)} knots (${Math.round(tdV * 3.6)} km/h), ${Math.round((XTD * 1000) / 0.3048)} ft past the threshold of ${rwy.short}.`,
    kind: "touchdown",
  });
  if (chuteT)
    events.push({
      t: t0 + chuteT,
      name: "Drag chute",
      desc: "The 40-ft drag chute deploys from the base of the tail, cutting the rollout by about 2,000 ft and saving the brakes (used from 1992).",
      kind: "chute",
    });
  events.push({
    t: t0 + noseT,
    name: "Nose gear touchdown",
    desc: "The commander lowers the nose (derotation); the brakes come on below 140 knots.",
    kind: "info",
  });
  if (chuteJet)
    events.push({
      t: t0 + chuteJet,
      name: "Drag chute jettisoned",
      desc: "Released at about 60 knots so it cannot drag the orbiter off the centreline.",
      kind: "jettison",
    });
  const rollDist = (roll[roll.length - 1].x - (roll0 ? roll0.x : XTD)) * 1000;
  events.push({
    t: t0 + tStop,
    name: "“Wheel stop”",
    desc: `The orbiter rolls to a stop ${Math.round(rollDist)} m (${Math.round(rollDist / 0.3048)} ft) down the runway. Ground crews in protective suits check for toxic propellant vapour before the crew can leave, about an hour later.`,
    kind: "landing",
  });
  const llOf = (px, py) => bfToLL(posBF(px, py, 0));
  return {
    samples,
    events,
    tTD: t0 + tTD,
    tStop: t0 + tStop,
    tGear: gearT || t0 + tTD - 15,
    tChute: chuteT ? t0 + chuteT : null,
    tChuteJet: chuteJet ? t0 + chuteJet : null,
    stopLL: llOf(roll[roll.length - 1].x, 0),
    tdLL: llOf(XTD, 0),
    hacTurn: hac.dth * RAD,
  };
}

// ---- scenarios.js
// ============================================================================
// scenarios.js — real-mission presets (sources: NASA mission reports, Wikipedia
// mission pages, CNSA releases). Times UTC.  MET = hours after liftoff.
// ============================================================================

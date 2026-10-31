// index-inline-1 30 — best
// Lines 10654-11051 of readable/index-inline-1.pretty.js (statement-aligned).
function orbitThenLand(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  t,
  r,
  v,
  body,
  mass,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const site = leg.site,
    tLand = isoToT(leg.tLand);
  progress("Designing the descent from orbit…");
  // reference EDL from a typical orbital entry (4.8 km/s, -11°) for range/duration
  const ref = marsEntryRef(SC, P, 4.8, leg.entryFpa ?? -11.5, 30);
  // deorbit orbit: periapsis below the surface so that entry happens at fpa; apoapsis = current apoapsis
  const el = rv2coe(r, v, mu);
  const ra = leg.parkApo ? R + leg.parkApo : el.ra;
  const rEI = R + 125,
    g = (leg.entryFpa ?? -11.5) * DEG;
  // choose periapsis radius so fpa at EI = g on an ellipse with apoapsis ra
  const fpaAt = (rpx) => {
    const a = (ra + rpx) / 2,
      e = (ra - rpx) / (ra + rpx),
      p = a * (1 - e * e);
    const vE = Math.sqrt(mu * (2 / rEI - 1 / a));
    const h = Math.sqrt(mu * p);
    return -Math.acos(clamp(h / (rEI * vE), -1, 1));
  };
  const rpD = bisectRoot((rpx) => fpaAt(rpx) - g, 0.2 * R, rEI - 1) ?? R * 0.9;
  // landing geometry in inertial space: plane containing site at landing; EI point = site rotated back by range
  const sL = vunit(sitePosEcl(body, site.lat, site.lon, site.elev || 0, tLand));
  let hO = vunit(el.h);
  // plane: rotate current plane minimally so that it contains the site at landing
  let hD = vunit(vsub(hO, vscale(sL, vdot(hO, sL))));
  const eiDir = vrot(sL, hD, -ref.range);
  const aD = (ra + rpD) / 2,
    eD = (ra - rpD) / (ra + rpD),
    pD = aD * (1 - eD * eD);
  const nuEI = -Math.acos(clamp((pD / rEI - 1) / eD, -1, 1));
  const periDir = vrot(eiDir, hD, -nuEI);
  const apoDir = vscale(periDir, -1);
  const tEI = tLand - ref.dur;
  const Fq = 2 * Math.atan(Math.sqrt((1 - eD) / (1 + eD)) * Math.tan(nuEI / 2));
  const Mq = Fq - eD * Math.sin(Fq);
  const nD = Math.sqrt(mu / (aD * aD * aD)),
    tPeriD = tEI - Mq / nD; // Mq negative
  const tApoD = tPeriD - Math.PI / nD;
  // state at deorbit point (apoapsis of deorbit orbit)
  const vApoD = Math.sqrt(mu * (2 / ra - 1 / aD));
  const rDeo = vscale(apoDir, ra),
    vDeoAfter = vscale(vunit(vcross(hD, apoDir)), vApoD);
  // parking orbit = same apoapsis point, periapsis R+parkPeri, same plane hD, reached by a Lambert transfer from current orbit
  const rpPark = R + (leg.parkPeri ?? 280);
  const aP = (ra + rpPark) / 2,
    vApoP = Math.sqrt(mu * (2 / ra - 1 / aP));
  const vDeoBefore = vscale(vunit(vcross(hD, apoDir)), vApoP);
  const perP = 2 * Math.PI * Math.sqrt((aP * aP * aP) / mu);
  const nRev = Math.max(1, Math.floor((tApoD - t - 3 * D) / perP));
  const tJoin = tApoD - nRev * perP; // parking orbit apoapsis time (state rDeo, vDeoBefore)
  // Lambert from current orbit (depart at an apoapsis passage) to the parking orbit state at tJoin + half period (its periapsis) — choose min Δv
  let best = null;
  const per0 = el.period;
  // depart near capture-orbit apoapsis passages, arrive at parking-orbit apoapsis passages (slow → cheap)
  const tApo0 = t + timeToPeri(r, v, mu) + per0 / 2;
  const deps = [t + 600];
  for (let j = -1; j < 4; j++) {
    const td = tApo0 + j * per0;
    if (td > t + 600) deps.push(td);
  }
  for (const tDepT of deps) {
    if (tDepT > tApoD - 2 * D) continue;
    const s0 = kepProp(r, v, tDepT - t, mu);
    for (let k = 0; k < 200; k++) {
      const tArrT = tApoD - k * perP;
      if (tArrT < tDepT + 1 * D) break;
      if (tArrT > tDepT + 30 * D) continue;
      for (const off of [-0.2, 0, 0.2]) {
        const ta = tArrT + off * perP;
        const sJ = kepProp(rDeo, vDeoBefore, ta - tApoD, mu);
        const Lb = lambert(
          s0.r,
          sJ.r,
          ta - tDepT,
          mu,
          vunit(vcross(s0.r, s0.v)),
        );
        if (!Lb) continue;
        const tot = vnorm(vsub(Lb.v1, s0.v)) + vnorm(vsub(sJ.v, Lb.v2));
        if (!best || tot < best.tot)
          best = { tot, tDepT, tArrT: ta, s0, sJ, Lb };
      }
    }
  }
  if (best) {
    best.tJoinRef = tApoD;
  }
  const engO = SC.prop.orbiter;
  if (best) {
    ship.add(
      new ConicSeg(body, t, best.tDepT, r, v, mass, {
        extra: { phase: "capture orbit" },
      }),
    );
    const dv1 = vsub(best.Lb.v1, best.s0.v),
      p1 = P.burn(engO, mass, vnorm(dv1));
    ship.add(
      new BurnSeg(
        body,
        best.tDepT,
        Math.max(p1.dur, 1),
        best.s0.r,
        best.s0.v,
        best.Lb.v1,
        mass,
        mass - p1.prop,
        p1.thrust,
        { extra: { phase: "orbit change" } },
      ),
    );
    M.burn({
      name: "Orbit change 1 (toward parking orbit)",
      t: best.tDepT,
      dur: p1.dur,
      dv: vnorm(dv1) * 1000,
      engine: p1.engine,
      isp: p1.isp,
      prop: p1.prop,
      m0: mass,
      obj: "ship",
      propType: p1.propType,
    });
    M.ev(
      best.tDepT,
      "ship",
      "Orbit change toward the parking orbit",
      `Two-impulse transfer into a parking orbit whose ground track passes over the landing site on landing day. Δv ${(vnorm(dv1) * 1000).toFixed(0)} m/s.`,
      "burn",
    );
    mass -= p1.prop;
    const tb = best.tDepT + Math.max(p1.dur, 1) / 2;
    const sb = kepProp(best.s0.r, best.Lb.v1, Math.max(p1.dur, 1) / 2, mu);
    ship.add(
      new ConicSeg(body, tb, best.tArrT, sb.r, sb.v, mass, {
        extra: { phase: "transfer orbit" },
      }),
    );
    const sA2 = kepProp(best.s0.r, best.Lb.v1, best.tArrT - best.tDepT, mu);
    const dv2 = vsub(best.sJ.v, sA2.v),
      p2 = P.burn(engO, mass, vnorm(dv2));
    ship.add(
      new BurnSeg(
        body,
        best.tArrT,
        Math.max(p2.dur, 1),
        sA2.r,
        sA2.v,
        best.sJ.v,
        mass,
        mass - p2.prop,
        p2.thrust,
        { extra: { phase: "orbit change" } },
      ),
    );
    M.burn({
      name: "Orbit change 2 (parking orbit)",
      t: best.tArrT,
      dur: p2.dur,
      dv: vnorm(dv2) * 1000,
      engine: p2.engine,
      isp: p2.isp,
      prop: p2.prop,
      m0: mass,
      obj: "ship",
      propType: p2.propType,
    });
    M.ev(
      best.tArrT,
      "ship",
      "Parking orbit",
      `Orbit ${Math.round(rpPark - R)} × ${Math.round(ra - R).toLocaleString()} km. The lander will be released from here. Δv ${(vnorm(dv2) * 1000).toFixed(0)} m/s.`,
      "burn",
    );
    mass -= p2.prop;
    const tc = best.tArrT + Math.max(p2.dur, 1) / 2,
      sc2 = kepProp(best.sJ.r, best.sJ.v, Math.max(p2.dur, 1) / 2, mu);
    ship.add(
      new ConicSeg(body, tc, tApoD, sc2.r, sc2.v, mass, {
        extra: { phase: "parking orbit (reconnaissance of landing site)" },
      }),
    );
    M.phase(t, tApoD, `${BODIES[body].name} orbit`, "#43aa8b");
  } else {
    ship.add(
      new ConicSeg(body, t, tApoD, rDeo, vDeoBefore, mass, {
        extra: { phase: "parking orbit" },
      }),
    );
    M.warnings.push(
      "Could not find an orbit-change sequence; showing the parking orbit directly.",
    );
  }
  for (const e of leg.orbitEvents || [])
    M.ev(isoToT(e.t), "ship", e.name, e.desc, e.kind || "photo");
  // deorbit at apoapsis: lower periapsis into atmosphere, then capsule separates; orbiter raises periapsis again
  const dvD = vsub(vDeoAfter, vDeoBefore),
    pD2 = P.burn(engO, mass, vnorm(dvD));
  ship.add(
    new BurnSeg(
      body,
      tApoD,
      Math.max(pD2.dur, 1),
      rDeo,
      vDeoBefore,
      vDeoAfter,
      mass,
      mass - pD2.prop,
      pD2.thrust,
      { extra: { phase: "deorbit burn" } },
    ),
  );
  M.burn({
    name: "Deorbit burn",
    t: tApoD,
    dur: pD2.dur,
    dv: vnorm(dvD) * 1000,
    engine: pD2.engine,
    isp: pD2.isp,
    prop: pD2.prop,
    m0: mass,
    obj: "ship",
    propType: pD2.propType,
  });
  M.ev(
    tApoD,
    "ship",
    "Deorbit manoeuvre",
    `At apoapsis the stack lowers its periapsis into the atmosphere (Δv ${(vnorm(dvD) * 1000).toFixed(0)} m/s).`,
    "burn",
  );
  mass -= pD2.prop;
  const tRel = tEI - 3 * H;
  const t1 = tApoD + Math.max(pD2.dur, 1) / 2,
    s1 = kepProp(rDeo, vDeoAfter, Math.max(pD2.dur, 1) / 2, mu);
  ship.add(
    new ConicSeg(body, t1, tRel, s1.r, s1.v, mass, {
      extra: { phase: "descent orbit" },
    }),
  );
  const sR = kepProp(rDeo, vDeoAfter, tRel - tApoD, mu);
  // orbiter separates and raises periapsis
  const orb = M.addObj(
    new MObject("orbiter", cfg.orbiterName || "Orbiter", {
      model: SC.model,
      color: "#7fd1ff",
    }),
  );
  orb.setConfig(tRel, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
  const mOrb = P.massOf(SC.orbiter);
  const vUp = vadd(sR.v, vscale(vunit(sR.v), 0.03));
  orb.add(
    new ConicSeg(body, tRel, tLand + 5 * D, sR.r, vUp, mOrb, {
      extra: { phase: "orbiter (relay)" },
    }),
  );
  M.ev(
    tRel,
    "orbiter",
    "Lander separation",
    "The entry capsule separates; the orbiter raises its periapsis back to stay in orbit as a radio relay.",
    "sep",
  );
  const mEntry = P.massOf(SC.entry);
  ship.setConfig(tRel, "sc", { key: "sc", sc: SC.model, parts: ["aeroshell"] });
  const dtE = timeToRadius(sR.r, sR.v, mu, rEI, false);
  const tEIa = tRel + dtE,
    sEI = kepProp(sR.r, sR.v, dtE, mu);
  ship.add(
    new ConicSeg(body, tRel, tEIa, sR.r, sR.v, mEntry, {
      extra: { phase: "entry capsule coast" },
    }),
  );
  M.ev(
    tEIa,
    "ship",
    "Entry interface (125 km)",
    `${EXPLAIN.edl} Speed ${vnorm(sEI.v).toFixed(2)} km/s, flight-path angle ${fpaDeg(sEI.r, sEI.v).toFixed(1)}°.`,
    "entry",
  );
  progress("Entry, descent & landing…");
  const run = (b) => runMarsEDL(SC, P, tEIa, sEI.r, sEI.v, b, site);
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], site.lat, site.lon) * R;
  let bb = null;
  for (let b = 0; b <= 135; b += 9) {
    const e = run(b);
    const c = missF(e) + (e.landed ? 0 : 5000);
    if (!bb || c < bb.c) bb = { b, c };
  }
  const gg = goldenMin(
    (b) => {
      const e = run(b);
      return missF(e) + (e.landed ? 0 : 5000);
    },
    Math.max(0, bb.b - 9),
    Math.min(150, bb.b + 9),
    14,
  );
  const ent = run(gg.x);
  ship.add(new SampleSeg(body, ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm².`,
    "heat",
  );
  const pdT = ent.samples.find((s) => s.phase === "powered descent")?.t;
  if (pdT)
    ship.setConfig(pdT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      powered: true,
    });
  const chT = ent.samples.find((s) => s.chute >= 1)?.t;
  if (chT)
    ship.setConfig(chT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["aeroshell"],
      chute: 1,
      ...(SC.edl.trimWing ? { trim: 1 } : {}),
    });
  const tEnd = ent.t + (cfg.surfaceDays ?? 5) * D;
  shellParts(M, SC, ship, ent, site, tEnd);
  const miss = missF(ent);
  M.ev(
    ent.t,
    "ship",
    cfg.landName || "Touchdown",
    `Touchdown at ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(1)} km from the target (${site.name}).`,
    "landing",
  );
  // a rover that rides down on the platform (cfg.roverOff, days after touchdown): it unfolds, the ramp opens, it drives off
  const ro = cfg.roverOff,
    dT = (k) => (ro && ro[k] != null ? ent.t + ro[k] * D : undefined);
  ship.setConfig(ent.t, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["lander"],
    landed: true,
    ...(ro
      ? { wingsT: dT("wings"), rampT: dT("ramp"), rollT: dT("roll") }
      : {}),
  });
  ship.add(
    new SurfaceSeg(
      "mars",
      ent.t,
      tEnd,
      ent.ll[0],
      ent.ll[1],
      site.elev || 0,
      ent.m,
      { extra: { phase: "surface operations" } },
    ),
  );
  for (const e of cfg.surfaceEvents || [])
    M.ev(ent.t + e.afterLanding * D, "ship", e.name, e.desc, e.kind || "info");
  M.phase(tEIa, ent.t, "Entry, descent & landing", "#ff5d5d");
  M.phase(ent.t, tEnd, "Surface operations", "#ffd166");
  M.summary.entries = [
    {
      body,
      vEI: vnorm(sEI.v),
      maxG: ent.maxG,
      maxHeat: ent.maxHeat,
      miss,
      ll: ent.ll,
    },
  ];
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
// Surface stay → ascent → (rendezvous) → Earth return

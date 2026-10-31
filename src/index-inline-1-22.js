// index-inline-1 22 — cfg
// Lines 8134-8719 of readable/index-inline-1.pretty.js (statement-aligned).
function doLanding(M, cfg, SC, P, ship, t0, getState, setState, progress) {
  const H = 3600;
  let { t, y } = getState();
  const site = cfg.landing,
    mu = MU_M;
  const landerIds = SC.lander,
    ascIds = SC.ascender || [],
    orbIds = SC.orbiter;
  const dsId = SC.prop.lander,
    asId = SC.prop.ascender;
  const tUndock =
    cfg.undockMET != null
      ? t0 + cfg.undockMET * H
      : t + (cfg.orbitsBeforeDescent ?? 10) * 2 * H;
  const tPDInom = cfg.pdiMET != null ? t0 + cfg.pdiMET * H : tUndock + 2.3 * H;
  progress("Lunar orbit: planning descent…");
  // orbit propagation through landing window
  const oRes = cisInt(t, y, tPDInom + 6 * H, {});
  const per = 2 * Math.PI * Math.sqrt(Math.pow(vnorm(seleno(t, y).r), 3) / mu);
  // range angle of the powered descent (estimate from lander T/W)
  const mLander = P.massOf(landerIds),
    eng = P.engineOf(dsId);
  const aAvg = eng.thrust / (mLander * 0.8) / 1000;
  const vPDI = Math.sqrt(mu / (R_MOON + 15)) * 1.005;
  const thetaPDI = clamp((vPDI * vPDI) / (2 * aAvg * 0.72) / R_MOON, 0.12, 0.6);
  const tDescEst = vPDI / (aAvg * 0.72) + 60;
  // find PDI time: orbiter angle to site (in-plane) equals thetaPDI
  const phi = (tt) => {
    const s = resState(oRes, tt),
      sel = seleno(tt, s);
    const u = vunit(sel.r),
      h = vunit(vcross(sel.r, sel.v));
    let sp = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt + tDescEst));
    sp = vunit(vsub(sp, vscale(h, vdot(sp, h))));
    return Math.atan2(vdot(vcross(u, sp), h), vdot(u, sp));
  };
  let tPDI = null,
    bestD = Infinity;
  for (let tt = tPDInom - per * 1.1; tt < tPDInom + per * 1.1; tt += 15) {
    const a = phi(tt) - thetaPDI,
      b = phi(tt + 15) - thetaPDI;
    if (a > 0 && b <= 0 && Math.abs(a - b) < 1) {
      const tr = tt + (15 * a) / (a - b);
      if (Math.abs(tr - tPDInom) < bestD) {
        bestD = Math.abs(tr - tPDInom);
        tPDI = tr;
      }
    }
  }
  if (!tPDI) tPDI = tPDInom;
  // DOI half an orbit earlier (Hohmann to 15 km perilune)
  const tDOI = tPDI - (per / 2) * 0.985;
  const tUnd = Math.min(tUndock, tDOI - 0.6 * H);
  // coast to undock (whole stack)
  {
    const r = cisInt(t, y, tUnd, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  const mL = P.massOf(landerIds);
  const lander = M.addObj(
    new MObject("lander", cfg.landerName || "Lander", {
      crew: cfg.landerCrew || 0,
      model: SC.model,
      color: "#b9a3ff",
      primary: false,
    }),
  );
  lander.setConfig(tUnd, "sc", { key: "sc", sc: SC.model, parts: ["lander"] });
  ship.setConfig(tUnd, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
  M.ev(
    tUnd,
    "lander",
    cfg.undockName || "Undocking",
    cfg.undockDesc ||
      "The lander separates from the orbiter. One crew member (or the orbiter) stays in lunar orbit.",
    "sep",
  );
  let yL = [...y];
  yL[6] = mL;
  y[6] -= mL;
  // lander: coast to DOI, burn
  {
    const r = cisInt(t, yL, tDOI, {});
    lander.add(resToSeg(r, "lunar orbit (separated)"));
    yL = Array.from(r.y[r.y.length - 1]);
  }
  const sD = seleno(tDOI, yL),
    rD = vnorm(sD.r),
    aN = (rD + R_MOON + (cfg.pdiAlt ?? 15)) / 2;
  const vN = Math.sqrt(mu * (2 / rD - 1 / aN));
  const vt = vunit(vsub(sD.v, vscale(vunit(sD.r), vdot(sD.v, vunit(sD.r)))));
  const dvDOIvec = vsub(vscale(vt, vN), sD.v);
  const pD = P.burn(dsId, yL[6], vnorm(dvDOIvec));
  M.burn({
    name: "DOI — descent orbit insertion",
    t: tDOI,
    dur: pD.dur,
    dv: vnorm(dvDOIvec) * 1000,
    engine: pD.engine,
    isp: pD.isp,
    prop: pD.prop,
    m0: yL[6],
    obj: "lander",
    propType: pD.propType,
  });
  M.ev(
    tDOI,
    "lander",
    "Descent orbit insertion",
    `A ${(vnorm(dvDOIvec) * 1000).toFixed(0)} m/s retro burn lowers the perilune to ~${cfg.pdiAlt ?? 15} km, half an orbit ahead, where powered descent will begin.`,
    "burn",
  );
  yL[3] += dvDOIvec[0];
  yL[4] += dvDOIvec[1];
  yL[5] += dvDOIvec[2];
  yL[6] -= pD.prop;
  const rP = cisInt(tDOI, yL, tDOI + per, { events: [evPerilune(5000)] });
  lander.add(resToSeg(rP, "descent orbit"));
  const tP = rP.stopEvent ? rP.stopEvent.t : tPDI;
  const yP = rP.stopEvent ? rP.stopEvent.y : rP.y[rP.y.length - 1];
  const sP = seleno(tP, yP);
  // powered descent: search tgo
  progress("Powered descent & landing…");
  const engD = P.engineOf(dsId),
    dryLimit = yP[6] - P.tankOf(dsId).propLeft;
  const sDir = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tP + tDescEst));
  const rangeKm = vangle(sP.r, sDir) * R_MOON;
  let bestD2 = null;
  for (const k of [0.95, 1.05, 1.15, 1.25, 1.35, 1.5]) {
    const tgo = ((2 * rangeKm) / vnorm(sP.v)) * k;
    const d = simulateDescent({
      body: "moon",
      t0: tP,
      r0: sP.r,
      v0: sP.v,
      m0: yP[6],
      Tmax: engD.thrust,
      isp: engD.isp,
      minThr: engD.minThr ?? 0.1,
      lat: site.lat,
      lon: site.lon,
      elev: site.elev || 0,
      tgo,
      dryLimit,
    });
    const sc = (d.landed ? 0 : 1e6) + d.miss * 50 + d.propUsed;
    if (!bestD2 || sc < bestD2.sc) bestD2 = { sc, d, tgo };
  }
  const D = bestD2.d;
  P.tankOf(dsId).propLeft -= D.propUsed;
  const dvPD = dvForProp(yP[6], D.propUsed, engD.isp) * 1000;
  M.burn({
    name: "Powered descent",
    t: tP,
    dur: D.t - tP,
    dv: dvPD,
    engine: engD.name,
    isp: engD.isp,
    prop: D.propUsed,
    m0: yP[6],
    obj: "lander",
    propType: engD.prop,
  });
  // convert seleno samples to SampleSeg with ref 'moon'
  lander.add(
    new SampleSeg(
      "moon",
      D.samples.map((s) => ({
        ...s,
        phase: s.phase === "landed" ? "touchdown" : "powered descent",
      })),
      { phase: "powered descent" },
    ),
  );
  M.ev(
    tP,
    "lander",
    "Powered descent initiation",
    `${EXPLAIN.pdi} Starting ${Math.round(rangeKm)} km uprange at ${(vnorm(sP.r) - R_MOON).toFixed(1)} km altitude.`,
    "burn",
  );
  for (const e of D.events) M.ev(e.t, "lander", e.name, e.desc, e.kind);
  if (!D.landed) {
    M.warnings.push("Powered descent failed to land.");
    M.failed = "landing";
    return false;
  }
  const tLand = D.t;
  const ll = D.ll;
  M.summary.landing = { t: tLand, ll, miss: D.miss, dv: dvPD };
  M.phase(tUnd, tLand, "Descent", "#ffb703");
  // surface stay
  const stay = (cfg.surfaceStay ?? 21.6) * H;
  const tLiftNom =
    cfg.ascentMET != null ? t0 + cfg.ascentMET * H : tLand + stay;
  const mOnSurf = yP[6] - D.propUsed;
  for (const e of (cfg.scripted || []).filter((e) => e.when === "surface"))
    M.ev(
      e.afterLanding != null ? tLand + e.afterLanding * H : t0 + e.met * H,
      "lander",
      e.name,
      e.desc,
      e.kind || "info",
    );
  if (cfg.profile === "lunar-landing-oneway") {
    lander.add(
      new SurfaceSeg(
        "moon",
        tLand,
        tLand + 3 * 24 * H,
        ll[0],
        ll[1],
        site.elev || 0,
        mOnSurf,
      ),
    );
    lander.setConfig(tLand, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      landed: true,
    });
    const r = cisInt(t, y, tLand + 3 * 24 * H, {});
    ship.add(resToSeg(r, "lunar orbit"));
    M.phase(tLand, tLand + 3 * 24 * H, "Surface operations", "#ffd166");
    setState(r.tEnd, Array.from(r.y[r.y.length - 1]));
    return true;
  }
  // orbiter coasts; check plane for ascent (lunar orbit plane change if needed)
  progress("Surface stay, ascent & rendezvous…");
  let oR = cisInt(t, y, tLiftNom + 8 * H, {});
  const asDesc = SC.modules[SC.prop.ascender] || {};
  // choose liftoff time: orbiter phase lead ~ 15–25° at insertion
  const perO = per;
  const leadAt = (tt) => {
    const s = resState(oR, tt + 430),
      sel = seleno(tt + 430, s),
      h = vunit(vcross(sel.r, sel.v));
    let site0 = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt));
    site0 = vunit(vsub(site0, vscale(h, vdot(site0, h))));
    const ins = vrot(site0, h, 9 * DEG);
    return Math.atan2(
      vdot(vcross(ins, vunit(sel.r)), h),
      vdot(ins, vunit(sel.r)),
    );
  };
  let tLift = tLiftNom,
    bL = Infinity;
  for (let tt = tLiftNom - perO * 1.2; tt < tLiftNom + perO * 1.2; tt += 20) {
    const a = leadAt(tt) - 18 * DEG,
      b = leadAt(tt + 20) - 18 * DEG;
    if (a < 0 && b >= 0 && Math.abs(a - b) < 1) {
      const tr = tt + (20 * -a) / (b - a);
      if (Math.abs(tr - tLiftNom) < bL) {
        bL = Math.abs(tr - tLiftNom);
        tLift = tr;
      }
    }
  }
  // plane change of orbiter if site is out of plane at liftoff
  const sAtLift = seleno(tLift, resState(oR, tLift));
  const hO = vunit(vcross(sAtLift.r, sAtLift.v)),
    sDirL = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tLift));
  const outAng = Math.asin(clamp(vdot(hO, sDirL), -1, 1));
  if (Math.abs(outAng) > 0.25 * DEG) {
    const hN = vunit(vsub(hO, vscale(sDirL, vdot(hO, sDirL))));
    const node = vunit(vcross(hO, hN));
    // find node crossing ~ half to one orbit before liftoff
    let tNode = null;
    for (let tt = tLift - 1.6 * perO; tt < tLift - 0.3 * perO; tt += 20) {
      const a = vdot(vunit(seleno(tt, resState(oR, tt)).r), vcross(hO, node)),
        b = vdot(
          vunit(seleno(tt + 20, resState(oR, tt + 20)).r),
          vcross(hO, node),
        );
      if (a * b <= 0) {
        tNode = tt + (20 * a) / (a - b);
      }
    }
    if (tNode) {
      const r = cisInt(t, y, tNode, {});
      ship.add(resToSeg(r, "lunar orbit"));
      t = r.tEnd;
      y = Array.from(r.y[r.y.length - 1]);
      const sN = seleno(t, y);
      const ang = Math.acos(clamp(vdot(hO, hN), -1, 1));
      const sgn = vdot(vcross(hO, hN), vunit(sN.r)) > 0 ? 1 : -1;
      const vNew = vrot(sN.v, vunit(sN.r), sgn * ang);
      const dvp = vsub(vNew, sN.v);
      const pmp = P.burn(SC.prop.orbiter, y[6], vnorm(dvp));
      M.burn({
        name: "Orbit plane change (orbiter)",
        t,
        dur: pmp.dur,
        dv: vnorm(dvp) * 1000,
        engine: pmp.engine,
        isp: pmp.isp,
        prop: pmp.prop,
        m0: y[6],
        obj: "ship",
        propType: pmp.propType,
      });
      M.ev(
        t,
        "ship",
        "Orbiter plane change",
        `The Moon rotated under the orbit during the surface stay. A ${(vnorm(dvp) * 1000).toFixed(0)} m/s burn swings the orbit plane by ${(ang * RAD).toFixed(2)}° so it passes over the landing site at liftoff.`,
        "burn",
      );
      y[3] += dvp[0];
      y[4] += dvp[1];
      y[5] += dvp[2];
      y[6] -= pmp.prop;
      oR = cisInt(t, y, tLiftNom + 30 * H, {});
    }
  }
  const sL2 = seleno(tLift, resState(oR, tLift));
  const hTarget = vunit(vcross(sL2.r, sL2.v));
  // lander: on surface
  lander.add(
    new SurfaceSeg("moon", tLand, tLift, ll[0], ll[1], site.elev || 0, mOnSurf),
  );
  lander.setConfig(tLand, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["lander"],
    landed: true,
    tLand,
  }); // (a lander that works on the surface times it from tLand)
  M.phase(tLand, tLift, "Surface operations", "#ffd166");
  // descent stage stays forever
  const dsObj = M.addObj(
    new MObject(
      "descent-stage",
      cfg.dsName || "Descent stage (left on surface)",
      { kind: "stage", model: SC.model, color: "#d4a017", trail: false },
    ),
  );
  dsObj.setConfig(tLift, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["descent"],
    landed: true,
  });
  dsObj.add(
    new SurfaceSeg(
      "moon",
      tLift,
      tLift + 60 * 24 * H,
      ll[0],
      ll[1],
      site.elev || 0,
      P.massOf([dsId]),
    ),
  );
  // ascent
  const engA = P.engineOf(asId),
    tankA = P.tankOf(asId);
  const ascStack = {
    name: "Ascent",
    payload: 0,
    stages: [
      {
        id: "AS",
        name: P.mods[asId].name,
        prop: "hypergolic",
        engine: engA.name,
        n: 1,
        thrustSL: engA.thrust,
        thrustVac: engA.thrust,
        ispSL: engA.isp,
        ispVac: engA.isp,
        dry: P.massOf(ascIds) - tankA.propLeft + (cfg.samples || 0),
        propMass: tankA.propLeft,
        propLeft: tankA.propLeft,
        attached: true,
        ignited: false,
        geom: [[3, 2, 2, "#888"]],
      },
    ],
    jettison: [],
  };
  const hp = cfg.ascentOrbit?.hp ?? 17,
    ha = cfg.ascentOrbit?.ha ?? 83;
  const AS = simulateAscent({
    body: "moon",
    t0: tLift,
    lat: ll[0],
    lon: ll[1],
    stack: ascStack,
    target: { normal: hTarget, hp, ha },
    vert: 10,
    kick: 5,
    closedLoopAt: 12,
    dt: 0.2,
    maxTime: 1200,
    sampleDt: 1,
  });
  if (!AS.ok) {
    M.warnings.push("Lunar ascent failed to reach orbit.");
  }
  const usedA = tankA.propLeft - AS.stack.stages[0].propLeft;
  tankA.propLeft -= usedA;
  const dvA =
    dvForProp(
      ascStack.stages[0].dry + ascStack.stages[0].propMass,
      usedA,
      engA.isp,
    ) * 1000;
  M.burn({
    name: "Lunar ascent",
    t: tLift,
    dur: AS.t - tLift,
    dv: dvA,
    engine: engA.name,
    isp: engA.isp,
    prop: usedA,
    m0: ascStack.stages[0].dry + ascStack.stages[0].propMass,
    obj: "lander",
    propType: engA.prop,
  });
  const ascObj = lander; // continue same object
  ascObj.setConfig(tLift, "sc", { key: "sc", sc: SC.model, parts: ["ascent"] });
  ascObj.add(
    new SampleSeg(
      "moon",
      AS.samples.map((s) => ({ ...s, phase: "lunar ascent" })),
      { phase: "ascent" },
    ),
  );
  M.ev(
    tLift,
    "lander",
    cfg.liftoffName || "Lunar liftoff",
    `${EXPLAIN.ascent} Δv ≈ ${dvA.toFixed(0)} m/s to reach orbit; ascent lasts ${fmtDur(AS.t - tLift)}.`,
    "launch",
  );
  M.ev(
    AS.t,
    "lander",
    "Lunar orbit insertion (ascent)",
    `Orbit ${AS.hpAch.toFixed(0)} × ${AS.haAch.toFixed(0)} km — below and behind the orbiter.`,
    "insertion",
  );
  // rendezvous: lander geocentric state
  const tI = AS.t;
  const gI = geoFromSeleno(tI, AS.r, AS.v);
  let yA = [...gI.r, ...gI.v, AS.m];
  const minDelay = (cfg.rendezvousMinDelay ?? 0.6) * H;
  const oR2 = cisInt(t, y, tI + minDelay + 30 * H, {});
  const lR = cisInt(tI, yA, tI + minDelay + 30 * H, {});
  let best = null;
  const perA =
    2 * Math.PI * Math.sqrt(Math.pow(R_MOON + (hp + ha) / 2, 3) / mu);
  for (let tt = tI + minDelay; tt < tI + minDelay + 26 * H; tt += 60) {
    const a = seleno(tt, resState(lR, tt));
    const tof = 0.37 * perA;
    const b = seleno(tt + tof, resState(oR2, tt + tof));
    const Lb = lambert(a.r, b.r, tof, mu, vunit(vcross(a.r, a.v)));
    if (!Lb) continue;
    const tot = vnorm(vsub(Lb.v1, a.v)) + vnorm(vsub(b.v, Lb.v2));
    if (!best || tot < best.tot) best = { tt, tof, tot, Lb, a, b };
    if (best && tt > best.tt + 1.2 * perA && best.tot < 0.08) break;
  }
  const tTPI = best.tt,
    tDock = best.tt + best.tof;
  ascObj.add(resToSeg(resUntil(lR, tTPI), "catch-up orbit"));
  const dv1 = vsub(best.Lb.v1, best.a.v);
  const yT = Array.from(resState(lR, tTPI));
  yT[3] += dv1[0];
  yT[4] += dv1[1];
  yT[5] += dv1[2];
  const pT = P.burn(asId, yT[6], vnorm(dv1));
  yT[6] -= pT.prop;
  M.burn({
    name: "Terminal phase initiation (rendezvous)",
    t: tTPI,
    dur: pT.dur,
    dv: vnorm(dv1) * 1000,
    engine: pT.engine,
    isp: pT.isp,
    prop: pT.prop,
    m0: yT[6] + pT.prop,
    obj: "lander",
    propType: pT.propType,
  });
  M.ev(
    tTPI,
    "lander",
    "Terminal phase initiation",
    `${EXPLAIN.rendezvous} Intercept burn ${(vnorm(dv1) * 1000).toFixed(1)} m/s; arrival in ${fmtDur(best.tof)}.`,
    "burn",
  );
  const rT = cisInt(tTPI, yT, tDock, {});
  ascObj.add(resToSeg(rT, "rendezvous transfer"));
  const dv2 = vnorm(vsub(best.b.v, best.Lb.v2));
  const pB = P.burn(asId, rT.y[rT.y.length - 1][6], dv2);
  M.burn({
    name: "Braking & docking",
    t: tDock,
    dur: pB.dur,
    dv: dv2 * 1000,
    engine: pB.engine,
    isp: pB.isp,
    prop: pB.prop,
    m0: rT.y[rT.y.length - 1][6],
    obj: "lander",
    propType: pB.propType,
  });
  M.ev(
    tDock,
    "ship",
    cfg.dockName || "Docking",
    cfg.dockDesc ||
      "The ascent vehicle docks with the orbiter; crew and samples transfer.",
    "dock",
  );
  // orbiter coasts up to docking
  {
    const r = cisInt(t, y, tDock, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  ship.setConfig(tDock, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["orbiter", "ascent"],
  });
  // jettison ascent stage after crew transfer
  const tJet = tDock + (cfg.ascJettisonAfter ?? 2.1) * H;
  {
    const r = cisInt(t, y, tJet, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  const mAsc = rT.y[rT.y.length - 1][6] - pB.prop;
  const jet = M.addObj(
    new MObject(
      "ascent-stage",
      cfg.ascStageName || "Ascent stage (jettisoned)",
      { kind: "stage", model: SC.model, color: "#999" },
    ),
  );
  jet.setConfig(tJet, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["ascent"],
    dock: true,
  }); // (Chang'e 5 releases its docking and support modules with the ascender)
  {
    const yJ = [...y];
    yJ[3] += 0.0006 * vunit(y.slice(3, 6))[0];
    yJ[6] = mAsc;
    const r = cisInt(tJet, yJ, tJet + 30 * H, { events: [evLunarImpact()] });
    jet.add(resToSeg(r, "jettisoned"));
  }
  ship.setConfig(tJet, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["orbiter"],
    dock: false,
  });
  M.ev(
    tJet,
    "ship",
    cfg.ascJettisonName || "Ascent stage jettison",
    "The empty ascent vehicle is released.",
    "sep",
  );
  y[6] = P.massOf(orbIds) + (cfg.samples || 0);
  setState(t, y);
  M.phase(tLift, tDock, "Ascent & rendezvous", "#06d6a0");
  return true;
}

// ---- interplanetary.js
// ============================================================================
// interplanetary.js — Mars & gravity-assist missions (patched conics, B-plane targeting)
// Profiles: mars-flyby, mars-orbit, mars-landing (direct entry), mars-orbit-landing,
//           mars-landing-return, mars-orbit-return, mars-flyby-return, multi-flyby
// Trajectory is continuous: planet-centred hyperbola ⇄ heliocentric conic at the sphere of influence.
// ============================================================================

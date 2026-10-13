// index-inline-1 26 — leg
// Lines 9585-9876 of readable/index-inline-1.pretty.js (statement-aligned).
function flybyDesign(vIn, vOut, mu, rMin) {
  const a = vnorm(vIn),
    b = vnorm(vOut),
    delta = vangle(vIn, vOut);
  let hh = vunit(vcross(vIn, vOut));
  if (vnorm(vcross(vIn, vOut)) < 1e-9) hh = vperp(vIn);
  const f = (rp) =>
    Math.asin(1 / (1 + (rp * a * a) / mu)) +
    Math.asin(1 / (1 + (rp * b * b) / mu)) -
    delta;
  let rp = bisectRoot(f, rMin * 0.05, rMin * 2000);
  const feasible = rp != null && rp >= rMin;
  if (rp == null || rp < rMin) rp = rMin;
  const dvP = Math.abs(
    Math.sqrt(b * b + (2 * mu) / rp) - Math.sqrt(a * a + (2 * mu) / rp),
  );
  return { hhat: hh, rp, dvP, feasible, delta };
}
// arrival design for leg end
function arrivalTarget(cfg, leg, vinfVec, tArr, SC, P, M) {
  const body = leg.body,
    mu = BODIES[body].mu,
    S = vunit(vinfVec),
    vinf = vnorm(vinfVec);
  const R = surfaceRadius(body);
  if (leg.type === "entry") {
    // direct entry to a surface site
    const eCfg = leg.entry || {};
    const rEI = R + (eCfg.alt ?? (body === "earth" ? 125 : 125));
    let ref;
    if (body === "mars") {
      const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI);
      ref = marsEntryRef(SC, P, vEI, eCfg.fpa ?? -15.5, eCfg.bank ?? 45);
    } else {
      const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI);
      const rr = [rEI, 0, 0],
        vv = [
          vEI * Math.sin((eCfg.fpa ?? -9) * DEG),
          vEI * Math.cos((eCfg.fpa ?? -9) * DEG),
          0,
        ];
      const e = earthEntryGeneric(SC, P, 0, rr, vv, null, eCfg.bank ?? 55);
      ref = { range: vangle(rr, e.r), dur: e.t };
    }
    const g = entryGeometry(
      body,
      vinfVec,
      rEI,
      eCfg.fpa ?? (body === "mars" ? -15.5 : -9),
      ref.range,
      ref.dur,
      leg.site,
      leg.tLand ? isoToT(leg.tLand) : tArr + 600,
    );
    if (g.approx && M)
      M.notes.push(
        `${BODIES[body].name}: the approach geometry cannot reach latitude ${leg.site.lat.toFixed(1)}° exactly; landing at the nearest reachable point.`,
      );
    return { B: g.B, tp: g.tp, entry: g, ref };
  }
  if (leg.type === "flyby" && leg.vinfNext) {
    const fd = flybyDesign(vinfVec, leg.vinfNext, mu, R + (leg.minAlt ?? 200));
    const rpF = leg.alt != null && leg.forceAlt ? R + leg.alt : fd.rp;
    leg.design = fd;
    return {
      B: vscale(vunit(vcross(S, fd.hhat)), bFromRp(rpF, vinf, mu)),
      tp: tArr,
      hhat: fd.hhat,
      rp: rpF,
    };
  }
  // orbit insertion / flyby: plane from requested inclination (to planet equator) or natural
  const rp = R + (leg.alt ?? 400);
  let hh;
  if (leg.incl != null) {
    const pole = bodyPoleEcl(body, tArr);
    // h ⊥ S with h·pole = cos(i)
    const u = vperp(S),
      w = vcross(S, u);
    const ci = Math.cos(leg.incl * DEG);
    const A = vdot(u, pole),
      Bc = vdot(w, pole),
      Rr = Math.hypot(A, Bc);
    let phi0 = Math.atan2(Bc, A),
      c = clamp(ci / (Rr || 1e-9), -1, 1);
    const ang = phi0 + (leg.inclSide === "b" ? -1 : 1) * Math.acos(c);
    hh = vunit(vadd(vscale(u, Math.cos(ang)), vscale(w, Math.sin(ang))));
  } else if (leg.hhat) hh = leg.hhat;
  else {
    const k = leg.retro ? [0, 0, -1] : [0, 0, 1];
    hh = vunit(vsub(k, vscale(S, vdot(k, S))));
  }
  if (leg.bSide === "flip") hh = vscale(hh, -1);
  return {
    B: vscale(vunit(vcross(S, hh)), bFromRp(rp, vinf, mu)),
    tp: tArr,
    hhat: hh,
    rp,
  };
}
// --------------------------------------------------------------------------
function cruiseAndArrive(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  t,
  rRel,
  vRel,
  fromBody,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400;
  const leg = nodes[iLeg + 1],
    target = leg.body;
  const muF = BODIES[fromBody].mu,
    muT = BODIES[target].mu;
  progress(`Cruise to ${BODIES[target].name}…`);
  // departure hyperbola to SOI exit
  const dtx = timeToRadius(rRel, vRel, muF, soiOf(fromBody));
  let tX = t + dtx;
  ship.add(
    new ConicSeg(fromBody, t, tX, rRel, vRel, mass, {
      extra: {
        phase: `leaving ${BODIES[fromBody].name}’s sphere of influence`,
      },
    }),
  );
  const sX = kepProp(rRel, vRel, dtx, muF),
    pX = planetHelio(fromBody, tX);
  let rH = vadd(pX.r, sX.r),
    vH = vadd(pX.v, sX.v);
  M.ev(
    tX,
    "ship",
    `Leaving ${BODIES[fromBody].name}’s sphere of influence`,
    `${(soiOf(fromBody) / 1000).toFixed(0)},000 km out, the Sun’s gravity now dominates. ${EXPLAIN.cruise}`,
    "soi",
  );
  // TCM events from config (historical, informational) & optional correction burn after flybys
  let tE = findSOIEntry(tX, rH, vH, target, leg.t, leg.t + 120 * D);
  let tCM = null;
  if (iLeg > 0 || tE == null) {
    // post-flyby trajectory correction: retarget next B-plane
    tCM = tX + (cfg.tcmAfterFlyby ?? 12) * D;
    const sC = kepProp(rH, vH, tCM - tX, MU_SUN);
    const FT = (x) => {
      const o = patchedHelio(tCM, sC.r, vadd(sC.v, x), target, leg.t);
      if (o.miss || !o.bv) return [1e3, 1e3, 1e3];
      const ax = bPlaneAxes(o.bv.S);
      return [
        (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
        (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
        (o.tp - tgt.tp) / H / 2,
      ];
    };
    // initial guess from Lambert to target centre
    const pTa = planetHelio(target, leg.t);
    const Lb = lambert(sC.r, pTa.r, leg.t - tCM, MU_SUN, [0, 0, 1]);
    const x0 = Lb ? vsub(Lb.v1, sC.v) : [0, 0, 0];
    let sol = newtonSolve(FT, x0, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.1,
    });
    for (let k = 0; k < 2 && tgt.entry; k++) {
      const o = patchedHelio(tCM, sC.r, vadd(sC.v, sol.x), target, leg.t);
      if (o.miss) break;
      tgt = arrivalTarget(cfg, leg, vscale(o.bv.S, o.bv.vinf), o.tp, SC, P, M);
      sol = newtonSolve(FT, sol.x, {
        h: 1e-7,
        tol: 1e-3,
        maxIt: 30,
        maxStep: 0.1,
      });
    }
    const dv = vnorm(sol.x);
    const engId = SC.usesUpperStage ? "upper" : SC.prop.orbiter;
    const pm = P.burn(engId, mass, dv);
    ship.add(
      new ConicSeg("sun", tX, tCM, rH, vH, mass, {
        extra: { phase: "heliocentric cruise" },
      }),
    );
    M.burn({
      name: `Deep-space manoeuvre (to ${BODIES[target].name})`,
      t: tCM,
      dur: pm.dur,
      dv: dv * 1000,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: mass,
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      tCM,
      "ship",
      "Trajectory correction",
      `A ${(dv * 1000).toFixed(1)} m/s burn re-aims the trajectory at the ${BODIES[target].name} aim point (B-plane targeting). In this patched-conic model it also absorbs small mismatches of the idealised flyby.`,
      "burn",
      { dv: dv * 1000 },
    );
    mass -= pm.prop;
    rH = sC.r;
    vH = vadd(sC.v, sol.x);
    tX = tCM;
    tE = findSOIEntry(tX, rH, vH, target, leg.t, leg.t + 120 * D);
  }
  for (const e of (cfg.tcms || []).filter((e) => e.leg === iLeg))
    M.ev(
      isoToT(e.t),
      "ship",
      e.name,
      e.desc || "Trajectory correction manoeuvre (historical).",
      "info",
    );
  if (tE == null) {
    const ca = closestApproachHelio(
      tX,
      rH,
      vH,
      target,
      leg.t - 30 * D,
      leg.t + 30 * D,
    );
    ship.add(
      new ConicSeg("sun", tX, leg.t + 60 * D, rH, vH, mass, {
        extra: { phase: "heliocentric cruise" },
      }),
    );
    M.warnings.push(
      `The trajectory misses ${BODIES[target].name} by ${Math.round(ca.d).toLocaleString()} km.`,
    );
    M.finalize();
    return M;
  }
  ship.add(
    new ConicSeg("sun", tX, tE, rH, vH, mass, {
      extra: { phase: "heliocentric cruise" },
    }),
  );
  M.phase(tX - 2 * D, tE, `Cruise to ${BODIES[target].name}`, "#9b5de5");
  // cruise events: midpoint facts
  const midT = 0.5 * (tX + tE),
    sM = kepProp(rH, vH, midT - tX, MU_SUN);
  M.ev(
    midT,
    "ship",
    "Mid-cruise",
    `${(vnorm(sM.r) / AU).toFixed(2)} AU from the Sun, heliocentric speed ${vnorm(sM.v).toFixed(1)} km/s. One-way radio delay to Earth: ${(vnorm(vsub(sM.r, bodyPos("earth", midT))) / C_KMS / 60).toFixed(1)} min.`,
    "info",
  );
  const sE = kepProp(rH, vH, tE - tX, MU_SUN),
    pT = planetHelio(target, tE);
  let rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v);
  M.ev(
    tE,
    "ship",
    `${BODIES[target].name} sphere of influence`,
    `${BODIES[target].name}’s gravity now dominates (sphere of influence radius ${Math.round(soiOf(target)).toLocaleString()} km). Approach speed v∞ = ${vnorm(vT).toFixed(2)} km/s.`,
    "soi",
  );
  return arrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes,
    lam,
    iLeg,
    tE,
    rT,
    vT,
    target,
    mass,
    tgt,
    progress,
  );
}
// --------------------------------------------------------------------------

// index-inline-1 27 — cfg
// Lines 9877-10015 of readable/index-inline-1.pretty.js (statement-aligned).
function arrive(
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
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[target].mu,
    R = surfaceRadius(target);
  const elA = rv2coe(rT, vT, mu);
  const tP = tE + timeToPeri(rT, vT, mu);
  const sP = kepProp(rT, vT, tP - tE, mu);
  if (leg.type === "flyby") {
    // ---------------- flyby / gravity assist ----------------
    const dtx = timeToRadius(sP.r, sP.v, mu, soiOf(target));
    const tX = tP + dtx;
    ship.add(
      new ConicSeg(target, tE, tP, rT, vT, mass, {
        extra: { phase: `${BODIES[target].name} flyby` },
      }),
    );
    const vinf = Math.sqrt(2 * elA.energy),
      turn = 2 * Math.asin(1 / elA.e) * RAD;
    const pIn = planetHelio(target, tE),
      sx = kepProp(rT, vT, tX - tE, mu),
      pOut = planetHelio(target, tX);
    const vHin = vnorm(vadd(pIn.v, vT)),
      vHout = vnorm(vadd(pOut.v, sx.v));
    M.ev(
      tP,
      "ship",
      leg.name || `${BODIES[target].name} flyby (gravity assist)`,
      `${EXPLAIN.flyby} Closest approach ${Math.round(elA.rp - R).toLocaleString()} km altitude at ${Math.sqrt(vinf * vinf + (2 * mu) / elA.rp).toFixed(2)} km/s. Trajectory bent by ${turn.toFixed(1)}°; heliocentric speed ${vHin.toFixed(2)} → ${vHout.toFixed(2)} km/s (${vHout >= vHin ? "+" : ""}${(vHout - vHin).toFixed(2)} km/s).`,
      "flyby",
    );
    for (const e of leg.events || [])
      M.ev(tP + (e.dt || 0) * H, "ship", e.name, e.desc, e.kind || "photo");
    M.summary.flybys = M.summary.flybys || [];
    M.summary.flybys.push({
      body: target,
      alt: elA.rp - R,
      dvHelio: vHout - vHin,
      turn,
    });
    M.phase(tE, tX, `${BODIES[target].name} flyby`, "#43aa8b");
    if (iLeg + 2 < nodes.length && nodes[iLeg + 2].type !== "design") {
      // next leg
      const nl = nodes[iLeg + 2];
      const tgt2 = arrivalTarget(cfg, nl, lam[iLeg + 1].vinfIn, nl.t, SC, P, M);
      return cruiseAndArrive(
        M,
        cfg,
        SC,
        P,
        ship,
        nodes,
        lam,
        iLeg + 1,
        tP,
        sP.r,
        sP.v,
        target,
        mass,
        tgt2,
        progress,
      );
    }
    // final: coast on after flyby
    const pX = planetHelio(target, tX);
    const tEnd = tX + (cfg.coastAfter ?? 60) * D;
    ship.add(
      new ConicSeg(target, tP, tX, sP.r, sP.v, mass, {
        extra: { phase: `leaving ${BODIES[target].name}` },
      }),
    );
    ship.add(
      new ConicSeg("sun", tX, tEnd, vadd(pX.r, sx.r), vadd(pX.v, sx.v), mass, {
        extra: { phase: cfg.afterPhase || "heliocentric orbit" },
      }),
    );
    if (cfg.endNote)
      M.ev(tEnd - 1, "ship", cfg.endNote.name, cfg.endNote.desc, "info");
    M.phase(tX, tEnd, cfg.afterPhase || "Heliocentric orbit", "#9b5de5");
    M.finalize();
    return M;
  }
  if (leg.type === "entry")
    return doDirectEntry(
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
  if (leg.type === "orbit")
    return doOrbitInsertion(
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
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------

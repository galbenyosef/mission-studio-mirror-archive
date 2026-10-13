// index-inline-1 25 — cfg
// Lines 9181-9584 of readable/index-inline-1.pretty.js (statement-aligned).
function planInterplanetary(cfg, progress = () => {}) {
  const M = new Mission(cfg);
  const H = 3600,
    D = 86400;
  const L = LAUNCHERS[cfg.launcher],
    SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  if (cfg.payloadMass && SC.modules.CARGO)
    SC.modules.CARGO.dry = cfg.payloadMass;
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0,
    crew = cfg.crew || 0;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const legs = cfg.legs; // [{body:'mars', t:'ISO', type:'flyby'|'arrive'}, ...]
  // ---------------- heliocentric design (Lambert legs) ----------------
  progress("Interplanetary trajectory design (Lambert)…");
  const tDep =
    t0 + (cfg.refill ? cfg.refill.days * D : 0) + (cfg.tmiDelay ?? 1.0) * H;
  const nodes = [
    { body: "earth", t: tDep },
    ...legs.map((l) => ({ ...l, t: isoToT(l.t) })),
  ];
  const lam = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = planetHelio(nodes[i].body, nodes[i].t),
      b = planetHelio(nodes[i + 1].body, nodes[i + 1].t);
    const sol = lambert(
      a.r,
      b.r,
      nodes[i + 1].t - nodes[i].t,
      MU_SUN,
      [0, 0, 1],
    );
    lam.push({
      v1: sol.v1,
      v2: sol.v2,
      vinfOut: vsub(sol.v1, a.v),
      vinfIn: vsub(sol.v2, b.v),
    });
  }
  for (let i = 1; i < nodes.length - 1; i++)
    if (nodes[i].type === "flyby") nodes[i].vinfNext = lam[i].vinfOut;
  const vinfDep = lam[0].vinfOut,
    C3 = vdot(vinfDep, vinfDep);
  M.summary.design = {
    C3,
    vinfDep: vnorm(vinfDep),
    legs: lam.map((l, i) => ({
      to: nodes[i + 1].body,
      vinfIn: vnorm(l.vinfIn),
      vinfOut: vnorm(l.vinfOut),
    })),
  };
  // ---------------- launch plane contains departure asymptote ----------------
  const pl =
    cfg.launchAz != null
      ? {
          n: planeNormalFromAzRel("earth", S.lat, S.lon, t0, cfg.launchAz).n,
          az: cfg.launchAz,
        }
      : planeThroughSite("earth", S.lat, S.lon, t0, vunit(vinfDep));
  M.notes.push(
    `Launch azimuth ${pl.az.toFixed(1)}° — the parking orbit plane contains the outgoing asymptote (declination ${(Math.asin(eclToEq(vunit(vinfDep))[2]) * RAD).toFixed(1)}°), so the departure burn needs no plane change.`,
  );
  progress("Launch & ascent…");
  const scMass0 = scTotalMass(SC);
  const LP = launchPhase(M, cfg, L, scMass0, pl.n, { ship });
  if (!LP.ok) {
    M.warnings.push("The launch vehicle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  P.attachUpper(asc.upper, asc.upperProp);
  let mass = asc.m;
  ship.setConfig(asc.t, "stack", {
    key: "stack",
    parts: ["upper", "sc-stowed"],
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    sc: SC.model,
  });
  let t = asc.t,
    r = asc.r,
    v = asc.v;
  // optional: orbital refilling (Starship)
  if (cfg.refill) {
    const tR = t + cfg.refill.days * D;
    ship.add(
      new ConicSeg("earth", t, tR, r, v, mass, {
        extra: { phase: "low Earth orbit — propellant transfer" },
      }),
    );
    const s2 = kepProp(r, v, tR - t, MU_E);
    r = s2.r;
    v = s2.v;
    const add = cfg.refill.to - P.upper.propLeft;
    P.upper.propLeft = cfg.refill.to;
    mass += add;
    M.ev(
      t + 0.5 * D,
      "ship",
      "Orbital refilling begins",
      `Tanker Starships dock one by one and transfer liquid methane and oxygen. ${cfg.refill.tankers} tanker flights deliver ≈${(add / 1000).toFixed(0)} t of propellant.`,
      "refill",
    );
    M.ev(
      tR - 0.2 * D,
      "ship",
      "Tanks full",
      `The Ship now carries ${(cfg.refill.to / 1000).toFixed(0)} t of propellant — enough for the trans-Mars injection.`,
      "refill",
    );
    M.phase(t, tR, "Propellant transfer in LEO", "#4ea8de");
    t = tR;
  }
  // ---------------- TMI geometry: periapsis of departure hyperbola ----------------
  progress("Trans-Mars injection targeting…");
  const hP = vunit(vcross(r, v));
  const rPark = vnorm(r);
  const depH = departureHyperbola(vinfDep, hP, rPark, MU_E);
  // first passage of parking orbit through periapsis direction after a short coast
  const ang = (rr) =>
    Math.atan2(
      vdot(vcross(vunit(rr), depH.phat), hP),
      vdot(vunit(rr), depH.phat),
    );
  const periodPark = 2 * Math.PI * Math.sqrt(Math.pow(rPark, 3) / MU_E);
  let dth = ang(r);
  if (dth < 0) dth += TAU;
  if (dth < 0.25) dth += TAU;
  const tTMI = t + (dth / TAU) * periodPark;
  const sT = kepProp(r, v, tTMI - t, MU_E);
  const vpNeeded = vscale(
    vunit(vcross(hP, vunit(sT.r))),
    Math.sqrt(vdot(vinfDep, vinfDep) + (2 * MU_E) / vnorm(sT.r)),
  );
  let dvTMI = vsub(vpNeeded, sT.v);
  // ---------------- arrival target (B-plane) for the first leg ----------------
  const first = nodes[1];
  const tArr1 = nodes[1].t;
  const target = first.body;
  let tgt = arrivalTarget(cfg, first, lam[0].vinfIn, tArr1, SC, P, M);
  // Newton on TMI Δv → [B·T, B·R, t_periapsis]
  const FT = (x) => {
    const vv = vadd(sT.v, vadd(dvTMI, x));
    const o = patchedLeg(tTMI, sT.r, vv, "earth", target, tArr1);
    if (!o || o.miss || !o.bv) return [1e3, 1e3, 1e3];
    const ax = bPlaneAxes(o.bv.S);
    return [
      (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
      (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
      (o.tp - tgt.tp) / H / 2,
    ];
  };
  // stage 1: aim at the planet centre (smooth even when the SOI is missed), stage 2: B-plane
  const s1 = newtonSolve(
    (x) =>
      vscale(
        centreMiss(
          tTMI,
          sT.r,
          vadd(sT.v, vadd(dvTMI, x)),
          "earth",
          target,
          tgt.tp,
        ),
        1e-4,
      ),
    [0, 0, 0],
    { h: 1e-7, tol: 1e-3, maxIt: 30, maxStep: 0.1 },
  );
  let sol = newtonSolve(FT, s1.x, {
    h: 1e-7,
    tol: 1e-3,
    maxIt: 30,
    maxStep: 0.05,
  });
  // refine target with actual v_inf (landing geometry depends on it) and re-solve
  for (let k = 0; k < 2; k++) {
    const o = patchedLeg(
      tTMI,
      sT.r,
      vadd(sT.v, vadd(dvTMI, sol.x)),
      "earth",
      target,
      tArr1,
    );
    if (!o || o.miss) break;
    const vin = vsub(kepProp(o.rT, o.vT, 0, BODIES[target].mu).v, [0, 0, 0]);
    const vinfVec = vscale(o.bv.S, o.bv.vinf);
    tgt = arrivalTarget(cfg, first, vinfVec, o.tp, SC, P, M);
    sol = newtonSolve(FT, sol.x, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.05,
    });
  }
  if (!sol.ok)
    M.warnings.push(
      `Arrival targeting converged only approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  dvTMI = vadd(dvTMI, sol.x);
  // ---------------- execute TMI ----------------
  const tmiEng =
    SC.usesUpperStage || cfg.tmiBy !== "sc" ? "upper" : SC.prop.orbiter;
  const eng = P.engineOf(tmiEng);
  const pb = P.burn(tmiEng, mass, vnorm(dvTMI));
  const vPost = vadd(sT.v, vscale(dvTMI, pb.dvAch / vnorm(dvTMI)));
  ship.add(
    new ConicSeg("earth", t, tTMI - pb.dur / 2, r, v, mass, {
      extra: { phase: "parking orbit" },
    }),
  );
  ship.add(
    new BurnSeg(
      "earth",
      tTMI,
      pb.dur,
      sT.r,
      sT.v,
      vPost,
      mass,
      mass - pb.prop,
      pb.thrust,
      {
        extra: {
          phase: cfg.depBurnName || "trans-Mars injection",
          stage: tmiEng,
        },
      },
    ),
  );
  M.burn({
    name: cfg.depBurnName || "TMI — trans-Mars injection",
    t: tTMI - pb.dur / 2,
    dur: pb.dur,
    dv: pb.dvAch * 1000,
    engine: pb.engine,
    isp: pb.isp,
    prop: pb.prop,
    m0: mass,
    obj: "ship",
    propType: pb.propType,
  });
  M.ev(
    tTMI - pb.dur / 2,
    "ship",
    cfg.depBurnName || "Trans-Mars injection",
    `${EXPLAIN.tmi} C3 = ${C3.toFixed(1)} km²/s², v∞ = ${Math.sqrt(C3).toFixed(2)} km/s. Burn ${fmtDur(pb.dur)}, Δv ${(pb.dvAch * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  M.phase(
    asc.t,
    tTMI - pb.dur / 2,
    cfg.refill ? "Earth orbit (refilling)" : "Parking orbit",
    "#4ea8de",
  );
  mass -= pb.prop;
  // separation from upper stage
  const tPost = tTMI + pb.dur / 2;
  const sPost = kepProp(sT.r, vPost, pb.dur / 2, MU_E);
  if (!pb.ok) {
    M.failed = "tmi";
    const dvNeed = vnorm(dvTMI) * 1000,
      dvGot = pb.dvAch * 1000;
    M.warnings.push(
      `Insufficient propellant for the departure burn: Δv ${dvGot.toFixed(0)} of ${dvNeed.toFixed(0)} m/s. The craft cannot reach ${BODIES[target].name}. Choose a more capable launch vehicle${SC.usesUpperStage ? ", orbital refilling" : ""} or a lighter payload.`,
    );
    const el = rv2coe(sPost.r, sPost.v, MU_E);
    M.ev(
      tPost,
      "ship",
      "Departure burn shortfall",
      el.e < 1
        ? `Propellant ran out ${(dvNeed - dvGot).toFixed(0)} m/s short. The craft is left in an elliptical Earth orbit with apogee ${Math.round(el.ra - BODIES.earth.R).toLocaleString()} km.`
        : `Propellant ran out ${(dvNeed - dvGot).toFixed(0)} m/s short. The craft escapes Earth but on a solar orbit that never reaches ${BODIES[target].name}.`,
      "fail",
    );
    if (el.e < 1) {
      const tEnd = tPost + Math.min(Math.max(2 * el.period, 6 * H), 20 * D);
      ship.add(
        new ConicSeg("earth", tPost, tEnd, sPost.r, sPost.v, mass, {
          extra: { phase: "stranded in Earth orbit" },
        }),
      );
      M.phase(tTMI - pb.dur / 2, tEnd, "Stranded in Earth orbit", "#ff5d5d");
    } else {
      const tOut = timeToRadius(sPost.r, sPost.v, MU_E, BODIES.earth.soi, true);
      const tSoi = tPost + (tOut && tOut > 0 ? tOut : 5 * D);
      ship.add(
        new ConicSeg("earth", tPost, tSoi, sPost.r, sPost.v, mass, {
          extra: { phase: "departure hyperbola" },
        }),
      );
      const sE = kepProp(sPost.r, sPost.v, tSoi - tPost, MU_E),
        pE = planetHelio("earth", tSoi);
      const rH = vadd(pE.r, sE.r),
        vH = vadd(pE.v, sE.v);
      ship.add(
        new ConicSeg("sun", tSoi, tSoi + 300 * D, rH, vH, mass, {
          extra: { phase: "heliocentric drift (target missed)" },
        }),
      );
      M.phase(
        tTMI - pb.dur / 2,
        tSoi + 300 * D,
        "Off-course solar orbit",
        "#ff5d5d",
      );
    }
    M.finalize();
    return M;
  }
  let tCur = tPost,
    rCur = sPost.r,
    vCur = sPost.v;
  if (!SC.usesUpperStage && tmiEng === "upper") {
    const tSep = tPost + (cfg.sepAfter ?? 0.6) * H;
    ship.add(
      new ConicSeg("earth", tPost, tSep, rCur, vCur, mass, {
        extra: { phase: "departure hyperbola" },
      }),
    );
    const s3 = kepProp(rCur, vCur, tSep - tPost, MU_E);
    rCur = s3.r;
    vCur = s3.v;
    tCur = tSep;
    const up = M.addObj(
      new MObject("upper", P.upper.name, {
        kind: "stage",
        model: "stage",
        color: "#aaa",
      }),
    );
    up.setConfig(tSep, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: L.stages.length - 1,
    });
    const mUp = P.upper.dry + P.upper.propLeft;
    up.add(
      new ConicSeg(
        "earth",
        tSep,
        tSep + 3 * D,
        rCur,
        vadd(vCur, vscale(vunit(vCur), -0.01)),
        mUp,
        {
          extra: {
            phase: "spent upper stage (escapes Earth into solar orbit)",
          },
        },
      ),
    );
    mass -= mUp;
    P.upper.attached = false;
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["cruise"],
      deployT: tSep,
    }); // (a spacecraft that unfolds after it leaves the stage does so from deployT)
    M.ev(
      tSep,
      "ship",
      "Spacecraft separation",
      `${SC.name} separates from the spent ${P.upper.name}. Solar arrays deploy and the craft begins its ${Math.round((tArr1 - tSep) / D)}-day cruise.`,
      "sep",
    );
  }
  // ---------------- cruise legs ----------------
  return cruiseAndArrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes,
    lam,
    0,
    tCur,
    rCur,
    vCur,
    "earth",
    mass,
    tgt,
    progress,
  );
}
// gravity-assist design: hyperbola that turns v∞in into the direction of v∞out (powered if |v∞| differ)

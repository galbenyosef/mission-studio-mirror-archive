// index-inline-1 31 — cfg
// Lines 10930-11248 of readable/index-inline-1.pretty.js (statement-aligned).
function surfaceStayAndReturn(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  ent,
  mLanded,
  progress,
) {
  const H = 3600,
    D = 86400,
    body = "mars",
    mu = BODIES.mars.mu,
    R = surfaceRadius("mars");
  const leg = nodes[iLeg + 1],
    ret = nodes[iLeg + 2];
  const site = { lat: ent.ll[0], lon: ent.ll[1], elev: leg.site.elev || 0 };
  const tDepM = ret.departMars
    ? isoToT(ret.departMars)
    : ent.t + (cfg.surfaceDays ?? 450) * D;
  // heliocentric return Lambert
  const pa = planetHelio("mars", tDepM),
    pb = planetHelio("earth", ret.t);
  const Lr = lambert(pa.r, pb.r, ret.t - tDepM, MU_SUN, [0, 0, 1]);
  const vinfOut = vsub(Lr.v1, pa.v);
  // ascent target: low Mars orbit in plane containing v∞ and the site at liftoff
  const hLMO = cfg.lmoAlt ?? 300;
  // liftoff time: plane through site containing v∞; departure periapsis reachable after short coast
  let tLiftNom = tDepM - (cfg.ascentLead ?? 6) * H;
  let plane = planeThroughSite(
    "mars",
    site.lat,
    site.lon,
    tLiftNom,
    vunit(vinfOut),
  );
  if (M.msrOrbiter) {
    // launch when the site passes under the orbiter's orbit plane
    const o = M.msrOrbiter,
      hO = vunit(vcross(o.r, o.v));
    tLiftNom = isoToT(
      ret.mavLaunch ||
        fmtUTC(ent.t + (cfg.surfaceDays ?? 300) * D).replace(" ", "T") + "Z",
    );
    const f = (tt) =>
      vdot(vunit(sitePosEcl("mars", site.lat, site.lon, 0, tt)), hO);
    let tl = null;
    for (let tt = tLiftNom; tt < tLiftNom + 2 * D; tt += 600) {
      if (f(tt) * f(tt + 600) <= 0) {
        tl = bisectRoot(f, tt, tt + 600, 50);
        break;
      }
    }
    if (tl) tLiftNom = tl;
    plane = { n: hO, az: 0 };
  }
  // surface stay segment (ISRU for Starship)
  const mProd = cfg.isru
    ? Math.max(0, cfg.isru.to - (SC.usesUpperStage ? P.upper.propLeft : 0))
    : 0; // tops the tanks up to the target
  if (cfg.isru) {
    M.ev(
      ent.t + 3 * D,
      "ship",
      "ISRU propellant plant starts",
      `Solar-powered Sabatier reactors turn Martian CO₂ and water ice into methane and oxygen: CO₂ + 4H₂ → CH₄ + 2H₂O. Target: ${(cfg.isru.to / 1000).toFixed(0)} t of propellant before the return window.`,
      "isru",
    );
  }
  const surf = new SurfaceSeg(
    "mars",
    ent.t,
    tLiftNom,
    site.lat,
    site.lon,
    site.elev,
    mLanded,
    {
      extra: {
        phase: cfg.isru
          ? "surface stay — making propellant"
          : "surface operations",
      },
    },
  );
  if (cfg.isru) {
    surf.m0 = mLanded;
    surf.m1 = mLanded + mProd;
  }
  ship.add(surf);
  M.phase(ent.t, tLiftNom, "Surface stay", "#ffd166");
  for (const e of cfg.surfaceEvents || [])
    M.ev(ent.t + e.afterLanding * D, "ship", e.name, e.desc, e.kind || "info");
  // ascent vehicle
  let stack, ascName, stageId;
  if (SC.usesUpperStage) {
    P.upper.propLeft = cfg.isru.to;
    P.upper.attached = true;
    stageId = "upper";
    stack = {
      name: "Ship",
      payload: P.massOf(SC.orbiter),
      stages: [
        {
          id: "Ship",
          name: "Ship",
          prop: "methalox",
          engine: P.upper.engine,
          n: 6,
          thrustSL: P.upper.thrustSL,
          thrustVac: P.upper.thrustVac,
          ispSL: P.upper.ispSL,
          ispVac: P.upper.ispVac,
          dry: P.upper.dry,
          propMass: P.upper.propLeft,
          propLeft: P.upper.propLeft,
          attached: true,
          ignited: false,
          geom: [[50, 4.5, 4.5, "#bbb"]],
        },
      ],
      jettison: [],
    };
    ascName = "Mars liftoff";
  } else {
    const asId = SC.prop.ascender,
      e = P.engineOf(asId),
      tk = P.tankOf(asId);
    stageId = asId;
    stack = {
      name: "MAV",
      payload: cfg.samples || 1,
      stages: [
        {
          id: "MAV",
          name: tk.name,
          prop: "solid",
          engine: e.name,
          n: 1,
          thrustSL: e.thrust * 0.9,
          thrustVac: e.thrust,
          ispSL: e.isp * 0.9,
          ispVac: e.isp,
          dry: tk.dry,
          propMass: tk.propLeft,
          propLeft: tk.propLeft,
          attached: true,
          ignited: false,
          geom: [[3, 0.3, 0.3, "#ddd"]],
        },
      ],
      jettison: [],
    };
    ascName = "Mars Ascent Vehicle launch";
  }
  progress("Mars ascent…");
  const AS = SC.usesUpperStage
    ? simulateAscent({
        body: "mars",
        t0: tLiftNom,
        lat: site.lat,
        lon: site.lon,
        siteElev: site.elev,
        stack,
        target: { normal: plane.n, hp: Math.min(110, hLMO), ha: hLMO },
        vert: 6,
        kick: 10,
        closedLoopAt: 25,
        dt: 0.2,
        maxTime: 1500,
        sampleDt: 1,
      })
    : simulateTwoBurnAscent({
        body: "mars",
        t0: tLiftNom,
        lat: site.lat,
        lon: site.lon,
        siteElev: site.elev,
        stack,
        target: { normal: plane.n, hp: hLMO, ha: hLMO },
        vert: 3,
      });
  const used = stack.stages[0].propMass - AS.stack.stages[0].propLeft;
  P.tankOf(stageId).propLeft -= used;
  ship.setConfig(tLiftNom, "sc", {
    key: "sc",
    sc: SC.model,
    parts: SC.usesUpperStage ? ["ship"] : ["mav"],
  });
  ship.add(
    new SampleSeg(
      "mars",
      AS.samples.map((s) => ({ ...s, phase: "Mars ascent" })),
      { phase: "Mars ascent" },
    ),
  );
  const dvAsc =
    dvForProp(
      stack.stages[0].dry + stack.stages[0].propMass + stack.payload,
      used,
      stack.stages[0].ispVac,
    ) * 1000;
  M.burn({
    name: ascName,
    t: tLiftNom,
    dur: AS.t - tLiftNom,
    dv: dvAsc,
    engine: stack.stages[0].engine,
    isp: stack.stages[0].ispVac,
    prop: used,
    m0: stack.stages[0].dry + stack.stages[0].propMass + stack.payload,
    obj: "ship",
    propType: SC.usesUpperStage ? "methalox" : "solid",
  });
  M.ev(
    tLiftNom,
    "ship",
    ascName,
    `Liftoff from Mars: gravity 3.71 m/s², low-orbit speed only ≈3.4 km/s (vs 7.8 km/s at Earth). Δv ≈ ${dvAsc.toFixed(0)} m/s into a ${Math.min(110, hLMO)} × ${hLMO} km orbit.`,
    "launch",
  );
  if (!AS.ok) M.warnings.push("Mars ascent did not reach orbit.");
  for (const e of AS.events)
    if (e.kind === "insertion")
      M.ev(e.t, "ship", "Mars orbit insertion (ascent)", e.desc, "insertion");
  let t = AS.t,
    r = AS.r,
    v = AS.v,
    mass = AS.m;
  M.phase(tLiftNom, AS.t, "Mars ascent", "#06d6a0");
  if (!SC.usesUpperStage && M.msrOrbiter) {
    ship.setConfig(AS.t, "sc", { key: "sc", sc: SC.model, parts: ["os"] });
    return msrRendezvousAndReturn(
      M,
      cfg,
      SC,
      P,
      M.msrOrbiter,
      ship,
      AS,
      site,
      nodes,
      iLeg,
      ret,
      vinfOut,
      tDepM,
      progress,
    );
  }
  // TEI from LMO
  return departPlanet(
    M,
    cfg,
    SC,
    P,
    ship,
    t,
    r,
    v,
    "mars",
    mass,
    vinfOut,
    tDepM,
    ret,
    progress,
  );
}
function orbitStayAndReturn(
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
    ret = nodes[iLeg + 2];
  const tDepM = ret.departMars
    ? isoToT(ret.departMars)
    : t + (cfg.orbitDays ?? 30) * D;
  const pa = planetHelio(body, tDepM),
    pb = planetHelio("earth", ret.t);
  const Lr = lambert(pa.r, pb.r, ret.t - tDepM, MU_SUN, [0, 0, 1]);
  const vinfOut = vsub(Lr.v1, pa.v);
  for (const e of leg.orbitEvents || [])
    M.ev(t + e.afterArrival * D, "ship", e.name, e.desc, e.kind || "photo");
  return departPlanet(
    M,
    cfg,
    SC,
    P,
    ship,
    t,
    r,
    v,
    body,
    mass,
    vinfOut,
    tDepM,
    ret,
    progress,
    true,
  );
}
// departure from planetary orbit toward Earth, with patched-conic targeting of the Earth entry

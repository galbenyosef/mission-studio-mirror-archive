// index-inline-1 28 — ent
// Lines 10138-10451 of readable/index-inline-1.pretty.js (statement-aligned).
function doDirectEntry(
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
  body,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const rEI = R + (leg.entry?.alt ?? 125);
  const dtEI = timeToRadius(rT, vT, mu, rEI, false);
  if (dtEI == null) {
    M.warnings.push(`The approach misses ${BODIES[body].name}’s atmosphere.`);
    M.finalize();
    return M;
  }
  const tEI = tE + dtEI;
  // cruise stage separation 10 min before EI (Mars) / capsule separation (Earth return)
  const tSep = tEI - (leg.sepBefore ?? 10) * 60;
  ship.add(
    new ConicSeg(body, tE, tSep, rT, vT, mass, {
      extra: { phase: `approach to ${BODIES[body].name}` },
    }),
  );
  const sS = kepProp(rT, vT, tSep - tE, mu);
  let mEntry;
  if (body === "mars" && SC.orbiterStays) {
    M.msrOrbiter = msrOrbiterBranch(M, cfg, SC, P, tE, rT, vT, mass, tEI, leg);
    mEntry = P.massOf(SC.entry);
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["aeroshell"],
    });
  } else if (body === "mars") {
    if (SC.entry) {
      const cruiseIds = SC.orbiter.filter((id) => !SC.entry.includes(id));
      const cs = M.addObj(
        new MObject("cruise", cfg.cruiseName || "Cruise stage", {
          kind: "stage",
          model: SC.model,
          color: "#aaa",
        }),
      );
      cs.setConfig(tSep, "sc", {
        key: "sc",
        sc: SC.model,
        parts: ["cruisestage"],
      });
      cs.add(
        new ConicSeg(
          body,
          tSep,
          tEI + 900,
          sS.r,
          vadd(sS.v, vscale(vunit(sS.v), -0.0005)),
          P.massOf(cruiseIds),
          { extra: { phase: "cruise stage (burns up)" } },
        ),
      );
      for (const id of cruiseIds) P.mods[id].attached = false;
      M.ev(
        tSep,
        "ship",
        "Cruise stage separation",
        "The entry vehicle (aeroshell with rover inside) separates and turns heat-shield forward.",
        "sep",
      );
      ship.setConfig(tSep, "sc", {
        key: "sc",
        sc: SC.model,
        parts: ["aeroshell"],
      });
    }
    mEntry = SC.entry ? P.massOf(SC.entry) : mass;
  }
  if (body !== "mars") {
    // Earth return capsule
    const capM = SC.usesUpperStage ? mass : P.massOf([SC.capsule]);
    if (!SC.usesUpperStage) {
      const sm = M.addObj(
        new MObject("sm", cfg.smName || "Carrier spacecraft", {
          kind: "stage",
          model: SC.model,
          color: "#aaa",
        }),
      );
      sm.setConfig(tSep, "sc", { key: "sc", sc: SC.model, parts: ["service"] });
      sm.add(
        new ConicSeg(
          body,
          tSep,
          tEI + 1200,
          sS.r,
          vadd(sS.v, vscale(vunit(sS.v), -0.0008)),
          mass - capM,
          { extra: { phase: "carrier (divert / burns up)" } },
        ),
      );
      ship.setConfig(tSep, "capsule", { key: "capsule", sc: SC.model });
      M.ev(
        tSep,
        "ship",
        leg.sepName || "Capsule separation",
        "Only the heat-shielded capsule continues to atmospheric entry.",
        "sep",
      );
      mEntry = capM;
    } else mEntry = mass;
  }
  ship.add(
    new ConicSeg(body, tSep, tEI, sS.r, sS.v, mEntry, {
      extra: { phase: "final approach" },
    }),
  );
  const sE = kepProp(rT, vT, dtEI, mu);
  const vrel = vsub(sE.v, vcross(bodyOmegaEcl(body, tEI), sE.r));
  M.ev(
    tEI,
    "ship",
    `Entry interface (${(rEI - R).toFixed(0)} km)`,
    `${body === "mars" ? EXPLAIN.edl : EXPLAIN.entry} Speed ${vnorm(sE.v).toFixed(2)} km/s (${vnorm(vrel).toFixed(2)} km/s relative to the rotating atmosphere), flight-path angle ${fpaDeg(sE.r, sE.v).toFixed(1)}°.`,
    "entry",
  );
  progress(`${BODIES[body].name} entry, descent & landing…`);
  const site = leg.site;
  let run;
  if (body === "mars") run = (b) => runMarsEDL(SC, P, tEI, sE.r, sE.v, b, site);
  else run = (b) => earthEntryGeneric(SC, P, tEI, sE.r, sE.v, mEntry, b);
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], site.lat, site.lon) * R;
  const gLim = (cfg.crew || 0) > 0 ? 8 : 25;
  const cost = (e) =>
    missF(e) + Math.max(0, e.maxG - gLim) * 300 + (e.landed ? 0 : 5000);
  let best = null;
  for (let b = 0; b <= 135; b += 9) {
    const e = run(b);
    const c = cost(e);
    if (!best || c < best.c) best = { b, c, e };
  }
  const g = goldenMin(
    (b) => cost(run(b)),
    Math.max(0, best.b - 9),
    Math.min(150, best.b + 9),
    16,
  );
  const ent = run(g.x);
  ship.add(new SampleSeg(body, ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm² at the heat shield stagnation point.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(1)} g.`,
    "gload",
  );
  const chuteT = ent.samples.find((s) => s.chute >= 1)?.t;
  if (chuteT)
    ship.setConfig(
      chuteT,
      body === "mars" ? "sc" : "capsule",
      body === "mars"
        ? { key: "sc", sc: SC.model, parts: ["aeroshell"], chute: 1 }
        : { key: "capsule", sc: SC.model, chutes: 1 },
    );
  const pdT = ent.samples.find((s) => s.phase === "powered descent")?.t;
  if (pdT && body === "mars")
    ship.setConfig(pdT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      powered: true,
    });
  if (body === "mars" && SC.prop.lander)
    P.tankOf(SC.prop.lander).propLeft -= ent.propUsed;
  if (SC.usesUpperStage && ent.propUsed > 0) {
    // Starship lands on the propellant in its own tanks: book the landing burn
    const lb = ent.events.find((e) => e.name === "Landing burn"),
      tI = lb ? lb.t : ent.t - 30,
      eng = P.engineOf("upper");
    const m0 = ent.m + ent.propUsed,
      isp = body === "earth" ? 327 : 330;
    P.upper.propLeft = Math.max(0, P.upper.propLeft - ent.propUsed);
    M.burn({
      name: "Landing burn",
      t: tI,
      dur: ent.t - tI,
      dv: isp * G0 * Math.log(m0 / ent.m),
      engine: eng.name,
      isp,
      prop: ent.propUsed,
      m0,
      obj: "ship",
      propType: eng.prop,
    });
  }
  const miss = missF(ent);
  const landName =
    body === "mars" ? cfg.landName || "Touchdown" : leg.landName || "Landing";
  M.ev(
    ent.t,
    "ship",
    landName,
    `${body === "mars" ? "Touchdown on Mars" : "Landing on Earth"} at ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(1)} km from the target (${site.name}). ${body === "mars" ? `One-way radio delay to Earth: ${(vnorm(vsub(bodyPos("mars", ent.t), bodyPos("earth", ent.t))) / C_KMS / 60).toFixed(1)} min — the landing was over before Earth heard about entry.` : ""}`,
    "landing",
  );
  M.phase(
    tEI,
    ent.t,
    body === "mars" ? "Entry, descent & landing" : "Earth entry",
    "#ff5d5d",
  );
  M.summary.entries = M.summary.entries || [];
  M.summary.entries.push({
    body,
    vEI: vnorm(vrel),
    maxG: ent.maxG,
    maxHeat: ent.maxHeat,
    miss,
    ll: ent.ll,
    bank: g.x,
  });
  const crane = body === "mars" && SC.edl && SC.edl.skycrane,
    mLanded = crane ? SC.modules.ROVER.dry : ent.m; // a sky crane flies off and leaves the rover
  if (body === "mars") {
    ship.setConfig(ent.t, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      landed: true,
    });
    if (crane)
      skyCraneParts(
        M,
        SC,
        ship,
        ent,
        site,
        ent.m - mLanded,
        ent.t + (cfg.surfaceDays ?? 3) * D,
      );
    if (leg.next === "return")
      return surfaceStayAndReturn(
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
      );
    for (const e of cfg.surfaceEvents || [])
      M.ev(
        ent.t + e.afterLanding * D,
        "ship",
        e.name,
        e.desc,
        e.kind || "info",
      );
    const tEnd = ent.t + (cfg.surfaceDays ?? 3) * D;
    ship.add(
      new SurfaceSeg(
        "mars",
        ent.t,
        tEnd,
        ent.ll[0],
        ent.ll[1],
        site.elev || 0,
        mLanded,
        { extra: { phase: "surface operations" } },
      ),
    );
    M.phase(ent.t, tEnd, "Surface operations", "#ffd166");
  } else {
    ship.add(
      new SurfaceSeg(
        "earth",
        ent.t,
        ent.t + 2 * H,
        ent.ll[0],
        ent.ll[1],
        0,
        mLanded,
        { extra: { phase: "recovery" } },
      ),
    );
  }
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------

// index-inline-1 20 — cfg
// Lines 7515-7863 of readable/index-inline-1.pretty.js (statement-aligned).
const crewOf = (cfg) => (cfg.crew || 0) > 0;
function finishReturn(
  M,
  cfg,
  SC,
  P,
  ship,
  t0,
  t,
  y,
  ref,
  rvpT,
  progress,
  tDepart,
) {
  const H = 3600,
    entryCfg = cfg.entry || {},
    splash = cfg.splash;
  const capsuleId = SC.capsule;
  const tEntryDur = ref ? ref.dur : 800,
    thetaRange = ref ? ref.range : 0.35;
  const siteE = (tt) =>
    vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
  progress("Return coast & entry targeting…");
  const tMcc = t + (cfg.returnMccAfter ?? 15) * H;
  const r0 = cisInt(t, y, tMcc, {});
  ship.add(resToSeg(r0, "transearth coast"));
  t = r0.tEnd;
  y = Array.from(r0.y[r0.y.length - 1]);
  const run = (dv) => {
    const y0 = [...y];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    return cisInt(tMcc, y0, tMcc + 8 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
  };
  const geoE = (rr, vv, tEI) => {
    const tl = tEI + tEntryDur;
    const Lp = vrot(vunit(rr), vunit(vcross(rr, vv)), thetaRange);
    const Le = eclToEq(Lp);
    const ra = Math.atan2(Le[1], Le[0]) * RAD,
      dec = Math.asin(clamp(Le[2], -1, 1)) * RAD;
    return {
      along: wrapPi((gmst(tl) * RAD + splash.lon - ra) * DEG) * RAD,
      cross: dec - splash.lat,
    };
  };
  const F = (dv) => {
    const r = run(dv);
    const yl = r.y[r.y.length - 1],
      rr = [yl[0], yl[1], yl[2]],
      vv = [yl[3], yl[4], yl[5]];
    if (!(r.stopEvent && r.stopEvent.name === "EI"))
      return [(vacPerigee(rr, vv) - rvpT) / 30, 0];
    const g = geoE(rr, vv, r.tEnd);
    return [(fpaDeg(rr, vv) - (entryCfg.fpa ?? -6.5)) * 2, g.along];
  };
  let sol = newtonSolve(F, [0, 0, 0], {
    h: 2e-6,
    tol: 0.01,
    maxIt: 16,
    maxStep: 0.03,
  });
  if (!sol.ok || vnorm(sol.x) > 0.05) {
    const F1 = (dv) => [F(dv)[0]];
    sol = newtonSolve(F1, [0, 0, 0], {
      h: 2e-6,
      tol: 0.01,
      maxIt: 16,
      maxStep: 0.03,
    });
    M.notes.push(
      "Return correction trims only the entry angle; the splashdown point follows from the return trajectory.",
    );
  }
  const dvm = sol.x,
    mag = vnorm(dvm) * 1000;
  const engId = cfg.lifeboat || SC.prop.orbiter;
  let pm = { prop: 0, dur: 0, engine: "—", isp: 0 };
  if (P.mods[engId] && P.mods[engId].attached)
    pm = P.burn(engId, y[6], mag / 1000);
  M.burn({
    name: "MCC — return correction",
    t: tMcc,
    dur: pm.dur,
    dv: mag,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: y[6],
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tMcc,
    "ship",
    "Return mid-course correction",
    `Fine-tunes the entry corridor: the flight-path angle at entry must be ≈ ${(entryCfg.fpa ?? -6.5).toFixed(1)}° (too steep → excessive g and heating; too shallow → skip back out). Δv ${mag.toFixed(1)} m/s.`,
    "burn",
    { dv: mag },
  );
  y[3] += dvm[0];
  y[4] += dvm[1];
  y[5] += dvm[2];
  y[6] -= pm.prop;
  const rEI = cisInt(tMcc, y, tMcc + 8 * 24 * H, { events: [evEI()] });
  if (!rEI.stopEvent) {
    ship.add(resToSeg(rEI, "transearth coast"));
    M.warnings.push("The return trajectory misses the atmosphere.");
    M.finalize();
    return M;
  }
  const tEI = rEI.stopEvent.t;
  // CM/SM separation 15 min before EI
  const tSep = tEI - (cfg.smSepBeforeEI ?? 15) * 60;
  ship.add(
    new SampleSeg(
      "earth",
      integToSamples(resUntil(rEI, tSep), () => ({
        phase: "transearth coast",
      })),
    ),
  );
  const yS = resState(rEI, tSep);
  const capM = P.massOf([capsuleId]);
  if (SC.orbiter && SC.orbiter.length > 1) {
    const sm = M.addObj(
      new MObject("sm", cfg.smName || "Service module", {
        kind: "stage",
        model: SC.model,
        color: "#aaa",
      }),
    );
    sm.setConfig(tSep, "sc", { key: "sc", sc: SC.model, parts: ["service"] });
    const rs = cisInt(
      tSep,
      [
        yS[0],
        yS[1],
        yS[2],
        yS[3] - (0.0015 * yS[3]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[4] - (0.0015 * yS[4]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[5] - (0.0015 * yS[5]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[6] - capM,
      ],
      tSep + 3 * H,
      {
        events: [
          {
            name: "burnup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 70),
          },
        ],
      },
    );
    sm.add(resToSeg(rs, "service module (burns up on entry)"));
    sm.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["service"],
      damaged: !!cfg.lifeboat,
    });
  }
  M.ev(
    tSep,
    "ship",
    cfg.smSepName || "Crew module / service module separation",
    cfg.smSepDesc ||
      "Only the capsule with its heat shield will enter the atmosphere; the service module burns up.",
    "sep",
  );
  if (cfg.lifeboat) {
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["capsule", "lander"],
    });
    const tLm = tEI - (cfg.lifeboatJettisonBeforeEI ?? 1.18) * H;
    const yLm = resState(rEI, tLm);
    const lm = M.addObj(
      new MObject("lifeboat", cfg.lifeboatName || "Lunar Module (lifeboat)", {
        kind: "stage",
        model: SC.model,
        color: "#b9a3ff",
      }),
    );
    lm.setConfig(tLm, "sc", { key: "sc", sc: SC.model, parts: ["lander"] });
    const rl = cisInt(
      tLm,
      [
        yLm[0],
        yLm[1],
        yLm[2],
        yLm[3] * 0.99995,
        yLm[4] * 0.99995,
        yLm[5] * 0.99995,
        P.massOf(SC.lander),
      ],
      tLm + 3 * H,
      {
        events: [
          {
            name: "burnup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 70),
          },
        ],
      },
    );
    lm.add(resToSeg(rl, "LM jettisoned — burns up over the Pacific"));
    M.ev(
      tLm,
      "ship",
      cfg.lifeboatJettisonName || "Lifeboat jettison",
      cfg.lifeboatJettisonDesc ||
        "The crew climbs back into the command module and releases the lunar module.",
      "sep",
    );
    ship.setConfig(tLm, "capsule", { key: "capsule", sc: SC.model });
  } else ship.setConfig(tSep, "capsule", { key: "capsule", sc: SC.model });
  const rC = cisInt(
    tSep,
    [yS[0], yS[1], yS[2], yS[3], yS[4], yS[5], capM],
    tEI + 60,
    { events: [evEI()] },
  );
  ship.add(resToSeg(rC, "final approach"));
  const yE = rC.stopEvent ? rC.stopEvent.y : rC.y[rC.y.length - 1];
  const tE = rC.stopEvent ? rC.stopEvent.t : rC.tEnd;
  const vEI = vnorm(
    vsub(
      [yE[3], yE[4], yE[5]],
      vcross(bodyOmegaEcl("earth", tE), [yE[0], yE[1], yE[2]]),
    ),
  );
  M.ev(
    tE,
    "ship",
    "Entry interface (122 km)",
    `${EXPLAIN.entry} Speed ${Math.hypot(yE[3], yE[4], yE[5]).toFixed(2)} km/s, flight-path angle ${fpaDeg([yE[0], yE[1], yE[2]], [yE[3], yE[4], yE[5]]).toFixed(2)}°.`,
    "entry",
  );
  // ---------------- entry with bank-angle targeting ----------------
  progress("Atmospheric entry…");
  const cap = SC.modules[capsuleId];
  const entryRun = (bank, bank2) =>
    simulateEntry({
      body: "earth",
      t0: tE,
      r0: [yE[0], yE[1], yE[2]],
      v0: [yE[3], yE[4], yE[5]],
      m0: capM,
      diam: cap.heat.diam,
      cd: cap.heat.cd,
      LD: cap.heat.LD,
      rn: cap.heat.rn,
      bank,
      bank2,
      skip: !!entryCfg.skip,
      chutes: cap.heat.chutes,
      maxTime: entryCfg.skip ? 6000 : 3000,
    });
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], splash.lat, splash.lon) * R_E;
  let best = null;
  const gLim = crewOf(cfg) ? 7.0 : 12;
  const cost = (e) =>
    missF(e) + Math.max(0, e.maxG - gLim) * 400 + (e.landed ? 0 : 5000);
  for (let b = 0; b <= 120; b += 7.5) {
    const e = entryRun(b, b + 20);
    const d = cost(e);
    if (!best || d < best.d) best = { b, d, e };
  }
  const g = goldenMin(
    (b) => cost(entryRun(b, b + 20)),
    Math.max(0, best.b - 7.5),
    Math.min(140, best.b + 7.5),
    18,
  );
  const ent = entryRun(g.x, g.x + 20);
  ship.add(new SampleSeg("earth", ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Stagnation heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm² (Sutton–Graves estimate). The ablative heat shield chars and erodes, carrying the heat away.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(1)} g — the crew is pressed into their couches.`,
    "gload",
  );
  ship.setConfig(ent.samples.find((s) => s.chute >= 1)?.t ?? ent.t, "capsule", {
    key: "capsule",
    sc: SC.model,
    chutes: 1,
  });
  const tMain = ent.samples.find((s) => s.chute >= 2)?.t;
  if (tMain)
    ship.setConfig(tMain, "capsule", {
      key: "capsule",
      sc: SC.model,
      chutes: 2,
    });
  const miss = missF(ent);
  M.ev(
    ent.t,
    "ship",
    cfg.splashName || "Splashdown",
    `${cfg.splashDesc || EXPLAIN.splash} Landing point ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(0)} km from the planned recovery area (${splash.name || "recovery zone"}).`,
    "landing",
  );
  ship.add(
    new SurfaceSeg(
      "earth",
      ent.t,
      ent.t + 2 * H,
      ent.ll[0],
      ent.ll[1],
      0,
      capM,
      { extra: { phase: "recovery" } },
    ),
  );
  M.phase(tDepart, tE, "Return to Earth", "#f15bb5");
  M.phase(tE, ent.t, "Entry & splashdown", "#ff5d5d");
  M.summary.entry = {
    vEI,
    maxG: ent.maxG,
    maxHeat: ent.maxHeat,
    miss,
    ll: ent.ll,
    bank: g.x,
  };
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------

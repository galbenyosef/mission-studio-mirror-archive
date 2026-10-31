// index-inline-1 42 — cfg
// Lines 14025-14291 of readable/index-inline-1.pretty.js (statement-aligned).
function shuttleReturn(o, tIns) {
  const { M, cfg, ship, H, rwy } = o;
  const tLandNom = isoToT(cfg.landing);
  o.progress("Deorbit planning: finding the landing opportunity…");
  const pr = leoInt(o.t, o.y, tLandNom + 2 * H, { hmax: 60 });
  const rwyDir = (tt) => vunit(sitePosEcl("earth", rwy.lat, rwy.lon, 0, tt));
  // passes: local minima of the ground track's distance from the runway
  const passes = [];
  let prev = null,
    prev2 = null;
  for (
    let tt = Math.max(o.t + 600, tLandNom - 5 * H);
    tt <= tLandNom + 1.5 * H;
    tt += 20
  ) {
    const s = resState(pr, tt),
      d = vangle([s[0], s[1], s[2]], rwyDir(tt)) * R_E;
    if (prev && prev2 && prev.d < prev2.d && prev.d <= d)
      passes.push({ t: prev.t, d: prev.d });
    prev2 = prev;
    prev = { t: tt, d };
  }
  const pick = passes
    .map((p) => ({
      ...p,
      cost:
        Math.abs(p.t + 13 * 60 - tLandNom) / 60 +
        (p.d > 1250 ? 1e6 : p.d / 100),
    }))
    .sort((a, b) => a.cost - b.cost)[0];
  if (!pick) {
    M.warnings.push(
      "No landing opportunity found near the planned landing time.",
    );
    M.failed = "deorbit";
    o.coast(tLandNom, "in orbit");
    M.finalize();
    return M;
  }
  if (pick.d > 1250)
    M.warnings.push(
      `The landing pass is ${Math.round(pick.d)} km off the runway — more than the orbiter's usual cross-range.`,
    );
  // deorbit Δv: retrograde, sized for a −1.2° flight-path angle at entry interface (two-body estimate)
  const fpaT = (cfg.entryFpa ?? -1.2) * DEG,
    rEI = R_E + EI_SH;
  const dvFor = (r, v) => {
    let lo = 0.02,
      hi = 0.45;
    for (let k = 0; k < 50; k++) {
      const dv = (lo + hi) / 2,
        v1 = vadd(v, vscale(vunit(v), -dv));
      const el = rv2coe(r, v1, MU_E);
      if (el.rp > rEI) {
        lo = dv;
        continue;
      }
      const hh = el.hn,
        vE = Math.sqrt(2 * (el.energy + MU_E / rEI)),
        g = -Math.acos(clamp(hh / (rEI * vE), -1, 1));
      if (g > fpaT) lo = dv;
      else hi = dv;
    }
    return (lo + hi) / 2;
  };
  const evEIsh = {
    name: "EI",
    dir: -1,
    terminal: true,
    g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - rEI,
  };
  const target = { lat: rwy.lat, lon: rwy.lon, elev: rwy.elev };
  const trial = (td) => {
    const s = resState(pr, td),
      r = [s[0], s[1], s[2]],
      v = [s[3], s[4], s[5]],
      dv = dvFor(r, v);
    const rr = leoInt(
      td,
      [...r, ...vadd(v, vscale(vunit(v), -dv)), s[6]],
      td + 2.5 * H,
      { events: [evEIsh] },
    );
    if (!rr.stopEvent) return null;
    const ye = rr.stopEvent.y,
      te = rr.stopEvent.t;
    const ent = simulateWingedEntry({
      t0: te,
      r0: [ye[0], ye[1], ye[2]],
      v0: [ye[3], ye[4], ye[5]],
      m0: s[6],
      target,
      rTaem: 96,
      fixedBank: (cfg.refBank ?? 55) * DEG,
      noSamples: true,
      coarse: true,
    });
    const rE = [ye[0], ye[1], ye[2]],
      err = vangle(rE, ent.r) * R_E - (vangle(rE, rwyDir(ent.t)) * R_E - 96);
    return { dv, err, te };
  };
  let td = pick.t + 13 * 60 - 65 * 60,
    tr = trial(td);
  for (let k = 0; k < 6 && tr && Math.abs(tr.err) > 15; k++) {
    td -= tr.err / 7.3;
    tr = trial(td);
  }
  if (!tr) {
    M.warnings.push("Deorbit targeting failed.");
    M.failed = "deorbit";
    M.finalize();
    return M;
  }
  // payload bay doors close a few hours before the burn
  const tDoors = td - (cfg.doorsCloseBefore ?? 2.8) * H;
  M.ev(
    tDoors,
    "ship",
    "Payload bay doors closed",
    "The crew stows the cabin, closes the payload bay doors and puts on launch and entry suits.",
    "info",
  );
  ship.setConfig(tDoors, "sc", {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    bayT: tDoors,
  }); // swinging shut over the next three minutes
  M.phase(tIns, td - 1800, cfg.orbitPhaseName || "In orbit", "#4ea8de");
  // deorbit burn
  o.progress("Deorbit burn and entry…");
  o.coast(Math.min(tDoors, td - 1800), "in orbit");
  const b = o.omsBurn(
    td,
    (r, v) => vscale(vunit(v), -tr.dv),
    "Deorbit burn",
    (x) =>
      `Flying tail-first and upside down, half a world away from ${rwy.short}, both OMS engines fire for ${fmtDur(x.dur)}: Δv ${Math.round(x.dv)} m/s, enough to drop the far side of the orbit into the atmosphere. There is no turning back after this burn.`,
    "in orbit — deorbit preparations",
  );
  ship.setConfig(o.t + 150, "sc", {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    att: "entry",
  });
  M.ev(
    o.t + 150,
    "ship",
    "Pitch around to entry attitude",
    "The orbiter turns nose-forward and raises its nose 40° above the direction of flight, so the black heat-shield tiles on its belly will meet the air first.",
    "info",
  );
  const rEIres = leoInt(o.t, o.y, o.t + 2.5 * H, { events: [evEIsh] });
  ship.add(resToSeg(rEIres, "falling toward the atmosphere"));
  const yE = Array.from(rEIres.y[rEIres.y.length - 1]);
  const tEI = rEIres.tEnd;
  const vEIrel = vnorm(
    vsub(
      [yE[3], yE[4], yE[5]],
      vcross(bodyOmegaEcl("earth", tEI), [yE[0], yE[1], yE[2]]),
    ),
  );
  const rngEI = vangle([yE[0], yE[1], yE[2]], rwyDir(tEI + 1900)) * R_E;
  M.ev(
    tEI,
    "ship",
    "Entry interface (400,000 ft)",
    `${vnorm([yE[3], yE[4], yE[5]]).toFixed(2)} km/s at 122 km, about ${Math.round(rngEI / 10) * 10} km from the runway, flight-path angle ${fpaDeg([yE[0], yE[1], yE[2]], [yE[3], yE[4], yE[5]]).toFixed(2)}°. The orbiter enters at a 40° angle of attack: the belly takes the heat and the air brakes it. ${cfg.blackout ? "" : "Unlike a capsule it can steer — by banking."}`,
    "entry",
  );
  const ent = simulateWingedEntry({
    t0: tEI,
    r0: [yE[0], yE[1], yE[2]],
    v0: [yE[3], yE[4], yE[5]],
    m0: yE[6],
    target,
    rTaem: 96,
    vTaem: 0.76,
    blackout: !!cfg.blackout,
  });
  ship.add(new SampleSeg("earth", ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Stagnation heat flux about ${Math.round(ent.maxHeat)} W/cm² (Sutton–Graves estimate): the wing leading edges and nose cap of reinforced carbon-carbon glow at up to 1,500 °C, and the shock layer ahead of the orbiter is hotter still.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(2)} g — gentle by capsule standards: the orbiter’s lift spreads the braking over half an hour.`,
    "gload",
  );
  if (Math.abs(ent.rangeErr) > 60)
    M.warnings.push(
      `Entry guidance ended ${Math.round(ent.rangeErr)} km off its target energy point.`,
    );
  // terminal area energy management, approach & landing, rollout
  o.progress("Approach and landing…");
  const AP = shuttleApproach({ t: ent.t, r: ent.r, v: ent.v }, rwy, {
    m: yE[6],
    chute: !!cfg.dragChute,
    ogs: cfg.ogs || 19,
    rollout: cfg.rollout,
  });
  ship.add(new SampleSeg("earth", AP.samples, { phase: "approach & landing" }));
  for (const e of AP.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  const cBase = {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    att: "entry",
  };
  ship.setConfig(AP.tGear, "sc", { ...cBase, gear: true });
  if (AP.tChute) {
    ship.setConfig(AP.tChute, "sc", { ...cBase, gear: true, dragChute: 1 });
    ship.setConfig(AP.tChuteJet, "sc", { ...cBase, gear: true });
  }
  const mStop = yE[6];
  ship.add(
    new SurfaceSeg(
      "earth",
      AP.tStop,
      AP.tStop + 1.5 * H,
      AP.stopLL[0],
      AP.stopLL[1],
      rwy.elev,
      mStop,
      { extra: { phase: "wheel stop — on the runway", hdg: rwy.hdg } },
    ),
  );
  M.phase(td - 1800, ent.t, "Deorbit & entry", "#ff5d5d");
  M.phase(ent.t, AP.tStop, "Approach & landing", "#f15bb5");
  M.phase(AP.tStop, AP.tStop + 1.5 * H, "On the runway", "#ffd166");
  M.summary.entries = [
    {
      body: "earth",
      vEI: vEIrel,
      maxG: ent.maxG,
      maxHeat: ent.maxHeat,
      miss: 0,
      ll: AP.stopLL,
      reversals: ent.reversals,
    },
  ];
  M.summary.landing = { t: AP.tTD, ll: AP.tdLL, miss: 0, runway: rwy.short };
  M.notes.push(
    `Deorbit burn ${fmtUTC(b ? b.tIgn : td)} UTC, Δv ${Math.round(tr.dv * 1000)} m/s; entry flown with ${ent.reversals} roll reversal${ent.reversals === 1 ? "" : "s"}; TAEM reached ${Math.round(ent.rangeErr)} km from its target point.`,
  );
  M.finalize();
  return M;
}
// TAEM, heading alignment cone, outer and inner glideslopes, flare, touchdown and rollout, flown as a guided path
// (the orbiter is a glider: speed comes from trading altitude). Returns ECL samples and events.

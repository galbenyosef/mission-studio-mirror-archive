// index-inline-1 17 — asc
// Lines 5357-5701 of readable/index-inline-1.pretty.js (statement-aligned).
function launchPhase(M, cfg, L, scMass, normal, opts = {}) {
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0;
  const stack = buildAscentStack(L, scMass);
  const hp = cfg.parking?.hp ?? L.ascent.hp,
    ha = cfg.parking?.ha ?? L.ascent.ha;
  const hCut = cfg.parking?.hCut ?? L.ascent.hCut;
  const asc = optimizeAscent({
    body: "earth",
    t0,
    lat: S.lat,
    lon: S.lon,
    stack,
    target: { normal, hp, ha, hCut },
    vert: L.ascent.vert,
    kickGuess: L.ascent.kickGuess,
    fairingR: L.payloadFairing ? L.payloadFairing.r : 0,
    qMax: L.ascent.qMax || 33000,
    arefExtra: L.arefExtra || 0,
    gTgo: !!L.ascent.gTgo,
    sampleDt: 0.5,
  });
  const ship = opts.ship;
  ship.add(new SampleSeg("earth", asc.samples, { phase: "ascent" }));
  // configs per staging
  const nSt = L.stages.length;
  const cfgAt = (stFrom, boosters, fairing, les, sac) => ({
    key: "launch",
    stFrom,
    boosters,
    fairing,
    les,
    sac: sac ?? true,
    launcher: cfg.launcher,
    variant: cfg.lvVariant,
    orbiter: cfg.orbiterId,
  }); // (orbiter: which Shuttle orbiter rides the stack)
  ship.setConfig(t0 - 7200, "launch", cfgAt(0, true, true, true));
  let stFrom = 0,
    boosters = L.stages[0].parallel,
    fairing = !!L.payloadFairing,
    les = L.jettison.some((j) => j.part === "LES"),
    saj = L.jettison.some((j) => j.part === "SAJ"),
    ist = L.jettison.some((j) => j.part === "IST");
  const lit = liftoffStages(L),
    liq = lit.filter((s) => s.prop !== "solid"),
    sol = lit.filter((s) => s.prop === "solid");
  const IG = L.ign || { t: 3, ramp: 1.5 };
  const nm = engineCounts;
  if (IG.t > 0 && liq.length)
    M.ev(
      t0 - IG.t,
      "ship",
      "Ignition sequence start",
      `${nm(liq)} ignite on the pad${IG.seq ? " — " + IG.seq : ""}. Hold-down clamps keep the ${L.name} in place while the engines build up to full thrust and the computers check every engine; water floods the pad to soak up heat and sound.${sol.length ? ` The ${nm(sol)} solid boosters wait for T−0: once lit they cannot be shut down.` : ""}`,
      "launch",
      { ign: true },
    );
  M.ev(
    t0,
    "ship",
    "Liftoff",
    `${sol.length ? `${nm(sol)} ignite; ` : ""}${EXPLAIN.liftoff} Liftoff mass ${(stackMass(buildAscentStack(L, scMass)) / 1000).toFixed(0)} t, thrust ${(lit.reduce((a, s) => a + s.thrustSL, 0) / 1e6).toFixed(1)} MN.`,
    "launch",
  );
  M.ev(
    t0 + (L.ascent.vert || 10) + 2,
    "ship",
    "Pitch-over",
    EXPLAIN.vertical + ` Launch azimuth ${asc.azI.toFixed(1)}°.`,
    "ascent",
  );
  for (const e of asc.events) {
    let desc = e.desc;
    if (e.kind === "staging") {
      const idx = L.stages.findIndex((s) => s.id === e.stage);
      if (L.stages[idx].parallel) boosters = false;
      else stFrom = idx + 1;
      ship.setConfig(e.t, "launch", {
        ...cfgAt(stFrom, boosters, fairing, les),
        saj,
        ist,
      });
      desc += " " + EXPLAIN.staging;
      // debris object
      const st = ship.stateAt(e.t);
      if (st) {
        const deb = M.addObj(
          new MObject("debris-" + e.stage, L.stages[idx].name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(e.t, "stage", {
          key: "stage",
          launcher: cfg.launcher,
          stage: idx,
          variant: cfg.lvVariant,
        });
        const vSep = vadd(st.v, vscale(vunit(st.v), -0.004));
        deb.add(
          new ConicSeg("earth", e.t, e.t + 900, st.r, vSep, L.stages[idx].dry, {
            extra: { phase: "spent stage" },
          }),
        );
      }
    }
    if (e.kind === "jettison") {
      if (e.part === "fairing") fairing = false;
      if (e.part === "LES") les = false;
      if (e.part === "SAJ") saj = false;
      if (e.part === "IST") ist = false;
      ship.setConfig(e.t, "launch", {
        ...cfgAt(stFrom, boosters, fairing, les),
        saj,
        ist,
      });
    }
    if (e.kind === "jettison" && e.part === "IST") {
      // the aft interstage, the ring the S-II's engines have fired through since staging, falls behind
      const st = ship.stateAt(e.t),
        j = L.jettison.find((j) => j.part === "IST");
      if (st) {
        const deb = M.addObj(
          new MObject("debris-IST", j.name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(e.t, "stage", { key: "ist", launcher: cfg.launcher });
        deb.add(
          new ConicSeg(
            "earth",
            e.t,
            e.t + 900,
            st.r,
            vadd(st.v, vscale(vunit(st.v), -0.002)),
            j.mass,
            { extra: { phase: "jettisoned" } },
          ),
        );
      }
    }
    if (e.kind === "maxq") desc = e.desc + " " + EXPLAIN.maxq;
    if (e.kind === "insertion") desc = e.desc + " " + EXPLAIN.insertion;
    M.ev(e.t, "ship", e.name, desc, e.kind);
  }
  // a non-restartable sustainer that reached orbit (e.g. SLS core) is discarded; the next stage becomes the upper stage
  if (asc.ok && asc.upper && !asc.upper.restart) {
    const idx = L.stages.findIndex((s) => s.id === asc.upper.id);
    const nxt = asc.stack.stages.slice(idx + 1).find((s) => s.attached);
    if (nxt) {
      const dropped = asc.upper.dry + asc.upper.propLeft;
      asc.m -= dropped;
      asc.upper.attached = false;
      asc.upper = nxt;
      asc.upperProp = nxt.propLeft;
      stFrom = idx + 1;
      ship.setConfig(asc.t, "launch", {
        ...cfgAt(stFrom, false, fairing, les),
        saj,
        ist,
      });
      M.ev(
        asc.t + 1,
        "ship",
        `${L.stages[idx].id} separation`,
        `The ${L.stages[idx].name} has done its job and separates; the ${nxt.name} will perform the upcoming burns.`,
        "staging",
      );
      const st = ship.stateAt(asc.t);
      if (st) {
        const deb = M.addObj(
          new MObject("debris-" + L.stages[idx].id, L.stages[idx].name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(asc.t, "stage", {
          key: "stage",
          launcher: cfg.launcher,
          stage: idx,
        });
        deb.add(
          new ConicSeg(
            "earth",
            asc.t,
            asc.t + 1500,
            st.r,
            vadd(st.v, vscale(vunit(st.v), -0.003)),
            L.stages[idx].dry,
            { extra: { phase: "spent stage" } },
          ),
        );
      }
    }
  }
  M.phase(t0, asc.t, "Launch & ascent", "#ff9f43");
  M.summary.ascent = {
    maxG: asc.maxG,
    maxQ: asc.maxQ,
    tIns: asc.t - t0,
    hp: asc.hpAch,
    ha: asc.haAch,
    kick: asc.kick,
    az: asc.azI,
    upperProp: asc.upperProp,
    upper: asc.upper ? asc.upper.id : null,
    swing10: asc.swing10,
    swingT: asc.swingT,
  };
  return { ok: asc.ok, asc, stFrom, fairing, les, boosters };
}
function budgetRow(M, b) {
  M.burn(b);
}

// ---- lunar.js
// ============================================================================
// lunar.js — Earth–Moon missions, numerically integrated (Earth + Moon + Sun)
// Profiles: lunar-orbit (orbit & return), lunar-landing (land & return),
//           lunar-flyby (free return), lunar-landing-oneway
// ============================================================================
const R_E = BODIES.earth.R,
  R_MOON = BODIES.moon.R,
  EI_ALT = 121.92;
function cisInt(t0, y0, t1, opt = {}) {
  return integrate(
    makeCislunarODE(opt.thrust || null),
    t0,
    Float64Array.from(y0),
    t1,
    {
      rtol: opt.rtol ?? 1e-10,
      atol: opt.atol ?? 1e-7,
      hmax: opt.hmax ?? 1200,
      events: opt.events || [],
      h0: opt.h0 ?? 5,
      maxSteps: opt.maxSteps ?? 400000,
    },
  );
}
const evPerilune = (maxD = 150000, tWin = null) => ({
  name: "perilune",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (tWin && (t < tWin[0] || t > tWin[1])) return -1;
    const m = moonGeo(t);
    const rx = y[0] - m.r[0],
      ry = y[1] - m.r[1],
      rz = y[2] - m.r[2];
    if (rx * rx + ry * ry + rz * rz > maxD * maxD) return -1;
    return rx * (y[3] - m.v[0]) + ry * (y[4] - m.v[1]) + rz * (y[5] - m.v[2]);
  },
});
const evPerigee = (maxD = 120000) => ({
  name: "perigee",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (y[0] * y[0] + y[1] * y[1] + y[2] * y[2] > maxD * maxD) return -1;
    return y[0] * y[3] + y[1] * y[4] + y[2] * y[5];
  },
});
const evPerigeeAfter = (tStart, delay = 600, maxD = 120000) => ({
  name: "perigee",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (t - tStart < delay) return -1;
    if (y[0] * y[0] + y[1] * y[1] + y[2] * y[2] > maxD * maxD) return -1;
    return y[0] * y[3] + y[1] * y[4] + y[2] * y[5];
  },
});
function cisIntDelayed(t0, y0, tDelay, t1, events, opt = {}) {
  // events enabled only after tDelay
  if (tDelay <= t0) return cisInt(t0, y0, t1, { ...opt, events });
  const a = cisInt(t0, y0, Math.min(tDelay, t1), opt);
  if (tDelay >= t1) return a;
  const b = cisInt(tDelay, a.y[a.y.length - 1], t1, { ...opt, events });
  return {
    t: a.t.concat(b.t.slice(1)),
    y: a.y.concat(b.y.slice(1)),
    f: a.f.concat(b.f.slice(1)),
    events: b.events,
    tEnd: b.tEnd,
    stopped: b.stopped,
    stopEvent: b.stopEvent,
  };
}
const evEI = () => ({
  name: "EI",
  dir: -1,
  terminal: true,
  g: (t, y) => Math.hypot(y[0], y[1], y[2]) - (R_E + EI_ALT),
});
const evLunarImpact = () => ({
  name: "impact",
  dir: -1,
  terminal: true,
  g: (t, y) => {
    const m = moonGeo(t).r;
    return Math.hypot(y[0] - m[0], y[1] - m[1], y[2] - m[2]) - R_MOON;
  },
});
const yToRV = (y) => ({
  r: [y[0], y[1], y[2]],
  v: [y[3], y[4], y[5]],
  m: y[6],
});
function resState(res, t) {
  // Hermite state from integrator result at time t
  const T = res.t;
  let i = bsearch(T, t);
  if (i >= T.length - 1) i = T.length - 2;
  if (i < 0) i = 0;
  return hermiteState(
    T[i],
    res.y[i],
    res.f[i],
    T[i + 1],
    res.y[i + 1],
    res.f[i + 1],
    clamp(t, T[i], T[i + 1]),
    7,
  );
}
// an integrator result up to t, ending at t itself (where the next segment starts) rather than at its last step before it
function resUntil(res, t) {
  let k = res.t.findIndex((x) => x > t);
  if (k < 0) k = res.t.length;
  const out = { t: res.t.slice(0, k), y: res.y.slice(0, k) };
  if (!out.t.length || out.t[out.t.length - 1] < t) {
    out.t.push(t);
    out.y.push(resState(res, t));
  }
  return out;
}

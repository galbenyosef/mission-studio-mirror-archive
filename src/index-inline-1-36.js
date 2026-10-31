// index-inline-1 36 — cfg
// Lines 12417-12909 of readable/index-inline-1.pretty.js (statement-aligned).
function planHalo(cfg, progress = () => {}) {
  const M = new Mission(cfg),
    H = 3600,
    D = 86400,
    AU = 1.496e8;
  const L = LAUNCHERS[cfg.launcher],
    SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft])),
    P = new Propulsion(SC),
    S = LAUNCH_SITES[cfg.site],
    t0 = M.t0;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew: 0,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const tArr = isoToT(cfg.arrive),
    skD = cfg.halo.skDays * D,
    rPark = BODIES.earth.R + (cfg.parking?.hp ?? 170);
  const sDir = vunit(sitePosEcl("earth", S.lat, S.lon, 0, t0)),
    sg = cfg.halo.branch ?? -1;
  // ---------------- the design ----------------
  progress("Transfer design: the halo and its stable manifold…");
  // The unknowns are the halo's out-of-plane size and the phase the branch leaves the halo at, which together set where
  // the branch comes down and how its plane lies; the seed's distance off the halo is the scenario's (it only sets how
  // long the branch takes, about four months as Webb's did). The conditions: the branch's perigee is at the parking
  // orbit's radius, and the launch site lies in the branch's plane at liftoff. The perigee is pinned to the injection,
  // about three quarters of an hour after launch (ascent and a short coast).
  const tInjExp = t0 + 45 * 60,
    le = Math.log10((cfg.halo.seedKm ?? 47000) / AU);
  let tPerRef = tInjExp; // the epoch of the branch's perigee (refined to the parking orbit's actual pass below)
  const branchOf = (x, fwdT = 0.01) =>
    manifoldBranch(
      x[0] * 1e5,
      ((x[1] % 1) + 1) % 1,
      Math.pow(10, le),
      sg,
      fwdT,
    );
  const pole = vunit(sitePosEcl("earth", 90, 0, 0, t0)),
    sEast = vunit(vcross(pole, sDir)),
    sNorth = vcross(sDir, sEast);
  const evalDesign = (x) => {
    const br = branchOf(x);
    if (!br.per) return { F: [50, 50] };
    const st = cr3bpToInertial(tPerRef, br.per.y, br.mu),
      n = vunit(vcross(st.r, st.v)),
      d = vcross(n, sDir); // (d: the direction of flight in that plane over the site)
    return {
      F: [
        (vnorm(st.r) - rPark) / 1000,
        Math.asin(clamp(vdot(n, sDir), -1, 1)) * RAD,
      ],
      br,
      st,
      n,
      launchAz: Math.atan2(vdot(d, sEast), vdot(d, sNorth)) * RAD,
    };
  };
  // the starting point: over both classes of halo (northern and southern, mirror images whose branches come down in
  // mirrored planes, so one of them is launched to the north-east and the other to the south-east), within the site's
  // range of azimuths, nearest the scenario's size
  const azOK = (a) => {
    const [lo, hi] = S.azRange || [-180, 180];
    return a >= lo - 1 && a <= hi + 1;
  };
  let x0 = null,
    best = Infinity;
  for (const sgn of [1, -1])
    for (let az = 2; az <= 6.001; az += 0.25)
      for (let ph = 0; ph < 1; ph += 0.01) {
        const E = evalDesign([sgn * az, ph]);
        if (!E.br || E.n[2] < 0 || !azOK(E.launchAz)) continue;
        const c =
          Math.abs(E.F[0]) / 20 +
          Math.abs(E.F[1]) / 30 +
          Math.abs(az - cfg.halo.az / 1e5) / 5;
        if (c < best) {
          best = c;
          x0 = [sgn * az, ph];
        }
      }
  if (!x0) {
    M.warnings.push(
      "No branch of the stable manifold comes down to the Earth for this halo.",
    );
    M.failed = "design";
    M.finalize();
    return M;
  }
  const sD = newtonSolve((x) => evalDesign(x).F, x0, {
    h: 1e-3,
    tol: 0.05,
    maxIt: 40,
    maxStep: 0.1,
  });
  if (globalThis.DEBUG)
    console.log(
      "design",
      x0,
      sD.it,
      sD.hist.map((v) => +v.toFixed(2)),
      sD.x,
      sD.F,
      "launch az",
      evalDesign(sD.x).launchAz,
    );
  if (!sD.ok)
    M.warnings.push(
      `Transfer design converged only approximately (residual ${sD.norm.toFixed(2)}).`,
    );
  const azKm = sD.x[0] * 1e5;
  const DS = evalDesign(sD.x),
    T = haloPeriodS(tArr, azKm);
  // the reference: the branch from its perigee, through the approach, onto the halo and round it, as inertial samples
  const fullBr = branchOf(
    sD.x,
    haloCR3BP(azKm).T * ((cfg.halo.circuits ?? 1.05) + 0.5),
  );
  const REF = [];
  {
    const b = fullBr.back;
    for (let i = b.t.length - 1; i >= 0; i--)
      REF.push({ tau: b.t[i] - fullBr.per.tau, y: b.y[i] });
    const f = fullBr.fwd;
    for (let i = 1; i < f.t.length; i++)
      REF.push({ tau: f.t[i] - fullBr.per.tau, y: f.y[i] });
  }
  const refTau = REF.map((q) => q.tau); // tau = 0 at the perigee
  const refAt = (tt) => {
    const tau = (tt - tPerRef) * SE_N,
      i = clamp(bsearch(refTau, tau), 0, REF.length - 2),
      j = i + 1,
      f = clamp((tau - refTau[i]) / (refTau[j] - refTau[i] || 1), 0, 1);
    const y = REF[i].y.map((v, k) => v + (REF[j].y[k] - v) * f);
    return cr3bpToInertial(tt, y, fullBr.mu);
  };
  const plN = DS.n,
    tSeed = tPerRef - fullBr.per.tau / SE_N;
  // ---------------- launch ----------------
  progress("Launch & ascent…");
  const LP = launchPhase(M, cfg, L, scTotalMass(SC), plN, { ship });
  if (!LP.ok) {
    M.warnings.push("The launch vehicle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  P.attachUpper(asc.upper, asc.upperProp);
  M.summary.design = {
    az: azKm,
    periodDays: T / D,
    seedKm: Math.pow(10, le) * AU,
    perigeeKm: vnorm(DS.st.r) - BODIES.earth.R,
    branchDays: (tSeed - tPerRef) / D,
  };
  M.notes.push(
    `Launch azimuth ${asc.azI.toFixed(1)}°: the plane of the stable manifold's branch to L2, which held the launch site at liftoff.`,
  );
  ship.setConfig(asc.t, "stack", {
    key: "stack",
    parts: ["upper", "sc-stowed"],
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    sc: SC.model,
  });
  let t = asc.t,
    y = [...asc.r, ...asc.v, asc.m];
  const coast = (tEnd, phase, objRef = ship, extra) => {
    const res = cisInt(t, y, tEnd, {});
    objRef.add(resToSeg(res, phase, extra));
    t = res.t[res.t.length - 1];
    y = Array.from(res.y[res.y.length - 1]);
    return res;
  };
  // ---------------- the injection ----------------
  // The burn at the perigee of the branch (the parking orbit comes round to it): its length and its centre solved so that
  // the climb is at the reference's position 2.5 days on — the upper stage's push is along the velocity, and the plane is
  // the orbit's, so two unknowns are all it has.
  progress("Injection toward L2: targeting…");
  const eng = P.engineOf("upper"),
    tank = P.tankOf("upper"),
    mdot = eng.thrust / (eng.isp * G0);
  const parkRes = cisInt(t, y, t + 3 * H, {});
  let tInj0 = tPerRef;
  {
    let bst = Infinity;
    for (let i = 0; i < parkRes.t.length; i++) {
      const tt = parkRes.t[i];
      if (tt < t + 900) continue;
      const d = vnorm(vsub(parkRes.y[i].slice(0, 3), DS.st.r));
      if (d < bst) {
        bst = d;
        tInj0 = tt;
      }
    }
    tPerRef = tInj0;
  } // where the parking orbit first passes the branch's perigee with room for the burn before it: the reference is pinned there (the hour or so of difference from the design's guess turns the Sun–Earth frame by a negligible 0.04°)
  const dvMag0 = vnorm(DS.st.v) - vnorm(resState(parkRes, tInj0).slice(3, 6)),
    D0 = propForDv(resState(parkRes, tInj0)[6], dvMag0, eng.isp) / mdot;
  const burnOf = (x) => {
    const Dn = Math.max(10, D0 + x[0] * 3),
      tIgn = clamp(tInj0 + x[1] * 100 - Dn / 2, t + 60, parkRes.tEnd - Dn - 60),
      yS = Array.from(resState(parkRes, tIgn)),
      law = localDirLaw(yS.slice(0, 3), yS.slice(3, 6), vunit(yS.slice(3, 6)));
    const r = cisInt(tIgn, yS, tIgn + Dn, {
      thrust: { T: eng.thrust, mdot, dir: law },
      hmax: 20,
      h0: 1,
    });
    return { tIgn, D: Dn, res: r, law, yEnd: Array.from(r.y[r.y.length - 1]) };
  };
  const tW1 = t0 + 2.5 * D,
    hN = vunit(vcross(asc.r, asc.v));
  const missAt = (tS, yS, tW) => {
    const r = cisInt(tS, yS, tW, { rtol: 1e-9, atol: 1e-6, hmax: 3600 }),
      ye = r.y[r.y.length - 1],
      ref = refAt(tW).r;
    return [
      (ye[0] - ref[0]) / 1000,
      (ye[1] - ref[1]) / 1000,
      (ye[2] - ref[2]) / 1000,
    ];
  };
  const injF = (x) => {
    const B = burnOf(x),
      m = missAt(B.res.tEnd, B.yEnd, tW1);
    const e1 = vunit(vsub(refAt(tW1).r, vscale(hN, vdot(refAt(tW1).r, hN)))),
      e2 = vcross(hN, e1);
    return [vdot(m, e1), vdot(m, e2)];
  }; // (in the plane)
  const solI = newtonSolve(injF, [0, 0], {
    h: 1e-2,
    tol: 0.02,
    maxIt: 30,
    maxStep: 3,
  });
  if (globalThis.DEBUG)
    console.log(
      "injection",
      ((tInj0 - t0) / 60) | 0,
      "min",
      (((fb0) => fb0.tIgn - t0)(burnOf([0, 0])) / 60) | 0,
      solI.it,
      solI.hist.map((v) => +v.toFixed(2)),
      solI.x,
    );
  if (!solI.ok)
    M.warnings.push(
      `Injection targeting converged only approximately (residual ${(solI.norm * 1000).toFixed(0)} km).`,
    );
  const fb = burnOf([solI.x[0] - (0.0005 * burnOf(solI.x).D) / 3, solI.x[1]]); // (cut 0.05 % short on purpose, a couple of m/s at perigee that cost ten times that to make up later: the launcher must not overshoot — see MCC-1a)
  coast(fb.tIgn, "parking orbit");
  ship.add(
    resToSeg(
      fb.res,
      "injection toward L2",
      { stage: P.upper.id },
      { T: eng.thrust, law: fb.law },
    ),
  );
  const used = fb.res.y[0][6] - fb.yEnd[6];
  tank.propLeft -= used;
  const dvI = dvForProp(fb.res.y[0][6], used, eng.isp) * 1000;
  M.burn({
    name: "Injection (ESC-A)",
    t: fb.tIgn,
    dur: fb.D,
    dv: dvI,
    engine: eng.name,
    isp: eng.isp,
    prop: used,
    m0: fb.res.y[0][6],
    obj: "ship",
    propType: eng.prop,
  });
  M.ev(
    fb.tIgn,
    "ship",
    "Injection toward L2",
    `The upper stage burns ${fmtDur(fb.D)} (Δv ≈ ${dvI.toFixed(0)} m/s): just short of escape, the telescope sets off up the stable manifold of its halo orbit — the one path that climbs for a month, slowing all the way, and settles onto the orbit about L2 of its own accord. The burn is cut a touch short on purpose; the telescope's own thrusters make up the difference.`,
    "burn",
  );
  M.phase(asc.t, fb.tIgn, "Parking orbit", "#4ea8de");
  t = fb.res.tEnd;
  y = Array.from(fb.yEnd);
  M.summary.design.C3 =
    vdot(y.slice(3, 6), y.slice(3, 6)) - (2 * MU_E) / vnorm(y.slice(0, 3));
  M.summary.design.azLaunch = asc.azI;
  // ---------------- separation ----------------
  const tSep = t + 600;
  coast(tSep, "transfer to L2");
  const up = M.addObj(
    new MObject("upper", P.upper.name, {
      kind: "stage",
      model: "stage",
      color: "#aaa",
    }),
  );
  up.setConfig(t, "stage", {
    key: "stage",
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    withAdapter: true,
  });
  const mUp = P.upper.dry + P.upper.propLeft;
  up.add(
    resToSeg(
      cisInt(
        t,
        [
          ...y.slice(0, 3),
          ...vadd(y.slice(3, 6), vscale(vunit(y.slice(3, 6)), -0.002)),
          mUp,
        ],
        t + 7 * D,
        {},
      ),
      "spent stage",
    ),
  );
  y[6] -= mUp;
  P.upper.attached = false;
  const deploy = (cfg.deploy || []).map((d) => ({
    ...d,
    at: Math.max(d.at, t + 300 - t0),
  })); // (nothing unfolds before the telescope is on its own: the table's early steps wait for the separation)
  ship.setConfig(t, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["orbiter"],
    deployT: t0,
    deploy,
  });
  M.ev(
    t,
    "ship",
    "Separation from the upper stage",
    "The telescope, folded for launch, separates from the ESC-A and begins its deployments on the way to L2.",
    "sep",
  );
  // ---------------- the deployments, on the mission clock ----------------
  for (const d of deploy)
    M.ev(t0 + d.at, "ship", d.name, d.desc || "", "deploy", { dur: d.dur });
  // ---------------- corrections, insertion and station-keeping: tracking the reference ----------------
  // Each burn brings the telescope to the reference's position at a waypoint ahead: the corrections on the way aim at
  // the arrival; the insertion and the station-keeping burns aim two nodes (six weeks) on — aiming at the very next node
  // over-corrects the position and the burn after pays it back, so each would cost twice what it needs. The reference is a CR3BP
  // path in a real sky, so a few metres per second are asked at every node — about what Webb spends.
  const dvSK = []; // (the station-keeping burns actually made)
  const applyBurn = (name, tB, dv, descFn) => {
    const mag = vnorm(dv) * 1000,
      pm = P.burn("OBS", y[6], mag / 1000);
    M.burn({
      name,
      t: tB,
      dur: pm.dur,
      dv: mag,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: y[6],
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(tB, "ship", name, descFn(mag, pm.dur), "burn", { dv: mag });
    y[3] += dv[0];
    y[4] += dv[1];
    y[5] += dv[2];
    y[6] -= pm.prop;
    return mag;
  };
  const track = (
    name,
    tB,
    tW,
    phase,
    maxStep,
    descFn,
    alongOnly = false,
    minDv = 0,
  ) => {
    coast(tB, phase);
    const vh = vunit(y.slice(3, 6)),
      dvOf = (x) => (alongOnly ? vscale(vh, x[0] * 1e-3) : vscale(x, 1e-3));
    const F = (x) => {
      const dv = dvOf(x),
        m = missAt(
          tB,
          [y[0], y[1], y[2], y[3] + dv[0], y[4] + dv[1], y[5] + dv[2], y[6]],
          tW,
        );
      return alongOnly ? [vdot(m, vunit(refAt(tW).r))] : m;
    }; // (along the velocity only: the distance from the Earth, i.e. the energy)
    const sol = newtonSolve(F, alongOnly ? [0] : [0, 0, 0], {
      h: 1e-2,
      tol: 0.02,
      maxIt: 25,
      maxStep: maxStep * 1000,
      lambda: 1e-6,
    });
    if (globalThis.DEBUG)
      console.log(
        name,
        sol.it,
        sol.hist.map((v) => +v.toFixed(2)),
        sol.x.map((v) => +v.toFixed(2)),
      );
    if (!sol.ok)
      M.warnings.push(
        `${name} converged only approximately (residual ${(sol.norm * 1000).toFixed(0)} km).`,
      );
    if (vnorm(dvOf(sol.x)) * 1000 < minDv) return 0; // (on course already: no burn to record)
    return applyBurn(name, tB, dvOf(sol.x), descFn);
  };
  progress("Mid-course corrections…");
  track(
    "MCC-1a",
    t0 + 12.5 * H,
    tArr,
    "transfer to L2",
    0.05,
    (mag, dur) =>
      `The first correction, 12.5 hours after launch, makes up the energy the injection left short — always short, by design: the launcher must not overshoot, since the telescope cannot turn round to thrust back toward the Sun without exposing its cold side. Δv ${mag.toFixed(1)} m/s along the velocity (${fmtDur(dur)} on the SCAT thrusters).`,
    true,
  );
  track(
    "MCC-1b",
    tW1,
    tArr,
    "transfer to L2",
    0.02,
    (mag, dur) =>
      `A fine trim 2.5 days out, after the first correction has been measured, aims the telescope at its arrival point: Δv ${mag.toFixed(1)} m/s.`,
  );
  progress("L2 insertion…");
  track(
    "MCC-2 — L2 insertion",
    tArr,
    tArr + 2 * skD,
    "transfer to L2",
    0.02,
    (mag, dur) =>
      `Arrival: the telescope is ${(vnorm(vsub(refAt(tArr).r, l2Point(tArr))) / 1000).toFixed(0)} thousand km from L2 and already on the approach to its halo orbit; this burn of ${mag.toFixed(1)} m/s is all the insertion it needs. From here it circles L2 once every ${(T / D).toFixed(0)} days without ever being at L2, the Sun, the Earth and the Moon always behind its sunshield.`,
  );
  M.phase(fb.tIgn, tArr, "Transfer to L2", "#9ab8ff");
  progress("Station-keeping…");
  const tEnd = tArr + (cfg.halo.circuits ?? 1.05) * T;
  let k = 1;
  for (let tN = tArr + skD; tN < tEnd; tN += skD, k++) {
    const dv = track(
      `Station-keeping burn ${k}`,
      tN,
      Math.min(tN + 2 * skD, tEnd + 10 * D),
      "halo orbit about L2",
      0.01,
      (mag, dur) =>
        `${EXPLAIN.mcc} An orbit about L2 is unstable — left alone the telescope would drift off it within months — so every three weeks a small burn puts it back on course: ${mag.toFixed(2)} m/s.`,
      false,
      0.05,
    );
    if (dv > 0) dvSK.push(dv);
    else k--;
  }
  coast(tEnd + (cfg.coastAfter ?? 10) * D, "halo orbit about L2");
  M.phase(tArr, t, "Halo orbit about L2", "#c3a2ff");
  M.ev(
    tEnd,
    "ship",
    "One circuit of the halo",
    `${(T / D).toFixed(0)} days after insertion the telescope has gone once round L2. It will keep this orbit the same way for its twenty years of observing, its sunshield always between the Sun, the Earth, the Moon and the mirror.`,
    "info",
  );
  M.summary.halo = {
    az: azKm,
    periodDays: T / D,
    dvTotal: dvSK.reduce((a, b) => a + b, 0),
    dvSK,
  };
  M.finalize();
  return M;
}

// ---- leo.js
// ============================================================================
// leo.js — Earth-orbit missions flown by the Space Shuttle: ascent to main engine cutoff, External Tank
// separation, OMS burns, payload deploy or rendezvous and docking with the ISS, deorbit, winged entry,
// terminal area energy management (TAEM) around the heading alignment cone, and the runway landing.
// Orbits are integrated with Earth's J2 oblateness (the plane of a low orbit swings several degrees a day).
// ============================================================================

// index-inline-1 19 — cfg
// Lines 5967-7392 of readable/index-inline-1.pretty.js (statement-aligned).
function planLunar(cfg, progress = () => {}) {
  const M = new Mission(cfg);
  const L = LAUNCHERS[cfg.launcher],
    SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0,
    H = 3600;
  const crew = cfg.crew || 0;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const scMass0 = scTotalMass(SC);
  const tofOut = (cfg.tof || 72) * H;
  // ---------------- launch window / plane ----------------
  progress("Solving launch window & ascent…");
  let normal, launchInfo;
  const tliGuess = t0 + (cfg.tliMET ?? (cfg.heo ? 25.6 : 2.7)) * H;
  if (cfg.launchAz != null) {
    const pa = planeNormalFromAzRel("earth", S.lat, S.lon, t0, cfg.launchAz);
    normal = pa.n;
    launchInfo = `Flight azimuth ${cfg.launchAz.toFixed(2)}° (historical, Earth-fixed) → inertial ${pa.azI.toFixed(2)}°, parking-orbit inclination ${(Math.acos(clamp(eclToEq(normal)[2], -1, 1)) * RAD).toFixed(2)}°.`;
  } else {
    const pl = planeThroughSite(
      "earth",
      S.lat,
      S.lon,
      t0,
      vunit(moonGeo(tliGuess + tofOut).r),
    );
    normal = pl.n;
    launchInfo = `Launch azimuth ${pl.az.toFixed(1)}° chosen so the parking orbit plane contains the Moon’s position at arrival.`;
  }
  const LP = launchPhase(M, cfg, L, scMass0, normal, { ship });
  M.notes.push(launchInfo);
  if (!LP.ok) {
    M.warnings.push("The launch vehicle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  P.attachUpper(asc.upper, asc.upperProp);
  const upperMass = () =>
    P.upper.attached ? P.upper.dry + P.upper.propLeft : 0;
  let t = asc.t,
    y = [...asc.r, ...asc.v, asc.m];
  ship.setConfig(t, "stack", {
    key: "stack",
    parts: ["upper", "sc-stowed"],
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    sc: SC.model,
  });
  // ---------------- Earth orbit phase (optional HEO raise) ----------------
  const coast = (tEnd, phase, objRef = ship, extra) => {
    const res = cisInt(t, y, tEnd, {});
    objRef.add(resToSeg(res, phase, extra));
    const yl = res.y[res.y.length - 1];
    t = res.t[res.t.length - 1];
    y = Array.from(yl);
    return res;
  };
  if (cfg.heo) {
    // apogee raise at a perigee by the upper stage (Artemis II style)
    progress("Earth orbit: apogee raise to high Earth orbit…");
    const res = cisInt(t, y, t + 5 * H, {});
    const resP = cisIntDelayed(t, y, t + 1200, t + 4 * H, [evPerigee(20000)]);
    const tPer0 = resP.stopEvent ? resP.stopEvent.t : t + 1.8 * H;
    const per0 = resState(res, tPer0),
      pHat0 = vunit([per0[0], per0[1], per0[2]]);
    const h0 = vunit(vcross(y.slice(0, 3), y.slice(3, 6)));
    const raTarget = R_E + cfg.heo.ha;
    // 2-body design: rotate the high-orbit perigee so a TLI at the following perigee meets the Moon after `tof`
    const rpPark = (() => {
      const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
      return el;
    })();
    const rAt = (phi) => rpPark.p / (1 + rpPark.e * Math.cos(phi));
    const nPark = (2 * Math.PI) / rpPark.period;
    const Fdir = (x) => {
      const phi = x[0],
        dv = x[1],
        rp = rAt(phi),
        aH = (rp + raTarget) / 2,
        PH = 2 * Math.PI * Math.sqrt((aH * aH * aH) / MU_E);
      const pdir = vrot(pHat0, h0, phi),
        tTLI = tPer0 + phi / nPark + PH;
      const vp = Math.sqrt(MU_E * (2 / rp - 1 / aH)) + dv;
      const kp = kepProp(
        vscale(pdir, rp),
        vscale(vunit(vcross(h0, pdir)), vp),
        tofOut,
        MU_E,
      );
      const m = moonGeo(tTLI + tofOut).r,
        mp = vsub(m, vscale(h0, vdot(m, h0)));
      return [
        (vnorm(kp.r) - vnorm(mp)) / 1000,
        (Math.atan2(vdot(vcross(kp.r, mp), h0), vdot(kp.r, mp)) * vnorm(mp)) /
          1000,
      ];
    };
    const sd = newtonSolve(Fdir, [0, 0.4], {
      h: 1e-6,
      tol: 1e-4,
      maxIt: 40,
      maxStep: 0.3,
    });
    let phiB = clamp(sd.x[0], -1.2, 1.2);
    if (!sd.ok) phiB = 0;
    const eng = P.engineOf("upper");
    const startState = (tt) => Array.from(resState(res, tt));
    const runARB = (phiCmd) => {
      const tPer = tPer0 + phiCmd / nPark,
        peri = resState(res, tPer);
      const rp = Math.hypot(peri[0], peri[1], peri[2]);
      const epsT = -MU_E / (rp + raTarget);
      const vNew = vscale(
        vunit(vcross(h0, vunit([peri[0], peri[1], peri[2]]))),
        Math.sqrt(MU_E * (2 / rp - 2 / (rp + raTarget))),
      );
      const dvVec = vsub(vNew, [peri[3], peri[4], peri[5]]);
      const law = (tI, y0) =>
        localDirLaw(
          [peri[0], peri[1], peri[2]],
          [peri[3], peri[4], peri[5]],
          vunit(dvVec),
        );
      const fb = finiteBurn({
        tCenter: tPer,
        startState,
        engine: eng,
        dirLaw: law,
        D0:
          propForDv(peri[6], vnorm(dvVec), eng.isp) /
          (eng.thrust / (eng.isp * G0)),
        metric: (ye) => energyGeo(ye) - epsT,
        maxProp: P.upper.propLeft,
      });
      const ye = fb.res.y[fb.res.y.length - 1],
        el = rv2coe([ye[0], ye[1], ye[2]], [ye[3], ye[4], ye[5]], MU_E);
      const ehat = vunit(el.evec),
        phiAch = Math.atan2(vdot(vcross(pHat0, ehat), h0), vdot(pHat0, ehat));
      return { fb, phiAch };
    };
    let phiCmd = phiB,
      arb = runARB(phiCmd);
    for (let k = 0; k < 3 && Math.abs(arb.phiAch - phiB) > 0.2 * DEG; k++) {
      phiCmd += wrapPi(phiB - arb.phiAch);
      arb = runARB(phiCmd);
    }
    if (globalThis.DEBUG)
      console.log(
        "ARB phi target",
        phiB * RAD,
        "achieved",
        arb.phiAch * RAD,
        "cmd",
        phiCmd * RAD,
      );
    const fb = arb.fb;
    // add coast to ignition
    const resC = cisInt(t, y, fb.tIgn, {});
    ship.add(resToSeg(resC, "Earth orbit"));
    ship.add(
      resToSeg(fb.res, "apogee raise burn", { stage: P.upper.id }, fb.burn),
    );
    const used = fb.res.y[0][6] - fb.res.y[fb.res.y.length - 1][6];
    P.upper.propLeft -= used;
    const ye = fb.res.y[fb.res.y.length - 1];
    M.burn({
      name: cfg.heo.name || "Apogee raise (upper stage)",
      t: fb.tIgn,
      dur: fb.D,
      dv: dvForProp(fb.res.y[0][6], used, eng.isp) * 1000,
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
      cfg.heo.name || "Apogee raise burn",
      `${P.upper.name} burns ${fmtDur(fb.D)} near perigee, raising apogee to ${Math.round(cfg.heo.ha).toLocaleString()} km — a high Earth orbit for checkout before committing to the Moon.`,
      "burn",
    );
    t = fb.res.tEnd;
    y = Array.from(ye);
    // separation of spacecraft from upper stage
    const tSep = t + (cfg.heo.sepAfter || 1.4) * H;
    coast(tSep, "high Earth orbit");
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
    });
    const resU = cisInt(
      t,
      [
        ...y.slice(0, 3),
        ...vadd(y.slice(3, 6), vscale(vunit(y.slice(3, 6)), -0.0005)),
        P.upper.dry + P.upper.propLeft,
      ],
      t + 30 * H,
      {},
    );
    up.add(resToSeg(resU, "spent stage"));
    y[6] -= upperMass();
    P.upper.attached = false;
    ship.setConfig(t, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
    M.ev(
      t,
      "ship",
      cfg.heo.sepName || "Spacecraft separation",
      cfg.heo.sepDesc || "The spacecraft separates from the spent upper stage.",
      "sep",
    );
    if (cfg.heo.proxOps)
      M.ev(
        t + 0.2 * H,
        "ship",
        "Proximity operations demo",
        "The crew manually flies the spacecraft around the spent upper stage, using it as a docking target to test handling qualities.",
        "info",
      );
  }
  // ---------------- TLI ----------------
  progress("Targeting trans-lunar injection…");
  const tliEngineId = cfg.tliBy === "sc" ? SC.prop.orbiter : "upper";
  const eng = P.engineOf(tliEngineId);
  // parking orbit propagation (long enough)
  const parkRes = cisInt(t, y, t + 30 * H, {});
  const parkNormal = vunit(vcross(y.slice(0, 3), y.slice(3, 6)));
  let tIgn;
  const mdotT = eng.thrust / (eng.isp * G0);
  const s0park = resState(parkRes, t);
  // TLI design in the two-body model: tangential impulse at t1 with magnitude dv; craft must reach the Moon
  // (radius + small far-side aim offset, and in-plane angle) at tArr.  Then MCC fixes n-body / out-of-plane errors.
  const aimOff = cfg.flybySide === "near" ? -1500 : 2500;
  const tliF = (t1, dv, tArr) => {
    const s = resState(parkRes, t1),
      r = [s[0], s[1], s[2]],
      v = [s[3], s[4], s[5]];
    const v1 = vadd(v, vscale(vunit(v), dv));
    const kp = kepProp(r, v1, tArr - t1, MU_E);
    const h = vunit(vcross(r, v1));
    let m = moonGeo(tArr).r;
    const mp = vsub(m, vscale(h, vdot(m, h)));
    const ang = Math.atan2(vdot(vcross(kp.r, mp), h), vdot(kp.r, mp));
    return [
      (vnorm(kp.r) - (vnorm(mp) + aimOff)) / 1000,
      (ang * vnorm(mp)) / 1000,
    ];
  };
  let t1, dv1, tA;
  const dvHoh = (s) => {
    const r = Math.hypot(s[0], s[1], s[2]);
    return (
      Math.sqrt(MU_E * (2 / r - 2 / (r + 384000))) -
      Math.hypot(s[3], s[4], s[5])
    );
  };
  if (cfg.tliMET != null || cfg.heo) {
    if (cfg.tliMET != null) tIgn = t0 + cfg.tliMET * H;
    else {
      const rp = cisIntDelayed(t, y, t + 3 * H, t + 30 * H, [evPerigee(30000)]);
      tIgn = (rp.stopEvent ? rp.stopEvent.t : t + 23 * H) - 175;
    }
    let D =
      propForDv(s0park[6], dvHoh(resState(parkRes, tIgn)), eng.isp) / mdotT;
    if (globalThis.DEBUG) {
      const sp = resState(parkRes, tIgn);
      const pr = [sp[0], sp[1], sp[2]];
      const hh = vunit(vcross(pr, [sp[3], sp[4], sp[5]]));
      for (const dh of [70, 90, 100, 110, 120]) {
        const mm = moonGeo(tIgn + dh * H).r;
        const mp = vsub(mm, vscale(hh, vdot(mm, hh)));
        console.log(
          "HEO geom: Moon at TLI+" + dh + "h: in-plane angle",
          (Math.atan2(vdot(vcross(pr, mp), hh), vdot(pr, mp)) * RAD).toFixed(1),
          "out-of-plane deg",
          (Math.asin(vdot(vunit(mm), hh)) * RAD).toFixed(2),
        );
      }
      console.log(
        "TLI ign",
        fmtUTC(tIgn),
        "perigee alt",
        vnorm(pr) - R_E,
        "dvHoh",
        dvHoh(sp),
      );
    }
    dv1 = dvHoh(resState(parkRes, tIgn + D / 2));
    tA = tIgn + D / 2 + tofOut;
    for (let k = 0; k < 3; k++) {
      t1 = tIgn + D / 2;
      const sol = newtonSolve((x) => tliF(t1, x[0], x[1]), [dv1, tA], {
        h: 1e-4,
        tol: 1e-6,
        maxIt: 30,
      });
      dv1 = sol.x[0];
      tA = sol.x[1];
      D = propForDv(s0park[6], dv1, eng.isp) / mdotT;
    }
  } else {
    // free TLI epoch: craft must depart roughly opposite the Moon's arrival position
    const P0 =
      2 * Math.PI * Math.sqrt(Math.pow(vnorm(y.slice(0, 3)), 3) / MU_E);
    const mArr = vunit(moonGeo(t + 1.5 * H + tofOut).r);
    let tBest = t + 0.9 * H,
      best = -2;
    for (let tt = t + 0.9 * H; tt < t + 0.9 * H + P0; tt += 30) {
      const s = resState(parkRes, tt);
      const c = -vdot(vunit([s[0], s[1], s[2]]), mArr);
      if (c > best) {
        best = c;
        tBest = tt;
      }
    }
    t1 = tBest - 0.035 * P0;
    dv1 = dvHoh(resState(parkRes, t1));
    tA = t1 + tofOut;
    const sol = newtonSolve(
      (x) => tliF(x[0], x[1], t1 + tofOut + (x[0] - t1) * 0),
      [t1, dv1],
      { h: 1e-4, tol: 1e-6, maxIt: 30 },
    );
    // keep TOF fixed relative to t1: solve (t1, dv) with tArr = t1 + tof
    const sol2 = newtonSolve(
      (x) => tliF(x[0], x[1], x[0] + tofOut),
      [sol.x[0], sol.x[1]],
      { h: 1e-3, tol: 1e-6, maxIt: 30 },
    );
    t1 = sol2.x[0];
    dv1 = sol2.x[1];
    tA = t1 + tofOut;
    const D = propForDv(resState(parkRes, t1)[6], dv1, eng.isp) / mdotT;
    tIgn = t1 - D / 2;
  }
  let tArrA = null;
  // --- stage A (n-body, in-plane): tangential burn; adjust Δv and burn epoch to minimise lunar miss distance
  {
    const tTarget = (tt) => tt + tofOut;
    const rpAim =
      R_MOON + (cfg.hybrid ? cfg.hybrid.perilune : cfg.perilune || 110);
    const missAt = (tt, dv) => {
      const s = resState(parkRes, tt);
      const y0 = Array.from(s);
      const vv = vunit([y0[3], y0[4], y0[5]]);
      y0[3] += vv[0] * dv;
      y0[4] += vv[1] * dv;
      y0[5] += vv[2] * dv;
      const win = [tt + 0.55 * tofOut, tt + 1.6 * tofOut];
      const r = cisIntDelayed(
        tt,
        y0,
        win[0],
        win[1] + 3600,
        [evPerilune(450000)],
        { rtol: 1e-8, atol: 1e-5, hmax: 3600 },
      );
      if (!r.stopEvent) return 1e6;
      const sl = seleno(r.stopEvent.t, r.stopEvent.y);
      const tw = cfg.tliMET != null ? Math.abs(tt - t1) / 60 : 0;
      const dtH = Math.abs(r.stopEvent.t - tTarget(tt)) / 3600;
      missAt.tp = r.stopEvent.t;
      return (
        Math.abs(vnorm(sl.r) - rpAim) + tw * 50 + Math.max(0, dtH - 3) * 400
      );
    };
    const t1base = t1,
      dvBase = dv1,
      tSpan = cfg.heo ? 4 : 9;
    if (globalThis.DEBUG && cfg.heo) {
      for (const dvx of [0.36, 0.44]) {
        const s0 = resState(parkRes, t1base);
        const y0 = Array.from(s0);
        const vv = vunit([y0[3], y0[4], y0[5]]);
        y0[3] += vv[0] * dvx;
        y0[4] += vv[1] * dvx;
        y0[5] += vv[2] * dvx;
        const el = rv2coe([y0[0], y0[1], y0[2]], [y0[3], y0[4], y0[5]], MU_E);
        console.log(
          "dv",
          dvx,
          "rp",
          el.rp.toFixed(0),
          "ra",
          el.ra.toFixed(0),
          "flight path deg",
          fpaDeg([s0[0], s0[1], s0[2]], [s0[3], s0[4], s0[5]]).toFixed(2),
          "|r|",
          Math.hypot(s0[0], s0[1], s0[2]).toFixed(0),
        );
        const rr = cisInt(t1base, y0, t1base + 150 * H, {});
        for (const hh of [24, 48, 72, 90, 100, 120]) {
          const st = resState(rr, t1base + hh * H);
          const m = moonGeo(t1base + hh * H).r;
          console.log(
            "   +" + hh + "h dEarth",
            Math.round(Math.hypot(st[0], st[1], st[2])),
            "dMoon",
            Math.round(vnorm(vsub([st[0], st[1], st[2]], m))),
            "moonDist",
            Math.round(vnorm(m)),
          );
        }
      }
    } // ±400 s at a HEO perigee, ±900 s otherwise
    // 1-D scan on Δv first (robust starting point), then bounded simplex on (Δv, epoch)
    {
      let best = { f: Infinity, dv: dv1 };
      for (let dv = dvBase - 0.08; dv <= dvBase + 0.16; dv += 0.01) {
        const f = missAt(t1base, dv);
        if (globalThis.DEBUG)
          console.log(
            "scanA",
            dv.toFixed(3),
            Math.round(f),
            ((missAt.tp - t1base) / 3600).toFixed(1),
          );
        if (f < best.f) best = { f, dv };
      }
      dv1 = best.dv;
    }
    const bounded = (x) =>
      Math.abs(x[1]) > tSpan || Math.abs(x[0] - dvBase) > 0.25
        ? 1e7
        : missAt(t1base + x[1] * 100, x[0]);
    const nm = nelderMead(bounded, [dv1, 0], [0.01, 2], {
      maxIt: 90,
      tol: 1e-7,
    });
    dv1 = nm.x[0];
    t1 = t1base + nm.x[1] * 100;
    missAt(t1, dv1);
    tArrA = missAt.tp;
    if (globalThis.DEBUG)
      console.log(
        "stage A",
        nm.f,
        dv1,
        t1 - t1base,
        "arrival GET h",
        (tArrA - t0) / 3600,
      );
    const D = propForDv(resState(parkRes, t1)[6], dv1, eng.isp) / mdotT;
    tIgn = t1 - D / 2;
  }
  const sT1 = resState(parkRes, t1);
  const imp = { r: [sT1[0], sT1[1], sT1[2]], v: [sT1[3], sT1[4], sT1[5]] };
  // --- n-body refinement of the impulsive TLI (3-D B-plane targeting): x = Δv components in (v, r⊥, h) frame
  const rpMoon0 =
    R_MOON + (cfg.hybrid ? cfg.hybrid.perilune : cfg.perilune || 110);
  const fr = (() => {
    const e1 = vunit(imp.v);
    let e2 = vunit(vsub(vunit(imp.r), vscale(e1, vdot(vunit(imp.r), e1))));
    return [e1, e2, vcross(e1, e2)];
  })();
  const xToDv = (x) =>
    vadd(vadd(vscale(fr[0], x[0]), vscale(fr[1], x[1])), vscale(fr[2], x[2]));
  const isFR = cfg.profile === "lunar-flyby" && !cfg.hybrid;
  const tWinT = tArrA ? [tArrA - 40 * H, tArrA + 40 * H] : null;
  const modeT = {
    type: "bplane",
    rp: rpMoon0,
    hStar: hStarFor(cfg, t0),
    fallback: [1e3, 1e3],
    tWin: tWinT,
    inPlaneOnly: isFR ? null : vunit(vcross(imp.r, imp.v)),
    tPeri: t1 + tofOut,
    timeWeight: 0.6,
  };
  const FT0 = makeArrivalF(t1, Array.from(sT1), modeT);
  let solTLI = newtonSolve((x) => FT0(xToDv(x)), [dv1, 0, 0], {
    h: 1e-6,
    tol: 1e-3,
    maxIt: 25,
    maxStep: 0.15,
  });
  let FT = FT0;
  if (isFR) {
    // second stage: true free-return conditions (perilune radius, return perigee) + arrival time
    const modeF = {
      type: "freeReturn",
      rp: rpMoon0,
      rvp: rvpFor(cfg.entry?.fpa ?? -6.5),
      fallback: [1e3, 1e3, 1e3],
      tWin: tWinT,
      tPeri: t1 + tofOut,
      timeWeight: 0.3,
    };
    const FTf = makeArrivalF(t1, Array.from(sT1), modeF);
    const s2 = newtonSolve((x) => FTf(xToDv(x)), solTLI.x, {
      h: 1e-6,
      tol: 1e-3,
      maxIt: 25,
      maxStep: 0.05,
    });
    if (globalThis.DEBUG)
      console.log(
        "TLI free-return stage",
        s2.norm,
        s2.hist.map((v) => +v.toFixed(3)),
      );
    if (s2.norm < 5) {
      solTLI = s2;
      FT = FTf;
    }
  }
  if (globalThis.DEBUG) {
    const d = FT(xToDv(solTLI.x), true);
    console.log(
      "TLI nbody",
      solTLI.norm,
      solTLI.hist.map((v) => +v.toFixed(3)),
      solTLI.x,
      (d.tp - t0) / 3600,
      d.rp,
    );
  }
  if (!solTLI.ok)
    M.notes.push(
      "TLI targeting converged approximately; mid-course corrections absorb the residual.",
    );
  dv1 = vnorm(xToDv(solTLI.x));
  imp.L1 = { v1: vadd(imp.v, xToDv(solTLI.x)) };
  const dvImp = vsub(imp.L1.v1, imp.v);
  const Dest = propForDv(sT1[6], dv1, eng.isp) / mdotT;
  const tc = t1;
  const epsTLI = vdot(imp.L1.v1, imp.L1.v1) / 2 - MU_E / vnorm(imp.r);
  const tank = P.tankOf(tliEngineId);
  const fbT = finiteBurn({
    tCenter: tc,
    fixedStart: tIgn,
    startState: (tt) => Array.from(resState(parkRes, tt)),
    engine: eng,
    dirLaw: (tI, y0) => localDirLaw(imp.r, imp.v, vunit(dvImp)),
    D0: Dest,
    metric: (ye) => energyGeo(ye) - epsTLI,
    maxProp: tank.propLeft,
  });
  {
    const resC = cisInt(t, y, tIgn, {});
    ship.add(resToSeg(resC, cfg.heo ? "high Earth orbit" : "parking orbit"));
  }
  ship.add(
    resToSeg(
      fbT.res,
      "trans-lunar injection",
      { stage: tliEngineId === "upper" ? P.upper.id : tliEngineId },
      fbT.burn,
    ),
  );
  const usedT = fbT.res.y[0][6] - fbT.res.y[fbT.res.y.length - 1][6];
  tank.propLeft -= usedT;
  const dvT = dvForProp(fbT.res.y[0][6], usedT, eng.isp) * 1000;
  M.burn({
    name: "TLI — trans-lunar injection",
    t: tIgn,
    dur: fbT.D,
    dv: dvT,
    engine: eng.name,
    isp: eng.isp,
    prop: usedT,
    m0: fbT.res.y[0][6],
    obj: "ship",
    propType: eng.prop,
  });
  M.ev(
    tIgn,
    "ship",
    "Trans-lunar injection",
    `${EXPLAIN.tli} Burn ${fmtDur(fbT.D)}, Δv ≈ ${dvT.toFixed(0)} m/s using ${(usedT / 1000).toFixed(1)} t of propellant.`,
    "burn",
  );
  M.phase(asc.t, tIgn, cfg.heo ? "Earth orbits" : "Parking orbit", "#4ea8de");
  t = fbT.res.tEnd;
  y = Array.from(fbT.res.y[fbT.res.y.length - 1]);
  if (fbT.short) {
    M.warnings.push(
      `Not enough propellant for the full trans-lunar injection (Δv achieved ${dvT.toFixed(0)} m/s) — the vehicle stays in an elliptical Earth orbit. Choose a more capable launch vehicle or a lighter spacecraft.`,
    );
    M.failed = "tli";
    const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
    const tEndF =
      t + Math.min(Math.max(el.period || 6 * H, 6 * H) * 2, 10 * 24 * H);
    coast(tEndF, "stranded in Earth orbit");
    M.phase(tIgn, tEndF, "Stranded in Earth orbit", "#ff5d5d");
    M.ev(
      tIgn + fbT.D,
      "ship",
      "TLI shortfall",
      `The upper stage ran dry before reaching escape energy. Apogee ${Math.round(el.ra - R_E).toLocaleString()} km — the Moon (≈384,000 km) is out of reach.`,
      "fail",
    );
    M.finalize();
    return M;
  }
  if (globalThis.DEBUG) {
    const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
    console.log("post-TLI", {
      D: fbT.D,
      short: fbT.short,
      err: fbT.err,
      rp: el.rp,
      ra: el.ra,
      e: el.e,
      dvImp: vnorm(dvImp),
      tIgn: fmtUTC(tIgn),
      tc: fmtUTC(tc),
    });
    const elImp = rv2coe(imp.r, imp.L1.v1, MU_E);
    console.log("impulsive", { rp: elImp.rp, ra: elImp.ra, i: elImp.i * RAD });
    const rr = cisInt(t, y, t + 5 * 86400, {});
    let mn = 1e12,
      tm = 0;
    for (let i = 0; i < rr.t.length; i++) {
      const d = vnorm(vsub(rr.y[i].slice(0, 3), moonGeo(rr.t[i]).r));
      if (d < mn) {
        mn = d;
        tm = rr.t[i];
      }
    }
    console.log("closest Moon", mn, fmtUTC(tm));
    const kp = kepProp(imp.r, imp.L1.v1, tofOut, MU_E);
    console.log(
      "kepler arrival miss vs moon",
      vnorm(vsub(kp.r, moonGeo(tc + tofOut).r)),
    );
  }
  // ---------------- upper-stage separation (TD&E) ----------------
  if (tliEngineId === "upper" && P.upper.attached) {
    const tSep = t + (cfg.sepAfterTLI ?? 0.5) * H;
    coast(tSep, "translunar coast");
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
    const mUp = upperMass() + P.massOf(SC.adapter || []);
    const resU = cisInt(
      t,
      [
        ...y.slice(0, 3),
        ...vadd(y.slice(3, 6), vscale(vunit(y.slice(3, 6)), -0.004)),
        mUp,
      ],
      t + (cfg.upperDays || 5) * 24 * H,
      { events: [evLunarImpact()] },
    );
    up.add(resToSeg(resU, "spent stage"));
    y[6] -= mUp;
    P.upper.attached = false;
    for (const a of SC.adapter || []) P.mods[a].attached = false;
    ship.setConfig(t, "sc", {
      key: "sc",
      sc: SC.model,
      parts: SC.lander ? ["orbiter", "lander"] : ["orbiter"],
      deployT: t,
    }); // (a spacecraft that unfolds after it leaves the stage does so from deployT)
    M.ev(
      t,
      "ship",
      cfg.sepName || "Spacecraft separation",
      cfg.sepDesc ||
        "The spacecraft separates from the spent upper stage, which is sent onto a different trajectory.",
      "sep",
    );
  }
  // ---------------- outbound mid-course correction (targeting) ----------------
  progress("Mid-course correction: targeting the Moon…");
  const profile = cfg.profile;
  const rpMoonT = R_MOON + (cfg.perilune || 110);
  const site = cfg.landing;
  const capsuleId = SC.capsule;
  const entryCfg = cfg.entry || {};
  const capMass = () => P.massOf([capsuleId]);
  const ref = SC.capsule
    ? entryReference(
        SC.modules[capsuleId],
        11.0,
        entryCfg.fpa ?? -6.5,
        entryCfg.bank ?? 55,
        P.mods[capsuleId].dry,
      )
    : null;
  const tMcc =
    cfg.mccMET != null ? t0 + cfg.mccMET * H : t + (cfg.mccAfterTLI ?? 20) * H;
  coast(tMcc, "translunar coast");
  const tLandEst = site
    ? t0 + (cfg.landMET ?? (cfg.tliMET ?? 2.7) + (cfg.tof || 72) + 26) * H
    : 0;
  const siteDirAt = (tt) =>
    vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt));
  const rvpT = (() => {
    // vacuum perigee radius for target entry FPA (approx, v_EI 11 km/s)
    const r = R_E + EI_ALT,
      v = 11.0,
      g = (entryCfg.fpa ?? -6.5) * DEG;
    const h = r * v * Math.cos(g),
      eps = (v * v) / 2 - MU_E / r;
    const e = Math.sqrt(1 + (2 * eps * h * h) / (MU_E * MU_E));
    return (h * h) / MU_E / (1 + e);
  })();
  const mccRun = (dv, full) => {
    const y0 = [...y];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    const r1 = cisInt(tMcc, y0, tMcc + 9 * 24 * H, {
      events: [evPerilune()],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    if (!r1.stopEvent) return { fail: true };
    const ye = r1.stopEvent.y,
      tp = r1.stopEvent.t,
      sel = seleno(tp, ye);
    const out = {
      tp,
      rp: vnorm(sel.r),
      h: vunit(vcross(sel.r, sel.v)),
      ye,
      res1: r1,
    };
    if (full) {
      const r2 = cisInt(tp, ye, tp + 8 * 24 * H, {
        events: [evPerigee(), evEI()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      const yl = r2.y[r2.y.length - 1];
      out.rvp = vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]);
      out.res2 = r2;
    }
    return out;
  };
  let modeM;
  if (profile === "lunar-flyby" && !cfg.hybrid)
    modeM = {
      type: "freeReturn",
      rp: rpMoonT,
      rvp: rvpT,
      fallback: [1e3, 1e3],
    };
  else
    modeM = {
      type: "bplane",
      rp: cfg.hybrid ? R_MOON + cfg.hybrid.perilune : rpMoonT,
      hStar: hStarFor(cfg, t0),
      fallback: [1e3, 1e3],
    };
  if (tArrA) modeM.tWin = [tArrA - 30 * H, tArrA + 30 * H];
  const FM = makeArrivalF(tMcc, y, modeM);
  const F = (dv) => FM(dv);
  const sol = newtonSolve(F, [0, 0, 0], {
    h: 1e-6,
    tol: 1e-3,
    maxIt: 20,
    maxStep: 0.25,
  });
  const dvM = sol.x,
    dvMag = vnorm(dvM) * 1000;
  if (globalThis.DEBUG) {
    const o = FM(dvM, true);
    console.log(
      "MCC sol",
      sol.norm,
      sol.hist.map((v) => +v.toFixed(4)),
      dvM.map((v) => v * 1000),
      o.fail ? "FAIL" : { rp: o.rp, tp: fmtUTC(o.tp) },
    );
  }
  if (!sol.ok)
    M.warnings.push(
      `Outbound targeting converged only approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  const mccEngId = SC.prop.orbiter;
  const pm = P.burn(mccEngId, y[6], dvMag / 1000);
  M.burn({
    name: "MCC — outbound mid-course correction",
    t: tMcc,
    dur: pm.dur,
    dv: dvMag,
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
    "Mid-course correction",
    `${EXPLAIN.mcc} Δv ${dvMag.toFixed(1)} m/s (${fmtDur(pm.dur)} burn).`,
    "burn",
    { dv: dvMag },
  );
  y[3] += dvM[0];
  y[4] += dvM[1];
  y[5] += dvM[2];
  y[6] -= pm.prop;
  // ---------------- Apollo-13 style mid-course re-targeting events ----------------
  const scripted = cfg.scripted || [];
  // ---------------- integrate to perilune ----------------
  progress("Coasting to the Moon…");
  if (profile === "lunar-flyby")
    return finishFlyby(
      M,
      cfg,
      SC,
      P,
      ship,
      t0,
      tMcc,
      y,
      rpMoonT,
      rvpT,
      ref,
      scripted,
      progress,
    );
  let res = cisInt(tMcc, y, tMcc + 9 * 24 * H, { events: [evPerilune()] });
  const tSOI = (() => {
    for (let i = 0; i < res.t.length; i++) {
      const m = moonGeo(res.t[i]).r;
      if (
        vnorm(vsub([res.y[i][0], res.y[i][1], res.y[i][2]], m)) <
        BODIES.moon.soi
      )
        return res.t[i];
    }
    return null;
  })();
  if (tSOI)
    M.ev(tSOI, "ship", "Lunar sphere of influence", EXPLAIN.soiMoon, "soi");
  if (!res.stopEvent) {
    ship.add(resToSeg(res, "translunar coast"));
    M.warnings.push(
      "The trajectory does not reach the Moon — targeting failed for these inputs.",
    );
    M.failed = "arrival";
    M.finalize();
    return M;
  }
  const tPeri = res.stopEvent.t;
  // ---------------- LOI-1 ----------------
  progress("Lunar orbit insertion…");
  const orbEngId = SC.prop.orbiter,
    orbEng = P.engineOf(orbEngId);
  const loi = cfg.loi || { apo: 314 };
  const raLOI = R_MOON + loi.apo;
  const peri = res.stopEvent.y,
    selP = seleno(tPeri, peri);
  const epsLOI = -MU_M / (vnorm(selP.r) + raLOI);
  const vpTarget = Math.sqrt(2 * (epsLOI + MU_M / vnorm(selP.r)));
  const dvLOIest = vnorm(selP.v) - vpTarget;
  const DLOI =
    propForDv(peri[6], dvLOIest, orbEng.isp) /
    (orbEng.thrust / (orbEng.isp * G0));
  const retro = (tI, y0) => (tt, rr, vv) => {
    const m = moonGeo(tt);
    return vunit(vsub(m.v, vv));
  };
  const fbL = finiteBurn({
    tCenter: tPeri,
    startState: (tt) => Array.from(resState(res, tt)),
    engine: orbEng,
    dirLaw: retro,
    D0: DLOI,
    metric: (ye, te) => energySel(te, ye) - epsLOI,
    maxProp: P.tankOf(orbEngId).propLeft,
  });
  {
    const resC = cisInt(tMcc, y, fbL.tIgn, {});
    ship.add(resToSeg(resC, "translunar coast"));
  }
  ship.add(
    resToSeg(fbL.res, "lunar orbit insertion", { stage: orbEngId }, fbL.burn),
  );
  const usedL = fbL.res.y[0][6] - fbL.res.y[fbL.res.y.length - 1][6];
  P.tankOf(orbEngId).propLeft -= usedL;
  const dvL = dvForProp(fbL.res.y[0][6], usedL, orbEng.isp) * 1000;
  M.burn({
    name: "LOI-1 — lunar orbit insertion",
    t: fbL.tIgn,
    dur: fbL.D,
    dv: dvL,
    engine: orbEng.name,
    isp: orbEng.isp,
    prop: usedL,
    m0: fbL.res.y[0][6],
    obj: "ship",
    propType: orbEng.prop,
  });
  M.ev(
    fbL.tIgn,
    "ship",
    "Lunar orbit insertion",
    `${EXPLAIN.loi} ${fmtDur(fbL.D)} burn, Δv ${dvL.toFixed(0)} m/s → orbit ${(cfg.perilune || 110).toFixed(0)} × ${loi.apo} km.`,
    "burn",
  );
  M.phase(tIgn, fbL.tIgn, "Translunar coast", "#9b5de5");
  // LOS behind the Moon
  M.ev(
    fbL.tIgn - 600,
    "ship",
    "Loss of signal",
    "The spacecraft passes behind the Moon — no radio contact with Earth until it re-emerges ~45 minutes later.",
    "los",
  );
  if (fbL.short) {
    M.warnings.push("Insufficient propellant for lunar orbit insertion.");
  }
  t = fbL.res.tEnd;
  y = Array.from(fbL.res.y[fbL.res.y.length - 1]);
  // ---------------- LOI-2 circularisation ----------------
  if (loi.circ) {
    const after = loi.circAfter ?? 4.4;
    let r2 = cisInt(t, y, t + after * H + 4 * H, {});
    let best = null;
    for (let i = 1; i < r2.t.length; i++) {
      const a = seleno(r2.t[i - 1], r2.y[i - 1]),
        b = seleno(r2.t[i], r2.y[i]);
      if (vdot(a.r, a.v) < 0 && vdot(b.r, b.v) >= 0) {
        const tc = r2.t[i];
        if (
          !best ||
          Math.abs(tc - (t + after * H)) < Math.abs(best - (t + after * H))
        )
          best = tc;
      }
    }
    const tc2 = best || t + after * H;
    const s2 = resState(r2, tc2),
      sel2 = seleno(tc2, s2),
      rp2 = vnorm(sel2.r);
    const ra2 = R_MOON + loi.circ;
    const eps2 = -MU_M / (rp2 + ra2);
    const dvE = vnorm(sel2.v) - Math.sqrt(2 * (eps2 + MU_M / rp2));
    const D2 = Math.max(
      2,
      propForDv(s2[6], Math.abs(dvE), orbEng.isp) /
        (orbEng.thrust / (orbEng.isp * G0)),
    );
    const fb2 = finiteBurn({
      tCenter: tc2,
      startState: (tt) => Array.from(resState(r2, tt)),
      engine: orbEng,
      dirLaw: retro,
      D0: D2,
      metric: (ye, te) => energySel(te, ye) - eps2,
      maxProp: P.tankOf(orbEngId).propLeft,
    });
    {
      const resC = cisInt(t, y, fb2.tIgn, {});
      ship.add(resToSeg(resC, "lunar orbit"));
    }
    ship.add(resToSeg(fb2.res, "LOI-2", { stage: orbEngId }, fb2.burn));
    const u2 = fb2.res.y[0][6] - fb2.res.y[fb2.res.y.length - 1][6];
    P.tankOf(orbEngId).propLeft -= u2;
    const d2 = dvForProp(fb2.res.y[0][6], u2, orbEng.isp) * 1000;
    M.burn({
      name: "LOI-2 — circularisation",
      t: fb2.tIgn,
      dur: fb2.D,
      dv: d2,
      engine: orbEng.name,
      isp: orbEng.isp,
      prop: u2,
      m0: fb2.res.y[0][6],
      obj: "ship",
      propType: orbEng.prop,
    });
    M.ev(
      fb2.tIgn,
      "ship",
      "LOI-2 circularisation",
      `A ${fmtDur(fb2.D)} burn trims the orbit to ≈${(cfg.perilune || 110).toFixed(0)} × ${loi.circ} km. Lunar orbital speed ≈ 1.6 km/s, period ≈ 2 hours.`,
      "burn",
    );
    t = fb2.res.tEnd;
    y = Array.from(fb2.res.y[fb2.res.y.length - 1]);
  }
  const tLOIend = t;
  // lunar orbit events (Earthrise etc.)
  for (const e of scripted)
    if (e.when === "lunarOrbit")
      M.ev(t0 + e.met * H, "ship", e.name, e.desc, e.kind || "info");
  // ---------------- landing ----------------
  let tDepart;
  if (profile === "lunar-landing" || profile === "lunar-landing-oneway") {
    const ok = doLanding(
      M,
      cfg,
      SC,
      P,
      ship,
      t0,
      () => ({ t, y }),
      (nt, ny) => {
        t = nt;
        y = ny;
      },
      progress,
    );
    if (!ok) {
      M.finalize();
      return M;
    }
    if (profile === "lunar-landing-oneway") {
      M.finalize();
      return M;
    }
  }
  // ---------------- lunar orbit stay → TEI ----------------
  progress("Trans-Earth injection targeting…");
  const tTEInom =
    cfg.teiMET != null ? t0 + cfg.teiMET * H : t + (cfg.orbitStay ?? 20) * H;
  const tReturn = (cfg.returnTof ?? 62) * H;
  const splash = cfg.splash;
  const tEntryDur = ref ? ref.dur : 800;
  const thetaRange = ref ? ref.range : 0.35;
  const siteE = (tt) =>
    vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
  // orbit propagation through TEI window
  const orbRes = cisInt(t, y, tTEInom + 3 * H, {});
  const per =
    2 * Math.PI * Math.sqrt(Math.pow(vnorm(seleno(t, y).r), 3) / MU_M);
  const teiTrial = (tb, dv, full) => {
    const s = resState(orbRes, tb),
      sel = seleno(tb, s);
    const vdir = vunit(sel.v);
    const y0 = Array.from(s);
    y0[3] += vdir[0] * dv[0] + dv[1];
    y0[4] += vdir[1] * dv[0] + dv[2];
    y0[5] += vdir[2] * dv[0] + dv[3];
    const r = cisInt(tb, y0, tb + 6 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    const yl = r.y[r.y.length - 1];
    return {
      tEnd: r.tEnd,
      y: yl,
      ei: r.stopEvent && r.stopEvent.name === "EI",
      rvp: vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]),
      res: r,
    };
  };
  // --- TEI targeting: (1) epoch that points the return at Earth, (2) Δv magnitude giving the right
  // landing longitude (Earth rotation), (3) Newton on [dv_t, dv_r, dv_n, epoch] for [γ_EI, cross-range, along-track]
  const dv0 = (() => {
    const s = resState(orbRes, tTEInom),
      sel = seleno(tTEInom, s);
    const rr = vnorm(sel.r);
    return Math.sqrt(0.82 + (2 * MU_M) / rr) - vnorm(sel.v);
  })();
  const kRefTEI = moonOrbitNormal(tTEInom);
  const hTgtTEI = Math.sqrt(MU_E * rvpT * 1.98);
  const evalTEI = (tb, x) => {
    // x = [dv_t, dv_r, dv_n] in selenocentric local frame
    const s = resState(orbRes, tb),
      sel = seleno(tb, s);
    const e1 = vunit(sel.v);
    const e2 = vunit(vsub(vunit(sel.r), vscale(e1, vdot(vunit(sel.r), e1))));
    const e3 = vcross(e1, e2);
    const dvv = vadd(
      vadd(vscale(e1, x[0]), vscale(e2, x[1])),
      vscale(e3, x[2]),
    );
    const y0 = Array.from(s);
    y0[3] += dvv[0];
    y0[4] += dvv[1];
    y0[5] += dvv[2];
    const r = cisInt(tb, y0, tb + 6 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    const yl = r.y[r.y.length - 1],
      rr = [yl[0], yl[1], yl[2]],
      vv = [yl[3], yl[4], yl[5]];
    const ei = !!(r.stopEvent && r.stopEvent.name === "EI");
    const out = {
      ei,
      tEnd: r.tEnd,
      rvp: vacPerigee(rr, vv),
      dvv,
      rEI: rr,
      vEI: vv,
      hk:
        (Math.sign(vdot(vcross(rr, vv), kRefTEI)) || 1) * vnorm(vcross(rr, vv)),
    };
    if (ei) {
      const tl = r.tEnd + tEntryDur,
        sd = siteE(tl),
        h = vunit(vcross(rr, vv));
      out.fpa = fpaDeg(rr, vv);
      out.cross = Math.asin(clamp(vdot(h, sd), -1, 1)) * RAD;
      out.along =
        (Math.atan2(vdot(vcross(vunit(rr), sd), h), vdot(vunit(rr), sd)) -
          thetaRange) *
        RAD;
    }
    return out;
  };
  // geographic landing error helper: landing point = EI point carried downrange by the entry range
  const geoErr = (o) => {
    // returns {cross, along} in degrees using RA/Dec of the landing point
    const tl = o.tEnd + tEntryDur;
    const L = vrot(vunit(o.rEI), vunit(vcross(o.rEI, o.vEI)), thetaRange);
    const Le = eclToEq(L),
      dec = Math.asin(clamp(Le[2], -1, 1)) * RAD,
      ra = Math.atan2(Le[1], Le[0]) * RAD;
    const raSite = gmst(tl) * RAD + splash.lon;
    return {
      cross: dec - splash.lat,
      along: wrapPi((raSite - ra) * DEG) * RAD,
    };
  };
  const evalTEI2 = (tb, x) => {
    const o = evalTEI(tb, x);
    if (o.ei) {
      Object.assign(o, geoErr(o));
    }
    return o;
  };
  let bestT = null;
  for (let tb = tTEInom - per * 0.5; tb <= tTEInom + per * 0.5; tb += 150) {
    const o = evalTEI(tb, [dv0, 0, 0]);
    const back = o.ei || o.tEnd - tb < 6 * 24 * H - 60;
    const sc =
      Math.abs(o.rvp - rvpT) +
      (back ? 0 : 1e6) +
      (Math.abs(o.tEnd - tb - tReturn) / H) * 10;
    if (!bestT || sc < bestT.sc) bestT = { tb, sc, o };
  }
  let tTEI = bestT.tb;
  {
    const g = goldenMin(
      (tb) => {
        const o = evalTEI(tb, [dv0, 0, 0]);
        return (
          Math.abs(o.rvp - rvpT) +
          (o.ei || o.tEnd - tb < 6 * 24 * H - 60 ? 0 : 1e6)
        );
      },
      tTEI - 150,
      tTEI + 150,
      14,
    );
    tTEI = g.x;
  }
  // tangential TEI; the burn epoch controls the entry corridor (vacuum perigee), the magnitude controls return time
  const hSign = Math.sign(evalTEI(tTEI, [dv0, 0, 0]).hk) || 1;
  // g(tb) = signed |h| of the return conic minus its target; only trajectories that come back count
  const gTb = (tb, dvt) => {
    const o = evalTEI(tb, [dvt, 0, 0]);
    const back = o.ei || o.tEnd - tb < 6 * 24 * H - 60;
    return back ? o.hk - hSign * hTgtTEI : NaN;
  };
  const tbSolve = (dvt, tbG) => {
    // bracket the root near tbG on a 100-s grid, then Illinois regula falsi
    const xs = [],
      gs = [];
    for (let k = -6; k <= 6; k++) {
      xs.push(tbG + k * 100);
      gs.push(gTb(tbG + k * 100, dvt));
    }
    let best = null;
    for (let i = 0; i < xs.length - 1; i++) {
      if (
        !isFinite(gs[i]) ||
        !isFinite(gs[i + 1]) ||
        Math.sign(gs[i]) === Math.sign(gs[i + 1])
      )
        continue;
      if (Math.abs(gs[i] - gs[i + 1]) > 3 * hTgtTEI) continue; // discontinuity, not a root
      const d = Math.abs(xs[i] + 50 - tbG);
      if (!best || d < best.d)
        best = { d, a: xs[i], b: xs[i + 1], ga: gs[i], gb: gs[i + 1] };
    }
    if (!best) return null;
    let { a, b, ga, gb } = best,
      side = 0,
      x = a;
    for (let k = 0; k < 14; k++) {
      x = b - (gb * (b - a)) / (gb - ga);
      const gx = gTb(x, dvt);
      if (!isFinite(gx)) return null;
      if (Math.abs(gx) < 40 || Math.abs(b - a) < 0.5) return x;
      if (Math.sign(gx) === Math.sign(gb)) {
        b = x;
        gb = gx;
        if (side === -1) ga /= 2;
        side = -1;
      } else {
        a = x;
        ga = gx;
        if (side === 1) gb /= 2;
        side = 1;
      }
    }
    return x;
  };
  let dvBest = dv0,
    roots = [];
  {
    // continuation in Δv from dv0, upward then downward, following the root tb(dv)
    const seq = [];
    const walk = (dir, n) => {
      let tbg = tTEI;
      for (let k = 0; k <= n; k++) {
        const dv = dv0 + dir * k * 0.02;
        if (dir < 0 && k === 0) continue;
        const tb = tbSolve(dv, tbg);
        if (globalThis.DEBUG) {
          const oo = tb == null ? null : evalTEI2(tb, [dv, 0, 0]);
          console.log(
            "TEIscan",
            dv.toFixed(3),
            tb == null ? "tb-fail" : (tb - tTEI).toFixed(0) + "s",
            oo && oo.ei,
            oo && oo.along && oo.along.toFixed(1),
            oo && ((oo.tEnd - tb) / 3600).toFixed(1),
            oo && oo.rvp.toFixed(0),
          );
        }
        if (tb == null) break;
        tbg = tb;
        const o = evalTEI2(tb, [dv, 0, 0]);
        if (!o.ei) break;
        seq.push({ dv, tb, o });
      }
    };
    walk(1, 20);
    walk(-1, 4);
    seq.sort((p, q) => p.dv - q.dv);
    for (let i = 0; i + 1 < seq.length; i++) {
      const p = seq[i],
        q = seq[i + 1];
      if (q.dv - p.dv > 0.021) continue;
      if (
        Math.sign(p.o.along) !== Math.sign(q.o.along) &&
        Math.abs(p.o.along - q.o.along) < 90
      ) {
        const f = p.o.along / (p.o.along - q.o.along);
        roots.push({
          dv: p.dv + f * (q.dv - p.dv),
          tb: p.tb + f * (q.tb - p.tb),
          tof:
            p.o.tEnd + f * (q.o.tEnd - p.o.tEnd) - (p.tb + f * (q.tb - p.tb)),
        });
      }
    }
  }
  let tb0 = tTEI;
  if (roots.length) {
    roots.sort((a, b) => Math.abs(a.tof - tReturn) - Math.abs(b.tof - tReturn));
    dvBest = roots[0].dv;
    tb0 = roots[0].tb;
  }
  const Ftei = (x) => {
    const o = evalTEI2(tb0 + x[1] * 100, [x[0], 0, 0]);
    if (!o.ei) return [(o.rvp - rvpT) / 30, 0];
    return [(o.fpa - (entryCfg.fpa ?? -6.5)) * 2, o.along];
  };
  let solT = newtonSolve(Ftei, [dvBest, 0], {
    h: 1e-5,
    tol: 0.01,
    maxIt: 20,
    maxStep: 0.5,
  });
  let dvnT = 0;
  {
    // optional: also null the cross-range (landing latitude) with an out-of-plane component, if affordable
    const F3 = (x) => {
      const o = evalTEI2(tb0 + x[1] * 100, [x[0], 0, x[2]]);
      if (!o.ei) return [(o.rvp - rvpT) / 30, 0, 0];
      return [(o.fpa - (entryCfg.fpa ?? -6.5)) * 2, o.along, o.cross];
    };
    const s3 = newtonSolve(F3, [solT.x[0], solT.x[1], 0], {
      h: 1e-5,
      tol: 0.02,
      maxIt: 20,
      maxStep: 0.25,
    });
    const dvA = Math.hypot(s3.x[0], s3.x[2]);
    if (globalThis.DEBUG)
      console.log("TEI cross", s3.norm, s3.x, dvA, solT.x[0]);
    if (s3.ok && dvA < solT.x[0] * 1.3) {
      solT = { ...solT, x: [s3.x[0], s3.x[1]], ok: true };
      dvnT = s3.x[2];
    }
  }
  tTEI = tb0 + solT.x[1] * 100;
  solT.x = [solT.x[0], 0, dvnT, 0];
  if (globalThis.DEBUG)
    console.log("TEI", {
      dv0,
      dvBest,
      roots: roots.map((r) => [r.dv.toFixed(4), (r.tof / 3600).toFixed(1)]),
      norm: solT.norm,
      hist: solT.hist.map((v) => +v.toFixed(3)),
      x: solT.x,
    });
  if (!solT.ok)
    M.notes.push(
      "TEI targeting converged approximately; the return correction trims the remainder.",
    );
  tTEI += solT.x[3] * 100;
  const xT3 = [solT.x[0], solT.x[1], solT.x[2]];
  const sT = resState(orbRes, tTEI),
    selT = seleno(tTEI, sT);
  const dvTEIvec = evalTEI(tTEI, xT3).dvv;
  const epsTEI = (() => {
    const vv = vadd(selT.v, dvTEIvec);
    return vdot(vv, vv) / 2 - MU_M / vnorm(selT.r);
  })();
  const DT =
    propForDv(sT[6], vnorm(dvTEIvec), orbEng.isp) /
    (orbEng.thrust / (orbEng.isp * G0));
  const fbE = finiteBurn({
    tCenter: tTEI,
    startState: (tt) => Array.from(resState(orbRes, tt)),
    engine: orbEng,
    dirLaw: (tI, y0) => localDirLaw(selT.r, selT.v, vunit(dvTEIvec), "moon"),
    D0: DT,
    metric: (ye, te) => energySel(te, ye) - epsTEI,
    maxProp: P.tankOf(orbEngId).propLeft,
  });
  {
    const resC = cisInt(t, y, fbE.tIgn, {});
    ship.add(resToSeg(resC, "lunar orbit"));
  }
  M.phase(
    tLOIend - (cfg.loi?.circ ? 4 * H : 0),
    fbE.tIgn,
    "Lunar orbit",
    "#43aa8b",
  );
  ship.add(
    resToSeg(fbE.res, "trans-Earth injection", { stage: orbEngId }, fbE.burn),
  );
  const uE = fbE.res.y[0][6] - fbE.res.y[fbE.res.y.length - 1][6];
  P.tankOf(orbEngId).propLeft -= uE;
  const dE = dvForProp(fbE.res.y[0][6], uE, orbEng.isp) * 1000;
  M.burn({
    name: "TEI — trans-Earth injection",
    t: fbE.tIgn,
    dur: fbE.D,
    dv: dE,
    engine: orbEng.name,
    isp: orbEng.isp,
    prop: uE,
    m0: fbE.res.y[0][6],
    obj: "ship",
    propType: orbEng.prop,
  });
  M.ev(
    fbE.tIgn,
    "ship",
    "Trans-Earth injection",
    `${EXPLAIN.tei} ${fmtDur(fbE.D)} burn, Δv ${dE.toFixed(0)} m/s.`,
    "burn",
  );
  if (fbE.short)
    M.warnings.push(
      "Insufficient propellant for trans-Earth injection — the crew would be stranded in lunar orbit.",
    );
  t = fbE.res.tEnd;
  y = Array.from(fbE.res.y[fbE.res.y.length - 1]);
  return finishReturn(
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
    fbE.tIgn,
  );
}
// --------------------------------------------------------------------------
// return coast → MCC → CM/SM sep → entry → splashdown

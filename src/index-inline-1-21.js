// index-inline-1 21 — ycur
// Lines 7864-8133 of readable/index-inline-1.pretty.js (statement-aligned).
function finishFlyby(
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
) {
  const H = 3600;
  let t = tMcc;
  // integrate to perilune
  let res = cisInt(t, y, t + 8 * 24 * H, { events: [evPerilune()] });
  const tPeri = res.stopEvent ? res.stopEvent.t : res.tEnd;
  const sel = seleno(tPeri, res.stopEvent.y);
  for (let i = 0; i < res.t.length; i++) {
    const m = moonGeo(res.t[i]).r;
    if (
      vnorm(vsub([res.y[i][0], res.y[i][1], res.y[i][2]], m)) < BODIES.moon.soi
    ) {
      M.ev(
        res.t[i],
        "ship",
        "Lunar sphere of influence",
        EXPLAIN.soiMoon,
        "soi",
      );
      break;
    }
  }
  M.phase(
    M.burns.find((b) => b.name.startsWith("TLI"))?.t ?? tMcc,
    tPeri - 4 * H,
    "Translunar coast",
    "#9b5de5",
  );
  // scripted events (Apollo 13) before perilune: explosion / DPS burn
  let yCur = y;
  for (const e of scripted.filter((e) => e.met && t0 + e.met * H < tPeri)) {
    if (e.kind === "emergency")
      M.ev(t0 + e.met * H, "ship", e.name, e.desc, "emergency", {
        fx: "venting",
      });
  }
  const dpsBurn = scripted.find((e) => e.type === "freeReturnBurn");
  if (dpsBurn) {
    const tb = t0 + dpsBurn.met * H;
    const rr = cisInt(t, y, tb, {});
    ship.add(resToSeg(rr, "translunar coast (hybrid trajectory)"));
    t = rr.tEnd;
    yCur = Array.from(rr.y[rr.y.length - 1]);
    const runFR = (dv) => {
      const y0 = [...yCur];
      y0[3] += dv[0];
      y0[4] += dv[1];
      y0[5] += dv[2];
      const r1 = cisInt(t, y0, t + 6 * 24 * H, {
        events: [evPerilune()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      if (!r1.stopEvent) return [1e3, 1e3];
      const sp = seleno(r1.stopEvent.t, r1.stopEvent.y);
      const r2 = cisInt(
        r1.stopEvent.t,
        r1.stopEvent.y,
        r1.stopEvent.t + 7 * 24 * H,
        { events: [evPerigee(), evEI()], rtol: 1e-9, atol: 1e-6, hmax: 3600 },
      );
      const yl = r2.y[r2.y.length - 1];
      return [
        (vnorm(sp.r) - rpMoonT) / 50,
        (vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]) - rvpT) / 50,
      ];
    };
    const so = newtonSolve(runFR, [0, 0, 0], {
      h: 2e-6,
      tol: 2e-3,
      maxIt: 20,
      maxStep: 0.1,
    });
    const mag = vnorm(so.x) * 1000,
      engId = dpsBurn.engine || SC.prop.lander;
    const pm = P.burn(engId, yCur[6], mag / 1000);
    M.burn({
      name: dpsBurn.name,
      t,
      dur: pm.dur,
      dv: mag,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: yCur[6],
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      t,
      "ship",
      dpsBurn.name,
      `${dpsBurn.desc} Δv ${mag.toFixed(1)} m/s.`,
      "burn",
    );
    yCur[3] += so.x[0];
    yCur[4] += so.x[1];
    yCur[5] += so.x[2];
    yCur[6] -= pm.prop;
  }
  const segStart = t;
  res = cisInt(t, yCur, t + 8 * 24 * H, { events: [evPerilune()] });
  const tP = res.stopEvent.t,
    yP = res.stopEvent.y,
    sP = seleno(tP, yP);
  const altP = vnorm(sP.r) - R_MOON;
  const dEarthMax = (() => {
    let m = 0,
      tm = tP;
    const r2 = cisInt(
      tP - 6 * H,
      Array.from(resState(res, tP - 6 * H)),
      tP + 6 * H,
      {},
    );
    for (let i = 0; i < r2.t.length; i++) {
      const d = Math.hypot(r2.y[i][0], r2.y[i][1], r2.y[i][2]);
      if (d > m) {
        m = d;
        tm = r2.t[i];
      }
    }
    return { m, tm };
  })();
  ship.add(resToSeg(res, "lunar flyby approach"));
  t = tP;
  yCur = Array.from(yP);
  M.ev(
    tP - 0.6 * H,
    "ship",
    "Loss of signal (behind the Moon)",
    "The Moon blocks the radio path to Earth.",
    "los",
  );
  M.ev(
    tP,
    "ship",
    "Closest approach to the Moon",
    `${EXPLAIN.freeReturn} Altitude ${altP.toFixed(0)} km above the far side, speed relative to the Moon ${vnorm(sP.v).toFixed(2)} km/s.`,
    "flyby",
  );
  M.ev(
    dEarthMax.tm,
    "ship",
    "Maximum distance from Earth",
    `${Math.round(dEarthMax.m).toLocaleString()} km from Earth’s centre (${Math.round(dEarthMax.m - R_E).toLocaleString()} km above the surface).`,
    "record",
  );
  for (const e of scripted.filter((e) => e.when === "flyby"))
    M.ev(tP + (e.dt || 0) * H, "ship", e.name, e.desc, e.kind || "info");
  M.summary.flyby = { alt: altP, maxDist: dEarthMax.m };
  // optional post-perilune burn (Apollo 13 PC+2): targets return
  const pc2 = scripted.find((e) => e.type === "pc2");
  let tDepart = tP;
  if (pc2) {
    const tb = tP + pc2.dt * H;
    const rr = cisInt(t, yCur, tb, {});
    ship.add(resToSeg(rr, "leaving the Moon"));
    t = rr.tEnd;
    yCur = Array.from(rr.y[rr.y.length - 1]);
    // solve prograde-ish burn targeting splashdown at given time
    const splash = cfg.splash,
      entryCfg = cfg.entry || {};
    const tEntryDur = ref.dur,
      thetaRange = ref.range;
    const siteE = (tt) =>
      vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
    const tEIgoal = t0 + pc2.eiMET * H;
    const run = (dv) => {
      const y0 = [...yCur];
      y0[3] += dv[0];
      y0[4] += dv[1];
      y0[5] += dv[2];
      return cisInt(t, y0, t + 6 * 24 * H, {
        events: [evEI(), evPerigee(80000)],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
    };
    const Fp = (dv) => {
      const r = run(dv);
      const yl = r.y[r.y.length - 1],
        rr2 = [yl[0], yl[1], yl[2]],
        vv = [yl[3], yl[4], yl[5]];
      if (!(r.stopEvent && r.stopEvent.name === "EI"))
        return [
          (vacPerigee(rr2, vv) - rvpT) / 30,
          (r.tEnd - tEIgoal) / 3600,
          0,
        ];
      return [
        (fpaDeg(rr2, vv) - (entryCfg.fpa ?? -6.5)) * 2,
        (r.tEnd - tEIgoal) / 3600,
        Math.asin(
          clamp(vdot(vunit(vcross(rr2, vv)), siteE(r.tEnd + tEntryDur)), -1, 1),
        ) * RAD,
      ];
    };
    const vdir = vunit(vsub(yCur.slice(3, 6), moonGeo(t).v));
    const x0 = vscale(vdir, pc2.dvGuess / 1000);
    const sol = newtonSolve(Fp, x0, {
      h: 2e-6,
      tol: 0.02,
      maxIt: 18,
      maxStep: 0.1,
    });
    const dvv = sol.x,
      mag = vnorm(dvv) * 1000;
    const engId = pc2.engine || SC.prop.lander;
    const pm = P.burn(engId, yCur[6], mag / 1000);
    M.burn({
      name: pc2.name,
      t,
      dur: pm.dur,
      dv: mag,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: yCur[6],
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      t,
      "ship",
      pc2.name,
      `${pc2.desc} Δv ${mag.toFixed(0)} m/s, ${fmtDur(pm.dur)} burn.`,
      "burn",
    );
    yCur[3] += dvv[0];
    yCur[4] += dvv[1];
    yCur[5] += dvv[2];
    yCur[6] -= pm.prop;
    tDepart = t;
  }
  // continue home
  M.phase(tP - 4 * H, tP + 4 * H, "Lunar flyby", "#43aa8b");
  return finishReturn(
    M,
    cfg,
    SC,
    P,
    ship,
    t0,
    t,
    yCur,
    ref,
    rvpT,
    progress,
    tP + 4 * H,
  );
}
// --------------------------------------------------------------------------
// LANDING: undock, DOI, powered descent, surface stay, ascent, rendezvous

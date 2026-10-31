// index-inline-1 40 — math
// Lines 13419-13896 of readable/index-inline-1.pretty.js (statement-aligned).
function issRendezvous(o) {
  const { M, cfg, ship, H } = o,
    c = cfg.iss;
  const tDock = isoToT(c.dock),
    tUndock = isoToT(c.undock),
    tArr = tDock - (c.arriveBefore ?? 1.45) * H;
  const rISS = R_E + (c.hp + c.ha) / 2;
  o.progress("Rendezvous: phasing burns toward the station…");
  const hLow = (c.hp + c.ha) / 2 - (c.below ?? 14);
  const Pl = 2 * Math.PI * Math.sqrt(Math.pow(R_E + hLow, 3) / MU_E);
  const aTr = (R_E + hLow + rISS) / 2,
    Ttr = Math.PI * Math.sqrt((aTr * aTr * aTr) / MU_E);
  const tTI = tArr - Ttr,
    tNC1 = o.t0 + (c.nc1MET ?? 3.3) * H,
    tNC2 = tTI - 1.5 * Pl;
  // Where the docking happens along the orbit decides when the landing opportunities come days later. The station's
  // real position is matched indirectly: the phasing orbit (NC-1 apogee) is chosen so that, after undocking, the
  // orbit passes the landing runway at the historical landing time — as it did for the real, phased rendezvous.
  const tStar = isoToT(cfg.landing) - 12.5 * 60,
    rw = o.rwy;
  const dryArrive = (ha1) => {
    let t = o.t,
      y = o.y.slice();
    const prop = (t1) => {
      const r = leoInt(t, y, t1, { rtol: 1e-9, atol: 1e-6, hmax: 120 });
      t = r.tEnd;
      y = Array.from(r.y[r.y.length - 1]);
    };
    const kick = (rT) => {
      const dv = o.dvToApsis([y[0], y[1], y[2]], [y[3], y[4], y[5]], rT);
      y[3] += dv[0];
      y[4] += dv[1];
      y[5] += dv[2];
    };
    prop(tNC1);
    kick(R_E + ha1);
    prop(tNC2);
    kick(R_E + hLow);
    prop(nextApsis(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]], true));
    kick(R_E + hLow - 2);
    prop(tTI);
    kick(rISS - 0.6);
    prop(tArr);
    return y;
  };
  const issFrom = (y) => {
    const r = [y[0], y[1], y[2]],
      up = vunit(r),
      hh = vunit(vcross(r, [y[3], y[4], y[5]]));
    const rI = vscale(up, vnorm(r) + 0.6);
    return [
      ...rI,
      ...vscale(vunit(vcross(hh, up)), Math.sqrt(MU_E / vnorm(rI))),
      c.mass,
    ];
  };
  const phaseErr = (ha1) => {
    const yI = issFrom(dryArrive(ha1));
    const rr = leoInt(tArr, yI, tStar, { rtol: 1e-9, atol: 1e-6, hmax: 120 });
    const s = rr.y[rr.y.length - 1];
    const r = [s[0], s[1], s[2]],
      h = vunit(vcross(r, [s[3], s[4], s[5]])),
      k = vunit(sitePosEcl("earth", rw.lat, rw.lon, 0, tStar)),
      kp = vunit(vsub(k, vscale(h, vdot(k, h))));
    return Math.atan2(vdot(vcross(vunit(r), kp), h), vdot(vunit(r), kp));
  };
  let ha1 = c.nc1Ha ?? 270;
  if (cfg.landing && !c.nc1Ha) {
    // The station takes the altitude the orbiter arrives at, and over the days to the landing a few hundred metres of
    // altitude add up to a large shift along the orbit, so the error swings through whole turns across the range of
    // apogees. Scan it, then refine the zero crossing nearest the nominal apogee (Illinois-modified false position).
    const lo = 175,
      hi = 375,
      step = 5,
      wrap = (e) => e - 2 * Math.PI * Math.round(e / (2 * Math.PI));
    const xs = [],
      es = [];
    for (let x = lo; x <= hi + 1e-9; x += step) {
      xs.push(x);
      es.push(wrap(phaseErr(x)));
    }
    const brackets = [];
    for (let i = 0; i + 1 < xs.length; i++)
      if (es[i] * es[i + 1] <= 0 && Math.abs(es[i] - es[i + 1]) < Math.PI)
        brackets.push(i);
    brackets.sort(
      (i, j) =>
        Math.abs(xs[i] + step / 2 - 270) - Math.abs(xs[j] + step / 2 - 270),
    );
    if (brackets.length) {
      const i = brackets[0];
      let a = xs[i],
        b = xs[i + 1],
        ea = es[i],
        eb = es[i + 1],
        x = a,
        side = 0;
      for (let it = 0; it < 16; it++) {
        x = eb !== ea ? b - (eb * (b - a)) / (eb - ea) : (a + b) / 2;
        const e = wrap(phaseErr(x));
        if (Math.abs(e) < 0.002) break;
        if (e < 0 === eb < 0) {
          b = x;
          eb = e;
          if (side === -1) ea /= 2;
          side = -1;
        } else {
          a = x;
          ea = e;
          if (side === 1) eb /= 2;
          side = 1;
        }
      }
      ha1 = x;
    } else
      M.notes.push(
        "The phasing orbit could not be adjusted to match the historical landing time.",
      );
  }
  // NC-1 raises the apogee early on; NC-2/NC-3 lift the orbit to ~14 km under the station before terminal initiation
  o.omsBurn(
    tNC1,
    (r, v) => o.dvToApsis(r, v, R_E + ha1),
    "NC-1 — phasing burn",
    (b) =>
      `The first of the phasing burns that set how fast the orbiter catches up with the station, ${Math.round(c.hp)} km up and thousands of kilometres ahead: the lower the orbit, the faster it goes around. Δv ${Math.round(b.dv)} m/s; orbit ${Math.round(b.hp)} × ${Math.round(b.ha)} km.`,
    "in orbit — catching up",
  );
  o.omsBurn(
    tNC2,
    (r, v) => o.dvToApsis(r, v, R_E + hLow),
    "NC-2 — height adjust",
    (b) =>
      `Raises the far side of the orbit to ${Math.round(hLow)} km, just under the station. Δv ${Math.round(b.dv)} m/s.`,
    "in orbit — catching up",
  );
  {
    const s = o.st();
    const tA = nextApsis(o.t, s.r, s.v, true);
    o.omsBurn(
      tA,
      (r, v) => o.dvToApsis(r, v, R_E + hLow - 2),
      "NC-3 — coelliptic burn",
      (b) =>
        `At apogee, a burn makes the orbit nearly circular ${Math.round(b.hp)} × ${Math.round(b.ha)} km, a steady ${Math.round(rISS - R_E - hLow)} km below the station. The orbiter now creeps up on it from behind.`,
      "in orbit — closing in",
    );
  }
  // TI: a Hohmann-like hop up to the station's altitude, arriving half an orbit later 600 m below it
  o.coast(tTI - 30, "in orbit — closing in");
  o.omsBurn(
    tTI,
    (r, v) => o.dvToApsis(r, v, rISS - 0.6),
    "TI — terminal initiation",
    (b) =>
      `The burn that commits to the rendezvous: it raises the far side of the orbit to the station’s altitude, half an orbit ahead. From here the crew flies by radar, star trackers and the docking camera. Δv ${Math.round(b.dv)} m/s.`,
    "rendezvous",
  );
  o.coast(tArr, "rendezvous — closing on the station");
  // the station, defined from where the orbiter arrives: 600 m above it, moving on a circular orbit in the same plane
  const sA = o.st();
  const upA = vunit(sA.r),
    hA = vunit(vcross(sA.r, sA.v));
  const rI = vscale(upA, vnorm(sA.r) + 0.6),
    vI = vscale(vunit(vcross(hA, upA)), Math.sqrt(MU_E / vnorm(rI)));
  const tEndISS = isoToT(cfg.landing) + 6 * H;
  const resB = leoInt(tArr, [...rI, ...vI, c.mass], M.t0 - 2 * H, { hmax: 60 }),
    resF = leoInt(tArr, [...rI, ...vI, c.mass], tEndISS, { hmax: 60 });
  // resState expects increasing times: put the backward leg in forward order
  const rev = {
    t: resB.t.slice().reverse(),
    y: resB.y.slice().reverse(),
    f: resB.f.slice().reverse(),
  };
  const issAt2 = (tt) => {
    const s = resState(tt < tArr ? rev : resF, tt);
    return { r: [s[0], s[1], s[2]], v: [s[3], s[4], s[5]] };
  };
  const iss = M.addObj(
    new MObject("iss", "International Space Station", {
      kind: "craft",
      model: "iss",
      color: "#9fd3ff",
      crew: c.crew || 6,
      labelPriority: 2,
    }),
  );
  iss.add(
    new SampleSeg(
      "earth",
      integToSamples(rev, () => ({ phase: "ISS orbit" })),
      { phase: "ISS orbit" },
    ),
  );
  iss.add(
    new SampleSeg(
      "earth",
      integToSamples(resF, () => ({ phase: "ISS orbit" })),
      { phase: "ISS orbit" },
    ),
  );
  iss.setConfig(M.t0 - 2 * H, "sc", { key: "sc", sc: "iss", parts: ["iss"] });
  // relative-motion legs (LVLH metres → absolute samples): R-bar approach, R-bar pitch maneuver, swing to the V-bar, docking
  const rel0 = toLvlh(lvlh(rI, vI), vsub(sA.r, rI));
  const dock = c.dockOffset || [0.0231, 0, -0.0068]; // orbiter reference point from the station's, LVLH km: docking ports touching (renderer models)
  const tR0 = isoToT(c.rpm),
    tR1 = tR0 + 9 * 60,
    tV = tDock - 28 * 60,
    tV2 = tDock - 7 * 60;
  const ease = (x) => smoothstep(clamp(x, 0, 1));
  const relAt = (tt) => {
    if (tt <= tR0) {
      const f = ease((tt - tArr) / (tR0 - tArr));
      return vlerp(rel0, [0, 0, -0.183], f);
    }
    if (tt <= tR1) return [0, 0, -0.183];
    if (tt <= tV) {
      const f = ease((tt - tR1) / (tV - tR1)),
        ph = (-Math.PI / 2) * (1 - f),
        rr = 0.183 + (0.095 - 0.183) * f;
      return [rr * Math.cos(ph), 0, rr * Math.sin(ph)];
    }
    if (tt <= tV2) {
      const f = ease((tt - tV) / (tV2 - tV));
      return vlerp([0.095, 0, 0], [dock[0] + 0.009, 0, dock[2]], f);
    }
    const f = ease((tt - tV2) / (tDock - tV2));
    return vlerp([dock[0] + 0.009, 0, dock[2]], dock, f);
  };
  const relSamples = (ta, tb, dt, fn, phase) => {
    const out = [];
    const mass = o.y[6];
    const abs = (tt) => {
      const I = issAt2(tt);
      return vadd(I.r, fromLvlh(lvlh(I.r, I.v), fn(tt)));
    };
    for (let tt = ta; ; tt = Math.min(tt + dt, tb)) {
      const p = abs(tt),
        vv = vscale(vsub(abs(tt + 0.5), abs(tt - 0.5)), 1);
      out.push({
        t: tt,
        r: p,
        v: vv,
        m: mass,
        phase: typeof phase === "function" ? phase(tt) : phase,
      });
      if (tt >= tb) break;
    }
    return out;
  };
  o.progress("Proximity operations and docking…");
  ship.add(
    new SampleSeg(
      "earth",
      relSamples(tArr, tDock, 2, relAt, (tt) =>
        tt < tR0
          ? "R-bar approach"
          : tt < tR1
            ? "R-bar pitch maneuver"
            : tt < tV
              ? "moving to the V-bar"
              : "V-bar approach — docking",
      ),
      { phase: "proximity operations" },
    ),
  );
  const dv0 = vnorm(vsub(sA.v, vI)) * 1000;
  M.burn({
    name: "Braking — rendezvous",
    t: tArr,
    dur: 60,
    dv: dv0,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp(-dv0 / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tArr - 25 * 60,
    "ship",
    "Mid-course corrections",
    "Small reaction-control burns trim the intercept as the radar locks on to the station.",
    "info",
  );
  M.ev(
    tArr,
    "ship",
    "Station 600 m above",
    `The orbiter arrives directly below the station (on the "R-bar", the line to Earth’s centre) and brakes, ${dv0.toFixed(1)} m/s. The commander takes manual control at the aft flight-deck windows.`,
    "burn",
  );
  M.ev(
    tR0,
    "ship",
    "R-bar pitch maneuver",
    "Six hundred feet (183 m) below the station the orbiter does a slow back-flip, 360° in nine minutes, so the station crew can photograph every heat-shield tile with 400 and 800 mm lenses. The images are checked on the ground for damage before entry.",
    "photo",
  );
  M.ev(
    tR1 + 60,
    "ship",
    "Swing to the V-bar",
    'The orbiter flies a quarter circle up and around to a point 95 m (310 ft) in front of the station, on its direction of travel (the "V-bar"), now nose up with the payload bay facing the docking port.',
    "info",
  );
  M.ev(
    tV2,
    "ship",
    "30 ft — final approach",
    "The orbiter holds 9 m (30 ft) from the docking port to line up, then closes at about 3 cm/s.",
    "info",
  );
  {
    const I = issAt2(tDock);
    M.ev(
      tDock,
      "ship",
      "Docking",
      `“Capture confirmed.” The orbiter’s docking system latches on to Pressurized Mating Adapter 2 on the front of the station, ${Math.round(vnorm(I.r) - R_E)} km up, at ${fmtUTC(tDock)} UTC.`,
      "dock",
    );
  }
  M.phase(o.t0 + (c.nc1MET ?? 3.3) * H, tArr, "Rendezvous", "#4cc9f0");
  // docked
  ship.setConfig(tArr - 20 * 60, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "rbar",
  });
  ship.setConfig(tR0, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "rpm",
    rpm0: tR0,
    rpm1: tR1,
  });
  ship.setConfig(tR1, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
    sw0: tR1,
    sw1: tV,
  }); // pitch up while swinging to the V-bar
  const mplmOut = c.mplmOut ? isoToT(c.mplmOut) : null,
    mplmIn = c.mplmIn ? isoToT(c.mplmIn) : null;
  const dockedRel = () => dock;
  const docked = relSamples(tDock, tUndock, 30, dockedRel, "docked to the ISS");
  ship.add(new SampleSeg("earth", docked, { phase: "docked to the ISS" }));
  ship.setConfig(tDock, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
    docked: true,
  });
  M.ev(
    tDock + 1.7 * H,
    "ship",
    "Hatches open",
    "The two crews meet. For the next week the orbiter and the station fly as one 520-tonne spacecraft.",
    "info",
  );
  if (mplmOut) {
    ship.setConfig(mplmOut, "sc", {
      ...orbiterCfg(cfg),
      pay: null,
      bay: "open",
      att: "vbar",
      docked: true,
    });
    iss.setConfig(mplmOut, "sc", {
      key: "sc",
      sc: "iss",
      parts: ["iss"],
      mplm: true,
    });
    M.ev(
      mplmOut,
      "ship",
      `${c.mplmName || "Logistics module"} moved to the station`,
      "The station’s robot arm lifts the cargo module out of the payload bay and berths it to the Harmony node. The crews unload about 4 t of supplies — food and spares to keep the station going after the Shuttle retires.",
      "info",
    );
  }
  if (mplmIn) {
    ship.setConfig(mplmIn, "sc", {
      ...orbiterCfg(cfg),
      bay: "open",
      att: "vbar",
      docked: true,
    });
    iss.setConfig(mplmIn, "sc", { key: "sc", sc: "iss", parts: ["iss"] });
    M.ev(
      mplmIn,
      "ship",
      `${c.mplmName || "Logistics module"} back in the bay`,
      "Refilled with station trash and equipment for return, the module goes back into the payload bay.",
      "info",
    );
  }
  M.phase(tDock, tUndock, "Docked to the ISS", "#43aa8b");
  // undocking, flyaround, separation
  const tBack = tUndock + 20 * 60,
    tFly = tBack + 75 * 60;
  const relAfter = (tt) => {
    if (tt <= tBack) {
      const f = ease((tt - tUndock) / (tBack - tUndock));
      return vlerp(dock, [0.183, 0, 0], f);
    }
    const f = clamp((tt - tBack) / (tFly - tBack), 0, 1),
      ph = 2 * Math.PI * smoothstep(f);
    return [0.183 * Math.cos(ph), 0, 0.183 * Math.sin(ph)];
  };
  ship.add(
    new SampleSeg(
      "earth",
      relSamples(tUndock, tFly, 2, relAfter, (tt) =>
        tt < tBack ? "undocking — backing away" : "flyaround",
      ),
      { phase: "flyaround" },
    ),
  );
  ship.setConfig(tUndock, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
  });
  ship.setConfig(tBack, "sc", { ...orbiterCfg(cfg), bay: "open", att: "fly" });
  M.ev(
    tUndock,
    "ship",
    "Undocking",
    "Springs push the orbiter gently away from the station; it backs out along the V-bar to about 180 m.",
    "sep",
  );
  M.ev(
    tBack + 60,
    "ship",
    "Flyaround",
    "A last lap around the station at about 180 m, over the top, behind and underneath, while the crew photographs it from every side.",
    "photo",
  );
  // free flight again: set the state at the end of the flyaround and fire the separation burn
  const end = relSamples(tFly - 0.5, tFly + 0.5, 0.5, relAfter, "");
  const sE = end[1];
  o.t = tFly;
  o.y = [...sE.r, ...sE.v, o.y[6]];
  const F = lvlh(sE.r, sE.v),
    dvSep = vadd(vscale(F.x, -0.0006), vscale(F.z, -0.0003));
  o.y[3] += dvSep[0];
  o.y[4] += dvSep[1];
  o.y[5] += dvSep[2];
  M.burn({
    name: "Separation burn",
    t: tFly,
    dur: 10,
    dv: vnorm(dvSep) * 1000,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp((-vnorm(dvSep) * 1000) / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tFly,
    "ship",
    "Final separation",
    "A small burn takes the orbiter below and ahead of the station; on the lower, faster orbit it pulls away a few kilometres every lap.",
    "burn",
  );
  ship.setConfig(tFly + 120, "sc", { ...orbiterCfg(cfg), bay: "open" });
  M.phase(tUndock, tFly, "Undocking & flyaround", "#4cc9f0");
}
// ---------------------------------------------------------------------------
// Payload deploy with the robot arm (STS-31: the Hubble Space Telescope)
// ---------------------------------------------------------------------------

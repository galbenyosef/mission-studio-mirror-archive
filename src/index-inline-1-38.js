// index-inline-1 38 — cfg
// Lines 13038-13320 of readable/index-inline-1.pretty.js (statement-aligned).
function planLEO(cfg, progress = () => {}) {
  const M = new Mission(cfg),
    H = 3600;
  const L = shuttleLauncher(cfg);
  const SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  if (cfg.payloadMass != null && SC.modules.PAY)
    SC.modules.PAY.dry = cfg.payloadMass;
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site],
    t0 = M.t0,
    rwy = RUNWAYS[cfg.runway] || RUNWAYS.KSC15;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew: cfg.crew || 0,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const OMS = "OMS",
    eng = P.engineOf(OMS),
    mdotOMS = eng.thrust / (eng.isp * G0);
  // ---------------- launch ----------------
  const incl = cfg.incl ?? 51.6;
  const azI =
    Math.asin(clamp(Math.cos(incl * DEG) / Math.cos(S.lat * DEG), -1, 1)) * RAD;
  const normal = planeNormalFromAz("earth", S.lat, S.lon, t0, azI);
  progress("Solving the ascent: boosters, main engines, MECO…");
  const LP = launchPhase(M, cfg, L, scTotalMass(SC), normal, { ship });
  M.notes.push(
    `Launch azimuth ${azI.toFixed(1)}° (inertial, north-east) for an orbit inclined ${incl.toFixed(2)}° to the equator.`,
  );
  if (!LP.ok) {
    M.warnings.push("The Shuttle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  shuttleAscentEvents(M, cfg, L, asc, ship);
  let t = asc.t,
    y = [...asc.r, ...asc.v, asc.m];
  const st = () => ({ r: [y[0], y[1], y[2]], v: [y[3], y[4], y[5]] });
  const coast = (tEnd, phase, extra) => {
    if (tEnd <= t + 1e-6) return null;
    const res = leoInt(t, y, tEnd);
    ship.add(resToSeg(res, phase, extra));
    t = res.tEnd;
    y = Array.from(res.y[res.y.length - 1]);
    return res;
  };
  // finite OMS burn centred on tc; dvAt(state at tc) gives the impulsive Δv vector it replaces
  const omsBurn = (tc, dvAt, name, describe, phase) => {
    const pre = leoInt(t, y, tc);
    const sC = Array.from(pre.y[pre.y.length - 1]);
    const dv = dvAt([sC[0], sC[1], sC[2]], [sC[3], sC[4], sC[5]]),
      dvm = vnorm(dv);
    if (!(dvm > 1e-6)) return null;
    const D = propForDv(sC[6], dvm, eng.isp) / mdotOMS,
      tIgn = tc - D / 2;
    coast(tIgn, phase);
    const law = localDirLaw(st().r, st().v, vunit(dv));
    const tank = P.tankOf(OMS);
    const Dmax = tank.propLeft / mdotOMS,
      Duse = Math.min(D, Dmax);
    const res = leoInt(tIgn, y, tIgn + Duse, {
      thrust: { T: eng.thrust, mdot: mdotOMS, dir: law },
      hmax: 2,
      h0: 0.5,
    });
    ship.add(resToSeg(res, name, { stage: OMS }, { T: eng.thrust, law }));
    const used = res.y[0][6] - res.y[res.y.length - 1][6];
    tank.propLeft -= used;
    const dvA = dvForProp(res.y[0][6], used, eng.isp) * 1000;
    M.burn({
      name,
      t: tIgn,
      dur: Duse,
      dv: dvA,
      engine: eng.name,
      isp: eng.isp,
      prop: used,
      m0: res.y[0][6],
      obj: "ship",
      propType: eng.prop,
    });
    t = res.tEnd;
    y = Array.from(res.y[res.y.length - 1]);
    const el = rv2coe(st().r, st().v, MU_E);
    M.ev(
      tIgn,
      "ship",
      name.split(" — ")[0],
      describe({ dv: dvA, dur: Duse, hp: el.rp - R_E, ha: el.ra - R_E }),
      "burn",
      { dv: dvA },
    );
    if (Duse < D - 0.5)
      M.warnings.push(`The OMS ran dry during ${name.split(" — ")[0]}.`);
    return { tIgn, dur: Duse, dv: dvA };
  };
  // tangential Δv at a point that puts the opposite side of the orbit at radius rT
  const dvToApsis = (r, v, rT) => {
    const rn = vnorm(r),
      vt = vnorm(vsub(v, vscale(vunit(r), vdot(v, vunit(r)))));
    const vNeed = Math.sqrt((2 * MU_E * rT) / (rn * (rn + rT)));
    return vscale(vunit(v), vNeed - vt);
  };
  // ---------------- MECO → External Tank separation ----------------
  const tMECO = asc.t,
    tETsep = tMECO + 18;
  coast(tETsep, "MECO — coasting with the tank");
  {
    const et = M.addObj(
      new MObject("et", "External Tank", {
        kind: "stage",
        model: "stage",
        color: "#d98b4a",
      }),
    );
    et.setConfig(tETsep, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: 1,
      variant: cfg.lvVariant,
    });
    // The stack's attitude after MECO (as the viewer draws it): nose along the velocity, the tank's −Z side (where the
    // orbiter rides) facing down — or up after the roll to heads-up. The trajectory so far is the stack's reference point
    // on the tank's axis; the orbiter's own reference point sits 7.4 m aft of it and 8.55 m off the axis.
    const sv = st(),
      n = vunit(sv.v),
      upS = vunit(sv.r),
      hN = vunit(vcross(asc.r, asc.v)),
      A = vunit(vcross(hN, upS)),
      ref = vsub(upS, A);
    let Zs = vunit(vsub(ref, vscale(n, vdot(ref, n))));
    if (cfg.headsUpMET) Zs = vscale(Zs, -1);
    const offOrb = vadd(vscale(n, -0.007405), vscale(Zs, -0.00855)),
      mET = asc.upper ? asc.upper.dry + asc.upper.propLeft : L.stages[1].dry;
    const rET = leoInt(
      tETsep,
      [...sv.r, ...vadd(sv.v, vscale(Zs, 0.0006)), mET],
      tETsep + 3 * H,
      {
        events: [
          {
            name: "breakup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 75),
          },
        ],
      },
    );
    et.add(resToSeg(rET, "External Tank — falling back"));
    if (rET.stopEvent) {
      const ll = subPointLL(
        "earth",
        [rET.stopEvent.y[0], rET.stopEvent.y[1], rET.stopEvent.y[2]],
        rET.stopEvent.t,
      );
      M.ev(
        rET.stopEvent.t,
        "et",
        "External Tank breaks up",
        `The empty tank, ${Math.round(mET / 1000)} t, comes back into the atmosphere half an orbit after separation and breaks up around 75 km over the ${oceanName(ll[0], ll[1])}. It was the only part of the Shuttle that was not reused.`,
        "info",
      );
    }
    y[6] = P.massOf(SC.orbiter);
    for (let k = 0; k < 3; k++) {
      y[k] += offOrb[k];
      y[3 + k] -= Zs[k] * 0.0012;
    } // the −Z translation, away from the tank
    ship.setConfig(tETsep, "sc", orbiterCfg(cfg));
    M.ev(
      tETsep,
      "ship",
      "External Tank separation",
      `Eighteen seconds after MECO the tank is released and the orbiter fires its reaction-control jets to move clear (a 4 ft/s "−Z translation"). MECO left the orbit's low point inside the atmosphere on purpose, so the tank falls back on its own; the orbiter will raise its perigee with the OMS.`,
      "sep",
    );
  }
  // ---------------- OMS-1 (standard insertion only) and OMS-2 ----------------
  progress("OMS burns: raising the orbit…");
  if (cfg.oms1)
    omsBurn(
      t0 + cfg.oms1.met,
      (r, v) => dvToApsis(r, v, R_E + cfg.oms1.ha),
      "OMS-1 — orbit insertion",
      (b) =>
        `Both OMS engines fire for ${fmtDur(b.dur)} (Δv ${Math.round(b.dv)} m/s), raising the far side of the orbit to ${fmtNmi(b.ha)}. Early flights flew this "standard insertion"; from 1984 a higher MECO made OMS-1 unnecessary.`,
      "MECO — coasting",
    );
  {
    const s = st();
    const tA = nextApsis(t, s.r, s.v, true);
    const hp = cfg.oms2.hp;
    omsBurn(
      tA,
      (r, v) => dvToApsis(r, v, R_E + hp),
      "OMS-2 — circularisation",
      (b) =>
        `At the high point of the orbit both OMS engines fire for ${fmtDur(b.dur)} (Δv ${Math.round(b.dv)} m/s): the perigee rises out of the atmosphere. Orbit now ${Math.round(b.hp)} × ${Math.round(b.ha)} km.`,
      "climbing to apogee",
    );
  }
  M.phase(tMECO, t, "Orbit insertion", "#4ea8de");
  const tIns = t;
  // payload bay doors open about 1½ hours after launch: the radiators on their inner faces must dump the orbiter's heat
  const tBay = t0 + (cfg.bayOpenMET ?? 1.5) * H;
  ship.setConfig(tBay, "sc", { ...orbiterCfg(cfg), bay: "open", bayT: tBay }); // the doors swing open over the next three minutes (app/32_shuttle.js)
  M.ev(
    tBay,
    "ship",
    "Payload bay doors open",
    "The two 18-m doors swing open. Their inner faces are the radiators that carry the orbiter’s heat away — without opening them the crew would have to come home within hours.",
    "info",
  );
  // ---------------- orbit operations ----------------
  const ops = {
    M,
    cfg,
    SC,
    P,
    ship,
    L,
    t0,
    H,
    omsBurn,
    coast,
    dvToApsis,
    get t() {
      return t;
    },
    set t(v) {
      t = v;
    },
    get y() {
      return y;
    },
    set y(v) {
      y = v;
    },
    st,
    tBay,
    rwy,
    progress,
  };
  for (const b of cfg.orbitBurns || []) {
    let tc = t0 + b.met * H;
    if (b.at) {
      const pre = leoInt(t, y, tc);
      const yy = pre.y[pre.y.length - 1];
      tc = nextApsis(
        tc,
        [yy[0], yy[1], yy[2]],
        [yy[3], yy[4], yy[5]],
        b.at === "apo",
      );
    }
    omsBurn(
      tc,
      (r, v) =>
        b.ha != null
          ? dvToApsis(r, v, R_E + b.ha)
          : dvToApsis(r, v, R_E + b.hp),
      b.name,
      (x) =>
        `${b.desc || "Orbit adjustment."} Δv ${Math.round(x.dv)} m/s. Orbit now ${Math.round(x.hp)} × ${Math.round(x.ha)} km.`,
      "in orbit",
    );
  }
  for (const e of cfg.scripted || [])
    M.ev(t0 + e.met * H, "ship", e.name, e.desc, e.kind || "info");
  if (cfg.iss) issRendezvous(ops);
  if (cfg.deploy) payloadDeploy(ops);
  return shuttleReturn(ops, tIns);
}
// rename and add the Shuttle's ascent milestones

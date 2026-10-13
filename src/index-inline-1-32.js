// index-inline-1 32 — best
// Lines 11249-11547 of readable/index-inline-1.pretty.js (statement-aligned).
function departPlanet(
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
  tDepNom,
  ret,
  progress,
  fromHighOrbit,
) {
  const H = 3600,
    D = 86400,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  progress("Trans-Earth injection targeting…");
  const el = rv2coe(r, v, mu);
  // find TEI point: minimise impulsive Δv to reach the outgoing asymptote, over the orbit before nominal departure
  const per = el.period;
  const dvAt = (tb) => {
    const s = kepProp(r, v, tb - t, mu),
      rn = vnorm(s.r);
    const hh = vunit(vcross(s.r, s.v));
    // hyperbola through s.r with asymptote along vinfOut (projected into a plane containing r and v∞)
    const Sx = vunit(vinfOut);
    let hq = vunit(vcross(s.r, Sx));
    if (vdot(hq, hh) < 0) hq = vscale(hq, -1);
    const thr = Math.atan2(
      vdot(vcross(vunit(s.r), Sx), hq),
      vdot(vunit(s.r), Sx),
    ); // angle from r to asymptote
    const vi = vnorm(vinfOut);
    const f = (e) => {
      const nuI = Math.acos(-1 / e);
      const nuR = nuI - thr;
      const p = ((e * e - 1) * mu) / (vi * vi);
      return rn * (1 + e * Math.cos(nuR)) - p;
    };
    const e = bisectRoot(f, 1.0001, 50) ?? 1.5;
    const nuI = Math.acos(-1 / e),
      nuR = nuI - thr,
      p = ((e * e - 1) * mu) / (vi * vi);
    const vr = Math.sqrt(mu / p) * e * Math.sin(nuR),
      vt = Math.sqrt(mu / p) * (1 + e * Math.cos(nuR));
    const vNeed = vadd(
      vscale(vunit(s.r), vr),
      vscale(vunit(vcross(hq, s.r)), vt),
    );
    return { tb, s, vNeed, dv: vnorm(vsub(vNeed, s.v)) };
  };
  let best = null;
  const tStart = Math.max(t + 0.3 * H, tDepNom - per * 1.5);
  for (let tb = tStart; tb < tStart + per * 2; tb += per / 90) {
    const o = dvAt(tb);
    if (!best || o.dv < best.dv) best = o;
  }
  const gm = goldenMin(
    (tb) => dvAt(tb).dv,
    best.tb - per / 90,
    best.tb + per / 90,
    30,
  );
  best = dvAt(gm.x);
  const tTEI = best.tb,
    sTEI = best.s;
  // Earth arrival target (entry)
  const retLeg = { ...ret, type: "entry", body: "earth" };
  const Lret =
    lambert(
      bodyPos(body, tTEI),
      bodyPos("earth", ret.t),
      ret.t - tTEI,
      MU_SUN,
      [0, 0, 1],
    ) ||
    lambert(
      bodyPos(body, tDepNom),
      bodyPos("earth", ret.t),
      ret.t - tDepNom,
      MU_SUN,
      [0, 0, 1],
    );
  let tgt = arrivalTarget(
    cfg,
    retLeg,
    vsub(Lret.v2, planetHelio("earth", ret.t).v),
    ret.t,
    SC,
    P,
    M,
  );
  const F = (x) => {
    const o = patchedLeg(
      tTEI,
      sTEI.r,
      vadd(best.vNeed, x),
      body,
      "earth",
      ret.t,
    );
    if (!o || o.miss || !o.bv) return [1e3, 1e3, 1e3];
    const ax = bPlaneAxes(o.bv.S);
    return [
      (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
      (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
      (o.tp - tgt.tp) / H / 2,
    ];
  };
  const s1 = newtonSolve(
    (x) =>
      vscale(
        centreMiss(tTEI, sTEI.r, vadd(best.vNeed, x), body, "earth", tgt.tp),
        1e-4,
      ),
    [0, 0, 0],
    { h: 1e-7, tol: 1e-3, maxIt: 30, maxStep: 0.1 },
  );
  let sol = newtonSolve(F, s1.x, {
    h: 1e-7,
    tol: 1e-3,
    maxIt: 30,
    maxStep: 0.05,
  });
  for (let k = 0; k < 2; k++) {
    const o = patchedLeg(
      tTEI,
      sTEI.r,
      vadd(best.vNeed, sol.x),
      body,
      "earth",
      ret.t,
    );
    if (!o || o.miss) break;
    tgt = arrivalTarget(cfg, retLeg, vscale(o.bv.S, o.bv.vinf), o.tp, SC, P, M);
    sol = newtonSolve(F, sol.x, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.05,
    });
  }
  if (!sol.ok)
    M.warnings.push(
      `Earth-return targeting converged approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  const vPost = vadd(best.vNeed, sol.x),
    dvv = vsub(vPost, sTEI.v);
  const engId = SC.usesUpperStage ? "upper" : SC.prop.orbiter;
  const pm = P.burn(engId, mass, vnorm(dvv));
  ship.add(
    new ConicSeg(body, t, tTEI - pm.dur / 2, r, v, mass, {
      extra: { phase: `${BODIES[body].name} orbit` },
    }),
  );
  ship.add(
    new BurnSeg(
      body,
      tTEI,
      pm.dur,
      sTEI.r,
      sTEI.v,
      vadd(sTEI.v, vscale(dvv, pm.dvAch / vnorm(dvv))),
      mass,
      mass - pm.prop,
      pm.thrust,
      { extra: { phase: "trans-Earth injection", stage: engId } },
    ),
  );
  M.burn({
    name: "TEI — trans-Earth injection",
    t: tTEI - pm.dur / 2,
    dur: pm.dur,
    dv: pm.dvAch * 1000,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: mass,
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tTEI - pm.dur / 2,
    "ship",
    "Trans-Earth injection",
    `Escape burn toward Earth: v∞ = ${vnorm(vinfOut).toFixed(2)} km/s. Δv ${(pm.dvAch * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  if (!pm.ok)
    M.warnings.push("Insufficient propellant for trans-Earth injection.");
  M.phase(t - 2 * H, tTEI, `${BODIES[body].name} orbit`, "#43aa8b");
  mass -= pm.prop;
  const tPost = tTEI + pm.dur / 2,
    sP = kepProp(
      sTEI.r,
      vadd(sTEI.v, vscale(dvv, pm.dvAch / vnorm(dvv))),
      pm.dur / 2,
      mu,
    );
  const nodes2 = [{ body, t: tTEI }, retLeg];
  return cruiseAndArrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes2,
    [{}],
    0,
    tPost,
    sP.r,
    sP.v,
    body,
    mass,
    tgt,
    progress,
  );
}
// --------------------------------------------------------------------------
// porkchop: departure/arrival grid → C3 (km²/s²) and arrival v∞ (km/s)
function porkchop(from, to, tDep0, tDep1, tof0, tof1, nx = 60, ny = 60) {
  const out = {
    nx,
    ny,
    tDep0,
    tDep1,
    tof0,
    tof1,
    c3: new Float32Array(nx * ny),
    vinf: new Float32Array(nx * ny),
  };
  for (let i = 0; i < nx; i++) {
    const td = tDep0 + ((tDep1 - tDep0) * i) / (nx - 1),
      a = planetHelio(from, td);
    for (let j = 0; j < ny; j++) {
      const tof = tof0 + ((tof1 - tof0) * j) / (ny - 1),
        b = planetHelio(to, td + tof);
      const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
      if (!L) {
        out.c3[j * nx + i] = NaN;
        out.vinf[j * nx + i] = NaN;
        continue;
      }
      const d = vsub(L.v1, a.v),
        e = vsub(L.v2, b.v);
      out.c3[j * nx + i] = vdot(d, d);
      out.vinf[j * nx + i] = vnorm(e);
    }
  }
  return out;
}
function bestTransfer(from, to, tDep0, tDep1, tof0, tof1, wArr = 1) {
  const f = (x) => {
    const td = x[0],
      tof = x[1];
    if (tof < tof0 || tof > tof1 || td < tDep0 || td > tDep1) return 1e9;
    const a = planetHelio(from, td),
      b = planetHelio(to, td + tof);
    const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
    if (!L) return 1e9;
    const d = vsub(L.v1, a.v),
      e = vsub(L.v2, b.v);
    return vdot(d, d) + wArr * vdot(e, e);
  };
  let best = null;
  for (let i = 0; i <= 30; i++)
    for (let j = 0; j <= 30; j++) {
      const x = [
        tDep0 + ((tDep1 - tDep0) * i) / 30,
        tof0 + ((tof1 - tof0) * j) / 30,
      ];
      const v = f(x);
      if (!best || v < best.v) best = { x, v };
    }
  const nm = nelderMead(f, best.x, [(tDep1 - tDep0) / 30, (tof1 - tof0) / 30], {
    maxIt: 200,
    tol: 1e-10,
  });
  const td = nm.x[0],
    tof = nm.x[1],
    a = planetHelio(from, td),
    b = planetHelio(to, td + tof);
  const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
  return {
    tDep: td,
    tArr: td + tof,
    tof,
    c3: vdot(vsub(L.v1, a.v), vsub(L.v1, a.v)),
    vinfArr: vnorm(vsub(L.v2, b.v)),
  };
}

// ---------------------------------------------------------------------------
// Sample-return orbiter: separates on approach, diverts, captures, aerobrakes to a low orbit and waits

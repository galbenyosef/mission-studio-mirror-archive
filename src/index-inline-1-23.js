// index-inline-1 23 — math
// Lines 8720-9034 of readable/index-inline-1.pretty.js (statement-aligned).
const MU_SUN = BODIES.sun.mu;
function soiOf(b) {
  return BODIES[b].soi || 1e6;
}
// time (s) after the current state until |r| reaches R (outbound, hyperbolic or elliptic), Kepler
function timeToRadius(r, v, mu, R, outbound = true) {
  const el = rv2coe(r, v, mu);
  const e = el.e,
    a = el.a;
  if (e > 1) {
    const cF = (1 - R / a) / e;
    if (cF < 1) return null;
    const F1 = Math.acosh(cF) * (outbound ? 1 : -1);
    const nu0 = el.nu > Math.PI ? el.nu - TAU : el.nu;
    const F0 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu0 / 2));
    const n = Math.sqrt(mu / (-a * a * a));
    const M0 = e * Math.sinh(F0) - F0,
      M1 = e * Math.sinh(F1) - F1;
    return (M1 - M0) / n;
  }
  // ellipse: first crossing of radius R (in either direction) within one period
  const P = el.period,
    rad = (tt) => vnorm(kepProp(r, v, tt, mu).r) - R;
  const s0 = Math.sign(rad(1e-3));
  const N = 720;
  let prev = 1e-3,
    fp = rad(prev);
  for (let i = 1; i <= N; i++) {
    const tt = (P * i) / N,
      f = rad(tt);
    if (Math.sign(f) !== Math.sign(fp)) {
      let lo = prev,
        hi = tt;
      for (let k = 0; k < 80; k++) {
        const m = 0.5 * (lo + hi);
        if (Math.sign(rad(m)) === Math.sign(fp)) lo = m;
        else hi = m;
      }
      return 0.5 * (lo + hi);
    }
    prev = tt;
    fp = f;
  }
  return null;
}
function timeToPeri(r, v, mu) {
  // time from state to periapsis (negative if periapsis is behind)
  const el = rv2coe(r, v, mu);
  let nu = el.nu > Math.PI ? el.nu - TAU : el.nu;
  return -timeSincePeri(el.e, el.a, nu, mu);
}
// heliocentric coast: find time of entry into target SOI after tStart, within [tStart, tMax]
function findSOIEntry(t0, rH, vH, target, tGuess, tMax) {
  const R = soiOf(target);
  const d = (t) => {
    const s = kepProp(rH, vH, t - t0, MU_SUN);
    return vnorm(vsub(s.r, bodyPos(target, t))) - R;
  };
  // coarse scan around guess
  const step = 3 * 3600;
  let a = Math.max(t0 + 60, tGuess - 40 * 86400),
    fa = d(a);
  for (let t = a + step; t <= Math.min(tMax, tGuess + 40 * 86400); t += step) {
    const ft = d(t);
    if (fa > 0 && ft <= 0) {
      let lo = t - step,
        hi = t;
      for (let k = 0; k < 60; k++) {
        const m = 0.5 * (lo + hi);
        if (d(m) > 0) lo = m;
        else hi = m;
      }
      return 0.5 * (lo + hi);
    }
    fa = ft;
    a = t;
  }
  return null;
}
// minimum distance to target in a window (for diagnostics / misses)
function closestApproachHelio(t0, rH, vH, target, ta, tb) {
  const f = (t) => {
    const s = kepProp(rH, vH, t - t0, MU_SUN);
    return vnorm(vsub(s.r, bodyPos(target, t)));
  };
  let best = { t: ta, d: f(ta) };
  const st = (tb - ta) / 400;
  for (let t = ta; t <= tb; t += st) {
    const dd = f(t);
    if (dd < best.d) best = { t, d: dd };
  }
  const g = goldenMin(f, best.t - st, best.t + st, 40);
  return { t: g.x, d: g.f };
}
// position miss vector (km) at time tArr of the heliocentric conic after SOI exit, w.r.t. target centre
function centreMiss(tB, rRel, vRel, depBody, target, tArr) {
  const muD = BODIES[depBody].mu,
    dtx = timeToRadius(rRel, vRel, muD, soiOf(depBody));
  if (dtx == null) return [1e9, 1e9, 1e9];
  const sX = kepProp(rRel, vRel, dtx, muD),
    pD = planetHelio(depBody, tB + dtx);
  const s = kepProp(
    vadd(pD.r, sX.r),
    vadd(pD.v, sX.v),
    tArr - (tB + dtx),
    MU_SUN,
  );
  return vsub(s.r, bodyPos(target, tArr));
}
// propagate from planet-relative departure state (after burn) through SOI exit → heliocentric → target SOI entry
function patchedLeg(tB, rRel, vRel, depBody, target, tArrGuess) {
  const muD = BODIES[depBody].mu;
  const dtx = timeToRadius(rRel, vRel, muD, soiOf(depBody));
  if (dtx == null) return null;
  const tX = tB + dtx,
    sX = kepProp(rRel, vRel, dtx, muD);
  const pD = planetHelio(depBody, tX);
  const rH = vadd(pD.r, sX.r),
    vH = vadd(pD.v, sX.v);
  const tE = findSOIEntry(
    tX,
    rH,
    vH,
    target,
    tArrGuess,
    tArrGuess + 120 * 86400,
  );
  if (tE == null) return { tX, rH, vH, miss: true };
  const sE = kepProp(rH, vH, tE - tX, MU_SUN),
    pT = planetHelio(target, tE);
  const rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v);
  const muT = BODIES[target].mu;
  const bv = bVector(rT, vT, muT);
  const tp = tE + timeToPeri(rT, vT, muT);
  const elT = rv2coe(rT, vT, muT);
  return { tX, rH, vH, tE, rT, vT, bv, tp, rp: elT.rp, el: elT };
}
// same but starting heliocentric (after a flyby or TCM)
function patchedHelio(t0, rH, vH, target, tArrGuess) {
  const tE = findSOIEntry(
    t0,
    rH,
    vH,
    target,
    tArrGuess,
    tArrGuess + 120 * 86400,
  );
  if (tE == null) return { miss: true };
  const sE = kepProp(rH, vH, tE - t0, MU_SUN),
    pT = planetHelio(target, tE);
  const rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v),
    muT = BODIES[target].mu;
  return {
    tE,
    rT,
    vT,
    bv: bVector(rT, vT, muT),
    tp: tE + timeToPeri(rT, vT, muT),
    rp: rv2coe(rT, vT, muT).rp,
  };
}
function bPlaneAxes(S) {
  const k = [0, 0, 1];
  const T = vunit(vcross(S, k));
  return { T, R: vcross(S, T) };
}
// arrival design for direct entry / landing at a surface site
function entryGeometry(
  body,
  vinfVec,
  rEI,
  fpaDeg_,
  thetaRange,
  Tentry,
  site,
  tLandGuess,
  win = 0.55 * 86400,
) {
  const mu = BODIES[body].mu,
    vinf = vnorm(vinfVec),
    S = vunit(vinfVec);
  const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI),
    g = fpaDeg_ * DEG;
  const h = rEI * vEI * Math.cos(g),
    e = Math.sqrt(1 + (vinf * vinf * h * h) / (mu * mu)),
    p = (h * h) / mu;
  const rp = p / (1 + e),
    nuInf = Math.acos(-1 / e);
  const nuEI = -Math.acos(clamp((p / rEI - 1) / e, -1, 1));
  const beta = nuInf + nuEI + thetaRange; // angle from incoming position direction (-S) to landing point
  const sDir = (t) =>
    vunit(sitePosEcl(body, site.lat, site.lon, site.elev || 0, t));
  const f = (t) => vdot(sDir(t), vscale(S, -1)) - Math.cos(beta);
  let best = null;
  const st = 300;
  for (let t = tLandGuess - win; t < tLandGuess + win; t += st) {
    const a = f(t),
      b = f(t + st);
    if (a * b <= 0) {
      const r = bisectRoot(f, t, t + st, 50);
      if (
        r != null &&
        (!best || Math.abs(r - tLandGuess) < Math.abs(best - tLandGuess))
      )
        best = r;
    }
  }
  let tLand = best,
    approx = false;
  if (tLand == null) {
    // latitude not reachable: take the closest approach
    const gm = goldenMin(
      (t) => Math.abs(f(t)),
      tLandGuess - win,
      tLandGuess + win,
      60,
    );
    tLand = gm.x;
    approx = true;
  }
  const sd = sDir(tLand);
  let hh = vunit(vcross(vscale(S, -1), sd));
  if (vnorm(hh) < 1e-9) hh = vperp(S);
  // time from EI to periapsis on hyperbola
  const a = -mu / (vinf * vinf);
  const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nuEI / 2));
  const tEItoP = -(e * Math.sinh(F) - F) / Math.sqrt(mu / (-a * a * a));
  const tEI = tLand - Tentry;
  return {
    tLand,
    tEI,
    tp: tEI + tEItoP,
    hhat: hh,
    rp,
    e,
    B: vscale(vunit(vcross(S, hh)), bFromRp(rp, vinf, mu)),
    approx,
    beta,
  };
}
// reference EDL to get entry range & duration
function marsEntryRef(SC, P, vEI, fpa, bank) {
  const edl = SC.edl,
    R = surfaceRadius("mars");
  const r0 = [R + 125, 0, 0],
    v0 = [vEI * Math.sin(fpa * DEG), vEI * Math.cos(fpa * DEG), 0];
  const res = runMarsEDL(
    SC,
    P,
    0,
    r0,
    v0,
    bank,
    { lat: 0, lon: 0, elev: 0 },
    true,
  );
  return { range: vangle(r0, res.r), dur: res.t, res };
}
function entryMassOf(SC, P) {
  return P.massOf(SC.entry || SC.orbiter);
}
function runMarsEDL(SC, P, t0, r0, v0, bank, site, refOnly) {
  const edl = SC.edl,
    mE = SC.entry
      ? P.massOf(SC.entry)
      : P.massOf(SC.orbiter) +
        (P.upper && P.upper.attached ? P.upper.dry + P.upper.propLeft : 0);
  const landId = SC.prop.lander;
  const eng = landId
    ? P.engineOf(landId)
    : SC.usesUpperStage
      ? { thrust: 3 * 2.3e6, isp: 330, minThr: 0.4 }
      : null;
  const opt = {
    body: "mars",
    t0,
    r0,
    v0,
    m0: mE,
    diam: edl.diam,
    cd: edl.cd,
    LD: edl.LD,
    rn: edl.rn,
    bank,
    siteElev: site.elev || 0,
    maxTime: 2400,
  };
  if (edl.propulsive) {
    opt.propulsiveLanding = { ignAlt: 9, bellyCdA: 1.0 * 9 * 50 };
    opt.land = { Tmax: eng.thrust, isp: eng.isp, minThr: 0.08 };
  } else {
    opt.edl = edl;
    opt.heatshieldMass =
      edl.heatshieldMass ??
      (SC.modules.AEROSHELL
        ? 440
        : SC.modules.CAPS
          ? SC.modules.CAPS.dry * 0.45
          : 300);
    opt.backshellMass =
      edl.backshellMass ??
      (SC.modules.AEROSHELL
        ? SC.modules.AEROSHELL.dry - 440
        : SC.modules.CAPS
          ? SC.modules.CAPS.dry * 0.55
          : 300);
    opt.land = { Tmax: eng.thrust, isp: eng.isp, minThr: eng.minThr || 0.1 };
  }
  return simulateEntry(opt);
}
// A Mars entry capsule's shells once they let go: the entry vehicle without its heat shield, the platform or descent stage
// inside showing (and a trim wing out, edl.trimWing, from when it swung out); the heat shield falling away and the
// backshell coming down on its parachute, each through the air from where it let go to where it lies.

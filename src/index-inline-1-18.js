// index-inline-1 18 — mode
// Lines 5824-6088 of readable/index-inline-1.pretty.js (statement-aligned).
function seleno(t, y) {
  const m = moonGeo(t);
  return {
    r: [y[0] - m.r[0], y[1] - m.r[1], y[2] - m.r[2]],
    v: [y[3] - m.v[0], y[4] - m.v[1], y[5] - m.v[2]],
  };
}
function geoFromSeleno(t, r, v) {
  const m = moonGeo(t);
  return { r: vadd(r, m.r), v: vadd(v, m.v) };
}
// samples for a geocentric result
function resToSeg(res, phase, extra = {}, burn = null) {
  const S = integToSamples(res, (t, y) =>
    burn
      ? {
          phase,
          ...extra,
          T: burn.T,
          thrDir: burn.law(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]]),
        }
      : { phase, ...extra },
  );
  return new SampleSeg("earth", S, { phase });
}
// local thrust-direction law: keep the angle relative to (v, r⊥, h) frame fixed (as in a guided burn)
function localDirLaw(r, v, dirAtStart, center = "earth") {
  const fr = (rr, vv) => {
    const e1 = vunit(vv);
    let e2 = vsub(vunit(rr), vscale(e1, vdot(vunit(rr), e1)));
    e2 = vunit(e2);
    const e3 = vcross(e1, e2);
    return [e1, e2, e3];
  };
  const [a, b, c] = fr(r, v);
  const comp = [vdot(dirAtStart, a), vdot(dirAtStart, b), vdot(dirAtStart, c)];
  return (t, rr, vv) => {
    let R = rr,
      V = vv;
    if (center === "moon") {
      const m = moonGeo(t);
      R = vsub(rr, m.r);
      V = vsub(vv, m.v);
    }
    const [e1, e2, e3] = fr(R, V);
    return vunit(
      vadd(vadd(vscale(e1, comp[0]), vscale(e2, comp[1])), vscale(e3, comp[2])),
    );
  };
}
// finite burn with secant search on duration so that `metric(yEnd)` hits 0. startState(tIgn) -> y
function finiteBurn({
  tCenter,
  startState,
  engine,
  dirLaw,
  D0,
  metric,
  maxProp,
  maxIt = 8,
  fixedStart = null,
}) {
  const mdot = engine.thrust / (engine.isp * G0);
  const run = (D) => {
    const tIgn = fixedStart ?? tCenter - D / 2;
    const y0 = startState(tIgn);
    const law = dirLaw(tIgn, y0);
    const res = cisInt(tIgn, y0, tIgn + D, {
      thrust: { T: engine.thrust, mdot, dir: law },
      hmax: 20,
      h0: 1,
    });
    return {
      res,
      tIgn,
      err: metric(res.y[res.y.length - 1], tIgn + D),
      burn: { T: engine.thrust, law },
    };
  };
  const Dmax = maxProp / mdot;
  let D1 = Math.min(D0, Dmax),
    r1 = run(D1);
  let D2 = Math.min(D1 * 1.03 + 1, Dmax),
    r2 = run(D2);
  for (let i = 0; i < maxIt && Math.abs(r2.err) > 1e-7; i++) {
    const dd = r2.err - r1.err;
    if (Math.abs(dd) < 1e-15) break;
    let D3 = D2 - (r2.err * (D2 - D1)) / dd;
    D3 = clamp(D3, 0.2 * D2, Math.min(3 * D2 + 5, Dmax));
    D1 = D2;
    r1 = r2;
    D2 = D3;
    r2 = run(D2);
    if (D2 >= Dmax - 1e-6 && r2.err < 0) break;
  }
  return { D: D2, ...r2, short: D2 >= Dmax - 1e-6 && Math.abs(r2.err) > 1e-4 };
}
const energyGeo = (y) =>
  (y[3] * y[3] + y[4] * y[4] + y[5] * y[5]) / 2 -
  MU_E / Math.hypot(y[0], y[1], y[2]);
function energySel(t, y) {
  const s = seleno(t, y);
  return vdot(s.v, s.v) / 2 - MU_M / vnorm(s.r);
}
function vacPerigee(r, v) {
  const el = rv2coe(r, v, MU_E);
  return el.rp;
}
function fpaDeg(r, v) {
  return Math.asin(clamp(vdot(vunit(r), vunit(v)), -1, 1)) * RAD;
}

// entry reference (range & duration) for a capsule
function entryReference(capsule, vEI = 11.0, fpa = -6.5, bank = 55, mass) {
  const r0 = [R_E + EI_ALT, 0, 0];
  const v0 = [vEI * Math.sin(fpa * DEG), vEI * Math.cos(fpa * DEG), 0];
  // simple: equatorial; rotation small effect for reference purposes
  const res = simulateEntry({
    body: "earth",
    t0: 0,
    r0,
    v0,
    m0: mass,
    diam: capsule.heat.diam,
    cd: capsule.heat.cd,
    LD: capsule.heat.LD,
    rn: capsule.heat.rn,
    bank,
    chutes: capsule.heat.chutes,
    maxTime: 3000,
  });
  const ang = vangle(r0, res.r);
  return { range: ang, dur: res.t, res };
}
// generic arrival residuals for targeting (n-body).
// mode.type: 'bplane' (B-plane target from desired plane/far side), 'plane' (rp + site plane), 'freeReturn' (rp + return perigee), 'natural' (rp)
function moonOrbitNormal(t) {
  const m = moonGeo(t);
  return vunit(vcross(m.r, m.v));
}
function bTarget(S, hStar, rp, vinf) {
  const b = bFromRp(rp, Math.max(vinf, 0.2), MU_M);
  return vscale(vunit(vcross(S, hStar)), b);
}
function makeArrivalF(tS, yS, mode) {
  const H = 3600;
  return (dv, wantDetail) => {
    const y0 = [...yS];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    const r1 = cisIntDelayed(
      tS,
      y0,
      mode.tWin ? mode.tWin[0] : tS,
      mode.tWin ? mode.tWin[1] + 3600 : tS + 9 * 24 * H,
      [evPerilune(mode.maxD || 200000)],
      { rtol: 1e-9, atol: 1e-6, hmax: 3600 },
    );
    if (!r1.stopEvent) return wantDetail ? { fail: true } : mode.fallback;
    const tp = r1.stopEvent.t,
      ye = r1.stopEvent.y,
      sel = seleno(tp, ye);
    const rp = vnorm(sel.r),
      h = vunit(vcross(sel.r, sel.v));
    let F;
    if (mode.type === "bplane") {
      const bv = bVector(sel.r, sel.v, MU_M);
      if (!bv) return wantDetail ? { fail: true } : mode.fallback;
      const k = mode.inPlaneOnly || moonOrbitNormal(tp),
        T = vunit(vcross(bv.S, k)),
        R = vcross(bv.S, T);
      const hStar = mode.hStar(tp, bv.S);
      const Bs = bTarget(bv.S, hStar, mode.rp, bv.vinf);
      F = mode.inPlaneOnly
        ? [(vdot(bv.B, T) - vdot(Bs, T)) / 1000]
        : [
            (vdot(bv.B, T) - vdot(Bs, T)) / 1000,
            (vdot(bv.B, R) - vdot(Bs, R)) / 1000,
          ];
    } else {
      F = [(rp - mode.rp) / 50];
      if (mode.type === "plane")
        F.push(Math.asin(clamp(vdot(h, mode.planeDir(tp)), -1, 1)) * RAD * 2);
    }
    let rvp = null;
    if (mode.type === "freeReturn" || mode.withReturn) {
      const r2 = cisInt(tp, ye, tp + 8 * 24 * H, {
        events: [evPerigee(), evEI()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      const yl = r2.y[r2.y.length - 1];
      rvp = vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]);
      if (mode.type === "freeReturn") F.push((rvp - mode.rvp) / 50);
    }
    if (mode.tPeri) F.push(((tp - mode.tPeri) / H) * (mode.timeWeight ?? 1));
    return wantDetail ? { F, tp, rp, h, ye, rvp } : F;
  };
}
// desired lunar-orbit normal: plane containing site direction (if any), retrograde sense (far-side arrival)
function hStarFor(cfg, t0) {
  const H = 3600;
  const site = cfg.hybrid
    ? { lat: cfg.hybrid.lat, lon: cfg.hybrid.lon, met: cfg.hybrid.landMET }
    : cfg.landing
      ? { lat: cfg.landing.lat, lon: cfg.landing.lon, met: cfg.landMET ?? 100 }
      : null;
  return (tp, S) => {
    const kRetro = vscale(moonOrbitNormal(tp), -1);
    if (!site) {
      const hN = vsub(kRetro, vscale(S, vdot(kRetro, S)));
      return vunit(hN);
    }
    const sd = vunit(
      sitePosEcl("moon", site.lat, site.lon, 0, t0 + site.met * H),
    );
    let h = vunit(vcross(S, sd));
    if (vdot(h, kRetro) < 0) h = vscale(h, -1);
    return h;
  };
}
function arrivalMode(cfg, t0, rp, tA) {
  const H = 3600;
  if (cfg.hybrid) {
    const hs = cfg.hybrid;
    return {
      type: "plane",
      rp,
      planeDir: () =>
        vunit(sitePosEcl("moon", hs.lat, hs.lon, 0, t0 + hs.landMET * H)),
      fallback: [1e3, 1e3],
    };
  }
  if (cfg.profile === "lunar-flyby") {
    return {
      type: "freeReturn",
      rp,
      rvp: rvpFor(cfg.entry?.fpa ?? -6.5),
      fallback: [1e3, 1e3],
    };
  }
  if (cfg.landing) {
    const st = cfg.landing,
      tL = t0 + (cfg.landMET ?? 100) * H;
    return {
      type: "plane",
      rp,
      planeDir: () => vunit(sitePosEcl("moon", st.lat, st.lon, 0, tL)),
      fallback: [1e3, 1e3],
    };
  }
  return { type: "natural", rp, fallback: [1e3] };
}
function rvpFor(fpaDegV) {
  const r = R_E + EI_ALT,
    v = 11.0,
    g = fpaDegV * DEG;
  const h = r * v * Math.cos(g),
    eps = (v * v) / 2 - MU_E / r;
  const e = Math.sqrt(1 + (2 * eps * h * h) / (MU_E * MU_E));
  return (h * h) / MU_E / (1 + e);
}
// --------------------------------------------------------------------------

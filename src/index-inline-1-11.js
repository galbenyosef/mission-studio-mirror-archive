// index-inline-1 11 — opt
// Lines 3584-3793 of readable/index-inline-1.pretty.js (statement-aligned).
function optimizeAscent(base) {
  const run = (k, rec) => {
    const stack = cloneStack(base.stack);
    return simulateAscent({
      ...base,
      stack,
      kick: k,
      record: rec,
      dt: rec ? base.dt || 0.2 : 0.4,
    });
  };
  const qLim = base.qLimit || 36000;
  const score = (res) =>
    (res.ok
      ? res.upperProp + 1e5
      : -1e6 + (res.el && isFinite(res.el.rp) ? res.el.rp : 0)) -
    Math.max(0, res.maxQ - qLim) * 3 -
    (base.swingW ?? 30) * Math.max(0, (res.swing10 || 0) - 10) ** 2; // fuel first, but steering that turns more than 10° within 10 s is charged 30 kg per square degree over
  let a = 0.2,
    b = base.kickMax || 14,
    gr = (Math.sqrt(5) - 1) / 2;
  // coarse scan first
  let best = { k: base.kickGuess || 2, s: -Infinity };
  for (let k = 0.3; k <= b; k += (b - 0.3) / 13) {
    const s = score(run(k, false));
    if (s > best.s) best = { k, s };
  }
  a = Math.max(0.1, best.k - (b - 0.3) / 13);
  b = best.k + (b - 0.3) / 13;
  let c = b - gr * (b - a),
    d = a + gr * (b - a),
    fc = score(run(c, false)),
    fd = score(run(d, false));
  for (let i = 0; i < 12; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - gr * (b - a);
      fc = score(run(c, false));
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + gr * (b - a);
      fd = score(run(d, false));
    }
  }
  const kOpt = fc > fd ? c : d;
  const res = run(kOpt, true);
  res.kick = kOpt;
  return res;
}
function cloneStack(s) {
  return {
    ...s,
    stages: s.stages.map((x) => ({ ...x })),
    jettison: s.jettison.map((j) => ({ ...j })),
  };
}

// ---------------------------------------------------------------------------
// POWERED DESCENT (Moon / Mars final phase).  Frame: body-centred ECL.
// ---------------------------------------------------------------------------
function simulateDescent(opt) {
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0),
    m = opt.m0;
  const Tmax = opt.Tmax,
    ve = opt.isp * G0,
    minThr = opt.minThr ?? 0.1;
  const tgo0 = opt.tgo,
    tEnd = opt.t0 + tgo0;
  const omega = bodyOmegaEcl(body, opt.t0);
  const hover = opt.hoverAlt ?? 0.15,
    elev = opt.elev || 0;
  const samples = [],
    events = [];
  let mode = "braking",
    dt = 0.25,
    propUsed = 0,
    saturated = 0,
    steps = 0,
    landed = false;
  const site = (tt) => sitePosEcl(body, opt.lat, opt.lon, elev, tt);
  const rT0 = site(tEnd),
    upT = vunit(rT0);
  const rT = vadd(rT0, vscale(upT, hover)),
    vT = vadd(vcross(omega, rT), vscale(upT, -0.0012));
  while (steps++ < 20000) {
    const rn = vnorm(r),
      up = vunit(r);
    const ground = site(t),
      alt = vdot(vsub(r, ground), up);
    const g = vscale(r, -mu / (rn * rn * rn));
    const vrel = vsub(v, vcross(omega, r));
    let acmd;
    const tgo = tEnd - t;
    if (mode !== "terminal" && (tgo < 4 || alt < hover * 0.9)) {
      mode = "terminal";
      events.push({
        t,
        name: opt.terminalName || "Terminal descent",
        desc: "Vertical descent at ~1 m/s to touchdown.",
        kind: "terminal",
      });
    }
    if (mode !== "terminal") {
      const zem = vsub(
        rT,
        vadd(vadd(r, vscale(v, tgo)), vscale(g, 0.5 * tgo * tgo)),
      );
      const zev = vsub(vT, vadd(v, vscale(g, tgo)));
      acmd = vsub(vscale(zem, 6 / (tgo * tgo)), vscale(zev, 2 / tgo));
      if (mode === "braking" && alt < 2.5) {
        mode = "approach";
        events.push({
          t,
          name: opt.approachName || "Approach phase",
          desc: "Pitching upright — the landing site comes into view.",
          kind: "approach",
        });
      }
    } else {
      const vdes = vadd(vscale(up, -(alt > 0.03 ? 0.0012 : 0.0009)), [0, 0, 0]);
      const hz = vsub(vrel, vscale(up, vdot(vrel, up)));
      const err = vsub(vsub(vdes, vscale(up, vdot(vrel, up))), hz);
      acmd = vadd(vscale(g, -1), vscale(err, 0.6));
    }
    let amag = vnorm(acmd);
    const amax = Tmax / m / 1000,
      amin = minThr * amax;
    let dir = amag > 1e-12 ? vscale(acmd, 1 / amag) : up;
    if (amag > amax) {
      amag = amax;
      saturated += dt;
    }
    if (amag < amin) amag = amin;
    const T = amag * m * 1000,
      mdot = T / ve;
    if (samples.length === 0 || t - samples[samples.length - 1].t >= 0.999)
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T,
        thrDir: dir,
        alt,
        phase: mode,
        D: [0, 0, 0],
      });
    if (alt <= 0.0005 && t > opt.t0 + 5) {
      landed = true;
      break;
    }
    if (m - mdot * dt < opt.dryLimit) {
      events.push({
        t,
        name: "Propellant depleted",
        desc: "Descent propellant exhausted before touchdown.",
        kind: "fail",
      });
      break;
    }
    // integrate (semi-implicit RK2)
    const a1 = vadd(g, vscale(dir, amag));
    const rm = vaddScaled(r, v, dt / 2),
      vm = vaddScaled(v, a1, dt / 2);
    const rmn = vnorm(rm),
      gm = vscale(rm, -mu / (rmn * rmn * rmn));
    const a2 = vadd(gm, vscale(dir, (amag * m) / (m - (mdot * dt) / 2)));
    r = vaddScaled(r, vm, dt);
    v = vaddScaled(v, a2, dt);
    m -= mdot * dt;
    propUsed += mdot * dt;
    t += dt;
  }
  const ll = subPointLL(body, r, t);
  const miss = vnorm(vsub(r, site(t))) - 0;
  events.push({
    t,
    name: landed ? "Touchdown" : "Descent ended",
    desc: landed
      ? `Touchdown at ${ll[0].toFixed(3)}°, ${ll[1].toFixed(3)}° — ${miss.toFixed(2)} km from the planned site.`
      : "Descent did not complete.",
    kind: "touchdown",
  });
  samples.push({
    t,
    r: vcopy(r),
    v: vcopy(v),
    m,
    T: 0,
    thrDir: vunit(r),
    alt: 0,
    phase: "landed",
    D: [0, 0, 0],
  });
  return { landed, t, r, v, m, propUsed, samples, events, miss, saturated, ll };
}

// ---------------------------------------------------------------------------
// ATMOSPHERIC ENTRY.  opt: body, t0, r0, v0 (body-centred ECL), m0, diam, cd, LD, rn, bank (deg),
// skip (bool), chutes ('apollo'|'orion'|'probe'|'none'), edl (Mars descent config), siteElev, landing {Tmax, isp...}
// ---------------------------------------------------------------------------

// index-inline-1 13 — math
// Lines 4226-4485 of readable/index-inline-1.pretty.js (statement-aligned).
function gcAngle(lat1, lon1, lat2, lon2) {
  const a = llToBF(lat1, lon1),
    b = llToBF(lat2, lon2);
  return vangle(a, b);
}
// ---------------------------------------------------------------------------
// Two-burn ascent for short, high-thrust vehicles (e.g. Mars Ascent Vehicle):
// gravity turn until apoapsis = target, coast to apoapsis, circularise.
// ---------------------------------------------------------------------------
function simulateTwoBurnAscent(opt) {
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const run = (kickDeg, record) => {
    const st = { ...opt.stack.stages[0] };
    let prop = st.propMass;
    const mass = () => st.dry + prop + (opt.stack.payload || 0);
    const t0 = opt.t0,
      Rb = R + (opt.siteElev || 0),
      omega = bodyOmegaEcl(body, t0);
    let r = vscale(vunit(sitePosEcl(body, opt.lat, opt.lon, 0, t0)), Rb),
      v = vcross(omega, r),
      t = t0;
    const lf0 = localFrame(body, r, t0),
      nT = vunit(opt.target.normal);
    let dIn = vunit(
      vsub(
        vcross(nT, lf0.up),
        vscale(lf0.up, vdot(vcross(nT, lf0.up), lf0.up)),
      ),
    );
    const azI = Math.atan2(vdot(dIn, lf0.east), vdot(dIn, lf0.north));
    const vOrb = Math.sqrt(mu / (R + opt.target.hp)),
      vEq = vdot(v, lf0.east);
    const azR = Math.atan2(vOrb * Math.sin(azI) - vEq, vOrb * Math.cos(azI));
    const raT = R + opt.target.ha,
      rpT = R + opt.target.hp;
    const ve = st.ispVac * G0,
      mdot = st.thrustVac / ve,
      dt = 0.1;
    const samples = [];
    const events = [];
    let phase = "vertical",
      ok = false;
    const push = (T, dir) => {
      if (
        record &&
        (!samples.length || t - samples[samples.length - 1].t >= 0.999)
      )
        samples.push({
          t,
          r: vcopy(r),
          v: vcopy(v),
          m: mass(),
          T,
          thrDir: dir ? vcopy(dir) : null,
          alt: vnorm(r) - R,
          phase,
        });
    };
    const step = (dir, thrust) => {
      const acc = (rr, vv, mm) => {
        const n = vnorm(rr);
        let a = vscale(rr, -mu / (n * n * n));
        if (thrust) a = vadd(a, vscale(dir, st.thrustVac / mm / 1000));
        return a;
      };
      const m0 = mass(),
        m1 = thrust ? m0 - mdot * dt : m0;
      const k1v = acc(r, v, m0),
        k1r = v;
      const k2v = acc(
          vaddScaled(r, k1r, dt / 2),
          vaddScaled(v, k1v, dt / 2),
          (m0 + m1) / 2,
        ),
        k2r = vaddScaled(v, k1v, dt / 2);
      const k3v = acc(
          vaddScaled(r, k2r, dt / 2),
          vaddScaled(v, k2v, dt / 2),
          (m0 + m1) / 2,
        ),
        k3r = vaddScaled(v, k2v, dt / 2);
      const k4v = acc(vaddScaled(r, k3r, dt), vaddScaled(v, k3v, dt), m1),
        k4r = vaddScaled(v, k3v, dt);
      r = vadd(
        r,
        vscale(
          vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)),
          dt / 6,
        ),
      );
      v = vadd(
        v,
        vscale(
          vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)),
          dt / 6,
        ),
      );
      if (thrust) prop -= mdot * dt;
      t += dt;
    };
    // burn 1
    for (let i = 0; i < 20000 && prop > 0; i++) {
      const lf = localFrame(body, r, t),
        tf = t - t0;
      const vrel = vsub(v, vcross(omega, r));
      let dir;
      const az = vadd(
        vscale(lf.north, Math.cos(azR)),
        vscale(lf.east, Math.sin(azR)),
      );
      if (tf < (opt.vert ?? 3)) {
        dir = lf.up;
        phase = "vertical";
      } else if (tf < (opt.vert ?? 3) + 4) {
        const k = (kickDeg * DEG * (tf - (opt.vert ?? 3))) / 4;
        dir = vunit(vadd(vscale(lf.up, Math.cos(k)), vscale(az, Math.sin(k))));
        phase = "pitchover";
      } else {
        const g = Math.asin(clamp(vdot(vunit(vrel), lf.up), -1, 1));
        dir = vunit(vadd(vscale(lf.up, Math.sin(g)), vscale(az, Math.cos(g))));
        phase = "gravity turn";
      }
      push(st.thrustVac, dir);
      const el = rv2coe(r, v, mu);
      if (el.e < 1 && el.ra >= raT) break;
      step(dir, true);
      if (vnorm(r) < Rb - 0.05) return { ok: false, prop, samples, events };
    }
    events.push({
      t,
      name: "First burn cutoff",
      desc: "Apoapsis now at the target altitude; coasting up.",
      kind: "staging",
    });
    // coast to apoapsis
    phase = "coast to apoapsis";
    const dtA =
      timeToPeri(r, v, mu) +
      Math.PI * Math.sqrt(Math.pow(rv2coe(r, v, mu).a, 3) / mu);
    let dtc = dtA;
    if (dtc < 0)
      dtc += 2 * Math.PI * Math.sqrt(Math.pow(rv2coe(r, v, mu).a, 3) / mu);
    const tc0 = t,
      rc0 = r,
      vc0 = v;
    for (let tt = 0; tt < dtc; tt += 5) {
      const s = kepProp(rc0, vc0, tt, mu);
      r = s.r;
      v = s.v;
      t = tc0 + tt;
      push(0, null);
    }
    {
      const s = kepProp(rc0, vc0, dtc, mu);
      r = s.r;
      v = s.v;
      t = tc0 + dtc;
    }
    // burn 2: circularise (horizontal, in-plane)
    phase = "circularisation";
    events.push({
      t,
      name: "Circularisation burn",
      desc: "At apoapsis the second burn raises the periapsis out of the atmosphere.",
      kind: "ignition",
    });
    for (let i = 0; i < 20000 && prop > 0; i++) {
      const el = rv2coe(r, v, mu);
      if (el.rp >= rpT) {
        ok = true;
        break;
      }
      const hd = vunit(vcross(vunit(vcross(r, v)), vunit(r)));
      push(st.thrustVac, hd);
      step(hd, true);
    }
    const el = rv2coe(r, v, mu);
    if (el.rp >= rpT - 5) ok = true;
    events.push({
      t,
      name: ok ? "Orbit insertion" : "Insufficient performance",
      desc: ok
        ? `Orbit ${(el.rp - R).toFixed(0)} × ${(el.ra - R).toFixed(0)} km.`
        : "Propellant exhausted before reaching orbit.",
      kind: ok ? "insertion" : "fail",
    });
    return {
      ok,
      prop,
      samples,
      events,
      t,
      r,
      v,
      m: mass(),
      hpAch: el.rp - R,
      haAch: el.ra - R,
      el,
    };
  };
  let best = null;
  for (let k = 5; k <= 80; k += 5) {
    const o = run(k, false);
    const sc = (o.ok ? 1e4 : 0) + o.prop;
    if (!best || sc > best.sc) best = { k, sc };
  }
  const g = goldenMin(
    (k) => {
      const o = run(k, false);
      return -((o.ok ? 1e4 : 0) + o.prop);
    },
    Math.max(1, best.k - 5),
    Math.min(85, best.k + 5),
    14,
  );
  const res = run(g.x, true);
  res.kick = g.x;
  res.stack = { stages: [{ propLeft: res.prop }] };
  return res;
}

// ---------------------------------------------------------------------------
// WINGED ENTRY (Space Shuttle orbiter), from entry interface to terminal area energy management (TAEM, about
// Mach 2.5 at 25 km). The angle of attack follows the flight schedule: 40° until about Mach 13, easing to about 14°
// at TAEM. The bank angle is the guidance. Its size sets how quickly the orbiter sinks into denser air (more bank,
// less vertical lift, more drag), re-planned every few seconds by predicting the range still to fly. Its sign steers
// toward the runway and flips, in a roll reversal, whenever the heading error grows past a deadband.
// opt: t0, r0, v0 (Earth-centred ECL), m0, S (m²), rn (m), target {lat, lon, elev}, rTaem (km before the target),
//      vTaem (km/s), blackout (bool), maxTime
// ---------------------------------------------------------------------------
function shuttleAlpha(vRel) {
  // deg, from the Earth-relative speed (km/s)
  if (vRel >= 4.2) return 40;
  if (vRel <= 0.76) return 14;
  if (vRel >= 1.4) return 22 + (18 * (vRel - 1.4)) / 2.8;
  return 14 + (8 * (vRel - 0.76)) / 0.64;
}
const SHUTTLE_AERO = [
  [14, 0.48, 0.25],
  [22, 0.62, 0.4],
  [30, 0.78, 0.62],
  [40, 0.84, 0.84],
  [45, 0.86, 1.0],
]; // alpha°, CL, CD (hypersonic, S = 249.9 m²)
function shuttleAero(alphaDeg) {
  const T = SHUTTLE_AERO;
  if (alphaDeg <= T[0][0]) return { CL: T[0][1], CD: T[0][2] };
  for (let i = 0; i < T.length - 1; i++)
    if (alphaDeg <= T[i + 1][0]) {
      const f = (alphaDeg - T[i][0]) / (T[i + 1][0] - T[i][0]);
      return {
        CL: T[i][1] + f * (T[i + 1][1] - T[i][1]),
        CD: T[i][2] + f * (T[i + 1][2] - T[i][2]),
      };
    }
  const L = T[T.length - 1];
  return { CL: L[1], CD: L[2] };
}

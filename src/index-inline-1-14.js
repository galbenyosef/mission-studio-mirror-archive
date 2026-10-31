// index-inline-1 14 — opt
// Lines 4486-4799 of readable/index-inline-1.pretty.js (statement-aligned).
function simulateWingedEntry(opt) {
  const mu = BODIES.earth.mu,
    R = BODIES.earth.R,
    kSG = 1.7415e-4,
    S = opt.S || 249.9,
    rn = opt.rn || 1.0;
  const omega = bodyOmegaEcl("earth", opt.t0),
    m = opt.m0;
  const vTaem = opt.vTaem ?? 0.76,
    rTaem = opt.rTaem ?? 96;
  const tgt = opt.target,
    tgtAt = (tt) => vunit(sitePosEcl("earth", tgt.lat, tgt.lon, 0, tt));
  // aerodynamic acceleration (km/s²) for a state and a bank angle (rad, + = lift to the right)
  const aero = (rr, vv, bank, planar) => {
    const rnorm = vnorm(rr),
      h = rnorm - R,
      at = earthAtmos(h);
    const vr = vsub(vv, vcross(omega, rr)),
      vrn = vnorm(vr);
    if (vrn < 1e-9 || at.rho <= 0)
      return { a: [0, 0, 0], q: 0, mach: 0, rho: 0, vrn, alpha: 40, D: 0 };
    const vms = vrn * 1000,
      q = 0.5 * at.rho * vms * vms,
      alpha = shuttleAlpha(vrn),
      co = shuttleAero(alpha);
    const D = (q * co.CD * S) / m / 1000,
      Lf = (q * co.CL * S) / m / 1000;
    const vh = vscale(vr, 1 / vrn);
    let up = vsub(vscale(rr, 1 / rnorm), vscale(vh, vdot(rr, vh) / rnorm));
    up = vunit(up);
    const side = vcross(vh, up),
      ld = planar
        ? vscale(up, Math.cos(bank))
        : vadd(vscale(up, Math.cos(bank)), vscale(side, Math.sin(bank)));
    return {
      a: vadd(vscale(vh, -D), vscale(ld, Lf)),
      q,
      mach: vms / (at.a || 300),
      rho: at.rho,
      vrn,
      alpha,
      D: D * 1000,
    };
  };
  const grav = (rr) => {
    const n = vnorm(rr);
    return vscale(rr, -mu / (n * n * n));
  };
  const rk4 = (rr, vv, bank, h, planar) => {
    const acc = (r_, v_) => vadd(grav(r_), aero(r_, v_, bank, planar).a);
    const k1v = acc(rr, vv),
      k1r = vv;
    const k2r = vaddScaled(vv, k1v, h / 2),
      k2v = acc(vaddScaled(rr, k1r, h / 2), k2r);
    const k3r = vaddScaled(vv, k2v, h / 2),
      k3v = acc(vaddScaled(rr, k2r, h / 2), k3r);
    const k4r = vaddScaled(vv, k3v, h),
      k4v = acc(vaddScaled(rr, k3r, h), k4r);
    return {
      r: vadd(
        rr,
        vscale(
          vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)),
          h / 6,
        ),
      ),
      v: vadd(
        vv,
        vscale(
          vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)),
          h / 6,
        ),
      ),
    };
  };
  // fly a constant bank to TAEM speed, with the lift kept in the vertical plane (the range predictor: the bank sign
  // only steers, it is left out); return the final point and time
  // the bank is assumed to taper linearly with speed from its current value to 35° at TAEM, as entry bank angles do;
  // planning on a lighter bank late keeps steering margin for the end of the entry
  const predict = (rr, vv, tt, bank) => {
    let r = rr,
      v = vv,
      t = tt;
    const v0 = vnorm(vsub(vv, vcross(omega, rr))),
      bEnd = Math.sign(bank || 1) * 35 * DEG;
    for (let k = 0; k < 2500; k++) {
      const s = aero(r, v, 0, true);
      const h = vnorm(r) - R;
      if (s.vrn <= vTaem || h < 12) break;
      const w = clamp((s.vrn - vTaem) / Math.max(v0 - vTaem, 1e-6), 0, 1),
        bk = bEnd + (bank - bEnd) * w;
      const dt = h > 100 ? 8 : 3;
      const nx = rk4(r, v, bk, dt, true);
      r = nx.r;
      v = nx.v;
      t += dt;
    }
    return { r, t };
  };
  // range error of a prediction: distance flown minus the distance still to go to the TAEM point (+ = too far)
  const rangeErr = (rNow, pr) =>
    vangle(rNow, pr.r) * R - (vangle(rNow, tgtAt(pr.t)) * R - rTaem);
  const headingErr = (rr, vv, tt) => {
    // target bearing minus Earth-relative velocity azimuth (rad)
    const lf = localFrame("earth", rr, tt),
      vr = vsub(vv, vcross(omega, rr));
    const azV = Math.atan2(vdot(vr, lf.east), vdot(vr, lf.north));
    const uT = tgtAt(tt + (opt._tgo || 900)),
      d = vsub(uT, vscale(lf.up, vdot(uT, lf.up)));
    const azT = Math.atan2(vdot(d, lf.east), vdot(d, lf.north));
    return wrapPi(azT - azV);
  };
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0);
  const samples = [],
    events = [];
  const evt = (name, desc, kind) => events.push({ t, name, desc, kind });
  let bank = 0,
    sigMag = 60 * DEG,
    sign = 0,
    banked = false,
    reversals = 0,
    nextGuid = t,
    blackout = false;
  let maxG = 0,
    maxHeat = 0,
    maxQ = 0,
    tPeakG = t,
    tPeakHeat = t,
    mach10 = false,
    lastErr = 0;
  for (let step = 0; step < 20000; step++) {
    const s = aero(r, v, bank),
      h = vnorm(r) - R;
    const heat =
      (kSG * Math.sqrt(s.rho / rn) * Math.pow(s.vrn * 1000, 3)) / 1e4;
    const g = (vnorm(s.a) * 1000) / G0;
    if (g > maxG) {
      maxG = g;
      tPeakG = t;
    }
    if (heat > maxHeat) {
      maxHeat = heat;
      tPeakHeat = t;
    }
    if (s.q > maxQ) maxQ = s.q;
    // guidance
    if (opt.fixedBank != null) {
      banked = true;
      sign = 1;
      sigMag = opt.fixedBank;
      nextGuid = Infinity;
    }
    const climbing =
      vdot(vsub(v, vcross(omega, r)), vunit(r)) > 0 &&
      h < 100 &&
      t - opt.t0 > 60;
    if (!banked && (s.D >= 0.8 || climbing || t - opt.t0 > 330)) {
      banked = true;
      sign = Math.sign(headingErr(r, v, t)) || 1;
      evt(
        "First roll",
        `With the air thick enough to steer by (drag ≈ ${fx1((s.D / G0) * 100)} % of g), the orbiter rolls about ${Math.round(sigMag * RAD)}° onto its ${sign > 0 ? "right" : "left"} side. Banking tilts the lift away from vertical: the orbiter sinks into denser air and brakes harder, and the bank angle becomes the steering wheel for the next 25 minutes.`,
        "roll",
      );
    }
    if (banked && t >= nextGuid && s.vrn < 1.3) {
      nextGuid = t + 4;
      sigMag = Math.min(sigMag, 50 * DEG);
      const he = headingErr(r, v, t);
      if (Math.abs(he) > 4 * DEG && Math.sign(he) !== sign) {
        sign = -sign;
        reversals++;
        evt(
          `Roll reversal ${reversals}`,
          "Below Mach 4 the orbiter banks toward the runway to line up for the approach.",
          "roll",
        );
      }
    }
    if (banked && t >= nextGuid) {
      nextGuid = t + (s.vrn > 3 ? 10 : 6);
      const f = (sg) => rangeErr(r, predict(r, v, t, sign * sg));
      let a = clamp(sigMag, 0, 80 * DEG),
        fa = f(a),
        b = clamp(a + (fa > 0 ? 6 : -6) * DEG, 0, 80 * DEG),
        fb = f(b);
      for (
        let k = 0;
        k < 4 && Math.abs(fb) > 2 && Math.abs(fb - fa) > 1e-6;
        k++
      ) {
        const c = clamp(b - (fb * (b - a)) / (fb - fa), 0, 80 * DEG);
        a = b;
        fa = fb;
        b = c;
        fb = f(b);
      }
      sigMag = b;
      lastErr = fb;
      const pr = predict(r, v, t, sign * sigMag);
      opt._tgo = pr.t - t;
      const he = headingErr(r, v, t),
        db = (s.vrn < 1.6 ? 4 : reversals === 0 ? 10.5 : 17.5) * DEG;
      if (Math.abs(he) > db && Math.sign(he) !== sign) {
        sign = -sign;
        reversals++;
        evt(
          `Roll reversal ${reversals}`,
          `The heading error to the runway reached ${Math.abs(he * RAD).toFixed(1)}°, so the orbiter rolls through wings-level to bank the other way. Each reversal swings the ground track back across the line to the runway; the Shuttle usually flew three or four.`,
          "roll",
        );
      }
    }
    const want = banked ? sign * sigMag : 0,
      rate = 8 * DEG; // roll rate in reversals
    // samples
    if (
      !opt.noSamples &&
      (!samples.length || t - samples[samples.length - 1].t >= 0.999)
    )
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: 0,
        thrDir: null,
        D: vscale(s.a, m * 1000),
        alt: h,
        q: s.q,
        mach: s.mach,
        heat,
        gload: g,
        phase: "entry",
        bank: bank * RAD,
        alpha: s.alpha,
        blackout: blackout || undefined,
      });
    if (!mach10 && s.mach < 10 && h < 60) {
      mach10 = true;
      evt(
        "Mach 10",
        `Speed ${fx1(s.vrn)} km/s at ${Math.round(h)} km. The angle of attack begins to ease from 40° toward 14° as the air thickens.`,
        "info",
      );
    }
    const bo = !!opt.blackout && h < 85 && h > 40 && s.vrn > 4.0;
    if (bo && !blackout) {
      blackout = true;
      evt(
        "Communications blackout",
        "Ionised air around the orbiter blocks radio contact with the ground. (From 1988 the TDRS relay satellites, reached through the top of the plasma sheath, all but ended the blackout.)",
        "blackout",
      );
    }
    if (!bo && blackout) {
      blackout = false;
      evt(
        "Blackout ends",
        "Radio contact with Mission Control is restored.",
        "blackout",
      );
    }
    if (s.vrn <= vTaem || h < 15 || t - opt.t0 > (opt.maxTime || 2600)) break;
    const dt = h > 100 ? 2 : opt.coarse ? 2 : 0.5;
    bank =
      opt.fixedBank != null
        ? opt.fixedBank
        : bank + clamp(want - bank, -rate * dt, rate * dt);
    const nx = rk4(r, v, bank, dt);
    r = nx.r;
    v = nx.v;
    t += dt;
  }
  return {
    t,
    r,
    v,
    m,
    samples,
    events,
    maxG,
    maxHeat,
    maxQ,
    tPeakG,
    tPeakHeat,
    reversals,
    rangeErr: lastErr,
  };
}
function fx1(x) {
  return (Math.round(x * 10) / 10).toFixed(1);
}

// ---- timeline.js
// ============================================================================
// timeline.js — mission container: objects, trajectory segments, events, budget
// Every segment returns body-relative state (ref body, ECL axes, km, km/s).
// ============================================================================
function bsearch(arr, t) {
  // last index i with arr[i] <= t
  let lo = 0,
    hi = arr.length - 1;
  if (t <= arr[0]) return 0;
  if (t >= arr[hi]) return hi;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (arr[m] <= t) lo = m;
    else hi = m;
  }
  return lo;
}

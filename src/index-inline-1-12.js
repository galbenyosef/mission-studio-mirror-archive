// index-inline-1 12 — opt
// Lines 3672-4103 of readable/index-inline-1.pretty.js (statement-aligned).
function simulateEntry(opt) {
  // a sky crane lands its rover with the descent stage hanging above it: the stage, whose path this is, stops edl.hang up
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body),
    elev = (opt.siteElev || 0) + ((opt.edl && opt.edl.hang) || 0) / 1000;
  const omega = bodyOmegaEcl(body, opt.t0);
  const kSG = body === "earth" ? 1.7415e-4 : 1.9027e-4;
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0),
    m = opt.m0;
  const A0 = Math.PI * (opt.diam / 2) ** 2;
  let CdA = opt.cd * A0,
    LD = opt.LD || 0,
    bank = (opt.bank ?? 0) * DEG;
  const samples = [],
    events = [];
  let phase = "entry",
    maxG = 0,
    maxHeat = 0,
    maxQ = 0,
    tPeakG = t,
    tPeakHeat = t,
    skipPhase = opt.skip ? 1 : 0,
    dt = 0.25;
  let blackout = false,
    chuteState = 0,
    tChute = 0,
    landed = false,
    thrust = 0,
    thrDir = null,
    propUsed = 0;
  const edl = opt.edl || null,
    land = opt.land || null;
  let poweredT0 = 0,
    powered = false,
    sky = false,
    divertDir = null;
  const sky0 = edl && edl.skycrane ? (edl.skyAlt + 10 - edl.hang) / 1000 : null; // a sky crane is down to its last 0.75 m/s by the time it lets the rover down
  const evt = (name, desc, kind) =>
    events.push({ t, name, desc, kind, r: vcopy(r), v: vcopy(v), m }); // (where it happened: the parts let go there)
  // propulsive landing (Starship): a retro-burn against the airflow at full thrust, lit as late as it can be — once a burn
  // begun now would only just bring the speed down to vHover a few hundred metres above the site — then the hover-down
  // guidance below. The fixed light-up altitude is the latest it may wait (thin Martian air cannot slow the ship enough).
  const PL = opt.propulsiveLanding,
    vHover = PL ? (PL.vHover ?? 0.06) : 0;
  let retro = false,
    nextCheck = -Infinity;
  const retroEndAlt = (r0, v0, m0) => {
    // km above the site where a full-thrust retro-burn from this state is down to vHover (−1: it hits first)
    let rr = vcopy(r0),
      vv = vcopy(v0),
      mm = m0;
    for (let k = 0; k < 2400; k++) {
      const n = vnorm(rr),
        a = n - R - elev;
      if (a <= 0) return -1;
      const vr_ = vsub(vv, vcross(omega, rr)),
        sp = vnorm(vr_);
      if (sp < vHover) return a;
      const D =
        0.5 *
        atmosOf(body, n - R).rho *
        (sp * 1000) ** 2 *
        (PL.bellyCdA || CdA);
      vv = vaddScaled(
        vv,
        vadd(
          vscale(rr, -mu / (n * n * n)),
          vscale(vr_, -(land.Tmax + D) / mm / 1000 / sp),
        ),
        0.5,
      );
      rr = vaddScaled(rr, vv, 0.5);
      mm = Math.max(mm - (land.Tmax / (land.isp * G0)) * 0.5, m0 * 0.3);
    }
    return 0;
  };
  for (let step = 0; step < 200000; step++) {
    const rn = vnorm(r),
      up = vunit(r),
      alt = rn - R - elev;
    const atm = atmosOf(body, rn - R);
    const vrel = vsub(v, vcross(omega, r)),
      vrn = vnorm(vrel);
    const vms = vrn * 1000,
      q = 0.5 * atm.rho * vms * vms,
      mach = vms / (atm.a || 250);
    // --- phase logic
    if (skipPhase === 1 && vdot(vrel, up) > 0 && alt > 50) {
      skipPhase = 2;
      evt(
        "Skip-out",
        "The capsule bounces off the upper atmosphere, coasting for minutes before the final entry — spreading the heat load and extending range.",
        "skip",
      );
    }
    if (skipPhase === 2 && vdot(vrel, up) < 0 && alt < 100) {
      skipPhase = 3;
      evt(
        "Second entry",
        "The returner dives back in for its final, lower-speed entry.",
        "entry2",
      );
    }
    let bankNow = bank;
    if (skipPhase === 1) bankNow = 0;
    if (skipPhase >= 2) bankNow = (opt.bank2 ?? 60) * DEG;
    if (opt.chutes && opt.chutes !== "none" && body === "earth") {
      const drogueAlt =
        opt.chutes === "apollo" ? 7.3 : opt.chutes === "orion" ? 7.6 : 10.0;
      const mainAlt =
        opt.chutes === "apollo" ? 3.0 : opt.chutes === "orion" ? 2.9 : 5.0;
      if (chuteState === 0 && alt < drogueAlt && vrn < 0.4) {
        chuteState = 1;
        tChute = t;
        evt(
          opt.chutes === "probe" ? "Parachute deploy" : "Drogue parachutes",
          opt.chutes === "probe"
            ? "Main parachute opens."
            : "Drogue chutes stabilise and slow the capsule to ~80 m/s.",
          "chute",
        );
      }
      if (chuteState === 1 && alt < mainAlt && opt.chutes !== "probe") {
        chuteState = 2;
        tChute = t;
        evt(
          "Main parachutes",
          "Main chutes open — descent rate falls to ~8 m/s for splashdown.",
          "chute",
        );
      }
    }
    if (edl && body === "mars") {
      // a trim wing (Tianwen-1) swings out shortly before the parachute: the capsule stops flying at the angle its offset
      // centre of mass gave it for lift and turns into the airflow, ready for the parachute (the moment is approximate)
      if (
        edl.trimWing &&
        !opt._trim &&
        chuteState === 0 &&
        mach < edl.chute.mach * 1.5 &&
        alt > 3
      ) {
        opt._trim = true;
        evt(
          "Trim wing deploys",
          "A flap on the side of the backshell swings out into the airflow. It shifts the capsule’s trim from the tilted attitude it has flown at for lift to one nearly head-on into the wind, ready for the parachute.",
          "trim",
        );
      }
      if (chuteState === 0 && mach < edl.chute.mach && alt > 3) {
        chuteState = 1;
        tChute = t;
        evt(
          "Supersonic parachute",
          `${edl.chute.diam} m parachute deploys at Mach ${mach.toFixed(1)}.`,
          "chute",
        );
      }
      if (chuteState === 1 && !opt._hsSep && mach < edl.heatshieldSepMach) {
        opt._hsSep = true;
        m -= opt.heatshieldMass || 0;
        evt(
          "Heat shield separation",
          "The heat shield drops away; radar and cameras see the ground (terrain-relative navigation).",
          "jettison",
        );
      }
      if (chuteState === 1 && alt < edl.backshellSepAlt) {
        chuteState = 3;
        m -= opt.backshellMass || 0;
        powered = true;
        poweredT0 = t;
        evt(
          "Backshell separation · powered descent",
          "The descent stage drops free of the backshell and parachute and lights its engines.",
          "powered",
        );
        if (edl.divert) {
          const h0 = vsub(vrel, vscale(up, vdot(vrel, up)));
          divertDir = vunit(vcross(up, vnorm(h0) > 1e-6 ? h0 : vperp(up)));
        } // to the side of the track the parachute drifts along
      }
    }
    if (PL && land && !powered) {
      let go = alt < PL.ignAlt;
      if (!go && alt < 90 && vdot(vrel, up) < 0 && t >= nextCheck) {
        nextCheck = t + 1;
        go = retroEndAlt(r, v, m) < (PL.stopAlt ?? 0.6);
      }
      if (go) {
        powered = true;
        poweredT0 = t;
        retro = vrn > 2.5 * vHover;
        evt(
          "Landing burn",
          retro
            ? `Engines relight ${alt.toFixed(1)} km up at ${vms.toFixed(0)} m/s: the ship turns tail-first into its direction of travel and brakes against the airflow at full thrust (supersonic retropropulsion).`
            : "Engines relight; the vehicle flips upright and decelerates for touchdown.",
          "powered",
        );
      }
    }
    // chute drag area
    let CdAnow = CdA;
    if (chuteState === 1) {
      const inf = clamp((t - tChute) / 3, 0, 1);
      if (body === "earth")
        CdAnow =
          CdA +
          inf *
            (opt.chutes === "probe" ? 180 : opt.chutes === "orion" ? 60 : 28);
      else
        CdAnow = CdA + inf * Math.PI * (edl.chute.diam / 2) ** 2 * edl.chute.cd;
    } else if (chuteState === 2) {
      const inf = clamp((t - tChute) / 5, 0, 1);
      CdAnow = CdA + 28 + inf * (opt.chutes === "orion" ? 1900 : 1200);
    } else if (chuteState === 3) CdAnow = 0.8 * Math.PI * 1.5 * 1.5;
    if (opt.propulsiveLanding && chuteState === 0)
      CdAnow = opt.propulsiveLanding.bellyCdA || CdA;
    // --- forces (closure so RK4 re-evaluates aero at intermediate states)
    const bankUse = bankNow,
      cdaUse = CdAnow,
      liftOn = LD > 0 && chuteState === 0 && !powered;
    const aeroAt = (rr, vv) => {
      const rr_n = vnorm(rr),
        at = atmosOf(body, rr_n - R);
      const vr_ = vsub(vv, vcross(omega, rr)),
        vrn_ = vnorm(vr_);
      if (vrn_ < 1e-9 || at.rho <= 0) return [0, 0, 0];
      const qq = 0.5 * at.rho * (vrn_ * 1000) ** 2,
        DD = qq * cdaUse;
      const vh = vscale(vr_, 1 / vrn_);
      let aa = vscale(vh, -DD / m / 1000);
      if (liftOn) {
        const u = vscale(rr, 1 / rr_n);
        let lu = vsub(u, vscale(vh, vdot(u, vh)));
        const lun = vnorm(lu);
        if (lun > 1e-9) {
          lu = vscale(lu, 1 / lun);
          const side = vcross(vh, lu);
          const ldir = vadd(
            vscale(lu, Math.cos(bankUse)),
            vscale(side, Math.sin(bankUse)),
          );
          aa = vadd(aa, vscale(ldir, (LD * DD) / m / 1000));
        }
      }
      return aa;
    };
    const aAero = aeroAt(r, v);
    const g = vscale(r, -mu / (rn * rn * rn));
    let aT = [0, 0, 0];
    thrust = 0;
    if (powered && land && retro && vrn < vHover) {
      retro = false;
      evt(
        "Landing flip",
        "Down to hover speed: the ship swings upright on its engines for the vertical descent to touchdown.",
        "powered",
      );
    }
    if (powered && land && retro) {
      thrDir = vscale(vrel, -1 / vrn);
      aT = vscale(thrDir, land.Tmax / m / 1000);
      thrust = land.Tmax;
    } else if (powered && land) {
      const vr = vdot(vrel, up),
        hz = vsub(vrel, vscale(up, vr));
      // braking at a steady 1.8 m/s² toward 20 m up, the last 60 m at 0.75 m/s; a sky crane brakes toward its last 0.75 m/s
      const vdesTarget =
        alt > (sky0 ?? 0.06)
          ? -Math.max(
              sky0 != null ? 0.00075 : 0.002,
              Math.min(
                0.09,
                Math.sqrt(2 * 0.0018 * Math.max(alt - (sky0 ?? 0.02), 0)),
              ),
            )
          : -0.00075;
      const gmag = mu / (rn * rn);
      // a sky crane follows its braking curve closely, to be at 0.75 m/s in time: the deceleration the curve asks for at the
      // speed it is falling, fed forward (1.8 m/s² when it falls as fast as the curve; nothing when it hovers)
      const ff =
        sky0 != null && alt > sky0
          ? Math.min(
              0.0036,
              (0.0018 * Math.max(0, -vr)) / Math.max(-vdesTarget, 0.001),
            )
          : 0;
      const aUp = Math.max(0.1 * gmag, gmag + ff + (vdesTarget - vr) / 2.0); // engines push, never pull: falling slower than planned means minimum throttle, not thrust toward the ground
      // horizontal speed nulled; a sky crane first flies clear of the backshell and its parachute (edl.divert: m/s, for s)
      const aHz =
        divertDir && t - poweredT0 < edl.divert[1]
          ? vscale(vsub(vscale(divertDir, edl.divert[0] / 1000), hz), 1 / 3.0)
          : vscale(hz, -1 / 3.0);
      let ac = vadd(vscale(up, aUp), aHz);
      ac = vsub(ac, aAero);
      let am = vnorm(ac);
      const amax = land.Tmax / m / 1000;
      if (am > amax) {
        am = amax;
      }
      if (am < (land.minThr || 0.05) * amax) am = (land.minThr || 0.05) * amax;
      thrDir = vunit(ac);
      aT = vscale(thrDir, am);
      thrust = am * m * 1000;
      if (edl && edl.skycrane && !sky && alt < (edl.skyAlt - edl.hang) / 1000) {
        sky = true;
        evt(
          "Sky crane",
          `${edl.skyAlt} m up, the descent stage lets the rover down on ${edl.bridle} m bridles, still descending at 0.75 m/s.`,
          "skycrane",
        );
      }
    }
    const aProper = (vnorm(vadd(aAero, aT)) * 1000) / G0;
    const heat =
      (kSG * Math.sqrt(atm.rho / (opt.rn || 1)) * Math.pow(vms, 3)) / 1e4; // W/cm^2
    if (aProper > maxG) {
      maxG = aProper;
      tPeakG = t;
    }
    if (heat > maxHeat) {
      maxHeat = heat;
      tPeakHeat = t;
    }
    if (q > maxQ) maxQ = q;
    const bo =
      body === "earth"
        ? vrn > 6.5 && alt < 95 && alt > 38
        : vrn > 3.5 && alt < 75 && alt > 25;
    if (bo && !blackout) {
      blackout = true;
      evt(
        body === "earth" ? "Plasma blackout begins" : "Plasma sheath",
        "Ionised gas around the vehicle blocks radio signals.",
        "blackout",
      );
    }
    if (!bo && blackout) {
      blackout = false;
      evt(
        body === "earth" ? "Blackout ends" : "Plasma sheath clears",
        "Radio contact is restored.",
        "blackout",
      );
    }
    if (samples.length === 0 || t - samples[samples.length - 1].t >= 0.999)
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: thrust,
        thrDir: thrDir ? vcopy(thrDir) : null,
        D: vscale(aAero, m * 1000),
        alt,
        q,
        mach,
        heat,
        gload: aProper,
        phase:
          skipPhase === 2
            ? "skip coast"
            : powered
              ? "powered descent"
              : chuteState
                ? "parachute"
                : "entry",
        chute: chuteState,
        blackout: bo,
        bank: bankNow * RAD,
      });
    if (alt <= 0) {
      landed = true;
      break;
    }
    if (t - opt.t0 > (opt.maxTime || 4000)) break;
    // integrate RK4 (thrust held)
    const h = alt < 15 ? 0.1 : alt > 130 ? 2.0 : dt;
    const acc = (rr, vv) => {
      const n = vnorm(rr);
      return vadd(vadd(vscale(rr, -mu / (n * n * n)), aeroAt(rr, vv)), aT);
    };
    const k1v = acc(r, v),
      k1r = v;
    const k2r = vaddScaled(v, k1v, h / 2),
      k2v = acc(vaddScaled(r, k1r, h / 2), k2r);
    const k3r = vaddScaled(v, k2v, h / 2),
      k3v = acc(vaddScaled(r, k2r, h / 2), k3r);
    const k4r = vaddScaled(v, k3v, h),
      k4v = acc(vaddScaled(r, k3r, h), k4r);
    r = vadd(
      r,
      vscale(vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)), h / 6),
    );
    v = vadd(
      v,
      vscale(vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)), h / 6),
    );
    if (thrust > 0 && land) {
      const dm = (thrust / (land.isp * G0)) * h;
      m -= dm;
      propUsed += dm;
    }
    t += h;
  }
  const ll = subPointLL(body, r, t),
    vTD = vnorm(vsub(v, vcross(omega, r))) * 1000; // m/s at the ground
  if (PL && vTD > 30) landed = false; // a propulsive landing that reaches the ground fast has crashed
  return {
    landed,
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
    ll,
    propUsed,
    vTD,
  };
}
// great-circle angular distance between lat/lon (deg) → rad

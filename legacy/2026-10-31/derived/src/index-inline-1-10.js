// index-inline-1 10 — math
// Lines 2826-3461 of readable/index-inline-1.pretty.js (statement-aligned).
function simulateAscent(opt) {
  const body = opt.body || "earth",
    B = BODIES[body],
    mu = B.mu,
    Rb = surfaceRadius(body) + (opt.siteElev || 0);
  const stack = opt.stack,
    t0 = opt.t0,
    dt = opt.dt || 0.2,
    record = opt.record !== false;
  const omega = bodyOmegaEcl(body, t0);
  const site = vscale(vunit(sitePosEcl(body, opt.lat, opt.lon, 0, t0)), Rb);
  let r = vcopy(site),
    v = vcross(omega, r);
  const nT = vunit(opt.target.normal),
    hp = opt.target.hp,
    ha = opt.target.ha ?? hp;
  const rpT = surfaceRadius(body) + hp,
    raT = surfaceRadius(body) + ha,
    aT = (rpT + raT) / 2;
  const epsT = -mu / (2 * aT);
  // cutoff point on the target orbit: its perigee, or (direct insertion, e.g. the Shuttle's MECO) a given altitude on
  // the way up to apogee, with the radial speed the target orbit has there
  const rCut =
    opt.target.hCut != null ? surfaceRadius(body) + opt.target.hCut : rpT;
  const hAngT = Math.sqrt((mu * 2 * rpT * raT) / (rpT + raT));
  const vtCut =
    opt.target.hCut != null ? hAngT / rCut : Math.sqrt(mu * (2 / rpT - 1 / aT));
  const vrCut =
    opt.target.hCut != null
      ? Math.sqrt(Math.max(0, 2 * (epsT + mu / rCut) - vtCut * vtCut))
      : 0;
  // inertial launch azimuth from target plane, then rotating-frame correction
  const lf0 = localFrame(body, r, t0);
  let dIn = vcross(nT, lf0.up);
  dIn = vsub(dIn, vscale(lf0.up, vdot(dIn, lf0.up)));
  dIn = vunit(dIn);
  const azI = Math.atan2(vdot(dIn, lf0.east), vdot(dIn, lf0.north));
  const vOrb = Math.sqrt(mu / rpT),
    vEq = vdot(v, lf0.east);
  const azR = Math.atan2(vOrb * Math.sin(azI) - vEq, vOrb * Math.cos(azI));
  const kick = (opt.kick ?? 2) * DEG,
    vert = opt.vert ?? 10,
    kickDur = 8;
  const samples = record ? [] : null,
    events = [];
  const ev = (name, desc, extra) =>
    events.push({ t: t, name, desc, ...(extra || {}) });
  let t = t0,
    phase = "vertical",
    closedLoop = false,
    lastDir = vcopy(lf0.up),
    stageIdx = 0,
    prevDir = null,
    qPast = false,
    qOn = 0;
  const qBlend = body === "earth" && opt.qBlend !== false,
    QA = (opt.qAlpha ?? 100000) * DEG; // Pa·rad: dynamic pressure × angle of attack the guidance may use
  const swingLog = [];
  let swing10 = 0,
    swingT = 0; // the most the steering turned within any 10 s after the pitch-over (deg), and when
  const maxTurn = (opt.maxRate ?? 6) * DEG * dt; // attitude control turns the vehicle at most this far per step
  let maxQ = 0,
    maxQt = t0,
    maxQlogged = false,
    maxG = 0,
    coastUntil = -Infinity,
    firstStaging = false;
  // ignite first stage(s)
  const st = stack.stages;
  st[0].ignited = true;
  st[0].tIgn = t0;
  if (st[0].parallel && st[1]) {
    st[1].ignited = true;
    st[1].tIgn = t0;
  }
  const activeStages = () =>
    st.filter(
      (s) =>
        s.attached &&
        s.ignited &&
        s.propLeft > 0 &&
        !(s.ignition && t - t0 < s.ignition),
    );
  const anyBoosters = () => st.some((s) => s.attached && s.parallel);
  let mdotNow = 0,
    thrustNow = 0,
    dragNow = [0, 0, 0],
    qNow = 0,
    machNow = 0,
    thrDir = lf0.up;
  let result = { ok: false };
  const g0 = G0;
  // time to burn dvKms more with the stages still attached, in order — boosters burning alongside the core first
  function burnTimeFor(dvKms) {
    let dv = dvKms * 1000,
      m0 = stackMass(stack),
      tt = 0;
    const bst = st.filter(
        (s) => s.attached && s.parallel && s.ignited && s.propLeft > 0,
      ),
      core0 = st.find((s) => s.attached && !s.parallel && s.propLeft > 0);
    let coreUsed = 0;
    if (bst.length && core0) {
      let F = 0,
        md = 0,
        tB = Infinity;
      for (const b of bst) {
        const ve = b.ispVac * g0,
          mdB = b._mdot > 0 ? b._mdot : b.thrustVac / ve; // the flow now (solid motors follow their thrust curve)
        F += mdB * ve;
        md += mdB;
        tB = Math.min(
          tB,
          b.propLeft / mdB,
          b.curve
            ? Math.max(1, b.curve[b.curve.length - 1][0] - (t - b.tIgn))
            : Infinity,
        );
      }
      const veC = core0.ispVac * g0,
        mdC = (core0.thrustVac / veC) * (core0._thr || 1);
      F += mdC * veC;
      md += mdC;
      const ve = F / md,
        m1 = Math.max(m0 - md * tB, 1),
        dvB = ve * Math.log(m0 / m1);
      if (dv <= dvB) return (m0 - m0 * Math.exp(-dv / ve)) / md;
      tt += tB;
      dv -= dvB;
      m0 = m1;
      coreUsed = mdC * tB;
      for (const b of bst)
        m0 -=
          b.dry +
          Math.max(
            0,
            b.propLeft -
              (b._mdot > 0 ? b._mdot : b.thrustVac / (b.ispVac * g0)) * tB,
          ); // they drop away
    }
    for (const s of st) {
      if (!s.attached || s.parallel) continue;
      const pl = s.propLeft - (s === core0 ? coreUsed : 0);
      if (pl <= 0) continue;
      const ve = s.ispVac * g0,
        mdot = s.thrustVac / ve;
      const dvAv = ve * Math.log(m0 / (m0 - pl));
      if (opt.gTgo && s.maxG) {
        // engines throttled to hold the g limit once the stack is light enough (Shuttle: 3 g)
        const aMax = s.maxG * g0,
          mLim = s.thrustVac / aMax;
        if (mLim < m0) {
          const dv1 = ve * Math.log(m0 / Math.max(mLim, m0 - pl));
          if (dv <= dv1) {
            tt += (m0 - m0 * Math.exp(-dv / ve)) / mdot;
            return tt;
          }
          if (mLim > m0 - pl) {
            tt += (m0 - mLim) / mdot;
            const dv2 = Math.min(dv - dv1, ve * Math.log(mLim / (m0 - pl)));
            tt += dv2 / aMax;
            if (dv - dv1 <= dv2 + 1e-9) return tt;
            dv -= dv1 + dv2;
            m0 -= pl + s.dry;
            continue;
          }
        }
      }
      if (dv <= dvAv) {
        tt += (m0 - m0 * Math.exp(-dv / ve)) / mdot;
        return tt;
      }
      tt += pl / mdot;
      dv -= dvAv;
      m0 -= pl + s.dry;
    }
    return tt + 1e4;
  }
  const maxT = opt.maxTime || 1500;
  while (t - t0 < maxT) {
    const rn = vnorm(r),
      alt = rn - surfaceRadius(body),
      altG = rn - Rb;
    if (altG < -0.05 && t - t0 > 5) {
      ev("Vehicle lost", "Trajectory intersected the surface.");
      result = { ok: false, reason: "crash" };
      break;
    }
    const atm = atmosOf(body, alt);
    const vrel = vsub(v, vcross(omega, r)),
      vreln = vnorm(vrel);
    const lf = localFrame(body, r, t);
    // --- jettisons
    for (const j of stack.jettison) {
      if (j.done) continue;
      let go = false;
      if (j.alt != null && alt >= j.alt) go = true;
      if (j.time != null && t - t0 >= j.time) go = true;
      if (
        j.afterStage != null &&
        st[j.afterStage] &&
        !st[j.afterStage].attached &&
        st[j.afterStage].tSep != null &&
        t - st[j.afterStage].tSep >= (j.delay || 0)
      )
        go = true;
      if (go) {
        j.done = true;
        ev(
          j.name + " jettisoned",
          `Dropping ${Math.round(j.mass).toLocaleString()} kg of structure no longer needed.`,
          { kind: "jettison", part: j.part },
        );
      }
    }
    // --- staging
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      if (
        s.attached &&
        s.ignited &&
        (s.propLeft <= 0 ||
          (s.curve && t - s.tIgn >= s.curve[s.curve.length - 1][0]))
      ) {
        // spent, or its thrust has tailed off (solid motors)
        s.attached = false;
        s.tSep = t;
        const kind = s.parallel
          ? "Booster separation"
          : i === st.length - 1
            ? "Upper stage depletion"
            : `${s.id} cutoff & separation`;
        ev(
          kind,
          s.parallel
            ? `${s.name} burn out and separate. The core continues alone.`
            : `${s.name} exhausted its ${Math.round(s.propMass / 1000).toLocaleString()} t of propellant and separates.`,
          { kind: "staging", stage: s.id },
        );
        if (!firstStaging) {
          firstStaging = true;
          if (!opt.noClosedLoop) closedLoop = true;
        }
        if (!s.parallel) {
          const nx = st.slice(i + 1).find((x) => x.attached);
          if (nx && !nx.ignited) {
            coastUntil = t + (opt.sepCoast ?? 2.0);
            nx.pendingIgnition = true;
          } else if (!nx) {
            result = { ok: false, reason: "propellant" };
          }
        }
      }
    }
    if (result.reason === "propellant") {
      ev(
        "Insufficient performance",
        "All stages are exhausted before reaching orbit — the payload is too heavy for this vehicle.",
      );
      break;
    }
    for (const s of st)
      if (s.pendingIgnition && t >= coastUntil) {
        s.pendingIgnition = false;
        s.ignited = true;
        s.tIgn = t;
        ev(
          `${s.id} ignition`,
          `${s.engine} engine${s.n > 1 ? "s" : ""} ignite${s.n > 1 ? "" : "s"}: ${PROP[s.prop].label}.`,
          { kind: "ignition", stage: s.id },
        );
      }
    // --- forces
    const act = coastUntil > t ? [] : activeStages();
    const m = stackMass(stack);
    let Ttot = 0,
      mdot = 0;
    const pr = atm.p / P0_EARTH;
    for (const s of act) {
      let thr = 1;
      if (s.thrWithBoosters && anyBoosters()) thr = s.thrWithBoosters;
      if (s.sched) thr *= curveAt(s.sched, t - s.tIgn); // scheduled throttle (e.g. the Shuttle's Max-Q bucket)
      const cv = curveAt(s.curve, t - s.tIgn);
      const Tv = s.thrustVac * cv,
        Ts = s.thrustSL * cv;
      const T = Math.max(0, Tv - (Tv - Ts) * Math.min(pr, 1)) * thr;
      Ttot += T;
      s._T = T;
      s._mdot = (Tv / (s.ispVac * g0)) * thr;
      s._thr = thr;
      mdot += s._mdot;
    }
    // g-limit & max-Q throttling (applied to the non-parallel stage)
    const core = act.find((s) => !s.parallel);
    const qNowPre = 0.5 * atm.rho * Math.pow(vreln * 1000, 2);
    if (
      core &&
      core.minThr &&
      opt.qMax &&
      qNowPre > opt.qMax &&
      core._T > 0 &&
      body === "earth"
    ) {
      const k = clamp(
        Math.pow(opt.qMax / qNowPre, 2),
        core.sched
          ? Math.min(1, core.minThr / Math.max(core._thr, 1e-6))
          : core.minThr,
        1,
      );
      Ttot = Ttot - core._T + core._T * k;
      mdot = mdot - core._mdot + core._mdot * k;
      core._mdot *= k;
      core._thr *= k;
      core._T *= k;
    }
    if (core && core.maxG) {
      const allowed = core.maxG * g0 * m;
      if (Ttot > allowed && core._T > 0) {
        const other = Ttot - core._T;
        const k = clamp((allowed - other) / core._T, core.minThr || 0.4, 1);
        Ttot = other + core._T * k;
        mdot = mdot - core._mdot + core._mdot * k;
        core._mdot *= k;
        core._thr *= k;
      }
    }
    // drag
    let Aref = 0;
    {
      let rmax = 0;
      for (const s of st)
        if (s.attached && !s.parallel) {
          rmax = Math.max(
            rmax,
            s.geom ? Math.max(...s.geom.map((gg) => gg[1])) : 2,
          );
          break;
        }
      if (
        opt.fairingR &&
        stack.jettison.some((j) => j.part === "fairing" && !j.done)
      )
        rmax = Math.max(rmax, opt.fairingR);
      Aref = Math.PI * rmax * rmax + (opt.arefExtra || 0);
      for (const s of st)
        if (s.attached && s.parallel && s.booster)
          Aref += s.booster.count * Math.PI * Math.pow(s.geom[0][1], 2);
      if (Aref === 0) Aref = 10;
    }
    const M = (vreln * 1000) / (atm.a || 300),
      q = 0.5 * atm.rho * Math.pow(vreln * 1000, 2);
    const Dmag = q * rocketCd(M) * Aref; // N
    const Dvec = vreln > 1e-6 ? vscale(vrel, -Dmag / vreln) : [0, 0, 0];
    // --- guidance
    let dir;
    const tf = t - t0;
    {
      // open loop (and, from Earth, the path the guidance is phased in from)
      const az = vadd(
        vscale(lf.north, Math.cos(azR)),
        vscale(lf.east, Math.sin(azR)),
      ); // heading held at the launch azimuth (yaw steering)
      if (tf < vert) {
        dir = lf.up;
        phase = "vertical";
      } else if (tf < vert + kickDur || vreln < 0.05) {
        const k = kick * clamp((tf - vert) / kickDur, 0, 1);
        dir = vunit(vadd(vscale(lf.up, Math.cos(k)), vscale(az, Math.sin(k))));
        phase = "pitchover";
      } else {
        // gravity turn: pitch follows the air-relative flight-path angle
        const gam = Math.asin(clamp(vdot(vunit(vrel), lf.up), -1, 1));
        dir = vunit(
          vadd(vscale(lf.up, Math.sin(gam)), vscale(az, Math.cos(gam))),
        );
        phase = "gravity turn";
      }
      if (opt.closedLoopAt != null && tf >= opt.closedLoopAt) closedLoop = true;
    }
    const dirOL = dir;
    // closed-loop insertion guidance: radial and out-of-plane acceleration profiles that reach the cutoff state at time-to-go
    const clCommand = () => {
      const up = vunit(r);
      let ed = vcross(nT, up);
      ed = vunit(vsub(ed, vscale(up, vdot(ed, up))));
      const vr = vdot(v, up),
        vd = vdot(v, ed),
        vn = vdot(v, nT),
        npos = vdot(r, nT);
      const dvNeed = Math.sqrt((vtCut - vd) ** 2 + (vrCut - vr) ** 2 + vn * vn);
      const tgo = Math.max(1, burnTimeFor(dvNeed));
      const aTh = m > 0 ? Ttot / m / 1000 : 0; // km/s^2
      if (!(tgo > 6 && aTh > 0)) return null;
      const geff = mu / (rn * rn) - (vd * vd + vn * vn) / rn;
      const tg = Math.max(tgo, 8);
      let ar =
        (6 * (rCut - rn - vr * tg)) / (tg * tg) - (2 * (vrCut - vr)) / tg;
      if (opt.target.hCut != null && tgo < 60) {
        // direct insertion: over the last minute steer more and more only the climb rate, toward the one the target orbit has at this radius
        const vtr = hAngT / rn,
          vrNow = Math.sqrt(Math.max(0, 2 * (epsT + mu / rn) - vtr * vtr)),
          f = smoothstep((60 - tgo) / 30);
        ar = ar * (1 - f) + (f * 2 * (vrNow - vr)) / Math.max(tgo, 4);
      }
      ar = ar + geff;
      let an = (6 * (-npos - vn * tg)) / (tg * tg) + (2 * vn) / tg;
      // the attitude splits the thrust between the channels as for the average acceleration still to come (the Δv left over
      // the time left), so it carries straight through staging instead of jumping with the thrust of the stage now burning
      const aRef = clamp(dvNeed / tgo, 0.25 * aTh, 4 * aTh);
      ar = clamp(ar, -0.7 * aRef, 0.95 * aRef);
      an = clamp(an, -0.3 * aRef, 0.3 * aRef);
      const ad = Math.sqrt(Math.max(0, aRef * aRef - ar * ar - an * an));
      return vunit(vadd(vadd(vscale(up, ar), vscale(nT, an)), vscale(ed, ad)));
    };
    // From Earth the guidance steers from the end of the pitch-over, held within the angle of attack the air allows: none
    // before max-Q (the stack flies its gravity turn through the dense atmosphere), then widening from zero as the air
    // thins (q·α ≤ QA·(1 − q/q₀), q₀ the pressure when it starts, 90% of max-Q, so the allowance opens without a step).
    // The stack eases onto the guided path while it climbs, and nothing switches when a stage drops away — handing over
    // at staging made it swing tens of degrees. Elsewhere the guidance takes over at the set time or at the first staging.
    if (qBlend && tf >= vert + kickDur) {
      if (!qPast && maxQ > 5000 && qNowPre < 0.9 * maxQ) {
        qPast = true;
        qOn = qNowPre;
      }
      const cmd = clCommand(),
        aMax = qPast
          ? clamp(QA / Math.max(qNowPre, 1) - QA / qOn, 0, Math.PI)
          : 0;
      if (cmd) {
        const th = Math.acos(clamp(vdot(dirOL, cmd), -1, 1));
        if (th <= aMax) dir = cmd;
        else if (aMax > 0 && th < Math.PI - 1e-3) {
          const sn = Math.sin(th);
          dir = vunit(
            vadd(
              vscale(dirOL, Math.sin(th - aMax) / sn),
              vscale(cmd, Math.sin(aMax) / sn),
            ),
          );
        }
        if (aMax > 10 * DEG) phase = "closed-loop guidance";
        lastDir = dir;
      } else if (qPast) {
        dir = lastDir;
        phase = "closed-loop guidance";
      }
      if (opt.debug)
        opt.debug({ t: tf, q: qNowPre, aMax: aMax * RAD, dirOL, cmd, lf }); // diagnostics
    } else if (closedLoop) {
      phase = "closed-loop guidance";
      const cmd = clCommand();
      dir = cmd || lastDir;
      lastDir = dir;
    } else lastDir = dir || lastDir;
    // the vehicle swings round at a finite rate: any jump left in the steering command is flown over several seconds
    if (prevDir && dir && tf > vert) {
      const th = Math.acos(clamp(vdot(prevDir, dir), -1, 1));
      if (th > maxTurn && th < Math.PI - 1e-3) {
        const sn = Math.sin(th);
        dir = vunit(
          vadd(
            vscale(prevDir, Math.sin(th - maxTurn) / sn),
            vscale(dir, Math.sin(maxTurn) / sn),
          ),
        );
        lastDir = dir;
      }
    }
    if (dir) prevDir = dir;
    thrDir = dir;
    if (
      dir &&
      tf > vert + kickDur &&
      Ttot > 0 &&
      (!swingLog.length || t - swingLog[swingLog.length - 1][0] >= 1)
    ) {
      swingLog.push([t, vcopy(dir)]);
      while (swingLog.length > 1 && t - swingLog[0][0] > 10) swingLog.shift();
      const sw = Math.acos(clamp(vdot(swingLog[0][1], dir), -1, 1)) * RAD;
      if (sw > swing10) {
        swing10 = sw;
        swingT = t - t0;
      }
    }
    // --- record
    if (q > maxQ) {
      maxQ = q;
      maxQt = t;
    } else if (
      !maxQlogged &&
      maxQ > 1000 &&
      q < 0.9 * maxQ &&
      body === "earth"
    ) {
      maxQlogged = true;
      events.push({
        t: maxQt,
        name: "Max-Q",
        desc: `Maximum dynamic pressure ≈ ${(maxQ / 1000).toFixed(1)} kPa — peak aerodynamic stress on the vehicle.`,
        kind: "maxq",
      });
    }
    const aProper = (Ttot + Dmag) / m;
    if (aProper > maxG) maxG = aProper;
    if (
      record &&
      (samples.length === 0 ||
        t - samples[samples.length - 1].t >= 0.999 * (opt.sampleDt || 1))
    ) {
      const up = lf.up;
      const down = vsub(r, vscale(up, 0));
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: Ttot,
        thrDir: vcopy(dir),
        D: Dvec,
        q,
        mach: M,
        alt,
        stage: (act.find((s) => !s.parallel) || act[0] || {}).id || "—",
        phase,
        throttle: core ? core._thr : 1,
      });
    }
    // --- cutoff test
    const eps = vdot(v, v) / 2 - mu / rn;
    let rpNow = 0;
    if (eps >= epsT) {
      const hv = vnorm(vcross(r, v)),
        ee = Math.sqrt(Math.max(0, 1 + (2 * eps * hv * hv) / (mu * mu)));
      rpNow = (hv * hv) / mu / (1 + ee);
    }
    if (
      eps >= epsT &&
      alt > hp * 0.5 &&
      (rpNow >= surfaceRadius(body) + 0.6 * hp ||
        eps >= epsT + 0.25 * Math.abs(epsT))
    ) {
      ev(
        "Orbit insertion",
        `Engine cutoff. Target orbit ${hp.toFixed(0)} × ${ha.toFixed(0)} km reached.`,
        { kind: "insertion" },
      );
      result = { ok: true };
      break;
    }
    if (
      Ttot === 0 &&
      coastUntil < t &&
      act.length === 0 &&
      !st.some((s) => s.pendingIgnition)
    ) {
      if (!st.some((s) => s.attached && s.propLeft > 0)) {
        ev(
          "Insufficient performance",
          "All stages are exhausted before reaching orbit.",
        );
        result = { ok: false, reason: "propellant" };
        break;
      }
    }
    // --- integrate (RK4, thrust direction & magnitude held over the step)
    const Tk = Ttot / m / 1000; // km/s^2 initial
    const f = (rr, vv, mm) => {
      const rn2 = vdot(rr, rr),
        rn1 = Math.sqrt(rn2);
      const g = vscale(rr, -mu / (rn2 * rn1));
      const at = mm > 0 ? Ttot / mm / 1000 : 0;
      const ad = mm > 0 ? vscale(Dvec, 1 / mm / 1000) : [0, 0, 0];
      return vadd(vadd(g, vscale(dir, at)), ad);
    };
    const m1 = m,
      mdt = mdot * dt;
    const k1v = f(r, v, m1),
      k1r = v;
    const k2v = f(
        vaddScaled(r, k1r, dt / 2),
        vaddScaled(v, k1v, dt / 2),
        m1 - mdt / 2,
      ),
      k2r = vaddScaled(v, k1v, dt / 2);
    const k3v = f(
        vaddScaled(r, k2r, dt / 2),
        vaddScaled(v, k2v, dt / 2),
        m1 - mdt / 2,
      ),
      k3r = vaddScaled(v, k2v, dt / 2);
    const k4v = f(vaddScaled(r, k3r, dt), vaddScaled(v, k3v, dt), m1 - mdt),
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
    for (const s of act) s.propLeft = Math.max(0, s.propLeft - s._mdot * dt);
    t += dt;
  }
  const rn = vnorm(r);
  const el = rv2coe(r, v, mu);
  const upper = st.find((s) => s.attached && !s.parallel) || null;
  return {
    ...result,
    t,
    r,
    v,
    m: stackMass(stack),
    samples,
    events,
    el,
    hpAch: el.rp - surfaceRadius(body),
    haAch: el.ra - surfaceRadius(body),
    upper,
    upperProp: upper ? upper.propLeft : 0,
    maxG: maxG / g0,
    maxQ,
    azI: azI * RAD,
    azR: azR * RAD,
    stack,
    swing10,
    swingT,
  };
}
// optimise pitch-kick for maximum remaining propellant

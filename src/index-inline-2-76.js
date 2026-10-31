// index-inline-2 76 — math
// Lines 21992-22339 of readable/index-inline-2.pretty.js (statement-aligned).
function cineFitLens(h, d, f) {
  return clamp(
    (36 * f * cineBandH()) / ((frameRect().w * h) / Math.max(d, 1e-6)),
    14,
    1200,
  );
}
// the distance (km) at which a size of h km fills a fraction f of the free rows through a lens (mm)
function cineFitDist(h, lens, f) {
  return (h * cinePxPerRad(lens)) / (f * cineBandH());
}
// The shot at time t for craft c (the ship), or null outside the launch (the director's own shot then). L: the launch
// stack's height (km); sunAz: the bearing toward the Sun, so the ground cameras see the lit side
function cineShot(c, t) {
  const md = MV.md;
  if (!md || c.o.id !== "ship" || !md.L || !LAUNCH_SITES[md.cfg.site] || !c.s) {
    CINE.timeK = 1;
    return null;
  }
  const L = Math.max(md.L.height || 50, 10) * 0.001,
    sunAz = (() => {
      const p = poseFor("chase", { az: 0, el: 0, dist: 1 }, c.P, t);
      const [e1, e2] = p.basis;
      const sd = vunit(vscale(c.P, -1));
      return Math.atan2(vdot(sd, e2), vdot(sd, e1));
    })();
  const T = cineTimes(md);
  if (t < T.tIgn - 8 || t >= T.tEnd) {
    CINE.timeK = 1;
    return null;
  }
  const s = c.s,
    T0 = T.t0,
    up = s ? vunit(c.rD || s.r) : null,
    V = cineSubject(c, L),
    Lv = V.len; // (Lv: the vehicle as drawn now)
  const slow = (a, b, k) => {
    const ramp = 0.6,
      f = Math.min(smoothstep((t - a) / ramp), smoothstep((b - t) / ramp));
    return 1 + (k - 1) * f;
  }; // (eased in and out over 0.6 s of mission time)
  let shot;
  if (t < T0) {
    // 1. base: low near the pad, pushing in as the engines light
    const az = cineClear(cineSide(sunAz) + 22 * DEG),
      d = Math.max(L * 1.5, 0.12),
      f = smoothstep((t - (T.tIgn - 8)) / (T0 - T.tIgn + 8));
    shot = {
      key: "cine-base",
      mode: "padcam",
      spot: [d * Math.cos(az), d * Math.sin(az), 0.0015],
      aimP: V.aim,
      lens: cineFitLens(Lv, d, 0.82 + 0.1 * f),
      shake: "ground",
      cut: true,
      label: "Ignition",
    }; // (filling the frame, pushing in a little)
  } else if (t < T0 + 7) {
    // 2. rise: slow motion, the vehicle climbing past a camera by the trench
    // (out past the cloud the blast throws round the pad, which would hide the vehicle from nearer)
    const az = cineClear(cineSide(sunAz) - 15 * DEG),
      d = Math.max(L * 8, 0.5),
      h =
        s && up ? Math.max(vnorm(c.rD || s.r) - surfaceRadius("earth"), 0) : 0;
    shot = {
      key: "cine-rise",
      mode: "padcam",
      spot: [d * Math.cos(az), d * Math.sin(az), 0.0012],
      aimP: V.aim,
      lens: cineFitLens(Lv, Math.hypot(d, h + Lv * 0.5), 0.7),
      shake: "ground",
      slow: slow(T0 - 0.3, T0 + 5, 0.3),
      cut: true,
      label: "Liftoff",
    };
  } else if (t < T.tTail) {
    // 3. track: a long lens on the ground, following it into the sky
    const az = cineClear(cineSide(sunAz) + 35 * DEG),
      d = 2.6,
      h = s ? Math.max(vnorm(c.rD || s.r) - surfaceRadius("earth"), 0) : 0;
    shot = {
      key: "cine-track",
      mode: "padcam",
      spot: [d * Math.cos(az), d * Math.sin(az), 0.002],
      aimP: V.aim,
      lens: cineFitLens(Lv, Math.hypot(d, h), 0.5),
      shake: "ground",
      cut: true,
      label: "Climbing away",
    };
  } else if (t < T.tSide) {
    // 4. tail: below the vehicle, looking up along the plume
    shot = {
      key: "cine-tail",
      mode: "chase",
      az: sunAz + 40 * DEG,
      el: -38 * DEG,
      dist: cineFitDist(Lv, 20, 0.72),
      aimP: V.aim,
      lens: 20,
      shake: "air",
      cut: true,
      label: "Ascent",
    };
  } else if (t < T.tSep) {
    // … round to its side
    shot = {
      key: "cine-side",
      mode: "chase",
      az: sunAz + 60 * DEG,
      el: 4 * DEG,
      dist: cineFitDist(Lv, 30, 0.6),
      aimP: V.aim,
      lens: 30,
      shake: "air",
      blend: 3500,
      label: "Ascent",
    };
  } else {
    // 5. staging: a close cut, in slow motion
    shot = {
      key: "cine-sep",
      mode: "chase",
      az: sunAz + 95 * DEG,
      el: 8 * DEG,
      dist: cineFitDist(L * 1.1, 30, 0.75),
      aimP: V.aim,
      lens: 30,
      shake: "air",
      slow: slow(T.tS - 0.8, T.tS + 3.5, 0.3),
      cut: true,
      label: "Staging",
    };
  }
  CINE.timeK = shot.slow || 1;
  return shot;
}
// ---------------- the shake ----------------
// A camera shakes because something pushes it, and it answers as the mass on a spring it is. On the ground the push is
// the launch's noise: it leaves the engines at the speed of sound, so it reaches a camera half a kilometre out a second
// and a half after the ignition, and its pressure goes as the thrust that made it over the distance it has come. The
// camera on its tripod rings at its own frequencies — the tripod's (about 9 Hz, well damped) and the ground's (about
// 3 Hz) — driven by that noise, so a blow sets it swinging and dying away rather than jittering at random. In the air
// (a chase camera beside the vehicle) there is no engine noise to carry it, only the buffeting of the air, which grows
// with the dynamic pressure and is gone above the atmosphere: slower, about 2 Hz. The oscillators run on mission time,
// so in slow motion the shake is slowed too, like a high-speed film, and the noise is seeded, so a scene shakes the
// same way each time it is played.
const CINE_H = 1 / 240; // s of mission time per oscillator step
const CINE_MODES = {
  ground: [
    [9, 0.35, 0.65],
    [3, 0.5, 0.35],
  ],
  air: [[2.1, 0.45, 1]],
}; // [Hz, damping ratio, share]
function cineNoise(i) {
  // a standard normal, from the step's index (two hashed uniforms, Box–Muller)
  const u = (x) => {
    let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return ((h >>> 0) + 0.5) / 4294967296;
  };
  return Math.sqrt(-2 * Math.log(u(2 * i + 1))) * Math.cos(TAU * u(2 * i + 7));
}
// the oscillators' state for one shake kind: two axes, a [x, v] per mode; rms: each mode's output RMS for unit drive
function cineOsc(kind) {
  const modes = CINE_MODES[kind],
    st = {
      kind,
      modes,
      x: modes.map(() => [
        [0, 0],
        [0, 0],
      ]),
      rms: [],
    };
  if (cineOsc[kind]) {
    st.rms = cineOsc[kind];
    return st;
  } // (calibrated once)
  for (const [f, z] of modes) {
    // calibrate: drive it with unit noise long enough to settle, measure what comes out
    const w = TAU * f;
    let x = 0,
      v = 0,
      ss = 0,
      n = 0;
    for (let i = 0; i < 24000; i++) {
      const a = w * w * (cineNoise(i) - x) - 2 * z * w * v;
      v += a * CINE_H;
      x += v * CINE_H;
      if (i > 4000) {
        ss += x * x;
        n++;
      }
    }
    st.rms.push(Math.sqrt(ss / n));
  }
  cineOsc[kind] = st.rms;
  return st;
}
// the amplitude (rad, RMS) of the push at time t for the camera dKm from the vehicle: the thrust when the sound now
// arriving left it, falling off with the distance; or the buffeting with the dynamic pressure
function cineDrive(kind, c, t, dKm) {
  if (kind === "air") {
    const q = (c.s && c.s.extra && c.s.extra.q) || 0;
    return Math.min(0.0016, (0.0016 * q) / 35000);
  } // (q in Pa; about 35 kPa at max-Q)
  const tr = t - (dKm * 1000) / 343,
    s = craftState(c, tr),
    T = (s && s.T > 0 ? s.T : 0) / 1e6; // MN, when the sound left
  return Math.min(0.008, (6e-5 * T) / Math.max(dKm, 0.05));
}
// the shake at time t (rotations about the camera's own x and y, rad), stepping the oscillators on from where they were;
// a jump in time (scrubbing, a cut to another kind) starts them from rest
function cineShake(kind, c, t, dKm) {
  let st = CINE.osc;
  if (!st || st.kind !== kind || !(t >= st.t) || t - st.t > 1) {
    st = CINE.osc = cineOsc(kind);
    st.t = t;
    st.i = Math.floor(t / CINE_H);
  }
  const A = cineDrive(kind, c, t, dKm);
  for (let i = st.i + 1; i * CINE_H <= t; i++) {
    st.modes.forEach(([f, z], k) => {
      const w = TAU * f;
      for (let ax = 0; ax < 2; ax++) {
        const X = st.x[k][ax],
          a =
            w * w * (cineNoise(i * 4 + ax * 2 + k * 97) - X[0]) -
            2 * z * w * X[1];
        X[1] += a * CINE_H;
        X[0] += X[1] * CINE_H;
      }
    });
    st.i = i;
  }
  st.t = t;
  const out = [0, 0];
  st.modes.forEach(([, , share], k) => {
    for (let ax = 0; ax < 2; ax++)
      out[ax] += (share * st.x[k][ax][0]) / st.rms[k];
  });
  return [out[0] * A, out[1] * A * 0.8]; // (a camera on a tripod pitches a little more than it yaws)
}

// ==== 60_telemetry.js
// ============================================================================
// Telemetry: physics read-outs for the followed craft at the current instant.
// ============================================================================
const PHASE_TEXT = [
  [
    /ignition/i,
    "Ignition: the engines light seconds before liftoff and build up to full thrust while hold-down clamps keep the rocket on the pad. The computers check every engine and can still shut everything down safely; only then do the clamps let go. Water pours onto the pad to absorb heat and sound — the white clouds are mostly steam.",
  ],
  [
    /on the pad/i,
    "Final countdown. The tanks are topped off and the vehicle stands on the pad, held down by clamps until the engines reach full thrust.",
  ],
  [/^vertical/i, EXPLAIN.vertical],
  [
    /pitch-?over/i,
    "Pitch-over: clear of the tower, the rocket tips a few degrees toward its launch azimuth. From here on it flies nose into the airflow and gravity bends the path toward horizontal.",
  ],
  [/gravity turn/i, EXPLAIN.gravityTurn],
  [
    /closed-loop/i,
    "Closed-loop guidance: above the dense atmosphere the flight computer steers to hit the target orbit exactly — altitude, speed and flight-path angle.",
  ],
  [
    /stranded|shortfall|drift/i,
    "The vehicle did not have enough propellant for this burn, so it stays on the trajectory it reached. Choose a more capable rocket or a lighter payload in the setup.",
  ],
  [/parking|low Earth orbit|Earth orbits/i, EXPLAIN.parking],
  [
    /high Earth orbit/i,
    "High Earth orbit: an elongated orbit reaching tens of thousands of kilometres, used to check out the spacecraft before committing to the Moon.",
  ],
  [/trans-lunar injection/i, EXPLAIN.tli],
  [/trans-mars|departure burn/i, EXPLAIN.tmi],
  [/trans-earth injection/i, EXPLAIN.tei],
  [
    /translunar|outbound coast/i,
    EXPLAIN.coast +
      " The craft climbs out of Earth’s gravity well, slowing from 10.8 km/s to under 1 km/s near the Moon.",
  ],
  [/free return|lunar flyby|circumlunar/i, EXPLAIN.freeReturn],
  [/lunar orbit insertion|LOI/i, EXPLAIN.loi],
  [
    /lunar orbit|orbit around the Moon/i,
    "Lunar orbit: about 2 hours per revolution at 110 km altitude. Each pass behind the Moon cuts radio contact with Earth.",
  ],
  [
    /approach to (earth|mars|the moon)|final approach/i,
    "Final approach: the craft falls toward the planet, gaining speed. A last trajectory correction sets the entry angle — too steep and the g-load and heating are lethal, too shallow and the craft skips off the atmosphere.",
  ],
  [
    /powered descent|braking phase|approach phase|terminal|landing burn/i,
    EXPLAIN.pdi,
  ],
  [
    /sky crane/i,
    "Sky crane: the descent stage hovers and lowers the rover on bridles, then flies away to crash at a safe distance.",
  ],
  [
    /driving/i,
    "Driving: each of the six wheels has its own motor; top speed is 4.2 cm/s (0.15 km/h). AutoNav builds a 3D map of the ground ahead and steers around hazards by itself, because commands from Earth take 5–20 minutes to arrive. Drives are planned on Earth the day before and run around local midday.",
  ],
  [/surface|landed|touchdown|making propellant/i, EXPLAIN.surface],
  [/lunar ascent|mars ascent|ascent/i, EXPLAIN.ascent],
  [/rendezvous|docking/i, EXPLAIN.rendezvous],
  [
    /transearth|return coast|return to Earth/i,
    "Coasting home: Earth’s gravity accelerates the craft to about 11 km/s by the time it reaches the atmosphere.",
  ],
  [
    /parachute/i,
    "Parachutes: drogues stabilise the capsule at supersonic or high-subsonic speed, then the mains slow it to a few metres per second.",
  ],
  [
    /skip/i,
    "Skip entry: the capsule uses lift to bounce back out of the upper atmosphere, then re-enters — spreading out the heat and extending the range.",
  ],
  [/entry|plasma/i, EXPLAIN.entry],
  [/edl/i, EXPLAIN.edl],
  [/mars orbit insertion|capture/i, EXPLAIN.moi],
  [
    /mars orbit|orbit around mars|parking orbit at mars|aerobrak/i,
    "Orbiting Mars: one Martian day (sol) is 24 h 37 min. Elliptical orbits are cheap to enter and let the orbiter survey the surface below.",
  ],
  [/flyby|gravity assist/i, EXPLAIN.flyby],
  [/cruise|heliocentric|solar orbit|interplanetary/i, EXPLAIN.cruise],
  [
    /departure hyperbola/i,
    "Departure hyperbola: the craft is escaping Earth. Its speed relative to Earth tends toward v∞, the hyperbolic excess speed.",
  ],
  [
    /spent|stage/i,
    "A spent stage: empty tanks and engines, discarded to save mass.",
  ],
  [
    /recovery/i,
    "Recovery: ships and helicopters reach the capsule within the hour.",
  ],
];
// Space Shuttle flights: checked before the general texts (their phase names overlap: entry, approach, docking)

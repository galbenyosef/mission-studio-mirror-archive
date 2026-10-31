// index-inline-2 77 — ref
// Lines 22340-22673 of readable/index-inline-2.pretty.js (statement-aligned).
const SHUTTLE_TEXT = [
  [
    /coasting with the tank/i,
    "Main engine cutoff. The empty External Tank is still attached; eighteen seconds later it is released and the orbiter moves clear with its small reaction-control jets.",
  ],
  [
    /External Tank — falling/i,
    "The External Tank on its own: 26 tonnes of empty aluminium. Its orbit dips into the atmosphere, so half an orbit later it breaks up and falls into a remote stretch of ocean — the only part of the Shuttle not reused.",
  ],
  [
    /climbing to apogee|MECO — coasting/i,
    "Coasting up to the high point of the orbit. The low point is still inside the atmosphere; at the top the OMS engines will fire to lift it out (OMS-2).",
  ],
  [
    /\bOMS-\d|orbit insertion|circularis/i,
    "Orbital Maneuvering System: two 27 kN engines in the pods beside the tail. Their propellants — monomethylhydrazine and nitrogen tetroxide — ignite on contact, so the engines start reliably every time.",
  ],
  [
    /NC-\d|catching up|closing in/i,
    "Phasing: the orbiter starts thousands of kilometres behind the station. A lower orbit is a faster one, so each burn adjusts the height to close the gap at just the right rate — arriving half an orbit after terminal initiation.",
  ],
  [
    /terminal initiation|TI —|closing on the station/i,
    "Terminal initiation: the burn that commits to the rendezvous. Half an orbit later the orbiter arrives 600 m below the station; the crew flies the last part by hand, watching radar and laser range-finder data.",
  ],
  [
    /R-bar approach/i,
    "R-bar approach: the orbiter closes in from directly below the station, along the line to Earth’s centre. Orbital mechanics help: anything below the station tends to drift up toward it, so the approach is gentle.",
  ],
  [
    /R-bar pitch/i,
    "R-bar pitch maneuver: a slow 360° back-flip, 183 m below the station. For nine minutes the belly faces the station crew, who photograph every heat-shield tile — a check added after Columbia was lost in 2003.",
  ],
  [
    /moving to the V-bar/i,
    "Swinging to the V-bar: a quarter circle up and in front of the station, to its line of flight. The orbiter pitches nose-up so its docking port faces the station.",
  ],
  [
    /docked to the ISS/i,
    "Docked: orbiter and station fly as one 500-tonne spacecraft. The station’s robot arm moves cargo between them, and the orbiter can even draw power from the station to stay longer.",
  ],
  [
    /backing away/i,
    "Undocking: springs push the spacecraft apart; the orbiter backs away slowly along the V-bar with its small jets, careful not to blast the station’s solar arrays.",
  ],
  [
    /flyaround/i,
    "Flyaround: a last lap around the station at about 180 m, so the crew can photograph every side of it for engineers on the ground.",
  ],
  [
    /V-bar approach|docking/i,
    "Final approach along the V-bar at a few centimetres per second. The docking mechanism’s capture ring latches on, then retracts to pull the two spacecraft together and seal the hatches.",
  ],
  [
    /deploy/i,
    "Payload deploy: the 15 m Canadarm, flown from the aft flight-deck windows, lifts the payload out of the bay, holds it while its systems come alive, and lets go.",
  ],
  [
    /hubble in orbit/i,
    "Free flying: the Hubble Space Telescope on its own, 615 km up, its two solar array wings unrolled.",
  ],
  [
    /deorbit preparations|deorbit burn/i,
    "Deorbit: about an hour before landing, half a world away from the runway, the orbiter fires both OMS engines against its direction of flight. The orbit’s far side drops into the atmosphere — there is no turning back.",
  ],
  [
    /falling toward the atmosphere/i,
    "Falling toward the atmosphere. The orbiter has turned around to fly nose-first with its nose 40° up, so the black heat-shield tiles on its belly will take the heat.",
  ],
  [
    /entry/i,
    "Entry: the orbiter meets the air at 7.8 km/s and a 40° angle of attack. It is a glider: it steers by banking, and each roll reversal swings its path back toward the runway. The tiles on its belly reach 1,260 °C, the wing leading edges 1,500 °C.",
  ],
  [
    /TAEM/i,
    "Terminal area energy management: below 25 km and Mach 2.5 the orbiter is a supersonic glider. The computers manage its energy — speed and height — so it arrives at the runway with just enough to land.",
  ],
  [
    /heading alignment/i,
    "Heading alignment cone: a turn around an imaginary cylinder to line up with the runway. Wider for more energy, tighter for less: this is the last big correction.",
  ],
  [
    /outer glideslope/i,
    "Outer glideslope: a 19° dive at about 290 knots — seven times steeper than an airliner’s. The split rudder opens as a speed brake to hold the airspeed.",
  ],
  [
    /flare|inner glideslope/i,
    "Preflare and flare: the commander pulls the nose up to flatten the dive onto a 1.5° glideslope, the landing gear comes down, and the orbiter floats toward the runway, slowing to about 200 knots.",
  ],
  [
    /rollout/i,
    "Rollout: main gear first at about 200 knots (370 km/h), then the nose comes down; the drag chute and the brakes stop the 100-tonne glider within about 2.7 km.",
  ],
  [
    /wheel stop|on the runway/i,
    "“Wheel stop.” Ground crews in protective suits approach first, checking for toxic propellant vapours; purge and cooling air is connected to the orbiter before the crew can leave, about an hour later.",
  ],
  [
    /^in orbit|flight tests|in orbit —/i,
    "In orbit: one lap every 90 minutes at about 28,000 km/h, sixteen sunrises and sunsets a day. The payload bay doors stay open: their inner faces are the radiators that keep the orbiter cool.",
  ],
];
const MARS_TEXT = [
  [
    /parachute/i,
    "Supersonic parachute: a 21.5 m disk-gap-band canopy opens at about Mach 1.7. The air is only 1 % as dense as Earth’s, so the parachute slows the craft to about 100 m/s — not enough to land.",
  ],
  [
    /powered|sky crane|terminal|approach/i,
    "Powered descent in thin Martian air: the final ~100 m/s must be removed by rocket engines. The radar measures altitude and terrain-relative navigation picks a safe spot.",
  ],
  [/entry|plasma/i, EXPLAIN.edl],
];
function explainPhase(...names) {
  const s = names.filter(Boolean).join(" | ");
  if (MV.md && isShuttle(MV.md))
    for (const [re, txt] of SHUTTLE_TEXT) if (re.test(s)) return txt;
  if (/\[mars\]/.test(s))
    for (const [re, txt] of MARS_TEXT) if (re.test(s)) return txt;
  for (const [re, txt] of PHASE_TEXT) if (re.test(s)) return txt;
  return "";
}
function computeTele(c, t) {
  if (!c || !c.s || !c.P) return null;
  const md = MV.md,
    s = c.s,
    P = c.P;
  const ref = c.dom || s.ref;
  const rD = c.rD || s.r,
    vD = c.vD || s.v;
  const Rb = ref === "sun" ? BODIES.sun.R : surfaceRadius(ref);
  const T = { c, s, ref, t };
  T.alt = vnorm(rD) - Rb;
  T.vIn = vnorm(vD);
  const rotB = ref === "earth" || ref === "mars" || ref === "moon";
  const vRel = rotB ? vsub(vD, vcross(bodyOmegaEcl(ref, t), rD)) : vD;
  T.vRel = vD;
  T.vSurf = vnorm(vRel);
  T.vVert = vdot(vD, vunit(rD));
  T.ll = ref !== "sun" ? subPointLL(ref, rD, t) : null;
  T.grav = GRAV_BODIES.map((b) => {
    const d = vsub(helio(b, t).r, P);
    const dist = vnorm(d);
    return {
      body: b,
      a: (BODIES[b].mu / (dist * dist)) * 1000,
      dir: vunit(d),
      dist,
    };
  }).sort((x, y) => y.a - x.a);
  T.dEarth = vnorm(vsub(P, helio("earth", t).r));
  T.dMoon = vnorm(vsub(P, helio("moon", t).r));
  T.dMars = vnorm(vsub(P, helio("mars", t).r));
  T.dSun = vnorm(P);
  T.light = T.dEarth / C_KMS;
  const m = s.m > 0 ? s.m : null;
  T.m = m;
  T.thrust = s.T || 0;
  T.thrustAcc = m && T.thrust ? T.thrust / m : 0;
  T.thrustDir = s.dir;
  const Dm = s.D ? vnorm(s.D) : 0;
  T.dragAcc = m ? Dm / m : 0;
  T.dragDir = s.D;
  const gLoc = BODIES[ref]
    ? (BODIES[ref].mu / Math.pow(Math.max(vnorm(rD), Rb), 2)) * 1000
    : 0;
  T.gLocal = gLoc;
  if (s.surface || s.pad) {
    T.proper = gLoc;
    T.properNote =
      s.pad && s.T > 0 ? "held down by clamps" : "standing on the surface";
  } else if (s.extra && s.extra.gload != null) {
    T.proper = s.extra.gload * G0;
  } else {
    const f = vadd(vscale(s.dir || [0, 0, 0], T.thrust), s.D || [0, 0, 0]);
    T.proper = m ? vnorm(f) / m : 0;
  }
  // orbit about the dominant body
  const b = ref;
  const r = rD,
    v = vD;
  T.orbBody = b;
  T.orbR = r;
  T.orbV = v;
  T.el = rv2coe(r, v, BODIES[b].mu);
  T.orbRb = b === "sun" ? BODIES.sun.R : surfaceRadius(b);
  T.vEsc = Math.sqrt((2 * BODIES[b].mu) / vnorm(r));
  // vehicle
  T.cfg = cfgAt(c, t);
  T.burn = md.burnAt(t, c.o.id);
  return T;
}
// ---------------- propulsion status: engines firing vs coasting (inertial flight) ----------------
const PSTAT = { cur: null, key: "" };
function engineName(T) {
  const md = MV.md,
    cf = T.cfg,
    L = md.L,
    s = T.s;
  if (cf && cf.key === "launch") {
    const st =
      L.stages.find((x) => x.id === (s.extra && s.extra.stage)) ||
      L.stages[cf.stFrom] ||
      L.stages[0];
    return `${st.n} × ${st.engine}`;
  }
  const x = md.poweredAt(T.t, T.c.o.id);
  const b = (x && x.burn) || T.burn;
  if (b && b.engine) return b.engine;
  const mod =
    md.SC.modules.DS ||
    md.SC.modules.LDR ||
    Object.values(md.SC.modules).find((m) => m.engine);
  if (mod && mod.engine) return mod.engine.name;
  const up = L.stages[L.stages.length - 1];
  return up ? `${up.n} × ${up.engine}` : ""; // e.g. Starship lands on its own upper-stage engines
}
function propStatus(T, t) {
  const md = MV.md;
  if (!md || !T) return null;
  const c = T.c,
    s = T.s,
    id = c.o.id;
  const cur = md.poweredAt(t, id),
    next = md.nextPowered(t, id);
  const short = (n) =>
    String(n || "")
      .split("—")[0]
      .trim();
  if (s.pad && s.ign)
    return {
      k: "burn",
      l: "IGNITION",
      name: "Ignition",
      d: `${engineCounts(s.ign.liq)} at ${Math.round(s.ign.f * 100)} % thrust · hold-down clamps holding · liftoff in ${fTime(Math.max(0, md.M.t0 - t))}`,
    };
  if (s.pad)
    return {
      k: "rest",
      l: "ON THE PAD",
      d: `liftoff in ${fTime(Math.max(0, md.M.t0 - t))}`,
    };
  if (cur && !s.surface && !(T.thrust > 0) && T.cfg && T.cfg.key === "launch")
    return {
      k: "burn",
      l: "STAGING",
      name: cur.name,
      d: `${cur.name} · engines off for a moment between stages`,
    };
  if ((T.thrust > 0 || cur) && !s.surface) {
    const nm = cur ? cur.name : "Engine burn";
    const parts = [nm];
    const eng = engineName(T);
    if (eng) parts.push(eng);
    if (T.thrustAcc > 0) parts.push(`${fx(T.thrustAcc / G0, 2)} g`);
    if (cur) parts.push(`${fTime(Math.max(0, cur.t1 - t))} left`);
    return { k: "burn", l: "ENGINE ON", name: nm, d: parts.join(" · ") };
  }
  const nxt = next
    ? `next burn: ${short(next.name)} in ${fTime(next.t0 - t)}`
    : "no more burns planned";
  if (s.surface)
    return {
      k: "rest",
      l: "ON THE SURFACE",
      d: `${BODIES[s.ref].name} · ${nxt}`,
    };
  const ex = s.extra || {};
  if (ex.chute)
    return {
      k: "aero",
      l: "ENGINES OFF",
      d: `under parachutes, descending at ${fSpeed(Math.abs(Math.min(T.vVert, 0)))}`,
    };
  if (isShuttle(md) && c.o.id === "ship") {
    // the orbiter after entry: a glider, then a vehicle rolling on its wheels
    const ph = ex.phase || "";
    if (/rollout/.test(ph))
      return {
        k: "aero",
        l: "ROLLOUT",
        d: `on the runway at ${fx((T.vSurf * 1000) / 0.5144, 0)} knots — ${T.cfg && T.cfg.dragChute ? "drag chute and brakes" : "brakes and air drag"} slowing the orbiter`,
      };
    if (/TAEM|alignment|glideslope|flare/.test(ph))
      return {
        k: "aero",
        l: "GLIDING",
        d: `engines off, trading height for speed — ${fx((T.vSurf * 1000) / 0.5144, 0)} knots, sinking ${fx(Math.max(0, -T.vVert * 1000), 0)} m/s`,
      };
  }
  if (T.dragAcc > 0.05 || ex.q > 50)
    return {
      k: "aero",
      l: "ENGINES OFF",
      d: `atmospheric entry — air drag is braking the craft (${fx(T.dragAcc / G0, 1)} g)`,
    };
  const ph = md.phaseAt(t);
  const fly = ph && /flyby|gravity assist/i.test(ph.name);
  const who = !fly
    ? ""
    : /lunar|moon/i.test(ph.name)
      ? "the Moon’s"
      : /mars/i.test(ph.name)
        ? "Mars’s"
        : /earth/i.test(ph.name)
          ? "Earth’s"
          : /venus/i.test(ph.name)
            ? "Venus’s"
            : /jupiter/i.test(ph.name)
              ? "Jupiter’s"
              : "the planet’s";
  return {
    k: "coast",
    l: "COASTING",
    d: `${fly ? `gravity assist, engines off — ${who} pull bends the path` : "inertial flight, engines off"} · ${nxt}`,
  };
}
function drawProp(T, t) {
  const el = $("#prop");
  const st = propStatus(T, t);
  PSTAT.cur = st;
  const met = t - MV.md.M.t0;
  if (!st || (met > -10.0001 && met < 0)) {
    if (!el.hidden) el.hidden = true;
    return;
  } // the big launch countdown already says it
  if (el.hidden) el.hidden = false;
  if (el.className !== st.k) el.className = st.k;
  const pl = el.children[1],
    pd = el.children[2];
  if (pl.textContent !== st.l) pl.textContent = st.l;
  if (pd.textContent !== st.d) pd.textContent = st.d;
}
const TELE = { built: null, els: {}, lastDraw: 0, objSel: "ship" };

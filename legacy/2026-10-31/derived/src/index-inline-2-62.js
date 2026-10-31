// index-inline-2 62 — ref
// Lines 17866-18215 of readable/index-inline-2.pretty.js (statement-aligned).
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
function buildTelePanel() {
  const root = $("#tele");
  root.innerHTML = "";
  const kv = (id, k) => [
    h("div", { class: "k" }, k),
    h("div", { class: "v", id: "tv-" + id }, "—"),
  ];
  const sec = (title, rt, ...kids) =>
    h(
      "div",
      { class: "sec" },
      h(
        "h4",
        null,
        title,
        h(
          "span",
          { class: "rt", id: "trt-" + title.replace(/\W/g, "") },
          rt || "",
        ),
      ),
      ...kids,
    );
  root.append(
    h(
      "div",
      { class: "t-obj" },
      h("span", { id: "tv-obj" }, ""),
      h("span", { id: "tv-crew" }, ""),
    ),
    h(
      "div",
      { class: "t-phase" },
      h("span", { class: "chip", id: "tv-chip" }),
      h("span", { class: "name", id: "tv-phase" }, "—"),
    ),
    h("div", { class: "t-explain", id: "tv-explain" }),
    sec(
      "Flight",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("alt", "Altitude"),
        ...kv("vin", "Speed (inertial)"),
        ...kv("vsurf", "Speed over the surface"),
        ...kv("vvert", "Vertical speed"),
        ...kv("ll", "Ground track"),
        ...kv("dE", "Distance from Earth"),
        ...kv("dX", "Distance from Moon"),
        ...kv("light", "Radio delay (one way)"),
      ),
    ),
    sec(
      "Forces",
      "",
      h(
        "div",
        { class: "gauge" },
        h("span", { class: "big", id: "tv-g" }, "0.00"),
        h("span", { class: "unit" }, "g felt"),
        h("span", { class: "note", id: "tv-gnote" }, ""),
      ),
      h(
        "div",
        { class: "kv", style: "margin-top:6px" },
        ...kv("thr", "Thrust acceleration"),
        ...kv("drag", "Aerodynamic deceleration"),
      ),
      h(
        "div",
        { class: "note-s", style: "margin:8px 0 4px" },
        "Gravitational pull here (log scale)",
      ),
      h("div", { class: "bars", id: "tv-bars" }),
    ),
    sec(
      "Orbit",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("pa", "Periapsis × apoapsis"),
        ...kv("ae", "Semi-major axis · eccentricity"),
        ...kv("inc", "Inclination"),
        ...kv("per", "Period"),
        ...kv("c3", "Specific energy · C3"),
        ...kv("vesc", "Escape speed here"),
      ),
    ),
    sec(
      "Vehicle",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("cfg", "Configuration"),
        ...kv("mass", "Mass"),
        ...kv("eng", "Engine"),
        ...kv("prop", "Propellant"),
        ...kv("thrN", "Thrust · Isp"),
        ...kv("mdot", "Propellant flow"),
        ...kv("tw", "Thrust-to-weight"),
        ...kv("burn", "Burn"),
        ...kv("dv", "Δv spent so far"),
      ),
      h("div", { id: "tv-tanks" }),
    ),
    h(
      "div",
      { class: "sec", id: "tv-atmoSec" },
      h("h4", null, "Atmosphere"),
      h(
        "div",
        { class: "kv" },
        ...kv("q", "Dynamic pressure q"),
        ...kv("mach", "Mach"),
        ...kv("heat", "Heat flux (stagnation)"),
        ...kv("bo", "Radio blackout"),
        ...kv("chute", "Parachutes"),
        ...kv("bank", "Bank angle"),
        ...kv("alpha", "Angle of attack"),
      ),
    ),
  );
  TELE.els = {};
  for (const e of root.querySelectorAll('[id^="tv-"]'))
    TELE.els[e.id.slice(3)] = e;
}

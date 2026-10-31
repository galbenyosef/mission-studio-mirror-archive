// index-inline-2 79 — setv
// Lines 22809-23168 of readable/index-inline-2.pretty.js (statement-aligned).
function drawTele(T, t) {
  if (!TELE.els.alt) return;
  const md = MV.md;
  const E = TELE.els;
  if (!T) {
    setv("phase", t < md.M.t0 ? "Countdown" : "—");
    return;
  }
  const c = T.c,
    s = T.s;
  E.obj.textContent = c.o.name;
  E.crew.textContent = c.o.crew
    ? `${c.o.crew} crew`
    : c.o.kind === "craft"
      ? "uncrewed"
      : c.o.kind;
  const ph = md.phaseAt(t);
  const exPh = s.extra && s.extra.phase;
  const label = exPh
    ? exPh.charAt(0).toUpperCase() + exPh.slice(1)
    : ph
      ? ph.name
      : "—";
  E.phase.textContent = label;
  E.chip.style.background = ph ? ph.color : "#666";
  const b = T.burn;
  const ex = explainPhase(
    b && b.name,
    exPh,
    ph && ph.name,
    T.ref === "mars" && T.alt < 200 ? "[mars]" : "",
  );
  if (E.explain.textContent !== ex) E.explain.textContent = ex;
  const RB = { earth: "Earth", moon: "Moon", mars: "Mars", sun: "Sun" };
  if (T.ref === "earth" && (s.surface || s.pad)) T.alt = Math.max(T.alt, 0); // the drawn ground sits a fraction of a metre under the datum
  setv(
    "alt",
    T.ref === "sun"
      ? "—"
      : (T.alt < -0.0005
          ? "−" + fDist(-T.alt) + " (below datum)"
          : fDist(Math.max(T.alt, 0))) +
          " · " +
          RB[T.ref],
  );
  setv("vin", fSpeed(T.vIn));
  setv("vsurf", T.ref === "sun" || T.alt > 1500 ? "—" : fSpeed(T.vSurf));
  setv(
    "vvert",
    Math.abs(T.vVert) < 5e-4
      ? "0 m/s"
      : (T.vVert >= 0 ? "+" : "−") + fSpeed(Math.abs(T.vVert)),
  );
  setv("ll", T.ll ? `${fLat(T.ll[0])} ${fLon(T.ll[1])}` : "heliocentric");
  setv("dE", fDist(T.dEarth));
  const other =
    md.cfg.dest === "mars" ||
    (md.cfg.profile || "").startsWith("mars") ||
    md.cfg.profile === "multi-flyby"
      ? ["Mars", T.dMars]
      : ["Moon", T.dMoon];
  E.dX.previousSibling.textContent = "Distance from " + other[0];
  setv("dX", fDist(other[1]));
  setv(
    "light",
    T.light < 1
      ? fx(T.light * 1000, 0) + " ms"
      : T.light < 120
        ? fx(T.light, 2) + " s"
        : fTime(T.light),
  );
  // forces
  const g = T.proper / G0;
  E.g.textContent =
    g < 0.01 ? (g < 1e-4 ? "0.0000" : g.toFixed(4)) : g.toFixed(2);
  E.gnote.textContent =
    T.properNote ||
    (g < 1e-3 && !(T.thrust > 0)
      ? "free fall — weightless"
      : T.thrust > 0
        ? "engines firing"
        : T.dragAcc > 0.05
          ? "air braking"
          : "");
  setv(
    "thr",
    T.thrustAcc > 0
      ? fAcc(T.thrustAcc) + ` (${(T.thrustAcc / G0).toFixed(2)} g)`
      : "—",
  );
  setv(
    "drag",
    T.dragAcc > 1e-5
      ? fAcc(T.dragAcc) + ` (${(T.dragAcc / G0).toFixed(2)} g)`
      : "—",
  );
  const bars = E.bars;
  const top = T.grav.slice(0, 5);
  const amax = top[0].a;
  if (bars.childElementCount !== top.length) {
    bars.innerHTML = "";
    for (let i = 0; i < top.length; i++)
      bars.append(
        h(
          "div",
          { class: "bar" },
          h("span", { class: "n" }),
          h("div", { class: "track" }, h("div", { class: "fill" })),
          h("span", { class: "val" }),
        ),
      );
  }
  top.forEach((gr, i) => {
    const row = bars.children[i];
    row.children[0].textContent = BODIES[gr.body].name;
    const f = clamp(1 + Math.log10(gr.a / amax) / 6, 0.02, 1);
    row.children[1].firstChild.style.cssText = `width:${(f * 100).toFixed(1)}%;background:${BODY_COLORS[gr.body]}`;
    row.children[2].textContent = fAcc(gr.a);
  });
  // orbit
  const el = T.el,
    ob = T.orbBody;
  const Rb = T.orbRb;
  $("#trt-Orbit").textContent = "around " + BODIES[ob].name;
  if (el.rp < Rb && (s.surface || s.pad || (T.alt < 200 && ob !== "sun"))) {
    setv(
      "pa",
      el.e < 1 ? `suborbital · apoapsis ${fDist(el.ra - Rb)}` : "escape",
      "",
    );
    setv("per", "—");
  } else if (el.e < 1) {
    setv(
      "pa",
      `${fDist(el.rp - Rb)} × ${fDist(el.ra - Rb)}`,
      el.rp < Rb ? "bad" : "",
    );
    setv("per", fTime(el.period));
  } else {
    setv("pa", `${fDist(el.rp - Rb)} × ∞ (escape)`, el.rp < Rb ? "bad" : "hi");
    setv("per", "v∞ " + fSpeed(el.vinf));
  }
  setv(
    "ae",
    `${fDist(el.a > 0 ? el.a : -Math.abs(el.a))} · ${el.e.toFixed(4)}`,
  );
  const pole = ob === "sun" ? [0, 0, 1] : bodyPoleEcl(ob, t);
  setv(
    "inc",
    (vangle(vcross(T.orbR, T.orbV), pole) * RAD).toFixed(2) +
      "°" +
      (ob === "sun" ? " (ecliptic)" : " (equator)"),
  );
  setv(
    "c3",
    `${fx(el.energy, 2)} km²/s² · C3 ${fx(2 * el.energy, 2)}`,
    el.energy > 0 ? "hi" : "",
  );
  setv("vesc", fSpeed(T.vEsc));
  // vehicle
  const cf = T.cfg;
  let cfgTxt = "—";
  const L = md.L;
  if (cf) {
    if (cf.key === "launch")
      cfgTxt = L.sideMount
        ? ["Orbiter", "External Tank", cf.boosters ? "2 boosters" : null]
            .filter(Boolean)
            .join(" + ")
        : L.stages
            .filter((st, i) => (st.parallel ? cf.boosters : i >= cf.stFrom))
            .map((st) => st.id)
            .join(" + ") +
          (cf.fairing ? " + fairing" : "") +
          (cf.les ? " + escape tower" : "");
    else if (cf.sc === "shuttle")
      cfgTxt = [
        "Orbiter",
        cf.docked ? "docked to the ISS" : null,
        cf.bay === "open" ? "payload bay open" : "bay doors closed",
        cf.payArm || (cf.armPay && cf.armT && t >= cf.armT.un)
          ? "payload on the arm"
          : cf.armPay && cf.armT && t >= cf.armT.gr
            ? "arm on the payload"
            : null,
        cf.gear ? "gear down" : null,
        cf.dragChute ? "drag chute" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    else if (cf.sc === "iss")
      cfgTxt =
        "International Space Station" + (cf.mplm ? " + logistics module" : "");
    else if (cf.key === "stack")
      cfgTxt = `${L.stages[cf.stage].id} + spacecraft`;
    else if (cf.key === "stage") cfgTxt = L.stages[cf.stage].name;
    else if (cf.key === "ist")
      cfgTxt =
        (L.jettison.find((j) => j.part === "IST") || {}).name || "Interstage";
    else if (cf.key === "capsule")
      cfgTxt = "Capsule" + (cf.chutes ? " under parachutes" : "");
    else cfgTxt = (cf.parts || []).join(" + ") + (cf.landed ? " (landed)" : "");
  }
  setv("cfg", cfgTxt);
  setv("mass", T.m ? fMass(T.m) : "—");
  let eng = "—",
    prop = "—",
    thrTxt = "—",
    mdot = "—",
    tw = "—",
    burnTxt = "—";
  if (T.thrust > 0) {
    if (cf && cf.key === "launch") {
      const st =
        L.stages.find((x) => x.id === (s.extra && s.extra.stage)) ||
        L.stages[cf.stFrom] ||
        L.stages[0];
      const bst = L.stages[0].parallel && cf.boosters ? L.stages[0] : null;
      eng =
        `${st.n} × ${st.engine}` +
        (bst && bst !== st ? ` + ${bst.n} × ${bst.engine}` : "");
      prop =
        PROP[st.prop].label +
        (bst && bst !== st && bst.prop !== st.prop
          ? " + " + PROP[bst.prop].label
          : "");
      const pr = Math.exp(-Math.max(T.alt, 0) / 7.2);
      const isp = st.ispVac + (st.ispSL - st.ispVac) * pr;
      thrTxt = `${fForce(T.thrust)} · ${isp.toFixed(0)} s`;
      mdot = fx(T.thrust / (isp * G0), 0) + " kg/s";
    } else if (b) {
      eng = b.engine;
      prop = (PROP[b.propType] || {}).label || b.propType || "—";
      thrTxt = `${fForce(T.thrust)} · ${fx(b.isp, 0)} s`;
      mdot = fx(T.thrust / (b.isp * G0), 1) + " kg/s";
      burnTxt = `${b.name.split("—")[0].trim()} ${fTime(t - b.t)} / ${fTime(b.dur)} · Δv ${fx(b.dv, 0)} m/s`;
    } else {
      const mod = md.SC.modules.DS || md.SC.modules.LDR;
      if (mod && mod.engine) {
        eng = mod.engine.name;
        prop = PROP[mod.engine.prop].label;
        thrTxt = `${fForce(T.thrust)} · ${mod.engine.isp} s`;
        mdot = fx(T.thrust / (mod.engine.isp * G0), 1) + " kg/s";
      } else thrTxt = fForce(T.thrust);
    }
    if (T.gLocal > 0 && T.m) tw = (T.thrust / (T.m * T.gLocal)).toFixed(2);
  } else if (cf && (cf.key === "launch" || cf.key === "stack")) {
    const st = cf.key === "launch" ? L.stages[cf.stFrom] : L.stages[cf.stage];
    eng = `${st.n} × ${st.engine} (off)`;
    prop = PROP[st.prop].label;
  }
  setv("eng", eng);
  setv("prop", prop);
  setv("thrN", thrTxt);
  setv("mdot", mdot);
  setv("tw", tw);
  setv("burn", burnTxt);
  setv("dv", fx(md.dvSpent(t, c.o.id), 0) + " m/s");
  // tanks
  const tanksEl = E.tanks;
  const tks = md.tanks;
  if (tanksEl.childElementCount !== tks.length + 1) {
    tanksEl.innerHTML = "";
    tanksEl.append(
      h(
        "div",
        { class: "note-s", style: "margin:8px 0 2px" },
        "Propellant remaining",
      ),
    );
    for (const tk of tks)
      tanksEl.append(
        h(
          "div",
          { class: "tank" },
          h("span", { class: "tn" }),
          h("span", { class: "tv" }),
          h("div", { class: "track" }, h("div", { class: "fill" })),
        ),
      );
  }
  const upObj = md.M.obj("upper");
  tks.forEach((tk, i) => {
    const row = tanksEl.children[i + 1];
    const v = md.tankValue(tk, t);
    const active = b && b.engine === tk.engine;
    const gone = tk.id === "upper" && upObj && t > upObj.t0;
    row.children[0].textContent =
      (active ? "▶ " : "") + tk.name + (gone ? " (separated)" : "");
    row.children[0].style.color = active
      ? "var(--amber)"
      : gone
        ? "var(--dim)"
        : "";
    row.children[1].textContent = v == null ? "—" : fMass(v);
    row.children[2].firstChild.style.cssText = `width:${v == null ? 0 : clamp((v / tk.cap) * 100, 0, 100).toFixed(1)}%;background:${(PROP[tk.prop] || {}).plume || "#5cc8ff"}`;
  });
  if (cf && cf.key === "launch" && t >= md.M.t0 && s.m) {
    let dry = 0;
    L.stages.forEach((st, i) => {
      if (st.parallel ? cf.boosters : i >= cf.stFrom) dry += st.dry;
    });
    const jet = L.jettison
      .filter(
        (j) =>
          (j.part === "fairing" && cf.fairing) ||
          (j.part === "LES" && cf.les) ||
          (j.part === "SAJ" && cf.saj) ||
          (j.part === "IST" && cf.ist !== false),
      )
      .reduce((a, j) => a + j.mass, 0);
    const lvProp = s.m - dry - scTotalMass(md.SC) - jet;
    setv("prop", (E.prop.textContent || "") + "");
    E.prop.title = "Launch-vehicle propellant on board: " + fMass(lvProp);
    setv(
      "mass",
      fMass(s.m) + " (" + fMass(Math.max(lvProp, 0)) + " propellant)",
    );
  }
  // atmosphere
  const ex2 = s.extra || {};
  const inAtm =
    (T.ref === "earth" && T.alt < 130) || (T.ref === "mars" && T.alt < 130);
  E.atmoSec.style.display = inAtm && !s.surface ? "" : "none";
  if (inAtm) {
    setv("q", ex2.q != null ? fx(ex2.q / 1000, 2) + " kPa" : "—");
    setv("mach", ex2.mach != null ? fx(ex2.mach, 2) : "—");
    setv(
      "heat",
      ex2.heat != null ? fx(ex2.heat, 1) + " W/cm²" : "—",
      ex2.heat > 50 ? "bad" : "",
    );
    setv(
      "bo",
      ex2.blackout ? "NO SIGNAL" : "clear",
      ex2.blackout ? "bad" : "ok",
    );
    setv(
      "chute",
      ex2.chute
        ? ex2.chute >= 2
          ? "main canopies"
          : "drogue / supersonic"
        : cf && cf.dragChute
          ? "drag chute"
          : "—",
    );
    setv("bank", ex2.bank != null ? fx(ex2.bank, 0) + "°" : "—");
    setv("alpha", ex2.alpha != null ? fx(ex2.alpha, 1) + "°" : "—");
    E.alpha.parentNode &&
      (E.alpha.style.display = E.alpha.previousSibling.style.display =
        ex2.alpha != null ? "" : "none");
  }
}

// ==== 70_panels.js
// ============================================================================
// Panels: event log, Δv & fuel budget, mission sheet, timeline, captions,
// storyboard shots and contact sheet.
// ============================================================================

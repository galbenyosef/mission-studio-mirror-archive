// index-inline-2 76 — cfg
// Lines 21812-22025 of readable/index-inline-2.pretty.js (statement-aligned).
function renderVehicleCard() {
  const el = $("#vehCard");
  if (!el) return;
  const cfg = SETUP.cfg;
  const L = LAUNCHERS[cfg.launcher];
  const SC = scWithOverrides(cfg);
  const pay = scTotalMass(SC);
  const dvCap = stackDeltaV(L, pay);
  const lunar = (cfg.profile || "").startsWith("lunar");
  let dep = 3.13,
    depTxt = "trans-lunar injection";
  if (isLEO(cfg)) {
    dep = 0;
    depTxt = "";
  } else if (!lunar) {
    try {
      const tDep =
        isoToT(cfg.launch) + (cfg.refill ? cfg.refill.days * DAY : 0);
      const leg = cfg.legs[0];
      const a = planetHelio("earth", tDep),
        b = planetHelio(leg.body, isoToT(leg.t));
      const Lm = lambert(
        a.r,
        b.r,
        isoToT(leg.t) - tDep,
        BODIES.sun.mu,
        [0, 0, 1],
      );
      const vinf = vsub(Lm.v1, a.v);
      const rp = BODIES.earth.R + 200;
      dep =
        Math.sqrt(vdot(vinf, vinf) + (2 * BODIES.earth.mu) / rp) -
        Math.sqrt(BODIES.earth.mu / rp);
      depTxt = `escape to ${BODIES[leg.body].name} (C3 ${vdot(vinf, vinf).toFixed(1)})`;
    } catch (e) {
      dep = 3.6;
    }
  }
  const leo = 9.3;
  const need = leo + (cfg.refill || (lunar && cfg.tliBy === "sc") ? 0 : dep);
  const margin = dvCap - need;
  el.innerHTML = launcherSVG(cfg.launcher, cfg.lvVariant);
  {
    const sx = el.querySelector(".scroll-x"),
      gs = el.querySelector(`g[data-key="${cfg.launcher}"]`); // keep the chosen vehicle in view
    if (sx && gs)
      requestAnimationFrame(() => {
        const a = gs.getBoundingClientRect(),
          b = sx.getBoundingClientRect();
        if (a.right > b.right || a.left < b.left)
          sx.scrollLeft += a.left - b.left - (b.width - a.width) / 2;
      });
  }
  el.querySelector("svg").addEventListener("click", (e) => {
    const g = e.target.closest("g[data-key]");
    if (!g) return;
    const k = g.dataset.key;
    const ok = $$("#cfgForm select").find((s) =>
      [...s.options].some((o) => o.value === k),
    );
    if (!ok) return;
    ok.value = k;
    ok.dispatchEvent(new Event("change"));
  });
  el.append(h("p", { class: "p", style: "margin-top:8px" }, L.blurb));
  el.append(
    h(
      "div",
      { class: "kv" },
      h("div", { class: "k" }, "Height · diameter"),
      h("div", { class: "v" }, `${L.height} m · ${L.diameter} m`),
      h("div", { class: "k" }, "Liftoff mass with this payload"),
      h(
        "div",
        { class: "v" },
        fMass(
          pay +
            L.stages.reduce((a, s) => a + s.dry + s.propMass, 0) +
            L.jettison.reduce((a, j) => a + j.mass, 0),
        ),
      ),
      ...(CAPACITY[cfg.launcher] || []).flatMap(([k, v]) => [
        h("div", { class: "k" }, "Capacity: " + k),
        h("div", { class: "v" }, v),
      ]),
      h("div", { class: "k" }, "Ideal stack Δv with this payload"),
      h("div", { class: "v" }, fx(dvCap, 2) + " km/s"),
      h(
        "div",
        { class: "k" },
        `Needed: orbit ≈ ${leo} km/s${need > leo ? " + " + depTxt + " " + fx(dep, 2) : ""}`,
      ),
      h(
        "div",
        { class: "v " + (margin >= 0 ? "ok" : "bad") },
        fx(need, 2) + " km/s",
      ),
      h(
        "div",
        { class: "full note-s" },
        margin >= 0
          ? `Margin ≈ ${fx(margin, 2)} km/s (rough rocket-equation check; the full simulation decides).`
          : `Short by ≈ ${fx(-margin, 2)} km/s — expect the simulation to fall short.` +
              (cfg.refill ? "" : ""),
      ),
    ),
  );
  el.append(
    h(
      "div",
      { class: "scroll-x" },
      h(
        "table",
        { class: "t", style: "margin-top:8px" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Stage"),
            h("th", null, "Propellant"),
            h("th", null, "Prop. mass"),
            h("th", null, "Thrust (vac)"),
          ),
        ),
        h(
          "tbody",
          null,
          ...L.stages.map((s) =>
            h(
              "tr",
              null,
              h("td", null, s.name),
              h("td", null, PROP[s.prop].label),
              h("td", { class: "n" }, fMass(s.propMass)),
              h("td", { class: "n" }, fForce(s.thrustVac)),
            ),
          ),
        ),
      ),
    ),
  );
}
function scWithOverrides(cfg) {
  const SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.payloadMass && SC.modules.CARGO)
    SC.modules.CARGO.dry = cfg.payloadMass;
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      if (SC.modules[k]) Object.assign(SC.modules[k], cfg.scOverride[k]);
  return SC;
}
function renderScCard() {
  const el = $("#scCard");
  if (!el) return;
  const cfg = SETUP.cfg;
  const SC = scWithOverrides(cfg);
  el.innerHTML = "";
  el.append(
    h(
      "p",
      { class: "p" },
      h("b", null, SC.name),
      ` — ${fMass(scTotalMass(SC))} total${SC.crewMax ? `, up to ${SC.crewMax} crew` : ""}.`,
    ),
  );
  el.append(
    h(
      "div",
      { class: "scroll-x" },
      h(
        "table",
        { class: "t" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Module"),
            h("th", null, "Dry"),
            h("th", null, "Propellant"),
          ),
        ),
        h(
          "tbody",
          null,
          ...Object.values(SC.modules).map((m) =>
            h(
              "tr",
              null,
              h(
                "td",
                null,
                m.name,
                m.engine
                  ? h(
                      "div",
                      { class: "note-s" },
                      `${m.engine.name} · ${fForce(m.engine.thrust)} · Isp ${m.engine.isp} s · ${PROP[m.engine.prop].label}`,
                    )
                  : null,
              ),
              h("td", { class: "n" }, fMass(m.dry)),
              h("td", { class: "n" }, m.prop ? fMass(m.prop) : "—"),
            ),
          ),
        ),
      ),
    ),
  );
}
// ---------------- porkchop ----------------

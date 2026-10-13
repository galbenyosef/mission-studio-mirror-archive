// index-inline-2 66 — pane
// Lines 18785-18989 of readable/index-inline-2.pretty.js (statement-aligned).
function buildBudgetPanel() {
  const md = MV.md;
  const M = md.M;
  const L = md.L;
  const pane = $("#tab-budget");
  pane.innerHTML = "";
  const liftoffMass = (() => {
    let m = scTotalMass(md.SC);
    for (const s of L.stages) m += s.dry + s.propMass;
    m += L.jettison.reduce((a, j) => a + j.mass, 0);
    return m;
  })();
  const liftoffThrust = L.stages
    .filter(
      (s, i) => i === 0 || (L.stages[0].parallel && i === 1 && !s.ignition),
    )
    .reduce((a, s) => a + s.thrustSL, 0);
  const lvProp = L.stages.reduce((a, s) => a + s.propMass, 0);
  const scProp = md.burns.reduce((a, b) => a + (b.prop || 0), 0);
  const dvTot = md.burns.reduce((a, b) => a + (b.dv || 0), 0);
  pane.append(
    h("h3", { class: "h" }, "Launch"),
    h(
      "div",
      { class: "kv" },
      h("div", { class: "k" }, "Liftoff mass"),
      h("div", { class: "v" }, fMass(liftoffMass)),
      h("div", { class: "k" }, "Liftoff thrust"),
      h("div", { class: "v" }, fForce(liftoffThrust)),
      h("div", { class: "k" }, "Thrust-to-weight at liftoff"),
      h("div", { class: "v" }, (liftoffThrust / (liftoffMass * G0)).toFixed(2)),
      h("div", { class: "k" }, "Launch-vehicle propellant"),
      h("div", { class: "v" }, fMass(lvProp)),
      h("div", { class: "k" }, "Δv delivered by ascent"),
      h("div", { class: "v" }, fx(md.ascentDv, 0) + " m/s"),
      md.cfg.refill
        ? [
            h("div", { class: "k" }, "Refilled in orbit"),
            h(
              "div",
              { class: "v" },
              fMass(md.cfg.refill.to) + ` (${md.cfg.refill.tankers} tankers)`,
            ),
          ]
        : null,
    ),
  );
  const stTable = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Stage"),
        h("th", { style: "text-align:right" }, "Loaded · burn"),
      ),
    ),
    h(
      "tbody",
      null,
      ...L.stages.map((s) => {
        const mdot = s.thrustVac / (s.ispVac * G0);
        return h(
          "tr",
          null,
          h(
            "td",
            null,
            h("b", null, s.name),
            h(
              "div",
              { class: "note-s" },
              `${s.n} × ${s.engine} · ${(PROP[s.prop] || {}).label}`,
            ),
            h(
              "div",
              { class: "note-s" },
              `${fForce(s.thrustSL)} sea level / ${fForce(s.thrustVac)} vacuum · Isp ${s.ispSL}/${s.ispVac} s`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fMass(s.propMass),
            h("div", { class: "note-s" }, fTime(s.propMass / mdot)),
          ),
        );
      }),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, stTable));
  pane.append(h("h3", { class: "h" }, "Spacecraft & upper-stage burns"));
  const bt = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Burn"),
        h("th", { style: "text-align:right" }, "Δv · propellant"),
      ),
    ),
    h(
      "tbody",
      null,
      ...md.burns.map((b) => {
        const tr = h(
          "tr",
          { class: "click" },
          h(
            "td",
            null,
            h("b", null, b.name),
            h(
              "div",
              { class: "note-s mono" },
              fMET(b.t - M.t0) + " · " + fTime(b.dur),
            ),
            h(
              "div",
              { class: "note-s" },
              `${b.engine} · ${(PROP[b.propType] || {}).label || b.propType || ""}${b.obj !== "ship" ? " · " + (M.obj(b.obj) || {}).name : ""}`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fx(b.dv, 0) + " m/s",
            h("div", { class: "note-s" }, fMass(b.prop)),
          ),
        );
        tr.addEventListener("click", () => setTime(b.t - 8));
        return tr;
      }),
      h(
        "tr",
        { class: "tot" },
        h("td", null, "Total"),
        h(
          "td",
          { class: "n" },
          fx(dvTot, 0) + " m/s",
          h("div", { class: "note-s" }, fMass(scProp)),
        ),
      ),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, bt));
  pane.append(
    h(
      "p",
      { class: "note-s" },
      "Each burn obeys the rocket equation Δv = Isp · g₀ · ln(m₀ / m₁): the propellant needed grows exponentially with the Δv asked of it, which is why staging and low-mass spacecraft matter.",
    ),
  );
  pane.append(h("h3", { class: "h" }, "Propellant tanks"));
  const tt = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Tank"),
        h("th", { style: "text-align:right" }, "Loaded · left"),
      ),
    ),
    h(
      "tbody",
      null,
      ...md.tanks.map((tk) =>
        h(
          "tr",
          null,
          h(
            "td",
            null,
            h("b", null, tk.name),
            h(
              "div",
              { class: "note-s" },
              `${tk.engine} · ${(PROP[tk.prop] || {}).label || tk.prop}`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fMass(tk.init),
            h("div", { class: "note-s" }, fMass(md.tankValue(tk, md.tEnd))),
          ),
        ),
      ),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, tt));
}
// ---------------- mission sheet ----------------

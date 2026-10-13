// index-inline-2 74 — append
// Lines 21268-21531 of readable/index-inline-2.pretty.js (statement-aligned).
function fieldsLEO(cfg, SC, launchers, grp, F) {
  const pads = Object.entries(LAUNCH_SITES)
    .filter(([k]) => /^KSC39/.test(k))
    .map(([k, s]) => [k, s.name]);
  grp(
    "Launch",
    {
      path: "launcher",
      label: "Launch vehicle",
      type: "select",
      options: launchers,
      wide: true,
    },
    {
      path: "site",
      label: "Launch pad",
      type: "select",
      options: pads,
      wide: true,
    },
    { path: "launch", label: "Liftoff (UTC)", type: "datetime", wide: true },
    {
      path: "incl",
      label: "Orbit inclination",
      unit: "°",
      type: "number",
      min: 28.5,
      max: 57,
      step: 0.01,
    },
    {
      path: "parking.ha",
      label: "Apogee at main engine cutoff",
      unit: "km",
      type: "number",
      min: 160,
      max: 700,
      step: 1,
    },
    {
      path: "oms2.hp",
      label: "Perigee after OMS-2",
      unit: "km",
      type: "number",
      min: 150,
      max: 650,
      step: 1,
    },
  );
  grp(
    "Crew & payload",
    { path: "name", label: "Mission name", type: "text", wide: true },
    { path: "shipName", label: "Orbiter", type: "text", wide: true },
    {
      path: "crew",
      label: "Crew",
      type: "number",
      min: 2,
      max: SC.crewMax,
      step: 1,
      unit: `max ${SC.crewMax}`,
    },
    {
      path: "scOverride.PAY.dry",
      label: "Payload in the bay",
      unit: "kg",
      type: "number",
      min: 0,
      max: 25000,
      step: 100,
    },
    {
      path: "scOverride.OMS.prop",
      label: "OMS propellant",
      unit: "kg",
      type: "number",
      min: 4000,
      max: 12800,
      step: 100,
    },
  );
  grp(
    "Landing",
    {
      path: "runway",
      label: "Runway",
      type: "select",
      options: RUNWAY_LIST(),
      wide: true,
    },
    {
      path: "landing",
      label: "Landing (UTC) — the nearest pass is chosen",
      type: "datetime",
      wide: true,
    },
    {
      path: "dragChute",
      label: "Drag chute",
      type: "select",
      options: [
        ["true", "Yes (flown from 1992)"],
        ["false", "No"],
      ],
      wide: true,
      parse: (v) => v === "true",
    },
  );
  return F;
}
function renderDetail() {
  const s = SETUP.scn,
    cfg = SETUP.cfg;
  const root = $("#scnDetail");
  root.innerHTML = "";
  root.append(
    h(
      "div",
      { class: "det-head" },
      h(
        "div",
        null,
        h("h2", null, s.title),
        h("div", { class: "det-sub" }, `${s.agency} · ${s.year} · ${s.status}`),
      ),
      h(
        "div",
        { class: "chipline" },
        h(
          "span",
          { class: "pill " + (s.crewed ? "crew" : "robot") },
          s.crewed ? "Crewed" : "Robotic",
        ),
        h("span", { class: "pill st" }, s.tag),
      ),
    ),
  );
  root.append(
    h("p", { class: "p", style: "max-width:75ch;margin-top:8px" }, s.blurb),
  );
  if (s.crewNames)
    root.append(h("p", { class: "p" }, h("b", null, "Crew: "), s.crewNames));
  const colA = h("div"),
    colB = h("div");
  root.append(h("div", { class: "det-cols" }, colA, colB));
  // inputs
  colA.append(h("h3", { class: "h" }, "Mission inputs"));
  const form = h("form", {
    id: "cfgForm",
    onsubmit: (e) => e.preventDefault(),
  });
  for (const g of fieldsFor(cfg, s)) {
    const fs = h("fieldset", null, h("legend", null, g.group));
    const grid = h("div", { class: "fgrid" });
    fs.append(grid);
    for (const f of g.items) grid.append(fieldEl(f));
    form.append(fs);
  }
  form.append(
    h(
      "div",
      { class: "btnrow" },
      h(
        "button",
        {
          type: "button",
          class: "tb",
          onclick: () => {
            SETUP.cfg = JSON.parse(JSON.stringify(SETUP.orig));
            renderDetail();
            schedulePlan(0);
          },
        },
        "Reset to the real mission",
      ),
    ),
  );
  colA.append(form);
  if (cfg.legs && cfg.legs[0] && cfg.legs[0].body === "mars") {
    colA.append(h("h3", { class: "h" }, "Launch window — porkchop plot"));
    colA.append(
      h(
        "p",
        { class: "note-s" },
        "Departure energy C3 (km²/s²) for every departure date and flight time to Mars. Darker = cheaper. Click to pick a departure and arrival; the planner re-targets the whole flight.",
      ),
    );
    colA.append(
      h(
        "div",
        { id: "porkWrap" },
        h("canvas", { id: "pork", width: 640, height: 400 }),
        h("div", { id: "porkInfo" }),
      ),
    );
    setTimeout(drawPorkchop, 30);
  }
  // vehicle card
  colB.append(
    h("h3", { class: "h" }, "Launch vehicle"),
    h("div", { id: "vehCard" }),
  );
  colB.append(
    h("h3", { class: "h" }, "Spacecraft"),
    h("div", { id: "scCard" }),
  );
  if (s.real)
    colB.append(
      h(
        "h3",
        { class: "h" },
        s.status === "Flown" || s.status === "In flight"
          ? "What really happened"
          : "Reference",
      ),
      h(
        "div",
        { class: "kv kv2" },
        ...Object.entries(s.real).flatMap(([k, v]) => [
          h("div", { class: "k" }, k),
          h("div", { class: "v", style: "color:var(--fg-2)" }, v),
        ]),
      ),
    );
  // plan box
  root.append(
    h(
      "div",
      { class: "plan-box" },
      h(
        "div",
        { style: "min-width:0" },
        h("div", { class: "plan-status", id: "planStatus" }),
        h("div", { class: "plan-kpis", id: "planKpis" }),
      ),
      h(
        "div",
        { class: "go-wrap" },
        h(
          "label",
          {
            class: "chk go-sound",
            title: "Sound (M) — engines, countdown, separations, ambient music",
          },
          h("input", {
            type: "checkbox",
            id: "goSound",
            checked: SND.on,
            onchange: (e) => setSound(e.target.checked),
          }),
          "Sound",
        ),
        h(
          "button",
          { class: "tb primary go", id: "goBtn", onclick: launchFromSetup },
          "Fly this mission ▶",
        ),
      ),
    ),
  );
  renderVehicleCard();
  renderScCard();
  renderPlanStatus();
}

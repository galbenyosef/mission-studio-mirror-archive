// index-inline-2 78 — sec
// Lines 22674-22808 of readable/index-inline-2.pretty.js (statement-aligned).
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
function setv(id, txt, cls) {
  const e = TELE.els[id];
  if (!e) return;
  if (e.textContent !== txt) e.textContent = txt;
  if (cls !== undefined) e.className = "v" + (cls ? " " + cls : "");
}

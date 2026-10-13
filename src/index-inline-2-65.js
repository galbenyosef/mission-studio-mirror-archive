// index-inline-2 65 — panel
// Lines 18582-18784 of readable/index-inline-2.pretty.js (statement-aligned).
const KIND_LABEL = {
  launch: "launch",
  ascent: "ascent",
  maxq: "max-Q",
  staging: "staging",
  ignition: "ignition",
  jettison: "jettison",
  insertion: "orbit",
  burn: "burn",
  sep: "separation",
  soi: "gravity",
  los: "radio",
  flyby: "flyby",
  record: "record",
  photo: "photo",
  info: "note",
  emergency: "emergency",
  entry: "entry",
  skip: "entry",
  chute: "parachute",
  blackout: "radio",
  heat: "heating",
  gload: "g-load",
  landing: "landing",
  touchdown: "landing",
  powered: "descent",
  skycrane: "descent",
  dock: "docking",
  refill: "refilling",
  isru: "ISRU",
  fail: "failure",
  approach: "descent",
  terminal: "descent",
  trim: "entry",
  deploy: "deploy",
};
const EVF = {
  all: () => true,
  key: (e) =>
    ![
      "ascent",
      "heat",
      "gload",
      "blackout",
      "los",
      "soi",
      "approach",
      "terminal",
    ].includes(e.kind),
  burns: (e) =>
    [
      "burn",
      "ignition",
      "staging",
      "sep",
      "jettison",
      "insertion",
      "powered",
      "dock",
      "launch",
      "refill",
    ].includes(e.kind),
  photo: (e) =>
    [
      "photo",
      "info",
      "record",
      "flyby",
      "emergency",
      "landing",
      "touchdown",
    ].includes(e.kind),
};
const PANEL = { evFilter: "key", curEv: -2, userScroll: 0 };
function buildEventsPanel() {
  const md = MV.md;
  const pane = $("#tab-events");
  pane.innerHTML = "";
  const fl = h(
    "div",
    { class: "filter" },
    ...[
      ["key", "Key events"],
      ["all", "All"],
      ["burns", "Burns & staging"],
      ["photo", "Story moments"],
    ].map(([k, l]) =>
      h(
        "button",
        {
          class: PANEL.evFilter === k ? "on" : "",
          onclick: () => {
            PANEL.evFilter = k;
            buildEventsPanel();
          },
        },
        l,
      ),
    ),
  );
  pane.append(fl);
  const list = h("div", { id: "evList" });
  pane.append(list);
  md.events.forEach((e, i) => {
    if (!EVF[PANEL.evFilter](e)) return;
    const obj = md.M.obj(e.obj);
    const objName = obj && obj.id !== "ship" ? obj.name : "";
    const row = h(
      "div",
      { class: `ev kind-${e.kind}`, dataset: { i } },
      h("div", { class: "em" }, fMET(e.t - md.M.t0)),
      h(
        "div",
        { class: "en" },
        h("span", null, e.name),
        h("span", { class: "kind" }, KIND_LABEL[e.kind] || e.kind),
      ),
      h(
        "div",
        { class: "ed" },
        e.desc,
        e.gaNote
          ? h("div", { style: "color:var(--cyan);margin-top:3px" }, e.gaNote)
          : null,
        h(
          "div",
          { class: "obj" },
          fmtUTC(e.t) + " UTC" + (objName ? " · " + objName : ""),
        ),
      ),
    );
    row.addEventListener("click", () => {
      jumpToEvent(e);
      row.classList.toggle("open");
    });
    list.append(row);
  });
  list.addEventListener(
    "wheel",
    () => {
      PANEL.userScroll = performance.now();
    },
    { passive: true },
  );
  list.addEventListener(
    "touchmove",
    () => {
      PANEL.userScroll = performance.now();
    },
    { passive: true },
  );
  PANEL.curEv = -2;
}
function updateEventsPanel(t) {
  const md = MV.md;
  if (!md) return;
  let ci = -1;
  for (let i = 0; i < md.events.length; i++)
    if (md.events[i].t <= t + 0.01) ci = i;
    else break;
  if (ci === PANEL.curEv) return;
  PANEL.curEv = ci;
  const rows = $$("#evList .ev");
  let curRow = null;
  for (const r of rows) {
    const i = +r.dataset.i;
    r.classList.toggle("future", i > ci);
    r.classList.remove("cur");
    if (i <= ci) curRow = r;
  }
  if (curRow) {
    curRow.classList.add("cur");
    if (
      performance.now() - PANEL.userScroll > 6000 &&
      !$("#tab-events").hidden
    ) {
      const pane = $("#tab-events");
      const top = curRow.offsetTop - pane.clientHeight * 0.35;
      pane.scrollTo({ top, behavior: "smooth" });
    }
  }
}
function jumpToEvent(e) {
  const lead = ["launch"].includes(e.kind)
    ? 15
    : [
          "flyby",
          "landing",
          "touchdown",
          "entry",
          "photo",
          "info",
          "emergency",
          "record",
          "soi",
        ].includes(e.kind)
      ? 25
      : 6;
  setTime(e.t - lead);
  STATE.lastCaptionEv = -1;
  if (STATE.auto) STATE.rateTarget = 1;
}
// ---------------- Δv & fuel ----------------

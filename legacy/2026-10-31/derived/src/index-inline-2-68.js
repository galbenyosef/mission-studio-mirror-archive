// index-inline-2 68 — cam
// Lines 19321-19661 of readable/index-inline-2.pretty.js (statement-aligned).
function initTimeline() {
  const el = $("#timeline");
  const hov = $("#tlHover");
  let drag = false;
  const tAt = (e) => {
    const r = el.getBoundingClientRect();
    return tlT((e.clientX - r.left - 6) / (r.width - 12));
  };
  el.addEventListener("pointerdown", (e) => {
    if (!MV.md) return;
    drag = true;
    el.setPointerCapture(e.pointerId);
    setTime(tAt(e));
  });
  el.addEventListener("pointermove", (e) => {
    if (!MV.md || !TL.map) return;
    const t = tAt(e);
    if (drag) setTime(t);
    const md = MV.md;
    let near = null,
      nd = 1e9;
    const r = el.getBoundingClientRect();
    for (const ev of md.events) {
      const d = Math.abs(tlX(ev.t) * (r.width - 12) + 6 - (e.clientX - r.left));
      if (d < nd) {
        nd = d;
        near = ev;
      }
    }
    const ph = md.phaseAt(t);
    const px = e.clientX - r.left;
    let burn = null;
    for (const x of md.powered) {
      const a = tlX(x.t0) * (r.width - 12) + 6,
        b = tlX(x.t1) * (r.width - 12) + 6;
      if (px >= a - 3 && px <= b + 3) {
        burn = x;
        break;
      }
    }
    hov.style.display = "block";
    hov.style.left = px + "px";
    hov.textContent = `${fMET(t - md.M.t0)} · ${ph ? ph.name : ""}${burn ? " · ENGINE ON: " + burn.name : near && nd < 6 ? " · " + near.name : ""}`;
  });
  const end = () => {
    drag = false;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", () => {
    hov.style.display = "none";
  });
}
// ---------------- captions ----------------
const CAP = { until: 0, ev: null };
function showCaption(e) {
  if (!MV.layers.captions) return;
  const el = $("#caption");
  el.querySelector(".cap-name").textContent = e.name;
  let d = e.desc || "";
  const sentences = d.split(/(?<=[.!?”])\s+/);
  d = sentences.slice(0, 2).join(" ");
  el.querySelector(".cap-desc").textContent = d;
  el.classList.remove("fade");
  CAP.until = performance.now() + clamp(3500 + d.length * 45, 4000, 11000);
  CAP.ev = e;
}
function updateCaption() {
  if (CAP.until && performance.now() > CAP.until) {
    $("#caption").classList.add("fade");
    CAP.until = 0;
  }
}
// ---------------- storyboard ----------------
const SHOTS = { list: [], key: "" };
function shotsKey() {
  return (
    "mstudio-shots-" + (MV.md ? (MV.md.scn ? MV.md.scn.id : "custom") : "none")
  );
}
function loadShots() {
  SHOTS.key = shotsKey();
  SHOTS.list = lsGet(SHOTS.key, []) || [];
  renderShots();
}
function saveShots() {
  if (!lsSet(SHOTS.key, SHOTS.list)) {
    /* storage full: keep in memory */
  }
}
function camDesc(c) {
  const lens = `${Math.round(c.lens)} mm`;
  const tgt = c.target.startsWith("obj:")
    ? (MV.md.M.obj(c.target.slice(4)) || {}).name || c.target
    : BODIES[c.target.slice(5)].name;
  const mode = {
    orbit: "Orbit cam",
    chase: "Chase cam",
    lookat: "Look-at",
    ground: "Ground observer",
    top: "Top-down map",
  }[c.mode];
  return `${mode} · ${lens} · on ${tgt}${c.mode === "lookat" ? " → " + (c.look.startsWith("body:") ? BODIES[c.look.slice(5)].name : c.look.slice(4)) : ""}`;
}
function captureShot() {
  const md = MV.md;
  if (!md) return;
  renderFrame(true);
  const src = R.renderer.domElement;
  const pr = R.renderer.getPixelRatio();
  const fr = frameRect();
  const sx = fr.x * pr,
    sy = fr.y * pr,
    sw = fr.w * pr,
    sh = fr.h * pr;
  const W = 960,
    Hh = Math.round((W * fr.h) / fr.w);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const g = cv.getContext("2d");
  g.drawImage(src, sx, sy, sw, sh, 0, 0, W, Hh);
  const t = STATE.t;
  const ph = md.phaseAt(t);
  const prevEv = [...md.events]
    .reverse()
    .find((e) => e.t <= t && t - e.t < 1800);
  const ps = PSTAT.cur;
  const propTxt = ps
    ? ps.k === "burn"
      ? `${ps.l}: ${String(ps.name || "")
          .split("—")[0]
          .trim()}`
      : ps.l
    : "";
  const camS = {
    mode: CAM.mode,
    target: CAM.target,
    look: CAM.look,
    lens: CAM.lens,
    az: CAM.az,
    el: CAM.el,
    dist: CAM.dist,
    roll: CAM.roll,
    aspect: CAM.aspect,
    ground: { ...CAM.ground },
  };
  const n = SHOTS.list.length ? Math.max(...SHOTS.list.map((s) => s.n)) + 1 : 1;
  // slate strip
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(0, Hh - 26, W, 26);
  g.fillStyle = "#ffb547";
  g.font = '600 14px "IBM Plex Mono", monospace';
  g.fillText(`SHOT ${n}`, 10, Hh - 8);
  g.fillStyle = "#e6ecf5";
  g.font = '13px "IBM Plex Mono", monospace';
  g.fillText(
    `${fMET(t - md.M.t0)}  ·  ${camDesc(camS)}  ·  ${ph ? ph.name : ""}${propTxt ? "  ·  " + propTxt : ""}`,
    92,
    Hh - 8,
  );
  const img = cv.toDataURL("image/jpeg", 0.82);
  const shot = {
    n,
    t,
    met: fMET(t - md.M.t0),
    utc: fmtUTC(t),
    phase: ph ? ph.name : "",
    prop: propTxt,
    cam: camS,
    img,
    caption: prevEv ? prevEv.name + " — " : ph ? ph.name + " — " : "",
    w: W,
    h: Hh,
  };
  SHOTS.list.push(shot);
  saveShots();
  renderShots();
  const b = $("#bShot");
  b.textContent = "✓ Saved";
  setTimeout(() => {
    b.textContent = "● Shot";
  }, 900);
  const flash = h("div", {
    style:
      "position:absolute;inset:0;background:#fff;opacity:.35;pointer-events:none;transition:opacity .35s;z-index:30",
  });
  $("#app").append(flash);
  requestAnimationFrame(() => {
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 400);
  });
}
function gotoShot(s) {
  Object.assign(CAM, {
    mode: s.cam.mode,
    target: s.cam.target,
    look: s.cam.look,
    lens: s.cam.lens,
    az: s.cam.az,
    el: s.cam.el,
    dist: s.cam.dist,
    roll: s.cam.roll || 0,
    aspect: s.cam.aspect || 0,
  });
  CAM.ground = { ...s.cam.ground };
  CAM.trans = null;
  $("#selAspect").value = String(CAM.aspect || 0);
  applyLens();
  syncCamUI();
  setTime(s.t);
  STATE.playing = false;
  syncPlayUI();
}
function renderShots() {
  const pane = $("#tab-shots");
  pane.innerHTML = "";
  $("#shotCount").textContent = SHOTS.list.length
    ? `(${SHOTS.list.length})`
    : "";
  pane.append(
    h(
      "p",
      { class: "note-s" },
      "Frame the view, pick a lens and aspect ratio, then capture. Each shot stores the time, camera and lens so you can return to it exactly.",
    ),
  );
  pane.append(
    h(
      "div",
      { class: "btnrow" },
      h(
        "button",
        { class: "tb primary", onclick: captureShot },
        "● Capture shot",
      ),
      h(
        "button",
        { class: "tb", onclick: openSheet, disabled: !SHOTS.list.length },
        "Contact sheet",
      ),
      h(
        "button",
        { class: "tb", onclick: copyShotList, disabled: !SHOTS.list.length },
        "Copy shot list",
      ),
    ),
  );
  SHOTS.list.forEach((s, i) => {
    const ta = h("textarea", { placeholder: "Caption / action / dialogue…" });
    ta.value = s.caption || "";
    ta.addEventListener("input", () => {
      s.caption = ta.value;
      saveShots();
    });
    const del = h("button", null, "Delete");
    let armed = false;
    del.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        del.textContent = "Confirm delete";
        del.style.color = "var(--red)";
        setTimeout(() => {
          armed = false;
          del.textContent = "Delete";
          del.style.color = "";
        }, 2500);
        return;
      }
      SHOTS.list.splice(i, 1);
      saveShots();
      renderShots();
    });
    pane.append(
      h(
        "div",
        { class: "shot" },
        h("img", {
          src: s.img,
          alt: "Shot " + s.n,
          onclick: () => gotoShot(s),
        }),
        h(
          "div",
          { style: "min-width:0" },
          h(
            "div",
            { class: "meta" },
            h("b", null, `#${s.n}`),
            ` ${s.met}`,
            h("br"),
            `${camDesc(s.cam)}`,
          ),
          ta,
          h(
            "div",
            { class: "acts" },
            h("button", { onclick: () => gotoShot(s) }, "Go to"),
            h(
              "button",
              {
                onclick: () => {
                  if (i > 0) {
                    SHOTS.list.splice(i - 1, 0, SHOTS.list.splice(i, 1)[0]);
                    saveShots();
                    renderShots();
                  }
                },
              },
              "↑",
            ),
            h(
              "button",
              {
                onclick: () => {
                  if (i < SHOTS.list.length - 1) {
                    SHOTS.list.splice(i + 1, 0, SHOTS.list.splice(i, 1)[0]);
                    saveShots();
                    renderShots();
                  }
                },
              },
              "↓",
            ),
            del,
          ),
        ),
      ),
    );
  });
}
function shotListText() {
  const md = MV.md;
  const lines = [`${md.M.name} — storyboard shot list`, ""];
  SHOTS.list.forEach((s, i) =>
    lines.push(
      `${i + 1}. [Shot ${s.n}] ${s.met}  (${s.utc} UTC)  ${s.phase}${s.prop ? " · " + s.prop : ""}\n   Camera: ${camDesc(s.cam)}${s.cam.aspect ? " · " + s.cam.aspect + ":1" : ""}\n   ${s.caption || ""}`,
    ),
  );
  return lines.join("\n");
}

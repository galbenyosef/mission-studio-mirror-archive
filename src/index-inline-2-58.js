// index-inline-2 58 — cam
// Lines 16528-16834 of readable/index-inline-2.pretty.js (statement-aligned).
const CAM = {
  mode: "auto",
  target: "obj:ship",
  look: "body:moon",
  az: 200 * DEG,
  el: 10 * DEG,
  dist: 0.3,
  roll: 0,
  lens: 35,
  aspect: 0,
  ground: { yaw: 0, pitch: 10 * DEG, track: true },
  trans: null,
  lastTargetP: null,
};
function targetPos(id, t) {
  if (!id) return null;
  if (id.startsWith("body:")) return helio(id.slice(5), t).r;
  const c = craftById(id.slice(4));
  if (c && c.P) return c.P;
  if (c) {
    const s = craftState(c, t);
    if (s) return vadd(helio(s.ref, t).r, s.r);
  }
  return null;
}
function targetRadius(id) {
  if (id && id.startsWith("body:")) {
    const b = R.bodies[id.slice(5)];
    return b ? b.R : 1;
  }
  return 0;
}
function targetCraft() {
  return CAM.target.startsWith("obj:") ? craftById(CAM.target.slice(4)) : null;
}
function setTarget(id, opts = {}) {
  if (id === CAM.target && !opts.force) return;
  const t = MV.tNow;
  const from = targetPos(CAM.target, t);
  const prevId = CAM.target;
  CAM.target = id;
  const rT = targetRadius(id);
  const c = targetCraft();
  let dist = CAM.dist;
  if (rT > 0) dist = Math.max(dist, rT * 3.2);
  else if (c && c.cur)
    dist = Math.max(0.03, (c.cur.userData.len || 10) * 0.001 * 3.5);
  if (opts.dist) dist = opts.dist;
  if (from)
    CAM.trans = {
      fromId: prevId,
      fromP: from,
      t0: performance.now(),
      dur: 1100,
      distFrom: CAM.dist,
      distTo: dist,
    };
  CAM.dist = dist;
  if (CAM.mode === "ground" && id.startsWith("body:")) setMode("orbit");
  if (CAM.mode === "auto" && !opts.keepMode)
    setMode(id.startsWith("body:") ? "orbit" : "chase");
  syncCamUI();
}
function setMode(m) {
  const wasAuto = CAM.mode === "auto";
  CAM.mode = m;
  $("#lookWrap").hidden = m !== "lookat";
  if (m === "auto") {
    DIR.key = "";
    DIR.lastT = null;
    DIR.blend = null;
  }
  if (wasAuto && m !== "auto" && DIR.prm) {
    CAM.dist = DIR.prm.dist;
    CAM.az = DIR.prm.az;
    CAM.el = DIR.prm.el;
  }
  if (m === "ground") {
    CAM.ground.track = true;
    if (CAM.lens < 85) CAM.lens = 200;
  }
  if (m === "top") {
    CAM.el = 89 * DEG;
  }
  if (m === "chase") {
    CAM.az = 200 * DEG;
    CAM.el = 12 * DEG;
  }
  if (m === "lookat") {
    CAM.az = 12 * DEG;
    CAM.el = 6 * DEG;
  }
  applyLens();
  syncCamUI();
}
function frameRect() {
  const W = R.width,
    Hh = R.height,
    A = CAM.aspect;
  if (!A) return { x: 0, y: 0, w: W, h: Hh };
  if (W / Hh > A) {
    const w = Hh * A;
    return { x: (W - w) / 2, y: 0, w, h: Hh };
  }
  const hh = W / A;
  return { x: 0, y: (Hh - hh) / 2, w: W, h: hh };
}
function applyLens() {
  const fr = frameRect();
  const tanH = 18 / CAM.lens; // 36 mm wide full-frame sensor
  const tanV = (tanH * R.height) / fr.w;
  R.camera.fov = 2 * Math.atan(tanV) * RAD;
  R.camera.aspect = R.width / R.height;
  R.camera.updateProjectionMatrix();
  R.pxPerRad = R.height / (2 * tanV);
  const lb = (id, css) => {
    $(id).style.cssText = css;
  };
  lb("#lbT", `left:0;right:0;top:0;height:${fr.y}px`);
  lb("#lbB", `left:0;right:0;bottom:0;height:${R.height - fr.y - fr.h}px`);
  lb("#lbL", `top:0;bottom:0;left:0;width:${fr.x}px`);
  lb("#lbR", `top:0;bottom:0;right:0;width:${R.width - fr.x - fr.w}px`);
  const gd = $("#guides");
  gd.style.cssText = `left:${fr.x}px;top:${fr.y}px;width:${fr.w}px;height:${fr.h}px`;
  const bi = $("#burnin");
  bi.style.left = fr.x + 14 + "px";
  bi.style.bottom = R.height - fr.y - fr.h + 10 + "px";
}
// where a craft actually stands on a body (its surface segment), preferring the camera target
function surfaceSpotOn(body, after = -Infinity) {
  const order = [
    targetCraft(),
    craftById("ship"),
    craftById("lander"),
    ...MV.crafts,
  ].filter(Boolean);
  for (const c of order)
    for (const sg of c.o.segs)
      if (sg.type === "surface" && sg.ref === body && sg.t0 > after)
        return { lat: sg.lat, lon: sg.lon, elev: sg.elev || 0 };
  return null;
}
function groundSite(t) {
  const md = MV.md;
  const P = targetPos(CAM.target, t) || helio("earth", t).r;
  const near = (b, d) => vnorm(vsub(P, helio(b, t).r)) < d;
  const cfg = md.cfg;
  const off = (body, lat, lon, elev, dE, dN) => {
    const Rb = surfaceRadius(body);
    return {
      body,
      lat: lat + (dN / Rb) * RAD,
      lon: lon + (dE / (Rb * Math.cos(lat * DEG))) * RAD,
      alt: (elev || 0) + 0.0018,
    };
  };
  if (near("moon", 30000)) {
    const sp =
      surfaceSpotOn("moon") ||
      (typeof cfg.landing === "object" ? cfg.landing : null);
    if (sp) return off("moon", sp.lat, sp.lon, sp.elev || 0, -0.35, -0.12);
  }
  if (near("mars", 50000)) {
    const l = (cfg.legs || []).find((x) => x.body === "mars" && x.site);
    const sp = surfaceSpotOn("mars") || (l && l.site);
    if (sp) return off("mars", sp.lat, sp.lon, sp.elev || 0, -0.6, -0.25);
  }
  if (near("earth", 60000)) {
    const S = LAUNCH_SITES[cfg.site],
      rw = cfg.runway && RUNWAYS[cfg.runway];
    if (rw && t > md.M.t0 + 3 * 3600) {
      // a Shuttle landing: beside the runway, 1.2 km past the threshold, like the photographers at the landing strip
      const pe = sitePosEcl("earth", rw.lat, rw.lon, 0, t);
      if (vnorm(vsub(vsub(P, helio("earth", t).r), pe)) < 800) {
        const hd = rw.hdg * DEG,
          a = 1.2,
          sd = 0.42;
        return off(
          "earth",
          rw.lat,
          rw.lon,
          rw.elev || 0,
          a * Math.sin(hd) - sd * Math.cos(hd),
          a * Math.cos(hd) + sd * Math.sin(hd),
        );
      }
    }
    if (t > md.M.t0 + 3 * 3600) {
      const sp = surfaceSpotOn("earth", md.M.t0 + 3600);
      if (sp) {
        const pe = sitePosEcl("earth", sp.lat, sp.lon, 0, t);
        if (vnorm(vsub(vsub(P, helio("earth", t).r), pe)) < 1500)
          return off("earth", sp.lat, sp.lon, 0, -4, -3);
      }
    }
    return off("earth", S.lat, S.lon, 0, -2.2, -5.5);
  }
  return null;
}
const _up = new THREE.Vector3(),
  _look = new THREE.Vector3();
// never let the camera sink below the ground of a nearby body (offset is relative to the origin P)
function keepAboveGround(P, off, t) {
  const Pc = vadd(P, off);
  for (const b of ["earth", "moon", "mars"]) {
    const B = helio(b, t).r;
    const d = vsub(Pc, B);
    const n = vnorm(d);
    if (n > surfaceRadius(b) + 15) continue;
    const Rb = groundRadius(b, vscale(d, 1 / Math.max(n, 1e-9)), t) + 0.0025;
    if (n < Rb) {
      const fixed = vadd(B, vscale(d, Rb / Math.max(n, 1e-9)));
      return vsub(fixed, P);
    }
  }
  return off;
}
// ---------------- framing a standing vehicle around the HUD ----------------
// The screen rows the HUD leaves free in the middle column, where a rocket stands: below the top bar and the propulsion pill,
// above the bottom bar (and the small map on phones), and clear of the countdown card — mid-screen on wide screens, near
// the top on phones. The card's place is remembered after it hides, so the framing holds steady through liftoff.
const BAND = { at: 0, W: 0, H: 0, v: null, card: null, cardKey: "" };
function screenBand() {
  const now = performance.now(),
    W = R.width,
    H = R.height;
  if (BAND.v && now - BAND.at < 500 && BAND.W === W && BAND.H === H)
    return BAND.v;
  const fr = frameRect(),
    cx = W / 2,
    half = clamp(W * 0.12, 60, 110),
    clean = $("#app").classList.contains("hide-ui");
  const rectOf = (sel) => {
    const el = $(sel);
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 &&
      r.height > 0 &&
      r.right > cx - half &&
      r.left < cx + half
      ? r
      : null;
  };
  let top = fr.y,
    bot = fr.y + fr.h,
    card = null;
  if (!clean) {
    top = Math.max(top, 84); // the top bar (48 px) and the propulsion pill under it (shown from liftoff on)
    for (const sel of ["#bottom", "#minimap"]) {
      const r = rectOf(sel);
      if (r) bot = Math.min(bot, r.top);
    }
    const key = W + "x" + H;
    card = rectOf("#countdown");
    if (card) {
      BAND.card = { top: card.top, bottom: card.bottom };
      BAND.cardKey = key;
    } else
      card =
        BAND.cardKey === key
          ? BAND.card
          : H <= 520
            ? null
            : W <= 860
              ? { top: 96, bottom: 270 }
              : { top: 0.6 * H - 78, bottom: 0.6 * H + 78 }; // (on short screens the card sits at the side)
  }
  let t2 = top,
    b2 = bot;
  if (card) {
    if (card.top + card.bottom < top + bot) t2 = Math.max(top, card.bottom);
    else b2 = Math.min(bot, card.top);
  }
  const minH = Math.max(110, 0.15 * fr.h); // too little room beside the card (a phone held sideways): let the card overlap instead
  const v =
    b2 - t2 >= minH
      ? { top: t2, bot: b2 }
      : bot - top >= minH
        ? { top, bot }
        : { top: fr.y + 0.06 * fr.h, bot: fr.y + 0.94 * fr.h };
  Object.assign(BAND, { at: now, W, H, v });
  return v;
}
// camera distance and aim height (km above the base point) that put a vertical column — from the base point up to zTop km —
// exactly between screen rows yT and yB, for a chase camera at elevation el looking at the aim point (pinhole projection)
function fitColumn(zTop, el, yT, yB) {
  const k = R.pxPerRad,
    Hc = R.height / 2,
    ce = Math.cos(el),
    se = Math.sin(el);
  const p1 = Hc - yT,
    p2 = Hc - yB,
    q1 = ce * k + p1 * se,
    q2 = ce * k + p2 * se; // px above the centre (negative below)
  const den = p1 / q1 - p2 / q2;
  if (!(zTop > 0) || !(den > 1e-6) || !(q1 > 0) || !(q2 > 0)) return null;
  const d = zTop / den;
  return { dist: d, aimH: (-p2 * d) / q2 };
}
// how high the vehicle reaches above its base point (km): its model's top, standing on the launch mount
function standingHeight(c, Lkm) {
  const ud = c.cur && c.cur.userData;
  return ud && ud.bbY
    ? Math.max(((c.yOff || 0) + ud.bbY[1]) * 0.001, 0.002)
    : Lkm + (PAD_TOP + MOUNT_H) * 0.001;
}
// camera pose for a mode, relative to the floating origin P: {pos, up, look}

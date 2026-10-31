// index-inline-2 72 — math
// Lines 20803-21147 of readable/index-inline-2.pretty.js (statement-aligned).
function groundSite(t) {
  const md = MV.md;
  const P = targetPos(CAM.target, t) || helio("earth", t).r;
  const near = (b, d) => vnorm(vsub(P, helio(b, t).r)) < d;
  const cfg = md.cfg;
  // flat: the site stands on the pad's flat ground (app/46_pads.js), which lies above the sphere by d²/2R out at d from
  // the pad — 2.7 m at the launch camera's 5.9 km, so a camera at its height over the sphere would look up from under it
  // (where the real ground is drawn, app/43_terrain.js, the camera stands on it instead)
  const off = (body, lat, lon, elev, dE, dN, flat) => {
    const Rb = surfaceRadius(body),
      la = lat + (dN / Rb) * RAD,
      lo = lon + (dE / (Rb * Math.cos(lat * DEG))) * RAD;
    let alt = (elev || 0) + (flat ? (dE * dE + dN * dN) / (2 * Rb) : 0);
    const th = body === "earth" ? terrainHeightAt(la, lo) : null;
    if (th != null) alt = Math.max(alt, th);
    return { body, lat: la, lon: lo, alt: alt + 0.0018 };
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
    return off("earth", S.lat, S.lon, 0, -2.2, -5.5, true);
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
  const now = clockMs(),
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
    for (const sel of ["#bottom", "#minimap", "#left", "#right"]) {
      const r = rectOf(sel);
      if (r) bot = Math.min(bot, r.top);
    } // (the panels only on a tall screen, where they sit under the view)
    {
      const cap = $("#caption");
      if (cap && !cap.classList.contains("fade")) {
        const r = rectOf("#caption");
        if (r && r.top > top + 0.4 * (bot - top))
          bot = Math.min(bot, r.top - 6);
      }
    } // the event caption, so the craft is framed above it
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
    Hc = R.height / 2 - VSHIFT,
    ce = Math.cos(el),
    se = Math.sin(el); // (the optical centre, shifted on a tall screen)
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
function poseFor(mode, prm, P, t) {
  const c = targetCraft();
  const dist = prm.dist;
  if (mode === "lookat") {
    const PL = targetPos(prm.look, t) || helio("moon", t).r;
    const Ld = vunit(vsub(PL, P));
    let up = [0, 0, 1];
    if (c && c.s) up = vunit(c.rD || c.s.r);
    let u3 = vsub(up, vscale(Ld, vdot(up, Ld)));
    if (vnorm(u3) < 1e-6) u3 = vperp(Ld);
    u3 = vunit(u3);
    const u2 = vcross(u3, Ld);
    const D = vadd(
      vadd(
        vscale(Ld, Math.cos(prm.el) * Math.cos(prm.az)),
        vscale(u2, Math.cos(prm.el) * Math.sin(prm.az)),
      ),
      vscale(u3, Math.sin(prm.el)),
    );
    const pos = keepAboveGround(P, vscale(D, -dist), t);
    if (prm.centreK > 0) {
      // turned toward the craft (the director's look-at shot dragged past its frame): between the body and the craft
      const Lc = vunit(vlerp(Ld, vunit(vscale(pos, -1)), prm.centreK));
      return {
        pos,
        up: u3,
        look: vadd(pos, vscale(Lc, Math.max(dist, 1e-6))),
        center: false,
      };
    }
    return { pos, up: u3, look: vsub(PL, P), center: false };
  }
  if (mode === "padcam") {
    // a camera on the ground near the launch pad (prm.spot: km east, north and up from the site), looking at the target
    const S = MV.md && LAUNCH_SITES[MV.md.cfg.site];
    if (S && prm.spot) {
      const [dE, dN, h] = prm.spot,
        Rb = surfaceRadius("earth"),
        la = S.lat + (dN / Rb) * RAD,
        lo = S.lon + (dE / (Rb * Math.cos(S.lat * DEG))) * RAD;
      let alt = (dE * dE + dN * dN) / (2 * Rb);
      const th = terrainHeightAt(la, lo);
      if (th != null) alt = Math.max(alt, th); // (on the pad's flat ground, or the real ground where it is drawn)
      const site = sitePosEcl("earth", la, lo, alt + h, t),
        pos = keepAboveGround(P, vsub(vadd(helio("earth", t).r, site), P), t);
      return {
        pos,
        up: localFrame("earth", site, t).up,
        look: prm.aim || [0, 0, 0],
        center: false,
      };
    }
    mode = "chase";
  }
  if (mode === "site") {
    // a camera on the ground by the launch site, looking up at the target
    const g = groundSite(t);
    if (g) {
      const site = sitePosEcl(g.body, g.lat, g.lon, g.alt, t);
      return {
        pos: vsub(vadd(helio(g.body, t).r, site), P),
        up: localFrame(g.body, site, t).up,
        look: [0, 0, 0],
        center: false,
      };
    }
    mode = "chase";
  }
  if (mode === "from") {
    // a camera on another craft (the station's windows), looking at the target
    const fc = prm.from && craftById(prm.from.slice(4));
    if (fc && fc.P && fc.s) {
      const F = lvlh(fc.rD || fc.s.r, fc.vD || fc.s.v),
        off = prm.off || [0, 0, 0];
      let pos = vadd(vsub(fc.P, P), fromLvlh(F, vscale(off, 0.001)));
      if (
        (prm.fromAz || prm.fromEl || (prm.zoomK && prm.zoomK !== 1)) &&
        c &&
        c.s
      ) {
        // dragged or zoomed: the camera leaves the window and goes round the craft, from where it was
        const rr = c.rD || c.s.r,
          vv0 = c.vD || c.s.v,
          up = vunit(rr);
        let vh = vsub(vv0, vscale(up, vdot(vv0, up)));
        if (vnorm(vh) < 1e-6) vh = vperp(up);
        const e1 = vunit(vh),
          e3 = up,
          e2 = vcross(e3, e1);
        const d = vnorm(pos) * (prm.zoomK || 1),
          az0 = Math.atan2(vdot(pos, e2), vdot(pos, e1)),
          el0 = Math.asin(clamp(vdot(pos, e3) / d, -1, 1)),
          az = az0 + prm.fromAz,
          el = clamp(el0 + prm.fromEl, -1.5, 1.5);
        pos = vadd(
          vadd(
            vscale(e1, d * Math.cos(el) * Math.cos(az)),
            vscale(e2, d * Math.cos(el) * Math.sin(az)),
          ),
          vscale(e3, d * Math.sin(el)),
        );
        return {
          pos,
          up: e3,
          look: [0, 0, 0],
          center: true,
          basis: [e1, e2, e3],
        };
      }
      return {
        pos,
        up: Math.abs(vdot(vunit(pos), F.z)) > 0.85 ? F.x : F.z,
        look: [0, 0, 0],
        center: false,
      };
    } // looking straight down: keep the direction of flight up the frame
    mode = "chase";
  }
  let e1 = [1, 0, 0],
    e2 = [0, 1, 0],
    e3 = [0, 0, 1];
  if (mode === "chase") {
    if (c && c.s) {
      const rr = c.rD || c.s.r,
        vv0 = c.vD || c.s.v;
      const up = vunit(rr);
      let vh = vsub(vv0, vscale(up, vdot(vv0, up)));
      if (vnorm(vh) < 1e-6) vh = vperp(up);
      e1 = vunit(vh);
      e3 = up;
      e2 = vcross(e3, e1);
    } else if (CAM.target.startsWith("body:")) {
      const name = CAM.target.slice(5);
      const pole = name === "sun" ? [0, 0, 1] : bodyPoleEcl(name, t);
      e3 = pole;
      e1 = vperp(pole);
      e2 = vcross(e3, e1);
    }
  }
  const ce = Math.cos(prm.el),
    se = Math.sin(prm.el),
    ca = Math.cos(prm.az),
    sa = Math.sin(prm.az);
  const A = (mode === "chase" && prm.aim) || [0, 0, 0]; // the point the camera looks at, relative to P (e.g. halfway up a standing rocket)
  const off = keepAboveGround(
    P,
    vadd(
      A,
      vadd(
        vadd(vscale(e1, dist * ce * ca), vscale(e2, dist * ce * sa)),
        vscale(e3, dist * se),
      ),
    ),
    t,
  );
  const up = mode === "top" ? vadd(vscale(e1, -ca), vscale(e2, -sa)) : e3;
  return { pos: off, up, look: A, center: true, basis: [e1, e2, e3] };
}
function setPose(pose) {
  const cam = R.camera;
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
  cam.up.set(pose.up[0], pose.up[1], pose.up[2]);
  _look.set(pose.look[0], pose.look[1], pose.look[2]);
  cam.lookAt(_look);
  if (CAM.roll) cam.rotateZ(CAM.roll);
}
// ---------------- auto-follow director ----------------
// Picks the craft where the action is and a framing for each situation (pad, ascent, burn, entry,
// parachutes, landing, surface, low orbit, coast toward the next destination) and blends between shots.

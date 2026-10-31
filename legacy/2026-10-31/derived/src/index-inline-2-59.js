// index-inline-2 59 — math
// Lines 16835-17179 of readable/index-inline-2.pretty.js (statement-aligned).
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
    return {
      pos: keepAboveGround(P, vscale(D, -dist), t),
      up: u3,
      look: vsub(PL, P),
      center: false,
    };
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
        off = prm.off || [0, 0, 0],
        pos = vadd(vsub(fc.P, P), fromLvlh(F, vscale(off, 0.001)));
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
const DIR = {
  key: "",
  since: 0,
  blend: null,
  offAz: 0,
  offEl: 0,
  zoomK: 1,
  lensUser: null,
  lastT: null,
  dist: null,
  prm: null,
  shot: null,
};
function activeCraft(t) {
  const L = craftById("lander");
  if (L && L.s && t >= L.o.t0 + 1 && t <= L.o.t1 - 1) return L;
  return craftById("ship");
}
function domRaw(P, t) {
  const d = (b) => vnorm(vsub(P, planetHelio(b, t).r));
  if (d("moon") < BODIES.moon.soi) return "moon";
  if (d("earth") < BODIES.earth.soi) return "earth";
  if (d("mars") < BODIES.mars.soi) return "mars";
  return "sun";
}
function domTimeline(md) {
  // where the primary craft is, sampled over the mission: [{t, b}] at each change of dominant body
  if (md.domTL) return md.domTL;
  const out = [];
  let prev = null;
  const dt = Math.max(600, (md.tEnd - md.M.t0) / 4000);
  for (let t = md.M.t0; t <= md.tEnd; t += dt) {
    const s = md.ship.stateAt(t);
    if (!s) continue;
    const b = domRaw(vadd(planetHelio(s.ref, t).r, s.r), t);
    if (b !== prev) {
      out.push({ t, b });
      prev = b;
    }
  }
  md.domTL = out;
  return out;
}
function nextDestination(md, t, cur) {
  for (const x of domTimeline(md))
    if (x.t > t && x.b !== cur && x.b !== "sun") return x.b;
  const leg = (md.cfg.legs || []).find(
    (l) => isoToT(l.t) > t && l.body !== cur && BODIES[l.body],
  ); // e.g. Jupiter, the design point beyond the simulated flight
  return leg ? leg.body : null;
}
function directorShot(c, t) {
  const md = MV.md;
  const s = c.s;
  if (!s) return null;
  const ex = s.extra || {};
  const cfgL = cfgAt(c, t);
  const L =
    Math.max(
      (c.cur && (c.cur.userData.sizeM || c.cur.userData.len)) ||
        (cfgL && cfgL.key === "launch" ? md.L.height : 10),
      2,
    ) * 0.001; // vehicle size, km
  const body = c.dom || s.ref;
  const R0 = body === "sun" ? 0 : surfaceRadius(body);
  const alt = body === "sun" ? Infinity : vnorm(c.rD || s.r) - R0;
  const tIns =
    md.ship && md.ship.segs.length ? md.ship.segs[0].t1 : md.M.t0 + 600;
  const sunAz = () => {
    const p = poseFor("chase", { az: 0, el: 0, dist: 1 }, c.P, t);
    const [e1, e2] = p.basis;
    const sd = vunit(vscale(c.P, -1));
    return Math.atan2(vdot(sd, e2), vdot(sd, e1));
  };
  if (c.o.id === "ship" && (s.pad || t < md.M.t0 + 45)) {
    // the whole vehicle, pad to tip, in the rows the HUD leaves free
    const shot = {
      key: "pad",
      mode: "chase",
      az: sunAz() + 38 * DEG,
      el: 4 * DEG,
      dist: L * 4.2,
      lens: 35,
      label: "Launch",
    };
    const blk = MV.pad && MV.pad.userData.block; // not through a tower: round to the nearer side of it
    if (blk)
      for (let k = 0; k < 4; k++) {
        let moved = false;
        for (const [a, w] of blk) {
          const d = wrapPi(shot.az - a * DEG);
          if (Math.abs(d) < w * DEG - 1e-9) {
            shot.az = a * DEG + (d < 0 ? -w : w) * DEG;
            moved = true;
          }
        }
        if (!moved) break;
      }
    const B = screenBand(),
      m = (B.bot - B.top) * 0.07,
      f = fitColumn(standingHeight(c, L), shot.el, B.top + m, B.bot - m * 0.6);
    if (f) {
      shot.dist = f.dist;
      shot.aimH = f.aimH;
    }
    return shot;
  }
  // Launched in twilight: once the vehicle climbs into sunlight over the dark ground, watch from the ground by the launch site
  // as its exhaust lights up against the sky (app/47_exhaust.js)
  if (
    c.o.id === "ship" &&
    t > md.M.t0 + 75 &&
    t < tIns + 90 &&
    twilightLaunch(md, c, t)
  )
    return {
      key: "twilight",
      mode: "site",
      az: 0,
      el: 0,
      dist: 1,
      lens: 20,
      label: "Exhaust in sunlight over the dark ground",
      blend: 1,
    };
  if (c.o.id === "ship" && t < tIns + 5) {
    let dist = L * (4.5 + (4 * Math.min(Math.max(alt, 0), 100)) / 100);
    const el = 9 * DEG;
    // the camera looks at the engines, so the vehicle stands above the centre of the frame: back off far enough on wide screens to keep its nose below the top bar
    const B = screenBand(),
      p1 = R.height / 2 - (B.top + (B.bot - B.top) * 0.04);
    if (p1 > 20)
      dist = Math.max(
        dist,
        standingHeight(c, L) *
          ((Math.cos(el) * R.pxPerRad) / p1 + Math.sin(el)),
      );
    return {
      key: "ascent",
      mode: "chase",
      az: 200 * DEG,
      el,
      dist,
      lens: 35,
      label: "Ascent",
      blend: 4500,
    };
  }
  if (isShuttle(md)) {
    const sh = shuttleShot(c, t, s, ex, cfgL, L);
    if (sh) return sh;
  }
  if (ex.chute)
    return {
      key: "chute",
      mode: "chase",
      az: 120 * DEG,
      el: -8 * DEG,
      dist: Math.max(L * 25, 0.09),
      lens: 35,
      drift: 0.05,
      label: "Parachutes",
    };
  if ((ex.heat > 2 || ex.q > 300) && alt < 140)
    return {
      key: "entry",
      mode: "chase",
      az: 65 * DEG,
      el: 8 * DEG,
      dist: L * 7,
      lens: 35,
      label: "Entry",
    };
  if (s.surface || (cfgL && cfgL.landed))
    return {
      key: "surface",
      mode: "chase",
      az: 150 * DEG,
      el: 10 * DEG,
      dist: Math.max(L * 6, 0.025),
      lens: 35,
      drift: 0.025,
      label: "Surface",
    };
  if (s.T > 0) {
    if (alt < 30)
      return {
        key: "landing",
        mode: "chase",
        az: 140 * DEG,
        el: 6 * DEG,
        dist: Math.max(L * 5, 0.03),
        lens: 35,
        label: "Powered flight near the ground",
      };
    return {
      key: "burn",
      mode: "chase",
      az: 160 * DEG,
      el: 18 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Engine burn",
    };
  }
  if (body !== "sun" && alt < R0 * 0.6)
    return {
      key: "orbit-" + body,
      mode: "chase",
      az: 195 * DEG,
      el: 22 * DEG,
      dist: Math.max(L * 6, 0.03),
      lens: 35,
      label: "Orbit",
    };
  // coasting: craft in the foreground, the body it is heading for (or orbiting) behind it
  let look = null;
  if (body !== "sun") {
    const vr = vdot(vunit(c.rD), c.vD);
    if (vr < 0 || alt < 3 * R0) look = body;
  }
  if (!look)
    look = nextDestination(md, t, body) || (body !== "sun" ? body : "earth");
  return {
    key: "coast-" + look,
    mode: "lookat",
    look: "body:" + look,
    az: 7 * DEG,
    el: 4 * DEG,
    dist: Math.max(L * 4, 0.025),
    lens: 50,
    drift: 0.006,
    label: "Coasting toward " + BODIES[look].name,
  };
}
// Space Shuttle: proximity operations seen from the station, the docked stack, the deploy, the glide to the runway
// the ground at the launch site in twilight or darkness (the Sun more than 2° below the horizon) while the vehicle, high up, is
// in sunlight

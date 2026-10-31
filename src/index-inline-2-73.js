// index-inline-2 73 — deg
// Lines 21148-21396 of readable/index-inline-2.pretty.js (statement-aligned).
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
function twilightLaunch(md, c, t) {
  const S = LAUNCH_SITES[md.cfg.site];
  if (!S || !c.s || c.dom !== "earth" || !EXH.mesh) return false;
  const E = helio("earth", t).r,
    sd = vunit(vscale(E, -1)),
    site = sitePosEcl("earth", S.lat, S.lon, 0, t);
  if (Math.asin(clamp(vdot(vunit(site), sd), -1, 1)) * RAD > -2) return false;
  const r = c.rD || c.s.r,
    L = exhSunlight(r[0], r[1], r[2], sd);
  return L[1] > 0.25;
}

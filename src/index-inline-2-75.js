// index-inline-2 75 — cam
// Lines 21643-21991 of readable/index-inline-2.pretty.js (statement-aligned).
function updateCamera(t, realDt) {
  const cam = R.camera;
  {
    const d0 = VSHIFT;
    applyViewShift();
    if (VSHIFT !== d0) cam.updateProjectionMatrix();
  }
  if (directed() && MV.md) directorUpdate(t, realDt);
  let P = targetPos(CAM.target, t);
  if (!P) P = targetPos("obj:ship", t) || helio("earth", t).r; // target not in flight yet (e.g. a lander still docked): follow the ship meanwhile
  // transition between targets
  let dist = CAM.dist;
  if (CAM.trans) {
    const f = clamp((clockMs() - CAM.trans.t0) / CAM.trans.dur, 0, 1);
    const e = f * f * (3 - 2 * f);
    const from = targetPos(CAM.trans.fromId, t) || CAM.trans.fromP;
    P = vlerp(from, P, e);
    dist = Math.exp(
      Math.log(CAM.trans.distFrom) +
        (Math.log(CAM.trans.distTo) - Math.log(CAM.trans.distFrom)) * e,
    );
    if (f >= 1) CAM.trans = null;
  }
  const rT = targetRadius(CAM.target);
  if (CAM.mode === "ground") {
    const g = groundSite(t);
    if (g) {
      const Bp = helio(g.body, t).r;
      const site = sitePosEcl(g.body, g.lat, g.lon, g.alt, t);
      const Pobs = vadd(Bp, site);
      R.O = Pobs;
      cam.position.set(0, 0, 0);
      const lf = localFrame(g.body, site, t);
      _up.set(lf.up[0], lf.up[1], lf.up[2]);
      cam.up.copy(_up);
      if (CAM.ground.track) {
        const d = vsub(P, Pobs);
        _look.set(d[0], d[1], d[2]);
        if (_look.length() < 1e-6) _look.copy(_up);
        cam.lookAt(_look);
        const dn = vunit(d);
        CAM.ground.pitch = Math.asin(clamp(vdot(dn, lf.up), -1, 1));
        CAM.ground.yaw = Math.atan2(vdot(dn, lf.east), vdot(dn, lf.north));
      } else {
        const cp = Math.cos(CAM.ground.pitch);
        const d = vadd(
          vadd(
            vscale(lf.north, cp * Math.cos(CAM.ground.yaw)),
            vscale(lf.east, cp * Math.sin(CAM.ground.yaw)),
          ),
          vscale(lf.up, Math.sin(CAM.ground.pitch)),
        );
        _look.set(d[0], d[1], d[2]);
        cam.lookAt(_look);
      }
      if (CAM.roll) cam.rotateZ(CAM.roll);
      CAM.groundInfo = g;
      CAM.camDist = vnorm(vsub(P, Pobs));
      return;
    }
  }
  CAM.groundInfo = null;
  R.O = P;
  if (directed() && MV.md && DIR.prm) {
    const pose = poseFor(DIR.prm.mode, DIR.prm, P, t);
    setPose(pose);
    if (DIR.blend) {
      const f = smoothstep((clockMs() - DIR.blend.t0) / DIR.blend.dur);
      if (f >= 1) DIR.blend = null;
      else {
        const pT = cam.position.clone(),
          qT = cam.quaternion.clone();
        const pos = vlerp(
          [DIR.blend.pos.x, DIR.blend.pos.y, DIR.blend.pos.z],
          [pT.x, pT.y, pT.z],
          f,
        );
        const safe = keepAboveGround(P, pos, t);
        cam.position.set(safe[0], safe[1], safe[2]);
        if (DIR.blend.center && pose.center) {
          cam.up
            .copy(DIR.blend.up)
            .lerp(_up.set(pose.up[0], pose.up[1], pose.up[2]), f)
            .normalize();
          cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
          if (CAM.roll) cam.rotateZ(CAM.roll);
        } else cam.quaternion.slerpQuaternions(DIR.blend.quat, qT, f);
      }
    }
    const sk = DIR.shot && DIR.shot.shake,
      sc = sk && activeCraft(t); // a cinematic shot's camera shaking as a camera would (app/51_cine.js)
    if (sc) {
      const [ax, ay] = cineShake(sk, sc, t, cam.position.length());
      cam.rotateX(ax);
      cam.rotateY(ay);
    }
    CAM.camDist =
      DIR.prm.mode === "site" || DIR.prm.mode === "padcam"
        ? cam.position.length()
        : DIR.prm.dist;
    return;
  }
  const minD = rT > 0 ? rT * 1.003 + 0.002 : 0.004;
  dist = Math.max(dist, minD);
  if (!CAM.trans) CAM.dist = Math.max(CAM.dist, minD);
  const mode = directed() ? "chase" : CAM.mode;
  setPose(
    poseFor(mode, { az: CAM.az, el: CAM.el, dist, look: CAM.look }, P, t),
  );
  CAM.camDist = dist;
}
// ---------------- input ----------------
function initCameraInput() {
  const el = $("#gl");
  const ptrs = new Map();
  let pinch0 = null,
    lastTap = 0;
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      b: e.button,
      shift: e.shiftKey,
    });
    el.classList.add("dragging");
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        dist: CAM.dist,
        lens: CAM.lens,
        zk: DIR.zoomK,
      };
    }
  });
  el.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = pinch0.d / Math.max(d, 1);
      if (CAM.mode === "ground") CAM.lens = clamp(pinch0.lens / k, 8, 3200);
      else if (directed()) {
        if (CAM.mode === "cine") setMode("auto");
        DIR.zoomK = clamp(pinch0.zk * k, 0.05, 2e4);
      } else CAM.dist = clamp(pinch0.dist * k, 0.004, 5e10);
      CAM.trans = null;
      applyLens();
      syncCamUI();
      return;
    }
    const fovK = Math.min(1, CAM.lens > 0 ? 50 / CAM.lens : 1);
    if (p.b === 2 || p.shift) {
      CAM.roll += dx * 0.004;
      return;
    }
    if (CAM.mode === "ground") {
      CAM.ground.track = false;
      CAM.ground.yaw -= dx * 0.0035 * fovK;
      CAM.ground.pitch = clamp(
        CAM.ground.pitch + dy * 0.0035 * fovK,
        -1.55,
        1.55,
      );
      return;
    }
    if (CAM.mode === "cine") setMode("auto"); // (taking the camera ends the film; the director carries on from here)
    if (CAM.mode === "auto") {
      DIR.offAz -= dx * 0.006;
      DIR.offEl = clamp(DIR.offEl + dy * 0.006, -1.5, 1.5);
      DIR.blend = null;
      return;
    }
    CAM.az -= dx * 0.006;
    CAM.el = clamp(CAM.el + dy * 0.006, -1.55, 1.55);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = null;
    if (!ptrs.size) el.classList.remove("dragging");
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      if (CAM.mode === "ground") {
        CAM.lens = clamp(CAM.lens * Math.exp(-dy * 0.0012), 8, 3200);
        applyLens();
        syncCamUI();
        return;
      }
      if (CAM.mode === "cine") setMode("auto");
      if (CAM.mode === "auto") {
        DIR.zoomK = clamp(DIR.zoomK * Math.exp(dy * 0.0012), 0.05, 2e4);
        return;
      }
      CAM.trans = null;
      CAM.dist = clamp(CAM.dist * Math.exp(dy * 0.0012), 0.004, 5e10);
    },
    { passive: false },
  );
  el.addEventListener("dblclick", (e) => {
    // pick nearest label
    let best = null,
      bd = 40;
    for (const lbl of [...$$("#labels .lbl")]) {
      const r = lbl.getBoundingClientRect();
      if (r.left < -1000) continue;
      const d = Math.hypot(r.left + 4 - e.clientX, r.top + 7 - e.clientY);
      if (d < bd) {
        bd = d;
        best = lbl;
      }
    }
    if (best) best.click();
  });
}
function syncCamUI() {
  const sm = $("#selMode");
  if (sm.value !== CAM.mode) sm.value = CAM.mode;
  const st = $("#selTarget");
  if (st.value !== CAM.target) st.value = CAM.target;
  const sl = $("#selLook");
  if (sl.value !== CAM.look) sl.value = CAM.look;
  const ln = $("#selLens");
  const lv = String(Math.round(CAM.lens));
  if (![...ln.options].some((o) => o.value === lv)) {
    const o =
      ln.querySelector("option[data-custom]") ||
      h("option", { "data-custom": "1" });
    o.value = lv;
    o.textContent = lv + " mm";
    if (!o.parentNode) ln.prepend(o);
  }
  ln.value = lv;
  $("#lookWrap").hidden = CAM.mode !== "lookat";
}

// ==== 51_cine.js
// ============================================================================
// Cinematic launch: a camera mode ('cine') that cuts the launch like a film, from the ignition to the first staging, then
// hands over to the director (app/50_camera.js). The shots are a pure function of the mission time, from the flight's
// own events (the ignition, the liftoff, max-Q, the first staging), so they fit every vehicle, and scrubbing back to the
// launch plays them again:
//   1. base     — before liftoff: a camera low on the ground near the pad, a wide lens looking up the vehicle, pushing in
//   2. rise     — the first seconds: slow motion, a ground camera out past the blast's cloud as the vehicle climbs out of it
//   3. track    — a long lens a few kilometres out on the ground, following it into the sky
//   4. tail     — a camera below the vehicle looking up along its plume, then round to its side
//   5. staging  — a close cut on the first separation, in slow motion
// The ground shots stand where the pad's towers do not block them (the pad's block list, as the director's pad shot).
// The camera shakes as a camera would (cineShake below); the clock slows (CINE.timeK, applied in app/90_main.js) for
// the slow-motion shots. Dragging the view, or picking another mode, ends it.
// ============================================================================
const CINE = { timeK: 1, osc: null };
// the times the shots are cut on, from the mission's events (cached per mission)
function cineTimes(md) {
  if (md.cineT) return md.cineT;
  const ev = (re) => md.events.find((e) => re.test(e.name)),
    t0 = md.M.t0;
  const ign = ev(/^Ignition sequence start/),
    mq = md.events.find((e) => e.kind === "maxq"),
    st = md.events.find((e) => e.kind === "staging" && e.t > t0);
  const tS = st ? st.t : t0 + 150,
    tQ = mq ? mq.t : t0 + 60;
  const tTail = t0 + 28,
    tSide = Math.max(tTail + 12, Math.min(tQ + 20, tS - 10)),
    tSep = tS - 1.5;
  return (md.cineT = {
    tIgn: ign ? ign.t : t0 - 7,
    t0,
    tTail,
    tSide,
    tSep,
    tS,
    tEnd: tS + 6,
  });
}
// The ground cameras stand east or west of the pad, on the side nearer the Sun: the flame trenches throw the cloud north
// and south (app/48_padcloud.js), and a camera across them would watch the vehicle vanish into it. A long lens from out
// there sees a broad wedge behind and before the pad, so a side with a tower within 40° of it (ELA-3's water tower) gives
// way to the other
function cineSide(sunAz) {
  const blk = (MV.pad && MV.pad.userData.block) || [],
    sides = Math.cos(sunAz) >= 0 ? [0, Math.PI] : [Math.PI, 0];
  return (
    sides.find(
      (c) => !blk.some(([b]) => Math.abs(wrapPi(c - b * DEG)) < 40 * DEG),
    ) ?? sides[0]
  );
}
// a bearing (chase basis: from east toward north, rad) near `want` that no tower blocks
function cineClear(want) {
  let a = want;
  const blk = MV.pad && MV.pad.userData.block;
  if (blk)
    for (let k = 0; k < 4; k++) {
      let moved = false;
      for (const [b, w] of blk) {
        const d = wrapPi(a - b * DEG);
        if (Math.abs(d) < w * DEG - 1e-9) {
          a = b * DEG + (d < 0 ? -w : w) * DEG;
          moved = true;
        }
      }
      if (!moved) break;
    }
  return a;
}
// What a shot frames: the vehicle as it is drawn now (its model's bounds, along its axis), not the launcher's nominal
// height from its base point — a Shuttle stack is as wide as it is tall, and a stage's base point is its engines.
// aim: its middle, relative to the craft's position (km, the scene's axes); len: its size (km)
const _cv = new THREE.Vector3(),
  _cp = new THREE.Vector3();
function cineSubject(c, Lnom) {
  const m = c.cur,
    ud = m && m.userData;
  if (!m || !ud.bbY || !c.node) return { aim: null, len: Lnom };
  const yc = (c.yOff || 0) + (ud.bbY[0] + ud.bbY[1]) / 2; // (the model's own origin sits c.yOff up the node)
  c.node.localToWorld(_cv.set(0, yc, 0));
  c.node.getWorldPosition(_cp);
  const lenM = Math.max(
    ud.bbY[1] - ud.bbY[0],
    ud.bbox ? Math.max(ud.bbox.w, ud.bbox.d) : 0,
  );
  return {
    aim: [_cv.x - _cp.x, _cv.y - _cp.y, _cv.z - _cp.z],
    len: Math.max(lenM * 0.001, 0.005),
  };
}
// pixels per radian for a lens (mm), and the free rows' height (the screen the HUD leaves: the director's band, which the
// view is already centred in)
function cinePxPerRad(lens) {
  return (lens * frameRect().w) / 36;
}
function cineBandH() {
  const B = screenBand();
  return Math.max(B.bot - B.top, 80);
}
// the lens (mm) that makes a size of h km at a distance of d km fill a fraction f of the free rows

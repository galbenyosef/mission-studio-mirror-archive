// index-inline-2 60 — cam
// Lines 17180-17520 of readable/index-inline-2.pretty.js (statement-aligned).
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
function shuttleShot(c, t, s, ex, cfgL, L) {
  if (c.o.id !== "ship" || !cfgL) return null;
  const ph = ex.phase || "",
    iss = craftById("iss");
  if (cfgL.sc === "shuttle") {
    const att = cfgL.att;
    if (
      iss &&
      iss.P &&
      c.P &&
      /^(rbar|rpm|vbar|fly)$/.test(att || "") &&
      !cfgL.docked
    ) {
      const d = vnorm(vsub(c.P, iss.P)) * 1000; // m
      if (d < 1500 && !(att === "vbar" && d < 75)) {
        const v = att === "vbar" || att === "fly";
        return {
          key: "from-iss-" + (v ? "v" : "r"),
          mode: "from",
          from: "obj:iss",
          off: v ? [23, -7, 5] : [-3, -7, -9],
          lens: clamp(Math.round((0.24 * d) / 5) * 5, 24, 400),
          dist: L * 3,
          label: "Seen from the station",
          blend: 2500,
        };
      }
    }
    if (
      cfgL.docked ||
      (att === "vbar" && iss && iss.P && c.P && vnorm(vsub(c.P, iss.P)) < 0.075)
    )
      return {
        key: "docked",
        mode: "chase",
        az: 300 * DEG,
        el: 24 * DEG,
        dist: 0.21,
        lens: 35,
        drift: 0.01,
        label: "Docked to the station",
      };
    if (cfgL.bayT != null && t >= cfgL.bayT - 30 && t < cfgL.bayT + 240)
      return {
        key: "bay-doors",
        mode: "chase",
        az: 125 * DEG,
        el: 42 * DEG,
        dist: Math.max(L * 1.9, 0.055),
        lens: 35,
        drift: 0.006,
        label:
          cfgL.bay === "open"
            ? "Payload bay doors opening"
            : "Payload bay doors closing",
      };
    if (att === "deploy")
      return {
        key: "deploy",
        mode: "chase",
        az: 140 * DEG,
        el: 30 * DEG,
        dist: Math.max(L * 2.4, 0.07),
        lens: 35,
        drift: 0.008,
        label: "Payload deploy",
      };
  }
  if (ph === "entry" && (ex.heat > 1 || ex.q > 200))
    return {
      key: "sh-entry",
      mode: "chase",
      az: 112 * DEG,
      el: -3 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Entry",
    };
  if (/TAEM/.test(ph))
    return {
      key: "taem",
      mode: "chase",
      az: 150 * DEG,
      el: 7 * DEG,
      dist: L * 3.2,
      lens: 35,
      label: "Gliding to the runway",
    };
  if (/heading alignment/.test(ph))
    return {
      key: "hac",
      mode: "chase",
      az: 215 * DEG,
      el: 14 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Heading alignment cone",
    };
  if (/outer glideslope/.test(ph))
    return {
      key: "ogs",
      mode: "chase",
      az: 162 * DEG,
      el: 5 * DEG,
      dist: L * 2.8,
      lens: 35,
      label: "Final approach",
    };
  if (/flare|rollout/.test(ph))
    return {
      key: "touchdown",
      mode: "chase",
      az: 120 * DEG,
      el: 3 * DEG,
      dist: L * 2.3,
      lens: 35,
      label: "Touchdown",
    };
  if (s.surface)
    return {
      key: "surface",
      mode: "chase",
      az: 145 * DEG,
      el: 9 * DEG,
      dist: L * 2.6,
      lens: 35,
      drift: 0.02,
      label: "Wheel stop",
    };
  return null;
}
function directorUpdate(t, realDt) {
  const md = MV.md;
  const c = activeCraft(t);
  if (!c) return;
  const now = performance.now();
  const jump =
    DIR.lastT == null ||
    Math.abs(t - DIR.lastT) >
      Math.max(120, (STATE.playing ? STATE.rate : 1) * 0.6);
  DIR.lastT = t;
  if (CAM.target !== "obj:" + c.o.id) {
    if (jump) {
      CAM.target = "obj:" + c.o.id;
      CAM.trans = null;
      syncCamUI();
    } else setTarget("obj:" + c.o.id, { force: true, keepMode: true });
  }
  const shot = directorShot(c, t);
  if (!shot) return;
  if (shot.key !== DIR.key) {
    if (!jump && DIR.key)
      DIR.blend = {
        pos: R.camera.position.clone(),
        quat: R.camera.quaternion.clone(),
        up: R.camera.up.clone(),
        center: DIR.prm ? DIR.prm.mode !== "lookat" : true,
        t0: now,
        dur: shot.blend || 1800,
      };
    else DIR.blend = null;
    DIR.key = shot.key;
    DIR.since = now;
    DIR.offAz = 0;
    DIR.offEl = 0;
    DIR.zoomK = 1;
    DIR.lensUser = null;
    DIR.dist = null;
    DIR.aimH = null;
  }
  const drift = shot.drift ? ((now - DIR.since) / 1000) * shot.drift : 0;
  const target = shot.dist * DIR.zoomK;
  DIR.dist =
    DIR.dist == null || jump
      ? target
      : Math.exp(
          Math.log(DIR.dist) +
            (Math.log(target) - Math.log(DIR.dist)) * Math.min(1, realDt * 1.5),
        );
  if (shot.aimH == null)
    DIR.aimH = null; // look above the base point (a standing rocket is framed around its middle)
  else
    DIR.aimH =
      DIR.aimH == null || jump
        ? shot.aimH
        : DIR.aimH + (shot.aimH - DIR.aimH) * Math.min(1, realDt * 1.5);
  const aim =
    DIR.aimH != null && c.s ? vscale(vunit(c.rD || c.s.r), DIR.aimH) : null;
  let az, el;
  if (shot.mode === "lookat") {
    // keep the craft inside the middle of the film frame, whatever the lens and screen shape
    const fr = frameRect(),
      tH = 18 / CAM.lens,
      tV = (tH * fr.h) / fr.w;
    const aL = Math.atan(0.42 * tH),
      eL = Math.atan(0.5 * tV);
    DIR.offAz = clamp(DIR.offAz, -aL - shot.az, aL - shot.az);
    DIR.offEl = clamp(DIR.offEl, -eL - shot.el, eL - shot.el);
    az = clamp(
      shot.az + DIR.offAz + Math.sin(drift) * Math.min(0.05, aL * 0.3),
      -aL,
      aL,
    );
    el = clamp(shot.el + DIR.offEl, -eL, eL);
  } else {
    az = shot.az + DIR.offAz + drift;
    el = clamp(shot.el + DIR.offEl, -1.5, 1.5);
  }
  DIR.prm = {
    mode: shot.mode,
    look: shot.look,
    from: shot.from,
    off: shot.off,
    az,
    el,
    dist: DIR.dist,
    aim,
  };
  DIR.shot = shot;
  const lens = DIR.lensUser || shot.lens;
  if (Math.abs(CAM.lens - lens) > 0.5) {
    CAM.lens = jump
      ? lens
      : Math.exp(
          Math.log(CAM.lens) +
            (Math.log(lens) - Math.log(CAM.lens)) * Math.min(1, realDt * 2),
        );
    applyLens();
    syncCamUI();
  }
  if (CAM.look !== shot.look && shot.look) CAM.look = shot.look;
}
function updateCamera(t, realDt) {
  const cam = R.camera;
  if (CAM.mode === "auto" && MV.md) directorUpdate(t, realDt);
  let P = targetPos(CAM.target, t);
  if (!P) P = targetPos("obj:ship", t) || helio("earth", t).r; // target not in flight yet (e.g. a lander still docked): follow the ship meanwhile
  // transition between targets
  let dist = CAM.dist;
  if (CAM.trans) {
    const f = clamp((performance.now() - CAM.trans.t0) / CAM.trans.dur, 0, 1);
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
  if (CAM.mode === "auto" && MV.md && DIR.prm) {
    const pose = poseFor(DIR.prm.mode, DIR.prm, P, t);
    setPose(pose);
    if (DIR.blend) {
      const f = smoothstep((performance.now() - DIR.blend.t0) / DIR.blend.dur);
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
    CAM.camDist =
      DIR.prm.mode === "site" ? cam.position.length() : DIR.prm.dist;
    return;
  }
  const minD = rT > 0 ? rT * 1.003 + 0.002 : 0.004;
  dist = Math.max(dist, minD);
  if (!CAM.trans) CAM.dist = Math.max(CAM.dist, minD);
  const mode = CAM.mode === "auto" ? "chase" : CAM.mode;
  setPose(
    poseFor(mode, { az: CAM.az, el: CAM.el, dist, look: CAM.look }, P, t),
  );
  CAM.camDist = dist;
}
// ---------------- input ----------------

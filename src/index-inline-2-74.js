// index-inline-2 74 — dir
// Lines 21397-21642 of readable/index-inline-2.pretty.js (statement-aligned).
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
  const now = clockMs();
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
  const shot = (CAM.mode === "cine" && cineShot(c, t)) || directorShot(c, t);
  if (!shot) return;
  let cut = false;
  if (shot.key !== DIR.key) {
    cut = !!shot.cut; // (a cut: no blend from the last shot, the lens set at once)
    if (!jump && DIR.key && !cut)
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
  const aim = shot.aimP
    ? shot.aimP // (a point given outright: the middle of a vehicle as drawn, app/51_cine.js)
    : shot.aimV && c.vD && vnorm(c.vD) > 1e-6
      ? vscale(vunit(c.vD), shot.aimV) // (up the vehicle's axis, near enough its velocity in flight: a cinematic shot of a long stack)
      : DIR.aimH != null && c.s
        ? vscale(vunit(c.rD || c.s.r), DIR.aimH)
        : null;
  let az,
    el,
    centreK = 0;
  if (shot.mode === "lookat") {
    // keep the craft inside the middle of the film frame, whatever the lens and screen shape
    const fr = frameRect(),
      tH = 18 / CAM.lens,
      tV = (tH * fr.h) / fr.w;
    const aL = Math.atan(0.42 * tH),
      eL = Math.atan(0.5 * tV);
    // Dragged past the edge of that frame the camera turns from the body to the craft (centreK), so the craft can be looked
    // at from every side; back inside it the body comes back into view
    az = shot.az + DIR.offAz + Math.sin(drift) * Math.min(0.05, aL * 0.3);
    el = clamp(shot.el + DIR.offEl, -1.5, 1.5);
    const outA = Math.max(Math.abs(az) - aL, 0) / 0.25,
      outE = Math.max(Math.abs(el) - eL, 0) / 0.25;
    centreK = smoothstep(Math.max(outA, outE));
  } else {
    az = shot.az + DIR.offAz + drift;
    el = clamp(shot.el + DIR.offEl, -1.5, 1.5);
  }
  DIR.prm = {
    mode: shot.mode,
    look: shot.look,
    from: shot.from,
    off: shot.off,
    spot: shot.spot,
    az,
    el,
    dist: DIR.dist,
    aim,
    centreK,
    fromAz: shot.mode === "from" ? DIR.offAz : 0,
    fromEl: shot.mode === "from" ? DIR.offEl : 0,
    zoomK: DIR.zoomK,
  };
  DIR.shot = shot;
  const lens = DIR.lensUser || shot.lens;
  if (Math.abs(CAM.lens - lens) > 0.5) {
    CAM.lens =
      jump || cut
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

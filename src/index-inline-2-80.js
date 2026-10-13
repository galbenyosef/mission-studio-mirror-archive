// index-inline-2 80 — state
// Lines 23015-23286 of readable/index-inline-2.pretty.js (statement-aligned).
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = clamp((now - STATE.last) / 1000, 0, 0.1);
  STATE.last = now;
  MV.realDt = realDt;
  if (MV.md && STATE.playing) {
    if (STATE.auto) autoWarp(realDt);
    const md = MV.md;
    const t1 = clamp(STATE.t + realDt * STATE.rate, md.tStart, md.tEnd);
    crossEvents(STATE.t, t1);
    STATE.t = t1;
    if (STATE.t >= md.tEnd) {
      STATE.playing = false;
      syncPlayUI();
    }
  }
  if (!MV.md) {
    CAM.az += realDt * 0.03;
  }
  renderFrame(false);
}
function renderFrame(forCapture) {
  R.helio = {};
  const md = MV.md;
  const t = md
    ? STATE.t
    : STATE.idleT0 + ((performance.now() - STATE.idleStart) / 1000) * 120;
  MV.tNow = t;
  MV.rate = STATE.playing ? STATE.rate : 1;
  R.clock = (R.clock || 0) + (MV.realDt || 0.016); // s of rendering (real time; a video's own frame time), for things that shimmer
  if (md) for (const c of MV.crafts) computeCraft(c, t);
  updateCamera(t, MV.realDt || 0.016);
  updateBodies(t, CAM.camDist);
  const camD = CAM.camDist || 1;
  if (md) {
    for (const c of MV.crafts) updateCraft(c, t, R.camera.position);
    updatePlasmaLight();
    updatePad(t);
    updateRunway(t);
    updateTrails(t, R.O, camD);
    updateExhaust(t);
    updateShadows(t);
    updateTracks(t);
  }
  updateOrbits(
    t,
    MV.layers.orbits,
    Math.max(camD, R.camera.position.length()),
    MV.frame,
  );
  // stars sit at infinity around the camera; dim them when a bright, sunlit body fills the frame
  R.stars.visible = MV.layers.stars !== false;
  updateSky();
  let bright = 1;
  if (MV.layers.exposure) {
    const dir = new THREE.Vector3();
    R.camera.getWorldDirection(dir);
    const half = ((R.camera.fov * DEG) / 2) * Math.max(1, R.camera.aspect);
    const sunV = R.bodies.sun.group.position.clone().sub(R.camera.position);
    if (sunV.angleTo(dir) < half + 0.1) bright = 0.0;
    for (const n of ["earth", "moon", "mars"]) {
      const b = R.bodies[n];
      const v = b.group.position.clone().sub(R.camera.position);
      const ang = Math.asin(Math.min(1, b.R / Math.max(v.length(), b.R)));
      if (v.angleTo(dir) < half + ang && ang > half * 0.05)
        bright = Math.min(bright, 0.06);
    }
  }
  R.starMat.uniforms.uBright.value +=
    (bright - R.starMat.uniforms.uBright.value) * 0.15;
  R.starMat.uniforms.uScale.value = Math.min(window.devicePixelRatio || 1, 2);
  const focus = targetCraft() || craftById("ship");
  let tele = null;
  if (md) {
    tele = computeTele(focus && focus.s ? focus : craftById("ship"), t);
    const nowP = performance.now();
    if (nowP - STATE.teleAt > 110 || forCapture) {
      STATE.teleAt = nowP;
      drawTele(tele, t);
      drawProp(tele, t);
      updateEventsPanel(t);
    }
    const clean = $("#app").classList.contains("hide-ui");
    updateVectors(targetCraft() && tele && !clean ? tele.c : null, t, tele);
    updateOsc(focus, t);
  }
  updateAudio(t, tele);
  updateLabels(t, focus);
  if (md && MV.layers.minimap !== false) drawMinimap(t, forCapture);
  const bc = R.bgCam;
  bc.quaternion.copy(R.camera.quaternion);
  if (bc.fov !== R.camera.fov || bc.aspect !== R.camera.aspect) {
    bc.fov = R.camera.fov;
    bc.aspect = R.camera.aspect;
    bc.updateProjectionMatrix();
  }
  const film = filmBegin(); // the film look: draw into its target, then finish onto the screen (app/25_film.js)
  R.renderer.clear();
  R.renderer.render(R.bgScene, bc);
  R.renderer.clearDepth();
  R.renderer.render(R.scene, R.camera);
  if (film) filmEnd();
  updateHUD(t);
}
// ---------------- launch countdown: T−10 … 1, then LIFTOFF ----------------
const CD = {
  reduce: (() => {
    try {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  })(),
};
function drawCountdown(t) {
  const el = $("#countdown");
  const md = MV.md;
  const met = md ? t - md.M.t0 : NaN;
  if (!md || !(met > -10.0001 && met < 2.8)) {
    if (!el.hidden) el.hidden = true;
    return;
  }
  if (el.hidden) el.hidden = false;
  const lift = met >= 0,
    ig = lift ? null : padIgnition(md, t),
    ign = !!(ig && ig.f > 0);
  if (el.classList.contains("liftoff") !== lift)
    el.classList.toggle("liftoff", lift);
  if (el.classList.contains("ign") !== ign) el.classList.toggle("ign", ign);
  const S = LAUNCH_SITES[md.cfg.site],
    sol = liftoffStages(md.L).filter((x) => x.prop === "solid");
  const eng = ig ? engineCounts(ig.liq) : "";
  const label = ign
    ? ig.full
      ? "All engines running"
      : "Ignition"
    : "Liftoff in";
  const sub = ign
    ? `${eng} ${ig.full ? "at full thrust" : "igniting"} · clamps holding${sol.length ? " · boosters light at T−0" : ""}`
    : `${md.L.name}${S ? " · " + S.name : ""}`;
  const lb = el.querySelector(".cd-label"),
    sb = el.querySelector(".cd-sub");
  if (lb.textContent !== label) lb.textContent = label;
  if (sb.textContent !== sub) sb.textContent = sub;
  const n = el.querySelector(".cd-n");
  const txt = lift ? "LIFTOFF" : String(Math.max(1, Math.ceil(-met - 1e-6)));
  if (n.textContent !== txt) {
    n.textContent = txt;
    if (!CD.reduce && n.animate)
      n.animate(
        [
          { transform: "scale(1.22)", opacity: 0.35 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
  }
  const op = met < 2 ? "" : String(clamp(1 - (met - 2) / 0.8, 0, 1));
  if (el.style.opacity !== op) el.style.opacity = op;
}
function updateHUD(t) {
  const md = MV.md;
  const nowP = performance.now();
  drawCountdown(t);
  if (md) {
    const met = fMET(t - md.M.t0);
    if ($("#met").textContent !== met) $("#met").textContent = met;
    const utc = fmtUTC(t) + " UTC";
    if ($("#utc").textContent !== utc) $("#utc").textContent = utc;
    const w = STATE.playing ? fmtRate(STATE.rate) : "paused";
    if ($("#warp").textContent !== w) $("#warp").textContent = w;
    drawTimeline(t);
    if (MV.layers.burnin) {
      const ph = md.phaseAt(t);
      const ps = PSTAT.cur;
      $("#burnin").textContent =
        `${md.M.name}\n${met}   ${fmtUTC(t)} UTC\n${Math.round(CAM.lens)} mm · ${CAM.aspect ? CAM.aspect + ":1" : "full"} · ${ph ? ph.name : ""}${ps ? " · " + (ps.k === "burn" ? "ENGINE ON" : ps.l) : ""}`;
    }
  } else {
    const utc = fmtUTC(t, false) + " UTC";
    if ($("#utc").textContent !== utc) $("#utc").textContent = utc;
  }
  updateCaption();
}
// ---------------- mission start ----------------
function startMission(M, scn) {
  const md = new MissionData(M, scn);
  setupMissionView(md);
  preloadDetailedModels(md);
  buildTelePanel();
  buildEventsPanel();
  buildBudgetPanel();
  buildInfoPanel();
  buildTimelineMap();
  TL.bg = null;
  loadShots();
  $("#missionName").textContent = M.name;
  $("#app").classList.remove("idle");
  $("#setup").hidden = true;
  $("#setupClose").hidden = false;
  // camera & time
  const st = $("#selTarget");
  st.innerHTML = "";
  st.append(
    h(
      "optgroup",
      { label: "Spacecraft" },
      ...M.objects
        .filter((o) => o.kind !== "debris")
        .map((o) => h("option", { value: "obj:" + o.id }, o.name)),
    ),
  );
  st.append(
    h(
      "optgroup",
      { label: "Bodies" },
      ...["earth", "moon", "mars", "sun", "venus", "jupiter", "saturn"].map(
        (b) => h("option", { value: "body:" + b }, BODIES[b].name),
      ),
    ),
  );
  const sl = $("#selLook");
  sl.innerHTML = "";
  sl.append(
    ...["moon", "earth", "mars", "sun", "venus", "jupiter"].map((b) =>
      h("option", { value: "body:" + b }, BODIES[b].name),
    ),
    ...M.objects
      .filter((o) => o.kind === "craft")
      .map((o) => h("option", { value: "obj:" + o.id }, o.name)),
  );
  resetMinimap();
  CAM.target = "obj:ship";
  CAM.mode = "chase";
  CAM.az = 205 * DEG;
  CAM.el = 4 * DEG;
  CAM.roll = 0;
  CAM.trans = null;
  CAM.dist = Math.max(0.06, md.L.height * 0.0042);
  CAM.lens = 35;
  CAM.look =
    md.cfg.dest === "mars" || (md.cfg.legs || []).length
      ? "body:mars"
      : "body:moon";
  {
    const S = LAUNCH_SITES[M.cfg.site];
    const r = sitePosEcl("earth", S.lat, S.lon, 0, M.t0);
    const lf = localFrame("earth", r, M.t0);
    const sun = vunit(vscale(planetHelio("earth", M.t0).r, -1));
    const azS = Math.atan2(vdot(sun, lf.north), vdot(sun, lf.east));
    CAM.az = azS + 38 * DEG;
  }
  setMode("auto");
  applyLens();
  syncCamUI();
  STATE.t = M.t0 - 10;
  STATE.playing = true;
  STATE.auto = true;
  STATE.rate = 1;
  STATE.lastCaptionEv = -1;
  syncPlayUI();
  for (const c of MV.crafts) c.qInit = false;
  MV.frameSel = "auto";
  $("#selFrame").value = "auto";
  showCaption({
    name: M.name,
    desc:
      (scn ? scn.tag + ". " : "") +
      `Liftoff ${fmtUTC(M.t0, false)} UTC from ${LAUNCH_SITES[M.cfg.site].name}.`,
  });
}
// ---------------- UI wiring ----------------

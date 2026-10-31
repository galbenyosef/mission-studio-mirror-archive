// index-inline-2 96 — addeventlistener
// Lines 27945-28226 of readable/index-inline-2.pretty.js (statement-aligned).
function initUI() {
  $$("#right .tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#right .tabs button").forEach((x) =>
        x.classList.toggle("on", x === b),
      );
      for (const p of ["events", "budget", "info", "shots"])
        $("#tab-" + p).hidden = p !== b.dataset.tab;
      if (b.dataset.tab === "events") PANEL.curEv = -2;
    }),
  );
  $("#bPlay").addEventListener("click", () => {
    if (!MV.md) return;
    if (STATE.t >= MV.md.tEnd) setTime(MV.md.tStart);
    STATE.playing = !STATE.playing;
    syncPlayUI();
  });
  $("#bPrev").addEventListener("click", () => jumpEvent(-1));
  $("#bNext").addEventListener("click", () => jumpEvent(1));
  $("#bSlower").addEventListener("click", () => stepWarp(-1));
  $("#bFaster").addEventListener("click", () => stepWarp(1));
  $("#autoWarp").addEventListener("change", (e) => {
    STATE.auto = e.target.checked;
  });
  $("#selTarget").addEventListener("change", (e) => setTarget(e.target.value));
  $("#selMode").addEventListener("change", (e) => setMode(e.target.value));
  $("#selLook").addEventListener("change", (e) => {
    CAM.look = e.target.value;
  });
  const ln = $("#selLens");
  for (const mm of LENSES) ln.append(h("option", { value: mm }, mm + " mm"));
  ln.addEventListener("change", (e) => {
    CAM.lens = +e.target.value;
    if (directed()) DIR.lensUser = CAM.lens;
    applyLens();
  });
  $("#selAspect").addEventListener("change", (e) => {
    CAM.aspect = +e.target.value;
    applyLens();
  });
  $("#selFrame").addEventListener("change", (e) => {
    MV.frameSel = e.target.value;
  });
  $("#bLayers").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#layers").hidden = !$("#layers").hidden;
  });
  document.addEventListener("click", (e) => {
    if (
      !$("#layers").hidden &&
      !e.target.closest("#layers") &&
      !e.target.closest("#bLayers")
    )
      $("#layers").hidden = true;
  });
  $$("#layers input[data-layer]").forEach((cb) => {
    MV.layers[cb.dataset.layer] = cb.checked;
    cb.addEventListener("change", () => {
      MV.layers[cb.dataset.layer] = cb.checked;
      applyLayers();
    });
  });
  applyLayers();
  $("#bShot").addEventListener("click", captureShot);
  $("#cdSkip").addEventListener("click", () => {
    const md = MV.md;
    if (!md) return;
    setTime(md.M.t0 - 0.05);
    STATE.playing = true;
    syncPlayUI();
  });
  $("#btnSetup").addEventListener("click", openSetup);
  $("#setupClose").addEventListener("click", () => {
    $("#setup").hidden = true;
  });
  $("#btnHelp").addEventListener("click", () => {
    $("#help").hidden = false;
  });
  $("#helpClose").addEventListener("click", () => {
    $("#help").hidden = true;
  });
  $("#btnHide").addEventListener("click", () =>
    $("#app").classList.toggle("hide-ui"),
  );
  $("#sheetClose").addEventListener("click", () => {
    $("#sheet").hidden = true;
  });
  $("#sheetCopy").addEventListener("click", () => {
    const ta = $("#sheetText");
    try {
      navigator.clipboard.writeText(ta.value).then(
        () => toast("Shot list copied"),
        () => {
          ta.select();
        },
      );
    } catch (e) {
      ta.select();
    }
  });
  $("#btnTele").addEventListener("click", () => {
    $("#left").classList.toggle("open");
    $("#right").classList.remove("open");
  });
  $("#btnSide").addEventListener("click", () => {
    $("#right").classList.toggle("open");
    $("#left").classList.remove("open");
  });
  // keep side panels and captions clear of the (wrapping) bottom bar
  const setBH = () => {
    const hgt = $("#bottom").getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--bottomH",
      Math.round(hgt) + "px",
    );
  };
  try {
    new ResizeObserver(setBH).observe($("#bottom"));
  } catch (e) {
    window.addEventListener("resize", setBH);
  }
  setBH();
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
}
function applyLayers() {
  $("#app").classList.toggle("mm-off", MV.layers.minimap === false);
  if (typeof setMMH === "function") setMMH();
  $("#guides").classList.toggle("on", !!MV.layers.guides);
  $("#burnin").style.display = MV.layers.burnin ? "" : "none";
  if (!MV.layers.captions) $("#caption").classList.add("fade");
  const fl = $('#layers input[data-layer="film"]'); // the film look needs WebGL 2 with floating-point targets
  if (fl && R.renderer && !filmSupported()) {
    fl.checked = false;
    fl.disabled = true;
    MV.layers.film = false;
    fl.parentElement.title =
      "Not available: this browser cannot draw into floating-point targets";
  }
}
function openSetup() {
  $("#setup").hidden = false;
  if (MV.md) {
    STATE.playing = false;
    syncPlayUI();
  }
  if (SETUP.scn) {
    renderDetail();
    renderPlanStatus();
  }
}
function jumpEvent(dir) {
  const md = MV.md;
  if (!md) return;
  const t = STATE.t;
  const evs = md.events.filter(EVF.key);
  if (dir > 0) {
    const e = evs.find((e) => e.t > t + 30);
    if (e) jumpToEvent(e);
  } else {
    const prev = evs.filter((e) => e.t < t - 40);
    const e = prev[prev.length - 1];
    if (e) jumpToEvent(e);
  }
}
function onKey(e) {
  if (e.target.closest("input, textarea, select")) return;
  if (!$("#help").hidden && e.key === "Escape") {
    $("#help").hidden = true;
    return;
  }
  if (!$("#sheet").hidden && e.key === "Escape") {
    $("#sheet").hidden = true;
    return;
  }
  if (e.key === "m" || e.key === "M") {
    setSound(!SND.on);
    return;
  }
  if (!$("#setup").hidden) {
    if (e.key === "Escape" && MV.md) $("#setup").hidden = true;
    return;
  }
  const k = e.key;
  if (k === " ") {
    e.preventDefault();
    $("#bPlay").click();
  } else if (k === "ArrowRight") jumpEvent(1);
  else if (k === "ArrowLeft") jumpEvent(-1);
  else if (k === "]") stepWarp(1);
  else if (k === "[") stepWarp(-1);
  else if (k === "c" || k === "C") captureShot();
  else if (k === "h" || k === "H") $("#app").classList.toggle("hide-ui");
  else if (k === "f" || k === "F") setMode("auto");
  else if (k === "?") $("#help").hidden = false;
  else if ("1234567".includes(k))
    setMode(
      ["auto", "orbit", "chase", "lookat", "ground", "top", "cine"][+k - 1],
    );
}
function onResize() {
  const cv = R.renderer.domElement;
  R.width = cv.clientWidth || window.innerWidth;
  R.height = cv.clientHeight || window.innerHeight;
  R.renderer.setSize(R.width, R.height, false);
  applyLens();
  TL.bg = null;
}
// ---------------- boot ----------------
function boot() {
  initScene();
  initBodyLabels();
  initVectors();
  initExhaust();
  initCameraInput();
  initTimeline();
  initUI();
  initMinimap();
  initSound();
  $("#app").classList.add("idle");
  onResize();
  STATE.idleT0 = dateToT(new Date());
  CAM.target = "body:earth";
  CAM.mode = "orbit";
  CAM.dist = 21000;
  CAM.el = 12 * DEG;
  CAM.az = 40 * DEG;
  CAM.lens = 35;
  applyLens();
  buildScenarioList();
  const last = lsGet("mstudio-last", "apollo11");
  selectScenario(scenarioById(last) ? last : "apollo11");
  requestAnimationFrame(frame);
}
window.__ms = {
  STATE,
  CAM,
  DIR,
  CINE,
  cineShake,
  cineTimes,
  craftById,
  MM,
  MV,
  R,
  DETAIL,
  setTime,
  setTarget,
  setMode,
  applyLens,
  SETUP,
  Planner,
  renderFrame,
  autoWarp,
  crossEvents,
  computeCraft,
  craftAttitude,
  cfgAt,
  activeMounts,
  modelForConfig,
  attEpisodes,
  groundFrame,
  helioReset: () => {
    R.helio = {};
  },
  capHitLocal,
  eclToMesh,
  roverPose,
  meshDir,
  SND,
  setSound,
  THREE,
};
try {
  boot();
} catch (err) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="position:fixed;left:16px;top:16px;right:16px;color:#ff6767;background:#000;padding:12px;z-index:99;white-space:pre-wrap">Startup error: ${esc((err && err.stack) || err)}</pre>`,
  );
  throw err;
}

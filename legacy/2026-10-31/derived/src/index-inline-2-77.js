// index-inline-2 77 — setup
// Lines 22026-22349 of readable/index-inline-2.pretty.js (statement-aligned).
function drawPorkchop() {
  const cv = $("#pork");
  if (!cv) return;
  const cfg = SETUP.cfg;
  const leg = cfg.legs[0];
  const extra =
    (cfg.refill ? cfg.refill.days * DAY : 0) + (cfg.tmiDelay ?? 1) * 3600;
  const tDepCur = isoToT(cfg.launch) + extra,
    tArrCur = isoToT(leg.t),
    tofCur = tArrCur - tDepCur;
  const tD0 = tDepCur - 50 * DAY,
    tD1 = tDepCur + 50 * DAY,
    tf0 = 110 * DAY,
    tf1 = 360 * DAY;
  const nx = 80,
    ny = 60;
  const pc = porkchop("earth", leg.body, tD0, tD1, tf0, tf1, nx, ny);
  const W = cv.width,
    Hh = cv.height,
    L = 46,
    B = 30,
    Tp = 8,
    Rr = 10;
  const pw = W - L - Rr,
    ph = Hh - B - Tp;
  const g = cv.getContext("2d");
  g.fillStyle = "#060a12";
  g.fillRect(0, 0, W, Hh);
  const img = g.createImageData(pw, ph);
  const col = (c3) => {
    if (!isFinite(c3)) return [10, 14, 22];
    const f = clamp(
      (Math.log(c3) - Math.log(8)) / (Math.log(120) - Math.log(8)),
      0,
      1,
    );
    const band = Math.floor(f * 14) / 14;
    const a = [
      [20, 70, 110],
      [40, 160, 170],
      [230, 200, 90],
      [200, 80, 40],
      [60, 20, 30],
    ];
    const p = band * (a.length - 1);
    const i = Math.floor(p),
      r = p - i;
    const c0 = a[i],
      c1 = a[Math.min(i + 1, a.length - 1)];
    return c0.map((v, k) => v + (c1[k] - v) * r);
  };
  for (let py = 0; py < ph; py++)
    for (let px = 0; px < pw; px++) {
      const fx_ = (px / (pw - 1)) * (nx - 1),
        fy = (1 - py / (ph - 1)) * (ny - 1);
      const i = Math.round(fx_),
        j = Math.round(fy);
      const c = col(pc.c3[j * nx + i]);
      const o = 4 * (py * pw + px);
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  g.putImageData(img, L, Tp);
  g.fillStyle = "#8794a8";
  g.font = '11px "IBM Plex Mono", monospace';
  for (let d = 0; d <= 100; d += 25) {
    const x = L + (d / 100) * pw;
    const dt = tToDate(tD0 + (d / 100) * (tD1 - tD0));
    const lab = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    const tw = g.measureText(lab).width;
    g.fillText(lab, clamp(x - tw / 2, 2, W - tw - 2), Hh - 10);
    g.fillRect(x, Tp + ph, 1, 4);
  }
  for (let tf = 120; tf <= 360; tf += 60) {
    const y = Tp + (1 - (tf * DAY - tf0) / (tf1 - tf0)) * ph;
    g.fillText(tf + "d", 6, y + 4);
    g.fillRect(L - 4, y, 4, 1);
  }
  const X = (td) => L + ((td - tD0) / (tD1 - tD0)) * pw,
    Y = (tf) => Tp + (1 - (tf - tf0) / (tf1 - tf0)) * ph;
  if (tofCur > tf0 && tofCur < tf1) {
    g.strokeStyle = "#ffb547";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(X(tDepCur), Y(tofCur), 7, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(X(tDepCur) - 12, Y(tofCur));
    g.lineTo(X(tDepCur) + 12, Y(tofCur));
    g.moveTo(X(tDepCur), Y(tofCur) - 12);
    g.lineTo(X(tDepCur), Y(tofCur) + 12);
    g.stroke();
  }
  // minimum marker
  let bi = 0;
  for (let i = 0; i < pc.c3.length; i++)
    if (isFinite(pc.c3[i]) && pc.c3[i] < pc.c3[bi]) bi = i;
  const bx = bi % nx,
    by = Math.floor(bi / nx);
  g.fillStyle = "#5fe3a1";
  g.beginPath();
  g.arc(L + (bx / (nx - 1)) * pw, Tp + (1 - by / (ny - 1)) * ph, 4, 0, TAU);
  g.fill();
  const c3Cur = (() => {
    const a = planetHelio("earth", tDepCur),
      b = planetHelio(leg.body, tArrCur);
    const Lm = lambert(a.r, b.r, tofCur, BODIES.sun.mu, [0, 0, 1]);
    if (!Lm) return NaN;
    const d = vsub(Lm.v1, a.v);
    return vdot(d, d);
  })();
  $("#porkInfo").textContent =
    `Selected: depart ${fmtUTC(tDepCur, false)}, ${fx(tofCur / DAY, 0)} d → C3 ${fx(c3Cur, 1)} km²/s² · green dot = cheapest (C3 ${fx(pc.c3[bi], 1)})`;
  cv.onclick = (e) => {
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W,
      py = ((e.clientY - r.top) / r.height) * Hh;
    if (px < L || px > L + pw || py < Tp || py > Tp + ph) return;
    const td = tD0 + ((px - L) / pw) * (tD1 - tD0),
      tf = tf0 + (1 - (py - Tp) / ph) * (tf1 - tf0);
    const launchT = td - extra;
    const iso = (t) =>
      tToDate(t)
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    const oldArr = isoToT(leg.t);
    SETUP.cfg.launch = iso(Math.round(launchT / 60) * 60);
    delete SETUP.cfg.launchAz;
    const newArr = Math.round((td + tf) / 60) * 60;
    const dShift = newArr - oldArr;
    leg.t = iso(newArr);
    if (leg.tLand) leg.tLand = iso(isoToT(leg.tLand) + dShift);
    renderDetailSoft();
    schedulePlan();
  };
}
// ---------------- background planning ----------------
function schedulePlan(delay = 650) {
  clearTimeout(SETUP.debounce);
  SETUP.plan = null;
  SETUP.planErr = null;
  SETUP.planning = true;
  SETUP.progress = "waiting for inputs…";
  renderPlanStatus();
  SETUP.debounce = setTimeout(() => {
    const cfg = JSON.parse(JSON.stringify(SETUP.cfg));
    const scn = SETUP.scn;
    const t0 = performance.now();
    SETUP.planning = true;
    SETUP.progress = "starting…";
    renderPlanStatus();
    Planner.plan(cfg, (m) => {
      SETUP.progress = m;
      renderPlanStatus();
      SETUP.onProgress && SETUP.onProgress(m);
    })
      .then((M) => {
        if (JSON.stringify(SETUP.cfg) !== JSON.stringify(cfg)) return;
        SETUP.plan = M;
        SETUP.planMs = performance.now() - t0;
        SETUP.planning = false;
        renderPlanStatus();
        SETUP.onDone && SETUP.onDone(M);
      })
      .catch((err) => {
        if (err && err.superseded) return;
        SETUP.planErr = err;
        SETUP.planning = false;
        renderPlanStatus();
        SETUP.onFail && SETUP.onFail(err);
      });
  }, delay);
}
function renderPlanStatus() {
  const st = $("#planStatus"),
    kp = $("#planKpis"),
    go = $("#goBtn");
  if (!st) return;
  kp.innerHTML = "";
  if (SETUP.planErr) {
    st.innerHTML = `<b style="color:var(--red)">The planner could not solve this mission.</b> ${esc(SETUP.planErr.message || "")} — try values closer to the original.`;
    go.disabled = true;
    return;
  }
  if (SETUP.planning || !SETUP.plan) {
    st.innerHTML = `<span class="spinner"></span><b>Solving the trajectory…</b> <span style="color:var(--muted)">${esc(SETUP.progress)}</span>`;
    go.disabled = false;
    go.textContent = "Fly this mission ▶";
    return;
  }
  const M = SETUP.plan;
  const fail = M.failed;
  st.innerHTML = fail
    ? `<b style="color:var(--red)">Solved — but the mission falls short.</b> ${esc(M.warnings[0] || "")}`
    : `<b style="color:var(--green)">Trajectory solved</b> in ${(SETUP.planMs / 1000).toFixed(1)} s.${M.warnings.length ? ' <span style="color:var(--amber)">⚠ ' + esc(M.warnings.join(" ")) + "</span>" : ""}`;
  const dvTot = M.burns.reduce((a, b) => a + (b.dv || 0), 0),
    prop = M.burns.reduce((a, b) => a + (b.prop || 0), 0);
  const kpi = (l, v) =>
    h(
      "div",
      { class: "kpi" },
      h("span", { class: "kl" }, l),
      h("span", { class: "kv2" }, v),
    );
  kp.append(
    kpi("Duration", fTime(M.tEnd - M.t0)),
    kpi("Burns", String(M.burns.length)),
    kpi("Total Δv (burns)", fx(dvTot, 0) + " m/s"),
    kpi("Propellant burned", fMass(prop)),
  );
  if (M.summary.ascent)
    kp.append(kpi("Ascent peak", M.summary.ascent.maxG.toFixed(1) + " g"));
  const ents = M.summary.entries || (M.summary.entry ? [M.summary.entry] : []);
  if (ents.length) {
    const e = ents[ents.length - 1];
    kp.append(
      kpi("Entry", `${e.vEI.toFixed(1)} km/s · ${e.maxG.toFixed(1)} g`),
      M.summary.landing && M.summary.landing.runway
        ? kpi("Landing", M.summary.landing.runway)
        : kpi("Landing error", fx(e.miss, 0) + " km"),
    );
  }
  go.disabled = false;
  go.textContent = "Fly this mission ▶";
}
function launchFromSetup() {
  if (SETUP.plan) {
    startMission(SETUP.plan, SETUP.scn);
    return;
  }
  if (SETUP.planErr) return;
  const ov = $("#planning");
  ov.hidden = false;
  $("#planTitle").textContent = "Solving " + SETUP.cfg.name + "…";
  $("#planLog").innerHTML = "";
  const log = (m) => {
    $("#planLog").append(h("div", null, m));
    $("#planLog").scrollTop = 1e9;
  };
  if (SETUP.progress) log(SETUP.progress);
  SETUP.onProgress = log;
  SETUP.onDone = (M) => {
    SETUP.onProgress = SETUP.onDone = SETUP.onFail = null;
    ov.hidden = true;
    startMission(M, SETUP.scn);
  };
  SETUP.onFail = (err) => {
    SETUP.onProgress = SETUP.onDone = SETUP.onFail = null;
    ov.hidden = true;
  };
  if (!SETUP.planning) schedulePlan(0);
}

// ==== 85_audio.js
// ============================================================================
// Sound — synthesised live with the Web Audio API, no recordings: rocket roar,
// air rush, re-entry plasma, parachutes, the rover's motors, countdown beeps,
// pyro bangs, touchdowns and an ambient score. Off until the viewer turns it on
// (browsers only start audio after a click or a key press).
// ============================================================================
const SND = {
  ctx: null,
  g: null,
  armed: false,
  on: lsGet("mstudio-sound", false),
  music: lsGet("mstudio-music", true),
  silentVacuum: lsGet("mstudio-silent-vacuum", false),
  vol: lsGet("mstudio-volume", 0.8),
  beepSec: null,
  chordIdx: -1,
  chordEnd: 0,
};
// D-major pad (MIDI notes): Dmaj9, Bm9, Gmaj9, Asus2, D/F#, Gmaj7, Em9, Asus4
const AUD_CHORDS = [
  [50, 57, 64, 66, 69, 73],
  [47, 54, 57, 62, 66, 73],
  [43, 55, 59, 62, 66, 69],
  [45, 57, 59, 64, 69, 71],
  [42, 54, 57, 62, 64, 69],
  [43, 55, 59, 62, 66, 71],
  [40, 55, 59, 62, 66, 74],
  [45, 57, 62, 64, 69, 74],
];
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// looping noise buffers; the tail is cross-faded into the head so the loop point is seamless
function audNoise(ctx, sec, kind) {
  const n = Math.floor(ctx.sampleRate * sec),
    m = Math.floor(ctx.sampleRate * 0.25),
    buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const x = new Float32Array(n + m);
    let b = 0;
    for (let i = 0; i < n + m; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") {
        b = (b + 0.02 * w) / 1.02;
        x[i] = b * 3.5;
      } else if (kind === "crackle")
        x[i] =
          Math.random() < 0.0022
            ? (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6)
            : w * 0.05;
      else x[i] = w;
    }
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++)
      d[i] = i < m ? x[i] * (i / m) + x[n + i] * (1 - i / m) : x[i];
  }
  return buf;
}
function audImpulse(ctx, sec) {
  // synthetic hall for the score
  const n = Math.floor(ctx.sampleRate * sec),
    b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8) * 0.5;
  }
  return b;
}

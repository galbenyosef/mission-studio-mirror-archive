// index-inline-2 94 — now
// Lines 27307-27656 of readable/index-inline-2.pretty.js (statement-aligned).
function updateMusic() {
  const ctx = SND.ctx,
    g = SND.g,
    now = ctx.currentTime;
  g.mus.gain.setTargetAtTime(SND.music ? 0.32 : 0, now, 0.8);
  if (!SND.music || now < SND.chordEnd - 3.2) return; // the next chord fades in while this one fades out
  SND.chordIdx = (SND.chordIdx + 1) % AUD_CHORDS.length;
  const ch = AUD_CHORDS[SND.chordIdx],
    t0 = now + 0.05,
    t1 = t0 + 10.5;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 3.2);
  env.gain.setValueAtTime(1, t1 - 3.2);
  env.gain.linearRampToValueAtTime(0, t1);
  env.connect(g.musIn);
  ch.forEach((m, j) => {
    for (const det of [-0.0017, 0.0017]) {
      const o = ctx.createOscillator();
      o.type = j === 0 ? "sine" : "triangle";
      o.frequency.value = midiHz(m) * (1 + det);
      const vg = ctx.createGain();
      vg.gain.value = (j === 0 ? 0.12 : 0.045) * (m > 68 ? 0.7 : 1);
      o.connect(vg);
      vg.connect(env);
      o.start(t0);
      o.stop(t1 + 0.1);
    }
  });
  for (let k = 0; k < 2; k++) {
    // a soft bell or two, high above the pad
    if (Math.random() < 0.35) continue;
    const tb = t0 + 1.5 + Math.random() * 7,
      m = ch[2 + Math.floor(Math.random() * 4)] + 12;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midiHz(m);
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, tb);
    vg.gain.linearRampToValueAtTime(0.05, tb + 0.01);
    vg.gain.exponentialRampToValueAtTime(0.0005, tb + 3.2);
    o.connect(vg);
    vg.connect(g.musIn);
    o.start(tb);
    o.stop(tb + 3.3);
  }
  SND.chordEnd = t1;
}

// ---------------- one-shot effects ----------------
function audEnv(node, now, peak, attack, decay) {
  node.gain.setValueAtTime(0, now);
  node.gain.linearRampToValueAtTime(peak, now + attack);
  node.gain.exponentialRampToValueAtTime(0.0005, now + attack + decay);
}
function audThump(now, k, f0, f1, dur) {
  const ctx = SND.ctx,
    o = ctx.createOscillator(),
    ga = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  audEnv(ga, now, k, 0.008, dur);
  o.connect(ga);
  ga.connect(SND.g.sfx);
  o.start(now);
  o.stop(now + dur + 0.05);
}
function audNoiseHit(now, buf, type, f, k, attack, decay, q = 0.7) {
  const ctx = SND.ctx,
    src = ctx.createBufferSource(),
    fl = ctx.createBiquadFilter(),
    ga = ctx.createGain();
  src.buffer = buf;
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  audEnv(ga, now, k, attack, decay);
  src.connect(fl);
  fl.connect(ga);
  ga.connect(SND.g.sfx);
  src.start(now, Math.random() * (buf.duration - 2));
  src.stop(now + attack + decay + 0.05);
  return fl;
}
function audBeep(f, dur) {
  const ctx = SND.ctx,
    now = ctx.currentTime,
    o = ctx.createOscillator(),
    ga = ctx.createGain();
  o.type = "sine";
  o.frequency.value = f;
  audEnv(ga, now, 0.32, 0.005, dur);
  o.connect(ga);
  ga.connect(SND.g.cue);
  o.start(now);
  o.stop(now + dur + 0.05);
}
const AUD_FX = {
  bang(now, k) {
    audNoiseHit(now, SND.g.white, "highpass", 900, 0.9 * k, 0.003, 0.22);
    audThump(now, 0.8 * k, 95, 38, 0.35);
  }, // pyrotechnic separation
  whoomp(now, k) {
    const f = audNoiseHit(now, SND.g.brown, "lowpass", 120, 0.9 * k, 0.25, 1.0);
    f.frequency.setValueAtTime(120, now);
    f.frequency.exponentialRampToValueAtTime(900, now + 0.5);
    audThump(now, 0.5 * k, 70, 32, 0.6);
  }, // engine start
  boom(now, k) {
    AUD_FX.bang(now, k);
    audThump(now + 0.04, 1.0 * k, 60, 24, 1.2);
    audNoiseHit(
      now + 0.05,
      SND.g.white,
      "bandpass",
      1800,
      0.5 * k,
      0.02,
      1.4,
      0.5,
    );
  }, // liftoff
  fwump(now, k) {
    audNoiseHit(now, SND.g.white, "bandpass", 420, 0.8 * k, 0.06, 0.8, 0.9);
    audThump(now + 0.15, 0.6 * k, 62, 38, 0.3);
  }, // canopy opens
  thud(now, k) {
    audThump(now, 0.9 * k, 72, 28, 0.5);
    audNoiseHit(now, SND.g.brown, "lowpass", 300, 0.5 * k, 0.004, 0.18);
  }, // touchdown
  sonic(now, k) {
    for (const dt of [0, 0.38]) {
      audNoiseHit(now + dt, SND.g.brown, "lowpass", 260, 1.0 * k, 0.002, 0.28);
      audThump(now + dt, 0.9 * k, 48, 26, 0.45);
    }
  }, // the orbiter's twin sonic boom
  clunk(now, k) {
    audThump(now, 0.6 * k, 150, 60, 0.18);
    audThump(now + 0.12, 0.5 * k, 130, 55, 0.2);
    audNoiseHit(now, SND.g.white, "bandpass", 2400, 0.12 * k, 0.002, 0.3, 6);
  }, // docking latches
};
const AUD_EVENT = {
  staging: "bang",
  sep: "bang",
  jettison: "bang",
  skycrane: "bang",
  ignition: "whoomp",
  burn: "whoomp",
  powered: "whoomp",
  chute: "fwump",
  touchdown: "thud",
  landing: "thud",
  dock: "clunk",
  trim: "clunk",
};
function audioEvent(e) {
  const ctx = SND.ctx;
  if (
    !ctx ||
    !SND.on ||
    ctx.state !== "running" ||
    !STATE.playing ||
    STATE.rate > 150
  )
    return;
  let fx = AUD_EVENT[e.kind];
  if (e.kind === "launch") fx = e.ign ? "whoomp" : "boom";
  if (/^Sonic booms?/.test(e.name || "")) fx = "sonic";
  if (!fx) return;
  const c = e.obj ? craftById(e.obj) : null;
  let k = 1;
  if (c && c.s && c.node && c.node.visible) {
    const d = R.camera.position.distanceTo(c.node.position);
    const alt = vnorm(c.s.r) - surfaceRadius(c.s.ref),
      rho =
        c.s.ref === "earth" || c.s.ref === "mars"
          ? atmosOf(c.s.ref, Math.max(0, alt)).rho
          : 0;
    if (rho < 1e-5 && SND.silentVacuum) return; // nothing carries the sound in vacuum
    k =
      Math.max(
        1 / (1 + Math.pow(d / 0.6, 1.2)),
        CAM.target === "obj:" + c.o.id ? 0.3 : 0.12,
      ) * (rho < 1e-5 ? 0.6 : 1);
  }
  AUD_FX[fx](ctx.currentTime + 0.01, k);
}

// ==== 90_main.js
// ============================================================================
// Main: state, playback & auto time-warp, frame loop, UI wiring, boot.
// ============================================================================
const STATE = {
  filming: false,
  filmMs: 0,
  filmDt: 1 / 30,
  t: 0,
  playing: false,
  rate: 1,
  rateTarget: 1,
  auto: true,
  last: performance.now(),
  dwellUntil: 0,
  lastCaptionEv: -1,
  teleAt: 0,
  idle: true,
  idleT0: 0,
  idleStart: performance.now(),
  hudAt: 0,
};
const WARPS = [
  1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 21600, 86400, 259200,
  864000, 2592000,
];
function setTime(t) {
  const md = MV.md;
  if (!md) return;
  STATE.t = clamp(t, md.tStart, md.tEnd);
  for (const c of MV.crafts) c.qInit = false;
  PANEL.curEv = -2;
  STATE.lastCaptionEv = -1;
}
function syncPlayUI() {
  $("#bPlay").textContent = STATE.playing || STATE.filming ? "❚❚" : "▶";
  $("#autoWarp").checked = STATE.auto;
}
function fmtRate(r) {
  if (r < 1.5) return "1×";
  if (r < 100) return Math.round(r) + "×";
  if (r < 3600) return fx(r / 60, r < 600 ? 1 : 0) + " min/s";
  if (r < 86400) return fx(r / 3600, r < 36000 ? 1 : 0) + " h/s";
  return fx(r / 86400, r < 864000 ? 1 : 0) + " d/s";
}
function stepWarp(dir) {
  STATE.auto = false;
  let i = WARPS.findIndex((w) => w >= STATE.rate * 0.999);
  if (i < 0) i = WARPS.length - 1;
  i = clamp(i + dir, 0, WARPS.length - 1);
  STATE.rate = WARPS[i];
  syncPlayUI();
}
// Stretches of a mission when parts move on their own timeline (app/32_shuttle.js): [start, end, top speed]. The automatic
// time-warp slows down to arrive at the start and plays them through at a pace that can be watched: the bay doors swinging
// open or shut, the robot arm reaching for the telescope, lifting it out and swinging it upright, its arrays unfurling, the
// release and the arm folding back, the telescope's aperture door.
function animWindows(md) {
  if (md.animWin) return md.animWin;
  const W = new Map(),
    add = (a, b, r) => W.set(a + ":" + b, [a, b, r]);
  for (const o of md.M.objects)
    for (const cf of o.configs) {
      const L = cf.label || {};
      if (L.bayT != null) add(L.bayT, L.bayT + 210, 12);
      if (L.armT) {
        const T = L.armT;
        add(T.gr - 1500, T.gr, 60);
        add(T.un, T.un + 480, 24);
        add(T.un + 480, T.un + 1680, 60);
        add(T.arr, T.arr + 720, 40);
        add(T.rel, T.rel + 180, 12);
        add(T.rel + 1800, T.rel + 3000, 60);
      }
      if (L.doorT != null) add(L.doorT, L.doorT + 60, 6);
    }
  return (md.animWin = [...W.values()]);
}
function autoWarp(realDt) {
  const md = MV.md,
    t = STATE.t;
  const c = craftById("ship");
  const s = c && c.s;
  let next = null;
  for (const e of md.events)
    if (e.t > t + 0.25 && !["heat", "gload", "blackout"].includes(e.kind)) {
      next = e;
      break;
    }
  const dtNext = next ? next.t - t : 1e9;
  let target = Math.max(1, dtNext / 4.5);
  let active = false;
  if (s && s.T > 0) {
    active = true;
    const b = md.burnAt(t, "ship");
    if (t < md.M.t0 + 20) target = 1;
    else if (t < md.M.t0 + 60) target = Math.min(target, 2);
    else if (b) target = Math.min(target, clamp(b.dur / 25, 1, 60));
    else target = Math.min(target, 6);
  }
  for (const cc of MV.crafts)
    if (cc !== c && cc.s && cc.s.T > 0 && cc.o.kind === "craft") {
      active = true;
      target = Math.min(target, 6);
    }
  if (s && s.extra && s.extra.chute) {
    active = true;
    target = Math.min(target, 10);
  } else if (s && s.extra && (s.extra.q > 200 || s.extra.heat > 1)) {
    active = true;
    target = Math.min(target, 4);
  }
  if (s && !s.surface && !active) {
    const rr = vnorm(s.r),
      vv = vnorm(s.v);
    if (vv > 0) target = Math.min(target, (0.9 * rr) / vv);
  }
  if (performance.now() < STATE.dwellUntil)
    target = Math.min(target, active ? 2 : 8);
  for (const [a, b, r] of animWindows(md)) {
    if (t >= a && t < b) target = Math.min(target, r);
    else if (a > t) target = Math.min(target, Math.max(r, (a - t) / 4.5));
  }
  if (t >= md.M.t0 - 12 && t < md.M.t0) target = 1; // the final countdown runs in real time
  if (md.trav && t >= md.trav.seg.t0) {
    const p = roverPose(md, t);
    if (p.driving) target = Math.min(target, 90);
  } // rover drives: watchable speed
  target = clamp(target, 1, 4e6);
  const lr = Math.log(STATE.rate),
    lt = Math.log(target);
  const k = lt < lr ? 7 : 1.2;
  STATE.rate = Math.exp(lr + (lt - lr) * Math.min(1, realDt * k));
}
function crossEvents(t0, t1) {
  const md = MV.md;
  let last = -1,
    sounds = 0;
  for (let i = 0; i < md.events.length; i++) {
    const e = md.events[i];
    if (e.t > t0 && e.t <= t1) {
      last = i;
      if (sounds++ < 3) audioEvent(e);
    }
    if (e.t > t1) break;
  }
  if (last >= 0 && last !== STATE.lastCaptionEv) {
    STATE.lastCaptionEv = last;
    const e = md.events[last];
    if (
      !["heat", "gload", "ascent", "los", "terminal", "approach"].includes(
        e.kind,
      ) ||
      STATE.rate < 20
    )
      showCaption(e);
    STATE.dwellUntil = clockMs() + 2600;
  }
}
// ---------------- frame loop ----------------

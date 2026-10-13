// index-inline-2 78 — snd
// Lines 22350-22667 of readable/index-inline-2.pretty.js (statement-aligned).
function audInit() {
  if (SND.ctx) return SND.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try {
    ctx = new AC();
  } catch (e) {
    return null;
  }
  const g = {};
  SND.ctx = ctx;
  SND.g = g;
  const gain = (v = 0) => {
    const x = ctx.createGain();
    x.gain.value = v;
    return x;
  };
  const filt = (type, f, q = 0.7) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  g.master = gain(0);
  g.comp = ctx.createDynamicsCompressor();
  g.comp.threshold.value = -14;
  g.comp.knee.value = 10;
  g.comp.ratio.value = 5;
  g.comp.attack.value = 0.004;
  g.comp.release.value = 0.25;
  g.lim = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i / 511.5 - 1;
    curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4);
  }
  g.lim.curve = curve;
  g.lim.oversample = "2x";
  g.master.connect(g.comp);
  g.comp.connect(g.lim);
  g.lim.connect(ctx.destination);
  g.cue = gain(0);
  g.cue.connect(g.lim); // countdown beeps skip the compressor so the engines' roar does not duck them
  g.sfx = gain(1);
  g.sfx.connect(g.master);
  // score: pad → low-pass → dry + hall
  g.mus = gain(0);
  g.mus.connect(g.master);
  g.musIn = gain(1);
  const mlp = filt("lowpass", 3000);
  g.musIn.connect(mlp);
  mlp.connect(g.mus);
  const verb = ctx.createConvolver();
  verb.buffer = audImpulse(ctx, 3.4);
  const wet = gain(0.8);
  mlp.connect(verb);
  verb.connect(wet);
  wet.connect(g.mus);
  g.white = audNoise(ctx, 5, "white");
  g.brown = audNoise(ctx, 6, "brown");
  const crackle = audNoise(ctx, 4, "crackle");
  const loop = (buf, rate = 1) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, Math.random() * buf.duration);
    return s;
  };
  const voice = (src, ...nodes) => {
    let n = src;
    for (const x of nodes) {
      n.connect(x);
      n = x;
    }
    const out = gain(0);
    n.connect(out);
    out.connect(g.sfx);
    return out;
  };
  // rocket roar: brown-noise body, band-passed texture, crackle (big engines in air), sub-bass
  g.roarF = filt("lowpass", 400);
  g.roar = voice(loop(g.brown), g.roarF);
  g.texF = filt("bandpass", 700, 0.6);
  g.tex = voice(loop(g.white), g.texF);
  g.crk = voice(loop(crackle), filt("highpass", 900));
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 36;
  const subLfo = ctx.createOscillator();
  subLfo.frequency.value = 0.7;
  const subLfoG = gain(4);
  subLfo.connect(subLfoG);
  subLfoG.connect(sub.frequency);
  sub.start();
  subLfo.start();
  g.sub = voice(sub);
  // air rush (ascent, entry, parachutes) and re-entry plasma
  g.airF = filt("bandpass", 600, 0.5);
  g.air = voice(loop(g.white, 0.9), g.airF);
  g.plasmaF = filt("lowpass", 520);
  g.plasma = voice(loop(g.brown, 0.7), g.plasmaF);
  // rover drive motors: a buzzing saw with a little wobble
  g.mot = ctx.createOscillator();
  g.mot.type = "sawtooth";
  g.mot.frequency.value = 95;
  const vib = ctx.createOscillator();
  vib.frequency.value = 7;
  const vibG = gain(3);
  vib.connect(vibG);
  vibG.connect(g.mot.frequency);
  g.mot.start();
  vib.start();
  g.motG = voice(g.mot, filt("lowpass", 750, 2));
  document.addEventListener("visibilitychange", () => {
    if (!SND.ctx) return;
    if (document.hidden) SND.ctx.suspend();
    else if (SND.on) SND.ctx.resume();
  });
  return ctx;
}
function setSound(on) {
  SND.on = on;
  lsSet("mstudio-sound", on);
  if (on) {
    const ctx = audInit();
    if (!ctx) {
      SND.on = false;
      syncSoundUI();
      toast("Sound is not available in this browser");
      return;
    }
    ctx.resume();
    SND.g.master.gain.setTargetAtTime(SND.vol, ctx.currentTime, 0.05);
    SND.g.cue.gain.setTargetAtTime(SND.vol, ctx.currentTime, 0.05);
  } else if (SND.ctx) {
    SND.g.master.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.04);
    SND.g.cue.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.04);
    setTimeout(() => {
      if (!SND.on && SND.ctx) SND.ctx.suspend();
    }, 400);
  }
  syncSoundUI();
}
function syncSoundUI() {
  const b = $("#btnSound");
  if (!b) return;
  b.classList.toggle("on", SND.on);
  b.setAttribute("aria-pressed", SND.on ? "true" : "false");
  b.querySelector(".ico-on").style.display = SND.on ? "" : "none";
  b.querySelector(".ico-off").style.display = SND.on ? "none" : "";
  $("#sndOn").checked = SND.on;
  $("#sndVol").value = SND.vol;
  $("#sndMusic").checked = SND.music;
  $("#sndVac").checked = SND.silentVacuum;
  const gs = $("#goSound");
  if (gs) gs.checked = SND.on;
}
function initSound() {
  $("#btnSound").addEventListener("click", (e) => {
    e.stopPropagation();
    const pop = $("#soundPop");
    if (!SND.on) {
      setSound(true);
      pop.hidden = false;
    } else pop.hidden = !pop.hidden;
    $("#top").classList.toggle("pop-open", !pop.hidden);
  });
  document.addEventListener("click", (e) => {
    const pop = $("#soundPop");
    if (
      !pop.hidden &&
      !e.target.closest("#soundPop") &&
      !e.target.closest("#btnSound")
    ) {
      pop.hidden = true;
      $("#top").classList.remove("pop-open");
    }
  });
  $("#sndOn").addEventListener("change", (e) => setSound(e.target.checked));
  $("#sndVol").addEventListener("input", (e) => {
    SND.vol = +e.target.value;
    lsSet("mstudio-volume", SND.vol);
    if (SND.ctx && SND.on) {
      SND.g.master.gain.setTargetAtTime(SND.vol, SND.ctx.currentTime, 0.05);
      SND.g.cue.gain.setTargetAtTime(SND.vol, SND.ctx.currentTime, 0.05);
    }
  });
  $("#sndMusic").addEventListener("change", (e) => {
    SND.music = e.target.checked;
    lsSet("mstudio-music", SND.music);
  });
  $("#sndVac").addEventListener("change", (e) => {
    SND.silentVacuum = e.target.checked;
    lsSet("mstudio-silent-vacuum", SND.silentVacuum);
  });
  // sound was left on last time: start it with the first click or key press (browsers block it before that)
  const arm = () => {
    if (SND.on && !SND.armed) {
      SND.armed = true;
      setSound(true);
    }
    window.removeEventListener("pointerdown", arm, true);
    window.removeEventListener("keydown", arm, true);
  };
  if (SND.on) {
    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("keydown", arm, true);
  }
  syncSoundUI();
}

// ---------------- per-frame mix, driven by the craft in view ----------------
function updateAudio(t, T) {
  const ctx = SND.ctx;
  if (!ctx || !SND.on || ctx.state !== "running") return;
  const g = SND.g,
    now = ctx.currentTime,
    md = MV.md,
    live = !!md && STATE.playing;
  let roar = 0,
    tex = 0,
    crk = 0,
    sub = 0,
    air = 0,
    plasma = 0,
    mot = 0,
    cut = 300,
    airF = 600,
    motF = 95;
  if (md && T && T.c && T.c.node && T.c.node.visible) {
    const c = T.c,
      s = T.s,
      isTarget = CAM.target === "obj:" + c.o.id;
    const d = Math.max(1e-4, R.camera.position.distanceTo(c.node.position)); // km
    const rho =
      T.ref === "earth" || T.ref === "mars"
        ? atmosOf(T.ref, Math.max(0, T.alt)).rho
        : 0; // kg/m³
    const airK =
      rho > 1e-5
        ? clamp(Math.log10(rho / 1e-5) / Math.log10(1.225 / 1e-5), 0, 1)
        : 0; // 0 in vacuum … 1 at sea level
    const inAir = airK > 0.02;
    const medium = inAir ? 1 : SND.silentVacuum ? 0 : 0.55; // cinematic: engines in vacuum still rumble, muffled
    const thrust = live ? T.thrust || 0 : 0;
    if (thrust > 0) {
      const loud = clamp(
        0.2 + (0.8 * Math.log10(thrust / 2e4)) / Math.log10(3.5e7 / 2e4),
        0.12,
        1,
      ); // Saturn V ≈ 1, lunar module ≈ 0.3
      const att = 1 / (1 + Math.pow(d / (0.15 + 1.2 * loud), 1.3));
      const k = loud * Math.max(att, isTarget ? 0.22 : 0) * medium;
      roar = 0.9 * k;
      tex = (inAir ? 0.32 : 0.06) * k;
      sub = (inAir ? 0.7 : 0.35) * k;
      crk = inAir && thrust > 4e6 ? 0.5 * k * airK : 0;
      cut = inAir ? 260 + 1200 * loud * att * (0.4 + 0.6 * airK) : 240;
    }
    if (inAir && live && !s.surface && !s.pad) {
      // wind: dynamic pressure q = ½ρv² from the speed through the air
      const v = T.vSurf * 1000,
        q = 0.5 * rho * v * v;
      const attA = Math.max(
        1 / (1 + Math.pow(d / 0.4, 1.2)),
        isTarget ? 0.3 : 0,
      );
      if (q > 5) {
        const qK = clamp(Math.sqrt(q / 35000), 0, 1);
        if (v > 2600) {
          plasma = 0.85 * qK * attA;
          air = 0.22 * qK * attA;
        } else air = 0.55 * qK * attA;
        airF = 300 + 2200 * clamp(v / 2500, 0, 1);
      }
      if (s.extra && s.extra.chute) {
        air = Math.max(air, 0.28 * attA);
        airF = 420 + 140 * Math.sin(now * 9);
      }
    }
    if (live && s.rover && s.rover.driving && d < 0.12) {
      mot =
        0.12 *
        (1 - d / 0.12) *
        (T.ref === "mars" ? 0.75 : 1) *
        (SND.silentVacuum && !inAir ? 0 : 1);
      motF = s.rover.kind === "turn" ? 80 : 100 + 600 * Math.abs(s.rover.v);
    }
  }
  const set = (node, v, tc = 0.1) => node.gain.setTargetAtTime(v, now, tc);
  set(g.roar, roar);
  set(g.tex, tex);
  set(g.crk, crk);
  set(g.sub, sub);
  set(g.air, air, 0.2);
  set(g.plasma, plasma, 0.25);
  set(g.motG, mot, 0.15);
  g.roarF.frequency.setTargetAtTime(cut, now, 0.15);
  g.texF.frequency.setTargetAtTime(500 + cut * 0.5, now, 0.2);
  g.airF.frequency.setTargetAtTime(airF, now, 0.2);
  g.mot.frequency.setTargetAtTime(motF, now, 0.2);
  // final launch countdown: a beep each second from T−10 (higher for the last three)
  if (live && STATE.rate <= 2.5) {
    const met = t - md.M.t0;
    if (met > -10.05 && met < 0) {
      const sec = Math.ceil(-met - 1e-6);
      if (sec !== SND.beepSec) {
        if (SND.beepSec == null || sec < SND.beepSec)
          audBeep(sec <= 3 ? 1318.5 : 987.8, sec <= 3 ? 0.16 : 0.1);
        SND.beepSec = sec;
      }
    } else SND.beepSec = null;
  }
  updateMusic();
}

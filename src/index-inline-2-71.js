// index-inline-2 71 — cam
// Lines 20477-20802 of readable/index-inline-2.pretty.js (statement-aligned).
function ctrTipNode(model) {
  const u = model.userData;
  if (u.ctrTip === undefined) {
    u.ctrTip = null;
    model.traverse((n) => {
      if (!u.ctrTip && n.userData && n.userData.wingtips) u.ctrTip = n;
    });
  }
  return u.ctrTip;
}
// how strongly the tips condense now: the air's density and humidity, and the lift the wings make (the angle of attack)
function contrailStrength(c, s, t, cfgL, model) {
  if (
    !ctrTipNode(model) ||
    !s ||
    s.ref !== "earth" ||
    s.surface ||
    !(cfgL && cfgL.key === "sc")
  )
    return 0;
  const ex = s.extra || {};
  if (!(ex.q > 1500) || ex.alpha == null) return 0;
  const h = ex.alt != null ? ex.alt : vnorm(s.r) - BODIES.earth.R,
    humid = CTR_HUMID[MV.md.cfg.runway] ?? 0.6;
  const dens = 1 - smoothstep((h - 1.5) / 9),
    lift = smoothstep((ex.alpha - 4) / 6),
    q = smoothstep((ex.q - 1500) / 4000);
  return humid * dens * lift * q;
}
// called every frame for a craft in the air; adds a sample at each tip while the trail forms, and draws what is left
function updateContrails(c, s, t, cfgL, model) {
  const k = contrailStrength(c, s, t, cfgL, model);
  let tr = c.ctr;
  if (!tr) {
    if (k <= 0) return;
    tr = contrailInit(c);
  }
  const jump = tr.lastT != null && Math.abs(t - tr.lastT) > 5;
  if (jump) {
    tr.n = 0;
    tr.head = 0;
  } // a leap in time: the old threads are long gone
  bodyQuat("earth", t, _ctrQ);
  const E = helio("earth", t).r,
    O = R.O;
  if (k > 0 && t !== tr.lastT && !(MV.rate > 30)) {
    // a sample at each tip, Earth-fixed
    if (tr.tipKey !== model) {
      tr.tipNode = ctrTipNode(model);
      tr.tipKey = model;
    }
    if (tr.tipNode) {
      const i = tr.head;
      _ctrC.copy(_ctrQ).invert();
      for (let side = 0; side < 2; side++) {
        const w = tr.tipNode.userData.wingtips[side];
        _ctrV.set(w[0], w[1], w[2]);
        tr.tipNode.localToWorld(_ctrV);
        _ctrV.x += O[0] - E[0];
        _ctrV.y += O[1] - E[1];
        _ctrV.z += O[2] - E[2];
        _ctrV.applyQuaternion(_ctrC);
        const j = 3 * (2 * i + side);
        tr.P[j] = _ctrV.x;
        tr.P[j + 1] = _ctrV.y;
        tr.P[j + 2] = _ctrV.z;
      }
      tr.T[i] = t;
      tr.K[i] = k;
      tr.head = (i + 1) % CTR_N;
      tr.n = Math.min(tr.n + 1, CTR_N);
    }
  }
  tr.lastT = t;
  // the ribbons: the samples from the oldest alive to the newest, one strip per tip
  const g = tr.mesh.geometry,
    pos = g.attributes.position.array,
    uv = g.attributes.aUV.array,
    aa = g.attributes.aA.array;
  const cam = R.camera.position;
  let v = 0;
  const sunD = vunit(vscale(E, -1));
  tr.mesh.material.uniforms.uSunDir.value.set(sunD[0], sunD[1], sunD[2]);
  tr.mesh.material.uniforms.uSun.value
    .copy(R.sunLight.color)
    .multiplyScalar(0.5);
  tr.mesh.material.uniforms.uAmb.value
    .copy(R.hemi.color)
    .multiplyScalar(0.15 * R.hemi.intensity + 0.03); // (dim in the dark: the night fill is a cheat for the ground, not for threads of mist)
  const pair = (x, y, z, w, a, m) => {
    for (const sgn of [-1, 1]) {
      const o = 3 * v;
      pos[o] = x + _ctrS.x * w * sgn;
      pos[o + 1] = y + _ctrS.y * w * sgn;
      pos[o + 2] = z + _ctrS.z * w * sgn;
      uv[2 * v] = m;
      uv[2 * v + 1] = sgn;
      aa[v] = a;
      v++;
    }
  };
  for (let side = 0; side < 2 && tr.n > 1; side++) {
    let prevX = 0,
      prevY = 0,
      prevZ = 0,
      first = true,
      lastW = 0;
    for (let m = 0; m < tr.n; m++) {
      const i = (tr.head - tr.n + m + CTR_N) % CTR_N,
        age = t - tr.T[i];
      if (age < 0 || age > CTR_LIFE) continue;
      const j = 3 * (2 * i + side);
      _ctrV.set(tr.P[j], tr.P[j + 1], tr.P[j + 2]).applyQuaternion(_ctrQ);
      const x = _ctrV.x + E[0] - O[0],
        y = _ctrV.y + E[1] - O[1],
        z = _ctrV.z + E[2] - O[2];
      if (first) {
        prevX = x;
        prevY = y;
        prevZ = z;
      }
      _ctrT.set(x - prevX, y - prevY, z - prevZ);
      if (_ctrT.lengthSq() < 1e-12) _ctrT.set(0, 0, 1);
      _ctrS
        .set(cam.x - x, cam.y - y, cam.z - z)
        .cross(_ctrT)
        .normalize(); // across the thread, facing the camera
      const w = (0.45 + 0.5 * age) * 0.001 * (0.6 + 0.4 * tr.K[i]); // m → km: a thread half a metre wide at the tip, a few metres wide as it ages
      const a =
        tr.K[i] *
        0.55 *
        (1 - smoothstep((age - 4) / (CTR_LIFE - 4))) *
        Math.min(age / 0.3 + 0.2, 1);
      if (first) {
        pair(x, y, z, w, 0, m);
        first = false;
      } // (a clear pair at each end: the strip joins the other with nothing drawn between)
      pair(x, y, z, w, a, m);
      lastW = w;
      prevX = x;
      prevY = y;
      prevZ = z;
    }
    if (!first) pair(prevX, prevY, prevZ, lastW, 0, 0);
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.aUV.needsUpdate = true;
  g.attributes.aA.needsUpdate = true;
  g.setDrawRange(0, Math.max(0, 6 * (v / 2 - 1)));
  tr.mesh.visible = v >= 4;
}

// ==== 50_camera.js
// ============================================================================
// Camera: orbit / chase / look-at / ground observer / top-down, with film
// lenses (35 mm full-frame equivalent) and letterbox framing.
// ============================================================================
const CAM = {
  mode: "auto",
  target: "obj:ship",
  look: "body:moon",
  az: 200 * DEG,
  el: 10 * DEG,
  dist: 0.3,
  roll: 0,
  lens: 35,
  aspect: 0,
  ground: { yaw: 0, pitch: 10 * DEG, track: true },
  trans: null,
  lastTargetP: null,
};
function targetPos(id, t) {
  if (!id) return null;
  if (id.startsWith("body:")) return helio(id.slice(5), t).r;
  const c = craftById(id.slice(4));
  if (c && c.P) return c.P;
  if (c) {
    const s = craftState(c, t);
    if (s) return vadd(helio(s.ref, t).r, s.r);
  }
  return null;
}
function targetRadius(id) {
  if (id && id.startsWith("body:")) {
    const b = R.bodies[id.slice(5)];
    return b ? b.R : 1;
  }
  return 0;
}
// the director runs the camera: 'auto', or 'cine' (app/51_cine.js) which is the director with the launch cut as a film
function directed() {
  return CAM.mode === "auto" || CAM.mode === "cine";
}
function targetCraft() {
  return CAM.target.startsWith("obj:") ? craftById(CAM.target.slice(4)) : null;
}
function setTarget(id, opts = {}) {
  if (id === CAM.target && !opts.force) return;
  const t = MV.tNow;
  const from = targetPos(CAM.target, t);
  const prevId = CAM.target;
  CAM.target = id;
  const rT = targetRadius(id);
  const c = targetCraft();
  let dist = CAM.dist;
  if (rT > 0) dist = Math.max(dist, rT * 3.2);
  else if (c && c.cur)
    dist = Math.max(0.03, (c.cur.userData.len || 10) * 0.001 * 3.5);
  if (opts.dist) dist = opts.dist;
  if (from)
    CAM.trans = {
      fromId: prevId,
      fromP: from,
      t0: clockMs(),
      dur: 1100,
      distFrom: CAM.dist,
      distTo: dist,
    };
  CAM.dist = dist;
  if (CAM.mode === "ground" && id.startsWith("body:")) setMode("orbit");
  if (directed() && !opts.keepMode)
    setMode(id.startsWith("body:") ? "orbit" : "chase");
  syncCamUI();
}
function setMode(m) {
  const wasAuto = directed();
  CAM.mode = m;
  $("#lookWrap").hidden = m !== "lookat";
  if (m !== "cine") CINE.timeK = 1;
  if (m === "auto" || m === "cine") {
    DIR.key = "";
    DIR.lastT = null;
    DIR.blend = null;
  }
  if (wasAuto && !directed() && DIR.prm) {
    CAM.dist = DIR.prm.dist;
    CAM.az = DIR.prm.az;
    CAM.el = DIR.prm.el;
  }
  if (m === "ground") {
    CAM.ground.track = true;
    if (CAM.lens < 85) CAM.lens = 200;
  }
  if (m === "top") {
    CAM.el = 89 * DEG;
  }
  if (m === "chase") {
    CAM.az = 200 * DEG;
    CAM.el = 12 * DEG;
  }
  if (m === "lookat") {
    CAM.az = 12 * DEG;
    CAM.el = 6 * DEG;
  }
  applyLens();
  syncCamUI();
}
// The point the camera looks at sits at the middle of the part of the screen the panels leave free, not of the whole
// screen: on a tall screen the panels fill the bottom third, and the craft would otherwise sit just above them. The
// frustum is shifted (an off-centre projection), so nothing else changes.
let VSHIFT = 0;
function applyViewShift() {
  const W = R.width,
    H = R.height,
    b = screenBand(),
    d = Math.round(H / 2 - (b.top + b.bot) / 2);
  if (Math.abs(d) < 4) {
    if (VSHIFT) {
      R.camera.clearViewOffset();
      VSHIFT = 0;
    }
    return;
  }
  if (d !== VSHIFT) {
    R.camera.setViewOffset(W, H, 0, d, W, H);
    VSHIFT = d;
  }
}
function frameRect() {
  const W = R.width,
    Hh = R.height,
    A = CAM.aspect;
  if (!A) return { x: 0, y: 0, w: W, h: Hh };
  if (W / Hh > A) {
    const w = Hh * A;
    return { x: (W - w) / 2, y: 0, w, h: Hh };
  }
  const hh = W / A;
  return { x: 0, y: (Hh - hh) / 2, w: W, h: hh };
}
function applyLens() {
  const fr = frameRect();
  const tanH = 18 / CAM.lens; // 36 mm wide full-frame sensor
  const tanV = (tanH * R.height) / fr.w;
  R.camera.fov = 2 * Math.atan(tanV) * RAD;
  R.camera.aspect = R.width / R.height;
  applyViewShift();
  R.camera.updateProjectionMatrix();
  R.pxPerRad = R.height / (2 * tanV);
  const lb = (id, css) => {
    $(id).style.cssText = css;
  };
  lb("#lbT", `left:0;right:0;top:0;height:${fr.y}px`);
  lb("#lbB", `left:0;right:0;bottom:0;height:${R.height - fr.y - fr.h}px`);
  lb("#lbL", `top:0;bottom:0;left:0;width:${fr.x}px`);
  lb("#lbR", `top:0;bottom:0;right:0;width:${R.width - fr.x - fr.w}px`);
  const gd = $("#guides");
  gd.style.cssText = `left:${fr.x}px;top:${fr.y}px;width:${fr.w}px;height:${fr.h}px`;
  const bi = $("#burnin");
  bi.style.left = fr.x + 14 + "px";
  bi.style.bottom = R.height - fr.y - fr.h + 10 + "px";
}
// where a craft actually stands on a body (its surface segment), preferring the camera target
function surfaceSpotOn(body, after = -Infinity) {
  const order = [
    targetCraft(),
    craftById("ship"),
    craftById("lander"),
    ...MV.crafts,
  ].filter(Boolean);
  for (const c of order)
    for (const sg of c.o.segs)
      if (sg.type === "surface" && sg.ref === body && sg.t0 > after)
        return { lat: sg.lat, lon: sg.lon, elev: sg.elev || 0 };
  return null;
}

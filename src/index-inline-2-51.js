// index-inline-2 51 — tele
// Lines 14164-14497 of readable/index-inline-2.pretty.js (statement-aligned).
function toFrame(frame, t, P) {
  const B = frameOrigin(frame, t);
  const d = vsub(P, B);
  const Rm = frameRot(frame, t);
  if (!Rm) return d;
  return [
    Rm[0] * d[0] + Rm[3] * d[1] + Rm[6] * d[2],
    Rm[1] * d[0] + Rm[4] * d[1] + Rm[7] * d[2],
    Rm[2] * d[0] + Rm[5] * d[1] + Rm[8] * d[2],
  ];
}
function chooseAutoFrame(t, P) {
  const md = MV.md;
  if (!md) return "earth";
  const dM = vnorm(vsub(P, helio("moon", t).r)),
    dE = vnorm(vsub(P, helio("earth", t).r)),
    dMa = vnorm(vsub(P, helio("mars", t).r));
  if (dM < BODIES.moon.soi * 1.2 && md.cfg.dest !== "mars") return "moon";
  if (dMa < BODIES.mars.soi * 1.5) return "mars";
  if (md.cfg.profile === "l2-halo" && dE > 6e5) return "serot"; // out toward L2 the Sun–Earth frame is the one the halo stands still in
  if (dE < BODIES.earth.soi * 1.3) return "earth";
  return "sun";
}
function updateTrails(t, focusP, camDist) {
  const frame =
    MV.frameSel === "auto" ? chooseAutoFrame(t, focusP) : MV.frameSel;
  const show = MV.layers.paths;
  const f = toFrame(frame, t, focusP);
  const pr = R.renderer.getPixelRatio();
  R.renderer.getDrawingBufferSize(_v2);
  TRAIL_U.uRes.value.copy(_v2);
  TRAIL_U.uWidth.value = 4.2 * pr;
  TRAIL_U.uMk.value = 10 * pr;
  for (const tr of MV.trails) {
    tr.line.visible = show && (MV.layers.future || t >= tr.o.t0);
    if (!tr.line.visible) continue;
    if (tr.byPhase !== !!MV.layers.phasecol) {
      tr.colorize();
      tr.anchor = null;
    } // rebuild with the new colours
    const need =
      tr.frame !== frame ||
      !tr.anchor ||
      vnorm(vsub(f, tr.anchor)) > Math.max(2000, camDist * 2e3) ||
      (TRAIL_U.uWinP.value < 1e11 &&
        !(Math.abs(t - tr.builtT) < TRAIL_PAD * 0.75));
    if (need) tr.build(frame, f, t);
    const B = frameOrigin(frame, t);
    const O = R.O;
    const Rm = frameRot(frame, t);
    if (Rm) {
      const A = tr.anchor;
      const wa = [
        Rm[0] * A[0] + Rm[1] * A[1] + Rm[2] * A[2],
        Rm[3] * A[0] + Rm[4] * A[1] + Rm[5] * A[2],
        Rm[6] * A[0] + Rm[7] * A[1] + Rm[8] * A[2],
      ];
      tr.line.position.set(
        B[0] + wa[0] - O[0],
        B[1] + wa[1] - O[1],
        B[2] + wa[2] - O[2],
      );
      _m4.set(
        Rm[0],
        Rm[1],
        Rm[2],
        0,
        Rm[3],
        Rm[4],
        Rm[5],
        0,
        Rm[6],
        Rm[7],
        Rm[8],
        0,
        0,
        0,
        0,
        1,
      );
      tr.line.quaternion.setFromRotationMatrix(_m4);
    } else {
      tr.line.position.set(
        B[0] + tr.anchor[0] - O[0],
        B[1] + tr.anchor[1] - O[1],
        B[2] + tr.anchor[2] - O[2],
      );
      tr.line.quaternion.identity();
    }
    tr.mat.uniforms.uNow.value = t - MV.md.M.t0;
    tr.mat.uniforms.uFuture.value = MV.layers.future ? 0.42 : 0;
  }
  MV.frame = frame;
}

// ---------------- osculating orbit ----------------
function dominantBody(P, t) {
  const dM = vnorm(vsub(P, helio("moon", t).r));
  if (dM < BODIES.moon.soi) return "moon";
  const dE = vnorm(vsub(P, helio("earth", t).r));
  if (dE < BODIES.earth.soi) return "earth";
  const dMa = vnorm(vsub(P, helio("mars", t).r));
  if (dMa < BODIES.mars.soi) return "mars";
  return "sun";
}
function updateOsc(c, t) {
  if (!MV.osc) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(3 * 721), 3),
    );
    MV.osc = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    MV.osc.frustumCulled = false;
    R.scene.add(MV.osc);
  }
  const L = MV.osc;
  if (!MV.layers.osc || !c || !c.s || !c.P || c.s.surface) {
    L.visible = false;
    return;
  }
  const b = dominantBody(c.P, t);
  const B = helio(b, t);
  const r = vsub(c.P, B.r),
    v = vsub(vadd(helio(c.s.ref, t).v, c.s.v), B.v);
  const mu = BODIES[b].mu;
  const el = rv2coe(r, v, mu);
  const arr = L.geometry.attributes.position.array;
  // anchor at the craft to keep precision near it
  let nmax;
  if (el.e < 0.999) {
    for (let i = 0; i <= 720; i++) {
      const p = coe2rv(el.p, el.e, el.i, el.Om, el.w, (i / 720) * TAU, mu).r;
      arr[3 * i] = p[0] - r[0];
      arr[3 * i + 1] = p[1] - r[1];
      arr[3 * i + 2] = p[2] - r[2];
    }
    nmax = 721;
  } else {
    const nuMax = Math.acos(-1 / el.e) - 0.02;
    for (let i = 0; i <= 720; i++) {
      const nu = -nuMax + (2 * nuMax * i) / 720;
      const p = coe2rv(el.p, el.e, el.i, el.Om, el.w, nu, mu).r;
      const k = vnorm(p) > 5 * (BODIES[b].soi || 1e9) ? 0 : 1;
      arr[3 * i] = (p[0] - r[0]) * k;
      arr[3 * i + 1] = (p[1] - r[1]) * k;
      arr[3 * i + 2] = (p[2] - r[2]) * k;
    }
    nmax = 721;
  }
  L.geometry.attributes.position.needsUpdate = true;
  L.geometry.setDrawRange(0, nmax);
  const O = R.O;
  L.position.set(c.P[0] - O[0], c.P[1] - O[1], c.P[2] - O[2]);
  L.visible = true;
  MV.oscEl = { body: b, el };
}

// ---------------- vectors (velocity, gravity, thrust, drag) ----------------
const VEC_DEF = [
  { id: "vel", name: "velocity", color: "#5fe3a1" },
  { id: "g:earth", name: "g Earth", color: "#5cc8ff" },
  { id: "g:moon", name: "g Moon", color: "#d6d6d6" },
  { id: "g:sun", name: "g Sun", color: "#ffd27a" },
  { id: "g:mars", name: "g Mars", color: "#ff8a5c" },
  { id: "thrust", name: "thrust", color: "#ff9f43" },
  { id: "drag", name: "drag", color: "#ff6767" },
];
function initVectors() {
  MV.vecs = VEC_DEF.map((d) => {
    const a = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      new THREE.Color(d.color),
      0.18,
      0.08,
    );
    a.visible = false;
    a.line.material.depthTest = false;
    a.cone.material.depthTest = false;
    a.renderOrder = 20;
    a.line.renderOrder = 20;
    a.cone.renderOrder = 20;
    R.scene.add(a);
    const lab = h("div", { class: "vlbl", style: `color:${d.color}` });
    $("#vecLabels").append(lab);
    return { ...d, arrow: a, lab };
  });
}
function updateVectors(c, t, tele) {
  const show = MV.layers.vectors && c && c.P && tele;
  for (const v of MV.vecs) {
    v.arrow.visible = false;
    v.lab.style.transform = "translate(-9999px,0)";
  }
  if (!show) return;
  const camD = R.camera.position.distanceTo(c.node.position);
  const base = camD * 0.16;
  const pos = c.node.position;
  const items = [];
  // (not on the pad or the ground: the inertial velocity there is the planet's spin, an arrow lying sideways out of a vehicle that is standing still)
  if (!(c.s && (c.s.pad || c.s.surface)))
    items.push({
      id: "vel",
      dir: tele.vRel,
      mag: vnorm(tele.vRel),
      txt: fSpeed(vnorm(tele.vRel)),
      scale: 1,
    });
  const gmax = Math.max(...tele.grav.map((g) => g.a));
  for (const g of tele.grav) {
    if (!["earth", "moon", "sun", "mars"].includes(g.body)) continue;
    if (g.a < gmax * 1e-3) continue;
    items.push({
      id: "g:" + g.body,
      dir: g.dir,
      mag: g.a,
      txt: fAcc(g.a),
      scale: clamp(
        0.45 + 0.18 * Math.log10((g.a / gmax) * 1000 + 1e-9),
        0.2,
        1,
      ),
    });
  }
  if (tele.thrustAcc > 0)
    items.push({
      id: "thrust",
      dir: tele.thrustDir,
      mag: tele.thrustAcc,
      txt: fAcc(tele.thrustAcc),
      scale: clamp(
        0.5 + 0.2 * Math.log10(tele.thrustAcc / 9.81 + 1e-6),
        0.3,
        1.1,
      ),
    });
  if (tele.dragAcc > 1e-4)
    items.push({
      id: "drag",
      dir: tele.dragDir,
      mag: tele.dragAcc,
      txt: fAcc(tele.dragAcc),
      scale: clamp(
        0.5 + 0.2 * Math.log10(tele.dragAcc / 9.81 + 1e-6),
        0.2,
        1.0,
      ),
    });
  const W = R.width,
    Hh = R.height;
  for (const it of items) {
    const v = MV.vecs.find((x) => x.id === it.id);
    if (!v || !it.dir || vnorm(it.dir) < 1e-12) continue;
    const d = vunit(it.dir);
    const len = base * it.scale;
    v.arrow.position.copy(pos);
    v.arrow.setDirection(new THREE.Vector3(d[0], d[1], d[2]));
    v.arrow.setLength(len, len * 0.16, len * 0.07);
    v.arrow.visible = true;
    const tip = pos
      .clone()
      .add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(len * 1.04))
      .project(R.camera);
    if (tip.z < 1 && tip.z > -1) {
      const x = ((tip.x + 1) / 2) * W,
        y = ((1 - tip.y) / 2) * Hh;
      v.lab.textContent = `${v.name} ${it.txt}`;
      v.lab.style.transform = `translate(${x + 4}px, ${y - 8}px)`;
    }
  }
}

// ---------------- labels ----------------
function initBodyLabels() {
  MV.bodyLabels = BODY_LIST.map((name) => {
    const el = h(
      "div",
      { class: "lbl body", style: `color:${BODY_COLORS[name]}` },
      h("span", { class: "dot" }),
      h("span", null, BODIES[name].name),
    );
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      setTarget("body:" + name);
    });
    $("#labels").append(el);
    return { name, el };
  });
}
// the Sun–Earth L2 point: a label with its dot, out past the Earth on the anti-Sun line, shown in the Sun–Earth frame
// and, on a flight bound there, whenever the camera is far enough out to see the region
const _l2v = new THREE.Vector3();
function updateL2(t, camDist) {
  if (!MV.l2) {
    const el = h(
      "div",
      { class: "lbl body", style: "color:#9ab8ff" },
      h("span", { class: "dot" }),
      h("span", null, "Sun–Earth L2"),
    );
    $("#labels").append(el);
    MV.l2 = { el };
  }
  const md = MV.md,
    el = MV.l2.el;
  const show =
    MV.layers.labels &&
    md &&
    (MV.frame === "serot" || (md.cfg.profile === "l2-halo" && camDist > 2e5));
  if (!show) {
    el.style.transform = "translate(-9999px,0)";
    return;
  }
  const E = helio("earth", t).r,
    L = l2Point(t),
    O = R.O;
  _l2v.set(E[0] + L[0] - O[0], E[1] + L[1] - O[1], E[2] + L[2] - O[2]);
  if (occluded(_l2v)) {
    el.style.transform = "translate(-9999px,0)";
    return;
  }
  placeLabel(el, _l2v, [], 3);
}
const _pv = new THREE.Vector3();

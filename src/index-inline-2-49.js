// index-inline-2 49 — three
// Lines 13957-14274 of readable/index-inline-2.pretty.js (statement-aligned).
function updateShadows(t) {
  for (const c of MV.crafts) {
    const s = c.s;
    const on =
      s && s.surface && !s.pad && s.ref !== "earth" && c.node.visible && c.cur;
    if (!on) {
      if (c.shadow) c.shadow.visible = false;
      continue;
    }
    if (!c.shadow) {
      const g = new THREE.PlaneGeometry(2, 2);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.ShaderMaterial({
        vertexShader: GLSL_SHADOW_V,
        fragmentShader: GLSL_SHADOW_F,
        uniforms: {
          uHalf: { value: 1 },
          uR: { value: 1 },
          uLen: { value: 0 },
          uK: { value: 0 },
          uAO: { value: 0.3 },
          uW: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) },
          uNW: { value: 0 },
          uWR: { value: 0.3 },
        },
        transparent: true,
        depthWrite: false,
      });
      c.shadow = new THREE.Mesh(g, m);
      c.shadow.frustumCulled = false;
      c.shadow.renderOrder = 2;
      R.scene.add(c.shadow);
    }
    const sh = c.shadow,
      U = sh.material.uniforms,
      bb = c.cur.userData.bbox || { w: 3, h: 2, d: 3 };
    const up = vunit(s.r);
    const sunD = vunit(vscale(c.P, -1));
    const el = vdot(sunD, up);
    let hz = vsub(sunD, vscale(up, el));
    if (vnorm(hz) < 1e-6) hz = vperp(up);
    hz = vunit(hz);
    const rFoot = 0.42 * Math.max(bb.w, bb.d),
      hgt = bb.h;
    const len =
      el > 0.02
        ? Math.min(
            (hgt * 0.75) / Math.tan(Math.asin(clamp(el, -1, 1))),
            hgt * 7,
          )
        : 0;
    const half = len + rFoot * 1.3;
    U.uHalf.value = half;
    U.uR.value = rFoot;
    U.uLen.value = len;
    U.uK.value = clamp(el * 4, 0, 1) * 0.74;
    U.uAO.value = 0.5; // sunlit Mars soil is mostly direct light: shadows are dark
    const O = R.O;
    const p = vadd(c.P, vscale(up, (0.03 + half * 0.0006) * 0.001));
    sh.position.set(p[0] - O[0], p[1] - O[1], p[2] - O[2]);
    basisQuat(up, hz, sh.quaternion);
    sh.scale.setScalar(half * 0.001);
    const wl = c.cur.userData.wheels;
    U.uNW.value = 0;
    if (wl && wl.length) {
      // wheel contact points in the shadow plane's own x/z (metres)
      c.node.updateMatrixWorld(true);
      _sx.set(1, 0, 0).applyQuaternion(sh.quaternion);
      _sz.set(0, 0, 1).applyQuaternion(sh.quaternion);
      const n = Math.min(8, wl.length);
      for (let i = 0; i < n; i++) {
        wl[i].getWorldPosition(_sw).sub(sh.position);
        U.uW.value[i].set(_sw.dot(_sx) * 1000, _sw.dot(_sz) * 1000);
      }
      U.uNW.value = n;
      U.uWR.value =
        wl[0].userData.wheel * wl[0].getWorldScale(_sw).x * 1000 * 1.25;
    }
    sh.visible = camDistTo(sh.position) < 3;
  }
}
function updateTracks(t) {
  const T = MV.md && MV.md.trav,
    m = MV.tracks;
  if (!T || !m) return;
  const p = roverPose(MV.md, t);
  m.material.uniforms.uOdo.value = t < T.seg.t0 ? -1 : p.odo;
  m.visible = camDistTo(m.getWorldPosition(_vG)) < 6;
}

// ==== 46_pads.js
// ============================================================================
// Launch pads, each as it stood on its scenario's launch day: the raised pad and its flame trench, the mobile launcher or
// launch mount the vehicle stands on, the towers with their swing arms, lightning protection, propellant spheres, water
// towers and the buildings in view. Built from published dimensions (NASA and KSC fact sheets, the Historic American
// Engineering Record, Moonport (SP-4204), the NSTS News Reference Manual, ULA, SpaceX, CASC and ISRO material, FAA
// documents) and photographs; where nothing is published (an arm's length, the exact place of a sphere) the figure is read
// from photographs.
// Frame: metres, +Y up, +Z north, +X west (as buildPad turns it), y = 0 at the surrounding ground, the vehicle's axis at
// x = z = 0. padModel(md) → { group, stand (the height of the vehicle's lowest nozzle above the ground), deckY (the deck the
// steam boils up from), glow (material lit by the engines), trenchD (how far out the exhaust leaves the flame trench), foot
// (the vehicle's footprint radius), animate(t) (arms swinging away), block (camera directions a tower blocks: padBlock) }.
// ============================================================================
const PV = (e, y, n) => new THREE.Vector3(-e, y, n); // east, up, north → the pad's frame
const _padY = new THREE.Vector3(0, 1, 0);
// The ground and the pad's long slabs are big triangles that the near plane clips under the camera; three.js's interpolated
// log depth is then centimetres out, and the globe (a few centimetres below, its depth exact: app/20_scene.js) shows
// through in patches. These materials take their depth from gl_FragCoord.w as the globe's do.
function padExactDepth(m) {
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <logdepthbuf_fragment>",
      LOGDEPTH_EXACT,
    );
  };
  m.customProgramCacheKey = () => "padExactDepth";
  return m;
}
// the material the engines light up when they fire (updatePad sets its colour): the flame deflector, or the ground under the
// exhaust where there is no trench to look into
const padGlow = () =>
  padExactDepth(new THREE.MeshBasicMaterial({ color: "#141210" }));
function padMats() {
  const pm = (c, k) => padExactDepth(mat(c, k, { name: "pad" })); // the pad's own materials (not shared with the vehicles)
  return (
    padMats.m ||
    (padMats.m = {
      concrete: pm("#aeaba3", "fabric"),
      concreteD: pm("#8f8b83", "fabric"),
      soot: pm("#45403a", "fabric"),
      grass: pm("#6f7c57", "fabric"),
      sand: pm("#c9c0a7", "fabric"),
      rock: pm("#bdb9ae", "fabric"),
      asphalt: pm("#55575a", "fabric"),
      steel: pm("#8d9196", "metal"),
      steelD: pm("#5a5e63", "metal"),
      galv: pm("#a3a8ad", "metal"),
      floor: pm("#6f7378", "dark"),
      red: pm("#a9381f", "paint"),
      redD: pm("#7d2a18", "paint"),
      white: pm("#e4e3dd", "paint"),
      grey: pm("#a8acb0", "paint"),
      greyL: pm("#c8cbce", "paint"),
      greyD: pm("#6c7075", "paint"),
      black: pm("#26282b", "paint"),
      orange: pm("#c9652a", "paint"),
      yellow: pm("#d8b23a", "paint"),
      fibre: pm("#d9d2bd", "paint"),
      glass: pm("#2f3840", "glass"),
      wire: new THREE.LineBasicMaterial({
        color: 0x9aa0a6,
        transparent: true,
        opacity: 0.55,
      }),
    })
  );
}
// Simple solids collected per material and merged into one mesh per material: a tower's hundreds of beams draw in a call.
function padKit() {
  const parts = new Map(),
    k = {};
  const add = (m, g) => {
    if (!parts.has(m)) parts.set(m, []);
    parts.get(m).push(g.index ? g.toNonIndexed() : g);
    return k;
  };
  const q = new THREE.Quaternion(),
    d = new THREE.Vector3();
  k.geo = add;
  k.box = (m, e, y, n, se, sy, sn, rot = 0) => {
    const g = new THREE.BoxGeometry(se, sy, sn);
    if (rot) g.rotateY(rot);
    g.translate(-e, y + sy / 2, n);
    return add(m, g);
  }; // bottom at y
  k.beam = (m, a, b, w, h = w) => {
    d.subVectors(b, a);
    const L = d.length();
    if (L < 1e-4) return k;
    const g = new THREE.BoxGeometry(w, L, h);
    g.applyQuaternion(q.setFromUnitVectors(_padY, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return add(m, g);
  };
  k.rod = (m, a, b, r, seg = 8) => {
    d.subVectors(b, a);
    const L = d.length();
    if (L < 1e-4) return k;
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
    g.applyQuaternion(q.setFromUnitVectors(_padY, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return add(m, g);
  };
  k.cyl = (m, e, y, n, r0, r1, h, seg = 24, open = false) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, open);
    g.translate(-e, y + h / 2, n);
    return add(m, g);
  };
  k.sphere = (m, e, y, n, r, seg = 24) => {
    const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6));
    g.translate(-e, y, n);
    return add(m, g);
  };
  const n0 = new THREE.Vector3(),
    n1 = new THREE.Vector3();
  k.quads = (m, quads, toward = null) => {
    // [[a, b, c, d] …] corners in order round the face, flat shaded; facing toward (a
    // direction, default up) whichever way the corners run
    const P = [];
    for (const [a, b, c, e] of quads) {
      n0.subVectors(b, a).cross(n1.subVectors(c, a));
      const t = toward || _padY;
      if (n0.dot(t) < 0) P.push(a, c, b, a, e, c);
      else P.push(a, b, c, a, c, e);
    }
    const g = new THREE.BufferGeometry().setFromPoints(P);
    g.computeVertexNormals();
    return add(m, g);
  };
  k.build = (grp = new THREE.Group()) => {
    for (const [m, gs] of parts) {
      let n = 0;
      for (const g of gs) n += g.attributes.position.count;
      const P = new Float32Array(n * 3),
        N = new Float32Array(n * 3);
      let o = 0;
      for (const g of gs) {
        P.set(g.attributes.position.array, o * 3);
        N.set(g.attributes.normal.array, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(P, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      grp.add(new THREE.Mesh(out, m));
    }
    parts.clear();
    return grp;
  };
  return k;
}
// a square lattice tower (side w, from y0, h tall, a ring of beams every step, the faces X-braced), with solid floors
// every floorStep and a core (elevators, stairs) of side core
function padLattice(k, m, e, n, w, y0, h, o = {}) {
  const M = padMats(),
    hw = w / 2,
    col = o.col || 0.75,
    bw = o.beam || 0.45,
    step = o.step || 6.1;
  const C = [
      [-hw, -hw],
      [hw, -hw],
      [hw, hw],
      [-hw, hw],
    ],
    lv = Math.max(1, Math.round(h / step));
  for (const [a, b] of C)
    k.beam(m, PV(e + a, y0, n + b), PV(e + a, y0 + h, n + b), col);
  for (let i = 0; i <= lv; i++) {
    const y = y0 + (h * i) / lv,
      y2 = y0 + (h * (i + 1)) / lv;
    for (let c = 0; c < 4; c++) {
      const [a1, b1] = C[c],
        [a2, b2] = C[(c + 1) % 4];
      k.beam(m, PV(e + a1, y, n + b1), PV(e + a2, y, n + b2), bw);
      if (i < lv) {
        k.beam(m, PV(e + a1, y, n + b1), PV(e + a2, y2, n + b2), bw * 0.6);
        k.beam(m, PV(e + a2, y, n + b2), PV(e + a1, y2, n + b1), bw * 0.6);
      }
    }
    if (o.floors !== false && i > 0 && i < lv && i % (o.floorEvery || 1) === 0)
      k.box(M.floor, e, y - 0.3, n, w - 0.6, 0.3, w - 0.6);
  }
  if (o.core)
    k.box(
      o.coreMat || M.greyD,
      e + (o.coreE || 0),
      y0,
      n + (o.coreN || 0),
      o.core,
      h,
      o.core,
    );
}
// a box-shaped steel frame (the Shuttle's rotating service structure): centred at (e, n), from y0, a across × b along × h
// high, its long axis on bearing br (radians); columns at every bay, a beam round it at every level, each bay X-braced
function padTrussBox(k, m, e, n, y0, a, b, h, br, o = {}) {
  const ca = Math.cos(br),
    sa = Math.sin(br),
    bay = o.bay || 6.5,
    bw = o.beam || 0.5;
  const P = (u, v, y) => PV(e + u * ca + v * sa, y0 + y, n - u * sa + v * ca); // u across, v along
  const lv = Math.max(1, Math.round(h / (o.step || 6.6))),
    nb = Math.max(1, Math.round(b / bay)),
    na = Math.max(1, Math.round(a / bay));
  const ring = []; // the perimeter's column positions, in order round the box
  for (let i = 0; i < nb; i++) ring.push([-a / 2, -b / 2 + (b * i) / nb]);
  for (let i = 0; i < na; i++) ring.push([-a / 2 + (a * i) / na, b / 2]);
  for (let i = 0; i < nb; i++) ring.push([a / 2, b / 2 - (b * i) / nb]);
  for (let i = 0; i < na; i++) ring.push([a / 2 - (a * i) / na, -b / 2]);
  for (const [u, v] of ring) k.beam(m, P(u, v, 0), P(u, v, h), bw * 1.4);
  for (let l = 0; l <= lv; l++) {
    const y = (h * l) / lv,
      y2 = (h * (l + 1)) / lv;
    for (let i = 0; i < ring.length; i++) {
      const [u1, v1] = ring[i],
        [u2, v2] = ring[(i + 1) % ring.length];
      k.beam(m, P(u1, v1, y), P(u2, v2, y), bw);
      if (l < lv) {
        k.beam(m, P(u1, v1, y), P(u2, v2, y2), bw * 0.6);
        k.beam(m, P(u2, v2, y), P(u1, v1, y2), bw * 0.6);
      }
    }
  }
}
// a swing arm: a truss box from its hinge on a tower face reaching len toward the vehicle; returned as its own group so it
// can swing away (rotation about the hinge's vertical axis)

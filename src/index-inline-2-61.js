// index-inline-2 61 — three
// Lines 17257-17606 of readable/index-inline-2.pretty.js (statement-aligned).
const GLSL_SHADOW_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uHalf; varying vec2 vXZ;
void main(){ vXZ = position.xz * uHalf; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_SHADOW_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uR; uniform float uLen; uniform float uK; uniform float uAO; uniform vec2 uW[8]; uniform int uNW; uniform float uWR; varying vec2 vXZ;
void main(){
  #include <logdepthbuf_fragment>
  float zc = clamp(vXZ.y, -uLen, 0.0); float d = length(vec2(vXZ.x, vXZ.y - zc));
  float sun = (1.0 - smoothstep(uR * 0.5, uR * 1.2, d)) * uK * (1.0 - 0.45 * clamp(-zc / max(uLen, 1e-3), 0.0, 1.0));
  float ao = (1.0 - smoothstep(uR * 0.3, uR * 1.25, length(vXZ))) * uAO;
  float wc = 0.0; // dark contact patch where each wheel presses into the soil
  for (int i = 0; i < 8; i++) { if (i >= uNW) break; wc = max(wc, 1.0 - smoothstep(uWR * 0.35, uWR * 1.7, length(vXZ - uW[i]))); }
  float a = max(max(sun, ao), wc * 0.55); if (a < 0.01) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;
const _sx = new THREE.Vector3(),
  _sz = new THREE.Vector3(),
  _sw = new THREE.Vector3();
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
// Weathering, in the shader from the pad's own coordinates (the kit's merged meshes carry no texture coordinates): blotches
// and grain over concrete, with the joints between its slabs; a softer mottle over paint and steel (rust streaks under
// the rain, dust). w: how strong, 0 … 1; seams: the slab joints.
const GLSL_PAD_WEATHER = `
float padHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float padNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(padHash(i), padHash(i + vec3(1, 0, 0)), f.x), mix(padHash(i + vec3(0, 1, 0)), padHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(padHash(i + vec3(0, 0, 1)), padHash(i + vec3(1, 0, 1)), f.x), mix(padHash(i + vec3(0, 1, 1)), padHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;
function padWeather(m, w, seams) {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (s) => {
    base(s);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPadP;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPadP = position;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vPadP;" + GLSL_PAD_WEATHER,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
  { float b = 0.55 * padNoise(vPadP * 0.23) + 0.3 * padNoise(vPadP * 1.3) + 0.15 * padNoise(vPadP * 7.0);
    float streak = padNoise(vec3(vPadP.x * 3.0, vPadP.y * 0.08, vPadP.z * 3.0)); // the rain's streaks down the faces
    diffuseColor.rgb *= 1.0 + ${w.toFixed(2)} * (0.5 * (b - 0.5) + 0.25 * (streak - 0.5));
    ${seams ? "vec3 q = abs(fract(vPadP / 6.1) - 0.5); float j = smoothstep(0.478, 0.492, max(max(q.x, q.y), q.z)); diffuseColor.rgb *= 1.0 - 0.18 * j;" : ""} }`,
      );
  };
  m.customProgramCacheKey = () =>
    "padExactDepth|weather" + w + (seams ? "s" : "");
  return m;
}
// the material the engines light up when they fire (updatePad sets its colour): the flame deflector, or the ground under the
// exhaust where there is no trench to look into
const padGlow = () =>
  padExactDepth(new THREE.MeshBasicMaterial({ color: "#141210" }));
function padMats() {
  const pm = (c, k, w = 0, seams = false) => {
    const m = padExactDepth(mat(c, k, { name: "pad" }));
    return w ? padWeather(m, w, seams) : m;
  }; // the pad's own materials (not shared with the vehicles)
  return (
    padMats.m ||
    (padMats.m = {
      concrete: pm("#aeaba3", "fabric", 1, true),
      concreteD: pm("#8f8b83", "fabric", 1, true),
      soot: pm("#45403a", "fabric", 0.8),
      grass: pm("#6f7c57", "fabric", 0.6),
      sand: pm("#c9c0a7", "fabric", 0.7),
      rock: pm("#bdb9ae", "fabric", 0.8),
      asphalt: pm("#55575a", "fabric", 0.6),
      steel: pm("#8d9196", "metal", 0.5),
      steelD: pm("#5a5e63", "metal", 0.5),
      galv: pm("#a3a8ad", "metal", 0.5),
      floor: pm("#6f7378", "dark", 0.5),
      red: pm("#a9381f", "paint", 0.5),
      redD: pm("#7d2a18", "paint", 0.5),
      white: pm("#e4e3dd", "paint", 0.35),
      grey: pm("#a8acb0", "paint", 0.45),
      greyL: pm("#c8cbce", "paint", 0.45, true),
      greyD: pm("#6c7075", "paint", 0.45),
      black: pm("#26282b", "paint", 0.3),
      orange: pm("#c9652a", "paint", 0.45),
      yellow: pm("#d8b23a", "paint", 0.4),
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

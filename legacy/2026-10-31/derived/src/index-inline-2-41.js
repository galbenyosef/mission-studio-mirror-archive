// index-inline-2 41 — math
// Lines 11507-11855 of readable/index-inline-2.pretty.js (statement-aligned).
const PAD_TOP = 0.8; // m: the deck top stands this far above the ground (never coplanar with it, so the two cannot z-fight)
// the height of the vehicle's lowest nozzle above the ground on its pad (the pad's own figure, or the generic pad's)
function padStandH() {
  return MV.pad && MV.pad.userData.stand != null
    ? MV.pad.userData.stand
    : PAD_TOP + MOUNT_H;
}
const MOUNT_H = 6; // m: the vehicle stands on hold-down posts this high above the deck; the exhaust goes down through an opening
// liquid engines lighting on the pad before liftoff: share of liftoff thrust built up so far (null outside the hold-down period)
function padIgnition(md, t) {
  const L = md.L,
    IG = L.ign;
  if (!IG || !(IG.t > 0) || t >= md.M.t0) return null;
  const dt = t - (md.M.t0 - IG.t);
  if (dt < 0) return null;
  const nG = IG.stagger ? 3 : 1;
  let f = 0;
  for (let k = 0; k < nG; k++)
    f +=
      smoothstep(
        clamp((dt - k * (IG.stagger || 0)) / Math.max(IG.ramp, 0.1), 0, 1),
      ) / nG;
  const liq = liftoffStages(L).filter((s) => s.prop !== "solid");
  return {
    f,
    full: f > 0.985,
    thrust: liq.reduce((a, s) => a + s.thrustSL, 0) * f,
    core: (liq.find((s) => !s.parallel) || liq[0] || {}).id,
    liq,
    dt,
  };
}
const GLSL_CLOUD_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute float aA; attribute float aG; varying float vA; varying float vG; uniform float uPx;
void main(){ vA = aA; vG = aG; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uPx / max(-mv.z, 1e-9), 1.0, 1000.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_CLOUD_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCol; uniform vec3 uGlow; varying float vA; varying float vG;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; float a = (1.0 - smoothstep(0.2, 1.0, d)) * vA; if (a < 0.01) discard;
  vec3 c = mix(uCol * (0.8 + 0.25 * (0.5 - q.y)), uGlow, vG);
  gl_FragColor = vec4(c, a);
}`;
const CLOUD_N = 420;
const hash01 = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function buildPad(md) {
  const L = md.L,
    P = padModel(md);
  let g = new THREE.Group(),
    holeMat,
    foot,
    stand = PAD_TOP + MOUNT_H,
    deckY = PAD_TOP,
    trenchD = 70;
  if (P) {
    g = P.group;
    holeMat = P.glow;
    foot = P.foot;
    stand = P.stand;
    deckY = P.deckY;
    trenchD = P.trenchD || trenchD;
  } // the real pad (app/46_pads.js)
  else {
    // a generic pad
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    foot = Math.max(
      L.diameter / 2,
      bst && bst.booster ? bst.booster.offset + bst.geom[0][1] : 0,
    ); // footprint radius, m
    const hTower = Math.max(60, L.height * 0.95 + MOUNT_H);
    const tower = box(10, hTower, 10, mat("#8a2f22", "metal"));
    tower.position.set(foot + 15, 0, 0);
    g.add(tower);
    const deck = cyl(90, 90, 6 + PAD_TOP, mat("#a7a39a", "dark"), 8);
    deck.position.y = -6;
    g.add(deck);
    // flame trench across the deck, the exhaust opening under the engines (it glows while they fire) and the hold-down posts
    const trench = box(16, 0.15, 180, mat("#34312c", "dark"));
    trench.position.set(0, PAD_TOP, 0);
    g.add(trench);
    holeMat = new THREE.MeshBasicMaterial({ color: "#141210" });
    const hole = box(foot * 2 + 4, 0.2, foot * 2 + 4, holeMat);
    hole.position.y = PAD_TOP + 0.05;
    g.add(hole);
    const postMat = mat("#6d6a64", "metal"),
      rP = foot + 1.8;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const p = box(2.4, MOUNT_H, 2.4, postMat);
      p.position.set(Math.cos(a) * rP, PAD_TOP, Math.sin(a) * rP);
      g.add(p);
    }
  }
  // exhaust and steam billowing out of the flame trench (fixed to the pad, so it stays put as Earth turns)
  const cg = new THREE.BufferGeometry();
  cg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3 * CLOUD_N), 3),
  );
  cg.setAttribute(
    "aSize",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  cg.setAttribute(
    "aA",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  cg.setAttribute(
    "aG",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  const cm = new THREE.ShaderMaterial({
    vertexShader: GLSL_CLOUD_V,
    fragmentShader: GLSL_CLOUD_F,
    uniforms: {
      uPx: { value: 800 },
      uCol: { value: new THREE.Color("#e8e4dc") },
      uGlow: { value: new THREE.Color("#ffb15c") },
    },
    transparent: true,
    depthWrite: false,
  });
  const cloud = new THREE.Points(cg, cm);
  cloud.frustumCulled = false;
  cloud.renderOrder = 4;
  g.add(cloud);
  g.scale.setScalar(0.001);
  g.userData = {
    site: LAUNCH_SITES[md.cfg.site],
    hole: holeMat,
    cloud,
    foot,
    stand,
    deckY,
    trenchD,
    animate: P && P.animate,
    block: P && P.block,
  };
  R.scene.add(g);
  MV.pad = g;
}
function updatePad(t) {
  const g = MV.pad;
  if (!g) return;
  const S = g.userData.site;
  const O = R.O;
  const md = MV.md;
  const r = sitePosEcl("earth", S.lat, S.lon, 0, t);
  const E = helio("earth", t).r;
  g.position.set(E[0] + r[0] - O[0], E[1] + r[1] - O[1], E[2] + r[2] - O[2]);
  basisQuat(vunit(r), localFrame("earth", r, t).north, g.quaternion);
  g.visible = t < md.M.t0 + 3600 && camDistTo(g.position) < 400;
  if (!g.visible) return;
  if (g.userData.animate) g.userData.animate(t); // arms swinging away
  const t0 = md.M.t0,
    IG = md.L.ign || { t: 0 },
    tIgn = t0 - (IG.t || 0);
  const ship = craftById("ship");
  const altM = (te) => {
    if (te < t0) return 0;
    const s = ship && ship.o.stateAt(te);
    return s ? (vnorm(s.r) - BODIES.earth.R) * 1000 : 1e9;
  };
  // how hard the exhaust hits the pad at time te: engine build-up before liftoff, fading as the vehicle climbs away — once it
  // is about one and a half flame lengths up. Bigger engines (more propellant per second) throw out more fire and smoke.
  const sC = blastScale(md.L),
    fadeAlt = Math.max(110, 1.5 * PLUME.k * Math.sqrt(liftoffFlow(md.L)));
  const blast = (te) => {
    if (te < tIgn) return 0;
    if (te < t0) {
      const ig = padIgnition(md, te);
      return ig ? ig.f : 0;
    }
    return clamp(1 - altM(te) / fadeAlt, 0, 1);
  };
  const bNow = blast(t);
  g.userData.hole.color.setRGB(
    0.08 + 0.92 * bNow,
    0.07 + 0.55 * bNow,
    0.06 + 0.2 * bNow,
  );
  // sunlight on the cloud (night launches get a dim cloud lit orange by the flames)
  const sunUp = vdot(vunit(vscale(E, -1)), vunit(r));
  const day = clamp(0.2 + sunUp * 3, 0.12, 1);
  const cl = g.userData.cloud,
    A = cl.geometry.attributes,
    pos = A.position.array,
    size = A.aSize.array,
    al = A.aA.array,
    gl = A.aG.array;
  cl.material.uniforms.uCol.value.setRGB(0.91 * day, 0.89 * day, 0.86 * day);
  cl.material.uniforms.uPx.value =
    R.height / (2 * Math.tan((R.camera.fov * DEG) / 2));
  const span = (IG.t || 0) + 24,
    foot = g.userData.foot;
  let live = 0;
  for (let i = 0; i < CLOUD_N; i++) {
    const r1 = hash01(3 * i + 1),
      r2 = hash01(3 * i + 2),
      r3 = hash01(3 * i + 3);
    const te = tIgn + (i / CLOUD_N) * span + r1 * 0.15,
      a = t - te;
    const k = a >= 0 ? blast(te) : 0;
    if (k < 0.03 || a > 200) {
      al[i] = 0;
      continue;
    }
    let x, y, z, sz;
    const kind = i % 5;
    if (kind < 4) {
      // fire, then smoke and steam, blasting out of both ends of the flame trench
      const side = kind % 2 ? 1 : -1,
        v0 = (45 + 40 * r2) * (0.35 + 0.65 * k) * (0.55 + 0.45 * sC),
        tau = 3.0;
      const d =
        g.userData.trenchD + v0 * tau * (1 - Math.exp(-a / tau)) + 1.5 * a;
      x = (r3 - 0.5) * (12 + 10 * a);
      z = side * d;
      y = 7 + (1.8 + 3 * r1) * a + 0.1 * a * a;
      sz = (20 + 9 * a + 14 * r2) * (0.45 + 0.55 * sC);
      gl[i] = clamp(k * (1 - a / (1.2 + 0.8 * sC)), 0, 1) * 0.9;
    } else {
      // steam from the water deluge, boiling up around the launch mount
      const ang = r2 * TAU,
        rr = foot + 6 + 8 * r3 + 3 * a;
      x = Math.cos(ang) * rr;
      z = Math.sin(ang) * rr;
      y = g.userData.deckY + 2 + (4 + 4 * r1) * a;
      sz = (10 + 6 * a) * (0.5 + 0.5 * sC);
      gl[i] = clamp(k * (1 - a / 1.2), 0, 1) * 0.5;
    }
    pos[3 * i] = x;
    pos[3 * i + 1] = y;
    pos[3 * i + 2] = z;
    size[i] = sz * 0.001;
    al[i] = k * 0.8 * clamp(a / 0.4, 0, 1) * Math.exp(-a / 60);
    live++;
  }
  A.position.needsUpdate = true;
  A.aSize.needsUpdate = true;
  A.aA.needsUpdate = true;
  A.aG.needsUpdate = true;
  cl.visible = live > 0;
}
function camDistTo(v) {
  return R.camera.position.distanceTo(v);
}
// local high-resolution patch of a planet's surface around a site; an elevation offset (e.g. a crater floor
// below the Martian datum) blends smoothly back to the mean radius at the patch edge
const capW = (f) => 1 - smoothstep((f - 0.5) / 0.42);
function capGeometry(lat, lon, ang, seg, Rb, elev = 0) {
  const dl = ang / Math.max(Math.cos(lat * DEG), 0.2);
  const g = new THREE.SphereGeometry(
    1,
    seg,
    seg,
    (lon - dl + 180) * DEG,
    2 * dl * DEG,
    (90 - lat - ang) * DEG,
    2 * ang * DEG,
  );
  const pos = g.attributes.position,
    uv = g.attributes.uv;
  const loc = new Float32Array(pos.count * 2),
    capA = new Float32Array(pos.count).fill(1);
  const cl = Math.cos(lat * DEG),
    sl = Math.sin(lat * DEG),
    co = Math.cos(lon * DEG),
    so = Math.sin(lon * DEG);
  const C = [cl * co, sl, -cl * so],
    E = [-so, 0, -co],
    N = [-sl * co, cl, sl * so];
  const p0 = (lon - dl + 180) * DEG,
    pL = 2 * dl * DEG,
    t0 = (90 - lat - ang) * DEG,
    tL = 2 * ang * DEG;
  for (let i = 0; i < pos.count; i++) {
    // the point on the unit sphere worked out again in double precision (as SphereGeometry places it): its own 32-bit
    // copy is up to 3e-8 out — 20 cm on Earth, enough to lift the ground through a launch pad's
    const ph = p0 + ((i % (seg + 1)) / seg) * pL,
      th0 = t0 + (Math.floor(i / (seg + 1)) / seg) * tL;
    const x = -Math.cos(ph) * Math.sin(th0),
      y = Math.cos(th0),
      z = Math.sin(ph) * Math.sin(th0);
    let phi = Math.atan2(z, -x);
    if (phi < 0) phi += TAU;
    uv.setXY(i, phi / TAU, 1 - Math.acos(clamp(y, -1, 1)) / Math.PI);
    loc[2 * i] = Rb * (x * E[0] + y * E[1] + z * E[2]);
    loc[2 * i + 1] = Rb * (x * N[0] + y * N[1] + z * N[2]);
    const th = Math.acos(clamp(x * C[0] + y * C[1] + z * C[2], -1, 1)) * RAD;
    const k = 1 + (elev / Rb) * capW(th / ang);
    // vertices are stored relative to the site, and the mesh sits at the site: the large planet-radius offsets then
    // cancel on the CPU in double precision, so the ground near the pad does not jitter (and flicker) in 32-bit floats
    pos.setXYZ(i, x * k - C[0], y * k - C[1], z * k - C[2]);
  }
  g.setAttribute("aLocal", new THREE.BufferAttribute(loc, 2));
  g.setAttribute("aCap", new THREE.BufferAttribute(capA, 1));
  if (elev) g.computeVertexNormals();
  g.userData.center = C;
  g.userData.grid = {
    phiStart: (lon - dl + 180) * DEG,
    phiLength: 2 * dl * DEG,
    thetaStart: (90 - lat - ang) * DEG,
    thetaLength: 2 * ang * DEG,
    seg,
  };
  return g;
}
function addCap(body, lat, lon, ang, elev = 0) {
  const b = R.bodies[body];
  if (!b) return;
  if (
    MV.capInfo.some(
      (c) =>
        c.body === body &&
        Math.abs(c.lat - lat) < 0.5 &&
        Math.abs(c.lon - lon) < 0.5,
    )
  )
    return;
  const g = capGeometry(lat, lon, ang, 128, b.R, elev);
  const mesh = new THREE.Mesh(g, b.mat);
  mesh.renderOrder = 1;
  const C = g.userData.center;
  mesh.position.set(C[0], C[1], C[2]);
  b.mesh.add(mesh);
  MV.caps.push(mesh);
  const n = MV.capInfo.filter((c) => c.body === body).length;
  if (n < 4) {
    const cl = Math.cos(lat * DEG);
    b.mat.uniforms.uCapDir.value[n].set(
      cl * Math.cos(lon * DEG),
      Math.sin(lat * DEG),
      -cl * Math.sin(lon * DEG),
    );
    b.mat.uniforms.uCapCos.value[n] = Math.cos(ang * 0.985 * DEG);
  }
  MV.capInfo.push({ body, lat, lon, ang, elev, mesh });
}
// ground radius under a direction (km), honouring cap elevations

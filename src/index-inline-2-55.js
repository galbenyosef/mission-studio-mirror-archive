// index-inline-2 55 — math
// Lines 15498-15837 of readable/index-inline-2.pretty.js (statement-aligned).
function padWenchang(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 9.0,
    stand = deck + 1.0 - LAUNCHERS.lm5.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 80, 0.3, 80);
  k.box(M.soot, 0, 0.3, 0, 10, 0.05, 70);
  k.box(M.greyL, 0, 1.5, 0, 26, deck - 1.5, 22);
  for (const e of [-10, 10]) k.box(M.greyD, e, 0, 0, 4, 1.5, 20); // the platform on its bogies
  for (const e of [-10, 10]) {
    k.box(M.steelD, e, 0, -900, 0.5, 0.3, 1800);
  }
  // the fixed service tower, west of the rocket, its platforms swung open
  const fe = -17;
  padLattice(k, M.greyL, fe, 0, 10, 0, 91.7, {
    step: 7.6,
    core: 5,
    coreMat: M.white,
    floorEvery: 1,
  });
  for (const y of [28, 46, 64])
    for (const s of [-1, 1]) {
      const geo = new THREE.BoxGeometry(8, 2.2, 3);
      geo.translate(4, 1.1, 0);
      geo.rotateY(s * 1.2);
      geo.translate(-(fe + 5), y, s * 5);
      k.geo(M.white, geo);
    }
  k.box(M.white, fe, 91.7, 0, 10.5, 2.5, 10.5);
  const T = [
    [-70, 70],
    [70, 70],
    [70, -70],
    [-70, -70],
  ].map(([e, n]) => padLightningTower(k, e, n, 92, 28, 3.0));
  k.box(M.white, -1400, 0, 2400, 60, 99.4, 45); // the assembly building, 2.8 km up the rails
  k.build(g);
  padGround(g, { sea: 135, shore: 600, r: 3000 });
  for (let i = 0; i < 4; i++) padWire(g, T[i], T[(i + 1) % 4], 12);
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 7,
    trenchD: 40,
    block: [
      padBlock(fe, 0, 5, 5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.5, 5)),
    ],
  };
}
// ---------------- Starship at Starbase, Texas ----------------
// The orbital launch mount: a ring-shaped table on six legs, its top 20 m up, with twenty clamps for the booster; the water-
// cooled steel plate under it; the launch and catch tower 28 m west (143 m, its chopsticks and the ship's quick-disconnect
// arm toward the mount); the tank farm's white tanks to the west; the beach 700 m east.
function padStarbase(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    top = 20,
    stand = top - LAUNCHERS.starship.stages[0].eng.len;
  k.box(M.concrete, 0, 0, 0, 120, 0.3, 120);
  k.box(M.steelD, 0, 0.3, 0, 22, 0.8, 22); // the pad and the steel plate
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + Math.PI / 6;
    k.cyl(
      M.greyD,
      Math.cos(a) * 9.5,
      0,
      Math.sin(a) * 9.5,
      1.3,
      1.3,
      top - 2.5,
      16,
    );
  }
  {
    const ring = new THREE.RingGeometry(5.6, 10.5, 36, 1);
    ring.rotateX(-Math.PI / 2);
    const tbl = new THREE.CylinderGeometry(10.5, 10.5, 2.5, 36, 1, true);
    tbl.translate(0, top - 1.25, 0);
    k.geo(M.greyD, tbl);
    const inn = new THREE.CylinderGeometry(5.6, 5.6, 2.5, 36, 1, true);
    inn.translate(0, top - 1.25, 0);
    k.geo(M.greyD, inn);
    ring.translate(0, top, 0);
    k.geo(M.greyD, ring);
    const ring2 = ring.clone();
    ring2.rotateX(Math.PI);
    ring2.translate(0, 2 * top - 2.5, 0);
    k.geo(M.greyD, ring2);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i * TAU) / 20;
    k.box(
      M.steelD,
      Math.cos(a) * 5.0,
      top,
      Math.sin(a) * 5.0,
      0.8,
      1.4,
      1.2,
      -a,
    );
  }
  padStarshipTower(k, -28, -3, 0);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.CylinderGeometry(3.2, 3.2, 26, 20);
      geo.rotateX(Math.PI / 2);
      geo.translate(-(-150 - i * 9), 3.6, -60 + r * 34);
      k.geo(M.white, geo);
    } // horizontal tanks
  k.build(g);
  padGround(g, {
    sea: 90,
    shore: 700,
    roads: [[-400, -80, 400, -80, 12]],
    roadMat: M.asphalt,
  });
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.CircleGeometry(10, 32), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 1.2;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: top,
    foot: 11,
    trenchD: 25,
    block: [padBlock(-28, -3, 6, 9)],
  };
}
// which pad a mission stands on
function padModel(md) {
  const site = md.cfg.site,
    lv = md.cfg.launcher;
  if ((site === "KSC39A" || site === "KSC39B") && lv === "saturnV")
    return padApollo(md);
  if ((site === "KSC39A" || site === "KSC39B") && lv === "shuttle")
    return padShuttle(md);
  if (site === "KSC39B" && lv === "sls1") return padSLS(md);
  if (site === "KSC39A" && lv === "falconHeavy") return padFH(md);
  if (site === "CCSFS41") return padSLC41(md);
  if (site === "CCSFS12") return padLC12(md);
  if (site === "WENCHANG") return padWenchang(md);
  if (site === "STARBASE") return padStarbase(md);
  return null;
}

// ==== 47_exhaust.js
// ============================================================================
// Exhaust in the air after liftoff: the trail a launch leaves through the atmosphere. Solid boosters lay a dense white
// column of aluminium-oxide smoke, kerosene engines a thinner grey one, hydrogen and methane engines little but a contrail
// where their water freezes in the cold upper troposphere. The trail spreads, fades over half an hour and drifts on the
// winds: kinked by the shear around the jet stream and, higher up, twisted into corkscrews by the tides and gravity waves of
// the upper atmosphere. Above 60 km the exhaust no longer mixes into the air: it expands into a vast thin cloud that freezes
// into ice.
// Sunlight reaches each part of it through the air between it and the Sun: reddened through the long path at dawn and dusk,
// cut off in Earth's shadow. After sunset the high exhaust is still in sunlight while the ground is dark, and glows against
// the night sky as a spreading, luminous cloud (the "twilight phenomenon"). Near the vehicle the flame lights the smoke.
// The trail is a ribbon along the path the engines took (where they were at each moment, carried round by the turning Earth
// and the wind since), turned to face the camera and shaded as a round column of smoke: thick through the middle, thin at the
// edges, billowing. Where a ribbon would show its edge (high up, where the trail spreads wider than it is long, and seen
// end-on or from close by) round puffs facing the camera carry the smoke instead.
// ============================================================================
const EXH = { n: 0, mesh: null, puffs: null, tex: null, off: false };
// what each propellant leaves in the air: optical thickness per kg burnt per metre of path (relative), extra for water
// freezing out where the air is cold, how long the trail lasts (s), its colour
const EXH_PROP = {
  solid: { k: 1.0, ice: 0.02, life: 1500, col: [0.93, 0.92, 0.9] }, // aluminium oxide smoke: the dense column of solid boosters
  kerolox: { k: 0.3, ice: 0.03, life: 700, col: [0.8, 0.78, 0.75] }, // soot and steam
  hydrolox: { k: 0.05, ice: 0.05, life: 420, col: [0.96, 0.97, 0.98] }, // water only: a contrail where it freezes
  methalox: { k: 0.08, ice: 0.05, life: 480, col: [0.95, 0.95, 0.96] },
  hypergolic: { k: 0.28, ice: 0.03, life: 600, col: [0.88, 0.78, 0.64] }, // nitrogen dioxide tints it orange-brown
};
EXH_PROP.udmh = EXH_PROP.hypergolic;
EXH_PROP.mmh = EXH_PROP.hypergolic;
const EXH_C = 100; // optical depth per (kg of exhaust per m² of trail), scaled by the propellant's k
const EXH_H = 8.5; // km: scale height of the air for the light's path
const EXH_EXT = [0.042, 0.085, 0.17]; // vertical optical depth of the air down to sea level, red, green, blue (scattering and haze)
// The exhaust's spread at emission (m) for a vehicle w across at the base: the plume widens as the air thins (an under-
// expanded jet), up to 20 km
const exhW0 = (w, h) =>
  Math.min(w * Math.pow(Math.exp(Math.max(h, 0) / 7.2), 0.4), 20000);
// how fast the exhaust expands into the near-vacuum above 60 km (m/s)
const exhVx = (h) => 600 * Math.pow(smoothstep((h - 60) / 90), 1.3);
// water freezing out of the exhaust: in the cold upper troposphere, and into the ice clouds of the mesosphere and above
const exhIce = (h) =>
  3 * Math.exp(-Math.pow((h - 11) / 3.5, 2)) + 40 * smoothstep((h - 62) / 40);
// A wind profile for the launch (m/s toward east and north at height h, km), drawn from the date and site: a surface wind
// veering into the westerlies, the jet stream near 11 km, stratospheric winds turning with height, and gravity waves whose
// winds grow as the air thins and turn with height.
function exhWind(seed) {
  const rnd = mulberry32(seed);
  const jetDir = (rnd() * 2 - 1) * 0.7,
    jet = 15 + 25 * rnd(),
    jetH = 10 + 3 * rnd(),
    sfc = 3 + 6 * rnd(),
    sfcDir = rnd() * TAU,
    str = 5 + 15 * rnd(),
    strDir = rnd() * TAU;
  const waves = [3.6, 5.9, 9.4, 14.5, 22].map((l) => ({
    lam: l * (0.8 + 0.4 * rnd()),
    ph: rnd() * TAU,
    a: (0.5 + 0.5 * rnd()) * Math.sqrt(l / 9),
    s: rnd() < 0.5 ? 1 : -1,
  })); // vertical wavelengths (km): the short ones weaker
  return (h) => {
    const fs = Math.exp(-h / 1.5),
      fj =
        Math.exp(-Math.pow((h - jetH) / 4.5, 2)) +
        0.2 * smoothstep(h / 6) * (1 - smoothstep((h - 20) / 10)),
      fu = smoothstep((h - 18) / 12);
    let e =
      sfc * fs * Math.cos(sfcDir) +
      jet * fj * Math.cos(jetDir) +
      str * fu * Math.cos(strDir + h / 25);
    let n =
      sfc * fs * Math.sin(sfcDir) +
      jet * fj * Math.sin(jetDir) +
      str * fu * Math.sin(strDir + h / 25);
    const A = (2.5 + 55 * smoothstep((h - 50) / 40)) * 0.45; // m/s per wave
    for (const w of waves) {
      const ph = (w.s * TAU * h) / w.lam + w.ph;
      e += A * w.a * Math.cos(ph);
      n += A * w.a * Math.sin(ph);
    }
    return [e, n];
  };
}
// the engines firing at te: [[propellant, kg/s] …], from the launch configuration (the core stage's throttle, the boosters'
// thrust curve) or the upper stage's thrust
function exhFlows(c, L, te, t0) {
  const s = c.o.stateAt(te);
  if (!s || !(s.T > 0)) return { s, flows: [] };
  const cf = cfgAt(c, te),
    out = [];
  if (cf && cf.key === "launch") {
    const st = L.stages.find((x) => x.id === (s.extra && s.extra.stage));
    if (st) out.push([st.prop, stageFlow(st) * (s.extra.throttle ?? 1)]);
    const b = L.stages[0].parallel ? L.stages[0] : null;
    if (b && cf.boosters) {
      const f = b.curve ? Math.max(curveAt(b.curve, te - t0), 0) : 1;
      if (f > 0.02) out.push([b.prop, stageFlow(b) * f]);
    }
  } else if (cf && cf.key === "stack") {
    const st = L.stages[cf.stage];
    if (st) out.push([st.prop, s.T / (st.ispVac * G0)]);
  }
  return { s, flows: out };
}
function initExhaust() {
  // tileable billows: value noise in a few octaves
  const N = 256,
    rnd = mulberry32(11),
    v = new Float32Array(N * N);
  for (const [S, amp] of [
    [4, 0.4],
    [8, 0.27],
    [16, 0.17],
    [32, 0.1],
    [64, 0.06],
  ]) {
    const L = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) L[i] = rnd();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * S,
          fy = (y / N) * S,
          x0 = Math.floor(fx),
          y0 = Math.floor(fy),
          tx = fx - x0,
          ty = fy - y0,
          sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const a = L[(y0 % S) * S + (x0 % S)],
          b = L[(y0 % S) * S + ((x0 + 1) % S)],
          c = L[((y0 + 1) % S) * S + (x0 % S)],
          d = L[((y0 + 1) % S) * S + ((x0 + 1) % S)];
        v[y * N + x] +=
          amp *
          ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
  }
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d"),
    img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const q = clamp(Math.round(255 * smoothstep((v[i] - 0.18) / 0.64)), 0, 255);
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = q;
    img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  EXH.tex = new THREE.CanvasTexture(cv);
  EXH.tex.wrapS = EXH.tex.wrapT = THREE.RepeatWrapping;
  EXH.tex.generateMipmaps = true;
  EXH.tex.minFilter = THREE.LinearMipmapLinearFilter;
}
const GLSL_EXH_COMMON = `
uniform sampler2D tNoise; uniform vec3 uSunDir; uniform vec3 uFogCol; uniform float uExpo;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vWP; varying float vFade;
// Smoke of optical depth tau seen at a point where its surface (a column's or a puff's) faces N. Dense smoke scatters like a
// matt surface (light diffusing through it reaches its far side too); thin smoke glows looking toward the Sun (forward
// scattering, Henyey–Greenstein g = 0.6). Premultiplied: a thin veil in sunlight against a dark sky (exposed for the dark:
// uExpo) can outshine its own opacity many times over, so the light is not capped by it.
vec4 smoke(float tau, float edge, vec3 N, float n) {
  // out of the flame the smoke billows into view, the bulging parts (n high) first (vFade: 0 at the flame, 1 clear of it)
  float fd = clamp((vFade - 0.45 * (1.0 - n)) / 0.55, 0.0, 1.0);
  float a = (1.0 - exp(-tau)) * edge * fd * fd;
  vec3 V = normalize(cameraPosition - vWP);
  float wrap = clamp((dot(N, uSunDir) + 0.8) / 1.8, 0.0, 1.0);
  float ct = dot(-V, uSunDir), hg = 0.64 / pow(1.36 - 1.2 * ct, 1.5);
  vec3 sunL = vSun * mix(wrap, 0.12 + 0.3 * hg, exp(-tau)) * uExpo, ambL = vAmb * (0.8 + 0.4 * n);
  float af = a * (1.0 - 0.7 * vFog);
  vec3 col = mix(sunL + ambL, uFogCol, vFog) * af;
  float mx = max(max(col.r, col.g), col.b); if (mx > 1.0) col /= mx; // overexposed: keep the hue
  return vec4(col, af);
}
float bil(vec2 p) { return texture2D(tNoise, p * vec2(0.37, 0.19) + vec2(0.0, 0.5)).r * 0.62 + texture2D(tNoise, p * vec2(1.21, 0.47) + vec2(0.31, 0.17)).r * 0.38; }`;
const GLSL_EXH_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aUV; attribute float aTau; attribute vec3 aSun; attribute vec3 aAmb; attribute float aFog; attribute vec3 aSide; attribute float aFade;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vSide; varying vec3 vWP; varying float vFade;
void main(){ vUV = aUV; vTau = aTau; vSun = aSun; vAmb = aAmb; vFog = aFog; vSide = aSide; vFade = aFade;
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
// the ribbon: a round column seen from the side; vUV = (along the trail, across it −1.25 … 1.25, log2 of its spread)

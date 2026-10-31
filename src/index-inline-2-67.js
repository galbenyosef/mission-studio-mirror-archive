// index-inline-2 67 — math
// Lines 19099-19445 of readable/index-inline-2.pretty.js (statement-aligned).
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
      Math.cos(a) * 5.4,
      top - 0.4,
      Math.sin(a) * 5.4,
      0.9,
      0.5,
      1.4,
      -a,
    );
  } // the clamps' seats on the table
  const tower = padStarshipTower(k, -28, -3, 0, g);
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
  // the twenty hold-down clamps: each on a vertical pivot at its seat, its jaw over the booster's skirt; they swing out at liftoff
  const clamps = [];
  for (let i = 0; i < 20; i++) {
    const a = (i * TAU) / 20,
      piv = new THREE.Group();
    piv.position.set(-Math.cos(a) * 5.4, top + 0.1, Math.sin(a) * 5.4);
    piv.rotation.y = a;
    g.add(piv);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.8), M.steelD);
    jaw.position.set(0.55, 0.65, 0);
    piv.add(jaw);
    clamps.push(piv);
  }
  // the booster quick-disconnect at the mount (the tower's side): a plate against the skirt on a short arm, which pulls back
  const bqd = new THREE.Group();
  bqd.position.set(7.5, top + 1.5, 0);
  g.add(bqd); // (pad frame: +X is west, toward the tower)
  const bqdArm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 1.6), M.greyD);
  bqdArm.position.set(-1.2, 0, 0);
  bqd.add(bqdArm);
  const bqdPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 2.4, 2.6),
    M.steelD,
  );
  bqdPlate.position.set(-2.9, 0, 0);
  bqd.add(bqdPlate);
  // Timing (approximate, from the webcasts): the chopsticks open from the ship to their launch position over the last
  // quarter hour; the ship's quick-disconnect arm swings back along the tower about 30 s before liftoff; the booster's
  // quick-disconnect pulls back and the clamps swing out as the engines come up to thrust at T−0
  const open = (tl, t0, t1) => smoothstep(clamp((tl - t0) / (t1 - t0), 0, 1));
  const animate = (t) => {
    const tl = t - md.M.t0;
    const o = open(tl, -900, -720);
    for (const st of tower.sticks)
      st.rotation.y = st.userData.side * (0.06 + 0.5 * o);
    tower.qd.rotation.y = -1.9 * open(tl, -32, -20);
    const rel = open(tl, -0.3, 0.9);
    for (const c of clamps)
      ((c.rotation.y = c.userData.a0 ?? (c.userData.a0 = c.rotation.y)),
        (c.rotation.y = c.userData.a0 + 1.1 * rel));
    bqd.position.x = 7.5 + 1.8 * open(tl, -1.0, 0.0);
    bqd.rotation.z = 0.5 * open(tl, 0.2, 1.4);
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: top,
    animate,
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
  if (site === "KOUROU3") return padELA3(md);
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
uniform sampler2D tNoise; uniform vec3 uSunDir; uniform vec3 uFogCol; uniform float uExpo; uniform float uHG;
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
  vec3 sunL = vSun * mix(wrap, 0.12 + 0.3 * hg * uHG, exp(-tau)) * uExpo, ambL = vAmb * (0.8 + 0.4 * n);
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
const GLSL_EXH_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_EXH_COMMON}
varying vec3 vSide;
void main(){
  #include <logdepthbuf_fragment>
  float v = vUV.y;
  // billows fixed to the smoke push its edge in and out and vary its thickness. They are sized to the trail's width now:
  // as it spreads, the pattern it was emitted with gives way to one twice, four times … as coarse
  float k = floor(vUV.z), f = vUV.z - k, s0 = exp2(-k);
  float n = mix(bil(vec2(vUV.x * s0 + 0.43 * k, v)), bil(vec2(vUV.x * s0 * 0.5 + 0.43 * (k + 1.0), v)), f);
  float rEdge = 0.62 + 0.62 * n, x = abs(v) / rEdge; if (x >= 1.0) discard; // the column's edge, in its nominal radius
  float chord = sqrt(1.0 - x * x);
  vec3 V = normalize(cameraPosition - vWP);
  vec4 c = smoke(vTau * chord * (0.45 + 1.1 * n), 1.0 - smoothstep(0.62, 1.0, x), normalize(vSide * (v / rEdge) + V * chord), n);
  if (max(max(c.r, c.g), c.b) < 0.0015 && c.a < 0.002) discard;
  gl_FragColor = vec4(c.rgb, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = c.a;
}`;
// the puffs: the exhaust high up, which spreads into a wide, thin cloud, as overlapping round puffs facing the camera (a
// ribbon would fold on itself seen end-on); vUV = (corner −1 … 1, −1 … 1, a number for the puff's own billows)

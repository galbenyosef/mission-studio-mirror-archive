// index-inline-2 70 — three
// Lines 20130-20476 of readable/index-inline-2.pretty.js (statement-aligned).
const PCL_N = 1500; // puffs
const PCL_FIRE = [1.0, 0.5, 0.2]; // the flame's light in the cloud
const _pclQ = new THREE.Quaternion(),
  _pclR = new THREE.Vector3(),
  _pclU = new THREE.Vector3();
const pclHash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function buildPadCloud() {
  if (!EXH.tex) initExhaust();
  const np = PCL_N,
    g = new THREE.BufferGeometry(),
    B = (k) =>
      new THREE.BufferAttribute(new Float32Array(4 * np * k), k).setUsage(
        THREE.DynamicDrawUsage,
      );
  g.setAttribute("position", B(3));
  g.setAttribute("aUV", B(3));
  g.setAttribute("aTau", B(1));
  g.setAttribute("aSun", B(3));
  g.setAttribute("aAmb", B(3));
  g.setAttribute("aFog", B(1));
  g.setAttribute("aFade", B(1));
  g.setAttribute("aN", B(3));
  const ix = new Uint32Array(6 * np);
  for (let i = 0; i < np; i++) {
    const a = 4 * i;
    ix.set([a, a + 1, a + 2, a, a + 2, a + 3], 6 * i);
  }
  g.setIndex(new THREE.BufferAttribute(ix, 1));
  g.setDrawRange(0, 0);
  const uvA = g.attributes.aUV.array;
  for (let i = 0; i < np; i++)
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].forEach(([x, y], k) => {
      uvA[12 * i + 3 * k] = x;
      uvA[12 * i + 3 * k + 1] = y;
      uvA[12 * i + 3 * k + 2] = pclHash(7 * i + 5) * 40;
    });
  const m = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: GLSL_PUFF_V,
      fragmentShader: GLSL_PUFF_F,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        tNoise: { value: EXH.tex },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uFogCol: { value: new THREE.Color(0, 0, 0) },
        uExpo: { value: 1 },
        uHG: { value: 0.2 },
      },
    }),
  ); // (uHG: little of the forward glow of thin smoke, which the thousand overlapping puffs of a dense cloud would add up to a blaze)
  m.frustumCulled = false;
  m.renderOrder = 4;
  m.visible = false;
  m.userData.isPadCloud = true;
  return m;
}
// what the cloud is made of, from the engines that fire at liftoff: colour and density per propellant
function pclMix(L) {
  const st = liftoffStages(L);
  let w = 0,
    col = [0, 0, 0],
    soot = 0;
  for (const s of st) {
    const P = EXH_PROP[s.prop] || EXH_PROP.kerolox,
      f = stageFlow(s) * (0.4 + P.k);
    w += f;
    soot +=
      (s.prop === "kerolox"
        ? 1
        : s.prop === "hypergolic" || s.prop === "udmh" || s.prop === "mmh"
          ? 0.8
          : 0.1) * f;
    for (let j = 0; j < 3; j++) col[j] += P.col[j] * f;
  }
  if (!w) return { col: [0.9, 0.9, 0.9], soot: 0.3 };
  return { col: col.map((x) => x / w), soot: soot / w };
}
// g: the pad group (metres, scaled to km); blast(te): how hard the engines hit the pad at te; sC: the vehicle's size of
// blast (1 for the Saturn V); sunUp: sine of the Sun's elevation at the pad
function updatePadCloud(g, t, tIgn, span, blast, sC, L, sunUp) {
  const cl = g.children.find((o) => o.userData.isPadCloud);
  if (!cl || cl.userData.off) return;
  const ud = g.userData,
    trenchD = ud.trenchD,
    foot = ud.foot,
    deckY = ud.deckY;
  if (!cl.userData.mix) cl.userData.mix = pclMix(L);
  if (!cl.userData.wind) {
    const md = MV.md;
    let seed = 0;
    for (const ch of md.cfg.launch + md.cfg.site)
      seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    cl.userData.wind = exhWind(seed)(0.05);
  } // the launch's wind near the ground (m/s east, north), the one the exhaust trail drifts on
  const wind = cl.userData.wind;
  const { soot } = cl.userData.mix,
    col = cl.userData.mix.col.map((x) => x * (0.78 - 0.22 * soot)); // sooty exhaust is darker; even steam, dense, is not white (its own shadow)
  // light on the cloud: the Sun through the air (reddened low down), the sky's blue, and the flames; at night only the flames
  const day = clamp(0.1 + sunUp * 3, 0, 1),
    sunC = R.sunLight.color,
    sunR = 0.42 * sunC.r * day,
    sunG = 0.42 * sunC.g * day,
    sunB = 0.42 * sunC.b * day;
  const ambR = 0.03 + 0.14 * day * 0.75,
    ambG = 0.04 + 0.14 * day * 0.85,
    ambB = 0.05 + 0.14 * day;
  const U = cl.material.uniforms;
  U.uSunDir.value.copy(R.sunLight.position).normalize();
  U.uExpo.value = 1;
  // camera right and up in the pad's frame, for the quads
  _pclQ.copy(g.quaternion).invert();
  _pclR
    .set(
      R.camera.matrixWorld.elements[0],
      R.camera.matrixWorld.elements[1],
      R.camera.matrixWorld.elements[2],
    )
    .applyQuaternion(_pclQ);
  _pclU
    .set(
      R.camera.matrixWorld.elements[4],
      R.camera.matrixWorld.elements[5],
      R.camera.matrixWorld.elements[6],
    )
    .applyQuaternion(_pclQ);
  const A = cl.geometry.attributes,
    pos = A.position.array,
    tau = A.aTau.array,
    sun = A.aSun.array,
    amb = A.aAmb.array,
    fog = A.aFog.array,
    fade = A.aFade.array,
    nrm = A.aN.array;
  let n = 0;
  const S3 = Math.sqrt(sC);
  for (let i = 0; i < PCL_N; i++) {
    const r1 = pclHash(5 * i + 1),
      r2 = pclHash(5 * i + 2),
      r3 = pclHash(5 * i + 3),
      r4 = pclHash(5 * i + 4);
    const te = tIgn + Math.pow(i / PCL_N, 1.5) * span + r1 * 0.1,
      a = t - te;
    if (a < 0) continue; // (most of them in the first seconds, when the blast is fiercest)
    const k = blast(te);
    if (k < 0.03 || a > 240) continue;
    let x, y, z, sz, od, glow, lit;
    const kind = i % 4,
      side = kind % 2 ? 1 : -1; // lit: how much of the sun reaches the parcel through the cloud above it
    if (kind < 3) {
      // out of the trench: a jet of fire that becomes rolling smoke
      const v0 = (70 + 60 * r2) * (0.35 + 0.65 * k) * (0.6 + 0.4 * S3),
        tauV = 2.4 + 1.2 * r3;
      const d =
        trenchD + v0 * tauV * (1 - Math.exp(-a / tauV)) + (1.2 + 1.5 * r4) * a; // along the trench, slowing, then drifting on
      const rise =
        a < 14 ? 2.5 * a + 0.3 * a * a : 2.5 * 14 + 0.3 * 196 + 10.9 * (a - 14); // buoyant: up to 11 m/s
      const lift = (0.3 + 0.7 * r4) * rise * (0.8 + 0.4 * S3),
        top = Math.min((lift / Math.max(rise, 1)) * 1.4, 1); // how near the parcel is to the top of the column
      // the cap: the hot column's top rolls over as a vortex ring, its parcels going out and round and down; the ring widens as it climbs
      const ring = 0.3 * lift * smoothstep((a - 3) / 8),
        th = r2 * TAU + 0.35 * a * top,
        roll = ring * top;
      const spread =
        (r3 - 0.5) * (18 + 2.4 * a) * S3 +
        roll * Math.cos(th) * Math.sign(r3 - 0.5);
      x = spread + 10 * Math.sin(0.7 * a + 6 * r2) * Math.min(a / 5, 1);
      z = side * d + roll * 0.5 * Math.sin(th);
      y =
        7 +
        lift * (0.25 + 0.75 * Math.min(a / 2, 1)) +
        roll * 0.6 * Math.sin(th);
      sz =
        (18 + 65 * (1 - Math.exp(-a / 7)) + 1.1 * a) *
        (0.5 + 0.5 * S3) *
        (0.8 + 0.4 * r2);
      od = (1.8 + 1.4 * soot) * Math.pow(18 / sz, 0.8) * (0.5 + 0.5 * k);
      glow = Math.exp(-a / 1.6) * (0.4 + 0.6 * k) * 1.4;
      lit = 0.2 + 0.8 * top * top; // the column's top in full sun, its flanks and skirts in the shadow of the mass above
    } else {
      // steam from the deluge water, boiling up round the launch mount
      const ang = r2 * TAU,
        rr = foot + 4 + 14 * r3 + 2.5 * a;
      x = Math.cos(ang) * rr;
      z = Math.sin(ang) * rr;
      y = deckY + 2 + (3 + 4 * r1) * a + 0.1 * a * a;
      sz = (9 + 30 * (1 - Math.exp(-a / 5)) + 0.7 * a) * (0.5 + 0.5 * S3);
      od = 1.6 * Math.pow(10 / sz, 0.7) * (0.5 + 0.5 * k);
      glow = 0.35 * Math.exp(-a / 1.5) * k;
      lit = 0.35 + 0.65 * Math.min(a / 10, 1) * (0.4 + 0.6 * r1); // the steam low round the mount, under the trench clouds
    }
    const wd = 0.7 * Math.max(a - 2, 0);
    x -= wind[0] * wd;
    z += wind[1] * wd; // the surface wind carries the cloud off (pad frame: +X west, +Z north)
    const life =
      Math.exp(-a / (70 + 40 * sC)) * (1 - smoothstep((a - 150) / 90));
    const o = 4 * n,
      hs = sz; // the quad's half-size (the puff's radius is 0.75 of it)
    // which way this parcel bulges out of the cloud: outward from the trench's axis and upward, the column's rolling surface
    const nx = x,
      ny = 0.6 * y + 0.3 * sz,
      nz = kind < 3 ? z - side * trenchD : z,
      nl = Math.hypot(nx, ny, nz) || 1;
    for (let c = 0; c < 4; c++) {
      const qx = c === 0 || c === 3 ? -1 : 1,
        qy = c < 2 ? -1 : 1,
        j = 3 * (o + c);
      pos[j] = x + (_pclR.x * qx + _pclU.x * qy) * hs;
      pos[j + 1] = y + (_pclR.y * qx + _pclU.y * qy) * hs;
      pos[j + 2] = z + (_pclR.z * qx + _pclU.z * qy) * hs;
      nrm[j] = nx / nl;
      nrm[j + 1] = ny / nl;
      nrm[j + 2] = nz / nl;
      tau[o + c] = od * life;
      fade[o + c] = 1;
      fog[o + c] = 0; // (fully billowed from the start: the jet is one continuous mass)
      sun[j] = sunR * col[0] * lit;
      sun[j + 1] = sunG * col[1] * lit;
      sun[j + 2] = sunB * col[2] * lit;
      amb[j] = ambR * col[0] + PCL_FIRE[0] * glow * 2.2;
      amb[j + 1] = ambG * col[1] + PCL_FIRE[1] * glow * 2.2;
      amb[j + 2] = ambB * col[2] + PCL_FIRE[2] * glow * 2.2;
    }
    n++;
  }
  for (const k of ["position", "aTau", "aSun", "aAmb", "aFog", "aFade", "aN"])
    A[k].needsUpdate = true;
  cl.geometry.setDrawRange(0, 6 * n);
  cl.visible = n > 0;
}

// ==== 49_contrail.js
// ============================================================================
// Wingtip vortex trails: a winged vehicle gliding home through moist air at high lift leaves two white threads of
// condensation spinning off its wingtips (the low pressure in the core of each vortex cools the air below its dew point).
// They form where the air is dense and humid, in the lowest kilometres, and strongest in the pull-up of the flare and the
// turns of the heading alignment cone; they fade in half a minute. How humid the air is depends on the site: Florida's
// morning air is wet, the high desert at Edwards dry.
// Each trail is a ribbon of samples fixed to the turning Earth (Earth-fixed coordinates, km), turned to face the camera and
// drawn as a soft thread that widens and thins with age. Models that can leave them carry userData.wingtips, the tips in
// the model's own frame (metres).
// ============================================================================
const CTR_N = 360,
  CTR_LIFE = 24; // samples per trail; seconds a sample lasts
const CTR_HUMID = { KSC15: 1, KSC33: 1, EDW22: 0.55, EDW23: 0.55, NOR17: 0.4 }; // by runway; others 0.7
const GLSL_CTR_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 aUV; attribute float aA;
varying vec2 vUV; varying float vA; varying vec3 vWP;
void main(){ vUV = aUV; vA = aA; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const GLSL_CTR_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSun; uniform vec3 uAmb; uniform vec3 uSunDir;
varying vec2 vUV; varying float vA; varying vec3 vWP;
void main(){
  #include <logdepthbuf_fragment>
  float x = abs(vUV.y); if (x >= 1.0) discard;
  // a round thread: dense in the middle, soft at the edge; it glows looking toward the Sun (forward scattering)
  float chord = sqrt(1.0 - x * x), a = vA * chord * (1.0 - smoothstep(0.55, 1.0, x));
  vec3 V = normalize(cameraPosition - vWP); float hg = 0.5 / pow(1.36 - 1.2 * dot(-V, uSunDir), 1.5);
  vec3 col = (uSun * (0.6 + 0.15 * hg) + uAmb) * a;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = a;
}`;
const _ctrQ = new THREE.Quaternion(),
  _ctrV = new THREE.Vector3(),
  _ctrT = new THREE.Vector3(),
  _ctrS = new THREE.Vector3(),
  _ctrC = new THREE.Quaternion();
function contrailInit(c) {
  const tr = {
    head: 0,
    n: 0,
    P: new Float64Array(3 * CTR_N * 2),
    T: new Float64Array(CTR_N),
    K: new Float32Array(CTR_N),
    mesh: null,
    tipNode: null,
    tipKey: null,
    lastT: null,
  };
  const cap = CTR_N * 2,
    g = new THREE.BufferGeometry(),
    A = (k) =>
      new THREE.BufferAttribute(new Float32Array(2 * cap * k), k).setUsage(
        THREE.DynamicDrawUsage,
      );
  g.setAttribute("position", A(3));
  g.setAttribute("aUV", A(2));
  g.setAttribute("aA", A(1));
  const idx = new Uint32Array(6 * (cap - 1));
  for (let i = 0; i < cap - 1; i++) {
    const a = 2 * i;
    idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], 6 * i);
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setDrawRange(0, 0);
  const m = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: GLSL_CTR_V,
      fragmentShader: GLSL_CTR_F,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uSun: { value: new THREE.Color(1, 1, 1) },
        uAmb: { value: new THREE.Color(0.2, 0.22, 0.26) },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      },
    }),
  );
  m.frustumCulled = false;
  m.renderOrder = 5;
  m.visible = false;
  R.scene.add(m);
  tr.mesh = m;
  c.ctr = tr;
  return tr;
}
function contrailDispose(c) {
  const tr = c.ctr;
  if (!tr) return;
  R.scene.remove(tr.mesh);
  tr.mesh.geometry.dispose();
  tr.mesh.material.dispose();
  c.ctr = null;
}
// the node that carries the tips (the model's own, below finishModel's wrapper, so the tips are read in the model's frame)

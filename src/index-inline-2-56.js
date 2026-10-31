// index-inline-2 56 — three
// Lines 15934-16123 of readable/index-inline-2.pretty.js (statement-aligned).
const GLSL_TERRAIN_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aUp; attribute float aFade; varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vUp; varying float vFade; varying vec3 vCol;
uniform float uWave; uniform float uTime;
#ifdef USE_VC
attribute vec3 color;
#endif
void main() {
  vUv = uv; vFade = aFade; vUp = normalize(mat3(modelMatrix) * aUp); vN = normalize(mat3(modelMatrix) * normal);
  #ifdef USE_VC
  vCol = color;
  #else
  vCol = vec3(1.0);
  #endif
  vec3 pos = position;
  if (uWave > 0.0) pos += normal * (sin(uv.x * 9.0 - uTime * 5.0) + 0.5 * sin(uv.x * 17.0 + uv.y * 4.0 - uTime * 8.3)) * uv.x * uWave; // a flag in the wind: waves run out from the pole and grow toward the fly
  vec4 wp = modelMatrix * vec4(pos, 1.0); vP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;
const GLSL_TERRAIN_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tMap; uniform float uHasMap; uniform vec3 uColor; uniform sampler2D tScrub; uniform float uRep; uniform float uOcean; uniform vec3 uSunDir; uniform vec3 uFill;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vUp; varying float vFade; varying vec3 vCol;
${GLSL_ATMOS}
void main() {
  ${LOGDEPTH_EXACT}
  vec3 N = normalize(vUp), Nb = normalize(vN), L = normalize(uSunDir);
  if (!gl_FrontFacing) Nb = -Nb;
  vec3 seg = vP - cameraPosition; float dist = length(seg); vec3 d = seg / dist, V = -d;
  float mus = dot(N, L), muv = max(dot(N, V), 0.0);
  vec3 sun = aSunlight(aRg, mus) * (aSunE / PI), sky = aSkyLight(aRg, mus);
  vec3 alb = (uHasMap > 0.5 ? texture2D(tMap, vUv).rgb : uColor) * vCol;
  if (uRep > 0.0) { // the scrub texture at four scales (1.1 km, 350 m, 80 m, 20 m tiles): patches of brush, bare ground and washes
    vec2 suv = vUv * uRep; float sA = texture2D(tScrub, suv * 0.071 + vec2(0.37, 0.11)).g, sB = texture2D(tScrub, suv * 0.23 + vec2(0.71, 0.53)).g, sC = texture2D(tScrub, suv).g, sD = texture2D(tScrub, suv * 4.0 + vec2(0.13, 0.61)).g;
    alb *= 0.45 + 1.0 * (0.35 * sA + 0.3 * sB + 0.25 * sC + 0.1 * sD) / 0.22 * 0.55; }
  vec3 col = alb * (sun * max(dot(Nb, L), 0.0) + sky);
  if (uOcean > 0.0) { // the water: glint off its ruffled surface and the sky's reflection (as the globe's sea)
    vec3 H = normalize(L + V); float nh = max(dot(N, H), 1e-3), vh = max(dot(V, H), 0.0);
    const float S2 = 0.035;
    float D = exp(-(1.0 - nh * nh) / (nh * nh * S2)) / (PI * S2 * nh * nh * nh * nh);
    float F = 0.02 + 0.98 * pow(1.0 - vh, 5.0), Fv = 0.02 + 0.98 * pow(1.0 - muv, 5.0);
    vec3 sea = col * (1.0 - Fv) + sun * PI * F * D / (4.0 * max(muv, 0.05)) + sky * Fv;
    col = mix(col, sea, uOcean);
  }
  col += alb * uFill * (1.0 - smoothstep(-0.10, 0.12, mus)); // the same night fill as the globe's
  float t0 = 0.0; // the air between the camera and this point
  if (aCamH > aRt - aRg) { float b = dot(aCam, d); vec3 pc = aCam - b * d; float Dt = aRt * aRt - dot(pc, pc); t0 = Dt > 0.0 ? clamp(-b - sqrt(Dt), 0.0, dist) : dist; }
  vec3 S, T; aIntegrate(aCam, d, t0, dist, L, 2, aCamH > aRt - aRg ? 12 : 16, S, T);
  col = col * T * aWB * aExpo + aHaze(S, dist);
  gl_FragColor = vec4(col, vFade);
  #include <colorspace_fragment>
}`;
// the ground's height at a point, km above the sphere (the relief, the flats, and the cap it is cut from), or null where
// no terrain is loaded: for whatever must stand on the ground, like the launch camera (app/50_camera.js)
function terrainHeightAt(lat, lon) {
  for (const g of TER.groups) {
    const ud = g.userData;
    if (!ud.hAt) continue;
    const [x, y] = ud.toLocal(lat, lon);
    if (Math.abs(x) > ud.L * 0.5 || Math.abs(y) > ud.L * 0.5) continue;
    return (ud.capE + ud.hAt(x, y)) / 1000;
  }
  return null;
}
function terrainMat(o) {
  const EU = R.bodies.earth.mat.uniforms,
    scrub = padGroundTex();
  scrub.wrapS = scrub.wrapT = THREE.RepeatWrapping;
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_TERRAIN_V,
    fragmentShader: GLSL_TERRAIN_F,
    transparent: true,
    side: o.map ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: !!o.offset,
    polygonOffsetFactor: o.offset || 0,
    polygonOffsetUnits: o.offset || 0,
    defines: o.vertexColors ? { USE_VC: 1 } : {},
    uniforms: Object.assign(
      {
        tMap: { value: o.map || null },
        uHasMap: { value: o.map ? 1 : 0 },
        uColor: { value: new THREE.Color(o.color || "#ffffff") },
        tScrub: { value: scrub },
        uRep: { value: o.rep || 0 },
        uOcean: { value: o.ocean || 0 },
        uWave: { value: o.wave || 0 },
        uTime: { value: 0 },
        uSunDir: EU.uSunDir,
        uFill: EU.uFill,
      },
      atmosUniforms("earth"),
    ),
  });
  if (o.wave) TER.anim.push(m);
  return m;
}
function updateTerrain() {
  const t = clockMs() / 1000;
  for (const m of TER.anim) m.uniforms.uTime.value = t;
} // the flags
// the Earth map's colour at a point (sRGB), from the 4k day map: a few pixels round it averaged
function globeColorAt(lat, lon) {
  const e = (R.texLOD || []).find(
      (x) => x.body === "earth" && x.srgb && !x.grey,
    ),
    im = e && e.base && e.base.image;
  if (!im || !im.width) return null;
  try {
    const c =
      globeColorAt.c || (globeColorAt.c = document.createElement("canvas"));
    c.width = 4;
    c.height = 4;
    const g = c.getContext("2d");
    const x = ((lon + 180) / 360) * im.width - 2,
      y = ((90 - lat) / 180) * im.height - 2;
    g.drawImage(im, x, y, 4, 4, 0, 0, 4, 4);
    const d = g.getImageData(0, 0, 4, 4).data;
    let r = 0,
      gg = 0,
      b = 0;
    for (let i = 0; i < 16; i++) {
      r += d[4 * i];
      gg += d[4 * i + 1];
      b += d[4 * i + 2];
    }
    return new THREE.Color().setRGB(
      r / 16 / 255,
      gg / 16 / 255,
      b / 16 / 255,
      THREE.SRGBColorSpace,
    );
  } catch (e) {
    return null;
  }
}
// the land-cover colours as a texture over the square, sampled smoothly between cells
function terrainClassTexture(rgb, N) {
  const px = new Uint8Array(4 * N * N);
  for (let i = 0; i < N * N; i++) {
    px[4 * i] = rgb[3 * i];
    px[4 * i + 1] = rgb[3 * i + 1];
    px[4 * i + 2] = rgb[3 * i + 2];
    px[4 * i + 3] = 255;
  }
  const t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
function mergeGeos(gs) {
  // positions and the fade (nothing else shared), for the water
  const pos = [],
    fd = [],
    idx = [];
  let n = 0;
  for (const g of gs) {
    const p = g.attributes.position,
      f = g.attributes.aFade,
      ix = g.index;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      fd.push(f ? f.getX(i) : 1);
    }
    if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + n);
    else for (let i = 0; i < p.count; i++) idx.push(i + n);
    n += p.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aFade", new THREE.Float32BufferAttribute(fd, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ==== 44_buildings.js
// ============================================================================
// What no public-domain dataset holds: the buildings, the crawlerway, the other pads and the runways of a site, drawn by
// hand on the terrain (app/43_terrain.js) from published dimensions. Positions are read off public maps and are good to
// some tens of metres; the buildings are plain blocks in their colours. Only the main ones: what a camera a few
// kilometres off would pick out.
// Each entry: lat, lon of the centre, w (east–west) × d (north–south) × h metres, hdg: rotation clockwise from north,
// col: the walls, roof: the roof.
// ============================================================================

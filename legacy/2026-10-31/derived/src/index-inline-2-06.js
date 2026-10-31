// index-inline-2 06 — asset_map
// Lines 1314-1594 of readable/index-inline-2.pretty.js (statement-aligned).
const ASSET_MAP = {
  "apollo_lm.glb": "apollo_lm.0c2c313482.glb",
  "earth_aux.jpg": "earth_aux.3bf717776b.jpg",
  "earth_clouds.jpg": "earth_clouds.85c42a93e9.jpg",
  "earth_clouds_8k.jpg": "earth_clouds_8k.87f5cced5f.jpg",
  "earth_day.jpg": "earth_day.f2cc89e242.jpg",
  "earth_day_8k.jpg": "earth_day_8k.65cfe8381b.jpg",
  "earth_night.jpg": "earth_night.c6529a7b12.jpg",
  "earth_night_8k.jpg": "earth_night_8k.d858fe1094.jpg",
  "iss.glb": "iss.93dcb2db5f.glb",
  "jupiter.jpg": "jupiter.efa4857ae7.jpg",
  "mars.jpg": "mars.55a8499eae.jpg",
  "mars_4k.jpg": "mars_4k.198fa949d9.jpg",
  "mars_8k.jpg": "mars_8k.2b287e5c8f.jpg",
  "mars_aux.jpg": "mars_aux.4ffcd109cd.jpg",
  "moon.jpg": "moon.c0b04ebfd5.jpg",
  "moon_4k.jpg": "moon_4k.70d18ad28c.jpg",
  "moon_8k.jpg": "moon_8k.e62eb34b75.jpg",
  "moon_aux.jpg": "moon_aux.b162388d4f.jpg",
  "orbiter-atlantis-2011.webp": "orbiter-atlantis-2011.8dd5d974b1.webp",
  "orbiter-columbia-1981.webp": "orbiter-columbia-1981.cbdd7a19fb.webp",
  "orbiter-discovery-1990.webp": "orbiter-discovery-1990.5e9bd01f14.webp",
  "orbiter.glb": "orbiter.a04192b5d6.glb",
  "perseverance.glb": "perseverance.3fe6618a01.glb",
  "saturn.jpg": "saturn.6c309cef02.jpg",
  "saturnv.glb": "saturnv.7a0913aa0b.glb",
  "shuttle_stack.glb": "shuttle_stack.9526e4715a.glb",
  "stars.json": "stars.b686ef8f1d.json",
  "venus.jpg": "venus.d02db3e21e.jpg",
  "BufferGeometryUtils.js": "BufferGeometryUtils.1b11c30e00.js",
  "GLTFLoader.js": "GLTFLoader.8c75e4b72b.js",
  "meshopt_decoder.module.js": "meshopt_decoder.module.01f48524f4.js",
};
const ASSET = (n) => "assets/" + (ASSET_MAP[n] || n);
// Planet surfaces are drawn with very large triangles that the near plane clips right under the camera; interpolating
// three.js's log-depth varying across them is numerically poor (errors of decimetres next to a landed craft), so these
// shaders take the depth from gl_FragCoord.w = 1/w, which the rasteriser computes exactly for every pixel.
const LOGDEPTH_EXACT = `
#ifdef USE_LOGDEPTHBUF
  gl_FragDepth = log2( 1.0 + 1.0 / gl_FragCoord.w ) * logDepthBufFC * 0.5;
#endif`;
const GLSL_DETAIL = `
uniform sampler2D tDetail; uniform float uDetailAmp; uniform vec2 uDetailRep;
varying vec2 vLocal; varying float vCap; varying vec3 vObj;
uniform vec3 uCapDir[4]; uniform float uCapCos[4];
void capHoles() { if (vCap < 0.5) { for (int i = 0; i < 4; i++) { if (dot(vObj, uCapDir[i]) > uCapCos[i]) discard; } } }
float detailAt(vec2 uv, float dist) {
  float w1 = 1.0 - smoothstep(150.0, 900.0, dist), w2 = 1.0 - smoothstep(30.0, 220.0, dist), w3 = 1.0 - smoothstep(1.5, 12.0, dist), w4 = 1.0 - smoothstep(0.08, 0.7, dist);
  float d = 0.0;
  if (w1 > 0.0) d += (texture2D(tDetail, uv * uDetailRep).r - 0.5) * w1;
  if (w2 > 0.0) d += (texture2D(tDetail, uv * uDetailRep * 17.0).r - 0.5) * w2;
  if (w3 > 0.0) d += (texture2D(tDetail, vLocal / 0.075).r - 0.5) * w3;
  if (w4 > 0.0) d += (texture2D(tDetail, vLocal / 0.0045).r - 0.5) * w4 * 0.8;
  return 1.0 + d * uDetailAmp;
}`;
const GLSL_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
attribute vec2 aLocal; varying vec2 vLocal; attribute float aCap; varying float vCap; varying vec3 vObj;
void main() {
  vUv = uv; vLocal = aLocal; vCap = aCap; vObj = normalize(position); vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;
// relief from a slope map (G, B: slopes east and north as 128 + slope·K): the normal tilted over the sphere's
const GLSL_RELIEF = `
uniform sampler2D tAux; uniform vec3 uPole; uniform float uSlopeK, uRelief; uniform vec2 uReliefNear;
vec3 reliefNormal(vec3 N, vec3 aux, float dist, out vec3 E, out vec3 Nn, out float cosLat) {
  E = cross(uPole, N); cosLat = length(E); E /= max(cosLat, 1e-5); Nn = cross(N, E);
  vec2 s = (aux.gb * 255.0 - 128.0) / uSlopeK * uRelief * smoothstep(uReliefNear.x, uReliefNear.y, dist); // (gone close up, where a texel would show as a facet)
  return normalize(N - E * s.x - Nn * s.y);
}`;
// Earth: the day map lit by sunlight and skylight from the atmosphere model (reddened near the terminator), relief from
// the slope map, clouds on a layer above the ground (seen with parallax, casting shadows along the sunlight, their tops
// lit a little past the ground's sunset), the sea's glint and sky reflection, towns' lights at night, and the air between
// the camera and the ground over all of it.
const GLSL_EARTH_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tClouds; uniform vec3 uSunDir; uniform float uLights; uniform vec3 uFill;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${GLSL_DETAIL}
${GLSL_ATMOS}
${GLSL_RELIEF}
const float CLOUD_H = 6.0; // km
// a horizontal displacement on the ground (km, world axes) in texture coordinates
vec2 uvShift(vec3 dv, vec3 E, vec3 Nn, float cosLat) { return vec2(dot(dv, E) / (2.0 * PI * aRg * max(cosLat, 0.05)), dot(dv, Nn) / (PI * aRg)); }
float cloudAt(vec2 uv) { return smoothstep(0.1, 0.92, texture2D(tClouds, uv).r); }
void main() {
  ${LOGDEPTH_EXACT}
  capHoles();
  vec3 N = normalize(vN), L = normalize(uSunDir);
  vec3 seg = vP - cameraPosition; float dist = length(seg); vec3 d = seg / dist, V = -d;
  vec3 aux = texture2D(tAux, vUv).rgb; float ocean = aux.r;
  vec3 E, Nn; float cosLat;
  vec3 Nb = normalize(mix(reliefNormal(N, aux, dist, E, Nn, cosLat), N, ocean));
  float mus = dot(N, L), muv = max(dot(N, V), 0.0);
  // clouds: where the line of sight crosses their layer, and the shadow they cast along the sunlight
  float cloud = cloudAt(vUv + uvShift((V - N * muv) * CLOUD_H / max(muv, 0.06), E, Nn, cosLat));
  float shadow = cloudAt(vUv + uvShift((L - N * mus) * CLOUD_H / max(mus, 0.06), E, Nn, cosLat)) * smoothstep(-0.02, 0.08, mus);
  // light on the ground: the Sun through the air, and the sky
  vec3 sun = aSunlight(aRg, mus) * (aSunE / PI) * (1.0 - 0.8 * shadow);
  vec3 sky = aSkyLight(aRg, mus) * (1.0 - 0.3 * shadow);
  vec3 alb = texture2D(tDay, vUv).rgb * mix(detailAt(vUv, dist), 1.0, ocean);
  alb = mix(alb, max(alb, vec3(0.004, 0.012, 0.036)), ocean); // deep water's own colour (the Blue Marble paints the open sea flat and darker)
  vec3 col = alb * (sun * max(dot(Nb, L), 0.0) + sky);
  // the sea: glint off wind-ruffled water (Cox–Munk slopes, ~6 m/s wind), the sky's reflection, both rising towards
  // grazing angles (Fresnel)
  vec3 H = normalize(L + V); float nh = max(dot(N, H), 1e-3), vh = max(dot(V, H), 0.0);
  const float S2 = 0.035;
  float D = exp(-(1.0 - nh * nh) / (nh * nh * S2)) / (PI * S2 * nh * nh * nh * nh);
  float F = 0.02 + 0.98 * pow(1.0 - vh, 5.0), Fv = 0.02 + 0.98 * pow(1.0 - muv, 5.0);
  vec3 sea = col * (1.0 - Fv) + sun * PI * F * D / (4.0 * max(muv, 0.05)) + sky * Fv;
  col = mix(col, sea, ocean);
  // the cloud tops CLOUD_H up see the Sun a little longer than the ground below
  float rc = aRg + CLOUD_H, muhc = -sqrt(max(1.0 - aRg * aRg / (rc * rc), 0.0));
  float cshade = pow(clamp((mus - muhc) / (1.0 - muhc), 0.0, 1.0), 0.65);
  vec3 cloudCol = 0.8 * (aSunlight(rc, mus) * (aSunE / PI) * cshade + aSkyLight(rc, mus));
  col = mix(col, cloudCol, cloud);
  // towns at night (with a soft glow from a coarser mip), switching on through dusk, dimmed by clouds, which they light
  // from below; seen close, a texel's glow breaks up into separate lights
  float nl = texture2D(tNight, vUv).r, ng = texture2D(tNight, vUv, 3.0).r;
  nl = pow(nl, 2.2); ng = pow(ng, 2.2);
  float near = 1.0 - smoothstep(250.0, 1500.0, dist);
  nl *= mix(1.0, smoothstep(0.5, 0.72, texture2D(tDetail, vUv * uDetailRep * 0.25).r) * 4.0, near);
  float dark = (1.0 - smoothstep(-0.14, 0.02, mus)) * uLights;
  vec3 warm = mix(vec3(1.0, 0.62, 0.30), vec3(1.0, 0.86, 0.62), smoothstep(0.1, 0.8, nl)); // sodium-orange outskirts, whiter centres
  vec3 lights = (nl * 2.4 + ng * (1.1 - 0.8 * near)) * warm * dark * (1.0 - cloud * 0.8);
  lights *= smoothstep(5.0, 60.0, dist); // from close by, a town's glow is its separate lights, not a lit patch of ground
  col += lights + ng * cloud * vec3(1.0, 0.7, 0.42) * 0.6 * dark;
  col += (alb * (1.0 - ocean * 0.7) + cloud * 0.6) * vec3(0.0016, 0.0022, 0.0030) * (1.0 - smoothstep(-0.2, 0.0, mus)); // airglow and starlight on the night side
  col += alb * uFill * (1.0 - smoothstep(-0.10, 0.12, mus)); // cinematic night fill near the camera: the ground stays readable after dark
  // the air between the camera and this point
  float t0 = 0.0;
  if (aCamH > aRt - aRg) { float b = dot(aCam, d); vec3 pc = aCam - b * d; float Dt = aRt * aRt - dot(pc, pc); t0 = Dt > 0.0 ? clamp(-b - sqrt(Dt), 0.0, dist) : dist; }
  vec3 S, T; aIntegrate(aCam, d, t0, dist, L, 2, aCamH > aRt - aRg ? 12 : 16, S, T);
  col = col * T * aWB * aExpo + aDisplay(S);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// The Moon and the other bodies: lunar-Lambert photometry (the Moon's flat-looking full disc), relief from a slope map
// where there is one, and on Mars the dusty air (sunlight and skylight through it, and the haze over the ground).
const GLSL_ROCK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; uniform vec3 uSunDir; uniform float uAmb; uniform float uLS; uniform vec3 uTint; uniform float uHasMap; uniform float uHasAux; uniform vec3 uFogColor; uniform float uFogK; uniform vec3 uFill;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${GLSL_DETAIL}
${GLSL_RELIEF}
#ifdef HAS_ATMO
${GLSL_ATMOS}
#endif
void main() {
  ${LOGDEPTH_EXACT}
  capHoles();
  vec3 N = normalize(vN); vec3 L = normalize(uSunDir); vec3 V = normalize(cameraPosition - vP);
  vec3 E, Nn; float cosLat;
  float dist = length(cameraPosition - vP);
  vec3 Nb = uHasAux > 0.5 ? reliefNormal(N, texture2D(tAux, vUv).rgb, dist, E, Nn, cosLat) : N;
  float mus = dot(N, L);
  float mu0 = max(dot(Nb, L), 0.0) * smoothstep(-0.03, 0.01, mus); float mu = max(dot(Nb, V), 0.0);
  float ls = min(2.0 * mu0 / max(mu0 + mu, 1e-4), 1.35);
  float shade = mix(mu0, ls * smoothstep(0.0, 0.04, mu0), uLS);
  vec3 alb = (uHasMap > 0.5 ? texture2D(map, vUv).rgb : vec3(1.0)) * uTint;
  if (uDetailAmp > 0.0) alb *= detailAt(vUv, dist);
#ifdef HAS_ATMO
  vec3 col = alb * (shade * aSunlight(aRg, mus) + aSkyLight(aRg, mus)) + alb * uFill * (1.0 - smoothstep(0.0, 0.25, mus));
  vec3 d = (vP - cameraPosition) / dist;
  float t0 = 0.0;
  if (aCamH > aRt - aRg) { float b = dot(aCam, d); vec3 pc = aCam - b * d; float Dt = aRt * aRt - dot(pc, pc); t0 = Dt > 0.0 ? clamp(-b - sqrt(Dt), 0.0, dist) : dist; }
  vec3 S, T; aIntegrate(aCam, d, t0, dist, L, 2, 12, S, T);
  col = col * T * aWB * aExpo + aDisplay(S);
#else
  vec3 col = alb * (shade + uAmb) + alb * uFill * (1.0 - smoothstep(0.0, 0.25, mu0)); // night fill (earthshine on the Moon, cinematic elsewhere)
  col = mix(col, uFogColor, 1.0 - exp(-dist * uFogK));
#endif
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const GLSL_ATMO_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunDir; uniform vec3 uColor; uniform vec3 uSunset; uniform float uStrength; uniform float uPow;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vP); vec3 L = normalize(uSunDir);
  float rim = 1.0 - abs(dot(N, V));
  float glow = pow(rim, uPow);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.30, 0.35, ndl);
  float dusk = smoothstep(-0.30, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.30, ndl));
  vec3 c = (uColor * lit + uSunset * dusk * 0.45) * glow * uStrength;
  gl_FragColor = vec4(c, 1.0);
}`;
const GLSL_STAR_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute vec3 aColor; uniform float uScale; varying vec3 vC;
void main() { vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale;
  #include <logdepthbuf_vertex>
}`;
const GLSL_STAR_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uBright; varying vec3 vC;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 4.0);
  gl_FragColor = vec4(vC * a * uBright, 1.0);
}`;

const GLSL_SKY_V = `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.999; }`;
const GLSL_SKY_F = `
uniform vec3 uUp; uniform vec3 uSun; uniform float uDensity; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunset; uniform vec3 uHalo;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float mu = dot(d, uUp); float sunEl = dot(uSun, uUp);
  float day = smoothstep(-0.20, 0.06, sunEl);
  float hz = pow(1.0 - max(mu, 0.0), 4.0);
  vec3 col = mix(uZenith, uHorizon, hz);
  float cs = max(dot(d, uSun), 0.0);
  col += uHalo * (pow(cs, 600.0) * 1.5 + pow(cs, 24.0) * 0.30 + pow(cs, 4.0) * 0.08);
  float dusk = (1.0 - smoothstep(-0.05, 0.30, sunEl)) * day;
  col = mix(col, uSunset, clamp(dusk * pow(1.0 - abs(mu), 5.0) * (0.35 + 0.65 * pow(cs * 0.5 + 0.5, 4.0)), 0.0, 1.0));
  col *= mix(0.25, 1.0, day);
  if (mu < 0.0) col = mix(col, uHorizon * 0.55 * day, smoothstep(0.0, -0.25, mu));
  float a = clamp(uDensity * (0.15 + 0.85 * day), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
// The sky of a planet with air, from inside it or from space (the glowing limb): the atmosphere model along each line of
// sight, drawn in the background pass. Premultiplied: the stars behind are dimmed by the air's transmittance and hidden
// where the sky is bright (as the eye or a camera exposed for a sunlit scene would). Lines of sight that end on the
// ground beyond the planet's polygon edge (a sliver at its limb) are drawn opaque, as the haze that covers them.
const GLSL_ASKY_F = `
#include <common>
${GLSL_ATMOS}
uniform float aHide;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float b = dot(aCam, d);
  // distances along the line of sight to the top of the air and to the ground; near the planet from its altitude (precise
  // when the camera is low), from the point of closest approach otherwise (precise when it is far)
  bool near = aCamH < 1000.0;
  vec3 pc = aCam - b * d; float pc2 = dot(pc, pc);
  float DT = near ? b * b - (aCamH - (aRt - aRg)) * (aCamR + aRt) : aRt * aRt - pc2;
  if (DT <= 0.0) discard;
  float sq = sqrt(DT), t1 = -b + sq;
  if (t1 <= 0.0) discard;
  bool outside = aCamH > aRt - aRg;
  float t0 = outside ? -b - sq : 0.0;
  // the ground: the planet's sphere, or lower where the camera is in a basin below it (aRgE: the ground under the camera, as
  // the terrain there has it), so that lines of sight passing over the basin's rim show sky rather than nothing
  float cG = (aCamR - aRgE) * (aCamR + aRgE), DG = near ? b * b - cG : aRgE * aRgE - pc2;
  bool ground = b < 0.0 && DG > 0.0;
  // the planet's mesh covers lines of sight that dip more than its facets' depth (0.2 km) below the surface: only the sliver
  // at the limb is left to draw here
  if (ground && pc2 < (aRgE - 0.5) * (aRgE - 0.5)) discard;
  float tE = ground ? (near ? cG / (-b + sqrt(DG)) : -b - sqrt(DG)) : t1;
  vec3 S, T; aIntegrate(aCam, d, t0, tE, aSun, outside ? (ground ? 2 : 0) : 1, 24, S, T);
  vec3 c = aDisplay(S);
  float a = ground ? 1.0 : 1.0 - dot(T, vec3(1.0 / 3.0)) * exp(-aHide * dot(c, vec3(0.2126, 0.7152, 0.0722)));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

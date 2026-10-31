// index-inline-2 49 — body
// Lines 13615-13814 of readable/index-inline-2.pretty.js (statement-aligned).
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
function groundRadius(body, dirEcl, t) {
  let r = surfaceRadius(body);
  for (const c of MV.capInfo || []) {
    if (c.body !== body || !c.elev) continue;
    const sd = vunit(sitePosEcl(body, c.lat, c.lon, 0, t));
    const th = Math.acos(clamp(vdot(sd, dirEcl), -1, 1)) * RAD;
    if (th < c.ang) r += c.elev * capW(th / c.ang);
  }
  return r;
}
function buildSurfaceCaps(md) {
  const cfg = md.cfg;
  const S = LAUNCH_SITES[cfg.site];
  for (const b of ["earth", "moon", "mars"]) {
    const U = R.bodies[b].mat.uniforms;
    if (U.uCapCos) U.uCapCos.value = [2, 2, 2, 2];
  }
  const rw = cfg.runway && RUNWAYS[cfg.runway];
  if (rw) addCap("earth", rw.lat, rw.lon, 2.5, rw.elev || 0); // the landing runway first: its elevation (Edwards is 700 m up) shapes the ground
  addCap("earth", S.lat, S.lon, 2.5);
  if (cfg.landing && typeof cfg.landing === "object")
    addCap("moon", cfg.landing.lat, cfg.landing.lon, 5); // (a Shuttle flight's landing is a time)
  for (const l of cfg.legs || []) {
    if (l.site && l.body === "mars")
      addCap("mars", l.site.lat, l.site.lon, 4, l.site.elev || 0);
  }
  for (const o of md.M.objects)
    for (const sg of o.segs)
      if (
        sg.type === "surface" &&
        (sg.ref === "moon" || sg.ref === "mars" || sg.t0 > md.M.t0 + 3600)
      )
        addCap(
          sg.ref,
          sg.lat,
          sg.lon,
          sg.ref === "earth" ? 2.5 : sg.ref === "moon" ? 5 : 4,
          sg.ref === "mars" ? sg.elev || 0 : 0,
        );
  if (rw) buildRunway(md);
}

// ---------------- trajectory lines ----------------
const GLSL_TRAIL_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aT; attribute vec3 aC; varying float vT; varying vec3 vC;
void main(){ vT = aT; vC = aC; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_TRAIL_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform float uAlpha; uniform float uWinP; uniform float uWinF; varying float vT; varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  float past = step(vT, uNow);
  float a = past > 0.5 ? uAlpha : uFuture * uAlpha;
  a *= 1.0 - smoothstep(uWinP * 0.6, uWinP, uNow - vT); a *= 1.0 - smoothstep(uWinF * 0.6, uWinF, vT - uNow);
  if (a < 0.01) discard;
  vec3 c = past > 0.5 ? vC : mix(vC, vec3(0.55, 0.62, 0.72), 0.55);
  gl_FragColor = vec4(c, a);
}`;
// Engine-on arcs are drawn as a ribbon of constant on-screen width (WebGL lines are always 1 px):
// every segment is a quad whose corners are pushed sideways in screen space.
const GLSL_FAT_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aOther; attribute float aSide; attribute float aEdge; attribute float aT;
uniform vec2 uRes; uniform float uWidth;
varying float vT; varying float vSide;
void main(){
  vT = aT; vSide = aEdge;
  vec4 a = modelViewMatrix * vec4(position, 1.0);
  vec4 b = modelViewMatrix * vec4(aOther, 1.0);
  float zn = -2e-6;
  if (a.z > zn && b.z > zn) { gl_Position = vec4(4.0, 4.0, 4.0, 1.0); }
  else {
    if (a.z > zn) a = mix(a, b, (zn - a.z) / (b.z - a.z));
    else if (b.z > zn) b = mix(b, a, (zn - b.z) / (a.z - b.z));
    vec4 ca = projectionMatrix * a; vec4 cb = projectionMatrix * b;
    vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; float L = length(d);
    vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0);
    ca.xy += vec2(-dir.y, dir.x) * aSide * uWidth / uRes * ca.w;
    gl_Position = ca;
  }
#include <logdepthbuf_vertex>
}`;
const GLSL_FAT_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform float uAlpha; uniform vec3 uCol; uniform vec3 uCore; uniform float uWinP; uniform float uWinF;
varying float vT; varying float vSide;
void main(){
  #include <logdepthbuf_fragment>
  float past = step(vT, uNow); float s = abs(vSide);
  float a = (past > 0.5 ? uAlpha : min(1.0, uFuture * 1.6) * uAlpha) * (1.0 - smoothstep(0.62, 1.0, s));
  a *= 1.0 - smoothstep(uWinP * 0.6, uWinP, uNow - vT); a *= 1.0 - smoothstep(uWinF * 0.6, uWinF, vT - uNow);
  if (a < 0.01) discard;
  vec3 c = mix(uCol, uCore, (1.0 - smoothstep(0.0, 0.6, s)) * (past > 0.5 ? 0.85 : 0.3));
  if (past < 0.5) c = mix(c, vec3(0.62, 0.56, 0.5), 0.15);
  gl_FragColor = vec4(c, a);
}`;
// one dot per burn, so even a few-second correction burn is visible at any zoom: filled once fired, a ring while still ahead
const GLSL_MK_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aT; uniform float uSize; varying float vT;
void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize;
#include <logdepthbuf_vertex>
}`;
const GLSL_MK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform vec3 uCol; uniform float uWinP; uniform float uWinF; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
  if (uNow - vT > uWinP || vT - uNow > uWinF) discard;
  float past = step(vT, uNow);
  float disk = 1.0 - smoothstep(0.72, 1.0, r);
  float ring = smoothstep(0.48, 0.62, r) * (1.0 - smoothstep(0.84, 1.0, r));
  float a = past > 0.5 ? disk : ring * min(1.0, uFuture * 2.2);
  if (a < 0.02) discard;
  vec3 c = past > 0.5 ? mix(uCol, vec3(1.0, 0.93, 0.82), 1.0 - smoothstep(0.0, 0.42, r)) : uCol;
  gl_FragColor = vec4(c, a);
}`;
const TRAIL_PAD = 900; // s of path beyond the drawn window kept in the geometry, so it is rebuilt only every few minutes of flight
const TRAIL_U = {
  uRes: { value: new THREE.Vector2(1, 1) },
  uWidth: { value: 4 },
  uMk: { value: 9 },
  uWinP: { value: 1e12 },
  uWinF: { value: 1e12 },
}; // uWinP/F: seconds of path drawn behind / ahead of now
const _v2 = new THREE.Vector2();
// heliocentric points → coordinates in a display frame (planet-centred, Sun-centred or Earth–Moon rotating)
function toFrameArr(frame, ts, P) {
  const n = ts.length,
    F = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const t = ts[i];
    let x = P[3 * i],
      y = P[3 * i + 1],
      z = P[3 * i + 2];
    if (frame === "sun") {
      F[3 * i] = x;
      F[3 * i + 1] = y;
      F[3 * i + 2] = z;
      continue;
    }
    const B = planetHelio(frameBody(frame), t).r;
    x -= B[0];
    y -= B[1];
    z -= B[2];
    const Rm = frameRot(frame, t);
    if (Rm) {
      F[3 * i] = Rm[0] * x + Rm[3] * y + Rm[6] * z;
      F[3 * i + 1] = Rm[1] * x + Rm[4] * y + Rm[7] * z;
      F[3 * i + 2] = Rm[2] * x + Rm[5] * y + Rm[8] * z;
    } else {
      F[3 * i] = x;
      F[3 * i + 1] = y;
      F[3 * i + 2] = z;
    }
  }
  return F;
}

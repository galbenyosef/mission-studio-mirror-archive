// index-inline-2 10 — best
// Lines 2453-2757 of readable/index-inline-2.pretty.js (statement-aligned).
function updateSky() {
  const camH = vadd(R.O, [
    R.camera.position.x,
    R.camera.position.y,
    R.camera.position.z,
  ]);
  let best = null;
  for (const b of ["earth", "mars"]) {
    const P = helio(b, MV.tNow).r;
    const d = vsub(camH, P);
    const alt = vnorm(d) - surfaceRadius(b);
    if (alt < SKY_LOOK[b].top && (!best || alt < best.alt))
      best = { b, alt, up: vunit(d) };
  }
  const u = R.sky.material.uniforms;
  let dens = 0,
    day = 0;
  if (best) {
    const L = SKY_LOOK[best.b];
    dens = clamp(
      Math.exp(-Math.max(best.alt, 0) / L.H) *
        (1 - smoothstep(best.alt / L.top)),
      0,
      1,
    );
    const sun = vunit(vscale(camH, -1));
    u.uUp.value.set(...best.up);
    u.uSun.value.set(...sun);
    u.uZenith.value.set(L.zen);
    u.uHorizon.value.set(L.hor);
    u.uSunset.value.set(L.set);
    u.uHalo.value.set(L.halo);
    const el = vdot(sun, best.up);
    day = smoothstep((el + 0.2) / 0.26);
    R.hemi.position.set(...best.up);
    R.hemi.color.set(best.b === "mars" ? "#d8b48c" : "#9cc3ff");
    R.hemi.groundColor.set(best.b === "mars" ? "#7a4a30" : "#5a5040");
  }
  // bounce light from a sunlit lunar surface, ambient fill
  let moonFill = 0;
  if (!best) {
    const Pm = helio("moon", MV.tNow).r;
    const d = vsub(camH, Pm);
    const alt = vnorm(d) - BODIES.moon.R;
    if (alt < 400) {
      const up = vunit(d);
      const el = vdot(vunit(vscale(camH, -1)), up);
      moonFill = clamp(el * 3, 0, 1) * (1 - alt / 400);
      R.hemi.position.set(...up);
      R.hemi.color.set("#000000");
      R.hemi.groundColor.set("#8f8a84");
    }
  }
  R.ambient.intensity = MV.layers.fill === false ? 0.04 : 0.35;
  u.uDensity.value = dens;
  R.sky.visible = dens > 0.002 && !(best && R.airSky[best.b]);
  for (const b of ["mars"]) {
    const U = R.bodies[b].mat.uniforms;
    if (best && best.b === b) {
      U.uFogK.value = dens / 90;
      U.uFogColor.value
        .copy(u.uHorizon.value)
        .multiplyScalar(0.25 + 0.75 * day);
    } else U.uFogK.value = 0;
  }
  // the physically based air: the camera relative to each planet (double precision here, so the shaders get its altitude
  // exactly), and the Sun seen through the air (reddened and dimmed near the horizon, also from orbit at sunrise)
  let sunT = null;
  let wb = [1, 1, 1];
  for (const name in R.airSky) {
    const A = ATMOS[name],
      U = A.U;
    if (!A.lutT) {
      R.airSky[name].visible = false;
      continue;
    } // (tables still to come)
    const rel = vsub(camH, helio(name, MV.tNow).r),
      r = vnorm(rel),
      h = r - A.Rg,
      sunD = vunit(vscale(camH, -1));
    U.aCam.value.set(rel[0], rel[1], rel[2]);
    U.aCamR.value = r;
    U.aCamH.value = h;
    U.aRgE.value = Math.min(
      A.Rg,
      groundRadius(name, vscale(rel, 1 / r), MV.tNow),
    );
    R.airSky[name].visible = r < A.Rg * 120;
    const sT =
        r < A.Rg + A.top + 2000 ? atmosSunTransmittance(name, rel, sunD) : null,
      ex = atmosExposure(name, h, sT);
    U.aWB.value.set(...ex.wb);
    U.aGrade.value.set(...ex.grade);
    U.aExpo.value = ex.expo;
    // the airglow shows as a thin line on the limb seen from above it, not as a glow around a camera inside the layer
    const gk = smoothstep((h - 110) / 40);
    U.aGlow.value.set(A.glow[0] * gk, A.glow[1] * gk, A.glow[2] * gk);
    if (sT) {
      sunT = sT;
      wb = ex.wb.map((x) => x * ex.expo);
    }
  }
  const st = sunT ? sunT.map((x, i) => Math.min(x * wb[i], 1.2)) : [1, 1, 1];
  R.sunLight.color.setRGB(st[0], st[1], st[2]);
  R.bodies.sun.mat.color.setRGB(1.0 * st[0], 0.96 * st[1], 0.86 * st[2]);
  R.sunGlow.material.color.setRGB(st[0], st[1], st[2]);
  R.sunGlow2.material.color.setRGB(st[0], st[1], st[2]);
  R.hemi.intensity = best ? 1.6 * dens * day : 1.4 * moonFill;
  // night fill: with "Cinematic fill light" on, the ground near the camera stays readable after dark (on the Moon it stands in for earthshine)
  const fillOn = MV.layers.fill !== false;
  for (const n of ["earth", "moon", "mars"]) {
    const U = R.bodies[n].mat.uniforms;
    if (U.uFill) U.uFill.value.set(0, 0, 0);
  }
  if (fillOn) {
    let fb = null,
      near = 0,
      night = 0;
    if (best) {
      fb = best.b;
      near = 1 - smoothstep((best.alt - 40) / 400);
      night = 1 - day;
    } else {
      const Pm = helio("moon", MV.tNow).r;
      const d = vsub(camH, Pm);
      const alt = vnorm(d) - BODIES.moon.R;
      if (alt < 600) {
        fb = "moon";
        near = 1 - smoothstep((alt - 40) / 500);
        const el = vdot(vunit(vscale(camH, -1)), vunit(d));
        night = 1 - smoothstep((el + 0.05) / 0.2);
      }
    }
    if (fb && near * night > 0.001) {
      const k = near * night,
        c =
          fb === "mars"
            ? [0.2, 0.2, 0.26]
            : fb === "moon"
              ? [0.13, 0.15, 0.2]
              : [0.07, 0.08, 0.12];
      R.bodies[fb].mat.uniforms.uFill.value.set(c[0] * k, c[1] * k, c[2] * k);
      if (best) {
        R.hemi.intensity += 0.55 * k * dens;
        R.hemi.color.lerp(new THREE.Color("#8ea2cc"), k);
        R.hemi.groundColor.lerp(new THREE.Color("#3d3833"), k);
      }
    }
  }
  R.skyDens = dens * (0.15 + 0.85 * day);
  {
    // the surround for image-based lighting
    const U = R.envMat.uniforms,
      sunD = vunit(vscale(camH, -1));
    U.uDens.value = clamp(dens * 4, 0, 1);
    U.uDay.value = day;
    U.uFill.value = fillOn ? 0.035 : 0.01;
    if (best) {
      const L = SKY_LOOK[best.b];
      U.uUp.value.set(...best.up);
      U.uZen.value.set(L.zen);
      U.uHor.value.set(L.hor);
      U.uGnd.value.set(best.b === "mars" ? "#8a5a3a" : "#6a6050");
    }
    let pl = null;
    for (const b of ["earth", "moon", "mars"]) {
      const d = vsub(helio(b, MV.tNow).r, camH),
        r = vnorm(d),
        R0 = surfaceRadius(b);
      if (r < R0 * 60 && (!pl || r / R0 < pl.k))
        pl = { b, d, r, R0, k: r / R0 };
    }
    if (pl) {
      const dir = vunit(pl.d),
        lit = clamp(0.5 - 0.5 * vdot(dir, sunD), 0, 1);
      U.uPl.value.set(...dir);
      U.uPlCos.value = Math.sqrt(Math.max(0, 1 - (pl.R0 / pl.r) ** 2));
      U.uPlCol.value
        .set(
          pl.b === "earth"
            ? "#6f8fb8"
            : pl.b === "mars"
              ? "#a0704c"
              : "#8a8680",
        )
        .multiplyScalar(0.2 + 0.7 * lit);
    } else U.uPlCos.value = 2;
    if (R.envN++ % 6 === 0) {
      R.envCam.update(R.renderer, R.envScene);
      R.envPM = R.pmrem.fromCubemap(R.envRT.texture, R.envPM);
      R.scene.environment = R.envPM.texture;
    }
  }
}

// ==== 25_film.js
// ============================================================================
// Film look (the "Film look" layer): the frame as a camera on film would show it. Light brighter than white blooms
// into its surroundings (the Sun, a rocket's flame, the glow of an entry), highlights roll off instead of clipping, the
// corners fall off a little and fine grain moves over the picture. The scene is drawn into a floating-point target
// instead of the screen, so light keeps its strength above white, and a last pass draws it to the screen. With the layer
// off the scene goes straight to the screen as before.
// ============================================================================
// Materials write the same sRGB-encoded values into any target as onto the screen (three.js would write linear values
// into a target), so the scene looks the same either way; the app's own shaders already write display values.
THREE.ShaderChunk.colorspace_fragment =
  "gl_FragColor = sRGBTransferOETF( gl_FragColor );";
const FILM = {
  ok: null,
  rt: null,
  down: [],
  up: [],
  w: 0,
  h: 0,
  samples: -1,
  scene: null,
  cam: null,
  quad: null,
  mat: null,
};
const FILM_LEVELS = 6; // bloom levels, each half the size of the one before (from half the screen down to 1/64)
const GLSL_FILM_V =
  "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const GLSL_FILM_LIB = `
varying vec2 vUv;
// A texel holding NaN or infinity (all its exponent bits set), taken as no light. A shader can slip one into the float
// target (pow() of a negative number, a sum past the half float's 65504); on the screen it would be clamped away, but here
// it stays, and every filter that reads it turns its whole footprint black.
bvec3 nonFinite(vec3 c){ return equal(floatBitsToUint(c) & uvec3(0x7f800000u), uvec3(0x7f800000u)); }
vec3 finite(vec3 c){ return mix(c, vec3(0.0), nonFinite(c)); }
vec3 toLinear(vec3 c){ c = max(c, 0.0); return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// a 2×2-texel box at the centre and four diagonal taps half a texel out (the "dual filter" downsample)
vec3 down(sampler2D t, vec2 uv, vec2 h){ return (finite(texture2D(t, uv).rgb) * 4.0 + finite(texture2D(t, uv - h).rgb) + finite(texture2D(t, uv + h).rgb) + finite(texture2D(t, uv + vec2(h.x, -h.y)).rgb) + finite(texture2D(t, uv - vec2(h.x, -h.y)).rgb)) / 8.0; }
// a tent of eight taps (the "dual filter" upsample)
vec3 up(sampler2D t, vec2 uv, vec2 h){
  vec3 s = texture2D(t, uv + vec2(-2.0 * h.x, 0.0)).rgb + texture2D(t, uv + vec2(2.0 * h.x, 0.0)).rgb + texture2D(t, uv + vec2(0.0, 2.0 * h.y)).rgb + texture2D(t, uv + vec2(0.0, -2.0 * h.y)).rgb;
  s += 2.0 * (texture2D(t, uv + vec2(-h.x, h.y)).rgb + texture2D(t, uv + vec2(h.x, h.y)).rgb + texture2D(t, uv + vec2(h.x, -h.y)).rgb + texture2D(t, uv + vec2(-h.x, -h.y)).rgb);
  return s / 12.0;
}`;
const GLSL_FILM_F = {
  // what blooms: the light above a soft threshold, taken in linear light from the screen-sized picture
  // (the light over the threshold eased off, so a glint ten times white does not throw a halo ten times as wide)
  bright: `uniform sampler2D tSrc; uniform vec2 uH; uniform float uThr, uKnee, uCap;
void main(){
  vec3 c = toLinear(down(tSrc, vUv, uH));
  float br = max(c.r, max(c.g, c.b)), q = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee);
  q = q * q / (4.0 * uKnee + 1e-4);
  float e = max(q, br - uThr); e /= 1.0 + e / uCap;
  gl_FragColor = vec4(c * e / max(br, 1e-4), 1.0);
}`,
  down: `uniform sampler2D tSrc; uniform vec2 uH; void main(){ gl_FragColor = vec4(down(tSrc, vUv, uH), 1.0); }`,
  // back up through the levels, each adding its own blur: a sum of ever wider glows that falls off smoothly
  up: `uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uH; uniform float uScatter;
void main(){ gl_FragColor = vec4(texture2D(tAdd, vUv).rgb + uScatter * up(tSrc, vUv, uH), 1.0); }`,
  comp: `uniform sampler2D tSrc; uniform sampler2D tBloom; uniform vec2 uH; uniform float uBloom, uVig, uGrain, uGrainPx, uTime; uniform vec4 uFrame;
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb;
  if (any(nonFinite(s))) { // a pixel the scene left without a number: its neighbours' light instead
    vec2 px = 1.0 / vec2(textureSize(tSrc, 0));
    s = 0.25 * (finite(texture2D(tSrc, vUv + vec2(px.x, 0.0)).rgb) + finite(texture2D(tSrc, vUv - vec2(px.x, 0.0)).rgb) + finite(texture2D(tSrc, vUv + vec2(0.0, px.y)).rgb) + finite(texture2D(tSrc, vUv - vec2(0.0, px.y)).rgb));
  }
  vec3 lin = toLinear(s) + uBloom * up(tBloom, vUv, uH);
  const float a = 0.85; // above this the light rolls off toward white instead of clipping
  lin = mix(lin, a + (1.0 - a) * (1.0 - exp(-(lin - a) / (1.0 - a))), step(a, lin));
  vec3 c = toSRGB(lin);
  vec2 d = gl_FragCoord.xy - (uFrame.xy + 0.5 * uFrame.zw); // fall-off toward the corners of the film frame
  c *= 1.0 - uVig * smoothstep(0.3, 1.0, length(d) / (0.5 * length(uFrame.zw)));
  vec2 g = floor(gl_FragCoord.xy / uGrainPx), o = vec2(fract(uTime * 7.31), fract(uTime * 11.17)) * 1031.0; // a new grain every frame
  float n = hash(g + o) + hash(g + o + 17.13) - 1.0, l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += n * uGrain * (0.3 + 2.8 * l * (1.0 - l)); // strongest in the mid-tones
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};
function filmSupported() {
  if (FILM.ok !== null) return FILM.ok;
  const r = R.renderer;
  FILM.ok = !!(
    r.capabilities.isWebGL2 &&
    (r.extensions.has("EXT_color_buffer_float") ||
      r.extensions.has("EXT_color_buffer_half_float"))
  );
  return FILM.ok;
}
function filmTarget(w, h, samples) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: samples >= 0,
    samples: Math.max(samples, 0),
  });
}
function filmFree() {
  if (FILM.rt) FILM.rt.dispose();
  for (const t of [...FILM.down, ...FILM.up]) t.dispose();
  FILM.rt = null;
  FILM.down = [];
  FILM.up = [];
  FILM.w = FILM.h = 0;
}
// Before the scene is drawn: true when it goes into the film target (sized to the screen), false to draw straight to it
const _filmSize = new THREE.Vector2();

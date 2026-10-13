// index-inline-2 56 — exh
// Lines 15838-16128 of readable/index-inline-2.pretty.js (statement-aligned).
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
const GLSL_PUFF_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aUV; attribute float aTau; attribute vec3 aSun; attribute vec3 aAmb; attribute float aFog; attribute float aFade;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vWP; varying float vFade;
void main(){ vUV = aUV; vTau = aTau; vSun = aSun; vAmb = aAmb; vFog = aFog; vFade = aFade;
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const GLSL_PUFF_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_EXH_COMMON}
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = vUV.xy; float n = bil(q * 0.45 + vec2(vUV.z * 0.137, vUV.z * 0.071));
  float rEdge = 0.75 * (0.7 + 0.6 * n), x = length(q) / rEdge; if (x >= 1.0) discard; // the puff's radius is 0.75 of the quad's half-size
  float chord = sqrt(1.0 - x * x);
  vec3 V = normalize(cameraPosition - vWP), right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // a soft blob, its outline faded over most of its radius; shaded nearly flat, as the smoke it stands for (a stretch of
  // column seen end-on, a patch of the wide cloud high up) has no round surface to catch the light
  vec4 c = smoke(vTau * chord * (0.45 + 1.1 * n), 1.0 - smoothstep(0.25, 1.0, x), normalize(0.4 * (right * q.x + up * q.y) / rEdge + V * chord), n);
  if (max(max(c.r, c.g), c.b) < 0.0015 && c.a < 0.002) discard;
  gl_FragColor = vec4(c.rgb, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = c.a;
}`;
const EXH_PUFF_H = [50, 68]; // km: the ribbon gives way to puffs between these heights
const EXH_SUB = 400; // points the ribbon may add between samples near the engines
function disposeExhaust() {
  for (const k of ["mesh", "puffs"])
    if (EXH[k]) {
      R.scene.remove(EXH[k]);
      EXH[k].geometry.dispose();
      EXH[k].material.dispose();
      EXH[k] = null;
    }
  EXH.n = 0;
}
// Samples along the ascent, from liftoff until the vehicle reaches orbit (or rises out of the atmosphere's reach): where the
// engines were, their exhaust's spread, thickness, colour and lifetime, the wind there, a coordinate along the trail for the
// billows.
function buildExhaust(md) {
  disposeExhaust();
  const c = craftById("ship"),
    L = md.L,
    site = LAUNCH_SITES[md.cfg.site];
  if (!c || !L || !site || !c.o.segs.length) return;
  const asc = c.o.segs[0];
  if (!asc.meta || asc.meta.phase !== "ascent") return;
  const t0 = md.M.t0,
    R0 = BODIES.earth.R,
    stand = padStandH() / 1000;
  let seed = 0;
  for (const ch of md.cfg.launch + md.cfg.site)
    seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const wind = exhWind(seed);
  const bst = L.stages[0].parallel ? L.stages[0] : null;
  const base =
    3.5 *
    Math.max(
      L.diameter,
      bst && bst.booster ? 2 * (bst.booster.offset + bst.geom[0][1]) : 0,
    ); // m: the column just behind the engines
  const S = [];
  let te = t0 + 0.05,
    u = 0,
    prev = null,
    dtP = 0,
    vP = 0;
  while (te < asc.t1) {
    const { s, flows } = exhFlows(c, L, te, t0);
    if (!s) break;
    const h = vnorm(s.r) - R0;
    if (h > 450) break;
    const om = bodyOmegaEcl("earth", te),
      va = vsub(s.v, vcross(om, s.r)),
      vAir = vnorm(va) * 1000;
    const ax = s.dir && vnorm(s.dir) > 0.5 ? vunit(s.dir) : vunit(s.r);
    const r = vadd(s.r, vscale(ax, stand)); // the engines: the stack stands on its state point (app/40_missionview.js anchorY)
    const w0 = exhW0(base, h),
      ice = exhIce(h);
    let kf = 0,
      life = 0,
      col = [0, 0, 0];
    for (const [p, f] of flows) {
      const P = EXH_PROP[p] || EXH_PROP.kerolox,
        k = (P.k + P.ice * ice) * f;
      kf += k;
      life += P.life * k;
      for (let j = 0; j < 3; j++) col[j] += P.col[j] * k;
    }
    if (kf > 0) {
      life /= kf;
      col = col.map((x) => x / kf);
    } else {
      life = 600;
      col = [0.9, 0.9, 0.9];
    }
    life *= 1 + 2 * smoothstep((h - 60) / 40); // ice high up lasts
    const tau0 = (EXH_C * kf) / Math.max(vAir, 15) / w0;
    const lf = localFrame("earth", s.r, te),
      [we, wn] = wind(h),
      dW = vscale(vadd(vscale(lf.east, we), vscale(lf.north, wn)), 0.001); // km/s
    if (prev)
      u += (0.5 * (vAir + vP) * dtP) / Math.max(0.5 * (w0 + prev.w0), 1); // along the path through the air, in trail widths
    const x = { te, r, dW, h, w0, tau0, col, life, u, vx: exhVx(h) };
    S.push(x);
    prev = x;
    dtP = clamp((0.35 * w0) / Math.max(vAir, 1), 0.08, 2.5);
    vP = vAir;
    te += dtP;
  }
  if (S.length < 2) return;
  EXH.n = S.length;
  EXH.t0 = t0;
  EXH.t1 = asc.t1;
  const N = S.length,
    F = (k) => new Float64Array(k * N); // the samples as flat arrays, for the work done every frame
  const NR = N + 1 + EXH_SUB; // the ribbon's points: kept samples and the extra ones near the engines
  Object.assign(EXH, {
    TE: F(1),
    RX: F(3),
    DW: F(3),
    W0: F(1),
    TAU0: F(1),
    LIFE: F(1),
    U: F(1),
    VX: F(1),
    H: F(1),
    COL: F(3),
    P: new Float64Array(3 * (N + 1)),
    dH: new Float64Array(N + 1),
    W: new Float64Array(N + 1),
    keep: new Int32Array(N + 1),
    ra: new Int32Array(NR),
    rb: new Int32Array(NR),
    rf: new Float64Array(NR),
    rg: new Float64Array(3 * NR),
  });
  S.forEach((x, i) => {
    EXH.TE[i] = x.te;
    EXH.W0[i] = x.w0;
    EXH.TAU0[i] = x.tau0;
    EXH.LIFE[i] = x.life;
    EXH.U[i] = x.u;
    EXH.VX[i] = x.vx;
    EXH.H[i] = x.h;
    for (let k = 0; k < 3; k++) {
      EXH.RX[3 * i + k] = x.r[k];
      EXH.DW[3 * i + k] = x.dW[k];
      EXH.COL[3 * i + k] = x.col[k];
    }
  });
  const cap = NR;
  const g = new THREE.BufferGeometry(),
    A = (k) =>
      new THREE.BufferAttribute(new Float32Array(2 * cap * k), k).setUsage(
        THREE.DynamicDrawUsage,
      );
  g.setAttribute("position", A(3));
  g.setAttribute("aUV", A(3));
  g.setAttribute("aTau", A(1));
  g.setAttribute("aSun", A(3));
  g.setAttribute("aAmb", A(3));
  g.setAttribute("aFog", A(1));
  g.setAttribute("aSide", A(3));
  g.setAttribute("aFade", A(1));
  const idx = new Uint32Array(6 * (cap - 1));
  for (let i = 0; i < cap - 1; i++) {
    const a = 2 * i;
    idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], 6 * i);
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const U = {
    tNoise: { value: EXH.tex },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uFogCol: { value: new THREE.Color(0, 0, 0) },
    uExpo: { value: 1 },
  }; // shared by both
  const mk = (geo, vs, fs) => {
    const ms = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: U,
      }),
    );
    ms.frustumCulled = false;
    ms.renderOrder = 4;
    ms.visible = false;
    R.scene.add(ms);
    return ms;
  };
  EXH.mesh = mk(g, GLSL_EXH_V, GLSL_EXH_F);
  {
    // the puffs: as many as the trail could need (one per ribbon point at most)
    const np = NR,
      gp = new THREE.BufferGeometry(),
      B = (k) =>
        new THREE.BufferAttribute(new Float32Array(4 * np * k), k).setUsage(
          THREE.DynamicDrawUsage,
        );
    gp.setAttribute("position", B(3));
    gp.setAttribute("aUV", B(3));
    gp.setAttribute("aTau", B(1));
    gp.setAttribute("aSun", B(3));
    gp.setAttribute("aAmb", B(3));
    gp.setAttribute("aFog", B(1));
    gp.setAttribute("aFade", B(1));
    const ix = new Uint32Array(6 * np);
    for (let i = 0; i < np; i++) {
      const a = 4 * i;
      ix.set([a, a + 1, a + 2, a, a + 2, a + 3], 6 * i);
    }
    gp.setIndex(new THREE.BufferAttribute(ix, 1));
    const uvA = gp.attributes.aUV.array;
    for (let i = 0; i < np; i++)
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].forEach(([x, y], k) => {
        uvA[12 * i + 3 * k] = x;
        uvA[12 * i + 3 * k + 1] = y;
      });
    EXH.puffs = mk(gp, GLSL_PUFF_V, GLSL_PUFF_F);
  }
}
// sunlight reaching geocentric point p (km) along direction sd (unit, toward the Sun): [r, g, b], 0 in Earth's shadow
const _exhT = [0, 0, 0];
function exhSunlight(px, py, pz, sd) {
  const R0 = BODIES.earth.R,
    rr = Math.sqrt(px * px + py * py + pz * pz),
    h = rr - R0,
    d = px * sd[0] + py * sd[1] + pz * sd[2];
  let ht, am, sh;
  // the shadow's soft edge: haze, clouds and hills block light that skims the ground
  if (d >= 0) {
    ht = h;
    const mu = d / rr,
      k = (R0 + Math.max(h, 0)) / EXH_H;
    am = Math.sqrt(k * k * mu * mu + 2 * k + 1) - k * mu;
    sh = 1 - (1 - smoothstep((h + 1.5) / 7.5)) * (1 - smoothstep(mu / 0.035));
  } // air mass along the slant path up and out
  else {
    ht = Math.sqrt(Math.max(rr * rr - d * d, 0)) - R0;
    am =
      Math.sqrt((Math.PI * (R0 + Math.max(ht, 0))) / (2 * EXH_H)) *
      (1 + smoothstep((h - ht) / (3 * EXH_H)));
    sh = smoothstep((ht + 1.5) / 7.5);
  } // through the air down to the ray's lowest point (and up again)
  const tr = Math.exp(-Math.max(ht, 0) / EXH_H) * am;
  for (let j = 0; j < 3; j++)
    _exhT[j] = sh * Math.min(1, Math.exp(-EXH_EXT[j] * (tr - 1)));
  return _exhT;
}
const _exhV = new THREE.Vector3(),
  _exhR = new THREE.Vector3(),
  _exhU = new THREE.Vector3();
const EXH_TINT = [0.82, 0.9, 1.0],
  EXH_FIRE = [1.0, 0.55, 0.24]; // skylight; the flame's light

// index-inline-2 17 — tri
// Lines 4474-4802 of readable/index-inline-2.pretty.js (statement-aligned).
const GLSL_PLUME_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform vec3 uCore; uniform float uI; uniform float uTime; uniform float uDiam; uniform float uDF; uniform float uDL; uniform float uCF; uniform float uSoot; uniform sampler2D tNoise;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
// The flame: a cone of hot gas, white-hot at the nozzle and the propellant's colour beyond, broken up by turbulence that
// streams down it (two noise octaves scrolling with the flow, stretched along the axis), its rim eroded by the same
// turbulence so it does not read as a smooth cone, and the shock diamonds just behind the nozzle. Additive.
void main(){
  #include <logdepthbuf_fragment>
  // (clamped: with multisampling, a pixel on the cone's rim can be shaded at its centre just outside the cone, where vUv
  // runs past 0…1, and pow() of a number below 0 is undefined: NaN on most GPUs, a black dot under the film look)
  float along = clamp(1.0 - vUv.y, 0.0, 1.0), around = vUv.x;
  vec3 V = normalize(cameraPosition - vP);
  float edge = abs(dot(normalize(vN), V));
  float t = uTime;
  float n1 = texture2D(tNoise, vec2(around * 2.0, along * 1.6 - t * 1.7)).r, n2 = texture2D(tNoise, vec2(around * 5.0 + 0.3, along * 4.5 - t * 3.1)).r;
  float turb = 0.55 * n1 + 0.45 * n2; // 0…1, mostly round 0.5
  // the rim: eroded more and more down the flame (the tail breaks into wisps), and thin at the edge of the cone
  float rim = pow(edge, 1.3) * (1.0 - smoothstep(0.35 + 0.65 * turb, 1.0, along));
  // the body: the turbulence shows as bright eddies against darker gas, not as a wash over a flat cone
  float body = rim * pow(1.0 - along, 1.5) * mix(0.12, 1.3, turb * turb) * 0.65;
  float flick = 0.9 + 0.1 * sin(t * 37.0 + along * 23.0) * sin(t * 11.0);
  // shock diamonds: spaced by the nozzle size and confined to the stretch just behind it, however long the flame
  // (bright knots down the flame's axis, so they are weighted to where the cone faces the camera and not drawn as rings
  // round it, and broken up by the turbulence)
  float diam = uDiam * smoothstep(0.55, 1.0, sin(along * uDF - t * 3.0)) * (1.0 - smoothstep(uDL * 0.55, uDL, along)) * (1.0 - along) * pow(edge, 3.0) * (0.5 + 0.8 * n1);
  // the colour: white-hot core, the propellant's colour, deepening toward red-orange at the eroded tail
  vec3 col = mix(uCore, uColor, smoothstep(0.0, uCF, along));
  col = mix(col, col * vec3(1.0, 0.55, 0.3), smoothstep(0.5, 1.0, along) * 0.6);
  // a sooty propellant's tail: the unburnt carbon dims the flame where the gas has cooled, most between the eddies
  col *= 1.0 - uSoot * smoothstep(0.3, 1.0, along) * (0.35 + 0.4 * (1.0 - turb));
  gl_FragColor = vec4(col * (body * flick + diam * 0.8) * uI, 1.0);
}`;
function makePlume() {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
  geo.translate(0, -0.5, 0); // top (v=1) at y=0, extends to y=-1
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_PLUME_V,
    fragmentShader: GLSL_PLUME_F,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uCore: { value: new THREE.Color() },
      uI: { value: 1 },
      uTime: { value: 0 },
      uDiam: { value: 0 },
      uDF: { value: 46 },
      uDL: { value: 1 },
      uCF: { value: 0.45 },
      uSoot: { value: 0 },
      tNoise: { value: null },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return mesh;
}
// shapes the open cone: radius at the nozzle r0, at the tail r1, length len
function shapePlume(p, r0, r1, len) {
  const pos = p.geometry.attributes.position;
  if (!p.userData.base) p.userData.base = Float32Array.from(pos.array);
  const b = p.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const x = b[3 * i],
      y = b[3 * i + 1],
      z = b[3 * i + 2];
    const f = -y;
    const r = r0 + (r1 - r0) * Math.pow(f, 0.7);
    pos.array[3 * i] = x * r;
    pos.array[3 * i + 1] = y * len;
    pos.array[3 * i + 2] = z * r;
  }
  pos.needsUpdate = true;
}
function makeChutes(kind, n, diam, capR) {
  const g = new THREE.Group();
  const colr = kind === "dgb" ? "#d9662b" : "#e05a25";
  const canopy = new THREE.SphereGeometry(
    diam / 2,
    32,
    10,
    0,
    TAU,
    0,
    Math.PI / 2.4,
  );
  const matC = patternMat("chute", colr);
  const offs =
    n === 3
      ? [
          [-0.55, 0],
          [0.55, 0],
          [0, 0.6],
        ]
      : n === 2
        ? [
            [-0.5, 0],
            [0.5, 0],
          ]
        : [[0, 0]];
  const riser = diam * 1.25;
  for (const [ox, oz] of offs) {
    const c = new THREE.Mesh(canopy, matC);
    const cx = ox * diam * 0.85,
      cz = oz * diam * 0.85;
    c.position.set(cx, riser, cz);
    g.add(c);
    const pts = [];
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12;
      const rr = (diam / 2) * Math.sin(Math.PI / 2.4);
      pts.push(
        new THREE.Vector3(
          cx + Math.cos(a) * rr,
          riser + (diam / 2) * Math.cos(Math.PI / 2.4),
          cz + Math.sin(a) * rr,
        ),
        new THREE.Vector3(0, 0, 0),
      );
    }
    g.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0xbbbbbb,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );
  }
  return g;
}
// The shock layer of an entry and its glowing wake. Coming into an atmosphere at several km/s, a vehicle drives a shock wave
// ahead of the faces turned into the flow; the air squeezed between the shock and those faces is heated to thousands of
// degrees and glows. It is brightest where the flow meets the surface head on (a capsule's heat shield; the Shuttle's nose
// cap and wing leading edges, and at its 40° angle of attack its whole belly), pours round the edges and streams away behind
// as a wake. All of it is soft points scattered over the vehicle's own surface (plasmaGeometry): the shock layer stands a
// little off the faces that meet the flow and fades out toward the sheltered side, a wider, fainter copy of it is the glow
// of the hot gas around them, and the wake is gas from it carried back along the flow, spreading and cooling.
const PLASMA_N = 6000,
  HALO_N = 300,
  WAKE_N = 12000;
const GLSL_SHOCK_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aN; attribute float aR; attribute float aP; attribute vec3 aJ;
uniform vec3 uV; uniform float uOff, uSize, uScale, uPx, uTime, uLen, uWake, uSpread, uHeat; uniform vec2 uScreen;
varying float vT; varying float vA; varying vec2 vDir; varying float vAn;
void main(){
  float w = smoothstep(0.0, 1.0, dot(aN, uV)); // facing into the flow (uV: the way the vehicle moves through the air)
  vec3 p = position + uV * uOff * (0.3 + w) + aN * uOff * 0.3; // the shock stands off ahead of the face
  float size = uSize * (0.55 + 0.65 * w), a, temp = w * mix(0.5, 1.0, clamp(uHeat, 0.0, 1.0)); // a cooler, redder glow at first
  if (uWake > 0.5) { // carried back along the flow, spreading and fading; more of it near the vehicle, where it is brightest
    float f = fract(aP + uTime * (0.35 + 0.3 * aR)), age = f * f;
    vec3 lat = aJ - uV * dot(aJ, uV);
    p += -uV * age * uLen + lat * age * uLen * uSpread * (0.5 + aR);
    size *= 1.2 + 2.5 * age; a = 1.0 - age; a *= a * smoothstep(0.0, 0.04, age); temp *= 1.0 - 0.7 * sqrt(age);
  } else a = 0.85 + 0.15 * sin(dot(position, uV) * 0.9 - uTime * 6.0 + aR * 2.0); // the layer shimmers, in waves running back along it
  vT = temp; vA = a * w * w;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = size * uScale * uPx / max(-mv.z, 1e-9);
  gl_PointSize = clamp(px, 1.0, 640.0);
  vDir = vec2(1.0, 0.0); vAn = 1.0;
  if (uWake > 0.5) { // drawn as a streak along the flow, as far as the flow lies across the line of sight
    vec4 c1 = projectionMatrix * (modelViewMatrix * vec4(p - uV * size, 1.0));
    vec2 d = (c1.xy / c1.w - gl_Position.xy / gl_Position.w) * uScreen * 0.5; float ld = length(d);
    if (ld > 1e-6 && c1.w > 0.0) { vDir = vec2(d.x, -d.y) / ld; vAn = mix(1.0, 0.28, clamp(ld / max(px, 1e-6), 0.0, 1.0)); }
  }
  if (vA < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // nothing on the sheltered side
  #include <logdepthbuf_vertex>
}`;
const GLSL_SHOCK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uI; uniform vec3 uHot, uWarm, uCool;
varying float vT; varying float vA; varying vec2 vDir; varying float vAn;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5; float al = dot(q, vDir), ac = dot(q, vec2(-vDir.y, vDir.x)) / vAn;
  float d2 = (al * al + ac * ac) * 4.0; if (d2 > 1.0) discard;
  float s = exp(-3.0 * d2) * (1.0 - d2) / vAn; // a streak keeps the light of the round blob it is squeezed from
  vec3 col = mix(uCool, mix(uWarm, uHot, smoothstep(0.6, 1.0, vT)), smoothstep(0.05, 0.5, vT));
  gl_FragColor = vec4(col * s * vA * uI, 1.0);
}`;
// kind: 'shell' (the shock layer), 'halo' (the glow round it) or 'wake'
function plasmaPoints(kind) {
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_SHOCK_V,
    fragmentShader: GLSL_SHOCK_F,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uV: { value: new THREE.Vector3(0, 1, 0) },
      uOff: { value: 1 },
      uSize: { value: 1 },
      uScale: { value: 0.001 },
      uPx: { value: 800 },
      uTime: { value: 0 },
      uLen: { value: 100 },
      uWake: { value: kind === "wake" ? 1 : 0 },
      uSpread: { value: 0.08 },
      uHeat: { value: 1 },
      uScreen: { value: new THREE.Vector2(1, 1) },
      uI: { value: 0 },
      uHot: { value: new THREE.Color("#fff0d2") },
      uWarm: { value: new THREE.Color("#ff9442") },
      uCool: { value: new THREE.Color("#ff3a52") },
    },
  });
  const p = new THREE.Points(new THREE.BufferGeometry(), m);
  p.frustumCulled = false;
  p.renderOrder = 6;
  p.userData.kind = kind;
  return p;
}
function makePlasma() {
  const g = new THREE.Group(),
    shell = plasmaPoints("shell"),
    halo = plasmaPoints("halo"),
    wake = plasmaPoints("wake");
  g.add(halo, shell, wake);
  g.userData = { shell, halo, wake, geo: null };
  return g;
}
// The space round a model: its surface drawn into voxels (each a 128th of the model's largest size), then the empty voxels
// flood-filled from the edges of the box round it. What the fill cannot reach is enclosed by the model: a payload in a
// closed bay, the bay doors' inner faces, a cabin behind its glass, a capsule's insides. tri: 18 numbers a triangle (its
// corners, then their normals), lo/hi: the box. Returns out(x, y, z): true in the space outside.
function outsideField(tri, lo, hi) {
  const v = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 128 || 1,
    o = lo.map((x) => x - 2 * v);
  const n = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / v) + 5),
    nxy = n[0] * n[1],
    cell = new Uint8Array(nxy * n[2]); // 1 surface, 2 outside
  const at = (x, y, z) => {
    const i = Math.floor((x - o[0]) / v),
      j = Math.floor((y - o[1]) / v),
      k = Math.floor((z - o[2]) / v);
    return i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]
      ? -1
      : i + j * n[0] + k * nxy;
  };
  for (let T = 0; T < tri.length; T += 18) {
    // points at most half a voxel apart over each triangle
    const e = Math.max(
      Math.hypot(
        tri[T + 3] - tri[T],
        tri[T + 4] - tri[T + 1],
        tri[T + 5] - tri[T + 2],
      ),
      Math.hypot(
        tri[T + 6] - tri[T],
        tri[T + 7] - tri[T + 1],
        tri[T + 8] - tri[T + 2],
      ),
      Math.hypot(
        tri[T + 6] - tri[T + 3],
        tri[T + 7] - tri[T + 4],
        tri[T + 8] - tri[T + 5],
      ),
    );
    const m = Math.max(1, Math.ceil(e / (0.5 * v)));
    for (let a = 0; a <= m; a++)
      for (let b = 0; a + b <= m; b++) {
        const u = a / m,
          w = b / m,
          s = 1 - u - w;
        const q = at(
          s * tri[T] + u * tri[T + 3] + w * tri[T + 6],
          s * tri[T + 1] + u * tri[T + 4] + w * tri[T + 7],
          s * tri[T + 2] + u * tri[T + 5] + w * tri[T + 8],
        );
        if (q >= 0) cell[q] = 1;
      }
  }
  const queue = new Int32Array(cell.length);
  let head = 0,
    tail = 0;
  queue[tail++] = 0;
  cell[0] = 2; // a corner of the box, outside the model
  while (head < tail) {
    const q = queue[head++],
      i = q % n[0],
      j = Math.floor(q / n[0]) % n[1],
      k = Math.floor(q / nxy);
    if (i > 0 && !cell[q - 1]) {
      cell[q - 1] = 2;
      queue[tail++] = q - 1;
    }
    if (i < n[0] - 1 && !cell[q + 1]) {
      cell[q + 1] = 2;
      queue[tail++] = q + 1;
    }
    if (j > 0 && !cell[q - n[0]]) {
      cell[q - n[0]] = 2;
      queue[tail++] = q - n[0];
    }
    if (j < n[1] - 1 && !cell[q + n[0]]) {
      cell[q + n[0]] = 2;
      queue[tail++] = q + n[0];
    }
    if (k > 0 && !cell[q - nxy]) {
      cell[q - nxy] = 2;
      queue[tail++] = q - nxy;
    }
    if (k < n[2] - 1 && !cell[q + nxy]) {
      cell[q + nxy] = 2;
      queue[tail++] = q + nxy;
    }
  }
  const out = (x, y, z) => {
    const q = at(x, y, z);
    return q < 0 || cell[q] === 2;
  };
  out.step = 1.5 * v; // how far off a surface to look
  return out;
}
// Points scattered evenly over a model's surface (by area), with the surface's outward normal, in the model's own axes;
// made once per model. Only on faces open to the space outside it (outsideField): a face with that space ahead of it, or
// behind it (its normal then turned round); the air never reaches a face shut inside the model, and points there would
// glow through any gap.

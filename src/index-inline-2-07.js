// index-inline-2 07 — three
// Lines 1617-1966 of readable/index-inline-2.pretty.js (statement-aligned).
function makeDetailTexture(craters = true) {
  // tileable value noise (+ craters for the airless worlds), used to add surface texture below the resolution of the global maps
  const N = 512,
    rnd = mulberry32(7);
  const v = new Float32Array(N * N);
  for (const [S, amp] of [
    [8, 0.3],
    [16, 0.22],
    [32, 0.16],
    [64, 0.11],
    [128, 0.07],
    [256, 0.05],
  ]) {
    const L = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) L[i] = rnd() * 2 - 1;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx_ = (x / N) * S,
          fy = (y / N) * S;
        const x0 = Math.floor(fx_),
          y0 = Math.floor(fy);
        const tx = fx_ - x0,
          ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx),
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
  for (let k = 0; k < (craters ? 260 : 0); k++) {
    // craters with raised rims, power-law sizes
    const r = 3 + 60 * Math.pow(rnd(), 3.2),
      cx = rnd() * N,
      cy = rnd() * N,
      depth = 0.35 + rnd() * 0.25;
    const R2 = Math.ceil(r * 1.6);
    for (let dy = -R2; dy <= R2; dy++)
      for (let dx = -R2; dx <= R2; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1.6) continue;
        const prof =
          d < 1
            ? -depth * (1 - d * d) * 0.8 + 0.25 * depth * Math.pow(d, 6)
            : 0.3 * depth * Math.exp(-(d - 1) * 6);
        const xx = ((Math.round(cx + dx) % N) + N) % N,
          yy = ((Math.round(cy + dy) % N) + N) % N;
        v[yy * N + xx] += prof;
      }
  }
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const q = clamp(128 + v[i] * 150, 0, 255);
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = q;
    img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function initScene() {
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(40, 1, 1e-6, 1e13);
  R.camera.up.set(0, 0, 1);
  R.scene.add(R.camera);
  R.sunLight = new THREE.PointLight(0xffffff, 3.0, 0, 0);
  R.scene.add(R.sunLight);
  R.ambient = new THREE.AmbientLight(0x8899bb, 0.05);
  R.scene.add(R.ambient);
  R.plasmaLight = new THREE.PointLight(0xff8a48, 0, 0.1, 0);
  R.scene.add(R.plasmaLight); // an entry's glowing shock layer (updatePlasmaLight); always in the scene, so lighting it does not recompile the materials
  R.maxAniso = renderer.capabilities.getMaxAnisotropy();
  R.renderer.autoClear = false;
  R.bgScene = new THREE.Scene();
  R.bgCam = new THREE.PerspectiveCamera(40, 1, 1, 1e10);
  R.sky = new THREE.Mesh(
    new THREE.SphereGeometry(5e8, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader: GLSL_SKY_V,
      fragmentShader: GLSL_SKY_F,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uUp: { value: new THREE.Vector3(0, 0, 1) },
        uSun: { value: new THREE.Vector3(1, 0, 0) },
        uDensity: { value: 0 },
        uZenith: { value: new THREE.Color("#3a76d6") },
        uHorizon: { value: new THREE.Color("#c6dcf2") },
        uSunset: { value: new THREE.Color("#ff9a52") },
        uHalo: { value: new THREE.Color("#fff2d8") },
      },
    }),
  );
  R.sky.renderOrder = 10;
  R.sky.frustumCulled = false;
  R.bgScene.add(R.sky);
  R.airSky = {}; // the physically based skies of Earth and Mars (Venus keeps a simple rim)
  for (const name of ["earth", "mars"]) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(5e8, 64, 32),
      new THREE.ShaderMaterial({
        vertexShader: GLSL_SKY_V,
        fragmentShader: GLSL_ASKY_F,
        side: THREE.BackSide,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        depthTest: false,
        uniforms: Object.assign(
          { aHide: { value: 150 } },
          atmosUniforms(name, name !== "earth"),
        ),
      }),
    );
    m.renderOrder = 11;
    m.frustumCulled = false;
    m.visible = false;
    R.bgScene.add(m);
    R.airSky[name] = m;
  }
  R.hemi = new THREE.HemisphereLight(0x9cc3ff, 0x6b5a45, 0);
  R.scene.add(R.hemi);
  // Image-based lighting: a small surround of the craft's world (sky and ground inside an atmosphere, the nearest planet's
  // sunlit disc in space, a faint fill) captured into a cube map, so metal and foil reflect their surroundings and faces
  // turned away from the Sun pick up light from the ground. 64 px, refreshed every few frames (updateSky).
  R.envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uUp: { value: new THREE.Vector3(0, 0, 1) },
      uZen: { value: new THREE.Color("#2f6bd0") },
      uHor: { value: new THREE.Color("#c3daf3") },
      uGnd: { value: new THREE.Color("#5a5040") },
      uDay: { value: 0 },
      uDens: { value: 0 },
      uPl: { value: new THREE.Vector3(0, 0, -1) },
      uPlCos: { value: 2 },
      uPlCol: { value: new THREE.Color("#000000") },
      uFill: { value: 0 },
    },
    vertexShader:
      "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uUp, uPl, uZen, uHor, uGnd, uPlCol; uniform float uDay, uDens, uPlCos, uFill; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = dot(d, uUp);
        vec3 sky = mix(uHor, uZen, smoothstep(0.0, 0.6, h)) * (0.05 + 0.55 * uDay);
        vec3 gnd = uGnd * (0.08 + 0.52 * uDay) * (0.7 + 0.3 * smoothstep(-1.0, 0.0, h));
        float disc = smoothstep(uPlCos - 0.01, uPlCos + 0.01, dot(d, uPl));
        gl_FragColor = vec4(mix(uPlCol * disc, h > 0.0 ? sky : gnd, uDens) + uFill, 1.0); }`,
  });
  R.envScene = new THREE.Scene();
  R.envScene.add(
    new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), R.envMat),
  );
  R.envRT = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
  R.envCam = new THREE.CubeCamera(0.5, 50, R.envRT);
  R.envScene.add(R.envCam);
  R.pmrem = new THREE.PMREMGenerator(renderer);
  R.envN = 0;
  R.envPM = null;
  R.loader = new THREE.TextureLoader();
  R.detailTex = makeDetailTexture();
  R.detailTexEarth = makeDetailTexture(false); // (Earth's ground without the craters, which from a few kilometres up read as cloud shadows)
  buildStars();
  buildBodies();
  buildPlanetOrbits();
  R.sunGlow = makeGlowSprite("#fff4dc", 1.0);
  R.scene.add(R.sunGlow);
  R.sunGlow2 = makeGlowSprite("#ffcf8a", 0.35, true);
  R.scene.add(R.sunGlow2);
}
// grey: a single-channel texture (a quarter of the memory of an RGBA one)
function loadTex(name, srgb = true, grey = false) {
  const tex = R.loader.load(ASSET(name), () => {
    R.texLoaded++;
  });
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (grey) tex.format = THREE.RedFormat;
  tex.anisotropy = Math.min(8, R.maxAniso || 1);
  return tex;
}
// Sharper maps for a body, loaded as the camera comes near it and released when it goes far away: each level of detail
// loads within `near` body radii and is dropped beyond `far`; `big` levels (8192 × 4096) only on devices that can hold
// them — a desktop GPU (16384 px textures) and a fine pointer; ?tex=8k or ?tex=4k forces the choice. The sharpest loaded
// level is used; maps decode off the main thread where the browser can. flag: a uniform set to 1 while a level is in use.
R.texLOD = [];
function texLOD(body, uniform, levels, srgb, grey, flag) {
  R.texLOD.push({
    body,
    U: uniform,
    base: uniform.value,
    srgb,
    grey,
    flag,
    levels: levels.map((l) => Object.assign({ tex: null, state: "idle" }, l)),
  });
}
function bigTexOK() {
  const q = (location.search.match(/[?&]tex=(\w+)/) || [])[1];
  if (q) return q === "8k";
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  return R.renderer.capabilities.maxTextureSize >= 16384 && !coarse;
}
function loadTexAsync(file, srgb, grey, done, fail) {
  const fin = (t) => {
    t.anisotropy = Math.min(8, R.maxAniso || 1);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (grey) t.format = THREE.RedFormat;
    t.needsUpdate = true;
    done(t);
  };
  // an image decoded before its upload (decode() works off the main thread), so the swap does not stall a frame
  const viaImage = () =>
    R.loader.load(
      ASSET(file),
      (t) => {
        const im = t.image;
        if (im && im.decode)
          im.decode().then(
            () => fin(t),
            () => fin(t),
          );
        else fin(t);
      },
      undefined,
      fail,
    );
  // Chromium decodes straight into an ImageBitmap, flipped as WebGL needs (other engines have not always honoured the options)
  const chromium =
    navigator.userAgentData &&
    navigator.userAgentData.brands &&
    navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand));
  if (typeof createImageBitmap !== "function" || !chromium) return viaImage();
  new THREE.ImageBitmapLoader()
    .setOptions({
      imageOrientation: "flipY",
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    })
    .load(
      ASSET(file),
      (bmp) => {
        const t = new THREE.Texture(bmp);
        t.flipY = false;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        fin(t);
      },
      undefined,
      viaImage,
    );
}
function updateTexLOD() {
  if (R.bigTex === undefined) R.bigTex = bigTexOK();
  for (const e of R.texLOD) {
    const b = R.bodies[e.body],
      k = R.camera.position.distanceTo(b.group.position) / b.R;
    let use = null;
    for (const l of e.levels) {
      if (l.state === "idle" && k < l.near && (!l.big || R.bigTex)) {
        l.state = "loading";
        loadTexAsync(
          l.file,
          e.srgb,
          e.grey,
          (t) => {
            l.tex = t;
            l.state = "ready";
          },
          () => {
            l.state = "failed";
          },
        );
      } else if (l.state === "ready" && k > l.far) {
        l.tex.dispose();
        if (l.tex.image && l.tex.image.close) l.tex.image.close();
        l.tex = null;
        l.state = "idle";
      }
      if (l.state === "ready") use = l.tex;
    }
    const v = use || e.base;
    if (e.U.value !== v) e.U.value = v;
    if (e.flag) e.flag.value = v ? 1 : 0;
  }
}
function glowTexture(color, soft) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  const [r, gg, b] = hexToRgb(color).map((x) => Math.round(x * 255));
  if (soft) {
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.9)`);
    gr.addColorStop(0.25, `rgba(${r},${gg},${b},0.25)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  } else {
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.08, `rgba(${r},${gg},${b},0.95)`);
    gr.addColorStop(0.22, `rgba(${r},${gg},${b},0.35)`);
    gr.addColorStop(0.5, `rgba(${r},${gg},${b},0.08)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeGlowSprite(color, opacity, soft) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(color, soft),
    color: 0xffffff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const s = new THREE.Sprite(m);
  s.renderOrder = 5;
  return s;
}

// ---------------- stars (d3-celestial / Hipparcos bright stars) ----------------

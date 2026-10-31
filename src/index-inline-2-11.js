// index-inline-2 11 — film
// Lines 2758-3048 of readable/index-inline-2.pretty.js (statement-aligned).
function filmBegin() {
  if (!MV.layers.film || !filmSupported()) {
    if (FILM.rt) filmFree();
    return false;
  }
  const r = R.renderer;
  r.getDrawingBufferSize(_filmSize);
  const w = _filmSize.x,
    h = _filmSize.y;
  const aa = r.getContext().getContextAttributes().antialias,
    samples = aa ? 4 : 0;
  if (w !== FILM.w || h !== FILM.h || samples !== FILM.samples) {
    filmFree();
    FILM.w = w;
    FILM.h = h;
    FILM.samples = samples;
    FILM.rt = filmTarget(w, h, samples);
    for (let i = 0; i < FILM_LEVELS; i++) {
      const lw = Math.max(1, w >> (i + 1)),
        lh = Math.max(1, h >> (i + 1));
      FILM.down.push(filmTarget(lw, lh, -1));
      if (i < FILM_LEVELS - 1) FILM.up.push(filmTarget(lw, lh, -1));
    }
  }
  if (!FILM.scene) {
    FILM.scene = new THREE.Scene();
    FILM.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (f, u) =>
      new THREE.ShaderMaterial({
        vertexShader: GLSL_FILM_V,
        fragmentShader: GLSL_FILM_LIB + f,
        uniforms: u,
        depthTest: false,
        depthWrite: false,
      });
    const T = () => ({ value: null }),
      V = () => ({ value: new THREE.Vector2() });
    FILM.mat = {
      bright: mk(GLSL_FILM_F.bright, {
        tSrc: T(),
        uH: V(),
        uThr: { value: 1.3 },
        uKnee: { value: 0.3 },
        uCap: { value: 1.5 },
      }),
      down: mk(GLSL_FILM_F.down, { tSrc: T(), uH: V() }),
      up: mk(GLSL_FILM_F.up, {
        tSrc: T(),
        tAdd: T(),
        uH: V(),
        uScatter: { value: 0.75 },
      }),
      comp: mk(GLSL_FILM_F.comp, {
        tSrc: T(),
        tBloom: T(),
        uH: V(),
        uBloom: { value: 0.3 },
        uVig: { value: 0.18 },
        uGrain: { value: 0.028 },
        uGrainPx: { value: 1 },
        uTime: { value: 0 },
        uFrame: { value: new THREE.Vector4() },
      }),
    };
    FILM.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), FILM.mat.comp);
    FILM.quad.frustumCulled = false;
    FILM.scene.add(FILM.quad);
  }
  r.setRenderTarget(FILM.rt);
  return true;
}
function filmPass(mat, target) {
  FILM.quad.material = mat;
  R.renderer.setRenderTarget(target);
  R.renderer.render(FILM.scene, FILM.cam);
}
// After the scene: bloom, roll-off, vignette and grain, onto the screen
function filmEnd() {
  const M = FILM.mat,
    D = FILM.down,
    U = FILM.up,
    half = (t, v) => v.set(0.5 / t.width, 0.5 / t.height);
  M.bright.uniforms.tSrc.value = FILM.rt.texture;
  half(FILM.rt, M.bright.uniforms.uH.value);
  filmPass(M.bright, D[0]);
  for (let i = 1; i < D.length; i++) {
    M.down.uniforms.tSrc.value = D[i - 1].texture;
    half(D[i - 1], M.down.uniforms.uH.value);
    filmPass(M.down, D[i]);
  }
  for (let i = U.length - 1; i >= 0; i--) {
    const low = i === U.length - 1 ? D[i + 1] : U[i + 1];
    M.up.uniforms.tSrc.value = low.texture;
    M.up.uniforms.tAdd.value = D[i].texture;
    half(low, M.up.uniforms.uH.value);
    filmPass(M.up, U[i]);
  }
  const c = M.comp.uniforms,
    pr = R.renderer.getPixelRatio(),
    fr = frameRect();
  c.tSrc.value = FILM.rt.texture;
  c.tBloom.value = U[0].texture;
  half(U[0], c.uH.value);
  c.uTime.value = R.clock || 0;
  c.uFrame.value.set(
    fr.x * pr,
    (R.height - fr.y - fr.h) * pr,
    fr.w * pr,
    fr.h * pr,
  );
  c.uGrainPx.value = Math.max(1, Math.round(pr));
  c.uGrain.value = MV.filmGrain === false ? 0 : 0.028; // (a video can do without: grain costs bitrate)
  filmPass(M.comp, null);
}

// ==== 30_models.js
// ============================================================================
// Procedural vehicle models (metres, +Y = nose). Built from the engine's real
// launcher geometry (stage lengths/radii/engine layouts) and spacecraft specs.
// ============================================================================
const MATS = {};
function mat(color, kind = "paint", extra = {}) {
  const key = color + kind + JSON.stringify(extra);
  if (MATS[key]) return MATS[key];
  // [roughness, metalness]. Metals reflect the surround (image-based lighting, 20_scene.js) but keep some diffuse colour:
  // in deep space the surround is nearly black, and fully metallic surfaces would turn black away from the Sun.
  const p = {
    paint: [0.55, 0.05],
    metal: [0.35, 0.6],
    dark: [0.75, 0.2],
    gold: [0.3, 0.7],
    foil: [0.26, 0.7],
    solar: [0.4, 0.3],
    fabric: [0.9, 0.0],
    tile: [0.85, 0.05],
    glass: [0.08, 0.45],
  }[kind] || [0.6, 0.1];
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: p[0],
    metalness: p[1],
    ...extra,
  });
  MATS[key] = m;
  return m;
}
const M_DARKMETAL = () => mat("#3a3d42", "metal", { side: THREE.DoubleSide });
function cyl(rb, rt, len, material, seg = 40, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, open);
  g.translate(0, len / 2, 0);
  return new THREE.Mesh(g, material);
}
function box(w, hgt, d, material) {
  const g = new THREE.BoxGeometry(w, hgt, d);
  g.translate(0, hgt / 2, 0);
  return new THREE.Mesh(g, material);
}
function bell(len, rExit, material) {
  const pts = [
    [rExit * 0.34, len],
    [rExit * 0.3, len * 0.9],
    [rExit * 0.48, len * 0.65],
    [rExit * 0.72, len * 0.35],
    [rExit, 0],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, 28);
  return new THREE.Mesh(g, material || M_DARKMETAL());
}
function ogive(r, len, material, cylFrac = 0.45) {
  const pts = [];
  const nC = 2,
    nO = 16;
  const lc = len * cylFrac,
    lo = len - lc;
  pts.push(new THREE.Vector2(r, 0));
  pts.push(new THREE.Vector2(r, lc));
  for (let i = 1; i <= nO; i++) {
    const f = i / nO;
    pts.push(
      new THREE.Vector2(
        Math.max(r * Math.sqrt(1 - f * f) * (1 - 0.15 * f), 0.001),
        lc + lo * f,
      ),
    );
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 40), material);
}
function stripeTex(fn, w = 256, hh = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = hh;
  const g = c.getContext("2d");
  fn(g, w, hh);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const TEX = {};
function patternMat(kind, base) {
  const key = kind + "|" + base;
  if (TEX[key]) return TEX[key];
  let tex;
  if (kind === "sic")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      for (let q = 0; q < 4; q += 2)
        g.fillRect((q * w) / 4, hh * 0.78, w / 4, hh * 0.22);
      g.fillRect(0, hh * 0.4, w, hh * 0.035);
      g.fillRect(0, hh * 0.04, w, hh * 0.02);
      g.fillRect(w / 8, hh * 0.08, w / 8, hh * 0.25);
      g.fillRect((5 * w) / 8, hh * 0.08, w / 8, hh * 0.25);
      g.fillStyle = "#b22";
      g.font = "bold 34px sans-serif";
      g.save();
      g.translate(w * 0.62, hh * 0.45);
      g.rotate(Math.PI / 2);
      g.fillText("USA", 0, 0);
      g.restore();
    });
  else if (kind === "sivb")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      g.fillRect(0, hh * 0.7, w / 4, hh * 0.3);
      g.fillRect(w / 2, hh * 0.7, w / 4, hh * 0.3);
      g.fillRect(0, hh * 0.0, w, hh * 0.05);
    });
  else if (kind === "band")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      g.fillRect(0, 0, w, hh * 0.08);
    });
  else if (kind === "bands")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "rgba(0,0,0,.25)";
      for (let i = 1; i < 5; i++) g.fillRect(0, (hh * i) / 5, w, 3);
    });
  else if (kind === "tiles")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = "#c4c9cf";
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#16181b";
      g.fillRect(w * 0.5, 0, w * 0.5, hh);
      g.strokeStyle = "rgba(255,255,255,.05)";
      for (let y = 0; y < hh; y += 6) {
        g.beginPath();
        g.moveTo(w * 0.5, y);
        g.lineTo(w, y);
        g.stroke();
      }
    });
  else if (kind === "flagcn")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#d62a1e";
      g.fillRect(w * 0.42, hh * 0.62, w * 0.14, hh * 0.08);
      g.fillStyle = "#f5d000";
      g.fillRect(w * 0.43, hh * 0.68, w * 0.02, hh * 0.012);
    });
  else if (kind === "chute")
    tex = stripeTex(
      (g, w, hh) => {
        for (let i = 0; i < 16; i++) {
          g.fillStyle = i % 2 ? "#f2efe8" : base;
          g.fillRect((i * w) / 16, 0, w / 16 + 1, hh);
        }
        g.fillStyle = "rgba(0,0,0,.12)";
        g.fillRect(0, 0, w, hh * 0.06);
      },
      256,
      64,
    );
  const kindM = kind === "tiles" ? "metal" : "paint";
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: kind === "tiles" ? 0.45 : 0.55,
    metalness: kind === "tiles" ? 0.4 : 0.05,
    side: kind === "chute" ? THREE.DoubleSide : THREE.FrontSide,
  });
  TEX[key] = m;
  return m;
}

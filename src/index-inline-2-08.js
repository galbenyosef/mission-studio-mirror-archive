// index-inline-2 08 — three
// Lines 1944-2266 of readable/index-inline-2.pretty.js (statement-aligned).
function bvToRgb(bv) {
  bv = clamp(bv, -0.4, 2.0);
  const stops = [
    [-0.4, [0.62, 0.71, 1.0]],
    [0.0, [0.8, 0.86, 1.0]],
    [0.3, [0.98, 0.98, 1.0]],
    [0.6, [1.0, 0.95, 0.84]],
    [1.0, [1.0, 0.84, 0.62]],
    [1.5, [1.0, 0.72, 0.45]],
    [2.0, [1.0, 0.6, 0.35]],
  ];
  for (let i = 1; i < stops.length; i++)
    if (bv <= stops[i][0]) {
      const [a, ca] = stops[i - 1],
        [b, cb] = stops[i];
      const f = (bv - a) / (b - a);
      return ca.map((x, k) => x + (cb[k] - x) * f);
    }
  return stops[stops.length - 1][1];
}
function buildStars() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLSL_STAR_V,
    fragmentShader: GLSL_STAR_F,
    uniforms: { uScale: { value: 1 }, uBright: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  R.starMat = mat;
  const geo = new THREE.BufferGeometry();
  R.stars = new THREE.Points(geo, mat);
  R.stars.frustumCulled = false;
  R.stars.renderOrder = -10;
  R.bgScene.add(R.stars);
  fetch(ASSET("stars.json"))
    .then((r) => r.json())
    .then((arr) => {
      const n = arr.length / 4,
        pos = new Float32Array(n * 3),
        size = new Float32Array(n),
        col = new Float32Array(n * 3);
      const RS = 1e9;
      for (let i = 0; i < n; i++) {
        const ra = arr[4 * i] * DEG,
          dec = arr[4 * i + 1] * DEG,
          mag = arr[4 * i + 2],
          bv = arr[4 * i + 3];
        const eq = [
            Math.cos(dec) * Math.cos(ra),
            Math.cos(dec) * Math.sin(ra),
            Math.sin(dec),
          ],
          e = eqToEcl(eq);
        pos[3 * i] = e[0] * RS;
        pos[3 * i + 1] = e[1] * RS;
        pos[3 * i + 2] = e[2] * RS;
        const fl = Math.pow(10, -0.4 * (mag - 6.5));
        size[i] = clamp(1.6 + 1.25 * Math.sqrt(fl), 1.6, 9);
        const b = clamp(0.25 + (0.6 * Math.sqrt(fl)) / 3, 0.18, 1.6);
        const c = bvToRgb(bv);
        col[3 * i] = c[0] * b;
        col[3 * i + 1] = c[1] * b;
        col[3 * i + 2] = c[2] * b;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    })
    .catch(() => {});
}

// ---------------- planets ----------------
function capUniforms() {
  return {
    uCapDir: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, 1, 0)) },
    uCapCos: { value: [2, 2, 2, 2] },
  };
}
function bodyMaterial(name) {
  const sunU = { value: new THREE.Vector3(1, 0, 0) };
  if (name === "earth") {
    // earth_aux: R the sea, G and B the slopes east and north (128 + slope·1000), drawn 5× steeper
    const m = new THREE.ShaderMaterial({
      vertexShader: GLSL_V,
      fragmentShader: GLSL_EARTH_F,
      uniforms: {
        tDay: { value: loadTex("earth_day.jpg") },
        tNight: { value: loadTex("earth_night.jpg", false, true) },
        tClouds: { value: loadTex("earth_clouds.jpg", false, true) },
        tAux: { value: loadTex("earth_aux.jpg", false) },
        uSlopeK: { value: 1000 },
        uRelief: { value: 5 },
        uReliefNear: { value: new THREE.Vector2(20, 120) },
        uPole: { value: new THREE.Vector3(0, 0, 1) },
        uSunDir: sunU,
        uLights: { value: 1 },
        uFill: { value: new THREE.Vector3(0, 0, 0) },
        tDetail: { value: R.detailTex },
        uDetailAmp: { value: 0.55 },
        uDetailRep: { value: new THREE.Vector2(512, 256) },
        ...capUniforms(),
        ...atmosUniforms("earth"),
      },
    });
    const big = (f) => [{ file: f, near: 25, far: 60, big: true }];
    texLOD("earth", m.uniforms.tDay, big("earth_day_8k.jpg"), true, false);
    texLOD(
      "earth",
      m.uniforms.tClouds,
      big("earth_clouds_8k.jpg"),
      false,
      true,
    );
    texLOD("earth", m.uniforms.tNight, big("earth_night_8k.jpg"), false, true);
    return m;
  }
  if (name === "sun")
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.96, 0.86),
    });
  const maps = {
    moon: "moon.jpg",
    mars: "mars.jpg",
    venus: "venus.jpg",
    jupiter: "jupiter.jpg",
    saturn: "saturn.jpg",
  };
  const ls =
    {
      moon: 0.9,
      mercury: 0.9,
      mars: 0.45,
      venus: 0.0,
      jupiter: 0.0,
      saturn: 0.0,
      uranus: 0.0,
      neptune: 0.0,
    }[name] ?? 0;
  const amb = { moon: 0.012, mars: 0.006 }[name] ?? 0.004;
  const tint = name === "mars" ? [1.0, 0.95, 0.9] : [1, 1, 1];
  const plain = { mercury: "#9c958c", uranus: "#a9dde3", neptune: "#5c7fe6" }[
    name
  ];
  // relief: slope maps (128 + slope·400) from LRO LOLA and MGS MOLA, loaded with the 4096 px colour maps when the camera
  // heads for the body (until then a 1024 px map and no relief)
  const aux = { moon: ["moon_aux.jpg", 1.0], mars: ["mars_aux.jpg", 1.5] }[
    name
  ];
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_V,
    fragmentShader: GLSL_ROCK_F,
    defines: name === "mars" ? { HAS_ATMO: 1 } : {},
    uniforms: {
      map: { value: maps[name] ? loadTex(maps[name]) : null },
      uHasMap: { value: maps[name] ? 1 : 0 },
      uSunDir: sunU,
      uAmb: { value: amb },
      uLS: { value: ls },
      uTint: {
        value: plain
          ? new THREE.Color(plain).convertSRGBToLinear()
          : new THREE.Vector3(...tint),
      },
      uFogColor: { value: new THREE.Color(0, 0, 0) },
      uFogK: { value: 0 },
      uFill: { value: new THREE.Vector3(0, 0, 0) },
      tAux: { value: null },
      uHasAux: { value: 0 },
      uSlopeK: { value: 400 },
      uRelief: { value: aux ? aux[1] : 0 },
      uReliefNear: { value: new THREE.Vector2(8, 40) },
      uPole: { value: new THREE.Vector3(0, 0, 1) },
      tDetail: { value: R.detailTex },
      uDetailAmp: {
        value: { moon: 0.35, mars: 0.45, mercury: 0.8 }[name] || 0,
      },
      uDetailRep: { value: new THREE.Vector2(512, 256) },
      ...capUniforms(),
      ...(name === "mars" ? atmosUniforms("mars", true) : {}),
    },
  });
  if (aux) {
    texLOD(
      name,
      m.uniforms.map,
      [
        { file: name + "_4k.jpg", near: 100, far: 400 },
        { file: name + "_8k.jpg", near: 25, far: 60, big: true },
      ],
      true,
      false,
    );
    texLOD(
      name,
      m.uniforms.tAux,
      [{ file: aux[0], near: 100, far: 400 }],
      false,
      false,
      m.uniforms.uHasAux,
    );
  }
  return m;
}
function atmoShell(color, sunset, strength, pow, scale) {
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_V,
    fragmentShader: GLSL_ATMO_F,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uColor: { value: new THREE.Color(color) },
      uSunset: { value: new THREE.Color(sunset) },
      uStrength: { value: strength },
      uPow: { value: pow },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), m);
  mesh.scale.setScalar(scale);
  mesh.renderOrder = 2;
  return mesh;
}
function buildBodies() {
  R.bodies = {};
  // Earth's sphere is finer: its facets would otherwise sink up to 1.9 km below the true surface, enough to show at the limb
  // against the air drawn on the true sphere
  const geo = new THREE.SphereGeometry(1, 128, 64),
    geoFine = new THREE.SphereGeometry(1, 384, 192);
  for (const name of BODY_LIST) {
    const B = BODIES[name];
    const g = new THREE.Group();
    g.name = name;
    const mat = bodyMaterial(name);
    const mesh = new THREE.Mesh(name === "earth" ? geoFine : geo, mat);
    const Rb =
      name === "earth" ? B.R : B.Rmean && name !== "earth" ? B.Rmean : B.R;
    const flat = { jupiter: 0.06487, saturn: 0.09796 }[name] || 0; // Earth, Moon & Mars stay spherical, as in the flight planner
    mesh.scale.set(Rb, Rb * (1 - flat), Rb);
    g.add(mesh);
    const rec = { name, group: g, mesh, mat, R: Rb };
    if (name === "venus") {
      rec.atmo = atmoShell("#ffe7b8", "#ffb070", 0.6, 3.0, 1.0);
      rec.atmo.scale.setScalar(Rb * 1.015);
      g.add(rec.atmo);
    }
    if (name === "saturn") {
      const rg = new THREE.RingGeometry(74500, 136800, 256, 1);
      const pos = rg.attributes.position,
        uv = rg.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - 74500) / (136800 - 74500), 0.5);
      }
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 4;
      const cx = c.getContext("2d");
      for (let x = 0; x < 512; x++) {
        const f = x / 512;
        let a =
          0.25 +
          0.5 *
            Math.abs(Math.sin(f * 40)) *
            (f > 0.45 && f < 0.52 ? 0.05 : 1) *
            (f < 0.12 ? 0.3 : 1);
        const l = 190 + 40 * Math.sin(f * 17);
        cx.fillStyle = `rgba(${l},${l - 15},${l - 45},${a})`;
        cx.fillRect(x, 0, 1, 4);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const ring = new THREE.Mesh(
        rg,
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2; // ring plane = local xz (equator), local y = pole
      g.add(ring);
      rec.ring = ring;
    }
    if (name === "sun") mesh.renderOrder = 1;
    R.scene.add(g);
    R.bodies[name] = rec;
  }
}
const _m4 = new THREE.Matrix4(),
  _vx = new THREE.Vector3(),
  _vy = new THREE.Vector3(),
  _vz = new THREE.Vector3();
// orientation of a body mesh: local x = lon 0, local y = north pole, local −z = lon 90°E
function bodyQuat(name, t, q) {
  if (name === "sun") {
    const p = bodyPoleEcl("sun", t);
    _vy.set(p[0], p[1], p[2]);
    _vx.set(1, 0, 0);
    _vz.crossVectors(_vx, _vy).normalize();
    _vx.crossVectors(_vy, _vz);
    _m4.makeBasis(_vx, _vy, _vz);
    return q.setFromRotationMatrix(_m4);
  }
  const m = bodyFixedToEcl(name, t);
  _vx.set(m[0], m[3], m[6]);
  _vy.set(m[2], m[5], m[8]);
  _vz.set(-m[1], -m[4], -m[7]);
  _m4.makeBasis(_vx, _vy, _vz);
  return q.setFromRotationMatrix(_m4);
}
function helio(name, t) {
  // per-frame cache of heliocentric positions
  const k = name + "@" + t;
  if (R.helio[k]) return R.helio[k];
  const v = planetHelio(name, t);
  R.helio[k] = v;
  return v;
}

// index-inline-2 12 — math
// Lines 3022-3371 of readable/index-inline-2.pretty.js (statement-aligned).
function engineLayout(eng) {
  const s = eng.spread || 0,
    out = [];
  switch (eng.layout) {
    case "pair":
      out.push([s / 2 + eng.r * 0.2, 0], [-(s / 2 + eng.r * 0.2), 0]);
      break;
    case "cross":
      out.push([0, 0]);
      for (let k = 0; k < 4; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 2 + Math.PI / 4),
          s * Math.sin((k * Math.PI) / 2 + Math.PI / 4),
        ]);
      break;
    case "square":
      for (let k = 0; k < 4; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 2 + Math.PI / 4),
          s * Math.sin((k * Math.PI) / 2 + Math.PI / 4),
        ]);
      break;
    case "octaweb":
      out.push([0, 0]);
      for (let k = 0; k < 8; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 4),
          s * Math.sin((k * Math.PI) / 4),
        ]);
      break;
    case "raptor33":
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.22 * Math.cos((k * TAU) / 3),
          s * 0.22 * Math.sin((k * TAU) / 3),
        ]);
      for (let k = 0; k < 10; k++)
        out.push([
          s * 0.58 * Math.cos((k * TAU) / 10),
          s * 0.58 * Math.sin((k * TAU) / 10),
        ]);
      for (let k = 0; k < 20; k++)
        out.push([
          s * 0.95 * Math.cos((k * TAU) / 20 + 0.1),
          s * 0.95 * Math.sin((k * TAU) / 20 + 0.1),
        ]);
      break;
    case "ship6":
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.32 * Math.cos((k * TAU) / 3),
          s * 0.32 * Math.sin((k * TAU) / 3),
        ]);
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.9 * Math.cos((k * TAU) / 3 + Math.PI / 3),
          s * 0.9 * Math.sin((k * TAU) / 3 + Math.PI / 3),
          1,
        ]);
      break;
    default:
      out.push([0, 0]);
  }
  return out;
}
// one launcher stage: bottom at y = 0, engine bells hanging below (or, eng.y0, inside the interstage below the stage's own
// structure), returns {group, len, rTop, rBottom, engLen}. opts.ist === false: the aft interstage (geom piece ist) is gone.
function buildStage(st, opts = {}) {
  const g = new THREE.Group();
  let y = 0,
    rTop = 0,
    rBottom = st.geom[0][1];
  for (const [len, rb, rt, color, o = {}] of st.geom) {
    if (o.ist && opts.ist === false) {
      y += len;
      rTop = rt;
      continue;
    }
    let m;
    if (o.roll === "sic") m = patternMat("sic", color);
    else if (o.roll === "sivb") m = patternMat("sivb", color);
    else if (o.band) m = patternMat("band", color);
    else if (o.bands) m = patternMat("bands", color);
    else if (o.tiles) m = patternMat("tiles", color);
    else if (o.flag === "cn") m = patternMat("flagcn", color);
    else
      m = mat(color, /#b9bec5|#d6d9de|steel/.test(color) ? "metal" : "paint");
    const c = cyl(rb, rt, len, m, 48);
    c.position.y = y;
    g.add(c);
    y += len;
    rTop = rt;
  }
  const eng = st.eng;
  if (eng)
    for (const p of engineLayout(eng)) {
      const big = p[2] ? 1.7 : 1;
      const b = bell(eng.len * big, eng.r * big);
      b.position.set(p[0], eng.y0 ?? -eng.len * big, p[1]);
      g.add(b);
    }
  if (st.fins)
    for (let k = 0; k < st.fins.n; k++) {
      const f = box(0.35, st.fins.len, st.fins.span, mat(st.fins.color));
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      f.position.set(
        Math.cos(a) * (rBottom + st.fins.span / 2 - 0.3),
        -1.2,
        Math.sin(a) * (rBottom + st.fins.span / 2 - 0.3),
      );
      f.rotation.y = -a;
      g.add(f);
      const fa = cyl(1.1, 0.6, 4.5, mat(st.fins.color));
      fa.position.set(
        Math.cos(a) * rBottom * 0.92,
        -1.2,
        Math.sin(a) * rBottom * 0.92,
      );
      g.add(fa);
    }
  if (st.gridfins)
    for (let k = 0; k < 4; k++) {
      const f = box(3.0, 2.2, 0.3, mat("#2b2d30", "metal"));
      const a = (k * Math.PI) / 2;
      f.position.set(
        Math.cos(a) * (rTop + 1.2),
        y - 4,
        Math.sin(a) * (rTop + 1.2),
      );
      f.rotation.y = -a + Math.PI / 2;
      g.add(f);
    }
  if (st.flaps) {
    for (const [yy, sz] of [
      [y - 9, 6.5],
      [6, 9],
    ])
      for (const a of [Math.PI / 2, -Math.PI / 2]) {
        const f = box(0.25, sz, 3.6, mat("#1d1f22", "tile"));
        f.position.set(
          Math.cos(a) * (rTop + 1.0),
          yy,
          Math.sin(a) * (rTop + 1.0),
        );
        g.add(f);
      }
  }
  if (st.look && STAGE_LOOK[st.look]) STAGE_LOOK[st.look](g, st, opts); // drawn by hand over the plain geometry (app/35_atlas.js)
  return {
    group: st.detail ? stageD(st, g, opts) : g,
    len: y,
    rTop,
    rBottom,
    engLen: eng ? -(eng.y0 ?? -eng.len) : 0,
  };
}

// ---------------- spacecraft parts ----------------
function lmDescent(landed) {
  const g = new THREE.Group();
  const body = cyl(2.1, 2.1, 1.65, mat("#c9a043", "gold"), 8);
  body.position.y = 0.0;
  g.add(body);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const pad = cyl(0.47, 0.47, 0.08, mat("#c9a043", "gold"));
    pad.position.set(Math.cos(a) * 4.2, -1.75, Math.sin(a) * 4.2);
    g.add(pad);
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
      mat("#c9a043", "gold"),
    );
    const p0 = new THREE.Vector3(Math.cos(a) * 1.9, 1.2, Math.sin(a) * 1.9),
      p1 = new THREE.Vector3(Math.cos(a) * 4.2, -1.7, Math.sin(a) * 4.2);
    strut.scale.y = p0.distanceTo(p1);
    strut.position.copy(p0).add(p1).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      p1.clone().sub(p0).normalize(),
    );
    g.add(strut);
  }
  const b = bell(1.5, 0.75);
  b.position.y = -1.4;
  g.add(b);
  g.userData.len = 1.65;
  g.userData.engineY = -1.4;
  g.userData.engineR = 0.75;
  g.userData.footY = -1.8;
  return g;
}
function lmAscent() {
  const g = new THREE.Group();
  const cab = box(3.2, 2.4, 2.9, mat("#a7abb1", "metal"));
  g.add(cab);
  const front = box(2.4, 1.6, 0.5, mat("#4b4f55", "dark"));
  front.position.set(0, 0.5, 1.6);
  g.add(front);
  const tun = cyl(0.5, 0.5, 0.7, mat("#c4c8cd", "metal"));
  tun.position.y = 2.4;
  g.add(tun);
  const tank = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 12),
    mat("#b9bdc2", "metal"),
  );
  tank.position.set(-1.8, 1.0, -0.2);
  g.add(tank);
  const tank2 = tank.clone();
  tank2.position.x = 1.8;
  g.add(tank2);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 14, 8, 0, TAU, 0, Math.PI / 2.4),
    mat("#eeeeee", "paint", { side: THREE.DoubleSide }),
  );
  dish.position.set(-1.2, 2.9, -1.0);
  g.add(dish);
  const b = bell(0.9, 0.45);
  b.position.y = -0.85;
  g.add(b);
  g.userData.len = 3.1;
  g.userData.engineY = -0.85;
  g.userData.engineR = 0.45;
  return g;
}
// ---------------- detailed models ----------------
// Vehicles with a 3D model that may be used freely — NASA 3D Resources (free and without copyright), the Smithsonian's
// scans (CC0), models under CC BY (credited in the README and the app) — are drawn with them: assets/<name>.glb, built from
// the originals by tools/models, one node per part the app moves on its own. A file loads the first time a mission needs
// it (preloadDetailedModels at the start of a mission); until it arrives, or if it cannot be loaded, the craft shows its
// built-in model.
const DETAIL = { lib: null, files: {}, ready: {} };
function detailFile(name) {
  if (!DETAIL.files[name]) {
    DETAIL.lib =
      DETAIL.lib ||
      Promise.all([
        import("./" + ASSET("GLTFLoader.js")),
        import("./" + ASSET("meshopt_decoder.module.js")),
      ]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
        const ld = new GLTFLoader();
        ld.setMeshoptDecoder(MeshoptDecoder);
        return ld;
      });
    DETAIL.files[name] = DETAIL.lib
      .then((ld) => ld.loadAsync(ASSET(name + ".glb")))
      .then((gl) => {
        const parts = {};
        for (const n of gl.scene.children) parts[n.name] = n;
        gl.scene.traverse((o) => {
          if (o.isMesh) o.userData.keep = true;
        }); // geometry and materials shared by every copy: never disposed with a craft
        return (DETAIL.ready[name] = parts);
      })
      .catch((e) => {
        console.warn(
          `Detailed model ${name} could not be loaded; using the built-in one.`,
          e,
        );
        return (DETAIL.ready[name] = null);
      });
  }
  return DETAIL.files[name];
}
// A part of a detailed model in place of a built-in one (the fallback, shown until the file arrives). y: where the part's
// origin sits in the fallback's frame; extra(group): pieces the source model leaves out, added beside the part.
function detailPart(name, part, fallback, opt = {}) {
  const g = new THREE.Group();
  g.userData = { ...fallback.userData };
  g.add(fallback);
  const put = (parts) => {
    const src = parts && parts[part];
    if (!src) return;
    const m = new THREE.Group();
    m.add(src.clone());
    m.position.y = opt.y || 0; // (the part's own transform carries the dequantisation of its vertices)
    g.remove(fallback);
    g.add(m);
    if (opt.extra) opt.extra(g);
    refreshBounds(g);
  };
  if (DETAIL.ready[name] !== undefined) put(DETAIL.ready[name]);
  else detailFile(name).then(put);
  return g;
}
// the detailed models a mission will show, loaded while the countdown runs
function preloadDetailedModels(md) {
  const want = new Set();
  for (const o of md.M.objects)
    for (const cf of o.configs) {
      const L = cf.label || {},
        sc = L.sc || o.model,
        parts = L.parts || [];
      if (
        (sc === "apollo" || sc === "apolloCSM") &&
        parts.some((p) => p === "lander" || p === "descent" || p === "ascent")
      )
        want.add("apollo_lm");
      if (
        sc === "msl" &&
        (parts.includes("lander") ||
          (parts.includes("aeroshell") && L.hs === false))
      )
        want.add("perseverance"); // (the rover shows once the heat shield is gone)
      if (o.model === "shuttle") want.add("orbiter");
      if (L.orbiter) orbiterLivery(L.orbiter); // the flight's orbiter in its markings (the stack's and the orbiter's own configurations)
      if (o.model === "iss") want.add("iss");
      if (L.launcher && LAUNCHERS[L.launcher])
        for (const st of LAUNCHERS[L.launcher].stages)
          if (st.detail) want.add(st.detail); // launch stacks and spent stages
    }
  for (const n of want) detailFile(n);
}
// a model's bounds after a detailed part replaced its built-in one (the camera frames a standing vehicle with them)
function refreshBounds(o) {
  let w = o;
  while (w && !(w.userData && w.userData.wrapped)) w = w.parent;
  if (!w) return;
  w.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(w.matrixWorld).invert(),
    bb = new THREE.Box3();
  w.traverse((n) => {
    if (n.isMesh && n.visible && n.geometry) {
      n.geometry.computeBoundingBox &&
        !n.geometry.boundingBox &&
        n.geometry.computeBoundingBox();
      const b = n.geometry.boundingBox
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld));
      bb.union(b);
    }
  });
  if (bb.isEmpty()) return;
  const sz = new THREE.Vector3();
  bb.getSize(sz);
  w.userData.sizeM = Math.max(sz.x, sz.y, sz.z, 1);
  w.userData.bbox = { w: sz.x, h: sz.y, d: sz.z };
  w.userData.bbY = [bb.min.y, bb.max.y];
  const wheels = [];
  w.traverse((n) => {
    if (n.userData && n.userData.wheel) wheels.push(n);
  });
  w.userData.wheels = wheels;
}
// Apollo lunar module: NASA's model, ascent and descent stages apart. Its descent stage keeps the built-in one's frame (feet
// at −1.8 m); its ascent stage's origin is the top of the descent stage, 1.455 m up, where the built-in ascent stage sits
// 1.65 m up. The ascent engine's bell, hidden inside the descent stage in NASA's model, is added for liftoff.
// Mars 2020 Perseverance: NASA's model, its six wheels apart so they turn (each wheel's node carries its radius), its legs
// apart, and its mast apart, folded on the deck for the landing and raised on the surface (the node carries the axis and
// angle). Stowed for the landing (NASA's drawing of the spacecraft, PIA24128) the wheels are folded up beside the body and
// the legs are not shown; userData.mobility(f) unfolds them, from f = 0 (stowed) to 1 (as the model is).

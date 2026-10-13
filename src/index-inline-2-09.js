// index-inline-2 09 — line
// Lines 2267-2425 of readable/index-inline-2.pretty.js (statement-aligned).
function updateBodies(t, camDist) {
  const O = R.O;
  for (const name of BODY_LIST) {
    const b = R.bodies[name];
    const P = helio(name, t).r;
    b.group.position.set(P[0] - O[0], P[1] - O[1], P[2] - O[2]);
    bodyQuat(name, t, b.mesh.quaternion);
    if (b.ring) {
      b.ring.quaternion
        .copy(b.mesh.quaternion)
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2,
          ),
        );
    }
    if (b.atmo) b.atmo.quaternion.copy(b.mesh.quaternion);
    const d = vnorm(P) || 1;
    const sd = [-P[0] / d, -P[1] / d, -P[2] / d];
    if (b.mat.uniforms && b.mat.uniforms.uSunDir)
      b.mat.uniforms.uSunDir.value.set(sd[0], sd[1], sd[2]);
    if (b.mat.uniforms && b.mat.uniforms.uPole)
      b.mat.uniforms.uPole.value
        .set(0, 1, 0)
        .applyQuaternion(b.mesh.quaternion);
    if (b.mat.uniforms && b.mat.uniforms.aSun)
      b.mat.uniforms.aSun.value.set(sd[0], sd[1], sd[2]);
    if (b.atmo) b.atmo.material.uniforms.uSunDir.value.set(sd[0], sd[1], sd[2]);
  }
  updateTexLOD();
  R.sunLight.position.set(-O[0], -O[1], -O[2]);
  // Sun glow: real corona size, but never smaller than a bright point
  const sunCam = R.camera.position.distanceTo(R.bodies.sun.group.position);
  const s1 = Math.max(BODIES.sun.R * 7, sunCam * 0.045),
    s2 = Math.max(BODIES.sun.R * 30, sunCam * 0.16);
  R.sunGlow.position.copy(R.bodies.sun.group.position);
  R.sunGlow.scale.set(s1, s1, 1);
  R.sunGlow2.position.copy(R.bodies.sun.group.position);
  R.sunGlow2.scale.set(s2, s2, 1);
}

// ---------------- orbits of planets and the Moon ----------------
function orbitLineMaterial(color, opacity) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}
function buildPlanetOrbits() {
  R.orbitGroup = new THREE.Group();
  R.scene.add(R.orbitGroup);
  R.planetOrbits = {};
  for (const name of [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(3 * 721), 3),
    );
    const line = new THREE.Line(
      geo,
      orbitLineMaterial(BODY_COLORS[name], 0.35),
    );
    line.frustumCulled = false;
    R.orbitGroup.add(line);
    R.planetOrbits[name] = { line, tBuilt: null };
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3 * 400), 3),
  );
  R.moonOrbit = {
    line: new THREE.Line(mg, orbitLineMaterial("#9fb2c8", 0.35)),
    tBuilt: null,
  };
  R.moonOrbit.line.frustumCulled = false;
  R.scene.add(R.moonOrbit.line);
}
function updateOrbits(t, show, camDist, frameMode) {
  R.orbitGroup.visible = show && camDist > 4e6;
  const O = R.O;
  if (R.orbitGroup.visible) {
    for (const name in R.planetOrbits) {
      const po = R.planetOrbits[name];
      if (po.tBuilt == null || Math.abs(t - po.tBuilt) > 200 * DAY) {
        const el = planetElemsAt(name === "earth" ? "emb" : name, t),
          arr = po.line.geometry.attributes.position.array;
        for (let i = 0; i <= 720; i++) {
          const s = stateFromElemsM(
            el.a,
            el.e,
            el.i,
            el.Om,
            el.w,
            (i / 720) * TAU,
            BODIES.sun.mu,
          );
          arr[3 * i] = s.r[0];
          arr[3 * i + 1] = s.r[1];
          arr[3 * i + 2] = s.r[2];
        }
        po.line.geometry.attributes.position.needsUpdate = true;
        po.tBuilt = t;
      }
    }
    R.orbitGroup.position.set(-O[0], -O[1], -O[2]);
  }
  const mo = R.moonOrbit;
  mo.line.visible =
    show && camDist > 3e4 && camDist < 5e7 && frameMode !== "emrot";
  if (mo.line.visible) {
    if (mo.tBuilt == null || Math.abs(t - mo.tBuilt) > 0.5 * DAY) {
      const arr = mo.line.geometry.attributes.position.array;
      for (let i = 0; i < 400; i++) {
        const tt = t - 13.7 * DAY + (i / 399) * 27.4 * DAY;
        const m = moonGeo(tt).r;
        arr[3 * i] = m[0];
        arr[3 * i + 1] = m[1];
        arr[3 * i + 2] = m[2];
      }
      mo.line.geometry.attributes.position.needsUpdate = true;
      mo.tBuilt = t;
    }
    const E = helio("earth", t).r;
    mo.line.position.set(E[0] - O[0], E[1] - O[1], E[2] - O[2]);
  }
}

// atmosphere sky dome for cameras inside the air of Earth or Mars
const SKY_LOOK = {
  earth: {
    zen: "#2f6bd0",
    hor: "#c3daf3",
    set: "#ff8f4a",
    halo: "#fff2d8",
    H: 8.5,
    top: 85,
  },
  mars: {
    zen: "#b08a66",
    hor: "#dcbf98",
    set: "#6f9ad8",
    halo: "#d6e6ff",
    H: 11.1,
    top: 70,
  },
};

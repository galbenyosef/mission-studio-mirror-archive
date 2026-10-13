// index-inline-2 14 — scale
// Lines 3675-3793 of readable/index-inline-2.pretty.js (statement-aligned).
function rover(scale = 1, color = "#e9e6df") {
  const g = new THREE.Group();
  const body = box(2.2 * scale, 0.7 * scale, 2.9 * scale, mat(color, "paint"));
  body.position.y = 0.55 * scale;
  g.add(body);
  for (const sx of [-1, 1])
    for (const sz of [-1, 0, 1]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26 * scale, 0.26 * scale, 0.4 * scale, 16),
        mat("#6a6d72", "metal"),
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.25 * scale, 0.26 * scale, sz * 1.1 * scale);
      w.userData.wheel = 0.26 * scale;
      g.add(w);
      // tread cleats so the wheels visibly turn
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const cl = new THREE.Mesh(
          new THREE.BoxGeometry(0.05 * scale, 0.42 * scale, 0.06 * scale),
          mat("#3e4044", "dark"),
        );
        cl.position.set(
          Math.cos(a) * 0.255 * scale,
          0,
          Math.sin(a) * 0.255 * scale,
        );
        cl.rotation.y = -a;
        w.add(cl);
      }
    }
  const mast = cyl(
    0.08 * scale,
    0.08 * scale,
    1.4 * scale,
    mat("#cfcfcf", "metal"),
  );
  mast.position.set(0.6 * scale, 1.2 * scale, 1.0 * scale);
  g.add(mast);
  const head = box(0.6 * scale, 0.3 * scale, 0.3 * scale, mat("#e5e5e5"));
  head.position.set(0.6 * scale, 2.6 * scale, 1.0 * scale);
  g.add(head);
  const rtg = cyl(
    0.3 * scale,
    0.3 * scale,
    0.9 * scale,
    mat("#3a3a3a", "dark"),
  );
  rtg.rotation.x = 1.0;
  rtg.position.set(0, 0.9 * scale, -1.6 * scale);
  g.add(rtg);
  return g;
}
function sampleLander(withRover, color = "#c9a043") {
  const g = new THREE.Group();
  const deck = cyl(1.6, 1.6, 0.9, mat(color, "gold"), 8);
  g.add(deck);
  g.add(legsQuad(1.6, 1.2, color));
  const b = bell(0.7, 0.35);
  b.position.y = -0.7;
  g.add(b);
  if (withRover) {
    const rv = rover(0.55, "#d8d3c4");
    rv.position.y = 0.9;
    g.add(rv);
    for (const s of [-1, 1]) {
      const w = solarWing(1.4, 0.8, 2, "#283a63");
      w.position.set(s * 0.5, 1.5, 0);
      if (s < 0) w.rotation.y = Math.PI;
      g.add(w);
    }
  }
  g.userData.len = 0.9;
  g.userData.engineY = -0.7;
  g.userData.engineR = 0.35;
  g.userData.footY = -1.2;
  return g;
}
function starshipShip(landed, withLegs) {
  const st = LAUNCHERS.starship.stages[1];
  const s = buildStage(st);
  const g = s.group;
  if (withLegs || landed)
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6;
      const leg = box(0.6, 3.2, 0.6, mat("#9aa0a6", "metal"));
      leg.position.set(Math.cos(a) * 4.0, -3.0, Math.sin(a) * 4.0);
      g.add(leg);
    }
  g.userData.len = s.len;
  g.userData.engineY = -st.eng.len;
  g.userData.engineR = 4.0;
  g.userData.footY = withLegs || landed ? -3.0 : -st.eng.len;
  return g;
}

// ---------------- part assemblies by spacecraft model ----------------
// returns Group with userData {mounts:[{y, r, tag}], len, footY}
function stackParts(list) {
  // stack groups vertically (each part built from y=0 upward); returns group
  const g = new THREE.Group();
  let y = 0;
  const mounts = [];
  for (const it of list) {
    const p = it.g;
    p.position.y = y + (it.dy || 0);
    g.add(p);
    if (it.mount)
      mounts.push({
        y: y + (p.userData.engineY ?? 0),
        r: p.userData.engineR || it.r || 1,
        tag: it.mount,
      });
    y += (it.len ?? p.userData.len ?? 1) + (it.gap || 0);
  }
  g.userData.len = y;
  g.userData.mounts = mounts;
  return g;
}

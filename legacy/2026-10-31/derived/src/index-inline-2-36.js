// index-inline-2 36 — add
// Lines 10041-10143 of readable/index-inline-2.pretty.js (statement-aligned).
function ce5Ascender() {
  const g = new THREE.Group(),
    { R, H } = CE5.A,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#e2e2de", "paint", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0,
      true,
    ),
  );
  const eng = bell(
    CE5.A.eng,
    0.2,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.A.eng;
  g.add(eng);
  for (let k = 0; k < 4; k++) {
    const ft = box(0.1, CE5.A.gap, 0.1, alu);
    ft.position.set(...m20Polar(0.55, (45 + 90 * k) * DEG, -CE5.A.gap));
    g.add(ft);
  }
  for (const s of [1, -1]) {
    const p = twPanel(0.8, 0.66, 5, 4, "#7d838a");
    p.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.position.set(s * (rf + 0.03), H / 2, s * 0.4);
    g.add(p);
  }
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.06, a, H * 0.55));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.1, 0.1, 0.08, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.06,
        0.025,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.rotation.z = (s * Math.PI) / 2;
      n.position.set(s * 0.05, 0.03, 0.03);
      pod.add(n);
    }
  }
  // on the top deck
  const can = cyl(0.17, 0.17, 0.3, mat("#eeeeea", "paint"), 24);
  can.position.y = H;
  g.add(can);
  const lid = cyl(0.17, 0.12, 0.06, mat("#c9a04a", "gold"), 24);
  lid.position.y = H + 0.3;
  g.add(lid);
  for (let k = 0; k < 3; k++) {
    // the rods: a bar across two short posts, facing out, at the claws' radius
    const a = (k * TAU) / 3,
      r = new THREE.Group();
    r.position.set(...m20Polar(CE5.D.rc, a, H));
    r.rotation.y = a;
    g.add(r);
    for (const x of [-0.12, 0.12]) {
      const p = box(0.035, 0.16, 0.035, alu);
      p.position.x = x;
      r.add(p);
    }
    const bar = cyl(0.022, 0.022, 0.3, mat("#d8dbde", "metal"), 10);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0.15, 0.15, 0);
    r.add(bar);
  }
  const lz = box(0.16, 0.12, 0.16, dark);
  lz.position.set(...m20Polar(0.42, 60 * DEG, H));
  g.add(lz);
  const cam = cyl(0.05, 0.05, 0.12, dark, 12);
  cam.position.set(...m20Polar(0.42, 300 * DEG, H));
  g.add(cam);
  const ant = cyl(0.015, 0.015, 0.35, mat("#1d1e21", "dark"), 8);
  ant.position.set(...m20Polar(0.5, 180 * DEG, H));
  g.add(ant);
  g.userData.len = H;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The lander (y = 0 at the foot of its body): an octagonal body in gold blankets, its deck white round the hole the
// ascender's engine sits in; four legs from the diagonal faces (folded close to the body for launch, then swung out),
// footpads; the engine under its centre; the two solar wings at the top of the ±X faces (hanging down for launch, out flat
// in flight, raised on the Moon); the drill's tower on the −Z face, its rod going down into the ground; the arm with its
// scoop along the +Z edge; the panoramic camera's mast, the dish antenna; the flag on its pole at the back. pose:
// { legs(f), wings(φ), drill(d), arm(k), flag(f) }.

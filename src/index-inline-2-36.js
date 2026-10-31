// index-inline-2 36 — add
// Lines 9889-10149 of readable/index-inline-2.pretty.js (statement-aligned).
function ce5Orbiter(opts = {}) {
  const g = new THREE.Group(),
    { R, H } = CE5.O,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 2),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2b2d31", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#d5d8db", "metal", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0.62,
      true,
    ),
  );
  for (const a of [0, Math.PI]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), white);
    r.position.set(
      Math.sin(a) * (rf + 0.004),
      0.68,
      Math.cos(a) * (rf + 0.004),
    );
    r.rotation.y = a;
    g.add(r);
  }
  {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), cnFlagMat());
    f.position.set(0, 1.38, rf + 0.006);
    g.add(f);
  }
  // the launch adapter's ring, the main engine, the four 150 N engines, thruster pods at the corners
  const lv = cyl(0.64, 0.62, 0.12, alu, 40, true);
  lv.position.y = -0.12;
  g.add(lv);
  const valve = cyl(0.13, 0.13, 0.16, grey, 16);
  valve.position.y = -0.16;
  g.add(valve);
  const eng = bell(
    CE5.O.eng,
    0.24,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.O.eng;
  g.add(eng);
  for (let k = 0; k < 4; k++) {
    const n = bell(
      0.2,
      0.06,
      mat("#45474b", "metal", { side: THREE.DoubleSide }),
    );
    n.position.set(...m20Polar(0.92, (45 + 90 * k) * DEG, -0.2));
    g.add(n);
  }
  for (let k = 0; k < 8; k++) {
    const a = (22.5 + 45 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.1, a, 0.05));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.12, 0.07, 0.1, grey));
    const n = bell(
      0.08,
      0.03,
      mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
    );
    n.position.set(0, -0.08, 0.02);
    pod.add(n);
  }
  // the dish antenna on a boom at the 135° face
  {
    const a = 135 * DEG,
      d = new THREE.Group();
    d.position.set(...m20Polar(rf + 0.55, a, 0.85));
    d.rotation.y = a;
    g.add(d);
    const dd = twDish(
      0.45,
      0.1,
      mat("#efeee9", "paint", { side: THREE.DoubleSide }),
      32,
    );
    dd.rotation.x = Math.PI / 2;
    d.add(dd);
    const fd = cyl(0.03, 0.03, 0.3, grey, 8);
    fd.rotation.x = Math.PI / 2;
    d.add(fd);
    g.add(
      m20Bar(m20Polar(rf, a, 0.85), m20Polar(rf + 0.52, a, 0.85), 0.03, alu),
    );
  }
  // the solar wings (accordions of three 1.3 × 1.5 m panels)
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Group();
    w.position.set(s * rf, H / 2, 0);
    if (s < 0) w.rotation.z = Math.PI;
    g.add(w);
    const yoke = [twBarMesh(0.02, alu), twBarMesh(0.02, alu)];
    w.add(...yoke);
    const h0 = new THREE.Group();
    w.add(h0);
    const hs = [h0];
    let par = h0;
    for (let i = 0; i < 3; i++) {
      par.add(twPanel(1.3, 1.5, 6, 7));
      if (i < 2) {
        const h = new THREE.Group();
        h.position.set(1.3, 0, i ? -0.035 : 0.035);
        par.add(h);
        hs.push(h);
        par = h;
      }
    }
    wings.push({ yoke, hs });
  }
  const wingPose = (f) => {
    for (const { yoke, hs } of wings) {
      const fu = twPhase(f, 0, 0.35),
        fo = twPhase(f, 0.25, 1);
      hs[0].position.set(twLerp(0.14, 0.4, fu), 0, twLerp(0.65, 0, fu));
      hs[0].rotation.y = twLerp(Math.PI / 2, 0, fo);
      hs[1].rotation.y = twLerp(-Math.PI, 0, fo);
      hs[2].rotation.y = twLerp(Math.PI, 0, fo);
      const t0 = hs[0].position;
      twSetBar(yoke[0], [0, 0.45, 0], [t0.x, 0.2, t0.z]);
      twSetBar(yoke[1], [0, -0.45, 0], [t0.x, -0.2, t0.z]);
    }
  };
  if (opts.deployT != null)
    g.userData.animate = (t) =>
      wingPose(clamp((t - opts.deployT - 30) / 180, 0, 1));
  wingPose(opts.stowed || opts.deployT != null ? 0 : 1);
  // the returner on its ring
  const rr = cyl(0.6, 0.6, 0.04, alu, 32);
  rr.position.y = H - 0.02;
  g.add(rr);
  if (opts.returner !== false) {
    const r = ce5Returner();
    r.position.y = CE5.RET.y0;
    g.add(r);
  }
  if (opts.support) g.add(ce5Upper(opts));
  g.userData.len = opts.support ? CE5.D.y + CE5.D.h : H;
  g.userData.mounts = [{ y: -CE5.O.eng, r: 0.24, tag: "ORB" }];
  return g;
}

// the support module (a truncated cone round the returner) and the docking module on top of it: a ring with the three
// claws (opts.claws 'open' | 'closed') and the channel the sample container is pushed down (opts.channel)
function ce5Upper(opts = {}) {
  const g = new THREE.Group(),
    gold = foilMat("gold", 6),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2b2d31", "dark");
  const { y0, y1, r0, r1 } = CE5.S;
  const sh = cyl(r0, r1, y1 - y0, gold, 48, true);
  sh.position.y = y0;
  g.add(sh);
  const ins = cyl(
    r0 - 0.03,
    r1 - 0.03,
    y1 - y0,
    mat("#3a3c40", "metal", { side: THREE.BackSide }),
    48,
    true,
  );
  ins.position.y = y0;
  g.add(ins);
  for (const [y, h] of [
    [y0, 0.08],
    [y0 + 0.75, 0.1],
    [y1 - 0.08, 0.08],
  ]) {
    const f = (y + h / 2 - y0) / (y1 - y0),
      r = twLerp(r0, r1, f) + 0.006;
    const b = cyl(r + 0.004, r, h, white, 48, true);
    b.position.y = y;
    g.add(b);
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * TAU) / 8;
    g.add(
      m20Bar(
        m20Polar(r0 + 0.02, a, y0 + 0.05),
        m20Polar(r1 + 0.02, a, y1 - 0.05),
        0.018,
        alu,
      ),
    );
  }
  const { y, h, r, rc } = CE5.D;
  const ring = cyl(r, r, h, alu, 48);
  ring.position.y = y;
  g.add(ring);
  const top = new THREE.Mesh(
    new THREE.RingGeometry(rc - 0.12, r, 48),
    mat("#9da2a8", "metal", { side: THREE.DoubleSide }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = y + h + 0.002;
  g.add(top);
  const claws = [];
  for (let k = 0; k < 3; k++) {
    // a K-shaped claw: a post and two fingers that close on the ascender's rod
    const a = (k * TAU) / 3,
      c = new THREE.Group();
    c.position.set(...m20Polar(rc, a, y + h));
    c.rotation.y = a;
    g.add(c);
    c.add(box(0.12, 0.2, 0.1, grey));
    const fs = [-1, 1].map((s) => {
      const f = new THREE.Group();
      f.position.set(0, 0.18, s * 0.03);
      c.add(f);
      const b = box(0.1, 0.17, 0.035, mat("#c9cdd2", "metal"));
      b.geometry.translate(0, 0, s * 0.0175);
      f.add(b);
      f.userData.s = s;
      return f;
    });
    claws.push(fs);
  }
  const clawPose = (closed) => {
    for (const fs of claws)
      for (const f of fs) f.rotation.x = f.userData.s * (closed ? -0.12 : 0.55);
  };
  clawPose(opts.claws === "closed");
  if (opts.channel) {
    const ch = box(0.24, 0.6, 0.24, mat("#c6cacf", "metal"));
    ch.position.y = CE5.RET.y0 + CE5.RET.h + 0.02;
    g.add(ch);
    const cc = box(0.18, 0.04, 0.18, dark);
    cc.position.y = CE5.RET.y0 + CE5.RET.h + 0.6;
    g.add(cc);
    for (let k = 0; k < 3; k++)
      g.add(
        m20Bar(
          m20Polar(0.14, (k * TAU) / 3 + 0.5, CE5.D.y + 0.04),
          m20Polar(r - 0.04, (k * TAU) / 3 + 0.5, CE5.D.y + 0.04),
          0.02,
          alu,
        ),
      );
  }
  return g;
}
// ---------------------------------------------------------------------------------------------------------------------
// The ascender (y = 0 at the foot of its body): an octagonal body in gold blankets on four short feet, its 3000 N engine
// under its centre, a solar panel fixed on each of the ±X faces, thruster pods at four corners; on its top deck the sealed
// sample container in the middle, the three rods the orbiter's claws close on, the rendezvous laser and camera.

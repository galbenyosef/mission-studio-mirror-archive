// index-inline-2 38 — add
// Lines 10253-10576 of readable/index-inline-2.pretty.js (statement-aligned).
function ce5Lander() {
  const g = new THREE.Group(),
    { R, H } = CE5.L,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(
    twPrismSides(8, R, 0, H, 0, (k) => (k === 2 || k === 6 ? white : gold)),
  );
  g.add(
    twDeck(
      8,
      R,
      H,
      0,
      mat("#deded9", "paint", { side: THREE.DoubleSide }),
      0.3,
    ),
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
  const well = cyl(
    0.3,
    0.3,
    0.5,
    mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
    24,
    true,
  );
  well.position.y = H - 0.5;
  g.add(well);
  const eng = bell(
    CE5.L.eng,
    0.3,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.L.eng;
  g.add(eng);
  const ch = cyl(0.14, 0.14, 0.14, grey, 16);
  ch.position.y = -0.14;
  g.add(ch);
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(rf - 0.12, a, 0));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.2, 0.08, 0.14, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.13,
        0.045,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.position.set(s * 0.06, -0.13, 0.02);
      pod.add(n);
    }
  }
  for (const [x, z] of [
    [0.5, 0.45],
    [-0.5, 0.45],
  ]) {
    const r = box(0.24, 0.07, 0.18, dark);
    r.position.set(x, -0.07, z);
    g.add(r);
  } // the laser ranger and the altimeter
  // legs at the diagonal faces: the main strut on its hinge near the top, two side struts from the foot, the pad
  const legs = [],
    hingeY = 0.85,
    len = Math.hypot(0.85, hingeY + CE5.L.foot - 0.035);
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      Lg = new THREE.Group();
    Lg.position.set(...m20Polar(rf, a, hingeY));
    Lg.rotation.y = a - Math.PI / 2;
    g.add(Lg);
    const main = twBarMesh(0.05, alu, 10),
      side = [twBarMesh(0.024, alu), twBarMesh(0.024, alu)],
      pad = cyl(0.25, 0.22, 0.07, mat("#c9a04a", "gold"), 20);
    const cap = cyl(0.07, 0.07, 0.1, grey, 10);
    Lg.add(main, ...side, pad, cap);
    cap.position.y = -0.05;
    legs.push({ main, side, pad });
  }
  const legPose = (f) => {
    const b =
        twLerp(6, Math.atan2(0.85, hingeY + CE5.L.foot - 0.035) * RAD, f) * DEG,
      e = [len * Math.sin(b), -len * Math.cos(b), 0];
    for (const l of legs) {
      twSetBar(l.main, [0, 0, 0], e);
      for (const s of [0, 1])
        twSetBar(
          l.side[s],
          [-0.2, -hingeY, s ? 0.36 : -0.36],
          [e[0] * 0.62, e[1] * 0.62, 0],
        );
      l.pad.position.set(e[0], e[1] - 0.035, 0);
    }
  };
  // solar wings on the ±X faces' top edges: φ = −90° hanging, 0 flat, + raised
  const wings = [];
  for (const s of [1, -1]) {
    const h = new THREE.Group();
    h.position.set(s * (rf + 0.03), H, 0);
    if (s < 0) h.rotation.y = Math.PI;
    g.add(h);
    const p = twPanel(1.8, 1.2, 9, 6, "#5d6268");
    p.rotation.x = -Math.PI / 2;
    h.add(p);
    wings.push(h);
  }
  // the drill's tower on the −Z face, and its rod
  const drill = new THREE.Group();
  drill.position.set(0, 0, -(rf + 0.2));
  g.add(drill);
  {
    const tw = box(0.3, 1.75, 0.3, white);
    tw.position.y = -0.7;
    drill.add(tw);
    const st = box(0.34, 0.12, 0.34, grey);
    st.position.y = -0.72;
    drill.add(st);
    for (const y of [0.15, 0.75])
      g.add(m20Bar([0, y, -rf], [0, y, -(rf + 0.06)], 0.03, alu));
  }
  const rod = cyl(0.035, 0.035, 1, mat("#9ea3a9", "metal"), 10);
  rod.geometry.translate(0, -1, 0);
  drill.add(rod);
  rod.position.y = -0.72;
  // the arm: shoulder (yaw, pitch), elbow, wrist, the scoop; its base at the +Z edge of the deck
  const arm = new THREE.Group();
  arm.position.set(0.42, H + 0.12, rf - 0.05);
  g.add(arm);
  const base = cyl(0.09, 0.09, 0.12, grey, 16);
  base.position.set(0.42, H, rf - 0.05);
  g.add(base);
  const j1 = new THREE.Group();
  arm.add(j1);
  const up = box(1.3, 0.12, 0.12, white);
  up.geometry.translate(0.65, 0, 0);
  j1.add(up);
  const j2 = new THREE.Group();
  j2.position.set(1.3, 0, 0.13);
  j1.add(j2);
  const fo = box(1.15, 0.1, 0.1, white);
  fo.geometry.translate(0.575, 0, 0);
  j2.add(fo);
  for (const [j, x] of [
    [j1, 0],
    [j2, 0],
  ]) {
    const m = cyl(0.09, 0.09, 0.2, grey, 14);
    m.rotation.x = Math.PI / 2;
    m.position.x = x;
    j.add(m);
  }
  const j3 = new THREE.Group();
  j3.position.set(1.15, 0, 0);
  j2.add(j3);
  {
    const w = cyl(0.06, 0.06, 0.12, grey, 12);
    w.rotation.x = Math.PI / 2;
    j3.add(w);
    const sc = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 8, 0, TAU, 0, Math.PI / 2),
      mat("#c3c7cc", "metal", { side: THREE.DoubleSide }),
    );
    sc.rotation.z = -Math.PI / 2;
    sc.position.x = 0.14;
    j3.add(sc);
    const nc = box(0.06, 0.06, 0.06, dark);
    nc.position.set(0.08, 0.08, 0);
    j3.add(nc);
  }
  // arm poses [yaw, shoulder, elbow, wrist]: stowed along the edge; out over the ground in front, down into it; raised
  // upright (so that it turns clear of the ascender); over the ascender's sample container
  const ARM = {
    stow: [-Math.PI, 0.02, Math.PI - 0.02, 0],
    up: [-Math.PI / 2, 0.4, -1.2, -0.6],
    dig: [-Math.PI / 2, -0.62, -0.85, -0.55],
    lift: [-Math.PI / 2, 1.52, -1.3, -1.8],
    over: [1.936 - TAU, 1.52, -1.3, -1.8],
  };
  const armSet = (q) => {
    arm.rotation.y = q[0];
    j1.rotation.z = q[1];
    j2.rotation.z = q[2];
    j3.rotation.z = q[3];
  };
  // the panoramic camera's mast (front-left corner), the dish antenna (back-right)
  {
    const p = m20Polar(rf - 0.2, 315 * DEG, H),
      m = cyl(0.04, 0.04, 0.6, white, 10);
    m.position.set(...p);
    g.add(m);
    const hd = box(0.22, 0.14, 0.14, white);
    hd.position.set(p[0], H + 0.6, p[2]);
    g.add(hd);
    for (const x of [-0.06, 0.06]) {
      const l = cyl(0.025, 0.025, 0.03, dark, 12);
      l.rotation.x = Math.PI / 2;
      l.position.set(p[0] + x, H + 0.67, p[2] + 0.075);
      g.add(l);
    }
  }
  {
    const p = m20Polar(rf - 0.25, 135 * DEG, H),
      m = cyl(0.04, 0.04, 0.45, grey, 10);
    m.position.set(...p);
    g.add(m);
    const d = twDish(
      0.32,
      0.08,
      mat("#efeee9", "paint", { side: THREE.DoubleSide }),
      28,
    );
    d.position.set(p[0], H + 0.45, p[2]);
    d.rotation.x = -0.6;
    g.add(d);
  }
  // the flag: a pole that runs up from a box on the back-left face, the flag on a bar from its top
  const fa = 225 * DEG,
    flag = new THREE.Group();
  flag.position.set(...m20Polar(rf + 0.08, fa, 0.5));
  flag.rotation.y = fa - Math.PI / 2;
  g.add(flag);
  const fbox = box(0.16, 0.5, 0.12, grey);
  fbox.position.y = -0.25;
  flag.add(fbox);
  const pole = cyl(0.02, 0.02, 1, alu, 8);
  flag.add(pole);
  const fpiv = new THREE.Group();
  flag.add(fpiv);
  const bar = cyl(0.012, 0.012, 1.25, alu, 6);
  bar.rotation.z = Math.PI / 2;
  bar.position.x = 0.62;
  fpiv.add(bar);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), cnFlagMat());
  cloth.geometry.translate(0.6, -0.4, 0);
  fpiv.add(cloth);
  const flagPose = (f) => {
    const fp = twPhase(f, 0, 0.6),
      fc = twPhase(f, 0.5, 1),
      hgt = twLerp(0.3, 1.9, fp);
    pole.scale.y = hgt;
    fpiv.position.y = hgt;
    cloth.scale.set(Math.max(fc, 0.04), Math.max(fc, 0.15), 1);
    bar.scale.y = Math.max(fc, 0.05);
    bar.position.x = 0.62 * Math.max(fc, 0.05);
    cloth.visible = bar.visible = f > 0.3;
  };
  g.userData.pose = {
    legs: legPose,
    wings: (phi) => {
      for (const h of wings) h.rotation.z = phi;
    },
    drill: (d) => {
      rod.scale.y = Math.max(d, 0.02);
      rod.visible = d > 0.01;
    },
    arm: armSet,
    flag: flagPose,
    ARM,
  };
  legPose(1);
  wings.forEach((h) => (h.rotation.z = 0));
  rod.visible = false;
  armSet(ARM.stow);
  flagPose(0);
  g.userData.len = H;
  g.userData.footY = -CE5.L.foot;
  return g;
}
// the arm's work on the surface, k from 0 to 1 over the scooping: several scoops in front, each emptied into the container
// on the ascender's top; joint angles interpolated between key poses
function ce5ArmAt(A, k) {
  const keys = [
    [0, A.stow],
    [0.05, A.up],
  ];
  for (let i = 0; i < 3; i++) {
    const t0 = 0.06 + i * 0.3,
      yaw = -Math.PI / 2 + (i - 1) * 0.35,
      Y = (q) => [yaw, ...q.slice(1)];
    keys.push(
      [t0, Y(A.up)],
      [t0 + 0.05, Y(A.dig)],
      [t0 + 0.09, [yaw + 0.08, ...A.dig.slice(1)]],
      [t0 + 0.13, Y(A.up)],
      [t0 + 0.16, Y(A.lift)],
      [t0 + 0.2, A.over],
      [t0 + 0.23, A.over],
      [t0 + 0.27, Y(A.lift)],
    );
  }
  keys.push([0.97, A.up], [1, A.stow]);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] < k) i++;
  const [ta, qa] = keys[i],
    [tb, qb] = keys[i + 1],
    f = smoothstep(clamp((k - ta) / Math.max(tb - ta, 1e-6), 0, 1));
  return qa.map((v, j) => twLerp(v, qb[j], f));
}

// ---------------------------------------------------------------------------------------------------------------------
// The assemblies the app shows, by part (buildSC 'change5'): the four together (flags.stowed for launch, flags.deployT: the
// orbiter's wings and the lander's legs and wings open after separation); the orbiter with the returner (flags.dock ===
// false: the docking and support modules gone with the ascender); the orbiter with the ascender docked; the lander with
// the ascender (flags.landed: on the Moon, working from flags.tLand: the drill, the arm, the flag); the lander alone
// after the ascender has gone; the ascender (flags.dock: with the docking and support modules, released together); the
// orbiter without the returner; the returner.
const CE5_HOURS = { drill: [1.0, 5.7], arm: [6.0, 22.5], flag: 46.0 }; // after touchdown (2020-12-01 15:11 UTC: drilling done by 20:53, sampling sealed by 14:00 the next day; the flag before liftoff)

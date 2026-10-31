// index-inline-2 39 — ce5
// Lines 10577-10785 of readable/index-inline-2.pretty.js (statement-aligned).
function ce5Assembly(P, flags) {
  const g = new THREE.Group(),
    mounts = [],
    H3 = 3600,
    has = (k) => P.has(k);
  const ascOnLander = (ln) => {
    const a = ce5Ascender();
    a.position.y = CE5.L.H + CE5.A.gap;
    ln.add(a);
    return a;
  };
  const dockedAsc = () => {
    const a = ce5Ascender();
    a.rotation.x = Math.PI;
    a.position.y = CE5.dockY + CE5.A.H;
    return a;
  };
  if (has("orbiter") && has("lander")) {
    const o = ce5Orbiter({
      support: true,
      claws: "open",
      stowed: flags.stowed,
      deployT: flags.deployT,
    });
    g.add(o);
    mounts.push(...o.userData.mounts);
    const ln = ce5Lander();
    ln.position.y = CE5.L.y0;
    g.add(ln);
    ascOnLander(ln);
    for (let k = 0; k < 4; k++) {
      const a = (45 + 90 * k) * DEG;
      g.add(
        m20Bar(
          m20Polar(CE5.D.r - 0.05, a, CE5.D.y + CE5.D.h),
          m20Polar(0.9, a, CE5.L.y0),
          0.04,
          mat("#b9bec4", "metal"),
        ),
      );
    }
    const lp = ln.userData.pose,
      fold = (f) => {
        lp.legs(twPhase(f, 0.5, 1));
        lp.wings(twLerp(-Math.PI / 2, 0, twPhase(f, 0, 0.5)));
      };
    if (flags.deployT != null) {
      const oa = o.userData.animate;
      g.userData.animate = (t) => {
        oa(t);
        fold(clamp((t - flags.deployT - 240) / 240, 0, 1));
      };
    }
    fold(flags.stowed || flags.deployT != null ? 0 : 1);
    g.userData.len = CE5.L.y0 + CE5.L.H + CE5.A.gap + CE5.A.H + 0.36;
    g.userData.yc0 = 2.4;
  } else if (has("orbiter") && has("ascent")) {
    const o = ce5Orbiter({ support: true, claws: "closed", channel: true });
    g.add(o, dockedAsc());
    mounts.push(...o.userData.mounts);
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } else if (has("orbiter")) {
    const sup = flags.dock !== false,
      o = ce5Orbiter({ support: sup, claws: "open", channel: sup });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("service")) {
    const o = ce5Orbiter({ returner: false });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("ascent") && flags.dock) {
    g.add(ce5Upper({ claws: "closed", channel: true }), dockedAsc());
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } // released with the docking and support modules (in the orbiter's frame)
  else if (has("ascent")) {
    const a = ce5Ascender();
    g.add(a);
    mounts.push({ y: -CE5.A.eng, r: 0.2, tag: "ASC" });
    g.userData.footY = -(CE5.L.H + CE5.A.gap + CE5.L.foot);
    g.userData.len = CE5.A.H;
  } else if (has("lander") || has("descent")) {
    const ln = ce5Lander();
    g.add(ln);
    const lp = ln.userData.pose;
    g.userData.footY = -CE5.L.foot;
    g.userData.len = has("lander") ? CE5.L.H + CE5.A.gap + CE5.A.H : CE5.L.H;
    if (has("lander")) ascOnLander(ln);
    if (has("descent")) {
      lp.wings(0.6);
      lp.flag(1);
    } else if (!flags.landed)
      mounts.push({ y: -CE5.L.eng, r: 0.3, tag: "LDR" });
    else if (flags.tLand != null) {
      const T = flags.tLand,
        h = (t) => (t - T) / H3,
        [d0, d1] = CE5_HOURS.drill,
        [a0, a1] = CE5_HOURS.arm;
      g.userData.animate = (t) => {
        const x = h(t);
        lp.wings(twLerp(0, 0.6, clamp(x / 0.1, 0, 1)));
        lp.drill(
          x < d0
            ? 0
            : x < d1 - 0.7
              ? (1.3 * (x - d0)) / (d1 - 0.7 - d0)
              : 1.3 * clamp((d1 - x) / 0.7, 0, 1),
        );
        lp.arm(
          x <= a0 || x >= a1
            ? lp.ARM.stow
            : ce5ArmAt(lp.ARM, (x - a0) / (a1 - a0)),
        );
        lp.flag(clamp((x - CE5_HOURS.flag) / 0.05, 0, 1));
      };
      g.userData.animate(T);
    } else lp.wings(0.6);
  } else if (has("capsule")) {
    g.add(ce5Returner());
    g.userData.chuteY = CE5.RET.h;
    g.userData.capsuleR = CE5.RET.r;
    g.userData.len = CE5.RET.h;
  }
  g.userData.len = g.userData.len || 2;
  return { inner: g, mounts };
}

// ==== 39_clipper.js
// ============================================================================
// Europa Clipper (2024), metres, y = 0 at the foot of the propulsion module. Published (NASA/JPL press kit): the
// propulsion module is an aluminium cylinder about 3 m tall and 1.5 m wide, with the propellant tanks inside and 24
// engines of 27.5 N; the electronics vault, an aluminium-zinc box, is bolted on top of it; the high-gain antenna is a
// 3 m dish; the two solar arrays have five panels each and span 14.2 × 4.1 m apiece, about 30.5 m tip to tip; the
// magnetometer boom is 8.5 m long; the radar's four HF antennas, 17.6 m each, extend crosswise from the solar arrays,
// and its eight VHF antennas, 2.76 m each, sit on the arrays; stowed for launch it stands 4.7 m tall, 3 m wide and 4 m
// deep. The arrays opened within hours of launch, the boom and the radar antennas over the weeks after. Where a size is
// not published (the vault's, the yoke's, where the antennas sit on the arrays) it is estimated from photographs.
// Stowed (flags.stowed), the arrays are folded in a stack against the body and the boom and antennas lie along it;
// from flags.deployT (separation from the Falcon Heavy's upper stage) they open out.
// ============================================================================
const CL_PM_R = 0.75,
  CL_PM_H = 3.0,
  CL_VAULT = [1.5, 0.9, 1.3],
  CL_HGA_R = 1.5,
  CL_ARRAY = [14.2, 4.1],
  CL_PANELS = 5,
  CL_MAG = 8.5,
  CL_HF = 17.6,
  CL_VHF = 2.76;
// one solar array along +X from its hinge at the body, the cells facing +Z: five panels in an accordion (even panels fold
// toward the body, odd ones away), userData.fold(f) folds them (f = 1 open, 0 stacked); the radar antennas ride on it
function clArray(side) {
  const L = CL_ARRAY[0],
    W = CL_ARRAY[1],
    pw = L / CL_PANELS,
    g = new THREE.Group(),
    hinges = [],
    panels = [];
  let parent = g;
  for (let i = 0; i < CL_PANELS; i++) {
    const h = new THREE.Group();
    h.position.x = i ? pw : 0;
    parent.add(h);
    hinges.push(h);
    const p = twPanel(pw - 0.04, W, 10, 14, "#b9bdc3");
    p.position.x = 0.02;
    h.add(p);
    panels.push(p);
    parent = h;
  }
  // the radar on the outer panels: the HF antenna, a thin pole 17.6 m long across the array's width, standing a little
  // off its back; the VHF antennas, two flat rectangles 2.76 m long along the array's edges beside it
  const ant = new THREE.Group();
  ant.position.set(pw * 3.5, 0, -0.12);
  hinges[3].add(ant);
  const hf = twBarMesh(0.03, mat("#d9dcdf", "metal"));
  twSetBar(hf, [0, -CL_HF / 2, 0], [0, CL_HF / 2, 0]);
  ant.add(hf);
  for (const y of [-W / 2 - 0.3, W / 2 + 0.3]) {
    const v = box(CL_VHF, 0.25, 0.04, mat("#2a2c31", "dark"));
    v.rotation.x = Math.PI / 2;
    v.position.set(0, y, 0);
    ant.add(v);
  }
  for (const y of [-W / 2, W / 2])
    ant.add(
      m20Bar(
        [0, y * 0.98, 0.12],
        [0, y * 0.98, 0],
        0.015,
        mat("#9aa0a6", "metal"),
      ),
    ); // its stand-offs
  g.userData.ant = ant; // the antennas are stowed along the array until they deploy (userData.deployAnt)
  g.userData.fold = (f) => {
    for (let i = 1; i < CL_PANELS; i++) {
      hinges[i].rotation.y = (i % 2 ? 1 : -1) * Math.PI * (1 - f);
      hinges[i].position.z = (i % 2 ? 0.04 : -0.04) * (1 - f);
    }
  };
  g.userData.deployAnt = (f) => {
    hf.scale.y = Math.max(0.2 + 0.8 * f, 1e-3) * CL_HF;
    ant.position.z = -0.12 * f - 0.02 * (1 - f);
  };
  return g;
}

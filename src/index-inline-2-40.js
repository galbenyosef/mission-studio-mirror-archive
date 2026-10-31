// index-inline-2 40 — add
// Lines 10786-11115 of readable/index-inline-2.pretty.js (statement-aligned).
function clipperModel(flags = {}) {
  const g = new THREE.Group(),
    alu = mat("#b9bdc3", "metal"),
    dark = mat("#2a2c31", "dark"),
    white = mat("#ecebe6", "paint");
  // the propulsion module: the lower cylinder in gold blankets, the upper in silver, a ring between; the four engine
  // modules under it (six 27.5 N engines each, drawn as a cluster of small bells on a plate)
  g.add(cyl(CL_PM_R, CL_PM_R, CL_PM_H * 0.55, foilMat("gold", 3), 40));
  const up = cyl(CL_PM_R, CL_PM_R, CL_PM_H * 0.45, foilMat("mylar", 3), 40);
  up.position.y = CL_PM_H * 0.55;
  g.add(up);
  const ring = cyl(CL_PM_R + 0.03, CL_PM_R + 0.03, 0.06, alu, 40);
  ring.position.y = CL_PM_H * 0.55 - 0.03;
  g.add(ring);
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + TAU / 8,
      m = new THREE.Group();
    m.position.set(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55);
    m.rotation.y = a;
    g.add(m);
    const plate = box(0.34, 0.06, 0.26, alu);
    plate.position.y = -0.06;
    m.add(plate);
    for (let i = 0; i < 3; i++)
      for (const z of [-0.07, 0.07]) {
        const b = bell(
          0.12,
          0.035,
          mat("#4a4c50", "metal", { side: THREE.DoubleSide }),
        );
        b.rotation.x = Math.PI;
        b.position.set(-0.1 + i * 0.1, -0.06, z);
        m.add(b);
      }
  }
  // the electronics vault on top, its radiator (white) on one face, the small antennas on it; the vault plate
  const vault = box(CL_VAULT[0], CL_VAULT[1], CL_VAULT[2], foilMat("black", 2));
  vault.position.y = CL_PM_H;
  g.add(vault);
  const rad = box(CL_VAULT[0] * 0.8, CL_VAULT[1] * 0.8, 0.03, white);
  rad.position.set(0, CL_PM_H + 0.09, -CL_VAULT[2] / 2 - 0.015);
  g.add(rad);
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.01, 3),
    mat("#8a8c90", "metal"),
  );
  plate.rotation.z = Math.PI / 2;
  plate.position.set(CL_VAULT[0] / 2 + 0.005, CL_PM_H + 0.5, 0.2);
  g.add(plate);
  // the high-gain antenna on top: the 3 m dish on a short pedestal, its feed on a tripod, the sunshade over the rim
  const hga = new THREE.Group();
  hga.position.y = CL_PM_H + CL_VAULT[1];
  g.add(hga);
  const ped = cyl(0.3, 0.3, 0.25, alu, 24);
  hga.add(ped);
  const d = twDish(
    CL_HGA_R,
    0.38,
    mat("#f2f2ee", "paint", { side: THREE.DoubleSide }),
  );
  d.position.y = 0.25;
  hga.add(d);
  const shade = cyl(
    CL_HGA_R + 0.02,
    CL_HGA_R + 0.02,
    0.1,
    foilMat("black", 1),
    40,
    true,
  );
  shade.position.y = 0.25 + 0.38 - 0.05;
  shade.material = shade.material.clone();
  shade.material.side = THREE.DoubleSide;
  hga.add(shade);
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3;
    hga.add(
      m20Bar(
        [Math.sin(a) * 1.0, 0.25 + 0.17, Math.cos(a) * 1.0],
        [0, 1.15, 0],
        0.018,
        alu,
      ),
    );
  }
  const feed = cyl(0.08, 0.08, 0.22, white, 12);
  feed.position.y = 1.0;
  hga.add(feed);
  const mga = twDish(0.2, 0.05, white, 20);
  mga.position.set(1.0, 0.3, 0.9);
  mga.rotation.x = -0.3;
  hga.add(mga); // a medium-gain horn beside the rim
  for (const [x, z] of [
    [-0.9, 0.9],
    [0.9, -0.9],
    [-0.9, -0.9],
  ]) {
    const lg = cyl(0.03, 0.03, 0.3, white, 8);
    lg.position.set(x, 0.55, z);
    hga.add(lg);
  } // the low-gain antennas
  // the solar arrays on their yokes from the sides of the propulsion module (±X), the cells toward +Z. Stowed, each
  // array is a stack of its five panels standing on edge against the body's side, its long edge along the body; on
  // deployment the stack swings out on its yoke (f 0 → 0.4), then the panels unfold (0.4 → 1)
  const arrays = [];
  for (const s of [-1, 1]) {
    const yoke = new THREE.Group();
    yoke.position.set(s * CL_PM_R, CL_PM_H * 0.5, 0);
    yoke.rotation.y = s < 0 ? Math.PI : 0;
    g.add(yoke);
    const arm = new THREE.Group();
    yoke.add(arm);
    arm.add(m20Bar([0, 0, 0], [0.9, 0, 0], 0.04, alu));
    arm.add(m20Bar([0, 0.5, 0], [0.9, 0, 0], 0.025, alu));
    arm.add(m20Bar([0, -0.5, 0], [0.9, 0, 0], 0.025, alu));
    const hub = cyl(0.12, 0.12, 0.3, dark, 16);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0.9, 0, 0);
    arm.add(hub);
    const arr = clArray(s);
    yoke.add(arr);
    const pw = CL_ARRAY[0] / CL_PANELS;
    arr.userData.swing = (f) => {
      // between the stowed pose (the stack flat against the side, centred on the body) and the deployed one (out along the yoke)
      arr.position.set(
        twLerp(0.2, 0.95, f),
        twLerp(0.55, 0, f),
        twLerp(-pw / 2, 0, f),
      );
      arr.rotation.set(0, twLerp(-Math.PI / 2, 0, f), 0);
      arm.scale.x = Math.max(twLerp(0.15, 1, f), 1e-3);
    };
    arrays.push(arr);
  }
  // the magnetometer boom from the top of the propulsion module, three sensors along it; stowed, it lies along the body
  const boom = new THREE.Group();
  boom.position.set(0.3, CL_PM_H - 0.1, CL_PM_R);
  g.add(boom);
  const can = cyl(0.14, 0.14, 0.3, alu, 16);
  can.rotation.x = Math.PI / 2;
  can.position.z = -0.15;
  boom.add(can);
  const pole = twBarMesh(0.035, mat("#d9dcdf", "metal"));
  boom.add(pole);
  const sensors = [0.4, 0.7, 1.0].map((f) => {
    const sn = box(0.14, 0.1, 0.1, mat("#d7a94a", "gold"));
    boom.add(sn);
    return { sn, f };
  });
  const setBoom = (f) => {
    const L = 0.3 + (CL_MAG - 0.3) * f;
    twSetBar(pole, [0, 0, 0], [0, 0, L]);
    for (const { sn, f: k } of sensors) sn.position.set(0, -0.05, L * k);
    boom.rotation.x = 0;
  };
  // folded (f = 0): the arrays stacked against the body and the antennas along them, the boom in its canister;
  // deployed (1): all out. Arrays over the first two hours after separation, the boom at three days, the radar at a month
  const pose = (fa, fb, fr) => {
    for (const a of arrays) {
      a.userData.swing(twPhase(fa, 0, 0.4));
      a.userData.fold(twPhase(fa, 0.4, 1));
      a.userData.deployAnt(fr);
    }
    setBoom(fb);
  };
  const D = 86400;
  if (flags.deployT != null)
    g.userData.animate = (t) => {
      const dt = t - flags.deployT;
      pose(
        twPhase(dt, 1800, 7200),
        twPhase(dt, 3 * D, 3 * D + 1200),
        twPhase(dt, 30 * D, 30 * D + 3600),
      );
    };
  const stowed = flags.stowed || flags.deployT != null;
  pose(stowed ? 0 : 1, stowed ? 0 : 1, stowed ? 0 : 1);
  g.userData.len = CL_PM_H + CL_VAULT[1] + 1.2;
  g.userData.mounts = [{ y: -0.12, r: 0.1, tag: "SC" }];
  return g;
}

// ==== 3a_starship.js
// ============================================================================
// Starship (Block 2) drawn over its stages' plain geometry (src/vehicles.js, look: 'starshipBooster' / 'starshipShip';
// called from buildStage with the stage's group, bottom at y = 0, 4.5 m radius). Both stages are stainless steel, welded
// from rings 1.83 m tall with the long seams of their sheets; the Ship wears black hexagonal heat-shield tiles on its
// windward half (−X, the side the attitude code turns into the airflow) and on the windward faces of its four flaps:
// the forward pair small and set back from the nose on the leeward side (Block 2), the aft pair large, hinged along the
// tile edge. The booster: a vented hot-staging ring on top, four grid fins just under it, the engine skirt round its
// 33 Raptors. Sizes from SpaceX's published figures (ship 52 m, booster 71 m, 9 m across; flaps and fins estimated
// from photographs).
// ============================================================================
const SS = { mats: {} };
let ssSeed = 7;
const ssRnd = () => (ssSeed = (ssSeed * 9301 + 49297) % 233280) / 233280;
// the skin: brushed stainless steel, two welded rings (3.66 m) per repeat, the sheets' vertical seams; with tiles: the
// −X half (u 0.5…1) in black hexagons, the tiles' edges a little lighter, a few darker ones
function ssSkinMat(tiles) {
  const key = tiles ? "tiles" : "steel";
  if (SS.mats[key]) return SS.mats[key];
  const W = 1024,
    H = 512,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#b4b9bf";
  g.fillRect(0, 0, W, H);
  ssSeed = 7;
  for (let i = 0; i < 2400; i++) {
    g.fillStyle =
      ssRnd() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(40,44,50,0.06)";
    g.fillRect(ssRnd() * W, ssRnd() * H, 1 + ssRnd() * 2, 10 + ssRnd() * 60);
  } // the brushing
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${(120 + ssRnd() * 60) | 0},${(110 + ssRnd() * 50) | 0},${(90 + ssRnd() * 30) | 0},0.08)`;
    g.fillRect(ssRnd() * W, ssRnd() * H, 20 + ssRnd() * 120, 8 + ssRnd() * 40);
  } // heat tint
  g.fillStyle = "rgba(70,75,82,0.5)";
  for (const y of [0, H / 2]) g.fillRect(0, y, W, 3); // ring welds
  for (let x = 0; x < W; x += W / 8) g.fillRect(x, 0, 2, H); // sheet seams
  if (tiles) {
    const r = 6.5,
      dx = r * Math.sqrt(3),
      dy = r * 1.5;
    g.fillStyle = "#17181a";
    g.fillRect(W / 2, 0, W / 2, H);
    for (let j = -1; j * dy < H + r; j++)
      for (let i = -1; i * dx < W / 2 + r; i++) {
        const cx = W / 2 + i * dx + (j % 2 ? dx / 2 : 0),
          cy = j * dy;
        const v = 20 + ssRnd() * 14;
        g.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          g.lineTo(cx + (r - 0.7) * Math.cos(a), cy + (r - 0.7) * Math.sin(a));
        }
        g.closePath();
        g.fill();
      }
    g.fillStyle = "rgba(180,185,190,0.35)";
    g.fillRect(W / 2 - 1, 0, 2, H);
    g.fillRect(W - 1, 0, 2, H); // the tile edge
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  // metalness and roughness by half: steel bright, tiles matt (a second map, the same split)
  const c2 = document.createElement("canvas");
  c2.width = 64;
  c2.height = 4;
  const g2 = c2.getContext("2d");
  g2.fillStyle = "rgb(0,80,210)";
  g2.fillRect(0, 0, 64, 4);
  if (tiles) {
    g2.fillStyle = "rgb(0,200,40)";
    g2.fillRect(32, 0, 32, 4);
  } // G roughness, B metalness
  const rm = new THREE.CanvasTexture(c2);
  rm.wrapS = rm.wrapT = THREE.RepeatWrapping;
  rm.magFilter = THREE.NearestFilter;
  return (SS.mats[key] = new THREE.MeshStandardMaterial({
    map: t,
    roughnessMap: rm,
    metalnessMap: rm,
    roughness: 1,
    metalness: 1,
  }));
}
// a stage's skin: the plain cylinders take the steel, with the welds repeating every two rings of its height
function ssSkin(g, tiles) {
  const m = ssSkinMat(tiles);
  for (const o of g.children)
    if (o.isMesh && o.geometry.type === "CylinderGeometry") {
      const h = o.geometry.parameters.height,
        mm = m.clone();
      mm.map = m.map.clone();
      mm.map.repeat.set(1, h / 3.66);
      mm.map.needsUpdate = true;
      o.material = mm;
    }
}
// a flap: hinged along the body (its hinge line along +Y at the group's origin, the flap out along +Z), its planform the
// Ship's (the outer edge straight, the leading corner cut back to the body), thick at the root and thinning to the
// edges, tiles on its −X (windward) face and steel on the back. pts: the outline in (out, along) metres, from the hinge
// at the aft corner round to the hinge at the forward corner
function ssFlap(pts, thick) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const span = Math.max(...pts.map((p) => p[0]));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.22,
    bevelSegments: 3,
  });
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 - 0.65 * clamp(p.getX(i) / span, 0, 1);
    p.setZ(i, (p.getZ(i) - thick / 2) * k);
  } // thinner toward the outer edge
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals(); // the shape's x → +Z (out from the body), its thickness along X
  const f = new THREE.Mesh(geo, mat("#b4b9bf", "metal"));
  const cap = new THREE.Mesh(
    new THREE.ShapeGeometry(s),
    mat("#1a1b1e", "tile"),
  );
  cap.rotation.y = -Math.PI / 2;
  cap.position.x = -thick / 2 - 0.2;
  f.add(cap); // the windward face, tiled
  return f;
}
// the nose: a tangent ogive L long on the body radius R, as a lathe (tiles on its windward half like the body's)
function ssOgive(L, R, seg = 40, from = 0) {
  const rho = (R * R + L * L) / (2 * R),
    pts = [];
  for (let i = 0; i <= seg; i++) {
    const y = from + ((L - from) * i) / seg,
      r = Math.sqrt(Math.max(rho * rho - y * y, 0)) + R - rho;
    pts.push(new THREE.Vector2(Math.max(r, 0.02) * 1.0, y));
  }
  return new THREE.LatheGeometry(pts, 64);
}
// the corrugated steel of the engine skirts (vertical hat stringers)

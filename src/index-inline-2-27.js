// index-inline-2 27 — three
// Lines 7673-7891 of readable/index-inline-2.pretty.js (statement-aligned).
function hstBlanketMat() {
  if (HST.mats.mli) return HST.mats.mli;
  const L = HST.door - HST.fwd,
    C = TAU * HST.r;
  const tex = hstCanvas(1024, 1024, (g, W, H) => {
    hstSeed = 5;
    g.fillStyle = "#dcdee1";
    g.fillRect(0, 0, W, H);
    const nu = Math.round(C / 1.2),
      nv = Math.round(L / 1.4);
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const v = 216 + Math.floor(hstRnd() * 22);
        g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        g.fillRect((i / nu) * W + 2, (j / nv) * H + 2, W / nu - 4, H / nv - 4);
      }
    for (let k = 0; k < 2600; k++) {
      g.fillStyle =
        hstRnd() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(60,64,70,0.07)";
      g.fillRect(
        hstRnd() * W,
        hstRnd() * H,
        2 + hstRnd() * 14,
        1 + hstRnd() * 3,
      );
    } // creases
    g.fillStyle = "rgba(120,124,130,0.35)";
    for (let y = 0.4; y < 4.0; y += 0.8)
      g.fillRect(0, (1 - y / L) * H - 3, W, 6); // the forward shell's rings
    g.strokeStyle = "rgba(95,98,104,0.8)";
    g.lineWidth = 2;
    for (let i = 0; i <= nu; i++) {
      g.beginPath();
      g.moveTo((i / nu) * W, 0);
      g.lineTo((i / nu) * W, H);
      g.stroke();
    }
    for (let j = 0; j <= nv; j++) {
      g.beginPath();
      g.moveTo(0, (j / nv) * H);
      g.lineTo(W, (j / nv) * H);
      g.stroke();
    }
  });
  return (HST.mats.mli = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
    metalness: 0.3,
  }));
}
// the aft shroud's silvered tape: sixteen panels between its longerons, the doors to the instruments
function hstShroudMat() {
  if (HST.mats.shroud) return HST.mats.shroud;
  const tex = hstCanvas(1024, 512, (g, W, H) => {
    hstSeed = 9;
    g.fillStyle = "#c9ccd0";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const v = 188 + Math.floor(hstRnd() * 26);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect((i / 16) * W + 4, 0, W / 16 - 8, H);
    }
    for (let k = 0; k < 1600; k++) {
      g.fillStyle =
        hstRnd() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(40,44,50,0.06)";
      g.fillRect(
        hstRnd() * W,
        hstRnd() * H,
        2 + hstRnd() * 10,
        1 + hstRnd() * 2,
      );
    }
    g.fillStyle = "#7d8187";
    for (let i = 0; i <= 16; i++) g.fillRect((i / 16) * W - 4, 0, 8, H); // longerons
    g.strokeStyle = "rgba(80,84,90,0.9)";
    g.lineWidth = 3;
    for (const [u, w, v0, v1] of [
      [0.06, 0.1, 0.12, 0.85],
      [0.31, 0.1, 0.12, 0.85],
      [0.56, 0.1, 0.12, 0.85],
      [0.81, 0.1, 0.12, 0.85],
    ])
      g.strokeRect(u * W, v0 * H, w * W, (v1 - v0) * H); // instrument doors
  });
  return (HST.mats.shroud = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.28,
    metalness: 0.7,
  }));
}
// a solar array blanket: dark blue cells with silver bus bars on the face, the brown Kapton behind
function hstCellMat(back) {
  const k = back ? "kapton" : "cells";
  if (HST.mats[k]) return HST.mats[k];
  const tex = hstCanvas(256, 1024, (g, W, H) => {
    hstSeed = back ? 13 : 17;
    g.fillStyle = back ? "#7a5631" : "#1a2140";
    g.fillRect(0, 0, W, H);
    if (back) {
      g.strokeStyle = "rgba(40,26,12,0.5)";
      for (let y = 0; y < H; y += 16) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      return;
    }
    for (let x = 0; x < W; x += 16)
      for (let y = 0; y < H; y += 12) {
        const v = 22 + hstRnd() * 10;
        g.fillStyle = `rgb(${v},${v + 8},${v + 40})`;
        g.fillRect(x + 1, y + 1, 14, 10);
      }
    g.fillStyle = "#9da3ad";
    for (let y = 0; y < H; y += 96) g.fillRect(0, y, W, 3);
    g.fillRect(0, 0, 4, H);
    g.fillRect(W - 4, 0, 4, H);
  });
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  return (HST.mats[k] = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: back ? 0.6 : 0.35,
    metalness: back ? 0.3 : 0.4,
  }));
}
const hstYellow = () => mat("#e2b33a", "paint"),
  hstSilver = () => mat("#cfd3d8", "metal");
// one solar array wing in its mast's frame: the mast along +X from the drive, the drum and the blanket beyond it, the
// blanket rolled out both ways along ±Y. userData.unroll(u): u from 0 (rolled up on the drum) to 1.
function hstWing() {
  const g = new THREE.Group(),
    mastL = 1.2,
    drumL = 2.5,
    x0 = mastL + 0.05,
    xc = x0 + drumL / 2,
    half = 6.05;
  const mast = cyl(0.07, 0.07, mastL, hstSilver(), 10);
  mast.rotation.z = -Math.PI / 2;
  g.add(mast);
  const drive = cyl(0.16, 0.16, 0.2, mat("#8d9298", "metal"), 14);
  drive.rotation.z = -Math.PI / 2;
  g.add(drive);
  const drum = cyl(0.13, 0.13, drumL, mat("#b9bec4", "metal"), 16);
  drum.rotation.z = -Math.PI / 2;
  drum.position.x = x0;
  g.add(drum);
  const bl = new THREE.Group();
  bl.position.x = xc;
  g.add(bl); // the blankets, in the plane of X and Y: the cells face +Z
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(drumL - 0.1, 2 * half),
    hstCellMat(false),
  );
  face.position.z = 0.006;
  bl.add(face);
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(drumL - 0.1, 2 * half),
    hstCellMat(true),
  );
  back.rotation.y = Math.PI;
  back.position.z = -0.006;
  bl.add(back);
  const booms = [],
    spread = [];
  for (const s of [-1, 1])
    for (const e of [-1, 1]) {
      const b = cyl(0.025, 0.025, half, hstSilver(), 6);
      b.position.set(xc + e * (drumL / 2 - 0.04), 0, 0);
      b.rotation.x = s > 0 ? 0 : Math.PI;
      g.add(b);
      booms.push(b);
    }
  for (const s of [-1, 1]) {
    const sb = cyl(0.03, 0.03, drumL, mat("#9ca1a7", "metal"), 6);
    sb.rotation.z = -Math.PI / 2;
    sb.position.set(x0, s * half, 0);
    g.add(sb);
    spread.push({ sb, s });
  }
  g.userData.unroll = (u) => {
    const f = 0.012 + 0.988 * u;
    bl.scale.y = f;
    bl.visible = u > 0.002;
    for (const b of booms) b.scale.y = Math.max(f, 0.01);
    for (const { sb, s } of spread) sb.position.y = s * half * f;
  };
  g.userData.unroll(1);
  return g;
}
// a high-gain antenna on its mast, along +Z from the hinge, the dish on its gimbal at the end (userData.dish: facing out
// along the mast; turned 90° about X it lies flat against the body when the mast is stowed)
function hstAntenna() {
  const g = new THREE.Group(),
    L = 4.0,
    dg = new THREE.Group();
  dg.position.z = L;
  g.add(dg);
  const m = cyl(0.06, 0.06, L, hstSilver(), 8);
  m.rotation.x = Math.PI / 2;
  g.add(m);
  const gim = box(0.3, 0.25, 0.3, mat("#8d9298", "metal"));
  gim.position.y = -0.12;
  dg.add(gim);
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 28, 8, 0, TAU, 0, 0.88),
    mat("#e8e9ea", "paint", { side: THREE.DoubleSide }),
  );
  d.rotation.x = -Math.PI / 2;
  d.position.z = 0.95;
  dg.add(d); // 1.3 m across
  const feed = cyl(0.04, 0.04, 0.5, mat("#6d7177", "metal"), 8);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.25;
  dg.add(feed);
  g.userData.dish = dg;
  return g;
}

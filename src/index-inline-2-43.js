// index-inline-2 43 — math
// Lines 11768-12071 of readable/index-inline-2.pretty.js (statement-aligned).
function jwKiteTex(tint) {
  const key = "kite" + tint;
  if (JW[key]) return JW[key];
  const w = 512,
    H = new Float32Array(w * w);
  let s = 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const inKite = (x, y) =>
    Math.abs(x / w - 0.5) * 2 + Math.abs(y / w - 0.5) * 2 <= 1.0;
  // the seams: from each corner of the kite, lines fanning across to the far edges (the membranes are sewn in gores)
  const corners = [
    [0, 0.5],
    [1, 0.5],
    [0.5, 0],
    [0.5, 1],
  ];
  const line = (x0, y0, x1, y1, amp, wid) => {
    const dx = x1 - x0,
      dy = y1 - y0,
      L = Math.hypot(dx, dy),
      ux = dx / L,
      uy = dy / L;
    for (let t = 0; t < L; t += 1) {
      const cx = x0 + ux * t,
        cy = y0 + uy * t;
      for (let o = -wid; o <= wid; o++) {
        const px = Math.round(cx - uy * o),
          py = Math.round(cy + ux * o);
        if (px < 0 || py < 0 || px >= w || py >= w) continue;
        H[py * w + px] += amp * (1 - Math.abs(o) / (wid + 1));
      }
    }
  };
  for (const [cx, cy] of corners)
    for (let k = 0; k < 7; k++) {
      const a = (k + 0.5) / 7;
      const tx =
        cx < 0.5 && cy === 0.5
          ? 0.5 + a * 0.5
          : cx > 0.5 && cy === 0.5
            ? 0.5 - a * 0.5
            : 0.5 + (a - 0.5) * 0.9;
      const ty =
        cy === 0.5
          ? k % 2
            ? 0.08 + a * 0.84
            : 0.92 - a * 0.84
          : cy < 0.5
            ? 0.5 + a * 0.5
            : 0.5 - a * 0.5;
      line(cx * w, cy * w, tx * w, ty * w, 0.26, 1);
    }
  // ripples: long shallow creases roughly along the seams, and short ones anywhere
  for (let n = 0; n < 260; n++) {
    const x0 = rnd() * w,
      y0 = rnd() * w,
      ang = rnd() * Math.PI,
      len = 20 + rnd() * 160,
      amp = (rnd() - 0.5) * 0.5,
      wid = 2 + rnd() * 6;
    line(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len, amp, wid);
  }
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = w;
    return c;
  };
  const col = mk(),
    nor = mk(),
    g = col.getContext("2d"),
    gn = nor.getContext("2d"),
    img = g.createImageData(w, w),
    imn = gn.createImageData(w, w);
  const cB = new THREE.Color(tint),
    cH = cB.clone().lerp(new THREE.Color("#ffffff"), 0.45),
    cL = cB.clone().multiplyScalar(0.62),
    c = new THREE.Color();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x,
        hx = H[y * w + Math.min(x + 1, w - 1)] - H[y * w + Math.max(x - 1, 0)],
        hy = H[Math.min(y + 1, w - 1) * w + x] - H[Math.max(y - 1, 0) * w + x];
      const sh = clamp(0.5 + hx * 1.4 - hy * 0.9 + (rnd() - 0.5) * 0.06, 0, 1);
      if (sh > 0.5) c.copy(cB).lerp(cH, (sh - 0.5) * 2);
      else c.copy(cL).lerp(cB, sh * 2);
      if (!inKite(x, y)) c.copy(cB);
      img.data[4 * k] = c.r * 255;
      img.data[4 * k + 1] = c.g * 255;
      img.data[4 * k + 2] = c.b * 255;
      img.data[4 * k + 3] = 255;
      const nx = -hx * 2.2,
        ny = -hy * 2.2,
        nl = Math.hypot(nx, ny, 1);
      imn.data[4 * k] = ((nx / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 1] = ((ny / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 2] = ((1 / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  gn.putImageData(imn, 0, 0);
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const nmap = new THREE.CanvasTexture(nor);
  return (JW[key] = { map, nmap });
}
// a dark composite with the lattice of a truss showing through: the backplane and the tower
function jwTrussMat() {
  if (JW.truss) return JW.truss;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#17181c";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#2b2d33";
  g.lineWidth = 3;
  for (let i = -256; i < 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 256, 0);
    g.lineTo(i, 256);
    g.stroke();
  }
  g.strokeStyle = "#34363c";
  g.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return (JW.truss = new THREE.MeshStandardMaterial({
    map: t,
    color: "#ffffff",
    roughness: 0.62,
    metalness: 0.3,
  }));
}
// the solar array's cells: pale blue-grey with the grid of cell edges
function jwCellMat() {
  if (JW.cell) return JW.cell;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#b6c3d6";
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "#8d9bb0";
  g.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 128);
    g.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.strokeStyle = "#6f7d93";
  g.lineWidth = 4;
  g.strokeRect(0, 0, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (JW.cell = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.45,
    metalness: 0.2,
  }));
}
// The observatory: the published model of the deployed telescope (assets/jwst.glb, by Paul on Sketchfab, CC BY 4.0,
// cut into its moving parts by tools/models), folded and unfolded by the same steps as the hand drawing, which is shown
// until the file arrives (or if it cannot be loaded) and for the launch pose
const JW_S = 21.2 / 31.08; // metres per unit of the file (tools/models/build.mjs)
function jwstFineModel(parts) {
  const g = new THREE.Group(),
    P = {};
  for (const k of [
    "bus",
    "shield",
    "fwdPallet",
    "aftPallet",
    "solar",
    "hga",
    "tel",
    "wingL",
    "wingR",
    "tripod",
    "topStrut",
  ]) {
    P[k] = parts[k] ? parts[k].clone() : new THREE.Group();
  }
  const telG = new THREE.Group();
  g.add(telG);
  for (const k of ["bus", "shield", "fwdPallet", "aftPallet", "solar", "hga"])
    g.add(P[k]);
  for (const k of ["tel", "wingL", "wingR", "tripod", "topStrut"])
    telG.add(P[k]);
  const lerp = (a, b, f) => a + (b - a) * f;
  // the apex of the tripod and the foot of the third strut, in the telescope's frame (the file's units → metres)
  const apex0 = new THREE.Vector3(0, (5.0 - 4.0) * JW_S, 13.5 * JW_S),
    pvT = P.tripod.position.clone(),
    pfS = P.topStrut.position.clone(),
    d0 = apex0.clone().sub(pfS),
    a0 = Math.atan2(d0.y, d0.z),
    L0 = d0.length();
  const _ap = new THREE.Vector3(),
    _d = new THREE.Vector3();
  g.userData.pose = (f) => {
    telG.position.y = lerp(-0.8, 0, f("dta"));
    P.wingL.rotation.y = (-(1 - f("portWing")) * Math.PI) / 2;
    P.wingR.rotation.y = ((1 - f("stbdWing")) * Math.PI) / 2; // (folded back behind the mirror)
    const th = -1.215 * (1 - f("smss"));
    P.tripod.rotation.x = th; // (folded up the mirror's face)
    _ap
      .copy(apex0)
      .sub(pvT)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), th)
      .add(pvT);
    _d.copy(_ap).sub(pfS);
    P.topStrut.rotation.x = a0 - Math.atan2(_d.y, _d.z);
    P.topStrut.scale.setScalar(Math.max(0.05, _d.length() / L0));
    P.fwdPallet.rotation.x = (-(1 - f("fwdPallet")) * Math.PI) / 2;
    P.aftPallet.rotation.x = ((1 - f("aftPallet")) * Math.PI) / 2; // (standing up for launch)
    const open = Math.min(f("fwdPallet"), f("aftPallet")),
      ten =
        (f("tension1") +
          f("tension2") +
          f("tension3") +
          f("tension4") +
          f("tension5")) /
        5;
    P.shield.scale.set(
      lerp(0.12, 1, f("booms")),
      lerp(0.35, 1, ten),
      lerp(0.12, 1, open),
    );
  };
  g.userData.len = 12.0;
  g.userData.mounts = [{ y: 0, r: 0.3, tag: "OBS", prop: "mmh" }];
  return g;
}
function jwstModel(flags = {}) {
  const g = new THREE.Group(),
    hand = jwstHandModel(flags);
  g.add(hand);
  g.userData = { ...hand.userData };
  const steps = flags.deploy || [],
    stowed = flags.stowed || flags.deployT != null;
  const F = (t) => {
    const Q = {};
    for (const s of steps)
      Q[s.key] = smoothstep(
        clamp((t - (flags.deployT + s.at)) / Math.max(s.dur, 1), 0, 1),
      );
    return (k) => (flags.stowed ? 0 : flags.deployT == null ? 1 : (Q[k] ?? 1));
  };
  let fine = null,
    fPose = F(flags.deployT || 0);
  // the hand drawing while the pallets are still up round the folded telescope (the launch pose, the first three days),
  // the published model from the moment they are down: its parts fold the rest of the way
  const useFine = (f) => fine && f("fwdPallet") >= 1 && f("aftPallet") >= 1;
  const show = (f) => {
    const u = useFine(f);
    if (fine && fine.visible !== !!u) {
      fine.visible = !!u;
      hand.visible = !u;
      refreshBounds(g);
    }
  };
  const put = (parts) => {
    if (!parts || !parts.bus) return;
    fine = jwstFineModel(parts);
    fine.userData.pose(fPose);
    fine.visible = false;
    g.add(fine);
    show(fPose);
  };
  if (!flags.stowed) {
    if (DETAIL.ready.jwst !== undefined) put(DETAIL.ready.jwst);
    else detailFile("jwst").then(put);
  }
  if (flags.deployT != null)
    g.userData.animate = (t) => {
      fPose = F(t);
      if (fine) fine.userData.pose(fPose);
      if (hand.userData.animate) hand.userData.animate(t);
      show(fPose);
    };
  return g;
}

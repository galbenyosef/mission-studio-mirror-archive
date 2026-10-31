// index-inline-2 24 — math
// Lines 6730-7080 of readable/index-inline-2.pretty.js (statement-aligned).
function m20HeatShieldProfile() {
  const p = [];
  for (let a = 0; a <= 20; a += 2)
    p.push([1.125 * Math.sin(a * DEG), 1.125 * (1 - Math.cos(a * DEG))]);
  for (let a = -70; a <= 37; a += 6)
    p.push([
      2.124 + 0.126 * Math.cos(a * DEG),
      0.835 + 0.126 * Math.sin(a * DEG),
    ]); // shoulder (centre r 2.124, y 0.835)
  p.push([
    2.124 + 0.126 * Math.cos(37 * DEG),
    0.835 + 0.126 * Math.sin(37 * DEG),
  ]);
  return p;
}
const M20_SEAL = [2.225, 0.911],
  M20_HIP = [1.519, 1.85],
  M20_BIP = [0.654, 2.355],
  M20_PCC = [0.366, 2.875],
  M20_TOP = 3.001;
function m20BackshellProfile() {
  const p = [M20_SEAL, M20_HIP, M20_BIP, M20_PCC];
  for (let k = 1; k <= 4; k++) {
    const f = k / 4;
    p.push([
      M20_PCC[0] * Math.cos((f * Math.PI) / 2),
      M20_PCC[1] + (M20_TOP - M20_PCC[1]) * Math.sin((f * Math.PI) / 2),
    ]);
  }
  return p;
}
// the inside of a shell: the profile moved in along its normals, in reverse order (its faces turned inward)
function m20Inner(pts, d) {
  const out = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)],
      tr = b[0] - a[0],
      ty = b[1] - a[1],
      l = Math.hypot(tr, ty) || 1;
    return [Math.max(0, p[0] - (d * ty) / l), p[1] + (d * tr) / l];
  });
  return out.reverse();
}
// a texture drawn on a canvas, its top row at v = 0 (where a lathe's profile starts)
function m20Canvas(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let m20Seed = 7;
const m20Rnd = () => (m20Seed = (m20Seed * 9301 + 49297) % 233280) / 233280;
// the heat shield's PICA tiles: rings of tiles about 0.4 m across from the nose cap out over the shoulder, each a slightly
// different dark brown-black, the filled gaps between them a little lighter; a few sensor plugs near the nose
function m20HeatShieldMat() {
  if (M20.mats.hs) return M20.mats.hs;
  const prof = m20Resample(m20HeatShieldProfile(), 200),
    L = prof.len,
    W = 2048,
    H = 512;
  const tex = m20Canvas(W, H, (g) => {
    m20Seed = 11;
    g.fillStyle = "#26221f";
    g.fillRect(0, 0, W, H);
    const rows = [0, 0.32];
    while (rows[rows.length - 1] < L - 0.25)
      rows.push(Math.min(L, rows[rows.length - 1] + 0.4));
    rows.push(L);
    for (let k = 0; k < rows.length - 1; k++) {
      const y0 = (rows[k] / L) * H,
        y1 = (rows[k + 1] / L) * H,
        r = prof.at((rows[k] + rows[k + 1]) / 2)[0],
        n = k === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * r) / 0.42)),
        off = m20Rnd();
      for (let j = 0; j < n; j++) {
        const x0 = ((j + off) / n) * W,
          x1 = ((j + 1 + off) / n) * W,
          v = 30 + Math.floor(m20Rnd() * 16);
        g.fillStyle = `rgb(${v + 8},${v + 2},${v - 2})`;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.fillRect(x0 - W, y0, x1 - x0, y1 - y0);
      }
      g.fillStyle = "#5a4a3e";
      if (k > 0) g.fillRect(0, y0 - 1.5, W, 3); // the gap between two rings
      if (k > 0)
        for (let j = 0; j < n; j++) {
          const x = (((j + off) / n) * W) % W;
          g.fillRect(x - 1.5, y0, 3, y1 - y0);
        }
    }
    for (let i = 0; i < 9000; i++) {
      const v = m20Rnd();
      g.fillStyle = v > 0.5 ? "rgba(255,235,210,0.035)" : "rgba(0,0,0,0.06)";
      g.fillRect(
        m20Rnd() * W,
        m20Rnd() * H,
        2 + m20Rnd() * 6,
        1 + m20Rnd() * 3,
      );
    } // the ablator's fibrous mottle
    g.fillStyle = "#6a5c50";
    for (const [x, s] of [
      [0, 0.05],
      [0.25, 0.5],
      [0.75, 0.5],
      [0.1, 0.9],
      [0.6, 0.9],
      [0.35, 1.4],
      [0.85, 1.4],
    ]) {
      g.beginPath();
      g.arc(x * W, (s / L) * H, 3, 0, 2 * Math.PI);
      g.fill();
    } // sensor plugs
  });
  return (M20.mats.hs = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.05,
  }));
}
// the backshell's white paint and what shows on it: the dark rim of the seal with its bolts; round ports (grey, and
// smaller gold ones) in a row above the seal; an access panel with its rivets; the hip; on the upper cone two gold-rimmed
// ports and a ring of rivets below the interface plate; the plate's aluminium ring; the parachute closeout cone, a slightly
// warmer white, with a slot on one side; the lid
function m20BackshellMat() {
  if (M20.mats.bs) return M20.mats.bs;
  const prof = m20Resample(m20BackshellProfile(), 200),
    L = prof.len,
    W = 2048,
    H = 1024,
    S = (s) => (s / L) * H;
  const sHip = Math.hypot(M20_SEAL[0] - M20_HIP[0], M20_SEAL[1] - M20_HIP[1]),
    sBip = sHip + Math.hypot(M20_HIP[0] - M20_BIP[0], M20_HIP[1] - M20_BIP[1]),
    sPcc = sBip + Math.hypot(M20_BIP[0] - M20_PCC[0], M20_BIP[1] - M20_PCC[1]);
  // a disc of radius rho (m) on the shell at azimuth a (deg, from +Z toward +X) and distance s along the profile: an ellipse on the map
  const disc = (g, a, s, rho, fill, rim) => {
    const r = prof.at(s)[0],
      ex = (rho / (2 * Math.PI * r)) * W,
      ey = (rho / L) * H,
      x = ((((a / 360) % 1) + 1) % 1) * W;
    for (const dx of [0, -W, W]) {
      g.beginPath();
      g.ellipse(x + dx, S(s), ex, ey, 0, 0, 2 * Math.PI);
      g.fillStyle = fill;
      g.fill();
      if (rim) {
        g.lineWidth = 2;
        g.strokeStyle = rim;
        g.stroke();
      }
    }
  };
  const dots = (g, s, step, col) => {
    const r = prof.at(s)[0],
      n = Math.round((2 * Math.PI * r) / step);
    g.fillStyle = col;
    for (let k = 0; k < n; k++) {
      g.beginPath();
      g.arc(((k + 0.5) / n) * W, S(s), 1.6, 0, 2 * Math.PI);
      g.fill();
    }
  };
  const tex = m20Canvas(W, H, (g) => {
    m20Seed = 5;
    g.fillStyle = "#e9e8e3";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle =
        m20Rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(90,85,78,0.035)";
      g.fillRect(
        m20Rnd() * W,
        m20Rnd() * S(sBip),
        3 + m20Rnd() * 10,
        2 + m20Rnd() * 5,
      );
    }
    g.fillStyle = "#2f3034";
    g.fillRect(0, 0, W, S(0.035));
    dots(g, 0.018, 0.3, "#9a9ca0"); // the seal's rim and its bolts
    // round ports above the seal (azimuth, size): large grey ones and small gold ones
    for (const [a, big] of [
      [-78, 0],
      [-62, 0],
      [-40, 1],
      [-20, 0],
      [-2, 0],
      [15, 1],
      [33, 0],
      [52, 0],
      [70, 1],
      [118, 0],
      [160, 1],
      [205, 0],
      [250, 1],
      [290, 0],
      [318, 0],
    ])
      disc(
        g,
        a,
        big ? 0.36 : 0.33,
        big ? 0.11 : 0.055,
        big ? "#c3c3bf" : "#a8925a",
        big ? "#8f8f8b" : "#6f5f37",
      );
    // an access panel (rounded, rivets round its edge)
    {
      const s0 = 0.6,
        s1 = 1.0,
        r = prof.at((s0 + s1) / 2)[0],
        w = (0.55 / (2 * Math.PI * r)) * W,
        x = (1 - 55 / 360) * W,
        y0 = S(s0),
        y1 = S(s1);
      g.strokeStyle = "rgba(110,108,102,0.8)";
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(x - w / 2, y0, w, y1 - y0, 12);
      g.stroke();
      g.fillStyle = "rgba(95,92,86,0.9)";
      for (let k = 0; k <= 8; k++)
        for (const [px, py] of [
          [x - w / 2 + 6 + (k * (w - 12)) / 8, y0 + 6],
          [x - w / 2 + 6 + (k * (w - 12)) / 8, y1 - 6],
          [x - w / 2 + 6, y0 + 6 + (k * (y1 - y0 - 12)) / 8],
          [x + w / 2 - 6, y0 + 6 + (k * (y1 - y0 - 12)) / 8],
        ]) {
          g.beginPath();
          g.arc(px, py, 1.8, 0, 2 * Math.PI);
          g.fill();
        }
    }
    g.strokeStyle = "rgba(150,147,140,0.45)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, S(sHip));
    g.lineTo(W, S(sHip));
    g.stroke(); // the hip
    for (const a of [20, 200]) {
      disc(g, a, sHip + 0.6, 0.17, "#c49a42");
      disc(g, a, sHip + 0.6, 0.12, "#47474a");
      disc(g, a, sHip + 0.6, 0.07, "#7d7e82");
    } // gold-rimmed ports
    dots(g, sBip - 0.06, 0.07, "rgba(105,103,98,0.9)"); // rivets below the interface plate
    g.fillStyle = "#b5b8bc";
    g.fillRect(0, S(sBip) - 6, W, 12); // the interface plate's ring
    g.fillStyle = "#eeebe4";
    g.fillRect(0, S(sBip) + 6, W, S(sPcc) - S(sBip) - 6); // the parachute closeout cone
    dots(g, sBip + 0.05, 0.08, "rgba(120,118,112,0.8)");
    disc(g, -40, sBip + 0.3, 0.07, "rgba(60,60,64,0.85)"); // the slot in its side
    g.fillStyle = "#f2f0ea";
    g.fillRect(0, S(sPcc), W, H - S(sPcc)); // the lid
  });
  return (M20.mats.bs = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    metalness: 0.03,
  }));
}
const m20InnerMat = () =>
  M20.mats.inner ||
  (M20.mats.inner = new THREE.MeshStandardMaterial({
    color: "#3a3c40",
    roughness: 0.7,
    metalness: 0.3,
    side: THREE.DoubleSide,
  }));
// the heat shield (with its inner face, the structure it is bonded to), y = 0 at the nose
function m20HeatShield() {
  const g = new THREE.Group(),
    prof = m20Resample(m20HeatShieldProfile(), 70);
  g.add(lathe(prof, m20HeatShieldMat(), 96));
  const inner = m20Inner(prof, 0.06);
  g.add(lathe(inner, mat("#4a4740", "dark", { side: THREE.DoubleSide }), 72));
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(inner[0][0], prof[prof.length - 1][0], 72, 1),
    mat("#5a5048", "dark", { side: THREE.DoubleSide }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = prof[prof.length - 1][1];
  g.add(rim);
  g.userData.len = M20_SEAL[1];
  return g;
}
// the backshell with the interface plate, the parachute closeout cone and its lid; the bolts round the plate that hold the
// cruise stage; the parachute low-gain antenna's radome on the lid; the cruise balance masses (flags.cbm: there until the
// cruise stage goes)
function m20Backshell(flags = {}) {
  const g = new THREE.Group(),
    prof = m20Resample(m20BackshellProfile(), 90);
  g.add(lathe(prof, m20BackshellMat(), 96));
  g.add(
    lathe(
      m20Inner(m20Resample([M20_SEAL, M20_HIP, M20_BIP], 30), 0.05),
      m20InnerMat(),
      64,
    ),
  );
  const radome = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 20, 10, 0, TAU, 0, Math.PI / 2),
    mat("#f4f1ea", "paint"),
  );
  radome.position.set(0.15, M20_TOP - 0.03, 0.04);
  g.add(radome);
  for (let k = 0; k < 4; k++) {
    const b = cyl(0.03, 0.03, 0.05, mat("#c9a04a", "gold"), 10);
    b.position.set(...m20Polar(0.7, (30 + 90 * k) * DEG, M20_BIP[1] - 0.01));
    g.add(b);
  }
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    m20InnerMat(),
  );
  plate.rotation.x = Math.PI / 2;
  plate.position.y = M20_BIP[1] - 0.05;
  g.add(plate); // the interface plate from inside (the parachute is packed above it)
  if (flags.cbm)
    for (const a of [0, Math.PI]) {
      const b = box(0.24, 0.16, 0.2, mat("#6f7378", "metal"));
      const r = M20_SEAL[0] - 0.2;
      b.position.set(Math.sin(a) * r, M20_SEAL[1] + 0.12, Math.cos(a) * r);
      b.rotation.y = a;
      b.rotateX(-0.64);
      g.add(b);
    }
  g.userData.len = M20_TOP;
  return g;
}
// small builders: a point at azimuth a (from +Z toward +X), radius r, height y; a round tube and a square beam from p to q
const m20Polar = (r, a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
const M20_UP = new THREE.Vector3(0, 1, 0);
function m20Span(geo, p, q, m) {
  const a = new THREE.Vector3(...p),
    d = new THREE.Vector3(...q).sub(a),
    L = d.length(),
    o = new THREE.Mesh(geo(L), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(M20_UP, d.normalize());
  return o;
}
const m20Bar = (p, q, r, m) =>
  m20Span((L) => new THREE.CylinderGeometry(r, r, L, 8), p, q, m);
const m20Beam = (p, q, w, m) =>
  m20Span((L) => new THREE.BoxGeometry(w, L, w), p, q, m);
// the cruise stage's solar array: cells in ten panels round the central cylinder

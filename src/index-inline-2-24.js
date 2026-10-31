// index-inline-2 24 — math
// Lines 6696-6968 of readable/index-inline-2.pretty.js (statement-aligned).
function issModel(flags = {}) {
  return detailPart("iss", "iss", issBuiltIn(flags), {
    extra: (g) => {
      if (flags.mplm) g.add(issMplm());
    },
  });
}
// the logistics module (Raffaello on STS-135) on Harmony's nadir port
function issMplm() {
  const g = new THREE.Group(),
    m = mat("#e7e5df", "paint");
  const c = cyl(2.25, 2.25, 4.9, m, 32);
  c.position.y = -4.9 / 2;
  g.add(c);
  const a = cyl(2.25, 1.1, 0.8, mat("#d5d3cc", "paint"), 32);
  a.position.y = 2.45;
  g.add(a); // the berthing end, up against Harmony
  const b = cyl(1.6, 2.25, 0.6, mat("#d5d3cc", "paint"), 32);
  b.position.y = -3.05;
  g.add(b);
  g.rotation.x = Math.PI / 2;
  g.position.set(0, 15.0, -2.2 - 3.25);
  return g;
}
function issBuiltIn(flags = {}) {
  const g = new THREE.Group(),
    white = mat("#e9e8e3", "paint"),
    metal = mat("#b8bcc1", "metal"),
    arr = mat("#a77a3a", "solar"),
    rad = mat("#f2f2ee", "paint", { side: THREE.DoubleSide });
  const yT = 7.3; // the integrated truss sits on top of the Destiny laboratory
  const T = new THREE.Mesh(new THREE.BoxGeometry(109, 3.6, 3.6), metal);
  T.position.set(0, yT, 5.6);
  g.add(T);
  for (const s of [-1, 1])
    for (const x0 of [33, 46])
      for (const dz of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.08, 34), arr);
        w.position.set(s * x0, yT, 5.6 + dz * 19.5);
        g.add(w); // solar array wings (each pair 73 m tip to tip)
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 34, 6),
          metal,
        );
        mast.rotation.x = Math.PI / 2;
        mast.position.set(s * x0, yT - 0.2, 5.6 + dz * 19.5);
        g.add(mast);
      }
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 13), rad);
      r.position.set(s * (14 + k * 3.4), yT, 5.6 - 8.5);
      g.add(r);
    } // radiators
  const mod = (r, len, y, x = 0, z = 0, rx = 0, rz = 0, m = white) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), m);
    c.position.set(x, y, z);
    c.rotation.set(rx, 0, rz);
    g.add(c);
    return c;
  };
  mod(2.2, 7.2, 15.1); // Harmony
  mod(1.1, 2.8, 20.1, 0, 0, 0, 0, metal); // PMA-2
  mod(2.2, 8.5, 7.3); // Destiny
  mod(2.2, 5.5, 0.6); // Unity
  mod(2.05, 12.6, -8.6); // Zarya
  mod(2.1, 13.1, -21.5); // Zvezda
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.06, 3.2),
      mat("#1d2a4a", "solar"),
    );
    w.position.set(s * 7.4, -24.5, 0);
    g.add(w);
  }
  mod(2.25, 6.9, 15.1, 5.6, 0, 0, Math.PI / 2); // Columbus (starboard)
  mod(2.2, 11.2, 15.1, -7.8, 0, 0, Math.PI / 2); // Kibo (port)
  mod(2.2, 6.7, 0.6, -5.6, 0, 0, Math.PI / 2); // Tranquility
  if (flags.mplm) mod(2.25, 6.6, 15.1, 0, -2.2 - 3.3, Math.PI / 2, 0); // the logistics module on Harmony's nadir port
  g.userData.len = 60;
  g.userData.yc0 = 0;
  return g;
}

// ==== 33_mars2020.js
// ============================================================================
// Mars 2020's flight system apart from the rover (metres): the cruise stage, the aeroshell (heat shield and backshell) and
// the descent stage, the "sky crane". Mars 2020 was built to Mars Science Laboratory's drawings, so the shapes are MSL's.
// Axes: +Y along the axis from the heat shield's nose (Y = 0) toward the cruise stage; the heat shield leads into the air.
// The parts' proportions and layout follow NASA's exploded drawing of the spacecraft (PIA24128) and photographs of it
// being put together (PIA23887, PIA23886; MSL's descent stage, PIA11425).
//
// Aeroshell (MSL entry papers: Edquist 2009, Johansen 2011, Schoenenberger 2013): 4.5 m across. The heat shield is a 70°
// sphere-cone (nose radius 1.125 m) rounded at its shoulder (radius 0.126 m), 0.835 m from the nose to its widest point,
// covered in about a hundred PICA tiles (dark) with filled gaps between them. The backshell, painted white, is two cones
// (half-angles 36.9° and 59.7°, meeting at the 3.04 m "hip") up to the backshell interface plate (1.31 m across); on it the
// 29° parachute closeout cone and its lid, which the parachute is fired through, 3.0 m from the nose. A row of round ports
// and an access panel on the lower cone, a gold-rimmed port on the upper cone, bolts round the interface plate.
// Cruise stage: a disc as wide as the aeroshell, its outward face covered in solar cells, bolted to the interface plate
// round the parachute cone; ten radiator panels hang from its rim toward the aeroshell, so that it looks like a drum. Inside
// it: two propellant tanks, the cooling loop's pipes, electronics in gold blankets; two clusters of four thrusters on
// struts below the rim, on opposite sides; the medium-gain antenna's horn in a gap between two radiators. The cruise stage
// and the aeroshell together are 3.0 m tall (MSL launch press kit).
// Descent stage: a tapered octagonal frame, wider at its foot, holding three propellant tanks and two pressurant tanks in
// blankets; below its centre a keel with the bridle device at its point; eight throttleable engines in pairs on outriggers
// at the four diagonals, one of each pair canted 5° outboard and the other 22.5°; the radar's six antennas on a plate on one
// side. The rover hangs under the keel with its wheels folded up beside its body until it is lowered on three bridles and
// an umbilical, 6.4 m long (Perseverance's: Curiosity's were 7.5 m).
// ============================================================================
const M20 = { mats: {} };
// the profile [r, y] of the aeroshell's outer surface, resampled evenly along its length (so a texture's rows follow it)
function m20Resample(pts, n) {
  const L = [0];
  for (let i = 1; i < pts.length; i++)
    L.push(
      L[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L[L.length - 1] * k) / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / Math.max(L[j + 1] - L[j], 1e-9);
    out.push([
      pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f,
      pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f,
    ]);
  }
  out.len = L[L.length - 1];
  out.at = (s) => {
    let i = 0;
    while (i < L.length - 2 && L[i + 1] < s) i++;
    const f = (s - L[i]) / Math.max(L[i + 1] - L[i], 1e-9);
    return [
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ];
  };
  out.sOf = L;
  return out;
}
// heat shield: nose sphere to its tangent cone (20° from the axis), the 70° cone, the shoulder round to the seal with the backshell
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

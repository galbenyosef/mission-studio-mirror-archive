// index-inline-2 19 — math
// Lines 5093-5336 of readable/index-inline-2.pretty.js (statement-aligned).
function smSkinMat() {
  if (APOLLO.smSkin) return APOLLO.smSkin;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#c6cacf";
  g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 6; k++) {
    g.fillStyle = k % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    g.fillRect((k * 1024) / 6, 0, 1024 / 6, 512);
  } // six bays
  g.fillStyle = "#eef0f2";
  for (const x0 of [96, 608]) g.fillRect(x0, 60, 210, 330); // the ECS/EPS radiator panels (white), on opposite sides
  g.strokeStyle = "rgba(160,166,172,0.9)";
  g.lineWidth = 2;
  for (const x0 of [96, 608])
    for (let i = 1; i < 10; i++) {
      g.beginPath();
      g.moveTo(x0 + i * 21, 62);
      g.lineTo(x0 + i * 21, 388);
      g.stroke();
    } // radiator tubes
  g.strokeStyle = "rgba(40,44,48,0.55)";
  g.lineWidth = 2;
  for (let k = 0; k <= 6; k++) {
    const x = (k * 1024) / 6;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  } // bay seams
  for (const y of [40, 470]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(1024, y);
    g.stroke();
  }
  g.fillStyle = "rgba(30,32,36,0.8)";
  for (let k = 0; k < 220; k++)
    g.fillRect((k * 197) % 1024, 40 + ((k * 89) % 430), 2, 2); // fasteners
  // UNITED STATES in red down bay 1, with the flag above it, and the red stripe the umbilical fairing's foot sits on
  g.save();
  g.translate(440, 120);
  g.rotate(Math.PI / 2);
  g.fillStyle = "#c8322b";
  g.font = "bold 26px Helvetica, Arial, sans-serif";
  g.textBaseline = "middle";
  g.fillText("UNITED STATES", 0, 0);
  g.restore();
  g.fillStyle = "#b22234";
  g.fillRect(425, 60, 44, 28);
  g.fillStyle = "#ffffff";
  for (let i = 1; i < 7; i += 2) g.fillRect(425, 60 + i * 4, 44, 4);
  g.fillStyle = "#3c3b6e";
  g.fillRect(425, 60, 18, 15);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (APOLLO.smSkin = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.42,
    metalness: 0.45,
  }));
}
function lathe(pts, m, seg = 48) {
  return new THREE.Mesh(
    new THREE.LatheGeometry(
      pts.map((p) => new THREE.Vector2(p[0], p[1])),
      seg,
    ),
    m,
  );
}
// a flat patch on the CM's cone (half-angle 32.7°, radius 1.91 m at y = 0.16): azimuth a from +Z, centred at height y
const CM_CONE = { r0: 1.91, y0: 0.16, tan: Math.tan(32.7 * DEG) };
function cmConePatch(shape, a, y, m, lift = 0.012) {
  const r = CM_CONE.r0 - (y - CM_CONE.y0) * CM_CONE.tan,
    th = 32.7 * DEG;
  const n = new THREE.Vector3(
      Math.cos(th) * Math.sin(a),
      Math.sin(th),
      Math.cos(th) * Math.cos(a),
    ),
    t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)),
    b = new THREE.Vector3().crossVectors(n, t);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), m);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, b, n));
  mesh.position
    .set(Math.sin(a) * r, y, Math.cos(a) * r)
    .addScaledVector(n, lift);
  return mesh;
}
const rectShape = (w, h, rr = 0.03) => {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
};
function apolloCM(withLES, probe = !withLES) {
  const g = new THREE.Group();
  // aft heat shield (ablator) and the toroidal shoulder
  const hs = [];
  for (let i = 0; i <= 10; i++) {
    const r = (1.93 * i) / 10;
    hs.push([r, -0.43 + (4.69 - Math.sqrt(4.69 * 4.69 - r * r))]);
  }
  hs.push([1.955, 0.0], [1.95, 0.07]);
  g.add(lathe(hs, mat("#4a3424", "dark")));
  g.add(
    lathe(
      [
        [1.95, 0.07],
        [1.935, 0.12],
        [1.91, 0.16],
      ],
      mat("#4a3424", "dark"),
    ),
  );
  // the cone in silver Mylar tape, the forward heat shield, the docking tunnel and ring, the probe
  const coneTop = CM_CONE.y0 + (CM_CONE.r0 - 0.6) / CM_CONE.tan; // r 0.6
  g.add(
    lathe(
      [
        [1.91, 0.16],
        [0.6, coneTop],
      ],
      foilMat("mylar", 3),
    ),
  );
  g.add(
    lathe(
      [
        [0.6, coneTop],
        [0.55, coneTop + 0.12],
        [0.46, coneTop + 0.22],
        [0.42, coneTop + 0.26],
      ],
      foilMat("mylar", 1),
    ),
  );
  g.add(
    lathe(
      [
        [0.42, coneTop + 0.26],
        [0.42, CM_TOP - 0.1],
        [0.47, CM_TOP - 0.1],
        [0.47, CM_TOP],
        [0.3, CM_TOP],
      ],
      mat("#b9bec4", "metal"),
    ),
  );
  if (probe) {
    g.add(
      lmRodA(
        [0, CM_TOP - 0.2, 0],
        [0, CM_TOP + 0.25, 0],
        0.05,
        mat("#cfd3d8", "metal"),
      ),
    );
    const tip = cyl(0.09, 0.02, 0.08, mat("#cfd3d8", "metal"), 12);
    tip.position.y = CM_TOP + 0.25;
    g.add(tip);
  }
  // windows: two rendezvous windows looking forward, two side windows, one in the hatch; the hatch and its outline
  const glass = mat("#06080b", "glass"),
    frame = mat("#2a2c30", "dark");
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(rectShape(0.3, 0.36, 0.05), s * 0.42, 1.78, frame, 0.008),
    );
    g.add(
      cmConePatch(rectShape(0.22, 0.28, 0.04), s * 0.42, 1.78, glass, 0.014),
    );
  }
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(
        rectShape(0.4, 0.4, 0.06),
        (s * Math.PI) / 2,
        1.05,
        frame,
        0.008,
      ),
    );
    g.add(
      cmConePatch(
        rectShape(0.3, 0.3, 0.05),
        (s * Math.PI) / 2,
        1.05,
        glass,
        0.014,
      ),
    );
  }
  g.add(
    cmConePatch(
      rectShape(0.95, 1.05, 0.08),
      0,
      0.95,
      mat("#aeb3b9", "metal"),
      0.006,
    ),
  ); // hatch
  g.add(cmConePatch(rectShape(0.24, 0.24, 0.04), 0, 1.15, glass, 0.012));
  // RCS thruster ports (pitch, yaw and roll pairs) as dark recesses
  const port = mat("#1a1b1e", "dark");
  for (const [a, y] of [
    [0.2, 2.05],
    [-0.2, 2.05],
    [Math.PI + 0.2, 2.05],
    [Math.PI - 0.2, 2.05],
    [Math.PI / 2 + 0.25, 0.42],
    [Math.PI / 2 - 0.25, 0.42],
    [-Math.PI / 2 + 0.25, 0.42],
    [-Math.PI / 2 - 0.25, 0.42],
    [Math.PI + 0.6, 1.45],
    [Math.PI - 0.6, 1.45],
  ])
    g.add(cmConePatch(rectShape(0.13, 0.13, 0.03), a, y, port, 0.01));
  let len = CM_TOP;
  if (withLES) {
    const les = apolloLES();
    g.add(les);
    len = les.userData.top;
  }
  g.userData.len = len;
  g.userData.r = 1.96;
  return g;
}
// The launch escape system on the pad: the boost protective cover over the CM (white, one window left open), the tower
// (a four-legged truss, red), the escape motor with its four canted nozzles, the pitch-control motor and canard section,
// and the nose cone with the Q-ball. 10.2 m from the tower's base to the tip.

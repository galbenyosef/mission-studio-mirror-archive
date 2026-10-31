// index-inline-2 31 — three
// Lines 8613-8766 of readable/index-inline-2.pretty.js (statement-aligned).
function cnFlagMat() {
  return twMat(
    "flag",
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.6,
        metalness: 0.02,
        side: THREE.DoubleSide,
        map: twTex(300, 200, (g, W) => {
          const u = W / 30;
          g.fillStyle = "#de2910";
          g.fillRect(0, 0, W, W);
          const star = (cx, cy, R, rot) => {
            g.beginPath();
            for (let i = 0; i < 10; i++) {
              const r = i % 2 ? R * 0.382 : R,
                a = rot + (i * Math.PI) / 5;
              g.lineTo((cx + r * Math.sin(a)) * u, (cy - r * Math.cos(a)) * u);
            }
            g.closePath();
            g.fill();
          };
          g.fillStyle = "#ffde00";
          star(5, 5, 3, 0);
          for (const [x, y] of [
            [10, 2],
            [12, 4],
            [12, 7],
            [10, 9],
          ])
            star(x, y, 1, Math.atan2(5 - x, y - 5));
        }),
      }),
  );
}
// solar cells: nx × ny cells on a panel, dark blue with a little variety, on the light substrate
function twCellsMat(nx, ny) {
  return twMat("cells" + nx + "x" + ny, () => {
    let s = 3 + nx * 7 + ny;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = twTex(nx * 20, ny * 20, (g, W, H) => {
      g.fillStyle = "#5c6268";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const v = 30 + rnd() * 10;
          g.fillStyle = `rgb(${v},${v + 12},${v + 62})`;
          g.fillRect(i * 20 + 1, j * 20 + 1, 18, 18);
          g.fillStyle = "rgba(190,200,220,0.18)";
          g.fillRect(i * 20 + 1, j * 20 + 9.5, 18, 1);
        }
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.3,
      metalness: 0.3,
    });
  });
}
// a solar panel along +X from x = 0 (length L), W across (along Y), its cells facing +Z, a light frame round it
function twPanel(L, W, nx, ny, back = "#8d9399") {
  const g = new THREE.Group(),
    t = 0.025,
    fr = mat("#c5c9ce", "metal");
  const f = new THREE.Mesh(new THREE.PlaneGeometry(L, W), twCellsMat(nx, ny));
  f.position.set(L / 2, 0, t / 2);
  g.add(f);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(L, W), mat(back, "metal"));
  b.rotation.y = Math.PI;
  b.position.set(L / 2, 0, -t / 2);
  g.add(b);
  for (const y of [-W / 2, W / 2]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, t + 0.006), fr);
    e.position.set(L / 2, y, 0);
    g.add(e);
  }
  for (const x of [0, L]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, W, t + 0.006), fr);
    e.position.set(x, 0, 0);
    g.add(e);
  }
  return g;
}
// the side faces of a regular n-sided prism (circumradius R, from y0 to y1), each a plane of its own: face k faces azimuth
// a0 + k·360°/n (from +Z toward +X), its material m(k)
function twPrismSides(n, R, y0, y1, a0, m) {
  const g = new THREE.Group(),
    rf = R * Math.cos(Math.PI / n),
    w = 2 * R * Math.sin(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n,
      p = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), m(k));
    p.position.set(Math.sin(a) * rf, (y0 + y1) / 2, Math.cos(a) * rf);
    p.rotation.y = a;
    g.add(p);
  }
  return g;
}
// the matching n-gon deck (circumradius R) at height y, facing up (or down), with a round hole of radius rh
function twDeck(n, R, y, a0, m, rh = 0, down = false) {
  const s = new THREE.Shape();
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((k + 0.5) * TAU) / n;
    s[k ? "lineTo" : "moveTo"](Math.sin(a) * R, -Math.cos(a) * R);
  }
  if (rh > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, rh, 0, TAU, true);
    s.holes.push(h);
  }
  const d = new THREE.Mesh(new THREE.ShapeGeometry(s, 4), m);
  d.rotation.x = -Math.PI / 2;
  d.position.y = y;
  if (down) {
    d.rotation.x = Math.PI / 2;
    d.scale.y = -1;
  }
  return d;
}
// a stretchable round bar (twSetBar puts it between two points); a paraboloid dish (radius r, depth d, vertex at the
// origin, opening toward +Y)
const _twA = new THREE.Vector3(),
  _twB = new THREE.Vector3();
function twBarMesh(r, m, seg = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), m);
}
function twSetBar(o, p, q) {
  _twA.set(p[0], p[1], p[2]);
  _twB.set(q[0], q[1], q[2]).sub(_twA);
  const L = _twB.length();
  o.position.copy(_twA).addScaledVector(_twB, 0.5);
  o.scale.set(1, Math.max(L, 1e-4), 1);
  o.quaternion.setFromUnitVectors(M20_UP, _twB.normalize());
  return o;
}
function twDish(r, d, m, seg = 40) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const x = (r * i) / 12;
    pts.push(new THREE.Vector2(x, d * (x / r) ** 2));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, seg), m);
}
const twLerp = (a, b, f) => a + (b - a) * f;
const twPhase = (f, a, b) => smoothstep(clamp((f - a) / (b - a), 0, 1)); // a stage of a deployment: 0 → 1 while f goes from a to b

// ---------------------------------------------------------------------------------------------------------------------
// The orbiter (y = 0 at the foot of its body): the hexagonal body, 2.8 m across its corners and 2.2 m tall, in gold
// blankets with white radiators on two faces and the national flag on one; on top the central cone's ring, where the
// capsule sits; under it the main engine inside the launch adapter's ring and thrusters at the corners; a solar wing of
// three panels on each of the ±X faces; the 2.5 m high-gain antenna on a boom at the +Z corner; the high-resolution camera
// on a back face; the magnetometer on a boom. Stowed (flags.stowed), the wings fold against their faces, the antenna lies
// against its corner and the boom along its face; from flags.deployT (the separation from the rocket) they open out.
const TWO = { R: 1.4, H: 2.2, ring: 0.65, eng: 0.65 };

// index-inline-2 33 — twc
// Lines 9085-9282 of readable/index-inline-2.pretty.js (statement-aligned).
function twHeatShieldMat() {
  return twMat("hs", () => {
    const prof = m20Resample(twHeatShieldProfile(), 160),
      L = prof.len,
      W = 2048,
      H = 512;
    let s = 13;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#332c27";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,230,200,0.035)" : "rgba(0,0,0,0.07)";
        g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 7, 1 + rnd() * 3);
      }
      g.strokeStyle = "rgba(120,104,90,0.28)";
      g.lineWidth = 1.5;
      for (let k = 1; k < 7; k++) {
        const y = ((0.18 + k * 0.24) / L) * H;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      for (let k = 0; k < 36; k++) {
        const x = (k / 36) * W;
        g.beginPath();
        g.moveTo(x, (0.4 / L) * H);
        g.lineTo(x, H);
        g.stroke();
      }
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.85,
      metalness: 0.04,
    });
  });
}
// the backshell's white coat: the seal's dark rim and its bolts, the hip's seam, eight thruster ports below the hip, round
// ports and two gold-rimmed sensor windows on the upper cone, the ring it sits on the orbiter by, the canister and its lid
function twBackshellMat() {
  return twMat("bs", () => {
    const prof = m20Resample(twBackshellProfile(), 160),
      L = prof.len,
      W = 2048,
      H = 1024,
      S = (x) => (x / L) * H;
    const sHip = Math.hypot(TWC.seal[0] - TWC.hip[0], TWC.seal[1] - TWC.hip[1]),
      sBip =
        sHip + Math.hypot(TWC.hip[0] - TWC.bip[0], TWC.hip[1] - TWC.bip[1]);
    const disc = (g, a, sp, rho, fill, rim) => {
      const r = prof.at(sp)[0],
        ex = (rho / (TAU * r)) * W,
        ey = (rho / L) * H,
        x = ((((a / 360) % 1) + 1) % 1) * W;
      for (const dx of [0, -W, W]) {
        g.beginPath();
        g.ellipse(x + dx, S(sp), ex, ey, 0, 0, TAU);
        g.fillStyle = fill;
        g.fill();
        if (rim) {
          g.lineWidth = 3;
          g.strokeStyle = rim;
          g.stroke();
        }
      }
    };
    const dots = (g, sp, step, col) => {
      const n = Math.round((TAU * prof.at(sp)[0]) / step);
      g.fillStyle = col;
      for (let k = 0; k < n; k++) {
        g.beginPath();
        g.arc(((k + 0.5) / n) * W, S(sp), 1.6, 0, TAU);
        g.fill();
      }
    };
    let s = 17;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#dedcd5";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(90,85,78,0.04)";
        g.fillRect(rnd() * W, rnd() * S(sBip), 3 + rnd() * 10, 2 + rnd() * 5);
      }
      g.fillStyle = "#34353a";
      g.fillRect(0, 0, W, S(0.03));
      dots(g, 0.016, 0.25, "#9a9ca0");
      g.strokeStyle = "rgba(140,138,130,0.5)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, S(sHip));
      g.lineTo(W, S(sHip));
      g.stroke();
      for (let k = 0; k < 12; k++) {
        g.beginPath();
        g.moveTo((k / 12) * W, S(0.03));
        g.lineTo((k / 12) * W, S(sHip));
        g.strokeStyle = "rgba(150,147,140,0.35)";
        g.lineWidth = 2;
        g.stroke();
      } // the lower cone's panels
      for (let k = 0; k < 8; k++)
        disc(g, 22.5 + k * 45, sHip - 0.18, 0.06, "#2c2d31", "#8d8f93"); // thruster ports
      for (const a of [70, 160, 250, 340])
        disc(g, a, sHip - 0.45, 0.07, "#bdbcb7", "#8f8e89");
      for (const a of [120, 300]) {
        disc(g, a, sHip + 0.4, 0.13, "#c49a42");
        disc(g, a, sHip + 0.4, 0.08, "#3c3c40");
      }
      g.fillStyle = "#b3b6ba";
      g.fillRect(0, S(sBip) - 5, W, 10);
      dots(g, sBip + 0.03, 0.06, "rgba(110,108,102,0.9)");
      g.fillStyle = "#e8e6df";
      g.fillRect(0, S(sBip) + 5, W, H - S(sBip) - 5);
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.6,
      metalness: 0.03,
    });
  });
}
function twHeatShield() {
  const g = new THREE.Group(),
    prof = m20Resample(twHeatShieldProfile(), 60);
  g.add(lathe(prof, twHeatShieldMat(), 96));
  const inner = m20Inner(prof, 0.05);
  g.add(lathe(inner, mat("#4b4842", "dark", { side: THREE.DoubleSide }), 72));
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(inner[0][0], TWC.seal[0], 72, 1),
    mat("#57504a", "dark", { side: THREE.DoubleSide }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = TWC.seal[1];
  g.add(rim);
  g.userData.len = TWC.seal[1];
  return g;
}
// the trim wing: a plate on a hinge just above the seal (+Z); folded down onto the lower cone, or swung out into the air
function twTrimWing() {
  const h = new THREE.Group();
  h.position.set(0, 0.69, 1.71);
  const p = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.72, 0.035),
    mat("#d4d3cd", "paint"),
  );
  p.geometry.translate(0, 0.36, 0.018);
  h.add(p);
  for (const x of [-0.2, 0.2]) {
    const r = box(0.03, 0.66, 0.04, mat("#a9acb0", "metal"));
    r.position.set(x, 0.03, 0.04);
    h.add(r);
  }
  const hinge = cyl(0.03, 0.03, 0.6, mat("#8c9197", "metal"), 10);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.x = 0.3;
  h.add(hinge);
  h.userData.set = (f) => {
    h.rotation.x = twLerp(-25 * DEG, 50 * DEG, f);
  };
  return h;
}
function twBackshell(trim) {
  const g = new THREE.Group(),
    prof = m20Resample(twBackshellProfile(), 70);
  g.add(lathe(prof, twBackshellMat(), 96));
  g.add(
    lathe(
      m20Inner(m20Resample([TWC.seal, TWC.hip, TWC.bip], 30), 0.05),
      mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
      64,
    ),
  );
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 32),
    mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
  );
  plate.rotation.x = Math.PI / 2;
  plate.position.y = TWC.bip[1] - 0.04;
  g.add(plate);
  const tw = twTrimWing();
  tw.userData.set(trim);
  g.add(tw);
  g.userData.trim = tw;
  g.userData.len = TWC.top;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// Zhurong (y = 0 under its wheels, +Z forward): its body 1.3 m long, its deck white with the two round windows; six wheels
// 0.3 m across, each on its own steering post, on the active suspension that lifts and lowers the body; four solar wings
// hinged along the deck's sides that open like a butterfly's; the mast with the camera head at the front, 1.85 m up; the
// high-gain dish at the back. pose({ lift, wings, mast, dish }) from 0 (folded for the landing, the body let down) to 1.
const TWZ = { WR: 0.15, WX: 0.55, WZ: [0.62, 0, -0.62] };

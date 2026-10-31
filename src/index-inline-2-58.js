// index-inline-2 58 — fillstyle
// Lines 16392-16566 of readable/index-inline-2.pretty.js (statement-aligned).
function facadeTex(B) {
  const W = 1024,
    Hb = 256,
    c = document.createElement("canvas");
  c.width = W;
  c.height = 5 * Hb;
  const g = c.getContext("2d");
  const wall = new THREE.Color(B.col),
    roof = new THREE.Color(B.roof || B.col),
    hex = (k) => "#" + k.getHexString();
  const shade = (k, f) => hex(k.clone().multiplyScalar(f));
  bldSeed = Math.round((B.lat * 1000 + B.lon * 1000) % 1000) + 3;
  // the roof: its colour, a parapet line, and boxes (air handlers, vents, a hut) scattered over it
  g.fillStyle = hex(roof);
  g.fillRect(0, 0, W, Hb);
  g.save();
  g.scale(W / B.w, Hb / B.d);
  g.fillStyle = shade(roof, 0.8);
  for (let k = 0; k < 2 + Math.round((B.w * B.d) / 1500); k++) {
    const w = 2 + bldRnd() * 4,
      d = 2 + bldRnd() * 4;
    g.fillRect(
      1 + bldRnd() * (B.w - 2 - w),
      1 + bldRnd() * (B.d - 2 - d),
      w,
      d,
    );
  }
  if (B.style === "factory") {
    g.fillStyle = shade(roof, 1.25);
    for (let x = 4; x < B.w - 4; x += 8) g.fillRect(x, 2, 1.2, B.d - 4);
  }
  g.restore();
  g.strokeStyle = shade(roof, 0.7);
  g.lineWidth = 3;
  g.strokeRect(1, 1, W - 2, Hb - 2);
  for (let i = 0; i < 4; i++) {
    const wm = i % 2 ? B.d : B.w,
      hm = B.h; // the face's width and height in metres
    g.save();
    g.translate(0, Hb * (1 + i));
    g.scale(W / wm, Hb / hm); // metres, y down from the top of the wall
    g.fillStyle = hex(wall);
    g.fillRect(0, 0, wm, hm);
    const pw = B.style === "steel" ? 1.0 : B.style === "vab" ? 7.0 : 6.0; // the panels
    g.fillStyle = "rgba(0,0,0,0.10)";
    for (let x = pw; x < wm; x += pw)
      g.fillRect(x, 0, Math.max(0.12, (wm / W) * 2), hm);
    if (B.style === "office") {
      g.fillStyle = "#2d3238";
      for (let y = 1.2; y < hm - 2; y += 3.6)
        for (let x = 1.5; x < wm - 1.5; x += 3.0) g.fillRect(x, y, 1.8, 1.6);
    } // rows of windows
    if (B.style === "vab" || B.style === "vabLow") {
      // the aluminium panels: a darker rib at every column
      g.fillStyle = "rgba(70,72,76,0.22)";
      for (let x = 3.5; x < wm; x += 7) g.fillRect(x, 0, 1.2, hm);
      g.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 11; y < hm; y += 11) g.fillRect(0, y, wm, 0.25);
    }
    if (B.style === "vab") {
      // the high-bay doors on the east and west faces: T-shaped, 139 m tall, the lower 35 m of four sliding leaves 35 m
      // wide, the upper part seven folding panels 23 m wide
      if (i % 2)
        for (const f of [0.25, 0.75]) {
          const xc = f * wm;
          g.fillStyle = "#5c5e62";
          g.fillRect(xc - 11.5, hm - 139, 23, 104);
          g.fillStyle = "rgba(255,255,255,0.14)";
          for (let k = 1; k < 7; k++)
            g.fillRect(xc - 11.5 + (k * 23) / 7, hm - 139, 0.5, 104);
          g.fillStyle = "#44464a";
          g.fillRect(xc - 17.5, hm - 35, 35, 35);
          g.fillStyle = "rgba(255,255,255,0.14)";
          for (let k = 1; k < 4; k++)
            g.fillRect(xc - 17.5, hm - 35 + k * 8.75, 35, 0.5);
        }
      if (i === 0) {
        const fx = 14,
          fy = 20,
          fw = 33.5,
          fh = 63.7;
        g.fillStyle = "#b22234";
        g.fillRect(fx, fy, fw, fh);
        g.fillStyle = "#ffffff";
        for (let k = 1; k < 13; k += 2)
          g.fillRect(fx, fy + (k * fh) / 13, fw, fh / 13);
        g.fillStyle = "#3c3b6e";
        g.fillRect(fx, fy, fw * 0.4, (fh * 7) / 13);
        g.fillStyle = "#ffffff";
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
            g.beginPath();
            g.arc(
              fx + (r % 2 ? 2.2 : 1.1) + c * 2.2 + 0.1,
              fy + 1.9 + r * 3.66,
              0.8,
              0,
              TAU,
            );
            g.fill();
          }
      } // the flag: 209 ft by 110 ft, with its fifty stars
    }
    if (B.style === "clock") {
      g.fillStyle = "#0b0b0d";
      g.fillRect(0.3, 0.3, wm - 0.6, hm - 0.9);
      if (i === 0) {
        g.fillStyle = "#ff3b2f";
        g.font = `bold ${hm * 0.55}px monospace`;
        g.textBaseline = "middle";
        g.textAlign = "center";
        g.fillText("-00:00:00", wm / 2, hm * 0.5);
      }
    } // the countdown clock's face
    if (B.text && i === (B.textFace ?? 0)) {
      g.fillStyle = "#2f3237";
      g.font = `bold ${Math.min(hm * 0.18, wm * 0.09)}px Helvetica, Arial, sans-serif`;
      g.textBaseline = "middle";
      g.textAlign = "center";
      g.fillText(B.text, wm / 2, hm * 0.22);
    } // the name in plain letters
    if (B.style === "hangar" && i === (B.door ?? 0)) {
      g.fillStyle = shade(wall, 0.75);
      g.fillRect(wm * 0.08, hm * 0.18, wm * 0.84, hm * 0.82);
      g.fillStyle = "rgba(0,0,0,0.15)";
      for (let x = wm * 0.08; x < wm * 0.92; x += 4)
        g.fillRect(x, hm * 0.18, 0.2, hm * 0.82);
    } // the door across the front
    if (B.style === "factory") {
      g.fillStyle = "#3a3f45";
      for (let x = 6; x < wm - 6; x += 24) g.fillRect(x, hm - 7, 7, 7);
    } // the bay doors along the shed
    const gr = g.createLinearGradient(0, hm - 3, 0, hm);
    gr.addColorStop(0, "rgba(60,50,40,0)");
    gr.addColorStop(1, "rgba(60,50,40,0.45)");
    g.fillStyle = gr;
    g.fillRect(0, hm - 3, wm, 3); // grime at the foot
    const st = g.createLinearGradient(0, 0, 0, hm);
    st.addColorStop(0, "rgba(0,0,0,0)");
    st.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = st;
    g.fillRect(0, 0, wm, hm); // the rain's streaking, darker toward the ground
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// the flag, for the flagpoles: drawn once (u from the hoist to the fly, v from the bottom)
function flagTex() {
  if (flagTex.t) return flagTex.t;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 270;
  const g = c.getContext("2d");
  g.fillStyle = "#b22234";
  g.fillRect(0, 0, 512, 270);
  g.fillStyle = "#ffffff";
  for (let k = 1; k < 13; k += 2) g.fillRect(0, (k * 270) / 13, 512, 270 / 13);
  g.fillStyle = "#3c3b6e";
  g.fillRect(0, 0, 205, (270 * 7) / 13);
  g.fillStyle = "#ffffff";
  for (let r = 0; r < 9; r++)
    for (let col = 0; col < (r % 2 ? 5 : 6); col++) {
      g.beginPath();
      g.arc((r % 2 ? 34 : 17) + col * 34, 8 + r * 16, 5, 0, TAU);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return (flagTex.t = t);
}

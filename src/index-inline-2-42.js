// index-inline-2 42 — fillrect
// Lines 11454-11767 of readable/index-inline-2.pretty.js (statement-aligned).
function slsFoamMat() {
  return lnMat("slsFoam", () => {
    const t = skinTex(1024, 4096, (g, w, h) => {
      g.fillStyle = "#d4752c";
      g.fillRect(0, 0, w, h);
      lnSeed = 31;
      for (let i = 0; i < 6000; i++) {
        g.fillStyle =
          lnRnd() > 0.5 ? "rgba(255,200,140,0.10)" : "rgba(120,50,10,0.10)";
        g.fillRect(lnRnd() * w, lnRnd() * h, 2 + lnRnd() * 5, 2 + lnRnd() * 5);
      } // the foam's mottle
      g.fillStyle = "rgba(70,30,5,0.35)";
      for (const v of [
        0.045, 0.1, 0.22, 0.245, 0.33, 0.47, 0.61, 0.75, 0.89, 0.97,
      ])
        g.fillRect(0, v * h, w, 4); // the seams: LOX tank, intertank, LH2 tank barrels
      // the intertank (a sixth of the way down): stringers, the NASA worm and the flag
      g.fillStyle = "rgba(80,35,8,0.28)";
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0.1 * h, 5, 0.12 * h);
      g.fillStyle = "#c9581f";
      g.fillRect(0.3 * w, 0.112 * h, 0.4 * w, 0.096 * h); // a plainer patch under the markings
      skinText(g, w, h, "NASA", 0.44, 0.118, 0.2, 0.09, "#e4322b", "900");
      g.fillStyle = "#b22234";
      g.fillRect(0.56 * w, 0.125 * h, 0.1 * w, 0.03 * h);
      g.fillStyle = "#ffffff";
      for (let i = 1; i < 13; i += 2)
        g.fillRect(0.56 * w, (0.125 + 0.0023 * i) * h, 0.1 * w, 0.0023 * h);
      g.fillStyle = "#3c3b6e";
      g.fillRect(0.56 * w, 0.125 * h, 0.04 * w, 0.0162 * h);
      g.fillStyle = "rgba(0,0,0,0.10)";
      g.fillRect(0.745 * w, 0, 0.014 * w, h); // the shadow under the systems tunnel
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.75,
      metalness: 0.0,
    });
  });
}
function slsBoosterMat() {
  return lnMat("slsSrb", () => {
    const t = skinTex(512, 4096, (g, w, h) => {
      g.fillStyle = "#eceae4";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,0.22)";
      for (let i = 1; i < 5; i++) g.fillRect(0, (0.08 + 0.184 * i) * h, w, 4); // the field joints between the five segments
      g.fillStyle = "rgba(0,0,0,0.10)";
      for (let i = 0; i < 5; i++) g.fillRect(0, (0.172 + 0.184 * i) * h, w, 2); // the factory joints
      g.fillStyle = "#2a2b2e";
      g.fillRect(0, 0.0 * h, w, 0.012 * h); // the forward skirt's dark ring
      skinText(g, w, h, "NASA", 0.3, 0.22, 0.3, 0.13, "#e4322b", "900");
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.6,
      metalness: 0.02,
    });
  });
}
// ---------------- Long March 5 ----------------
// White, with the national flag and blue bands; the boosters' noses are cut on a slant, their tips leaning in toward
// the core (opts.az: the booster's bearing). Only CZ-5 Latin lettering (the Chinese characters need fonts a browser may
// not have).
function lm5CoreMat() {
  return lnMat("lm5core", () => {
    const t = skinTex(1024, 4096, (g, w, h) => {
      g.fillStyle = "#eeede8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#1f4e9c";
      g.fillRect(0, 0.02 * h, w, 0.012 * h);
      g.fillRect(0, 0.235 * h, w, 0.006 * h); // the blue bands
      g.fillStyle = "#d62a1e";
      g.fillRect(0.42 * w, 0.06 * h, 0.16 * w, 0.03 * h);
      g.fillStyle = "#f5d000";
      g.fillRect(0.435 * w, 0.065 * h, 0.03 * w, 0.008 * h); // the flag
      skinText(g, w, h, "CZ-5", 0.5, 0.11, 0.17, 0.08, "#1f4e9c", "900");
      g.fillStyle = "rgba(0,0,0,0.07)";
      for (const v of [0.26, 0.5, 0.74]) g.fillRect(0, v * h, w, 3);
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.55,
      metalness: 0.05,
    });
  });
}
function lm5BoosterMat() {
  return lnMat("lm5bst", () => {
    const t = skinTex(512, 2048, (g, w, h) => {
      g.fillStyle = "#eeede8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#1f4e9c";
      g.fillRect(0, 0.03 * h, w, 0.015 * h);
      g.fillStyle = "#d62a1e";
      g.fillRect(0.42 * w, 0.09 * h, 0.16 * w, 0.045 * h);
      g.fillStyle = "#f5d000";
      g.fillRect(0.435 * w, 0.097 * h, 0.03 * w, 0.012 * h);
      g.fillStyle = "rgba(0,0,0,0.07)";
      for (const v of [0.3, 0.6, 0.9]) g.fillRect(0, v * h, w, 3);
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.55,
      metalness: 0.05,
    });
  });
}
// a nose cone cut on a slant: the tip moved by lean (m) toward the bearing a (radians) in the stage's frame
function slantNose(r, len, lean, a, material) {
  const pts = [];
  const n = 14;
  pts.push(new THREE.Vector2(r, 0));
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    pts.push(
      new THREE.Vector2(
        Math.max(r * (1 - f) * (1 + 0.35 * f * (1 - f)), 0.02),
        len * f,
      ),
    );
  }
  const geo = new THREE.LatheGeometry(pts, 40),
    P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const k = P.getY(i) / len;
    P.setX(i, P.getX(i) + Math.cos(a) * lean * k * k);
    P.setZ(i, P.getZ(i) + Math.sin(a) * lean * k * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}
// ---------------- Ariane 5 ECA ----------------
// The core's foam-covered tank, off-white, with the livery's blue band and 'ariane 5' in lower case down its side; the
// boosters white with the dark ring at the forward skirt and an ogive nose; the upper stage white over a dark skirt ring.
function ariane5CoreMat() {
  return lnMat("a5core", () => {
    const t = skinTex(1024, 4096, (g, w, h) => {
      g.fillStyle = "#ece8dc";
      g.fillRect(0, 0, w, h);
      lnSeed = 17;
      for (let i = 0; i < 3000; i++) {
        g.fillStyle =
          lnRnd() > 0.5 ? "rgba(255,250,240,0.12)" : "rgba(150,130,100,0.08)";
        g.fillRect(lnRnd() * w, lnRnd() * h, 2 + lnRnd() * 4, 2 + lnRnd() * 4);
      } // the foam
      g.fillStyle = "#1f4e9c";
      g.fillRect(0, 0.12 * h, w, 0.04 * h); // the blue band
      skinText(g, w, h, "ariane 5", 0.5, 0.2, 0.46, 0.09, "#1f4e9c", "bold");
      g.fillStyle = "rgba(0,0,0,0.07)";
      for (const v of [0.3, 0.55, 0.8]) g.fillRect(0, v * h, w, 3); // the tank's ring seams
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.7,
      metalness: 0.0,
    });
  });
}
const STAGE_LOOK_LN = {
  ariane5EPC(g) {
    const tank = g.children[0];
    if (tank && tank.isMesh) tank.material = ariane5CoreMat();
  },
  ariane5EAP(g, st) {
    const body = g.children[0];
    if (body && body.isMesh) body.material = mat("#eeede8", "paint");
    const r = st.geom[0][1],
      L = st.geom[0][0];
    const cone = g.children[1];
    if (cone && cone.isMesh) {
      cone.visible = false;
      const nose = ogive(r, st.geom[1][0] + 0.4, mat("#eeede8", "paint"), 0.1);
      nose.position.y = L;
      g.add(nose);
    }
    const ring = cyl(r + 0.01, r + 0.01, 0.8, mat("#2a2b2e", "dark"), 40, true);
    ring.position.y = L - 0.8;
    g.add(ring); // the forward skirt's dark ring
    const skirt = cyl(
      r + 0.01,
      r + 0.01,
      2.2,
      mat("#8d9094", "metal"),
      40,
      true,
    );
    g.add(skirt); // the aft skirt round the nozzle
  },
  ariane5ESC(g, st) {
    const r = st.geom[0][1];
    const ring = cyl(r + 0.01, r + 0.01, 0.6, mat("#2a2b2e", "dark"), 40, true);
    g.add(ring);
  },
  falconSide(g, st, opts) {
    falconCore(g, st, opts, false);
  },
  falconCentre(g, st, opts) {
    falconCore(g, st, opts, true);
  },
  slsCore(g, st) {
    for (const c of g.children)
      if (c.isMesh && c.geometry.type === "CylinderGeometry")
        c.material = slsFoamMat();
    const top = g.children[2];
    if (top && top.isMesh) top.material = mat("#e9e7e1", "paint"); // the forward skirt / launch vehicle stage adapter, white
    const r = st.geom[0][1];
    const shield = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.98, 48),
      mat("#2a2b2e", "dark"),
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = 0.05;
    g.add(shield);
    const tun = box(
      0.5,
      st.geom[0][0] + st.geom[1][0] - 1,
      0.2,
      mat("#c26a2a", "paint"),
    );
    tun.position.set(
      -st.geom[1][1] * Math.cos(0.2),
      0.5,
      -st.geom[1][1] * Math.sin(0.2),
    );
    tun.rotation.y = -0.2;
    g.add(tun); // the systems tunnel
  },
  slsBooster(g, st, opts) {
    const body = g.children[1];
    if (body && body.isMesh) body.material = slsBoosterMat();
    const r = st.geom[1][1],
      L = st.geom[0][0] + st.geom[1][0];
    const cone = g.children[2];
    if (cone && cone.isMesh) {
      cone.visible = false; // the forward frustum and the nose cone
      const fr = cyl(r, 1.25, 2.6, mat("#e9e7e1", "paint"), 40);
      fr.position.y = L;
      g.add(fr);
      const nose = ogive(1.25, 3.4, mat("#e9e7e1", "paint"), 0.1);
      nose.position.y = L + 2.6;
      g.add(nose);
    }
    const a = (opts && opts.az != null ? opts.az : 0) + Math.PI / 2; // the systems tunnel, on the side away from the core's attach struts
    const tun = box(0.45, L - 3, 0.22, mat("#2d2e31", "dark"));
    tun.position.set(Math.cos(a) * r, 2.6, Math.sin(a) * r);
    tun.rotation.y = -a;
    g.add(tun);
    if (opts && opts.az != null) {
      const b = opts.az + Math.PI;
      for (const [y, h] of [
        [2.4, 1.2],
        [L - 6, 1.6],
      ]) {
        const f = box(1.4, h, 0.6, mat("#9a9c9f", "metal"));
        f.position.set(Math.cos(b) * (r - 0.1), y, Math.sin(b) * (r - 0.1));
        f.rotation.y = -b;
        g.add(f);
      }
    } // the aft and forward attach fittings
    const skirt = g.children[0];
    if (skirt && skirt.isMesh) skirt.material = mat("#d9d7d1", "paint");
  },
  lm5Core(g) {
    const tank = g.children[0];
    if (tank && tank.isMesh) tank.material = lm5CoreMat();
  },
  lm5Booster(g, st, opts) {
    const tank = g.children[0];
    if (tank && tank.isMesh) tank.material = lm5BoosterMat();
    const cone = g.children[1];
    if (cone && cone.isMesh) {
      cone.visible = false;
      const a = (opts && opts.az != null ? opts.az : 0) + Math.PI;
      const nose = slantNose(
        st.geom[0][1],
        st.geom[1][0],
        1.1,
        a,
        mat("#eeede8", "paint"),
      );
      nose.position.y = st.geom[0][0];
      g.add(nose);
    }
    const skirt = cyl(
      st.geom[0][1] + 0.01,
      st.geom[0][1] + 0.01,
      1.6,
      mat("#8d9094", "metal"),
      40,
      true,
    );
    g.add(skirt); // the aft skirt round the two YF-100s
  },
};
Object.assign(STAGE_LOOK, STAGE_LOOK_LN);

// ==== 3c_jwst.js
// ============================================================================
// The James Webb Space Telescope (2021), metres, y = 0 at the foot of the spacecraft bus, +Y the deployable tower's
// axis. Published (NASA/ESA): the primary mirror is 18 gold-coated beryllium hexagons 1.32 m across flat to flat, 6.5 m
// in all, the column of three on either side folded back for launch; the secondary mirror, 0.74 m, stands on a 7-m
// tripod; the sunshield is five kite-shaped layers of aluminised Kapton 21.2 × 14.2 m, folded on two pallets round the
// bus for launch and drawn open by two mid-booms; the deployable tower lifts the telescope 1.2 m off the bus; the
// five-panel solar array, the high-gain antenna, the aft radiator and the momentum flap all unfold on the way. Stowed
// it stood 10.7 m tall inside Ariane's 5.4-m fairing. The mirror stands on edge across the shield's short axis, looking
// out along +Z over the forward pallet. Where a size is not published it is estimated from photographs and NASA's
// renderings (the pink layers with their seams fanning from the corners, the black spreader bars at the tips, the black
// aft-optics wedge in the mirror's centre, the pale solar array).
// flags.stowed draws the launch pose; flags.deploy (the scenario's deployment table) with flags.deployT (launch) drives
// each part along its own step of that table, so the telescope unfolds over its first two weeks as the real one did.
// ============================================================================
const JW = {};
// the sunshield's membrane: lavender aluminised Kapton with its seams fanning from the four corners and ripples between
// them, as a colour map and a normal map over the kite's UV square (u across the long axis, v across the short one)

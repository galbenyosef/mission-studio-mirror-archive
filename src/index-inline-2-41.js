// index-inline-2 41 — math
// Lines 11116-11453 of readable/index-inline-2.pretty.js (statement-aligned).
function ssCorrugated() {
  if (SS.corr) return SS.corr;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const g = c.getContext("2d");
  for (let x = 0; x < 512; x++) {
    const ph = (x % 8) / 8,
      v = 150 + 70 * Math.cos(ph * TAU);
    g.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
    g.fillRect(x, 0, 1, 64);
  }
  g.fillStyle = "rgba(60,64,70,0.6)";
  g.fillRect(0, 0, 512, 2);
  g.fillRect(0, 62, 512, 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(18, 1);
  t.anisotropy = 8;
  return (SS.corr = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.4,
    metalness: 0.75,
    side: THREE.DoubleSide,
  }));
}
const STAGE_LOOK_SS = {
  // Super Heavy: the steel tank, the hot-staging ring on top (dark, vented), the grid fins below it, the engine skirt
  starshipBooster(g, st) {
    ssSkin(g, false);
    const top = st.geom[0][0] + st.geom[1][0],
      dark = mat("#2c2e31", "dark"),
      steel = mat("#9ea3a8", "metal");
    const ring = g.children[1];
    if (ring && ring.isMesh) ring.material = dark;
    for (let k = 0; k < 24; k++) {
      const a = (k * TAU) / 24;
      const v = box(0.5, 1.2, 0.3, mat("#0d0e10", "dark"));
      v.position.set(Math.cos(a) * 4.52, top - 1.6, Math.sin(a) * 4.52);
      v.rotation.y = -a;
      g.add(v);
    } // the vents
    for (let k = 0; k < 4; k++) {
      // the grid fins, in two pairs off the ±X sides (the vehicle's windward sides), folded out
      const a = (k < 2 ? 0.5 : -0.5) * 0.55 + (k % 2 ? Math.PI : 0),
        fin = new THREE.Group();
      fin.position.set(Math.cos(a) * 4.5, top - 5.2, Math.sin(a) * 4.5);
      fin.rotation.y = -a;
      g.add(fin);
      const frame = box(3.0, 0.25, 2.0, dark);
      frame.position.set(1.5, 0, 0);
      frame.geometry.translate(0, -0.125, 0);
      fin.add(frame);
      for (let i = 1; i < 6; i++) {
        const b = box(0.06, 0.22, 2.0, steel);
        b.position.set(i * 0.5, 0, 0);
        fin.add(b);
      }
      for (let i = 1; i < 4; i++) {
        const b = box(3.0, 0.22, 0.06, steel);
        b.position.set(1.5, 0, -1 + i * 0.5);
        fin.add(b);
      }
      const shaft = cyl(0.3, 0.3, 0.6, steel, 12);
      shaft.rotation.z = -Math.PI / 2;
      shaft.position.set(0.3, 0, 0);
      fin.add(shaft);
    }
    // the engine section: the corrugated steel skirt round the engines, and the twenty heat-shield cowls over the outer
    // ring's engine mounts, a pod each at the skirt's rim
    const skirt = cyl(4.55, 4.55, 3.8, ssCorrugated(), 48, true);
    skirt.position.y = -0.6;
    g.add(skirt);
    for (let k = 0; k < 20; k++) {
      const a = (k * TAU) / 20 + 0.1;
      const pod = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.62, 1.1, 4, 12),
        mat("#c3c7cb", "metal"),
      );
      pod.position.set(Math.cos(a) * 4.45, 0.75, Math.sin(a) * 4.45);
      pod.scale.set(1, 1, 0.7);
      pod.rotation.y = -a;
      g.add(pod);
    }
    const shield = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 48),
      mat("#3a3d41", "dark"),
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = -0.35;
    g.add(shield); // the engine shield the Raptors hang from
    for (let k = 0; k < 4; k++) {
      const a = (k * TAU) / 4 + TAU / 8;
      const p = box(1.1, 10, 0.5, mat("#9ea3a8", "metal"));
      p.position.set(Math.cos(a) * 4.55, 3, Math.sin(a) * 4.55);
      p.rotation.y = -a;
      g.add(p);
    } // raceways and the catch pins' housings
    for (const s of [1, -1]) {
      const pin = cyl(0.45, 0.45, 1.2, steel, 12);
      pin.rotation.z = (-Math.PI / 2) * s;
      pin.position.set(s * 4.7, top - 7.2, 0);
      g.add(pin);
    } // the lift pins the tower catches it by
  },
  // the Ship: the steel body with tiles on its windward half, the ogive nose with its black tip, the four flaps
  starshipShip(g, st) {
    ssSkin(g, true);
    const body = st.geom[0][0],
      L = st.geom[1][0],
      top = body + L;
    const nose = g.children[1];
    if (nose && nose.isMesh) {
      // the plain cone becomes the ogive, in the tiled skin
      nose.geometry.dispose();
      nose.geometry = ssOgive(L, 4.5);
      nose.position.y = body;
      const m = ssSkinMat(true).clone();
      m.map = m.map.clone();
      m.map.repeat.set(1, L / 3.66);
      m.map.needsUpdate = true;
      nose.material = m;
    }
    const tip = new THREE.Mesh(
      ssOgive(L, 4.5, 16, L - 4.2),
      mat("#141517", "tile"),
    );
    tip.scale.set(1.01, 1, 1.01);
    tip.position.y = body;
    g.add(tip); // the tip, tiled all round for its last 4 m
    // the aft flaps (±Z, hinged along the body with their tiled face to −X): 9.6 m along the body, 4.4 m out at the root,
    // the leading corner cut back to the body; the hinge fairings (aerocovers) at their roots on the windward side
    const aft = [
      [0, 0],
      [4.4, 0],
      [4.4, 3.2],
      [3.5, 5.8],
      [1.0, 9.3],
      [0, 9.6],
    ];
    for (const s of [-1, 1]) {
      const f = ssFlap(aft, 0.9);
      f.position.set(-0.3, 0.6, s * 4.25);
      f.scale.z = s;
      g.add(f);
      const cov = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 9.6, 14, 1, false, 0, Math.PI),
        mat("#1a1b1e", "tile"),
      );
      cov.rotation.y = -Math.PI / 2;
      cov.position.set(-0.9, 5.4, s * 4.0);
      g.add(cov);
    }
    // the forward flaps (Block 2): small, 5.2 m along the lower nose, set round toward the lee side (+X) out of the airflow
    const fwd = [
      [0, 0],
      [2.9, 0],
      [2.9, 1.3],
      [0.5, 5.6],
      [0, 5.9],
    ]; // (a triangle swept back to the body, two thirds of Block 1's)
    for (const s of [-1, 1]) {
      const phi = 0.5,
        r = 4.3,
        f = ssFlap(fwd, 0.55);
      f.position.set(Math.sin(phi) * r, body + 1.2, s * Math.cos(phi) * r);
      f.scale.z = s;
      f.rotation.y = s * phi;
      g.add(f);
      const cov = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 5.6, 12, 1, false, 0, Math.PI),
        mat("#1a1b1e", "tile"),
      );
      cov.rotation.y = -Math.PI / 2 + s * phi;
      cov.position.set(
        Math.sin(phi) * (r - 0.4),
        body + 4.0,
        s * Math.cos(phi) * (r - 0.4),
      );
      g.add(cov);
    }
    const skirt = cyl(4.5, 4.5, 2.4, ssCorrugated(), 48, true);
    skirt.position.y = -0.6;
    g.add(skirt); // the engine skirt
    const shield = new THREE.Mesh(
      new THREE.CircleGeometry(4.45, 48),
      mat("#3a3d41", "dark"),
    );
    shield.rotation.x = Math.PI / 2;
    shield.position.y = -0.15;
    g.add(shield);
  },
};
Object.assign(STAGE_LOOK, STAGE_LOOK_SS);

// ==== 3b_launchers.js
// ============================================================================
// The launchers drawn by hand over their stages' plain geometry (src/vehicles.js, look; called from buildStage with the
// stage's group, bottom at y = 0, and opts.az: a booster's bearing round the core, radians from +X): Falcon Heavy's
// cores, the SLS core and boosters, Long March 5's core and boosters. Markings are read off photographs and are
// approximate; the shapes are from published dimensions.
// ============================================================================
// a canvas drawn round a stage: w pixels round, h along it; the drawing's y = 0 is the stage's top
function skinTex(w, h, draw, repeatY = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, repeatY);
  return t;
}
// lettering along a stage, reading downward: at u (0…1 round), from v0 to v1 (0 top … 1 bottom), the text as tall as
// size (a fraction of the width round)
function skinText(g, w, h, text, u, v0, v1, size, color, font = "bold") {
  g.save();
  g.translate(u * w, v0 * h);
  g.rotate(Math.PI / 2);
  g.fillStyle = color;
  g.textBaseline = "middle";
  const px = size * w;
  g.font = `${font} ${px}px Helvetica, Arial, sans-serif`;
  const len = (v1 - v0) * h,
    tw = g.measureText(text).width;
  g.scale(len / Math.max(tw, 1), 1);
  g.fillText(text, 0, 0);
  g.restore();
}
const LN_MATS = {};
const lnMat = (key, make) => LN_MATS[key] || (LN_MATS[key] = make());
let lnSeed = 7;
const lnRnd = () => (lnSeed = (lnSeed * 9301 + 49297) % 233280) / 233280;
// ---------------- Falcon Heavy ----------------
// A core: the white tank with SPACEX down one side and the flag, the grey raceway along it, the black engine section round
// the octaweb (flown expendable, no legs or grid fins). The centre core keeps its black interstage; a side booster's top
// band is white, under an ogive nose.
function falconSkinMat() {
  return lnMat("falcon", () => {
    const t = skinTex(1024, 4096, (g, w, h) => {
      g.fillStyle = "#ecebe6";
      g.fillRect(0, 0, w, h);
      lnSeed = 7;
      for (let i = 0; i < 400; i++) {
        g.fillStyle =
          lnRnd() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(120,118,112,0.06)";
        g.fillRect(
          lnRnd() * w,
          lnRnd() * h,
          2 + lnRnd() * 6,
          20 + lnRnd() * 160,
        );
      } // the tank's faint grain
      g.fillStyle = "rgba(0,0,0,0.07)";
      for (const v of [0.06, 0.31, 0.56, 0.62, 0.81])
        g.fillRect(0, v * h, w, 3); // the welds between the tank's barrels and domes
      skinText(g, w, h, "SPACEX", 0.27, 0.07, 0.27, 0.085, "#2b2d31");
      skinText(g, w, h, "FALCON HEAVY", 0.77, 0.09, 0.22, 0.03, "#4b4d52");
      g.fillStyle = "#b22234";
      g.fillRect(0.235 * w, 0.29 * h, 0.07 * w, 0.014 * h);
      g.fillStyle = "#ffffff";
      for (let i = 1; i < 7; i += 2)
        g.fillRect(0.235 * w, (0.29 + 0.002 * i) * h, 0.07 * w, 0.002 * h);
      g.fillStyle = "#3c3b6e";
      g.fillRect(0.235 * w, 0.29 * h, 0.028 * w, 0.0075 * h); // the flag
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(0.495 * w, 0, 0.012 * w, h); // the shadow under the raceway
    });
    return new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.5,
      metalness: 0.05,
    });
  });
}
function falconCore(g, st, opts, centre) {
  const tank = g.children[0];
  if (tank && tank.isMesh) tank.material = falconSkinMat();
  const L0 = st.geom[0][0],
    r = st.geom[0][1],
    dark = mat("#17181a", "dark"),
    grey = mat("#9a9c9f", "metal");
  if (!centre) {
    const band = g.children[1];
    if (band && band.isMesh) band.material = falconSkinMat();
  } // (no interstage on a side booster)
  const skirt = cyl(r + 0.01, r + 0.01, 3.4, dark, 48, true);
  g.add(skirt); // the engine section round the octaweb
  const plate = new THREE.Mesh(new THREE.CircleGeometry(r, 48), dark);
  plate.rotation.x = Math.PI / 2;
  plate.position.y = 0.02;
  g.add(plate);
  const race = box(0.32, L0 - 3.4, 0.14, grey);
  race.position.set(0, 3.4, r);
  g.add(race); // the raceway, +Z (seen from the pad it runs down the side away from the tower)
  if (!centre) {
    // the nose: an ogive over the tank's top ring in place of the plain cone
    const cone = g.children[2];
    if (cone && cone.isMesh) {
      cone.visible = false;
      const nose = ogive(r, st.geom[2][0] + 1.0, falconSkinMat(), 0.12);
      nose.position.y = L0 + st.geom[1][0];
      g.add(nose);
    }
  } else {
    // the centre core's interstage: black, with the separation pushers' housings
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      const h = box(0.5, 1.6, 0.35, dark);
      h.position.set(
        Math.cos(a) * (r + 0.05),
        L0 + 1.2,
        Math.sin(a) * (r + 0.05),
      );
      h.rotation.y = -a;
      g.add(h);
    }
  }
  // the attach hardware between the cores: the nose-level and aft struts' fittings on the side facing the core
  if (opts && opts.az != null) {
    const a = opts.az + Math.PI;
    for (const y of [2.0, L0 - 1.5]) {
      const f = box(0.9, 1.0, 0.5, grey);
      f.position.set(Math.cos(a) * (r - 0.1), y, Math.sin(a) * (r - 0.1));
      f.rotation.y = -a;
      g.add(f);
    }
  }
}
// ---------------- SLS Block 1 ----------------
// The core: the orange spray-on foam over the whole stage, the barrels' seams, the intertank with its stringers and the
// NASA worm and flag, the engine section with the four RS-25s behind a dark heat shield. A booster: white, five motor
// segments with their joints, the systems tunnel down its side, the forward frustum and nose cone.

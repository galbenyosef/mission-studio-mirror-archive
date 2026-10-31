// index-inline-2 34 — userdata
// Lines 9494-9779 of readable/index-inline-2.pretty.js (statement-aligned).
function twAssembly(P, flags) {
  const g = new THREE.Group(),
    mounts = [];
  if (P.has("cruise")) {
    const o = twOrbiter(flags);
    g.add(o);
    mounts.push(...o.userData.mounts);
    const c = new THREE.Group();
    c.add(twHeatShield(), twBackshell(0));
    c.rotation.x = Math.PI;
    c.position.y = TWO.H + 0.06 + TWC.bip[1];
    g.add(c);
    if (o.userData.animate) g.userData.animate = o.userData.animate;
    g.userData.len = TWO.H + 0.06 + TWC.bip[1];
    g.userData.yc0 = 1.9;
  } else if (P.has("orbiter")) {
    const o = twOrbiter(flags);
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.len = TWO.H;
  } else if (P.has("aeroshell")) {
    if (flags.hs !== false) g.add(twHeatShield());
    const bs = twBackshell(flags.trim || flags.hs === false ? 1 : 0);
    g.add(bs);
    const anim = [];
    if (flags.trimT != null && !flags.trim)
      anim.push((t) =>
        bs.userData.trim.userData.set(
          smoothstep(clamp((t - flags.trimT) / 2, 0, 1)),
        ),
      );
    if (flags.hs === false) {
      const pf = twPlatform();
      pf.position.y = TWP.clear;
      g.add(pf);
      const zr = zhurong();
      zr.userData.pose({ lift: 0, wings: 0, mast: 0, dish: 0 });
      zr.position.set(0, TWP.clear + TWP.H + TWP.rail, TWP.roverZ);
      g.add(zr);
      pf.userData.pose.legs(0);
      pf.userData.pose.ramp(0);
      if (flags.hsT != null)
        anim.push((t) =>
          pf.userData.pose.legs(
            smoothstep(clamp((t - flags.hsT - 3) / 5, 0, 1)),
          ),
        );
      else pf.userData.pose.legs(1);
    }
    if (anim.length)
      g.userData.animate = (t) => {
        for (const f of anim) f(t);
      };
    g.userData.chuteY = TWC.top;
    g.userData.capsuleR = TWC.R;
    g.userData.dgb = true;
    g.userData.len = TWC.top;
  } else if (P.has("heatshield")) {
    g.add(twHeatShield());
    g.userData.footY = flags.rest ? 0 : 0.8;
    g.userData.len = TWC.seal[1];
  } else if (P.has("backshell")) {
    g.add(twBackshell(1));
    g.userData.chuteY = TWC.top;
    g.userData.capsuleR = TWC.R;
    g.userData.dgb = true;
    g.userData.footY = flags.rest ? TWC.seal[1] : 0.8;
    g.userData.len = TWC.top;
  } else if (P.has("lander")) {
    const pf = twPlatform();
    g.add(pf);
    const zr = zhurong();
    const z0 = TWP.roverZ,
      y0 = TWP.H + TWP.rail;
    zr.position.set(0, y0, z0);
    g.add(zr);
    g.userData.footY = -TWP.clear;
    g.userData.len = 1.4;
    if (!flags.landed) {
      zr.userData.pose({ lift: 0, wings: 0, mast: 0, dish: 0 });
      mounts.push({ y: -0.6, r: 0.25, tag: "LDR" });
    } else {
      // the drive down the ramp: along the deck to its edge, down the slope, on over the ground (its path in the
      // platform's frame: z forward, y up; pitch, nose down positive), at about 4 cm/s
      const rf = TWP.R * Math.cos(Math.PI / 8),
        a = pf.userData.slope,
        run = TWP.ramp * Math.cos(a),
        yG = -TWP.clear;
      const path = [
          [z0, y0],
          [rf, y0],
          [rf + run, yG],
          [rf + run + 1.6, yG],
        ],
        segL = [],
        tot = [0];
      for (let i = 1; i < path.length; i++) {
        segL.push(
          Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]),
        );
        tot.push(tot[i - 1] + segL[i - 1]);
      }
      const at = (s) => {
        let i = 0;
        while (i < segL.length - 1 && tot[i + 1] < s) i++;
        const f = clamp((s - tot[i]) / segL[i], 0, 1);
        return [
          twLerp(path[i][0], path[i + 1][0], f),
          twLerp(path[i][1], path[i + 1][1], f),
        ];
      };
      const pitchAt = (s) =>
        a *
        twPhase(s, tot[1] - 0.6, tot[1] + 0.6) *
        (1 - twPhase(s, tot[2] - 0.6, tot[2] + 0.6));
      const total = tot[tot.length - 1],
        speed = 0.04;
      g.userData.animate = (t) => {
        const fu =
          flags.wingsT != null ? clamp((t - flags.wingsT) / 240, 0, 1) : 1;
        zr.userData.pose({
          lift: twPhase(fu, 0, 0.25),
          wings: twPhase(fu, 0.2, 0.7),
          mast: twPhase(fu, 0.65, 0.9),
          dish: twPhase(fu, 0.85, 1),
        });
        pf.userData.pose.ramp(
          flags.rampT != null
            ? smoothstep(clamp((t - flags.rampT) / 120, 0, 1))
            : 1,
        );
        const s =
            flags.rollT != null
              ? clamp((t - flags.rollT) * speed, 0, total)
              : 0,
          [z, y] = at(s);
        zr.position.set(0, y, z);
        zr.rotation.x = pitchAt(s);
        for (const w of zr.userData.wheelsZ) w.rotation.x = s / TWZ.WR;
      };
      g.userData.animate(-1e12);
    }
  }
  g.userData.len = g.userData.len || 2;
  return { inner: g, mounts };
}

// ==== 38_change5.js
// ============================================================================
// Chang'e 5 (2020), metres: the orbiter, the returner, the lander and the ascender, stacked for launch with the lander and
// ascender on top of the orbiter.
// Published: launch mass 8.2 t; the returner (about 300 kg) is a scaled-down Shenzhou capsule and rides in a cavity of the
// orbiter, which shortens the stack; the orbiter's docking mechanism is three K-shaped claws that close on three rods on
// the ascender's top, and its transfer mechanism pushes the sample container down into the returner; the orbiter has
// five separation planes (the rocket, the lander, the docking module with the ascender, the support module, the
// returner); the lander, built on Chang'e 3's, stands on four legs, lands on a 7500 N throttleable engine, has two solar
// wings that open and fold, a rotary-percussive drill, a four-jointed arm with a scoop, and the first fabric flag China
// put on the Moon; the ascender sits on the lander's deck on its 3000 N engine. The sizes are estimates made to fit the
// stack in Long March 5's fairing and the masses: the orbiter's propulsion module 2.7 m across, the lander's body 2.5 m,
// the ascender's 1.6 m, the returner 1.25 m across its heat shield.
// ============================================================================
const CE5 = {
  O: { R: 1.35, H: 1.6, eng: 0.7 }, // the orbiter's propulsion module (y = 0 at its foot)
  S: { y0: 1.6, y1: 3.3, r0: 1.15, r1: 0.95 }, // its support module, round the returner
  D: { y: 3.3, h: 0.1, r: 0.95, rc: 0.65 }, // the docking module's ring on top; its claws at radius rc
  RET: { y0: 1.62, r: 0.625, h: 1.18 }, // the returner, on the propulsion module's deck
  L: { y0: 3.6, R: 1.25, H: 0.95, eng: 0.75, foot: 0.95 }, // the lander (its own y = 0 at the foot of its body; feet 0.95 m below)
  A: { R: 0.8, H: 0.95, gap: 0.12, eng: 0.5 }, // the ascender (its own y = 0 at the foot of its body), on the lander's deck
};
CE5.dockY = CE5.D.y + CE5.D.h + 0.3; // the ascender's top deck, docked upside down on the claws

// ---------------------------------------------------------------------------------------------------------------------
// The returner (y = 0 at the centre of its heat shield): the heat shield a shallow spherical cap, the side wall flaring in
// to the flat top with its parachute hatch; the ablative coat dark grey-brown, its seams lighter; thruster ports.
function ce5ReturnerProfile() {
  const { r, h } = CE5.RET,
    Rc = 1.25,
    p = [];
  for (let k = 0; k <= 8; k++) {
    const x = ((r - 0.04) * k) / 8;
    p.push([x, Rc - Math.sqrt(Rc * Rc - x * x)]);
  }
  const y0 = p[p.length - 1][1];
  for (let a = -60; a <= 90; a += 30)
    p.push([
      r - 0.04 + 0.04 * Math.cos(a * DEG),
      y0 + 0.04 + 0.04 * Math.sin(a * DEG),
    ]); // the shoulder
  const ys = y0 + 0.08;
  for (let k = 1; k <= 8; k++) {
    const f = k / 8;
    p.push([r - (r - 0.3) * (0.15 * f + 0.85 * f * f), ys + (h - ys) * f]);
  } // the side wall, bowed out
  p.push([0.3, h]);
  p.push([0, h]);
  return p;
}
function ce5ReturnerMat() {
  return twMat("ce5ret", () => {
    const prof = m20Resample(ce5ReturnerProfile(), 120),
      L = prof.len,
      W = 1024,
      H = 512,
      sSide = (() => {
        let s = 0;
        for (let i = 1; i < prof.length; i++) {
          s += Math.hypot(
            prof[i][0] - prof[i - 1][0],
            prof[i][1] - prof[i - 1][1],
          );
          if (prof[i][1] > 0.2) return s;
        }
        return 0;
      })();
    let sd = 23;
    const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#2f2a26";
      g.fillRect(0, 0, W, H); // the heat shield
      g.fillStyle = "#5d554d";
      g.fillRect(0, (sSide / L) * H, W, H); // the side wall
      for (let i = 0; i < 4000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,240,220,0.05)" : "rgba(0,0,0,0.08)";
        g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 5, 1 + rnd() * 3);
      }
      g.strokeStyle = "rgba(150,140,128,0.5)";
      g.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        g.beginPath();
        g.moveTo((k / 8) * W, (sSide / L) * H);
        g.lineTo((k / 8) * W, H * 0.97);
        g.stroke();
      }
      for (const f of [0.45, 0.7]) {
        g.beginPath();
        g.moveTo(0, ((sSide + (L - sSide) * f) / L) * H);
        g.lineTo(W, ((sSide + (L - sSide) * f) / L) * H);
        g.stroke();
      }
      g.fillStyle = "#1d1e21";
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(
          ((k + 0.5) / 6) * W,
          ((sSide + (L - sSide) * 0.82) / L) * H,
          9,
          7,
          0,
          0,
          TAU,
        );
        g.fill();
      } // thruster ports
      g.fillStyle = "#8a8d92";
      g.fillRect(0, H * 0.97, W, H * 0.03); // the top
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.82,
      metalness: 0.05,
    });
  });
}
function ce5Returner() {
  const g = new THREE.Group();
  g.add(lathe(ce5ReturnerProfile(), ce5ReturnerMat(), 64));
  const hatch = cyl(0.2, 0.18, 0.04, mat("#a3a7ac", "metal"), 24);
  hatch.position.y = CE5.RET.h;
  g.add(hatch);
  for (let k = 0; k < 3; k++) {
    const b = box(0.06, 0.05, 0.1, mat("#c9a04a", "gold"));
    b.position.set(...m20Polar(0.24, (k * TAU) / 3, CE5.RET.h));
    g.add(b);
  }
  g.userData.len = CE5.RET.h;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The orbiter: the propulsion module, an octagonal prism in gold blankets with white radiators on two faces and the flag on
// one, the main engine under it, four 150 N engines and attitude thrusters round its foot, a solar wing of three panels on
// each of the ±X faces, a dish antenna on a boom; on its deck the returner, inside the support module (a truncated cone),
// and on top of that the docking module: a ring with the three claws, and the channel the sample container is pushed down.
// opts: support (the support and docking modules are there), claws ('open' | 'closed'), channel (the transfer channel
// out), stowed / deployT (the wings fold against their faces; they open after separation), returner.

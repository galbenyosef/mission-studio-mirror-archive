// index-inline-2 15 — inner
// Lines 3794-4117 of readable/index-inline-2.pretty.js (statement-aligned).
function buildSC(model, parts, flags = {}) {
  if (model === "shuttle") return buildOrbiter(flags);
  if (model === "iss") return issModel(flags);
  if (model === "hubble")
    return hubbleModel({
      arrays: true,
      door: !!flags.door,
      doorT: flags.doorT,
    });
  const P = new Set(parts || []);
  const g = new THREE.Group();
  let inner;
  const mounts = [];
  const has = (k) => P.has(k);
  switch (model) {
    case "apollo":
    case "apolloCSM": {
      const LM = () => {
        const lm = new THREE.Group();
        const ds = lmDescentD();
        const as = lmAscentD();
        as.position.y = 1.65;
        lm.add(ds);
        lm.add(as);
        return lm;
      };
      // the docking ring on top of the ascent stage, above the ascent stage's origin (NASA's model, or the built-in one)
      const ringA = DETAIL.ready.apollo_lm ? 2.924 : 3.1,
        ringLM = 1.65 + ringA;
      if (has("orbiter") && has("lander")) {
        // CSM docked nose-to-nose with the LM (LM inverted above the CM)
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP },
        ]);
        const lm = LM();
        lm.rotation.x = Math.PI;
        lm.position.y = SM_LEN + CM_TOP + ringLM;
        inner.add(lm);
        mounts.push(...inner.userData.mounts, {
          y: SM_LEN + CM_TOP + ringLM + 1.4,
          r: 0.75,
          tag: "LMDS",
          flip: true,
        });
        inner.userData.len = SM_LEN + CM_TOP + ringLM + 1.8;
      } else if (has("capsule") && has("lander")) {
        inner = new THREE.Group();
        inner.add(apolloCM(false));
        const lm = LM();
        lm.rotation.x = Math.PI;
        lm.position.y = CM_TOP + ringLM;
        inner.add(lm);
        mounts.push({
          y: CM_TOP + ringLM + 1.4,
          r: 0.75,
          tag: "LMDS",
          flip: true,
        });
        inner.userData.len = CM_TOP + ringLM + 1.8;
      } else if (has("orbiter") && has("ascent")) {
        // the ascent stage back from the surface, docked to the CM's nose until it is jettisoned
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP },
        ]);
        const a = lmAscentD();
        a.rotation.x = Math.PI;
        a.position.y = SM_LEN + CM_TOP + ringA;
        inner.add(a);
        mounts.push(...inner.userData.mounts);
        inner.userData.len = SM_LEN + CM_TOP + ringA + 0.9;
      } else if (has("orbiter")) {
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP + 0.25 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("lander")) {
        const ds = lmDescentD(flags.landed);
        const as = lmAscentD();
        as.position.y = 1.65;
        inner = new THREE.Group();
        inner.add(ds);
        inner.add(as);
        inner.userData.footY = -1.8;
        mounts.push({ y: -1.4, r: 0.75, tag: "LMDS" });
      } else if (has("descent")) {
        inner = lmDescentD(true);
        inner.userData.footY = -1.8;
      } else if (has("ascent")) {
        inner = lmAscentD();
        mounts.push({ y: -0.85, r: 0.45, tag: "LMAS" });
      } else if (has("capsule")) {
        inner = apolloCM(false, false);
        inner.userData.chuteY = CM_TOP - 0.3;
        inner.userData.capsuleR = 1.96;
      } // the probe stayed in the LM
      else if (has("service")) {
        inner = apolloSM(flags.damaged);
      }
      break;
    }
    case "orion": {
      if (has("orbiter")) {
        inner = stackParts([
          { g: orionESM(false), len: 4.6, mount: "ESM" },
          { g: orionCM(false), len: 3.5 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("capsule")) {
        inner = orionCM(false);
        inner.userData.chuteY = 3.4;
        inner.userData.capsuleR = 2.5;
      } else if (has("service")) inner = orionESM(false);
      break;
    }
    case "change5": {
      const r = ce5Assembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/38_change5.js
    case "mariner": {
      inner = marinerModel(flags);
      mounts.push({ y: -0.12, r: 0.06, tag: "BUS" });
      break;
    } // app/36_mariner.js
    case "msl": {
      const r = m20Assembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/33_mars2020.js
    case "tianwen": {
      const r = twAssembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/37_tianwen.js
    case "msr": {
      // the sample-return concept: generic parts
      const ORB = () => {
        const o = new THREE.Group();
        o.add(probeBus(2.4, 1.8, 2.4, "#c9a043"));
        for (const s of [-1, 1]) {
          const w = solarWing(5.0, 1.8, 3);
          w.position.set(s * 1.2, 0.9, 0);
          if (s < 0) w.rotation.y = Math.PI;
          o.add(w);
        }
        const dd = dish(1.0);
        dd.position.set(0, 1.9, -0.8);
        o.add(dd);
        const bl = bell(0.7, 0.35);
        bl.position.y = -0.7;
        o.add(bl);
        o.userData.len = 1.8;
        o.userData.engineY = -0.7;
        o.userData.engineR = 0.35;
        return o;
      };
      const CAP = () => {
        const c = aeroshell(1.7, 1.4, "#e8e4dc");
        return c;
      };
      if (has("cruise")) {
        const o = ORB();
        const c = CAP();
        c.rotation.x = Math.PI;
        c.position.y = 1.8 + 2.4;
        inner = new THREE.Group();
        inner.add(o);
        inner.add(c);
        inner.userData.len = 4.2;
        mounts.push({ y: -0.7, r: 0.35, tag: "ORB" });
      } else if (has("orbiter")) {
        inner = ORB();
        mounts.push({ y: -0.7, r: 0.35, tag: "ORB" });
      } else if (has("aeroshell")) {
        inner = CAP();
        inner.userData.chuteY = 2.2;
        inner.userData.capsuleR = 1.7;
        inner.userData.dgb = true;
      } else if (has("lander")) {
        // the lander with the ascent vehicle standing on it
        inner = sampleLander(false, "#d4d6da");
        inner.userData.footY = -1.2;
        if (!flags.landed) mounts.push({ y: -0.7, r: 0.35, tag: "LDR" });
        const mv = new THREE.Group();
        mv.add(cyl(0.28, 0.28, 2.8, mat("#ecebe6")));
        const nc = cyl(0.28, 0.02, 0.6, mat("#ecebe6"));
        nc.position.y = 2.8;
        mv.add(nc);
        mv.position.y = 0.95;
        inner.add(mv);
      } else if (has("mav")) {
        inner = new THREE.Group();
        const r1 = cyl(0.28, 0.28, 2.8, mat("#ecebe6"));
        inner.add(r1);
        const nc = cyl(0.28, 0.02, 0.6, mat("#ecebe6"));
        nc.position.y = 2.8;
        inner.add(nc);
        const b = bell(0.35, 0.22);
        b.position.y = -0.35;
        inner.add(b);
        inner.userData.len = 3.4;
        mounts.push({ y: -0.35, r: 0.22, tag: "MAV" });
      } else if (has("os")) {
        inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 12),
          mat("#e0e0e0", "metal"),
        );
        inner.userData.len = 0.3;
      }
      break;
    }
    case "clipper": {
      inner = new THREE.Group();
      const body = cyl(0.8, 0.8, 3.0, mat("#e6e3dc", "paint"));
      inner.add(body);
      const hga = dish(1.5, "#f2f2ee");
      hga.position.y = 3.6;
      inner.add(hga);
      for (const s of [-1, 1]) {
        const w = solarWing(13.5, 4.1, 5, "#16223e");
        w.position.set(s * 0.8, 1.3, 0);
        if (s < 0) w.rotation.y = Math.PI;
        inner.add(w);
      }
      const mag = cyl(0.03, 0.03, 8.5, mat("#9aa0a6", "metal"));
      mag.rotation.x = Math.PI / 2;
      mag.position.set(0, 0.6, 4.2);
      inner.add(mag);
      inner.userData.len = 3.0;
      mounts.push({ y: -0.1, r: 0.3, tag: "SC" });
      break;
    }
    case "starshipPayload": {
      inner = starshipShip(flags.landed, flags.landed || flags.powered);
      mounts.push({ y: inner.userData.engineY, r: 3.6, tag: "upper" });
      break;
    }
    case "capsuleHab": {
      const cap = () => {
        const c = new THREE.Group();
        c.add(cyl(1.85, 0.75, 2.6, mat("#ecebe6")));
        const hs = cyl(1.86, 1.85, 0.2, mat("#3b2a1a", "dark"));
        hs.position.y = -0.2;
        c.add(hs);
        c.userData.len = 2.6;
        return c;
      };
      if (has("orbiter")) {
        const sm = new THREE.Group();
        sm.add(cyl(1.8, 1.8, 2.2, mat("#dcdcdc", "metal")));
        for (const s of [-1, 1]) {
          const w = solarWing(5.0, 1.8, 3);
          w.position.set(s * 1.8, 1.0, 0);
          if (s < 0) w.rotation.y = Math.PI;
          sm.add(w);
        }
        const bl = bell(1.0, 0.45);
        bl.position.y = -1.0;
        sm.add(bl);
        sm.userData.len = 2.2;
        sm.userData.engineY = -1.0;
        sm.userData.engineR = 0.45;
        const hab = cyl(2.1, 2.1, 4.2, mat("#f1efe8", "fabric"), 32);
        hab.userData.len = 4.2;
        inner = stackParts([
          { g: sm, len: 2.2, mount: "PROP" },
          { g: hab, len: 4.2 },
          { g: cap(), len: 2.6 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("capsule")) {
        inner = cap();
        inner.userData.chuteY = 2.6;
        inner.userData.capsuleR = 1.85;
      } else if (has("service")) {
        inner = cyl(2.1, 2.1, 4.2, mat("#f1efe8", "fabric"), 32);
      }
      break;
    }
    case "chandrayaan": {
      if (has("orbiter")) {
        inner = new THREE.Group();
        inner.add(probeBus(2.0, 1.6, 2.0));
        const w = solarWing(4.0, 1.4, 2);
        w.position.set(1.0, 0.8, 0);
        inner.add(w);
        const l = sampleLander(true);
        l.position.y = 1.6 + 1.2;
        inner.add(l);
        mounts.push({ y: -0.2, r: 0.3, tag: "PM" });
      } else {
        inner = sampleLander(true);
        inner.userData.footY = -1.2;
        if (!flags.landed) mounts.push({ y: -0.7, r: 0.35, tag: "LDR" });
      }
      break;
    }
  }
  if (!inner) {
    inner = probeBus(1.5, 1.5, 1.5, "#c9a043");
    inner.userData.len = 1.5;
    mounts.push({ y: 0, r: 0.3, tag: "any" });
  }
  g.add(inner);
  const iu = inner.userData;
  g.userData = {
    len: iu.len || 2,
    mounts,
    footY: iu.footY,
    chuteY: iu.chuteY,
    capsuleR: iu.capsuleR,
    dgb: iu.dgb,
    yc0: iu.yc0,
    animate: iu.animate,
  };
  return g;
}
// stowed spacecraft on top of an upper stage (inside adapters / fairings)

// index-inline-2 16 — userdata
// Lines 4140-4473 of readable/index-inline-2.pretty.js (statement-aligned).
function buildStowed(model, rBelow, fl = {}) {
  const les = !!fl.les,
    saj = !!fl.saj;
  const g = new THREE.Group();
  let y = 0;
  if (model === "apollo" || model === "apolloCSM") {
    const sla = cyl(3.3, 1.96, 8.5, mat("#e7e5df"));
    g.add(sla);
    y = 8.5;
    const sm = apolloSM(false, true);
    sm.position.y = y;
    g.add(sm);
    y += SM_LEN;
    const cm = apolloCM(les);
    cm.position.y = y;
    g.add(cm);
    y += cm.userData.len;
    g.userData = {
      len: y,
      mounts: [
        { y: 8.5 + sm.userData.engineY, r: sm.userData.engineR, tag: "SM" },
      ],
    };
    return g;
  }
  if (model === "orion") {
    const ad = cyl(2.55, 2.05, 1.6, mat("#d9d6cf"));
    g.add(ad);
    y = 1.6;
    const esm = orionESM(true);
    esm.position.y = y + 1.9;
    g.add(esm);
    const fair = cyl(2.6, 2.6, 5.9, mat("#efeee9"));
    fair.position.y = y;
    if (saj) g.add(fair);
    y += 1.9 + 4.6;
    const cm = orionCM(les);
    cm.position.y = y;
    g.add(cm);
    y += cm.userData.len;
    g.userData = { len: y, mounts: [{ y: 1.6, r: 0.6, tag: "ESM" }] };
    return g;
  }
  if (model === "starshipPayload") {
    g.userData = { len: 0, mounts: [] };
    return g;
  }
  if (model === "clipper") {
    // on the Falcon Heavy's adapter, the arrays folded against its sides (app/39_clipper.js)
    const ad = cyl(Math.min(rBelow, 1.6), 0.7, 0.8, mat("#bdbdbd", "metal"));
    g.add(ad);
    const sc = buildSC(model, ["orbiter"], { stowed: true });
    sc.position.y = 0.8;
    g.add(sc);
    g.userData = {
      len: 0.8 + sc.userData.len,
      mounts: sc.userData.mounts.map((m) => ({ ...m, y: m.y + 0.8 })),
    };
    return g;
  }
  if (model === "jwst") {
    // folded on Ariane's adapter, 10.7 m tall inside the fairing (app/3c_jwst.js)
    const ad = cyl(Math.min(rBelow, 1.3), 1.2, 1.0, mat("#bdbdbd", "metal"));
    g.add(ad);
    const sc = buildSC(model, ["orbiter"], { stowed: true });
    sc.position.y = 1.0;
    g.add(sc);
    g.userData = { len: 1.0 + sc.userData.len, mounts: [] };
    return g;
  }
  if (model === "mariner") {
    // on the Agena's adapter (app/35_atlas.js), the panels folded up
    const sc = buildSC(model, ["orbiter"], { stowed: true });
    sc.position.y = 0.35;
    g.add(sc);
    g.userData = {
      len: 0.35 + 2.89,
      mounts: sc.userData.mounts.map((m) => ({ ...m, y: m.y + 0.35 })),
    };
    return g;
  }
  const ad = cyl(Math.min(rBelow, 1.6), 0.8, 1.0, mat("#bdbdbd", "metal"));
  g.add(ad);
  if (model === "tianwen" || model === "change5") {
    // on Long March 5's adapter cone, folded up (app/37_tianwen.js, app/38_change5.js)
    const ad = cyl(
      1.55,
      0.62,
      1.0,
      mat("#c4c8cd", "metal", { side: THREE.DoubleSide }),
      48,
      true,
    );
    g.add(ad);
    const sc = buildSC(
      model,
      model === "tianwen" ? ["cruise"] : ["orbiter", "lander"],
      { stowed: true },
    );
    sc.position.y = 1.0 + 0.12;
    g.add(sc);
    g.userData = {
      len: 1.12 + sc.userData.len,
      mounts: sc.userData.mounts.map((m) => ({ ...m, y: m.y + 1.12 })),
    };
    return g;
  }
  const sc = buildSC(
    model,
    model === "msl" || model === "msr" ? ["cruise"] : ["orbiter"],
  );
  sc.position.y = 1.0 + 0.8;
  g.add(sc);
  g.userData = {
    len: 1.8 + (sc.userData.len || 2),
    mounts: (sc.userData.mounts || []).map((m) => ({ ...m, y: m.y + 1.8 })),
  };
  return g;
}
// full launch stack from launcher config
function buildLaunchStack(lkey, scModel, c) {
  const L = LAUNCHERS[lkey];
  if (L.sideMount) return buildShuttleStack(L, c);
  const g = new THREE.Group();
  const mounts = [];
  const core = L.stages
    .map((s, i) => ({ s, i }))
    .filter((o) => !o.s.parallel && o.i >= (c.stFrom || 0));
  let y = 0,
    firstCoreY = null,
    rCore = 1;
  for (const { s, i } of core) {
    const st = buildStage(s, { ist: c.ist });
    st.group.position.y = y;
    g.add(st.group);
    mounts.push({
      y: y - st.engLen,
      r: Math.max(s.geom[0][1] * 0.75, s.eng ? s.eng.r * 1.2 : 1),
      tag: "stage:" + s.id,
      prop: s.prop,
      idx: i,
    });
    if (firstCoreY == null) {
      firstCoreY = y;
      rCore = s.geom[0][1];
    }
    y += st.len;
  }
  const bst = L.stages[0].parallel ? L.stages[0] : null;
  if (bst && c.boosters) {
    const n = bst.booster.count,
      off = bst.booster.offset;
    for (let k = 0; k < n; k++) {
      const a = n === 2 ? k * Math.PI : (k * Math.PI) / 2 + Math.PI / 4;
      const b = buildStage(bst, { az: a });
      b.group.position.set(
        Math.cos(a) * off,
        (firstCoreY || 0) + 0.5,
        Math.sin(a) * off,
      );
      g.add(b.group);
      mounts.push({
        y: (firstCoreY || 0) + 0.5 - b.engLen,
        r: Math.max(bst.geom[0][1] * 0.8, 0.6),
        x: Math.cos(a) * off,
        z: Math.sin(a) * off,
        tag: "stage:" + bst.id,
        prop: bst.prop,
        idx: 0,
      });
    }
  }
  const topR = core.length
    ? core[core.length - 1].s.geom[core[core.length - 1].s.geom.length - 1][2]
    : 2;
  const PF = L.payloadFairing;
  if (PF && c.fairing) {
    const yF =
      PF.encloseUpper && core.length >= 2
        ? y - core[core.length - 1].s.geom.reduce((a, gg) => a + gg[0], 0) - 0.5
        : y;
    const f0 = ogive(PF.r, PF.len, mat(PF.color), PF.cyl ?? 0.45),
      f = PF.detail ? detailPart(PF.detail, "fairing", f0) : f0;
    f.position.y = yF;
    g.add(f);
    y = yF + PF.len;
  } else if (lkey !== "starship") {
    const st = buildStowed(scModel, topR, { les: c.les, saj: c.saj });
    st.position.y = y;
    g.add(st);
    y += st.userData.len;
  }
  g.userData = { len: y, mounts };
  return g;
}
function buildStageOnly(lkey, idx, withAdapter, variant) {
  const L = LAUNCHERS[lkey];
  let s = L.stages[idx];
  if (variant === "sts1" && lkey === "shuttle" && idx === 1)
    s = {
      ...s,
      geom: s.geom.map((p) => [
        p[0],
        p[1],
        p[2],
        p[3] === "#4a4a4a" ? p[3] : "#e9e7e0",
        p[4],
      ]),
    }; // STS-1's painted (white) tank
  const st = buildStage(s, {
    ist: false,
    white: variant === "sts1" && lkey === "shuttle" && idx === 1,
    az:
      s.parallel && s.booster
        ? s.booster.count === 2
          ? 0
          : Math.PI / 4
        : undefined,
  }); // (a spent stage's aft interstage went long before)
  if (s.parallel && s.booster) {
    // drop all boosters together
    const g = new THREE.Group();
    const n = s.booster.count,
      off = s.booster.offset;
    for (let k = 0; k < n; k++) {
      const a = n === 2 ? k * Math.PI : (k * Math.PI) / 2 + Math.PI / 4;
      const b = k === 0 ? st : buildStage(s, { az: a });
      b.group.position.set(Math.cos(a) * off, 0, Math.sin(a) * off);
      if (n === 2 && k === 1 && s.detail) b.group.scale.x = -1;
      g.add(b.group);
    } // a pair of scanned boosters: mirror images (a drawn one has its own bearing)
    g.userData = { len: st.len, mounts: [] };
    return g;
  }
  if (withAdapter) {
    const sla = cyl(3.3, 3.3, 1.0, mat("#e7e5df"));
    sla.position.y = st.len;
    st.group.add(sla);
    for (let k = 0; k < 4; k++) {
      const p = box(2.6, 7.0, 0.1, mat("#e7e5df"));
      const a = (k * Math.PI) / 2;
      p.position.set(Math.cos(a) * 4.5, st.len - 1, Math.sin(a) * 4.5);
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.x = 0.7;
      st.group.add(p);
    }
  }
  st.group.userData = {
    len: st.len,
    mounts: [
      { y: -st.engLen, r: s.geom[0][1] * 0.6, tag: "upper", prop: s.prop },
    ],
  };
  return st.group;
}
// a launcher's aft interstage after it has been dropped (the S-II's): the first piece of its stage's geometry, an open ring
function buildInterstage(lkey) {
  const st = LAUNCHERS[lkey].stages.find(
      (s) => s.geom[0][4] && s.geom[0][4].ist,
    ),
    [len, rb, rt, color] = st.geom[0];
  const ring = cyl(rb, rt, len, patternMat("band", color), 48, true);
  ring.material = ring.material.clone();
  ring.material.side = THREE.DoubleSide;
  const g = st.detail ? detailPart(st.detail, "IST", ring) : ring;
  g.userData = { len, mounts: [] };
  return g;
}
// center a model on its bounding-box centre along Y and record offsets
function finishModel(g) {
  const len = g.userData.len || 1;
  const yc = g.userData.yc0 ?? len * 0.45; // yc0: models whose origin is their reference point (the orbiter's, the ISS's)
  const wrap = new THREE.Group();
  g.position.y = -yc;
  wrap.add(g);
  wrap.userData = { ...g.userData, yc, wrapped: true };
  delete wrap.userData.wingtips; // (the wing tips are given in the model's own frame, 'yc' below the wrapper's: left to the model's node, app/49_contrail.js)
  wrap.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(wrap);
  const sz = new THREE.Vector3();
  bb.getSize(sz);
  wrap.userData.sizeM = Math.max(sz.x, sz.y, sz.z, 1); // largest dimension in metres (solar arrays included)
  wrap.userData.bbox = { w: sz.x, h: sz.y, d: sz.z };
  wrap.userData.bbY = [bb.min.y, bb.max.y]; // lowest and highest point along the axis, metres (the camera frames a standing vehicle with it)
  const wheels = [];
  wrap.traverse((n) => {
    if (n.userData && n.userData.wheel) wheels.push(n);
  });
  wrap.userData.wheels = wheels;
  return wrap;
}
function modelForConfig(cfgL, objModel) {
  const c = cfgL || { key: "sc", sc: objModel, parts: ["orbiter"] };
  let g;
  if (c.key === "launch") g = buildLaunchStack(c.launcher, objModel, c);
  else if (c.key === "stack") {
    const L = LAUNCHERS[c.launcher];
    const up = buildStageOnly(c.launcher, c.stage, false);
    const gg = new THREE.Group();
    gg.add(up);
    let y = up.userData.len;
    const mounts = [
      {
        y: up.userData.mounts[0].y,
        r: up.userData.mounts[0].r,
        tag: "upper",
        prop: L.stages[c.stage].prop,
      },
    ];
    if (c.launcher !== "starship") {
      const st = buildStowed(c.sc, L.stages[c.stage].geom.slice(-1)[0][2], {});
      st.position.y = y;
      gg.add(st);
      for (const m of st.userData.mounts) mounts.push({ ...m, y: m.y + y });
      y += st.userData.len;
    }
    gg.userData = { len: y, mounts };
    g = gg;
  } else if (c.key === "stage")
    g = buildStageOnly(c.launcher, c.stage, c.withAdapter, c.variant);
  else if (c.key === "ist") g = buildInterstage(c.launcher);
  else if (c.key === "capsule") g = buildSC(c.sc, ["capsule"], {});
  else g = buildSC(c.sc || objModel, c.parts, c);
  return finishModel(g);
}

// ---------------- plumes, chutes, plasma ----------------
const GLSL_PLUME_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;

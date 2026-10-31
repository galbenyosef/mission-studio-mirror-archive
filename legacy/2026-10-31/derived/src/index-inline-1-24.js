// index-inline-1 24 — ent
// Lines 8913-9180 of readable/index-inline-1.pretty.js (statement-aligned).
function shellParts(M, SC, ship, ent, site, tEnd) {
  const edl = SC.edl,
    sc = SC.model,
    elev = site.elev || 0,
    at = (n) => ent.events.find((e) => e.name === n),
    trim = edl.trimWing ? { trim: 1 } : {};
  const hs = at("Heat shield separation"),
    bs = at("Backshell separation · powered descent"),
    tw = at("Trim wing deploys");
  if (tw)
    ship.setConfig(tw.t, "sc", {
      key: "sc",
      sc,
      parts: ["aeroshell"],
      trimT: tw.t,
    });
  if (hs)
    ship.setConfig(hs.t, "sc", {
      key: "sc",
      sc,
      parts: ["aeroshell"],
      chute: 1,
      hs: false,
      hsT: hs.t,
      ...trim,
    });
  const fall = (id, name, e, m, diam, cd, part, chute) => {
    if (!e) return;
    const f = simulateEntry({
      body: "mars",
      t0: e.t,
      r0: e.r,
      v0: e.v,
      m0: m,
      diam,
      cd,
      LD: 0,
      rn: diam / 2,
      siteElev: elev,
      maxTime: 900,
    });
    const smp = f.samples.map((x) => ({
      ...x,
      phase: `${name.toLowerCase()}${chute ? " on its parachute" : ", falling"}`,
    }));
    if (f.t > smp[smp.length - 1].t)
      smp.push({ ...smp[smp.length - 1], t: f.t, r: f.r, v: f.v }); // down to the ground itself
    const o = M.addObj(
      new MObject(id, name, {
        kind: "debris",
        model: sc,
        color: "#9aa3ad",
        trail: false,
      }),
    );
    o.setConfig(e.t, "sc", {
      key: "sc",
      sc,
      parts: [part],
      ...(chute ? { chute: 1 } : {}),
    });
    o.add(new SampleSeg("mars", smp, { m }));
    if (f.landed) {
      o.setConfig(f.t, "sc", { key: "sc", sc, parts: [part], rest: true });
      o.add(
        new SurfaceSeg("mars", f.t, tEnd, f.ll[0], f.ll[1], elev, m, {
          extra: { phase: "on the ground" },
        }),
      );
    }
  };
  const shell = SC.modules.AEROSHELL || SC.modules.CAPS,
    mHS = edl.heatshieldMass ?? (SC.modules.AEROSHELL ? 440 : shell.dry * 0.45);
  fall(
    "heatshield",
    "Heat shield",
    hs,
    mHS,
    edl.diam,
    1.0,
    "heatshield",
    false,
  );
  fall(
    "backshell",
    "Backshell",
    bs,
    edl.backshellMass ?? shell.dry - mHS,
    edl.chute.diam,
    0.62,
    "backshell",
    true,
  ); // the parachute's drag, and a little of the backshell's
}
// Mars 2020's landing in its parts (edl.skycrane). The configurations the app shows the entry vehicle in, from the heat
// shield's going to the rover's lowering (app/33_mars2020.js), and the parts that go their own ways: the heat shield and
// the backshell (shellParts); and the descent stage, once the rover is down, flying off: a second's hover, a climb, a turn to 45° from the
// vertical and thrust (2.2 g here) for as long as it takes to come down edl.flyaway metres away along the ground track.
// It is not seen after it hits the ground.
function skyCraneParts(M, SC, ship, ent, site, mDS, tEnd) {
  const edl = SC.edl,
    sc = SC.model,
    R = surfaceRadius("mars"),
    elev = site.elev || 0,
    at = (n) => ent.events.find((e) => e.name === n);
  const sky = at("Sky crane");
  shellParts(M, SC, ship, ent, site, tEnd);
  if (sky)
    ship.setConfig(sky.t, "sc", {
      key: "sc",
      sc,
      parts: ["lander"],
      powered: true,
      skyT: sky.t,
    });
  // the descent stage's flight in the site's own frame (metres along the ground track and up; m/s; thrust in m/s²; tilt)
  const g = (BODIES.mars.mu / (R * R)) * 1000,
    aT = 2.2 * g;
  const fly = (tb) => {
    const out = [];
    let x = 0,
      z = edl.hang,
      vx = 0,
      vz = 0;
    for (let k = 0; k < 6000; k++) {
      const s = k * 0.05,
        th = clamp((s - 2.5) / 1.5, 0, 1) * 45 * DEG,
        a = s < 1 ? g : s < 2.5 ? g + 4 : s < 2.5 + tb ? aT : 0;
      out.push([s, x, z, vx, vz, a, th]);
      if (z < 0) break;
      vx += a * Math.sin(th) * 0.05;
      vz += (a * Math.cos(th) - g) * 0.05;
      x += vx * 0.05;
      z += vz * 0.05;
    }
    return out;
  };
  let lo = 0,
    hi = 30;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2,
      p = fly(mid);
    if (p[p.length - 1][1] < edl.flyaway) lo = mid;
    else hi = mid;
  }
  const path = fly((lo + hi) / 2);
  const pd =
      ent.samples.find((x) => x.phase === "powered descent") || ent.samples[0],
    ll0 = subPointLL("mars", pd.r, pd.t),
    cl = Math.cos(ent.ll[0] * DEG);
  let he = (ent.ll[1] - ll0[1]) * cl,
    hn = ent.ll[0] - ll0[0];
  const hl = Math.hypot(he, hn);
  if (hl > 1e-9) {
    he /= hl;
    hn /= hl;
  } else {
    he = 1;
    hn = 0;
  } // heading: on along the ground track
  const W = vunit(bodyOmegaEcl("mars", ent.t)),
    t0 = ent.t;
  const pos = (x, z, t) =>
    sitePosEcl(
      "mars",
      ent.ll[0] + ((x * hn) / (R * 1000)) * RAD,
      ent.ll[1] + ((x * he) / (R * 1000 * cl)) * RAD,
      elev + z / 1000,
      t,
    );
  const smp = [],
    idx = [];
  for (let i = 0; i < path.length - 1; i += 5) idx.push(i);
  idx.push(path.length - 1); // every quarter second, and the impact
  for (const i of idx) {
    const [s, x, z, vx, vz, a, th] = path[i],
      t = t0 + s,
      r = pos(x, Math.max(z, 0), t),
      h = 0.01;
    const v = vscale(
      vsub(
        pos(x + vx * h, z + vz * h, t + h),
        pos(x - vx * h, z - vz * h, t - h),
      ),
      1 / (2 * h),
    );
    const U = vunit(r),
      E = vunit(vcross(W, U)),
      N = vcross(U, E),
      H = vadd(vscale(E, he), vscale(N, hn));
    smp.push({
      t,
      r,
      v,
      m: mDS,
      T: a * mDS,
      thrDir:
        a > 0
          ? vunit(vadd(vscale(H, Math.sin(th)), vscale(U, Math.cos(th))))
          : null,
      phase: "descent stage flyaway",
      alt: z / 1000,
    });
  }
  const ds = M.addObj(
    new MObject("ds", "Descent stage", {
      kind: "stage",
      model: sc,
      color: "#aaa",
    }),
  );
  ds.setConfig(t0, "sc", { key: "sc", sc, parts: ["descentstage"] });
  ds.add(new SampleSeg("mars", smp, { m: mDS }));
  M.ev(
    t0 + 1,
    "ds",
    "Descent stage flyaway",
    "The bridles are cut; the descent stage throttles up and flies off at 45°, clear of the rover.",
    "powered",
  );
  M.ev(
    smp[smp.length - 1].t,
    "ds",
    "Descent stage impact",
    `The descent stage comes down about ${edl.flyaway} m from the rover.`,
    "info",
  );
}
function earthEntryGeneric(SC, P, t0, r0, v0, m, bank) {
  if (SC.usesUpperStage) {
    const e = SC.edl,
      mm = m ?? P.massOf(SC.orbiter) + P.upper.dry + P.upper.propLeft;
    return simulateEntry({
      body: "earth",
      t0,
      r0,
      v0,
      m0: mm,
      diam: e.diam,
      cd: e.cd,
      LD: e.LD,
      rn: e.rn,
      bank,
      maxTime: 4000,
      propulsiveLanding: { ignAlt: 2.5, bellyCdA: 1.0 * 9 * 50 },
      land: { Tmax: 3 * 2.3e6, isp: 327, minThr: 0.08 },
    });
  }
  const cap = SC.modules[SC.capsule];
  return earthEntryRun(cap, t0, r0, v0, m ?? P.massOf([SC.capsule]), bank);
}
function earthEntryRun(cap, t0, r0, v0, m, bank, chutes) {
  return simulateEntry({
    body: "earth",
    t0,
    r0,
    v0,
    m0: m,
    diam: cap.heat.diam,
    cd: cap.heat.cd,
    LD: cap.heat.LD,
    rn: cap.heat.rn,
    bank,
    chutes: chutes ?? cap.heat.chutes,
    maxTime: 4000,
  });
}
// --------------------------------------------------------------------------

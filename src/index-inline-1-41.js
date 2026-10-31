// index-inline-1 41 — trel
// Lines 13897-14024 of readable/index-inline-1.pretty.js (statement-aligned).
function payloadDeploy(o) {
  const { M, cfg, ship, H } = o,
    d = cfg.deploy;
  const tRel = isoToT(d.t),
    tGr = tRel - (d.grapple ?? 8) * H,
    tUn = tRel - (d.unberth ?? 6.4) * H,
    tArr = tRel - (d.arrays ?? 2.6) * H;
  o.progress("Payload deploy…");
  o.coast(tGr - 0.5 * H, "in orbit");
  // the arm and the payload move continuously between these times (the renderer poses them: app/32_shuttle.js deployRig):
  // the arm unstows and reaches for the grapple fixture in the 25 minutes before the grapple, lifts the payload out at the
  // unberth, holds it upright over the bay while its arrays unfurl, lets go at the release and is stowed again within the hour
  const armT = { gr: tGr, un: tUn, arr: tArr, rel: tRel };
  ship.setConfig(tGr - 0.5 * H, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    armPay: d.model,
    armT,
    bay: "open",
    att: "deploy",
  });
  ship.setConfig(tRel, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    armT,
    bay: "open",
    att: "deploy",
  });
  ship.setConfig(tRel + 1.2 * H, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    bay: "open",
  });
  M.ev(
    tGr,
    "ship",
    `Robot arm grapples ${d.short || d.name}`,
    `The 15-m Canadarm, flown from the aft flight deck, latches on to the telescope’s grapple fixture. ${d.name} has been running on the orbiter’s power; now it switches to its own batteries.`,
    "info",
  );
  M.ev(
    tUn,
    "ship",
    `${d.short || d.name} lifted out of the bay`,
    "Slowly, a few centimetres per second, the arm lifts the 11-tonne telescope clear of the payload bay — clearances along the bay sill were only a few centimetres.",
    "info",
  );
  M.ev(
    tArr,
    "ship",
    "Solar arrays and antennas unfurl",
    "The two 12-m solar array wings roll out from their storage drums and the two high-gain antennas swing out on their booms. One wing stuck partway, and two spacewalkers suited up in the airlock before ground controllers freed it with a software fix.",
    "photo",
  );
  // release: the payload becomes its own spacecraft; the orbiter backs away
  o.coast(tRel, "in orbit — deploy");
  const s = o.st();
  const F = lvlh(s.r, s.v),
    off = fromLvlh(F, d.armOffset || [0.0028, 0, 0.012]); // where the arm holds it, upright over the bay (in the orbiter's frame 2.8 m forward of its reference point and 12 m up)
  const pay = M.addObj(
    new MObject(d.id || "payload", d.name, {
      kind: "craft",
      model: d.model,
      color: "#bfe3ff",
    }),
  );
  pay.setConfig(tRel, "sc", { key: "sc", sc: d.model, parts: ["deployed"] });
  if (d.doorOpen) {
    const td = isoToT(d.doorOpen);
    pay.setConfig(td, "sc", {
      key: "sc",
      sc: d.model,
      parts: ["deployed"],
      door: true,
      doorT: td,
    });
    M.ev(
      td,
      d.id || "payload",
      "Aperture door opens",
      "Two days after the deploy, the telescope’s aperture door swings open; first light follows a month later — and with it the discovery that the main mirror had been ground to the wrong shape.",
      "photo",
    );
  }
  const tPayEnd = isoToT(cfg.landing) + 8 * H;
  const rP = leoInt(tRel, [...vadd(s.r, off), ...s.v, d.mass], tPayEnd, {
    hmax: 60,
  });
  pay.add(resToSeg(rP, `${d.short || d.name} in orbit`));
  M.ev(
    tRel,
    "ship",
    `${d.short || d.name} released`,
    `The arm lets go at ${fmtUTC(tRel)} UTC, ${Math.round(vnorm(s.r) - R_E)} km up — the highest orbit a Shuttle had flown. The telescope is on its own.`,
    "sep",
  );
  const dvS = vscale(F.x, 0.0004);
  o.y[3] += dvS[0];
  o.y[4] += dvS[1];
  o.y[5] += dvS[2];
  o.y[6] -= d.mass;
  if (o.P.mods.PAY) o.P.mods.PAY.attached = false;
  M.burn({
    name: "Separation burn",
    t: tRel + 1,
    dur: 8,
    dv: 0.4,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp(-0.4 / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tRel + 0.4 * H,
    "ship",
    "Standing by",
    "The orbiter backs away and stays within reach for two days, in case a spacewalk is needed to fix the telescope.",
    "info",
  );
  M.phase(tGr, tRel + 0.5 * H, `${d.short || d.name} deploy`, "#43aa8b");
}

// ---------------------------------------------------------------------------
// Coming home: pick the landing opportunity, close the payload bay, deorbit burn, entry, TAEM, landing, rollout
// ---------------------------------------------------------------------------
const EI_SH = 121.92; // entry interface, 400,000 ft

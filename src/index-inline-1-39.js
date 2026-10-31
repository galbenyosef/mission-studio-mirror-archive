// index-inline-1 39 — sch
// Lines 13321-13418 of readable/index-inline-1.pretty.js (statement-aligned).
function shuttleAscentEvents(M, cfg, L, asc, ship) {
  const t0 = M.t0,
    ev = M.events,
    H = 3600;
  const find = (f) => ev.find(f);
  const po = find((e) => e.name === "Pitch-over");
  if (po) {
    po.name = "Roll program";
    po.t = t0 + 10;
    po.desc = `Clear of the tower, the Shuttle rolls onto its launch azimuth (${asc.azI.toFixed(0)}° inertial) and pitches over, ending up “heads-down”: the orbiter rides beneath the tank with the crew facing the ground. The attitude spreads the aerodynamic loads on the wings and keeps the antennas pointed at the ground stations.`;
  }
  const lo = find((e) => e.name === "Liftoff");
  if (lo)
    lo.desc = `The boosters ignite at T−0 and the hold-down bolts fire: ${(liftoffStages(L).reduce((a, s) => a + s.thrustSL, 0) / 1e6).toFixed(1)} MN of thrust, about 85 % of it from the two solid rocket boosters, lifts ${(stackMass(buildAscentStack(L, asc.stack.payload)) / 1000).toFixed(0)} t off the pad.`;
  const sch = L.stages[1].sched;
  if (sch) {
    const iD = sch.findIndex((p, i) => i > 0 && p[1] < sch[i - 1][1]),
      iU = sch.findIndex((p, i) => i > iD && iD > 0 && p[1] > sch[i - 1][1]);
    if (iD > 0)
      M.ev(
        t0 + sch[iD - 1][0],
        "ship",
        "Throttle down",
        `The main engines throttle back to about ${Math.round(sch[iD][1] * 104.5)} % for the thickest air, so the dynamic pressure stays within limits through Max-Q. The boosters’ shaped propellant grain cuts their thrust at the same time.`,
        "ascent",
      );
    if (iU > 0)
      M.ev(
        t0 + sch[iU][0],
        "ship",
        "Throttle up",
        "“Go at throttle up.” Past Max-Q the main engines return to full power (104.5 %).",
        "ascent",
      );
  }
  const mq = find((e) => e.kind === "maxq");
  if (mq)
    mq.desc = `Maximum dynamic pressure, ${(asc.maxQ / 1000).toFixed(1)} kPa (about ${Math.round(asc.maxQ / 47.88)} lb/ft²): the moment of greatest aerodynamic stress.`;
  const sb = find((e) => e.kind === "staging" && /Booster/.test(e.name));
  if (sb) {
    sb.name = "SRB separation";
    sb.desc = `The two boosters burn out and are pushed clear by sixteen small separation motors. They coast up to about 65 km, then parachute into the Atlantic, where ships recover them for refurbishment. ${EXPLAIN.staging}`;
  }
  M.ev(
    t0 + (cfg.negReturn ?? 240),
    "ship",
    "Negative return",
    "Too far and too fast to turn around: a return-to-launch-site abort is no longer possible. An engine failure from here on means an abort across the Atlantic or to orbit.",
    "ascent",
  );
  M.ev(
    t0 + (cfg.pressToMeco ?? 375),
    "ship",
    "Press to MECO",
    "Even if one main engine failed now, the other two could still reach orbit.",
    "ascent",
  );
  if (cfg.headsUpMET) {
    M.ev(
      t0 + cfg.headsUpMET,
      "ship",
      "Roll to heads-up",
      "The stack rolls over so the orbiter rides on top of the tank. Its antennas now face up, toward the TDRS relay satellites, instead of the ground stations along the coast.",
      "ascent",
    );
    const c = ship.configAt(t0 + cfg.headsUpMET);
    if (c)
      ship.setConfig(t0 + cfg.headsUpMET, "launch", {
        ...c.label,
        headsUp: true,
      });
  }
  const s3 = (asc.samples || []).find(
    (s) =>
      s.t > t0 + 300 && s.throttle < (sch ? curveAt(sch, s.t - t0) : 1) - 0.015,
  );
  if (s3)
    M.ev(
      s3.t,
      "ship",
      "3-g throttling",
      "The stack keeps getting lighter as the tank empties, so the main engines throttle back to hold the acceleration at 3 g.",
      "ascent",
    );
  const ins = find((e) => e.kind === "insertion");
  if (ins) {
    ins.name = "MECO";
    const el = asc.el;
    ins.desc = `Main engine cutoff, ${Math.round(asc.t - t0 - 0)} s after liftoff: ${vnorm(asc.v).toFixed(2)} km/s at ${Math.round(vnorm(asc.r) - R_E)} km. The orbit is ${Math.round(el.rp - R_E)} × ${Math.round(el.ra - R_E)} km — still dipping into the atmosphere, which is where the tank will fall.`;
  }
}

// ---------------------------------------------------------------------------
// ISS rendezvous and docking (STS-135 style): phasing burns, terminal initiation, an R-bar approach from below,
// the R-bar pitch maneuver, a swing up to the V-bar and the final approach to the docking port; undocking,
// flyaround and separation. The station's orbit is built so the meeting happens at the historical docking time:
// its altitude and plane are right; its position along the orbit is set where the orbiter arrives.
// ---------------------------------------------------------------------------

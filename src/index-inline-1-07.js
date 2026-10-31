// index-inline-1 07 — ramp
// Lines 2137-2295 of readable/index-inline-1.pretty.js (statement-aligned).
LAUNCHERS.shuttle = {
  name: "Space Shuttle",
  org: "NASA (USA)",
  years: "1981–2011",
  height: 56.1,
  diameter: 8.4,
  crewRated: true,
  sideMount: true,
  blurb:
    "Two solid rocket boosters and three RS-25 engines on the winged orbiter, all burning at liftoff; the RS-25s draw on the orange External Tank. The boosters fall away after two minutes, the tank at orbit, and the orbiter glides home to a runway.",
  stages: [
    {
      id: "SRB",
      name: "2 × Solid Rocket Boosters (RSRM)",
      prop: "solid",
      engine: "RSRM",
      n: 2,
      thrustSL: 2 * 12.45e6,
      thrustVac: 2 * 13.61e6,
      ispSL: 242,
      ispVac: 268,
      dry: 2 * 87000,
      propMass: 2 * 501000,
      parallel: true,
      curve: [
        [0, 1.0],
        [10, 1.062],
        [20, 1.088],
        [30, 0.938],
        [50, 0.775],
        [60, 0.8],
        [75, 0.85],
        [100, 0.732],
        [110, 0.369],
        [115, 0.258],
        [120, 0.144],
        [124, 0.016],
        [130, 0.016],
      ],
      // 45.46 m from the nozzle's exit to the nose, 3.71 m across; the nozzle's exit 9.26 m below the tank's aft dome (the stack
      // stands 56.1 m tall). Drawn with the detailed model 'shuttle_stack' once it has loaded (the left booster mirrored).
      booster: { count: 2, offset: 6.4, y0: -8.38 },
      geom: [
        [2.5, 2.6, 1.86, C.white],
        [35.9, 1.855, 1.855, C.white, { bands: 4 }],
        [3.3, 1.855, 1.6, C.white],
        [2.4, 1.6, 0.6, C.white],
        [0.48, 0.6, 0.1, C.white],
      ],
      eng: { n: 1, len: 0.88, r: 1.9, layout: "single" },
      detail: "shuttle_stack",
    },
    {
      id: "ET",
      name: "External Tank (3 × RS-25 on the orbiter)",
      prop: "hydrolox",
      engine: "RS-25",
      n: 3,
      thrustSL: 3 * 1.769e6,
      thrustVac: 3 * 2.188e6,
      ispSL: 365,
      ispVac: 452.3,
      dry: 26500,
      propMass: 729000,
      maxG: 3.0,
      minThr: 0.67,
      sched: [
        [0, 1],
        [30, 1],
        [32, 0.69],
        [50, 0.69],
        [53, 1],
      ],
      geom: [
        [0.9, 2.4, 4.2, C.foam],
        [26.1, 4.2, 4.2, C.foam],
        [6.9, 4.2, 4.2, "#c9803f", { bands: true }],
        [1.9, 4.2, 4.2, C.foam],
        [4.4, 4.2, 3.55, C.foam],
        [3.8, 3.55, 2.3, C.foam],
        [2.4, 2.3, 0.75, C.foam],
        [0.5, 0.75, 0.15, "#4a4a4a"],
      ],
      eng: null,
      detail: "shuttle_stack",
    },
  ],
  jettison: [],
  payloadFairing: null,
  // direct insertion: main engine cutoff (MECO) at ≈ 105 km on a 58 × 225 km orbit; the OMS raises the perigee later
  ascent: {
    hp: 58,
    ha: 225,
    hCut: 105,
    vert: 7,
    kickGuess: 3,
    qMax: 36000,
    gTgo: true,
  },
  arefExtra: 25,
};
// Engine start on the pad: liquid engines light t seconds before liftoff and build up to full thrust (ramp, s; stagger
// between engine groups, s) while hold-down clamps keep the vehicle down; solid boosters always light at T−0.
//   Saturn V: engine start sequence at T−8.9 s, centre F-1 first, then opposing pairs 300 ms apart (NASA)
//   SLS: RS-25 start-up at T−6.36 s, boosters at T−0 (NASA Artemis II countdown)
//   Atlas V: RD-180 ignition at T−2.7 s, solids at T−0 (ULA timelines)
//   Falcon Heavy: 27 Merlins at about T−2 s (Spaceflight Now) · Starship: about T−3 s (press reports)
//   Long March 5: core and boosters ignite before liftoff (time approximate) · Atlas LV-3: approximate
//   Ariane 5: the Vulcain 2 at H0, the boosters at H0 + 7.05 s after its health check, liftoff at H0 + 7.3 s (Arianespace)
//   LVM3: the S200 solids light at T−0 and the L110 core is air-started, so nothing burns on the pad beforehand
const PAD_IGNITION = {
  saturnV: {
    t: 8.9,
    ramp: 4.0,
    stagger: 0.3,
    seq: "centre engine first, then opposing pairs 0.3 s apart",
  },
  sls1: {
    t: 6.36,
    ramp: 3.0,
    stagger: 0.12,
    seq: "the four RS-25s start 0.12 s apart",
  },
  atlasV541: { t: 2.7, ramp: 1.4 },
  atlasAgena: { t: 2.0, ramp: 1.2, approx: true },
  falconHeavy: { t: 2.0, ramp: 1.2 },
  lm5: { t: 3.0, ramp: 1.6, approx: true },
  starship: { t: 3.0, ramp: 1.6, approx: true },
  lvm3: { t: 0, ramp: 0 },
  ariane5ECA: {
    t: 7.3,
    ramp: 3.0,
    seq: "the Vulcain 2 lights at H0 and is checked for seven seconds; the boosters light and the vehicle leaves at H0 + 7.3 s",
  },
  shuttle: {
    t: 6.6,
    ramp: 3.0,
    stagger: 0.12,
    seq: "main engines 3, 2 and 1 start 0.12 s apart",
  }, // NSTS News Reference Manual
};
for (const k in PAD_IGNITION)
  if (LAUNCHERS[k]) LAUNCHERS[k].ign = PAD_IGNITION[k];
// stages whose engines are burning at liftoff: boosters plus the first core stage (unless that core is air-started)
function liftoffStages(L) {
  const iCore = L.stages.findIndex((s) => !s.parallel);
  return L.stages.filter(
    (s, i) => (s.parallel || i === iCore) && !(s.ignition > 0),
  );
}
// "27 × Merlin 1D", "8 × YF-100 + 2 × YF-77": engine counts, identical engines merged
function engineCounts(stages) {
  const m = new Map();
  for (const s of stages) m.set(s.engine, (m.get(s.engine) || 0) + s.n);
  return [...m].map(([e, n]) => `${n} × ${e}`).join(" + ");
}

// ---------------- spacecraft (payload stacks) ----------------
// modules: dry kg, prop kg, engine {name, thrust N, isp s, prop}

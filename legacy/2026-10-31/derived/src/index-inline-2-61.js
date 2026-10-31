// index-inline-2 61 — cam
// Lines 17521-17865 of readable/index-inline-2.pretty.js (statement-aligned).
function initCameraInput() {
  const el = $("#gl");
  const ptrs = new Map();
  let pinch0 = null,
    lastTap = 0;
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      b: e.button,
      shift: e.shiftKey,
    });
    el.classList.add("dragging");
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        dist: CAM.dist,
        lens: CAM.lens,
        zk: DIR.zoomK,
      };
    }
  });
  el.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = pinch0.d / Math.max(d, 1);
      if (CAM.mode === "ground") CAM.lens = clamp(pinch0.lens / k, 8, 3200);
      else if (CAM.mode === "auto") DIR.zoomK = clamp(pinch0.zk * k, 0.05, 2e4);
      else CAM.dist = clamp(pinch0.dist * k, 0.004, 5e10);
      CAM.trans = null;
      applyLens();
      syncCamUI();
      return;
    }
    const fovK = Math.min(1, CAM.lens > 0 ? 50 / CAM.lens : 1);
    if (p.b === 2 || p.shift) {
      CAM.roll += dx * 0.004;
      return;
    }
    if (CAM.mode === "ground") {
      CAM.ground.track = false;
      CAM.ground.yaw -= dx * 0.0035 * fovK;
      CAM.ground.pitch = clamp(
        CAM.ground.pitch + dy * 0.0035 * fovK,
        -1.55,
        1.55,
      );
      return;
    }
    if (CAM.mode === "auto") {
      DIR.offAz -= dx * 0.006;
      DIR.offEl = clamp(DIR.offEl + dy * 0.006, -1.5, 1.5);
      DIR.blend = null;
      return;
    }
    CAM.az -= dx * 0.006;
    CAM.el = clamp(CAM.el + dy * 0.006, -1.55, 1.55);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = null;
    if (!ptrs.size) el.classList.remove("dragging");
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      if (CAM.mode === "ground") {
        CAM.lens = clamp(CAM.lens * Math.exp(-dy * 0.0012), 8, 3200);
        applyLens();
        syncCamUI();
        return;
      }
      if (CAM.mode === "auto") {
        DIR.zoomK = clamp(DIR.zoomK * Math.exp(dy * 0.0012), 0.05, 2e4);
        return;
      }
      CAM.trans = null;
      CAM.dist = clamp(CAM.dist * Math.exp(dy * 0.0012), 0.004, 5e10);
    },
    { passive: false },
  );
  el.addEventListener("dblclick", (e) => {
    // pick nearest label
    let best = null,
      bd = 40;
    for (const lbl of [...$$("#labels .lbl")]) {
      const r = lbl.getBoundingClientRect();
      if (r.left < -1000) continue;
      const d = Math.hypot(r.left + 4 - e.clientX, r.top + 7 - e.clientY);
      if (d < bd) {
        bd = d;
        best = lbl;
      }
    }
    if (best) best.click();
  });
}
function syncCamUI() {
  const sm = $("#selMode");
  if (sm.value !== CAM.mode) sm.value = CAM.mode;
  const st = $("#selTarget");
  if (st.value !== CAM.target) st.value = CAM.target;
  const sl = $("#selLook");
  if (sl.value !== CAM.look) sl.value = CAM.look;
  const ln = $("#selLens");
  const lv = String(Math.round(CAM.lens));
  if (![...ln.options].some((o) => o.value === lv)) {
    const o =
      ln.querySelector("option[data-custom]") ||
      h("option", { "data-custom": "1" });
    o.value = lv;
    o.textContent = lv + " mm";
    if (!o.parentNode) ln.prepend(o);
  }
  ln.value = lv;
  $("#lookWrap").hidden = CAM.mode !== "lookat";
}

// ==== 60_telemetry.js
// ============================================================================
// Telemetry: physics read-outs for the followed craft at the current instant.
// ============================================================================
const PHASE_TEXT = [
  [
    /ignition/i,
    "Ignition: the engines light seconds before liftoff and build up to full thrust while hold-down clamps keep the rocket on the pad. The computers check every engine and can still shut everything down safely; only then do the clamps let go. Water pours onto the pad to absorb heat and sound — the white clouds are mostly steam.",
  ],
  [
    /on the pad/i,
    "Final countdown. The tanks are topped off and the vehicle stands on the pad, held down by clamps until the engines reach full thrust.",
  ],
  [/^vertical/i, EXPLAIN.vertical],
  [
    /pitch-?over/i,
    "Pitch-over: clear of the tower, the rocket tips a few degrees toward its launch azimuth. From here on it flies nose into the airflow and gravity bends the path toward horizontal.",
  ],
  [/gravity turn/i, EXPLAIN.gravityTurn],
  [
    /closed-loop/i,
    "Closed-loop guidance: above the dense atmosphere the flight computer steers to hit the target orbit exactly — altitude, speed and flight-path angle.",
  ],
  [
    /stranded|shortfall|drift/i,
    "The vehicle did not have enough propellant for this burn, so it stays on the trajectory it reached. Choose a more capable rocket or a lighter payload in the setup.",
  ],
  [/parking|low Earth orbit|Earth orbits/i, EXPLAIN.parking],
  [
    /high Earth orbit/i,
    "High Earth orbit: an elongated orbit reaching tens of thousands of kilometres, used to check out the spacecraft before committing to the Moon.",
  ],
  [/trans-lunar injection/i, EXPLAIN.tli],
  [/trans-mars|departure burn/i, EXPLAIN.tmi],
  [/trans-earth injection/i, EXPLAIN.tei],
  [
    /translunar|outbound coast/i,
    EXPLAIN.coast +
      " The craft climbs out of Earth’s gravity well, slowing from 10.8 km/s to under 1 km/s near the Moon.",
  ],
  [/free return|lunar flyby|circumlunar/i, EXPLAIN.freeReturn],
  [/lunar orbit insertion|LOI/i, EXPLAIN.loi],
  [
    /lunar orbit|orbit around the Moon/i,
    "Lunar orbit: about 2 hours per revolution at 110 km altitude. Each pass behind the Moon cuts radio contact with Earth.",
  ],
  [
    /approach to (earth|mars|the moon)|final approach/i,
    "Final approach: the craft falls toward the planet, gaining speed. A last trajectory correction sets the entry angle — too steep and the g-load and heating are lethal, too shallow and the craft skips off the atmosphere.",
  ],
  [
    /powered descent|braking phase|approach phase|terminal|landing burn/i,
    EXPLAIN.pdi,
  ],
  [
    /sky crane/i,
    "Sky crane: the descent stage hovers and lowers the rover on bridles, then flies away to crash at a safe distance.",
  ],
  [
    /driving/i,
    "Driving: each of the six wheels has its own motor; top speed is 4.2 cm/s (0.15 km/h). AutoNav builds a 3D map of the ground ahead and steers around hazards by itself, because commands from Earth take 5–20 minutes to arrive. Drives are planned on Earth the day before and run around local midday.",
  ],
  [/surface|landed|touchdown|making propellant/i, EXPLAIN.surface],
  [/lunar ascent|mars ascent|ascent/i, EXPLAIN.ascent],
  [/rendezvous|docking/i, EXPLAIN.rendezvous],
  [
    /transearth|return coast|return to Earth/i,
    "Coasting home: Earth’s gravity accelerates the craft to about 11 km/s by the time it reaches the atmosphere.",
  ],
  [
    /parachute/i,
    "Parachutes: drogues stabilise the capsule at supersonic or high-subsonic speed, then the mains slow it to a few metres per second.",
  ],
  [
    /skip/i,
    "Skip entry: the capsule uses lift to bounce back out of the upper atmosphere, then re-enters — spreading out the heat and extending the range.",
  ],
  [/entry|plasma/i, EXPLAIN.entry],
  [/edl/i, EXPLAIN.edl],
  [/mars orbit insertion|capture/i, EXPLAIN.moi],
  [
    /mars orbit|orbit around mars|parking orbit at mars|aerobrak/i,
    "Orbiting Mars: one Martian day (sol) is 24 h 37 min. Elliptical orbits are cheap to enter and let the orbiter survey the surface below.",
  ],
  [/flyby|gravity assist/i, EXPLAIN.flyby],
  [/cruise|heliocentric|solar orbit|interplanetary/i, EXPLAIN.cruise],
  [
    /departure hyperbola/i,
    "Departure hyperbola: the craft is escaping Earth. Its speed relative to Earth tends toward v∞, the hyperbolic excess speed.",
  ],
  [
    /spent|stage/i,
    "A spent stage: empty tanks and engines, discarded to save mass.",
  ],
  [
    /recovery/i,
    "Recovery: ships and helicopters reach the capsule within the hour.",
  ],
];
// Space Shuttle flights: checked before the general texts (their phase names overlap: entry, approach, docking)
const SHUTTLE_TEXT = [
  [
    /coasting with the tank/i,
    "Main engine cutoff. The empty External Tank is still attached; eighteen seconds later it is released and the orbiter moves clear with its small reaction-control jets.",
  ],
  [
    /External Tank — falling/i,
    "The External Tank on its own: 26 tonnes of empty aluminium. Its orbit dips into the atmosphere, so half an orbit later it breaks up and falls into a remote stretch of ocean — the only part of the Shuttle not reused.",
  ],
  [
    /climbing to apogee|MECO — coasting/i,
    "Coasting up to the high point of the orbit. The low point is still inside the atmosphere; at the top the OMS engines will fire to lift it out (OMS-2).",
  ],
  [
    /\bOMS-\d|orbit insertion|circularis/i,
    "Orbital Maneuvering System: two 27 kN engines in the pods beside the tail. Their propellants — monomethylhydrazine and nitrogen tetroxide — ignite on contact, so the engines start reliably every time.",
  ],
  [
    /NC-\d|catching up|closing in/i,
    "Phasing: the orbiter starts thousands of kilometres behind the station. A lower orbit is a faster one, so each burn adjusts the height to close the gap at just the right rate — arriving half an orbit after terminal initiation.",
  ],
  [
    /terminal initiation|TI —|closing on the station/i,
    "Terminal initiation: the burn that commits to the rendezvous. Half an orbit later the orbiter arrives 600 m below the station; the crew flies the last part by hand, watching radar and laser range-finder data.",
  ],
  [
    /R-bar approach/i,
    "R-bar approach: the orbiter closes in from directly below the station, along the line to Earth’s centre. Orbital mechanics help: anything below the station tends to drift up toward it, so the approach is gentle.",
  ],
  [
    /R-bar pitch/i,
    "R-bar pitch maneuver: a slow 360° back-flip, 183 m below the station. For nine minutes the belly faces the station crew, who photograph every heat-shield tile — a check added after Columbia was lost in 2003.",
  ],
  [
    /moving to the V-bar/i,
    "Swinging to the V-bar: a quarter circle up and in front of the station, to its line of flight. The orbiter pitches nose-up so its docking port faces the station.",
  ],
  [
    /docked to the ISS/i,
    "Docked: orbiter and station fly as one 500-tonne spacecraft. The station’s robot arm moves cargo between them, and the orbiter can even draw power from the station to stay longer.",
  ],
  [
    /backing away/i,
    "Undocking: springs push the spacecraft apart; the orbiter backs away slowly along the V-bar with its small jets, careful not to blast the station’s solar arrays.",
  ],
  [
    /flyaround/i,
    "Flyaround: a last lap around the station at about 180 m, so the crew can photograph every side of it for engineers on the ground.",
  ],
  [
    /V-bar approach|docking/i,
    "Final approach along the V-bar at a few centimetres per second. The docking mechanism’s capture ring latches on, then retracts to pull the two spacecraft together and seal the hatches.",
  ],
  [
    /deploy/i,
    "Payload deploy: the 15 m Canadarm, flown from the aft flight-deck windows, lifts the payload out of the bay, holds it while its systems come alive, and lets go.",
  ],
  [
    /hubble in orbit/i,
    "Free flying: the Hubble Space Telescope on its own, 615 km up, its two solar array wings unrolled.",
  ],
  [
    /deorbit preparations|deorbit burn/i,
    "Deorbit: about an hour before landing, half a world away from the runway, the orbiter fires both OMS engines against its direction of flight. The orbit’s far side drops into the atmosphere — there is no turning back.",
  ],
  [
    /falling toward the atmosphere/i,
    "Falling toward the atmosphere. The orbiter has turned around to fly nose-first with its nose 40° up, so the black heat-shield tiles on its belly will take the heat.",
  ],
  [
    /entry/i,
    "Entry: the orbiter meets the air at 7.8 km/s and a 40° angle of attack. It is a glider: it steers by banking, and each roll reversal swings its path back toward the runway. The tiles on its belly reach 1,260 °C, the wing leading edges 1,500 °C.",
  ],
  [
    /TAEM/i,
    "Terminal area energy management: below 25 km and Mach 2.5 the orbiter is a supersonic glider. The computers manage its energy — speed and height — so it arrives at the runway with just enough to land.",
  ],
  [
    /heading alignment/i,
    "Heading alignment cone: a turn around an imaginary cylinder to line up with the runway. Wider for more energy, tighter for less: this is the last big correction.",
  ],
  [
    /outer glideslope/i,
    "Outer glideslope: a 19° dive at about 290 knots — seven times steeper than an airliner’s. The split rudder opens as a speed brake to hold the airspeed.",
  ],
  [
    /flare|inner glideslope/i,
    "Preflare and flare: the commander pulls the nose up to flatten the dive onto a 1.5° glideslope, the landing gear comes down, and the orbiter floats toward the runway, slowing to about 200 knots.",
  ],
  [
    /rollout/i,
    "Rollout: main gear first at about 200 knots (370 km/h), then the nose comes down; the drag chute and the brakes stop the 100-tonne glider within about 2.7 km.",
  ],
  [
    /wheel stop|on the runway/i,
    "“Wheel stop.” Ground crews in protective suits approach first, checking for toxic propellant vapours; purge and cooling air is connected to the orbiter before the crew can leave, about an hour later.",
  ],
  [
    /^in orbit|flight tests|in orbit —/i,
    "In orbit: one lap every 90 minutes at about 28,000 km/h, sixteen sunrises and sunsets a day. The payload bay doors stay open: their inner faces are the radiators that keep the orbiter cool.",
  ],
];
const MARS_TEXT = [
  [
    /parachute/i,
    "Supersonic parachute: a 21.5 m disk-gap-band canopy opens at about Mach 1.7. The air is only 1 % as dense as Earth’s, so the parachute slows the craft to about 100 m/s — not enough to land.",
  ],
  [
    /powered|sky crane|terminal|approach/i,
    "Powered descent in thin Martian air: the final ~100 m/s must be removed by rocket engines. The radar measures altitude and terrain-relative navigation picks a safe spot.",
  ],
  [/entry|plasma/i, EXPLAIN.edl],
];

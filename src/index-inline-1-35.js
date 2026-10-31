// index-inline-1 35 — back
// Lines 12340-12416 of readable/index-inline-1.pretty.js (statement-aligned).
function manifoldBranch(azKm, ph, eps, sg, fwdT) {
  const { y, vs, H } = haloSeed(azKm, ph),
    mu = H.mu,
    AU = 1.496e8;
  const y0 = y.map((v, i) => v + sg * eps * vs[i]);
  const dE = (yy) => Math.hypot(yy[0] - (1 - mu), yy[1], yy[2]);
  // backward: stop at the perigee (the Earth distance's turning point, once inside 100 000 km), or after 300 days
  const DAY = SE_N * 86400;
  const back = integrate(
    cr3bpODE(mu, false),
    0,
    Float64Array.from(y0),
    -300 * DAY,
    {
      rtol: 1e-11,
      atol: 1e-13,
      h0: -0.001,
      hmax: 0.01,
      maxSteps: 4e5,
      events: [
        {
          name: "perigee",
          dir: -1,
          terminal: true,
          g: (t, yy) => {
            const rx = yy[0] - (1 - mu),
              rv = rx * yy[3] + yy[1] * yy[4] + yy[2] * yy[5];
            return dE(yy) * AU > 100000 ? 1 + Math.abs(rv) : rv;
          },
        },
      ],
    },
  ); // (backward in time the radial speed is positive on the way in and turns negative past the perigee)
  const per = back.stopEvent
    ? {
        tau: back.stopEvent.t,
        y: Array.from(back.stopEvent.y),
        r: dE(back.stopEvent.y) * AU,
      }
    : null;
  const fwd = integrate(cr3bpODE(mu, false), 0, Float64Array.from(y0), fwdT, {
    rtol: 1e-11,
    atol: 1e-13,
    h0: 0.001,
    hmax: 0.01,
    maxSteps: 4e5,
  });
  return { per, back, fwd, mu };
}
// a CR3BP state (barycentric rotating, nondimensional) at epoch t, as geocentric ecliptic km and km/s
// Lengths scale with the Earth's distance that day; velocities with that length and the rate that keeps the Earth's
// gravity exact at that scale (√(μ/L³), 2–3 % off the mean motion when the Earth is near perihelion), which is what
// matters near the perigee, where a per-cent of speed is the difference between a transfer and a four-day orbit.
function cr3bpToInertial(t, y, mu) {
  const e = planetHelio("earth", t),
    L = vnorm(e.r),
    R = seRot(t),
    om = SE_N,
    omU = Math.sqrt((BODIES.sun.mu + BODIES.earth.mu) / (L * L * L));
  const rr = [(y[0] - (1 - mu)) * L, y[1] * L, y[2] * L],
    vr = [y[3] * L * omU, y[4] * L * omU, y[5] * L * omU],
    vi = vadd(vr, [-om * rr[1], om * rr[0], 0]);
  const rot = (v) => [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ];
  return { r: rot(rr), v: rot(vi) };
}
// ---------------- the mission ----------------
// The transfer is designed as the manifold branch that comes down to a 170-km perigee in the plane the launch site lies
// in at launch, timed so that the telescope reaches the halo's neighbourhood on the planned date: three unknowns (the
// halo's size, the phase the branch leaves it at, how far from the halo the "arrival" point is) for three conditions. The
// launcher then flies the ascent in that plane and the upper stage burns to put the telescope on the branch at its
// perigee; the corrections and, round the halo, the station-keeping burns keep it on the reference. The whole flight is
// integrated under the Earth, the Moon and the Sun, so the reference (a CR3BP path) is never followed exactly: the burns
// are what the difference costs.

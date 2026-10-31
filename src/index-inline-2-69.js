// index-inline-2 69 — math
// Lines 19724-20129 of readable/index-inline-2.pretty.js (statement-aligned).
function updateExhaust(t) {
  const mesh = EXH.mesh;
  if (!mesh) return;
  const N = EXH.n,
    t0 = EXH.t0,
    pf = EXH.puffs;
  const hide = () => {
    mesh.visible = false;
    if (pf) pf.visible = false;
  };
  if (t < t0 + 0.2 || t > t0 + 2700 || EXH.off) {
    hide();
    return;
  }
  const O = R.O,
    E = helio("earth", t).r,
    om = bodyOmegaEcl("earth", t),
    wm = vnorm(om),
    kx = om[0] / wm,
    ky = om[1] / wm,
    kz = om[2] / wm,
    R0 = BODIES.earth.R;
  const cam = R.camera.position,
    cgx = cam.x + O[0] - E[0],
    cgy = cam.y + O[1] - E[1],
    cgz = cam.z + O[2] - E[2],
    hc = Math.hypot(cgx, cgy, cgz) - R0;
  const { TE, RX, DW, W0, TAU0, LIFE, U, VX, H, COL, P, dH, W, keep } = EXH;
  // the samples emitted so far, carried round by the turning Earth and moved by the wind since (geocentric, km)
  let n = 0;
  while (n < N && TE[n] <= t) n++;
  if (n < 2) {
    hide();
    return;
  }
  for (let i = 0; i < n; i++) {
    const a = t - TE[i],
      c = Math.cos(wm * a),
      sn = Math.sin(wm * a),
      vx = RX[3 * i] + DW[3 * i] * a,
      vy = RX[3 * i + 1] + DW[3 * i + 1] * a,
      vz = RX[3 * i + 2] + DW[3 * i + 2] * a,
      kv = (kx * vx + ky * vy + kz * vz) * (1 - c);
    P[3 * i] = vx * c + (ky * vz - kz * vy) * sn + kx * kv;
    P[3 * i + 1] = vy * c + (kz * vx - kx * vz) * sn + ky * kv;
    P[3 * i + 2] = vz * c + (kx * vy - ky * vx) * sn + kz * kv;
  }
  // the head: where the engines are now (the ship's plumes), while it climbs on them
  const ship = craftById("ship");
  let m = n,
    lum = 0,
    Lf = 0;
  if (ship && ship.s && t < EXH.t1 && ship.node.visible) {
    let k = 0;
    _exhV.set(0, 0, 0);
    const sc = ship.node.scale.x;
    for (const p of ship.plumes)
      if (p.visible) {
        k++;
        _exhU
          .copy(p.position)
          .multiplyScalar(sc)
          .applyQuaternion(ship.node.quaternion)
          .add(ship.node.position);
        _exhV.add(_exhU);
      }
    if (k) {
      _exhV.multiplyScalar(1 / k);
      P[3 * n] = _exhV.x + O[0] - E[0];
      P[3 * n + 1] = _exhV.y + O[1] - E[1];
      P[3 * n + 2] = _exhV.z + O[2] - E[2];
      m = n + 1;
      lum = ship.flameLum || 0;
      Lf = (ship.flameLen || 50) / 1000;
    }
  }
  const dc = (j) =>
    Math.hypot(P[3 * j] - cgx, P[3 * j + 1] - cgy, P[3 * j + 2] - cgz);
  if (dc(m - 1) > 3000 && dc(0) > 3000) {
    hide();
    return;
  }
  // distance back from the head (m) and the width now (m): turbulent mixing and, high up, free expansion. Behind the engines
  // the plume opens out like a cone, over its own width or twice the flame's length, whichever is longer
  const Lm = Lf * 1000; // m
  dH[m - 1] = 0;
  for (let i = m - 2; i >= 0; i--)
    dH[i] =
      dH[i + 1] +
      1000 *
        Math.hypot(
          P[3 * i + 3] - P[3 * i],
          P[3 * i + 4] - P[3 * i + 1],
          P[3 * i + 5] - P[3 * i + 2],
        );
  for (let i = 0; i < m; i++) {
    const j = Math.min(i, n - 1),
      a = Math.max(t - TE[j], 0),
      w0 = W0[j],
      x = Math.min(dH[i] / Math.max(1.5 * w0, 2 * Lm), 1);
    W[i] =
      w0 * (0.25 + 0.75 * x * (2 - x)) +
      4 * Math.sqrt(a) +
      0.25 * a +
      VX[j] * a;
  }
  // the samples the ribbon runs through: one every third of its width or so (or every half degree, seen from afar), and all
  // of them near the engines, where the plume opens and the smoke comes out of the flame
  const zone = (i) => Math.max(3 * W[i], 2.5 * Lm);
  let nk = 0;
  keep[nk++] = 0;
  for (let i = 1, acc = 0; i < m; i++) {
    acc += dH[i - 1] - dH[i];
    if (
      i === m - 1 ||
      acc >= Math.max(0.3 * W[i], 8 * dc(i)) ||
      dH[i] < zone(i)
    ) {
      keep[nk++] = i;
      acc = 0;
    }
  }
  // its points: those samples and, near the engines, more in between (every sixth of the width, every eighth of the flame),
  // so the cone and the smoke fading in are smooth however far apart the samples were laid. A point lies a fraction f of the
  // way from point a to point b of P.
  const { ra, rb, rf, rg } = EXH;
  let nr = 0,
    extra = 0;
  for (let kk = 0; kk < nk; kk++) {
    const a = keep[kk];
    ra[nr] = a;
    rb[nr] = a;
    rf[nr] = 0;
    nr++;
    const b = keep[kk + 1];
    if (kk + 1 >= nk || dH[b] >= zone(b)) continue;
    const step = Math.max(Lm > 0 ? Math.min(W[b] / 6, Lm / 8) : W[b] / 6, 0.5),
      ns = Math.min(Math.ceil((dH[a] - dH[b]) / step), 24, EXH_SUB - extra + 1);
    for (let k = 1; k < ns; k++) {
      ra[nr] = a;
      rb[nr] = b;
      rf[nr] = k / ns;
      nr++;
      extra++;
    }
  }
  for (let r = 0; r < nr; r++) {
    const a = ra[r],
      b = rb[r],
      f = rf[r];
    for (let k = 0; k < 3; k++)
      rg[3 * r + k] = P[3 * a + k] + (P[3 * b + k] - P[3 * a + k]) * f;
  }
  // light
  const sd = vunit(vscale(E, -1)),
    sun = [1.0, 0.97, 0.92];
  const elS =
      Math.asin(
        clamp((cgx * sd[0] + cgy * sd[1] + cgz * sd[2]) / (hc + R0), -1, 1),
      ) * RAD,
    day = smoothstep((elS + 7) / 17),
    fill = MV.layers.fill !== false;
  // exposure: after sunset the sky darkens about tenfold for every 4° the Sun sinks below the camera's horizon, and eyes and
  // cameras open up to match; the exhaust high overhead, still in sunlight, then blazes against it
  const dip = Math.acos(clamp(R0 / (R0 + Math.max(hc, 0)), -1, 1)) * RAD;
  const u = mesh.material.uniforms;
  u.uSunDir.value.set(sd[0], sd[1], sd[2]);
  u.uExpo.value = Math.pow(10, clamp(-(elS + dip), 0, 11) / 4);
  u.uFogCol.value
    .copy(R.sky.material.uniforms.uHorizon.value)
    .multiplyScalar(0.25 + 0.75 * day);
  const G = mesh.geometry.attributes,
    pos = G.position.array,
    uv = G.aUV.array,
    ta = G.aTau.array,
    su = G.aSun.array,
    am = G.aAmb.array,
    fo = G.aFog.array,
    si = G.aSide.array,
    fa = G.aFade.array;
  const PG = pf && pf.geometry.attributes,
    cap = pf ? PG.aTau.count / 4 : 0;
  const crR = _exhR.set(1, 0, 0).applyQuaternion(R.camera.quaternion),
    crU = _exhU.set(0, 1, 0).applyQuaternion(R.camera.quaternion);
  const ox = E[0] - O[0],
    oy = E[1] - O[1],
    oz = E[2] - O[2]; // geocentric → scene
  let px0 = 0,
    py0 = 0,
    pz0 = 0,
    hasPs = false,
    nv = 0,
    np = 0,
    pAcc = 0,
    dPrev = 0;
  const col = [0, 0, 0];
  for (let r = 0; r < nr; r++) {
    const a = ra[r],
      b = rb[r],
      f = rf[r],
      ja = Math.min(a, n - 1),
      jb = Math.min(b, n - 1),
      isHead = a === n;
    const lerp = (A) => A[ja] + (A[jb] - A[ja]) * f;
    const age = Math.max(t - lerp(TE), 0),
      w0 = lerp(W0),
      dHr = dH[a] + (dH[b] - dH[a]) * f,
      w = W[a] + (W[b] - W[a]) * f;
    for (let k = 0; k < 3; k++)
      col[k] = COL[3 * ja + k] + (COL[3 * jb + k] - COL[3 * ja + k]) * f;
    const gx = rg[3 * r],
      gy = rg[3 * r + 1],
      gz = rg[3 * r + 2],
      sx = gx + ox,
      sy = gy + oy,
      sz = gz + oz; // geocentric; in the scene
    const tau0 = isHead
      ? 0
      : lerp(TAU0) * (w0 / w) * Math.exp(-age / lerp(LIFE));
    // the smoke shows beyond the bright flame (from a third of its length, fully past it); with the engines off, the trail's
    // end thins out over its width
    const fade =
      Lm > 0
        ? smoothstep((dHr - 0.3 * Lm) / (0.8 * Lm))
        : smoothstep(dHr / (0.6 * w));
    // the ribbon's side: across the trail and across the line of sight. Seen end-on that side is ill-defined: it keeps
    // turning smoothly from the last one, and the puffs take over from the ribbon there (as they do high up, where the
    // exhaust spreads into a wide, thin cloud)
    const rp = Math.max(r - 1, 0),
      rq = Math.min(r + 1, nr - 1);
    const tx = rg[3 * rq] - rg[3 * rp],
      ty = rg[3 * rq + 1] - rg[3 * rp + 1],
      tz = rg[3 * rq + 2] - rg[3 * rp + 2],
      cx = cam.x - sx,
      cy = cam.y - sy,
      cz = cam.z - sz;
    let vx = ty * cz - tz * cy,
      vy = tz * cx - tx * cz,
      vz = tx * cy - ty * cx;
    const sl = Math.hypot(vx, vy, vz),
      D = Math.hypot(cx, cy, cz),
      sn = sl / Math.max(Math.hypot(tx, ty, tz) * D, 1e-30);
    if (sl > 1e-15) {
      vx /= sl;
      vy /= sl;
      vz /= sl;
    } else if (hasPs) {
      vx = px0;
      vy = py0;
      vz = pz0;
    } else {
      const q = vperp([cx, cy, cz]);
      vx = q[0];
      vy = q[1];
      vz = q[2];
    }
    if (hasPs) {
      if (vx * px0 + vy * py0 + vz * pz0 < 0) {
        vx = -vx;
        vy = -vy;
        vz = -vz;
      }
      const wgt = clamp(sn / 0.25, 0, 1);
      if (wgt < 1) {
        vx = px0 * (1 - wgt) + vx * wgt;
        vy = py0 * (1 - wgt) + vy * wgt;
        vz = pz0 * (1 - wgt) + vz * wgt;
        const d = (vx * cx + vy * cy + vz * cz) / Math.max(D * D, 1e-30);
        vx -= cx * d;
        vy -= cy * d;
        vz -= cz * d;
        const l = Math.hypot(vx, vy, vz);
        if (l > 1e-12) {
          vx /= l;
          vy /= l;
          vz /= l;
        } else {
          vx = px0;
          vy = py0;
          vz = pz0;
        }
      }
    }
    px0 = vx;
    py0 = vy;
    pz0 = vz;
    hasPs = true;
    // the ribbon's share: high up, seen end-on or from close by (a camera beside the column would see the ribbon twist round
    // it) the puffs draw the smoke instead
    const fr =
      (1 -
        smoothstep(
          (lerp(H) - EXH_PUFF_H[0]) / (EXH_PUFF_H[1] - EXH_PUFF_H[0]),
        )) *
      (pf
        ? smoothstep((sn - 0.05) / 0.12) *
          smoothstep(((D * 1000) / w - 0.6) / 0.8)
        : 1);
    // seen at an angle to its axis the line of sight crosses more of the column: thicker by 1 / sin of that angle
    const tau = tau0 / Math.max(sn, 0.17);
    const Lt = exhSunlight(gx, gy, gz, sd),
      rgl = Math.hypot(gx, gy, gz),
      hv = rgl - R0,
      mu = (gx * sd[0] + gy * sd[1] + gz * sd[2]) / rgl;
    const dayV =
        smoothstep((mu + 0.1) / 0.3) * (1 - 0.7 * smoothstep((hv - 15) / 50)),
      amb = 0.42 * dayV + (fill ? 0.035 : 0.012);
    const fire =
      lum > 0 ? (0.7 * lum) / (1 + Math.pow(dHr / (0.45 * Lm), 2)) : 0; // the flame lighting the smoke near it
    const h1 = Math.min(hc, hv),
      h2 = Math.max(hc, hv),
      air =
        h2 - h1 > 0.05
          ? (EXH_H * (Math.exp(-h1 / EXH_H) - Math.exp(-h2 / EXH_H))) /
            (h2 - h1)
          : Math.exp(-h1 / EXH_H);
    const fog = 1 - Math.exp((-D * Math.max(air, 0)) / 80); // haze between the camera and the smoke
    const hw = w * 0.000625,
      lod = Math.max(Math.log2(w / w0), 0),
      uu = lerp(U); // km: half its width, with a quarter more for the billows
    for (let s = 0; s < 2; s++) {
      const q = 2 * nv + s,
        sg = s ? hw : -hw;
      pos[3 * q] = sx + vx * sg;
      pos[3 * q + 1] = sy + vy * sg;
      pos[3 * q + 2] = sz + vz * sg;
      uv[3 * q] = uu;
      uv[3 * q + 1] = s ? 1.25 : -1.25;
      uv[3 * q + 2] = lod;
      ta[q] = tau * fr;
      fo[q] = fog;
      fa[q] = fade;
      si[3 * q] = vx;
      si[3 * q + 1] = vy;
      si[3 * q + 2] = vz;
      for (let k = 0; k < 3; k++) {
        su[3 * q + k] = col[k] * sun[k] * Lt[k];
        am[3 * q + k] = col[k] * (amb * EXH_TINT[k] + fire * EXH_FIRE[k]);
      }
    }
    nv++;
    // a puff gathers the trail since the last one (out to a third of its width or so) into a ball as wide as the trail: the
    // same smoke, so seen from the side the puffs add up to the column, and seen end-on they add up along it
    if (pf && r > 0) pAcc += (dPrev - dHr) * (1 - fr);
    dPrev = dHr;
    if (
      pf &&
      !isHead &&
      pAcc > 0 &&
      (pAcc >= 0.33 * w || r >= nr - 2) &&
      np < cap
    ) {
      const rq2 = 0.000667 * w,
        tp = ((1.5 * tau0 * pAcc) / w) * smoothstep((D / rq2 - 1.2) / 1.5);
      pAcc = 0; // its half-size (km); τ through its middle, gone once the camera is in it
      const PP = PG.position.array;
      for (let k = 0; k < 4; k++) {
        const q = 4 * np + k,
          ex = k === 1 || k === 2 ? rq2 : -rq2,
          ey = k >= 2 ? rq2 : -rq2;
        PP[3 * q] = sx + crR.x * ex + crU.x * ey;
        PP[3 * q + 1] = sy + crR.y * ex + crU.y * ey;
        PP[3 * q + 2] = sz + crR.z * ex + crU.z * ey;
        PG.aUV.array[3 * q + 2] = (7 * a + Math.round(7 * f)) % 97;
        PG.aTau.array[q] = tp;
        PG.aFog.array[q] = fog;
        PG.aFade.array[q] = fade;
        for (let c = 0; c < 3; c++) {
          PG.aSun.array[3 * q + c] = col[c] * sun[c] * Lt[c];
          PG.aAmb.array[3 * q + c] =
            col[c] * (amb * EXH_TINT[c] + fire * EXH_FIRE[c]);
        }
      }
      np++;
    }
  }
  const upload = (A, nVert) => {
    for (const k in A) {
      const at = A[k];
      at.clearUpdateRanges();
      at.addUpdateRange(0, nVert * at.itemSize);
      at.needsUpdate = true;
    }
  }; // only the part in use
  upload(G, 2 * nv);
  mesh.geometry.setDrawRange(0, 6 * (nv - 1));
  mesh.visible = nv > 1;
  if (pf) {
    upload(PG, 4 * np);
    pf.geometry.setDrawRange(0, 6 * np);
    pf.visible = np > 0;
  }
}

// ==== 48_padcloud.js
// ============================================================================
// The cloud of a launch: what the exhaust does when it hits the pad. The engines' blast goes down the flame trench and
// out of both ends as a horizontal jet of fire that turns, within seconds, into rolling clouds of smoke and steam hundreds
// of metres across, lit orange from inside while the engines are still near and white in the sunlight as they rise and
// spread; round the launch mount the deluge water boils into white steam. Solid boosters make a dense white cloud of
// aluminium oxide, kerosene engines a browner, sootier one, hydrogen engines mostly steam.
// Drawn as puffs (camera-facing quads shaded as billowing balls of smoke, app/47_exhaust.js's shader) fixed to the pad, so
// the cloud stays where it was made as Earth turns. Each puff is a parcel let out of the trench at its own moment: it
// shoots out, slows, rises as the hot gas is buoyant, grows as it mixes with the air and thins out, and fades in a few
// minutes. The parcels follow each other, so the cloud is a continuous rolling mass rather than separate balls.
// ============================================================================

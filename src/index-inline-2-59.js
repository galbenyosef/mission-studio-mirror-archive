// index-inline-2 59 — math
// Lines 16567-16911 of readable/index-inline-2.pretty.js (statement-aligned).
function buildBuildings(id, grp, T, md) {
  const F = SITE_FEATURES[id];
  if (!F) return;
  const { hAt, toLocal, at, Pc } = grp.userData;
  const put = (geo, m, order = 4) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = order;
    grp.add(mesh);
    return mesh;
  };
  // a block standing on the ground: its corners draped on the sphere, its walls vertical in the local frame; each face
  // mapped to its band of the building's facade (facadeTex)
  const block = (B) => {
    const [cx, cy] = toLocal(B.lat, B.lon),
      hd = (B.hdg || 0) * DEG,
      ce = Math.cos(hd),
      sn = Math.sin(hd);
    const corner = (u, v) => [cx + u * ce + v * sn, cy - u * sn + v * ce]; // u east, v north before the rotation
    const base =
      Math.min(
        ...[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([u, v]) => {
          const [x, y] = corner((u * B.w) / 2, (v * B.d) / 2);
          return hAt(x, y);
        }),
      ) - 0.5;
    const pos = [],
      idx = [],
      uv = [];
    const face = (pts, uvs) => {
      const n0 = pos.length / 3;
      pts.forEach(([x, y, h], k) => {
        const p = at(x, y, h);
        pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
        uv.push(uvs[k][0], uvs[k][1]);
      });
      idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
    };
    const C4 = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([u, v]) => corner((u * B.w) / 2, (v * B.d) / 2));
    face(
      C4.map(([x, y]) => [x, y, base + B.h]),
      [
        [0, 0.8],
        [1, 0.8],
        [1, 1],
        [0, 1],
      ],
    ); // the roof: the top band
    for (let i = 0; i < 4; i++) {
      const a = C4[i],
        b = C4[(i + 1) % 4],
        v0 = 1 - (2 + i) / 5,
        v1 = 1 - (1 + i) / 5;
      face(
        [
          [a[0], a[1], base],
          [b[0], b[1], base],
          [b[0], b[1], base + B.h],
          [a[0], a[1], base + B.h],
        ],
        [
          [0, v0],
          [1, v0],
          [1, v1],
          [0, v1],
        ],
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return put(g, terrainMat({ map: facadeTex(B) }));
  };
  for (const B of F.buildings || []) block(B);
  // the flagpoles: a pole, and the flag as a strip of cloth streaming downwind (the launch's wind, app/47_exhaust.js), waved
  // by the shader (terrainMat's wave)
  if (F.flags && F.flags.length) {
    let seed = 0;
    for (const ch of md.cfg.launch + md.cfg.site)
      seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const [we, wn] = exhWind(seed)(0.05),
      wl = Math.hypot(we, wn) || 1,
      de = we / wl,
      dn = wn / wl;
    const fm = terrainMat({ map: flagTex(), wave: 0.35 }),
      pm = terrainMat({ color: "#d9dbde" });
    for (const Fl of F.flags) {
      const [x, y] = toLocal(Fl.lat, Fl.lon),
        h0 = hAt(x, y),
        r = 0.12;
      const pos = [],
        idx = [],
        uv = [],
        n = 8;
      for (let i = 0; i <= n; i++) {
        const a = (i * TAU) / n;
        const p0 = at(x + Math.cos(a) * r, y + Math.sin(a) * r, h0),
          p1 = at(x + Math.cos(a) * r, y + Math.sin(a) * r, h0 + Fl.h);
        pos.push(
          p0[0] - Pc[0],
          p0[1] - Pc[1],
          p0[2] - Pc[2],
          p1[0] - Pc[0],
          p1[1] - Pc[1],
          p1[2] - Pc[2],
        );
        if (i < n) {
          const b = 2 * i;
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      pg.setIndex(idx);
      pg.computeVertexNormals();
      put(pg, pm);
      const fp = [],
        fi = [],
        fu = [],
        nx = 12,
        ny = 6;
      for (let j = 0; j <= ny; j++)
        for (let i = 0; i <= nx; i++) {
          const u = i / nx,
            v = j / ny;
          const p = at(
            x + de * u * Fl.w + r,
            y + dn * u * Fl.w,
            h0 + Fl.h - 0.3 - Fl.d * (1 - v),
          );
          fp.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
          fu.push(u, v);
          if (i < nx && j < ny) {
            const a = j * (nx + 1) + i;
            fi.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
          }
        }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
      fg.setAttribute("uv", new THREE.Float32BufferAttribute(fu, 2));
      fg.setIndex(fi);
      fg.computeVertexNormals();
      put(fg, fm, 5);
    }
  }
  // the crawlerway: two lanes of grey-brown rock
  const lanes = (route, w, gap, c) => {
    if (!route) return;
    const P = route.map(([la, lo]) => toLocal(la, lo)),
      pos = [],
      idx = [];
    let n = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, y0] = P[i],
        [x1, y1] = P[i + 1],
        dx = x1 - x0,
        dy = y1 - y0,
        ll = Math.hypot(dx, dy) || 1,
        nx = -dy / ll,
        ny = dx / ll,
        seg = Math.max(1, Math.ceil(ll / 120));
      for (const side of [-1, 1])
        for (let s = 0; s <= seg; s++) {
          const x = x0 + (dx * s) / seg,
            y = y0 + (dy * s) / seg,
            h = hAt(x, y) + 0.3,
            off = side * (gap / 2 + w / 2);
          for (const k of [-1, 1]) {
            const p = at(
              x + nx * (off + (k * w) / 2),
              y + ny * (off + (k * w) / 2),
              h,
            );
            pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
          }
          if (s) {
            const a = n - 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
          n += 2;
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    put(g, terrainMat({ color: c, offset: -2 }), 3);
  };
  lanes(F.crawlerway, 12, 15, "#b3aa97");
  lanes(F.crawlerwayB, 12, 15, "#b3aa97");
  // the other pads: a mound 13 m high with the hardstand on top (the mission's own pad is the real model, app/46_pads.js)
  for (const P of F.pads || []) {
    if (P.site === md.cfg.site) continue;
    const [cx, cy] = toLocal(P.lat, P.lon),
      h0 = hAt(cx, cy),
      pos = [],
      idx = [],
      NA = 48,
      rings = [
        [0, 12.8],
        [60, 12.8],
        [100, 0.5],
      ];
    for (const [r, h] of rings)
      for (let i = 0; i < NA; i++) {
        const a = (i * TAU) / NA;
        const p = at(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r, h0 + h);
        pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
      }
    for (let k = 0; k < rings.length - 1; k++)
      for (let i = 0; i < NA; i++) {
        const a = k * NA + i,
          b = k * NA + ((i + 1) % NA),
          c = a + NA,
          d = b + NA;
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    put(g, terrainMat({ color: "#6f7c57" }));
    const top = new THREE.CircleGeometry(1, NA);
    const tp = top.attributes.position;
    const arr = new Float32Array(tp.count * 3);
    for (let i = 0; i < tp.count; i++) {
      const p = at(cx + tp.getX(i) * 66, cy + tp.getY(i) * 60, h0 + 12.85);
      arr[3 * i] = p[0] - Pc[0];
      arr[3 * i + 1] = p[1] - Pc[1];
      arr[3 * i + 2] = p[2] - Pc[2];
    }
    top.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    top.computeVertexNormals();
    put(top, terrainMat({ color: "#aeaba3" }));
  }
  // runways not drawn by the Shuttle code: a plain concrete strip with a centreline
  for (const rw of F.runways || []) {
    if (
      md.cfg.runway === rw.key ||
      (md.cfg.runway &&
        RUNWAYS[md.cfg.runway] &&
        Math.abs(RUNWAYS[md.cfg.runway].lat - rw.lat) < 0.05 &&
        Math.abs(RUNWAYS[md.cfg.runway].lon - rw.lon) < 0.05)
    )
      continue;
    const [x0, y0] = toLocal(rw.lat, rw.lon),
      hd = rw.hdg * DEG,
      f = [Math.sin(hd), Math.cos(hd)],
      l = [Math.cos(hd), -Math.sin(hd)],
      pos = [],
      idx = [],
      nL = 48;
    for (let i = 0; i <= nL; i++) {
      const x = x0 + (f[0] * rw.len * i) / nL,
        y = y0 + (f[1] * rw.len * i) / nL,
        h = hAt(x, y) + 0.35;
      for (const j of [-1, 1]) {
        const p = at(
          x + (l[0] * j * rw.wid) / 2,
          y + (l[1] * j * rw.wid) / 2,
          h,
        );
        pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
      }
    }
    for (let i = 0; i < nL; i++) {
      const a = 2 * i;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    put(g, terrainMat({ color: "#6d6c69", offset: -2 }), 3);
  }
}

// ==== 45_rover.js
// ============================================================================
// Surface: craft standing exactly on the ground that is drawn (the flat facets of the
// high-resolution surface patch), contact shadows, and a rover that drives after landing
// (first drive as flown, then illustrative daily commutes) leaving wheel tracks.
// ============================================================================
const _qG = new THREE.Quaternion(),
  _vG = new THREE.Vector3(),
  _rayG = new THREE.Ray(),
  _ta = new THREE.Vector3(),
  _tb = new THREE.Vector3(),
  _tc = new THREE.Vector3(),
  _td = new THREE.Vector3(),
  _hitG = new THREE.Vector3();
// d: unit direction [x, y, z] in the planet mesh's own frame → point on the drawn ground (planet-radius units), or null outside the patches
function capHitLocal(body, d) {
  for (const ci of MV.capInfo) {
    if (ci.body !== body || !ci.mesh) continue;
    const C = ci.mesh.geometry.userData.center,
      G = ci.mesh.geometry.userData.grid;
    if (!G) continue;
    if (d[0] * C[0] + d[1] * C[1] + d[2] * C[2] < Math.cos(ci.ang * DEG))
      continue;
    let phi = Math.atan2(d[2], -d[0]);
    while (phi < G.phiStart) phi += TAU;
    while (phi >= G.phiStart + TAU) phi -= TAU;
    const fx = ((phi - G.phiStart) / G.phiLength) * G.seg,
      fy =
        ((Math.acos(clamp(d[1], -1, 1)) - G.thetaStart) / G.thetaLength) *
        G.seg;
    if (fx < 0 || fy < 0 || fx >= G.seg || fy >= G.seg) continue;
    const ix = Math.floor(fx),
      iy = Math.floor(fy),
      W = G.seg + 1,
      P = ci.mesh.geometry.attributes.position;
    _ta.fromBufferAttribute(P, iy * W + ix + 1);
    _tb.fromBufferAttribute(P, iy * W + ix);
    _tc.fromBufferAttribute(P, (iy + 1) * W + ix);
    _td.fromBufferAttribute(P, (iy + 1) * W + ix + 1);
    _rayG.origin.set(-C[0], -C[1], -C[2]);
    _rayG.direction.set(d[0], d[1], d[2]);
    if (
      _rayG.intersectTriangle(_ta, _tb, _td, false, _hitG) ||
      _rayG.intersectTriangle(_tb, _tc, _td, false, _hitG)
    )
      return [_hitG.x + C[0], _hitG.y + C[1], _hitG.z + C[2]];
  }
  return null;
}
const meshDir = (lat, lon) => {
  const cl = Math.cos(lat * DEG);
  return [
    cl * Math.cos(lon * DEG),
    Math.sin(lat * DEG),
    -cl * Math.sin(lon * DEG),
  ];
};

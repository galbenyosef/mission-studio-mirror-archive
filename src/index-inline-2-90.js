// index-inline-2 90 — input
// Lines 26168-26447 of readable/index-inline-2.pretty.js (statement-aligned).
function fieldEl(f) {
  const cfg = SETUP.cfg;
  const wrap = h("label", { class: "f" + (f.wide ? " wide" : "") });
  const lab = h(
    "span",
    null,
    f.label,
    f.unit ? h("em", null, ` (${f.unit})`) : null,
  );
  wrap.append(lab);
  let input;
  if (f.kind === "preset") {
    input = h(
      "select",
      null,
      h("option", { value: "" }, "Choose a known site…"),
      ...f.list.map((x, i) => h("option", { value: i }, x[0])),
    );
    const cur = gp(cfg, f.path);
    const idx = cur
      ? f.list.findIndex(
          (x) =>
            Math.abs(x[1] - cur.lat) < 0.01 && Math.abs(x[2] - cur.lon) < 0.01,
        )
      : -1;
    if (idx >= 0) input.value = idx;
    input.addEventListener("change", () => {
      if (input.value === "") return;
      const x = f.list[+input.value];
      const o = gp(SETUP.cfg, f.path) || {};
      o.lat = x[1];
      o.lon = x[2];
      o.name = x[0].replace(/\s*\(.*\)/, "");
      if (x[3] != null) o.elev = x[3];
      sp(SETUP.cfg, f.path, o);
      renderDetail();
      schedulePlan();
    });
    wrap.append(input);
    return wrap;
  }
  const val = f.kind === "calc" ? f.get(cfg) : gp(cfg, f.path);
  if (f.type === "select") {
    input = h(
      "select",
      null,
      ...f.options.map(([v, l]) => h("option", { value: v }, l)),
    );
    input.value = String(val);
  } else if (f.type === "datetime") {
    input = h("input", {
      type: "datetime-local",
      value: val ? isoLocalInput(isoToT(val)) : "",
      step: 60,
    });
  } else if (f.type === "number") {
    input = h("input", {
      type: "number",
      value: val ?? "",
      min: f.min,
      max: f.max,
      step: f.step || "any",
      inputmode: "decimal",
    });
  } else input = h("input", { type: "text", value: val ?? "" });
  const origV = f.kind === "calc" ? f.get(SETUP.orig) : gp(SETUP.orig, f.path);
  const mark = () => {
    const cur = f.kind === "calc" ? f.get(SETUP.cfg) : gp(SETUP.cfg, f.path);
    wrap.classList.toggle(
      "changed",
      JSON.stringify(cur) !== JSON.stringify(origV),
    );
  };
  input.addEventListener("change", () => {
    const old = f.kind === "calc" ? f.get(SETUP.cfg) : gp(SETUP.cfg, f.path);
    let v = input.value;
    if (f.type === "number" || f.kind === "calc") {
      v = parseFloat(v);
      if (!isFinite(v)) {
        input.value = old;
        return;
      }
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      input.value = v;
    }
    if (f.type === "datetime") {
      v = inputToIso(v);
      if (!v || !isFinite(isoToT(v))) {
        input.value = isoLocalInput(isoToT(old));
        return;
      }
    }
    if (f.parse) v = f.parse(v);
    if (f.kind === "calc") f.set(SETUP.cfg, v);
    else sp(SETUP.cfg, f.path, v);
    if (f.onSet) f.onSet(SETUP.cfg, v, old);
    mark();
    if (
      ["launcher", "crew", "payloadMass"].includes(f.path) ||
      /^scOverride/.test(f.path || "")
    ) {
      renderVehicleCard();
      renderScCard();
    }
    if (f.path === "launch" || /legs\.0\.t$/.test(f.path)) drawPorkchop();
    if ((f.path && f.path.startsWith("landMET")) || f.kind === "calc")
      renderDetailSoft();
    schedulePlan();
  });
  mark();
  wrap.append(input);
  return wrap;
}
function renderDetailSoft() {
  const y = $("#setup").scrollTop;
  renderDetail();
  $("#setup").scrollTop = y;
}
// ---------------- vehicle & spacecraft cards ----------------
function stackDeltaV(L, payload) {
  const st = L.stages;
  let m =
    payload +
    st.reduce((a, s) => a + s.dry + s.propMass, 0) +
    L.jettison.reduce((a, j) => a + j.mass, 0);
  let dv = 0,
    i = 0;
  const jet = L.jettison.reduce((a, j) => a + j.mass, 0);
  if (st[0].parallel) {
    const B = st[0],
      Cc = st[1];
    const FB = (B.thrustSL + B.thrustVac) / 2,
      FC = (Cc.thrustSL + Cc.thrustVac) / 2;
    const mdB = FB / (((B.ispSL + B.ispVac) / 2) * G0),
      mdC = FC / (((Cc.ispSL + Cc.ispVac) / 2) * G0);
    const tB = B.propMass / mdB;
    const coreUsed = Cc.ignition ? 0 : Math.min(Cc.propMass * 0.9, mdC * tB);
    const isp =
      (FB + (Cc.ignition ? 0 : FC)) / ((mdB + (Cc.ignition ? 0 : mdC)) * G0);
    const m1 = m - B.propMass - coreUsed;
    dv += isp * G0 * Math.log(m / m1);
    m = m1 - B.dry - jet;
    const rem = Cc.propMass - coreUsed;
    dv += Cc.ispVac * G0 * Math.log(m / (m - rem));
    m -= rem + Cc.dry;
    i = 2;
  }
  for (; i < st.length; i++) {
    const s = st[i];
    const isp = i === 0 ? (s.ispSL + s.ispVac) / 2 : s.ispVac;
    dv += isp * G0 * Math.log(m / (m - s.propMass));
    m -= s.propMass + s.dry;
    if (i === 0) m -= jet;
  }
  return dv / 1000;
}
const SHORT_NAMES = {
  shuttle: "Space Shuttle",
  saturnV: "Saturn V",
  sls1: "SLS Block 1",
  lm5: "Long March 5",
  atlasV541: "Atlas V 541",
  atlasAgena: "Atlas-Agena",
  falconHeavy: "Falcon Heavy",
  starship: "Starship",
  lvm3: "LVM3",
};
function shuttleSVG(L, cx, base, k, parts, variant) {
  const S = L.stages[0],
    E = L.stages[1],
    low = S.booster.y0 - S.eng.len; // the boosters' nozzles stand on the ground
  const Y = (yy) => base - (yy - low) * k,
    cone = (x0, y0, len, rb, rt, col, extra = "") =>
      `<path d="M${x0 - rb * k},${Y(y0)} L${x0 + rb * k},${Y(y0)} L${x0 + rt * k},${Y(y0 + len)} L${x0 - rt * k},${Y(y0 + len)}Z" fill="${col}" ${extra}/>`;
  for (const sgn of [-1, 1]) {
    const xb = cx + sgn * S.booster.offset * k;
    parts.push(cone(xb, low, S.eng.len, S.eng.r * 0.85, 0.5, "#4a4c50"));
    let yb = S.booster.y0;
    for (const [len, rb, rt, col] of S.geom) {
      parts.push(cone(xb, yb, len, rb, rt, col));
      yb += len;
    }
  }
  let ye = 0;
  for (const [len, rb, rt, col] of E.geom) {
    parts.push(
      cone(
        cx,
        ye,
        len,
        rb,
        rt,
        variant === "sts1" && col !== "#4a4a4a" ? "#e9e7e0" : col,
        'stroke="rgba(0,0,0,.25)" stroke-width=".4"',
      ),
    );
    ye += len;
  } // STS-1 and STS-2 flew painted tanks
  // the orbiter, seen from above its payload bay doors: fuselage, double-delta wings, OMS pods
  const oy = SH_STACK.orbY,
    pt = (x, yy) => `${cx + x * k},${Y(oy + yy)}`;
  parts.push(
    `<path d="M${pt(-11.95, 2.3)} L${pt(-4.9, 11.4)} L${pt(-2.6, 19.6)} L${pt(-2.62, 24)} L${pt(-2.2, 28.6)} Q${pt(-1.4, 32.4)} ${pt(0, 32.75)} Q${pt(1.4, 32.4)} ${pt(2.2, 28.6)} L${pt(2.62, 24)} L${pt(2.6, 19.6)} L${pt(4.9, 11.4)} L${pt(11.95, 2.3)} L${pt(11.9, 1)} L${pt(3.25, 0.5)} L${pt(3.25, -0.6)} L${pt(-3.25, -0.6)} L${pt(-3.25, 0.5)} L${pt(-11.9, 1)}Z" fill="#efede7" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>`,
  );
  parts.push(
    `<path d="M${pt(-2.3, 25.8)} L${pt(2.3, 25.8)} L${pt(1.8, 28.4)} L${pt(-1.8, 28.4)}Z" fill="#141517"/><path d="M${pt(-0.9, 31.3)} Q${pt(0, 32.9)} ${pt(0.9, 31.3)}Z" fill="#141517"/>`,
  );
  parts.push(
    `<line x1="${cx}" y1="${Y(oy + 5.6)}" x2="${cx}" y2="${Y(oy + 23.9)}" stroke="rgba(0,0,0,.3)" stroke-width=".6"/><path d="M${pt(-0.25, 5.8)} L${pt(0.25, 5.8)} L${pt(0.2, -4)} L${pt(-0.2, -4)}Z" fill="#9ea3a9"/>`,
  );
}
function launcherSVG(selKey, variant) {
  const keys = Object.keys(LAUNCHERS);
  const Hh = 300,
    base = 266,
    k = 225 / 125;
  let x = 30;
  const out = [];
  const grid = [0, 25, 50, 75, 100, 125];
  for (const key of keys) {
    const L = LAUNCHERS[key];
    const sel = key === selKey;
    const op = sel ? 1 : 0.38;
    const core = L.stages.filter((s) => !s.parallel);
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    const maxR = Math.max(
      ...L.stages.map((s) => Math.max(...s.geom.map((g) => g[1]))),
      bst ? bst.booster.offset + bst.geom[0][1] : 0,
    );
    const slot = Math.max(66, 2 * maxR * k + 18);
    const cx = x + slot / 2;
    let y = base;
    const parts = [];
    if (L.sideMount) {
      shuttleSVG(L, cx, base, k, parts, sel ? variant : null);
      out.push(
        `<g opacity="${op}" style="cursor:pointer" data-key="${key}"><rect x="${x}" y="0" width="${slot}" height="${Hh}" fill="transparent"/>${parts.join("")}<text x="${cx}" y="${base + 16}" fill="${sel ? "#ffb547" : "#8794a8"}" font-size="11" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="${sel ? 700 : 500}">${esc(SHORT_NAMES[key] || L.name)}</text><text x="${cx}" y="${base - L.height * k - 7}" fill="${sel ? "#ffb547" : "#56647a"}" font-size="10" text-anchor="middle" font-family="IBM Plex Mono, monospace">${L.height} m</text></g>`,
      );
      x += slot;
      continue;
    }
    if (bst) {
      const off = bst.booster.offset;
      for (const sgn of [-1, 1]) {
        let yb = base;
        for (const [len, rb, rt, col] of bst.geom) {
          parts.push(
            `<path d="M${cx + sgn * off * k - rb * k},${yb} L${cx + sgn * off * k + rb * k},${yb} L${cx + sgn * off * k + rt * k},${yb - len * k} L${cx + sgn * off * k - rt * k},${yb - len * k}Z" fill="${col}"/>`,
          );
          yb -= len * k;
        }
      }
    }
    for (const s of core)
      for (const [len, rb, rt, col] of s.geom) {
        parts.push(
          `<path d="M${cx - rb * k},${y} L${cx + rb * k},${y} L${cx + rt * k},${y - len * k} L${cx - rt * k},${y - len * k}Z" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width=".4"/>`,
        );
        y -= len * k;
      }
    const rest = L.height * k - (base - y);
    if (rest > 1) {
      const r =
        (L.payloadFairing
          ? L.payloadFairing.r
          : core[core.length - 1].geom.slice(-1)[0][2]) * k;
      parts.push(
        `<path d="M${cx - r},${y} L${cx + r},${y} L${cx + r},${y - rest * 0.45} Q${cx + r},${y - rest * 0.8} ${cx},${y - rest} Q${cx - r},${y - rest * 0.8} ${cx - r},${y - rest * 0.45}Z" fill="${L.payloadFairing ? L.payloadFairing.color : "#d9dde2"}"/>`,
      );
    }
    out.push(
      `<g opacity="${op}" style="cursor:pointer" data-key="${key}"><rect x="${x}" y="0" width="${slot}" height="${Hh}" fill="transparent"/>${parts.join("")}<text x="${cx}" y="${base + 16}" fill="${sel ? "#ffb547" : "#8794a8"}" font-size="11" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="${sel ? 700 : 500}">${esc(SHORT_NAMES[key] || L.name)}</text><text x="${cx}" y="${base - L.height * k - 7}" fill="${sel ? "#ffb547" : "#56647a"}" font-size="10" text-anchor="middle" font-family="IBM Plex Mono, monospace">${L.height} m</text></g>`,
    );
    x += slot;
  }
  const W = x + 10;
  const g = `<g stroke="#1c2738">${grid.map((m) => `<line x1="24" x2="${W - 4}" y1="${base - m * k}" y2="${base - m * k}"/><text x="2" y="${base - m * k + 3}" fill="#56647a" stroke="none" font-size="9" font-family="IBM Plex Mono, monospace">${m}</text>`).join("")}</g>`;
  return `<div class="scroll-x"><svg class="vehicle-svg" viewBox="0 0 ${W} ${Hh}" style="min-width:${Math.round(W * 0.82)}px" role="img" aria-label="Launch vehicles drawn to scale; heights in metres">${g}${out.join("")}</svg></div>`;
}

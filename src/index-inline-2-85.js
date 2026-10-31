// index-inline-2 85 — rsun
// Lines 24613-24623 of readable/index-inline-2.pretty.js (statement-aligned).
function regionText(rSun) {
  const a = PLANET_LIST.map((p) => [
    p,
    planetElemsAt(p === "earth" ? "emb" : p, MV.tNow).a,
  ]);
  if (rSun < a[0][1]) return "inside Mercury’s orbit";
  for (let i = 0; i + 1 < a.length; i++)
    if (rSun < a[i + 1][1])
      return `between the orbits of ${BODIES[a[i][0]].name} and ${BODIES[a[i + 1][0]].name}`;
  return "beyond Saturn’s orbit";
}

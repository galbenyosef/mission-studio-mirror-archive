// index-inline-1 46 — cfg
// Lines 16174-16183 of readable/index-inline-1.pretty.js (statement-aligned).
function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}
function planScenario(cfg, progress) {
  if ((cfg.profile || "") === "l2-halo") return planHalo(cfg, progress);
  if ((cfg.profile || "").startsWith("leo")) return planLEO(cfg, progress);
  if (cfg.dest === "moon" || (cfg.profile || "").startsWith("lunar"))
    return planLunar(cfg, progress);
  return planInterplanetary(cfg, progress);
}

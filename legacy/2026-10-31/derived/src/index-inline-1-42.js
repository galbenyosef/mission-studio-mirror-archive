// index-inline-1 42 — cfg
// Lines 14933-14941 of readable/index-inline-1.pretty.js (statement-aligned).
function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}
function planScenario(cfg, progress) {
  if ((cfg.profile || "").startsWith("leo")) return planLEO(cfg, progress);
  if (cfg.dest === "moon" || (cfg.profile || "").startsWith("lunar"))
    return planLunar(cfg, progress);
  return planInterplanetary(cfg, progress);
}

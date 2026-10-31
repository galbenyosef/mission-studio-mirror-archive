// index-inline-2 63 — cls
// Lines 18216-18221 of readable/index-inline-2.pretty.js (statement-aligned).
function setv(id, txt, cls) {
  const e = TELE.els[id];
  if (!e) return;
  if (e.textContent !== txt) e.textContent = txt;
  if (cls !== undefined) e.className = "v" + (cls ? " " + cls : "");
}

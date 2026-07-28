// Quest playtest tuning for the red damage strip.
// Gorilla locomotion keeps the rig origin near the floor, so the damage box is
// centered lower than the visible spikes while the artwork remains on top.

export function applyDamageStripTuning(documentLike = globalThis.document) {
  const hazard = documentLike?.getElementById?.("red-damage-strip");
  if (!hazard?.setAttribute || hazard.dataset?.damageTuned === "true") return false;
  if (hazard.dataset) hazard.dataset.damageTuned = "true";

  hazard.setAttribute("position", "0 0.45 3.8");
  hazard.setAttribute("damage-volume", "size", "3.5 1.2 0.9");

  const visual = hazard.querySelector?.("a-box");
  visual?.setAttribute?.("position", "0 0.57 0");
  hazard.querySelectorAll?.("a-cone").forEach((spike) => {
    const current = spike.getAttribute?.("position") || { x: 0, y: 0.24, z: 0 };
    const x = Number(current.x || 0);
    const z = Number(current.z || 0);
    spike.setAttribute("position", `${x.toFixed(2)} 0.81 ${z.toFixed(2)}`);
  });
  return true;
}

function applyWhenReady() {
  applyDamageStripTuning();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", applyWhenReady);
  document.addEventListener("DOMContentLoaded", applyWhenReady, { once: true });
  window.setTimeout(applyWhenReady, 100);
  window.setTimeout(applyWhenReady, 500);
}

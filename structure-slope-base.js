// Align the procedural stair-step slope with the one-meter KayKit platform top.

export function elevatedStepHeight(index, baseHeight = 1, risePerStep = 0.24) {
  const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
  return Math.max(0, Number(baseHeight) || 0) + (safeIndex + 1) * Math.max(0.05, Number(risePerStep) || 0.24);
}

export function applyStructureSlopeBase(documentLike = globalThis.document) {
  const steps = Array.from(documentLike?.querySelectorAll?.("[data-slope-step]") || []);
  if (!steps.length) return false;
  for (const step of steps) {
    const index = Math.max(0, Number(step.getAttribute?.("data-slope-step")) || 0);
    const height = elevatedStepHeight(index, 1, 0.24);
    const current = step.getAttribute?.("position") || { x: 0, y: 0, z: -23.05 - index * 0.72 };
    const x = Number(current.x || 0);
    const z = Number(current.z ?? (-23.05 - index * 0.72));
    step.setAttribute("height", String(height));
    step.setAttribute("position", `${x.toFixed(3)} ${(height * 0.5).toFixed(3)} ${z.toFixed(3)}`);

    const collider = documentLike.querySelector?.(`[data-structure-collider="slope-step-${index}"]`);
    if (collider) {
      collider.setAttribute("position", `${x.toFixed(3)} ${(height * 0.5).toFixed(3)} ${z.toFixed(3)}`);
      collider.setAttribute("locomotion-collider", `type: box; size: 2.700 ${height.toFixed(3)} 0.720`);
    }
  }
  return true;
}

function applyWhenReady() {
  applyStructureSlopeBase();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", applyWhenReady);
  document.addEventListener("DOMContentLoaded", applyWhenReady, { once: true });
  window.setTimeout(applyWhenReady, 120);
  window.setTimeout(applyWhenReady, 500);
}

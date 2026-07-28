// Small visual-alignment correction for the already validated moving-platform lab.
// KayKit platform edges are beveled, so the original exact 4x4 collision footprint
// appeared a few centimeters wider than the visible top. This trims only the outer
// edges; platform height, movement, carry, and route geometry remain unchanged.

const MAIN_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.5, -0.97], size: [3.92, 1, 1.94] }),
  Object.freeze({ position: [0, 0.5, 0.97], size: [3.92, 1, 1.94] })
]);
const SMALL_COLLIDERS = Object.freeze([
  Object.freeze({ position: [0, 0.325, -0.63], size: [2.54, 0.65, 1.26] }),
  Object.freeze({ position: [0, 0.325, 0.63], size: [2.54, 0.65, 1.26] })
]);

function vectorString(values) {
  return values.map((value) => Number(value).toFixed(3)).join(" ");
}

export function tuneMovingLabColliders(documentLike = globalThis.document) {
  if (!documentLike?.querySelectorAll) return 0;
  let changed = 0;

  documentLike.querySelectorAll("[data-course-piece]").forEach((piece) => {
    const colliders = Array.from(piece.querySelectorAll?.("[locomotion-collider]") || []);
    if (colliders.length !== 2) return;
    const definitions = piece.id === "side-shuttle" ? SMALL_COLLIDERS : MAIN_COLLIDERS;

    colliders.forEach((collider, index) => {
      const definition = definitions[index];
      if (!definition) return;
      collider.setAttribute("position", vectorString(definition.position));
      collider.setAttribute("locomotion-collider", `type: box; size: ${vectorString(definition.size)}`);
      changed += 1;
    });
  });

  return changed;
}

function applyTuning() {
  const changed = tuneMovingLabColliders();
  if (changed) {
    window.dispatchEvent(new CustomEvent("lab-collision-tuned", {
      detail: { colliderCount: changed, trimMeters: 0.08 }
    }));
  }
}

window.addEventListener("course-built", applyTuning);
if (window.funFunMechanicsLab) applyTuning();
else {
  document.addEventListener("DOMContentLoaded", applyTuning, { once: true });
  window.setTimeout(applyTuning, 100);
}

window.FUN_FUN_LAB_COLLISION_TUNING = Object.freeze({
  mainWidth: 3.92,
  mainDepth: 3.88,
  smallWidth: 2.54,
  smallDepth: 2.52
});

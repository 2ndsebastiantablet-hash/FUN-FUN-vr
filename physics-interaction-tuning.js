// Physical Quest tuning for the combined-weight challenge.
// The second plate is larger so the 2.5 kg orb and 7.5 kg block can rest beside
// each other while still requiring the full ten-kilogram combined weight.

export function tuneCombinedWeightPlate(documentLike = globalThis.document) {
  const plate = documentLike?.getElementById?.("weighted-plate-2");
  if (!plate?.setAttribute || plate.dataset?.combinedPlateTuned === "true") return false;
  if (plate.dataset) plate.dataset.combinedPlateTuned = "true";
  plate.setAttribute("width", "2.65");
  plate.setAttribute("depth", "1.85");
  plate.setAttribute(
    "weighted-pressure-plate",
    "door: #physics-door-2; targets: [data-physics-weight]; size: 2.65 0.45 1.85; minimumMass: 9.5; verticalTolerance: 1.25"
  );
  return true;
}

function apply() {
  tuneCombinedWeightPlate();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 160);
}

// Remove the temporary long cargo-corridor rails after course construction.
// Later relay and sequence rails remain. The cargo room must stay open laterally
// so players can reach moving, timed, and fragile side islands.

function numberAttribute(element, name) {
  const value = Number(element?.getAttribute?.(name));
  return Number.isFinite(value) ? value : 0;
}

export function openCargoSideRoutes(documentLike = globalThis.document) {
  const root = documentLike?.getElementById?.("course-root");
  if (!root) return 0;
  let removed = 0;
  for (const element of Array.from(root.children || [])) {
    if (String(element.tagName || "").toLowerCase() !== "a-box") continue;
    const position = element.getAttribute?.("position");
    const x = Number(position?.x);
    const z = Number(position?.z);
    const depth = numberAttribute(element, "depth");
    const width = numberAttribute(element, "width");
    if (Math.abs(Math.abs(x) - 1.94) > 0.03 || Math.abs(z + 12.9) > 0.08) continue;
    if (Math.abs(depth - 21.5) > 0.08 || Math.abs(width - 0.16) > 0.04) continue;
    element.remove();
    removed += 1;
  }
  const locomotion = documentLike?.getElementById?.("player-rig")?.components?.["gorilla-locomotion"];
  if (locomotion) locomotion.colliders = Array.from(documentLike.querySelectorAll("[locomotion-collider]"));
  return removed;
}

function apply() {
  openCargoSideRoutes();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 300);
  window.setTimeout(apply, 1000);
}

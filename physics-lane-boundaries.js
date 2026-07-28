// Five low solid boundaries keep the real rigid bodies inside their intended
// test platforms without directly clamping or scripting their movement.

export const PHYSICS_LANE_BOUNDARIES = Object.freeze([
  Object.freeze({ id: "ball-rail-left", position: [-1.82, 1.18, 3.8], size: [0.18, 0.36, 4.05], color: "#1E3A8A" }),
  Object.freeze({ id: "ball-rail-right", position: [1.82, 1.18, 3.8], size: [0.18, 0.36, 4.05], color: "#1E3A8A" }),
  Object.freeze({ id: "ball-rail-back", position: [0, 1.18, 5.76], size: [3.46, 0.36, 0.16], color: "#1E3A8A" }),
  Object.freeze({ id: "crate-stop-back", position: [0, 1.18, -2.82], size: [2.48, 0.36, 0.16], color: "#475569" }),
  Object.freeze({ id: "crate-stop-front", position: [0, 1.18, -6.38], size: [2.48, 0.36, 0.16], color: "#475569" })
]);

function addBoundary(root, definition) {
  if (document.getElementById(definition.id)) return;
  const box = document.createElement("a-box");
  box.id = definition.id;
  box.setAttribute("data-physics-lane-boundary", "true");
  box.setAttribute("data-structure-collider", definition.id);
  box.setAttribute("position", definition.position.join(" "));
  box.setAttribute("width", String(definition.size[0]));
  box.setAttribute("height", String(definition.size[1]));
  box.setAttribute("depth", String(definition.size[2]));
  box.setAttribute("material", `color: ${definition.color}; roughness: 0.8; metalness: 0.05`);
  box.setAttribute("locomotion-collider", `type: box; size: ${definition.size.join(" ")}`);
  box.setAttribute("static-body", "shape: box");
  root.appendChild(box);
}

export function installPhysicsLaneBoundaries(documentLike = globalThis.document) {
  const root = documentLike?.getElementById?.("course-root");
  if (!root) return 0;
  for (const definition of PHYSICS_LANE_BOUNDARIES) addBoundary(root, definition);
  const rig = documentLike.getElementById?.("player-rig");
  const locomotion = rig?.components?.["gorilla-locomotion"];
  if (locomotion) locomotion.colliders = Array.from(documentLike.querySelectorAll("[locomotion-collider]"));
  return PHYSICS_LANE_BOUNDARIES.length;
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", () => installPhysicsLaneBoundaries());
}

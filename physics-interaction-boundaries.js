// Two low end barriers complete the interaction lab's physical containment and
// prevent weighted objects from escaping beyond the start or finish.

function createBarrier(root, id, z) {
  if (!root || document.getElementById(id)) return null;
  const barrier = document.createElement("a-box");
  barrier.id = id;
  barrier.setAttribute("position", `0 1.28 ${z}`);
  barrier.setAttribute("width", "3.75");
  barrier.setAttribute("height", "0.55");
  barrier.setAttribute("depth", "0.18");
  barrier.setAttribute("material", "color: #475569; opacity: 0.9; transparent: true");
  barrier.setAttribute("locomotion-collider", "type: box; size: 3.75 0.55 0.18");
  barrier.setAttribute("static-body", "shape: box");
  root.appendChild(barrier);
  return barrier;
}

export function installInteractionBoundaries(documentLike = globalThis.document) {
  const root = documentLike?.getElementById?.("course-root");
  if (!root) return 0;
  let created = 0;
  if (createBarrier(root, "interaction-start-boundary", 10.05)) created += 1;
  if (createBarrier(root, "interaction-finish-boundary", -15.15)) created += 1;
  return created;
}

function install() {
  installInteractionBoundaries();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", install);
  document.addEventListener("DOMContentLoaded", install, { once: true });
  window.setTimeout(install, 120);
}

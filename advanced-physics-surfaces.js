// Adds invisible Cannon geometry to the final physics platforms. Gorilla locomotion
// and rigid bodies therefore share the same split platform boundaries.

function colliderSize(element) {
  const data = element?.components?.["locomotion-collider"]?.data?.size;
  if (data) return { x: Number(data.x), y: Number(data.y), z: Number(data.z) };
  const raw = String(element?.getAttribute?.("locomotion-collider") || "");
  const match = raw.match(/size:\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/i);
  return match ? { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) } : null;
}

export function installAdvancedPhysicsSurfaces(documentLike = globalThis.document) {
  const selectors = [
    "#advanced-physics-puzzle [data-advanced-collider]",
    "#advanced-physics-landing [data-advanced-collider]"
  ];
  const surfaces = Array.from(documentLike?.querySelectorAll?.(selectors.join(",")) || []);
  let installed = 0;
  for (const surface of surfaces) {
    if (surface.dataset?.advancedPhysicsSurface === "true") continue;
    const size = colliderSize(surface);
    if (!size || ![size.x, size.y, size.z].every(Number.isFinite)) continue;
    if (surface.dataset) surface.dataset.advancedPhysicsSurface = "true";
    surface.setAttribute("geometry", `primitive: box; width: ${size.x}; height: ${size.y}; depth: ${size.z}`);
    surface.setAttribute("material", "color: #FFFFFF; opacity: 0.001; transparent: true");
    surface.removeAttribute("static-body");
    surface.setAttribute("static-body", "shape: box");
    installed += 1;
  }
  return installed;
}

function install() {
  installAdvancedPhysicsSurfaces();
}

if (typeof window !== "undefined") {
  window.addEventListener("advanced-course-extended", install);
  window.setTimeout(install, 250);
  window.setTimeout(install, 700);
}

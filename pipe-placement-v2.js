// Raise the rotated KayKit pipe segments so the visible model and its hidden
// collision twin rest on the one-meter platform surface instead of being buried.

export function alignPipeSegments(documentLike = globalThis.document) {
  let adjusted = 0;
  for (let index = 1; index <= 3; index += 1) {
    const segment = documentLike?.getElementById?.(`pipe-segment-${index}`);
    if (!segment?.setAttribute) continue;
    const current = segment.getAttribute?.("position") || { x: 0, z: -13.95 - (index - 1) * 1.45 };
    const x = Number(current.x || 0);
    const z = Number(current.z ?? (-13.95 - (index - 1) * 1.45));
    segment.setAttribute("position", `${x.toFixed(3)} 2.350 ${z.toFixed(3)}`);
    adjusted += 1;
  }
  return adjusted;
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", () => alignPipeSegments());
}

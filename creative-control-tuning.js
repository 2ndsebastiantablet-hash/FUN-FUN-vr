// Quest tuning for puzzle-code and timed-relay controls.
// The Triple Lock remains a true floor-pad puzzle. Relay and sequence buttons are
// hand-operated controls with a tiny body-pressure radius so standing near them
// cannot repeatedly submit the same input after their visual reset.

export function tuneCreativeControls(documentLike = globalThis.document) {
  const controls = Array.from(documentLike?.querySelectorAll?.("[quest-switch]") || []);
  let tuned = 0;
  for (const control of controls) {
    const component = control.components?.["quest-switch"];
    if (!component || component.data.type !== "button") continue;
    component.data.pressureRadius = 0.03;
    if (control.id === "relay-button") control.object3D.position.x = 1.15;
    tuned += 1;
  }
  return tuned;
}

function apply() {
  tuneCreativeControls();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 250);
  window.setTimeout(apply, 900);
}

// Physical Quest tuning requested after the rotating-obstacle lab passed its first test.
// This layer intentionally turns the original waist-high sweepers into giant wall-blades
// and raises their knockback to an exaggerated map-ejection launch.

export const ROTATING_OVERDRIVE = Object.freeze({
  barLength: 12,
  barWidth: 0.72,
  barHeight: 10,
  centerY: 5,
  knockbackSpeed: 26,
  upwardSpeed: 10,
  hitCooldown: 1400
});

function setComponentValue(entity, property, value) {
  if (!entity?.setAttribute) return;
  entity.setAttribute("rotating-obstacle", property, value);
  const component = entity.components?.["rotating-obstacle"];
  if (component?.data) component.data[property] = value;
}

export function applyRotatingOverdrive(documentLike = globalThis.document) {
  if (!documentLike?.querySelectorAll) return 0;
  let changed = 0;

  documentLike.querySelectorAll("[rotating-obstacle]").forEach((rotator) => {
    if (rotator.dataset?.rotatingOverdrive === "true") return;
    if (rotator.dataset) rotator.dataset.rotatingOverdrive = "true";

    if (rotator.object3D?.position) rotator.object3D.position.y = ROTATING_OVERDRIVE.centerY;
    else rotator.setAttribute?.("position", `0 ${ROTATING_OVERDRIVE.centerY} 0`);

    setComponentValue(rotator, "barLength", ROTATING_OVERDRIVE.barLength);
    setComponentValue(rotator, "barWidth", ROTATING_OVERDRIVE.barWidth);
    setComponentValue(rotator, "barHeight", ROTATING_OVERDRIVE.barHeight);
    setComponentValue(rotator, "knockbackSpeed", ROTATING_OVERDRIVE.knockbackSpeed);
    setComponentValue(rotator, "upwardSpeed", ROTATING_OVERDRIVE.upwardSpeed);
    setComponentValue(rotator, "hitCooldown", ROTATING_OVERDRIVE.hitCooldown);

    rotator.querySelectorAll?.("[data-rotating-bar]").forEach((bar) => {
      bar.setAttribute("width", String(ROTATING_OVERDRIVE.barLength));
      bar.setAttribute("height", String(ROTATING_OVERDRIVE.barHeight));
      bar.setAttribute("depth", String(ROTATING_OVERDRIVE.barWidth));
      bar.setAttribute("material", "emissive: #991B1B; emissiveIntensity: 0.7; metalness: 0.2; roughness: 0.42");
    });

    const post = rotator.querySelector?.("a-cylinder");
    if (post) {
      post.setAttribute("position", "0 -4.15 0");
      post.setAttribute("height", "8.3");
      post.setAttribute("radius", "0.32");
    }

    const ring = rotator.querySelector?.("a-ring");
    if (ring) {
      ring.setAttribute("position", "0 -4.97 0");
      ring.setAttribute("radius-inner", "1.05");
      ring.setAttribute("radius-outer", "1.28");
    }

    const warning = documentLike.createElement?.("a-text");
    if (warning) {
      warning.setAttribute("value", "GIANT WALL — CONTACT EJECTS YOU");
      warning.setAttribute("position", "0 -3.55 0.55");
      warning.setAttribute("align", "center");
      warning.setAttribute("width", "5.5");
      warning.setAttribute("color", "#FFFFFF");
      warning.setAttribute("side", "double");
      rotator.appendChild(warning);
    }

    rotator.object3D?.updateMatrixWorld?.(true);
    changed += 1;
  });

  if (changed && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rotating-overdrive-ready", {
      detail: { obstacleCount: changed, ...ROTATING_OVERDRIVE }
    }));
  }
  return changed;
}

function applyWhenReady() {
  applyRotatingOverdrive();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", applyWhenReady);
  document.addEventListener("DOMContentLoaded", applyWhenReady, { once: true });
  window.setTimeout(applyWhenReady, 100);
  window.setTimeout(applyWhenReady, 400);
  window.FUN_FUN_ROTATING_OVERDRIVE = ROTATING_OVERDRIVE;
}

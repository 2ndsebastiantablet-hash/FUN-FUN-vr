// Physical Quest retuning for the rotating-obstacle lab.
// The original 12 m x 10 m wall-blades overlapped neighboring arenas. This
// version keeps them impossible to jump over or bypass on a 4 m platform while
// fitting cleanly inside the lab spacing. Extreme knockback remains intentional.

export const ROTATING_OVERDRIVE = Object.freeze({
  barLength: 6.2,
  barWidth: 0.58,
  barHeight: 5.6,
  centerY: 2.8,
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

function replaceLegacyInstructions(documentLike) {
  documentLike.querySelectorAll?.("a-text").forEach((text) => {
    const value = String(text.getAttribute?.("value") || "");
    if (value.includes("JUMP OR TIME THE SLOW SWEEPER") || value.includes("TIME THE GIANT WALL")) {
      text.setAttribute("value", "1. TIME THE WALL — TOO TALL TO JUMP");
    } else if (value.includes("CROSS THE TWIN SPINNER") || value.includes("TWIN-WALL OPENING")) {
      text.setAttribute("value", "2. WAIT FOR THE TWIN-WALL OPENING");
    } else if (value.includes("WATCH THE REVERSE SWEEPER") || value.includes("REVERSE GIANT WALL")) {
      text.setAttribute("value", "3. TIME THE REVERSE WALL");
    }
  });
}

export function applyRotatingOverdrive(documentLike = globalThis.document) {
  if (!documentLike?.querySelectorAll) return 0;
  let changed = 0;

  documentLike.querySelectorAll("[rotating-obstacle]").forEach((rotator) => {
    if (rotator.dataset?.rotatingOverdrive === "retuned-v2") return;
    if (rotator.dataset) rotator.dataset.rotatingOverdrive = "retuned-v2";

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
      post.setAttribute("position", "0 -1.95 0");
      post.setAttribute("height", "3.9");
      post.setAttribute("radius", "0.3");
    }

    const ring = rotator.querySelector?.("a-ring");
    if (ring) {
      ring.setAttribute("position", "0 -2.77 0");
      ring.setAttribute("radius-inner", "0.9");
      ring.setAttribute("radius-outer", "1.1");
    }

    let warning = rotator.querySelector?.("[data-overdrive-warning]");
    if (!warning) {
      warning = documentLike.createElement?.("a-text");
      if (warning) {
        warning.setAttribute("data-overdrive-warning", "true");
        warning.setAttribute("align", "center");
        warning.setAttribute("width", "5.2");
        warning.setAttribute("color", "#FFFFFF");
        warning.setAttribute("side", "double");
        rotator.appendChild(warning);
      }
    }
    if (warning) {
      warning.setAttribute("value", "ROTATING WALL — CONTACT EJECTS YOU");
      warning.setAttribute("position", "0 -1.65 0.42");
    }

    rotator.object3D?.updateMatrixWorld?.(true);
    changed += 1;
  });

  replaceLegacyInstructions(documentLike);

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

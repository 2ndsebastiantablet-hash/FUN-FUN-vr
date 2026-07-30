// Cargo-route rebuild for real puzzle spacing.
// Side islands are moved roughly twelve metres from the main route and enclosed
// in tall route corridors. Players must use the moving, timed, or fragile path;
// normal direct jumps and diagonal route-skipping no longer reach the cargo.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positionOf(element) {
  const value = element?.getAttribute?.("position") || element?.object3D?.position || {};
  return {
    x: finiteNumber(value.x),
    y: finiteNumber(value.y),
    z: finiteNumber(value.z)
  };
}

function numberAttribute(element, name) {
  const value = Number(element?.getAttribute?.(name));
  return Number.isFinite(value) ? value : 0;
}

function setPosition(element, x, y, z) {
  if (!element) return;
  element.setAttribute("position", `${x} ${y} ${z}`);
  if (element.object3D?.position) element.object3D.position.set(x, y, z);
  if (element.body?.position) {
    element.body.position.set(x, y, z);
    element.body.velocity?.set?.(0, 0, 0);
    element.body.angularVelocity?.set?.(0, 0, 0);
    element.body.aabbNeedsUpdate = true;
    element.body.wakeUp?.();
  }
  element.object3D?.updateMatrixWorld?.(true);
}

export function removeLegacyCargoRails(root) {
  if (!root) return 0;
  let removed = 0;
  for (const element of Array.from(root.children || [])) {
    if (String(element.tagName || "").toLowerCase() !== "a-box") continue;
    const p = positionOf(element);
    const depth = numberAttribute(element, "depth");
    const width = numberAttribute(element, "width");
    const oldCargoRail =
      Math.abs(Math.abs(p.x) - 1.94) < 0.04 &&
      Math.abs(p.z + 12.9) < 0.08 &&
      Math.abs(depth - 21.5) < 0.1 &&
      Math.abs(width - 0.16) < 0.04;
    if (!oldCargoRail) continue;
    element.remove();
    removed += 1;
  }
  return removed;
}

function createRouteStep(root, { id, x, z, type, phase = 0 }) {
  const step = document.createElement("a-entity");
  step.id = id;
  step.setAttribute("position", `${x} 0 ${z}`);

  const visual = document.createElement("a-box");
  visual.setAttribute("position", "0 0.5 0");
  visual.setAttribute("width", "1.72");
  visual.setAttribute("height", "1");
  visual.setAttribute("depth", "1.72");
  visual.setAttribute("color", type === "timed" ? "#06B6D4" : "#0EA5E9");
  step.appendChild(visual);

  const collider = document.createElement("a-entity");
  collider.setAttribute("position", "0 0.5 0");
  collider.setAttribute("locomotion-collider", "type: box; size: 1.64 1 1.64");
  step.appendChild(collider);

  const warning = document.createElement("a-ring");
  warning.setAttribute(type === "timed" ? "data-timed-warning" : "data-falling-warning", "true");
  warning.setAttribute("position", "0 1.025 0");
  warning.setAttribute("rotation", "-90 0 0");
  warning.setAttribute("radius-inner", "0.48");
  warning.setAttribute("radius-outer", "0.68");
  warning.setAttribute("color", type === "timed" ? "#F97316" : "#FACC15");
  warning.setAttribute("visible", "false");
  step.appendChild(warning);

  if (type === "timed") {
    const sample = document.getElementById("cargo-timed-step-0")?.components?.["timed-platform"]?.data;
    const solidDuration = sample?.solidDuration || 1500;
    const warningDuration = sample?.warningDuration || 340;
    const hiddenDuration = sample?.hiddenDuration || 900;
    step.setAttribute("timed-platform", `rig: #player-rig; solidDuration: ${solidDuration}; warningDuration: ${warningDuration}; hiddenDuration: ${hiddenDuration}; phase: ${phase}; startDelay: 600`);
  } else {
    const sample = document.getElementById("cargo-fragile-step-0")?.components?.["falling-platform"]?.data;
    step.setAttribute("falling-platform", `rig: #player-rig; warningDelay: ${sample?.warningDelay || 420}; fallDuration: ${sample?.fallDuration || 520}; resetDelay: ${sample?.resetDelay || 1800}; fallDistance: 10`);
  }
  root.appendChild(step);
  return step;
}

function createCorridorWall(root, id, x, z, width) {
  if (document.getElementById(id)) return;
  const wall = document.createElement("a-box");
  wall.id = id;
  wall.setAttribute("position", `${x} 4.25 ${z}`);
  wall.setAttribute("width", String(width));
  wall.setAttribute("height", "6.5");
  wall.setAttribute("depth", "0.18");
  wall.setAttribute("material", "color: #334155; opacity: 0.92; transparent: true; roughness: 0.85");
  wall.setAttribute("locomotion-collider", `type: box; size: ${width} 6.5 0.18`);
  wall.setAttribute("static-body", "shape: box");
  root.appendChild(wall);
}

function addRouteCorridor(root, route, side, z) {
  const centerX = side * 7.1;
  const width = 10.2;
  createCorridorWall(root, `${route}-corridor-wall-a`, centerX, z - 1.42, width);
  createCorridorWall(root, `${route}-corridor-wall-b`, centerX, z + 1.42, width);
}

function findRouteCargo(originalZ) {
  return Array.from(document.querySelectorAll("[data-cargo-weight]")).find((element) => {
    const p = positionOf(element);
    return Math.abs(p.z - originalZ) < 0.35 && Math.abs(p.x) > 1;
  });
}

function moveRouteLabel(keyword, x, z) {
  for (const text of Array.from(document.querySelectorAll("a-text"))) {
    const value = String(text.getAttribute("value") || "");
    if (!value.includes(keyword)) continue;
    const sign = text.parentElement;
    if (sign?.tagName?.toLowerCase() === "a-plane") setPosition(sign, x, 3.2, z - 1.72);
  }
}

function tuneMovingRoute(root) {
  const island = document.getElementById("cargo-moving-island");
  const shuttle = document.getElementById("cargo-moving-shuttle");
  if (!island || !shuttle) return false;
  const side = Math.sign(positionOf(island).x) || 1;
  const z = -13;
  const islandX = side * 12;
  setPosition(island, islandX, 0, z);
  setPosition(shuttle, side * 3.15, 0, z);
  const moving = shuttle.components?.["moving-platform"];
  if (moving) {
    moving.basePosition.set(side * 3.15, 0, z);
    moving.data.axis.x = side;
    moving.data.axis.y = 0;
    moving.data.axis.z = 0;
    moving.data.distance = 8.85;
    moving.resetMotion?.();
  }
  const cargo = findRouteCargo(-13);
  if (cargo) setPosition(cargo, islandX, 1.45, z);
  moveRouteLabel("MOVING ROUTE", islandX, z);
  addRouteCorridor(root, "moving-route", side, z);
  return true;
}

function tuneSteppedRoute(root, type, originalZ) {
  const island = document.getElementById(`cargo-${type}-island`);
  if (!island) return false;
  const side = Math.sign(positionOf(island).x) || 1;
  const z = originalZ;
  const islandX = side * 12;
  setPosition(island, islandX, 0, z);

  const positions = [3.1, 6.0, 8.9].map((value) => side * value);
  for (let index = 0; index < 2; index += 1) {
    const step = document.getElementById(`cargo-${type}-step-${index}`);
    if (!step) continue;
    setPosition(step, positions[index], 0, z);
    const falling = step.components?.["falling-platform"];
    if (falling) {
      falling.basePosition.set(positions[index], 0, z);
      falling.resetPlatform?.(false);
    }
  }
  createRouteStep(root, {
    id: `cargo-${type}-step-2-v2`,
    x: positions[2],
    z,
    type,
    phase: 0.78
  });

  const cargo = findRouteCargo(originalZ);
  if (cargo) setPosition(cargo, islandX, 1.45, z);
  moveRouteLabel(`${type.toUpperCase()} ROUTE`, islandX, z);
  addRouteCorridor(root, `${type}-route`, side, z);
  return true;
}

export function applyCreativeRouteV2(documentLike = globalThis.document) {
  const root = documentLike?.getElementById?.("course-root");
  if (!root || root.dataset?.creativeRouteV2 === "true") return false;
  root.dataset.creativeRouteV2 = "true";
  removeLegacyCargoRails(root);
  tuneMovingRoute(root);
  tuneSteppedRoute(root, "timed", -17.2);
  tuneSteppedRoute(root, "fragile", -21.4);
  const locomotion = documentLike.getElementById("player-rig")?.components?.["gorilla-locomotion"];
  if (locomotion) locomotion.colliders = Array.from(documentLike.querySelectorAll("[locomotion-collider]"));
  return true;
}

function apply() {
  applyCreativeRouteV2();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 400);
  window.setTimeout(apply, 1100);
}

// Visual clarity upgrade for the creative puzzle course.
// Removes floating activation spheres, labels the actual controls, rebuilds the
// final sequence as three large color-matched buttons, and adds a visible relay timer.

const COLORS = Object.freeze({
  amber: "#F59E0B",
  cyan: "#06B6D4",
  violet: "#A855F7"
});

function createEntity(tag = "a-entity") {
  return document.createElement(tag);
}

function addText(parent, { value, position = "0 0 0.01", color = "#0F172A", width = 5, align = "center", wrap = 36 }) {
  const text = createEntity("a-text");
  text.setAttribute("position", position);
  text.setAttribute("value", value);
  text.setAttribute("color", color);
  text.setAttribute("width", String(width));
  text.setAttribute("align", align);
  text.setAttribute("wrap-count", String(wrap));
  parent.appendChild(text);
  return text;
}

function removeFloatingIndicators(documentLike) {
  let removed = 0;
  for (const indicator of Array.from(documentLike.querySelectorAll("[data-switch-indicator]"))) {
    indicator.remove();
    removed += 1;
  }
  return removed;
}

function createControlLabel(root, holder, label, color) {
  if (!holder || document.getElementById(`${holder.id}-label-v2`)) return;
  const p = holder.getAttribute("position") || { x: 0, y: 0, z: 0 };
  const panel = createEntity("a-plane");
  panel.id = `${holder.id}-label-v2`;
  panel.setAttribute("position", `${p.x} 2.82 ${p.z - 0.78}`);
  panel.setAttribute("width", "2.25");
  panel.setAttribute("height", "0.72");
  panel.setAttribute("color", color);
  panel.setAttribute("material", `color: ${color}; emissive: ${color}; emissiveIntensity: 0.18; roughness: 0.65`);
  addText(panel, { value: label, color: "#FFFFFF", width: 2.0, wrap: 20 });
  root.appendChild(panel);
}

function rebuildAsLargeButton(holder, color) {
  if (!holder) return;
  while (holder.firstChild) holder.removeChild(holder.firstChild);

  const base = createEntity("a-cylinder");
  base.setAttribute("radius", "0.58");
  base.setAttribute("height", "0.18");
  base.setAttribute("color", "#1E293B");
  holder.appendChild(base);

  const press = createEntity("a-cylinder");
  press.setAttribute("data-switch-press", "true");
  press.setAttribute("data-inactive-color", color);
  press.dataset.inactiveColor = color;
  press.setAttribute("position", "0 0.17 0");
  press.setAttribute("radius", "0.44");
  press.setAttribute("height", "0.2");
  press.setAttribute("color", color);
  press.setAttribute("material", `color: ${color}; emissive: ${color}; emissiveIntensity: 0.15; roughness: 0.55`);
  holder.appendChild(press);

  const switchComponent = holder.components?.["quest-switch"];
  if (switchComponent) {
    switchComponent.data.type = "button";
    switchComponent.pressVisual = press;
    switchComponent.leverHandle = null;
    switchComponent.renderState?.();
  }
  const physical = holder.components?.["physical-puzzle-input-v2"];
  if (physical) {
    physical.data.type = "button";
    physical.press = press;
    physical.handle = null;
    physical.knob = null;
    physical.previousInside?.clear?.();
  }
}

function createRelayTimer(root) {
  if (document.getElementById("relay-timer-panel-v2")) return;
  const panel = createEntity();
  panel.id = "relay-timer-panel-v2";
  panel.setAttribute("position", "0 4.25 -34");
  panel.setAttribute("creative-relay-display-v2", "controller: #relay-controller");

  const back = createEntity("a-plane");
  back.setAttribute("width", "5.7");
  back.setAttribute("height", "1.75");
  back.setAttribute("color", "#F8FAFC");
  panel.appendChild(back);

  addText(panel, { value: "TIMED RELAY", position: "0 0.56 0.03", width: 5, wrap: 24 });
  const status = addText(panel, { value: "PRESS THE FIRST CONTROL", position: "0 0.18 0.03", color: "#334155", width: 5, wrap: 34 });
  status.setAttribute("data-relay-timer-status", "true");

  const track = createEntity("a-box");
  track.setAttribute("position", "0 -0.3 0.035");
  track.setAttribute("width", "4.5");
  track.setAttribute("height", "0.26");
  track.setAttribute("depth", "0.05");
  track.setAttribute("color", "#CBD5E1");
  panel.appendChild(track);

  const bar = createEntity("a-box");
  bar.setAttribute("data-relay-timer-bar", "true");
  bar.setAttribute("position", "0 -0.3 0.075");
  bar.setAttribute("width", "4.42");
  bar.setAttribute("height", "0.18");
  bar.setAttribute("depth", "0.06");
  bar.setAttribute("color", "#64748B");
  panel.appendChild(bar);

  const timer = addText(panel, { value: "READY", position: "0 -0.62 0.03", color: "#0F172A", width: 3.4, wrap: 18 });
  timer.setAttribute("data-relay-timer-text", "true");
  root.appendChild(panel);
}

function removeOldSequenceSign() {
  for (const text of Array.from(document.querySelectorAll("a-text"))) {
    if (!String(text.getAttribute("value") || "").includes("SEQUENCE CODE")) continue;
    const parent = text.parentElement;
    if (parent?.tagName?.toLowerCase() === "a-plane") parent.remove();
  }
}

function registerSequenceDisplay() {
  if (typeof window === "undefined" || !window.AFRAME) return;
  if (AFRAME.components["creative-sequence-display-v2"]) return;
  AFRAME.registerComponent("creative-sequence-display-v2", {
    schema: { controller: { type: "selector" } },
    init: function () {
      this.lights = Array.from(this.el.querySelectorAll("[data-sequence-progress]"));
      this.status = this.el.querySelector("[data-sequence-status]");
    },
    tick: function () {
      const controller = this.data.controller?.components?.["creative-sequence-controller-v2"];
      if (!controller) return;
      this.lights.forEach((light, index) => {
        const active = index < controller.progress;
        light.setAttribute("color", active ? "#22C55E" : "#64748B");
        light.setAttribute("material", `color: ${active ? "#22C55E" : "#64748B"}; emissive: ${active ? "#15803D" : "#000000"}; emissiveIntensity: ${active ? 0.65 : 0.05}`);
      });
      this.status?.setAttribute("value", controller.complete ? "VAULT UNLOCKED" : `CORRECT INPUTS: ${controller.progress} / ${controller.order.length}`);
      this.status?.setAttribute("color", controller.complete ? "#15803D" : "#334155");
    }
  });
}

function createSequenceBoard(root, order) {
  removeOldSequenceSign();
  const board = createEntity();
  board.id = "sequence-instruction-board-v2";
  board.setAttribute("position", "0 3.85 -46.72");
  board.setAttribute("creative-sequence-display-v2", "controller: #sequence-controller");

  const back = createEntity("a-plane");
  back.setAttribute("width", "7.4");
  back.setAttribute("height", "2.35");
  back.setAttribute("color", "#F8FAFC");
  board.appendChild(back);
  addText(board, { value: "COLOR CODE VAULT", position: "0 0.86 0.03", width: 6.2, wrap: 26 });
  addText(board, { value: "PRESS THE THREE LARGE COLOR BUTTONS IN THIS ORDER", position: "0 0.5 0.03", color: "#334155", width: 6.5, wrap: 46 });

  order.forEach((colorName, index) => {
    const card = createEntity("a-plane");
    card.setAttribute("position", `${-2.35 + index * 2.35} 0.02 0.04`);
    card.setAttribute("width", "1.95");
    card.setAttribute("height", "0.72");
    card.setAttribute("color", COLORS[colorName]);
    addText(card, { value: `${index + 1}. ${colorName.toUpperCase()}`, color: "#FFFFFF", width: 1.75, wrap: 18 });
    board.appendChild(card);

    const light = createEntity("a-sphere");
    light.setAttribute("data-sequence-progress", String(index));
    light.setAttribute("position", `${-0.54 + index * 0.54} -0.58 0.06`);
    light.setAttribute("radius", "0.13");
    light.setAttribute("color", "#64748B");
    board.appendChild(light);
  });
  const status = addText(board, { value: "CORRECT INPUTS: 0 / 3", position: "0 -0.9 0.03", color: "#334155", width: 4.5, wrap: 28 });
  status.setAttribute("data-sequence-status", "true");
  root.appendChild(board);
}

export function applyCreativeVisualV2(documentLike = globalThis.document) {
  const root = documentLike?.getElementById?.("course-root");
  if (!root || root.dataset?.creativeVisualV2 === "true") return false;
  root.dataset.creativeVisualV2 = "true";
  removeFloatingIndicators(documentLike);

  const relayButton = documentLike.getElementById("relay-button");
  const relayLever = documentLike.getElementById("relay-lever");
  createControlLabel(root, relayButton, "PRESS BUTTON", "#06B6D4");
  createControlLabel(root, relayLever, "PULL LEVER", "#F59E0B");
  createRelayTimer(root);

  for (const colorName of ["amber", "cyan", "violet"]) {
    const holder = documentLike.getElementById(`sequence-${colorName}`);
    rebuildAsLargeButton(holder, COLORS[colorName]);
    createControlLabel(root, holder, `${colorName.toUpperCase()} BUTTON`, COLORS[colorName]);
  }
  const order = documentLike.getElementById("sequence-controller")?.components?.["creative-sequence-controller-v2"]?.order || ["amber", "cyan", "violet"];
  createSequenceBoard(root, order);
  return true;
}

registerSequenceDisplay();

function apply() {
  applyCreativeVisualV2();
}

if (typeof window !== "undefined") {
  window.addEventListener("course-built", apply);
  document.addEventListener("DOMContentLoaded", apply, { once: true });
  window.setTimeout(apply, 480);
  window.setTimeout(apply, 1200);
}

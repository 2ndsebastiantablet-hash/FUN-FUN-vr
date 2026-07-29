import assert from "node:assert/strict";
import fs from "node:fs";
import {
  generateAdvancedExtensionPlan,
  normalizeAdvancedSeed,
  validateAdvancedExtensionPlan
} from "../advanced-integrated-modules.js";
import { installAdvancedPhysicsSurfaces } from "../advanced-physics-surfaces.js";

assert.equal(normalizeAdvancedSeed(" fun adv!* "), "FUNADV");
const first = generateAdvancedExtensionPlan("FUNADV01");
const again = generateAdvancedExtensionPlan("FUNADV01");
assert.deepEqual(first, again, "same advanced seed must reproduce exactly");
assert.equal(first.modules.length, 3);
assert.equal(first.order[2], "physics");
assert.equal(first.totalCheckpointCount, 8);
assert.equal(validateAdvancedExtensionPlan(first).valid, true);

const seenOrders = new Set();
for (let index = 0; index < 2000; index += 1) {
  const plan = generateAdvancedExtensionPlan(`ADV${index.toString(36).toUpperCase()}`);
  const validation = validateAdvancedExtensionPlan(plan);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.deepEqual(plan.modules.map((module) => module.id), plan.order);
  assert.equal(plan.order[2], "physics");
  assert.equal(plan.modules.find((module) => module.id === "bridge").count, 6);
  assert.equal(plan.modules.find((module) => module.id === "physics").blockMass, 7.5);
  seenOrders.add(plan.order.join(","));
}
assert.equal(seenOrders.has("hazard,bridge,physics"), true);
assert.equal(seenOrders.has("bridge,hazard,physics"), true);

function mockSurface() {
  const attributes = new Map([["locomotion-collider", "type: box; size: 3.92 1 1.94"], ["static-body", "shape: box"]]);
  return {
    dataset: {},
    components: {},
    getAttribute(name) { return attributes.get(name) || ""; },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    attributes
  };
}
const surfaces = [mockSurface(), mockSurface(), mockSurface(), mockSurface()];
const mockDocument = { querySelectorAll() { return surfaces; } };
assert.equal(installAdvancedPhysicsSurfaces(mockDocument), 4);
assert.equal(installAdvancedPhysicsSurfaces(mockDocument), 0, "physics surface install must be idempotent");
for (const surface of surfaces) {
  assert.match(surface.attributes.get("geometry"), /width: 3\.92; height: 1; depth: 1\.94/);
  assert.equal(surface.attributes.get("static-body"), "shape: box");
}

const html = fs.readFileSync("advanced-integrated-lab.html", "utf8");
const extension = fs.readFileSync("advanced-course-extension.js", "utf8");
const surfacesSource = fs.readFileSync("advanced-physics-surfaces.js", "utf8");
const labs = fs.readFileSync("labs.html", "utf8");
assert.match(html, /aframe-physics-system@v4\.2\.4/);
assert.match(html, /advanced-physics-surfaces\.js\?build=20260729-advanced-integrated-v1/);
assert.ok(html.indexOf("advanced-course-extension.js") < html.indexOf("integrated-procedural-lab.js"), "extension listener must load before the core builder");
assert.match(html, /solid-physics-hand="hand: left/);
assert.match(html, /solid-physics-hand="hand: right/);
assert.match(extension, /oldFinish\?\.remove\(\)/);
assert.match(extension, /damage-volume-v2/);
assert.match(extension, /explosive-launch-hazard-v2/);
assert.match(extension, /collapsing-bridge-piece/);
assert.match(extension, /weighted-pressure-plate/);
assert.match(extension, /physics-door/);
assert.match(extension, /advanced-checkpoint-trigger/);
assert.match(extension, /checkpoint \$1\/8/);
assert.match(extension, /hazard-player-reset/);
assert.match(extension, /advanced-weight-block/);
assert.match(surfacesSource, /static-body/);
assert.match(labs, /Advanced Integrated Course/);

console.log("Advanced integrated hazards, bridge, solid hands, weighted physics, deterministic seed, and shared-surface tests passed for 2,000 seeds.");

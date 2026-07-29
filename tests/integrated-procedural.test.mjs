import assert from "node:assert/strict";
import fs from "node:fs";
import {
  generateIntegratedPlan,
  validateIntegratedPlan,
  normalizeIntegratedSeed,
  INTEGRATED_MODULE_IDS
} from "../integrated-procedural-modules.js";

assert.equal(normalizeIntegratedSeed(" fun mix!! 01 "), "FUNMIX01");
assert.equal(INTEGRATED_MODULE_IDS.length, 5);

const first = generateIntegratedPlan("FUNMIX01");
const repeated = generateIntegratedPlan("FUNMIX01");
assert.deepEqual(first, repeated, "The same integrated seed must reproduce the exact plan");
assert.equal(validateIntegratedPlan(first).valid, true);
assert.equal(new Set(first.order).size, 5);
for (const required of ["moving", "fragile", "timed", "rotating", "switch"]) {
  assert.ok(first.order.includes(required), `Seed must include ${required}`);
}

const checksums = new Set();
const orders = new Set();
for (let index = 0; index < 2000; index += 1) {
  const plan = generateIntegratedPlan(`MIX${String(index).padStart(5, "0")}`);
  const validation = validateIntegratedPlan(plan);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  assert.equal(plan.modules.length, 5);
  assert.equal(new Set(plan.modules.map((module) => module.id)).size, 5);
  assert.equal(plan.checkpointCount, 5);
  checksums.add(plan.checksum);
  orders.add(plan.order.join(">"));
}
assert.ok(checksums.size > 1900, "Integrated seeds should generate distinct checksums");
assert.ok(orders.size >= 80, "The generator should exercise many of the 120 possible mechanic orders");

const source = fs.readFileSync("integrated-procedural-lab.js", "utf8");
const html = fs.readFileSync("integrated-lab.html", "utf8");
const labs = fs.readFileSync("labs.html", "utf8");
assert.match(source, /moving-platform/);
assert.match(source, /falling-platform/);
assert.match(source, /timed-platform/);
assert.match(source, /rotating-obstacle/);
assert.match(source, /quest-switch/);
assert.match(source, /quest-lever-gamepad-fallback/);
assert.match(source, /course-checkpoint-trigger/);
assert.match(source, /summary\.fragileCount !== 3/);
assert.match(source, /summary\.timedCount !== 3/);
assert.match(source, /summary\.switchCount !== 2/);
assert.match(source, /knockbackSpeed: 26/);
assert.match(source, /upwardSpeed: 10/);
assert.match(html, /integrated-procedural-lab\.js\?build=20260729-integrated-procedural-v1/);
assert.match(html, /Copy Course Link/);
assert.match(labs, /Integrated Procedural Course/);

console.log("Integrated procedural generator, all five mechanic modules, stable seeds, and Quest page tests passed.");

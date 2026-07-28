import assert from "node:assert/strict";
import fs from "node:fs";
import { ROTATING_OVERDRIVE, applyRotatingOverdrive } from "../rotating-overdrive.js";

assert.equal(ROTATING_OVERDRIVE.barLength, 12);
assert.equal(ROTATING_OVERDRIVE.barHeight, 10);
assert.ok(ROTATING_OVERDRIVE.knockbackSpeed >= 25, "knockback must be an exaggerated map-ejection launch");
assert.ok(ROTATING_OVERDRIVE.upwardSpeed >= 9, "launch should include a dramatic upward component");

const attributes = new Map();
const barAttributes = new Map();
const bar = { setAttribute(name, value) { barAttributes.set(name, value); } };
const post = { setAttribute() {} };
const ring = { setAttribute() {} };
const rotator = {
  dataset: {},
  components: { "rotating-obstacle": { data: {} } },
  object3D: { position: { y: 1.4 }, updateMatrixWorld() {} },
  setAttribute(name, property, value) { attributes.set(`${name}:${property}`, value); },
  querySelectorAll(selector) { return selector === "[data-rotating-bar]" ? [bar] : []; },
  querySelector(selector) { return selector === "a-cylinder" ? post : selector === "a-ring" ? ring : null; },
  appendChild() {}
};
const documentLike = {
  querySelectorAll(selector) { return selector === "[rotating-obstacle]" ? [rotator] : []; },
  createElement() { return { setAttribute() {} }; }
};

assert.equal(applyRotatingOverdrive(documentLike), 1);
assert.equal(rotator.object3D.position.y, 5);
assert.equal(attributes.get("rotating-obstacle:barLength"), 12);
assert.equal(attributes.get("rotating-obstacle:barHeight"), 10);
assert.equal(attributes.get("rotating-obstacle:knockbackSpeed"), 26);
assert.equal(barAttributes.get("width"), "12");
assert.equal(barAttributes.get("height"), "10");
assert.equal(applyRotatingOverdrive(documentLike), 0, "tuning should be idempotent");

const html = fs.readFileSync("rotating-lab.html", "utf8");
assert.match(html, /rotating-overdrive\.js/);
assert.match(html, /Falling Platform Lab/);
assert.match(html, /too tall to jump/i);

console.log("Giant rotating-wall dimensions, extreme knockback, and idempotent tuning tests passed.");

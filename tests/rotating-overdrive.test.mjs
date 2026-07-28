import assert from "node:assert/strict";
import fs from "node:fs";
import { ROTATING_OVERDRIVE, applyRotatingOverdrive } from "../rotating-overdrive.js";

assert.equal(ROTATING_OVERDRIVE.barLength, 6.2);
assert.equal(ROTATING_OVERDRIVE.barHeight, 5.6);
assert.equal(ROTATING_OVERDRIVE.centerY, 2.8);
assert.ok(ROTATING_OVERDRIVE.barLength < 7, "retuned walls must fit without overlapping neighboring arenas");
assert.ok(ROTATING_OVERDRIVE.barHeight > 5, "walls must remain too tall for practical jumping");
assert.ok(ROTATING_OVERDRIVE.knockbackSpeed >= 25, "knockback must remain an exaggerated map-ejection launch");
assert.ok(ROTATING_OVERDRIVE.upwardSpeed >= 9, "launch should retain a dramatic upward component");

// Rotating arenas are 8.4 m apart. Two wall radii must not overlap.
assert.ok(ROTATING_OVERDRIVE.barLength < 8.4, "neighboring rotating walls must not overlap");

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
  querySelector(selector) {
    if (selector === "a-cylinder") return post;
    if (selector === "a-ring") return ring;
    return null;
  },
  appendChild() {}
};
const documentLike = {
  querySelectorAll(selector) { return selector === "[rotating-obstacle]" ? [rotator] : []; },
  createElement() { return { setAttribute() {} }; }
};

assert.equal(applyRotatingOverdrive(documentLike), 1);
assert.equal(rotator.object3D.position.y, 2.8);
assert.equal(attributes.get("rotating-obstacle:barLength"), 6.2);
assert.equal(attributes.get("rotating-obstacle:barHeight"), 5.6);
assert.equal(attributes.get("rotating-obstacle:knockbackSpeed"), 26);
assert.equal(barAttributes.get("width"), "6.2");
assert.equal(barAttributes.get("height"), "5.6");
assert.equal(applyRotatingOverdrive(documentLike), 0, "retuned wall application should be idempotent");

const html = fs.readFileSync("rotating-lab.html", "utf8");
assert.match(html, /rotating-overdrive\.js/);
assert.match(html, /Falling Platform Lab/);
assert.match(html, /too tall to jump/i);

console.log("Retuned rotating-wall size, non-overlap, extreme knockback, and idempotent tuning tests passed.");

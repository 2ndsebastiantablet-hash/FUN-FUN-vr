import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FALLING_PLATFORM_TUNING,
  scaledFallingTimings,
  fallingPlatformPhase,
  sampleFallOffset,
  bodySupportedByFallingBox
} from "../falling-platform.js";

assert.equal(FALLING_PLATFORM_TUNING.warningScale, 0.48);
assert.equal(FALLING_PLATFORM_TUNING.fallScale, 0.55);

const fastTimings = scaledFallingTimings({ warningDelay: 700, fallDuration: 900, resetDelay: 2200 });
assert.equal(fastTimings.warningDelay, 336);
assert.ok(Math.abs(fastTimings.fallDuration - 495) < 1e-9);
assert.equal(fastTimings.resetDelay, 2200);
assert.ok(fastTimings.warningDelay < 400, "standard fragile platform warning should now be very short");
assert.ok(fastTimings.fallDuration < 500, "standard fragile platform should leave quickly");

const finalTimings = scaledFallingTimings({ warningDelay: 420, fallDuration: 720, resetDelay: 2800 });
assert.ok(finalTimings.warningDelay <= 202, "final fragile platform should demand an immediate reaction");
assert.ok(finalTimings.fallDuration <= 396, "final fragile platform should drop rapidly");

assert.equal(fallingPlatformPhase(0, 700, 900, 2200), "warning");
assert.equal(fallingPlatformPhase(699, 700, 900, 2200), "warning");
assert.equal(fallingPlatformPhase(700, 700, 900, 2200), "falling");
assert.equal(fallingPlatformPhase(1599, 700, 900, 2200), "falling");
assert.equal(fallingPlatformPhase(1600, 700, 900, 2200), "hidden");
assert.equal(fallingPlatformPhase(3800, 700, 900, 2200), "reset");

assert.equal(sampleFallOffset(0, 12, 1000), 0);
assert.equal(sampleFallOffset(1000, 12, 1000), 12);
assert.ok(sampleFallOffset(500, 12, 1000) < 6, "fall should accelerate instead of moving linearly");

assert.equal(bodySupportedByFallingBox({
  rigPosition: { x: 0, y: 0.12, z: 0 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.5, z: 0 },
  boxSize: { x: 3.92, y: 1, z: 3.88 }
}), true);

assert.equal(bodySupportedByFallingBox({
  rigPosition: { x: 3, y: 0.12, z: 0 },
  bodyHeight: 1.2,
  bodyRadius: 0.32,
  boxCenter: { x: 0, y: 0.5, z: 0 },
  boxSize: { x: 3.92, y: 1, z: 3.88 }
}), false);

const source = fs.readFileSync("falling-lab.js", "utf8");
const html = fs.readFileSync("falling-lab.html", "utf8");
assert.equal((source.match(/falling: \{/g) || []).length, 5, "lab should define five falling platform tests");
assert.match(source, /expectedColliderCount: 18/);
assert.match(source, /expectedFallingCount: 5/);
assert.match(source, /tutorial-faller/);
assert.match(source, /quick-faller/);
assert.match(source, /chain-faller-a/);
assert.match(source, /chain-faller-b/);
assert.match(source, /final-faller/);
assert.match(html, /falling-platform mechanics laboratory/i);
assert.match(html, /falling-lab\.js/);
assert.match(html, /Giant Rotating Wall Lab/);

console.log("Retuned falling-platform timing, accelerated drop, support detection, and lab structure tests passed.");

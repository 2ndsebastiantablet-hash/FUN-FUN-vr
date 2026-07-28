import assert from "node:assert/strict";
import fs from "node:fs";
import {
  horizontalDistanceSquared,
  gorillaFootPoint,
  pointInsideExactBox,
  bombProximityDetected
} from "../hazard-retune-v2.js";

assert.equal(horizontalDistanceSquared({ x: 0, z: 0 }, { x: 3, z: 4 }), 25);

const foot = gorillaFootPoint({
  object3D: { position: { x: 0.25, y: 0.12, z: 3.8 } },
  components: { "gorilla-locomotion": { data: { bodyHeight: 1.2, bodyRadius: 0.32 } } }
});
assert.ok(Math.abs(foot.y - 1) < 0.0001, "Gorilla foot point should align with the platform surface");
assert.equal(pointInsideExactBox(foot, { x: 0, y: 1.08, z: 3.8 }, { x: 3, y: 0.34, z: 0.48 }), true);
assert.equal(pointInsideExactBox({ x: 1.7, y: 1, z: 3.8 }, { x: 0, y: 1.08, z: 3.8 }, { x: 3, y: 0.34, z: 0.48 }), false, "Spike width must not extend past the visible row");
assert.equal(pointInsideExactBox({ x: 0, y: 1, z: 4.2 }, { x: 0, y: 1.08, z: 3.8 }, { x: 3, y: 0.34, z: 0.48 }), false, "Spike depth must stay narrow");

assert.equal(bombProximityDetected({ player: { x: -1.5, y: 0.12, z: -4.6 }, bomb: { x: 1.05, y: 1.42, z: -4.6 }, radius: 2.75 }), true, "Bomb should arm before contact");
assert.equal(bombProximityDetected({ player: { x: -2.5, y: 0.12, z: -4.6 }, bomb: { x: 1.05, y: 1.42, z: -4.6 }, radius: 2.75 }), false);
assert.equal(bombProximityDetected({ player: { x: 1.05, y: 8, z: -4.6 }, bomb: { x: 1.05, y: 1.42, z: -4.6 }, radius: 2.75, maxVerticalDifference: 3 }), false);

const retune = fs.readFileSync("hazard-retune-v2.js", "utf8");
const html = fs.readFileSync("hazard-lab.html", "utf8");
assert.match(retune, /damage-volume-v2/);
assert.match(retune, /size: 3\.0 0\.34 0\.48/);
assert.match(retune, /triggerRadius: 2\.75/);
assert.match(retune, /data-bomb-detection/);
assert.match(retune, /Deliberately no hazard-bridge-start listener/);
assert.doesNotMatch(retune, /addEventListener\("hazard-bridge-start"/);
assert.match(html, /respawn-flash-v2/);
assert.match(html, /hazard-retune-v2\.js\?build=20260728-hazard-retune-v2/);
assert.doesNotMatch(html, /hazard-contact-adjust\.js/);

console.log("Retuned spike dimensions, bomb proximity arming, and non-blocking bridge feedback tests passed.");

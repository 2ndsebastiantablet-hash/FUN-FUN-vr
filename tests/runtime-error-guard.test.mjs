import assert from "node:assert/strict";
import { isOpaqueCrossOriginScriptError, installOpaqueScriptErrorGuard } from "../runtime-error-guard.js";

assert.equal(
  isOpaqueCrossOriginScriptError({ message: "Script error.", error: null, filename: "" }),
  true,
  "Quest's information-free Script error must be treated as opaque"
);

assert.equal(
  isOpaqueCrossOriginScriptError({ message: "script error", error: null, filename: "https://cdn.example/script.js" }),
  true,
  "an opaque cross-origin filename must not turn the event into a fatal local error"
);

assert.equal(
  isOpaqueCrossOriginScriptError({ message: "Script error.", error: new Error("real failure") }),
  false,
  "an attached Error object contains actionable information and must not be suppressed"
);

assert.equal(
  isOpaqueCrossOriginScriptError({ message: "ReferenceError: missingThing is not defined", error: null }),
  false,
  "real local runtime messages must continue to reach the fatal handler"
);

const listeners = [];
const fakeWindow = {
  addEventListener(type, listener, capture) {
    listeners.push({ type, listener, capture });
  }
};
assert.equal(installOpaqueScriptErrorGuard(fakeWindow), true);
assert.equal(installOpaqueScriptErrorGuard(fakeWindow), false, "guard installation must be idempotent");
assert.equal(listeners.length, 1);
assert.equal(listeners[0].type, "error");
assert.equal(listeners[0].capture, true);

let prevented = false;
let stopped = false;
listeners[0].listener({
  message: "Script error.",
  error: null,
  filename: "",
  preventDefault() { prevented = true; },
  stopImmediatePropagation() { stopped = true; }
});
assert.equal(prevented, true);
assert.equal(stopped, true);

prevented = false;
stopped = false;
listeners[0].listener({
  message: "TypeError: local failure",
  error: new TypeError("local failure"),
  preventDefault() { prevented = true; },
  stopImmediatePropagation() { stopped = true; }
});
assert.equal(prevented, false, "real errors must not be prevented");
assert.equal(stopped, false, "real errors must continue to later handlers");

console.log("Quest opaque script-error guard validated.");

// Pre-playtest safety and status helpers.
// The Gorilla Tag-style movement itself still comes from the exact pinned template.

const SPAWN = { x: 0, y: -0.68, z: 4 };
const DESKTOP_EYE_HEIGHT = 1.6;

function formatError(error) {
  if (!error) return "Unknown error";
  return error.message || String(error);
}

function registerPlaytestSafety() {
  if (!window.AFRAME || AFRAME.components["playtest-safety"]) return;

  AFRAME.registerComponent("playtest-safety", {
    schema: {
      maxDistance: { default: 16 },
      maxHeight: { default: 12 },
      minHeight: { default: -1.2 }
    },

    init: function () {
      this.lastCheck = 0;
      this.lastReset = 0;
      this.spawn = new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z);
      this.resetPlayer = this.resetPlayer.bind(this);
      this.onVisibilityChange = this.onVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    },

    remove: function () {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    },

    tick: function (time) {
      if (time - this.lastCheck < 250) return;
      this.lastCheck = time;
      const position = this.el.object3D.position;
      const invalid = !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z);
      const tooFar = Math.hypot(position.x, position.z - SPAWN.z) > this.data.maxDistance;
      const unsafeHeight = position.y > this.data.maxHeight || position.y < this.data.minHeight;
      if (invalid || tooFar || unsafeHeight) this.resetPlayer("Safety reset: player left the test area");
    },

    onVisibilityChange: function () {
      if (!document.hidden) this.resetMotionOnly();
    },

    resetMotionOnly: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion) return;
      locomotion.velocity.set(0, 0, 0);
      locomotion.launchVelocity.set(0, 0, 0);
      locomotion.pushHistory = [];
      locomotion.hasPreviousHands = false;
    },

    resetPlayer: function (message) {
      const currentTime = performance.now();
      if (currentTime - this.lastReset < 500) return;
      this.lastReset = currentTime;
      this.el.object3D.position.copy(this.spawn);

      const locomotion = this.el.components["gorilla-locomotion"];
      if (locomotion && typeof locomotion.resetTracking === "function") locomotion.resetTracking();
      window.dispatchEvent(new CustomEvent("playtest-reset", { detail: { message } }));
    }
  });
}

registerPlaytestSafety();

window.addEventListener("DOMContentLoaded", function () {
  const scene = document.querySelector("a-scene");
  const note = document.getElementById("note");

  if (!window.AFRAME) {
    if (note) {
      note.textContent = "A-Frame failed to load. Check the internet connection and refresh the page.";
      note.dataset.state = "error";
    }
    return;
  }

  const rig = document.getElementById("player-rig");
  const camera = document.getElementById("player-camera");
  const leftHand = document.getElementById("left-hand");
  const rightHand = document.getElementById("right-hand");
  const worldStatus = document.getElementById("world-status");
  if (!scene || !note || !rig || !camera || !leftHand || !rightHand || !worldStatus) return;

  let leftConnected = false;
  let rightConnected = false;
  let fatalError = false;

  function setNote(message, state) {
    note.textContent = message;
    note.dataset.state = state || "checking";
  }

  function setWorldStatus(message) {
    worldStatus.setAttribute("value", message);
  }

  function updateControllerStatus() {
    if (fatalError) return;
    if (leftConnected && rightConnected) setWorldStatus("Both controllers tracked - push the floor to move");
    else if (leftConnected || rightConnected) setWorldStatus("Waiting for the other controller");
    else if (scene.is("vr-mode")) setWorldStatus("Waiting for Quest controllers");
  }

  function showFatal(message) {
    fatalError = true;
    setNote(message, "error");
    setWorldStatus("SETUP ERROR - exit VR and refresh");
  }

  function resetPlayer(message) {
    const safety = rig.components["playtest-safety"];
    if (safety && typeof safety.resetPlayer === "function") safety.resetPlayer(message);
    else rig.object3D.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
  }

  leftHand.addEventListener("controllerconnected", function () {
    leftConnected = true;
    updateControllerStatus();
  });
  rightHand.addEventListener("controllerconnected", function () {
    rightConnected = true;
    updateControllerStatus();
  });
  leftHand.addEventListener("controllerdisconnected", function () {
    leftConnected = false;
    updateControllerStatus();
  });
  rightHand.addEventListener("controllerdisconnected", function () {
    rightConnected = false;
    updateControllerStatus();
  });

  async function runPreflight() {
    const problems = [];
    const colliders = scene.querySelectorAll("[locomotion-collider]");
    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) problems.push("the pinned locomotion script did not load");
    if (!AFRAME.components["locomotion-collider"]) problems.push("the locomotion collider component is missing");
    if (!rig.components["gorilla-locomotion"]) problems.push("the player rig did not initialize the locomotion component");
    if (colliders.length < 5) problems.push("the test area is missing collision surfaces");

    if (problems.length) {
      showFatal("Preflight failed: " + problems.join("; ") + ". Refresh the page while connected to the internet.");
      return;
    }

    rig.setAttribute("playtest-safety", "maxDistance: 16; maxHeight: 12; minHeight: -1.2");
    camera.setAttribute("position", `0 ${DESKTOP_EYE_HEIGHT - rig.object3D.position.y} 0`);

    if (!window.isSecureContext) {
      setNote("Scene loaded, but WebXR and multiplayer require HTTPS. Open the GitHub Pages address instead.", "warning");
      setWorldStatus("HTTPS is required for Enter VR");
      return;
    }

    if (!navigator.xr || typeof navigator.xr.isSessionSupported !== "function") {
      setNote("Desktop preview passed. Open this same HTTPS page in Meta Quest Browser to use Enter VR.", "ready");
      setWorldStatus("Desktop preview ready - use Quest Browser for VR");
      return;
    }

    try {
      const vrSupported = await navigator.xr.isSessionSupported("immersive-vr");
      if (vrSupported) {
        setNote("Preflight passed. Create or join a room before Enter VR, then wait for both hand spheres.", "ready");
        setWorldStatus("VR ready - press Enter VR");
      } else {
        setNote("Scene checks passed, but this browser reports no immersive VR support. Open it in Meta Quest Browser.", "warning");
        setWorldStatus("Use Meta Quest Browser for VR");
      }
    } catch (error) {
      setNote("Scene checks passed. WebXR support could not be queried: " + formatError(error), "warning");
      setWorldStatus("Scene ready - WebXR check unavailable");
    }
  }

  if (scene.hasLoaded) runPreflight();
  else scene.addEventListener("loaded", runPreflight, { once: true });

  scene.addEventListener("enter-vr", function () {
    camera.setAttribute("position", "0 0 0");
    leftConnected = false;
    rightConnected = false;
    setNote("VR active. Wait for both hands, then push the floor or blocks. Connected multiplayer avatars appear automatically.", "ready");
    setWorldStatus("Waiting for Quest controllers");

    const locomotion = rig.components["gorilla-locomotion"];
    if (locomotion) {
      const normalPushMultiplier = locomotion.data.handPushMultiplier;
      locomotion.data.handPushMultiplier = 0;
      locomotion.velocity.set(0, 0, 0);
      locomotion.launchVelocity.set(0, 0, 0);
      locomotion.pushHistory = [];
      locomotion.hasPreviousHands = false;
      window.setTimeout(function () {
        locomotion.data.handPushMultiplier = normalPushMultiplier;
        locomotion.velocity.set(0, 0, 0);
        locomotion.launchVelocity.set(0, 0, 0);
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
      }, 450);
    }
  });

  scene.addEventListener("exit-vr", function () {
    resetPlayer("VR session ended");
    camera.setAttribute("position", `0 ${DESKTOP_EYE_HEIGHT - rig.object3D.position.y} 0`);
    leftConnected = false;
    rightConnected = false;
    setNote("VR exited safely. The multiplayer room remains connected until you leave it.", "ready");
    setWorldStatus("VR ready - press Enter VR");
  });

  window.addEventListener("playtest-reset", function (event) {
    setWorldStatus(event.detail?.message || "Player reset to spawn");
  });

  function reportMultiplayerError(message) {
    const multiplayerStatus = document.getElementById("multiplayer-status");
    if (multiplayerStatus) {
      multiplayerStatus.textContent = message;
      multiplayerStatus.dataset.state = "error";
    }
  }

  window.addEventListener("error", function (event) {
    const source = String(event.filename || "");
    const message = formatError(event.error || event.message);
    const multiplayerRelated = /peerjs|multiplayer/i.test(source + " " + message);

    if (multiplayerRelated) {
      reportMultiplayerError("Multiplayer error: " + message + ". Single-player VR is still available.");
      return;
    }

    showFatal("Runtime error: " + message);
  });

  window.addEventListener("unhandledrejection", function (event) {
    const message = formatError(event.reason);
    const multiplayerRelated = /peer|webrtc|ice|network|multiplayer|data channel/i.test(message);

    if (multiplayerRelated) {
      reportMultiplayerError("Multiplayer error: " + message + ". Single-player VR is still available.");
      return;
    }

    showFatal("Runtime error: " + message);
  });
});

// Multiplayer hardening is separate so the original room implementation stays easy to audit.
import("./multiplayer-hardening.js").catch(function (error) {
  const status = document.getElementById("multiplayer-status");
  if (status) {
    status.textContent = "Multiplayer safety checks failed to load: " + formatError(error);
    status.dataset.state = "error";
  }
});

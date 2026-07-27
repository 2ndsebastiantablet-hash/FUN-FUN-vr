// VR lifecycle, safety, and platforming-course integration.
// Gorilla Tag-style movement still comes from the exact pinned template source.

const INITIAL_SPAWN = Object.freeze({ x: 0, y: 0.32, z: 8 });
const DESKTOP_EYE_HEIGHT = 1.6;
const DEFAULT_PLAYER_HEIGHT_OFFSET = 0.68;

function formatError(error) {
  if (!error) return "Unknown error";
  return error.message || String(error);
}

function registerPlaytestSafety() {
  if (!window.AFRAME || AFRAME.components["playtest-safety"]) return;

  AFRAME.registerComponent("playtest-safety", {
    schema: {
      minX: { default: -12 },
      maxX: { default: 12 },
      minZ: { default: -36 },
      maxZ: { default: 14 },
      maxHeight: { default: 18 },
      minHeight: { default: -6 }
    },

    init: function () {
      this.lastCheck = 0;
      this.lastReset = -Infinity;
      this.spawn = new THREE.Vector3(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
      this.resetPlayer = this.resetPlayer.bind(this);
      this.setSpawn = this.setSpawn.bind(this);
      this.onVisibilityChange = this.onVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.onVisibilityChange);
    },

    remove: function () {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
    },

    tick: function (time) {
      if (time - this.lastCheck < 180) return;
      this.lastCheck = time;

      const position = this.el.object3D.position;
      const invalid =
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        !Number.isFinite(position.z);
      const outsideCourse =
        position.x < this.data.minX ||
        position.x > this.data.maxX ||
        position.z < this.data.minZ ||
        position.z > this.data.maxZ;
      const unsafeHeight =
        position.y > this.data.maxHeight ||
        position.y < this.data.minHeight;

      if (invalid || outsideCourse || unsafeHeight) {
        this.resetPlayer("Fall reset — returned to the latest checkpoint");
      }
    },

    onVisibilityChange: function () {
      if (!document.hidden) this.resetMotionOnly();
    },

    setSpawn: function (position) {
      if (!position) return;
      const x = Number(position.x);
      const y = Number(position.y);
      const z = Number(position.z);
      if (![x, y, z].every(Number.isFinite)) return;
      this.spawn.set(x, y, z);
    },

    resetMotionOnly: function () {
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion) return;
      locomotion.velocity.set(0, 0, 0);
      locomotion.launchVelocity.set(0, 0, 0);
      locomotion.leftDelta.set(0, 0, 0);
      locomotion.rightDelta.set(0, 0, 0);
      locomotion.frameMovement.set(0, 0, 0);
      locomotion.pushHistory = [];
      locomotion.hasPreviousHands = false;
      locomotion.wasTouchingSurface = false;
      locomotion.wasTouchingFloor = false;
      locomotion.wasTwoHandTouchingFloor = false;
    },

    resetPlayer: function (message) {
      const currentTime = performance.now();
      if (currentTime - this.lastReset < 350) return;
      this.lastReset = currentTime;

      const locomotion = this.el.components["gorilla-locomotion"];
      if (locomotion && typeof locomotion.resetTracking === "function") {
        locomotion.resetTracking();
      }

      // The source locomotion reset uses its global floorHeight. Platforming keeps
      // that floor far below the course, so the checkpoint position must be applied
      // after resetTracking and before controller deltas resume.
      this.el.object3D.position.copy(this.spawn);
      this.resetMotionOnly();

      window.dispatchEvent(new CustomEvent("playtest-reset", {
        detail: {
          message: message || "Returned to checkpoint",
          spawn: { x: this.spawn.x, y: this.spawn.y, z: this.spawn.z }
        }
      }));
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

  rig.setAttribute(
    "playtest-safety",
    "minX: -12; maxX: 12; minZ: -36; maxZ: 14; maxHeight: 18; minHeight: -6"
  );

  let leftConnected = false;
  let rightConnected = false;
  let fatalError = false;

  function safetyComponent() {
    return rig.components["playtest-safety"];
  }

  function desktopCameraLocalY() {
    const locomotion = rig.components["gorilla-locomotion"];
    const offset = locomotion && Number.isFinite(locomotion.data.playerHeightOffset)
      ? locomotion.data.playerHeightOffset
      : DEFAULT_PLAYER_HEIGHT_OFFSET;
    return DESKTOP_EYE_HEIGHT + offset;
  }

  function setNote(message, state) {
    note.textContent = message;
    note.dataset.state = state || "checking";
  }

  function setWorldStatus(message) {
    worldStatus.setAttribute("value", message);
  }

  function updateControllerStatus() {
    if (fatalError) return;
    if (leftConnected && rightConnected) {
      setWorldStatus("Both controllers tracked — push platforms to move");
    } else if (leftConnected || rightConnected) {
      setWorldStatus("Waiting for the other controller");
    } else if (scene.is("vr-mode")) {
      setWorldStatus("Waiting for Quest controllers");
    }
  }

  function showFatal(message) {
    fatalError = true;
    setNote(message, "error");
    setWorldStatus("SETUP ERROR — exit VR and refresh");
  }

  function setCheckpoint(position) {
    const safety = safetyComponent();
    if (safety && typeof safety.setSpawn === "function") safety.setSpawn(position);
  }

  function resetPlayer(message) {
    const safety = safetyComponent();
    if (safety && typeof safety.resetPlayer === "function") {
      safety.resetPlayer(message);
    } else {
      rig.object3D.position.set(INITIAL_SPAWN.x, INITIAL_SPAWN.y, INITIAL_SPAWN.z);
    }
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
    const coursePieces = scene.querySelectorAll("[data-course-piece]");

    if (window.__LOCOMOTION_LOAD_FAILED__ || !AFRAME.components["gorilla-locomotion"]) {
      problems.push("the pinned locomotion script did not load");
    }

    if (!AFRAME.components["locomotion-collider"]) {
      problems.push("the locomotion collider component is missing");
    }

    if (!AFRAME.components["platformer-surface-extension"]) {
      problems.push("the platform-surface movement extension is missing");
    }

    if (!rig.components["gorilla-locomotion"]) {
      problems.push("the player rig did not initialize locomotion");
    }

    if (coursePieces.length < 10) {
      problems.push("the mechanics course did not finish building");
    }

    if (colliders.length < 18) {
      problems.push("the course is missing platform collision surfaces");
    }

    if (problems.length) {
      showFatal("Preflight failed: " + problems.join("; ") + ". Refresh while connected to the internet.");
      return;
    }

    const locomotion = rig.components["gorilla-locomotion"];
    if (locomotion) {
      locomotion.colliders = Array.from(colliders);
    }

    camera.setAttribute("position", `0 ${desktopCameraLocalY()} 0`);

    if (!window.isSecureContext) {
      setNote("Course loaded, but WebXR and multiplayer require HTTPS. Open the GitHub Pages address.", "warning");
      setWorldStatus("HTTPS is required for Enter VR");
      return;
    }

    if (!navigator.xr || typeof navigator.xr.isSessionSupported !== "function") {
      setNote("Desktop course checks passed. Open this HTTPS page in Meta Quest Browser for VR.", "ready");
      setWorldStatus("Desktop preview ready — use Quest Browser for VR");
      return;
    }

    try {
      const vrSupported = await navigator.xr.isSessionSupported("immersive-vr");
      if (vrSupported) {
        setNote("Preflight passed. Enter VR, wait for both hands, then cross the KayKit mechanics course.", "ready");
        setWorldStatus("Course ready — press Enter VR");
      } else {
        setNote("Course checks passed, but this browser reports no immersive VR support. Use Meta Quest Browser.", "warning");
        setWorldStatus("Use Meta Quest Browser for VR");
      }
    } catch (error) {
      setNote("Course checks passed. WebXR support could not be queried: " + formatError(error), "warning");
      setWorldStatus("Course ready — WebXR check unavailable");
    }
  }

  if (scene.hasLoaded) runPreflight();
  else scene.addEventListener("loaded", runPreflight, { once: true });

  scene.addEventListener("enter-vr", function () {
    camera.setAttribute("position", "0 0 0");
    leftConnected = false;
    rightConnected = false;
    setNote("VR active. Wait for both hands, then push against the KayKit platforms. Falling returns you to a checkpoint.", "ready");
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
        resetPlayer("Course position initialized");
        locomotion.data.handPushMultiplier = normalPushMultiplier;
      }, 500);
    } else {
      window.setTimeout(function () {
        resetPlayer("Course position initialized");
      }, 500);
    }
  });

  scene.addEventListener("exit-vr", function () {
    resetPlayer("VR session ended — returned to checkpoint");
    camera.setAttribute("position", `0 ${desktopCameraLocalY()} 0`);
    leftConnected = false;
    rightConnected = false;
    setNote("VR exited safely. The multiplayer room remains connected until you leave it.", "ready");
    setWorldStatus("Course ready — press Enter VR");
  });

  window.addEventListener("course-checkpoint", function (event) {
    const detail = event.detail || {};
    setCheckpoint(detail.spawn);
    setWorldStatus(`${detail.label || "Checkpoint"} reached`);
  });

  window.addEventListener("course-request-reset", function (event) {
    const detail = event.detail || {};
    setCheckpoint(detail.spawn || INITIAL_SPAWN);
    resetPlayer(detail.message || "Course restarted");
  });

  window.addEventListener("course-started", function () {
    setWorldStatus("Run active — reach the finish");
  });

  window.addEventListener("spring-launched", function () {
    setWorldStatus("Spring launch — land on the high platform");
  });

  window.addEventListener("course-finish", function () {
    setWorldStatus("COURSE COMPLETE");
    setNote("Mechanics course completed. Restart outside VR to run it again.", "ready");
  });

  window.addEventListener("playtest-reset", function (event) {
    setWorldStatus(event.detail?.message || "Returned to checkpoint");
  });

  window.addEventListener("course-asset-error", function (event) {
    const assetId = event.detail && event.detail.assetId ? event.detail.assetId : "unknown asset";
    setNote(`KayKit model ${assetId} failed to load. A collision-matched fallback is being used.`, "warning");
  });

  function reportMultiplayerError(message) {
    const multiplayerStatus = document.getElementById("multiplayer-status");
    if (multiplayerStatus) {
      multiplayerStatus.textContent = message;
      multiplayerStatus.dataset.state = "error";
    }
  }

  function reportCourseError(message) {
    const courseStatus = document.getElementById("course-status");
    if (courseStatus) {
      courseStatus.textContent = message;
      courseStatus.dataset.state = "error";
    }
  }

  window.addEventListener("error", function (event) {
    const source = String(event.filename || "");
    const message = formatError(event.error || event.message);
    const multiplayerRelated = /peerjs|multiplayer/i.test(source + " " + message);
    const courseRelated = /platformer-course|course-|gltf|kaykit/i.test(source + " " + message);

    if (multiplayerRelated) {
      reportMultiplayerError("Multiplayer error: " + message + ". Solo VR remains available.");
      return;
    }

    if (courseRelated) {
      reportCourseError("Course error: " + message);
      return;
    }

    showFatal("Runtime error: " + message);
  });

  window.addEventListener("unhandledrejection", function (event) {
    const message = formatError(event.reason);
    const multiplayerRelated = /peer|webrtc|ice|network|multiplayer|data channel/i.test(message);
    const courseRelated = /platform|course|gltf|kaykit|model/i.test(message);

    if (multiplayerRelated) {
      reportMultiplayerError("Multiplayer error: " + message + ". Solo VR remains available.");
      return;
    }

    if (courseRelated) {
      reportCourseError("Course error: " + message);
      return;
    }

    showFatal("Runtime error: " + message);
  });
});

// Multiplayer hardening remains separate so the room implementation stays easy to audit.
import("./multiplayer-hardening.js").catch(function (error) {
  const status = document.getElementById("multiplayer-status");
  if (status) {
    status.textContent = "Multiplayer safety checks failed to load: " + formatError(error);
    status.dataset.state = "error";
  }
});

(function () {
  "use strict";

  const PROTOCOL_VERSION = 1;
  const MAX_MESSAGE_CHARS = 8_192;
  const MAX_WORLD_COORDINATE = 100;
  const CONNECTION_TIMEOUT_MS = 12_000;
  const HEARTBEAT_INTERVAL_MS = 5_000;
  const PEER_STALE_MS = 22_000;
  const CONTROL_MESSAGE_TYPES = new Set([
    "welcome",
    "peer-joined",
    "peer-left",
    "reject",
    "room-closed"
  ]);
  const KNOWN_MESSAGE_TYPES = new Set([
    "hello",
    "welcome",
    "peer-joined",
    "peer-left",
    "reject",
    "room-closed",
    "pose",
    "health-ping",
    "health-pong"
  ]);

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return "";
    }
  }

  function validNumber(value, limit) {
    return Number.isFinite(value) && Math.abs(value) <= limit;
  }

  function validPosition(values) {
    return Array.isArray(values) &&
      values.length === 3 &&
      values.every(function (value) {
        return validNumber(value, MAX_WORLD_COORDINATE);
      });
  }

  function validQuaternion(values) {
    if (!Array.isArray(values) || values.length !== 4 || !values.every(Number.isFinite)) {
      return false;
    }

    const magnitude = Math.hypot(values[0], values[1], values[2], values[3]);
    return magnitude >= 0.5 && magnitude <= 1.5;
  }

  function validTransform(transform) {
    return Boolean(transform) && validPosition(transform.p) && validQuaternion(transform.q);
  }

  function validPoseMessage(data) {
    return Boolean(data) &&
      data.type === "pose" &&
      validTransform(data.head) &&
      validTransform(data.left) &&
      validTransform(data.right) &&
      (data.t === undefined || Number.isFinite(data.t));
  }

  function setStatus(multiplayer, message, state) {
    if (multiplayer && typeof multiplayer.setStatus === "function") {
      multiplayer.setStatus(message, state || "warning");
    }
  }

  function closeConnection(connection) {
    if (!connection) return;
    try {
      connection.close();
    } catch (_) {}
  }

  function installSoloTestButton(multiplayer) {
    const leaveButton = document.getElementById("leave-room");
    if (!leaveButton || document.getElementById("run-network-test")) return;

    const row = document.createElement("div");
    row.className = "multiplayer-row";

    const button = document.createElement("button");
    button.id = "run-network-test";
    button.className = "secondary";
    button.type = "button";
    button.textContent = "Run Solo Network Test";
    button.title = "Checks PeerJS signaling, a real WebRTC data channel, and remote-avatar rendering in this browser.";
    row.appendChild(button);

    leaveButton.closest(".multiplayer-row").insertAdjacentElement("afterend", row);
    button.addEventListener("click", function () {
      runSoloNetworkTest(multiplayer, button);
    });
  }

  function testAvatarRendering(multiplayer) {
    if (!multiplayer || typeof multiplayer.ensureAvatar !== "function") {
      throw new Error("Remote-avatar renderer is unavailable.");
    }

    const peerId = "self-test-avatar";
    const avatar = multiplayer.ensureAvatar(peerId, {
      name: "Network Test",
      color: "#34D399"
    });

    avatar.setPose({
      type: "pose",
      t: performance.now(),
      head: { p: [0, 1.65, 1.5], q: [0, 0, 0, 1] },
      left: { p: [-0.35, 1.2, 1.3], q: [0, 0, 0, 1] },
      right: { p: [0.35, 1.2, 1.3], q: [0, 0, 0, 1] }
    });

    if (!avatar.root || !avatar.head || !avatar.left || !avatar.right) {
      multiplayer.removeRemotePeer(peerId);
      throw new Error("Remote-avatar elements were not created correctly.");
    }

    avatar.label.setAttribute("side", "double");
    window.setTimeout(function () {
      multiplayer.removeRemotePeer(peerId);
    }, 1_500);
  }

  function waitForPeerOpen(peer, timeoutMs) {
    return new Promise(function (resolve, reject) {
      let settled = false;
      const timeout = window.setTimeout(function () {
        finish(new Error("PeerJS signaling timed out."));
      }, timeoutMs);

      function finish(error, value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (error) reject(error);
        else resolve(value);
      }

      peer.on("open", function (id) {
        finish(null, id);
      });
      peer.on("error", function (error) {
        finish(error || new Error("PeerJS signaling failed."));
      });
    });
  }

  async function runSoloNetworkTest(multiplayer, button) {
    if (!window.Peer || window.__PEERJS_LOAD_FAILED__) {
      setStatus(multiplayer, "Solo test failed: PeerJS is not loaded.", "error");
      return;
    }

    if (multiplayer.peer) {
      setStatus(multiplayer, "Leave the active room before running the solo network test.", "warning");
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Testing…";
    setStatus(multiplayer, "Solo test: checking remote-avatar rendering…", "connecting");

    let testHost = null;
    let testGuest = null;
    let hostConnection = null;
    let guestConnection = null;

    try {
      testAvatarRendering(multiplayer);

      const randomValues = new Uint32Array(2);
      crypto.getRandomValues(randomValues);
      const testHostId = "funfun-selftest-" +
        randomValues[0].toString(36) + randomValues[1].toString(36);
      const peerOptions = typeof multiplayer.peerOptions === "function"
        ? multiplayer.peerOptions()
        : { debug: 1 };

      setStatus(multiplayer, "Solo test: connecting two browser peers through PeerJS…", "connecting");
      testHost = new Peer(testHostId, peerOptions);
      testGuest = new Peer(undefined, peerOptions);
      await Promise.all([
        waitForPeerOpen(testHost, CONNECTION_TIMEOUT_MS),
        waitForPeerOpen(testGuest, CONNECTION_TIMEOUT_MS)
      ]);

      await new Promise(function (resolve, reject) {
        let settled = false;
        const timeout = window.setTimeout(function () {
          finish(new Error("The WebRTC data channel did not exchange a test packet in time."));
        }, CONNECTION_TIMEOUT_MS);

        function finish(error) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          if (error) reject(error);
          else resolve();
        }

        testHost.on("connection", function (connection) {
          hostConnection = connection;
          connection.on("data", function (data) {
            if (data && data.type === "diagnostic-ping" && data.nonce === testHostId) {
              connection.send({ type: "diagnostic-pong", nonce: data.nonce });
            }
          });
          connection.on("error", function (error) {
            finish(error || new Error("Host-side WebRTC connection failed."));
          });
        });

        guestConnection = testGuest.connect(testHostId, {
          serialization: "json",
          reliable: true
        });
        guestConnection.on("open", function () {
          guestConnection.send({ type: "diagnostic-ping", nonce: testHostId });
        });
        guestConnection.on("data", function (data) {
          if (data && data.type === "diagnostic-pong" && data.nonce === testHostId) {
            finish();
          }
        });
        guestConnection.on("error", function (error) {
          finish(error || new Error("Guest-side WebRTC connection failed."));
        });
        guestConnection.on("close", function () {
          if (!settled) finish(new Error("The test data channel closed before completing."));
        });
      });

      setStatus(
        multiplayer,
        "Solo network test passed: signaling, WebRTC data exchange, and avatar rendering worked in this browser.",
        "ready"
      );
    } catch (error) {
      setStatus(
        multiplayer,
        "Solo network test failed: " + (error && error.message ? error.message : String(error)),
        "error"
      );
    } finally {
      closeConnection(hostConnection);
      closeConnection(guestConnection);
      if (testHost) {
        try { testHost.destroy(); } catch (_) {}
      }
      if (testGuest) {
        try { testGuest.destroy(); } catch (_) {}
      }
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function patchMultiplayer(multiplayer) {
    if (!multiplayer || multiplayer.__hardeningInstalled) return;
    multiplayer.__hardeningInstalled = true;
    multiplayer.__peerLastSeen = new Map();

    const originalHandleMessage = multiplayer.handleMessage.bind(multiplayer);
    const originalPrepareConnection = multiplayer.prepareConnection.bind(multiplayer);
    const originalHandlePeerError = multiplayer.handlePeerError.bind(multiplayer);
    const originalRemoveRemotePeer = multiplayer.removeRemotePeer.bind(multiplayer);
    const originalLeaveRoom = multiplayer.leaveRoom.bind(multiplayer);
    const originalEnsureAvatar = multiplayer.ensureAvatar.bind(multiplayer);

    multiplayer.ensureAvatar = function (peerId, profile) {
      const avatar = originalEnsureAvatar(peerId, profile);
      if (avatar && avatar.label) avatar.label.setAttribute("side", "double");
      return avatar;
    };

    multiplayer.handleMessage = function (peerId, data) {
      const serialized = safeStringify(data);
      if (!serialized || serialized.length > MAX_MESSAGE_CHARS) {
        setStatus(this, "Ignored an invalid or oversized multiplayer message.", "warning");
        return;
      }

      if (!data || typeof data.type !== "string" || !KNOWN_MESSAGE_TYPES.has(data.type)) {
        return;
      }

      this.__peerLastSeen.set(peerId, performance.now());

      if (data.type === "health-ping") {
        const connection = this.connections.get(peerId);
        if (connection && connection.open) {
          try { connection.send({ type: "health-pong", t: data.t }); } catch (_) {}
        }
        return;
      }

      if (data.type === "health-pong") return;

      if (data.type === "hello" && data.version !== PROTOCOL_VERSION) {
        const connection = this.connections.get(peerId);
        if (connection && connection.open) {
          try { connection.send({ type: "reject", reason: "Multiplayer version mismatch" }); } catch (_) {}
        }
        closeConnection(connection);
        this.removeRemotePeer(peerId);
        setStatus(this, "A player was rejected because their multiplayer version is incompatible.", "warning");
        return;
      }

      if (CONTROL_MESSAGE_TYPES.has(data.type)) {
        if (this.isHost || peerId !== this.hostPeerId) {
          return;
        }
      }

      if (data.type === "pose" && !validPoseMessage(data)) {
        return;
      }

      originalHandleMessage(peerId, data);
    };

    multiplayer.prepareConnection = function (connection, initiatedByUs) {
      const peerId = connection && connection.peer;
      if (!peerId) {
        closeConnection(connection);
        return;
      }

      const existing = this.connections.get(peerId);
      if (existing && existing !== connection && existing.open) {
        closeConnection(connection);
        return;
      }
      if (existing && existing !== connection) {
        closeConnection(existing);
        this.connections.delete(peerId);
      }

      originalPrepareConnection(connection, initiatedByUs);
      const timeout = window.setTimeout(() => {
        if (connection.open || this.closing) return;
        closeConnection(connection);
        this.removeRemotePeer(peerId);
        if (!this.isHost && peerId === this.hostPeerId) {
          this.failAndReset("Joining room " + this.roomCode + " timed out. Check the code and network, then try again.");
        } else {
          setStatus(this, "A peer connection timed out and was removed.", "warning");
        }
      }, CONNECTION_TIMEOUT_MS);

      const clearTimeoutOnce = function () {
        window.clearTimeout(timeout);
      };
      connection.on("open", () => {
        clearTimeoutOnce();
        this.__peerLastSeen.set(peerId, performance.now());
      });
      connection.on("close", clearTimeoutOnce);
      connection.on("error", clearTimeoutOnce);
    };

    multiplayer.handlePeerError = function (error) {
      const type = error && error.type;
      const hasLivePeers = this.openConnectionCount() > 0;
      const recoverableSignalingError = new Set([
        "network",
        "server-error",
        "socket-error",
        "socket-closed",
        "disconnected"
      ]).has(type);

      if (hasLivePeers && recoverableSignalingError) {
        setStatus(this, "Signaling was interrupted, but existing player connections are still active.", "warning");
        if (this.peer && this.peer.disconnected && !this.peer.destroyed && typeof this.peer.reconnect === "function") {
          window.setTimeout(() => {
            try { this.peer.reconnect(); } catch (_) {}
          }, 1_500);
        }
        return;
      }

      if (type === "peer-unavailable" && hasLivePeers) {
        setStatus(this, "One mesh peer was unavailable; the rest of the room remains connected.", "warning");
        return;
      }

      originalHandlePeerError(error);
    };

    multiplayer.removeRemotePeer = function (peerId) {
      this.__peerLastSeen.delete(peerId);
      originalRemoveRemotePeer(peerId);
    };

    multiplayer.leaveRoom = function (message, silent) {
      this.__peerLastSeen.clear();
      originalLeaveRoom(message, silent);
    };

    multiplayer.__heartbeatTimer = window.setInterval(function () {
      if (!multiplayer.peer || multiplayer.closing) return;
      const currentTime = performance.now();
      const stalePeers = [];

      multiplayer.connections.forEach(function (connection, peerId) {
        if (!connection.open) return;
        const lastSeen = multiplayer.__peerLastSeen.get(peerId) || currentTime;
        if (currentTime - lastSeen > PEER_STALE_MS) {
          stalePeers.push(peerId);
          closeConnection(connection);
          return;
        }
        try { connection.send({ type: "health-ping", t: Math.round(currentTime) }); } catch (_) {}
      });

      stalePeers.forEach(function (peerId) {
        multiplayer.removeRemotePeer(peerId);
      });

      if (stalePeers.length) {
        if (!multiplayer.isHost && stalePeers.includes(multiplayer.hostPeerId)) {
          multiplayer.leaveRoom("Connection to the host timed out");
        } else {
          setStatus(multiplayer, "Removed an unresponsive player connection.", "warning");
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    installSoloTestButton(multiplayer);

    window.funFunMultiplayerDiagnostics = {
      protocolVersion: PROTOCOL_VERSION,
      validatePose: validPoseMessage,
      runSoloNetworkTest: function () {
        const button = document.getElementById("run-network-test");
        return runSoloNetworkTest(multiplayer, button || { disabled: false, textContent: "Run Solo Network Test" });
      }
    };
  }

  function waitForMultiplayer() {
    if (window.funFunMultiplayer) {
      patchMultiplayer(window.funFunMultiplayer);
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      if (window.funFunMultiplayer) {
        window.clearInterval(timer);
        patchMultiplayer(window.funFunMultiplayer);
      } else if (attempts >= 100) {
        window.clearInterval(timer);
        const status = document.getElementById("multiplayer-status");
        if (status) {
          status.textContent = "Multiplayer initialization did not complete. Refresh the page.";
          status.dataset.state = "error";
        }
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", waitForMultiplayer, { once: true });
  } else {
    waitForMultiplayer();
  }
}());

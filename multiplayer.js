(function () {
  "use strict";

  const ROOM_PREFIX = "funfun-vr-";
  const MAX_PLAYERS = 4;
  const SEND_INTERVAL_MS = 66;
  const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const AVATAR_COLORS = ["#38BDF8", "#F472B6", "#FACC15", "#34D399", "#A78BFA", "#FB7185"];

  const temp = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion()
  };

  function cleanName(value) {
    return String(value || "Player")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .slice(0, 18) || "Player";
  }

  function cleanRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  function randomRoomCode() {
    const values = new Uint32Array(6);
    crypto.getRandomValues(values);
    return Array.from(values, function (value) {
      return ROOM_ALPHABET[value % ROOM_ALPHABET.length];
    }).join("");
  }

  function colorForPeer(peerId) {
    let hash = 0;
    for (let index = 0; index < peerId.length; index += 1) {
      hash = ((hash << 5) - hash + peerId.charCodeAt(index)) | 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function round(value) {
    return Math.round(value * 1000) / 1000;
  }

  function readTransform(entity) {
    entity.object3D.updateMatrixWorld(true);
    entity.object3D.getWorldPosition(temp.position);
    entity.object3D.getWorldQuaternion(temp.quaternion);
    return {
      p: [round(temp.position.x), round(temp.position.y), round(temp.position.z)],
      q: [round(temp.quaternion.x), round(temp.quaternion.y), round(temp.quaternion.z), round(temp.quaternion.w)]
    };
  }

  function validVector(values, length) {
    return Array.isArray(values) && values.length === length && values.every(Number.isFinite);
  }

  function validPose(data) {
    return data &&
      data.type === "pose" &&
      data.head && validVector(data.head.p, 3) && validVector(data.head.q, 4) &&
      data.left && validVector(data.left.p, 3) && validVector(data.left.q, 4) &&
      data.right && validVector(data.right.p, 3) && validVector(data.right.q, 4);
  }

  class RemoteAvatar {
    constructor(container, peerId, profile) {
      this.peerId = peerId;
      this.name = cleanName(profile && profile.name);
      this.color = profile && /^#[0-9A-F]{6}$/i.test(profile.color || "")
        ? profile.color
        : colorForPeer(peerId);

      this.root = document.createElement("a-entity");
      this.root.setAttribute("data-peer-id", peerId);
      this.root.innerHTML = [
        '<a-sphere class="remote-head" radius="0.17"></a-sphere>',
        '<a-cylinder class="remote-body" radius="0.13" height="0.55"></a-cylinder>',
        '<a-sphere class="remote-left" radius="0.11"></a-sphere>',
        '<a-sphere class="remote-right" radius="0.11"></a-sphere>',
        '<a-text class="remote-name" align="center" width="2.4" color="#111827"></a-text>'
      ].join("");
      container.appendChild(this.root);

      this.head = this.root.querySelector(".remote-head");
      this.body = this.root.querySelector(".remote-body");
      this.left = this.root.querySelector(".remote-left");
      this.right = this.root.querySelector(".remote-right");
      this.label = this.root.querySelector(".remote-name");

      this.head.setAttribute("color", this.color);
      this.body.setAttribute("color", this.color);
      this.left.setAttribute("color", "#FF7AA2");
      this.right.setAttribute("color", "#6FC3FF");
      this.label.setAttribute("value", this.name);

      this.targets = {
        headPosition: new THREE.Vector3(),
        headQuaternion: new THREE.Quaternion(),
        leftPosition: new THREE.Vector3(),
        leftQuaternion: new THREE.Quaternion(),
        rightPosition: new THREE.Vector3(),
        rightQuaternion: new THREE.Quaternion()
      };
      this.hasPose = false;
    }

    updateProfile(profile) {
      if (!profile) return;
      this.name = cleanName(profile.name || this.name);
      this.label.setAttribute("value", this.name);
    }

    setPose(pose) {
      this.targets.headPosition.fromArray(pose.head.p);
      this.targets.headQuaternion.fromArray(pose.head.q).normalize();
      this.targets.leftPosition.fromArray(pose.left.p);
      this.targets.leftQuaternion.fromArray(pose.left.q).normalize();
      this.targets.rightPosition.fromArray(pose.right.p);
      this.targets.rightQuaternion.fromArray(pose.right.q).normalize();

      if (!this.hasPose) {
        this.snapToTargets();
        this.root.setAttribute("visible", true);
        this.hasPose = true;
      }
    }

    snapToTargets() {
      this.head.object3D.position.copy(this.targets.headPosition);
      this.head.object3D.quaternion.copy(this.targets.headQuaternion);
      this.left.object3D.position.copy(this.targets.leftPosition);
      this.left.object3D.quaternion.copy(this.targets.leftQuaternion);
      this.right.object3D.position.copy(this.targets.rightPosition);
      this.right.object3D.quaternion.copy(this.targets.rightQuaternion);
      this.updateBodyAndLabel();
    }

    tick() {
      if (!this.hasPose) return;
      const amount = 0.35;
      this.head.object3D.position.lerp(this.targets.headPosition, amount);
      this.head.object3D.quaternion.slerp(this.targets.headQuaternion, amount);
      this.left.object3D.position.lerp(this.targets.leftPosition, amount);
      this.left.object3D.quaternion.slerp(this.targets.leftQuaternion, amount);
      this.right.object3D.position.lerp(this.targets.rightPosition, amount);
      this.right.object3D.quaternion.slerp(this.targets.rightQuaternion, amount);
      this.updateBodyAndLabel();
    }

    updateBodyAndLabel() {
      const headPosition = this.head.object3D.position;
      this.body.object3D.position.set(headPosition.x, headPosition.y - 0.43, headPosition.z);
      this.label.object3D.position.set(headPosition.x, headPosition.y + 0.28, headPosition.z);
    }

    remove() {
      this.root.remove();
    }
  }

  class P2PMultiplayer {
    constructor() {
      this.scene = document.querySelector("a-scene");
      this.rig = document.getElementById("player-rig");
      this.head = document.getElementById("player-camera");
      this.leftHand = document.getElementById("left-hand");
      this.rightHand = document.getElementById("right-hand");
      this.remoteContainer = document.getElementById("remote-players");
      this.worldStatus = document.getElementById("network-status-world");

      this.ui = document.getElementById("multiplayer-ui");
      this.nameInput = document.getElementById("player-name");
      this.codeInput = document.getElementById("room-code");
      this.createButton = document.getElementById("create-room");
      this.joinButton = document.getElementById("join-room");
      this.leaveButton = document.getElementById("leave-room");
      this.copyButton = document.getElementById("copy-room");
      this.statusText = document.getElementById("multiplayer-status");
      this.playerCountText = document.getElementById("player-count");

      this.peer = null;
      this.peerId = "";
      this.roomCode = "";
      this.isHost = false;
      this.hostPeerId = "";
      this.connections = new Map();
      this.profiles = new Map();
      this.avatars = new Map();
      this.lastPoseSent = 0;
      this.frameHandle = 0;
      this.closing = false;

      this.onFrame = this.onFrame.bind(this);
    }

    start() {
      if (!this.scene || !this.rig || !this.head || !this.leftHand || !this.rightHand || !this.remoteContainer) {
        this.setStatus("Multiplayer scene wiring is incomplete.", "error");
        return;
      }

      if (!window.Peer || window.__PEERJS_LOAD_FAILED__) {
        this.setStatus("Peer-to-peer library failed to load. Refresh while connected to the internet.", "error");
        this.disableControls(true);
        return;
      }

      const storedName = localStorage.getItem("funfun-player-name");
      if (storedName) this.nameInput.value = cleanName(storedName);

      const hashMatch = location.hash.match(/room=([A-Z0-9]{1,6})/i);
      if (hashMatch) this.codeInput.value = cleanRoomCode(hashMatch[1]);

      this.createButton.addEventListener("click", () => this.createRoom());
      this.joinButton.addEventListener("click", () => this.joinRoom());
      this.leaveButton.addEventListener("click", () => this.leaveRoom("Left room"));
      this.copyButton.addEventListener("click", () => this.copyRoomCode());
      this.codeInput.addEventListener("input", () => {
        this.codeInput.value = cleanRoomCode(this.codeInput.value);
      });
      this.nameInput.addEventListener("change", () => {
        this.nameInput.value = cleanName(this.nameInput.value);
        localStorage.setItem("funfun-player-name", this.nameInput.value);
      });
      this.scene.addEventListener("enter-vr", () => document.body.classList.add("vr-active"));
      this.scene.addEventListener("exit-vr", () => document.body.classList.remove("vr-active"));
      window.addEventListener("beforeunload", () => this.leaveRoom("Page closed", true));

      this.setStatus("Create a room or enter a six-character room code.", "idle");
      this.updatePlayerCount();
      this.frameHandle = requestAnimationFrame(this.onFrame);
    }

    getProfile() {
      const name = cleanName(this.nameInput.value);
      this.nameInput.value = name;
      localStorage.setItem("funfun-player-name", name);
      return {
        name: name,
        color: colorForPeer(this.peerId || name)
      };
    }

    peerOptions() {
      return {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      };
    }

    createRoom() {
      if (this.peer) return;
      this.roomCode = randomRoomCode();
      this.isHost = true;
      this.hostPeerId = ROOM_PREFIX + this.roomCode;
      this.setStatus("Creating room…", "connecting");
      this.disableControls(true);
      this.openPeer(this.hostPeerId);
    }

    joinRoom() {
      if (this.peer) return;
      const code = cleanRoomCode(this.codeInput.value);
      if (code.length !== 6) {
        this.setStatus("Enter the full six-character room code.", "error");
        return;
      }

      this.roomCode = code;
      this.isHost = false;
      this.hostPeerId = ROOM_PREFIX + code;
      this.setStatus("Starting peer connection…", "connecting");
      this.disableControls(true);
      this.openPeer(undefined);
    }

    openPeer(requestedId) {
      try {
        this.peer = requestedId ? new Peer(requestedId, this.peerOptions()) : new Peer(undefined, this.peerOptions());
      } catch (error) {
        this.failAndReset("Could not start multiplayer: " + error.message);
        return;
      }

      this.peer.on("open", (id) => {
        this.peerId = id;
        this.profiles.set(id, this.getProfile());
        this.peer.on("connection", (connection) => this.acceptConnection(connection));

        if (this.isHost) {
          this.codeInput.value = this.roomCode;
          location.hash = "room=" + this.roomCode;
          this.setStatus("Room " + this.roomCode + " is open. Share the code, then enter VR.", "ready");
          this.setWorldNetworkStatus("Room " + this.roomCode + " - waiting for players");
          this.copyButton.disabled = false;
          this.leaveButton.disabled = false;
          this.updatePlayerCount();
        } else {
          this.setStatus("Joining room " + this.roomCode + "…", "connecting");
          const connection = this.peer.connect(this.hostPeerId, { serialization: "json" });
          this.prepareConnection(connection, true);
        }
      });

      this.peer.on("error", (error) => this.handlePeerError(error));
      this.peer.on("disconnected", () => {
        if (!this.closing) this.setStatus("Signaling disconnected. Existing peers may remain connected.", "warning");
      });
    }

    acceptConnection(connection) {
      if (this.isHost && this.connections.size >= MAX_PLAYERS - 1) {
        connection.on("open", function () {
          connection.send({ type: "reject", reason: "Room is full" });
          window.setTimeout(() => connection.close(), 100);
        });
        return;
      }
      this.prepareConnection(connection, false);
    }

    connectMeshPeer(peerId) {
      if (!peerId || peerId === this.peerId) return;
      if (this.peerId.localeCompare(peerId) < 0) {
        this.connectToPeer(peerId);
      }
    }

    connectToPeer(peerId) {
      if (!peerId || peerId === this.peerId || this.connections.has(peerId) || !this.peer) return;
      const connection = this.peer.connect(peerId, { serialization: "json" });
      this.prepareConnection(connection, true);
    }

    prepareConnection(connection, initiatedByUs) {
      const peerId = connection.peer;
      const existing = this.connections.get(peerId);
      if (existing && existing.open) {
        connection.close();
        return;
      }

      this.connections.set(peerId, connection);
      connection.on("open", () => {
        connection.send({ type: "hello", peerId: this.peerId, profile: this.getProfile(), version: 1 });

        if (this.isHost && !initiatedByUs) {
          const otherPeers = Array.from(this.connections.entries())
            .filter(([id, item]) => id !== peerId && item.open)
            .map(([id]) => id);
          connection.send({
            type: "welcome",
            roomCode: this.roomCode,
            peers: otherPeers,
            maxPlayers: MAX_PLAYERS
          });
          this.broadcast({ type: "peer-joined", peerId: peerId }, peerId);
        }

        this.setStatus(this.isHost
          ? "Room " + this.roomCode + " connected. Enter VR when ready."
          : "Connected to room " + this.roomCode + ". Enter VR when ready.", "ready");
        this.leaveButton.disabled = false;
        this.updatePlayerCount();
      });

      connection.on("data", (data) => this.handleMessage(peerId, data));
      connection.on("close", () => this.handleConnectionClosed(peerId));
      connection.on("error", () => this.handleConnectionClosed(peerId));
    }

    handleMessage(peerId, data) {
      if (!data || typeof data.type !== "string") return;

      if (data.type === "hello") {
        const profile = {
          name: cleanName(data.profile && data.profile.name),
          color: data.profile && data.profile.color
        };
        this.profiles.set(peerId, profile);
        this.ensureAvatar(peerId, profile).updateProfile(profile);
        this.updatePlayerCount();
        return;
      }

      if (data.type === "welcome" && !this.isHost) {
        if (cleanRoomCode(data.roomCode) !== this.roomCode) return;
        const peers = Array.isArray(data.peers) ? data.peers.slice(0, MAX_PLAYERS - 2) : [];
        peers.forEach((id) => this.connectMeshPeer(String(id)));
        location.hash = "room=" + this.roomCode;
        this.copyButton.disabled = false;
        return;
      }

      if (data.type === "peer-joined") {
        this.connectMeshPeer(String(data.peerId || ""));
        return;
      }

      if (data.type === "peer-left") {
        const departedId = String(data.peerId || "");
        const departedConnection = this.connections.get(departedId);
        if (departedConnection) departedConnection.close();
        this.removeRemotePeer(departedId);
        return;
      }

      if (data.type === "reject") {
        this.failAndReset(data.reason || "Connection was rejected");
        return;
      }

      if (data.type === "room-closed") {
        this.leaveRoom("The host closed the room");
        return;
      }

      if (validPose(data)) {
        this.ensureAvatar(peerId, this.profiles.get(peerId)).setPose(data);
      }
    }

    ensureAvatar(peerId, profile) {
      let avatar = this.avatars.get(peerId);
      if (!avatar) {
        avatar = new RemoteAvatar(this.remoteContainer, peerId, profile || { name: "Player" });
        avatar.root.setAttribute("visible", false);
        this.avatars.set(peerId, avatar);
      }
      return avatar;
    }

    handleConnectionClosed(peerId) {
      this.removeRemotePeer(peerId);

      if (!this.closing && this.isHost) {
        this.broadcast({ type: "peer-left", peerId: peerId }, peerId);
      }

      if (!this.closing && !this.isHost && peerId === this.hostPeerId) {
        this.leaveRoom("Connection to the host ended");
      }
    }

    removeRemotePeer(peerId) {
      this.connections.delete(peerId);
      this.profiles.delete(peerId);
      const avatar = this.avatars.get(peerId);
      if (avatar) avatar.remove();
      this.avatars.delete(peerId);
      this.updatePlayerCount();
    }

    broadcast(message, exceptPeerId) {
      this.connections.forEach(function (connection, id) {
        if (id !== exceptPeerId && connection.open) {
          try { connection.send(message); } catch (_) {}
        }
      });
    }

    handlePeerError(error) {
      if (this.closing) return;
      const type = error && error.type;
      if (type === "unavailable-id") {
        this.failAndReset("That room code is already in use. Create a different room.");
      } else if (type === "peer-unavailable") {
        this.failAndReset("Room " + this.roomCode + " was not found. Check the code and try again.");
      } else if (type === "browser-incompatible") {
        this.failAndReset("This browser does not support the required WebRTC features.");
      } else {
        this.failAndReset("Multiplayer error: " + (error && error.message ? error.message : "connection failed"));
      }
    }

    sendPose(now) {
      if (!this.peer || this.openConnectionCount() === 0 || now - this.lastPoseSent < SEND_INTERVAL_MS) return;
      this.lastPoseSent = now;

      const message = {
        type: "pose",
        t: Math.round(now),
        head: readTransform(this.head),
        left: readTransform(this.leftHand),
        right: readTransform(this.rightHand)
      };

      this.connections.forEach(function (connection) {
        if (connection.open) {
          try {
            connection.send(message);
          } catch (_) {}
        }
      });
    }

    onFrame(now) {
      this.sendPose(now);
      this.avatars.forEach((avatar) => avatar.tick());
      this.frameHandle = requestAnimationFrame(this.onFrame);
    }

    openConnectionCount() {
      let count = 0;
      this.connections.forEach(function (connection) {
        if (connection.open) count += 1;
      });
      return count;
    }

    updatePlayerCount() {
      const total = this.peer ? 1 + this.openConnectionCount() : 0;
      this.playerCountText.textContent = total + " / " + MAX_PLAYERS + " players";
      if (this.peer && this.roomCode) {
        this.setWorldNetworkStatus("Room " + this.roomCode + " - " + total + " player" + (total === 1 ? "" : "s"));
      } else {
        this.setWorldNetworkStatus("Multiplayer offline");
      }
    }

    setWorldNetworkStatus(message) {
      if (this.worldStatus) this.worldStatus.setAttribute("value", message);
    }

    setStatus(message, state) {
      if (!this.statusText) return;
      this.statusText.textContent = message;
      this.statusText.dataset.state = state || "idle";
    }

    disableControls(working) {
      this.createButton.disabled = working;
      this.joinButton.disabled = working;
      this.codeInput.disabled = working;
      this.nameInput.disabled = working;
      if (!working) {
        this.copyButton.disabled = true;
        this.leaveButton.disabled = true;
      }
    }

    async copyRoomCode() {
      if (!this.roomCode) return;
      const text = this.roomCode;
      try {
        await navigator.clipboard.writeText(text);
        this.setStatus("Room code " + text + " copied.", "ready");
      } catch (_) {
        this.codeInput.disabled = false;
        this.codeInput.value = text;
        this.codeInput.select();
        this.setStatus("Room code is " + text + ".", "ready");
        this.codeInput.disabled = true;
      }
    }

    failAndReset(message) {
      this.leaveRoom(message);
      this.setStatus(message, "error");
    }

    leaveRoom(message, silent) {
      if (this.closing) return;
      this.closing = true;

      if (this.isHost) {
        this.connections.forEach(function (connection) {
          if (connection.open) {
            try { connection.send({ type: "room-closed" }); } catch (_) {}
          }
        });
      }

      this.connections.forEach(function (connection) {
        try { connection.close(); } catch (_) {}
      });
      this.connections.clear();

      if (this.peer) {
        try { this.peer.destroy(); } catch (_) {}
      }
      this.peer = null;
      this.peerId = "";
      this.hostPeerId = "";
      this.roomCode = "";
      this.isHost = false;
      this.profiles.clear();
      this.avatars.forEach((avatar) => avatar.remove());
      this.avatars.clear();
      this.disableControls(false);
      this.codeInput.disabled = false;
      this.nameInput.disabled = false;
      this.codeInput.value = cleanRoomCode(this.codeInput.value);
      if (location.hash.indexOf("room=") !== -1) history.replaceState(null, "", location.pathname + location.search);
      this.updatePlayerCount();
      if (!silent) this.setStatus(message || "Multiplayer disconnected.", "idle");
      this.closing = false;
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    const multiplayer = new P2PMultiplayer();
    multiplayer.start();
    window.funFunMultiplayer = multiplayer;
  });
}());

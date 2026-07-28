// Batched Phase 3 hazard mechanics for isolated Meta Quest playtesting.
// Includes damage volumes, explosive launch hazards, collapsing bridge pieces,
// and a short headset-fixed respawn flash. These systems stay outside generated
// courses until physical Quest testing passes.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function pointInsideBox(point, center, size, padding = 0) {
  if (!point || !center || !size) return false;
  const extra = Math.max(0, finiteNumber(padding));
  return (
    Math.abs(finiteNumber(point.x) - finiteNumber(center.x)) <= Math.max(0, finiteNumber(size.x)) * 0.5 + extra &&
    Math.abs(finiteNumber(point.y) - finiteNumber(center.y)) <= Math.max(0, finiteNumber(size.y)) * 0.5 + extra &&
    Math.abs(finiteNumber(point.z) - finiteNumber(center.z)) <= Math.max(0, finiteNumber(size.z)) * 0.5 + extra
  );
}

export function bodySupportedByBridgeBox({
  rigPosition,
  bodyHeight = 1.2,
  bodyRadius = 0.32,
  boxCenter,
  boxSize,
  verticalTolerance = 0.24,
  edgePadding = 0.04
} = {}) {
  if (!rigPosition || !boxCenter || !boxSize) return false;
  const radius = Math.max(0.05, finiteNumber(bodyRadius, 0.32));
  const bottom = finiteNumber(rigPosition.y) + finiteNumber(bodyHeight, 1.2) - radius;
  const top = finiteNumber(boxCenter.y) + finiteNumber(boxSize.y) * 0.5;
  const padding = radius * Math.max(0, finiteNumber(edgePadding, 0.04));
  return (
    Math.abs(finiteNumber(rigPosition.x) - finiteNumber(boxCenter.x)) <= finiteNumber(boxSize.x) * 0.5 + padding &&
    Math.abs(finiteNumber(rigPosition.z) - finiteNumber(boxCenter.z)) <= finiteNumber(boxSize.z) * 0.5 + padding &&
    Math.abs(bottom - top) <= Math.max(0.04, finiteNumber(verticalTolerance, 0.24))
  );
}

export function explosionLaunchVector({
  origin,
  player,
  horizontalSpeed = 22,
  upwardSpeed = 12,
  minimumDistance = 0.2
} = {}) {
  if (!origin || !player) return { x: 0, y: Math.max(0, finiteNumber(upwardSpeed, 12)), z: 0 };
  let dx = finiteNumber(player.x) - finiteNumber(origin.x);
  let dz = finiteNumber(player.z) - finiteNumber(origin.z);
  let length = Math.hypot(dx, dz);
  if (length < Math.max(0.01, finiteNumber(minimumDistance, 0.2))) {
    dx = 0;
    dz = -1;
    length = 1;
  }
  const speed = Math.max(0, finiteNumber(horizontalSpeed, 22));
  return {
    x: (dx / length) * speed,
    y: Math.max(0, finiteNumber(upwardSpeed, 12)),
    z: (dz / length) * speed
  };
}

export function collapsingBridgePhase(elapsedMs, warningMs = 260, fallMs = 480, hiddenMs = 2100) {
  const elapsed = Math.max(0, finiteNumber(elapsedMs));
  const warning = Math.max(80, finiteNumber(warningMs, 260));
  const fall = Math.max(120, finiteNumber(fallMs, 480));
  const hidden = Math.max(300, finiteNumber(hiddenMs, 2100));
  if (elapsed < warning) return "warning";
  if (elapsed < warning + fall) return "falling";
  if (elapsed < warning + fall + hidden) return "hidden";
  return "reset";
}

export function collapsingBridgeFallOffset(elapsedFallMs, fallDistance = 11, fallMs = 480) {
  const progress = Math.min(1, Math.max(0, finiteNumber(elapsedFallMs) / Math.max(120, finiteNumber(fallMs, 480))));
  return Math.max(0, finiteNumber(fallDistance, 11)) * progress * progress * progress;
}

function refreshLocomotionColliders(rig) {
  const locomotion = rig?.components?.["gorilla-locomotion"];
  if (locomotion && typeof document !== "undefined") {
    locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
  }
}

function registerBrowserComponents() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["damage-volume"]) {
    AFRAME.registerComponent("damage-volume", {
      schema: {
        rig: { type: "selector" },
        size: { type: "vec3", default: { x: 2.8, y: 1.2, z: 1.2 } },
        label: { default: "Hazard contact" },
        cooldown: { default: 900 }
      },
      init: function () {
        this.center = new THREE.Vector3();
        this.lastHit = -Infinity;
      },
      tick: function (time) {
        const rig = this.data.rig;
        if (!rig?.object3D?.position || time - this.lastHit < Math.max(200, this.data.cooldown)) return;
        this.el.object3D.getWorldPosition(this.center);
        if (!pointInsideBox(rig.object3D.position, this.center, this.data.size, 0.08)) return;
        this.lastHit = time;
        window.dispatchEvent(new CustomEvent("hazard-player-reset", {
          detail: { reason: this.data.label, color: "#EF4444", sourceId: this.el.id || "damage-volume" }
        }));
      }
    });
  }

  if (!AFRAME.components["explosive-launch-hazard"]) {
    AFRAME.registerComponent("explosive-launch-hazard", {
      schema: {
        rig: { type: "selector" },
        triggerRadius: { default: 1.65 },
        fuseMs: { default: 520 },
        cooldownMs: { default: 3200 },
        horizontalSpeed: { default: 24 },
        upwardSpeed: { default: 12 }
      },
      init: function () {
        this.center = new THREE.Vector3();
        this.armedAt = -1;
        this.cooldownUntil = 0;
        this.lastDistanceCheck = 0;
        this.warning = this.el.querySelector("[data-bomb-warning]");
        this.blast = this.el.querySelector("[data-bomb-blast]");
        this.body = this.el.querySelector("[data-bomb-body]");
        this.onReset = this.onReset.bind(this);
        window.addEventListener("course-request-reset", this.onReset);
        this.renderIdle();
      },
      remove: function () {
        window.removeEventListener("course-request-reset", this.onReset);
      },
      onReset: function () {
        this.armedAt = -1;
        this.cooldownUntil = 0;
        this.renderIdle();
      },
      renderIdle: function () {
        this.warning?.setAttribute("visible", false);
        this.blast?.setAttribute("visible", false);
        this.body?.setAttribute("color", "#111827");
      },
      arm: function (time) {
        this.armedAt = time;
        this.warning?.setAttribute("visible", true);
        this.body?.setAttribute("color", "#F97316");
        window.dispatchEvent(new CustomEvent("hazard-bomb-armed", { detail: { id: this.el.id } }));
      },
      detonate: function (time) {
        const rig = this.data.rig;
        this.el.object3D.getWorldPosition(this.center);
        const launch = explosionLaunchVector({
          origin: this.center,
          player: rig?.object3D?.position,
          horizontalSpeed: this.data.horizontalSpeed,
          upwardSpeed: this.data.upwardSpeed
        });
        const locomotion = rig?.components?.["gorilla-locomotion"];
        const targets = [locomotion?.velocity, locomotion?.launchVelocity].filter(Boolean);
        for (const vector of targets) {
          vector.x = launch.x;
          vector.y = Math.max(finiteNumber(vector.y), launch.y);
          vector.z = launch.z;
        }
        if (locomotion) {
          locomotion.pushHistory = [];
          locomotion.hasPreviousHands = false;
        }
        this.blast?.setAttribute("visible", true);
        this.warning?.setAttribute("visible", false);
        this.body?.setAttribute("color", "#FDE047");
        this.armedAt = -1;
        this.cooldownUntil = time + Math.max(800, this.data.cooldownMs);
        window.setTimeout(() => this.renderIdle(), 260);
        window.dispatchEvent(new CustomEvent("hazard-explosion", {
          detail: { id: this.el.id, launch, color: "#F97316" }
        }));
      },
      tick: function (time) {
        const rig = this.data.rig;
        if (!rig?.object3D?.position) return;
        if (this.armedAt >= 0) {
          const progress = Math.min(1, (time - this.armedAt) / Math.max(120, this.data.fuseMs));
          if (this.warning?.object3D?.scale) {
            const pulse = 1 + Math.sin(progress * Math.PI * 10) * 0.18;
            this.warning.object3D.scale.set(pulse, pulse, pulse);
          }
          if (progress >= 1) this.detonate(time);
          return;
        }
        if (time < this.cooldownUntil || time - this.lastDistanceCheck < 80) return;
        this.lastDistanceCheck = time;
        this.el.object3D.getWorldPosition(this.center);
        const p = rig.object3D.position;
        const distance = Math.hypot(p.x - this.center.x, p.y - this.center.y, p.z - this.center.z);
        if (distance <= Math.max(0.5, this.data.triggerRadius)) this.arm(time);
      }
    });
  }

  if (!AFRAME.components["collapsing-bridge-piece"]) {
    AFRAME.registerComponent("collapsing-bridge-piece", {
      schema: {
        rig: { type: "selector" },
        order: { default: 0 },
        warningMs: { default: 260 },
        fallMs: { default: 480 },
        hiddenMs: { default: 2100 },
        fallDistance: { default: 11 },
        chainDelayMs: { default: 110 }
      },
      init: function () {
        this.basePosition = this.el.object3D.position.clone();
        this.boxCenter = new THREE.Vector3();
        this.boxSize = { x: 2.8, y: 0.35, z: 1.22 };
        this.triggeredAt = -1;
        this.state = "solid";
        this.collider = this.el.querySelector("[locomotion-collider]");
        this.warning = this.el.querySelector("[data-bridge-warning]");
        this.onChainStart = this.onChainStart.bind(this);
        this.onReset = this.onReset.bind(this);
        window.addEventListener("bridge-chain-start", this.onChainStart);
        window.addEventListener("course-request-reset", this.onReset);
        this.onReset();
      },
      remove: function () {
        window.removeEventListener("bridge-chain-start", this.onChainStart);
        window.removeEventListener("course-request-reset", this.onReset);
      },
      onChainStart: function (event) {
        if (this.triggeredAt >= 0) return;
        const startAt = finiteNumber(event.detail?.time, performance.now());
        this.triggeredAt = startAt + Math.max(0, this.data.order) * Math.max(40, this.data.chainDelayMs);
      },
      onReset: function () {
        this.triggeredAt = -1;
        this.state = "solid";
        this.el.object3D.position.copy(this.basePosition);
        this.el.object3D.rotation.set(0, 0, 0);
        this.el.setAttribute("visible", true);
        this.warning?.setAttribute("visible", false);
        if (this.collider && !this.collider.hasAttribute("locomotion-collider")) {
          this.collider.setAttribute("locomotion-collider", "type: box; size: 2.8 0.35 1.22");
        }
        window.setTimeout(() => refreshLocomotionColliders(this.data.rig), 0);
      },
      disableCollider: function () {
        if (this.collider?.hasAttribute("locomotion-collider")) {
          this.collider.removeAttribute("locomotion-collider");
          refreshLocomotionColliders(this.data.rig);
        }
      },
      triggerChain: function (time) {
        window.dispatchEvent(new CustomEvent("bridge-chain-start", { detail: { time } }));
        window.dispatchEvent(new CustomEvent("hazard-bridge-start", { detail: { color: "#F59E0B" } }));
      },
      tick: function (time) {
        const rig = this.data.rig;
        if (!rig?.object3D?.position) return;
        if (this.triggeredAt < 0) {
          this.el.object3D.getWorldPosition(this.boxCenter);
          if (bodySupportedByBridgeBox({
            rigPosition: rig.object3D.position,
            bodyHeight: rig.components?.["gorilla-locomotion"]?.data?.bodyHeight || 1.2,
            bodyRadius: rig.components?.["gorilla-locomotion"]?.data?.bodyRadius || 0.32,
            boxCenter: this.boxCenter,
            boxSize: this.boxSize
          })) this.triggerChain(time);
          return;
        }
        if (time < this.triggeredAt) return;
        const elapsed = time - this.triggeredAt;
        const phase = collapsingBridgePhase(elapsed, this.data.warningMs, this.data.fallMs, this.data.hiddenMs);
        if (phase !== this.state) {
          this.state = phase;
          if (phase === "warning") this.warning?.setAttribute("visible", true);
          if (phase === "falling") {
            this.warning?.setAttribute("visible", false);
            this.disableCollider();
          }
          if (phase === "hidden") this.el.setAttribute("visible", false);
          if (phase === "reset") this.onReset();
        }
        if (phase === "warning") {
          const pulse = 1 + Math.sin(elapsed * 0.08) * 0.12;
          if (this.warning?.object3D?.scale) this.warning.object3D.scale.set(pulse, pulse, pulse);
        } else if (phase === "falling") {
          const fallElapsed = elapsed - Math.max(80, this.data.warningMs);
          this.el.object3D.position.y = this.basePosition.y - collapsingBridgeFallOffset(fallElapsed, this.data.fallDistance, this.data.fallMs);
          this.el.object3D.rotation.z = Math.min(0.55, fallElapsed / Math.max(120, this.data.fallMs) * 0.55) * (this.data.order % 2 ? -1 : 1);
        }
      }
    });
  }

  if (!AFRAME.components["respawn-flash"]) {
    AFRAME.registerComponent("respawn-flash", {
      schema: { duration: { default: 520 } },
      init: function () {
        this.startedAt = -1;
        this.baseColor = "#FFFFFF";
        this.onReset = (event) => this.flash(event.detail?.color || "#FFFFFF");
        this.onExplosion = (event) => this.flash(event.detail?.color || "#F97316", 0.45);
        this.onBridge = (event) => this.flash(event.detail?.color || "#F59E0B", 0.22);
        window.addEventListener("playtest-reset", this.onReset);
        window.addEventListener("hazard-explosion", this.onExplosion);
        window.addEventListener("hazard-bridge-start", this.onBridge);
        this.el.setAttribute("visible", false);
      },
      remove: function () {
        window.removeEventListener("playtest-reset", this.onReset);
        window.removeEventListener("hazard-explosion", this.onExplosion);
        window.removeEventListener("hazard-bridge-start", this.onBridge);
      },
      flash: function (color, strength = 0.88) {
        this.baseColor = color;
        this.strength = Math.min(1, Math.max(0.1, finiteNumber(strength, 0.88)));
        this.startedAt = performance.now();
        this.el.setAttribute("visible", true);
        this.el.setAttribute("color", color);
        this.el.setAttribute("material", `color: ${color}; opacity: ${this.strength}; transparent: true; shader: flat; depthTest: false`);
      },
      tick: function (time) {
        if (this.startedAt < 0) return;
        const progress = Math.min(1, (time - this.startedAt) / Math.max(120, this.data.duration));
        const opacity = this.strength * (1 - progress) * (1 - progress);
        this.el.setAttribute("material", `color: ${this.baseColor}; opacity: ${opacity}; transparent: true; shader: flat; depthTest: false`);
        if (progress >= 1) {
          this.startedAt = -1;
          this.el.setAttribute("visible", false);
        }
      }
    });
  }
}

registerBrowserComponents();

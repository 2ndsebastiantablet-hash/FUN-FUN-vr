// Physical Quest retuning for the batched hazard laboratory.
// Replaces the oversized spike volume, touch-only bomb arming, and the
// full-screen bridge tint while preserving the tested launch and bridge motion.

import "./hazard-pack.js";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function horizontalDistanceSquared(a, b) {
  if (!a || !b) return Infinity;
  const dx = finiteNumber(a.x) - finiteNumber(b.x);
  const dz = finiteNumber(a.z) - finiteNumber(b.z);
  return dx * dx + dz * dz;
}

export function gorillaFootPoint(rig, target = { x: 0, y: 0, z: 0 }) {
  const position = rig?.object3D?.position;
  if (!position) return null;
  const locomotion = rig.components?.["gorilla-locomotion"];
  const bodyHeight = finiteNumber(locomotion?.data?.bodyHeight, 1.2);
  const bodyRadius = Math.max(0.05, finiteNumber(locomotion?.data?.bodyRadius, 0.32));
  target.x = finiteNumber(position.x);
  target.y = finiteNumber(position.y) + bodyHeight - bodyRadius;
  target.z = finiteNumber(position.z);
  return target;
}

export function pointInsideExactBox(point, center, size, padding = 0.015) {
  if (!point || !center || !size) return false;
  const extra = Math.max(0, finiteNumber(padding, 0.015));
  return (
    Math.abs(finiteNumber(point.x) - finiteNumber(center.x)) <= Math.max(0, finiteNumber(size.x)) * 0.5 + extra &&
    Math.abs(finiteNumber(point.y) - finiteNumber(center.y)) <= Math.max(0, finiteNumber(size.y)) * 0.5 + extra &&
    Math.abs(finiteNumber(point.z) - finiteNumber(center.z)) <= Math.max(0, finiteNumber(size.z)) * 0.5 + extra
  );
}

export function bombProximityDetected({ player, bomb, radius = 2.75, maxVerticalDifference = 3 } = {}) {
  if (!player || !bomb) return false;
  if (Math.abs(finiteNumber(player.y) - finiteNumber(bomb.y)) > Math.max(0.2, finiteNumber(maxVerticalDifference, 3))) return false;
  const safeRadius = Math.max(0.5, finiteNumber(radius, 2.75));
  return horizontalDistanceSquared(player, bomb) <= safeRadius * safeRadius;
}

function registerRetunedComponents() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;

  if (!AFRAME.components["damage-volume-v2"]) {
    AFRAME.registerComponent("damage-volume-v2", {
      schema: {
        rig: { type: "selector" },
        size: { type: "vec3", default: { x: 3, y: 0.34, z: 0.48 } },
        offset: { type: "vec3", default: { x: 0, y: 1.08, z: 0 } },
        label: { default: "Spike contact" },
        cooldown: { default: 900 }
      },
      init: function () {
        this.origin = new THREE.Vector3();
        this.center = new THREE.Vector3();
        this.foot = new THREE.Vector3();
        this.lastHit = -Infinity;
      },
      tick: function (time) {
        const rig = this.data.rig;
        if (!rig?.object3D?.position || time - this.lastHit < Math.max(200, this.data.cooldown)) return;
        this.el.object3D.getWorldPosition(this.origin);
        this.center.set(
          this.origin.x + this.data.offset.x,
          this.origin.y + this.data.offset.y,
          this.origin.z + this.data.offset.z
        );
        if (!gorillaFootPoint(rig, this.foot)) return;
        if (!pointInsideExactBox(this.foot, this.center, this.data.size, 0.015)) return;
        this.lastHit = time;
        window.dispatchEvent(new CustomEvent("hazard-player-reset", {
          detail: { reason: this.data.label, color: "#EF4444", sourceId: this.el.id || "damage-volume-v2" }
        }));
      }
    });
  }

  if (!AFRAME.components["explosive-launch-hazard-v2"]) {
    AFRAME.registerComponent("explosive-launch-hazard-v2", {
      schema: {
        rig: { type: "selector" },
        triggerRadius: { default: 2.75 },
        maxVerticalDifference: { default: 3 },
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
        this.detection = this.el.querySelector("[data-bomb-detection]");
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
        this.detection?.setAttribute("visible", true);
        this.body?.setAttribute("color", "#111827");
      },
      arm: function (time) {
        this.armedAt = time;
        this.warning?.setAttribute("visible", true);
        this.detection?.setAttribute("visible", false);
        this.body?.setAttribute("color", "#F97316");
        window.dispatchEvent(new CustomEvent("hazard-bomb-armed", {
          detail: { id: this.el.id, triggerRadius: this.data.triggerRadius }
        }));
      },
      detonate: function (time) {
        const rig = this.data.rig;
        this.el.object3D.getWorldPosition(this.center);
        const player = rig?.object3D?.position;
        let dx = finiteNumber(player?.x) - this.center.x;
        let dz = finiteNumber(player?.z) - this.center.z;
        let length = Math.hypot(dx, dz);
        if (length < 0.2) {
          dx = 0;
          dz = -1;
          length = 1;
        }
        const launch = {
          x: dx / length * Math.max(0, this.data.horizontalSpeed),
          y: Math.max(0, this.data.upwardSpeed),
          z: dz / length * Math.max(0, this.data.horizontalSpeed)
        };
        const locomotion = rig?.components?.["gorilla-locomotion"];
        for (const vector of [locomotion?.velocity, locomotion?.launchVelocity].filter(Boolean)) {
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
        if (time < this.cooldownUntil || time - this.lastDistanceCheck < 60) return;
        this.lastDistanceCheck = time;
        this.el.object3D.getWorldPosition(this.center);
        if (bombProximityDetected({
          player: rig.object3D.position,
          bomb: this.center,
          radius: this.data.triggerRadius,
          maxVerticalDifference: this.data.maxVerticalDifference
        })) this.arm(time);
      }
    });
  }

  if (!AFRAME.components["respawn-flash-v2"]) {
    AFRAME.registerComponent("respawn-flash-v2", {
      schema: { duration: { default: 340 } },
      init: function () {
        this.startedAt = -1;
        this.baseColor = "#FFFFFF";
        this.strength = 0;
        this.onReset = (event) => this.flash(event.detail?.color || "#FFFFFF", 0.42);
        this.onExplosion = (event) => this.flash(event.detail?.color || "#F97316", 0.2, 220);
        window.addEventListener("playtest-reset", this.onReset);
        window.addEventListener("hazard-explosion", this.onExplosion);
        // Deliberately no hazard-bridge-start listener. Bridge warnings remain in-world
        // so the player's view is never covered by an orange screen.
        this.el.setAttribute("visible", false);
      },
      remove: function () {
        window.removeEventListener("playtest-reset", this.onReset);
        window.removeEventListener("hazard-explosion", this.onExplosion);
      },
      flash: function (color, strength = 0.42, duration = this.data.duration) {
        this.baseColor = color;
        this.strength = Math.min(0.55, Math.max(0.05, finiteNumber(strength, 0.42)));
        this.activeDuration = Math.max(120, finiteNumber(duration, this.data.duration));
        this.startedAt = performance.now();
        this.el.setAttribute("visible", true);
        this.el.setAttribute("material", `color: ${color}; opacity: ${this.strength}; transparent: true; shader: flat; depthTest: false`);
      },
      tick: function (time) {
        if (this.startedAt < 0) return;
        const progress = Math.min(1, (time - this.startedAt) / this.activeDuration);
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

export function applyHazardRetune(documentLike = globalThis.document) {
  const hazard = documentLike?.getElementById?.("red-damage-strip");
  if (hazard?.setAttribute && hazard.dataset?.retuneV2 !== "true") {
    if (hazard.dataset) hazard.dataset.retuneV2 = "true";
    hazard.removeAttribute?.("damage-volume");
    hazard.setAttribute("position", "0 0 3.8");
    hazard.setAttribute(
      "damage-volume-v2",
      "rig: #player-rig; size: 3.0 0.34 0.48; offset: 0 1.08 0; label: SPIKE CONTACT; cooldown: 900"
    );
    const base = hazard.querySelector?.("a-box");
    base?.setAttribute?.("width", "3.0");
    base?.setAttribute?.("depth", "0.48");
    base?.setAttribute?.("position", "0 1.03 0");
    hazard.querySelectorAll?.("a-cone").forEach((spike) => {
      const current = spike.getAttribute?.("position") || { x: 0, z: 0 };
      spike.setAttribute("position", `${finiteNumber(current.x).toFixed(2)} 1.27 ${finiteNumber(current.z).toFixed(2)}`);
      spike.setAttribute("radius-bottom", "0.105");
      spike.setAttribute("height", "0.38");
    });
  }

  const bomb = documentLike?.getElementById?.("proximity-bomb");
  if (bomb?.setAttribute && bomb.dataset?.retuneV2 !== "true") {
    if (bomb.dataset) bomb.dataset.retuneV2 = "true";
    bomb.removeAttribute?.("explosive-launch-hazard");
    if (!bomb.querySelector?.("[data-bomb-detection]")) {
      const detection = documentLike.createElement("a-ring");
      detection.setAttribute("data-bomb-detection", "true");
      detection.setAttribute("position", "0 -0.4 0");
      detection.setAttribute("rotation", "-90 0 0");
      detection.setAttribute("radius-inner", "2.55");
      detection.setAttribute("radius-outer", "2.75");
      detection.setAttribute("color", "#FDBA74");
      detection.setAttribute("material", "emissive: #EA580C; emissiveIntensity: 0.55; opacity: 0.34; transparent: true");
      bomb.appendChild(detection);
    }
    bomb.setAttribute(
      "explosive-launch-hazard-v2",
      "rig: #player-rig; triggerRadius: 2.75; maxVerticalDifference: 3; fuseMs: 520; cooldownMs: 3200; horizontalSpeed: 24; upwardSpeed: 12"
    );
  }
  return Boolean(hazard || bomb);
}

function applyWhenReady() {
  applyHazardRetune();
}

registerRetunedComponents();

if (typeof window !== "undefined") {
  window.addEventListener("course-built", applyWhenReady);
  document.addEventListener("DOMContentLoaded", applyWhenReady, { once: true });
  window.setTimeout(applyWhenReady, 100);
  window.setTimeout(applyWhenReady, 500);
}

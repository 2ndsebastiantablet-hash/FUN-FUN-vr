function refreshLocomotionColliders() {
  const rig = document.getElementById("player-rig");
  const locomotion = rig?.components?.["gorilla-locomotion"];
  if (!locomotion) return;
  locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
}

function registerSurfaceExtension() {
  if (!window.AFRAME || AFRAME.components["platformer-surface-extension"]) return;

  AFRAME.registerComponent("platformer-surface-extension", {
    init: function () {
      this.installed = false;
      this.boundsMin = new THREE.Vector3();
      this.boundsMax = new THREE.Vector3();
      this.colliderCenter = new THREE.Vector3();
      this.install = this.install.bind(this);
      if (this.el.sceneEl.hasLoaded) this.install();
      else this.el.sceneEl.addEventListener("loaded", this.install, { once: true });
    },

    remove: function () {
      if (this.locomotion && this.originalTock) this.locomotion.tock = this.originalTock;
    },

    install: function () {
      if (this.installed) return;
      const locomotion = this.el.components["gorilla-locomotion"];
      if (!locomotion) {
        window.setTimeout(this.install, 50);
        return;
      }

      this.installed = true;
      this.locomotion = locomotion;
      this.originalTock = locomotion.tock.bind(locomotion);
      refreshLocomotionColliders();

      locomotion.tock = (time, deltaMs) => {
        this.originalTock(time, deltaMs);
        this.applyPlatformSupport(deltaMs);
      };
    },

    colliderBounds: function (colliderEl, targetMin, targetMax) {
      const component = colliderEl.components["locomotion-collider"];
      if (!component || component.data.type !== "box") return false;
      colliderEl.object3D.getWorldPosition(this.colliderCenter);
      const size = component.data.size;
      targetMin.set(
        this.colliderCenter.x - size.x * 0.5,
        this.colliderCenter.y - size.y * 0.5,
        this.colliderCenter.z - size.z * 0.5
      );
      targetMax.set(
        this.colliderCenter.x + size.x * 0.5,
        this.colliderCenter.y + size.y * 0.5,
        this.colliderCenter.z + size.z * 0.5
      );
      return true;
    },

    handOnTop: function (position, radius) {
      for (const colliderEl of this.locomotion.colliders) {
        if (!this.colliderBounds(colliderEl, this.boundsMin, this.boundsMax)) continue;
        const bottom = position.y - radius;
        const insideXZ =
          position.x >= this.boundsMin.x - radius * 0.35 &&
          position.x <= this.boundsMax.x + radius * 0.35 &&
          position.z >= this.boundsMin.z - radius * 0.35 &&
          position.z <= this.boundsMax.z + radius * 0.35;
        if (insideXZ && bottom >= this.boundsMax.y - 0.22 && bottom <= this.boundsMax.y + 0.16) return true;
      }
      return false;
    },

    bodySupported: function () {
      const locomotion = this.locomotion;
      const bodyCenterY = locomotion.rig.position.y + locomotion.data.bodyHeight;
      const bodyBottom = bodyCenterY - locomotion.data.bodyRadius;
      const x = locomotion.rig.position.x;
      const z = locomotion.rig.position.z;

      for (const colliderEl of locomotion.colliders) {
        if (!this.colliderBounds(colliderEl, this.boundsMin, this.boundsMax)) continue;
        const insideXZ =
          x >= this.boundsMin.x - locomotion.data.bodyRadius * 0.35 &&
          x <= this.boundsMax.x + locomotion.data.bodyRadius * 0.35 &&
          z >= this.boundsMin.z - locomotion.data.bodyRadius * 0.35 &&
          z <= this.boundsMax.z + locomotion.data.bodyRadius * 0.35;
        if (insideXZ && bodyBottom >= this.boundsMax.y - 0.14 && bodyBottom <= this.boundsMax.y + 0.14) return true;
      }
      return false;
    },

    applyPlatformSupport: function (deltaMs) {
      const locomotion = this.locomotion;
      if (!locomotion?.colliders?.length) return;
      const left = locomotion.leftTouchingSurface ? locomotion.leftResolved : locomotion.currentLeftWorld;
      const right = locomotion.rightTouchingSurface ? locomotion.rightResolved : locomotion.currentRightWorld;
      const leftOnTop = this.handOnTop(left, locomotion.data.handRadius);
      const rightOnTop = this.handOnTop(right, locomotion.data.handRadius);
      const supported = this.bodySupported();

      locomotion.leftTouchingFloor ||= leftOnTop;
      locomotion.rightTouchingFloor ||= rightOnTop;
      locomotion.wasTouchingFloor ||= leftOnTop || rightOnTop;
      locomotion.wasTwoHandTouchingFloor ||= leftOnTop && rightOnTop;
      locomotion.grounded ||= supported;

      if (supported && locomotion.velocity.y < 0.05) {
        locomotion.velocity.y = Math.max(0, locomotion.velocity.y);
        const deltaTime = Math.min(Math.max(deltaMs || 0, 0) / 1000, 0.05);
        const extraDrag = Math.max(0, locomotion.data.groundDrag - locomotion.data.airDrag);
        const factor = Math.max(0, 1 - extraDrag * deltaTime);
        locomotion.velocity.x *= factor;
        locomotion.velocity.z *= factor;
      }
    }
  });
}

function registerSpringLauncher() {
  if (!window.AFRAME || AFRAME.components["spring-launcher"]) return;
  AFRAME.registerComponent("spring-launcher", {
    schema: {
      rig: { type: "selector" },
      launchSpeed: { default: 8.4 },
      forwardSpeed: { default: 4.5 },
      cooldown: { default: 950 },
      radius: { default: 0.92 },
      height: { default: 1 }
    },
    init: function () {
      this.lastLaunch = -Infinity;
      this.center = new THREE.Vector3();
      this.wasInside = false;
    },
    tick: function (time) {
      const rig = this.data.rig;
      const locomotion = rig?.components?.["gorilla-locomotion"];
      if (!locomotion) return;
      this.el.object3D.getWorldPosition(this.center);
      const position = rig.object3D.position;
      const dx = position.x - this.center.x;
      const dz = position.z - this.center.z;
      const surfaceY = this.center.y + this.data.height * 0.5;
      const inside =
        dx * dx + dz * dz <= this.data.radius * this.data.radius &&
        position.y >= surfaceY - 0.95 &&
        position.y <= surfaceY + 0.38;

      if (inside && !this.wasInside && time - this.lastLaunch >= this.data.cooldown && locomotion.velocity.y <= 1.5) {
        this.lastLaunch = time;
        locomotion.velocity.y = Math.max(locomotion.velocity.y, this.data.launchSpeed);
        locomotion.velocity.z = Math.min(locomotion.velocity.z, -this.data.forwardSpeed);
        locomotion.launchVelocity.copy(locomotion.velocity);
        locomotion.pushHistory = [];
        locomotion.hasPreviousHands = false;
        window.dispatchEvent(new CustomEvent("spring-launched", {
          detail: { launchSpeed: this.data.launchSpeed, forwardSpeed: this.data.forwardSpeed }
        }));
      }
      this.wasInside = inside;
      if (!inside && time - this.lastLaunch > 250) this.wasInside = false;
    }
  });
}

function registerCheckpointTrigger() {
  if (!window.AFRAME || AFRAME.components["course-checkpoint-trigger"]) return;
  AFRAME.registerComponent("course-checkpoint-trigger", {
    schema: {
      rig: { type: "selector" },
      checkpointId: { default: "" },
      label: { default: "Checkpoint" },
      index: { default: 0 },
      spawn: { type: "vec3" },
      radius: { default: 1.45 }
    },
    init: function () {
      this.activated = false;
      this.center = new THREE.Vector3();
    },
    tick: function () {
      if (this.activated || !this.data.rig) return;
      this.el.object3D.getWorldPosition(this.center);
      const position = this.data.rig.object3D.position;
      const dx = position.x - this.center.x;
      const dz = position.z - this.center.z;
      const dy = Math.abs(position.y - this.center.y);
      if (dx * dx + dz * dz <= this.data.radius * this.data.radius && dy <= 2.1) {
        this.activated = true;
        window.dispatchEvent(new CustomEvent("course-checkpoint", {
          detail: {
            id: this.data.checkpointId,
            label: this.data.label,
            index: this.data.index,
            spawn: { x: this.data.spawn.x, y: this.data.spawn.y, z: this.data.spawn.z }
          }
        }));
      }
    }
  });
}

function registerFinishTrigger() {
  if (!window.AFRAME || AFRAME.components["course-finish-trigger"]) return;
  AFRAME.registerComponent("course-finish-trigger", {
    schema: {
      rig: { type: "selector" },
      radiusX: { default: 1.8 },
      radiusZ: { default: 0.7 },
      minRigY: { default: -2 },
      maxRigY: { default: 10 }
    },
    init: function () {
      this.completed = false;
      this.center = new THREE.Vector3();
    },
    tick: function () {
      if (this.completed || !this.data.rig) return;
      this.el.object3D.getWorldPosition(this.center);
      const position = this.data.rig.object3D.position;
      const inside =
        Math.abs(position.x - this.center.x) <= this.data.radiusX &&
        Math.abs(position.z - this.center.z) <= this.data.radiusZ &&
        position.y >= this.data.minRigY &&
        position.y <= this.data.maxRigY;
      if (inside) {
        this.completed = true;
        window.dispatchEvent(new CustomEvent("course-finish"));
      }
    }
  });
}

export function registerGeneratedComponents() {
  registerSurfaceExtension();
  registerSpringLauncher();
  registerCheckpointTrigger();
  registerFinishTrigger();
}

export { refreshLocomotionColliders };

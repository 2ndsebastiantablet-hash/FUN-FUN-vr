// Reusable timed/disappearing platform mechanic for the Phase 3 lab.
// Platforms follow a deterministic solid -> warning -> hidden cycle. The cycle
// is derived from scene time, making it suitable for later seed manifests and
// shared multiplayer timestamps.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function timedPlatformCycle({
  timeMs = 0,
  solidDuration = 1400,
  warningDuration = 350,
  hiddenDuration = 1000,
  phase = 0
} = {}) {
  const solid = Math.max(100, finiteNumber(solidDuration, 1400));
  const warning = Math.max(100, finiteNumber(warningDuration, 350));
  const hidden = Math.max(100, finiteNumber(hiddenDuration, 1000));
  const total = solid + warning + hidden;
  const phaseOffset = positiveModulo(finiteNumber(phase, 0), 1) * total;
  const local = positiveModulo(Math.max(0, finiteNumber(timeMs, 0)) + phaseOffset, total);

  if (local < solid) {
    return { state: "solid", progress: local / solid, localTime: local, totalDuration: total };
  }
  if (local < solid + warning) {
    return {
      state: "warning",
      progress: (local - solid) / warning,
      localTime: local,
      totalDuration: total
    };
  }
  return {
    state: "hidden",
    progress: (local - solid - warning) / hidden,
    localTime: local,
    totalDuration: total
  };
}

export function timedPlatformOpacity(state, progress = 0) {
  if (state === "hidden") return 0;
  if (state === "warning") {
    const pulse = Math.sin(Math.max(0, finiteNumber(progress, 0)) * Math.PI * 8);
    return 0.42 + (pulse + 1) * 0.22;
  }
  return 1;
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME) return;
  if (AFRAME.components["timed-platform"]) return;

  AFRAME.registerComponent("timed-platform", {
    schema: {
      rig: { type: "selector" },
      solidDuration: { default: 1400 },
      warningDuration: { default: 350 },
      hiddenDuration: { default: 1000 },
      phase: { default: 0 },
      startDelay: { default: 0 }
    },

    init: function () {
      this.state = "uninitialized";
      this.epoch = 0;
      this.pendingReset = false;
      this.colliderSnapshots = [];
      this.warningVisuals = Array.from(this.el.querySelectorAll("[data-timed-warning]"));
      this.captureColliders();
      this.onCourseReset = this.onCourseReset.bind(this);
      window.addEventListener("course-request-reset", this.onCourseReset);
      this.el.setAttribute("data-timed-platform", "true");
    },

    remove: function () {
      window.removeEventListener("course-request-reset", this.onCourseReset);
    },

    captureColliders: function () {
      const colliders = Array.from(this.el.querySelectorAll("[locomotion-collider]"));
      this.colliderSnapshots = colliders.map((collider) => {
        const component = collider.components?.["locomotion-collider"];
        const size = component?.data?.size || { x: 1, y: 1, z: 1 };
        return {
          element: collider,
          type: component?.data?.type || "box",
          size: {
            x: finiteNumber(size.x, 1),
            y: finiteNumber(size.y, 1),
            z: finiteNumber(size.z, 1)
          }
        };
      });
    },

    refreshLocomotion: function () {
      const locomotion = this.data.rig?.components?.["gorilla-locomotion"];
      if (locomotion) locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
    },

    enableColliders: function () {
      for (const snapshot of this.colliderSnapshots) {
        if (snapshot.element.hasAttribute("locomotion-collider")) continue;
        snapshot.element.setAttribute(
          "locomotion-collider",
          `type: ${snapshot.type}; size: ${snapshot.size.x} ${snapshot.size.y} ${snapshot.size.z}`
        );
      }
      window.setTimeout(() => this.refreshLocomotion(), 0);
    },

    disableColliders: function () {
      for (const snapshot of this.colliderSnapshots) {
        snapshot.element.removeAttribute("locomotion-collider");
      }
      this.refreshLocomotion();
    },

    setWarningVisuals: function (visible, opacity = 1) {
      for (const visual of this.warningVisuals) {
        visual.setAttribute("visible", visible);
        visual.setAttribute("material", "opacity", opacity);
      }
    },

    applyState: function (nextState, progress = 0) {
      const changed = nextState !== this.state;
      this.state = nextState;
      this.el.setAttribute("data-timed-state", nextState);

      if (nextState === "hidden") {
        if (changed) this.disableColliders();
        this.el.object3D.visible = false;
        this.setWarningVisuals(false, 0);
      } else {
        this.el.object3D.visible = true;
        if (changed) this.enableColliders();
        if (nextState === "warning") {
          this.setWarningVisuals(true, timedPlatformOpacity(nextState, progress));
        } else {
          this.setWarningVisuals(false, 1);
        }
      }

      if (changed) {
        window.dispatchEvent(new CustomEvent("timed-platform-state", {
          detail: {
            platformId: this.el.id || "timed-platform",
            state: nextState,
            phase: this.data.phase
          }
        }));
      }
    },

    onCourseReset: function () {
      this.pendingReset = true;
      this.el.object3D.visible = true;
      this.enableColliders();
      this.state = "uninitialized";
    },

    tick: function (time) {
      if (this.pendingReset) {
        this.epoch = time;
        this.pendingReset = false;
      }
      if (time < this.data.startDelay) {
        this.applyState("solid", 0);
        return;
      }

      const sample = timedPlatformCycle({
        timeMs: time - this.epoch - this.data.startDelay,
        solidDuration: this.data.solidDuration,
        warningDuration: this.data.warningDuration,
        hiddenDuration: this.data.hiddenDuration,
        phase: this.data.phase
      });
      this.applyState(sample.state, sample.progress);
    }
  });
}

registerBrowserComponent();

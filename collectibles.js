// Phase 5 optional collectible layer.
// Collectibles are visual/trigger-only and never alter platform collision geometry.

export const COLLECTIBLE_COUNT = 3;
const COLLECTIBLE_HEIGHT = 1.75;
const LATERAL_OFFSETS = Object.freeze([-0.65, 0.65, 0]);

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function platformPieces(manifest) {
  return (manifest?.pieces || []).filter((piece) => {
    return piece?.assetId === "platform-square-blue" && Array.isArray(piece.position);
  });
}

export function chooseCollectiblePlacements(manifest) {
  const platforms = platformPieces(manifest);
  if (platforms.length < COLLECTIBLE_COUNT) return [];

  const middlePlatforms = platforms.length > 4 ? platforms.slice(1, -1) : platforms;
  const indices = [
    0,
    Math.floor((middlePlatforms.length - 1) * 0.5),
    middlePlatforms.length - 1
  ];
  const used = new Set();
  const selected = [];

  for (const preferredIndex of indices) {
    let index = preferredIndex;
    while (used.has(index) && index < middlePlatforms.length - 1) index += 1;
    while (used.has(index) && index > 0) index -= 1;
    if (used.has(index)) continue;
    used.add(index);
    selected.push(middlePlatforms[index]);
  }

  for (let index = 0; selected.length < COLLECTIBLE_COUNT && index < middlePlatforms.length; index += 1) {
    if (used.has(index)) continue;
    used.add(index);
    selected.push(middlePlatforms[index]);
  }

  return selected.slice(0, COLLECTIBLE_COUNT).map((piece, index) => ({
    id: `course-shard-${index + 1}`,
    index: index + 1,
    total: COLLECTIBLE_COUNT,
    platformId: piece.id,
    position: [
      round(piece.position[0] + LATERAL_OFFSETS[index]),
      round(piece.position[1] + COLLECTIBLE_HEIGHT),
      round(piece.position[2])
    ]
  }));
}

export function collectibleDistanceSquared(first, second) {
  const dx = Number(first?.x || 0) - Number(second?.x || 0);
  const dy = Number(first?.y || 0) - Number(second?.y || 0);
  const dz = Number(first?.z || 0) - Number(second?.z || 0);
  return dx * dx + dy * dy + dz * dz;
}

function browserRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.AFRAME || !window.THREE) return;

  const runtime = {
    placements: [],
    collected: new Set(),
    root: null,

    collect(id, index, total) {
      if (!id || this.collected.has(id)) return false;
      this.collected.add(id);
      const count = this.collected.size;
      const detail = { id, index, total, collected: count };
      window.dispatchEvent(new CustomEvent("collectible-collected", { detail }));

      const worldStatus = document.getElementById("world-status");
      if (worldStatus) {
        worldStatus.setAttribute(
          "value",
          count >= total ? "ALL SHARDS COLLECTED" : `Shard ${count}/${total} collected`
        );
      }
      return true;
    },

    reset() {
      this.collected.clear();
      this.root?.querySelectorAll("[course-collectible]").forEach((entity) => {
        const component = entity.components?.["course-collectible"];
        if (component?.resetCollectible) component.resetCollectible();
        else {
          entity.setAttribute("visible", true);
          entity.object3D?.scale?.set?.(1, 1, 1);
        }
      });
      window.dispatchEvent(new CustomEvent("collectibles-ready", {
        detail: { total: this.placements.length, collected: 0 }
      }));
    }
  };

  window.funFunCollectibles = runtime;

  if (!AFRAME.components["course-collectible"]) {
    AFRAME.registerComponent("course-collectible", {
      schema: {
        rig: { type: "selector" },
        head: { type: "selector" },
        collectibleId: { default: "" },
        index: { default: 0 },
        total: { default: COLLECTIBLE_COUNT },
        radius: { default: 0.82 }
      },

      init: function () {
        this.collected = false;
        this.lastCheck = 0;
        this.collectiblePosition = new THREE.Vector3();
        this.playerPosition = new THREE.Vector3();
        this.resetCollectible = this.resetCollectible.bind(this);
      },

      tick: function (time) {
        if (this.collected || time - this.lastCheck < 70) return;
        this.lastCheck = time;
        const target = this.data.head || this.data.rig;
        if (!target?.object3D) return;

        this.el.object3D.getWorldPosition(this.collectiblePosition);
        target.object3D.getWorldPosition(this.playerPosition);
        if (collectibleDistanceSquared(this.collectiblePosition, this.playerPosition) > this.data.radius ** 2) return;

        const accepted = window.funFunCollectibles?.collect(
          this.data.collectibleId,
          this.data.index,
          this.data.total
        );
        if (!accepted) return;

        this.collected = true;
        this.el.removeAttribute("animation__collect");
        this.el.setAttribute(
          "animation__collect",
          "property: scale; to: 0 0 0; dur: 170; easing: easeInQuad"
        );
        window.setTimeout(() => {
          if (this.collected) this.el.setAttribute("visible", false);
        }, 190);
      },

      resetCollectible: function () {
        this.collected = false;
        this.el.removeAttribute("animation__collect");
        this.el.setAttribute("visible", true);
        this.el.object3D.scale.set(1, 1, 1);
      }
    });
  }

  function createVisual(placement) {
    const holder = document.createElement("a-entity");
    holder.id = placement.id;
    holder.setAttribute("position", placement.position.join(" "));
    holder.setAttribute(
      "course-collectible",
      `rig: #player-rig; head: #player-camera; collectibleId: ${placement.id}; index: ${placement.index}; total: ${placement.total}; radius: 0.82`
    );

    const gem = document.createElement("a-entity");
    gem.setAttribute("geometry", "primitive: octahedron; radius: 0.28");
    gem.setAttribute(
      "material",
      "color: #FDE047; emissive: #F59E0B; emissiveIntensity: 0.72; metalness: 0.15; roughness: 0.28"
    );
    gem.setAttribute(
      "animation__spin",
      "property: rotation; to: 0 360 0; loop: true; dur: 1500; easing: linear"
    );
    gem.setAttribute(
      "animation__pulse",
      "property: scale; dir: alternate; from: 0.88 0.88 0.88; to: 1.08 1.08 1.08; loop: true; dur: 720; easing: easeInOutSine"
    );
    holder.appendChild(gem);

    const ring = document.createElement("a-entity");
    ring.setAttribute(
      "geometry",
      "primitive: torus; radius: 0.39; radiusTubular: 0.025; segmentsRadial: 20; segmentsTubular: 8"
    );
    ring.setAttribute("rotation", "90 0 0");
    ring.setAttribute("material", "color: #FFFFFF; emissive: #FDE68A; emissiveIntensity: 0.5; opacity: 0.78; transparent: true");
    ring.setAttribute(
      "animation__ring",
      "property: rotation; to: 90 360 0; loop: true; dur: 2200; easing: linear"
    );
    holder.appendChild(ring);
    return holder;
  }

  function buildCollectibles() {
    const manifest = window.funFunCourseManifest;
    const courseRoot = document.getElementById("course-root");
    if (!manifest || !courseRoot) return false;

    document.getElementById("course-collectibles")?.remove();
    const placements = chooseCollectiblePlacements(manifest);
    const root = document.createElement("a-entity");
    root.id = "course-collectibles";
    root.setAttribute("data-collectible-count", String(placements.length));
    for (const placement of placements) root.appendChild(createVisual(placement));
    courseRoot.appendChild(root);

    runtime.placements = placements;
    runtime.collected.clear();
    runtime.root = root;
    window.dispatchEvent(new CustomEvent("collectibles-ready", {
      detail: { total: placements.length, collected: 0, placements }
    }));
    return true;
  }

  window.addEventListener("course-built", () => {
    window.setTimeout(buildCollectibles, 0);
  });
  window.addEventListener("course-request-reset", () => {
    window.setTimeout(() => runtime.reset(), 0);
  });
  window.addEventListener("run-grade", (event) => {
    window.setTimeout(() => {
      const worldStatus = document.getElementById("world-status");
      if (!worldStatus) return;
      const detail = event.detail || {};
      const suffix = detail.fullClear ? " — FULL CLEAR" : "";
      worldStatus.setAttribute("value", `COURSE COMPLETE — GRADE ${detail.grade || "CLEAR"}${suffix}`);
    }, 0);
  });

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(buildCollectibles, 0);
    window.setTimeout(buildCollectibles, 250);
  });
}

browserRuntime();

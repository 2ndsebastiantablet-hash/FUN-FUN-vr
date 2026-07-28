// Visible-model + invisible-solid twin collision system.
// Each approved structure is loaded twice: one normal KayKit model for rendering
// and one hidden copy that supplies its measured bounds. The hidden copy is
// converted into an optimized compound of invisible solid bodies for both the
// Gorilla locomotion controller and the real rigid-body physics world.

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function collisionTwinParts(profile, bounds = { center: { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 } }) {
  const center = bounds.center || { x: 0, y: 0, z: 0 };
  const size = bounds.size || { x: 1, y: 1, z: 1 };
  const width = Math.max(0.1, finiteNumber(size.x, 1));
  const height = Math.max(0.1, finiteNumber(size.y, 1));
  const depth = Math.max(0.08, finiteNumber(size.z, 1));
  const cx = finiteNumber(center.x);
  const cy = finiteNumber(center.y);
  const cz = finiteNumber(center.z);

  if (profile === "hoop") {
    const sideWidth = width * 0.19;
    const capHeight = height * 0.17;
    const innerWidth = width - sideWidth * 2;
    const innerHeight = height - capHeight * 2;
    return [
      { name: "left", position: { x: cx - (width - sideWidth) * 0.5, y: cy, z: cz }, size: { x: sideWidth, y: innerHeight, z: depth } },
      { name: "right", position: { x: cx + (width - sideWidth) * 0.5, y: cy, z: cz }, size: { x: sideWidth, y: innerHeight, z: depth } },
      { name: "top", position: { x: cx, y: cy + (height - capHeight) * 0.5, z: cz }, size: { x: innerWidth, y: capHeight, z: depth } },
      { name: "bottom", position: { x: cx, y: cy - (height - capHeight) * 0.5, z: cz }, size: { x: innerWidth, y: capHeight, z: depth } }
    ];
  }

  if (profile === "arch") {
    const sideWidth = width * 0.205;
    const lowerHeight = height * 0.64;
    const shoulderHeight = height * 0.19;
    const topHeight = height * 0.19;
    const openingWidth = width - sideWidth * 2;
    return [
      { name: "left-pillar", position: { x: cx - (width - sideWidth) * 0.5, y: cy - height * 0.12, z: cz }, size: { x: sideWidth, y: lowerHeight, z: depth } },
      { name: "right-pillar", position: { x: cx + (width - sideWidth) * 0.5, y: cy - height * 0.12, z: cz }, size: { x: sideWidth, y: lowerHeight, z: depth } },
      { name: "left-shoulder", position: { x: cx - openingWidth * 0.38, y: cy + height * 0.27, z: cz }, size: { x: width * 0.28, y: shoulderHeight, z: depth } },
      { name: "right-shoulder", position: { x: cx + openingWidth * 0.38, y: cy + height * 0.27, z: cz }, size: { x: width * 0.28, y: shoulderHeight, z: depth } },
      { name: "top", position: { x: cx, y: cy + (height - topHeight) * 0.5, z: cz }, size: { x: openingWidth * 0.72, y: topHeight, z: depth } }
    ];
  }

  return [{ name: "full", position: { x: cx, y: cy, z: cz }, size: { x: width, y: height, z: depth } }];
}

function registerBrowserComponent() {
  if (typeof window === "undefined" || !window.AFRAME || !window.THREE) return;
  if (AFRAME.components["paired-model-collider"]) return;

  AFRAME.registerComponent("paired-model-collider", {
    schema: {
      profile: { default: "arch", oneOf: ["arch", "hoop", "box"] },
      idPrefix: { default: "collision-twin" },
      minimumDepth: { default: 0.18 }
    },
    init: function () {
      this.ready = false;
      this.onModelLoaded = this.buildFromTwin.bind(this);
      this.el.addEventListener("model-loaded", this.onModelLoaded);
      if (this.el.getObject3D("mesh")) this.buildFromTwin();
    },
    remove: function () {
      this.el.removeEventListener("model-loaded", this.onModelLoaded);
      this.proxies?.forEach((proxy) => proxy.remove());
    },
    buildFromTwin: function () {
      if (this.ready || !this.el.object3D?.parent) return;
      this.el.object3D.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(this.el.object3D);
      if (box.isEmpty()) return;
      const worldCenter = box.getCenter(new THREE.Vector3());
      const worldSize = box.getSize(new THREE.Vector3());
      worldSize.z = Math.max(worldSize.z, Math.max(0.08, this.data.minimumDepth));

      const parentObject = this.el.object3D.parent;
      const localCenter = parentObject.worldToLocal(worldCenter.clone());
      const parentScale = new THREE.Vector3();
      parentObject.getWorldScale(parentScale);
      const localSize = {
        x: worldSize.x / Math.max(1e-6, Math.abs(parentScale.x)),
        y: worldSize.y / Math.max(1e-6, Math.abs(parentScale.y)),
        z: worldSize.z / Math.max(1e-6, Math.abs(parentScale.z))
      };
      const parts = collisionTwinParts(this.data.profile, {
        center: { x: localCenter.x, y: localCenter.y, z: localCenter.z },
        size: localSize
      });

      this.proxies = parts.map((part, index) => {
        const proxy = document.createElement("a-box");
        proxy.id = `${this.data.idPrefix}-${part.name}-${index}`;
        proxy.setAttribute("data-collision-twin-proxy", this.data.profile);
        proxy.setAttribute("position", `${part.position.x} ${part.position.y} ${part.position.z}`);
        proxy.setAttribute("width", String(part.size.x));
        proxy.setAttribute("height", String(part.size.y));
        proxy.setAttribute("depth", String(part.size.z));
        proxy.setAttribute("material", "opacity: 0.001; transparent: true; depthWrite: false; color: #FFFFFF");
        proxy.setAttribute("locomotion-collider", `type: box; size: ${part.size.x} ${part.size.y} ${part.size.z}`);
        proxy.setAttribute("static-body", "shape: box");
        this.el.parentElement.appendChild(proxy);
        return proxy;
      });

      this.el.setAttribute("visible", false);
      this.ready = true;
      const rig = document.getElementById("player-rig");
      const locomotion = rig?.components?.["gorilla-locomotion"];
      if (locomotion) locomotion.colliders = Array.from(document.querySelectorAll("[locomotion-collider]"));
      window.dispatchEvent(new CustomEvent("paired-collider-ready", {
        detail: { id: this.el.id, profile: this.data.profile, proxyCount: this.proxies.length }
      }));
    }
  });
}

registerBrowserComponent();

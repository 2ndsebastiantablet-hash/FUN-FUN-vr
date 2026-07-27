// This file intentionally stays small and browser-only.
// Add future FUN-FUN VR scene behavior here without introducing a build step.

window.addEventListener("DOMContentLoaded", function () {
  const scene = document.querySelector("a-scene");
  const note = document.getElementById("note");
  const target = document.getElementById("test-target");
  const worldStatus = document.getElementById("world-status");

  if (!scene || !note) {
    return;
  }

  const defaultNote = note.textContent.trim();
  let targetActive = false;

  scene.addEventListener("enter-vr", function () {
    note.textContent = "VR session active. Point either Quest controller at the glowing cube and pull the trigger.";
  });

  scene.addEventListener("exit-vr", function () {
    note.textContent = defaultNote;
  });

  if (target) {
    target.addEventListener("click", function () {
      targetActive = !targetActive;
      target.setAttribute("color", targetActive ? "#22C55E" : "#7C3AED");

      if (worldStatus) {
        worldStatus.setAttribute(
          "value",
          targetActive ? "Quest trigger input detected" : "Pull a trigger on the glowing cube"
        );
      }
    });
  }
});

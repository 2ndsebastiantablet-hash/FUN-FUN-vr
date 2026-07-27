// Small browser-side helper adapted from the pinned locomotion template.
// The movement system itself is loaded from the exact requested source commit.

window.addEventListener("DOMContentLoaded", function () {
  const scene = document.querySelector("a-scene");
  const note = document.getElementById("note");

  if (!scene || !note) {
    return;
  }

  const defaultNote = note.textContent.trim();

  scene.addEventListener("enter-vr", function () {
    note.textContent = "Push against the floor or blocks with your tracked hands. Thumbsticks and teleport are intentionally disabled.";
  });

  scene.addEventListener("exit-vr", function () {
    note.textContent = defaultNote;
  });
});

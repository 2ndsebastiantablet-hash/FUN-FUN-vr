# FUN-FUN VR

A minimal static WebXR scene for Meta Quest Browser using A-Frame, plain JavaScript, and Gorilla Tag-style hand locomotion.

## Movement source

The movement system is based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the template's original `gorilla-locomotion.js` directly from that exact commit through a commit-pinned jsDelivr URL. This preserves the source movement logic instead of recreating it.

## Preserved movement features

- tracked Quest controllers
- visible hand spheres
- hand pushing against the floor and box surfaces
- one-hand and two-hand launch behavior
- upward bounce from strong pushes
- gravity
- separate air and ground drag
- floor clamping
- hand collision and player body collision
- normal A-Frame Enter VR button
- no thumbstick locomotion
- no teleport locomotion

## Project files

- `index.html` — one playable entry point, scene, rig, controllers, colliders, and debug panel
- `main.js` — small VR session status helper
- `.nojekyll` — keeps GitHub Pages serving the static files directly

## Meta Quest test

1. Open the GitHub Pages HTTPS URL in Meta Quest Browser.
2. Press **Enter VR**.
3. Confirm the pink and blue hand spheres follow the left and right Quest controllers.
4. Push a hand down and backward against the floor to move forward.
5. Push harder and release to test bounce and launch behavior.
6. Push against the colored blocks to move away from them.

## Hosting

GitHub Pages should remain configured as:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

## Technical notes

- A-Frame 1.7.0
- WebXR local-floor reference space
- HTTPS required for immersive WebXR
- no npm
- no bundler
- no build step

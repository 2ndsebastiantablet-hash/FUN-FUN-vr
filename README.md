# FUN-FUN VR

A minimal static WebXR scene for Meta Quest Browser using A-Frame, plain JavaScript, and Gorilla Tag-style hand locomotion.

## Movement source

The movement system is based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the template's original `gorilla-locomotion.js` from a commit-pinned jsDelivr URL. The scene wiring and playtest safety code adapt that source movement system without replacing its hand-push, bounce, launch, gravity, drag, controller tracking, or collision behavior.

## Pre-playtest hardening

The current build includes:

- startup checks for the pinned locomotion script and collision components
- HTTPS and immersive-VR support checks
- visible readiness/error messages before entering VR
- left/right Quest controller connection status in the scene
- a controller-tracking stabilization delay when VR starts
- removal of the per-frame debug text panel to reduce Quest rendering and text-update overhead
- desktop camera-height compensation without changing headset height in VR
- safety rails around the movement test area
- automatic reset if the player position becomes invalid or leaves the test area
- velocity clearing after tab/headset visibility changes and VR exits

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

- `index.html` — one playable entry point, scene, rig, controllers, colliders, status text, and safety rails
- `main.js` — preflight checks, controller status, VR lifecycle handling, and playtest safety reset
- `PLAYTEST_CHECKLIST.md` — the recommended first-headset test order
- `.nojekyll` — keeps GitHub Pages serving the static files directly

## Meta Quest test

1. Open the GitHub Pages HTTPS URL in Meta Quest Browser.
2. Confirm the page says **Preflight passed**.
3. Press **Enter VR**.
4. Wait for both colored hand spheres to follow the controllers.
5. Push a hand down and backward against the floor to move forward.
6. Push harder and release to test bounce and launch behavior.
7. Push against each colored block and each boundary wall.
8. Follow `PLAYTEST_CHECKLIST.md` and record anything that feels wrong.

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

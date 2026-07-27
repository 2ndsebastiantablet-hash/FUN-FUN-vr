# FUN-FUN VR

A static WebXR game for Meta Quest Browser using A-Frame, plain JavaScript, Gorilla Tag-style hand locomotion, and WebRTC peer-to-peer multiplayer.

## Movement source

The movement system is based on the exact pinned template requested for this project:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/gorilla-tag-locomotion`

The game loads the template's original `gorilla-locomotion.js` from a commit-pinned jsDelivr URL. The scene wiring and playtest safety code adapt that source movement system without replacing its hand-push, bounce, launch, gravity, drag, controller tracking, or collision behavior.

## Peer-to-peer multiplayer

The current build supports private rooms for up to four players.

- one player creates a room and receives a six-character room code
- other players enter the code and join before pressing **Enter VR**
- WebRTC data channels send head and hand poses directly between connected players
- each remote player appears as a head, body, two hands, and name label
- pose updates are sent about 15 times per second and smoothed visually between updates
- rooms use a small full-mesh connection layout so every player sends directly to every other player
- the host closes the room when leaving
- invalid room codes, full rooms, missing WebRTC support, and connection failures display readable errors

PeerJS is used for connection discovery/signaling. The realtime player pose data travels over browser-to-browser WebRTC connections. No game-state or pose server is included in this static GitHub Pages build.

### Multiplayer limitations

- This first version synchronizes avatars only. It does not yet synchronize physics objects, scores, voice chat, or shared game rules.
- WebRTC can fail on unusually restrictive networks because this static version does not include a dedicated TURN relay server.
- A room exists only while its host keeps the page open.
- Players should join the room before entering VR because the room controls are browser UI.

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

- `index.html` — playable scene, VR rig, room UI, controller setup, colliders, status text, and remote-player container
- `main.js` — preflight checks, controller status, VR lifecycle handling, and safety reset
- `multiplayer.js` — PeerJS/WebRTC room flow, connection mesh, pose sync, remote avatars, and disconnect handling
- `PLAYTEST_CHECKLIST.md` — recommended movement and multiplayer headset test order
- `.nojekyll` — keeps GitHub Pages serving the static files directly

## Create and join a room

1. Open the GitHub Pages HTTPS URL on each Quest.
2. On the first Quest, enter a player name and press **Create Room**.
3. Share the displayed six-character code.
4. On every other Quest, enter a name and the room code, then press **Join**.
5. Confirm the player count increases on every connected device.
6. Press **Enter VR** on each Quest.
7. Wait for both local hand spheres and the remote avatars to appear.

## Meta Quest movement test

1. Confirm the page says **Preflight passed**.
2. Press **Enter VR**.
3. Wait for both colored hand spheres to follow the controllers.
4. Push a hand down and backward against the floor to move forward.
5. Push harder and release to test bounce and launch behavior.
6. Push against each colored block and boundary wall.
7. Follow `PLAYTEST_CHECKLIST.md` and record anything that feels wrong.

## Hosting

GitHub Pages should remain configured as:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

## Technical notes

- A-Frame 1.7.0
- PeerJS 1.5.5
- WebXR local-floor reference space
- HTTPS required for immersive WebXR and WebRTC
- no npm
- no bundler
- no build step

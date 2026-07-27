# FUN-FUN VR

A minimal static WebXR scene for Meta Quest Browser using A-Frame and plain JavaScript.

## Template source

This project is adapted from:

- Repository: `2ndsebastiantablet-hash/feeble`
- Commit: `28a426aa6ade789320e2202cfa8d2fe61b46b539`
- Folder: `templates/simple-vr-scene`

The original template's A-Frame scene structure, player rig, camera, lighting, and built-in Enter VR flow were preserved as the foundation.

## Files

- `index.html` — the complete A-Frame/WebXR scene and one clear playable entry point
- `main.js` — small scene behavior for VR status and the trigger test cube
- `.nojekyll` — keeps GitHub Pages serving the static files directly

## Meta Quest test

1. Host the repository over HTTPS.
2. Open the hosted URL in Meta Quest Browser.
3. Press **Enter VR**.
4. Point either Quest controller at the glowing cube.
5. Pull the trigger.
6. Confirm the cube turns green and the in-world text reports that trigger input was detected.

## GitHub Pages

In the repository, open **Settings → Pages** and select:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

Save the setting and wait for GitHub to publish the HTTPS site.

## Technical notes

- A-Frame 1.7.0
- No npm
- No framework beyond A-Frame
- No bundler or build tool
- Relative local file paths
- Quest controller laser interaction
- WebXR local-floor reference space

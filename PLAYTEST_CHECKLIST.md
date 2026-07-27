# FUN-FUN VR — Quest Playtest Checklist

Use this order so movement and multiplayer problems are easier to identify.

## 1. Page and VR entry

- Open the GitHub Pages URL in Meta Quest Browser.
- Confirm the page reports **Preflight passed** rather than a red setup error.
- Confirm the normal **Enter VR** button appears.
- Enter VR and verify the scene appears without a black screen or loading loop.

## 2. Controller tracking

- Hold both controllers still for one second after entering VR.
- Confirm the pink sphere follows the left controller.
- Confirm the blue sphere follows the right controller.
- Confirm the spheres do not begin far away, shake violently, or launch the player on entry.

## 3. Floor pushing

- Slowly press one hand into the virtual floor and move it backward.
- Confirm the player moves forward in the opposite direction of the hand push.
- Repeat with the other hand.
- Repeat with both hands and compare the strength.

## 4. Bounce and launch

- Push downward and backward more quickly, then release.
- Confirm a stronger push creates a stronger launch.
- Confirm two-hand launches are stronger than one-hand launches.
- Confirm gravity brings the player back down.
- Confirm momentum decreases rather than continuing forever.

## 5. Collision tests

- Push off the purple center block.
- Push off the orange tall block.
- Push off the blue low block.
- Approach each boundary wall and confirm the body does not pass straight through it.
- Confirm hands visually stop at surfaces instead of disappearing deeply inside them.

## 6. Solo multiplayer diagnostic — available now

- Stay outside VR and make sure you are not connected to a room.
- Press **Run Solo Network Test**.
- Confirm a temporary test avatar appears briefly in the scene.
- Confirm the status reports that PeerJS signaling, a real WebRTC data-channel exchange, and avatar rendering passed.
- Run the test a second time to confirm cleanup works and no duplicate test avatar remains.
- Turn Wi-Fi off, run it once, and confirm a readable timeout or connection error appears rather than an endless loading state. Turn Wi-Fi back on afterward.
- Confirm a failed multiplayer test does not prevent entering and using single-player VR.

## 7. Multiplayer room setup — when another tester is available

- Keep both Quest browsers outside VR while setting up the room.
- On Quest A, enter a name and press **Create Room**.
- Confirm a six-character room code appears.
- On Quest B, enter a different name and the room code, then press **Join**.
- Confirm both devices report `2 / 4 players`.
- Add Quest C or D when available and confirm every device shows the same total.
- Try an incorrect room code and confirm a readable error appears within about 12 seconds.
- Leave and rejoin once before entering VR.

## 8. Remote avatar sync — when another tester is available

- Enter VR on all connected devices.
- Confirm each other player has a colored head and body, pink left hand, blue right hand, and readable name label.
- Walk around the avatar and confirm the name label is visible from both sides.
- Move each hand independently and confirm the matching remote hand moves.
- Turn and crouch; confirm the remote head and body follow.
- Move using Gorilla locomotion and confirm the avatar travels through the same world.
- Look for large jumps, frozen avatars, swapped hands, duplicate avatars, or noticeable multi-second delay.

## 9. Multiplayer disconnect and recovery — when another tester is available

- Briefly interrupt one guest's Wi-Fi and confirm the other room members do not all get disconnected immediately.
- Restore Wi-Fi and note whether the guest needs to leave and rejoin.
- Have one guest leave normally and confirm their avatar disappears for everyone else.
- Have the guest rejoin and confirm the avatar returns only once.
- Have the host leave and confirm guests receive a room-closed message.
- Create a new room afterward and confirm multiplayer works without refreshing.
- Test once with both devices on the same Wi-Fi and once on different networks when practical.

## 10. Safety and comfort

- Confirm the instruction and network-status sign is readable but does not block the main view.
- Confirm no large debug panel follows the camera.
- Move aggressively toward the edge; confirm walls or the automatic reset prevent becoming permanently lost.
- Exit VR and enter again; confirm the player returns to the start, movement still works, and the room remains connected.

## Report these details with any bug

- Quest model and Meta Quest Browser version.
- Whether the solo network test passed on that device.
- How many players were connected.
- Whether the affected device was the host or a guest.
- Whether all devices were on the same Wi-Fi.
- Exact status or error message shown.
- What happened immediately before the problem.
- Whether the problem happens every time or only sometimes.
- A screenshot or Quest recording when possible.

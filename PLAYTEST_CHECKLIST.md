# FUN-FUN VR — Quest Playtest Checklist

Use this order so model-loading, movement, platforming, safety, and multiplayer problems are easier to isolate.

## 1. Page and course loading

- Open the GitHub Pages URL in Meta Quest Browser.
- Confirm the page reports **Preflight passed** rather than a red setup error.
- Confirm the course panel eventually reports that all KayKit models loaded.
- Confirm the normal **Enter VR** button appears.
- Verify the map contains blue platforms, a blue ramp, a green spring pad, and a finish gate.
- If a model fails, confirm a colored wireframe fallback appears instead of an invisible platform.

## 2. VR entry and controller tracking

- Enter VR and verify the scene appears without a black screen or loading loop.
- Hold both controllers still for one second.
- Confirm the pink sphere follows the left controller.
- Confirm the blue sphere follows the right controller.
- Confirm entering VR does not place the player below the course or cause an immediate launch.
- Confirm the player starts on the first blue platform.

## 3. Standard platform pushing

- Push one hand down and backward against the first platform.
- Confirm the player moves in the opposite direction of the hand push.
- Repeat with the other hand.
- Repeat with both hands.
- Confirm two-hand launches are stronger than one-hand launches.
- Confirm the platform top behaves like a floor rather than a wall.
- Confirm the hands stop at the platform surface instead of passing deeply through it.

## 4. Gaps, gravity, and landing

- Cross from the start platform to the second platform.
- Confirm the first gap is reachable without an extreme launch.
- Intentionally jump short and confirm gravity pulls the player into the void.
- Confirm the game returns the player to the latest checkpoint rather than leaving them lost.
- Land near a platform edge and confirm the body does not fall through the top.
- Approach the side of a platform and confirm the body does not pass straight through it.

## 5. Stepped slope

- Reach the large blue ramp.
- Push upward along the visible ramp.
- Confirm the ten hidden collision steps feel reasonably continuous.
- Look for sudden sideways pushes, hand snagging, shaking, or the body becoming stuck between steps.
- Confirm the player can reach the high platform at the top.
- Confirm the first green checkpoint marker activates there.

## 6. Spring pad

- Reach the green spring pad.
- Step or land on the center of the pad.
- Confirm it launches the player upward and toward the next high platform.
- Confirm the spring does not repeatedly fire every frame.
- Confirm missing the landing returns the player to the first checkpoint.
- Land on the high platform and confirm the second checkpoint activates.
- Fall afterward and confirm the player returns to the second checkpoint.

## 7. Final platforms and finish

- Cross the two high platforms and the descending platform.
- Confirm the height drop does not force the player through the lower platform.
- Pass through the scaled finish gate.
- Confirm the course reports completion and a finish time.
- Restart the course outside VR and confirm:
  - the timer clears,
  - checkpoint progress returns to zero,
  - the finish trigger can activate again,
  - the player returns to the first platform.
- Complete a second run and confirm the browser keeps the faster local best time.

## 8. Comfort and safety

- Move aggressively sideways and upward.
- Confirm leaving the course bounds causes a checkpoint reset.
- Confirm falling below the map resets before the player remains in the void.
- Exit VR and enter again.
- Confirm the player returns to the latest checkpoint and movement still works.
- Confirm no large debug panel follows the camera.
- Confirm the start sign is readable without blocking the route.

## 9. Solo multiplayer diagnostic

- Stay outside VR and make sure you are not connected to a room.
- Press **Run Solo Network Test**.
- Confirm a temporary test avatar appears briefly.
- Confirm PeerJS signaling, a real WebRTC data-channel exchange, and avatar rendering pass.
- Run the test a second time and confirm no duplicate test avatar remains.
- Turn Wi-Fi off, run once, and confirm a readable timeout or connection error appears instead of endless loading.
- Turn Wi-Fi back on.
- Confirm a failed multiplayer test does not prevent solo platforming.

## 10. Multiplayer room setup — when another tester is available

- Keep both Quest browsers outside VR while setting up the room.
- On Quest A, enter a name and press **Create Room**.
- Confirm a six-character room code appears.
- On Quest B, enter a different name and the room code, then press **Join**.
- Confirm both devices report `2 / 4 players`.
- Enter VR on both devices.
- Confirm both players see the same deterministic platform layout.
- Confirm remote avatars stay aligned with the platforms as players climb and launch.
- Confirm checkpoint and finish messages are currently local to each player; shared course-state synchronization is not implemented yet.

## 11. Multiplayer disconnect and recovery — when another tester is available

- Briefly interrupt one guest’s Wi-Fi and confirm the other room members do not all disconnect immediately.
- Restore Wi-Fi and note whether the guest must leave and rejoin.
- Have one guest leave normally and confirm their avatar disappears.
- Have the guest rejoin and confirm the avatar returns once without duplicates.
- Have the host leave and confirm guests receive a room-closed message.
- Create a new room afterward without refreshing.
- Test once on the same Wi-Fi and once on different networks when practical.

## Report these details with any bug

- Quest model and Meta Quest Browser version.
- Exact platform or mechanic involved.
- Current checkpoint number.
- Whether the player was pushing with one hand or two.
- Whether the player was rising, falling, or standing.
- Whether the KayKit model or a wireframe fallback was visible.
- Whether multiplayer was active and whether the device was host or guest.
- Exact status or error message.
- Whether the problem happens every time or intermittently.
- Screenshot or Quest recording when possible.

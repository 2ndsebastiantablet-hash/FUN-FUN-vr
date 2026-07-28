# FUN-FUN VR — Quest Playtest Checklist

Use this order so loading, camera height, movement, dynamic platforms, collectibles, generation, safety, and multiplayer problems are easy to isolate.

## 1. Camera height and standing stability

- Open the main GitHub Pages URL and enter VR.
- Confirm the camera remains at the tuned `0.12 m` rig height.
- Stand normally and confirm both controller spheres can reach the platform without excessive crouching.
- Hold both controllers still for several seconds.
- Confirm the player settles completely instead of sliding continuously across the platform.
- Perform a strong one-hand and two-hand launch and confirm airborne distance is not shortened by grounded braking.
- Exit and re-enter VR, then confirm the same camera height returns.

## 2. Calibration page regression

- Confirm **Calibration** is selected.
- Confirm the handcrafted ramp and spring course still appears.
- Confirm the page reports **Preflight passed** rather than a red error.
- Confirm platform pushes, ramp, spring, checkpoints, finish, restart, shards, and grading still work.
- Confirm the new **Moving Platform Lab** link appears without changing the calibration map.

## 3. Moving-platform lab loading

- Open `mechanics-lab.html` from the Moving Platform Lab link.
- Confirm the page reports that the lab passed preflight.
- Confirm the route contains ten visible pieces, two green checkpoint rings, three yellow-ringed moving platforms, and a finish gate.
- Confirm the three instruction signs identify the forward shuttle, vertical lift, and side shuttle.
- Confirm KayKit models load or collision-matched wireframe fallbacks remain visible.
- Enter VR and wait for both controller spheres to track before moving.

## 4. Forward shuttle

- Wait on the second static platform without jumping into the void.
- Confirm the first moving platform travels forward and backward smoothly.
- Confirm it slows to a stop at each endpoint instead of instantly reversing.
- Step onto it and stand completely still.
- Confirm the platform carries the player without the player sliding off or being left behind.
- Confirm platform motion does not create an unexpected hand push or launch.
- Push deliberately while riding and confirm the real hand push still works.
- Step onto the landing platform and confirm checkpoint 1 activates.

## 5. Vertical lift

- Wait at the lift approach until the vertical platform reaches the lower position.
- Step onto it and remain still while it rises.
- Confirm the player rises with the platform and does not clip into or fall through it.
- Ride it downward once and confirm downward carry remains stable.
- Jump or push away while it is moving and confirm the deliberate launch is not cancelled.
- Reach the upper landing and confirm checkpoint 2 activates.
- Fall after checkpoint 2 and confirm recovery returns to the upper landing rather than a moving surface.

## 6. Side shuttle and finish

- Approach the smaller side-to-side platform.
- Confirm its visible model, yellow ring, and collider remain aligned throughout the motion.
- Time the crossing and confirm the smaller platform still carries the player when centered on it.
- Confirm standing near an edge does not cause incorrect carry after stepping off.
- Reach the final platform and pass through the finish gate.
- Confirm the lab reports completion and a finish time.
- Restart the lab and confirm all three moving platforms return to their defined starting phases, checkpoints clear, and the player returns to the start.

## 7. Collectible behavior

- Return to the calibration or generated page.
- Walk through the first shard and confirm it shrinks and disappears once.
- Confirm the run-performance line changes from `0/3 shards` to `1/3 shards`.
- Collect the other two shards and confirm the world status reports all shards collected.
- Finish the course and confirm the result includes **FULL CLEAR**.
- Restart the course and confirm all three shards reappear.
- Finish another run while intentionally missing one shard and confirm the course still completes without **FULL CLEAR**.
- Confirm shard visuals never push, block, snag, or change movement.

## 8. Generated page and seed controls

- Exit VR before changing modes.
- Select **Generated** and press **Load Course**.
- Confirm the browser opens `generated.html` with `mode=generated` and a seed in the URL.
- Confirm the in-world sign shows the seed and an eight-character map checksum.
- Press **Copy Course Link** and confirm it contains the same seed.
- Press **New Seed**, then **Load Course**, and confirm the layout changes.
- Reopen the original copied link and confirm the original layout, checksum, and shard positions return.
- Confirm no moving platforms appear in generated mode yet.

## 9. Generated course structure and locomotion

- Confirm the route contains ordinary blue platforms, two green checkpoint rings, a green spring pad, a finish gate, and three yellow shards.
- Confirm all KayKit models load or a visible wireframe fallback appears.
- Confirm no overlapping platforms, backwards sections, impossible sideways jumps, or hidden platforms.
- Confirm each shard is above a real landing platform rather than floating over the void.
- Push from the starting platform with one hand and then two hands.
- Test every side-step and raised platform.
- Confirm hands do not snag at the seam between split collision boxes.
- Intentionally miss jumps and confirm gravity and checkpoint recovery work.
- Stand still after landing and confirm unwanted horizontal velocity reaches zero.

## 10. Checkpoints, spring, finish, and grading

- Reach checkpoint 1 and confirm the status changes.
- Fall immediately afterward and confirm you return to checkpoint 1 at the tuned camera height.
- Step onto the spring and confirm it launches forward and upward only once.
- Land on checkpoint 2 and confirm it activates.
- Fall again and confirm you return to checkpoint 2 at the same height.
- Pass through the finish gate and confirm the correct seed and finish time.
- Confirm the run grade matches the number of falls.
- Confirm **FULL CLEAR** appears only after collecting all three shards.
- Restart and confirm timer, checkpoints, fall count, shards, and visibility reset while the map stays the same.

## 11. Seed stress test

Test at least five seeds:

- `FUNFUN01`
- `LEFTTEST`
- `RIGHTTEST`
- `HEIGHT01`
- one random seed generated by the page

For each seed, record whether every jump and shard is reachable, the spring is reliable, and the checksum and shard positions remain stable after reopening the link.

## 12. Solo multiplayer diagnostic

- Stay outside VR and disconnect from any room.
- Press **Run Solo Network Test**.
- Confirm signaling, WebRTC data exchange, and avatar rendering pass.
- Run it twice and confirm no duplicate test avatar remains.
- Confirm a failed network test does not prevent solo calibration or generated play.

## 13. Multiplayer generated map — when another tester is available

- On device A, load a generated seed and copy the exact course link.
- Open that exact link on device B before creating or joining a room.
- Confirm both devices show the same seed, map checksum, and shard positions.
- Create and join the multiplayer room.
- Enter VR on both devices.
- Confirm remote avatars align with the same platforms throughout the route.
- Remember that checkpoints, shard collection, spring events, timers, completion, and restart remain local.
- Moving-platform multiplayer is not ready and should not be evaluated from the solo mechanics lab.

## 14. Disconnect and recovery — when another tester is available

- Interrupt one guest’s Wi-Fi briefly and confirm the other player is not immediately removed from their own course.
- Restore Wi-Fi and rejoin if required.
- Confirm an avatar disappears once when a guest leaves and appears once when they rejoin.
- Have the host leave and confirm guests receive the room-closed message.

## Report these details with any bug

- Quest model and Meta Quest Browser version.
- Page: calibration, generated, asset gallery, or moving-platform lab.
- Exact seed and map checksum when generated.
- Moving-platform ID: forward shuttle, vertical lift, or side shuttle.
- Whether the player was standing still, pushing, jumping, rising, or descending.
- Whether the platform was moving toward its start or end position.
- Camera too high, too low, or comfortable.
- Whether idle sliding occurred while both hands were still.
- Current checkpoint number.
- Model or wireframe fallback visible.
- Multiplayer host or guest status.
- Exact status/error message.
- Whether the bug repeats consistently.
- Screenshot or Quest recording when possible.

# Phase 3 — Falling Platform Laboratory

Falling platforms are tested in a separate Quest laboratory before they are allowed into generated courses.

## Laboratory route

The lab contains five fragile platforms:

1. Tutorial platform with a long 1.1-second warning
2. Quick platform with a 0.65-second warning
3. First chain platform with a 0.8-second warning
4. Second chain platform with a 0.5-second warning
5. Final platform with a 0.42-second warning

The route also contains two checkpoints, one finish platform, and one finish gate.

## Behavior

When the player stands on a fragile platform:

1. A purple warning ring begins flashing.
2. The platform remains solid during its warning period.
3. Its locomotion colliders are removed when the warning expires.
4. The visible KayKit platform accelerates downward.
5. The platform becomes hidden below the course.
6. It restores its original position and collision after a controlled delay.

The platform does not drag the player downward. Once its collision disappears, the player falls naturally under the existing Gorilla locomotion gravity.

## Reset handling

Restarting the lab restores every fragile platform immediately. Falling outside the safety bounds returns the player to the latest checkpoint. Rebuilt platforms rejoin the locomotion collider list before they can be triggered again.

## Quest playtest requirements

Before falling platforms enter generated maps, verify:

- The purple warning is visible and easy to understand
- The tutorial warning provides enough time to react
- The quick and final warnings feel challenging but readable
- Collision disappears at the same moment the platform drops
- The player is not carried downward by a falling platform
- Rebuilt platforms become solid again
- Chain platforms can be crossed without a broken reset
- Falling returns to the latest checkpoint
- Restart restores all platforms
- Performance remains stable after many repeated drop-and-reset cycles

Falling platforms remain lab-only until these checks pass.

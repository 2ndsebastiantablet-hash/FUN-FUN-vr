# Phase 3 — Timed Platform Laboratory

This update follows physical Meta Quest testing of the rotating-wall and falling-platform labs.

## Rotating-wall retuning

The 12 m by 10 m wall-blades were too large and visually overlapped neighboring test arenas. They are now:

- 6.2 m long
- 5.6 m tall
- 0.58 m thick
- centered 2.8 m above the platform

The new dimensions still extend beyond the 4 m platform and remain too tall for a practical jump, but their 3.1 m radial reach fits safely inside the 8.4 m spacing between arenas.

The intentionally exaggerated hit remains unchanged:

- 26 m/s horizontal knockback
- 10 m/s upward knockback
- 1.4 second hit cooldown

## Faster fragile platforms

The falling-platform runtime now applies Quest-tested speed multipliers to every lab configuration:

- Warning time: 48% of the configured value
- Falling time: 55% of the configured value
- Minimum warning: 120 ms
- Minimum fall animation: 220 ms

The tutorial platform's 1.1 second configured warning now lasts about 528 ms. The final platform's 420 ms configured warning now lasts about 202 ms.

## Timed-platform lab

The new lab contains six platforms that disappear and return on deterministic cycles:

1. Two alternating platforms
2. Three platforms forming a traveling wave
3. One fast final-cycle platform

Cyan rings flash during the final warning window. When a platform becomes hidden, its locomotion colliders are removed completely. They are restored when the platform returns.

The cycle is derived from scene time rather than chained timers. This makes the mechanic reproducible and prepares it for future procedural manifests and shared multiplayer timestamps.

## Quest playtest requirements

Before timed platforms enter generated courses, verify:

- Alternating platforms never disappear at the same unintended moment
- The cyan warning is visible but brief
- Collision disappears exactly with the model
- Returning platforms restore collision correctly
- The three-platform wave is readable
- The fast final platform is difficult but possible
- Falling returns to the latest checkpoint
- Restart resets all platform cycles together
- Performance remains stable through repeated cycles

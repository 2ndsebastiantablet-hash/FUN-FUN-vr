# Phase 3 — Rotating Obstacle Laboratory

This phase keeps dynamic hazards outside the calibration and generated courses until physical Meta Quest testing passes.

## Moving-platform collision refinement

The moving-platform lab keeps the same route, platform movement, player carry, checkpoints, and finish behavior. Its platform collider footprints are trimmed only a few centimeters to better match the beveled KayKit model tops:

- Full platform visual footprint: approximately 4.00 × 4.00 meters
- Tuned collision footprint: 3.92 × 3.88 meters
- Small side-shuttle visual footprint: approximately 2.60 × 2.60 meters
- Tuned small collision footprint: 2.54 × 2.52 meters

Platform height and top surface elevation are unchanged.

## Rotating-obstacle lab

The new lab contains three isolated rotating-hazard tests:

1. Slow single sweeper at 30 degrees per second
2. Twin cross spinner at 42 degrees per second
3. Reverse sweeper at 55 degrees per second in the opposite direction

The route contains nine visible KayKit pieces, sixteen platform colliders, two checkpoints, three rotating obstacles, and one finish gate.

## Collision approach

The pinned Gorilla locomotion source resolves axis-aligned platform boxes. Rotating bars therefore use a separate lightweight body-contact test rather than pretending a rotating beam is a static box. The contact test:

- Converts the player body center into each rotating bar's local space
- Accounts for body radius and bar dimensions
- Supports one or two crossing bars
- Applies tangential knockback based on rotation direction and which side of the bar made contact
- Adds a small upward impulse to prevent the player from being trapped against the bar
- Uses a cooldown so one contact cannot fire every frame

The bars do not overwrite normal hand-push calculations, gravity, or air drag. A fall still returns the player to the latest checkpoint.

## Quest playtest requirements

Before rotating obstacles enter generated maps, verify:

- All three bars rotate smoothly without visible stutter
- Slow sweeper speed is readable and fair
- Twin spinner openings are understandable
- Reverse rotation is clearly visible
- A clean jump over each bar is possible
- Contact knocks the player predictably rather than teleporting them
- One contact does not trigger repeated rapid hits
- Falling returns to the correct checkpoint
- Restart resets the run and obstacle phases
- Frame rate remains stable through the full lab

Rotating obstacles remain lab-only until these checks pass.

# Phase 3 — Giant Rotating Wall Laboratory

This phase keeps dynamic hazards outside the calibration and generated courses until physical Meta Quest testing passes.

## Moving-platform collision refinement

The moving-platform lab keeps the same route, platform movement, player carry, checkpoints, and finish behavior. Its platform collider footprints are trimmed only a few centimeters to better match the beveled KayKit model tops:

- Full platform visual footprint: approximately 4.00 × 4.00 meters
- Tuned collision footprint: 3.92 × 3.88 meters
- Small side-shuttle visual footprint: approximately 2.60 × 2.60 meters
- Tuned small collision footprint: 2.54 × 2.52 meters

Platform height and top surface elevation are unchanged.

## Giant rotating-wall lab

The lab contains three isolated rotating-hazard tests:

1. Slow single wall at 30 degrees per second
2. Twin crossing walls at 42 degrees per second
3. Reverse wall at 55 degrees per second in the opposite direction

After the first physical Quest test, the obstacle dimensions and impact were deliberately exaggerated:

- Wall length: 12 meters
- Wall height: 10 meters
- Wall thickness: 0.72 meters
- Horizontal knockback target: 26 meters per second
- Upward knockback target: 10 meters per second
- Hit cooldown: 1.4 seconds

The walls extend far beyond each four-meter platform and from the platform floor to well above every normal launch height. The intended challenge is timing the rotation, not jumping over or moving around the wall.

## Collision approach

The pinned Gorilla locomotion source resolves axis-aligned platform boxes. Rotating walls therefore use a separate lightweight body-contact test rather than pretending a rotating beam is a static box. The contact test:

- Converts the player body center into each rotating wall's local space
- Accounts for body radius and wall dimensions
- Supports one or two crossing walls
- Applies tangential knockback based on rotation direction and contact side
- Adds a large upward impulse for an intentionally dramatic ejection
- Uses a cooldown so one contact cannot fire every frame

The walls do not overwrite normal hand-push calculations, gravity, or air drag. Leaving the lab bounds returns the player to the latest checkpoint.

## Quest playtest requirements

Before giant rotating walls enter generated maps, verify:

- All three walls rotate smoothly without visible stutter
- No ordinary jump can clear the top
- The void prevents going around either end
- Contact launches the player completely outside the arena
- The safety reset catches the ejected player at the latest checkpoint
- One contact does not trigger repeated rapid hits
- Reverse rotation remains readable
- Restart resets the run and obstacle phases
- Frame rate remains stable through the full lab

Rotating walls remain lab-only until these checks pass.

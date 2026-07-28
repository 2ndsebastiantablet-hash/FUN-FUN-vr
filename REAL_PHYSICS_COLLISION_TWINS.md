# Real Physics and Collision Twin Laboratory

This rebuild removes the earlier deterministic hand-following ball and crate. Both objects are now real Cannon rigid bodies driven by gravity, mass, friction, damping, restitution, angular velocity, sleeping, and impulses from the tracked Quest hands.

The laboratory also replaces homemade primitive arches and repeated translucent tunnel rings with actual KayKit hoop, straight-pipe, and arch models.

## Real rigid bodies

### Ball

- Shape: sphere
- Radius: 0.48 m
- Mass: 2.4 kg
- Linear damping: 0.12
- Angular damping: 0.10
- Expected behavior: rolls readily, spins from off-center hand contact, carries momentum, shows a small bounce, and settles naturally.

### Crate

- Shape: box
- Size: 0.9 × 0.9 × 0.9 m
- Mass: 9 kg
- Linear damping: 0.28
- Angular damping: 0.34
- Expected behavior: resists movement more than the ball, turns slowly, can tip or rotate from off-center contact, and stops sooner.

### Hand interaction

The tracked hands do not set object positions. Hand movement is converted to velocity, checked against the real body shape, scaled by the body's mass and per-object tuning, and applied to the Cannon body as an impulse at the contact point. Applying the impulse away from the center can create angular motion.

A short contact cooldown prevents a single movement sample from applying repeated impulses every rendering frame. Each object is allowed to sleep when almost motionless to reduce Quest CPU usage.

## Visible model and invisible solid twin

Every approved complex structure is created as a pair:

1. A normal visible KayKit glTF model.
2. An identical hidden glTF model at the same position, rotation, and scale.

After the hidden copy loads, its measured world bounds are converted into a small compound of invisible solid boxes. Each proxy is registered twice:

- As a `locomotion-collider` for the Gorilla locomotion controller.
- As a Cannon `static-body` for the ball and crate.

The invisible glTF copy is then hidden. This preserves the user's visible-model/solid-copy design while avoiding a single oversized box across an opening and avoiding expensive or unstable raw triangle-mesh physics on Quest.

### Compound profiles

- KayKit hoop: left, right, top, and bottom pieces; center opening remains empty.
- KayKit arch: two pillars, two curved-shoulder approximations, and a top piece; doorway remains empty.
- KayKit pipe: left wall, right wall, floor, and ceiling; tunnel remains hollow.

The proxies are created in world space. This ensures Gorilla locomotion and Cannon physics use identical boundaries even when the visible pipe model is rotated into a horizontal tunnel.

## Route contents

- One 2.4 kg physics ball and goal.
- One 9 kg physics crate and goal.
- One real KayKit hoop pair.
- Three real KayKit straight-pipe pairs.
- One real KayKit arch pair.
- Low physical lane boundaries that constrain the objects through collision instead of scripted position clamps.
- Narrow beam, pillars, elevated steps, checkpoints, and finish.
- Five visible/invisible model pairs producing twenty-one optimized solid proxies.
- Fifty-six total Gorilla locomotion colliders after every pair loads.

## Meta Quest playtest checklist

### Ball

- Push the ball gently with either hand and confirm it rolls rather than sliding rigidly.
- Strike it faster and confirm increased speed.
- Hit it off-center and confirm visible spin.
- Confirm gravity keeps it on the platform and the low side boundaries stop it physically.
- Confirm it can collide with and pass through the open center of the KayKit hoop.
- Confirm it does not pass through the visible hoop material.
- Confirm Restart Lab restores position, rotation, linear velocity, and angular velocity.

### Crate

- Compare the same hand movement against the ball and crate; the crate should feel substantially heavier.
- Push one side or corner and confirm it can rotate or tip.
- Confirm it collides with the visible railings and cannot phase through them.
- Confirm it carries some momentum but settles faster than the ball.
- Confirm the goal only completes after the crate enters its target area.
- Confirm Restart Lab fully restores it.

### Collision twins

- Confirm the visible hoop, pipe, and arch are normal KayKit models rather than translucent homemade pieces.
- Move hands and the player body against the visible material and confirm the solid surface matches it closely.
- Confirm openings remain open; there must be no invisible full box across the hoop, arch, or pipe.
- Move the ball into the hoop and pipe boundaries and confirm the real body collides with the same surfaces as the player.
- Confirm none of the invisible collision proxies are visibly rendered.
- Confirm all three pipe segments line up into one readable tunnel.

### Stability and performance

- Confirm no object jitter while resting.
- Confirm no object launches unexpectedly from gentle hand contact.
- Confirm the ball and crate do not fall through the platforms.
- Confirm frame rate remains stable while both bodies move and all five collision twins are loaded.
- Leave both objects still for several seconds, then push again to confirm sleeping bodies wake correctly.
- Complete the route and use Restart Lab repeatedly to check for accumulated errors.

## Scope

This remains an isolated laboratory. Real rigid bodies and model-pair collision are not added to generated courses or multiplayer until the physical Quest test passes. Multiplayer will later require the host to own authoritative rigid-body state and distribute snapshots or impulses to guests.

# Solid Hands and Physics Interaction Batch

This batch replaces scripted hand-to-object impulses with solid tracked-controller bodies and adds the next three local-physics systems: constrained grabbing, weighted pressure plates, and physics-triggered doors.

## Solid tracked hands

Each visible Quest hand sphere now has a Cannon physics body.

- Shape: sphere
- Radius: 0.16 m
- Body type: kinematic
- Pose owner: WebXR tracked controller
- Maximum collision velocity: 12 m/s
- Gravity: disabled for the hand itself
- Collision response: enabled

The kinematic body follows the controller's world position and rotation while its velocity is calculated from tracked movement. Dynamic objects therefore react through Cannon contact rather than a script directly changing their position or applying an extra synthetic hand impulse.

The earlier `real-physics-hand-pusher` attributes are removed after the course builds, preventing double forces. The real ball and crate continue to use mass, gravity, friction, damping, restitution, angular velocity, sleeping, physical boundaries, and reset behavior.

## Grabbing

The new interaction lab contains two grabbable dynamic bodies:

- 2.5 kg sphere
- 7.5 kg block

Press Trigger or Grip while a solid hand is near an object. The game creates a Cannon lock constraint between the kinematic hand and the dynamic object. Releasing both buttons removes the constraint, leaving the object with its physical momentum. One hand can own only one object at a time.

## Weighted plates

Two pressure plates calculate the real mass of dynamic objects resting inside their physical area.

- Door 1 threshold: 6 kg. The 2.5 kg sphere is intentionally too light; the 7.5 kg block opens it.
- Door 2 threshold: 9.5 kg. Both objects are required for a combined 10 kg.

The second plate is wider so both bodies can sit beside one another instead of requiring an unstable stack.

## Physics-triggered doors

Each door is both:

- A Gorilla locomotion collider for the player and hands.
- A Cannon static body for dynamic objects.

When its plate reaches the required mass, the door rises smoothly and its visible model, locomotion boundary, and physics body move together. Removing the weight closes it again.

## Quest playtest checklist

### Solid hand contact

- Gently press either solid hand into the 2.4 kg ball and confirm the ball rolls.
- Press the same hand into the 9 kg crate and confirm the crate resists movement more strongly.
- Confirm no object moves before physical contact.
- Confirm objects do not receive a second exaggerated push from the removed scripted impulse system.
- Confirm both pink and blue hands work independently.
- Confirm the solid hand bodies do not alter Gorilla locomotion or push the player rig.

### Grabbing

- Move the left hand near the 2.5 kg sphere and press Trigger.
- Repeat with left Grip, right Trigger, and right Grip.
- Confirm the object follows through a physical constraint rather than snapping far ahead of the hand.
- Release and confirm the object retains believable momentum.
- Try pressing Trigger or Grip while far away and confirm no grab occurs.
- Confirm one hand cannot grab both objects simultaneously.
- Confirm a held object can collide with the rails, doors, platforms, and the other object.

### Weighted plates and doors

- Put only the 2.5 kg sphere on Door 1's plate and confirm the door stays closed.
- Put the 7.5 kg block on Door 1's plate and confirm the door opens.
- Remove the block and confirm the door closes.
- Put either object alone on Door 2's plate and confirm it stays closed.
- Put both objects on the larger second plate and confirm the door opens at 10 kg.
- Confirm each door's visible box, Gorilla collision, and Cannon collision rise together.
- Confirm objects cannot pass through a closed door.

### Stability

- Confirm solid hands do not jitter while controllers are still.
- Confirm gentle contact does not launch an object unexpectedly.
- Confirm grabbed objects do not vibrate uncontrollably.
- Confirm repeated grab/release cycles do not leave invisible constraints behind.
- Confirm Restart Lab releases held objects, restores both bodies, resets plates, closes doors, and resets checkpoints.
- Confirm frame rate remains stable with both solid hands, two dynamic bodies, two plates, and two moving doors active.

## Scope

These systems remain isolated laboratories. They are not yet added to procedural maps or multiplayer. Multiplayer integration will require host-authoritative dynamic-body state, grab ownership, plate weight, and door state.

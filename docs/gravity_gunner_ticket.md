# Ticket: Build Gravity Gunner MiniApp v1

## Summary

Build **Gravity Gunner**, a top-down spaceship cannon game for SherwinUniverse / Sherwin Lab.

The player ship is fixed on the left-middle of the screen. The ship is a simple circle with a barrel attached to the front. The player drags anywhere on the screen to set shot power and barrel angle, then releases to fire a projectile. Enemies stay on the right side and fire back at predictable intervals. Moving gravity objects pass through the battlefield and bend projectile trajectories.

## Goal

Create a simple, skill-based space artillery game that feels like a physics version of archery, but is much easier to develop than a ragdoll game.

The core fun should come from:

- Dragging to aim and charge shots
- Timing shots around enemy fire
- Curving projectiles through gravity fields
- Destroying right-side enemies before the player shield reaches zero

## Product Name

**Gravity Gunner**

## Suggested Slug

```text
gravity-gunner
```

## Target Files

```text
templates/miniapps/gravity-gunner.html
static/js/miniapps/gravity-gunner.js
apps/miniapps/migrations/000x_seed_gravity_gunner.py
```

Optional later:

```text
static/data/gravity_gunner_levels.json
```

## MiniApp Registration

Create a MiniApp seed record.

Suggested values:

```python
slug = "gravity-gunner"
name = "Gravity Gunner"
description = "Aim a spaceship cannon and curve shots through moving gravity fields."
category = "Physics Games"
template_name = "miniapps/gravity-gunner.html"
is_active = True
```

## Gameplay Overview

The game is top-down.

The player ship is fixed at the left-middle of the game area.

Enemies appear or remain on the right side of the game area. They do not chase or approach the player. They fire at predictable intervals.

Gravity objects move vertically between the player and enemies. These objects affect projectile paths.

The player wins points by destroying enemies. The run ends when the player's shield reaches zero.

## Player Ship

V1 player ship should be simple.

Visual:

```text
circle body + short barrel
```

Placement:

```text
x = 12% of canvas width
y = 50% of canvas height
```

The player ship does not move in v1.

## Player Controls

The player can drag from any point on the screen.

### Drag behavior

- Dragging backward increases shot power.
- Drag distance is proportional to bullet muzzle velocity.
- Moving the finger up/down while dragging rotates the barrel.
- Barrel rotation is inverse to vertical drag input.
- Releasing the finger fires one projectile.

### Control mapping

Suggested implementation:

```javascript
const dragX = currentPointer.x - startPointer.x;
const dragY = currentPointer.y - startPointer.y;

const powerRatio = clamp(Math.abs(dragX), 0, maxDrag) / maxDrag;
const muzzleVelocity = minVelocity + powerRatio * (maxVelocity - minVelocity);

const angleOffset = clamp(-dragY * angleSensitivity, -maxAngleRad, maxAngleRad);
const barrelAngle = baseAngle + angleOffset;
```

Suggested values:

```javascript
baseAngle = 0; // rightward
maxAngleRad = Math.PI * 55 / 180;
minVelocity = 220;
maxVelocity = 900;
maxDrag = 260;
angleSensitivity = 0.004;
```

### Touch and mouse support

Support both:

```text
pointerdown
pointermove
pointerup
pointercancel
```

The game should work on mobile and desktop.

## Shot Preview

While dragging, show a simple preview:

- Barrel rotates live
- Power meter updates live
- A dotted or faint trajectory preview appears
- Preview should account for current gravity objects if practical

For v1, a short predicted path is enough.

## Projectiles

Projectiles are affected by gravity objects.

Each projectile should have:

```javascript
{
  id,
  owner: "player" | "enemy",
  position: { x, y },
  velocity: { x, y },
  radius,
  damage,
  alive
}
```

Player projectile:

```text
Starts at barrel tip
Travels rightward based on barrel angle and muzzle velocity
Can hit enemies or enemy bullets
Can be bent by gravity objects
```

Enemy projectile:

```text
Starts at enemy barrel tip
Travels leftward toward the player
Can hit the player ship
Can be destroyed by player projectile
Can also be bent by gravity objects
```

## Gravity Objects

Gravity objects move vertically through the middle of the battlefield.

V1 should include two gravity object types:

### 1. Mini Planet

Pulls projectiles inward.

```javascript
type = "attractor"
```

### 2. Repulsor Star

Pushes projectiles away.

```javascript
type = "repulsor"
```

Each gravity object should have:

```javascript
{
  id,
  type,
  position: { x, y },
  velocity: { x, y },
  radius,
  mass,
  strength
}
```

### Gravity physics

Suggested update logic:

```javascript
for (const projectile of projectiles) {
  let ax = 0;
  let ay = 0;

  for (const gravityObject of gravityObjects) {
    const dx = gravityObject.position.x - projectile.position.x;
    const dy = gravityObject.position.y - projectile.position.y;

    const distanceSq = Math.max(dx * dx + dy * dy, minGravityDistanceSq);
    const distance = Math.sqrt(distanceSq);

    let force = gravityObject.strength * gravityObject.mass / distanceSq;
    force = Math.min(force, maxGravityAcceleration);

    const sign = gravityObject.type === "repulsor" ? -1 : 1;

    ax += sign * (dx / distance) * force;
    ay += sign * (dy / distance) * force;
  }

  projectile.velocity.x += ax * dt;
  projectile.velocity.y += ay * dt;

  projectile.position.x += projectile.velocity.x * dt;
  projectile.position.y += projectile.velocity.y * dt;
}
```

Suggested caps:

```javascript
minGravityDistance = 50;
maxGravityAcceleration = 1200;
```

## Enemies

Enemies stay on the right side.

They can move slightly up/down in a lane, but they should not advance toward the player.

V1 enemy:

```text
Scout Cannon
```

Behavior:

- Appears in one of three right-side lanes
- Fires straight or near-straight left
- Fires at predictable intervals
- Takes one hit to destroy

Suggested values:

```javascript
enemyX = canvasWidth - 120;
enemyFireInterval = 2.8;
enemyProjectileSpeed = 300;
enemyHealth = 1;
```

V1 lanes:

```text
top lane
middle lane
bottom lane
```

## Enemy Firing

Enemy shots should be predictable.

Each enemy has a visible cooldown ring or timer bar.

When the timer fills, the enemy fires.

Suggested behavior:

```javascript
enemy.fireTimer += dt;

if (enemy.fireTimer >= enemy.fireInterval) {
  fireEnemyProjectile(enemy);
  enemy.fireTimer = 0;
}
```

Enemy aim for v1:

```text
Aim directly at the player ship's current fixed position.
```

## Player Health / Shield

The player has a shield.

Suggested v1 value:

```javascript
playerShield = 100;
enemyHitDamage = 20;
```

Run ends when shield reaches zero.

## Scoring

Suggested scoring:

```text
Enemy destroyed: +100
Projectile intercepted: +25
Wave cleared: +250
Player hit: -50
```

Keep the scoring simple.

## Waves

V1 wave logic:

```text
Wave 1: 1 enemy
Wave 2: 2 enemies
Wave 3+: 3 enemies
```

Increase difficulty by:

- Reducing enemy fire interval slightly
- Adding one extra gravity object
- Increasing gravity-object movement speed

Do not add many enemy types in v1.

## Collision Rules

Player projectile can hit:

- Enemy
- Enemy projectile
- Gravity object surface, optional

Enemy projectile can hit:

- Player ship
- Player projectile
- Gravity object surface, optional

Projectiles should be removed when:

- They leave the screen
- They hit a valid target
- Their lifetime expires

Suggested projectile lifetime:

```javascript
projectileMaxLifetime = 6;
```

## UI Layout

Reuse Sherwin Lab style and layout.

### Top-left panel: Controls

Show:

```text
Power
Angle
Projectile type
```

### Top-right panel: Metrics

Show:

```text
Score
Wave
Player shield
Enemies alive
```

### Bottom-left panel: Actions

Show:

```text
Pause
Reset
Next wave, if wave is cleared
```

### Bottom-right panel: History

Show recent events:

```text
Shot fired
Enemy destroyed
Enemy shot intercepted
Player hit
Wave cleared
```

## Presets

Add top-center preset buttons.

Suggested presets:

```text
Easy Gravity
Heavy Gravity
Chaos Field
```

Each preset changes:

- Gravity-object count
- Gravity-object strength
- Enemy fire interval
- Projectile max speed

## Visual Style

Keep it simple and readable.

V1 visuals:

- Dark space background
- Small star particles
- Player ship as circle + barrel
- Enemies as smaller circles + barrel
- Mini Planet as blue/purple circle
- Repulsor Star as orange/yellow circle
- Projectiles as small bright dots
- Curved projectile trail

Avoid complex assets in v1.

## Audio

Optional for v1.

Suggested simple sounds:

```text
charge
fire
hit
player damaged
wave cleared
```

The game must still work if audio is blocked or disabled.

## Required JavaScript Public API

```javascript
export class GravityGunnerApp {
  constructor(containerId) {
    // store container, state, renderer references
  }

  async init() {
    // setup canvas, scene, UI, event listeners, animation loop
  }

  getState() {
    return {};
  }

  dispose() {
    // cancel animation frame, remove listeners, cleanup renderer
  }
}
```

## Required getState Shape

```javascript
{
  primary: {
    player: {
      shield: 80,
      barrelAngleDeg: 12,
      chargePower: 0.64
    },
    wave: 3,
    enemiesAlive: 2,
    gravityObjects: [
      { type: "attractor", x: 510, y: 220, strength: 0.8 },
      { type: "repulsor", x: 650, y: 410, strength: 0.5 }
    ]
  },
  metrics: {
    score: 1200,
    shotsFired: 14,
    hits: 8,
    accuracy: 0.57,
    incomingShots: 2
  },
  status: {
    stable: true,
    label: "Wave active",
    score: 72
  },
  availableActions: ["fire", "reset", "pause"],
  history: [
    "Shot curved around planet and hit Scout",
    "Enemy bullet intercepted"
  ]
}
```

## AI Assistant Integration

Add app slug support:

```text
gravity-gunner
```

Backend:

```text
apps/ai_tools/views.py
```

Required additions:

- Add `SYSTEM_PROMPTS["gravity-gunner"]`
- Add context handling for `gravity-gunner` app state

Assistant behavior:

- Explain current player status first
- Reference score, shield, wave, and gravity objects
- Keep explanations short and child-friendly
- Explain why projectiles curved when gravity objects are involved

## Mobile Requirements

The game should be mobile-first.

Requirements:

- Works at 360px width
- Drag-anywhere input must not conflict with page scrolling
- Use `touch-action: none` on the game canvas/container
- Buttons should be thumb-friendly
- Panels should be compact or collapsible
- Maintain at least 30 FPS on mid-range mobile devices

## Performance Requirements

Targets:

```text
Desktop: 60 FPS
Mid-range mobile: 30 FPS minimum
```

Performance rules:

- Cap projectile count
- Cap gravity object count
- Use simple shapes
- Avoid heavy post-processing
- Use object pooling for projectiles if needed

Suggested limits:

```javascript
maxProjectiles = 40;
maxGravityObjects = 5;
maxEnemies = 3;
```

## Acceptance Criteria

### Core gameplay

- [ ] Player ship appears fixed at left-middle of screen
- [ ] Player ship is rendered as a circle with a barrel
- [ ] Player can drag from anywhere on the game area
- [ ] Drag distance controls projectile muzzle velocity
- [ ] Vertical drag controls barrel rotation inversely
- [ ] Releasing pointer fires projectile from barrel tip
- [ ] Projectile path is affected by gravity objects
- [ ] Enemies appear or remain on the right side
- [ ] Enemies fire at predictable intervals
- [ ] Enemy projectiles can damage player shield
- [ ] Player projectiles can destroy enemies
- [ ] Player projectiles can intercept enemy projectiles
- [ ] Score, wave, shield, and enemies alive update correctly
- [ ] Run ends when player shield reaches zero

### UI and Sherwin Lab integration

- [ ] Uses shared `miniapps.css`
- [ ] Has four-corner panel layout
- [ ] Has top-center preset buttons
- [ ] Has short description card under simulation
- [ ] Optional AI assistant overlay works or fails gracefully
- [ ] `getState()` returns `primary`, `metrics`, `status`, `availableActions`, and `history`
- [ ] `dispose()` cleans up event listeners and animation loop

### Mobile and quality

- [ ] Works on desktop mouse input
- [ ] Works on mobile touch input
- [ ] No page scroll while dragging inside game area
- [ ] No console errors during normal play
- [ ] Light and dark theme remain acceptable
- [ ] Maintains target performance with default v1 object limits

## Out of Scope for v1

Do not build these yet:

- Full spaceship movement
- PvP mode
- Multiplayer
- Ragdoll physics
- Complex enemy AI
- Many weapons
- Upgrade shop
- Persistent save history
- Large level editor
- Realistic orbital physics
- Advanced art assets

## Implementation Notes

Keep one source of truth for game state.

Recommended structure inside `gravity-gunner.js`:

```javascript
class GravityGunnerApp {
  state = {
    running: true,
    paused: false,
    score: 0,
    wave: 1,
    player: {},
    enemies: [],
    projectiles: [],
    gravityObjects: [],
    history: []
  };

  _update(dt) {}
  _render() {}
  _firePlayerShot() {}
  _fireEnemyShot(enemy) {}
  _updateProjectiles(dt) {}
  _updateGravityObjects(dt) {}
  _checkCollisions() {}
  _updateUI() {}
}
```

Business logic should run in update methods. Rendering should only draw current state.

## Suggested Development Order

1. Create MiniApp registration and template.
2. Create canvas and fixed player ship.
3. Add drag-anywhere aim and charge.
4. Fire straight projectile without gravity.
5. Add enemies and enemy firing.
6. Add hit detection and shield damage.
7. Add gravity objects and projectile bending.
8. Add score, waves, and history.
9. Add presets and UI panels.
10. Add `getState()` and AI assistant integration.
11. Test mobile input and performance.

## Definition of Done

Gravity Gunner v1 is done when a player can open the MiniApp, drag anywhere to aim and charge, release to shoot, curve projectiles through moving gravity fields, destroy right-side enemies, survive predictable enemy fire, and view live score/wave/shield feedback in the Sherwin Lab UI.

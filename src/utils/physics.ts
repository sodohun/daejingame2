import { Ball, Pocket, TableDimensions, AimAssist, CueSpin } from '../types/game';
import { sounds } from './audio';

// Standard 8-ball colors
export const BALL_COLORS: Record<number, string> = {
  0: '#FDFBF7', // Cue ball (ivory)
  1: '#F4BE12', // Solid yellow
  2: '#1949D6', // Solid blue
  3: '#E32A26', // Solid red
  4: '#6B2099', // Solid purple
  5: '#F26F18', // Solid orange
  6: '#158C36', // Solid green
  7: '#801826', // Solid maroon / dark brown
  8: '#111112', // 8-Ball Black
  9: '#F4BE12', // Stripe yellow
  10: '#1949D6', // Stripe blue
  11: '#E32A26', // Stripe red
  12: '#6B2099', // Stripe purple
  13: '#F26F18', // Stripe orange
  14: '#158C36', // Stripe green
  15: '#801826', // Stripe maroon
};

export const FRICTION = 0.988; // Rolling resistance per tick (at 60fps)
export const STOP_SPEED = 2.5; // Below this velocity, ball stops
export const RESTITUTION_BALL = 0.95; // Elasticity between balls
export const RESTITUTION_CUSHION = 0.82; // Elasticity on cushion bounce

/**
 * Creates 15 racked balls for standard 8-ball
 */
export function createRackBalls(
  rackApexX: number,
  rackApexY: number,
  ballRadius: number
): Ball[] {
  const balls: Ball[] = [];
  // Standard 8-ball arrangement order
  // Row 0: 1 ball
  // Row 1: 2 balls
  // Row 2: 3 balls (center is 8)
  // Row 3: 4 balls
  // Row 4: 5 balls (corners: one solid, one stripe)
  const rackOrder = [
    1,
    10, 2,
    3, 8, 11,
    4, 13, 5, 14,
    9, 6, 12, 7, 15
  ];

  const spacing = ballRadius * 2 + 0.5;
  const colSpacing = spacing * Math.cos(Math.PI / 6); // 30 deg equilateral triangle

  let index = 0;
  for (let col = 0; col < 5; col++) {
    const colX = rackApexX + col * colSpacing;
    const startY = rackApexY - (col * spacing) / 2;
    for (let row = 0; row <= col; row++) {
      const num = rackOrder[index++];
      const colY = startY + row * spacing;
      balls.push({
        id: num,
        number: num,
        type: num === 8 ? '8ball' : num <= 7 ? 'solid' : 'stripe',
        x: colX,
        y: colY,
        vx: 0,
        vy: 0,
        radius: ballRadius,
        color: BALL_COLORS[num] || '#FFF',
        isPotted: false,
      });
    }
  }

  return balls;
}

/**
 * Compute the 6 pockets based on table dimensions
 */
export function getTablePockets(dim: TableDimensions): Pocket[] {
  const { playingLeft, playingRight, playingTop, playingBottom, pocketRadius } = dim;
  const midX = (playingLeft + playingRight) / 2;
  const offsetCorner = pocketRadius * 0.45;
  const offsetSide = pocketRadius * 0.2;

  return [
    // Top-Left corner
    { id: 0, x: playingLeft + offsetCorner, y: playingTop + offsetCorner, radius: pocketRadius },
    // Top-Middle side
    { id: 1, x: midX, y: playingTop - offsetSide, radius: pocketRadius * 0.95 },
    // Top-Right corner
    { id: 2, x: playingRight - offsetCorner, y: playingTop + offsetCorner, radius: pocketRadius },
    // Bottom-Left corner
    { id: 3, x: playingLeft + offsetCorner, y: playingBottom - offsetCorner, radius: pocketRadius },
    // Bottom-Middle side
    { id: 4, x: midX, y: playingBottom + offsetSide, radius: pocketRadius * 0.95 },
    // Bottom-Right corner
    { id: 5, x: playingRight - offsetCorner, y: playingBottom - offsetCorner, radius: pocketRadius },
  ];
}

/**
 * Update ball physics for 1 sub-step
 */
export function updateBallPhysics(
  balls: Ball[],
  dim: TableDimensions,
  pockets: Pocket[],
  dt: number,
  onPocketed?: (ball: Ball) => void
): { hasMovement: boolean; pottedThisStep: Ball[] } {
  let hasMovement = false;
  const newlyPotted: Ball[] = [];

  const { playingLeft, playingRight, playingTop, playingBottom } = dim;

  // 1. Move balls and handle cushion bounces & pockets
  for (const ball of balls) {
    if (ball.isPotted) continue;

    // Movement
    if (Math.abs(ball.vx) > 0.001 || Math.abs(ball.vy) > 0.001) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Friction
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < STOP_SPEED) {
        ball.vx = 0;
        ball.vy = 0;
      } else {
        const factor = Math.pow(FRICTION, dt * 60);
        ball.vx *= factor;
        ball.vy *= factor;
        hasMovement = true;
      }
    }

    // Check pocket suction & drop
    for (const pocket of pockets) {
      const dist = Math.hypot(ball.x - pocket.x, ball.y - pocket.y);
      if (dist < pocket.radius * 0.9) {
        ball.isPotted = true;
        ball.vx = 0;
        ball.vy = 0;
        newlyPotted.push(ball);
        sounds.playPocketDrop();
        if (onPocketed) onPocketed(ball);
        break;
      }
    }

    if (ball.isPotted) continue;

    // Cushion collisions (Check against playing boundaries)
    // Left cushion
    if (ball.x - ball.radius < playingLeft) {
      ball.x = playingLeft + ball.radius;
      if (ball.vx < 0) {
        ball.vx = -ball.vx * RESTITUTION_CUSHION;
        sounds.playCushionBounce(Math.abs(ball.vx));
      }
    }
    // Right cushion
    if (ball.x + ball.radius > playingRight) {
      ball.x = playingRight - ball.radius;
      if (ball.vx > 0) {
        ball.vx = -ball.vx * RESTITUTION_CUSHION;
        sounds.playCushionBounce(Math.abs(ball.vx));
      }
    }
    // Top cushion
    if (ball.y - ball.radius < playingTop) {
      ball.y = playingTop + ball.radius;
      if (ball.vy < 0) {
        ball.vy = -ball.vy * RESTITUTION_CUSHION;
        sounds.playCushionBounce(Math.abs(ball.vy));
      }
    }
    // Bottom cushion
    if (ball.y + ball.radius > playingBottom) {
      ball.y = playingBottom - ball.radius;
      if (ball.vy > 0) {
        ball.vy = -ball.vy * RESTITUTION_CUSHION;
        sounds.playCushionBounce(Math.abs(ball.vy));
      }
    }
  }

  // 2. Ball-to-ball collisions (Elastic 2D)
  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];
    if (b1.isPotted) continue;

    for (let j = i + 1; j < balls.length; j++) {
      const b2 = balls[j];
      if (b2.isPotted) continue;

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = b1.radius + b2.radius;

      if (dist < minDist && dist > 0) {
        // Overlap resolution
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        b1.x -= nx * overlap;
        b1.y -= ny * overlap;
        b2.x += nx * overlap;
        b2.y += ny * overlap;

        // Relative velocity
        const kx = b1.vx - b2.vx;
        const ky = b1.vy - b2.vy;
        const p = 2 * (nx * kx + ny * ky) / 2; // Assuming equal mass (mass=1)

        if (p > 0) {
          b1.vx -= p * nx * RESTITUTION_BALL;
          b1.vy -= p * ny * RESTITUTION_BALL;
          b2.vx += p * nx * RESTITUTION_BALL;
          b2.vy += p * ny * RESTITUTION_BALL;

          sounds.playBallHit(p);
          hasMovement = true;
        }
      }
    }
  }

  return { hasMovement, pottedThisStep: newlyPotted };
}

/**
 * Raycast to find the first ball hit and project ghost ball & reflection trajectories
 */
export function calculateAimAssist(
  cueBall: Ball,
  aimAngle: number, // In radians
  balls: Ball[],
  dim: TableDimensions
): AimAssist {
  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);

  let closestDist = Infinity;
  let targetBall: Ball | null = null;
  let hitCueX = 0;
  let hitCueY = 0;

  // Ray-sphere intersection for each ball
  for (const b of balls) {
    if (b.id === 0 || b.isPotted) continue;

    // Vector from cue ball to target ball
    const ox = b.x - cueBall.x;
    const oy = b.y - cueBall.y;

    // Project onto aim line
    const proj = ox * dirX + oy * dirY;
    if (proj <= 0) continue; // Behind cue ball

    // Closest perpendicular distance squared
    const perpSq = (ox * ox + oy * oy) - (proj * proj);
    const radiusSum = cueBall.radius + b.radius;
    const radiusSumSq = radiusSum * radiusSum;

    if (perpSq < radiusSumSq) {
      // Collision occurs
      const d = Math.sqrt(radiusSumSq - perpSq);
      const hitDist = proj - d;

      if (hitDist > 0 && hitDist < closestDist) {
        closestDist = hitDist;
        targetBall = b;
        hitCueX = cueBall.x + dirX * hitDist;
        hitCueY = cueBall.y + dirY * hitDist;
      }
    }
  }

  if (targetBall) {
    // Normal from ghost cue ball center to target ball center
    const normalX = targetBall.x - hitCueX;
    const normalY = targetBall.y - hitCueY;
    const normalLen = Math.hypot(normalX, normalY) || 1;
    const normDirX = normalX / normalLen;
    const normDirY = normalY / normalLen;

    // Cue ball deflection vector is tangent to collision normal
    // v_tangent = dir - (dir . normal) * normal
    const dot = dirX * normDirX + dirY * normDirY;
    const cueDeflectX = dirX - dot * normDirX;
    const cueDeflectY = dirY - dot * normDirY;
    const cueDeflectLen = Math.hypot(cueDeflectX, cueDeflectY) || 1;

    return {
      targetBallId: targetBall.id,
      hitX: hitCueX,
      hitY: hitCueY,
      cueBallAfterX: cueDeflectX / cueDeflectLen,
      cueBallAfterY: cueDeflectY / cueDeflectLen,
      targetBallDirX: normDirX,
      targetBallDirY: normDirY,
      cueTrajectoryLength: closestDist,
      targetTrajectoryLength: 180,
    };
  }

  // If no ball hit, raycast to cushion wall
  let wallDist = 2000;
  if (dirX > 0) wallDist = Math.min(wallDist, (dim.playingRight - cueBall.radius - cueBall.x) / dirX);
  if (dirX < 0) wallDist = Math.min(wallDist, (dim.playingLeft + cueBall.radius - cueBall.x) / dirX);
  if (dirY > 0) wallDist = Math.min(wallDist, (dim.playingBottom - cueBall.radius - cueBall.y) / dirY);
  if (dirY < 0) wallDist = Math.min(wallDist, (dim.playingTop + cueBall.radius - cueBall.y) / dirY);

  wallDist = Math.max(10, wallDist);

  return {
    targetBallId: null,
    hitX: cueBall.x + dirX * wallDist,
    hitY: cueBall.y + dirY * wallDist,
    cueBallAfterX: 0,
    cueBallAfterY: 0,
    targetBallDirX: 0,
    targetBallDirY: 0,
    cueTrajectoryLength: wallDist,
    targetTrajectoryLength: 0,
  };
}

/**
 * Apply shot force to cue ball with spin effect
 */
export function applyCueShot(
  cueBall: Ball,
  aimAngle: number,
  powerPercent: number, // 0 to 1
  spin: CueSpin
) {
  const maxVelocity = 1800; // max initial px/s
  const speed = Math.max(50, powerPercent * maxVelocity);

  cueBall.vx = Math.cos(aimAngle) * speed;
  cueBall.vy = Math.sin(aimAngle) * speed;

  // Add side-spin deflection (english) slightly to initial angle
  if (spin.x !== 0) {
    const perpAngle = aimAngle + Math.PI / 2;
    cueBall.vx += Math.cos(perpAngle) * spin.x * (speed * 0.08);
    cueBall.vy += Math.sin(perpAngle) * spin.x * (speed * 0.08);
  }

  sounds.playCueHit(powerPercent);
}

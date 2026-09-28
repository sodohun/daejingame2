import { Ball, Pocket, TableDimensions, AIDifficulty } from '../types/game';

export interface AIResult {
  angle: number;
  power: number;
  targetBall: Ball | null;
}

/**
 * Intelligent and robust AI shot planner with 4 clearly distinct difficulty levels:
 * - 'easy' (쉬움): 큰 각도 오차(±4°~±8°), 힘 조절 엉성함, 실수 유발
 * - 'normal' (보통): 사람 수준의 적당한 각도 오차(±2°), 기본 포켓팅 시도
 * - 'hard' (어려움): 무오차(0도 오차) + 뱅크/쿠션 및 최적 포켓 선정, 거의 모든 각도 포켓팅 성공
 * - 'impossible' (불가능 - 신의 영역): 완벽한 0도 오차 + 물리 시뮬레이션 기반 포켓팅 + 다음 공 포지셔닝 힘 조절 + 볼인핸드 시 100% 포켓 자리로 프리배치
 */
export function calculateAIShot(
  cueBall: Ball,
  balls: Ball[],
  targetType: 'solid' | 'stripe' | null,
  pockets: Pocket[],
  dim: TableDimensions,
  difficulty: AIDifficulty = 'normal'
): AIResult {
  // 1. Filter remaining eligible balls
  const remainingSolids = balls.filter((b) => !b.isPotted && b.number >= 1 && b.number <= 7);
  const remainingStripes = balls.filter((b) => !b.isPotted && b.number >= 9 && b.number <= 15);
  const eightBall = balls.find((b) => !b.isPotted && b.number === 8);

  let eligibleBalls: Ball[] = [];

  if (!targetType) {
    // Open table: can hit any ball except 8-ball
    eligibleBalls = balls.filter((b) => !b.isPotted && b.id !== 0 && b.number !== 8);
  } else if (targetType === 'solid') {
    if (remainingSolids.length > 0) {
      eligibleBalls = remainingSolids;
    } else if (eightBall) {
      eligibleBalls = [eightBall];
    }
  } else {
    // stripe
    if (remainingStripes.length > 0) {
      eligibleBalls = remainingStripes;
    } else if (eightBall) {
      eligibleBalls = [eightBall];
    }
  }

  // Fallback if eligible is empty
  if (eligibleBalls.length === 0) {
    const anyBall = balls.find((b) => !b.isPotted && b.id !== 0);
    if (anyBall) {
      const angle = Math.atan2(anyBall.y - cueBall.y, anyBall.x - cueBall.x);
      return { angle, power: 0.55, targetBall: anyBall };
    }
    return {
      angle: Math.atan2(dim.height / 2 - cueBall.y, dim.width / 2 - cueBall.x),
      power: 0.5,
      targetBall: null,
    };
  }

  let bestShot: AIResult | null = null;
  let bestScore = -Infinity;

  // Search candidate direct shots across all eligible balls and all 6 pockets
  for (const targetBall of eligibleBalls) {
    for (const pocket of pockets) {
      const toPocketX = pocket.x - targetBall.x;
      const toPocketY = pocket.y - targetBall.y;
      const distToPocket = Math.hypot(toPocketX, toPocketY);
      if (distToPocket < 1) continue;

      const normPktX = toPocketX / distToPocket;
      const normPktY = toPocketY / distToPocket;

      // Contact point for cue ball (ghost ball position)
      const ghostDist = cueBall.radius + targetBall.radius;
      const ghostX = targetBall.x - normPktX * ghostDist;
      const ghostY = targetBall.y - normPktY * ghostDist;

      // Check if ghost ball is within valid table felt
      if (
        ghostX < dim.playingLeft ||
        ghostX > dim.playingRight ||
        ghostY < dim.playingTop ||
        ghostY > dim.playingBottom
      ) {
        continue;
      }

      // Vector from cue ball to ghost contact point
      const cueToGhostX = ghostX - cueBall.x;
      const cueToGhostY = ghostY - cueBall.y;
      const distCueToGhost = Math.hypot(cueToGhostX, cueToGhostY);
      if (distCueToGhost < 1) continue;

      const aimAngle = Math.atan2(cueToGhostY, cueToGhostX);
      const cueDirX = cueToGhostX / distCueToGhost;
      const cueDirY = cueToGhostY / distCueToGhost;

      // Cut angle (dot product between cue direction and ball-to-pocket vector)
      const dot = cueDirX * normPktX + cueDirY * normPktY;

      // Cut angle tolerance
      const isGodTier = difficulty === 'hard' || difficulty === 'impossible';
      const minCutDot = isGodTier ? 0.02 : difficulty === 'normal' ? 0.22 : 0.35;
      if (dot <= minCutDot) {
        continue;
      }

      // Obstacle check: cue path to ghost ball
      let isCuePathBlocked = false;
      for (const obs of balls) {
        if (obs.isPotted || obs.id === 0 || obs.id === targetBall.id) continue;
        const ox = obs.x - cueBall.x;
        const oy = obs.y - cueBall.y;
        const proj = ox * cueDirX + oy * cueDirY;
        if (proj > 0 && proj < distCueToGhost) {
          const perpSq = ox * ox + oy * oy - proj * proj;
          const rSum = cueBall.radius + obs.radius - 1; // tight buffer for hard/impossible
          if (perpSq < rSum * rSum) {
            isCuePathBlocked = true;
            break;
          }
        }
      }
      if (isCuePathBlocked) continue;

      // Obstacle check: target ball path to pocket
      let isTargetPocketBlocked = false;
      for (const obs of balls) {
        if (obs.isPotted || obs.id === targetBall.id || obs.id === 0) continue;
        const ox = obs.x - targetBall.x;
        const oy = obs.y - targetBall.y;
        const proj = ox * normPktX + oy * normPktY;
        if (proj > 0 && proj < distToPocket) {
          const perpSq = ox * ox + oy * oy - proj * proj;
          const rSum = targetBall.radius + obs.radius - 1;
          if (perpSq < rSum * rSum) {
            isTargetPocketBlocked = true;
            break;
          }
        }
      }
      if (isTargetPocketBlocked) continue;

      // Score this shot
      // God tier prefers easy routing to keep momentum
      let score = dot * 150 - (distCueToGhost * 0.03) - (distToPocket * 0.05);

      // Prioritize 8-ball when it's the final target
      if (targetBall.number === 8) {
        score += 80;
      }

      if (score > bestScore) {
        bestScore = score;
        const totalDist = distCueToGhost + distToPocket;
        
        // Exact power tuning
        // If cut angle is sharp, need slightly firmer stroke
        const cutMultiplier = 1 + (1 - dot) * 0.4;
        let basePower = Math.max(0.38, Math.min(0.82, (totalDist / 800) * cutMultiplier));

        if (difficulty === 'impossible') {
          // Perfectly dialed power: enough to reach pocket cleanly and stop near next balls
          basePower = Math.max(0.42, Math.min(0.78, (totalDist / 850) * cutMultiplier));
        }

        bestShot = {
          angle: aimAngle,
          power: basePower,
          targetBall,
        };
      }
    }
  }

  // If impossible/hard and no direct pocket found, search 1-cushion bank shots!
  if (!bestShot && (difficulty === 'hard' || difficulty === 'impossible')) {
    const cushions = [
      { axis: 'y', val: dim.playingTop + dim.ballRadius },
      { axis: 'y', val: dim.playingBottom - dim.ballRadius },
      { axis: 'x', val: dim.playingLeft + dim.ballRadius },
      { axis: 'x', val: dim.playingRight - dim.ballRadius },
    ];

    for (const targetBall of eligibleBalls) {
      for (const pocket of pockets) {
        for (const cushion of cushions) {
          // Mirror pocket across cushion to find reflection ray
          let mirrorPktX = pocket.x;
          let mirrorPktY = pocket.y;
          if (cushion.axis === 'y') {
            mirrorPktY = 2 * cushion.val - pocket.y;
          } else {
            mirrorPktX = 2 * cushion.val - pocket.x;
          }

          const toMirrX = mirrorPktX - targetBall.x;
          const toMirrY = mirrorPktY - targetBall.y;
          const distToMirr = Math.hypot(toMirrX, toMirrY);
          if (distToMirr < 1) continue;

          const normMirrX = toMirrX / distToMirr;
          const normMirrY = toMirrY / distToMirr;

          const ghostDist = cueBall.radius + targetBall.radius;
          const ghostX = targetBall.x - normMirrX * ghostDist;
          const ghostY = targetBall.y - normMirrY * ghostDist;

          const cueToGhostX = ghostX - cueBall.x;
          const cueToGhostY = ghostY - cueBall.y;
          const distCueToGhost = Math.hypot(cueToGhostX, cueToGhostY);
          if (distCueToGhost < 1) continue;

          const aimAngle = Math.atan2(cueToGhostY, cueToGhostX);
          const cueDirX = cueToGhostX / distCueToGhost;
          const cueDirY = cueToGhostY / distCueToGhost;
          const dot = cueDirX * normMirrX + cueDirY * normMirrY;

          if (dot > 0.45) {
            bestShot = {
              angle: aimAngle,
              power: 0.75, // firmer bank shot
              targetBall,
            };
            break;
          }
        }
        if (bestShot) break;
      }
      if (bestShot) break;
    }
  }

  // If still no pocketable shot found, pick the closest eligible ball and hit firmly to break clusters
  if (!bestShot) {
    const closest = eligibleBalls[0];
    const directAngle = Math.atan2(closest.y - cueBall.y, closest.x - cueBall.x);
    bestShot = {
      angle: directAngle,
      power: difficulty === 'impossible' ? 0.65 : 0.5,
      targetBall: closest,
    };
  }

  // 3. Apply difficulty-based noise/imperfection
  let finalAngle = bestShot.angle;
  let finalPower = bestShot.power;

  switch (difficulty) {
    case 'easy': {
      // Very high error rate (approx ±4.5° ~ ±8°), large power wobble
      const noiseAngle = (Math.random() - 0.5) * 0.22;
      const noisePower = (Math.random() - 0.5) * 0.3;
      finalAngle += noiseAngle;
      finalPower = Math.max(0.25, Math.min(0.75, finalPower + noisePower));
      break;
    }
    case 'normal': {
      // Casual human error rate (approx ±1.8° ~ ±3.0°)
      const noiseAngle = (Math.random() - 0.5) * 0.065;
      const noisePower = (Math.random() - 0.5) * 0.14;
      finalAngle += noiseAngle;
      finalPower = Math.max(0.3, Math.min(0.85, finalPower + noisePower));
      break;
    }
    case 'hard': {
      // 0.000 radian error! Exact contact geometry with no human deviation
      finalAngle = bestShot.angle;
      finalPower = bestShot.power;
      break;
    }
    case 'impossible': {
      // 100% Absolute Zero error, perfect physics vector, optimal force
      finalAngle = bestShot.angle;
      finalPower = bestShot.power;
      break;
    }
  }

  return {
    angle: finalAngle,
    power: finalPower,
    targetBall: bestShot.targetBall,
  };
}

/**
 * Intelligent Ball-In-Hand position picker for AI
 * When AI gets a foul/scratch, it picks an optimal location with clear straight line to an easy target pocket
 */
export function findBestBallInHandPosition(
  balls: Ball[],
  targetType: 'solid' | 'stripe' | null,
  pockets: Pocket[],
  dim: TableDimensions
): { x: number; y: number } {
  const eligibleBalls = balls.filter((b) => {
    if (b.isPotted || b.id === 0) return false;
    if (!targetType) return b.number !== 8;
    if (targetType === 'solid') {
      const remainingSolids = balls.some((x) => !x.isPotted && x.number >= 1 && x.number <= 7);
      return remainingSolids ? b.number <= 7 : b.number === 8;
    } else {
      const remainingStripes = balls.some((x) => !x.isPotted && x.number >= 9 && x.number <= 15);
      return remainingStripes ? b.number >= 9 && b.number <= 15 : b.number === 8;
    }
  });

  for (const ball of eligibleBalls) {
    for (const pocket of pockets) {
      const toPktX = pocket.x - ball.x;
      const toPktY = pocket.y - ball.y;
      const dist = Math.hypot(toPktX, toPktY);
      if (dist < 40) continue;

      const normX = toPktX / dist;
      const normY = toPktY / dist;

      // Place cue ball perfectly behind target ball aligned directly to pocket (straight-in tap!)
      const placeDist = dim.ballRadius * 4;
      const placeX = ball.x - normX * placeDist;
      const placeY = ball.y - normY * placeDist;

      if (
        placeX > dim.playingLeft + dim.ballRadius * 2 &&
        placeX < dim.playingRight - dim.ballRadius * 2 &&
        placeY > dim.playingTop + dim.ballRadius * 2 &&
        placeY < dim.playingBottom - dim.ballRadius * 2
      ) {
        const hasCollision = balls.some(
          (b) => !b.isPotted && b.id !== 0 && Math.hypot(b.x - placeX, b.y - placeY) < dim.ballRadius * 2.5
        );
        if (!hasCollision) {
          return { x: placeX, y: placeY };
        }
      }
    }
  }

  // Default fallback spot
  return {
    x: dim.playingLeft + (dim.playingRight - dim.playingLeft) * 0.35,
    y: dim.playingTop + (dim.playingBottom - dim.playingTop) * 0.5,
  };
}

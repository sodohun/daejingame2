import { Ball, Pocket, TableDimensions, AimAssist } from '../types/game';

/**
 * Draws the high-fidelity billiard table matching the reference image:
 * - Green velvet felt with subtle cloth texture & vignette
 * - Polished cherrywood outer frame with metallic inlays / diamond sight markers
 * - Chrome metallic pocket rim casings & inner leather pocket drops
 * - Baulk line / Head string line
 */
export function drawTable(
  ctx: CanvasRenderingContext2D,
  dim: TableDimensions,
  pockets: Pocket[]
) {
  const { width, height, playingLeft, playingRight, playingTop, playingBottom, cushionWidth, pocketRadius } = dim;

  // Clear background
  ctx.fillStyle = '#171717';
  ctx.fillRect(0, 0, width, height);

  // 1. Outer Dark Metallic / Wooden Bevel Frame
  const frameRadius = 18;
  const outerBorder = 6;
  ctx.save();

  // Dark gunmetal outer border
  ctx.fillStyle = '#262626';
  roundRect(ctx, outerBorder, outerBorder, width - outerBorder * 2, height - outerBorder * 2, frameRadius);
  ctx.fill();

  // Rich Cherrywood Rail Frame
  const railInset = outerBorder + 4;
  const woodGrad = ctx.createLinearGradient(0, railInset, 0, height - railInset);
  woodGrad.addColorStop(0, '#5A1B14'); // Top cherry wood
  woodGrad.addColorStop(0.5, '#73231A');
  woodGrad.addColorStop(1, '#4A140F');
  ctx.fillStyle = woodGrad;
  roundRect(ctx, railInset, railInset, width - railInset * 2, height - railInset * 2, frameRadius - 4);
  ctx.fill();

  // Diamond sight markers on the wooden rails
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 2;
  const sightRadius = 2.2;
  const playW = playingRight - playingLeft;
  const playH = playingBottom - playingTop;

  // Horizontal rails (top and bottom sights)
  for (let i = 1; i <= 7; i++) {
    if (i === 4) continue; // skip center where middle pocket is
    const sightX = playingLeft + (playW / 8) * i;
    // Top rail sight
    ctx.beginPath();
    ctx.arc(sightX, railInset + (playingTop - railInset) / 2, sightRadius, 0, Math.PI * 2);
    ctx.fill();
    // Bottom rail sight
    ctx.beginPath();
    ctx.arc(sightX, playingBottom + (height - railInset - playingBottom) / 2, sightRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vertical rails (left and right sights)
  for (let i = 1; i <= 3; i++) {
    const sightY = playingTop + (playH / 4) * i;
    // Left rail sight
    ctx.beginPath();
    ctx.arc(railInset + (playingLeft - railInset) / 2, sightY, sightRadius, 0, Math.PI * 2);
    ctx.fill();
    // Right rail sight
    ctx.beginPath();
    ctx.arc(playingRight + (width - railInset - playingRight) / 2, sightY, sightRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 2. Rubber Cushions (Deep Green Felt Cushion)
  const cushionGrad = ctx.createLinearGradient(0, playingTop - cushionWidth, 0, playingBottom + cushionWidth);
  cushionGrad.addColorStop(0, '#0F5423');
  cushionGrad.addColorStop(1, '#083816');
  ctx.fillStyle = cushionGrad;
  ctx.fillRect(
    playingLeft - cushionWidth,
    playingTop - cushionWidth,
    playW + cushionWidth * 2,
    playH + cushionWidth * 2
  );

  // 3. Playing Surface (Premium Emerald Green Felt)
  const feltGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    playW * 0.15,
    width / 2,
    height / 2,
    playW * 0.75
  );
  feltGrad.addColorStop(0, '#10963E'); // Bright center spotlight
  feltGrad.addColorStop(0.7, '#0C7E33');
  feltGrad.addColorStop(1, '#095F26'); // Darker edges
  ctx.fillStyle = feltGrad;
  ctx.fillRect(playingLeft, playingTop, playW, playH);

  // Inner felt shadow from cushions
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(playingLeft, playingTop, playW, playH);

  // 4. Table Markings: Baulk line (Head String line) & Rack spot
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  const baulkX = playingLeft + playW * 0.25;
  ctx.beginPath();
  ctx.moveTo(baulkX, playingTop);
  ctx.lineTo(baulkX, playingBottom);
  ctx.stroke();

  // Head spot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(baulkX, playingTop + playH / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Foot spot (Rack Apex point)
  const rackSpotX = playingLeft + playW * 0.72;
  ctx.beginPath();
  ctx.arc(rackSpotX, playingTop + playH / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. 6 Pockets (Chrome outer bezels & dark leather cup)
  for (const pocket of pockets) {
    // Chrome metal plate around pocket
    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocket.radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Chrome reflection highlight
    const chromeGrad = ctx.createLinearGradient(
      pocket.x - pocket.radius,
      pocket.y - pocket.radius,
      pocket.x + pocket.radius,
      pocket.y + pocket.radius
    );
    chromeGrad.addColorStop(0, '#E0E0E0');
    chromeGrad.addColorStop(0.5, '#757575');
    chromeGrad.addColorStop(1, '#424242');
    ctx.fillStyle = chromeGrad;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocket.radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Deep pocket hole (Pure dark void with inner shadow)
    const holeGrad = ctx.createRadialGradient(
      pocket.x,
      pocket.y,
      pocket.radius * 0.2,
      pocket.x,
      pocket.y,
      pocket.radius
    );
    holeGrad.addColorStop(0, '#000000');
    holeGrad.addColorStop(0.8, '#0A0A0A');
    holeGrad.addColorStop(1, '#1A1A1A');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws all active billiard balls with 3D sphere shading, numbers and stripes
 */
export function drawBalls(ctx: CanvasRenderingContext2D, balls: Ball[]) {
  for (const ball of balls) {
    if (ball.isPotted) continue;

    ctx.save();
    ctx.translate(ball.x, ball.y);

    // Ball Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(3, 4, ball.radius * 0.95, ball.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball base sphere
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.clip(); // Clip pattern within ball radius

    if (ball.type === 'cue') {
      // Cue ball: ivory white with soft highlight
      const cueGrad = ctx.createRadialGradient(
        -ball.radius * 0.35,
        -ball.radius * 0.35,
        ball.radius * 0.1,
        0,
        0,
        ball.radius
      );
      cueGrad.addColorStop(0, '#FFFFFF');
      cueGrad.addColorStop(0.6, '#F8F7F2');
      cueGrad.addColorStop(1, '#C8C4B7');
      ctx.fillStyle = cueGrad;
      ctx.fill();

      // Red dot indicator on cue ball
      ctx.fillStyle = '#E53E3E';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (ball.type === 'solid' || ball.type === '8ball') {
      // Solid color ball with 3D specular highlight
      const grad = ctx.createRadialGradient(
        -ball.radius * 0.35,
        -ball.radius * 0.35,
        ball.radius * 0.05,
        0,
        0,
        ball.radius
      );
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.2, lightenColor(ball.color, 40));
      grad.addColorStop(0.65, ball.color);
      grad.addColorStop(1, darkenColor(ball.color, 45));
      ctx.fillStyle = grad;
      ctx.fill();

      // White circle for number
      drawBallNumberBadge(ctx, ball);
    } else if (ball.type === 'stripe') {
      // Stripe ball: white base + colored wide horizontal stripe
      ctx.fillStyle = '#FAF9F6';
      ctx.fill();

      // Colored stripe band
      const stripeHeight = ball.radius * 1.15;
      const grad = ctx.createLinearGradient(0, -stripeHeight / 2, 0, stripeHeight / 2);
      grad.addColorStop(0, darkenColor(ball.color, 20));
      grad.addColorStop(0.5, ball.color);
      grad.addColorStop(1, darkenColor(ball.color, 35));
      ctx.fillStyle = grad;
      ctx.fillRect(-ball.radius, -stripeHeight / 2, ball.radius * 2, stripeHeight);

      // White circle badge and number
      drawBallNumberBadge(ctx, ball);

      // Sphere gloss overlay
      const glossGrad = ctx.createRadialGradient(
        -ball.radius * 0.35,
        -ball.radius * 0.35,
        ball.radius * 0.05,
        0,
        0,
        ball.radius
      );
      glossGrad.addColorStop(0, 'rgba(255,255,255,0.75)');
      glossGrad.addColorStop(0.3, 'rgba(255,255,255,0.2)');
      glossGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      glossGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = glossGrad;
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawBallNumberBadge(ctx: CanvasRenderingContext2D, ball: Ball) {
  const badgeRadius = ball.radius * 0.44;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111111';
  ctx.font = `bold ${Math.round(ball.radius * 0.58)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ball.number.toString(), 0, 0.5);

  // Underline for 6 and 9 to distinguish
  if (ball.number === 6 || ball.number === 9) {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-badgeRadius * 0.4, badgeRadius * 0.6);
    ctx.lineTo(badgeRadius * 0.4, badgeRadius * 0.6);
    ctx.stroke();
  }
}

/**
 * Draws the aim line, ghost ball circle, and target reflection trajectory
 * exactly matching the reference screenshot!
 */
export function drawAimAssist(
  ctx: CanvasRenderingContext2D,
  cueBall: Ball,
  aimAngle: number,
  assist: AimAssist
) {
  ctx.save();

  // 1. Cue Ball Aim Ray (Glowing white/translucent beam from cue ball to ghost ball)
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.setLineDash([8, 5]);

  ctx.beginPath();
  ctx.moveTo(cueBall.x, cueBall.y);
  ctx.lineTo(assist.hitX, assist.hitY);
  ctx.stroke();

  // 2. Ghost Ball Circle (Where cue ball will make contact)
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(assist.hitX, assist.hitY, cueBall.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ghost center dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(assist.hitX, assist.hitY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. If target ball is hit: draw target ball path & cue ball deflected path
  if (assist.targetBallId !== null) {
    // Target ball path (solid bright yellow / green prediction ray)
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);

    const targetEndX = assist.hitX + assist.targetBallDirX * assist.targetTrajectoryLength;
    const targetEndY = assist.hitY + assist.targetBallDirY * assist.targetTrajectoryLength;

    ctx.beginPath();
    ctx.moveTo(assist.hitX, assist.hitY);
    ctx.lineTo(targetEndX, targetEndY);
    ctx.stroke();

    // Cue ball deflection path (soft blue-white)
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    const cueAfterEndX = assist.hitX + assist.cueBallAfterX * 70;
    const cueAfterEndY = assist.hitY + assist.cueBallAfterY * 70;

    ctx.beginPath();
    ctx.moveTo(assist.hitX, assist.hitY);
    ctx.lineTo(cueAfterEndX, cueAfterEndY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the realistic wooden pool cue stick pointing at the cue ball
 */
export function drawCueStick(
  ctx: CanvasRenderingContext2D,
  cueBall: Ball,
  aimAngle: number,
  power: number // 0 to 1
) {
  ctx.save();
  ctx.translate(cueBall.x, cueBall.y);
  ctx.rotate(aimAngle);

  // Cue offset based on power pullback
  const baseOffset = cueBall.radius + 12;
  const pullBack = power * 65; // Pull back cue stick as power increases
  const startX = -(baseOffset + pullBack);

  const cueLength = 340;
  const tipWidth = 5;
  const buttWidth = 10;

  // Cue Stick Shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.moveTo(startX, 6);
  ctx.lineTo(startX - cueLength, 12);
  ctx.lineTo(startX - cueLength, 18);
  ctx.lineTo(startX, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cue Shaft Gradient (Maple wood to dark grip)
  const cueGrad = ctx.createLinearGradient(startX, 0, startX - cueLength, 0);
  cueGrad.addColorStop(0, '#E8D5B5'); // Blue chalked ferrule tip
  cueGrad.addColorStop(0.04, '#E8D5B5'); // Maple shaft
  cueGrad.addColorStop(0.65, '#C49762'); // Honey maple
  cueGrad.addColorStop(0.85, '#2D1B10'); // Dark butt
  cueGrad.addColorStop(1, '#1A0E08');

  ctx.fillStyle = cueGrad;
  ctx.beginPath();
  ctx.moveTo(startX, -tipWidth / 2);
  ctx.lineTo(startX - cueLength, -buttWidth / 2);
  ctx.lineTo(startX - cueLength, buttWidth / 2);
  ctx.lineTo(startX, tipWidth / 2);
  ctx.closePath();
  ctx.fill();

  // Blue chalk tip
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(startX, -tipWidth / 2, 4, tipWidth);

  // White ferrule
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(startX - 8, -tipWidth / 2 - 0.5, 8, tipWidth + 1);

  // Metal/Rubber bumper on butt
  ctx.fillStyle = '#111827';
  ctx.fillRect(startX - cueLength, -buttWidth / 2, 6, buttWidth);

  // In-canvas Power meter near the cue stick
  if (power > 0.01) {
    const meterW = 90;
    const meterH = 9;
    const meterX = startX - 110;
    const meterY = -22;

    // Meter background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX, meterY, meterW, meterH);
    ctx.fillRect(meterX, meterY, meterW, meterH);

    // Meter fill
    const fillGrad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
    fillGrad.addColorStop(0, '#10B981');
    fillGrad.addColorStop(0.6, '#FBBF24');
    fillGrad.addColorStop(1, '#EF4444');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(meterX + 1, meterY + 1, (meterW - 2) * Math.min(1, power), meterH - 2);

    // Percentage text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(power * 100)}%`, meterX + meterW / 2, meterY - 4);
  }

  ctx.restore();
}

// Utility: round rect path helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function lightenColor(col: string, amt: number): string {
  return adjustColor(col, amt);
}

function darkenColor(col: string, amt: number): string {
  return adjustColor(col, -amt);
}

function adjustColor(col: string, amt: number): string {
  let usePound = false;
  let c = col;
  if (c[0] === '#') {
    c = c.slice(1);
    usePound = true;
  }
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return (usePound ? '#' : '') + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

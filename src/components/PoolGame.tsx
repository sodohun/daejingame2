import React, { useRef, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ChevronLeft, ChevronRight, RotateCcw, Play, Award, AlertCircle } from 'lucide-react';
import { Ball, Pocket, TableDimensions, GameMode, CueSpin, StageConfig, AIDifficulty } from '../types/game';
import { BALL_COLORS, createRackBalls, getTablePockets, updateBallPhysics, calculateAimAssist, applyCueShot } from '../utils/physics';
import { drawTable, drawBalls, drawAimAssist, drawCueStick } from '../utils/renderer';
import { calculateAIShot, findBestBallInHandPosition } from '../utils/ai';
import { STAGES } from '../utils/stages';
import { sounds } from '../utils/audio';
import { TopBar } from './TopBar';
import { CueController } from './CueController';

// Base virtual table resolution (2:1 classic ratio)
const VIRTUAL_WIDTH = 1000;
const VIRTUAL_HEIGHT = 500;
const BALL_RADIUS = 13.5;
const POCKET_RADIUS = 24;
const CUSHION_WIDTH = 22;

export const PoolGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Table dimensions constant object
  const dim: TableDimensions = {
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
    playingLeft: 60,
    playingRight: VIRTUAL_WIDTH - 60,
    playingTop: 50,
    playingBottom: VIRTUAL_HEIGHT - 50,
    cushionWidth: CUSHION_WIDTH,
    pocketRadius: POCKET_RADIUS,
    ballRadius: BALL_RADIUS,
  };

  const pockets: Pocket[] = getTablePockets(dim);

  // Game Modes & States
  const [mode, setMode] = useState<GameMode>('stage');
  const [stageIndex, setStageIndex] = useState(0);
  const currentStage: StageConfig = STAGES[stageIndex] || STAGES[0];

  // Stage Specific State
  const [remainingShots, setRemainingShots] = useState(currentStage.maxShots);
  const [stageCleared, setStageCleared] = useState(false);
  const [stageFailed, setStageFailed] = useState(false);

  // 8-Ball AI Specific State
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  const [playerType, setPlayerType] = useState<'solid' | 'stripe' | null>(null);
  const [aiType, setAiType] = useState<'solid' | 'stripe' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'player' | 'ai' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isBallInHand, setIsBallInHand] = useState(false);
  const [foulMessage, setFoulMessage] = useState<string | null>(null);

  // Physics & Balls State
  const ballsRef = useRef<Ball[]>([]);
  const [power, setPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0); // in radians
  const [spin, setSpin] = useState<CueSpin>({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Interaction tracking (Mouse & Mobile Touch)
  const isDraggingAimRef = useRef(false);
  const isDraggingPowerRightClickRef = useRef(false);
  const rightClickStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rightClickStartPowerRef = useRef<number>(0);
  const isPlacingCueRef = useRef(false);

  // Potted balls accumulator during current turn
  const turnPottedRef = useRef<Ball[]>([]);

  // Setup balls for current stage or 8-ball rack
  const initBoard = useCallback(() => {
    setPower(0);
    setIsMoving(false);
    setStageCleared(false);
    setStageFailed(false);
    setMatchWinner(null);
    setFoulMessage(null);
    setIsMatchStarted(false);
    turnPottedRef.current = [];

    if (mode === 'stage') {
      const cfg = STAGES[stageIndex] || STAGES[0];
      setRemainingShots(cfg.maxShots);

      const stageBalls: Ball[] = [];
      // 1. Cue ball
      stageBalls.push({
        id: 0,
        type: 'cue',
        number: 0,
        x: cfg.cuePos.x,
        y: cfg.cuePos.y,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: '#FFF',
        isPotted: false,
      });

      // 2. Stage object balls
      cfg.balls.forEach((b) => {
        stageBalls.push({
          id: b.id,
          type: b.id === 8 ? '8ball' : b.id <= 7 ? 'solid' : 'stripe',
          number: b.id,
          x: b.x,
          y: b.y,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: BALL_COLORS[b.id] || '#F59E0B',
          isPotted: false,
        });
      });

      ballsRef.current = stageBalls;

      // Auto aim toward first target ball
      if (cfg.balls.length > 0) {
        const first = cfg.balls[0];
        const initialAngle = Math.atan2(first.y - cfg.cuePos.y, first.x - cfg.cuePos.x);
        setAimAngle(initialAngle);
      }
    } else {
      // 8-Ball AI match setup
      const rackApexX = dim.playingLeft + (dim.playingRight - dim.playingLeft) * 0.72;
      const rackApexY = dim.playingTop + (dim.playingBottom - dim.playingTop) / 2;
      const rackedBalls = createRackBalls(rackApexX, rackApexY, BALL_RADIUS);

      // Cue ball at head line
      const cueBall: Ball = {
        id: 0,
        type: 'cue',
        number: 0,
        x: dim.playingLeft + (dim.playingRight - dim.playingLeft) * 0.25,
        y: rackApexY,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: '#FFF',
        isPotted: false,
      };

      ballsRef.current = [cueBall, ...rackedBalls];
      setTurn('player');
      setPlayerType(null);
      setAiType(null);
      setIsBallInHand(false);
      setAimAngle(0); // Aim directly at rack apex
    }
  }, [mode, stageIndex, dim.playingLeft, dim.playingRight, dim.playingTop, dim.playingBottom]);

  // Initial load
  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Handle Mute
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.isMuted = next;
  };

  // Convert client touch/mouse event to virtual coordinates
  const getVirtualCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Pointer Aiming & Power Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isMoving || isAiThinking || (mode === 'ai_8ball' && turn === 'ai')) return;
    const { x, y } = getVirtualCoords(e.clientX, e.clientY);

    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall) return;

    // Right-Click (button === 2) handles Power Adjustment!
    if (e.button === 2) {
      isDraggingPowerRightClickRef.current = true;
      rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
      rightClickStartPowerRef.current = power;
      e.currentTarget.setPointerCapture(e.pointerId);

      // Also if power is 0, give an initial responsive power (e.g. 0.3)
      if (power < 0.05) {
        setPower(0.3);
      }
      return;
    }

    // Left click on ball in hand
    if (isBallInHand) {
      isPlacingCueRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      placeCueBallAt(x, y);
      return;
    }

    // Left click drags aiming direction
    isDraggingAimRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateAimAt(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isMoving || isAiThinking) return;

    // Right-click dragging adjusts power! (Moving backward/downward increases power)
    if (isDraggingPowerRightClickRef.current) {
      const cueBall = ballsRef.current.find((b) => b.id === 0);
      const dy = e.clientY - rightClickStartPosRef.current.y;
      const dx = e.clientX - rightClickStartPosRef.current.x;

      // Also compute along cue pullback vector if available
      let deltaRatio = dy / 180;
      if (cueBall) {
        const cueDirX = Math.cos(aimAngle);
        const cueDirY = Math.sin(aimAngle);
        // Dragging away from aim direction increases power
        const dotPull = -(dx * cueDirX + dy * cueDirY);
        deltaRatio = dotPull / 150;
      }

      const newPower = Math.max(0, Math.min(1, rightClickStartPowerRef.current + deltaRatio));
      setPower(newPower);
      return;
    }

    const { x, y } = getVirtualCoords(e.clientX, e.clientY);

    if (isPlacingCueRef.current) {
      placeCueBallAt(x, y);
    } else if (isDraggingAimRef.current) {
      updateAimAt(x, y);
    }
  };

  const placeCueBallAt = (x: number, y: number) => {
    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall) return;

    // Clamp inside playing felt
    const clampedX = Math.max(dim.playingLeft + BALL_RADIUS + 5, Math.min(dim.playingRight - BALL_RADIUS - 5, x));
    const clampedY = Math.max(dim.playingTop + BALL_RADIUS + 5, Math.min(dim.playingBottom - BALL_RADIUS - 5, y));

    // Check if overlapping another ball
    const overlapping = ballsRef.current.some(
      (b) => b.id !== 0 && !b.isPotted && Math.hypot(b.x - clampedX, b.y - clampedY) < BALL_RADIUS * 2
    );

    if (!overlapping) {
      cueBall.x = clampedX;
      cueBall.y = clampedY;
      cueBall.isPotted = false;
    }
  };

  const updateAimAt = (x: number, y: number) => {
    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall) return;

    // Aim from cue ball toward pointer position
    const angle = Math.atan2(y - cueBall.y, x - cueBall.x);
    setAimAngle(angle);
  };

  // Fine-tuning angle (0.1° ultra-fine and 0.5° fine for pinpoint pocketing accuracy)
  const adjustAimFine = (deltaDegrees: number) => {
    if (isMoving || isAiThinking) return;
    setAimAngle((prev) => prev + (deltaDegrees * Math.PI) / 180);
  };

  // Execute shot
  const handleShootWithPower = useCallback((shotPower?: number) => {
    if (isMoving || isAiThinking || (mode === 'ai_8ball' && turn === 'ai')) return;
    const cueBall = ballsRef.current.find((b) => b.id === 0);
    if (!cueBall || cueBall.isPotted) return;

    const chosenPower = typeof shotPower === 'number' ? shotPower : power;
    const actualPower = Math.max(0.08, chosenPower);
    applyCueShot(cueBall, aimAngle, actualPower, spin);

    setPower(0);
    setIsMoving(true);
    turnPottedRef.current = [];

    if (mode === 'stage') {
      setRemainingShots((prev) => Math.max(0, prev - 1));
    } else if (mode === 'ai_8ball') {
      setIsMatchStarted(true);
    }
  }, [isMoving, isAiThinking, mode, turn, power, aimAngle, spin]);

  const handleShoot = useCallback(() => {
    handleShootWithPower();
  }, [handleShootWithPower]);

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If releasing right-click power drag, shoot immediately if power was set!
    if (isDraggingPowerRightClickRef.current) {
      isDraggingPowerRightClickRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      // Fire the shot on right-click release!
      if (power >= 0.05) {
        handleShootWithPower(power);
      }
      return;
    }

    if (isPlacingCueRef.current) {
      isPlacingCueRef.current = false;
      setIsBallInHand(false);
    }
    isDraggingAimRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Turn evaluation when all balls come to a complete stop
  const onTurnFinished = useCallback(() => {
    setIsMoving(false);
    const cueBall = ballsRef.current.find((b) => b.id === 0);
    const cueBallPotted = !cueBall || cueBall.isPotted;
    const pottedBalls = turnPottedRef.current;

    // A. Stage Mode Evaluation
    if (mode === 'stage') {
      const remainingTargets = currentStage.targetBalls.filter((id) => {
        const b = ballsRef.current.find((ball) => ball.id === id);
        return b && !b.isPotted;
      });

      if (remainingTargets.length === 0) {
        // Stage cleared!
        setStageCleared(true);
        sounds.playVictory();
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        return;
      }

      if (remainingShots <= 0 || cueBallPotted) {
        // Stage failed
        if (cueBallPotted) {
          sounds.playFoul();
        }
        setStageFailed(true);
        return;
      }

      // Respawn cue ball if it was pocketed and still have shots left
      if (cueBallPotted && cueBall) {
        cueBall.isPotted = false;
        cueBall.x = currentStage.cuePos.x;
        cueBall.y = currentStage.cuePos.y;
        cueBall.vx = 0;
        cueBall.vy = 0;
      }
      return;
    }

    // B. 8-Ball AI Match Rules Evaluation
    if (mode === 'ai_8ball') {
      const isPlayerTurn = turn === 'player';
      const eightBallPotted = pottedBalls.some((b) => b.number === 8);

      // Check 8-ball potted condition
      if (eightBallPotted) {
        const solidsLeft = ballsRef.current.filter((b) => !b.isPotted && b.number >= 1 && b.number <= 7).length;
        const stripesLeft = ballsRef.current.filter((b) => !b.isPotted && b.number >= 9 && b.number <= 15).length;
        const currentGroup = isPlayerTurn ? playerType : aiType;

        let won = false;
        if (currentGroup === 'solid' && solidsLeft === 0 && !cueBallPotted) won = true;
        if (currentGroup === 'stripe' && stripesLeft === 0 && !cueBallPotted) won = true;

        if (won) {
          setMatchWinner(isPlayerTurn ? 'player' : 'ai');
          sounds.playVictory();
          if (isPlayerTurn) {
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
          }
        } else {
          // Illegal 8-ball pot (Instant Loss)
          setMatchWinner(isPlayerTurn ? 'ai' : 'player');
          sounds.playFoul();
        }
        return;
      }

      // Cue ball scratch (Foul)
      if (cueBallPotted) {
        sounds.playFoul();
        setFoulMessage('수구(흰공) 스크래치 파울! 볼-인-핸드가 주어집니다.');
        if (cueBall) {
          cueBall.isPotted = false;
          cueBall.x = dim.playingLeft + (dim.playingRight - dim.playingLeft) * 0.25;
          cueBall.y = dim.playingTop + (dim.playingBottom - dim.playingTop) / 2;
          cueBall.vx = 0;
          cueBall.vy = 0;
        }

        // Switch turn and grant Ball-in-Hand
        const nextTurn = isPlayerTurn ? 'ai' : 'player';
        setTurn(nextTurn);
        if (nextTurn === 'player') {
          setIsBallInHand(true);
        }
        return;
      }

      // Group Assignment if open table
      let keepTurn = false;
      const objectPotted = pottedBalls.filter((b) => b.number >= 1 && b.number <= 15 && b.number !== 8);

      if (objectPotted.length > 0 && !playerType) {
        const first = objectPotted[0];
        const group = first.number <= 7 ? 'solid' : 'stripe';
        const otherGroup = group === 'solid' ? 'stripe' : 'solid';
        if (isPlayerTurn) {
          setPlayerType(group);
          setAiType(otherGroup);
          keepTurn = true;
        } else {
          setAiType(group);
          setPlayerType(otherGroup);
          keepTurn = true;
        }
      } else if (objectPotted.length > 0) {
        const currentGroup = isPlayerTurn ? playerType : aiType;
        const matched = objectPotted.some((b) =>
          currentGroup === 'solid' ? b.number <= 7 : b.number >= 9 && b.number <= 15
        );
        if (matched) {
          keepTurn = true;
        }
      }

      if (!keepTurn) {
        setTurn((prev) => (prev === 'player' ? 'ai' : 'player'));
      }
    }
  }, [mode, remainingShots, currentStage, turn, playerType, aiType, dim.playingLeft, dim.playingRight, dim.playingTop, dim.playingBottom]);

  // AI Turn Execution
  useEffect(() => {
    if (mode !== 'ai_8ball' || turn !== 'ai' || isMoving || matchWinner) return;

    setIsAiThinking(true);
    let shotTimer: NodeJS.Timeout;

    const thinkTimer = setTimeout(() => {
      const cueBall = ballsRef.current.find((b) => b.id === 0);
      if (!cueBall) {
        setIsAiThinking(false);
        return;
      }

      // If cue ball was potted or ball in hand, place it strategically for AI
      if (cueBall.isPotted) {
        cueBall.isPotted = false;
        if (aiDifficulty === 'hard' || aiDifficulty === 'impossible') {
          const smartPos = findBestBallInHandPosition(ballsRef.current, aiType, pockets, dim);
          cueBall.x = smartPos.x;
          cueBall.y = smartPos.y;
        } else {
          cueBall.x = dim.playingLeft + (dim.playingRight - dim.playingLeft) * 0.25;
          cueBall.y = dim.playingTop + (dim.playingBottom - dim.playingTop) / 2;
        }
        cueBall.vx = 0;
        cueBall.vy = 0;
      }

      // Calculate AI angle and power with selected difficulty
      const shot = calculateAIShot(cueBall, ballsRef.current, aiType, pockets, dim, aiDifficulty);
      setAimAngle(shot.angle);

      // Cue shot execution after aiming delay
      shotTimer = setTimeout(() => {
        applyCueShot(cueBall, shot.angle, shot.power, { x: 0, y: 0 });
        setIsMoving(true);
        setIsAiThinking(false);
        turnPottedRef.current = [];
      }, 650);
    }, 850);

    return () => {
      clearTimeout(thinkTimer);
      clearTimeout(shotTimer);
    };
  }, [mode, turn, isMoving, matchWinner, aiType, aiDifficulty, pockets, dim]);

  // Main 60 FPS Physics & Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.033, (currentTime - lastTime) / 1000); // Clamped dt
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }

      // Physics Sub-stepping for collision precision
      if (isMoving) {
        const subSteps = 6;
        const subDt = dt / subSteps;
        let anyMotion = false;

        for (let step = 0; step < subSteps; step++) {
          const res = updateBallPhysics(
            ballsRef.current,
            dim,
            pockets,
            subDt,
            (potted) => {
              turnPottedRef.current.push(potted);
            }
          );
          if (res.hasMovement) anyMotion = true;
        }

        if (!anyMotion) {
          onTurnFinished();
        }
      }

      // 1. Draw Table
      drawTable(ctx, dim, pockets);

      // 2. Draw Balls
      drawBalls(ctx, ballsRef.current);

      // 3. Draw Aim Assist & Cue Stick (When not moving and cue ball is alive)
      const cueBall = ballsRef.current.find((b) => b.id === 0);
      if (cueBall && !cueBall.isPotted && !isMoving) {
        const assist = calculateAimAssist(cueBall, aimAngle, ballsRef.current, dim);
        drawAimAssist(ctx, cueBall, aimAngle, assist);
        drawCueStick(ctx, cueBall, aimAngle, power);
      }

      // Ball in hand visual highlight
      if (isBallInHand && cueBall && !cueBall.isPotted) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, cueBall.radius * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isMoving, aimAngle, power, dim, pockets, isBallInHand, onTurnFinished]);

  // Stage progress calculations
  const targetBallsRemaining = currentStage.targetBalls.filter((id) => {
    const b = ballsRef.current.find((ball) => ball.id === id);
    return b && !b.isPotted;
  }).length;

  const playerPottedCount = ballsRef.current.filter((b) => {
    if (b.isPotted && playerType) {
      return playerType === 'solid' ? b.number >= 1 && b.number <= 7 : b.number >= 9 && b.number <= 15;
    }
    return false;
  }).length;

  const aiPottedCount = ballsRef.current.filter((b) => {
    if (b.isPotted && aiType) {
      return aiType === 'solid' ? b.number >= 1 && b.number <= 7 : b.number >= 9 && b.number <= 15;
    }
    return false;
  }).length;

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-neutral-950 flex flex-col items-center justify-between select-none overflow-hidden touch-none"
    >
      {/* Top HUD Bar */}
      <TopBar
        mode={mode}
        stageNumber={stageIndex + 1}
        remainingShots={remainingShots}
        targetBallsRemaining={targetBallsRemaining}
        totalTargetBalls={currentStage.targetBalls.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onRestart={initBoard}
        onOpenRules={() => setShowRules(true)}
        onChangeMode={(m) => {
          setMode(m);
          setStageIndex(0);
        }}
        turn={turn}
        playerType={playerType}
        aiType={aiType}
        playerPottedCount={playerPottedCount}
        aiPottedCount={aiPottedCount}
        aiDifficulty={aiDifficulty}
        isMatchStarted={isMatchStarted}
        onChangeAIDifficulty={setAiDifficulty}
      />

      {/* Center Table Area (Scales smoothly to viewport while maintaining 2:1 aspect ratio) */}
      <div className="relative flex-1 w-full max-w-6xl flex items-center justify-center p-2 sm:p-4">
        {/* Table Canvas Container */}
        <div className="relative w-full aspect-2/1 max-h-[82vh] rounded-2xl shadow-2xl overflow-hidden border-2 border-neutral-800 bg-neutral-900 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={VIRTUAL_WIDTH}
            height={VIRTUAL_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            onWheel={(e) => {
              e.preventDefault();
              // Mouse wheel rotates aim angle with 0.1° ultra precision
              const delta = e.deltaY > 0 ? 0.1 : -0.1;
              adjustAimFine(delta);
            }}
            className="w-full h-full object-contain cursor-crosshair touch-none select-none"
          />

          {/* Left Reference Cue Rack (Visual touch from reference) */}
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center bg-neutral-900/80 p-2 rounded-xl border border-neutral-700/60 shadow-lg pointer-events-none">
            <div className="w-1.5 h-48 bg-linear-to-b from-amber-600 via-amber-700 to-amber-900 rounded-full border border-amber-950 shadow-inner" />
            <div className="text-[9px] font-bold text-neutral-400 mt-2">CUE</div>
          </div>

          {/* AI Thinking Notice Badge */}
          {isAiThinking && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-emerald-500/50 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                AI 당구봇({aiDifficulty === 'easy' ? '쉬움' : aiDifficulty === 'normal' ? '보통' : aiDifficulty === 'hard' ? '어려움' : '불가능'})이 최적의 샷 각도를 계산 중입니다...
              </span>
            </div>
          )}

          {/* Ball in Hand Notice */}
          {isBallInHand && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-sky-950/90 border border-sky-400 text-sky-200 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-none animate-bounce">
              <AlertCircle className="w-4 h-4 text-sky-400" />
              테이블 위 원하는 위치를 터치/클릭하여 수구를 배치하세요
            </div>
          )}

          {/* Ultra-Fine Aiming Controls: 0.1° and 0.5° precise tuning buttons */}
          <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1.5 bg-neutral-900/90 p-1.5 rounded-xl border border-neutral-700/80 shadow-xl backdrop-blur-xs">
            <span className="text-[10px] font-bold text-neutral-400 px-1 uppercase tracking-tight hidden sm:inline">
              미세각도:
            </span>
            {/* Counter-Clockwise (Left) fine adjustments */}
            <button
              onClick={() => adjustAimFine(-0.5)}
              disabled={isMoving || isAiThinking}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 disabled:opacity-40 text-neutral-300 text-xs font-bold rounded-lg border border-neutral-700 transition"
              title="반시계방향 -0.5° 조정"
            >
              -0.5°
            </button>
            <button
              onClick={() => adjustAimFine(-0.1)}
              disabled={isMoving || isAiThinking}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 active:scale-95 disabled:opacity-40 text-xs font-black rounded-lg border border-amber-500/40 transition flex items-center gap-0.5"
              title="초정밀 반시계방향 -0.1° 조정"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              -0.1°
            </button>

            <div className="w-px h-4 bg-neutral-700 mx-0.5" />

            {/* Clockwise (Right) fine adjustments */}
            <button
              onClick={() => adjustAimFine(0.1)}
              disabled={isMoving || isAiThinking}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 active:scale-95 disabled:opacity-40 text-xs font-black rounded-lg border border-amber-500/40 transition flex items-center gap-0.5"
              title="초정밀 시계방향 +0.1° 조정"
            >
              +0.1°
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => adjustAimFine(0.5)}
              disabled={isMoving || isAiThinking}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 active:scale-95 disabled:opacity-40 text-neutral-300 text-xs font-bold rounded-lg border border-neutral-700 transition"
              title="시계방향 +0.5° 조정"
            >
              +0.5°
            </button>
          </div>
        </div>

        {/* Right Power Slider & Spin Widget */}
        <CueController
          power={power}
          onPowerChange={setPower}
          onShoot={handleShoot}
          spin={spin}
          onSpinChange={setSpin}
          disabled={isMoving || isAiThinking || (mode === 'ai_8ball' && turn === 'ai')}
        />
      </div>

      {/* Stage Clear Modal */}
      {stageCleared && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Award className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">스테이지 클리어!</h2>
            <p className="text-sm text-neutral-300 mb-5">
              {currentStage.title}을(를) 성공적으로 완료했습니다!
            </p>

            <div className="flex gap-2 w-full">
              <button
                onClick={initBoard}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 transition flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                다시하기
              </button>
              {stageIndex + 1 < STAGES.length ? (
                <button
                  onClick={() => {
                    setStageIndex((prev) => prev + 1);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1"
                >
                  <Play className="w-4 h-4 fill-current" />
                  다음 스테이지
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMode('ai_8ball');
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1"
                >
                  8볼 대전하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stage Failed Modal */}
      {stageFailed && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-red-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3 text-2xl font-bold">
              💔
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">스테이지 실패</h2>
            <p className="text-sm text-neutral-400 mb-5">
              타수를 모두 소모했거나 수구가 포켓에 빠졌습니다. 다시 도전해 보세요!
            </p>

            <button
              onClick={initBoard}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              다시 도전하기
            </button>
          </div>
        </div>
      )}

      {/* 8-Ball Match Winner Modal */}
      {matchWinner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 text-3xl ${
                matchWinner === 'player' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {matchWinner === 'player' ? '🏆' : '🤖'}
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">
              {matchWinner === 'player' ? '플레이어 승리!' : 'AI 당구봇 승리!'}
            </h2>
            <p className="text-sm text-neutral-400 mb-5">
              {matchWinner === 'player'
                ? '8번 공을 완벽하게 포켓에 넣어 승리하셨습니다!'
                : 'AI 당구봇이 게임에서 승리했습니다.'}
            </p>

            <button
              onClick={initBoard}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              새 경기 시작
            </button>
          </div>
        </div>
      )}

      {/* Rules & Help Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full shadow-2xl text-neutral-200">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              🎱 조작 방법 및 규칙 안내
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-neutral-300">
              <div className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700">
                <span className="font-bold text-amber-400 block mb-1">조준 및 발사:</span>
                • <strong className="text-emerald-400">좌클릭 드래그</strong>: 당구대 어디서든 조준 방향을 360° 회전합니다.
                <br />• <strong className="text-amber-400">우클릭 당겼다 놓기</strong>: 마우스 우클릭을 누른 채 뒤로 당겨 파워를 맞추고, <strong>우클릭을 놓으면 즉시 샷이 발사</strong>됩니다!
                <br />• <strong className="text-sky-400">우측 세로 슬라이더</strong>: 모바일 터치 및 마우스로 우측 바를 끌어당긴 뒤 놓아도 발사됩니다.
                <br />• <strong className="text-purple-400">초정밀 미세조정</strong>: 하단 좌우 <strong className="text-amber-300">±0.1°</strong> 및 <strong className="text-neutral-200">±0.5°</strong> 버튼 또는 <strong>마우스 휠(Wheel)</strong>로 아주 섬세한 각도 튜닝이 가능합니다.
              </div>

              <div className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700">
                <span className="font-bold text-amber-400 block mb-1">당점(스핀) 조절:</span>
                • 우측 상단의 흰색 당구공 버튼을 누른 후, 당점을 터치하여 상단(밀어치기/오시), 하단(당겨치기/히끼), 좌우 회전을 줄 수 있습니다.
              </div>

              <div className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700">
                <span className="font-bold text-amber-400 block mb-1">8볼 대전 규칙:</span>
                • 먼저 포켓에 들어간 공에 따라 단색(1~7번) 또는 줄무늬(9~15번) 진영이 배정됩니다.
                <br />• 자신의 목적구를 모두 넣은 뒤 마지막으로 8번 검은색 공을 넣어야 승리합니다.
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-600 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

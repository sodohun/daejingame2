export type BallType = 'cue' | 'solid' | 'stripe' | '8ball' | 'obstacle';

export interface Ball {
  id: number; // 0 is cue ball, 1-7 solids, 8 8-ball, 9-15 stripes, 99+ special
  type: BallType;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPotted: boolean;
  potAnimation?: number; // 0 to 1 for pocket drop visual
}

export interface Pocket {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface TableDimensions {
  width: number;
  height: number;
  playingLeft: number;
  playingRight: number;
  playingTop: number;
  playingBottom: number;
  cushionWidth: number;
  pocketRadius: number;
  ballRadius: number;
}

export interface AimAssist {
  targetBallId: number | null;
  hitX: number;
  hitY: number;
  cueBallAfterX: number;
  cueBallAfterY: number;
  targetBallDirX: number;
  targetBallDirY: number;
  cueTrajectoryLength: number;
  targetTrajectoryLength: number;
}

export interface CueSpin {
  x: number; // -1 to 1 (left to right spin / english)
  y: number; // -1 to 1 (draw to follow / backspin to topspin)
}

export type GameMode = 'stage' | 'ai_8ball' | 'free_practice';

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'impossible';

export interface StageConfig {
  id: number;
  title: string;
  description: string;
  cuePos: { x: number; y: number };
  balls: { id: number; x: number; y: number }[];
  targetBalls: number[]; // balls required to pot
  maxShots: number;
  obstacles?: { x: number; y: number; width: number; height: number }[];
}

export interface SoundEffectOptions {
  volume?: number;
  pitch?: number;
}

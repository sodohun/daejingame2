import React from 'react';
import { Volume2, VolumeX, RotateCcw, HelpCircle, Trophy, Sparkles, ChevronRight, User, Bot, Lock } from 'lucide-react';
import { GameMode, AIDifficulty } from '../types/game';

interface TopBarProps {
  mode: GameMode;
  stageNumber: number;
  remainingShots: number;
  targetBallsRemaining: number;
  totalTargetBalls: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
  onChangeMode: (mode: GameMode) => void;
  // 8-Ball AI specific props
  turn?: 'player' | 'ai';
  playerType?: 'solid' | 'stripe' | null;
  aiType?: 'solid' | 'stripe' | null;
  playerPottedCount?: number;
  aiPottedCount?: number;
  aiDifficulty: AIDifficulty;
  isMatchStarted?: boolean;
  onChangeAIDifficulty: (diff: AIDifficulty) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  stageNumber,
  remainingShots,
  targetBallsRemaining,
  totalTargetBalls,
  isMuted,
  onToggleMute,
  onRestart,
  onOpenRules,
  onChangeMode,
  turn,
  playerType,
  aiType,
  playerPottedCount = 0,
  aiPottedCount = 0,
  aiDifficulty,
  isMatchStarted = false,
  onChangeAIDifficulty,
}) => {
  return (
    <header className="w-full bg-linear-to-r from-neutral-900 via-neutral-850 to-neutral-900 border-b border-neutral-700/60 shadow-lg px-3 py-2 flex items-center justify-between text-white select-none z-30">
      {/* Left controls: Mode selector & Info */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
          <button
            onClick={() => onChangeMode('stage')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              mode === 'stage'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            스테이지 모드
          </button>
          <button
            onClick={() => onChangeMode('ai_8ball')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              mode === 'ai_8ball'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            8볼 AI 대전
          </button>
        </div>

        <button
          onClick={onOpenRules}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
          title="규칙 및 조작 가이드"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Middle Status (HUD directly inspired by reference image) */}
      <div className="flex items-center gap-4">
        {mode === 'stage' ? (
          <div className="flex items-center gap-4 bg-neutral-950/80 px-4 py-1 rounded-full border border-neutral-700">
            {/* Stage Level badge (e.g. Lv. 88 in screenshot) */}
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STAGE {stageNumber}</span>
            </div>

            <div className="h-3 w-px bg-neutral-700" />

            {/* Remaining shots / Lives (Heart count in screenshot) */}
            <div className="flex items-center gap-1.5">
              <span className="text-red-500 text-sm">❤️</span>
              <span className="font-extrabold text-sm font-mono text-neutral-100">{remainingShots}</span>
              <span className="text-[11px] text-neutral-400">남은 타수</span>
            </div>

            <div className="h-3 w-px bg-neutral-700" />

            {/* Target balls count (0/15 in screenshot) */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-blue-600 border border-white/80 shadow-xs flex items-center justify-center text-[9px] font-bold text-white">
                🎱
              </div>
              <span className="font-bold text-sm font-mono text-neutral-100">
                {totalTargetBalls - targetBallsRemaining} / {totalTargetBalls}
              </span>
            </div>
          </div>
        ) : (
          /* 8-Ball AI match status & Difficulty selector */
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-3 bg-neutral-950/80 px-3 py-1 rounded-full border border-neutral-700">
              {/* Player Info */}
              <div className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full ${turn === 'player' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50' : 'text-neutral-400'}`}>
                <User className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">플레이어 ({playerType ? (playerType === 'solid' ? '단색' : '줄무늬') : '미정'})</span>
                <span className="text-xs font-mono font-bold bg-neutral-800 px-1.5 py-0.2 rounded text-white">{playerPottedCount}/7</span>
              </div>

              <span className="text-xs font-bold text-neutral-500">VS</span>

              {/* AI Info */}
              <div className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full ${turn === 'ai' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50' : 'text-neutral-400'}`}>
                <Bot className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">AI 당구봇 ({aiType ? (aiType === 'solid' ? '단색' : '줄무늬') : '미정'})</span>
                <span className="text-xs font-mono font-bold bg-neutral-800 px-1.5 py-0.2 rounded text-white">{aiPottedCount}/7</span>
              </div>
            </div>

            {/* Difficulty Selector: Locked once match has started */}
            <div
              className={`flex items-center bg-neutral-950/90 rounded-lg p-0.5 border text-xs transition ${
                isMatchStarted ? 'border-neutral-800 opacity-80' : 'border-neutral-700'
              }`}
              title={
                isMatchStarted
                  ? '게임이 진행 중일 때는 난이도를 변경할 수 없습니다 (재시작 시 변경 가능)'
                  : 'AI 난이도 설정'
              }
            >
              <div className="flex items-center gap-1 px-1.5">
                {isMatchStarted && <Lock className="w-3 h-3 text-amber-400/90" />}
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight hidden md:inline">
                  {isMatchStarted ? '난이도(고정):' : '난이도:'}
                </span>
              </div>

              <button
                onClick={() => !isMatchStarted && onChangeAIDifficulty('easy')}
                disabled={isMatchStarted}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition disabled:cursor-not-allowed ${
                  aiDifficulty === 'easy'
                    ? 'bg-sky-500 text-neutral-950 shadow-sm'
                    : isMatchStarted
                    ? 'text-neutral-600'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="쉬움 (큰 조준 오차)"
              >
                쉬움
              </button>
              <button
                onClick={() => !isMatchStarted && onChangeAIDifficulty('normal')}
                disabled={isMatchStarted}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition disabled:cursor-not-allowed ${
                  aiDifficulty === 'normal'
                    ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                    : isMatchStarted
                    ? 'text-neutral-600'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="보통 (표준 당구 봇)"
              >
                보통
              </button>
              <button
                onClick={() => !isMatchStarted && onChangeAIDifficulty('hard')}
                disabled={isMatchStarted}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition disabled:cursor-not-allowed ${
                  aiDifficulty === 'hard'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : isMatchStarted
                    ? 'text-neutral-600'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="어려움 (정밀한 샷)"
              >
                어려움
              </button>
              <button
                onClick={() => !isMatchStarted && onChangeAIDifficulty('impossible')}
                disabled={isMatchStarted}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition disabled:cursor-not-allowed ${
                  aiDifficulty === 'impossible'
                    ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-400'
                    : isMatchStarted
                    ? 'text-neutral-600'
                    : 'text-neutral-400 hover:text-red-300'
                }`}
                title="불가능 (100% 무결점 당구 신)"
              >
                불가능
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right controls: Mute & Reset */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRestart}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
          title="재시작 (R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMute}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition"
          title={isMuted ? '음소거 해제' : '음소거'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

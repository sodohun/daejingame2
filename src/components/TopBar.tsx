import React from 'react';
import { Volume2, VolumeX, RotateCcw, HelpCircle, Trophy, Sparkles, Users, User } from 'lucide-react';
import { GameMode, PlayerId } from '../types/game';

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
  maxStages?: number;
  onSelectStage?: (stageIndex: number) => void;
  onResetStageProgress?: () => void;
  // 2-Player 8-Ball specific props
  turn?: PlayerId;
  player1Type?: 'solid' | 'stripe' | null;
  player2Type?: 'solid' | 'stripe' | null;
  player1PottedCount?: number;
  player2PottedCount?: number;
  firstPottedInfo?: {
    player: PlayerId;
    group: 'solid' | 'stripe';
    ballNumber: number;
  } | null;
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
  maxStages = 6,
  onSelectStage,
  onResetStageProgress,
  turn = 'player1',
  player1Type,
  player2Type,
  player1PottedCount = 0,
  player2PottedCount = 0,
  firstPottedInfo,
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
            onClick={() => onChangeMode('2p_8ball')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              mode === '2p_8ball'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            2인 포켓볼 게임
          </button>
        </div>

        <button
          onClick={onOpenRules}
          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer"
          title="규칙 및 조작 가이드"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Middle Status */}
      <div className="flex items-center gap-4">
        {mode === 'stage' ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-neutral-950/80 px-3.5 py-1 rounded-full border border-neutral-700">
              {/* Stage Level badge with quick switcher */}
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>STAGE</span>
                {onSelectStage ? (
                  <select
                    value={stageNumber - 1}
                    onChange={(e) => onSelectStage(Number(e.target.value))}
                    className="bg-neutral-800 text-amber-300 font-extrabold text-xs rounded px-1.5 py-0.5 border border-amber-500/40 focus:outline-hidden cursor-pointer hover:bg-neutral-700 transition"
                    title="스테이지 선택"
                  >
                    {Array.from({ length: maxStages }).map((_, idx) => (
                      <option key={idx} value={idx} className="bg-neutral-900 text-white font-semibold">
                        {idx + 1}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{stageNumber}</span>
                )}
              </div>

              <div className="h-3 w-px bg-neutral-700" />

              {/* Remaining shots / Lives */}
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 text-sm">❤️</span>
                <span className="font-extrabold text-sm font-mono text-neutral-100">{remainingShots}</span>
                <span className="text-[11px] text-neutral-400">남은 타수</span>
              </div>

              <div className="h-3 w-px bg-neutral-700" />

              {/* Target balls count */}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-blue-600 border border-white/80 shadow-xs flex items-center justify-center text-[9px] font-bold text-white">
                  🎱
                </div>
                <span className="font-bold text-sm font-mono text-neutral-100">
                  {totalTargetBalls - targetBallsRemaining} / {totalTargetBalls}
                </span>
              </div>
            </div>

            {/* Explicit Reset Stage Progress button */}
            {onResetStageProgress && (
              <button
                onClick={onResetStageProgress}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-800/90 hover:bg-red-950/50 hover:text-red-300 text-neutral-400 border border-neutral-700 hover:border-red-600/50 transition flex items-center gap-1 cursor-pointer"
                title="스테이지를 1단계부터 초기화합니다"
              >
                <RotateCcw className="w-3 h-3" />
                <span>스테이지 1부터 초기화</span>
              </button>
            )}
          </div>
        ) : (
          /* 2-Player 8-Ball match status (Player 1 vs Player 2) */
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-3 bg-neutral-950/80 px-3.5 py-1 rounded-full border border-neutral-700 shadow-inner">
              {/* Player 1 Info */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                  turn === 'player1'
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-md ring-2 ring-amber-300 scale-105'
                    : 'text-neutral-400 font-semibold opacity-75'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-xs">
                  플레이어 1 ({player1Type ? (player1Type === 'solid' ? '🔴 단색' : '🟡 줄무늬') : '미정'})
                </span>
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                    turn === 'player1' ? 'bg-neutral-900 text-amber-300' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {player1PottedCount}/7
                </span>
                {turn === 'player1' && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black animate-pulse">차례</span>}
              </div>

              <span className="text-xs font-black text-neutral-500 px-0.5">VS</span>

              {/* Player 2 Info */}
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                  turn === 'player2'
                    ? 'bg-sky-500 text-neutral-950 font-black shadow-md ring-2 ring-sky-300 scale-105'
                    : 'text-neutral-400 font-semibold opacity-75'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="text-xs">
                  플레이어 2 ({player2Type ? (player2Type === 'solid' ? '🔴 단색' : '🟡 줄무늬') : '미정'})
                </span>
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                    turn === 'player2' ? 'bg-neutral-900 text-sky-300' : 'bg-neutral-800 text-white'
                  }`}
                >
                  {player2PottedCount}/7
                </span>
                {turn === 'player2' && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black animate-pulse">차례</span>}
              </div>
            </div>

            {/* First potted notification banner */}
            {firstPottedInfo && (
              <div className="hidden lg:flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700 text-xs px-3 py-1 rounded-full text-neutral-300 shadow-md">
                <span className="text-emerald-400 font-bold">선공 득점:</span>
                <span>
                  {firstPottedInfo.player === 'player1' ? '플레이어 1' : '플레이어 2'}이(가){' '}
                  <strong className={firstPottedInfo.group === 'solid' ? 'text-amber-400' : 'text-sky-400'}>
                    {firstPottedInfo.ballNumber}번 ({firstPottedInfo.group === 'solid' ? '단색' : '줄무늬'})
                  </strong>{' '}
                  선점!
                </span>
              </div>
            )}
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

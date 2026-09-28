import { StageConfig } from '../types/game';

export const STAGES: StageConfig[] = [
  {
    id: 1,
    title: '스테이지 1: 기초 포켓팅',
    description: '코너 포켓 바로 앞의 1번 노란색 공을 정확히 집어넣으세요.',
    cuePos: { x: 300, y: 250 },
    balls: [
      { id: 1, x: 620, y: 250 },
    ],
    targetBalls: [1],
    maxShots: 2,
  },
  {
    id: 2,
    title: '스테이지 2: 사이드 포켓 컷샷',
    description: '적절한 각도로 2번 공을 상단 중간 포켓에 굴려 넣으세요.',
    cuePos: { x: 350, y: 350 },
    balls: [
      { id: 2, x: 500, y: 200 },
    ],
    targetBalls: [2],
    maxShots: 2,
  },
  {
    id: 3,
    title: '스테이지 3: 2구 연속 콤비네이션',
    description: '3번 공과 4번 공을 2타 이내에 모두 포켓에 넣으세요.',
    cuePos: { x: 260, y: 250 },
    balls: [
      { id: 3, x: 550, y: 180 },
      { id: 4, x: 650, y: 320 },
    ],
    targetBalls: [3, 4],
    maxShots: 3,
  },
  {
    id: 4,
    title: '스테이지 4: 트릭샷 - 키스샷(Kiss Shot)',
    description: '5번 공을 쳐서 6번 공을 코너 포켓으로 밀어 넣으세요.',
    cuePos: { x: 220, y: 300 },
    balls: [
      { id: 5, x: 520, y: 230 },
      { id: 6, x: 680, y: 160 },
    ],
    targetBalls: [6],
    maxShots: 2,
  },
  {
    id: 5,
    title: '스테이지 5: 뱅크샷(쿠션 반사)',
    description: '반대편 쿠션을 튕겨서 7번 공을 하단 포켓으로 넣으세요.',
    cuePos: { x: 600, y: 360 },
    balls: [
      { id: 7, x: 680, y: 180 },
    ],
    targetBalls: [7],
    maxShots: 3,
  },
  {
    id: 6,
    title: '스테이지 6: 마스터 3구 클리어',
    description: '좁은 각도에 흩어진 8번, 9번, 10번 공을 제한 타수 내에 모두 처리하세요.',
    cuePos: { x: 280, y: 250 },
    balls: [
      { id: 8, x: 580, y: 250 },
      { id: 9, x: 640, y: 180 },
      { id: 10, x: 660, y: 330 },
    ],
    targetBalls: [8, 9, 10],
    maxShots: 4,
  }
];

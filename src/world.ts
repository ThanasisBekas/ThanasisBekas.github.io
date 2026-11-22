export const T = 16;
export const W = 56;
export const H = 40;

export type PlaceId =
  | 'harbour' | 'treasury' | 'windmill' | 'hut' | 'library'
  | 'forge' | 'board' | 'post' | 'aqueduct' | 'watchtower';

export interface Place {
  id: PlaceId;
  name: string;
  /** Solid footprint, in tiles. The door is the tile below its middle. */
  x: number; y: number; w: number; h: number;
  /** The five quests carry a beacon. */
  quest?: string;
}

export interface Point { x: number; y: number }

export const PLACES: Place[] = [
  { id: 'harbour', name: 'Harbour sign', x: 25, y: 33, w: 1, h: 1 },
  { id: 'treasury', name: 'Treasury', x: 13, y: 8, w: 5, h: 4, quest: 'Main quest' },
  { id: 'windmill', name: 'Windmill', x: 25, y: 7, w: 3, h: 4, quest: 'First quest' },
  { id: 'aqueduct', name: 'Aqueduct', x: 42, y: 17, w: 5, h: 3, quest: 'Side quest' },
  { id: 'watchtower', name: 'Watchtower', x: 45, y: 27, w: 3, h: 4, quest: 'Side quest' },
  { id: 'hut', name: 'Snow hut', x: 44, y: 5, w: 4, h: 3, quest: 'Side quest' },
  { id: 'forge', name: 'Forge', x: 16, y: 27, w: 4, h: 3 },
  { id: 'library', name: 'Library', x: 9, y: 20, w: 4, h: 3 },
  { id: 'board', name: 'Notice board', x: 23, y: 20, w: 3, h: 1 },
  { id: 'post', name: 'Post house', x: 29, y: 23, w: 4, h: 3 },
];

export type IslanderId = 'shipwright' | 'traveller' | 'miller' | 'clerk' | 'lamplighter';

/** Someone who asks the builder a question. The words live in index.html. */
export interface Islander {
  id: IslanderId;
  name: string;
  x: number; y: number;
  /** The tile the builder walks to for a talk. */
  stand: Point;
  coat: string; hat: string; skin: string;
}

export const ISLANDERS: Islander[] = [
  { id: 'shipwright', name: 'Shipwright', x: 29, y: 34, stand: { x: 28, y: 34 }, coat: '#185fa5', hat: '#854f0b', skin: '#c68654' },
  { id: 'traveller', name: 'Traveller', x: 33, y: 27, stand: { x: 32, y: 27 }, coat: '#993c1d', hat: '#5f5e5a', skin: '#e3a47c' },
  { id: 'miller', name: 'Miller', x: 23, y: 13, stand: { x: 24, y: 13 }, coat: '#f1efe8', hat: '#b4b2a9', skin: '#f5c4b3' },
  { id: 'clerk', name: 'Clerk', x: 17, y: 13, stand: { x: 16, y: 13 }, coat: '#444441', hat: '#fac775', skin: '#a9683f' },
  { id: 'lamplighter', name: 'Lamplighter', x: 21, y: 29, stand: { x: 20, y: 29 }, coat: '#712b13', hat: '#ef9f27', skin: '#e3a47c' },
];

export const doorOf = (p: Place): Point => ({ x: p.x + Math.floor(p.w / 2), y: p.y + p.h });

export const START: Point = { x: 27, y: 34 };
export const BUG_SPAWNS: Point[] = [
  { x: 27, y: 28 }, { x: 18, y: 14 }, { x: 33, y: 14 }, { x: 13, y: 25 },
  { x: 49, y: 18 }, { x: 34, y: 32 }, { x: 46, y: 11 }, { x: 22, y: 30 },
];

export type Ground = 'sea' | 'river' | 'sand' | 'grass' | 'snow' | 'cliff' | 'path' | 'bridge';
export type Prop = 'olive' | 'cypress' | 'pine' | 'rock' | 'column';

/** Stable pseudo-random value from 0 to 1 for a tile. */
export function noise(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const index = (x: number, y: number) => y * W + x;
export const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

const ground: Ground[] = new Array<Ground>(W * H).fill('sea');
export const props = new Map<number, Prop>();
const solid = new Uint8Array(W * H);

export const groundAt = (x: number, y: number): Ground => (inside(x, y) ? ground[index(x, y)]! : 'sea');

// Straight roads as [x1, y1, x2, y2]
const ROADS: [number, number, number, number][] = [
  [27, 14, 27, 35], [15, 14, 49, 14], [15, 12, 15, 14], [26, 11, 26, 14],
  [24, 21, 24, 22], [24, 22, 27, 22], [11, 23, 11, 25], [11, 25, 27, 25],
  [18, 30, 27, 30], [27, 27, 31, 27], [31, 26, 31, 27], [25, 34, 27, 34],
  [27, 32, 49, 32], [46, 31, 46, 32], [49, 14, 49, 32], [44, 21, 49, 21],
  [44, 20, 44, 21], [46, 8, 46, 14],
];

function generate(): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.abs((x - 28) / 25) ** 3 + Math.abs((y - 19.5) / 18) ** 3
        + Math.sin(x * 0.8) * 0.035 + Math.cos(y * 0.9) * 0.035;
      if (d > 1.04) continue;
      const peak = x >= 36 + Math.round(Math.sin(y * 1.1) * 1.5) && y <= 11;
      const edge = x >= 36 && y === 12;
      ground[index(x, y)] = d > 0.88 && !peak ? 'sand' : edge ? 'cliff' : peak ? 'snow' : 'grass';
    }
  }

  for (let y = 12; y < H; y++) {
    const left = 37 + Math.round(Math.sin(y / 4));
    for (const x of [left, left + 1]) {
      if (groundAt(x, y) !== 'sea') ground[index(x, y)] = 'river';
    }
  }

  for (const [x1, y1, x2, y2] of ROADS) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const g = groundAt(x, y);
        ground[index(x, y)] = g === 'river' || g === 'bridge' || g === 'sea' ? 'bridge' : 'path';
      }
    }
  }
  for (let y = 35; y < H; y++) {
    for (const x of [27, 28]) ground[index(x, y)] = 'bridge';
  }

  const nearBuilding = (x: number, y: number) =>
    PLACES.some(p => x >= p.x - 1 && x <= p.x + p.w && y >= p.y - 2 && y <= p.y + p.h + 1);

  const nearRoad = (x: number, y: number) =>
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const g = groundAt(x + dx!, y + dy!);
      return g === 'path' || g === 'bridge';
    });

  for (let y = 1; y < H; y++) {
    for (let x = 1; x < W; x++) {
      if (nearBuilding(x, y) || nearRoad(x, y)) continue;
      const g = groundAt(x, y);
      const r = noise(x, y);
      if (g === 'grass' && r < 0.15) {
        props.set(index(x, y), r < 0.09 ? 'olive' : r < 0.125 ? 'cypress' : r < 0.142 ? 'rock' : 'column');
      } else if (g === 'snow' && r < 0.22) {
        props.set(index(x, y), r < 0.17 ? 'pine' : 'rock');
      }
    }
  }

  // Nothing grows where people stand and talk.
  for (const p of ISLANDERS) {
    props.delete(index(p.x, p.y));
    props.delete(index(p.stand.x, p.stand.y));
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = groundAt(x, y);
      if (g === 'sea' || g === 'river' || g === 'cliff' || props.has(index(x, y))) solid[index(x, y)] = 1;
    }
  }
  for (const p of PLACES) {
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) solid[index(x, y)] = 1;
    }
  }
  for (const p of ISLANDERS) solid[index(p.x, p.y)] = 1;
}

generate();

export const walkable = (x: number, y: number) => inside(x, y) && solid[index(x, y)] === 0;

/** Breadth-first route. Null when the target cannot be reached. */
export function findPath(from: Point, to: Point): Point[] | null {
  if (!walkable(to.x, to.y) || !inside(from.x, from.y)) return null;
  const start = index(from.x, from.y);
  const goal = index(to.x, to.y);
  const previous = new Int32Array(W * H).fill(-1);
  previous[start] = start;
  const queue = [start];
  for (const at of queue) {
    if (at === goal) {
      const route: Point[] = [];
      for (let i = at; i !== start; i = previous[i]!) route.push({ x: i % W, y: Math.floor(i / W) });
      return route.reverse();
    }
    const x = at % W;
    const y = Math.floor(at / W);
    for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]] as const) {
      if (!walkable(nx, ny)) continue;
      const next = index(nx, ny);
      if (previous[next] !== -1) continue;
      previous[next] = at;
      queue.push(next);
    }
  }
  return null;
}

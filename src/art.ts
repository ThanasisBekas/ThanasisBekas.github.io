// Every sprite and tile is drawn here in code. There are no borrowed assets.
import { T, W, H, groundAt, noise, type Islander, type Place, type Prop } from './world';

type G = CanvasRenderingContext2D;
export type Facing = 'up' | 'down' | 'left' | 'right';

function box(g: G, x: number, y: number, w: number, h: number, colour: string): void {
  g.fillStyle = colour;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

const INK = '#2c2c2a';

export function paintGround(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W * T;
  canvas.height = H * T;
  const g = canvas.getContext('2d')!;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = x * T;
      const b = y * T;
      const kind = groundAt(x, y);
      const r = noise(x, y, 2);
      const u = Math.floor(noise(x, y, 3) * 11);
      const v = Math.floor(noise(x, y, 4) * 11);

      switch (kind) {
        case 'sea': {
          const coast = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => groundAt(x + dx!, y + dy!) !== 'sea');
          box(g, a, b, T, T, coast ? '#2b7bb5' : '#174f86');
          break;
        }
        case 'river':
          box(g, a, b, T, T, '#378add');
          if (groundAt(x - 1, y) !== 'river') box(g, a, b, 2, T, '#85b7eb');
          if (groundAt(x + 1, y) !== 'river') box(g, a + 14, b, 2, T, '#85b7eb');
          break;
        case 'sand':
          box(g, a, b, T, T, '#efd39a');
          box(g, a + u, b + v, 2, 1, '#d6b273');
          box(g, a + v, b + u + 3, 1, 1, '#fff0c8');
          if (groundAt(x, y + 1) === 'sea') box(g, a, b + 14, T, 2, '#e6f1fb');
          if (groundAt(x, y - 1) === 'sea') box(g, a, b, T, 2, '#e6f1fb');
          if (groundAt(x + 1, y) === 'sea') box(g, a + 14, b, 2, T, '#e6f1fb');
          if (groundAt(x - 1, y) === 'sea') box(g, a, b, 2, T, '#e6f1fb');
          break;
        case 'grass':
          box(g, a, b, T, T, r < 0.5 ? '#6f9e38' : '#73a23b');
          box(g, a + u, b + v + 2, 1, 3, '#97c459');
          box(g, a + u + 2, b + v + 3, 1, 2, '#97c459');
          box(g, a + v, b + u, 2, 1, '#5b882b');
          if (r < 0.1) {
            box(g, a + u + 1, b + v, 3, 1, r < 0.05 ? '#ed93b1' : '#fac775');
            box(g, a + u + 2, b + v - 1, 1, 3, r < 0.05 ? '#ed93b1' : '#fac775');
          }
          break;
        case 'snow':
          box(g, a, b, T, T, '#dce9f2');
          box(g, a + u, b + v, 4, 1, '#f8fcff');
          box(g, a + v, b + u + 4, 2, 1, '#b9cfdd');
          break;
        case 'cliff':
          box(g, a, b, T, T, '#77756e');
          box(g, a, b, T, 4, '#dce9f2');
          box(g, a + 2, b + 5, 5, 10, '#8f8d85');
          box(g, a + 10, b + 6, 4, 8, '#65635d');
          box(g, a, b + 15, T, 1, '#444441');
          break;
        case 'path':
          box(g, a, b, T, T, '#d9b877');
          box(g, a + u, b + v, 3, 2, '#c5a15f');
          box(g, a + v + 1, b + u + 2, 2, 1, '#ead09b');
          break;
        case 'bridge':
          box(g, a, b, T, T, '#9a6330');
          for (let k = 0; k < T; k += 4) box(g, a, b + k, T, 1, '#633806');
          box(g, a + 2, b + 2, 1, 1, INK);
          box(g, a + 12, b + 10, 1, 1, INK);
          break;
      }
    }
  }
  return canvas;
}

export function drawProp(g: G, kind: Prop, x: number, y: number): void {
  switch (kind) {
    case 'olive':
      box(g, x + 2, y + 13, 12, 3, '#557f29');
      box(g, x + 7, y + 6, 3, 9, '#633806');
      box(g, x + 5, y + 8, 2, 3, '#633806');
      box(g, x, y, 16, 8, '#3b6d11');
      box(g, x + 2, y - 4, 12, 4, '#3b6d11');
      box(g, x + 3, y - 3, 6, 3, '#7ea34f');
      box(g, x + 10, y + 1, 4, 3, '#55852a');
      box(g, x + 4, y + 4, 2, 2, '#26215c');
      box(g, x + 11, y + 5, 2, 2, '#26215c');
      break;
    case 'cypress':
      box(g, x + 4, y + 13, 9, 3, '#557f29');
      box(g, x + 7, y + 11, 2, 4, '#633806');
      box(g, x + 4, y - 7, 8, 18, '#24500f');
      box(g, x + 5, y - 11, 6, 4, '#24500f');
      box(g, x + 7, y - 14, 2, 3, '#24500f');
      box(g, x + 5, y - 6, 2, 13, '#3b6d11');
      break;
    case 'pine':
      box(g, x + 7, y + 10, 3, 5, '#633806');
      for (let i = 0; i < 4; i++) {
        box(g, x + 6 - i * 2, y - 8 + i * 5, 4 + i * 4, 5, '#285c4d');
        box(g, x + 6 - i * 2, y - 8 + i * 5, 3 + i * 2, 2, '#f8fcff');
      }
      break;
    case 'rock':
      box(g, x + 3, y + 8, 11, 7, '#65635d');
      box(g, x + 5, y + 5, 7, 4, '#8f8d85');
      box(g, x + 5, y + 7, 3, 3, '#b4b2a9');
      break;
    case 'column':
      box(g, x + 3, y + 12, 10, 3, '#b4b2a9');
      box(g, x + 5, y + 1, 6, 11, '#f1efe8');
      box(g, x + 8, y + 1, 3, 11, '#c9c7be');
      box(g, x + 5, y - 1, 3, 2, '#f1efe8');
      break;
  }
}

function doorway(g: G, centre: number, bottom: number): void {
  box(g, centre - 8, bottom - 19, 16, 19, INK);
  box(g, centre - 6, bottom - 17, 12, 17, '#633806');
  box(g, centre - 1, bottom - 17, 2, 17, '#854f0b');
  box(g, centre + 3, bottom - 9, 2, 2, '#fac775');
}

function pane(g: G, x: number, y: number, colour = '#378add'): void {
  box(g, x, y, 10, 11, INK);
  box(g, x + 2, y + 2, 6, 7, colour);
  box(g, x + 4, y + 2, 2, 7, INK);
}

function walls(g: G, x: number, y: number, w: number, h: number, colour: string, shade: string): void {
  box(g, x - 1, y - 1, w + 2, h + 1, INK);
  box(g, x, y, w, h, colour);
  for (let row = 5; row < h; row += 8) {
    for (let col = row % 16 === 5 ? 2 : 10; col < w - 6; col += 16) box(g, x + col, y + row, 6, 1, shade);
  }
  box(g, x + w - 4, y, 4, h, shade);
}

function gable(g: G, x: number, y: number, w: number, colour: string, light: string, steps = 5): void {
  for (let i = 0; i < steps; i++) {
    const inset = (steps - 1 - i) * 6;
    box(g, x + inset - 1, y + i * 4 - 1, w - inset * 2 + 2, 6, INK);
    box(g, x + inset, y + i * 4, w - inset * 2, 4, colour);
    box(g, x + inset, y + i * 4, w - inset * 2, 1, light);
  }
}

export function drawPlace(g: G, p: Place, time: number): void {
  const x = p.x * T;
  const y = p.y * T;
  const w = p.w * T;
  const bottom = (p.y + p.h) * T;
  const door = (p.x + Math.floor(p.w / 2) + 0.5) * T;

  switch (p.id) {
    case 'harbour':
      box(g, x + 7, y + 3, 3, 13, '#633806');
      box(g, x - 2, y - 5, 21, 11, INK);
      box(g, x - 1, y - 4, 19, 9, '#d9b877');
      box(g, x + 2, y - 2, 12, 1, '#633806');
      box(g, x + 2, y + 1, 8, 1, '#633806');
      break;

    case 'treasury':
      walls(g, x + 2, y + 10, w - 4, bottom - y - 10, '#d3d1c7', '#b4b2a9');
      gable(g, x - 2, y - 12, w + 4, '#e8e6dc', '#ffffff', 6);
      box(g, door - 5, y + 1, 10, 7, '#ef9f27');
      box(g, door - 2, y + 3, 4, 3, '#fac775');
      for (const k of [5, 18, w - 25, w - 12]) {
        box(g, x + k, y + 15, 7, bottom - y - 15, '#f8f7f1');
        box(g, x + k + 5, y + 15, 2, bottom - y - 15, '#a6a49b');
        box(g, x + k - 1, y + 14, 9, 3, '#ffffff');
      }
      box(g, x - 2, bottom - 4, w + 4, 4, '#b4b2a9');
      doorway(g, door, bottom);
      break;

    case 'windmill': {
      walls(g, x + 7, y + 8, w - 14, bottom - y - 8, '#f8f7f1', '#d3d1c7');
      gable(g, x + 4, y - 11, w - 8, '#185fa5', '#85b7eb', 4);
      doorway(g, door, bottom);
      const cx = door;
      const cy = y + 10;
      for (let arm = 0; arm < 4; arm++) {
        const angle = time * 0.7 + 0.4 + (arm * Math.PI) / 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        for (let d = 2; d < 30; d += 2) {
          if (d > 9) box(g, cx + dx * d - dy * 4 - 2, cy + dy * d + dx * 4 - 2, 5, 5, '#fff3d0');
          box(g, cx + dx * d - 1, cy + dy * d - 1, 3, 3, '#633806');
        }
      }
      box(g, cx - 3, cy - 3, 7, 7, INK);
      break;
    }

    case 'hut':
      walls(g, x + 4, y + 8, w - 8, bottom - y - 8, '#854f0b', '#633806');
      box(g, x + w - 15, y - 16, 7, 17, '#65635d');
      gable(g, x, y - 10, w, '#e6f1fb', '#ffffff');
      pane(g, x + 8, y + 18, '#fac775');
      box(g, x + w - 12, y + 16, 2, 29, '#d85a30');
      box(g, x + w - 8, y + 16, 2, 29, '#378add');
      doorway(g, door, bottom);
      break;

    case 'library':
      walls(g, x + 3, y + 8, w - 6, bottom - y - 8, '#f8f7f1', '#d3d1c7');
      gable(g, x, y - 10, w, '#185fa5', '#85b7eb');
      pane(g, x + 8, y + 17);
      pane(g, x + w - 15, y + 17);
      box(g, door - 8, y + 12, 7, 8, '#d85a30');
      box(g, door + 1, y + 12, 7, 8, '#3b6d11');
      doorway(g, door, bottom);
      break;

    case 'forge':
      walls(g, x + 3, y + 8, w - 6, bottom - y - 8, '#888780', '#65635d');
      box(g, x + w - 18, y - 22, 11, 24, '#444441');
      box(g, x + w - 19, y - 23, 13, 4, INK);
      gable(g, x, y - 10, w, '#993c1d', '#d85a30');
      pane(g, x + 7, y + 17, Math.sin(time * 5) > 0 ? '#ef9f27' : '#d85a30');
      box(g, x + w - 14, bottom - 9, 11, 4, INK);
      box(g, x + w - 11, bottom - 5, 5, 5, INK);
      for (let i = 0; i < 3; i++) {
        const rise = (time * 9 + i * 11) % 33;
        box(g, x + w - 15 + Math.sin(rise / 5) * 3, y - 27 - rise, 5, 4, 'rgba(241,239,232,.55)');
      }
      doorway(g, door, bottom);
      break;

    case 'board':
      box(g, x + 4, y, 4, 16, '#633806');
      box(g, x + w - 8, y, 4, 16, '#633806');
      box(g, x, y - 15, w, 22, INK);
      box(g, x + 2, y - 13, w - 4, 18, '#854f0b');
      box(g, x + 5, y - 10, 10, 11, '#fff8e7');
      box(g, x + 19, y - 11, 10, 8, '#fac775');
      box(g, x + 33, y - 9, 9, 11, '#e6f1fb');
      break;

    case 'post':
      walls(g, x + 3, y + 8, w - 6, bottom - y - 8, '#f8f7f1', '#d3d1c7');
      gable(g, x, y - 10, w, '#d85a30', '#f0997b');
      pane(g, x + 8, y + 17);
      box(g, x + w - 18, y + 16, 12, 9, INK);
      box(g, x + w - 17, y + 17, 10, 7, '#fff8e7');
      box(g, x + w - 15, y + 19, 6, 2, '#d85a30');
      doorway(g, door, bottom);
      break;

    case 'aqueduct': {
      // The raised channel runs back to the river.
      const from = 37 * T;
      box(g, from, y - 7, x + w - from, 14, INK);
      box(g, from + 1, y - 6, x + w - from - 2, 12, '#d3d1c7');
      box(g, from + 1, y - 4, x + w - from - 2, 5, '#378add');
      for (let k = from + 3; k < x + w - 6; k += 14) {
        box(g, k + ((time * 18) % 10), y - 2, 5, 1, '#b5d4f4');
      }
      for (let k = from; k < x; k += 28) box(g, k, y + 6, 8, 22, '#b4b2a9');
      walls(g, x, y + 8, w, bottom - y - 8, '#d3d1c7', '#a6a49b');
      for (const k of [7, w - 25]) {
        box(g, x + k + 2, bottom - 28, 14, 4, '#65635d');
        box(g, x + k, bottom - 24, 18, 24, '#444441');
      }
      doorway(g, door, bottom);
      break;
    }

    case 'watchtower':
      walls(g, x + 5, y - 8, w - 10, bottom - y + 8, '#a6a49b', '#888780');
      for (const k of [2, 14, 26, 38]) {
        box(g, x + k, y - 19, 8, 12, INK);
        box(g, x + k + 1, y - 18, 6, 10, '#b4b2a9');
      }
      pane(g, door - 5, y + 4, '#fac775');
      box(g, x - 4, y + 4, 3, bottom - y - 4, '#854f0b');
      box(g, x + w + 1, y + 14, 3, bottom - y - 14, '#854f0b');
      box(g, x - 6, y + 12, 17, 3, '#ba7517');
      box(g, x - 6, y + 34, 17, 3, '#ba7517');
      box(g, x + w - 9, y + 24, 15, 3, '#ba7517');
      doorway(g, door, bottom);
      break;
  }
}

export function drawBeacon(g: G, p: Place, lit: boolean, time: number): void {
  const x = (p.x + p.w) * T + 5;
  const y = (p.y + p.h) * T;
  box(g, x - 1, y - 17, 9, 18, INK);
  box(g, x, y - 16, 7, 16, '#888780');
  box(g, x - 3, y - 21, 13, 5, INK);
  if (!lit) {
    box(g, x, y - 20, 7, 2, '#65635d');
    return;
  }
  const f = Math.floor(time * 8) % 3;
  box(g, x - 9, y - 38, 25, 25, 'rgba(250,199,117,.22)');
  box(g, x - 1, y - 27 - f, 9, 8 + f, '#d85a30');
  box(g, x + 1, y - 30 + f, 5, 10 - f, '#ef9f27');
  box(g, x + 2, y - 24, 3, 4, '#fff3c4');
}

/** x and y are the feet. */
export function drawHero(g: G, px: number, py: number, facing: Facing, step: number, moving: boolean): void {
  const stride = moving ? (Math.floor(step) % 2 === 0 ? 1 : -1) : 0;
  const bob = moving && stride === 1 ? 1 : 0;
  const x = Math.round(px) - 8;
  const y = Math.round(py) - 22 - bob;
  const side = facing === 'left' || facing === 'right';

  box(g, x + 2, py - 1, 12, 3, 'rgba(20,33,61,.28)');
  box(g, x + 4, y + 18 + Math.max(0, stride), 3, 4, INK);
  box(g, x + 9, y + 18 + Math.max(0, -stride), 3, 4, INK);

  box(g, x + 3, y + 10, 10, 9, INK);
  box(g, x + 4, y + 10, 8, 8, '#3c3489');
  box(g, x + 4, y + 16, 8, 1, '#fac775');
  box(g, x + 3, y + 10, 10, 2, '#d85a30');
  if (facing === 'up') box(g, x + 7, y + 11, 3, 5, '#d85a30');
  if (side) box(g, facing === 'right' ? x : x + 13, y + 10 + bob, 3, 2, '#d85a30');

  box(g, x + 4, y + 2, 8, 8, '#e3a47c');
  box(g, x + 3, y, 10, 4, '#33251f');
  box(g, x + 5, y - 1, 2, 1, '#33251f');
  box(g, x + 9, y - 1, 2, 1, '#33251f');
  if (facing === 'up') box(g, x + 4, y + 3, 8, 5, '#33251f');
  if (facing === 'down') {
    box(g, x + 5, y + 5, 2, 2, INK);
    box(g, x + 9, y + 5, 2, 2, INK);
  }
  if (facing === 'left') {
    box(g, x + 5, y + 5, 2, 2, INK);
    box(g, x + 10, y + 3, 2, 5, '#33251f');
  }
  if (facing === 'right') {
    box(g, x + 9, y + 5, 2, 2, INK);
    box(g, x + 4, y + 3, 2, 5, '#33251f');
  }

  const hand = facing === 'left' || facing === 'up' ? x : x + 12;
  box(g, hand + 1, y + 12, 2, 3, '#e3a47c');
  box(g, hand - 2, y + 12, 8, 10, 'rgba(250,199,117,.25)');
  box(g, hand, y + 14, 4, 6, INK);
  box(g, hand + 1, y + 15, 2, 4, '#fac775');
}

export function drawBug(g: G, x: number, y: number, time: number): void {
  const leg = Math.floor(time * 7) % 2;
  box(g, x - 6, y, 12, 2, 'rgba(20,33,61,.25)');
  for (const k of [-6, -3]) {
    box(g, x - 7, y + k + leg, 3, 1, INK);
    box(g, x + 4, y + k + 1 - leg, 3, 1, INK);
  }
  box(g, x - 5, y - 8, 10, 8, INK);
  box(g, x - 4, y - 7, 8, 6, '#c4372f');
  box(g, x, y - 7, 1, 6, INK);
  box(g, x - 3, y - 11, 6, 4, INK);
  box(g, x - 2, y - 10, 1, 1, '#fac775');
  box(g, x + 1, y - 10, 1, 1, '#fac775');
}

/** An islander faces the builder. A question bubble shows until they have talked. */
export function drawIslander(g: G, p: Islander, heroX: number, met: boolean, time: number): void {
  const x = p.x * T;
  const feet = p.y * T + 11;
  const breath = Math.floor(time * 1.4 + p.x) % 2;
  const y = feet - 22 + breath;
  const look = heroX < x - 4 ? -1 : heroX > x + T + 4 ? 1 : 0;

  box(g, x + 2, feet - 1, 12, 3, 'rgba(20,33,61,.28)');
  box(g, x + 4, feet - 4, 3, 4, INK);
  box(g, x + 9, feet - 4, 3, 4, INK);
  box(g, x + 2, y + 9, 12, 10 - breath, INK);
  box(g, x + 3, y + 10, 10, 8 - breath, p.coat);
  box(g, x + 1, y + 12, 2, 4, p.skin);
  box(g, x + 13, y + 12, 2, 4, p.skin);
  box(g, x + 4, y + 3, 8, 7, p.skin);
  box(g, x + 5 + look, y + 5, 2, 2, INK);
  box(g, x + 9 + look, y + 5, 2, 2, INK);
  box(g, x + 3, y, 10, 4, p.hat);

  switch (p.id) {
    case 'shipwright':
      box(g, x + 14, y + 9, 2, 8, '#633806');
      box(g, x + 12, y + 8, 6, 3, INK);
      break;
    case 'traveller':
      box(g, x + 1, y + 3, 14, 2, p.hat);
      box(g, x, y + 10, 2, 12 - breath, '#633806');
      break;
    case 'miller':
      box(g, x + 5, y + 11, 6, 7 - breath, '#d9b877');
      break;
    case 'clerk':
      box(g, x + 10, y + 12, 6, 6, '#fff8e7');
      box(g, x + 12, y + 14, 2, 1, INK);
      break;
    case 'lamplighter':
      box(g, x + 15, y + 2, 2, 20 - breath, '#633806');
      box(g, x + 14, y - 2, 4, 5, '#fac775');
      break;
  }

  if (met) return;
  box(g, x + 2, y - 14, 12, 11, INK);
  box(g, x + 3, y - 13, 10, 9, '#fff8e7');
  box(g, x + 6, y - 4, 4, 2, '#fff8e7');
  box(g, x + 6, y - 12, 4, 1, INK);
  box(g, x + 9, y - 11, 1, 2, INK);
  box(g, x + 7, y - 9, 2, 1, INK);
  box(g, x + 7, y - 8, 1, 1, INK);
  box(g, x + 7, y - 6, 1, 1, INK);
}

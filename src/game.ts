import { drawBeacon, drawBug, drawHero, drawPlace, drawProp, paintGround, type Facing } from './art';
import { play } from './sound';
import {
  BUG_SPAWNS, H, PLACES, START, T, W,
  doorOf, findPath, groundAt, noise, props, walkable,
  type Place, type Point,
} from './world';

export type Mode = 'title' | 'game' | 'cv';

interface Events {
  open(place: Place): void;
  near(place: Place | null): void;
  fixed(count: number, total: number): void;
  say(text: string): void;
  paused(): boolean;
}

interface Bug extends Point { vx: number; vy: number; wait: number }
interface Spark extends Point { vx: number; vy: number; life: number }

const WALK = 92;
const TRAVEL = 260;
const REACH = 46;

const DIRECTIONS: Record<string, Facing> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

const centre = (t: Point): Point => ({ x: t.x * T + T / 2, y: t.y * T + 11 });
const tileOf = (p: Point): Point => ({ x: Math.floor(p.x / T), y: Math.floor(p.y / T) });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

function fits(x: number, y: number): boolean {
  return [x - 3, x + 3].every(a => [y - 3, y + 1].every(b => walkable(Math.floor(a / T), Math.floor(b / T))));
}

export class Game {
  private g: CanvasRenderingContext2D;
  private ground = paintGround();
  private still = matchMedia('(prefers-reduced-motion: reduce)');
  private mode: Mode = 'title';

  private hero = centre(START);
  private facing: Facing = 'up';
  private moving = false;
  private step = 0;
  private route: Point[] = [];
  private destination: Place | null = null;
  private speed = WALK;
  private held = new Set<string>();
  private nearby: Place | null = null;

  private bugs: Bug[] = BUG_SPAWNS.map(t => ({ ...centre(t), vx: 0, vy: 0, wait: 0 }));
  private sparks: Spark[] = [];
  private glow = 0;
  private warned = false;
  private lit = new Set<string>();

  private scale = 3;
  private camera: Point = { x: 0, y: 0 };
  private time = 0;
  private last = 0;
  private frame = 0;

  constructor(private canvas: HTMLCanvasElement, private events: Events) {
    this.g = canvas.getContext('2d', { alpha: false })!;
    canvas.addEventListener('pointerdown', e => this.tap(e));
    addEventListener('keydown', e => this.key(e));
    addEventListener('keyup', e => this.held.delete(e.code));
    addEventListener('blur', () => this.held.clear());
    addEventListener('resize', () => {
      if (this.mode !== 'cv') this.resize();
    });
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.stop();
    cancelAnimationFrame(this.frame);
    if (mode === 'cv') return;
    this.resize();
    this.last = performance.now();
    this.frame = requestAnimationFrame(now => this.loop(now));
  }

  stop(): void {
    this.held.clear();
    this.route = [];
    this.destination = null;
    this.moving = false;
  }

  light(place: Place): void {
    this.lit.add(place.id);
  }

  enter(): void {
    if (!this.nearby) return;
    const place = this.nearby;
    this.stop();
    this.events.open(place);
  }

  travel(place: Place): void {
    this.stop();
    const door = doorOf(place);
    if (this.still.matches) {
      this.hero = centre(door);
      this.facing = 'up';
      this.events.open(place);
    } else {
      this.walkTo(door, place, TRAVEL);
    }
  }

  lantern(): void {
    this.glow = 0.4;
    play('lantern');
    const before = this.bugs.length;
    this.bugs = this.bugs.filter(bug => {
      if (distance(bug, this.hero) > REACH) return true;
      if (!this.still.matches) {
        for (let i = 0; i < 10; i++) {
          this.sparks.push({
            x: bug.x, y: bug.y - 5, life: 0.5,
            vx: Math.cos(i * 0.63) * 38, vy: Math.sin(i * 0.63) * 38,
          });
        }
      }
      return false;
    });
    if (this.bugs.length === before) return;

    play('fixed');
    const total = BUG_SPAWNS.length;
    this.events.fixed(total - this.bugs.length, total);
    this.events.say(this.bugs.length ? 'Bug fixed.' : 'All bugs fixed. The island is stable.');
  }

  drawMinimap(canvas: HTMLCanvasElement): void {
    canvas.width = W * T;
    canvas.height = H * T;
    const g = canvas.getContext('2d')!;
    g.drawImage(this.ground, 0, 0);
    for (const p of PLACES) drawPlace(g, p, 0);
    for (const p of PLACES) {
      if (p.quest) drawBeacon(g, p, this.lit.has(p.id), 0);
    }
    g.fillStyle = '#14213d';
    g.fillRect(this.hero.x - 10, this.hero.y - 10, 20, 20);
    g.fillStyle = '#fac775';
    g.fillRect(this.hero.x - 6, this.hero.y - 6, 12, 12);
  }

  private walkTo(tile: Point, destination: Place | null, speed: number): void {
    const route = findPath(tileOf(this.hero), tile);
    if (!route) return;
    this.route = [...route.map(centre), centre(tile)];
    this.destination = destination;
    this.speed = speed;
  }

  private key(e: KeyboardEvent): void {
    if (this.mode !== 'game' || this.events.paused() || e.metaKey || e.ctrlKey || e.altKey) return;
    // Leave Enter and Space alone on a focused button or link.
    const onControl = e.target instanceof Element && e.target.closest('a, button') !== null;

    if (DIRECTIONS[e.code]) {
      e.preventDefault();
      this.route = [];
      this.destination = null;
      this.held.add(e.code);
      if (onControl) this.canvas.focus();
    } else if (!onControl && !e.repeat && (e.code === 'Enter' || e.code === 'KeyE')) {
      e.preventDefault();
      this.enter();
    } else if (!onControl && e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.lantern();
    }
  }

  private tap(e: PointerEvent): void {
    if (this.mode !== 'game' || this.events.paused()) return;
    e.preventDefault();
    this.canvas.focus();
    const rect = this.canvas.getBoundingClientRect();
    const at = {
      x: ((e.clientX - rect.left) * this.canvas.width) / rect.width / this.scale + this.camera.x,
      y: ((e.clientY - rect.top) * this.canvas.height) / rect.height / this.scale + this.camera.y,
    };

    // Roofs stand above the footprint, so they count as the building too.
    const place = PLACES.find(p =>
      at.x >= p.x * T && at.x < (p.x + p.w) * T && at.y >= p.y * T - 20 && at.y < (p.y + p.h) * T);
    if (place) {
      this.walkTo(doorOf(place), place, WALK * 1.4);
      return;
    }
    if (distance(at, { x: this.hero.x, y: this.hero.y - 10 }) < 14) {
      this.lantern();
      return;
    }
    this.walkTo(tileOf(at), null, WALK * 1.4);
  }

  private face(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';
  }

  private moveByKeys(dt: number): void {
    let dx = 0;
    let dy = 0;
    for (const code of this.held) {
      const d = DIRECTIONS[code];
      if (d === 'up') dy = -1;
      if (d === 'down') dy = 1;
      if (d === 'left') dx = -1;
      if (d === 'right') dx = 1;
    }
    if (!dx && !dy) return;
    this.face(dx, dy);
    const travel = (WALK * dt) / Math.hypot(dx, dy);
    const steps = Math.ceil(travel / 2);
    for (let i = 0; i < steps; i++) {
      const nx = this.hero.x + (dx * travel) / steps;
      if (fits(nx, this.hero.y)) this.hero.x = nx;
      const ny = this.hero.y + (dy * travel) / steps;
      if (fits(this.hero.x, ny)) this.hero.y = ny;
    }
    this.moving = true;
  }

  private moveByRoute(dt: number): void {
    let left = this.speed * dt;
    while (left > 0 && this.route.length) {
      const next = this.route[0]!;
      const dx = next.x - this.hero.x;
      const dy = next.y - this.hero.y;
      const d = Math.hypot(dx, dy);
      this.face(dx, dy);
      this.moving = true;
      if (d <= left) {
        this.hero = { ...next };
        this.route.shift();
        left -= d;
      } else {
        this.hero.x += (dx / d) * left;
        this.hero.y += (dy / d) * left;
        left = 0;
      }
    }
    if (!this.route.length && this.destination) {
      const place = this.destination;
      this.stop();
      this.facing = 'up';
      this.events.open(place);
    }
  }

  private updateBugs(dt: number): void {
    for (const bug of this.bugs) {
      if (!this.still.matches) {
        bug.wait -= dt;
        if (bug.wait <= 0) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() < 0.3 ? 0 : 18;
          bug.vx = Math.cos(angle) * speed;
          bug.vy = Math.sin(angle) * speed;
          bug.wait = 0.8 + Math.random();
        }
        const nx = bug.x + bug.vx * dt;
        const ny = bug.y + bug.vy * dt;
        if (fits(nx, ny)) {
          bug.x = nx;
          bug.y = ny;
        } else {
          bug.wait = 0;
        }
      }
      if (!this.warned && distance(bug, this.hero) < REACH * 0.8) {
        this.warned = true;
        this.events.say('A bug. Press Space or tap Lantern to fix it.');
      }
    }
  }

  private update(dt: number): void {
    this.moving = false;
    if (this.held.size) this.moveByKeys(dt);
    else if (this.route.length || this.destination) this.moveByRoute(dt);
    if (this.moving) this.step += dt * 8;

    const near = PLACES.find(p => distance(centre(doorOf(p)), this.hero) < 18) ?? null;
    if (near !== this.nearby) {
      this.nearby = near;
      this.events.near(near);
    }

    this.updateBugs(dt);
    this.glow = Math.max(0, this.glow - dt);
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter(s => s.life > 0);
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 3);
    const zoom = clamp(Math.min(innerWidth / 420, innerHeight / 250), 1.7, 5);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.scale = Math.max(1, Math.round(zoom * dpr));
    this.g.imageSmoothingEnabled = false;
    this.render();
  }

  private loop(now: number): void {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (!this.events.paused()) {
      if (!this.still.matches) this.time += dt;
      if (this.mode === 'game') this.update(dt);
      this.render();
    }
    this.frame = requestAnimationFrame(t => this.loop(t));
  }

  private render(): void {
    const { g, scale } = this;
    const vw = this.canvas.width / scale;
    const vh = this.canvas.height / scale;
    const focus = this.mode === 'title'
      ? { x: W * T * (0.5 + Math.sin(this.time * 0.07) * 0.25), y: H * T * (0.4 + Math.cos(this.time * 0.05) * 0.12) }
      : { x: this.hero.x, y: this.hero.y - 18 };
    const follow = (at: number, view: number, world: number, before = 0, after = 0) =>
      view >= world ? (world - view) / 2 : clamp(at - view / 2, -before, world - view + after);
    // Snap to device pixels so tiles stay crisp.
    const cx = Math.round(follow(focus.x, vw, W * T) * scale) / scale;
    // Let the sea scroll on under the HUD and controls so they never hide the hero.
    const css = this.canvas.width / innerWidth / scale;
    const cy = Math.round(follow(focus.y, vh, H * T, 100 * css, 170 * css) * scale) / scale;
    this.camera = { x: cx, y: cy };

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#174f86';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(scale, 0, 0, scale, -Math.round(cx * scale), -Math.round(cy * scale));
    g.drawImage(this.ground, 0, 0);

    const x0 = Math.max(0, Math.floor(cx / T) - 1);
    const y0 = Math.max(0, Math.floor(cy / T) - 1);
    const x1 = Math.min(W - 1, Math.ceil((cx + vw) / T) + 1);
    const y1 = Math.min(H - 1, Math.ceil((cy + vh) / T) + 2);

    const sprites: { y: number; draw: () => void }[] = [];
    g.fillStyle = '#85b7eb';
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const kind = groundAt(x, y);
        if ((kind === 'sea' || kind === 'river') && noise(x, y, 5) < 0.45) {
          const shift = Math.floor(this.time * 5 + x * 3 + y * 5) % 11;
          if (kind === 'sea') g.fillRect(x * T + shift, y * T + 7, 5, 1);
          else g.fillRect(x * T + 6, y * T + shift, 1, 5);
        }
        const prop = props.get(y * W + x);
        if (prop) sprites.push({ y: y * T + 14, draw: () => drawProp(g, prop, x * T, y * T) });
      }
    }
    for (const p of PLACES) {
      sprites.push({
        y: (p.y + p.h) * T,
        draw: () => {
          drawPlace(g, p, this.time);
          if (p.quest) drawBeacon(g, p, this.lit.has(p.id), this.time);
        },
      });
    }
    for (const bug of this.bugs) {
      sprites.push({ y: bug.y, draw: () => drawBug(g, bug.x, bug.y, this.time) });
    }
    if (this.mode === 'game') {
      sprites.push({
        y: this.hero.y,
        draw: () => drawHero(g, this.hero.x, this.hero.y, this.facing, this.step, this.moving),
      });
    }
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) s.draw();

    if (this.glow) {
      g.fillStyle = `rgba(250,199,117,${this.glow * 0.5})`;
      const { x, y } = this.hero;
      for (let dy = -REACH; dy < REACH; dy += 4) {
        const half = Math.round(Math.sqrt(REACH * REACH - dy * dy) / 4) * 4;
        g.fillRect(x - half, y - 8 + dy, half * 2, 4);
      }
    }
    g.fillStyle = '#fac775';
    for (const s of this.sparks) g.fillRect(s.x, s.y, 2, 2);

    if (this.mode === 'game') this.labels(cx, cy);
  }

  private labels(cx: number, cy: number): void {
    const { g, scale } = this;
    const dpr = this.canvas.width / innerWidth;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = `700 ${13 * dpr}px ui-monospace, Menlo, Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of PLACES) {
      const x = ((p.x + p.w / 2) * T - cx) * scale;
      const roof = p.id === 'harbour' ? 8 : p.id === 'windmill' ? 22 : p.id === 'forge' ? 28 : p.id === 'aqueduct' ? 10 : 22;
      // The mill's label sits below its door, clear of the sails.
      const y = p.id === 'windmill'
        ? ((p.y + p.h + 1.2) * T - cy) * scale
        : (p.y * T - roof - cy) * scale - 12 * dpr;
      if (distance(centre(doorOf(p)), this.hero) > 210) continue;
      const width = g.measureText(p.name).width + 14 * dpr;
      g.fillStyle = '#14213d';
      g.fillRect(x - width / 2, y - 11 * dpr, width, 22 * dpr);
      g.fillStyle = this.lit.has(p.id) ? '#fac775' : '#fff8e7';
      g.fillText(p.name, x, y);
    }
  }
}

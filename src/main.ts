import { Game, isIslander, type Mode, type Target } from './game';
import { play, toggleSound } from './sound';
import { ISLANDERS, PLACES, type Islander, type Place } from './world';

const el = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;

const root = document.documentElement;
const world = el<HTMLCanvasElement>('world');
const cv = el('cv');
const story = el<HTMLDialogElement>('story');
const storyName = el('story-name');
const storyBody = el('story-body');
const map = el<HTMLDialogElement>('map');
const credits = el<HTMLDialogElement>('credits');
const dialogs = [story, map, credits];
const enter = el<HTMLButtonElement>('enter');
const toast = el('toast');

const quests = PLACES.filter(p => p.quest);
const lit = new Set<string>();
let current: Target | null = null;
let toastTimer = 0;
let welcomed = false;
let creditsShown = false;

function say(text: string, ms = 4000): void {
  toast.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.textContent = ''; }, ms);
}

function open(target: Target): void {
  if (isIslander(target)) openTalk(target);
  else openStory(target);
}

function openTalk(person: Islander): void {
  const thought = cv.querySelector(`[data-thought="${person.id}"]`);
  if (!thought) return;
  game.stop();
  current = person;
  toast.textContent = '';
  storyName.textContent = person.name;

  const talk = document.createElement('div');
  talk.className = 'talk';
  talk.dataset.story = person.id;
  for (const [who, selector, side] of [[person.name, '.question', 'them'], ['Thanasis', '.answer', 'me']] as const) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${side}`;
    const name = document.createElement('p');
    name.className = 'speaker';
    name.textContent = who;
    const words = document.createElement('p');
    words.textContent = thought.querySelector(selector)?.textContent ?? '';
    bubble.append(name, words);
    talk.append(bubble);
  }
  storyBody.replaceChildren(talk);
  if (!story.open) story.showModal();
  storyBody.scrollTop = 0;
  play('open');
}

function openStory(place: Place): void {
  const source = cv.querySelector(`[data-place="${place.id}"]`);
  if (!source) return;
  game.stop();
  current = place;
  toast.textContent = '';
  storyName.textContent = place.quest ? `${place.name}: ${place.quest.toLowerCase()}` : place.name;

  // The CV is the only copy of the content, so a story is a copy of its section.
  const copy = source.cloneNode(true) as HTMLElement;
  copy.removeAttribute('data-place');
  copy.dataset.story = place.id;
  const heading = copy.querySelector('h1');
  if (heading) {
    const name = document.createElement('p');
    name.className = 'story-title';
    name.textContent = heading.textContent;
    heading.replaceWith(name);
  }
  storyBody.replaceChildren(copy);
  if (!story.open) story.showModal();
  storyBody.scrollTop = 0;
  play('open');
}

const game = new Game(world, {
  open,
  near(target) {
    enter.hidden = !target;
    if (!target) return;
    const verb = isIslander(target) ? 'Talk' : target.id === 'board' || target.id === 'harbour' ? 'Read' : 'Enter';
    enter.textContent = verb;
    enter.setAttribute('aria-label', `${verb}: ${target.name}`);
  },
  fixed(count, total) {
    el('bugs').textContent = `${count}/${total}`;
  },
  say,
  paused: () => dialogs.some(d => d.open),
});

story.addEventListener('close', () => {
  // close fires asynchronously, so a story may already have opened again.
  if (story.open) return;
  const place = current;
  current = null;
  if (root.dataset.mode !== 'game' || !place) return;
  world.focus();
  if (isIslander(place)) {
    game.meet(place);
    return;
  }
  if (!place.quest || lit.has(place.id)) return;

  lit.add(place.id);
  game.light(place);
  el('beacons').textContent = `${lit.size}/${quests.length}`;
  play('beacon');
  say(`${place.name} beacon lit.`);
  if (lit.size === quests.length && !creditsShown) {
    creditsShown = true;
    credits.showModal();
  }
});

for (const dialog of dialogs) {
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  if (dialog !== story) {
    dialog.addEventListener('close', () => {
      if (root.dataset.mode === 'game' && !story.open) world.focus();
    });
  }
}

const placeButtons = PLACES.map(place => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = place.name;
  button.addEventListener('click', () => {
    map.close();
    game.travel(place);
  });
  el('places').append(button);
  return { place, button };
});

for (const person of ISLANDERS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = person.name;
  button.addEventListener('click', () => {
    map.close();
    game.travel(person);
  });
  el('people').append(button);
}

function openMap(): void {
  game.stop();
  game.drawMinimap(el<HTMLCanvasElement>('minimap'));
  for (const { place, button } of placeButtons) button.dataset.lit = String(lit.has(place.id));
  map.showModal();
}

el('open-map').addEventListener('click', openMap);
addEventListener('keydown', e => {
  if (e.code !== 'KeyM' || e.metaKey || e.ctrlKey || e.altKey || root.dataset.mode !== 'game') return;
  if (dialogs.some(d => d.open)) return;
  e.preventDefault();
  openMap();
});

el('lantern').addEventListener('click', () => {
  game.lantern();
  world.focus();
});
enter.addEventListener('click', () => game.enter());
el('sound').addEventListener('click', e => {
  const on = toggleSound();
  const button = e.currentTarget as HTMLButtonElement;
  button.textContent = on ? 'Sound on' : 'Sound off';
  button.setAttribute('aria-pressed', String(on));
});
el('credits-contact').addEventListener('click', () => {
  credits.close();
  openStory(PLACES.find(p => p.id === 'post')!);
});
el('print').addEventListener('click', () => print());

// The address is stored scrambled and only put together on click.
const MAILBOX = ['bekas97', 't', 'com', 'gmail'] as const;
document.addEventListener('click', e => {
  const button = (e.target as Element).closest<HTMLButtonElement>('[data-email]');
  if (!button) return;
  const [last, first, tld, host] = MAILBOX;
  const address = [[first, last].join('.'), [host, tld].join('.')].join(String.fromCharCode(64));
  const link = document.createElement('a');
  link.href = ['mailto', address].join(':');
  link.textContent = address;
  button.replaceWith(link);
  link.focus();
});

function modeFromAddress(): Mode {
  return location.hash === '#cv' ? 'cv' : location.hash === '#play' ? 'game' : 'title';
}

function show(mode: Mode): void {
  root.dataset.mode = mode;
  world.tabIndex = mode === 'game' ? 0 : -1;
  world.setAttribute('aria-hidden', String(mode !== 'game'));
  current = null;
  for (const d of dialogs) if (d.open) d.close();
  game.setMode(mode);
  if (mode === 'game') {
    world.focus();
    if (!welcomed) {
      welcomed = true;
      say(matchMedia('(pointer: coarse)').matches
        ? 'Tap the ground to walk. Tap a building or a person to find out more.'
        : 'Walk with the arrow keys or click. Click a building or a person to find out more.', 6500);
    }
  } else if (mode === 'cv') {
    scrollTo(0, 0);
    cv.focus({ preventScroll: true });
  }
}

addEventListener('hashchange', () => show(modeFromAddress()));
show(modeFromAddress());
root.dataset.ready = '';

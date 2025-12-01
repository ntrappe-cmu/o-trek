import ShardMorpher from './shard_morpher.js';
import condor from './assets/json/condor.json';
import guanaco from './assets/json/guanaco.json';
import dolphin from './assets/json/dolphin.json'
import mara from './assets/json/mara.json'
import woodpecker from './assets/json/woodpecker.json';
import pudu from './assets/json/pudu.json';
import toad from './assets/json/toad.json';
import penguin from './assets/json/penguin.json';
import dragon from './assets/json/dragon.json';
import { serializePolygonData } from './shard.js';

// THE LOOKUP MAP (connects data to objects)
const SHARDS_MAP = [
  {
    name: 'MAGELLANIC WOODPECKER',
    color: '#c290d9ff',
    data: woodpecker
  },
  {
    name: 'BULLOCK\'S FALSE TOAD',
    color: '#60b49aff',
    data: toad
  },
  {
    name: 'MAGELLANIC PENGUIN',
    color: '#8293e0',
    data: penguin
  },
  {
    name: 'PUDU',
    color: '#f8a0bbff',
    data: pudu
  },
  {
    name: 'MARA',
    color: '#7fae97ff',
    data: mara
  },
  {
    name: 'ICE DRAGON',
    color: '#40cde3ff',
    data: dragon
  },
  {
    name: 'GUANACO',
    color: '#d3716f',
    data: guanaco
  },
  {
    name: 'ANDEAN CONDOR',
    color: '#8ab68fff',
    data: condor
  },
  {
    name: 'COMMERSON\S DOLPHIN',
    color: '#3dc0d5ff',
    data: dolphin
  }
];

class Controller {
  constructor() {
    this.morpher = new ShardMorpher(40); // Initialize visual engine
    this.shardsList = [];
    this.currentIndex = 0;
    this.isTransitioning = false; // Prevent spamming buttons

    // DOM elements to update
    this.ui = {
      title: document.getElementById('shard-main-title'),
      index: document.getElementById('shard-index-title'),
      prevBtn: document.querySelector('.prev-btn'),
      nextBtn: document.querySelector('.next-btn'),
      prevLabel: document.getElementById('prev-popup'),
      nextLabel: document.getElementById('next-popup'),
      openCloseBtn: document.getElementById('open-close-btn'),
      menuLabel: document.getElementById('menu-popup'),
      body: document.getElementById('exhibition'),
      canvas: document.getElementById('canvas'),
      overlay: document.querySelector('.fullscreen-overlay')
    };
  }

  init() {
    // 1. Bind Events
    window.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.ui.prevBtn.addEventListener('click', () => this.navigate(-1));
    this.ui.nextBtn.addEventListener('click', () => this.navigate(1));
    this.ui.openCloseBtn.addEventListener('click', () => {
      this.openOverlay(this.ui.openCloseBtn.classList.contains('open'))
    });

    // 2. Load Initial Animal (Instant, no await needed for fetch)
    this.loadShards(0);
  }

  openOverlay(toOpen) {
    if (toOpen) {
      console.log('open!');
      this.morpher.explode();
      this.ui.openCloseBtn.classList.remove('open');
      this.ui.openCloseBtn.classList.add('close');
      this.ui.overlay.classList.add('open');
      this.ui.menuLabel.innerText = 'EXIT';
      this.ui.menuLabel.style.color = '#262c25';
    } else {
      console.log('close!');
      this.ui.openCloseBtn.classList.remove('close');
      this.ui.openCloseBtn.classList.add('open');
      this.ui.overlay.classList.remove('open');
      this.ui.menuLabel.innerText = 'ALL PIECES';
    }
  }

  handleKeydown(e) {
    // 1. Safety Check: Don't trigger if already morphing
    if (this.isTransitioning) return;
    console.log('got', e.key);

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        // PREVIOUS
        this.navigate(-1);
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        // NEXT
        this.navigate(1);
        break;
    }
  }

  navigate(direction) {
    // Don't overload
    if (this.isTransitioning) return;

    // Loop logic: 0 -> Length-1, Length-1 -> 0
    let nextIndex = this.currentIndex + direction;
    if (nextIndex < 0) nextIndex = SHARDS_MAP.length - 1;
    if (nextIndex >= SHARDS_MAP.length) nextIndex = 0;

    // If moving backwards, wave is right to left; reverse for forward
    const waveDirection = direction > 0 ? 'ltr' : 'rtl';
    this.loadShards(nextIndex, waveDirection);
  }

  async loadShards(index, direction = 'ltr') {
    console.log(`move to ${index} with wave ${direction}`);
    this.isTransitioning = true;
    this.currentIndex = index;

    const shards = SHARDS_MAP[index];

    // 1. Update UI
    this.updateUI(shards, index);

    // 2. Morph
    // We pass shards.data directly. No lookups, no missing file keys.
    await this.morpher.morphTo(shards.data, direction);

    this.isTransitioning = false;
  }

  updateUI(shards, i) {
    this.ui.title.innerText = shards.name;
    this.ui.index.innerText = i + 1;

    requestAnimationFrame(() => {
      this.ui.body.style.backgroundColor = shards.color;
      this.ui.prevLabel.style.color = shards.color;
      this.ui.nextLabel.style.color = shards.color;
      this.ui.menuLabel.style.color = shards.color;
      // this.ui.canvas.width = shards.width ? `${shards.width}%` : '80%';
    });

    // Calculate labels for Next/Prev
    const prevIdx = (this.currentIndex - 1 + SHARDS_MAP.length) % SHARDS_MAP.length;
    const nextIdx = (this.currentIndex + 1) % SHARDS_MAP.length;

    this.ui.prevLabel.innerText = SHARDS_MAP[prevIdx].name;
    this.ui.nextLabel.innerText = SHARDS_MAP[nextIdx].name;
  }
}

// Start the app
const app = new Controller();
app.init();


try {
  const name = 'toad';
  const res = await fetch(`/svg/${name}.svg`);
  if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
  
  // 1. Get the raw text
  const svgText = await res.text();

  // 2. Pass the RAW STRING directly to the function
  // Do not parse it with DOMParser here.
  const shardDataJson = serializePolygonData(svgText, name);
  
  localStorage.setItem(name, JSON.stringify(shardDataJson)); // Ensure you stringify before storage

} catch (err) {
  console.error(err);
}


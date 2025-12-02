/**
 * @file main.js
 * @description Main controller for the "In Pieces" interactive exhibition.
 * This file orchestrates the interaction between the static data (SHARDS_MAP),
 * the UI DOM elements, and the ShardMorpher animation engine.
 * * Key Responsibilities:
 * - Handling user input (Clicks, Keys, Menu Toggles)
 * - Managing application state (Current Animal, Menu Open/Closed)
 * - Synchronizing UI text/colors with the animation state.
 * * @version 1.0.0
 */

import ShardMorpher from './shard_morpher.js';
import condor from './assets/json/condor.json' assert { type: 'json' };
import guanaco from './assets/json/guanaco.json' assert { type: 'json' };
import dolphin from './assets/json/dolphin.json' assert { type: 'json' };
import mara from './assets/json/mara.json' assert { type: 'json' };
import woodpecker from './assets/json/woodpecker.json' assert { type: 'json' };
import pudu from './assets/json/pudu.json' assert { type: 'json' };
import toad from './assets/json/toad.json' assert { type: 'json' };
import penguin from './assets/json/penguin.json' assert { type: 'json' };
import dragon from './assets/json/dragon.json' assert { type: 'json' };
import hippo from './assets/json/hippo.json' assert { type: 'json' };

/**
 * @constant {Array<Object>} SHARDS_MAP
 * @description Registry of all available animals and their associated metadata.
 * The order of this array determines the navigation order (Next/Prev).
 */
const SHARDS_MAP = [
  {
    name: 'MAGELLANIC WOODPECKER',
    color: '#c290d9ff',
    data: woodpecker,
    category: 'BIRD',
    status: 'NORMAL'
  },
  {
    name: 'BULLOCK\'S FALSE TOAD',
    color: '#60b49aff',
    data: toad,
    category: 'AMPHIBIAN',
    status: 'ENDANGERED'
  },
  {
    name: 'MAGELLANIC PENGUIN',
    color: '#8293e0',
    data: penguin,
    category: 'BIRD',
    status: 'NORMAL'
  },
  {
    name: 'HIPPOCAMELUS',
    color: '#F5C764',
    data: hippo,
    category: 'MAMMAL',
    status: 'ENDANGERED'
  },
  {
    name: 'PUDU',
    color: '#f8a0bbff',
    data: pudu,
    category: 'MAMMAL',
    status: 'THREATENED'
  },
  {
    name: 'MARA',
    color: '#7fae97ff',
    data: mara,
    category: 'MAMMAL',
    status: 'THREATENED'
  },
  {
    name: 'ICE DRAGON',
    color: '#40cde3ff',
    data: dragon,
    category: 'INSECT',
    status: 'ENDANGERED'
  },
  {
    name: 'GUANACO',
    color: '#ec6967ff',
    data: guanaco,
    category: 'MAMMAL',
    status: 'NORMAL'
  },
  {
    name: 'ANDEAN CONDOR',
    color: '#8ab68fff',
    data: condor,
    category: 'BIRD',
    status: 'VULNERABLE'
  },
  {
    name: 'COMMERSON\'S DOLPHIN',
    color: '#3dc0d5ff',
    data: dolphin,
    category: 'MAMMAL',
    status: 'NORMAL'
  }
];

// --- MAIN CONTROLLER ---

/**
 * @class Controller
 * @description Central logic handler for the application.
 */
class Controller {
  /**
   * Initializes the morpher engine, state variables, and caches DOM references.
   */
  constructor() {
    this.morpher = new ShardMorpher(40); // Initialize visual engine
    this.currentIndex = 0; // Current animal displayed
    this.isTransitioning = false; // Prevent spamming buttons
    this.isMenuOpen = false;

    // Cache DOM Elements for performance
    this.ui = {
      title: document.getElementById('shard-main-title'),
      overlayTitle: document.getElementById('title-content'),
      index: document.getElementById('shard-index-title'),

      // Buttons
      prevBtn: document.querySelector('.prev-btn'),
      nextBtn: document.querySelector('.next-btn'),
      openCloseBtn: document.getElementById('open-close-btn'),

      // Labels
      prevLabel: document.getElementById('prev-popup'),
      nextLabel: document.getElementById('next-popup'),
      menuLabel: document.getElementById('menu-popup'),

      // Containers
      body: document.getElementById('exhibition'),
      canvas: document.getElementById('canvas'),
      overlay: document.querySelector('.fullscreen-overlay'),
      orbit: document.getElementById('orbit')
    };
  }

  // === INITIALIZATION ===

  /**
   * Bootstraps the application.
   * Sets up event listeners, generates dynamic UI elements, and loads the first animal.
   */
  init() {
    this.bindEvents();
    this.setupOrbitDots();
    this.loadShards(0); // Start with first animal (assumes min one)
  }

  /**
   * Binds global and element-specific event listeners (Keyboard, Clicks).
   */
  bindEvents() {
    // Keyboard Navigation
    window.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Button Navigation
    this.ui.prevBtn.addEventListener('click', () => this.navigate(-1));
    this.ui.nextBtn.addEventListener('click', () => this.navigate(1));

    // Menu Toggle
    this.ui.openCloseBtn.addEventListener('click', () => {
      // Toggle logic based on current state
      const isOpen = this.ui.openCloseBtn.classList.contains('open');
      this.toggleMenu(isOpen); 
    });
  }

  /**
   * Generates the circular navigation dots based on the SHARDS_MAP length.
   * Assigns click and hover handlers to each dot.
   */
  setupOrbitDots() {
    const dots = Array.from(this.ui.orbit.children);
    
    // For each dot, get is associated animal color
    SHARDS_MAP.forEach((shard, index) => {
      const dot = dots[index];
      if (!dot) return;

      dot.style.borderColor = shard.color;

      // Click Dot -> Close Menu & Morph to Animal
      dot.addEventListener('click', () => {
        this.currentIndex = index;
        this.toggleMenu(false);
      });

      // Hover Dot -> Show Info
      dot.addEventListener('mouseover', () => this.updateOverlayContent(shard, index));
      dot.addEventListener('mouseout', () => this.updateOverlayContent(null));
    });
  }

  // === LOGIC & NAVIGATION ===

  /**
   * Handles keyboard interactions for navigation and accessibility.
   * @param {KeyboardEvent} e - The native keydown event.
   */
  handleKeydown(e) {
    // 1. Safety Check: Don't trigger if already morphing
    if (this.isTransitioning) return;

    switch (e.key) {
      case 'ArrowUp': // PREVIOUS
      case 'ArrowLeft': this.navigate(-1); break;
      case 'ArrowDown': // NEXT
      case 'ArrowRight': this.navigate(1); break;
      case 'Escape': // EXIT OUT OF MENU IF OPEN
        if (this.isMenuOpen) this.toggleMenu(false);
        break;
    }
  }

  /**
   * Calculates the next index (cyclic) and triggers the load.
   * @param {number} direction - The direction to move: -1 (Prev) or 1 (Next).
   */
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
    this.isTransitioning = true;
    this.currentIndex = index;

    const shards = SHARDS_MAP[index];

    // 1. Update UI
    this.updateUI(shards, index);

    // 2. Trigger Morph Animation
    await this.morpher.morphTo(shards.data, direction);

    this.isTransitioning = false;
  }

  /**
   * Toggles the application between "Exhibition Mode" (Normal) and "Menu Mode" (Exploded).
   * * @param {boolean} shouldOpen - If true, explodes shards and opens menu. If false, implodes and closes.
   * @returns {Promise<void>}
   */
  async toggleMenu(shouldOpen) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.isMenuOpen = shouldOpen;

    if (shouldOpen) {  
      // === OPEN MENU (EXPLODE) ===
      this.setMenuUIState('open');
      await this.morpher.explode();

    } else {
      // === CLOSE MENU (IMPLODE) ===
      this.setMenuUIState('close');
      
      const shards = SHARDS_MAP[this.currentIndex];
      this.updateUI(shards, this.currentIndex); // Ensure text matches current animal
      
      await this.morpher.morphTo(shards.data);
    }
    
    this.isTransitioning = false;
  }

  // === UI HELPERS ===

  /**
   * Updates general UI elements (Titles, Background Colors, Next/Prev Labels).
   * * @param {Object} shards - The data object for the current animal.
   * @param {number} index - The current index.
   */
  updateUI(shards, i) {
    // Text Updates
    this.ui.title.innerText = shards.name;
    this.ui.index.innerText = i + 1;

    // Color Updates (Batched in RAF)
    requestAnimationFrame(() => {
      this.ui.body.style.backgroundColor = shards.color;
      this.ui.prevLabel.style.color = shards.color;
      this.ui.nextLabel.style.color = shards.color;
      this.ui.menuLabel.style.color = shards.color;
    });

    // Calculate labels for Next/Prev
    const prevIdx = (this.currentIndex - 1 + SHARDS_MAP.length) % SHARDS_MAP.length;
    const nextIdx = (this.currentIndex + 1) % SHARDS_MAP.length;

    this.ui.prevLabel.innerText = SHARDS_MAP[prevIdx].name;
    this.ui.nextLabel.innerText = SHARDS_MAP[nextIdx].name;
  }

  /**
   * Toggles CSS classes for the Menu Button, Overlay, and Orbit container.
   * * @param {'open'|'close'} state - The desired visual state.
   */
  setMenuUIState(state) {
    if (state === 'open') {
      this.ui.openCloseBtn.classList.replace('open', 'close');
      this.ui.overlay.classList.add('open');
      this.ui.orbit.classList.remove('hidden');
      this.ui.menuLabel.innerText = 'EXIT';
      this.ui.menuLabel.style.color = '#262c25'; // Dark color for contrast on overlay
    } else {
      this.ui.openCloseBtn.classList.replace('close', 'open');
      this.ui.overlay.classList.remove('open');
      this.ui.orbit.classList.add('hidden');
      this.ui.menuLabel.innerText = 'ALL PIECES';
    }
  }

  /**
   * Controls the large text overlay content when hovering over orbit dots.
   * * @param {Object|null} shard - The shard object to display. If null, reverts to default title.
   * @param {number} index - The index of the shard.
   */
  updateOverlayContent(shard, index) {
    if (shard) {
      this.ui.overlayTitle.classList.remove('general');
      this.ui.overlayTitle.style.color = shard.color;
      this.ui.overlayTitle.innerHTML = `
        <h1>SHARD ${index + 1}</h1>
        <h2>${shard.name}</h2>
        <h3>${shard.category}<span>${shard.status}</span></h3>
      `;
    } else {
      // Revert to Default Title
      this.ui.overlayTitle.classList.add('general');
      this.ui.overlayTitle.innerHTML = `
        <h1>IN PIECES</h1>
        <h2>10 THINGS</h2>
        <h2>10 PIECES</h2>
        <h3>EXPLORING PATAGONIA</h3>
      `;
    }
  }
}

// Start the app
const app = new Controller();
app.init();

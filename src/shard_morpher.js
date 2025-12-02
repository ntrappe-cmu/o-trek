/**
 * @file shard_morpher.js
 * @description The core animation engine for the "In Pieces" effect.
 * This class manages a pool of DOM elements (shards), handles their geometric
 * transformations (morphing), and coordinates complex animations like explosions and waves.
 *
 * Key Concepts:
 * - Shard Pool: A fixed set of <div> elements reused to prevent DOM thrashing.
 * - Morphing: Changing the `clip-path` and `background-color` to shape-shift.
 * - Wave Effect: Staggering transitions based on X-position (Left-to-Right).
 * - Explosion: Scattering shards to the screen edges with physics-like easing.
 *
 * @version 1.0.0
 */

class ShardMorpher {
  /**
   * Initializes the engine.
   * @param {number} [maxShards=40] - The maximum number of shards supported.
   * Increasing this allows more complex animals but impacts performance.
   */
  constructor(maxShards = 40) {
    this.currentData = null;
    this.maxShards = maxShards;
    this.activeShards = 0;
    this.isExploded = false;

    // Initialize the DOM elements immediately
    this.shards = this.createShardPool();
  }

  /**
   * Creates a pool of reuseable DOM elements and appends them to the #canvas.
   * Using a DocumentFragment ensures we only trigger one browser reflow.
   * @returns {Array<HTMLElement>} An array of the created shard elements.
   */
  createShardPool() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Container canvas not found');

    /* Fragment gives better performance because it only causes 1 reflow/repaint
     * compared to appending each child to container which causes a reflow e/ time
     * Fragment is an in-memory container that is not part of the live DOM
     */
    const fragment = document.createDocumentFragment();
    const shards = [];

    for (let i = 0; i < this.maxShards; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'shard-wrapper';

      const shard = document.createElement('div');
      shard.className = 'shard';
      shard.dataset.index = i;  // For debugging

      // Initial State: Collapsed invisible point at center
      shard.style.clipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
      shard.style.webkitClipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
      shard.style.backgroundColor = 'transparent';

      wrapper.appendChild(shard);
      fragment.appendChild(wrapper);
      shards.push(shard);
    }
    console.log(`[ShardMorpher] Initialized pool with ${shards.length} shards.`);
    canvas.appendChild(fragment);
    return shards;
  }

  // ===========================================================================
  // ANIMATION LOGIC
  // ===========================================================================

  /**
   * The Master Morph Function.
   * Transitions the shards from their current state to the new animal shape.
   * Automatically handles "Implosion" if the shards are currently exploded.
   *
   * @param {Object} data - The target animal data (from JSON/SVG).
   * @param {string} [direction='ltr'] - Wave direction ('ltr' or 'rtl').
   * @returns {Promise<void>} Resolves when the animation sequence completes.
   */
  async morphTo(data, direction = 'ltr') {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Container canvas not found');

    // 1. Check & Handle Explosion State
    // If we are currently exploded, we need to "Implode" (Gravity Mode)
    // instead of doing the standard wave reveal.
    const needsGravity = this.isExploded;
    this.isExploded = false;

    // 1. Clean up explosion state if applied
    if (canvas.classList.contains('galaxy-spin')) {
      // Stop container from spinning
      canvas.classList.remove('galaxy-spin');

      // Reset Layering: Send canvas back behind the UI
      canvas.style.zIndex = 'auto';
    }

    // 2. Prepare shards for return
    // If we were exploded, the shards are miles away. 
    // We need to pull them back to (0,0) so they form the animal.
    this.shards.forEach(shard => {
      // Slow transition back to center (1.5s)
      shard.style.transform = 'translate3d(0,0,0) rotate(0deg)';
      shard.style.transition = 'transform 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)'; 
    });

    // 3. Update Visuals (Shape/Color)
    // We update the DOM properties immediately. CSS Transitions will handle the visual morph.
    this.currentData = data;
    this.updateShardData(data);

    // 4. Trigger Animation Sequence
    if (needsGravity) {
      // MODE A: Implosion (Gravity)
      // Wait for pieces to fly back and settle into the new shape.
      return this.gravity();
    } else {
      // MODE B: Standard Wave
      // Reveal pieces one by one from Left-to-Right (or Right-to-Left).
      return this.revealShards(direction);
    }
  }

  /**
   * ANIMATION MODE: Standard Wave.
   * Staggers the transition of each shard to create a flowing wave effect.
   * @param {string} direction - 'ltr' (Left-to-Right) or 'rtl' (Right-to-Left).
   */
  revealShards(direction) {
    return new Promise((resolve) => {
      const step = 30; // ms delay between each piece
      const duration = 800;

      this.shards.forEach((shard, i) => {
        // Only animate active shards (those part of the new animal)
        if (i < this.activeShards) {
          // --- DIRECTION LOGIC ---
          // LTR: 0 -> 30
          // RTL: 30 -> 0
          let delayIndex = i;
          if (direction === 'rtl')
            delayIndex = (this.activeShards - 1) - i;
          
          const delay = delayIndex * step;

          // Apply complex transition string
          // Note: transform is NOT transitioned here (it stays at 0,0)
          shard.style.transition = `
            clip-path ${duration}ms cubic-bezier(0.6, 0.05, 0.28, 0.91) ${delay}ms,
            background-color ${duration}ms ease ${delay}ms,
            opacity ${duration/2}ms ease ${delay}ms,
            z-index 0s linear ${delay}ms
          `;
        } else {
          // Reset transition for unused shards so they hide instantly (no delay)
          shard.style.transition = 'none';
        }
      });

      // Resolve promise after the last shard has finished moving
      const totalTime = (this.activeShards * step) + duration;
      setTimeout(resolve, totalTime);
    });
  }

  /**
   * ANIMATION MODE: Gravity (Implosion).
   * Simple wait helper. The actual animation is handled by the CSS transition
   * applied in Step 2 of `morphTo`.
   */
  async gravity() {
    return new Promise(resolve => {
      // Wait for the 'transform 1.5s' transition to finish
      setTimeout(resolve, 1500);
    });
  }

  /**
   * ANIMATION MODE: Explosion.
   * Scatters all shards to the edges of the screen in a random circular distribution.
   */
  async explode() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Container canvas not found');

    // Mark this so we track state
    this.isExploded = true;

    // 1. Enter "Galaxy Mode"
    canvas.classList.add('galaxy-spin');
    canvas.style.zIndex = 999; // Bring canvas ABOVE the dark overlay

    // Cycle between these colors
    const explosionColors = [
      '#1b2423ff',
      '#506562ff',
      '#4d958fff',
      '#06483dff',
      '#2f3e32ff',
    ];

    // Push shards outward to make them orbit the title page
    this.shards.forEach((shard, i) => {
      // 2. Set the color logic
      shard.style.backgroundColor = explosionColors[i % explosionColors.length];

      // 3. Trajectory logic (random circle distribution)
      const angle = Math.random() * Math.PI * 2;

      // Radius: Push far enough to hit edges (~40% of screen width) + random variance
      const radius = (window.innerWidth / 2.7) + (Math.random() * 200);

      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;

      // Random Tumble Rotation (shards spin as they fly out)
      const rotation = Math.random() * 720;

      // 4. Apply the Physics
      // Long duration (3s) with ease-out for a "Boom... drift" effect
      shard.style.transition = 'transform 3s cubic-bezier(0.1, 1, 0.2, 1), background-color 0.5s';
      shard.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotation}deg)`;
      shard.style.opacity = 1;
    });
  }

  // ===========================================================================
  // DATA & DOM HELPERS
  // ===========================================================================

  /**
   * Updates the internal state of the shards to match the new animal data.
   * - Sorts shards Left-to-Right for the wave effect.
   * - Calculates Z-Index based on shard size (Small items on top).
   * - Hides unused shards.
   *
   * @param {Object} data - The normalized animal data object.
   */
  updateShardData(data) {
    // Convert the dictionary to an array so we can sort it
    // We don't care about the IDs ("1", "30") anymore (not using them for ordering)
    if (!data.shards) throw new Error('ERROR: Cannot update data without valid shards and box');

    // 1. Convert Dictionary to Array for Sorting
    const shardArr = Object.entries(data.shards);
   
    // 2. Spatial Sorting
    // Sort the array based on the X-position of the shape so items further to the left
    // show up first which makes it easier for the wave to pick the first item (leftmost)
    // This works regardless of the ordering of the JSON file (back-most = first)
    shardArr.sort((a, b) => {
      return getLeftEdge(a[1].path) - getLeftEdge(b[1].path);
    });

    this.activeShards = Math.min(shardArr.length, this.maxShards);

    // 3. Assign Data to DOM Elements
    this.shards.forEach((shard, i) => {
      // While we still have shards to morph
      if (i < this.activeShards) {
        // Active Shard
        const shardData = shardArr[i];

        // Size-based Z-Indexing:
        // Smaller pieces (eyes, details) get higher Z-index so they aren't covered
        const width = getShardWidth(shardData[1].path);
        const zIndex = Math.floor(100 - width);
        shard.style.zIndex = zIndex;

        // Apply visual properties
        shard.style.backgroundColor = shardData[1].fill; // [0] = index, [1] = {}
        shard.style.clipPath = shardData[1].path;
        shard.style.webkitClipPath = shardData[1].path;
        shard.style.opacity = 1; // Reset if hidden
      } else {
        // Collapse unused shards to the center
        shard.style.backgroundColor = 'transparent';
        shard.style.clipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
        shard.style.webkitClipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
        shard.style.opacity = 0;
        shard.style.zIndex = 0;
      }
    });
  }
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================
/**
 * Finds the leftmost X-coordinate (in %) of a polygon string.
 * Used for sorting shards Left-to-Right.
 * @param {string} polygonString - e.g., "polygon(10% 10%, ...)"
 * @returns {number} The minimum X value found.
 */
function getLeftEdge(polygonString) {
    if (!polygonString) {
      console.error('ERROR: getLeftEdge got undefined path');
      return 0;
    }

    // Extract all numbers that precede a '%' sign (extract coordinates)
    const coords = polygonString.match(/([0-9.]+)%/g);
    if (!coords) {
      console.error("Couldn't extract any polygon % coordinates @shard_morpher.js");
      return 0;
    }

    let minX = 1000;

    // Loop through all X values (indices 0, 2, 4...)
    for (let i = 0; i < coords.length; i += 2) {
      const val = parseFloat(coords[i]);
      if (val < minX) minX = val;
    }

    return minX;
}

/**
 * Calculates the width of a polygon (in %) to determine Z-index.
 * Could have also used area instead. (Probably for future work).
 * @param {string} polygonString
 * @returns {number} Width of the shape.
 */
function getShardWidth(polygonString) {
  if (!polygonString) {
    console.error('ERROR: getShardWidth got an undefined polygon string');
    return 0;
  }
  
  // Extract all percentages
  const percents = polygonString.match(/([0-9.]+)%/g);
  if (!percents) return 0;

  let minX = 100;
  let maxX = 0;

  // Loop through X values (indices 0, 2, 4...)
  for (let i = 0; i < percents.length; i += 2) {
    const val = parseFloat(percents[i]); 
    if (val < minX) minX = val;
    if (val > maxX) maxX = val;
  }

  return maxX - minX;
}

export default ShardMorpher;
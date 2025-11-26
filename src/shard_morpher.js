class ShardMorpher {
  constructor(maxShards = 40) {
    this.currentData = null;
    this.maxShards = maxShards;
    this.shards = this.createShardPool();
    this.activeShards = 0;
  }

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

      // Start collapsed at center
      shard.style.clipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
      shard.style.webkitClipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
      shard.style.backgroundColor = 'transparent';

      wrapper.appendChild(shard);
      fragment.appendChild(wrapper);
      shards.push(shard);
    }

    console.log(`Created initial shard pool with ${shards.length} shards`)
    canvas.appendChild(fragment);
    return shards;
  }

  // ========================================================
  // PUBLIC API: MOVEMENT FLAVORS
  // ========================================================

  /**
   * STANDARD MORPH: Used when changing species.
   * Features: Sorting (Left-to-Right), Wave Effect, Area-based Z-Index.
   */
  async morphTo(data, direction = 'ltr') {
    // 1. Save the base of the animal/shard object
    this.currentData = data;

    // 2. Update the physical props (path/color) and sort visually
    this.updateShardData(data);

    // 3. Apply delay to create wave effect
    // We pass 'direction' here to decide if delays go 0->30 or 30->0
    return this.revealShards(direction);
  }

  /**
   * TWITCH: Used for nervous ticks, feathers ruffling.
   * Features: Fast, No Sort (Identity Preserved), Elastic/Bouncy.
   * No shards should be added or removed.
   */
  async twitch(data) {
    // Update the DOM to the twitch (after pose) but don't update our saved model
    if (!this.currentData) throw new Error('No state to return back to. Aborting.');

    this.updateShardData(data);

    await new Promise(resolve => {
      this.shards.forEach((shard, i) => {
        shard.style.transition = `clip-path 500ms cubic-bezier(0.5, 2, 0.5, 0.5)`;
      });

      setTimeout(resolve, 650);
    });

    this.updateShardData(this.currentData);
    await new Promise(resolve => {
      this.shards.forEach((shard, i) => {
        shard.style.transition = `clip-path 400ms cubic-bezier(0.5, 0.5, 0.5, 1.5)`;
      });

      setTimeout(resolve, 500);
    });
  }

  /**
   * POSE: Used for Mouth Open / Head Tilt.
   * Features: Moderate speed, Smooth, No Sort.
   */
  async pose(data) {
    
  }

  revealShards(direction) {
    return new Promise((resolve) => {
      const step = 30; // ms delay between each piece
      const duration = 800;

      this.shards.forEach((shard, i) => {
        if (i < this.activeShards) {
          // --- DIRECTION LOGIC ---
          // LTR: 0 -> 30
          // RTL: 30 -> 0
          let delayIndex = i;
          if (direction === 'rtl')
            delayIndex = (this.activeShards - 1) - i;
          
          const delay = delayIndex * step;

          // Apply transition with calculated delay. Only transition clip-path and color
          // not position
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

  updateShardData(data) {
    // Convert the dictionary to an array so we can sort it
    // We don't care about the IDs ("1", "30") anymore (not using them for ordering)
    if (!data.shards) throw new Error('ERROR: Cannot update data without valid shards and box');

    const shardArr = Object.entries(data.shards);
   
    // Sort the array based on the X-position of the shape so items further to the left
    // show up first which makes it easier for the wave to pick the first item (leftmost)
    // This works regardless of the ordering of the JSON file (back-most = first)
    shardArr.sort((a, b) => {
      return getLeftEdge(a[1].path) - getLeftEdge(b[1].path);
    });

    this.activeShards = Math.min(shardArr.length, this.maxShards);

    // Assign sorted data to the DOM pool
    this.shards.forEach((shard, i) => {
      // While we still have shards to morph
      if (i < this.activeShards) {
        const shardData = shardArr[i];

        // Dynamic Z-Index sorting so small shards never hidden by big ones
        // Smaller pieces get higher Z-index to sit on top
        // const area = getPolygonArea(shardData[1].path);
        const width = getShardWidth(shardData[1].path);
        const zIndex = Math.floor(100 - width);
        shard.style.zIndex = zIndex;

        // Apply visual properties
        // console.log(`morphing shard ${i + 1}:`, shardData[1]);
        shard.style.backgroundColor = shardData[1].fill; // [0] = index, [1] = {}
        shard.style.clipPath = shardData[1].path;
        shard.style.webkitClipPath = shardData[1].path;
        shard.style.opacity = 1; // Reset if hidden
      } else {
        // Collapse unused shards to the center
        console.log('collapsing unused shard');
        shard.style.backgroundColor = 'transparent';
        shard.style.clipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
        shard.style.webkitClipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';
        shard.style.opacity = 0;
        shard.style.zIndex = 0;
      }
    });
  }

  calculateDelay(index, direction, totalShards) {
    const baseDelay = 100;
    return direction === 'ltr' ? index * baseDelay : (totalShards - index + 1) * baseDelay;
  }

}

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
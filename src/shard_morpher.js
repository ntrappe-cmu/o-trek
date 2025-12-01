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
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Container canvas not found');

    // To track explosion state
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

    if (needsGravity) {
      // If we exploded, we need to pull shards in and then morph into animal
      // We don't use the standard wave. Delegate to helper function.
      return this.gravity(data, {
        sort: true,             
        stagger: 20,            
        duration: 800,          
        easing: 'cubic-bezier(0.6, 0.05, 0.28, 0.91)', 
        direction: direction
      });
    } else {
      // Not exploded so we need to use the standard wave with direction to
      // morph into the next animal

      // Save base animal then update physical props
      this.currentData = data;
      this.updateShardData(data);

      // Apply delay to create wave effect
      // Direction decides if delays go 0->30 or 30->0
      return this.revealShards(direction);
    }
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

  async gravity(data, options) {
    this.shards.forEach((shard, i) => {
      const target = data.shards[i + 1]; // Assuming 1-based IDs
      
      if (target) {
        // 1. Set Shape
        shard.style.clipPath = target.path;
        shard.style.webkitClipPath = target.path;
        
        // 2. Set Color
        shard.style.backgroundColor = target.fill; // Or data.color

        // 3. CRITICAL: Ensure they sit at 0,0 (Center)
        // This ensures that if they were exploded, they come home.
        shard.style.transform = 'translate3d(0,0,0) rotate(0deg)';
        shard.style.opacity = 1;
      } else {
        // Hide unused shards
        shard.style.opacity = 0;
      }
    });
  }

  async explode() {
    const canvas = document.getElementById('canvas');
    if (!canvas) throw new Error('Container canvas not found');

    // Mark this so we track state
    this.isExploded = true;

    // 1. Activate galaxy mode
    canvas.classList.add('galaxy-spin');
    // Bring canvas ABOVE the dark overlay (z-999) but below text
    canvas.style.zIndex = 999;

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
      if (this.currentlySpotlighted != shard) {
        // 2. Set the color logic
        shard.style.backgroundColor = explosionColors[i % explosionColors.length];

        // 3. Trajectory logic (random circle distribution)
        const angle = Math.random() * Math.PI * 2;

        // Distance: Push them far enough to hit edges (e.g., 60% of screen width)
        // We add randomness so they don't form a perfect boring ring
        const radius = (window.innerWidth / 2.7) + (Math.random() * 200);

        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;

        // Random Tumble Rotation (shards spin as they fly out)
        const rotation = Math.random() * 720;

        // 4. Apply the Physics
        // Transition: Fast explosion (1s) with an ease-out
        shard.style.transition = 'transform 3s cubic-bezier(0.1, 1, 0.2, 1), background-color 0.5s';
        
        // Transform: Move to the calculated circle point
        shard.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotation}deg)`;

        // Ensure it's visible
        shard.style.opacity = 1;
      }
    });
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

 // Returns the Center (cx, cy) and Size (w, h) in percentages (0-100)
function getBoundsPercent(polygonString) {
  // Extract all numbers
  const coords = polygonString.match(/([0-9.]+)%/g);
  if (!coords) return { cx: 50, cy: 50, w: 0, h: 0 };

  let minX = 1000, maxX = 0;
  let minY = 1000, maxY = 0;

  // Parse X,Y pairs
  for (let i = 0; i < coords.length; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i+1]);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const w = maxX - minX;
  const h = maxY - minY;

  return {
    cx: minX + (w / 2), // Center X %
    cy: minY + (h / 2), // Center Y %
    w: w,               // Width %
    h: h                // Height %
  };
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
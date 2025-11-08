class ShardMorpher {
  constructor(maxShards = 50) {
    this.currentData = null;
    this.maxShards = maxShards;
    this.shards = this.createShardPool();
    console.log(`ShardMorpher initialized with pool of ${maxShards} shards`);
  }

  createShardPool() {
    const container = document.getElementById('shard-box');
    if (!container) throw new Error('Container #shard-box not found');
    console.log(`Creating shard pool with ${this.maxShards} shards`);
    const shards = [];

    for (let i = 0; i < this.maxShards; i++) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('class', 'shard-wrapper');

      const shard = document.createElement('div');
      shard.setAttribute('class', 'shard');
      shard.style.visibility = 'hidden';

      wrapper.appendChild(shard);
      container.appendChild(wrapper);
      shards.push(shard);
    }

    return shards;
  }

  morphTo(data) {
    const container = document.getElementById('shard-box');

    if (!container) {
      console.error('Container #shard-box not found');
      return;
    }

    container.setAttribute('data-shard', data.name);
    // Set size of shared box based on viewbox dimensions to ensure correct aspect ratio
    // and keep the triangles from being distorted
    container.style.aspectRatio = `${data.box.w} / ${data.box.h}`;

    // Process shards
    const shardEntries = Object.entries(data.shards);
    let shardIndex = 0;

    // Show and update active shards
    shardEntries.forEach(([shardId, shardData]) => {
      const index = parseInt(shardId) - 1;
      if (index >= 0 && index < this.shards.length) {
        const shard = this.shards[shardIndex];
        shard.style.backgroundColor = shardData.fill;
        shard.style.webkitClipPath = shardData.path;
        shard.style.clipPath = shardData.path;
        shard.style.visibility = 'visible';
        shardIndex++;
      }
    });

    // Hide remaining unused shards - FIXED: was "counter.style"
    for (let i = shardIndex; i < this.maxShards; i++) {
      this.shards[i].style.visibility = 'hidden';
    }

    this.currentData = data;
  }
}

export default ShardMorpher;
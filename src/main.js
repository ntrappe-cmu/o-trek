// import serializePolygonData from './shard.js';
import ShardMorpher from './shard_morpher.js';
import condor from '../public/json/condor.json';
import guanaco from '../public/json/guanaco.json';
import dolphin from '../public/json/dolphin.json'
import woodpecker from '../public/json/woodpecker.json';
import woodpecker2 from '../public/json/woodpecker2.json';
import tri1 from '../public/json/triangle-orange.json';
import tri2 from '../public/json/triangle-purple.json'

import { serializePolygonData, createShardElements } from './shard.js';


try {
  const name = 'woodpecker2';
  const res = await fetch(`/svg/${name}.svg`);
  if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
  const svgText = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) throw new Error(`No <svg> found in /${name}.svg`);

  const shardDataJson = serializePolygonData(svg, name);
  localStorage.setItem(name, shardDataJson);

} catch (err) {
  console.error(err);
}


// Initialize the morpher
const morpher = new ShardMorpher(40);
// Load first animal immediately
morpher.morphTo(woodpecker);

// morpher.twitch(woodpecker2);


// Switch to second animal after 3 seconds
// setTimeout(() => {
//   console.log('Switching to group2');
//   morpher.morphTo(dolphin, 'ltr');

//   setTimeout(() => {
//     console.log('Switching to group1');
//     morpher.morphTo(woodpecker, 'rtl');
//   }, 4000);

// }, 4000);



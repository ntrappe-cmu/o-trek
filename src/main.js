// import serializePolygonData from './shard.js';
import ShardMorpher from './shard_morpher.js';
import condorData from '../public/json/condor.json';
import guanacoData from '../public/json/guanaco.json';

// import { serializePolygonData, createShardElements } from './shard.js';

// try {
//   const res = await fetch('/condor.svg');
//   if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
//   const svgText = await res.text();

//   const parser = new DOMParser();
//   const doc = parser.parseFromString(svgText, 'image/svg+xml');
//   const svg = doc.querySelector('svg');
//   if (!svg) throw new Error('No <svg> found in one-triangle.svg');

//   // Creates JSON string from SVG
//   const shardDataJson = serializePolygonData(svg, 'condor');
//   // Convert to JSON object
//   const shardData = typeof shardDataJson === 'string' ? JSON.parse(shardDataJson) : shardDataJson;
//   const shards = createShardElements(shardData);

// } catch (err) {
//   console.error(err);
// }

// try {
//   const res = await fetch('/guanaco.svg');
//   if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
//   const svgText = await res.text();

//   const parser = new DOMParser();
//   const doc = parser.parseFromString(svgText, 'image/svg+xml');
//   const svg = doc.querySelector('svg');
//   if (!svg) throw new Error('No <svg> found in /guanaco.svg');

//   const shardDataJson = serializePolygonData(svg, 'guanaco');
//   localStorage.setItem('guanaco', shardDataJson);

// } catch (err) {
//   console.error(err);
// }


// Initialize the morpher
const morpher = new ShardMorpher(45);
// // Load first animal immediately
morpher.morphTo(condorData);

// Switch to second animal after 3 seconds
setTimeout(() => {
  morpher.morphTo(guanacoData);
}, 3000);


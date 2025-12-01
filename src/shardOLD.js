const GLOBAL_STAGE_WIDTH = 1000;
const GLOBAL_STAGE_HEIGHT = 1000;
const GLOBAL_STAGE_SIZE = 1000;
const TARGET_SIZE = 750;
const TARGET_FIT = 800;

/**
 * Create DOM elements representing shards from a parsed JSON descriptor and return the container div.
 *
 * The function builds a container div (.shard-box) with an id from data.name, sets the aspect ratio from
 * data.box, and for each shard in data.shards creates a .shard-wrapper containing a .shard element.
 * Each .shard element receives its backgroundColor from shard.fill and its clipPath from shard.path.
 *
 * @param {Object} data - Shard descriptor object.
 * @param {string} data.name - Identifier to use as the container element's id.
 * @param {{x:number,y:number,w:number,h:number}} data.box - Viewbox information used to set aspectRatio.
 * @param {Object.<string,{path:string,fill:string}>} data.shards - Map of shard ids to shard descriptors.
 * @returns {HTMLDivElement} The container div element (.shard-box) containing the created shard elements.
 */
export function createShardElements(data) {
  if (!data || !data.box || !data.shards) {
    throw new Error('Invalid shard data provided');
  }

  const shardBox = document.getElementById('shard-box');

  // Set size of shared box based on viewbox dimensions to ensure correct aspect ratio
  // and keep the triangles from being distorted
  shardBox.style.aspectRatio = `${data.box.w} / ${data.box.h}`;
  console.log('aspect ratio @ shard.js', shardBox.style.aspectRatio);

  for (const [shardId, shardData] of Object.entries(data.shards)) {
    console.log(`Creating shard ${shardId}`);
    const shardWrapper = document.createElement('div');
    const shard = document.createElement('div');
    shardWrapper.setAttribute('class', 'shard-wrapper');
    shard.setAttribute('class', 'shard');
    shard.style.backgroundColor = shardData.fill;
    shard.style.webkitClipPath = shardData.path;
    shard.style.clipPath = shardData.path;
    
    // Attach shard to wrapper, then wrapper to box
    shardWrapper.appendChild(shard);
    shardBox.appendChild(shardWrapper);
  }

  return shardBox;
}

/**
 * Serialize an SVG's path elements into a JSON string describing pieces as polygons with percentage coordinates.
 *
 * The function validates that svgObj is an SVG element with a viewBox attribute, reads the viewBox into a box
 * object { x, y, w, h }, converts each <path>'s `d` attribute into absolute coordinates, converts those coordinates
 * to percentages relative to the viewBox, and produces a pretty-printed JSON string of the form:
 * { name, box, shards } where shards is an object with numeric keys (starting at 1) mapping to { path: 'polygon(...)', fill }.
 *
 * @param {SVGElement} svgObj - The SVG root element to serialize; must implement getAttribute and have a viewBox.
 * @param {string} [name='piece'] - Optional top-level name to include in the serialized JSON.
 * @returns {string} A pretty-printed JSON string describing the viewBox and shards.
 * @throws {Error} If svgObj is falsy or does not expose getAttribute, or if the viewBox attribute is missing.
 */
// export function serializePolygonData(svgObj, name='piece') {
//    // Validate input
//   if (!svgObj || !svgObj.getAttribute) {
//     throw new Error('Invalid SVG element provided');
//   }

//   const viewBoxString = svgObj.getAttribute('viewBox');
//   if (!viewBoxString) {
//     throw new Error('SVG element missing viewBox attribute');
//   }

//   // Pull relevant data sections from svg
//   const viewBoxElements = svgObj.getAttribute('viewBox').split(' ');
//   const box = {
//     x: Number(viewBoxElements[0]),
//     y: Number(viewBoxElements[1]),
//     w: Number(viewBoxElements[2]),
//     h: Number(viewBoxElements[3])
//   };

//   const paths = svgObj.querySelectorAll('path');
//   const shards = {};

//   paths.forEach((path, index) => {
//     let polygonString = '';
//     const coordinates = pathToCoordinates(path.getAttribute('d'));
//     const percentages = coordinatesToPercentages(coordinates, box);

//     for (let i = 0; i < percentages.length; i++) {
//       if (i > 0) polygonString += ', ';
//       polygonString += `${percentages[i][0]}% ${percentages[i][1]}%`;
//     }

//     shards[index + 1] = {
//       path: `polygon(${polygonString})`,
//       fill: path.getAttribute('fill') || '#000000'
//     };
//   });

//   return JSON.stringify({ name, box, shards }, null, 2);
// }

/**
 * Parse an SVG path 'd' string into an array of absolute [x, y] coordinate pairs.
 *
 * Supported SVG commands: M/m (move), L/l (line), H/h (horizontal line), V/v (vertical line), and Z/z (close — ignored).
 * Relative commands (lowercase) are resolved into absolute coordinates by accumulating the current point.
 * Curves and arcs (C, S, Q, T, A and variants) are rejected — the function throws an Error if such commands are present.
 * The returned array has duplicate points removed (by exact coordinate match).
 *
 * @param {string} pathString - The SVG path `d` string to parse.
 * @returns {Array.<Array.<number>>} An array of absolute coordinate pairs, e.g. [[x1, y1], [x2, y2], ...].
 * @throws {Error} If the path contains unsupported commands (curves/arcs) or if input is not a valid path string.
 */
export function pathToCoordinates(pathString) {
  // Regex to find all floating point numbers (positive or negative)
  // This ignores the letters M, L, Z, etc.
  const allNumbers = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
  
  if (!allNumbers) return [];

  const coordinates = [];
  
  // Group them into [x, y] pairs
  for (let i = 0; i < allNumbers.length; i += 2) {
    const x = parseFloat(allNumbers[i]);
    const y = parseFloat(allNumbers[i + 1]);
    coordinates.push([x, y]);
  }
  
  return coordinates;
}

/**
 * Convert absolute [x, y] coordinates into percentage coordinates relative to a viewBox.
 *
 * Each input coordinate [x, y] is scaled to a percentage of the viewBox width/height:
 *   xPct = ((x - box.x) / box.w) * 100
 *   yPct = ((y - box.y) / box.h) * 100
 * Values are formatted using Number.toFixed(precision) and returned as strings (e.g. "12.3").
 *
 * @param {Array.<Array.<number>>} coordinates - Array of absolute coordinate pairs [[x, y], ...].
 * @param {{x:number,y:number,w:number,h:number}} box - The SVG viewBox describing origin and size.
 * @param {number} [precision=1] - Number of decimal places to include in the formatted output.
 * @returns {Array.<Array.<string>>} Array of percentage coordinate pairs as strings: [[xPctStr, yPctStr], ...].
 */
export function coordinatesToPercentages(coordinates, box, precision = 1) {
 // 1. Calculate Offsets (Standard centering logic)
  // Since your box is 1000 and stage is 1000, these will be 0.
  // But we keep the math in case you ever use a non-standard SVG.
  const offsetX = (GLOBAL_STAGE_WIDTH - box.w) / 2;
  const offsetY = (GLOBAL_STAGE_HEIGHT - box.h) / 2;

  return coordinates.map(([x, y]) => {
    // 2. Normalize to (0,0) of the box
    // (x - box.x) handles cases where viewBox starts at "0 0" (standard)
    const localX = x - box.x; 
    const localY = y - box.y;

    // 3. Map to Global Stage
    // We don't need scaling factors anymore because the SVG IS the stage size.
    const globalX = localX + offsetX;
    const globalY = localY + offsetY;

    // 4. Convert to Percentage
    const pctX = (globalX / GLOBAL_STAGE_WIDTH) * 100;
    const pctY = (globalY / GLOBAL_STAGE_HEIGHT) * 100;

    return `${pctX.toFixed(2)}% ${pctY.toFixed(2)}%`;
  });
}

export function serializePolygonData(svgString, animalName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector('svg');

  if (!svg) throw new Error("Invalid SVG");

  // 1. Get ViewBox Dimensions
  const viewBoxAttr = svg.getAttribute('viewBox');
  let box = { x: 0, y: 0, w: 1000, h: 1000 }; // Default fallback

  if (viewBoxAttr) {
    const vb = viewBoxAttr.split(' ').map(Number);
    box = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  } else if (svg.getAttribute('width') && svg.getAttribute('height')) {
    box.w = parseFloat(svg.getAttribute('width'));
    box.h = parseFloat(svg.getAttribute('height'));
  }

  // 2. Prepare Output JSON
  const output = {
    name: animalName,
    box: { x: 0, y: 0, w: 1000, h: 1000 }, // Force standard 1000x1000 box for the app
    shards: {}
  };

  // 3. Process Paths (IGNORING Rects)
  // We only select 'path' tags. The <rect> background is ignored automatically.
  const paths = Array.from(doc.querySelectorAll('path'));

  paths.forEach((pathNode, index) => {
    const d = pathNode.getAttribute('d');
    const fill = pathNode.getAttribute('fill') || '#000000';

    // A. Parse Numbers
    const coords = pathToCoordinates(d);
    if (coords.length < 3) return; // Ignore invalid/empty paths

    // B. Convert to %
    // We pass the viewbox we parsed above
    const percentStrings = coordinatesToPercentages(coords, box);

    // C. Add to JSON
    // We use index+1 as the ID
    output.shards[index + 1] = {
      path: `polygon(${percentStrings.join(', ')})`,
      fill: fill
    };
  });
  
  // Flag as normalized so we don't try to re-process it later
  output.isNormalized = true;

  return output;
}
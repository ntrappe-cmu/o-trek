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
export function serializePolygonData(svgObj, name='piece') {
   // Validate input
  if (!svgObj || !svgObj.getAttribute) {
    throw new Error('Invalid SVG element provided');
  }

  const viewBoxString = svgObj.getAttribute('viewBox');
  if (!viewBoxString) {
    throw new Error('SVG element missing viewBox attribute');
  }

  // Pull relevant data sections from svg
  const viewBoxElements = svgObj.getAttribute('viewBox').split(' ');
  const box = {
    x: Number(viewBoxElements[0]),
    y: Number(viewBoxElements[1]),
    w: Number(viewBoxElements[2]),
    h: Number(viewBoxElements[3])
  };

  const paths = svgObj.querySelectorAll('path');
  const shards = {};

  paths.forEach((path, index) => {
    let polygonString = '';
    const coordinates = pathToCoordinates(path.getAttribute('d'));
    const percentages = coordinatesToPercentages(coordinates, box);

    for (let i = 0; i < percentages.length; i++) {
      if (i > 0) polygonString += ', ';
      polygonString += `${percentages[i][0]}% ${percentages[i][1]}%`;
    }

    shards[index + 1] = {
      path: `polygon(${polygonString})`,
      fill: path.getAttribute('fill') || '#000000'
    };
  });

  return JSON.stringify({ name, box, shards }, null, 2);
}

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
  const coordinates = [];
  let currentX = 0;
  let currentY = 0;

  // If empty path, return empty array
  if (pathString.length === 0) return coordinates;

  // If contains curves or archs, reject because we only support triangles
  if (/[CSQTA]/i.test(pathString)) {
    throw new Error('pathToCoordinates only supports M, L, H, V, and Z commands');
  }

  // Remove Z command (which closes the path)
  pathString = pathString.replace(/Z/gi, '').trim();

  // Match both upper and lowercase commands
  const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  const commands = pathString.match(commandRegex);
  
  commands.forEach(cmd => {
    const type = cmd[0];
    // Check if lowercase because that indicates relative coordinates
    // which is different because we need to add to current position
    const isRelative = type === type.toLowerCase();
    const values = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    switch (type.toUpperCase()) { // Now we uppercase only for the switch
      case 'M': // Move to
         if (isRelative && coordinatesToPercentages.length > 0) {  
          // Relative move (lowercase 'm')
          currentX += values[0];
          currentY += values[1];
        } else {  
          // Absolute move (uppercase 'M') or first move
          currentX = values[0];
          currentY = values[1];
        }
        coordinates.push([currentX, currentY]);
        break;
      case 'L': // Line to
        if (isRelative) {  
          // Relative line (lowercase 'l')
          currentX += values[0];
          currentY += values[1];
        } else {  
          // Absolute line (uppercase 'L')
          currentX = values[0];
          currentY = values[1];
        }
        coordinates.push([currentX, currentY]);
        break;
      case 'H': // Horizontal line to
         if (isRelative) {  
          // Relative horizontal (lowercase 'h')
          currentX += values[0];
        } else {  
          // Absolute horizontal (uppercase 'H')
          currentX = values[0];
        }
        coordinates.push([currentX, currentY]);
        break;
      case 'V': // Vertical line to
         if (isRelative) {  
          // Relative vertical (lowercase 'v')
          currentY += values[0];
        } else {  
          // Absolute vertical (uppercase 'V')
          currentY = values[0];
        }
        coordinates.push([currentX, currentY]);
        break;
    }
  });
  // Remove duplicate points
  return coordinates.filter((coord, index, self) =>
    index === self.findIndex(c => c[0] === coord[0] && c[1] === coord[1])
  );
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
  const percentages = coordinates.map(([x, y]) => {
    // Scale coordinates to percentage of viewbox and only 1 decimal place, output as numbers
    const scaledX = ((x - box.x) / box.w) * 100;
    const standardizedX = precision > 0 ? scaledX.toFixed(precision) : Math.round(scaledX);
    const scaledY = ((y - box.y) / box.h) * 100;
    const standardizedY = precision > 0 ? scaledY.toFixed(precision) : Math.round(scaledY);
    return [Number(standardizedX), Number(standardizedY)];
  });
  return percentages;
}


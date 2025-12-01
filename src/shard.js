const GLOBAL_STAGE_WIDTH = 1000;
const GLOBAL_STAGE_HEIGHT = 1000;

// 1. pathToCoordinates
// Ensure the argument is named 'd' so d.match works!
// shard.js

export function pathToCoordinates(d) {
  // 1. Split path into commands (e.g. "M 10 10", "H 20")
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g);
  if (!commands) return [];

  const coordinates = [];
  let currentX = 0;
  let currentY = 0;

  commands.forEach(cmdStr => {
    // Separate the letter (M, L, H, V) from the numbers
    const type = cmdStr[0].toUpperCase();
    const args = cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(parseFloat);

    // Z command has no numbers, just ignore it
    if (!args && type !== 'Z') return; 

    switch (type) {
      case 'M': // Move (x, y)
      case 'L': // Line (x, y)
        for (let i = 0; i < args.length; i += 2) {
          currentX = args[i];
          currentY = args[i + 1];
          coordinates.push([currentX, currentY]);
        }
        break;

      case 'H': // Horizontal Line (x only)
        args.forEach(x => {
          currentX = x;
          // Use previous Y
          coordinates.push([currentX, currentY]);
        });
        break;

      case 'V': // Vertical Line (y only)
        args.forEach(y => {
          currentY = y;
          // Use previous X
          coordinates.push([currentX, currentY]);
        });
        break;
        
      case 'Z': 
        // Close path (no coordinate needed for our polygon visualizer)
        break;
    }
  });
  
  return coordinates;
}

// 2. coordinatesToPercentages
export function coordinatesToPercentages(coordinates, box) {
  // Since we are using standard 1000x1000 frames, these offsets should logically be 0,
  // but we calculate them anyway to be safe.
  const offsetX = (GLOBAL_STAGE_WIDTH - box.w) / 2;
  const offsetY = (GLOBAL_STAGE_HEIGHT - box.h) / 2;

  return coordinates.map(([x, y]) => {
    // Normalize to box origin
    const localX = x - box.x; 
    const localY = y - box.y;

    // Center in global stage
    const globalX = localX + offsetX;
    const globalY = localY + offsetY;

    // Convert to Percentage
    const pctX = (globalX / GLOBAL_STAGE_WIDTH) * 100;
    const pctY = (globalY / GLOBAL_STAGE_HEIGHT) * 100;

    return `${pctX.toFixed(2)}% ${pctY.toFixed(2)}%`;
  });
}

// 3. serializePolygonData
export function serializePolygonData(svgString, animalName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector('svg');

  if (!svg) throw new Error("Invalid SVG");

  // Get dimensions
  const viewBoxAttr = svg.getAttribute('viewBox');
  let box = { x: 0, y: 0, w: 1000, h: 1000 }; 

  if (viewBoxAttr) {
    const vb = viewBoxAttr.split(' ').map(Number);
    box = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  } else if (svg.getAttribute('width') && svg.getAttribute('height')) {
    box.w = parseFloat(svg.getAttribute('width'));
    box.h = parseFloat(svg.getAttribute('height'));
  }

  const output = {
    name: animalName,
    box: { x: 0, y: 0, w: GLOBAL_STAGE_WIDTH, h: GLOBAL_STAGE_HEIGHT },
    shards: {}
  };

  const paths = Array.from(doc.querySelectorAll('path'));

  paths.forEach((pathNode, index) => {
    // Define 'd' here so we can pass it to the function
    const d = pathNode.getAttribute('d');
    const fill = pathNode.getAttribute('fill') || '#000000';

    if (!d) return;

    // Step A: Parse
    const coords = pathToCoordinates(d); 
    if (coords.length < 3) return; 

    // Step B: Convert
    const percentStrings = coordinatesToPercentages(coords, box);

    // Step C: Save
    output.shards[index + 1] = {
      path: `polygon(${percentStrings.join(', ')})`,
      fill: fill
    };
  });
  
  output.isNormalized = true;
  return output;
}
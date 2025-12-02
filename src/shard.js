/**
 * @file shard.js
 * @description Utility module for parsing and normalizing SVG data.
 * This file converts raw SVG strings (exported from design tools like Figma)
 * into the standardized JSON format required by the ShardMorpher engine.
 *
 * Key features:
 * - Parses SVG path commands (M, L, H, V).
 * - Normalizes coordinates to a fixed 1000x1000 global stage.
 * - Converts absolute pixels to CSS percentages for responsive clip-paths.
 *
 * @version 1.0.0
 */

// The standardized coordinate system used by the app.
// All animals are mapped onto this 1000x1000 grid to ensure consistent scaling.
const GLOBAL_STAGE_WIDTH = 1000;
const GLOBAL_STAGE_HEIGHT = 1000;

// =============================================================================
// 1. PATH PARSING
// =============================================================================

/**
 * Parses an SVG path data string ('d' attribute) into an array of absolute [x, y] coordinates.
 *
 * This function acts as a state machine to handle various SVG commands:
 * - M (Move To): Sets the start point.
 * - L (Line To): Draws to a specific x,y.
 * - H (Horizontal): Updates x, keeps previous y.
 * - V (Vertical): Updates y, keeps previous x.
 * - Z (Close Path): Ignored (CSS polygons auto-close).
 *
 * @param {string} d - The raw path string from the SVG (e.g., "M10 10 H20 V20").
 * @returns {Array<Array<number>>} An array of coordinate pairs: [[x, y], [x, y], ...].
 */
export function pathToCoordinates(d) {
  // 1. Split path into commands (e.g. "M 10 10", "H 20")
  // Regex looks for a Letter followed by anything that isn't a letter
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g);
  if (!commands) return [];

  const coordinates = [];
  let currentX = 0;
  let currentY = 0;

  commands.forEach(cmdStr => {
    // Separate the command letter from the arguments
    const type = cmdStr[0].toUpperCase();

    // Parse all numbers in the command string
    const args = cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(parseFloat);

    // If it's not a Z command and has no numbers, skip it to prevent errors
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
        // Close path. We don't need a coordinate for this because
        // CSS clip-path: polygon() automatically closes the shape.
        break;
    }
  });
  
  return coordinates;
}

// =============================================================================
// 2. COORDINATE CONVERSION
// =============================================================================
/**
 * Converts absolute pixel coordinates into CSS-compatible percentages relative to the Global Stage.
 *
 * @param {Array<Array<number>>} coordinates - The array of [x, y] pairs.
 * @param {Object} box - The bounding box of the original SVG viewbox {x, y, w, h}.
 * @returns {Array<string>} An array of percentage strings: ["50.00% 50.00%", ...].
 */
export function coordinatesToPercentages(coordinates, box) {
  // Calculate offset to center the content if the viewbox isn't exactly 1000x1000.
  // (In the standard workflow, these will usually be 0).
  const offsetX = (GLOBAL_STAGE_WIDTH - box.w) / 2;
  const offsetY = (GLOBAL_STAGE_HEIGHT - box.h) / 2;

  return coordinates.map(([x, y]) => {
    // 1. Normalize to the box origin (remove x/y offset from SVG)
    const localX = x - box.x; 
    const localY = y - box.y;

    // 2. Map to the Global Stage
    const globalX = localX + offsetX;
    const globalY = localY + offsetY;

    // 3. Convert to Percentage
    const pctX = (globalX / GLOBAL_STAGE_WIDTH) * 100;
    const pctY = (globalY / GLOBAL_STAGE_HEIGHT) * 100;

    return `${pctX.toFixed(2)}% ${pctY.toFixed(2)}%`;
  });
}

// =============================================================================
// 3. MAIN SERIALIZER
// =============================================================================

/**
 * Parses a raw SVG string into the final JSON object used by the app.
 * This is the main entry point for data loading.
 *
 * @param {string} svgString - The raw XML string of the SVG file.
 * @param {string} animalName - The name of the animal (used for metadata).
 * @returns {Object} The formatted Shard Data object containing paths and colors.
 * @throws {Error} If the string is not valid SVG.
 */
export function serializePolygonData(svgString, animalName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector('svg');

  if (!svg) throw new Error("Invalid SVG");

  // 1. Determine Dimensions (Prefer viewBox, fall back to width/height)
  const viewBoxAttr = svg.getAttribute('viewBox');
  let box = { x: 0, y: 0, w: 1000, h: 1000 }; 

  if (viewBoxAttr) {
    const vb = viewBoxAttr.split(' ').map(Number);
    box = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  } else if (svg.getAttribute('width') && svg.getAttribute('height')) {
    box.w = parseFloat(svg.getAttribute('width'));
    box.h = parseFloat(svg.getAttribute('height'));
  }

  // 2. Prepare Output Structure
  const output = {
    name: animalName,
    // We force the box to match the global stage so the app treats it consistently
    box: { x: 0, y: 0, w: GLOBAL_STAGE_WIDTH, h: GLOBAL_STAGE_HEIGHT },
    shards: {}
  };

  // 3. Process Paths
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
  
  // Flag as normalized so the app knows it doesn't need to resize it
  output.isNormalized = true;
  return output;
}
export function pathToCoords(path) {
  const coords = [];  // 3 (x,y) pairs
  let currentX = 0;   // Starting point (x-coordinate)
  let currentY = 0;   // Starting point (y-coordinate)

  if (path.length === 0) return coords;

  // Remove the Z command (closes the path by drawing line back to start)
  path = path.replace(/Z/g, '').trim();

  // Match commands and their parameters
  const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
  const commands = path.match(commandRegex);

  commands.forEach(cmd => {
    const type = cmd[0].toUpperCase();
    const values = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    switch (type) {
      case 'M': // Move to
      case 'L': // Line to
        currentX = values[0];
        currentY = values[1];
        coords.push([currentX, currentY]);
        break;
      case 'H': // Horizontal line to
        currentX = values[0];
        coords.push([currentX, currentY]);
        break;
      case 'V': // Vertical line to
        currentY = values[0];
        coords.push([currentX, currentY]);
        break;
      // Note: For simplicity, other commands (C, S, Q, T, A) are not handled here.
    }
  });

  // Consider removing duplicate points (like when closing path returns to start)
  return coords.filter((coord, index, self) =>
    index === self.findIndex(c => c[0] === coord[0] && c[1] === coord[1])
  );
}

// Takes in set of coordinates [[X1,,Y1],[X2,Y2],[X3,Y3]] and calculates
// relative polygon points for SVG polygon element within given viewbox
export function coordsToPolygon(coords, viewbox) {
  const polygonPoints = coords.map(([x, y]) => {
    // Scale coordinates to percentage of viewbox and only 1 decimal place, output as numbers
    const scaledX = Number((((x - viewbox.x) / viewbox.width) * 100).toFixed(1));
    const scaledY = Number((((y - viewbox.y) / viewbox.height) * 100).toFixed(1));
    return [scaledX, scaledY];
  });
  return polygonPoints;
}
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
  return coords;
}
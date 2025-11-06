import * as shards from '../../src/shard.js';

test('pathToCoords fails with empty path', () => {
    const path = "";
    const coords = shards.pathToCoords(path);
    expect(coords).toEqual([]);
});

test('pathToCoords extracts coordinates from SVG path', () => {
    const path = "M0 76L24 0L51 76H0Z";
    const coords = shards.pathToCoords(path);
    expect(coords).toEqual([[0, 76], [24, 0], [51, 76], [0, 76]]);
});

test('pathToCoords works for triangle with positive coordinates', () => {
  const path = "M10 20L30 40L50 60Z";
  const coords = shards.pathToCoords(path);
  expect(coords).toEqual([[10, 20], [30, 40], [50, 60]]);
});

test('pathToCoords works for triangle with negative coordinates', () => {
  const path = "M-5 -5L0 10L10 0Z";
  const coords = shards.pathToCoords(path);
  expect(coords).toEqual([[-5, -5], [0, 10], [10, 0]]);
});

test('pathToCoords works for triangle with decimals', () => {
  const path = "M1.5 2.5L3.1 4.2L5.7 6.8Z";
  const coords = shards.pathToCoords(path);
  expect(coords).toEqual([[1.5, 2.5], [3.1, 4.2], [5.7, 6.8]]);
});


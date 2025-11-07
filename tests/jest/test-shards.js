import * as shards from '../../src/shard.js';
import { JSDOM } from 'jsdom';


test('pathToCoordinates fails with empty path', () => {
    const path = "";
    const coordinates = shards.pathToCoordinates(path);
    expect(coordinates).toEqual([]);
});

test('pathToCoordinates extracts coordinates from SVG path', () => {
    const path = "M0 76L24 0L51 76H0Z";
    const coordinates = shards.pathToCoordinates(path);
    expect(coordinates).toEqual([[0, 76], [24, 0], [51, 76]]);
});

test('pathToCoordinates works for triangle with positive coordinates', () => {
  const path = "M10 20L30 40L50 60Z";
  const coordinates = shards.pathToCoordinates(path);
  expect(coordinates).toEqual([[10, 20], [30, 40], [50, 60]]);
});

test('pathToCoordinates works for triangle with negative coordinates', () => {
  const path = "M-5 -5L0 10L10 0Z";
  const coordinates = shards.pathToCoordinates(path);
  expect(coordinates).toEqual([[-5, -5], [0, 10], [10, 0]]);
});

test('pathToCoordinates works for triangle with decimals', () => {
  const path = "M1.5 2.5L3.1 4.2L5.7 6.8Z";
  const coordinates = shards.pathToCoordinates(path);
  expect(coordinates).toEqual([[1.5, 2.5], [3.1, 4.2], [5.7, 6.8]]);
});

test('coordinatesToPercentages converts to polygon percents', () => {
  const coordinates = [[0, 76], [24, 0], [51, 76]];
  const box = { x: 0, y: 0, w: 51, h: 76 };
  const percentages = shards.coordinatesToPercentages(coordinates, box);
  expect(percentages).toEqual([[0.0,100.0],[47.1,0.0],[100.0,100.0]]);
});

test('coordinatesToPercentages converts to rounded percents', () => {
  const coordinates = [[0, 76], [24, 0], [51, 76]];
  const box = { x: 0, y: 0, w: 51, h: 76 };
  const percentages = shards.coordinatesToPercentages(coordinates, box, 0);
  expect(percentages).toEqual([[0,100],[47,0],[100,100]]);
});

describe('serizalize polygon data', () => {
  let svgObj;

  beforeEach(() => {
    const svgString = `
    <svg width="68" height="87" viewBox="0 0 68 87" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 86.5L24 10.5L51 86.5H0Z" fill="#DB509D"/>
        <path d="M24 10.5L39.5 54L68 0L24 10.5Z" fill="#2E79AF"/>
    </svg>
    `;

    const dom = new JSDOM(svgString);
    svgObj = dom.window.document.querySelector('svg');
  });

  test('should serialize SVG data correctly', () => {
    const result = JSON.parse(shards.serializePolygonData(svgObj, 'two-triangles'));
    expect(result).toHaveProperty('name', 'two-triangles');
    expect(result).toHaveProperty('box');
    expect(result).toHaveProperty('shards');
  });

  test('should extract correct viewBox dimensions', () => {
    const result = JSON.parse(shards.serializePolygonData(svgObj));
    expect(result.box).toEqual({
      x: 0,
      y: 0,
      w: 68,
      h: 87
    });
  });

  test('should use default name when not provided', () => {
    const result = JSON.parse(shards.serializePolygonData(svgObj));
    expect(result.name).toBe('piece');
  });

  test('should process all paths into shards', () => {
    const result = JSON.parse(shards.serializePolygonData(svgObj));
    
    expect(Object.keys(result.shards)).toHaveLength(2);
    expect(result.shards).toHaveProperty('1');
    expect(result.shards).toHaveProperty('2');
  });
});

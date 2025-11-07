import { svgToPolygon, countTriangles, getViewBox } from './shard.js';

try {
  const res = await fetch('/condor.svg');
  if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
  const svgText = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) throw new Error('No <svg> found in one-triangle.svg');

  const elements = svgToPolygon(svg);
  if (!Array.isArray(elements) || elements.length === 0) throw new Error('svgToPolygon returned no elements');

  const ctr = document.getElementById('shard-mover');
  const viewBox = getViewBox(svg);
  ctr.style.width = `${viewBox.width}px`;
  ctr.style.height = `${viewBox.height}px`;
  for (let i = 0; i < countTriangles(svg); i++) {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'shard-wrapper');
    wrap.appendChild(elements[i]);
    ctr.appendChild(wrap);
  }  

} catch (err) {
  console.error(err);
}

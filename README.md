# Patagonia in Pieces ("O-Trek")
An interactive visual exhibition exploring 10 species from the Patagonia region. This project uses CSS polygons to fracture animals into 40 pieces, morphing them fluidly from one species to the next using standard web technologies.

#### Nicole Trappe | SSUI Fall 2025
#### https://ntrappe-cmu.github.io/o-trek/

## Quick Start
To run this project locally:

1. **Install Dependencies & Bundle:**

```Bash
npm install
npm run build
```
> [!NOTE]
> Uses babel-jest `^29.7.0`, jest `^29.7.0`, and Vite.

2. **Run Development Server:**

```Bash
npm run dev
```
3. **Open in Browser:** Navigate to the localhost link provided by Vite.

> [!NOTE]
> For the best performance and _support_ of the CSS clip-paths and backdrop filters, please use Safari.

## How to Add Your Own Animals
The project currently includes 10 species in `src/assets/json`. If you want to create your own "shattered" vector art using this codebase, follow this workflow:

1. **Design in Figma**
  - Create a Frame exactly 1000px x 1000px.
  - Draw your animal inside this frame using vector shapes (paths).
  - Ensure the art fills the frame nicely.
  - Select the Frame (not the group) and Export as SVG.

2. **Convert SVG to JSON**
  - Since browsers cannot natively morph SVGs into CSS Polygons easily, we convert the SVG paths into a normalized JSON format.
  - Place your exported SVG file in the public/svg/ folder (e.g., hippo.svg).
  - Paste the following temporary code into the bottom of src/main.js to run the converter:
```javascript
import { serializePolygonData } from './shard.js';

/* --- TEMP CONVERTER UTILITY --- */
(async function convert() {
  try {
    const name = 'hippo'; // CHANGE THIS to your filename
    console.log(`Starting conversion for: ${name}...`);
    
    // Fetch the raw SVG text
    const res = await fetch(`/svg/${name}.svg`);
    if (!res.ok) throw new Error('Failed to load SVG: ' + res.status);
    const svgText = await res.text();

    // Parse and convert to Shard JSON format
    const shardDataJson = serializePolygonData(svgText, name);
    
    // Save to LocalStorage
    localStorage.setItem(name, JSON.stringify(shardDataJson)); 
    console.log(`SUCCESS! Check LocalStorage for key: "${name}"`);

  } catch (err) {
    console.error(err);
  }
})();
```

3. **Save the Data**
  - Run the app in your browser.
  - Open **DevTools** > **Application** > **Local Storage**.
  - Find the key (e.g., hippo), copy the value, and save it as a new file in `src/assets/json/hippo.json`.
  - Import this JSON in `src/main.js` to add it to the exhibition.

## How it Works
This project avoids heavy canvas libraries (like Three.js or P5.js) in favor of performant DOM manipulation and CSS transitions.

1. **The Shard Pool** (`shard_morpher.js`)

Instead of creating new DOM elements for every animal, we initialize a fixed pool of 40 <div> elements (shards). This prevents memory leaks and DOM thrashing.

2. **Coordinate Normalization**

All vector data is normalized to a 1000x1000 coordinate system. The parser (`shard.js`) reads SVG path commands (`M`, `L`, `H`, `V`) and converts absolute pixels into relative CSS percentages:
- `x: 500px` -> `left: 50%`
- `path: M 100 100...` -> `clip-path: polygon(10% 10%, ...)`

3. **The Animation Engine**

When navigating between species:
1. **Sorting:** Shards are sorted spatially (Left-to-Right).
2. **Wave Effect:** A stagger delay is applied to the transition of each shard, creating a "wave" of morphing pieces.
3. **Physics:** If the menu is opened ("Explode" mode), shards are scattered to the screen edges using calculated trajectories, then pulled back inward ("Implode") via CSS transforms when a new animal is selected.

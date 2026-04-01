# Plant Hotspots (React)

Standalone React app (Vite) that displays `planta.svg` with clickable hotspots that open a detailed modal. Designed to be built and deployed alongside a WordPress site (upload the `dist` output or copy static files to your public folder).

---

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

---

## Deployment notes (Hostinger / filesystem)

- Place `planta.svg` in the `public/` folder before building.
- After `npm run build`, copy the contents of `dist/` into your host folder (e.g. `public_html/plant-viewer`).
- The app loads the floor plan from `BASE_URL + planta.svg` and hotspots from `BASE_URL + data/hotspots.json`. The `base` in `vite.config.js` controls `BASE_URL` — currently set to `/plant-viewer/`.

## WordPress integration

Build the app and copy the produced static files into a folder served by WordPress (e.g. `wp-content/uploads/plant-hotspots/` or a subfolder in your theme). Then embed via an `<iframe>` or include files directly in a page template. For better integration, create a small plugin/shortcode to enqueue the built CSS/JS and render the target `<div id="root">`.

---

## Configuring hotspots — `public/data/hotspots.json`

This file drives everything visible in the app. It has two top-level sections:

```json
{
  "templates": { ... },
  "hotspots":  [ ... ]
}
```

### `hotspots` — the markers on the map

Each entry in the `hotspots` array places a dot on the floor plan and controls what appears in the modal when clicked.

```json
{
  "id":       "C023",
  "title":    "Gab. Consulta 23",
  "x":        20,
  "y":        5,
  "color":    "#2a9d8f",
  "type":     "Acunpunctura",
  "info":     "Gabinete de Consulta 23 — Acunpunctura",
  "image":    "room-photo.jpg",
  "model":    "https://example.com/model/?hideUI=true",
  "template": "consulta-standard",
  "rooms":    ["gab-consulta-22", "gab-consulta-24"],
  "products": []
}
```

| Field | Required | Description |
|---|---|---|
| `id` | ✅ | Unique identifier. Used for cross-referencing in `rooms` lists. |
| `title` | ✅ | Room name shown in the modal header. |
| `x` | ✅ | Horizontal position as a percentage of the SVG width (0 – 100). |
| `y` | ✅ | Vertical position as a percentage of the SVG height (0 – 100). |
| `color` | — | Hotspot dot color (hex). Falls back to `#3dc99a` if omitted. |
| `type` | — | Specialty or room type shown as a badge next to the title (e.g. `"Cardiologia"`). Leave empty or omit to hide the badge. |
| `info` | — | Short description shown below the room pills. |
| `image` | — | Filename (relative to `public/`) or URL of the 2D floor plan photo shown in the modal left panel. Falls back to the main `planta.svg` if omitted. |
| `model` | — | URL of the 3D model or iframe to embed in the modal when the user switches to "3D Model" view. If omitted, a "Coming soon" placeholder is shown instead. |
| `template` | — | Key of a template from the `templates` section (see below). Template fields are merged in; hotspot-level fields override them. |
| `rooms` | — | List of IDs of *other* hotspots that share the same group (shown as coloured pills under "Also in"). Used when a hotspot has no template. |
| `products` | — | Array of product objects (see schema below). Used when a hotspot has no template or needs to override template products. |

> **Tip — coordinates:** Open the SVG in a browser, hover over a room, and note the cursor position as a percentage of the image dimensions. `x: 0, y: 0` is top-left; `x: 100, y: 100` is bottom-right.

---

### `templates` — shared data for groups of rooms

When many rooms are identical (same equipment, same related-rooms list, same color), define the shared data once as a template and reference it from each hotspot with `"template": "<key>"`.

```json
"templates": {
  "consulta-standard": {
    "color":    "#2a9d8f",
    "image":    "room-photo.jpg",
    "rooms":    ["gab-consulta-22", "gab-consulta-24", "..."],
    "products": [ ... ]
  }
}
```

**Merge rules:**
- Every field inside a template (`color`, `image`, `model`, `rooms`, `products`) is applied to the hotspot as a default.
- If the same field is also defined directly on the hotspot, the hotspot value wins.
- `type` and `info` are intentionally **not** put in templates — they differ per room and should always be set on the hotspot itself.

To create a new template, add a new key under `"templates"` and reference it with `"template": "your-key"` on the relevant hotspots.

---

### Product schema

Each item in a `products` array (either on a hotspot directly or inside a template) follows this structure:

```json
{
  "name":        "MARQUESA 1850X620X580MM",
  "sku":         "MRQ-001",
  "description": "Short description of the product.",
  "category":    "Mobiliário Clínico",
  "image":       "marquesa.jpg",
  "specs": {
    "dimensions":      "1850 × 620 × 580 mm",
    "minHeight":       "500 mm",
    "maxHeight":       "900 mm",
    "bedExtension":    "200 mm (1850–2050 mm)",
    "weightingSystem": "Integrated digital scale (0–250 kg)",
    "weight":          "45 kg",
    "capacity":        "250 kg",
    "material":        "Steel frame with antibacterial coating",
    "powerSupply":     "230V AC / Battery backup"
  }
}
```

| Field | Description |
|---|---|
| `name` | Product name displayed prominently on the card. |
| `sku` | Reference code shown as a small badge. Leave `""` if unknown. |
| `description` | One or two sentences about the product. Leave `""` if none. |
| `category` | Shown as a teal pill (e.g. `"Mobiliário Clínico"`, `"Diagnóstico"`). |
| `image` | Filename (relative to `public/`) or URL of the product photo. Leave `""` to show a fallback icon. |
| `specs` | Object of technical specification key/value pairs. All fields are optional — omit or set `""` for any spec that is not applicable. Unknown specs are ignored. |

Available `specs` keys and how they render in the modal:

| Key | Label | Notes |
|---|---|---|
| `dimensions` | Dimensions | – |
| `minHeight` | Min Height | – |
| `maxHeight` | Max Height | – |
| `bedExtension` | Bed Extension | Spans full width |
| `weightingSystem` | Weighting System | Spans full width |
| `weight` | Weight | – |
| `capacity` | Capacity | – |
| `material` | Material | Spans full width |
| `powerSupply` | Power Supply | Spans full width |

---

### Full minimal example

A standalone hotspot with no template:

```json
{
  "id":    "SALA-1",
  "title": "Sala de Espera",
  "x":     50,
  "y":     50,
  "color": "#e76f51",
  "type":  "Espera",
  "info":  "Sala de espera principal — 25m²",
  "rooms": [],
  "products": [
    {
      "name":     "CADEIRA VISITANTE",
      "sku":      "",
      "category": "Mobiliário",
      "image":    "",
      "specs": {
        "dimensions": "550 × 520 × 450 mm",
        "capacity":   "120 kg",
        "material":   "Polipropileno / estrutura metálica"
      }
    }
  ]
}
```

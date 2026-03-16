# Plant Hotspots (React)

Standalone React app (Vite) that displays `planta.png` with clickable hotspots that open an in-page modal. Designed to be built and deployed alongside a WordPress site (upload the `dist` output or copy static files to your public folder).

Quick start (locally)

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

Deployment notes (Hostinger / filesystem)
- Place `planta.png` at the web root (e.g. `public_html/planta.png`) so the app can load it via `/planta.png`.
- After `npm run build`, copy the contents of `dist/` into a folder on your host (e.g. `public_html/plant-viewer`).
- The app expects the hotspots JSON at `/plant-viewer/data/hotspots.json` inside the deployed folder — update paths in `src/App.jsx` if you prefer different locations.

WordPress integration
- Build the app and copy the produced static files into a folder served by WordPress (e.g. `wp-content/uploads/plant-hotspots/` or a subfolder in your theme). Then embed via an iframe or include files directly in a page template. For better integration, create a small plugin/shortcode to enqueue the built CSS/JS and render target HTML.

Customizing hotspots
- Edit `plant-viewer/data/hotspots.json`. Coordinates `x` and `y` are percent-like values in the 0-100 range matching the SVG viewBox used by the overlay.

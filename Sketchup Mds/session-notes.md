# CadBot — Session Notes

## What This Is
A browser-based parametric CAD tool. Text prompt → Claude API → structured JSON → replicad geometry → Three.js viewport.

No shadow box specifics — general purpose "describe a shape, see it in 3D" pipeline. Shadow box / acrylic layering is a possible future direction (see flat-sheet-startup-session.md in Sketchup+Claude folder).

---

## Stack
| Component | Package |
|---|---|
| UI framework | Vite + React |
| 3D renderer | Three.js (vanilla, with OrbitControls) |
| CAD kernel | replicad + replicad-opencascadejs |
| Mesh helper | replicad-threejs-helper |
| AI | Claude API (BYOK — key in localStorage) |

---

## Architecture

```
User types prompt
      ↓
Claude API (claude-sonnet-4-6, temperature: 0, BYOK)
outputs JSON: { type, width, depth, height } etc.
      ↓
cadWorker.js (Web Worker)
loads replicad-opencascadejs WASM
calls makeBox / makeSphere / makeCylinder
meshes the shell via replicad-threejs-helper
      ↓
Viewer.jsx
builds BufferGeometry from mesh data
renders in Three.js scene with OrbitControls
```

---

## Key Files
- `src/App.jsx` — main UI: API key input, prompt textarea, Generate button, status
- `src/Viewer.jsx` — Three.js scene, OrbitControls, mesh rendering
- `src/cadWorker.js` — Web Worker: loads OC WASM, runs replicad, returns mesh
- `src/App.css` — dark UI styles
- `vite.config.js` — excludes replicad packages from optimizeDeps, sets COEP/COOP headers for WASM

---

## Supported Shapes (so far)
- `box` — width, depth, height
- `sphere` — radius
- `cylinder` — radius, height

Claude system prompt constrains output to these types. Default: box 50×50×50.

---

## Known Issues / Next Steps
- [ ] Test that Generate actually produces a shape end-to-end
- [ ] Add more shape types (cone, torus, extruded profile)
- [ ] Add DXF/SVG export from replicad
- [ ] Wire up more complex geometry from Claude JSON
- [ ] Consider: sketch → extrude workflow for arbitrary profiles

---

## WASM Notes
- Must use `replicad-opencascadejs` — NOT `opencascade.js` (incompatible with Vite 6)
- `optimizeDeps.exclude` must list replicad packages or Vite tries to pre-bundle WASM
- COEP/COOP headers required for SharedArrayBuffer (WASM threads)
- Worker format must be `'es'`

---

## Dev Server
```
cd C:\Users\HKris\CadBot
npm run dev
# Opens on http://localhost:5173 (or next available port)
```

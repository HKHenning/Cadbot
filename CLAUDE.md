# CLAUDE.md — CadBot Project Context
# This file is auto-read by Claude Code at the start of every session.

---

## PROJECT OVERVIEW

CadBot is a browser-based parametric CAD tool. The core loop:
- User types a natural language description of a shape
- Claude API (BYOK) interprets it and returns structured JSON
- replicad (OpenCascade WASM) generates solid geometry
- Three.js renders it in a 3D viewport with OrbitControls

This is a general-purpose "describe a shape, see it in 3D" foundation.
Future direction: DXF/SVG export for laser cutting, more complex geometry,
and possibly layered acrylic shadow box product (see flat-sheet-startup-session.md).

---

## STACK

| Component | Package |
|---|---|
| UI framework | Vite + React |
| 3D renderer | Three.js (vanilla, with OrbitControls) |
| CAD kernel | replicad + replicad-opencascadejs |
| Mesh helper | replicad-threejs-helper |
| AI | Claude API (BYOK — key stored in localStorage) |

---

## ARCHITECTURE

```
User types prompt
      ↓
Claude API (claude-sonnet-4-6, temperature: 0, BYOK)
outputs JSON only: { type, width, depth, height } etc.
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

## KEY FILES

- `src/App.jsx` — main UI: API key input, prompt textarea, Generate button, status indicator
- `src/Viewer.jsx` — Three.js scene setup, OrbitControls, mesh update on meshData prop change
- `src/cadWorker.js` — Web Worker: loads OC WASM, runs replicad, posts mesh back to main thread
- `src/App.css` — dark UI styles (sidebar + viewport layout)
- `vite.config.js` — COEP/COOP headers, optimizeDeps excludes, worker format
- `session-notes.md` — full session history and decisions

---

## SUPPORTED SHAPES

Claude system prompt constrains output to these types:
- `box` → `{ type, width, depth, height }`
- `sphere` → `{ type, radius }`
- `cylinder` → `{ type, radius, height }`

Default fallback: box 50×50×50mm. All dimensions in millimetres.

---

## BYOK PATTERN

API key stored in `localStorage` under key `anthropic_api_key`.
Called directly from the browser with header `anthropic-dangerous-direct-browser-access: true`.
User sets their own spending limits in Anthropic console.

---

## WASM RULES — CRITICAL

- Use `replicad-opencascadejs` — NOT `opencascade.js` (incompatible with Vite 6)
- `optimizeDeps.exclude` must list all replicad packages
- COEP/COOP headers required in vite.config.js for WASM threads
- Worker format must be `'es'`
- replicad runs in a Web Worker — never import it in the main thread

---

## DEV SERVER

```bash
cd C:\Users\HKris\CadBot
npm run dev
# http://localhost:5173 (or next available port)
```

---

## NEXT STEPS / OPEN TASKS

- [ ] Verify end-to-end: prompt → Claude JSON → replicad mesh → Three.js render
- [ ] Add more shape types (cone, torus, extruded profile from points)
- [ ] Add DXF/SVG export per shape from replicad
- [ ] Consider sketch → extrude workflow for arbitrary 2D profiles
- [ ] Wire up more complex multi-part assemblies from Claude JSON

---

## RELATED FILES

- `C:\Users\HKris\Sketchup+Claude\Sketchup Mds\flat-sheet-startup-session.md` — business/product context, shadow box idea, full pipeline design
- `C:\Users\HKris\Sketchup+Claude\CLAUDE.md` — SketchUp/cabinet context (separate project)

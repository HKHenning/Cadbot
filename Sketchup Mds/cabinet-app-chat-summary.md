# Cabinet Web App — Chat Summary
## Session: SketchUp Extensions → Browser-First Cabinet App

---

## Context

Kris is building a parametric cabinet design system. Existing work:
- **CabinetLib v1.2** — validated Ruby library running in SketchUp 2026 via MCP
- All cabinet rules documented in `sketchup_cabinet_rules.md`
- Active project: 650 West Ave apartment floor plan

---

## Key Decisions Made

### 1. SketchUp Extension Monetization (research)
- Extension Warehouse: free to list, Trimble takes a commission on sales
- Pricing models: Free / Fixed Term (subscription) / Perpetual (one-time)
- "Listing Page" model: direct sales, keep 100% revenue, handle own licensing
- Extensions only work on Pro/Studio plans — buyers are paying professionals

### 2. Claude API — BYOK Pattern
**Problem:** Claude.ai subscriptions and the Anthropic API are completely separate. No way to route API calls through a user's subscription. Per-token billing always applies.

**Solution: Bring Your Own Key (BYOK)**
- User pastes their Anthropic API key into app settings once
- Key stored in `localStorage`
- All API calls billed directly to the user's Anthropic account
- Zero API cost to the developer
- Users set their own spending limits in the Anthropic console

```javascript
const apiKey = localStorage.getItem('anthropic_api_key');

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: "..." }]
  })
});
```

### 3. Architecture — Browser-First, SketchUp as Export

**Shift:** Instead of SketchUp being the runtime, it becomes one of several export targets.

```
User Input (chat / form)
        ↓
  Claude API (BYOK)
  interprets intent →
  structured params
        ↓
  Three.js renderer
  (live 3D preview in browser)
        ↓
  Export options:
    • .rb script (drop into SketchUp — leverages CabinetLib)
    • .obj / .glb (universal 3D)
    • .svg / .dxf (flat patterns)
    • Cut list / BOM (PDF/CSV)
```

**Why this is better:**
- No SketchUp required to design — widens addressable market
- Browser = zero installation friction
- All cabinet rules logic moves to JavaScript
- SketchUp becomes a power-user export, not a requirement
- The generated `.rb` file approach reuses all existing CabinetLib work

### 4. Tech Stack

| Component | Tool | Cost |
|---|---|---|
| 3D renderer | Three.js | Free (MIT) |
| UI framework | React | Free |
| Build tool | Vite | Free |
| AI | Claude API (BYOK) | User's own key |
| Hosting | Netlify / GitHub Pages | Free tier |
| Domain | — | ~$12/year |

**React Three Fiber (R3F):** Wraps Three.js in React's component model — recommended for clean integration between 3D viewport and UI state.

**Pragmatic note:** Start with vanilla HTML/JS/Three.js prototype to validate cabinet rendering before adding the full React layer.

### 5. Development Environment
- **Claude Code in VS Code** — scaffold, write, run, and iterate autonomously
- Drop `sketchup_cabinet_rules.md` into the project folder as source of truth for all geometry rules

---

## Suggested Claude Code Kickoff Prompt

```
Build a parametric cabinet design web app using Vite + React + Three.js.

The app should:
- Let users input cabinet dimensions (width, height, depth, number of drawers)
- Render a live 3D preview using Three.js
- Use the Anthropic API with a user-supplied API key (BYOK pattern — key stored in localStorage)
- Include a settings panel for the API key entry
- Start with a single cabinet, box construction, no doors

Cabinet geometry rules are in sketchup_cabinet_rules.md — use this as the 
source of truth for all dimensions and construction logic.
```

---

## Reference Files
- `sketchup_cabinet_rules.md` — canonical cabinet geometry rules
- `sketchup_ruby_api_reference.md` — SketchUp Ruby API reference
- `CLAUDE.md` — full project context for Claude Code sessions

---

## Next Steps
1. Open VS Code in a new project folder
2. Copy `sketchup_cabinet_rules.md` into it
3. Run `claude` to start Claude Code
4. Use the kickoff prompt above
5. Validate Three.js cabinet rendering before adding AI/BYOK layer

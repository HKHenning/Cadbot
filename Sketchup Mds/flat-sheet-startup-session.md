# Flat Sheet Startup — Full Session Notes
## From SketchUp Extensions → Layered Acrylic Light Art

---

## Session Arc

Started exploring SketchUp extension monetization → pivoted to browser-based parametric design tool → discovered the layered acrylic illuminated shadow box product → defined the full technical architecture and business model.

---

## Key Decisions & Pivots

### 1. SketchUp Extensions — Ruled Out
- Market is oversaturated (CutList, Cabinet Sense, Cabinet Vision, Mozaik)
- Professional end deeply entrenched
- Better opportunity elsewhere

### 2. Browser-First Architecture
- Web app as the product, SketchUp as optional export
- Three.js for rendering, replicad for geometry
- BYOK (Bring Your Own Key) for Claude API — zero API cost to developer
- Generated `.rb` Ruby script as SketchUp export path — reuses CabinetLib work

### 3. The Product — Layered Acrylic Illuminated Shadow Box
Text prompt → AI-generated layered scene → laser cut acrylic → backlit wall art → shipped to door.

**Why this won:**
- Transparent acrylic can't be 3D printed — uncontested territory
- Bambu Lab validated demand with Shadowbox Maker + Lightbox Maker (both 2025) but neither does laser cut acrylic or text-to-scene generation
- Emotional gift purchase — highest willingness to pay
- Every piece unique by definition
- Visual/shareable — content strategy built in

---

## The Product

### Physical Description
- 6-10 laser-cut acrylic layers, each a depth plane of a generated scene
- Shadow box frame with integrated LED backlighting
- Materials: cast acrylic, frosted acrylic, dichroic (color-shifting), mixed opacity
- Result: glowing dimensional wall art resembling illuminated stained glass

### Material Options
- **Cast acrylic** — standard, clean laser cut edges
- **Frosted acrylic** — diffuses light, engraving reveals clear glowing areas
- **Dichroic acrylic** — color-shifts with viewing angle, premium tier
- **Mixed opacity per layer** — sky frosted, foreground clear, etc.

### Price Points
- Standard acrylic shadow box: $150-250
- Premium dichroic / mixed material: $300-500
- DIY file download: $25-50

### Unit Economics (rough)
| Item | Cost |
|---|---|
| Acrylic material, 6 layers | $15-25 |
| Laser cutting (Sendcutsend) | $20-40 |
| Frame + LED panel | $15-25 |
| Packaging + shipping | $15-20 |
| **Total COGS** | **~$65-110** |
| **Sell at $200** | **~45-55% gross margin** |

---

## The User Experience

```
1. User visits web app
2. Types scene: "a peaceful Japanese forest at dusk with Mt. Fuji"
3. Claude API interprets prompt → structured JSON (scene composition)
4. Recraft.ai generates SVG vector per depth plane
5. Three.js renders beautiful backlit preview — bloom, transparency, glow
6. User adjusts: colors per layer, number of layers, size, depth spacing, material
7. Add to cart → laser cut → assemble → ship
   OR: Download DXF/SVG to cut yourself
```

---

## Full Technical Architecture

### The Two-Engine Approach
```
Three.js          →    beautiful preview render
                       material/color selection
                       backlit glow simulation (bloom)
                       real-time parameter updates
                       lifestyle visualization

Replicad / SVG    →    actual cut file geometry
                       precise paths
                       DXF / SVG export
                       per-layer registration marks
```

### Full Pipeline
```
User text prompt
        ↓
Claude API (temperature: 0, BYOK)
outputs structured JSON only:
{
  "scene_type": "forest",
  "mood": "dusk",
  "layers": [
    { "plane": 1, "element": "sky", "color": "#1a1a3e", "opacity": 0.9 },
    { "plane": 2, "element": "mountains", "color": "#2d1b4e" },
    { "plane": 3, "element": "far_trees", "density": 0.6 },
    { "plane": 4, "element": "mid_trees", "density": 0.8 },
    { "plane": 5, "element": "foreground", "density": 1.0 }
  ]
}
        ↓
Recraft.ai API (native SVG vector output)
generates clean SVG path per layer
seed value stored for reproducibility
        ↓
Three.js renders backlit preview
MeshPhysicalMaterial: transmission, IOR, roughness
Bloom post-processing for glow effect
        ↓
User approves → order placed
        ↓
Sendcutsend API submits cut files
        ↓
Assembled + shipped
```

### Key Three.js Material Settings
```javascript
new THREE.MeshPhysicalMaterial({
  color: 0x2244aa,
  transmission: 0.9,    // light passes through
  thickness: 3,         // acrylic thickness mm
  roughness: 0.05,      // polished acrylic
  ior: 1.49,            // acrylic index of refraction
  transparent: true,
})
```
Plus bloom post-processing — the key effect that makes it glow.

---

## Technology Stack

| Component | Tool | Cost |
|---|---|---|
| 3D preview renderer | Three.js | Free (MIT) |
| CAD geometry / export | Replicad (OpenCascade.js) | Free |
| UI framework | React + Vite | Free |
| AI scene composition | Claude API (BYOK) | User's own key |
| Vector art generation | Recraft.ai API | Per call |
| Depth estimation (photo input) | Replicate (MiDaS/Depth Anything) | Per call |
| Image to 3D (photo input) | Replicate (TripoSG) | Per call |
| Laser cutting fulfillment | Sendcutsend API | Per order |
| Hosting | Netlify / Vercel | Free tier to start |
| Domain | — | ~$12/year |

---

## BYOK Pattern (Bring Your Own Key)

Zero API cost to developer. User supplies their Anthropic API key.

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
    temperature: 0,
    system: `[your encoded rules here]`,
    messages: [{ role: "user", content: userPrompt }]
  })
});
```

User sets spending limit in Anthropic console. Typical usage cost per generation: fractions of a cent.

---

## Consistency Architecture

The key insight: **LLMs are non-deterministic, but your output doesn't have to be.**

### Solution
- `temperature: 0` — most deterministic Claude output
- Tight system prompt — constrains output space severely
- JSON-only output — structured, validatable, parseable
- Image seed stored per order — Recraft.ai same seed = identical SVG
- Deterministic code executes the JSON — 100% repeatable geometry

### System Prompt Pattern
```
You are a layered shadow box composition engine.
Always output valid JSON only. No prose.
Always produce exactly 6 layers.
Layer 1 is always sky/background.
Layer 6 is always foreground detail.
Color values always in hex.
Scene types: forest, cityscape, mountain, ocean, desert.
If input doesn't match a scene type, default to forest.
```

### Order Reproducibility
Store with every order:
- Original text prompt
- Claude JSON output
- Recraft.ai seed per layer
- Material selections
- Size parameters

Any order can be reproduced exactly. Customer reorders = identical piece.

---

## The "Training" Approach (No Custom LLM Needed)

Training a custom LLM: $500K-$10M+, not viable.

**Instead:** Encode fabrication knowledge into the system prompt.

```
Now:     Claude API + strong system prompt
         = good enough, zero training cost

Later:   Fine-tune on order history (1000+ examples)
         = faster, cheaper, more consistent
         = only when product is proven

Never:   Train from scratch
         = wrong level of the stack
```

The system prompt (`scene_composition_rules.md`) is the compounding asset:
- Every failed output → new rule added
- Every successful order → validated pattern documented
- Competitors can't replicate without running the same gauntlet

Same principle as `sketchup_cabinet_rules.md` — discovered through iteration, not designed upfront.

---

## Market & Competition

### Competitive Landscape
| Product | Text-to-scene | Transparent/backlit | Laser cut | Fulfillment |
|---|---|---|---|---|
| **This product** | ✅ | ✅ | ✅ | ✅ |
| Etsy SVG files | ❌ | Rare | ❌ | ❌ |
| Bambu Shadowbox Maker | ❌ | ❌ | ❌ | ❌ |
| Bambu Lightbox Maker | ❌ | Partial | ❌ | ❌ |
| 3D printed art | ❌ | ❌ | ❌ | Partial |

**Key moat:** Layered transparent acrylic with backlighting cannot be 3D printed. Bambu Lab — the dominant player in AI shadow boxes — cannot enter this space with their hardware.

### Market Signals
- Bambu Lab launched two shadow box tools in 2025 — strong demand validation
- Etsy layered SVG art is a proven high-volume category
- Personalized gifts market: $31B globally
- Wall art e-commerce: $15B+ globally

### Primary Customer
Gift buyers. High emotional purchase, high willingness to pay, driven by uniqueness. "I described this and they made it" is a story people tell.

### Secondary Customers
- Interior designers (custom client pieces)
- Hospitality / retail (branded installations)
- Events / weddings (custom venue art)

---

## Go-To-Market

### Etsy Strategy
- List 3-5 designs as finished products immediately
- Manual fulfillment via Sendcutsend to start
- Etsy listing links to configurator web app
- Custom order flow: customer configures → references design code → purchases on Etsy
- Etsy handles payment trust, reviews, buyer protection for early orders

### Etsy API Integration (when volume justifies)
- `getOrders` endpoint — automatically receive new orders
- `createDraftListing` — programmatically manage listings
- Order details feed directly into SVG generation pipeline
- Sendcutsend API fulfills automatically
- Fully automated order-to-fulfillment at scale

### Market Research Tools (no scraping)
- **eRank** — Etsy-specific keyword volume, trending items, competitor analysis (~$10-30/month)
- **Marmalead** — similar
- Etsy API "Trending" endpoint — legitimate public data

### Content Acquisition Strategy
- YouTube / TikTok / Reels: "I typed a description and this shipped to my door"
- Time-lapse: laser cutting + assembly + lit final product
- Customer unboxings
- Before/after: text prompt → finished glowing piece on wall

No ad spend needed at launch — product demonstrates itself in 15 seconds of video.

---

## Development Approach

### Build in Claude Code (VS Code)
- Scaffold with Claude Code, not chat artifacts
- Drop all rules files into project folder as context
- Let Claude Code run dev server, install packages, iterate

### Kickoff Prompt for Claude Code
```
Build a parametric shadow box configurator using Vite + React + Three.js.

The app should:
- Accept a text prompt describing a scene
- Call Claude API (BYOK — key stored in localStorage) with temperature: 0
- Receive structured JSON describing 6 layers
- Render a beautiful backlit 3D preview using Three.js MeshPhysicalMaterial
  with transmission, IOR, and bloom post-processing
- Allow color/material adjustment per layer
- Export SVG/DXF per layer for laser cutting

Scene composition rules are in scene_composition_rules.md
Use this as the source of truth for all system prompt content.
```

### Files to Create Before Starting
- `scene_composition_rules.md` — validated layer composition rules (build iteratively)
- `replicad_rules.md` — validated replicad patterns (build iteratively)
- `cabinet-app-chat-summary.md` — previous session context

---

## Testing Priorities

**Stage 1 — Prompt Consistency**
Same input, 20 runs, temperature: 0. Document JSON variation. Tighten system prompt until rock solid.

**Stage 2 — SVG Quality**
Are Recraft.ai outputs laser-cuttable? Check for open paths, self-intersections, overly complex nodes. This is the biggest unknown — test earliest.

**Stage 3 — Layer Composition**
Does the scene look good as separated depth planes? Some scene types will be strong products, others won't. Discover which through testing.

**Stage 4 — Physical Output**
Cut the first real piece. Test material, kerf tolerance, layer spacing, light bleed between layers. Nothing replaces the actual object.

---

## MVP Definition

Minimum to take a first order:

1. Text prompt input + basic parameter controls
2. Claude API (BYOK) → JSON scene composition
3. Three.js backlit preview render
4. Manual SVG export → Sendcutsend → assemble → ship
5. Payment via Stripe or direct invoice
6. No automated fulfillment pipeline at MVP

**Success metric:** 10 paying customers at $150+ average order value.

---

## Questions for Deep Research (ChatGPT / Perplexity)

1. Realistic unit economics at Sendcutsend for 6-layer acrylic, 300x400mm?
2. Is anyone doing text-to-layered-acrylic with fulfillment quietly?
3. Customer acquisition cost for comparable personalized gift products?
4. IP considerations for AI-generated artwork sold as physical products?
5. Frame + LED sourcing at small batch quantities (50-500 units)?
6. Is Recraft.ai SVG output clean enough for laser cutting without manual cleanup?
7. Shipping and packaging requirements for fragile acrylic layers?
8. How does dichroic acrylic behave differently in laser cutting?
9. Etsy competitors in layered acrylic light art — price points and review volumes?
10. What scene types work best as depth-layered compositions?

---

## Reference Files
- `sketchup_cabinet_rules.md` — canonical cabinet geometry (transferable principles)
- `cabinet-app-chat-summary.md` — previous session: BYOK, Three.js, architecture decisions
- `layered-acrylic-business-idea.md` — business idea summary for vetting
- `scene_composition_rules.md` — TO BE BUILT through testing
- `replicad_rules.md` — TO BE BUILT through testing

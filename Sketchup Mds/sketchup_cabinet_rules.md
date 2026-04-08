# SketchUp Cabinetry Ruby Generation Rules
# Reference guide for generating cabinets via Ruby/MCP in SketchUp
# Validated through extensive testing — do not deviate from these rules

---

## CRITICAL RUBY RULES

- **Always use plain inches** — never use `.inch` or `.inches` methods. SketchUp stores everything internally in inches. `12` means 12 inches.
- **Never use pushpull** — always build boxes by explicitly defining all 6 faces. Pushpull direction is unreliable and causes geometry errors.
- **Always use `model.start_operation` / `model.commit_operation`** — wraps everything into one undo step.
- **Always run diagnostic after every build** — verify geometry before considering a build complete.
- **Use `[0,1,2].each` not `each_with_index` on lambdas** — avoids group hierarchy collapse when iterating cabinets.
- **Never use `p` as a variable name** — conflicts with Ruby's print method. Use `pt` for `Geom::Point3d`.

---

## STANDARD BOX HELPER

Every simple part is built using this exact helper. Never deviate from this pattern:

```ruby
make_box = lambda do |parent, x, y, z, w, d, h, name|
  grp      = parent.add_group
  grp.name = name
  g        = grp.entities
  x1,y1,z1 = x,   y,   z
  x2,y2,z2 = x+w, y+d, z+h
  g.add_face(Geom::Point3d.new(x1,y1,z1),Geom::Point3d.new(x1,y2,z1),Geom::Point3d.new(x2,y2,z1),Geom::Point3d.new(x2,y1,z1))
  g.add_face(Geom::Point3d.new(x1,y1,z2),Geom::Point3d.new(x2,y1,z2),Geom::Point3d.new(x2,y2,z2),Geom::Point3d.new(x1,y2,z2))
  g.add_face(Geom::Point3d.new(x1,y1,z1),Geom::Point3d.new(x2,y1,z1),Geom::Point3d.new(x2,y1,z2),Geom::Point3d.new(x1,y1,z2))
  g.add_face(Geom::Point3d.new(x1,y2,z1),Geom::Point3d.new(x1,y2,z2),Geom::Point3d.new(x2,y2,z2),Geom::Point3d.new(x2,y2,z1))
  g.add_face(Geom::Point3d.new(x1,y1,z1),Geom::Point3d.new(x1,y1,z2),Geom::Point3d.new(x1,y2,z2),Geom::Point3d.new(x1,y2,z1))
  g.add_face(Geom::Point3d.new(x2,y1,z1),Geom::Point3d.new(x2,y2,z1),Geom::Point3d.new(x2,y2,z2),Geom::Point3d.new(x2,y1,z2))
  grp
end
```

Parameters: `x, y, z` = front-left-bottom corner. `w` = width (X), `d` = depth (Y), `h` = height (Z).

---

## COORDINATE SYSTEM

- **X axis** = left to right (cabinet width)
- **Y axis** = front to back (cabinet depth). Y=0 is the front face of the cabinet.
- **Z axis** = up (cabinet height). Z=0 is the floor.

---

## STANDARD DIMENSIONS

| Setting | Value |
|---|---|
| Material thickness `mat` | 0.75" |
| Cabinet height (carcass) | 34.5" |
| Cabinet depth | 24" |
| Toe kick height `tk_height` | 4.0" |
| Toe kick setback `tk_setback` | 3.0" |
| Nailer depth `nailer_depth` | 3.0" |
| Shelf setback from front `shelf_setback` | 0.25" |
| End panel forward extension | 0.75" |
| Countertop thickness | 1.5" |
| Countertop overhang front/sides | 0.25" |

**Total height note:** `total_height = cab_h + ct_thick`. If total height = 36", then `cab_h = 34.5"`.

---

## CABINET CONSTRUCTION RULES

### Side Panels
- Start at `Z = tk_height` (NOT the floor) — flush with the bottom panel
- Full depth: `Y = 0` to `Y = cabinet_depth`
- Height: `cabinet_height - tk_height`

### Bottom Panel
- Sits between side panels (interior width)
- `Z = tk_height`, thickness = `mat`
- Depth: `Y = 0` to `Y = cabinet_depth - mat` (stops before back panel)

### Back Panel
- Sits between side panels (interior width)
- `Y = cabinet_depth - mat` to `Y = cabinet_depth`
- `Z = tk_height` to `Z = cabinet_height - mat`

### Top Nailers (front and back)
- Front nailer: `Y = 0` to `Y = nailer_depth`
- Back nailer: `Y = cabinet_depth - nailer_depth` to `Y = cabinet_depth`
- Both at `Z = cabinet_height - mat`
- Width: interior width (between side panels)

### Shelves
- Same width and depth as bottom panel
- Set back `shelf_setback = 0.25"` from front: `Y = shelf_setback`
- Spaced equally in the interior height space
- Interior height = `cabinet_height - mat - (tk_height + mat)`
- Shelf Z = `tk_height + mat + (section_h * (s + 1)) - (mat / 2.0)`

---

## END PANELS

- **Top-level entities — never inside cabinet groups**
- Full height to floor: `Z = 0` to `Z = cabinet_height`
- Full depth PLUS forward extension: `Y = -0.75` to `Y = cabinet_depth`
- Left end panel: `X = -mat` to `X = 0`
- Right end panel: `X = total_cab_width` to `X = total_cab_width + mat`
- Depth follows the **deepest cabinet** in the run

---

## TOE KICK

- **Top-level entity — never inside cabinet groups**
- **Single piece spanning the entire run** — never per-cabinet
- `X = 0` to `X = total_cab_width` (between end panels only)
- `Y = tk_setback` to `Y = tk_setback + mat`
- `Z = 0` to `Z = tk_height`

---

## COUNTERTOP

- **Top-level entity — never inside cabinet groups**
- Sits on top of cabinets at `Z = cabinet_height`
- Overhangs `0.25"` on front and sides
- **NO back overhang when cabinets are against a wall** — back edge flush at `Y = 0`
- Front face at `Y = -0.75 - 0.25 = -1.0` (end panel extension + overhang)
- Width: `total_width + (2 * overhang)`
- Depth (freestanding): `cabinet_depth + end_panel_ext + (2 * overhang)`
- Depth (wall-mounted): `cabinet_depth + end_panel_ext + overhang` (front overhang only)
- Depth (mixed run): use deepest cabinet depth
- Thickness: `1.5"`

---

## FULL OVERLAY DOOR RULES

### Key principle
Full overlay means doors cover the side panels. The ONLY gap visible is between adjacent doors and between doors and end panels. That gap is **1/8" (0.125") on ALL sides** — top, bottom, left, right, including next to end panels.

### Door position (Y axis)
- Front face: `Y = -door_thick` = `-0.75`
- Back face: `Y = 0` (flush with cabinet front face)

### Door width calculation
Every door gets `gap/2` pulled in from both sides:
```ruby
door_gap   = 0.125
door_x     = offset_x + (door_gap / 2.0)
door_right = offset_x + width - (door_gap / 2.0)
door_w     = door_right - door_x
```
This applies to ALL doors including the outermost ones next to end panels.

### Door height calculation
```ruby
door_reveal_tb = 0.125
door_z = tk_height + door_reveal_tb
door_h = cabinet_height - tk_height - (2 * door_reveal_tb)
```

### Door thickness
- `0.75"` (same as material thickness)

---

## FLOATING VANITY VARIANT

- No toe kick, no shelves
- `cab_bottom_z = 36 - ct_thick - cab_height` (top of countertop = 36")
- Cabinet run centered on wall: `center_offset_x = (wall_width - total_width) / 2.0`
- Cabinets hang forward from wall face: `Y = -cab_depth..0`
- Back panel flush to wall face at `Y = 0`
- Countertop back edge flush at `Y = 0` — no back overhang
- ⚠️ Always flag potential geometry intersections (e.g. CT back overhang into wall) before building

---

## DADO GEOMETRY RULES

Dados are cuts into a single solid piece — never model as multiple stacked boxes.

### Key principles
- Build the entire panel as a **single solid mesh** — one group, all faces, no sub-groups
- Use **profile end faces** (8-vertex notched faces) to close the ends cleanly
- **Dado walls span interior face to dado floor only** — never extend to the exterior face
- Always verify with `edge.faces.length == 2` for every edge — any edge with 1 or 3 faces indicates a geometry error

### Dado face normal rules (validated)
| Face | Correct normal |
|---|---|
| Left side dado floor (X=interior-dd) | `+X` (toward interior) |
| Right side dado floor (X=interior+dd) | `-X` (toward interior) |
| Front dado floor (Y=mat-dd) | `+Y` (toward interior) |
| Dado bottom wall (Z=dado_z) | `+Z` (faces up into slot) |
| Dado top wall (Z=dado_z+dado_w) | `-Z` (faces down into slot) |

### Post-build normal fix (always run after building dado parts)
SketchUp unpredictably flips face normals regardless of winding order. Always run this fix:

```ruby
part.entities.select{|e| e.is_a?(Sketchup::Face)}.each do |face|
  c = face.bounds.center; n = face.normal
  case part.name
  when "Side - Left"
    face.reverse! if (c.x - dado_floor_x).abs < 0.01 && n.x < 0   # dado floor → +X
    face.reverse! if (c.z - dado_z).abs < 0.01 && c.x > 0.01 && n.z < 0    # btm wall → +Z
    face.reverse! if (c.z - dado_z2).abs < 0.01 && c.x > 0.01 && n.z > 0   # top wall → -Z
  when "Side - Right"
    face.reverse! if (c.x - dado_floor_x).abs < 0.01 && n.x > 0   # dado floor → -X
    face.reverse! if (c.z - dado_z).abs < 0.01 && c.x > interior_x && n.z < 0
    face.reverse! if (c.z - dado_z2).abs < 0.01 && c.x > interior_x && n.z > 0
  when "Front"
    face.reverse! if (c.y - dado_floor_y).abs < 0.01 && c.z.between?(dado_z-0.01, dado_z2+0.01) && n.y < 0
    face.reverse! if (c.z - dado_z).abs < 0.01 && c.y > 0.01 && n.z < 0
    face.reverse! if (c.z - dado_z2).abs < 0.01 && c.y > 0.01 && n.z > 0
  end
end
```

---

## DRAWER BOX RULES

### Construction
- **Sides** run full depth (Y axis, front to back)
- **Front and back** sit between the sides
- **Front and both sides** have a 1/4" dado, 1/4" deep, starting 1/2" from bottom
- **Back** has no dado — sits on top of the bottom panel
- **Bottom** is 1/4" thick, slides into all three dados (front and both sides)
- All box parts (sides, front, back): `mat = 0.75"`

### Dado dimensions
| Setting | Value |
|---|---|
| Dado width | 0.25" (= bottom thickness) |
| Dado depth | 0.25" |
| Dado start from bottom | 0.5" |

### Part dimensions (box_w × box_h × box_d)
- Sides: `0.75W × box_d D × box_h H`
- Front / Back: `(box_w - 2×mat) W × 0.75D × box_h H`
- Back height: `box_h - dado_z - dado_w`
- Bottom: extends 0.25" into each dado on front and both sides

### Bottom extents
```ruby
bot_x0 = mat - dado_dep          # 0.5"
bot_x1 = box_w - mat + dado_dep  # box_w - 0.5"
bot_y0 = mat - dado_dep          # 0.5" (into front dado)
bot_y1 = box_d - mat             # back inner face (back sits on top)
```

### Group hierarchy
```
Drawer Box
  Side - Left
  Side - Right
  Front
  Back
  Bottom
  Drawer Face
```

### Drawer face rule
- The drawer face is an **independent design decision** — not derived from the box dimensions
- Must cover the drawer box assembly by a **minimum of 1/16" on all sides**
- For full overlay cabinets, face sizing follows door gap rules (1/8" gap all around)

---

## UNDERMOUNT DRAWER SLIDE RULES

### Slide sizes
Available depths: `[9, 12, 15, 18, 21]` inches. Always select the **longest slide that fits**:
```ruby
slide_sizes   = [9, 12, 15, 18, 21]
max_box_d     = cab_depth - mat - rear_clearance
slide_depth   = slide_sizes.select { |s| s <= max_box_d }.max.to_f
```

### Clearances
| Setting | Value |
|---|---|
| Side clearance (each side) | 3/16" |
| Rear clearance (minimum) | 3/4" |
| Undermount clearance (below box) | 9/16" |
| Minimum gap above box before nailer | 1/2" |
| Minimum clearance top drawer to top nailer | 1/2" |

### Box sizing
```ruby
side_clearance   = 3.0/16.0
undermount_clear = 9.0/16.0
box_w = interior_w - (2 * side_clearance)
box_d = slide_depth
box_x = offset_x + mat + side_clearance
box_z = tk_height + mat + undermount_clear   # first drawer Z
```

### Front position
- Drawer box front face is **flush with the carcass front face** at `Y = 0`

---

## DRAWER SIZING & STACKING RULES

### Dimension snapping
All drawer dimensions snap to **1/16" increments**. Never use decimal values finer than 1/16".
```ruby
sixteenth = 1.0/16.0
box_h = (raw_box_h / sixteenth).floor * sixteenth   # always round DOWN
```

### Auto-sizing formula
For N equal drawers filling available interior height:
```
N × undermount_clear + N × box_h + (N-1) × (min_gap + mat) + top_clear = interior_h
```
Solve for `box_h`, floor to 1/16". Remainder goes **above the top drawer**.

```ruby
interior_h     = cab_h - mat - (tk_height + mat)
stack_overhead = (N * undermount_clear) + ((N-1) * (min_gap + mat)) + top_clear
available      = interior_h - stack_overhead
raw_box_h      = available / N.to_f
box_h          = (raw_box_h / sixteenth).floor * sixteenth
remainder      = interior_h - stack_overhead - (N * box_h)   # added to top clearance
```

### Stacking Z positions
```ruby
# First drawer — no nailer below, sits above bottom panel
box1_z = tk_height + mat + undermount_clear

# Each subsequent drawer
nailer_z   = prev_box_top + min_gap           # 1/2" above prev box top
next_box_z = nailer_z + mat + undermount_clear
```

### Nailer rules
- **No nailer below the first drawer** — it sits directly above the bottom panel
- **One nailer between each pair of drawers**
- Nailer bottom = `prev_box_top + 0.5"` (min gap)
- Nailer is same size as top front nailer: `interior_w × nailer_depth × mat`
- Nailer **must use the cabinet's own `offset_x`** for X positioning — not hardcoded `mat`

### Minimum drawer height
- `min_box_h = 1.5"`

### Fraction helper
```ruby
to_frac = lambda do |val|
  whole = val.floor
  frac  = ((val - whole) / sixteenth).round
  frac > 0 ? "#{whole}-#{frac}/16\"" : "#{whole}\""
end
```

---

## GROUP HIERARCHY

```
[Top Level]
  Cabinet 1 - 24"
    Carcass
      Side Panel - Left
      Side Panel - Right
      Panel - Bottom
      Panel - Back
      Nailer - Top Front
      Nailer - Top Back
    Drawer Box 1 - 21" Slide
      Side - Left
      Side - Right
      Front
      Back
      Bottom
    Nailer - Between 1 & 2
    Drawer Box 2 - 21" Slide
      ...
  Cabinet 2 - 18"
    ... (same structure)
  Toe Kick              ← TOP LEVEL
  End Panel - Left      ← TOP LEVEL
  End Panel - Right     ← TOP LEVEL
  Countertop            ← TOP LEVEL
```

---

## VARIABLE WIDTH RUNS

Cabinet widths are always passed as an array:
```ruby
cabinet_widths = [16, 18, 24, 30, 24]
```

Iterate with `offset_x` tracking position:
```ruby
offset_x = 0
cabinet_widths.each_with_index do |width, i|
  # draw cabinet at offset_x
  offset_x += width
end
total_cab_width = offset_x
total_width = total_cab_width + (2 * mat)
```

---

## DIAGNOSTIC SCRIPT

```ruby
model = Sketchup.active_model
output = []

def analyze_entity(entity, output, indent = 0)
  prefix = "  " * indent
  b = entity.bounds
  min = b.min; max = b.max
  dims = { x: (max.x-min.x).round(4), y: (max.y-min.y).round(4), z: (max.z-min.z).round(4) }
  thinnest = dims.min_by { |k, v| v }
  name = entity.name.empty? ? "(unnamed)" : entity.name
  output << "#{prefix}GROUP: #{name}"
  output << "#{prefix}  FLB: (#{min.x.round(3)}, #{min.y.round(3)}, #{min.z.round(3)})  BRT: (#{max.x.round(3)}, #{max.y.round(3)}, #{max.z.round(3)})"
  output << "#{prefix}  Dims: #{dims[:x]}W x #{dims[:y]}D x #{dims[:z]}H  |  Thin axis: #{thinnest[0].upcase}=#{thinnest[1]}\""
  entity.entities.select { |e| e.is_a?(Sketchup::Group) }.each { |c| analyze_entity(c, output, indent+1) }
end

top_level = model.active_entities.select { |e| e.is_a?(Sketchup::Group) }
output << "Top-level groups: #{top_level.length}"
top_level.each { |g| analyze_entity(g, output) }
output.join("\n")
```

### Extended diagnostic (face normals + bad edges)
```ruby
def inspect_group(grp, output, indent=0)
  prefix = "  " * indent
  faces = grp.entities.select { |e| e.is_a?(Sketchup::Face) }
  edges = grp.entities.select { |e| e.is_a?(Sketchup::Edge) }
  bad   = edges.select { |e| e.faces.length != 2 }
  b     = grp.bounds
  output << "#{prefix}GROUP: #{grp.name}  faces=#{faces.length}  edges=#{edges.length}  bad_edges=#{bad.length}"
  output << "#{prefix}  FLB: (#{b.min.x.round(3)}, #{b.min.y.round(3)}, #{b.min.z.round(3)})  BRT: (#{b.max.x.round(3)}, #{b.max.y.round(3)}, #{b.max.z.round(3)})"
  faces.each_with_index do |face, i|
    n = face.normal
    output << "#{prefix}  Face #{i+1}: normal=(#{n.x.round(3)}, #{n.y.round(3)}, #{n.z.round(3)})  verts=#{face.vertices.length}"
  end
  grp.entities.select { |e| e.is_a?(Sketchup::Group) }.each { |c| inspect_group(c, output, indent+1) }
end
```

---

## GLOSSARY

### Toe Kick / Base
The solid low block at the bottom of a furniture piece that sits on the floor. What architecture calls a "plinth", we call a "toe kick" (in cabinets) or a "base" (in freestanding furniture). Same geometry — a solid rectangular box, full width and depth of the element above it, no interior.

### Plinth / Pedestal
Interchangeable in our context. A solid supporting mass that elevates an object or structure above it. Taller and more substantial than a base/toe kick. In furniture, the leg assembly of the console table is a pedestal/plinth. Dictionary definition: "a heavy base supporting a statue or vase."

### Carcass
The structural box body of a cabinet — everything except doors, drawers, and hardware.

### Dado
A U-shaped slot cut across the grain of a panel, with three sides (two walls and a floor). Used to receive shelves, drawer bottoms, and other mating panels. In our system: 1/4" wide × 1/4" deep, starting 1/2" from the bottom of drawer box sides and front.

### Interior Height
`interior_h = cab_h - mat - (tk_height + mat)` — usable vertical space from top of bottom panel to bottom of top nailer.

### Top Nailer Z
`top_nailer_z = cab_h - mat` — Z position of the bottom face of the top front nailer.

---

## COMMON MISTAKES TO AVOID

1. **Using `.inch` or `.inches`** — causes NoMethodError in some SketchUp versions
2. **Using pushpull** — unreliable face normal direction
3. **Side panels starting at Z=0** — must start at `tk_height`
4. **Toe kick overlapping end panels** — runs `X=0` to `X=total_cab_width` only
5. **Toe kick inside cabinet group** — must be a top-level entity spanning the full run
6. **End panels inside cabinet groups** — must be top-level entities
7. **Countertop inside cabinet group** — must be a top-level entity
8. **End panels not extending forward** — must extend `0.75"` forward to `Y=-0.75`
9. **Door width using full interior width** — doors must have `gap/2` pulled in on both sides
10. **Doors not grouped** — always wrap in a named group
11. **Back panel starting at tk_height + mat** — starts at `tk_height`, not above bottom panel
12. **Countertop back overhang into wall** — flag and eliminate when wall-mounted
13. **Dado walls extending to exterior face** — span interior face to dado floor only
14. **Multiple boxes for a dado panel** — must be single solid meshes
15. **Trusting winding order for dado normals** — always run post-build `reverse!` fix
16. **Drawer bottom not extending into dados** — must extend 0.25" into all three dados
17. **Nailer X offset using `mat` instead of `offset_x + mat`** — always use cabinet's own X offset
18. **Using `p` as variable name** — conflicts with Ruby kernel; use `pt` for Point3d
19. **Drawer box_h not snapped to 1/16"** — always floor to nearest sixteenth
20. **Forgetting top_clear in drawer sizing formula** — must reserve min 1/2" above top drawer

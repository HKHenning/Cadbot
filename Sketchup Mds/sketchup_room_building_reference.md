# SketchUp 3D Room Building Reference
## Ruby via MCP — Consolidated Context for Claude Web

---

## CRITICAL RUBY RULES (apply to all SketchUp Ruby work)

- **Always use plain inches** — never `.inch` or `.inches`. SketchUp stores internally in inches. `12` = 12 inches.
- **Never use pushpull** — always build boxes by explicitly defining all 6 faces.
- **Always use `model.start_operation` / `model.commit_operation`**
- **Always run a diagnostic after every build**
- **Use `[0,1,2].each` not `each_with_index` on lambdas** — avoids group hierarchy collapse
- **Never use `p` as a variable name** — conflicts with Ruby's print method. Use `pt` for `Geom::Point3d`.

---

## COORDINATE SYSTEM

- **X axis** = left to right (room width)
- **Y axis** = front to back (room depth). Y=0 is the front face.
- **Z axis** = up. Z=0 is the floor.

---

## STANDARD ROOM DIMENSIONS

| Setting | Value |
|---|---|
| Wall thickness `t` | 5" |
| Ceiling height `wh` | 96" (8') |
| Door width `dw` | 36" |
| Door height `dh` | 80" (6'8") |
| Window width | 36" |
| Window height | 48" |
| Window sill height | 36" |
| Floor thickness | 1" |

---

## WALL LAYOUT — CORNER OWNERSHIP RULE

Side walls own all four corners. Front/back walls fit between side walls.

```
Side walls:  X=0 to X=t (left),  X=rw-t to X=rw (right)  — full Y: 0 to rd
Front wall:  Y=0 to Y=t          — X: t to rw-t
Back wall:   Y=rd-t to Y=rd      — X: t to rw-t
```

**Why:** Adjacent wall segments sharing corner edges create unwanted visible lines.

---

## CORE RULE: ONE POLYGON PER FACE PLANE

Every flat face of a wall must be a single `add_face` polygon — no subdivisions, no hidden edges, no seam edges.

**Why:** Multiple coplanar rectangles joined together leave seam edges that SketchUp cannot cleanly hide.

---

## WINDING HELPERS (verified, reusable)

```ruby
p3  = lambda { |x,y,z| Geom::Point3d.new(x,y,z) }

# YZ-plane: pn=true → +X normal, false → -X
fyz = lambda do |e,x,y1,z1,y2,z2,pn|
  pts = pn ?
    [p3.call(x,y1,z1),p3.call(x,y2,z1),p3.call(x,y2,z2),p3.call(x,y1,z2)] :
    [p3.call(x,y1,z1),p3.call(x,y1,z2),p3.call(x,y2,z2),p3.call(x,y2,z1)]
  e.add_face(pts) rescue nil
end

# XZ-plane: pn=true → +Y, false → -Y
fxz = lambda do |e,y,x1,z1,x2,z2,pn|
  pts = pn ?
    [p3.call(x1,y,z1),p3.call(x1,y,z2),p3.call(x2,y,z2),p3.call(x2,y,z1)] :
    [p3.call(x1,y,z1),p3.call(x2,y,z1),p3.call(x2,y,z2),p3.call(x1,y,z2)]
  e.add_face(pts) rescue nil
end

# XY-plane: pn=true → +Z, false → -Z
fxy = lambda do |e,z,x1,y1,x2,y2,pn|
  pts = pn ?
    [p3.call(x1,y1,z),p3.call(x2,y1,z),p3.call(x2,y2,z),p3.call(x1,y2,z)] :
    [p3.call(x1,y1,z),p3.call(x1,y2,z),p3.call(x2,y2,z),p3.call(x2,y1,z)]
  e.add_face(pts) rescue nil
end
```

---

## DOOR WALL — U-SHAPED 8-VERTEX POLYGON

A wall with a door (opening touches floor) uses a single 8-vertex U-shaped polygon for the front and back face planes.

### Outer face (Y=0, -Y normal):
```ruby
e.add_face(
  p3.call(xi1, 0, 0),    # left end, outer
  p3.call(dx1, 0, 0),    # door jamb left at floor
  p3.call(dx1, 0, dh),   # door head left
  p3.call(dx2, 0, dh),   # door head right
  p3.call(dx2, 0, 0),    # door jamb right at floor
  p3.call(xi2, 0, 0),    # right end, outer
  p3.call(xi2, 0, wh),   # top right
  p3.call(xi1, 0, wh)    # top left
)
# Cross-product verify: (B-A)×(C-A) → -Y ✓
```

### Inner face (Y=t, +Y normal) — reverse the U:
```ruby
e.add_face(
  p3.call(xi1, t, 0),
  p3.call(xi1, t, wh),
  p3.call(xi2, t, wh),
  p3.call(xi2, t, 0),
  p3.call(dx2, t, 0),
  p3.call(dx2, t, dh),
  p3.call(dx1, t, dh),
  p3.call(dx1, t, 0)
)
```

### Other faces of a door wall (with verified winding):
- **Top face** (Z=wh, +Z): `(xi1,0,wh)→(xi2,0,wh)→(xi2,t,wh)→(xi1,t,wh)`
- **Left end cap** (X=xi1, -X): `(xi1,0,0)→(xi1,0,wh)→(xi1,t,wh)→(xi1,t,0)`
- **Right end cap** (X=xi2, +X): `(xi2,0,0)→(xi2,t,0)→(xi2,t,wh)→(xi2,0,wh)`
- **Door header soffit** (Z=dh, -Z): `(dx1,0,dh)→(dx1,t,dh)→(dx2,t,dh)→(dx2,0,dh)`
- **Door left jamb** (X=dx1, +X): `(dx1,0,0)→(dx1,t,0)→(dx1,t,dh)→(dx1,0,dh)`
- **Door right jamb** (X=dx2, -X): `(dx2,0,0)→(dx2,0,dh)→(dx2,t,dh)→(dx2,t,0)`
- **Bottom faces** (Z=0, -Z): left `(xi1,0,0)→(xi1,t,0)→(dx1,t,0)→(dx1,0,0)`, right similar

### Diagnostic targets for a door wall:
```
Faces: 10, Edges: 24, Hidden edges: 0, Boundary edges: 0
F_outer: n=(0,-1,0), 8 edges, area=(ww*wh)-(dw*dh)
F_inner: n=(0,+1,0), 8 edges, area=(ww*wh)-(dw*dh)
0 boundary edges = fully closed solid (every edge shared by exactly 2 faces)
```

---

## WINDOW WALL — INNER-LOOP TECHNIQUE

Create a clean hole in a face using SketchUp's automatic inner loop:

```ruby
# 1. Create full wall rectangle
outer = ents.add_face(p3.call(x,y0,0), p3.call(x,y1,0), p3.call(x,y1,wh), p3.call(x,y0,wh))

# 2. Add window rectangle on same plane — SketchUp auto-splits into frame + hole
inner = ents.add_face(p3.call(x,wy1,ws), p3.call(x,wy2,ws), p3.call(x,wy2,wh_top), p3.call(x,wy1,wh_top))

# 3. Delete the smaller (inner) face, leaving frame with hole
coplanar = ents.grep(Sketchup::Face).select { |f|
  f.normal.parallel?(inner.normal) && f.vertices.any? { |v| inner.vertices.include?(v) }
}
smallest = coplanar.min_by { |f| f.area }
ents.erase_entities(smallest) if smallest
```

Result: 1 face, 8 edges, 2 loops (outer + inner). No extra lines.

---

## WINDOW REVEALS — MUST BE IN SEPARATE SUB-GROUP

Reveal faces (sill, head, jambs) share vertices with outer/inner wall faces. If in the same group, their edges show as visible lines on the wall face.

**Fix:** Put body faces and reveal faces in separate sub-groups within the wall group.

```
Wall-Left
  Wall-Left-Body      ← outer face, inner face, top, bottom, end caps
  Wall-Left-Reveals   ← sill, head, left jamb, right jamb
```

---

## FLOOR SLAB

1" thick slab, entirely inside its own group. **Never create floor geometry at the top level** — leaves orphan edges at Z=0 that show as lines around the room perimeter.

```ruby
floor_grp = model.active_entities.add_group
floor_grp.name = "Floor"
fe = floor_grp.entities
# Top face at Z=0, bottom face at Z=-1, plus 4 side faces
# ALL inside the group — no top-level add_face calls
```

---

## NORMALS — APPLY MATERIAL TO BOTH SIDES

```ruby
wm = model.materials["Wall"] || model.materials.add("Wall")
wm.color = Sketchup::Color.new(160, 160, 160)

face.material = wm
face.back_material = wm
```

**Why:** Interior faces show blue (back face) without `back_material`. Applying to both sides eliminates blue faces from any viewing angle.

---

## GROUP HIERARCHY

```
[Top Level]
  Wall-Front               ← door wall if front has door
  Wall-Back
  Wall-Left
    Wall-Left-Body
    Wall-Left-Reveals
  Wall-Right
    Wall-Right-Body
    Wall-Right-Reveals
  Floor
```

---

## CAMERA — 3D PERSPECTIVE VIEW

```ruby
eye    = Geom::Point3d.new(27.011, -33.083, 16.354)
target = Geom::Point3d.new(6, 6, 6)
up     = Geom::Vector3d.new(-0.0994349, 0.218207, 0.970824)
camera = Sketchup::Camera.new(eye, target, up)
camera.perspective = true
camera.fov = 35.0
Sketchup.active_model.active_view.camera = camera
```

Scale eye/target proportionally for much larger or smaller models.

## CAMERA — PLAN VIEW (top-down orthographic)

```ruby
eye    = Geom::Point3d.new(rw/2, rd/2, 200)
target = Geom::Point3d.new(rw/2, rd/2, 0)
up     = Geom::Vector3d.new(0, 1, 0)
cam = Sketchup::Camera.new(eye, target, up)
cam.perspective = false
view.camera = cam
view.zoom_extents
```

---

## IMAGE EXPORT

```ruby
require 'fileutils'
folder = "C:\\Users\\HKris\\Sketchup+Claude\\Images"
FileUtils.mkdir_p(folder)
Sketchup.active_model.active_view.write_image("#{folder}\\output.png", 2400, 2400, false, 1.0)
```

---

## 2D FLOOR PLAN

Walls are solid filled `add_face` rectangles with material applied — not outlines with `add_line`.

### Window symbols (3 parallel lines along wall face):
```ruby
# Vertical wall (left/right side)
add_window_v = lambda do |ents, x0, x1, y_open0, y_open1|
  mid = (x0 + x1) / 2.0
  [x0, mid, x1].each { |x| ents.add_line(Geom::Point3d.new(x, y_open0, 0), Geom::Point3d.new(x, y_open1, 0)) }
end

# Horizontal wall (front/back)
add_window_h = lambda do |ents, y0, y1, x_open0, x_open1|
  mid = (y0 + y1) / 2.0
  [y0, mid, y1].each { |y| ents.add_line(Geom::Point3d.new(x_open0, y, 0), Geom::Point3d.new(x_open1, y, 0)) }
end
```

### Door swing (panel line + quarter-circle arc):
```ruby
hinge = Geom::Point3d.new(dx1, t, 0)
latch = Geom::Point3d.new(dx1, t + dw, 0)
e.add_line(hinge, latch)
arc_pts = []
(0..30).each do |i|
  angle = Math::PI / 2.0 * (i.to_f / 30.0)
  x = dx1 + dw * Math.sin(angle)
  y = t + dw * Math.cos(angle)
  arc_pts << Geom::Point3d.new(x, y, 0)
end
e.add_curve(*arc_pts)
```

---

## ROOM COORDINATE EXAMPLE (120" × 144" room with partition)

```ruby
rw=120, rd=144, t=5
enc=48          # partition setback from corner
xi1=t, xi2=rw-t, yi1=t, yi2=rd-t
lp_r = xi2-enc  # = 67  inner face of left partition
lp_l = lp_r-t   # = 62  outer face of left partition
bp_t = yi2-enc  # = 91  inner face of back partition
bp_b = bp_t-t   # = 86
```

---

## COMMON MISTAKES TO AVOID

1. Using `.inch` / `.inches` — NoMethodError in some SketchUp versions
2. Creating floor face at top level — leaves orphan edges at Z=0
3. Putting reveals in same group as wall body — edges show through on wall faces
4. Only applying material to front face — interior shows blue
5. Walls sharing corner edges — use corner ownership rule
6. Using 4 separate panels for a window wall — creates visible seam edges between panels
7. Using `p` as variable name — use `pt`
8. Forgetting `model.start_operation` / `model.commit_operation`

---

## DIAGNOSTIC TEMPLATE

Run after every build:

```ruby
model = Sketchup.active_model
ents  = model.active_entities

total_faces  = ents.grep(Sketchup::Face).length
total_edges  = ents.grep(Sketchup::Edge).length
hidden_edges = ents.grep(Sketchup::Edge).count { |e| e.hidden? }
boundary     = ents.grep(Sketchup::Edge).count { |e| e.faces.length == 1 }

puts "Faces: #{total_faces}"
puts "Edges: #{total_edges}"
puts "Hidden: #{hidden_edges}"
puts "Boundary (open): #{boundary}"

ents.grep(Sketchup::Face).each do |f|
  n = f.normal
  puts "  Face normal=(#{n.x.round(2)},#{n.y.round(2)},#{n.z.round(2)}) edges=#{f.edges.length} area=#{f.area.round(2)}"
end
```

Target: **0 boundary edges** (fully closed solid, every edge shared by exactly 2 faces).

# SketchUp Ruby API — Full Tool Reference
# Pulled directly from live SketchUp 2026 instance
# Organized by category with usage notes

---

## 1. ENTITIES — Geometry Creation
`Sketchup.active_model.active_entities` — the main container for all geometry

### Drawing Primitives
| Method | What it does | Returns |
|---|---|---|
| `add_line(pt1, pt2)` | Single straight edge | Edge |
| `add_edges(*pts)` | Multiple connected edges from point array | [Edge] |
| `add_face(*pts)` | Polygon face from 3+ coplanar points | Face |
| `add_circle(center, normal, radius, segments)` | Circle as edge loop | [Edge] |
| `add_arc(center, xaxis, normal, radius, start_angle, end_angle, segments)` | Arc as edge loop | [Edge] |
| `add_ngon(center, normal, radius, sides)` | Regular polygon | [Edge] |
| `add_curve(pts)` | Smooth curve through points | [Edge] |
| `add_cline(pt1, pt2)` | Construction line (guide) | ConstructionLine |
| `add_cpoint(pt)` | Construction point (guide) | ConstructionPoint |

### 3D Operations
| Method | What it does | Returns |
|---|---|---|
| `add_faces_from_mesh(mesh, smooth, material)` | Build faces from PolygonMesh | [Face] |
| `fill_from_mesh(mesh, smooth, material)` | Fill existing edges from mesh | [Face] |
| `add_3d_text(text, align, font, bold, italic, height, tolerance, z, filled, extrusion)` | 3D extruded text | Group |
| `intersect_with(recurse, transform, ents, transform2, hidden, entities)` | Boolean intersection lines | nil |
| `build { |builder| }` | New geometry builder API | nil |
| `weld(edges)` | Weld edges into a curve | Curve |

### Groups & Components
| Method | What it does | Returns |
|---|---|---|
| `add_group(*entities)` | Create group (optionally from existing entities) | Group |
| `add_instance(definition, transform)` | Place a component instance | ComponentInstance |
| `add_section_plane(plane)` | Add section cut plane | SectionPlane |

### Annotations
| Method | What it does | Returns |
|---|---|---|
| `add_text(text, point, vector)` | Screen text annotation | Text |
| `add_dimension_linear(start, end, offset)` | Linear dimension | DimensionLinear |
| `add_dimension_radial(arc_edge, offset)` | Radial dimension | DimensionRadial |
| `add_image(path, origin, width, height)` | Image entity | Image |

### Transforms & Utilities
| Method | What it does |
|---|---|
| `transform_entities(transform, entities)` | Move/rotate/scale entities in place |
| `transform_by_vectors(entities, vectors)` | Move each entity by its own vector |
| `erase_entities(entities)` | Delete entities |
| `clear!` | Delete all entities |

---

## 2. FACE — Surface Operations

| Method | What it does |
|---|---|
| `followme(edges)` | ⭐ Extrude face profile along edge path — makes cylinders, pipes, moldings |
| `pushpull(distance, copy=false)` | ⭐ Extrude face perpendicular to itself |
| `reverse!` | Flip face normal |
| `normal` | Returns face normal as Vector3d |
| `area` | Face area in square inches |
| `vertices` | Array of Vertex objects |
| `edges` | Array of bounding edges |
| `loops` | Outer loop + any holes |
| `outer_loop` | The outer boundary loop |
| `plane` | The plane equation [a,b,c,d] |
| `material=` / `back_material=` | Assign material to front/back |
| `mesh` | Returns PolygonMesh representation |
| `classify_point(pt)` | Is point inside/on/outside face |
| `position_material(material, pts, front)` | UV map a texture |

---

## 3. EDGE

| Method | What it does |
|---|---|
| `length` | Edge length |
| `vertices` | [start_vertex, end_vertex] |
| `faces` | Adjacent faces (should be 2 for closed solid) |
| `soft=` / `smooth=` | Control edge display for curved surfaces |
| `split(pt)` | Split edge at point |
| `explode_curve` | Break curve back into individual edges |
| `curve` | Returns Curve if part of one |
| `reversed_in?(face)` | Is edge reversed relative to face |

---

## 4. GROUP

| Method | What it does |
|---|---|
| `entities` | Access group's geometry |
| `transform!(t)` | Apply transformation in place |
| `transformation` | Get current transformation |
| `name=` | Set name |
| `material=` | Set material for whole group |
| `make_unique` | Detach from shared definition |
| `to_component` | Convert group to component definition |
| `explode` | Dissolve group into parent entities |
| `copy` | Duplicate the group |
| `intersect` / `union` / `subtract` / `trim` | ⭐ Boolean solid operations |
| `outer_shell` | ⭐ Merge solids into one outer shell |
| `manifold?` | Is group a valid solid (closed mesh) |
| `volume` | Volume if manifold |
| `bounds` | BoundingBox |
| `locked=` | Lock from editing |
| `glued_to=` | Glue to a face |

---

## 5. GEOM — Math & Transformations

### Geom::Point3d
```ruby
pt = Geom::Point3d.new(x, y, z)
pt.distance(other_pt)      # distance between points
pt.transform(transformation) # apply transform
pt.offset(vector, length)  # move along vector
pt + vector                # translate
```

### Geom::Vector3d
```ruby
v = Geom::Vector3d.new(x, y, z)
v.normalize                # unit vector
v.length                   # magnitude
v.angle_between(other_v)   # angle in radians
v.cross(other_v)           # cross product
v.dot(other_v)             # dot product
v.reverse                  # flip direction
v.perpendicular_to?(other) # boolean
v.parallel_to?(other)      # boolean
v.transform(t)             # apply transform
```

### Geom::Transformation — the key tool for positioning everything
```ruby
# Translation
Geom::Transformation.translation(vector)
Geom::Transformation.translation(Geom::Vector3d.new(x, y, z))

# Rotation
Geom::Transformation.rotation(origin_pt, axis_vector, angle_radians)
# e.g. rotate 45° around Z:
Geom::Transformation.rotation(ORIGIN, Z_AXIS, 45.degrees)

# Scaling
Geom::Transformation.scaling(scale_factor)
Geom::Transformation.scaling(sx, sy, sz)       # non-uniform
Geom::Transformation.scaling(origin, factor)   # scale from point

# Axes
Geom::Transformation.axes(origin, xaxis, yaxis, zaxis)

# Combining transforms
t = t1 * t2   # compose — t2 applied first, then t1

# Useful constants
ORIGIN   # Geom::Point3d(0,0,0)
X_AXIS   # Geom::Vector3d(1,0,0)
Y_AXIS   # Geom::Vector3d(0,1,0)
Z_AXIS   # Geom::Vector3d(0,0,1)
```

### Geom::PolygonMesh — build arbitrary 3D meshes
```ruby
mesh = Geom::PolygonMesh.new
idx1 = mesh.add_point(Geom::Point3d.new(0,0,0))
idx2 = mesh.add_point(Geom::Point3d.new(10,0,0))
idx3 = mesh.add_point(Geom::Point3d.new(5,10,5))
mesh.add_polygon(idx1, idx2, idx3)   # triangular face
ents.add_faces_from_mesh(mesh, true) # smooth=true for curved surfaces
```

### Geom utility functions
```ruby
Geom.intersect_line_line(line1, line2)      # find intersection of 2 lines
Geom.intersect_line_plane(line, plane)      # line/plane intersection point
Geom.intersect_plane_plane(plane1, plane2)  # plane/plane intersection line
Geom.fit_plane_to_points(pts)               # best-fit plane through points
Geom.closest_points(line1, line2)           # nearest points between 2 lines
Geom.point_in_polygon_2D(pt, polygon, on_boundary) # 2D point-in-polygon test
```

---

## 6. BOOLEAN SOLID OPERATIONS
*Requires groups to be manifold (closed solid, zero bad edges)*

| Method | What it does |
|---|---|
| `group.union(other)` | Merge two solids into one |
| `group.subtract(other)` | Cut other from group |
| `group.intersect(other)` | Keep only overlapping volume |
| `group.trim(other)` | Cut without deleting cutter |
| `group.outer_shell(other)` | Merge keeping only outer surface |
| `group.split(other)` | Split into two groups at intersection |

---

## 7. MATERIALS & APPEARANCE

```ruby
mats = Sketchup.active_model.materials

# Create new material
mat = mats.add("Oak")
mat.color = Sketchup::Color.new(139, 90, 43)   # RGB
mat.alpha = 0.8                                  # transparency 0-1
mat.texture = Sketchup::Texture.new("path/to/texture.jpg", 12, 12)  # w/h in inches

# Assign to entity
face.material = mat
group.material = mat

# Named colors
mat.color = "red"
mat.color = "#8B5A2B"   # hex

# Built-in color helper
Sketchup::Color.new(r, g, b, a)
```

---

## 8. LAYERS / TAGS

```ruby
layers = Sketchup.active_model.layers

layer = layers.add("Cabinet Carcass")
layer = layers.add("Drawer Boxes")
layer = layers.add("Countertops")

# Assign entity to layer
group.layer = layer

# Toggle visibility
layer.visible = false

# Folders
folder = layers.add_folder("Lower Cabinets")
```

---

## 9. COMPONENT DEFINITIONS — Reusable parts

```ruby
defs = Sketchup.active_model.definitions

# Create a new component definition
defn = defs.add("Drawer Slide 21\"")
defn_ents = defn.entities
# ... add geometry to defn_ents ...

# Place instances
transform = Geom::Transformation.translation(Geom::Vector3d.new(x,y,z))
instance = ents.add_instance(defn, transform)

# Load from file
defn = defs.load("path/to/component.skp")

# Place in model
defs.import("path/to/component.skp", false)
```

---

## 10. SELECTION & QUERY

```ruby
model = Sketchup.active_model

# Selection
sel = model.selection
sel.add(entity)
sel.remove(entity)
sel.clear
sel.each { |e| ... }

# Ray test — find what's under a point
ray    = [Geom::Point3d.new(0,0,100), Geom::Vector3d.new(0,0,-1)]
result = model.raytest(ray)   # returns [point, path] or nil

# Find by ID
model.find_entity_by_id(123)
model.find_entity_by_persistent_id(456)
```

---

## 11. PAGES / SCENES

```ruby
pages = Sketchup.active_model.pages

page = pages.add("Front Elevation")
page = pages.add("Section A-A")
pages.selected_page = page
page.camera  # camera position for this scene
```

---

## 12. IMPORT / EXPORT

```ruby
model = Sketchup.active_model

# Export
model.export("output.stl")     # STL for 3D printing
model.export("output.obj")     # OBJ
model.export("output.dxf")     # DXF
model.export("output.skp")     # SketchUp native
model.save("output.skp")

# Import
model.import("file.skp")
model.import("file.stl")
model.import("file.obj")
model.import("file.dwg")
model.import("file.dxf")
```

---

## 13. RENDERING OPTIONS & SHADOWS

```ruby
ro = Sketchup.active_model.rendering_options
ro["DisplaySectionPlanes"]  = true
ro["DisplaySectionCuts"]    = true
ro["SectionCutWidth"]       = 2
ro["EdgeDisplayMode"]       = 0   # 0=all, 1=standAlone, 2=none
ro["FaceBackColor"]         = Sketchup::Color.new(255,255,255)

shadow = Sketchup.active_model.shadow_info
shadow["DisplayShadows"] = true
shadow["Light"]          = 80    # sun intensity 0-100
shadow["Dark"]           = 40    # shadow intensity
```

---

## 14. USEFUL RUBY CONSTANTS IN SKETCHUP

```ruby
ORIGIN          # Geom::Point3d(0,0,0)
X_AXIS          # Geom::Vector3d(1,0,0)
Y_AXIS          # Geom::Vector3d(0,1,0)
Z_AXIS          # Geom::Vector3d(0,0,1)
90.degrees      # converts to radians: Math::PI/2
45.degrees      # Math::PI/4
1.inch          # 1.0 (SketchUp internal unit)
1.feet          # 12.0
1.mm            # 0.03937...
1.m             # 39.37...
```

---

## 15. PATTERNS WE HAVEN'T USED YET (high value)

### followme — cylinders, pipes, moldings
```ruby
# Make a cylinder: circle profile + vertical path
circle = ents.add_circle(ORIGIN, Z_AXIS, radius, 24)
face   = ents.add_face(circle)
path   = ents.add_line(ORIGIN, Geom::Point3d.new(0,0,height))
face.followme([path])
```

### pushpull — instant extrusion
```ruby
face.pushpull(depth)         # extrude face by depth
face.pushpull(-depth)        # cut (extrude inward)
face.pushpull(depth, true)   # copy face, keep original
```

### Boolean subtraction — cut a hole
```ruby
# Both groups must be manifold
cabinet.subtract(hole_cutter)
```

### PolygonMesh — tapered legs, organic shapes
```ruby
mesh = Geom::PolygonMesh.new
# Add points and triangles manually
# Great for tapered, non-rectangular solids
ents.add_faces_from_mesh(mesh, smooth_flags)
```

### soft/smooth edges — curved surface appearance
```ruby
edges.each { |e| e.soft = true; e.smooth = true }
# Makes faceted geometry look smooth in rendering
```

### Materials with textures — wood grain, stone, etc.
```ruby
mat = Sketchup.active_model.materials.add("Walnut")
mat.texture = Sketchup::Texture.new("/path/walnut.jpg", 6, 6)
face.material = mat
```

---

## PRIORITY LEARNING ORDER for cabinetry & furniture

1. `face.followme` — table legs, round posts, edge profiles
2. `face.pushpull` — faster than 6-face boxes for simple extrusions
3. `Geom::Transformation` rotation — angled parts, chair legs, returns
4. `Geom::PolygonMesh` — tapered legs, wedge forms
5. `group.subtract` / `union` — boolean joinery, dadoes as actual cuts
6. `materials` + textures — wood grain visualization
7. `layers` — organize by material/phase for presentations
8. `definitions` — reusable hardware components
9. `soft`/`smooth` edges — curved surface visualization
10. `pages` / scenes — elevations, sections, presentations

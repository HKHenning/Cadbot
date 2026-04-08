import opencascade from "replicad-opencascadejs/src/replicad_with_exceptions.js";
import * as replicad from "replicad";

let ocReady = false;

opencascade({
  locateFile: (file) => `/${file}`,
}).then((oc) => {
  replicad.setOC(oc);
  ocReady = true;
  console.log("OC ready");
  self.postMessage({ type: "ready" });
}).catch((err) => {
  console.error("OC init failed:", err);
});

self.onmessage = async (e) => {
  if (!ocReady) {
    self.postMessage({ type: "error", message: "OC not ready yet" });
    return;
  }

  const { shape } = e.data;
  console.log("Making shape:", shape);

  try {
    const { makeBox, makeSphere, makeCylinder } = replicad;

    let solid;
    switch (shape.type) {
      case "box": {
        const w = shape.width ?? 10, d = shape.depth ?? 10, h = shape.height ?? 10;
        solid = makeBox([0, 0, 0], [w, d, h]);
        break;
      }
      case "sphere": {
        const oc = replicad.getOC();
        const sphereMaker = new oc.BRepPrimAPI_MakeSphere_1(shape.radius ?? 5);
        solid = new replicad.Solid(sphereMaker.Solid());
        sphereMaker.delete();
        break;
      }
      case "cylinder": {
        const oc = replicad.getOC();
        const axis = replicad.makeAx2([0,0,0], [0,0,1]);
        const cylMaker = new oc.BRepPrimAPI_MakeCylinder_3(axis, shape.radius ?? 5, shape.height ?? 10);
        solid = new replicad.Solid(cylMaker.Solid());
        axis.delete();
        cylMaker.delete();
        break;
      }
      default:
        solid = makeBox([0, 0, 0], [10, 10, 10]);
    }

    console.log("Shape created:", solid?.constructor?.name, typeof solid?.mesh);
    const mesh = solid.mesh({ tolerance: 0.1, angularTolerance: 0.5 });
    console.log("Mesh keys:", Object.keys(mesh), "vertices:", mesh.vertices?.length, "triangles:", mesh.triangles?.length);
    self.postMessage({ type: "mesh", mesh });
  } catch (err) {
    console.error("cadWorker caught:", err);
    self.postMessage({ type: "error", message: err?.message ?? String(err) });
  }
};

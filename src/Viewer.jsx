import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";

function ShapeMesh({ meshData }) {
  const meshRef = useRef();

  useEffect(() => {
    if (!meshRef.current || !meshData) return;
    const { vertices, triangles, normals } = meshData;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    if (normals && normals.length) {
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    }
    geometry.setIndex(triangles);
    if (!normals || !normals.length) geometry.computeVertexNormals();
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = geometry;

    // Center on grid
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const centerX = (box.max.x + box.min.x) / 2;
    const centerZ = (box.max.z + box.min.z) / 2;
    meshRef.current.position.set(-centerX, -box.min.y, -centerZ);
  }, [meshData]);

  if (!meshData) return null;

  return (
    <mesh ref={meshRef}>
      <bufferGeometry />
      <meshStandardMaterial
        color="#5a82f5"
        metalness={0.1}
        roughness={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(200, 180, 300);
    camera.lookAt(0, 0, 0);
  }, []);
  return null;
}

export default function Viewer({ meshData }) {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 50000 }}
      style={{ background: "#ffffff" }}
      gl={{ antialias: true }}
    >
      <CameraSetup />
      <ambientLight intensity={0.7} />
      <directionalLight position={[200, 400, 300]} intensity={0.8} />
      <directionalLight position={[-200, 100, -200]} intensity={0.3} />
      <Grid
        args={[400, 400]}
        cellSize={25.4}
        cellThickness={0.5}
        cellColor="#d0d0e0"
        sectionSize={25.4 * 4}
        sectionThickness={1}
        sectionColor="#b0b0c8"
        fadeDistance={800}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
      <ShapeMesh meshData={meshData} />
      <OrbitControls makeDefault dampingFactor={0.1} />
    </Canvas>
  );
}

import { useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";

function ShapeMesh({ meshData, darkMode }) {
  const meshRef = useRef();
  const edgeRef = useRef();

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

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const centerX = (box.max.x + box.min.x) / 2;
    const centerZ = (box.max.z + box.min.z) / 2;
    const offset = new THREE.Vector3(-centerX, -box.min.y, -centerZ);
    meshRef.current.position.copy(offset);

    if (edgeRef.current) {
      const edges = new THREE.EdgesGeometry(geometry, 15);
      edgeRef.current.geometry.dispose();
      edgeRef.current.geometry = edges;
      edgeRef.current.position.copy(offset);
    }
  }, [meshData]);

  if (!meshData) return null;

  return (
    <>
      <mesh ref={meshRef}>
        <bufferGeometry />
        <meshStandardMaterial color="#eef0f8" metalness={0.0} roughness={1.0} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments ref={edgeRef}>
        <bufferGeometry />
        <lineBasicMaterial color={darkMode ? "#888888" : "#333333"} />
      </lineSegments>
    </>
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

export default function Viewer({ meshData, showGrid, darkMode }) {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 50000 }}
      style={{ background: darkMode ? "#1a1a2e" : "#ffffff" }}
      gl={{ antialias: true }}
    >
      <CameraSetup />
      <ambientLight intensity={0.5} />
      <directionalLight position={[200, 400, 300]} intensity={1.2} />
      <directionalLight position={[-200, 100, -200]} intensity={0.15} />
      {showGrid && (
        <Grid
          args={[400, 400]}
          cellSize={25.4}
          cellThickness={0.5}
          cellColor="#d0d0e0"
          sectionSize={25.4 * 4}
          sectionThickness={1}
          sectionColor="#b0b0c8"
          fadeDistance={2000}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />
      )}
      <ShapeMesh meshData={meshData} darkMode={darkMode} />
      <OrbitControls makeDefault dampingFactor={0.1} />
    </Canvas>
  );
}

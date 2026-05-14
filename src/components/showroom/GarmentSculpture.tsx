"use client";

import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  useGLTF,
  Center,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/jersey.glb";

const PALETTE = {
  spark:    "#FDCB02",
  inkBase:  "#0a0a0a",
  fabric:   "#0e1218",
  sheen:    "#2a3344",
  fillCool: "#5a7aa8",
  keyWarm:  "#fff6e0",
  rimSpark: "#FDCB02",
};

function GarmentModel({ url, mouse }: { url: string; mouse: React.RefObject<{ x: number; y: number }> }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (mat && "sheen" in mat) {
        mat.sheen = 1;
        mat.sheenColor = new THREE.Color(PALETTE.sheen);
        mat.sheenRoughness = 0.6;
        mat.clearcoat = 0.15;
        mat.clearcoatRoughness = 0.4;
        mat.envMapIntensity = 0.85;
        mat.needsUpdate = true;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [cloned]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.18;
    ref.current.rotation.x += (mouse.current.y * 0.25 - ref.current.rotation.x) * 0.05;
    ref.current.rotation.z += (mouse.current.x * 0.08 - ref.current.rotation.z) * 0.05;
    ref.current.position.y = Math.sin(performance.now() * 0.0005) * 0.12;
  });

  return (
    <Center>
      <group ref={ref} scale={2.4}>
        <primitive object={cloned} />
      </group>
    </Center>
  );
}

function GarmentPlaceholder({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const ref = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.18;
      ref.current.rotation.x += (mouse.current.y * 0.3 - ref.current.rotation.x) * 0.04;
      ref.current.rotation.z += (mouse.current.x * 0.1 - ref.current.rotation.z) * 0.04;
      ref.current.position.y = Math.sin(performance.now() * 0.0005) * 0.18;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.08;
      wireRef.current.rotation.z += delta * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={ref} scale={1.4} castShadow receiveShadow>
        <torusKnotGeometry args={[1, 0.42, 220, 32, 2, 3]} />
        <meshPhysicalMaterial
          color={PALETTE.fabric}
          roughness={0.65}
          metalness={0.05}
          sheen={1}
          sheenColor={PALETTE.sheen}
          sheenRoughness={0.5}
          clearcoat={0.15}
          clearcoatRoughness={0.4}
          envMapIntensity={0.75}
        />
      </mesh>
      <mesh ref={wireRef} scale={1.65}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={PALETTE.sheen} wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function SmartGarment({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const [hasModel, setHasModel] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => alive && setHasModel(r.ok))
      .catch(() => alive && setHasModel(false));
    return () => { alive = false; };
  }, []);

  if (hasModel === null) return null;
  if (hasModel) return <GarmentModel url={MODEL_URL} mouse={mouse} />;
  return <GarmentPlaceholder mouse={mouse} />;
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.1} color="#4a5878" />
      <directionalLight position={[5, 6, 4]} intensity={1.4} color={PALETTE.keyWarm} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-4, 2, 3]} intensity={0.7} color={PALETTE.fillCool} distance={15} decay={1.5} />
      <pointLight position={[0, -1, -5]} intensity={2.2} color={PALETTE.rimSpark} distance={12} decay={2} />
      <spotLight position={[0, 8, 0]} angle={0.4} penumbra={1} intensity={0.6} color="#ffffff" />
    </>
  );
}

function CameraRig({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 5.5));

  useFrame(() => {
    target.current.x = mouse.current.x * 0.3;
    target.current.y = mouse.current.y * 0.2;
    target.current.z = 5.5;
    camera.position.lerp(target.current, 0.04);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function GarmentSculpture() {
  const mouse = useRef({ x: 0, y: 0 });
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <div className="absolute inset-0 overflow-hidden" onMouseMove={handleMouseMove}>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(40,48,64,0.7) 0%, rgba(10,12,18,0.3) 40%, transparent 70%)" }}
      />
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 38, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        dpr={dpr}
        shadows
        style={{ background: "transparent" }}
      >
        <PerformanceMonitor onDecline={() => setDpr([1, 1])} onIncline={() => setDpr([1, 2])} />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <StudioLights />
        <CameraRig mouse={mouse} />
        <Suspense fallback={null}>
          <SmartGarment mouse={mouse} />
          <Environment preset="studio" background={false} />
          <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={8} blur={2.5} far={3} color="#000000" />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

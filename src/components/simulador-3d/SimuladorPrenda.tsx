"use client";

/**
 * Simulador 3D de prendas con textura de tela aplicada.
 *
 * RECIBE:
 *  - texturaUrl: URL de la textura (jpg/png) en /public o externa
 *  - nombreTela: para el overlay informativo
 *  - tipoPrenda: "playera" | "leggings" | "hoodie" | "pantalon" | "uniforme"
 *  - colorBase?: color hex base (mezclado con la textura via multiply)
 *
 * V1: geometrias primitivas estilizadas. NO photoreal.
 * V2 (cuando valides demanda): swap a modelos GLB realistas.
 *
 * Notas tecnicas:
 *  - useLoader(TextureLoader) carga la textura una vez y la cachea
 *  - texture.repeat = (2,2) hace tiling para que se vea fibra
 *  - Material MeshStandardMaterial = PBR (responde a luces y sombras)
 *  - OrbitControls da rotacion + zoom + pan al usuario
 *  - Environment "city" da reflejos sutiles realistas
 */

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";

export type TipoPrenda = "playera" | "leggings" | "hoodie" | "pantalon" | "uniforme";

interface Props {
  texturaUrl: string;
  nombreTela: string;
  tipoPrenda: TipoPrenda;
  colorBase?: string;
}

// ─── Loader UI mientras carga la textura ───
function CargandoOverlay() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-sm font-medium">
        Cargando textura... {progress.toFixed(0)}%
      </div>
    </Html>
  );
}

// ─── Material PBR con textura aplicada ───
function useTexturaTela(texturaUrl: string, colorBase?: string) {
  const texture = useLoader(THREE.TextureLoader, texturaUrl);

  return useMemo(() => {
    // Repetir textura para que se vea como fibra real
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.5, 2.5);
    texture.anisotropy = 16;
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: colorBase ? new THREE.Color(colorBase) : new THREE.Color("#ffffff"),
      roughness: 0.85, // tela es opaca, no brillosa
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
  }, [texture, colorBase]);
}

// ─── Geometrias estilizadas por tipo de prenda ───
// V1: primitives. V2: useGLTF("/models/playera.glb") etc.

function Playera({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      {/* Torso */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow material={material}>
        <cylinderGeometry args={[0.8, 0.9, 1.8, 32, 1, false]} />
      </mesh>
      {/* Cuello (anillo) */}
      <mesh position={[0, 0.95, 0]} castShadow material={material}>
        <torusGeometry args={[0.35, 0.08, 16, 32]} />
      </mesh>
      {/* Manga izquierda */}
      <mesh position={[-1.0, 0.4, 0]} rotation={[0, 0, Math.PI / 3]} castShadow material={material}>
        <cylinderGeometry args={[0.25, 0.3, 0.9, 24]} />
      </mesh>
      {/* Manga derecha */}
      <mesh position={[1.0, 0.4, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow material={material}>
        <cylinderGeometry args={[0.25, 0.3, 0.9, 24]} />
      </mesh>
    </group>
  );
}

function Leggings({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      {/* Cintura */}
      <mesh position={[0, 0.9, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.55, 0.55, 0.3, 24]} />
      </mesh>
      {/* Pierna izquierda */}
      <mesh position={[-0.3, -0.1, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.25, 0.18, 1.7, 24]} />
      </mesh>
      {/* Pierna derecha */}
      <mesh position={[0.3, -0.1, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.25, 0.18, 1.7, 24]} />
      </mesh>
    </group>
  );
}

function Hoodie({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      {/* Torso mas voluminoso */}
      <mesh position={[0, 0, 0]} castShadow material={material}>
        <cylinderGeometry args={[1.0, 1.1, 2.0, 32]} />
      </mesh>
      {/* Capucha (semi-esfera arriba) */}
      <mesh position={[0, 1.3, -0.15]} castShadow material={material}>
        <sphereGeometry args={[0.55, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.5]} />
      </mesh>
      {/* Mangas largas */}
      <mesh position={[-1.15, 0.2, 0]} rotation={[0, 0, Math.PI / 3.5]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.32, 1.3, 24]} />
      </mesh>
      <mesh position={[1.15, 0.2, 0]} rotation={[0, 0, -Math.PI / 3.5]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.32, 1.3, 24]} />
      </mesh>
      {/* Bolsillo canguro */}
      <mesh position={[0, -0.3, 0.95]} castShadow material={material}>
        <boxGeometry args={[1.0, 0.5, 0.15]} />
      </mesh>
    </group>
  );
}

function Pantalon({ material }: { material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      {/* Cintura */}
      <mesh position={[0, 0.9, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.6, 0.6, 0.35, 24]} />
      </mesh>
      {/* Pierna izquierda mas recta */}
      <mesh position={[-0.3, -0.2, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.28, 1.9, 24]} />
      </mesh>
      <mesh position={[0.3, -0.2, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.28, 1.9, 24]} />
      </mesh>
    </group>
  );
}

function Uniforme({ material }: { material: THREE.Material }) {
  // Uniforme = playera + pantalon corto
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.002;
  });

  return (
    <group ref={ref}>
      {/* Polo arriba */}
      <mesh position={[0, 0.6, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.75, 0.85, 1.4, 32]} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow material={material}>
        <torusGeometry args={[0.3, 0.06, 16, 32]} />
      </mesh>
      <mesh position={[-0.95, 0.85, 0]} rotation={[0, 0, Math.PI / 3]} castShadow material={material}>
        <cylinderGeometry args={[0.22, 0.27, 0.7, 24]} />
      </mesh>
      <mesh position={[0.95, 0.85, 0]} rotation={[0, 0, -Math.PI / 3]} castShadow material={material}>
        <cylinderGeometry args={[0.22, 0.27, 0.7, 24]} />
      </mesh>
      {/* Short abajo */}
      <mesh position={[-0.25, -0.45, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.3, 0.9, 24]} />
      </mesh>
      <mesh position={[0.25, -0.45, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.27, 0.3, 0.9, 24]} />
      </mesh>
    </group>
  );
}

// ─── Escena principal ───
function Escena({ texturaUrl, tipoPrenda, colorBase }: Omit<Props, "nombreTela">) {
  const material = useTexturaTela(texturaUrl, colorBase);

  return (
    <>
      {/* Iluminacion */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[-5, 5, -5]} intensity={0.4} angle={0.5} penumbra={1} />
      <pointLight position={[0, -3, 0]} intensity={0.3} color="#4488ff" />

      {/* Environment para reflejos sutiles */}
      <Environment preset="city" />

      {/* Prenda seleccionada */}
      {tipoPrenda === "playera" && <Playera material={material} />}
      {tipoPrenda === "leggings" && <Leggings material={material} />}
      {tipoPrenda === "hoodie" && <Hoodie material={material} />}
      {tipoPrenda === "pantalon" && <Pantalon material={material} />}
      {tipoPrenda === "uniforme" && <Uniforme material={material} />}

      {/* Sombra suave en piso */}
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.5}
        scale={8}
        blur={2.5}
        far={4}
      />
    </>
  );
}

// ─── Componente exportado ───
export default function SimuladorPrenda({
  texturaUrl,
  nombreTela,
  tipoPrenda,
  colorBase,
}: Props) {
  const labelPrenda: Record<TipoPrenda, string> = {
    playera: "Playera",
    leggings: "Leggings",
    hoodie: "Sudadera con capucha",
    pantalon: "Pantalon",
    uniforme: "Uniforme escolar",
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
      {/* Overlay informativo */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white rounded-lg px-4 py-3 max-w-xs border border-white/10">
        <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
          Simulador 3D
        </p>
        <h3 className="text-xl font-bold mt-1">{nombreTela}</h3>
        <p className="text-sm text-slate-300 mt-1">
          Aplicada a: {labelPrenda[tipoPrenda]}
        </p>
      </div>

      {/* Instrucciones esquina inferior */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/40 backdrop-blur-md text-white rounded-lg px-3 py-2 text-xs">
        <p className="opacity-80">Arrastra para rotar · Scroll para zoom</p>
      </div>

      {/* Canvas Three.js */}
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<CargandoOverlay />}>
          <Escena
            texturaUrl={texturaUrl}
            tipoPrenda={tipoPrenda}
            colorBase={colorBase}
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI * 0.7}
        />
      </Canvas>
    </div>
  );
}
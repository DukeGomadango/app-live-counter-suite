"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ───── Inner 3D scene (rendered inside Canvas) ───── */

interface OrbMeshProps {
  pulseTrigger: number;
  isMobile: boolean;
}

function OrbMesh({ pulseTrigger, isMobile }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<React.ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const { pointer } = useThree();

  // Pulse intensity tracking
  const pulseState = useRef({ lastTrigger: 0, intensity: 0 });

  // Gyro-based rotation for mobile
  const gyroTarget = useRef({ beta: 0, gamma: 0 });

  // Register gyro listener once on mobile (useEffect to avoid ref access during render)
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;
    const target = gyroTarget;
    const handler = (e: DeviceOrientationEvent) => {
      target.current.beta = ((e.beta ?? 0) / 180) * Math.PI * 0.15;
      target.current.gamma = ((e.gamma ?? 0) / 90) * Math.PI * 0.15;
    };
    window.addEventListener("deviceorientation", handler, { passive: true });
    return () => window.removeEventListener("deviceorientation", handler);
  }, [isMobile]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    /* ── Rotation ── */
    if (isMobile) {
      // Gentle auto-rotation + gyro
      mesh.rotation.y += delta * 0.15;
      mesh.rotation.x = THREE.MathUtils.lerp(
        mesh.rotation.x,
        gyroTarget.current.beta,
        0.03
      );
      mesh.rotation.z = THREE.MathUtils.lerp(
        mesh.rotation.z,
        gyroTarget.current.gamma,
        0.03
      );
    } else {
      // PC: mouse-follow with lerp inertia
      const targetX = pointer.y * 0.4;
      const targetY = pointer.x * 0.6;
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, 0.04);
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetY, 0.04);
    }

    /* ── Pulse effect from counter clicks ── */
    if (pulseTrigger !== pulseState.current.lastTrigger) {
      pulseState.current.lastTrigger = pulseTrigger;
      pulseState.current.intensity = 1.0;
    }
    if (pulseState.current.intensity > 0) {
      pulseState.current.intensity = Math.max(
        0,
        pulseState.current.intensity - delta * 2.5
      );
    }

    /* ── Emissive pulse on material ── */
    if (materialRef.current) {
      const mat = materialRef.current as unknown as {
        emissiveIntensity: number;
        emissive: THREE.Color;
      };
      // Baseline 0.18 soft glow + peak 0.78 glow on pulse
      mat.emissiveIntensity = 0.18 + pulseState.current.intensity * 0.6;
      mat.emissive = new THREE.Color("#a855f7");
    }

    /* ── Breathing scale ── */
    const breathe = 1.0 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    const pulseScale = 1.0 + pulseState.current.intensity * 0.08;
    const s = breathe * pulseScale;
    mesh.scale.set(s, s, s);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.6, isMobile ? 3 : 4]} />
        <MeshTransmissionMaterial
          ref={materialRef}
          backside
          samples={isMobile ? 4 : 8}
          thickness={0.4}
          chromaticAberration={0.15}
          anisotropy={0.3}
          distortion={0.2}
          distortionScale={0.3}
          temporalDistortion={0.1}
          ior={1.25}
          color="#d8b4fe"
          roughness={0.05}
          transmission={1}
          transparent
        />

        {/* Beautiful Inner Glowing Core to refract light */}
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial 
            color="#a855f7" 
            toneMapped={false}
          />
        </mesh>
      </mesh>
    </Float>
  );
}

function OrbScene({ pulseTrigger, isMobile }: OrbMeshProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[-3, 2, -2]} intensity={0.4} color="#a855f7" />
      <pointLight position={[3, -1, 4]} intensity={0.3} color="#06b6d4" />
      <OrbMesh pulseTrigger={pulseTrigger} isMobile={isMobile} />
      <Environment preset="sunset" />
    </>
  );
}

/* ───── Exported wrapper with Canvas ───── */

interface DangoOrb3DProps {
  pulseTrigger: number;
  isMobile: boolean;
  onCreated?: () => void;
  className?: string;
}

export default function DangoOrb3D({
  pulseTrigger,
  isMobile,
  onCreated,
  className = "",
}: DangoOrb3DProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => {
          if (onCreated) onCreated();
        }}
        style={{ background: "transparent" }}
      >
        <OrbScene pulseTrigger={pulseTrigger} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

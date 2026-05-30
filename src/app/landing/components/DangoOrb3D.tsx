"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ───── Color step palette for rainbow pulse ───── */

const RAINBOW_STEPS: Array<{ emissive: string; color: string }> = [
  { emissive: "#a855f7", color: "#d8b4fe" }, // Purple (default)
  { emissive: "#06b6d4", color: "#a5f3fc" }, // Cyan
  { emissive: "#ec4899", color: "#fbcfe8" }, // Pink
  { emissive: "#eab308", color: "#fef08a" }, // Gold
  { emissive: "#22c55e", color: "#bbf7d0" }, // Green
  { emissive: "#3b82f6", color: "#bfdbfe" }, // Blue
];

/* ───── Inner 3D scene (rendered inside Canvas) ───── */

interface OrbMeshProps {
  pulseTrigger: number;
  isMobile: boolean;
}

function OrbMesh({ pulseTrigger, isMobile }: OrbMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<React.ComponentRef<typeof MeshTransmissionMaterial>>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  // Pulse intensity tracking
  const pulseState = useRef({ lastTrigger: 0, intensity: 0, colorIndex: 0 });

  // Current and target colors for smooth interpolation
  const currentEmissive = useRef(new THREE.Color("#a855f7"));
  const targetEmissive = useRef(new THREE.Color("#a855f7"));
  const currentColor = useRef(new THREE.Color("#d8b4fe"));
  const targetColor = useRef(new THREE.Color("#d8b4fe"));

  // Gyro-based rotation for mobile
  const gyroTarget = useRef({ beta: 0, gamma: 0 });

  // Scroll container element tracking
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Find the custom scroll container once mounted
  useEffect(() => {
    if (typeof document === "undefined") return;
    const container = document.querySelector(".overflow-y-auto");
    if (container) {
      scrollContainerRef.current = container as HTMLElement;
    }
  }, []);

  // Register gyro listener once on mobile
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

    /* ── Scroll Synchronized Camerawork (Position & Scale) ── */
    let scrollPercent = 0;
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      if (scrollHeight > 0) {
        scrollPercent = Math.min(1.0, Math.max(0.0, scrollTop / scrollHeight));
      }
    }

    const { width: viewportWidth } = state.viewport;
    
    // Scale factor to make coordinates responsive to screen width
    const responsiveScale = Math.min(1.0, viewportWidth / 10);

    const targetPos = new THREE.Vector3();
    let baseScale = 1.0;

    if (isMobile) {
      // Mobile layout progression
      if (scrollPercent < 0.15) {
        // Hero section (centered slightly high)
        targetPos.set(0, 0.4, 0);
        baseScale = 0.82 * responsiveScale;
      } else if (scrollPercent < 0.65) {
        // Bento Grid section (ambient backdrop glowing orb, deep Z, top-left)
        const t = (scrollPercent - 0.15) / 0.50;
        targetPos.lerpVectors(
          new THREE.Vector3(0, 0.4, 0),
          new THREE.Vector3(-0.4, 1.0, -2.5),
          t
        );
        baseScale = (0.82 - t * 0.25) * responsiveScale;
      } else {
        // Tool Rotator & Footer (ambient bottom-right glow)
        const t = (scrollPercent - 0.65) / 0.35;
        targetPos.lerpVectors(
          new THREE.Vector3(-0.4, 1.0, -2.5),
          new THREE.Vector3(0.4, -0.8, -3.0),
          t
        );
        baseScale = (0.57 - t * 0.12) * responsiveScale;
      }
    } else {
      // PC Desktop layout progression
      if (scrollPercent < 0.15) {
        // Hero section (right-aligned)
        targetPos.set(1.9 * responsiveScale, 0, 0);
        baseScale = 1.05;
      } else if (scrollPercent < 0.65) {
        // Bento Grid section (drift to left background, smaller & deeper Z)
        const t = (scrollPercent - 0.15) / 0.50;
        targetPos.lerpVectors(
          new THREE.Vector3(1.9 * responsiveScale, 0, 0),
          new THREE.Vector3(-2.4, -0.15, -2.0),
          t
        );
        baseScale = 1.05 - t * 0.3;
      } else {
        // Tool Rotator & Footer (drift to right background, further deep Z)
        const t = (scrollPercent - 0.65) / 0.35;
        targetPos.lerpVectors(
          new THREE.Vector3(-2.4, -0.15, -2.0),
          new THREE.Vector3(2.1, -0.5, -2.5),
          t
        );
        baseScale = 0.75 - t * 0.1;
      }
    }

    // Gentle floating motion (idle drift)
    const floatY = Math.sin(state.clock.elapsedTime * 1.3) * 0.08;
    targetPos.y += floatY;

    // Smoothly interpolate position using lerp
    mesh.position.lerp(targetPos, 0.08);

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

    /* ── Pulse effect from counter clicks with rainbow color step ── */
    if (pulseTrigger !== pulseState.current.lastTrigger) {
      pulseState.current.lastTrigger = pulseTrigger;
      pulseState.current.intensity = 1.0;

      // Advance to next color in the rainbow palette
      pulseState.current.colorIndex = (pulseState.current.colorIndex + 1) % RAINBOW_STEPS.length;
      const step = RAINBOW_STEPS[pulseState.current.colorIndex] as (typeof RAINBOW_STEPS)[number];
      targetEmissive.current.set(step.emissive);
      targetColor.current.set(step.color);
    }
    if (pulseState.current.intensity > 0) {
      pulseState.current.intensity = Math.max(
        0,
        pulseState.current.intensity - delta * 2.0
      );
    }

    // Smoothly interpolate colors
    currentEmissive.current.lerp(targetEmissive.current, delta * 3);
    currentColor.current.lerp(targetColor.current, delta * 3);

    /* ── Apply material colors ── */
    if (materialRef.current) {
      const mat = materialRef.current as unknown as {
        emissiveIntensity: number;
        emissive: THREE.Color;
        color: THREE.Color;
      };
      // Baseline 0.18 soft glow + peak 0.85 glow on pulse
      mat.emissiveIntensity = 0.18 + pulseState.current.intensity * 0.67;
      mat.emissive = currentEmissive.current.clone();
      mat.color = currentColor.current.clone();
    }

    /* ── Inner core color update ── */
    if (innerCoreRef.current) {
      const coreMat = innerCoreRef.current.material as THREE.MeshBasicMaterial;
      coreMat.color.copy(currentEmissive.current);
    }

    /* ── Breathing scale with stronger pulse response ── */
    const breathe = 1.0 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    const pulseScale = 1.0 + pulseState.current.intensity * 0.12;
    const s = baseScale * breathe * pulseScale;
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
        <mesh ref={innerCoreRef}>
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
  eventSource: React.RefObject<HTMLDivElement | null>;
}

export default function DangoOrb3D({
  pulseTrigger,
  isMobile,
  onCreated,
  className = "",
  eventSource,
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
        eventSource={eventSource.current || undefined}
        eventPrefix="client"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
        }}
      >
        <OrbScene pulseTrigger={pulseTrigger} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

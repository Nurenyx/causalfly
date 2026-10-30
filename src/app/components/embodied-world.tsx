"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3, type Group } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MeasuredExperimentResult } from "@/lib/web/contracts";
import { embodimentAtStep, loomingPose } from "@/lib/web/embodiment";
import { HighFidelityFly } from "./high-fidelity-fly";

const CYAN = "#29e7ff", MAGENTA = "#ff55b4";

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="world-fallback">3D unavailable · recorded signals remain available alongside.</div> : this.props.children; }
}

function Camera({ reset, compare }: { reset: number; compare: boolean }) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.target.set(0, .55, -.15);
    const direction = new Vector3(...(compare ? [7, 6, -10] : [4.8, 3.1, -3.6]) as [number, number, number]).sub(orbit.target);
    // The asset is normalized from its actual bounds to a 3.6-unit arena span.
    // Widen camera distance only when the responsive canvas would crop that span.
    direction.multiplyScalar(Math.max(1, .95 / (size.width / Math.max(1, size.height))));
    camera.position.copy(orbit.target).add(direction);
    if (camera instanceof PerspectiveCamera) camera.updateProjectionMatrix();
    orbit.minDistance = compare ? 7 : 4; orbit.maxDistance = Math.max(19, direction.length() * 2);
    orbit.minPolarAngle = .25; orbit.maxPolarAngle = Math.PI / 2.1;
    orbit.enablePan = false; orbit.enableZoom = true;
    orbit.update(); orbit.saveState(); invalidate();
    gl.domElement.setAttribute("data-world-camera", JSON.stringify({ position: camera.position.toArray(), target: orbit.target.toArray(), width: size.width, height: size.height }));
    const changed = () => invalidate();
    orbit.addEventListener("change", changed);
    return () => { orbit.removeEventListener("change", changed); orbit.dispose(); };
  }, [camera, gl, invalidate, compare, size.width, size.height]);
  useEffect(() => { controls.current?.reset(); }, [reset]);
  return null;
}

function LoomingStimulus({ intensity, playing, pulseKey, x }: { intensity: number; playing: boolean; pulseKey: string; x: number }) {
  const shell = useRef<Group>(null);
  const elapsed = useRef(0);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => { elapsed.current = 0; invalidate(); }, [pulseKey, intensity, invalidate]);
  useFrame((state, delta) => {
    if (!shell.current) return;
    if (playing && intensity > 0) elapsed.current = Math.min(1.1, elapsed.current + Math.min(delta, .1));
    const progress = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : elapsed.current / 1.1;
    const pose = loomingPose(intensity, progress);
    shell.current.position.set(x, 1.1, pose.z);
    shell.current.scale.setScalar(pose.radius * .42);
    shell.current.visible = pose.visible;
    if (playing && intensity > 0 && elapsed.current < 1.1) state.invalidate();
  });
  return <group ref={shell} name="looming-stimulus">
    <mesh><sphereGeometry args={[1, 40, 32]} /><meshStandardMaterial color="#59462a" roughness={.85} emissive="#d6a541" emissiveIntensity={.12} /></mesh>
    <mesh><sphereGeometry args={[1.015, 24, 16]} /><meshBasicMaterial color="#f3d289" wireframe transparent opacity={.14} /></mesh>
    <pointLight color="#ffd27a" intensity={3 * intensity} distance={5} />
  </group>;
}

export default function EmbodiedWorld({ result, step, reset, compare, condition, playing, pulseKey, previewStrength = 0 }: { result: MeasuredExperimentResult | null; step: number; reset: number; compare: boolean; condition: "control" | "perturbed"; playing: boolean; pulseKey: string; previewStrength?: number }) {
  const conditions = compare ? ["control", "perturbed"] as const : [condition];
  return <WorldBoundary><Canvas shadows aria-label={compare ? "Control and intervention runs compared side by side" : "One fly replaying the selected synthetic condition"} frameloop="demand" dpr={[1, 1.75]} camera={{ position: [4.8, 3.1, 3.6], fov: 34 }} gl={{ antialias: true, alpha: false }} fallback={<div className="world-fallback">3D unavailable · use the recorded signal view.</div>} onCreated={({ gl }) => { gl.setClearColor("#04101a"); }}>
    <fog attach="fog" args={["#04101a", 15, 28]} />
    <ambientLight intensity={.85} /><hemisphereLight args={["#c9dce0", "#0c1720", 2]} />
    <directionalLight castShadow position={[2, 7, -4]} color="#ead8b5" intensity={4.5} shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-normalBias={.03} shadow-radius={3} />
    <pointLight position={[4, 3, -3]} color="#bfd5de" intensity={30} />
    <pointLight position={[-3, 3, 3]} color="#81c9dd" intensity={14} />
    <mesh receiveShadow position={[0, -.035, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[16, 80]} /><meshStandardMaterial color="#030b10" metalness={.1} roughness={.96} /></mesh>
    <gridHelper args={[30, 38, "#1a5265", "#0b2b38"]} position={[0, -.02, 0]} />
    {conditions.map((run, i) => {
      const x = compare ? i ? 2.35 : -2.35 : 0;
      const state = result ? embodimentAtStep(result.measuredEvidence[run], step) : null;
      const color = run === "control" ? CYAN : MAGENTA;
      return <group key={run}>
        <mesh position={[x, .005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2, 2.025, 96]} /><meshBasicMaterial color={color} transparent opacity={.28 + (state?.output ?? 0) * .6} /></mesh>
        <HighFidelityFly x={x} output={state?.output ?? null} />
        <LoomingStimulus x={x} intensity={state?.stimulus ?? previewStrength} playing={playing} pulseKey={`${pulseKey}-${run}`} />
        <mesh position={[x, .02, -3.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.025, 4]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.45} /></mesh>
        {[-4.5, -3.4, -2.3].map(z => <mesh key={z} position={[x, .025, z]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.11, .32, 3]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.7} /></mesh>)}
        <mesh position={[x, .01, -5.8]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.43, .45, 64]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.35} /></mesh>
      </group>;
    })}
    <Camera reset={reset} compare={compare} />
  </Canvas></WorldBoundary>;
}

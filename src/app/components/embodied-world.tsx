"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MeasuredExperimentResult } from "@/lib/web/contracts";
import { embodimentAtStep, loomingPose } from "@/lib/web/embodiment";
import { ProceduralFly } from "./procedural-fly";

const CYAN = "#29e7ff", MAGENTA = "#ff55b4";

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="world-fallback">3D unavailable · recorded signals remain available alongside.</div> : this.props.children; }
}

function Camera({ reset, compare }: { reset: number; compare: boolean }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    if (compare) camera.position.set(7, 6, 10);
    else camera.position.set(5.2, 3.6, 5.8);
    orbit.target.set(0, .3, -1);
    orbit.minDistance = compare ? 7 : 4; orbit.maxDistance = 19;
    orbit.minPolarAngle = .25; orbit.maxPolarAngle = Math.PI / 2.1;
    orbit.enablePan = false; orbit.enableZoom = true;
    orbit.update(); orbit.saveState(); invalidate();
    const changed = () => invalidate();
    orbit.addEventListener("change", changed);
    return () => { orbit.removeEventListener("change", changed); orbit.dispose(); };
  }, [camera, gl, invalidate, compare]);
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
    shell.current.scale.setScalar(pose.radius);
    shell.current.visible = pose.visible;
    if (playing && intensity > 0 && elapsed.current < 1.1) state.invalidate();
  });
  return <group ref={shell} name="looming-stimulus">
    <mesh><sphereGeometry args={[1, 40, 32]} /><meshStandardMaterial color="#342511" roughness={.4} emissive="#ffba42" emissiveIntensity={.42} /></mesh>
    <mesh><sphereGeometry args={[1.015, 24, 16]} /><meshBasicMaterial color="#ffd27a" wireframe transparent opacity={.28} /></mesh>
    <pointLight color="#ffd27a" intensity={8 * intensity} distance={5} />
  </group>;
}

export default function EmbodiedWorld({ result, step, reset, compare, condition, playing, pulseKey }: { result: MeasuredExperimentResult | null; step: number; reset: number; compare: boolean; condition: "control" | "perturbed"; playing: boolean; pulseKey: string }) {
  const conditions = compare ? ["control", "perturbed"] as const : [condition];
  return <WorldBoundary><Canvas aria-label={compare ? "Control and intervention runs compared side by side" : "One fly replaying the selected synthetic condition"} frameloop="demand" dpr={[1, 1.75]} camera={{ position: [5.2, 3.6, 5.8], fov: 39 }} gl={{ antialias: true, alpha: false }} fallback={<div className="world-fallback">3D unavailable · use the recorded signal view.</div>} onCreated={({ gl }) => { gl.setClearColor("#04101a"); }}>
    <fog attach="fog" args={["#04101a", 15, 28]} />
    <ambientLight intensity={.65} /><hemisphereLight args={["#edf3ee", "#242017", 2.2]} />
    <directionalLight position={[-3, 7, -2]} color="#fff1d3" intensity={3.5} />
    <pointLight position={[4, 4, 3]} color="#b8d5e4" intensity={40} />
    <mesh position={[0, -.035, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[16, 80]} /><meshStandardMaterial color="#081822" metalness={.3} roughness={.65} /></mesh>
    <gridHelper args={[30, 38, "#164151", "#0c2937"]} position={[0, -.02, 0]} />
    {conditions.map((run, i) => {
      const x = compare ? i ? 2.35 : -2.35 : 0;
      const state = result ? embodimentAtStep(result.measuredEvidence[run], step) : null;
      const color = run === "control" ? CYAN : MAGENTA;
      return <group key={run}>
        <mesh position={[x, .005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2, 2.025, 96]} /><meshBasicMaterial color={color} transparent opacity={.28 + (state?.output ?? 0) * .6} /></mesh>
        <ProceduralFly x={x} output={state?.output ?? null} />
        <LoomingStimulus x={x} intensity={state?.stimulus ?? 0} playing={playing} pulseKey={`${pulseKey}-${run}`} />
        <mesh position={[x, .02, -3.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.025, 4]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.45} /></mesh>
        {[-4.5, -3.4, -2.3].map(z => <mesh key={z} position={[x, .025, z]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.11, .32, 3]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.7} /></mesh>)}
        <mesh position={[x, .01, -5.8]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.43, .45, 64]} /><meshBasicMaterial color="#ffd27a" transparent opacity={.35} /></mesh>
      </group>;
    })}
    <Camera reset={reset} compare={compare} />
  </Canvas></WorldBoundary>;
}

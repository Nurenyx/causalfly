"use client";

import { Component, memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ConnectomeActivity, ConnectomeStructure, ActivityPoint } from "@/lib/sources/connectome-view";
import styles from "./live-session.module.css";

const CAMERA: [number, number, number] = [1.1, 0.5, 2.3];
const vertexShader = `
  attribute float emphasis;
  uniform float pointSize;
  uniform float pixelRatio;
  uniform bool structureLayer;
  varying float strength;
  varying float depth;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    depth = clamp((5.0 + view.z) / 3.5, 0.0, 1.0);
    strength = structureLayer ? 1.0 : emphasis;
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(pointSize * pixelRatio * 3.2 / max(0.25, -view.z), 1.0, 32.0 * pixelRatio);
  }
`;
const fragmentShader = `
  uniform bool structureLayer;
  uniform bool currentLayer;
  varying float strength;
  varying float depth;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float halo = exp(-radius * radius * 4.5) * (1.0 - smoothstep(0.7, 1.0, radius));
    float core = 1.0 - smoothstep(0.05, 0.3, radius);
    vec3 cyan = vec3(0.0, 0.70, 0.90);
    vec3 color = structureLayer ? mix(vec3(0.01, 0.27, 0.42), cyan, depth) : mix(cyan, vec3(0.83, 1.0, 1.0), currentLayer ? core : 0.0);
    float alpha = structureLayer ? halo * (0.075 + depth * 0.15) : (halo * 0.8 + core * 0.2) * strength;
    gl_FragColor = vec4(color, alpha);
  }
`;

class ViewerBoundary extends Component<{ onFailure: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("Connectome 3D initialization failed", error); this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function PointLayer({ positions, points, current = false }: { positions: Float32Array; points?: readonly ActivityPoint[]; current?: boolean }) {
  const invalidate = useThree(s => s.invalidate);
  const pixelRatio = useThree(s => s.viewport.dpr);
  const geometry = useRef<THREE.BufferGeometry>(null);
  const dynamic = points !== undefined;
  // Protocol caps: 512 current events, at most three preceding received frames.
  const capacity = dynamic ? current ? 512 : 1536 : positions.length / 3;
  const buffer = useMemo(() => dynamic ? new Float32Array(capacity * 3) : positions, [positions, capacity, dynamic]);
  const emphasis = useMemo(() => new Float32Array(capacity), [capacity]);
  const uniforms = useMemo(() => ({
    pointSize: { value: dynamic ? current ? 9 : 6 : 1.3 }, pixelRatio: { value: pixelRatio },
    structureLayer: { value: !dynamic }, currentLayer: { value: current },
  }), [dynamic, current, pixelRatio]);
  useLayoutEffect(() => {
    const g = geometry.current;
    if (!g) return;
    if (points) {
      points.forEach((p, i) => {
        buffer[i * 3] = positions[p.index * 3]; buffer[i * 3 + 1] = positions[p.index * 3 + 1]; buffer[i * 3 + 2] = positions[p.index * 3 + 2];
        emphasis[i] = p.emphasis;
      });
      g.attributes.position.needsUpdate = true;
      g.attributes.emphasis.needsUpdate = true;
    }
    g.setDrawRange(0, points?.length ?? capacity);
    invalidate();
  }, [points, positions, buffer, emphasis, capacity, invalidate]);
  return <points frustumCulled={false} raycast={() => {}}>
    <bufferGeometry ref={geometry}>
      <bufferAttribute attach="attributes-position" args={[buffer, 3]} usage={points ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage} />
      <bufferAttribute attach="attributes-emphasis" args={[emphasis, 1]} usage={points ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage} />
    </bufferGeometry>
    <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
  </points>;
}

function CameraControls({ reset, onFailure }: { reset: number; onFailure: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    controls.current = control;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => { control.enableDamping = !reduced.matches; control.dampingFactor = 0.22; invalidate(); };
    motion(); reduced.addEventListener("change", motion);
    control.minDistance = 0.45; control.maxDistance = 12;
    control.rotateSpeed = 0.65; control.zoomSpeed = 0.8; control.panSpeed = 0.8;
    control.saveState();
    const changed = () => invalidate();
    control.addEventListener("change", changed);
    control.listenToKeyEvents(gl.domElement);
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      reduced.removeEventListener("change", motion);
      control.removeEventListener("change", changed);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      control.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate, onFailure]);
  useEffect(() => {
    const control = controls.current;
    if (!control) return;
    // Clear any pending damping before restoring the deterministic default view.
    control.enableDamping = false; control.update();
    camera.position.set(...CAMERA); control.target.set(0, 0, 0); camera.lookAt(0, 0, 0);
    control.update(); control.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    invalidate();
  }, [camera, reset, invalidate]);
  useFrame(() => controls.current?.update());
  return null;
}

function Connectome3D({ structure, activity, reset, onFailure }: { structure: ConnectomeStructure; activity: ConnectomeActivity; reset: number; onFailure: () => void }) {
  return <ViewerBoundary onFailure={onFailure}><div className={styles.threeCanvas} data-structure-count={structure.count} data-current-ids={activity.mapped} data-unmapped-ids={activity.unmapped} data-recent-ids={activity.recent.length}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: CAMERA, fov: 32, near: 0.01, far: 40 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }} fallback="Interactive 3D requires canvas support. Select Projection for a 2D view."
      onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute("role", "img"); gl.domElement.setAttribute("aria-label", "Interactive published soma coordinates. Drag to rotate, scroll to zoom, right-drag to pan. Arrow keys pan; Shift and arrows rotate."); }}>
      <CameraControls reset={reset} onFailure={onFailure} />
      <PointLayer positions={structure.positions} />
      <PointLayer positions={structure.positions} points={activity.recent} />
      <PointLayer positions={structure.positions} points={activity.current} current />
    </Canvas>
  </div></ViewerBoundary>;
}

// Receipt-age labels elsewhere update on wall time; they must not redraw this GPU scene.
export default memo(Connectome3D);

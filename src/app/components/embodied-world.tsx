"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Box3, PCFShadowMap, PerspectiveCamera, Vector3, type Group } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MeasuredExperimentResult } from "@/lib/web/contracts";
import { embodimentAtStep, loomingPose, recordedMotorFrame, recordedMotorTrail } from "@/lib/web/embodiment";
import { trialAmplitude } from "@/lib/experiment/semantics";
import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { HighFidelityFly } from "./high-fidelity-fly";
import type { FlyModelKind, FlyModelStatus } from "@/lib/web/fly-model";

import { DEFAULT_ARENA, type AutonomyFrame, type WorldState } from "@/lib/web/autonomy";

import { fitComparisonBounds } from "./compare-camera";

const CYAN = "#29e7ff", MAGENTA = "#ff55b4";

class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="world-fallback">3D unavailable · recorded signals remain available alongside.</div> : this.props.children; }
}

/** Visual recovery never invokes the experiment engine or provider actions. */
function ContextRecovery({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onLost(true); };
    const restored = () => { onLost(false); invalidate(); };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => { canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored); };
  }, [gl, invalidate, onLost]);
  return null;
}

function Camera({ reset, compare, focus = "both", fitComparisonToPanel = false, stimulusIntensity = 0, recordedBounds }: { reset: number; compare: boolean; focus?: "both" | "control" | "perturbed"; fitComparisonToPanel?: boolean; stimulusIntensity?: number; recordedBounds?: Box3 }) {
  const { camera, gl, invalidate, size, scene } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const fitted = useRef("");
  useFrame(() => {
    if (!compare || !(camera instanceof PerspectiveCamera) || !controls.current) return;
    const subjects = scene.getObjectsByProperty("name", "high-fidelity-fly");
    const key = `${reset}:${focus}:${size.width}:${size.height}:${subjects.length}:${recordedBounds ? recordedBounds.min.toArray().join(",")+recordedBounds.max.toArray().join(",") : stimulusIntensity > 0}`;
    if (fitted.current === key) return;
    scene.updateMatrixWorld(true);
    const bounds = recordedBounds?.clone() ?? new Box3();
    const runs = focus === "both" ? [-2.35,2.35] : [focus === "control" ? -2.35 : 2.35];
    if(!recordedBounds) for (const x of runs) bounds.union(new Box3(new Vector3(x-2.025,0,-2.025),new Vector3(x+2.025,1.5,2.025)));
    for (const subject of subjects) bounds.union(new Box3().setFromObject(subject,true));
    // Include the complete visible looming approach, not the infinite decorative floor/grid.
    if (!recordedBounds && stimulusIntensity > 0) for (const x of runs) {
      const radius=(.2+stimulusIntensity*1.15)*.42;
      bounds.union(new Box3(new Vector3(x-radius,1.1-radius,-5.8-radius),new Vector3(x+radius,1.1+radius,-3.1+radius)));
    }
    bounds.expandByScalar(.3); // Modest reserve for the existing procedural visual pose.
    // A lower single-subject view compresses empty floor depth while retaining the
    // complete arena/stimulus bounds. The former shared angle gave identical zoom.
    const fit=fitComparisonBounds(bounds,size.width/Math.max(1,size.height),camera.fov,1.12,focus === "both" ? .45 : .2);
    controls.current.target.copy(fit.target); camera.position.copy(fit.position);camera.updateProjectionMatrix();controls.current.update();controls.current.saveState();
    gl.domElement.setAttribute("data-world-camera",JSON.stringify({position:camera.position.toArray(),target:fit.target.toArray(),width:size.width,height:size.height,focus,fitComparisonToPanel,fov:camera.fov,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},framing:"visual-bounds"}));
    fitted.current=key; invalidate();
  });
  useEffect(() => {
    fitted.current = "";
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    const targetX = compare && focus === "control" ? -2.35 : compare && focus === "perturbed" ? 2.35 : 0;
    orbit.target.set(targetX, .55, -.15);
    const comparePos: [number, number, number] = focus !== "both" ? [targetX, 2.7, 4.6] : [0, 3.4, 6.2];
    const direction = new Vector3(...(compare ? comparePos : [4.8, 3.1, -3.6]) as [number, number, number]).sub(orbit.target);
    // The asset is normalized from its actual bounds to a 3.6-unit arena span.
    // Widen camera distance only when the responsive canvas would crop that span.
    direction.multiplyScalar(Math.max(1, (compare ? (focus !== "both" ? 0.95 : 1.15) : .95) / (size.width / Math.max(1, size.height))));
    // A tall embedded panel needs enough horizontal frustum for both normalized flies.
    // Provisional loading composition; the shared visual-bounds fit replaces this once subjects are ready.
    if (compare && fitComparisonToPanel && camera instanceof PerspectiveCamera) {
      const span = ((focus === "both" ? 2 * 2.35 : 0) + 3.6) * 1.1;
      const horizontalTangent = Math.tan(camera.fov * Math.PI / 360) * size.width / Math.max(1, size.height);
      direction.setLength(Math.max(direction.length(), span / (2 * Math.max(.01, horizontalTangent))));
    }
    if (!compare) direction.multiplyScalar(.94); // Normal Experiment composition is independent of the comparison-bounds fit.
    camera.position.copy(orbit.target).add(direction);
    if (camera instanceof PerspectiveCamera) camera.updateProjectionMatrix();
    orbit.minDistance = compare ? 3.5 : 4; orbit.maxDistance = Math.max(19, direction.length() * 2);
    orbit.minPolarAngle = .25; orbit.maxPolarAngle = Math.PI / 2.1;
    orbit.enablePan = false; orbit.enableZoom = true;
    orbit.update(); orbit.saveState(); invalidate();
    gl.domElement.setAttribute("data-world-camera", JSON.stringify({ position: camera.position.toArray(), target: orbit.target.toArray(), width: size.width, height: size.height, focus, fitComparisonToPanel, fov: camera instanceof PerspectiveCamera ? camera.fov : null }));
    const changed = () => { gl.domElement.setAttribute("data-world-camera-view", JSON.stringify({ position: camera.position.toArray(), target: orbit.target.toArray() })); invalidate(); };
    orbit.addEventListener("change", changed);
    return () => { orbit.removeEventListener("change", changed); orbit.dispose(); };
  }, [camera, gl, invalidate, compare, focus, fitComparisonToPanel, size.width, size.height]);
  useEffect(() => { controls.current?.reset(); }, [reset]);
  return null;
}

function LoomingStimulus({ intensity, playing, pulseKey, x, near = false }: { intensity: number; playing: boolean; pulseKey: string; x: number; near?: boolean }) {
  const shell = useRef<Group>(null);
  const elapsed = useRef(0);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => { elapsed.current = 0; invalidate(); }, [pulseKey, intensity, invalidate]);
  useFrame((state, delta) => {
    if (!shell.current) return;
    if (playing && intensity > 0) elapsed.current = Math.min(1.1, elapsed.current + Math.min(delta, .1));
    const progress = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : elapsed.current / 1.1;
    const pose = loomingPose(intensity, progress);
    shell.current.position.set(x, 1.1, pose.z * (near ? .4 : 1));
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

/** Render smoothing consumes motor state; it never selects a behaviour or advances simulation. */
function AutonomousFly({ state, frame, model, onStatus }: { state: WorldState; frame: AutonomyFrame | null; model: FlyModelKind; onStatus?: (status: FlyModelStatus) => void }) {
  const body = useRef<Group>(null);
  useFrame(({ invalidate }, delta) => {
    if (!body.current) return;
    const blend = 1 - Math.exp(-Math.min(delta, .1) * 18);
    body.current.position.x += (state.x - body.current.position.x) * blend;
    body.current.position.z += (state.z - body.current.position.z) * blend;
    body.current.position.y += ((state.altitude ?? 0) - body.current.position.y) * blend;
    body.current.rotation.x += ((state.pitch ?? 0) - body.current.rotation.x) * blend;
    body.current.rotation.z += ((state.roll ?? 0) - body.current.rotation.z) * blend;
    const yaw = Math.atan2(Math.sin(state.heading - body.current.rotation.y), Math.cos(state.heading - body.current.rotation.y));
    body.current.rotation.y += yaw * blend;
    if (Math.abs(state.x - body.current.position.x) + Math.abs(state.z - body.current.position.z) + Math.abs(yaw) + Math.abs((state.altitude ?? 0) - body.current.position.y) + Math.abs((state.pitch ?? 0) - body.current.rotation.x) > .001) invalidate();
  });
  return <group ref={body} position={[0, 0, .8]} scale={.26}><HighFidelityFly x={0} output={frame?.motor.escapeDrive ?? 0} model={model} onStatus={onStatus} /></group>;
}

/** Every vertex is a retained recorded position, never a predicted route. */
function RecordedTrail({ path, color }: { path: WorldState[]; color: string }) {
  if (path.length < 2) return null;
  const vertices = new Float32Array(path.slice(1).flatMap((p, i) => [path[i].x, (path[i].altitude ?? 0) + .025, path[i].z, p.x, (p.altitude ?? 0) + .025, p.z]));
  return <group><lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[vertices, 3]} /></bufferGeometry><lineBasicMaterial color={color} transparent opacity={.35} /></lineSegments>{[path[0], path[path.length - 1]].map((p, i) => <mesh key={i} position={[p.x, (p.altitude ?? 0) + .03, p.z]}><sphereGeometry args={[.045, 12, 8]} /><meshBasicMaterial color={color} transparent opacity={.6} /></mesh>)}</group>;
}

/** Interpolation of known procedural poses only. It never advances the engine. */
function RecordedFixtureFly({trial,step,playing,x,run,model,onStatus}:{trial:CompactTrialSummary;step:number;playing:boolean;x:number;run:string;model:FlyModelKind;onStatus?:(status:FlyModelStatus)=>void}) {
  const body=useRef<Group>(null),elapsed=useRef(0);
  const {gl,invalidate}=useThree();
  const current=recordedMotorFrame(trial,step);
  const previousStep=trial.activity.filter(s=>s.step<step).at(-1)?.step ?? step;
  const previous=recordedMotorFrame(trial,previousStep);
  useEffect(()=>{elapsed.current=0;invalidate();},[step,trial,invalidate]);
  useEffect(()=>{if(!playing)elapsed.current=.55;invalidate();},[playing,invalidate]);
  useFrame((state,delta)=>{
    if(!body.current)return;
    elapsed.current=Math.min(.55,elapsed.current+Math.min(delta,.1));
    const t=!playing||window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : elapsed.current/.55;
    const ease=t*t*(3-2*t),a=previous.pose,b=current.pose;
    body.current.position.set(x+a.x+(b.x-a.x)*ease,a.y+(b.y-a.y)*ease,a.z+(b.z-a.z)*ease);
    body.current.rotation.x=a.pitch+(b.pitch-a.pitch)*ease;
    gl.domElement.setAttribute(`data-motor-${run}`,JSON.stringify({step,decoder:current.decoder,decoderStep:current.decoderStep,phase:current.phase,onset:current.onset,position:body.current.position.toArray(),target:[x+b.x,b.y,b.z],procedural:true}));
    if(t<1)state.invalidate();
  });
  return <group ref={body} name="recorded-fixture-fly"><HighFidelityFly x={0} output={0} model={model} onStatus={onStatus}/></group>;
}

/** Complete procedural route plus model reserve; decorative floor is excluded. */
function recordedComparisonBounds(result:MeasuredExperimentResult,conditions:readonly ("control"|"perturbed")[],compare:boolean) {
  const bounds=new Box3();
  for(const run of conditions){
    const x=compare ? run==="control" ? -2.35 : 2.35 : 0,trial=result.measuredEvidence[run];
    const poses=recordedMotorTrail(trial,Number.POSITIVE_INFINITY);
    for(const p of poses)bounds.union(new Box3(new Vector3(x+p.x-1.9,p.y-.1,p.z-1.9),new Vector3(x+p.x+1.9,p.y+1.9,p.z+1.9)));
    if(trialAmplitude(trial)>0){const radius=(.2+trialAmplitude(trial)*1.15)*.42;bounds.union(new Box3(new Vector3(x-radius,1.1-radius,-2.32-radius),new Vector3(x+radius,1.1+radius,-1.24+radius)));}
  }
  return bounds;
}

export default function EmbodiedWorld({ result, step, reset, compare, condition, playing, pulseKey, previewStrength = 0, model = "anatomical", onModelStatus, autonomy, focus = "both", fitComparisonToPanel = false }: { result: MeasuredExperimentResult | null; step: number; reset: number; compare: boolean; condition: "control" | "perturbed"; playing: boolean; pulseKey: string; previewStrength?: number; model?: FlyModelKind; onModelStatus?: (status: FlyModelStatus) => void; autonomy?: { frame: AutonomyFrame | null; state: WorldState; path?: WorldState[] }[]; focus?: "both" | "control" | "perturbed"; fitComparisonToPanel?: boolean }) {
  const [contextLost, setContextLost] = useState(false);
  const [visualRevision, setVisualRevision] = useState(0);
  const conditions = compare ? focus === "both" ? ["control", "perturbed"] as const : [focus] : [condition];
  const recordedBounds=useMemo(()=>result && !autonomy ? recordedComparisonBounds(result,compare ? focus==="both" ? ["control","perturbed"] : [focus] : [condition],compare) : undefined,[result,autonomy,compare,focus,condition]);
  return <WorldBoundary><div style={{ position: "relative", width: "100%", height: "100%" }}><Canvas key={visualRevision} shadows={{ type: PCFShadowMap }} aria-label={autonomy ? "Autonomous experimental fly movement" : compare && focus === "both" ? "Control and intervention runs compared side by side" : "One fly replaying the selected synthetic condition"} frameloop="demand" dpr={autonomy ? [1, 1.25] : [1, 1.75]} camera={{ position: [4.8, 3.1, 3.6], fov: 34 }} gl={{ antialias: true, alpha: false }} fallback={<div className="world-fallback">3D unavailable · use the recorded signal view.</div>} onCreated={({ gl }) => { gl.setClearColor("#04101a"); }}>
    <fog attach="fog" args={["#04101a", 15, 28]} />
    <ambientLight intensity={.85} /><hemisphereLight args={["#c9dce0", "#0c1720", 2]} />
    <directionalLight castShadow position={[2, 7, -4]} color="#ead8b5" intensity={4.5} shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-normalBias={.03} shadow-radius={3} />
    {/* Neutral front-above fill only for anatomy; no extra shadow map or material edits. */}
    {model === "anatomical" && <directionalLight position={[4, 6, -6]} color="#ffffff" intensity={2.8} />}
    <pointLight position={[4, 3, -3]} color="#bfd5de" intensity={30} />
    <pointLight position={[-3, 3, 3]} color="#81c9dd" intensity={14} />
    <directionalLight position={[-4, 2, 4]} color="#b8d9e8" intensity={.7} />
    <mesh receiveShadow position={[0, -.035, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[16, 80]} /><meshStandardMaterial color="#030b10" metalness={.1} roughness={.96} /></mesh>
    <gridHelper args={[30, 38, "#164453", "#09232d"]} position={[0, -.02, 0]} />
    {conditions.map((run, i) => {
      const x = compare ? run === "perturbed" ? 2.35 : -2.35 : 0;
      const state = result ? embodimentAtStep(result.measuredEvidence[run], step) : null;
      const color = run === "control" ? CYAN : MAGENTA;
      if (autonomy) {
        const current = autonomy[i] ?? autonomy[0];
        const stimulus = current?.frame?.stimulus;
        return <group key={run} position={[x, 0, 0]}>
          <mesh position={[0, .005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[DEFAULT_ARENA.radius, DEFAULT_ARENA.radius + .025, 96]} /><meshBasicMaterial color={color} /></mesh>
          {DEFAULT_ARENA.obstacles.map((o, index) => <mesh key={index} position={[o.x, .18, o.z]} castShadow><cylinderGeometry args={[o.radius, o.radius, .36, 24]} /><meshStandardMaterial color="#456b7a" /></mesh>)}
          {current?.path && <RecordedTrail path={current.path} color={color} />}
          {current && <AutonomousFly state={current.state} frame={current.frame} model={model} onStatus={onModelStatus} />}
          {stimulus && <mesh position={[stimulus.x, .6, stimulus.z]}><sphereGeometry args={[stimulus.radius, 24, 16]} /><meshStandardMaterial color="#ffd27a" emissive="#a46f15" emissiveIntensity={.5} /></mesh>}
        </group>;
      }
      return <group key={run}>
        <mesh position={[x, .005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2, 2.025, 96]} /><meshBasicMaterial color={color} transparent opacity={.28 + (state?.output ?? 0) * .6} /></mesh>
        {result ? <><RecordedTrail path={recordedMotorTrail(result.measuredEvidence[run],step).map(p=>({x:x+p.x,z:p.z,altitude:p.y,heading:0,speed:0}))} color={color}/><RecordedFixtureFly trial={result.measuredEvidence[run]} step={step} playing={playing} x={x} run={run} model={model} onStatus={onModelStatus}/></> : <HighFidelityFly x={x} output={null} model={model} onStatus={onModelStatus} />}
        <LoomingStimulus near={compare} x={x} intensity={state?.stimulus ?? previewStrength} playing={playing} pulseKey={`${pulseKey}-${run}`} />
      </group>;
    })}
    <ContextRecovery onLost={setContextLost} />
    <Camera recordedBounds={recordedBounds} stimulusIntensity={autonomy ? 0 : result ? step === 0 ? result.spec.stimulus.amplitude : 0 : previewStrength} reset={reset} compare={compare} focus={focus} fitComparisonToPanel={fitComparisonToPanel} />
  </Canvas>{contextLost && <div className="world-fallback" role="status" style={{ position: "absolute", inset: 0 }}>3D view interrupted. Scientific results are retained. <button type="button" onClick={() => { setContextLost(false); setVisualRevision(v => v + 1); }}>Restore visual view</button></div>}</div></WorldBoundary>;
}

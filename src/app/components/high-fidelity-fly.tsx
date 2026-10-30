"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Box3, Group, Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { ProceduralFly } from "./procedural-fly";
import { canonicalFlyTransform, type FlyModelKind, type FlyModelStatus } from "@/lib/web/fly-model";

const MODEL_URL = "/models/flyv2/FlyVisualV2_Web.glb";

function ModelStatus({ status, onStatus }: { status: FlyModelStatus; onStatus?: (status: FlyModelStatus) => void }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.domElement.setAttribute("data-fly-model", status);
    gl.domElement.setAttribute("title", status === "ready" ? "High-fidelity Drosophila visual embodiment" : status === "loading" ? "Loading anatomical model…" : status === "lightweight" ? "Lightweight fly · explicit visual choice" : "Anatomical model unavailable · lightweight fallback");
    onStatus?.(status);
    invalidate();
  }, [status, gl, invalidate, onStatus]);
  return null;
}

class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function FlyModel({ x, output, onStatus }: { x: number; output: number | null; onStatus?: (status: FlyModelStatus) => void }) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const body = useRef<Group>(null);
  const response = output ?? 0;
  const { scene, wings } = useMemo(() => {
    // Skeleton-aware instance cloning keeps compare conditions independent.
    // Shared loader materials/geometries stay immutable and cached.
    const scene = clone(gltf.scene);
    scene.rotation.y = -Math.PI / 2; // Source -X forward, glTF +Y up -> arena -Z forward.
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene, true);
    const { scale, position } = canonicalFlyTransform(box);
    scene.scale.setScalar(scale);
    scene.position.copy(position);
    scene.traverse(node => {
      if (node instanceof Mesh) { node.castShadow = !node.material || !Array.isArray(node.material) && !node.material.transparent; node.receiveShadow = true; }
    });
    const wings = ["left", "right"].flatMap((side, index) => {
      const node = scene.getObjectByName(`wing_${side}_phi`);
      return node ? [{ node, rest: node.quaternion.clone(), sign: index ? -1 : 1 }] : [];
    });
    return { scene, wings };
  }, [gltf]);
  useFrame(({ invalidate }, delta) => {
    if (!body.current) return;
    const blend = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 10);
    const targetY = response * .18, targetZ = response * .4;
    body.current.position.y += (targetY - body.current.position.y) * blend;
    body.current.position.z += (targetZ - body.current.position.z) * blend;
    body.current.rotation.x += (response * -.1 - body.current.rotation.x) * blend;
    for (const { node, rest, sign } of wings) { node.quaternion.copy(rest); node.rotateZ(sign * response * .08); }
    if (Math.abs(targetY - body.current.position.y) + Math.abs(targetZ - body.current.position.z) > .001) invalidate();
  });
  return <><ModelStatus status="ready" onStatus={onStatus} /><group ref={body} name="high-fidelity-fly" position={[x, 0, 0]}><primitive object={scene} dispose={null} /></group></>;
}

/** Visual-only derivative of female FlyBody anatomy; never a neural measurement. */
export function HighFidelityFly({ model = "anatomical", onStatus, ...props }: { x: number; output: number | null; model?: FlyModelKind; onStatus?: (status: FlyModelStatus) => void }) {
  const fallback = <><ModelStatus status="fallback" onStatus={onStatus} /><ProceduralFly {...props} /></>;
  if (model === "lightweight") return <><ModelStatus status="lightweight" onStatus={onStatus} /><ProceduralFly {...props} /></>;
  return <ModelBoundary fallback={fallback}><Suspense fallback={<ModelStatus status="loading" onStatus={onStatus} />}><FlyModel {...props} onStatus={onStatus} /></Suspense></ModelBoundary>;
}

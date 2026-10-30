"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box3, CatmullRomCurve3, DoubleSide, Quaternion, Shape, Vector2, Vector3, type Group } from "three";
import { canonicalFlyTransform } from "@/lib/web/fly-model";

type Point = [number, number, number];
const CUTICLE = "#554334", JOINT = "#8d7450";

function Rod({ from, to, radius = .025, color = CUTICLE }: { from: Point; to: Point; radius?: number; color?: string }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from), b = new Vector3(...to), direction = b.clone().sub(a);
    return { midpoint: a.add(b).multiplyScalar(.5), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()), length: direction.length() };
  }, [from, to]);
  return <mesh castShadow position={midpoint} quaternion={quaternion}><cylinderGeometry args={[radius * .65, radius, length, 8]} /><meshStandardMaterial color={color} roughness={.62} /></mesh>;
}

function Wing({ side, response }: { side: number; response: number }) {
  const outline = useMemo(() => new Shape().moveTo(0, 0).bezierCurveTo(.6, -.02, 1.36, .7, 1.3, 1.48).bezierCurveTo(1.19, 1.86, .68, 1.62, .3, .88).quadraticCurveTo(.08, .44, 0, 0), []);
  const veins = useMemo(() => [
    [[.05, .08, .008], [.62, .32, .008], [1.16, 1.36, .008]],
    [[.06, .12, .008], [.45, .62, .008], [1.08, 1.62, .008]],
    [[.07, .16, .008], [.28, .64, .008], [.77, 1.5, .008]],
    [[.38, .53, .008], [.64, .65, .008], [.92, .83, .008]],
    [[.51, 1.1, .008], [.81, 1.11, .008], [1.2, 1.21, .008]],
  ].map(points => new CatmullRomCurve3(points.map(p => new Vector3(...p as Point)))), []);
  return <group position={[side * .22, .41, -.42]} rotation={[0, side * (.17 + response * .08), side * response * .08]} scale={[side, 1, 1]}>
    <group rotation={[Math.PI / 2 - .035, 0, 0]}>
      <mesh><shapeGeometry args={[outline, 32]} /><meshPhysicalMaterial color="#b7c9c7" metalness={.02} roughness={.42} transparent opacity={.52} side={DoubleSide} depthWrite={false} clearcoat={.15} /></mesh>
      {veins.map((curve, i) => <mesh key={i}><tubeGeometry args={[curve, 24, i < 2 ? .009 : .005, 4, false]} /><meshStandardMaterial color="#8d8d75" transparent opacity={.82} roughness={.6} /></mesh>)}
    </group>
  </group>;
}

/** Original procedural anatomy; geometry is illustrative, never a biological simulation. */
export function ProceduralFly({ x, output }: { x: number; output: number | null }) {
  const response = output ?? 0;
  const body = useRef<Group>(null);
  const geometry = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!geometry.current) return;
    geometry.current.scale.setScalar(1); geometry.current.position.set(0, 0, 0);
    geometry.current.updateWorldMatrix(true, true);
    const { scale, position } = canonicalFlyTransform(new Box3().setFromObject(geometry.current, true).applyMatrix4(geometry.current.parent!.matrixWorld.clone().invert()));
    geometry.current.scale.setScalar(scale); geometry.current.position.copy(position);
  }, []);
  const abdomen = useMemo(() => [[0, 0], [.25, .08], [.36, .25], [.39, .48], [.37, .7], [.3, .94], [.19, 1.17], [.07, 1.36], [0, 1.42]].map(([r, z]) => new Vector2(r, z)), []);
  useFrame(({ invalidate }, delta) => {
    if (!body.current) return;
    const blend = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-Math.min(delta, .1) * 10);
    const targetY = response * .18, targetZ = response * .4;
    body.current.position.y += (targetY - body.current.position.y) * blend;
    body.current.position.z += (targetZ - body.current.position.z) * blend;
    body.current.rotation.x += (response * -.1 - body.current.rotation.x) * blend;
    if (Math.abs(targetY - body.current.position.y) + Math.abs(targetZ - body.current.position.z) > .001) invalidate();
  });
  return <group ref={body} name="procedural-fly" position={[x, 0, 0]}><group ref={geometry}>
    <mesh castShadow name="thorax" position={[0, .03, -.32]} scale={[.43, .4, .55]}><sphereGeometry args={[1, 40, 28]} /><meshStandardMaterial color="#71664f" roughness={.72} /></mesh>
    <mesh castShadow name="head" position={[0, .08, -1]} scale={[.39, .31, .32]}><sphereGeometry args={[1, 36, 24]} /><meshStandardMaterial color="#978464" roughness={.67} /></mesh>
    <mesh castShadow name="abdomen" position={[0, -.02, .06]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, .8]}><latheGeometry args={[abdomen, 48]} /><meshStandardMaterial color="#90744f" roughness={.62} /></mesh>
    {[[.33, .25], [.38, .47], [.37, .68], [.31, .9], [.21, 1.13], [.1, 1.32]].map(([r, z], i) => <mesh key={z} name={`abdominal-band-${i}`} position={[0, -.02, z + .06]} scale={[1, .8, 1]}><torusGeometry args={[r, .037, 8, 48]} /><meshStandardMaterial color="#28251e" roughness={.72} /></mesh>)}
    {[-1, 1].map(side => <group key={side}>
      <mesh name="compound-eye" position={[side * .31, .13, -1.04]} scale={[.24, .31, .3]} rotation={[0, side * -.16, 0]}><icosahedronGeometry args={[1, 3]} /><meshStandardMaterial color="#a12c23" roughness={.5} metalness={.05} flatShading /></mesh>
      <mesh position={[side * .14, .12, -1.34]} scale={[.08, .1, .14]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#a88e64" roughness={.6} /></mesh>
      <Rod from={[side * .17, .19, -1.38]} to={[side * .31, .39, -1.54]} radius={.012} />
      {[0, 1, 2].map(i => <Rod key={i} from={[side * (.22 + .025 * i), .26 + .035 * i, -1.43 - .025 * i]} to={[side * (.34 + .025 * i), .27 + .045 * i, -1.52 - .035 * i]} radius={.004} />)}
      <Wing side={side} response={response} />
      <Rod from={[side * .39, .08, .12]} to={[side * .61, .19, .36]} radius={.017} color={JOINT} />
      <mesh name="haltere" position={[side * .61, .19, .36]}><sphereGeometry args={[.07, 16, 12]} /><meshStandardMaterial color="#e4cc91" roughness={.55} /></mesh>
      {[
        [[.28, -.12, -.61], [.59, -.32, -.83], [.9, -.4, -1.24], [.92, -.7, -1.47], [1.12, -.75, -1.64]],
        [[.36, -.13, -.23], [.78, -.3, -.17], [1.13, -.4, -.04], [1.32, -.7, -.2], [1.55, -.75, -.32]],
        [[.3, -.12, .12], [.63, -.28, .5], [.86, -.38, .93], [1.13, -.7, 1.25], [1.35, -.75, 1.48]],
      ].map((limb, row) => {
        const points = limb.map(([x, y, z]) => [side * x, y, z] as Point);
        return <group key={row} name={`leg-${side}-${row}`}>
          {points.slice(1).map((to, i) => <Rod key={i} from={points[i]} to={to} radius={.043 - i * .009} color={i < 2 ? JOINT : CUTICLE} />)}
          {points.slice(1, 3).map((point, i) => <mesh key={i} position={point}><sphereGeometry args={[.045, 12, 8]} /><meshStandardMaterial color={CUTICLE} roughness={.7} /></mesh>)}
        </group>;
      })}
      {[-.56, -.36, -.15].map(z => <Rod key={z} from={[side * .2, .34, z]} to={[side * .32, .53, z + .03]} radius={.005} />)}
    </group>)}
    <mesh position={[0, -.15, -1.22]} rotation={[.35, 0, 0]}><capsuleGeometry args={[.065, .14, 4, 12]} /><meshStandardMaterial color="#65543e" roughness={.65} /></mesh>
  </group></group>;
}

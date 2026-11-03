import { Box3, Vector3 } from "three";

/** Camera composition only. Fit all eight visual-bound corners inside the viewport. */
export function fitComparisonBounds(bounds: Box3, aspect: number, fov: number, margin = 1.12, elevation = .45) {
  const target = bounds.getCenter(new Vector3());
  const direction = new Vector3(0, elevation, 1).normalize();
  const right = new Vector3(1,0,0), up = new Vector3().crossVectors(direction,right).normalize();
  const vertical = Math.tan(fov * Math.PI / 360), horizontal = vertical * Math.max(.1,aspect);
  let distance=1;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
    const corner=new Vector3(x,y,z).sub(target), depth=corner.dot(direction);
    distance=Math.max(distance,depth+Math.abs(corner.dot(right))*margin/horizontal,depth+Math.abs(corner.dot(up))*margin/vertical,depth+1);
  }
  return {target,position:target.clone().addScaledVector(direction,distance)};
}

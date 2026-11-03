import test from "node:test";
import assert from "node:assert/strict";
import { Box3,PerspectiveCamera,Vector3 } from "three";
import { fitComparisonBounds } from "./compare-camera";
test("comparison camera contains fly/arena/stimulus bounds for both and single views at all review aspect ratios",()=>{
 for(const aspect of [1,1.8,2,2.7,3.1])for(const both of [true,false]) {
  const b=new Box3(new Vector3(both?-4.7:-2.1,-.3,-6.5),new Vector3(both?4.7:2.1,2.5,2.4));
  const fit=fitComparisonBounds(b,aspect,34,1.12,both ? .45 : .2);const c=new PerspectiveCamera(34,aspect,.1,100);c.position.copy(fit.position);c.lookAt(fit.target);c.updateMatrixWorld();
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]) {const p=new Vector3(x,y,z).project(c);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1&&p.z>-1);}
 }
});

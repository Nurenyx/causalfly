"""CausalFly hackathon web derivative, NOT newly authored anatomical geometry.

Run: blender --background --python-exit-code 1 --python scripts/convert-flyv2-web.py
     -- --source <read-only FlyV2 directory> --output <CausalFly output> --lod 1
FlyBody contributors / Google DeepMind / HHMI Janelia; Apache-2.0.
See the copied source license, source-lock.json and web-build.json beside the GLB.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys

import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--lod', type=int, choices=[0, 1], default=1)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(__file__).resolve().parents[1]
source = args.source.resolve()
output = args.output.resolve()
if not output.is_relative_to(root) or output.is_relative_to(source):
    raise RuntimeError('Output must stay inside CausalFly and outside the source repository')
report = json.loads((source / 'build-report.json').read_text())
lock_path = source.parents[5] / 'tools/blender/fly_v2/source-lock.json'
# The explicitly provided source repo has a pinned upstream lock; require it.
source_repo = source.parents[5]
lock = json.loads(lock_path.read_text())
assert report['source_sex'] == 'female' and report['male_modifications'] == []
assert report['source_commit'] == lock['commit']
assert report['source_sha256'] == '88c13449572924557ee77e3da2a318643b8a987ac1c7a60b77ed164faa29bead'
license_bytes = (source / 'LICENSE-FlyBody.txt').read_bytes()
assert b'Apache License' in license_bytes
output.mkdir(parents=True, exist_ok=True)
fbx = source / f'Runtime/FlyVisualV2_LOD{args.lod}.fbx'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(fbx))

# FBX cannot round-trip the custom Blender wing shader. Rebuild compatible glTF
# PBR from the existing atlases; retain all anatomical triangles and the rig.
images = {}
for name in ['BaseColor', 'Normal', 'Roughness']:
    img = bpy.data.images.load(str(source / f'Textures/FlyV2_{name}.png'), check_existing=True)
    img.colorspace_settings.name = 'sRGB' if name == 'BaseColor' else 'Non-Color'
    images[name] = img
for mat in bpy.data.materials:
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    bsdf.inputs['Metallic'].default_value = 0.0
    wing = 'Wings' in mat.name
    mat.use_backface_culling = not wing
    for name, socket in [('BaseColor', 'Base Color'), ('Roughness', 'Roughness')]:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = images[name]
        if not wing or name != 'BaseColor':
            links.new(tex.outputs['Color'], bsdf.inputs[socket])
    normal = nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = .12 if not wing else .035
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = images['Normal']
    links.new(tex.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    if wing:
        # Neutral translucent membrane; opaque veins remain in the chitin region.
        # No white diffuse atlas color and no refraction/render-target dependency.
        bsdf.inputs['Base Color'].default_value = (.25, .32, .34, 1)
        bsdf.inputs['Alpha'].default_value = .16
        mat.surface_render_method = 'DITHERED'
    mat['web_modification'] = 'CausalFly compatible glTF PBR reconstruction; authored approximation, not measured optical data'

scene = bpy.context.scene
scene['source_credit'] = lock['attribution']['credit']
scene['source_sex'] = report['source_sex']
scene['male_modifications'] = '[]'
scene['upstream_commit'] = lock['commit']
scene['web_modifications'] = 'Hackathon web conversion/integration; existing LOD geometry and rig retained, compatible PBR reconstruction'
glb_path = output / 'FlyVisualV2_Web.glb'
bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format='GLB', export_animations=False,
    export_yup=True, export_extras=True, export_cameras=False, export_lights=False,
    export_image_format='AUTO', export_materials='EXPORT', export_skins=True)
data = glb_path.read_bytes()
json_len = struct.unpack_from('<I', data, 12)[0]
gltf = json.loads(data[20:20 + json_len])
primitives = [p for mesh in gltf['meshes'] for p in mesh['primitives']]
accessors = gltf['accessors']
texture_metrics = []
for img in gltf.get('images', []):
    view = gltf['bufferViews'][img['bufferView']]
    texture_metrics.append({'name': img['name'], 'mime_type': img['mimeType'], 'bytes': view['byteLength'], 'width': 1024, 'height': 1024})
manifest = {
    'schema_version': 1, 'conversion_date': '2026-10-29', 'blender': bpy.app.version_string,
    'source_asset': f'clients/quest3/Assets/FruitFlyXR/Art/FlyV2/Runtime/{fbx.name}',
    'source_asset_sha256': hashlib.sha256(fbx.read_bytes()).hexdigest(),
    'fruitfly_xr_checkout': subprocess.check_output(['git', '-C', str(source_repo), 'rev-parse', 'HEAD'], text=True).strip(),
    'upstream_repository': lock['repository'], 'upstream_commit': lock['commit'],
    'upstream_blend_sha256': report['source_sha256'], 'source_sex': report['source_sex'], 'male_modifications': [],
    'credit': lock['attribution']['credit'], 'license': 'Apache-2.0',
    'pre_hackathon': 'Underlying FlyBody anatomical mesh and FruitFly XR FlyV2 derivative predate the hackathon. Only this web conversion and CausalFly integration were performed during the hackathon.',
    'geometry': 'Existing runtime LOD triangles and 92-bone rig preserved, no additional anatomical vertices or decimation; glTF splits vertices at material/normal/UV seams.',
    'method': 'Blender FBX import -> glTF PBR reconstruction with original 1024px atlases -> binary glTF export, no animation tracks, no compression decoder or CDN',
    'appearance': report['appearance'], 'web_wings': 'Double-sided neutral membrane, alpha 0.16; veins remain opaque source geometry. Compatible authored approximation, not measured optical data.',
    'source_vertices': report[f'lod{args.lod}']['vertices'],
    'vertices': sum(accessors[p['attributes']['POSITION']]['count'] for p in primitives),
    'triangles': sum(accessors[p['indices']]['count'] // 3 for p in primitives),
    'material_primitives': len(primitives), 'joints': len(gltf['skins'][0]['joints']),
    'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'textures': texture_metrics,
    'retained_maps': ['FlyV2_BaseColor.png', 'FlyV2_Normal.png', 'FlyV2_Roughness.png (repacked into glTF metallic-roughness G)'],
    'omitted_map': 'Unity MetallicSmoothness is redundant with the roughness atlas; metallic remains zero.',
}
(output / 'web-build.json').write_text(json.dumps(manifest, indent=2) + '\n')
(output / 'LICENSE-FlyBody.txt').write_bytes(license_bytes)
shutil.copyfile(source / 'build-report.json', output / 'source-build-report.json')
shutil.copyfile(lock_path, output / 'source-lock.json')
print('WEB_BUILD', json.dumps(manifest))

# convert.py: one source model (FBX, .blend, glTF/GLB or OBJ) -> one normalized GLB with its animations, plus a JSON
# report. Runs in Blender's Python module (pip install bpy==4.2.0 on Python 3.11), never inside a downloaded folder:
#
#   python3.11 -I harness/library/convert.py --in <source> --out <file.glb> --report <file.json>
#       [--height 1.6] [--yaw 0] [--drop name,name] [--keep-actions a,b]
#
# Normalizing: every top-level object goes under one empty named "root" (exported as the glTF root node). Its scale
# makes the rest-pose bbox --height metres tall, --yaw (degrees about up) turns the face to +Z, and its translation
# puts the lowest rest point on y = 0 and the bbox centre on x = z = 0. Blender is Z-up and the glTF exporter maps
# Blender -Y to glTF +Z, so "faces +Z" means the face points to Blender -Y after the yaw.
# Scripts inside .blend files never run: auto-execution stays off.

import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector


def parse():
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="src", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--report", required=True)
    p.add_argument("--height", type=float, default=0.0, help="target rest height in metres (0 = keep the source scale)")
    p.add_argument("--yaw", type=float, default=0.0, help="degrees about up, applied before measuring")
    p.add_argument("--drop", default="", help="comma list of object names to delete (cameras and lights always go)")
    p.add_argument("--keep-actions", default="", help="comma list: export only these actions (default all)")
    return p.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:])


def srgb(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hexof(rgb):
    return "#" + "".join(f"{round(srgb(v) * 255):02x}" for v in rgb[:3])


def material_color(mat):
    """The flat colour a material shows: Principled base colour, or the viewport diffuse colour."""
    if mat is None:
        return None
    if mat.use_nodes and mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                sock = n.inputs.get("Base Color")
                if sock is not None and not sock.is_linked:
                    return hexof(sock.default_value)
                if sock is not None and sock.is_linked:
                    return "texture"
    return hexof(mat.diffuse_color)


def load(src):
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    low = src.lower()
    if low.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=src, load_ui=False, use_scripts=False)
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if low.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=src, ignore_leaf_bones=True, automatic_bone_orientation=False)
    elif low.endswith(".glb") or low.endswith(".gltf"):
        bpy.ops.import_scene.gltf(filepath=src)
    elif low.endswith(".obj"):
        bpy.ops.wm.obj_import(filepath=src)
    else:
        raise SystemExit(f"convert: unknown source type {src}")


def mesh_points(objs):
    """World-space vertices of every mesh as evaluated now (armature modifiers included)."""
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        mw = ev.matrix_world
        pts.extend(mw @ v.co for v in me.vertices)
        ev.to_mesh_clear()
    return pts


def main():
    a = parse()
    load(a.src)
    scene = bpy.context.scene
    drop = {s for s in a.drop.split(",") if s}
    for o in list(scene.objects):
        if o.type in {"CAMERA", "LIGHT"} or o.name in drop:
            bpy.data.objects.remove(o, do_unlink=True)

    arms = [o for o in scene.objects if o.type == "ARMATURE"]
    for arm in arms:
        arm.data.pose_position = "REST"
    bpy.context.view_layer.update()

    # One root above everything, so the whole normalization is one node transform.
    root = bpy.data.objects.new("root", None)
    scene.collection.objects.link(root)
    for o in list(scene.objects):
        if o is not root and o.parent is None:
            mw = o.matrix_world.copy()
            o.parent = root
            o.matrix_world = mw
    root.rotation_mode = "XYZ"
    root.rotation_euler = (0.0, 0.0, math.radians(a.yaw))
    bpy.context.view_layer.update()

    objs = [o for o in scene.objects if o.type == "MESH"]
    pts = mesh_points(objs)
    if not pts:
        raise SystemExit("convert: no meshes")
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    h = hi.z - lo.z
    s = a.height / h if a.height > 0 else 1.0
    # Scale about the world origin, then move the scaled bbox: centre x/y to 0, bottom to z = 0.
    root.scale = (s, s, s)
    root.location = (-(lo.x + hi.x) / 2 * s, -(lo.y + hi.y) / 2 * s, -lo.z * s)
    bpy.context.view_layer.update()
    pts = mesh_points(objs)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))

    for arm in arms:
        arm.data.pose_position = "POSE"

    # "Armature|Armature|Run" (FBX import) -> "Run": clip names are the last segment, kept unique.
    taken = set()
    for act in list(bpy.data.actions):  # a copy: renaming re-sorts the collection
        if act.id_root not in {"OBJECT"}:
            act.id_root = "OBJECT"  # FBX imports leave it unset, and the glTF exporter then skips the action
        short = act.name.split("|")[-1] or act.name
        while short in taken:
            short += "_"
        taken.add(short)
        act.name = short

    keep = [s for s in a.keep_actions.split(",") if s]
    actions = []
    for act in list(bpy.data.actions):
        if keep and act.name not in keep:
            act.use_fake_user = False
            bpy.data.actions.remove(act)
            continue
        f0, f1 = act.frame_range
        actions.append({"name": act.name, "frames": [f0, f1], "seconds": round((f1 - f0) / scene.render.fps, 4)})

    mats = {}
    tris = 0
    for o in objs:
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
        for slot in o.material_slots:
            if slot.material and slot.material.name not in mats:
                mats[slot.material.name] = material_color(slot.material)

    bpy.ops.export_scene.gltf(
        filepath=a.out,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_skins=True,
        export_morph=True,
        export_lights=False,
        export_cameras=False,
        export_extras=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    report = {
        "source": a.src,
        "scale": s,
        "yaw": a.yaw,
        "bbox_blender_zup": {"min": list(lo), "max": list(hi)},
        "height": hi.z - lo.z,
        "triangles": tris,
        "meshes": [o.name for o in objs],
        "armatures": [o.name for o in arms],
        "bones": sum(len(o.data.bones) for o in arms),
        "materials": mats,
        "actions": actions,
        "fps": scene.render.fps,
    }
    with open(a.report, "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: report[k] for k in ("height", "triangles", "bones")}))


main()
sys.stdout.flush()
os._exit(0)  # bpy can crash while tearing down at interpreter exit; the work is done and written

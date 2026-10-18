# convert.py: one source model (FBX, .blend, glTF/GLB or OBJ) -> one normalized GLB with its animations, plus a JSON
# report. Runs in Blender's Python module (pip install bpy==4.2.0 on Python 3.11), never inside a downloaded folder:
#
#   python3.11 -I harness/library/convert.py --in <source> --out <file.glb> --report <file.json>
#       [--height 1.6] [--yaw 0] [--drop name,name] [--keep-actions a,b]
#       [--attach '{"file": "<prop>", "bone": "handslot.r", "offset": [x,y,z], "rotation": [x,y,z], "scale": 1}' ...]
#
# --attach (repeatable): a prop file (glTF/GLB, FBX or OBJ) imported at the rest pose and parented rigidly to a bone
# before normalizing, so it is measured, exported and follows every clip (see attach()).
#
# A second armature that only follows a bone of the main one through Child Of constraints (eyes on their own rig) is
# merged into it before export, since the glTF exporter writes all actions only for a single armature (see
# merge_constraint_rigs()).
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
import re
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
    p.add_argument("--drop-materials", default="", help="comma list: delete every face using these materials (a hat on the body mesh)")
    p.add_argument("--search", default="", help="folder searched by file name for images the source cannot find (a .blend expecting its texture beside it)")
    p.add_argument("--max-colors", type=int, default=12, help="textured materials: at most this many flat colours per material")
    p.add_argument("--attach", action="append", default=[], help='JSON {"file", "bone", "offset", "rotation", "scale"}: a prop parented to a bone (repeatable)')
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


def legacy_image():
    """The one colour image of an old Blender Internal file, or None. Those materials have no nodes and Blender 2.8+
    drops their texture slots, but the image textures survive in bpy.data.textures. Used only when exactly one loaded
    image is left after leaving out normal maps, so a guess never picks between two candidates."""
    found = set()
    for t in bpy.data.textures:
        img = getattr(t, "image", None)
        if t.type != "IMAGE" or img is None or img.size[0] == 0:
            continue
        if getattr(t, "use_normal_map", False) or "norm" in (t.name + img.name + img.filepath).lower():
            continue
        found.add(img.name)
    return bpy.data.images[found.pop()] if len(found) == 1 else None


def base_image(mat):
    """The image feeding a material's colour (through up to three nodes), or None."""
    if mat and not mat.use_nodes:
        return legacy_image()
    if not (mat and mat.use_nodes and mat.node_tree):
        return None
    # Principled "Base Color", or "Color" on the older shaders (Diffuse, Emission, Toon, Glossy)
    for n in mat.node_tree.nodes:
        if n.type in {"BSDF_PRINCIPLED", "BSDF_DIFFUSE", "EMISSION", "BSDF_TOON", "BSDF_GLOSSY"}:
            sock = n.inputs.get("Base Color") or n.inputs.get("Color")
            if sock is None or not sock.is_linked:
                continue
            src = sock.links[0].from_node
            for _ in range(3):
                if src.type == "TEX_IMAGE":
                    return src.image
                ins = [i for i in src.inputs if i.is_linked]
                if not ins:
                    return None
                src = ins[0].links[0].from_node
    return None


def split_textures(objs, max_colors):
    """Textured materials -> flat ones. Each face takes the texel at its UV centroid; all faces of one source material
    (across every object) are clustered (k-means in sRGB, weighted by face area, at most max_colors, seeded by the
    most-covered colours so the result is deterministic) and each cluster becomes a material "<material>#rrggbb" with
    that flat colour. Roles then map per colour, as for flat-coloured packs."""
    import numpy as np

    groups = {}  # material name -> list of (object, polygon index, rgb, area)
    pixels = {}
    for o in objs:
        me = o.data
        if not me.uv_layers.active:
            continue
        uv = me.uv_layers.active.data
        for slot_i, slot in enumerate(o.material_slots):
            img = base_image(slot.material)
            if img is None or img.size[0] == 0:
                continue
            if img.name not in pixels:
                w, h = img.size
                px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, img.channels)[:, :, :3]
                if img.colorspace_settings.name != "sRGB":  # linear data: to sRGB for clustering and hex
                    px = np.where(px <= 0.0031308, px * 12.92, 1.055 * np.power(np.clip(px, 0, 1), 1 / 2.4) - 0.055)
                pixels[img.name] = px
            px = pixels[img.name]
            h, w = px.shape[:2]
            g = groups.setdefault(slot.material.name, [])
            for p in me.polygons:
                if p.material_index != slot_i:
                    continue
                u = sum(uv[i].uv[0] for i in p.loop_indices) / p.loop_total
                v = sum(uv[i].uv[1] for i in p.loop_indices) / p.loop_total
                g.append((o, p.index, px[int((v % 1.0) * h) % h, int((u % 1.0) * w) % w], max(p.area, 1e-9)))
    made = {}
    for base, faces in groups.items():
        if not faces:  # a slot no face uses
            continue
        cols = np.array([f[2] for f in faces])
        area = np.array([f[3] for f in faces])
        keys = np.round(cols * 255).astype(int)
        cover = {}
        for c, a in zip(map(tuple, keys), area):
            cover[c] = cover.get(c, 0) + a
        k = min(max_colors, len(cover))
        cent = np.array(sorted(cover, key=lambda c: (-cover[c], c))[:k], dtype=np.float32) / 255
        for _ in range(25):
            lab = np.argmin(((cols[:, None, :] - cent[None, :, :]) ** 2).sum(-1), axis=1)
            for j in range(k):
                m = lab == j
                if m.any():
                    cent[j] = (cols[m] * area[m, None]).sum(0) / area[m].sum()
        lab = np.argmin(((cols[:, None, :] - cent[None, :, :]) ** 2).sum(-1), axis=1)
        mats = {}
        for j in sorted(set(int(x) for x in lab)):
            hexc = "#" + "".join(f"{int(round(min(max(c, 0), 1) * 255)):02x}" for c in cent[j])
            name = f"{base}{hexc}"
            mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
            lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in cent[j]]
            mat.diffuse_color = (*lin, 1.0)
            mat.use_nodes = True
            mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin, 1.0)
            mats[j] = mat
            made[name] = hexc
        slot_of = {}
        for (o, pi, _, _), j in zip(faces, lab):
            mat = mats[int(j)]
            key = (o.name, mat.name)
            if key not in slot_of:
                idx = next((i for i, m in enumerate(o.data.materials) if m == mat), None)
                if idx is None:
                    o.data.materials.append(mat)
                    idx = len(o.data.materials) - 1
                slot_of[key] = idx
            o.data.polygons[pi].material_index = slot_of[key]
    # textured slots no face uses any more export nothing: the glTF exporter writes only used materials
    return made


def clip_name(name, arms):
    """'Armature|Armature|Run' -> 'Run'; 'root|idle|Animation Base Layer' (FBX take|layer) -> 'idle'. Drops layer
    names and leading armature/object names, keeps the last segment that is left."""
    parts = [p for p in name.split("|") if p]
    parts = [p for p in parts if not re.fullmatch(r"(animation\s*)?base\s*layer(\.\d+)?", p, re.I)] or parts
    skip = {"armature", "root", "rig"} | {a.name.lower() for a in arms}
    keep = [p for p in parts if p.lower() not in skip] or parts
    return keep[-1] if keep else name


def principled_everywhere():
    """The glTF exporter reads colour from a Principled BSDF only. Older files colour materials with a Diffuse,
    Emission or Glossy shader node (or no nodes at all), so they would all export as one grey and then be merged:
    give each such material a Principled BSDF carrying its real flat colour."""
    for m in bpy.data.materials:
        if m.use_nodes and m.node_tree and any(n.type == "BSDF_PRINCIPLED" for n in m.node_tree.nodes):
            continue
        col = tuple(m.diffuse_color)
        if m.use_nodes and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type in {"BSDF_DIFFUSE", "EMISSION", "BSDF_GLOSSY", "BSDF_TOON"} and "Color" in n.inputs and not n.inputs["Color"].is_linked:
                    col = tuple(n.inputs["Color"].default_value)
                    break
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        p = nt.nodes.new("ShaderNodeBsdfPrincipled")
        o = nt.nodes.new("ShaderNodeOutputMaterial")
        p.inputs["Base Color"].default_value = (*col[:3], 1.0)
        nt.links.new(p.outputs[0], o.inputs["Surface"])
        m.diffuse_color = (*col[:3], 1.0)


def drop_material_faces(objs, names):
    """Delete the faces whose material is in names, then any loose vertices: removes a part (a hat, a prop) that
    shares one mesh with the body, where ingest.drop (whole objects) cannot reach."""
    import bmesh

    for o in objs:
        idx = {i for i, slot in enumerate(o.material_slots) if slot.material and slot.material.name in names}
        if not idx:
            continue
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in idx], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()


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


def relink_images(root):
    """Point every image whose file is missing at the file of the same name under root (the unpacked pack)."""
    if not root:
        return
    found = {}
    for d, _, files in os.walk(root):
        for f in files:
            found.setdefault(f.lower(), os.path.join(d, f))
    for img in bpy.data.images:
        if img.source != "FILE" or img.packed_file:
            continue
        cur = bpy.path.abspath(img.filepath)
        if cur and os.path.isfile(cur):
            continue
        hit = found.get(bpy.path.basename(img.filepath.replace("\\", "/")).lower())
        if hit:
            img.filepath = hit
            img.reload()


# The importers turn a file's Y-up axes into Blender's Z-up; this turns them back, so a prop's own axes line up with
# the bone's axes the way an engine attaches it (the prop's scene under the bone's node with an identity transform).
ZUP_TO_FILE = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


def attach(spec, arms):
    """Import one prop and parent its top-level objects to an armature bone at rest (bone parenting, rigid). The
    prop's origin sits on the bone's head and its file axes on the bone's axes (KayKit's handslot bones are oriented
    for weapons); then offset (in the bone's frame, source units), rotation (degrees XYZ about the bone's axes) and
    scale apply. Materials keep their names; one that collides with a material already in the scene is named
    "<name>@<file stem>" (instead of Blender's "<name>.001"), so meta.materials can map the prop on its own."""
    path, bone_name = spec["file"], spec["bone"]
    arm = next((o for o in arms if bone_name in o.data.bones), None)
    if arm is None:
        raise SystemExit(f"convert: --attach {os.path.basename(path)}: no armature has a bone {bone_name!r}")
    scene = bpy.context.scene
    before = set(scene.objects)
    mats_before = set(bpy.data.materials)
    names_before = {m.name for m in mats_before}
    low = path.lower()
    if low.endswith(".glb") or low.endswith(".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif low.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path, ignore_leaf_bones=True, automatic_bone_orientation=False)
    elif low.endswith(".obj"):
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f"convert: --attach: unknown prop type {path}")
    stem = os.path.splitext(os.path.basename(path))[0]
    for m in [m for m in bpy.data.materials if m not in mats_before]:
        base = re.sub(r"\.\d{3}$", "", m.name)
        if base != m.name and base in names_before:
            m.name = f"{base}@{stem}"
    new = [o for o in scene.objects if o not in before]
    for o in [o for o in new if o.type in {"CAMERA", "LIGHT"} or o.hide_render]:
        new.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
    meshes = sorted(o.name for o in new if o.type == "MESH")
    if not meshes:
        raise SystemExit(f"convert: --attach {os.path.basename(path)}: no meshes")
    from mathutils import Euler

    rot = Euler([math.radians(v) for v in (spec.get("rotation") or (0, 0, 0))], "XYZ")
    local = Matrix.Translation(Vector(spec.get("offset") or (0, 0, 0))) @ rot.to_matrix().to_4x4() @ Matrix.Scale(float(spec.get("scale", 1)), 4)
    head = arm.matrix_world @ arm.data.bones[bone_name].matrix_local  # the bone's head and axes at rest
    bpy.context.view_layer.update()
    for o in sorted((o for o in new if o.parent is None), key=lambda o: o.name):
        world = head @ local @ ZUP_TO_FILE @ o.matrix_world
        o.parent = arm
        o.parent_type = "BONE"
        o.parent_bone = bone_name
        o.matrix_parent_inverse = Matrix.Identity(4)
        bpy.context.view_layer.update()
        o.matrix_world = world  # Blender keeps a bone child at the bone's tail; this puts it back on the head
    bpy.context.view_layer.update()
    return meshes


def merge_constraint_rigs(arms):
    """Fold secondary armatures into the one they follow, so the export has one armature (Blender 4.2's glTF exporter
    writes every action only when there is exactly one; with two it writes the active ones, and none are active here).
    A secondary armature qualifies when it is not animated, every bone is parentless and held by one enabled Child Of
    constraint (influence 1, all nine channels) to a bone of one other armature, and every mesh it deforms is deformed
    by it alone and has no shape keys. Each such mesh is baked where it sits now (the main rig at rest, the
    constraints evaluated), re-skinned rigidly to the constraint target bones (a vertex's weights move from each
    secondary bone to that bone's target; a vertex with no weight goes whole to the target of a one-bone rig) and
    parented to the main armature; other children follow their bone's target; the secondary armature is deleted.
    The 2018 Quaternius monsters hang their eyes this way (EyeArmature -> BatArmature's Face). A source with one
    armature is untouched. Returns {secondary armature: main armature} for what was merged."""
    scene = bpy.context.scene
    merged = {}
    for s in list(arms):
        ad = s.animation_data
        if ad and (ad.action or len(ad.nla_tracks) or len(ad.drivers)) or not s.data.bones:
            continue
        target = {}  # secondary bone -> main bone
        main = set()
        for pb in s.pose.bones:
            live = [c for c in pb.constraints if not c.mute and c.influence > 0]
            c = live[0] if len(live) == 1 else None
            if (
                pb.parent is not None
                or c is None
                or c.type != "CHILD_OF"
                or c.influence != 1.0
                or c.target is None
                or c.target is s
                or c.target.type != "ARMATURE"
                or c.subtarget not in c.target.data.bones
                or not all(getattr(c, f"use_{k}_{ax}") for k in ("location", "rotation", "scale") for ax in "xyz")
            ):
                break
            target[pb.name] = c.subtarget
            main.add(c.target)
        else:
            if len(main) != 1:
                continue
            t = main.pop()
            meshes = [o for o in scene.objects if o.type == "MESH" and any(m.type == "ARMATURE" and m.object is s for m in o.modifiers)]
            if any(o.data.shape_keys or any(m.type == "ARMATURE" and m.object not in (None, s) for m in o.modifiers) for o in meshes):
                continue
            # Where every secondary bone puts its vertices now, with the main armature at rest (world space).
            s.data.pose_position = "POSE"
            bpy.context.view_layer.update()
            sw = s.matrix_world
            deform = {b.name: sw @ s.pose.bones[b.name].matrix @ b.matrix_local.inverted() @ sw.inverted() for b in s.data.bones}
            plan = []
            for o in meshes:
                mw = o.matrix_world.copy()
                verts = []
                for v in o.data.vertices:
                    ws = [(o.vertex_groups[g.group].name, g.weight) for g in v.groups if g.weight > 0 and o.vertex_groups[g.group].name in deform]
                    if not ws:
                        if len(deform) != 1:
                            break
                        ws = [(next(iter(deform)), 1.0)]
                    tot = sum(w for _, w in ws)
                    p = mw @ v.co
                    q = Vector((0.0, 0.0, 0.0))
                    new = {}
                    for name, w in ws:
                        q += (deform[name] @ p) * (w / tot)
                        new[target[name]] = new.get(target[name], 0.0) + w / tot
                    verts.append((q, new))
                else:
                    plan.append((o, mw, verts))
                    continue
                break
            else:
                for o, mw, verts in plan:
                    for m in [m for m in o.modifiers if m.type == "ARMATURE" and m.object in (None, s)][1:]:
                        o.modifiers.remove(m)  # an empty armature modifier deforms nothing but hides the skin from the exporter
                    mod = next(m for m in o.modifiers if m.type == "ARMATURE")
                    mod.object = t
                    o.vertex_groups.clear()
                    groups = {}
                    o.parent = t
                    o.parent_type = "OBJECT"
                    o.matrix_parent_inverse = Matrix.Identity(4)
                    bpy.context.view_layer.update()
                    o.matrix_world = mw
                    bpy.context.view_layer.update()
                    inv = o.matrix_world.inverted()
                    for v, (q, new) in zip(o.data.vertices, verts):
                        v.co = inv @ q
                        for bone, w in new.items():
                            if bone not in groups:
                                groups[bone] = o.vertex_groups.new(name=bone)
                            groups[bone].add([v.index], w, "REPLACE")
                    o.data.update()
                for o in [o for o in s.children if o not in meshes]:
                    mw = o.matrix_world.copy()
                    bone = target.get(o.parent_bone) if o.parent_type == "BONE" else None
                    o.parent = t
                    o.parent_type = "BONE" if bone else "OBJECT"
                    o.parent_bone = bone or ""
                    o.matrix_parent_inverse = Matrix.Identity(4)
                    bpy.context.view_layer.update()
                    o.matrix_world = mw
                merged[s.name] = t.name
                bpy.data.objects.remove(s, do_unlink=True)
                bpy.context.view_layer.update()
                continue
            s.data.pose_position = "REST"
            bpy.context.view_layer.update()
    return merged


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
    relink_images(a.search)
    scene = bpy.context.scene
    drop = {s for s in a.drop.split(",") if s}
    # Bone display shapes (custom_shape) are rig widgets, not part of the model; render-hidden objects too.
    widgets = {pb.custom_shape.name for o in scene.objects if o.type == "ARMATURE" for pb in o.pose.bones if pb.custom_shape}
    for o in list(scene.objects):
        if o.type in {"CAMERA", "LIGHT"} or o.name in drop or o.name in widgets or o.hide_render:
            bpy.data.objects.remove(o, do_unlink=True)

    # The exported bone transforms must be the rest pose that gets measured: unassign any active action (importers
    # assign one) and clear every pose bone. The actions themselves are still exported.
    arms = [o for o in scene.objects if o.type == "ARMATURE"]
    for arm in arms:
        if arm.animation_data:
            arm.animation_data.action = None
        for pb in arm.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            pb.rotation_euler = (0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)
        arm.data.pose_position = "REST"
    bpy.context.view_layer.update()
    # A second armature that only follows a bone of the first (eyes on a Child Of rig) is folded into it.
    merged = merge_constraint_rigs(arms) if len(arms) > 1 else {}
    if merged:
        arms = [o for o in scene.objects if o.type == "ARMATURE"]
        print("convert: merged " + ", ".join(f"{k} -> {v}" for k, v in merged.items()))
    if len(arms) > 1:
        print(f"convert: warn: {len(arms)} armatures ({', '.join(o.name for o in arms)}): the glTF exporter writes only their active actions")

    # Props parented to bones (a sword in a hand slot), at rest and before measuring, so they count in the bbox.
    attached = {}
    for spec in map(json.loads, a.attach):
        attached[os.path.basename(spec["file"])] = {"bone": spec["bone"], "meshes": attach(spec, arms)}

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
    dropm = {s for s in a.drop_materials.split(",") if s}
    if dropm:
        drop_material_faces(objs, dropm)
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

    # "Armature|Armature|Run" (FBX import) -> "Run": clip names are the last segment, kept unique. A suffix every
    # action shares that is an armature's name ("Idle_Rig", glTF import) goes too.
    names = [clip_name(act.name, arms) for act in bpy.data.actions]
    for arm in arms:
        suf = "_" + arm.name
        if names and all(n.endswith(suf) for n in names):
            for act in bpy.data.actions:
                if act.name.endswith(suf):
                    act.name = act.name[: -len(suf)]
            break
    taken = set()
    for act in list(bpy.data.actions):  # a copy: renaming re-sorts the collection
        if act.id_root not in {"OBJECT", "KEY"}:
            act.id_root = "OBJECT"  # FBX imports leave it unset, and the glTF exporter then skips the action
            # (shape-key actions keep "KEY": the exporter pairs them with their mesh, and crashes if they look like objects)
        short = clip_name(act.name, arms)
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

    split = split_textures(objs, a.max_colors)
    principled_everywhere()
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
        "textureSplit": split,
        "actions": actions,
        "fps": scene.render.fps,
    }
    if attached:
        report["attached"] = attached
    if merged:
        report["mergedArmatures"] = merged
    with open(a.report, "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps({k: report[k] for k in ("height", "triangles", "bones")}))


main()
sys.stdout.flush()
os._exit(0)  # bpy can crash while tearing down at interpreter exit; the work is done and written

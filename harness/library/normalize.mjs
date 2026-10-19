// normalize.mjs — the Blender-free path for GLB sources (ingest.via = "gltf"). The source's nodes, skins, morphs and
// clips stay byte-for-byte; only one node is added: "root", above the scene's top nodes, whose scale, rotation (yaw
// about +Y) and translation give the same normalization convert.py does (height, face +Z, on y = 0, centred).
// Use it when Blender's glTF round trip damages a rig (rigid parts parented to bones, morph-weight clips) or renames
// clips. Textured materials are not flattened on this path.

import { loadThree, loadGltfTools } from "../lab/probe.mjs";
import { measure } from "../lab/inspect.js";

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("normalize: not a GLB (use via convert for .gltf, FBX, .blend)");
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString("utf8", 20, 20 + jsonLen));
  const rest = buf.subarray(20 + jsonLen); // the BIN chunk (header included), kept as is
  return { json, rest };
}

function writeGlb(json, rest) {
  let text = Buffer.from(JSON.stringify(json));
  if (text.length % 4) text = Buffer.concat([text, Buffer.alloc(4 - (text.length % 4), 0x20)]);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + text.length + rest.length, 8);
  head.writeUInt32LE(text.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([head, text, rest]);
}

const srgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hex = (rgb) => "#" + rgb.slice(0, 3).map((c) => Math.round(Math.min(1, Math.max(0, srgb(c))) * 255).toString(16).padStart(2, "0")).join("");

/** GLB bytes -> { glb, report } with the normalization in a new root node. */
export async function normalizeGlb(buf, { height = 0, yaw = 0 } = {}) {
  const THREE = await loadThree();
  const { GLTFLoader, MeshoptDecoder } = await loadGltfTools();
  await MeshoptDecoder.ready;
  // Measure a copy without images: an external texture (a .png beside the GLB) can't load in Node, and the size
  // doesn't depend on it.
  const bare = readGlb(buf);
  delete bare.json.images;
  delete bare.json.textures;
  delete bare.json.samplers;
  for (const m of bare.json.materials || []) {
    if (m.pbrMetallicRoughness) {
      delete m.pbrMetallicRoughness.baseColorTexture;
      delete m.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete m.normalTexture;
    delete m.occlusionTexture;
    delete m.emissiveTexture;
    delete m.extensions;
  }
  const measured = writeGlb(bare.json, bare.rest);
  const ab = measured.buffer.slice(measured.byteOffset, measured.byteOffset + measured.length);
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(ab, "", resolve, reject));

  // Measure the rest pose (node transforms as stored), turned by the yaw.
  const turn = new THREE.Group();
  turn.rotation.y = (yaw * Math.PI) / 180;
  turn.add(gltf.scene);
  const M0 = measure(THREE, turn);
  const s = height > 0 ? height / M0.size[1] : 1;
  const t = [-((M0.min[0] + M0.max[0]) / 2) * s, -M0.min[1] * s, -((M0.min[2] + M0.max[2]) / 2) * s];

  const { json, rest } = readGlb(buf);
  const si = json.scene ?? 0;
  const top = json.scenes[si].nodes;
  const half = (yaw * Math.PI) / 360;
  json.nodes.push({ name: "root", children: top, scale: [s, s, s], rotation: [0, Math.sin(half), 0, Math.cos(half)], translation: t });
  json.scenes[si].nodes = [json.nodes.length - 1];

  const materials = {};
  for (const m of json.materials || []) {
    const pbr = m.pbrMetallicRoughness || {};
    materials[m.name || "(unnamed)"] = pbr.baseColorTexture ? "texture" : hex(pbr.baseColorFactor || [1, 1, 1, 1]);
  }
  const joints = new Set((json.skins || []).flatMap((k) => k.joints));
  const report = {
    height: M0.size[1] * s,
    triangles: M0.tris,
    bones: joints.size,
    materials,
    actions: gltf.animations.map((a) => ({ name: a.name, seconds: Math.round(a.duration * 10000) / 10000 })),
    morphs: [...new Set((json.meshes || []).flatMap((m) => Object.keys(m.extras?.targetNames || {}).length ? m.extras.targetNames : []))],
  };
  return { glb: writeGlb(json, rest), report };
}

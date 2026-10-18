// library.js — a library model (models/library/<id>/: meta.json + model.glb) as a cel model. ES module, no imports:
// THREE, the kit and the parsed glTF are passed in, so this file can be pasted into a film next to kit.js.
//
//   const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("models/horse/model.glb");
//   const horse = buildLibrary(THREE, kit, gltf, meta);          // meta = the entry's meta.json, parsed
//   horse.pose("run@0.25");                                      // clip "run" at 0.25 s; "rest"; or a name in meta.poseDefs
//
// Every source material maps to a colour role (meta.materials: material name -> role), and the role to a two-tone pair
// from the film's script (colors[role], colors[role + "Shade"]), exactly like a code model's colours. Skinned meshes
// get the kit's skinned cel shader and a skinned ink hull. Animation is a pure function of the pose name: no clock.

export function buildLibrary(THREE, kit, gltf, meta, colors = meta.colors) {
  const root = new THREE.Group();
  root.name = meta.name;
  const scene = gltf.scene;
  root.add(scene);

  // ---------------------------------------------------------------- materials
  const thresholds = meta.thresholds || {};
  const noInk = new Set(meta.noInk || []);
  const unmapped = new Set();
  const meshes = [];
  const smoothed = new Set();
  scene.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  for (const mesh of meshes) {
    const name = mesh.material && mesh.material.name;
    const role = meta.materials && meta.materials[name];
    if (!role) {
      unmapped.add(name || "(unnamed)");
      continue;
    }
    const base = colors[role];
    if (!base) throw new Error(`library ${meta.name}: role "${role}" (material ${name}) has no colour in colors`);
    const shade = colors[role + "Shade"] || base;
    // Faceted low-poly sources read as patchwork in two tones: shade them on normals averaged per position
    // (the hull's), so a tone boundary runs across a form instead of along every facet. meta.smooth: false keeps facets.
    if (meta.smooth !== false && !smoothed.has(mesh.geometry)) {
      const g = kit.hullNormals(mesh.geometry);
      g.setAttribute("normal", g.attributes.hullNormal.clone());
      smoothed.add(g);
    }
    mesh.material = kit.cel(base, shade, { threshold: thresholds[role] ?? 0.35 });
    mesh.frustumCulled = false; // a skinned mesh's bounding sphere is its bind pose; a gallop leaves it
    mesh.userData.role = role;
    if (!noInk.has(role)) kit.outline(mesh);
  }
  if (unmapped.size) throw new Error(`library ${meta.name}: meta.materials has no role for material(s) ${[...unmapped].join(", ")}`);

  // ---------------------------------------------------------------- joints: every bone, by name
  const joints = {};
  const rest = [];
  scene.traverse((o) => {
    if (o.isBone) {
      joints[o.name] = o;
      rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
    }
  });

  // ---------------------------------------------------------------- clips
  const mixer = new THREE.AnimationMixer(scene);
  const byName = new Map(gltf.animations.map((c) => [c.name, c]));
  const vocab = meta.clips || {}; // shared name (idle, walk, run ...) -> source clip name
  const loops = meta.clipInfo || {};
  const clip = (name) => byName.get(vocab[name] || name) || null;
  const clips = {};
  for (const [k, v] of Object.entries(vocab)) if (byName.has(v)) clips[k] = byName.get(v).duration;
  for (const c of gltf.animations) if (!Object.values(vocab).includes(c.name)) clips[c.name] = c.duration;

  function toRest() {
    mixer.stopAllAction();
    scene.position.y = 0;
    for (const [b, p, q, s] of rest) (b.position.copy(p), b.quaternion.copy(q), b.scale.copy(s));
  }

  /** Clip `name` (shared or source name) at `t` seconds: loops wrap, one-shot clips (clipInfo[name].loop false) clamp. */
  function at(name, t) {
    const c = clip(name);
    if (!c) throw new Error(`library ${meta.name}: no clip "${name}" (clips: ${Object.keys(clips).join(", ")})`);
    toRest();
    const info = loops[name] || loops[c.name] || {};
    const d = c.duration;
    const tt = info.loop === false ? Math.min(Math.max(t, 0), d) : ((t % d) + d) % d;
    const action = mixer.clipAction(c);
    action.play();
    action.time = tt;
    mixer.update(0);
    scene.position.y = info.lift || 0; // a clip that sinks (a body lying down) is lifted by a measured constant
    root.updateMatrixWorld(true);
  }

  /** "rest", "clip@seconds", or a name from meta.poseDefs ({ "gallop-a": ["run", 0.2] }). Absolute: order never matters. */
  function pose(name) {
    if (name === "rest") {
      toRest();
      root.updateMatrixWorld(true);
      return;
    }
    const def = meta.poseDefs && meta.poseDefs[name];
    if (def) return at(def[0], def[1]);
    const m = /^(.+)@(-?[\d.]+)$/.exec(name);
    if (m) return at(m[1], parseFloat(m[2]));
    throw new Error(`library ${meta.name}: unknown pose "${name}" (rest, <clip>@<seconds>, or ${Object.keys(meta.poseDefs || {}).join(", ")})`);
  }

  pose("rest");
  return { root, joints, pose, at, clips, mixer };
}

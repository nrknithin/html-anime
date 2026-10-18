// inspect.js — what the lab and probe.mjs both need to know about a model, without a browser or a canvas.
// ES module, no imports: THREE is passed in. index.html (the page) and probe.mjs (node) share it, so the
// contract checks, bbox, joint positions and mesh stats are one piece of code.

export const fmt = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);

// ---------------------------------------------------------------- the model contract
export const FORBIDDEN = [
  [/\bMath\s*\.\s*random\b/, "Math.random"],
  [/\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bDate\s*\(/, "Date"],
  [/\bperformance\s*\.\s*now\b/, "performance.now"],
  [/\brequestAnimationFrame\b|\bsetAnimationLoop\b/, "requestAnimationFrame/setAnimationLoop"],
  [/\bClock\b/, "Clock"],
  [/^\s*import(?:\s+[\w{*]|\s*["'{*])/m, "an import statement (models take THREE and kit as arguments)"],
  [/\bimport\s*\(/, "dynamic import()"],
];

// The model's source with comments and string contents blanked, newlines kept so line numbers stay true.
// Code inside a template literal's ${ } stays visible.
export function codeOnly(src) {
  const scan = (i, inExpr) => {
    let out = "";
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      const d = src[i + 1];
      if (inExpr && c === "}" && depth === 0) return [out, i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (c === "/" && d === "/") {
        while (i < src.length && src[i] !== "\n") i++;
      } else if (c === "/" && d === "*") {
        i += 2;
        while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) out += src[i++] === "\n" ? "\n" : "";
        i += 2;
      } else if (c === '"' || c === "'") {
        out += c;
        i++;
        while (i < src.length && src[i] !== c && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
        out += c;
        if (src[i] === c) i++;
      } else if (c === "`") {
        out += c;
        i++;
        while (i < src.length && src[i] !== "`") {
          if (src[i] === "\\") i += 2;
          else if (src[i] === "$" && src[i + 1] === "{") {
            const [inner, end] = scan(i + 2, true);
            out += ` ${inner} `;
            i = end + 1;
          } else out += src[i++] === "\n" ? "\n" : "";
        }
        out += c;
        i++;
      } else {
        out += c;
        i++;
      }
    }
    return [out, i];
  };
  return scan(0, false)[0];
}

export function scanSource(src) {
  const code = codeOnly(src);
  const found = [];
  for (const [re, what] of FORBIDDEN) {
    const m = re.exec(code);
    if (m) found.push(`${what} (line ${code.slice(0, m.index).split("\n").length})`);
  }
  return found;
}

export function checkMeta(mod, SCRIPTS, warnings) {
  const problems = [];
  const meta = mod.meta;
  if (!meta || typeof meta !== "object") problems.push("export const meta = { name, height, script, colors, poses } is missing");
  if (typeof mod.build !== "function") problems.push("export function build(THREE, kit, colors = meta.colors) is missing");
  if (meta && typeof meta === "object") {
    if (typeof meta.name !== "string" || !meta.name) problems.push("meta.name must be a non-empty string");
    if (!(Number.isFinite(meta.height) && meta.height > 0)) problems.push("meta.height must be a positive number of meters");
    if (typeof meta.script !== "string") problems.push("meta.script must name a color script from harness/compile.js SCRIPTS");
    else if (SCRIPTS && !SCRIPTS[meta.script]) problems.push(`meta.script "${meta.script}" is not a script (${Object.keys(SCRIPTS).join(", ")})`);
    if (!meta.colors || typeof meta.colors !== "object" || !Object.keys(meta.colors).length) problems.push("meta.colors must map role -> #rrggbb");
    else
      for (const [role, hex] of Object.entries(meta.colors))
        if (!/^#[0-9a-f]{6}$/i.test(String(hex))) problems.push(`meta.colors.${role} must be "#rrggbb" (got ${JSON.stringify(hex)})`);
    if (!Array.isArray(meta.poses) || !meta.poses.every((p) => typeof p === "string")) problems.push('meta.poses must be an array of pose names, e.g. ["rest"]');
  }
  if (problems.length) throw new Error("model contract:\n  - " + problems.join("\n  - "));
  if (!meta.poses.includes("rest")) warnings.push('meta.poses should include "rest"');
  const script = SCRIPTS && SCRIPTS[meta.script];
  if (script) {
    const allowed = new Set(Object.values(script.colors).map((h) => h.toLowerCase()));
    for (const [role, hex] of Object.entries(meta.colors))
      if (!allowed.has(hex.toLowerCase())) warnings.push(`colors.${role} ${hex} is not on script "${meta.script}"`);
  }
  return meta;
}

/** Height, ground and centering checks against the rest-pose measure M. */
export function contractWarnings(M, meta, warnings) {
  if (Math.abs(M.max[1] - meta.height) > Math.max(0.0005, 0.02 * meta.height)) warnings.push(`meta.height ${meta.height} m but the model's top at rest is ${fmt(M.max[1])} m`);
  if (Math.abs(M.min[1]) > Math.min(0.02, Math.max(0.0005, 0.02 * meta.height))) warnings.push(`model should stand on y=0 (lowest point at rest is ${fmt(M.min[1])} m)`);
  for (const [i, axis] of [[0, "x"], [2, "z"]])
    if (Math.abs(M.center[i]) > 0.15 * Math.max(M.size[i], 0.2)) warnings.push(`model should be centered on ${axis}=0 (bbox center is ${fmt(M.center[i])} m)`);
}

/** The joints build() returned must be Object3D. Returns the warning text or null. */
export function jointWarning(joints) {
  const bad = Object.entries(joints).filter(([, j]) => !(j && j.isObject3D)).map(([k]) => k);
  return bad.length ? `joints are not Object3D: ${bad.join(", ")}` : null;
}

// ---------------------------------------------------------------- measuring
const isShown = (o) => o.isMesh && !o.userData.isHull && !o.userData.labHidden && o.geometry && o.geometry.attributes.position;
// Vertex i of a mesh in world space. Skinned and morphed meshes (library models) are measured where they are drawn.
const deformed = (o) => o.isSkinnedMesh || (o.morphTargetInfluences && o.morphTargetInfluences.some((w) => w));
const worldVertex = (o, i, v) => (deformed(o) ? o.getVertexPosition(i, v) : v.fromBufferAttribute(o.geometry.attributes.position, i)).applyMatrix4(o.matrixWorld);

/** World-space vertices of the visible, non-hull meshes: bbox, triangle count, projection fits. */
export function measure(THREE, root) {
  root.updateMatrixWorld(true);
  const list = [];
  let n = 0;
  let tris = 0;
  root.traverseVisible((o) => {
    if (!isShown(o)) return;
    list.push(o);
    const g = o.geometry;
    n += g.attributes.position.count;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const pts = new Float32Array(n * 3);
  const [min, max] = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
  const v = new THREE.Vector3();
  let k = 0;
  for (const o of list) {
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      worldVertex(o, i, v);
      pts[k++] = v.x;
      pts[k++] = v.y;
      pts[k++] = v.z;
      if (v.x < min[0]) min[0] = v.x;
      if (v.y < min[1]) min[1] = v.y;
      if (v.z < min[2]) min[2] = v.z;
      if (v.x > max[0]) max[0] = v.x;
      if (v.y > max[1]) max[1] = v.y;
      if (v.z > max[2]) max[2] = v.z;
    }
  }
  if (!n) throw new Error("model has no visible meshes: build() must add Mesh objects to root");
  const size = max.map((m, i) => m - min[i]);
  const center = max.map((m, i) => (m + min[i]) / 2);
  return { pts, n, min, max, size, center, tris: Math.round(tris), meshes: list.length };
}

/** One bbox over several measures (montage): shared by every cell so they share one scale. */
export function unionMeasure(list) {
  const n = list.reduce((a, m) => a + m.n, 0);
  const pts = new Float32Array(n * 3);
  let k = 0;
  for (const m of list) (pts.set(m.pts, k), (k += m.pts.length));
  const min = [0, 1, 2].map((i) => Math.min(...list.map((m) => m.min[i])));
  const max = [0, 1, 2].map((i) => Math.max(...list.map((m) => m.max[i])));
  return {
    pts, n, min, max,
    size: max.map((m, i) => m - min[i]),
    center: max.map((m, i) => (m + min[i]) / 2),
    tris: Math.max(...list.map((m) => m.tris)),
    meshes: Math.max(...list.map((m) => m.meshes)),
  };
}

/** Joint name -> world position [x, y, z] (meters), rounded to `digits` decimals when given. */
export function jointPositions(THREE, joints, digits) {
  const out = {};
  const v = new THREE.Vector3();
  const r = digits === undefined ? (x) => x : (x) => Math.round(x * 10 ** digits) / 10 ** digits;
  for (const [name, j] of Object.entries(joints || {})) {
    if (!j || !j.isObject3D) continue;
    j.updateWorldMatrix(true, false);
    j.getWorldPosition(v);
    out[name] = [r(v.x), r(v.y), r(v.z)];
  }
  return out;
}

/** Per visible mesh: name, path from the root, triangles, lowest and highest world y. */
export function meshStats(THREE, root) {
  root.updateMatrixWorld(true);
  const out = [];
  const v = new THREE.Vector3();
  const label = (o, sibs) => o.name || `${o.type || "Object3D"}#${sibs}`;
  const walk = (o, path) => {
    if (isShown(o)) {
      const g = o.geometry;
      const pos = g.attributes.position;
      let [lo, hi] = [Infinity, -Infinity];
      for (let i = 0; i < pos.count; i++) {
        worldVertex(o, i, v);
        if (v.y < lo) lo = v.y;
        if (v.y > hi) hi = v.y;
      }
      out.push({ name: o.name || "", path, tris: Math.round((g.index ? g.index.count : pos.count) / 3), minY: lo, maxY: hi });
    }
    o.children.forEach((c, i) => {
      if (c.visible && !c.userData.isHull) walk(c, `${path}>${label(c, i)}`);
    });
  };
  walk(root, label(root, 0));
  return out;
}

// ---------------------------------------------------------------- hide / only
/**
 * Hide objects whose .name or joint key matches (subtrees included), or keep only one joint's subtree.
 * Idempotent: call it again after every pose(). Returns warnings. Hidden meshes are flagged userData.labHidden so
 * measure() skips them even when they stay in the scene (a mesh above the kept joint cannot be visible=false).
 */
export function applyFilter(THREE, built, { hide = [], only = null } = {}) {
  const warnings = [];
  const root = built.root;
  const named = (token) => {
    const hits = new Set();
    if (built.joints && built.joints[token] && built.joints[token].isObject3D) hits.add(built.joints[token]);
    root.traverse((o) => {
      if (o.name === token) hits.add(o);
    });
    return [...hits];
  };
  for (const token of hide) {
    const hits = named(token);
    if (!hits.length) warnings.push(`--hide: nothing named "${token}"`);
    for (const o of hits) o.visible = false;
  }
  if (only) {
    const j = built.joints && built.joints[only];
    if (!(j && j.isObject3D)) {
      const valid = Object.keys(built.joints || {});
      throw new Error(`--only: unknown joint "${only}". Valid joints: ${valid.join(", ")}`);
    }
    const keep = new Set();
    j.traverse((o) => keep.add(o));
    const above = new Set();
    for (let p = j.parent; p; p = p.parent) above.add(p);
    const invisible = (mesh) => {
      // A mesh on the path to the joint cannot be hidden without hiding the joint: mute it instead.
      if (!mesh.userData.labMuted) {
        mesh.userData.labMuted = mesh.material;
        mesh.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      }
      mesh.userData.labHidden = true;
    };
    root.traverse((o) => {
      if (keep.has(o)) return;
      if (above.has(o)) {
        if (o.isMesh) invisible(o);
        return;
      }
      if (o.isObject3D && !keep.has(o)) o.visible = false;
    });
  }
  return warnings;
}

/** Bounding-sphere radius around the joint's world position covering its subtree's meshes, or 0 when it has none. */
export function subtreeRadius(THREE, joint) {
  joint.updateWorldMatrix(true, true);
  const c = new THREE.Vector3();
  joint.getWorldPosition(c);
  const v = new THREE.Vector3();
  let r = 0;
  joint.traverseVisible((o) => {
    if (!isShown(o)) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) r = Math.max(r, worldVertex(o, i, v).distanceTo(c));
  });
  return r;
}

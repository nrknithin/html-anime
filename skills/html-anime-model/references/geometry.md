# Geometry cookbook

Every helper here lives inside `build(THREE, kit, colors)`. Each block assumes the blocks above it. No imports, no randomness. Plain `Mesh` only (the lab measures their vertices). The case studies in `models/*.js` hold the long versions.

## Core: rings in, closed mesh out

Most parts are a list of rings (arrays of `[x, y, z]`, all the same length) skinned into a closed tube. Two rules every modeler learned the hard way: the winding must come from the geometry, not from your intent, and every end must be closed.

```js
const TAU = Math.PI * 2;
const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Raw indexed geometry: you own the winding (open shells: hair caps, collars, sheets).
function geom(pos, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Closed geometry: flip every triangle if the signed volume is negative, so it can never render inside-out.
function solid(pos, idx) {
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
       - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
       + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  return geom(pos, idx);
}
// Skin rings into a tube. Ends close on an apex pushed out by dome x the ring radius
// (0 flat sole, 0.5 default, 0.9 knuckle at a joint). loop: last ring joins the first, no caps (thick shells).
function skin(rings, { dome = 0.5, loop = false } = {}) {
  const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
  for (let i = 0; i < (loop ? R : R - 1); i++) {
    const k = ((i + 1) % R) * seg;
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = k + j, d = k + ((j + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
  }
  if (!loop) {
    const mid = (r) => r.reduce((s, p) => [s[0] + p[0] / seg, s[1] + p[1] / seg, s[2] + p[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), n = mid(rings[nb]);
      const d = [m[0] - n[0], m[1] - n[1], m[2] - n[2]], dl = Math.hypot(...d) || 1;
      const rad = rings[k].reduce((s, p) => s + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0) / seg;
      const c = pos.length / 3;
      pos.push(...m.map((v, i) => v + (d[i] / dl) * rad * dome));
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        if (first) idx.push(c, b, a); else idx.push(c, a, b);
      }
    }
  }
  return solid(pos, idx);
}
```

- A part that renders all ink, or ink with a light rim, is inside-out. A hand-written loft that skips `solid()` will do this sooner or later (horse T7, ox T7, frog T4). Clay hides it; check cel right after writing any custom geometry.
- An open end with a radius shows the BackSide hull through the hole as a black dot (dragon T13). Close everything that has a radius.
- No duplicate seam vertices: one ring of unique points means smooth normals and a closed hull. `SphereGeometry` has a seam; `kit.hullNormals` averages it for the hull, and the heroine's `smooth()` averages the shading normals the same way.

## Superellipse ring loft (hard surface and simple organic parts)

The knight builds cuirass, helmet, greaves, sabatons, shield and blade from this one primitive. A ring sits at height `y`: half-width `w` on X, front reach `f` (+Z), back reach `b` (-Z), power `p` (2 ellipse, 1 diamond, 4+ rounded box), centre offset `x`, `z`. `ridge` raises a medial keel on the front, `drop` lowers the back (a sallet tail), `bend` curves the section (a shield).

```js
function ringY({ y, w, f, b = f, p = 2, x = 0, z = 0, ridge = 0, drop = 0, bend = 0 }, seg = 20) {
  const e = 2 / p, pts = [];
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * TAU, co = Math.cos(t), si = Math.sin(t);
    const W = Math.max(w, 1e-4), px = W * spow(co, e);
    let pz = (si >= 0 ? f : b) * spow(si, e);
    if (ridge && si > 0) pz += ridge * si * Math.exp(-12 * (px / W) ** 2);
    if (bend) pz -= bend * px * px;
    const py = drop && pz < 0 && b ? y + drop * (-pz / b) ** 1.5 : y;
    pts.push([x + px, py, z + pz]);
  }
  return pts;
}
const loftY = (rings, seg = 20, o) => skin(rings.map((r) => ringY(r, seg)), o);
// e.g. a greave with a calf swell (b > f) and a shin ridge:
// loftY([{ y: 0.54, w: 0.062, f: 0.065, b: 0.06, ridge: 0.008 }, { y: 0.44, w: 0.062, f: 0.06, b: 0.08 }, { y: 0.11, w: 0.045, f: 0.05 }], 18)
```

Loft along another axis by building along Y and rotating the geometry: the knight's sabaton is lofted heel to toe on Y, then `rotateX(Math.PI / 2)` so loft-Y becomes +Z.

## Two-rail loft in side-view coordinates (organic parts matched to a photo)

The horse's method and its biggest accelerator: draw a part as two outlines read straight off the side reference, `[z, y]` in world metres, plus a half-width curve for the plan view. Each ring spans X and the vector between the rails, so a landmark error in the edge overlay maps to one number in one rail (horse T3, T4).

```js
// Uniform Catmull-Rom through numeric keys, `steps` samples per span.
function spline(keys, steps) {
  const out = [], n = keys.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = keys[Math.max(i - 1, 0)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(i + 2, n - 1)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3));
    }
  }
  out.push(keys[n - 1]);
  return out;
}
// A, B: rails [[z, y], ...] (same count); W: half-widths. n: superellipse power. steps 1 = no smoothing (sharp teeth).
function railLoft(A, B, W, { steps = 4, seg = 16, n = 2.2, x0 = 0, dome = 0.5 } = {}) {
  const sp = (k) => spline(k, steps);
  const az = sp(A.map((p) => p[0])), ay = sp(A.map((p) => p[1])), bz = sp(B.map((p) => p[0])), by = sp(B.map((p) => p[1])), ww = sp(W);
  const rings = az.map((_, i) => {
    const cz = (az[i] + bz[i]) / 2, cy = (ay[i] + by[i]) / 2, dz = (az[i] - bz[i]) / 2, dy = (ay[i] - by[i]) / 2;
    return Array.from({ length: seg }, (_, s) => {
      const t = (s / seg) * TAU, u = spow(Math.cos(t), 2 / n), v = spow(Math.sin(t), 2 / n);
      return [x0 + ww[i] * u, cy + dy * v, cz + dz * v];
    });
  });
  return skin(rings, { dome });
}
// barrel: top rail vs belly rail along z (rings vertical); neck: crest vs throat (rings diagonal);
// leg segment: front rail vs back rail top to bottom (rings near horizontal).
```

- Lock the ring plane to the view axis. Rings perpendicular to a sloped spine shear the profile: on a 27 deg neck the bottom point moved 0.19 m forward (ox T2). Rail rings, or rings at constant z (body, neck) and constant y (legs, hoof claws), keep top and bottom exactly where you typed them.
- Author in the overlay's own coordinates. A head built in a tilted local frame put the forehead 7 cm forward; rebuilt on world rails it landed within 1-2 cm (horse T3).
- Separate upper and lower half-widths make a keel (a dewlap) from the same ring; blend them below the equator with `aT + (aB - aT) * (-sin t) ** 0.8` or the change shows as a ridge along the side (ox T4).

## Tapered tube (horns, tails, claws, brows, straps, hair strands)

```js
// Tube through pts along a Catmull-Rom curve, radius r0 -> r1 (r1 = 0 is a pointed tip). flat squashes the section.
// up: optional fixed vector; the flattened axis points along it (a hair lock lies flat when up points out of the skull).
function tube(pts, r0, r1, { steps = 16, seg = 8, flat = 1, up = null, dome = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
  const fr = up ? null : curve.computeFrenetFrames(steps, false);
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, P = curve.getPointAt(t), T = curve.getTangentAt(t);
    const N = up ? V().crossVectors(T, up).normalize() : fr.normals[i];
    const B = V().crossVectors(T, N).normalize();
    const r = Math.max(r0 + (r1 - r0) * t, 1e-4);
    rings.push(Array.from({ length: seg }, (_, j) => {
      const a = (j / seg) * TAU;
      return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r * flat).toArray();
    }));
  }
  return skin(rings, { dome: r1 > 0 ? dome : 0 });
}
```

- The root point is the tube's centre: sink it by its radius into the parent or the silhouette grows a bump (ox T3).
- Pointed tips need some end radius budget: a 0.006 m tip plus a cap rendered as a white blob, and a 0.1 m horn lost 10 px to the ink (ox T6). Thicken thin parts (see cel-and-ink.md).
- Never mix arc tables: `getLengths(600)` totals with `getPointAt`/`getUtoTmapping` (200 divisions) returned NaN past the table's end (dragon T0). Use the curve's own `getPointAt` and `computeFrenetFrames(steps)` together, as here, or one table of your own for everything.

## Spine loft, CPU-skinned (one seamless neck + body + tail)

The dragon's biggest quality win: neck, torso and tail are one loft along a Catmull-Rom spine, skinned in `pose()` to a joint chain. No seams at any bend, one hull, one two-tone split. The lab forbids `SkinnedMesh`, so skin on the CPU.

```js
// g: the loft geometry, built in bind pose (all chain rotations zero) and added to root at identity.
// bones: joint chain; vb[i]: [[boneIndex, weight], ...] for vertex i (weights sum to 1).
// Weights by arc length s of the vertex's ring: rigid mid-bone, linear to 50/50 within h of each pivot.
function chainWeights(s, cuts, h = 0.18) { // cuts: arc length of each pivot, ascending; bone k spans cuts[k-1]..cuts[k]
  const k = cuts.findIndex((c) => s < c), b = k < 0 ? cuts.length : k;
  const w = [[b, 1]], s0 = b > 0 ? cuts[b - 1] : -Infinity, s1 = b < cuts.length ? cuts[b] : Infinity;
  if (s1 - s < h) { const x = 0.5 * (1 - (s1 - s) / h); w[0][1] -= x; w.push([b + 1, x]); }
  if (s - s0 < h) { const x = 0.5 * (1 - (s - s0) / h); w[0][1] -= x; w.push([b - 1, x]); }
  return w;
}
function skinner(g, bones, vb) {
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const bind = bones.map((j) => rootInv.clone().multiply(j.matrixWorld).invert());
  const rest = g.attributes.position.array.slice(), M = bones.map(() => new THREE.Matrix4());
  if (!g.attributes.hullNormal) g.setAttribute("hullNormal", g.attributes.normal.clone());
  return function skinNow() { // call at the end of pose(), after root.updateMatrixWorld(true)
    rootInv.copy(root.matrixWorld).invert(); // the film may move root: skin in root space
    bones.forEach((j, b) => M[b].multiplyMatrices(rootInv, j.matrixWorld).multiply(bind[b]));
    const pos = g.attributes.position.array, v = V(), t = V(), acc = V();
    for (let i = 0; i < vb.length; i++) {
      v.fromArray(rest, i * 3);
      acc.set(0, 0, 0);
      for (const [b, w] of vb[i]) acc.addScaledVector(t.copy(v).applyMatrix4(M[b]), w);
      acc.toArray(pos, i * 3);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    g.attributes.hullNormal.array.set(g.attributes.normal.array); // seam-free skin: hull normal = normal
    g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere();
  };
}
```

Set `mesh.frustumCulled = false` on skinned and rebuilt meshes. The dragon puts a long-tail model in a `space` group shifted along z so the bbox centres on z = 0; compute skin and membranes in that group's space.

## Interior lines and two-colour skins, one hull

Material groups give a two-colour creature from one mesh and one hull: a belly band, mouth, plates. The hull mesh has a single material, so it ignores the groups (dragon T5).

```js
// Sort an indexed geometry's triangles into material groups by a test on the centroid (in bind pose).
function groups(g, test) {
  const p = g.attributes.position, ix = g.index.array, buckets = [];
  for (let i = 0; i < ix.length; i += 3) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) { cx += p.getX(ix[i + k]) / 3; cy += p.getY(ix[i + k]) / 3; cz += p.getZ(ix[i + k]) / 3; }
    (buckets[test(cx, cy, cz)] ??= []).push(ix[i], ix[i + 1], ix[i + 2]);
  }
  g.setIndex(buckets.flat());
  g.clearGroups();
  let start = 0;
  buckets.forEach((b, k) => { g.addGroup(start, b.length, k); start += b.length; });
  return g;
}
function toon2(g, pairs) { // pairs: [[base, shade], [base, shade], ...] for group 0, 1, 2
  const m = kit.toon(g, ...pairs[0]);
  m.material = pairs.map(([b, s]) => kit.cel(b, s));
  return m;
}
```

- Plate seams for free: insert a twin ring 2 cm behind a ring and put the band faces between the pair in a group whose base and shade are both the dark tone (dragon T16). It bends with the skin and costs no meshes.
- Hard-surface seams the hull cannot draw (a plate edge facing the camera, a panel line, a lame) are a thin ink band copied from the plate's own edge ring, grown 1-2.5 mm, no hull (knight T13-T14):

```js
const seam = (r, ink, dy = 0.007, e = 0.0025) => {
  const grow = (y) => ({ ...r, y, w: r.w + e, f: r.f + e, b: r.b ? r.b + e : 0 });
  return kit.toon(loftY([grow(r.y), grow(r.y - dy)], 24, { dome: 0 }), ink, ink, { outline: false });
};
```

- A crease that must be inked (wheel arch, fender lip) gets its own thin tube with a hull, laid on the surface (ae86 T6).

## Thick shells and lathes

A cup (pauldron, couter, poleyn, helmet rim) is a closed solid, never a one-sided shell: the hull shows through an open shell's inside.

```js
// Lathe with thickness: profile [[r, y], ...] from the top down, offset inward by t, joined into one closed loop.
function shell(pts, t, { seg = 20, sx = 1, sz = 1, p = 2 } = {}) {
  const n = pts.length, out = [], inn = [];
  for (let i = 0; i < n; i++) {
    const [r0, y0] = pts[Math.max(i - 1, 0)], [r1, y1] = pts[Math.min(i + 1, n - 1)];
    const l = Math.hypot(r1 - r0, y1 - y0) || 1, nr = -(y1 - y0) / l, ny = (r1 - r0) / l;
    const [r, y] = pts[i], ri = Math.max(r - t * nr, 1e-4);
    out.push({ y, w: r * sx, f: r * sz, p });
    inn.push({ y: y - t * ny, w: ri * sx, f: ri * sz, p });
  }
  return skin([...out, ...inn.reverse()].map((r) => ringY(r, seg)), { loop: true });
}
// pauldron cop flaring to a bell rim: shell([[0, 0.072], [0.042, 0.067], [0.068, 0.048], [0.09, -0.03], [0.094, -0.07]], 0.008, { sz: 1.15 })
```

- `LatheGeometry` is fine for closed profiles that start and end on the axis (the frog's capsule limbs, the AE86 tyre with `rotateZ(Math.PI / 2)` to put the axis on X).
- Pleated skirt: a lathe whose ring radius alternates per pleat (`1 + amp` / `1 - 0.4 amp`, odd points shifted 0.78 of a pleat), `toNonIndexed()` + `computeVertexNormals()` so each pleat face takes one tone, plus an inner shell so a low camera never sees through it (heroine).
- `ExtrudeGeometry` of a `Shape` for flat parts: back spines, a tail spade, webbing (dragon, frog). Orient a flat part with a basis, not guessed Euler triples (dragon T14): `mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, forward))`.

## Two-layer membrane (wings, capes, sails, big ears)

A single-sided sheet has no thickness for the hull. Two layers about 1.2 cm apart, normals opposite, and rim vertices whose hull normal points outward in the sheet: it inks face-on, stays a line edge-on, and shades correctly from both sides (dragon T6). Rebuild it in `pose()` from joint positions.

```js
// grid(i, j) -> THREE.Vector3 in root space, i 0..nu, j 0..nv (both >= 2). Returns { mesh, update }.
function sheet(nu, nv, base, shade, grid, th = 0.006) {
  const n1 = (nu + 1) * (nv + 1), id = (i, j) => i * (nv + 1) + j, one = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
    one.push(a, b, c, a, c, d);
  }
  const idx = [...one];
  for (let k = 0; k < one.length; k += 3) idx.push(one[k] + n1, one[k + 2] + n1, one[k + 1] + n1);
  const g = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "hullNormal"]) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(n1 * 6), 3));
  g.setIndex(idx);
  const mesh = kit.toon(g, base, shade);
  mesh.frustumCulled = false;
  function update() {
    const P = [], N = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { P[id(i, j)] = grid(i, j); N[id(i, j)] = V(); }
    const e1 = V(), e2 = V();
    for (let k = 0; k < one.length; k += 3) {
      const [a, b, c] = [one[k], one[k + 1], one[k + 2]];
      e1.subVectors(P[b], P[a]).cross(e2.subVectors(P[c], P[a]));
      N[a].add(e1); N[b].add(e1); N[c].add(e1);
    }
    const pos = g.attributes.position.array, nor = g.attributes.normal.array, hul = g.attributes.hullNormal.array;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const v = id(i, j), n = N[v].lengthSq() > 1e-12 ? N[v].normalize() : V(0, 1, 0);
      const ii = Math.min(Math.max(i, 1), nu - 1), jj = Math.min(Math.max(j, 1), nv - 1);
      const o = P[v].clone().sub(P[id(ii, jj)]); // rim: outward in the sheet
      o.addScaledVector(n, -o.dot(n));
      const rim = (ii !== i || jj !== j) && o.lengthSq() > 1e-12;
      if (rim) o.normalize();
      for (const [L, sg] of [[0, 1], [n1, -1]]) {
        const t = (v + L) * 3, h = rim ? o.clone().addScaledVector(n, 0.35 * sg).normalize() : n.clone().multiplyScalar(sg);
        pos[t] = P[v].x + n.x * th * sg; pos[t + 1] = P[v].y + n.y * th * sg; pos[t + 2] = P[v].z + n.z * th * sg;
        nor[t] = n.x * sg; nor[t + 1] = n.y * sg; nor[t + 2] = n.z * sg;
        hul[t] = h.x; hul[t + 1] = h.y; hul[t + 2] = h.z;
      }
    }
    for (const k of ["position", "normal", "hullNormal"]) g.attributes[k].needsUpdate = true;
    g.computeBoundingSphere();
  }
  return { mesh, update };
}
```

Grid recipe for a bat wing (dragon): each panel is a ruled surface between two polylines (arm or wrist apex, and a trailing edge between fingertips), `S(u, v) = lerp(c0(u), c1(u), v)`, with the trailing edge pulled toward c0 by `0.1-0.2 x edge length x sin(pi u)` for the scallop. Read joint points with `root.worldToLocal(joint.localToWorld(V(len, 0, 0)))` after `root.updateMatrixWorld(true)`.

## Decals conformed to a surface

Face features, markings and emblems are flat shapes dropped onto the surface and lifted a little per layer. No hull (`outline: false`): they separate by colour, which is what cel wants. ~100 tris each for a frog spot (frog T12).

```js
// Subdivide a non-indexed geometry: each triangle -> 4.
function subdivide(g) {
  const p = g.attributes.position, out = [];
  const v = (i) => [p.getX(i), p.getY(i), p.getZ(i)], mid = (a, b) => a.map((x, k) => (x + b[k]) / 2);
  for (let i = 0; i < p.count; i += 3) {
    const a = v(i), b = v(i + 1), c = v(i + 2), ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    out.push(...a, ...ab, ...ca, ...ab, ...b, ...bc, ...ca, ...bc, ...c, ...ab, ...bc, ...ca);
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  return r;
}
// Drop a Shape (x, y in the head's local frame) onto headGeo along -Z, then lift it. The probe mesh is never added
// to the scene, so its world matrix is identity and the hits come back in head-local coordinates.
const probe = new THREE.Mesh(headGeo);
probe.updateMatrixWorld(true);
const ray = new THREE.Raycaster(), hits = [];
function decal(shape, color, lift, level = 1) {
  let g = new THREE.ShapeGeometry(shape, 5).toNonIndexed();
  for (let i = 0; i < level; i++) g = subdivide(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    ray.set(V(p.getX(i), p.getY(i), 1), V(0, 0, -1));
    hits.length = 0;
    probe.raycast(ray, hits);
    p.setZ(i, (hits.length ? Math.max(...hits.map((h) => h.point.z)) : 0) + lift);
  }
  g.computeVertexNormals();
  return kit.toon(g, color, color, { outline: false });
}
```

- Lift 0.6-1 mm per layer (sclera, iris, iris light, pupil, lash shadow, highlights, lash on top). Subdivide by curvature x size: the big sclera needs level 2 or its chords dip under the skin and skin slivers show inside the eye; pay for it with `curveSegments` 5 (heroine T19).
- Decals without ink must sit within ~3 mm of the surface or they stand outside the silhouette in profile (horse T9).
- On a parametric surface (a loft you can evaluate at `(u, theta)`), seat a decal or a rider joint at `surf(u, theta) - normal * depth` and orient it with `quaternion.setFromUnitVectors(V(0, 0, 1), normal)` (frog T10, T17).

## Hair

Hair is a cap that hugs the skull plus strands whose roots are buried in it. Rigid cards on a curved surface bury or spike (horse T10).

```js
// hp(az, el, off): point on the skull ellipsoid pushed out by off (az 0 = front, toward +X; el up).
// el0(az): hairline elevation. Rows run from the hairline to the crown, so the edge IS the hairline curve.
function hairCap(hp, el0, { NA = 36, NE = 16, off = 0.015 } = {}) {
  const pos = [], idx = [];
  for (let i = 0; i <= NE; i++) for (let j = 0; j < NA; j++) {
    const az = -Math.PI + (TAU * j) / NA, e0 = el0(az);
    pos.push(...hp(az, e0 + (Math.PI / 2 - e0) * (i / NE) ** 0.85, off));
  }
  for (let i = 0; i < NE; i++) for (let j = 0; j < NA; j++) {
    const a = i * NA + j, b = i * NA + ((j + 1) % NA);
    idx.push(a, b, a + NA, b, b + NA, a + NA); // outward for this az/el order
  }
  return geom(pos, idx); // open shell: winding set by hand; then average seam normals
}
```

- Never cut a shell edge by masking grid cells: it leaves a staircase. Warp the grid so its boundary row is the edge (heroine T7). Same for collars and stripes: build them as column strips on the analytic body surface.
- Strands: `tube(pts, w, 0, { flat: 0.35, up })` with `up` pointing out of the skull, root 6-8 mm inside the cap. An exposed root cap plus its hull draws a hairband line across the crown (heroine T12). Each strand's own hull draws the strand lines.
- Locks framing a face stay behind the cheek plane (z less than the face front) or they cross the far eye in three-quarter (heroine T3, T8).
- Mane or crest on a lofted body: a cap loft that reuses the parent's dense rails, rail A a few cm proud of the crest, rail B dipping 22-43% toward the other rail in a 4-sample sawtooth, width 1.12 x the parent, `steps: 1` so the points stay sharp. Alternating depths give square teeth; a sawtooth gives pointed locks (horse T11).
- All-black hair is a flat blob. Use a dark-blue or brown base with the black as shade and a high threshold (0.62) so only the light-facing crown shows the base as a sheen (heroine T7, T10).

## Morph tables (inflation, transformation)

Non-uniform scale of one loft keeps its silhouette family: the scaled frog stayed a pear (frog T13). Lerp a second ring table instead.

```js
// REST and BAL: arrays of ring records { z, cy, hw, ht, hb } with the SAME count. ringPoints(ring) -> points.
function morph(a, skinGeo, writeRings) {
  for (let i = 0; i < RINGS.length; i++) for (const k in RINGS[i]) RINGS[i][k] = REST[i][k] + (BAL[i][k] - REST[i][k]) * a;
  writeRings(skinGeo.attributes.position, RINGS); // rewrite vertices in place, same count and order
  skinGeo.attributes.position.needsUpdate = true;
  skinGeo.computeVertexNormals();
  if (skinGeo.attributes.hullNormal) { // the hull shares the geometry; kit.hullNormals skips an existing attribute
    skinGeo.deleteAttribute("hullNormal");
    kit.hullNormals(skinGeo);
  }
  skinGeo.computeBoundingSphere();
}
```

- Address points on the skin by `(u = float ring index, theta)`, not by z, so they travel with the morph. Lerp the superellipse exponent too (2.4 -> 2.0 made the frog a true sphere, frog T16).
- Riders (eyes, limbs, decals) get two anchors, rest and morphed, each `{u, theta, depth}`; the morphed anchor is its own design, not the rest anchor carried through (eyes left at the same u looked sunken, frog T17). Grow decals by about the square root of the body scale, not the full scale (frog T13).
- Thin tubes on a morphing skin: regenerate and swap `mesh.geometry` per call; dispose the old one.
- Expose the morph as a continuous control next to `pose`: `return { root, joints, pose, puff }` (see rigging.md).

## Flat-shaded hard surface (vehicles, crisp panels)

The AE86 is a triangle soup per panel group: `toNonIndexed()` geometry with `computeVertexNormals()` gives one flat normal per face, so panels read crisp in two tones, and `kit.hullNormals` averages per position so the ink still closes. Orient each triangle away from a reference point inside the body. Tiny crowns (<3 deg) make stray seams in flat shading: make them real or omit them (ae86 T9). On curved low-segment plate, smooth normals plus a higher threshold read better than flat (knight T8).

Glass = a dark planar quad 4 mm proud of the body plane plus one or two pale diagonal streak quads 6 mm proud: three quads that say "window" (ae86 T4). A pop-up headlamp is a box hinged at its rear-top edge with the lens on its underside; rotate -86..-90 deg about X and it stands up lens-forward (ae86 T10).

## Triangle budgets

| subject | final tris | meshes | notes |
|---|---|---|---|
| wolf | 6,808 | 35 | rail lofts 10-18 seg; the skill's validation build |
| frog (0.09 m) | 7,120 | 64 | budget 8k; first blockout was 11k from 10 toes + 8 fingers |
| AE86 | 7,872 | - | flat soup, 28-seg tyres |
| dragon | 10,692 | 113 | one skinned spine loft, 16 seg; membranes rebuilt per pose |
| knight | 10,652 | 64 | 16-28 seg lofts; blade 4 seg |
| horse | 12,684 | - | rail lofts 12-24 seg |
| ox | 12,868 | 55 | budget 15k; legs were 8k of 14k before trimming |
| heroine | 14,299 | 81 | budget 15k; head sphere 32x24, decals curveSegments 5 |

Rules of thumb: a lathe of 10 profile points x 10 segments is ~160 tris (frog T1); small parts take 5-8 segments and 6-point profiles; dome ends need 2 rings, not 3 (ox T12). Film-grade models should come in under ~15k. Check `tris=` on every shot; the probe prints per-mesh counts.

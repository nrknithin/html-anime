// Kitsune — an anime fox spirit: a slender white fox with big pointed ears (red-tinted inside, red tips), a narrow
// muzzle, red eyeliner flicks and a red flame mark on the forehead, and a fan of nine big bushy tails with red tips
// rising from the rump like a halo. Original design; code model, built on the shiba's quadruped rig.
//
// Construction: every organic part is a two-rail loft authored in world side-view metres (rails [z, y], half-widths
// on X), as the shiba and wolf: a misfit is one number. Legs are one loft per segment between two joints
// (taper-through: the knob belongs to the upper segment). The face markings are thin ribbon decals laid on the head
// loft by raycasting it at build time (2 mm proud, along the surface normal), merged into one red mesh; nose, eyes and
// mouth are one flat dark mesh. Each tail is two tube segments on one planar curve (no Frenet twist: the ring's side
// axis is the curve plane's normal), a fox-brush radius (thick, pointed tip), the last 18 % a red material group.
// Each tail hangs off its own fan group on a tail base at the rump; the fan angle spreads them about the body's long
// axis, so from the front three-quarter they rise behind the fox as a halo.
//
// Proportions (H = withers height 0.45 m; a red fox, slightly stylised): trunk 1.15 H point of shoulder to buttock,
// chest depth 0.45 H, elbow 0.54 H, long slender legs, head 0.44 H long with the muzzle half of it, skull top 1.36 H,
// ear tips 1.7 H (ears 0.27 H: the anime oversize), tails 0.6 m along the curve, centre tail top ~2 H. Landmarks
// (z, y m): withers (0.11, 0.455), croup (-0.19, 0.44), buttock z -0.27, nose tip z 0.49, chest bottom 0.25,
// front toes z 0.19, hind toes z -0.17, tail base (-0.255, 0.42).
//
// Two-tone pairs (eclipse script): fur practical #f3f6ff / skin #e8b8a8 (a cool white whose shade is a warm blush,
// so the white body still models in cel); markings, tail tips, ear tips iris #ff5a4a / accent #ff3b3b (vermilion,
// the shrine red); inner ears iris (flat); nose, eyes, mouth hair #1a1014 (flat, no hull); eye shine sclera #f6f3ee.
// Eclipse over festival: its accent is a true vermilion (festival's is pink), and its night sky #2a1016 sets a
// white fox off at the strongest contrast of any script.
//
// Rig: fox (scale group, opts.height) -> body -> neck -> head -> earL/R; body -> tailBase -> fan0..n-1 -> tail0..
// (root) -> tail0b.. (mid); per side shoulder -> elbow -> wrist -> paw and hip -> stifle -> hock -> foot. Signs: legs,
// neck and head rotate about X; +rx swings a hanging part back (-Z) and pitches the body nose-down; neck and head
// point forward-up, so +rx lowers them. Tails rise up-back, so -rx leans them further back; fan rz spreads a tail
// toward +X (its left) when positive; each tail's own rz sways it sideways, its rx (root and mid) curls it.
//
// Poses: rest, sit. Clips (build() returns clips {name: seconds}; pose("walk@0.3")): idle 4 s (breathing, ear
// twitches, the tails sway in a staggered wave), walk 0.9 s (lateral sequence; 0.36 m/s), run 0.42 s (rotary gallop,
// tails streaming back; 2.7 m/s; speeds at the default size), float 3 s (hovering, lowest point 0.19-0.21 m up, legs
// tucked, tails fanned wide and rippling). Feet: as the shiba, each paw follows a ground track (stance on y = 0, swing a Hermite arc) and a
// planar two-bone IK places the wrist / hock; float tucks them with off-ground targets.
//
// Options: build(THREE, kit, colors, { height, tails }): height scales uniformly (top of the 9-tail rest pose, default
// meta.height; fewer tails keep the same fox size); tails 1..9 (default 9), spread evenly over the fan.

export const meta = {
  name: "kitsune",
  height: 0.874,
  script: "eclipse",
  colors: {
    fur: "#f3f6ff", furShade: "#e8b8a8",
    red: "#ff5a4a", redShade: "#ff3b3b",
    dark: "#1a1014",
    shine: "#f6f3ee",
  },
  poses: ["rest", "sit"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- geometry helpers (as shiba.js) ----------
  function solid(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function skin(rings, { dome = 0.5 } = {}) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++) {
      const k = (i + 1) * seg;
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = k + j, d = k + ((j + 1) % seg);
        idx.push(a, b, c, b, d, c);
      }
    }
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
    return solid(pos, idx);
  }
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
  // A, B: rails [[z, y], ...]; W: half-widths on X. Rings span X and the A-B vector.
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
  // a leg segment from P0 to P1 ([z, y]): front / back thickness and half-width at each end, optional mid bulge
  function limb(x, P0, P1, f, b, w, { bulge = 0, seg = 10, dome = 0.6 } = {}) {
    const d = [P1[0] - P0[0], P1[1] - P0[1]], l = Math.hypot(...d), nz = -d[1] / l, ny = d[0] / l;
    const S = [0, 0.5, 1], A = [], B = [], W = [];
    for (const s of S) {
      const P = [P0[0] + d[0] * s, P0[1] + d[1] * s], k = s === 0.5 ? 1 + bulge : 1;
      const ff = (f[0] + (f[1] - f[0]) * s) * k, bb = (b[0] + (b[1] - b[0]) * s) * k;
      A.push([P[0] + nz * ff, P[1] + ny * ff]);
      B.push([P[0] - nz * bb, P[1] - ny * bb]);
      W.push((w[0] + (w[1] - w[0]) * s) * k);
    }
    return railLoft(A, B, W, { x0: x, seg, steps: 3, dome });
  }
  function ringY({ y, w, f, b = f, p = 2, x = 0, z = 0 }, seg) {
    const e = 2 / p, pts = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * TAU;
      pts.push([x + w * spow(Math.cos(t), e), y, z + (Math.sin(t) >= 0 ? f : b) * spow(Math.sin(t), e)]);
    }
    return pts;
  }
  const loftY = (rings, seg, o) => skin(rings.map((r) => ringY(r, seg)), o);
  // material groups by a test on each triangle's centroid
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
    buckets.forEach((bk, k) => { if (bk) { g.addGroup(start, bk.length, k); start += bk.length; } });
    return g;
  }
  // concatenate indexed geometries (position only) into one
  function merge(list) {
    const pos = [], idx = [];
    for (const g of list) {
      const gi = g.index ? g : g.toNonIndexed();
      const off = pos.length / 3, p = gi.attributes.position.array;
      for (let i = 0; i < p.length; i++) pos.push(p[i]);
      if (gi.index) for (const i of gi.index.array) idx.push(i + off);
      else for (let i = 0; i < p.length / 3; i++) idx.push(i + off);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // ---------- rig ----------
  const { height = meta.height } = opts;
  const NT = Math.max(1, Math.min(9, Math.round(opts.tails ?? 9)));
  const root = new THREE.Group();
  root.name = "root";
  const fox = new THREE.Group();
  fox.name = "fox";
  fox.scale.setScalar(height / meta.height);
  root.add(fox);
  const joints = {}, pivots = { fox: [0, 0, 0] };
  function joint(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.name = name;
    const pp = pivots[parent.name] ?? [0, 0, 0];
    g.position.set(x - pp[0], y - pp[1], z - pp[2]);
    g.userData.rest = g.position.clone();
    parent.add(g);
    joints[name] = g;
    pivots[name] = [x, y, z];
    return g;
  }
  const FUR = { threshold: 0.12 };
  function part(j, geo, base, shade, o) {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, base, shade, { ...FUR, ...o });
    j.add(m);
    return m;
  }
  const fur = (j, geo, name) => { const m = part(j, geo, C.fur, C.furShade); if (name) m.name = name; return m; };
  const flat = (o = {}) => ({ outline: false, threshold: -0.3, ...o });

  const body = joint("body", fox, 0, 0.35, 0);
  const neck = joint("neck", body, 0, 0.42, 0.17);
  const head = joint("head", neck, 0, 0.555, 0.31);
  head.scale.setScalar(1.2);
  const tailBase = joint("tailBase", body, 0, 0.415, -0.25);

  // --- trunk: topline vs belly; a deep chest tucking up to a slim loin ---
  const bodyMesh = fur(body, railLoft(
    [[0.245, 0.395], [0.2, 0.44], [0.11, 0.457], [0.0, 0.443], [-0.1, 0.435], [-0.19, 0.442], [-0.245, 0.415], [-0.272, 0.37]],
    [[0.258, 0.322], [0.215, 0.262], [0.12, 0.238], [0.02, 0.255], [-0.08, 0.288], [-0.16, 0.302], [-0.232, 0.315], [-0.272, 0.35]],
    [0.054, 0.075, 0.08, 0.073, 0.062, 0.066, 0.054, 0.022], { seg: 16 }), "trunk");

  // --- neck: crest vs throat, with the fox's chest ruff ---
  fur(neck, railLoft(
    [[0.318, 0.6], [0.262, 0.565], [0.19, 0.505], [0.12, 0.455]],
    [[0.365, 0.522], [0.338, 0.455], [0.296, 0.385], [0.235, 0.325]],
    [0.044, 0.054, 0.06, 0.064], { seg: 14 }), "neck");

  // --- head: forehead / muzzle bridge vs jaw; wide cheeks to a narrow muzzle ---
  const skullGeo = railLoft(
    [[0.285, 0.582], [0.315, 0.612], [0.348, 0.613], [0.378, 0.594], [0.408, 0.578], [0.448, 0.566], [0.492, 0.553]],
    [[0.285, 0.526], [0.315, 0.506], [0.348, 0.505], [0.378, 0.513], [0.408, 0.522], [0.448, 0.531], [0.49, 0.54]],
    [0.046, 0.066, 0.064, 0.046, 0.03, 0.022, 0.011], { seg: 20, steps: 5 });
  // surface sampler on the bare skull (identity transform): ray from outside toward the centre line
  const SP = skullGeo.attributes.position, SI = skullGeo.index.array;
  function surf(dir, a, b) {
    // dir "x": point at (y=a, z=b) seen from +X; "y": (x=a, z=b) seen from +Y; nearest hit on the bare skull
    const r = dir === "x" ? new THREE.Ray(V(0.3, a, b), V(-1, 0, 0)) : new THREE.Ray(V(a, 0.9, b), V(0, -1, 0));
    let best = null;
    const A = V(), B = V(), Cc = V(), hit = V();
    for (let i = 0; i < SI.length; i += 3) {
      A.fromBufferAttribute(SP, SI[i]); B.fromBufferAttribute(SP, SI[i + 1]); Cc.fromBufferAttribute(SP, SI[i + 2]);
      if (!r.intersectTriangle(A, B, Cc, false, hit)) continue;
      const d = hit.distanceTo(r.origin);
      if (!best || d < best.d) {
        const n = B.clone().sub(A).cross(Cc.clone().sub(A)).normalize();
        if (n.dot(r.direction) > 0) n.negate();
        best = { d, p: hit.clone(), n };
      }
    }
    return best;
  }
  // ribbon decal along surface samples: width w(t) across, 1.6 mm thick, 2 mm proud
  function decal(samples, w) {
    const pts = samples.filter(Boolean), rings = [];
    pts.forEach((s, i) => {
      const t = i / (pts.length - 1), a = pts[Math.max(0, i - 1)].p, c = pts[Math.min(pts.length - 1, i + 1)].p;
      const tan = c.clone().sub(a).normalize(), side = tan.clone().cross(s.n).normalize();
      const ctr = s.p.clone().addScaledVector(s.n, 0.0022), r = Math.max(w(t), 4e-4);
      rings.push(Array.from({ length: 8 }, (_, j) => {
        const q = (j / 8) * TAU;
        return ctr.clone().addScaledVector(side, Math.cos(q) * r).addScaledVector(s.n, Math.sin(q) * 0.0016).toArray();
      }));
    });
    return skin(rings, { dome: 0.3 });
  }
  const redDecals = [], darkParts = [], shines = [];
  // forehead flame: a teardrop down the centre line, point toward the crown
  redDecals.push(decal([0.378, 0.37, 0.362, 0.354, 0.346, 0.338, 0.33, 0.322].map((z) => surf("y", 0.0004, z)),
    (t) => 0.011 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)) ** 0.6 * (1 - 0.75 * t)));
  for (const s of [1, -1]) {
    // almond eye slanting up toward the ear, set into the face at the stop
    const eye = new THREE.SphereGeometry(1, 12, 8);
    eye.scale(0.006, 0.0085, 0.019).rotateX(0.55).rotateY(0.55 * s).translate(0.043 * s, 0.582, 0.372);
    darkParts.push(eye);
    const sh = new THREE.SphereGeometry(0.0032, 6, 5);
    sh.translate(0.0475 * s, 0.586, 0.376);
    shines.push(sh);
    // eyeliner: upper lid line from the inner corner sweeping out and up past the outer corner toward the ear
    const lid = [[0.585, 0.391], [0.5885, 0.383], [0.59, 0.373], [0.5895, 0.362], [0.592, 0.352], [0.598, 0.341]];
    const L = decal(lid.map(([y, z]) => surf("x", y, z)), (t) => 0.0018 + 0.0032 * Math.sin(Math.PI * (0.15 + t * 0.7)));
    // lower flick: under the eye, back toward the cheek
    const low = [[0.5745, 0.38], [0.5725, 0.37], [0.573, 0.36], [0.5765, 0.348]];
    const L2 = decal(low.map(([y, z]) => surf("x", y, z)), (t) => 0.0032 * Math.sin(Math.PI * (0.1 + 0.85 * t)) + 0.0006);
    if (s < 0) for (const g of [L, L2]) g.scale(-1, 1, 1);
    redDecals.push(L, L2);
    // mouth line
    const mouth = new THREE.CatmullRomCurve3([V(0.004 * s, 0.539, 0.487), V(0.011 * s, 0.535, 0.47), V(0.017 * s, 0.535, 0.452)]);
    darkParts.push(new THREE.TubeGeometry(mouth, 6, 0.0018, 5, false));
  }
  const nose = new THREE.SphereGeometry(0.011, 10, 8);
  nose.scale(1.15, 0.85, 1).translate(0, 0.554, 0.488);
  darkParts.push(nose);
  // mirrored decals need their winding refreshed: solid() on merge input is position-only, so re-skin by signed volume
  const fix = (g) => { const p = Array.from(g.attributes.position.array), ix = Array.from(g.index.array); return solid(p, ix); };
  fur(head, skullGeo, "skull");
  part(head, fix(merge(redDecals.map(fix))), C.red, C.red, flat()).name = "markings";
  part(head, merge(darkParts), C.dark, C.dark, flat()).name = "features";
  part(head, merge(shines), C.shine, C.shine, flat()).name = "shine";
  // ears: big triangles, upright and a little out; red-tinted inner leaf; red tips (a material group)
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const ear = joint("ear" + side, head, 0.04 * s, 0.6, 0.322);
    const EH = 0.125;
    const outer = new THREE.ConeGeometry(0.05, EH, 4, 6);
    groups(outer, (x, y) => (y > EH * 0.16 ? 1 : 0));
    outer.rotateY(Math.PI / 4).scale(1, 1, 0.55).translate(0, EH / 2, 0).rotateX(-0.08).rotateZ(-0.3 * s)
      .translate(0.04 * s, 0.6, 0.322);
    const om = part(ear, outer, C.fur, C.furShade);
    om.material = [kit.cel(C.fur, C.furShade, FUR), kit.cel(C.red, C.redShade, FUR)];
    const inner = new THREE.ConeGeometry(0.034, EH * 0.72, 4, 1);
    inner.rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, EH * 0.36, 0).rotateX(-0.08).rotateZ(-0.3 * s)
      .translate(0.04 * s, 0.602, 0.331);
    part(ear, inner, C.furShade, C.furShade, flat());
  }

  // --- tails: nine fox brushes on one fan; each a planar curve (local: up and back), two segments ---
  const TAILC = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.035, -0.08], [0, 0.11, -0.16], [0, 0.22, -0.215],
    [0, 0.34, -0.23], [0, 0.45, -0.2], [0, 0.52, -0.13]].map((p) => V(...p)));
  const TR = (t) => 0.068 * (0.3 * (1 - t) + Math.sin(Math.PI * (0.94 * t) ** 0.75));
  const TMID = 0.5, TMIDP = TAILC.getPointAt(TMID);
  function tailSeg(t0, t1, r0k, steps) {
    const rings = [], tags = [], seg = 10, X = V(1, 0, 0);
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps, P = TAILC.getPointAt(t), T = TAILC.getTangentAt(t), B = T.clone().cross(X).normalize();
      const k = r0k + (1 - r0k) * Math.min(1, i / 2);
      const r = Math.max(TR(t) * k, 2e-4);
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(X, Math.cos(a) * r * 0.9).addScaledVector(B, Math.sin(a) * r).toArray();
      }));
      if (i < steps) for (let j = 0; j < seg; j++) { const g = t + (t1 - t0) / steps / 2 > 0.84 ? 1 : 0; tags.push(g, g); }
    }
    const geo = skin(rings, { dome: 0.6 });
    const ix = geo.index.array, bk = [[], []];
    for (let k = 0; k < ix.length / 3; k++) bk[tags[k] ?? (t1 > 0.9 ? 1 : 0)].push(ix[3 * k], ix[3 * k + 1], ix[3 * k + 2]);
    geo.setIndex(bk.flat());
    geo.clearGroups();
    geo.addGroup(0, bk[0].length, 0);
    geo.addGroup(bk[0].length, bk[1].length, 1);
    return geo;
  }
  // root puff: a fur bulb over the rump where the tails part, hiding nine roots meeting
  const puff = new THREE.SphereGeometry(1, 14, 10);
  puff.scale(0.05, 0.045, 0.05).translate(0, 0.418, -0.262);
  fur(tailBase, puff, "tailRoot");
  const TAILS = [];
  const tailMat = () => [kit.cel(C.fur, C.furShade, FUR), kit.cel(C.red, C.redShade, FUR)];
  const P0 = pivots.tailBase;
  for (let i = 0; i < NT; i++) {
    const fan = joint("fan" + i, tailBase, ...P0);
    const tr = joint("tail" + i, fan, ...P0);
    const tm = joint("tail" + i + "b", tr, P0[0], P0[1] + TMIDP.y, P0[2] + TMIDP.z);
    const a = tailSeg(0, TMID + 0.06, 1, 9).translate(...P0);
    const b = tailSeg(TMID - 0.04, 1, 0.8, 11).translate(...P0);
    const ma = part(tr, a, C.fur, C.furShade);
    const mb = part(tm, b, C.fur, C.furShade);
    ma.material = tailMat(); mb.material = tailMat();
    ma.name = "tail" + i + "Root"; mb.name = "tail" + i + "Tip";
    const u = NT === 1 ? 0 : (i / (NT - 1)) * 2 - 1;
    fan.scale.setScalar(1 - 0.14 * Math.abs(u)); // the centre tails stand tallest
    TAILS.push({ fan, tr, tm, u });
  }

  // --- legs: one loft per segment, taper-through ---
  const paw = (x, z, f, b) => loftY([
    { y: 0.0, w: 0.019, f, b, x, z },
    { y: 0.013, w: 0.021, f: f + 0.002, b: b + 0.002, x, z },
    { y: 0.03, w: 0.016, f: f - 0.012, b: b - 0.002, x, z },
  ], 12, { dome: 0 });
  const LEGS = {};
  for (const [s, side] of [[1, "L"], [-1, "R"]]) {
    const X = 0.038 * s, HX = 0.037 * s;
    // fore: shoulder -> elbow -> wrist -> paw
    const sh = joint("shoulder" + side, body, X, 0.36, 0.2);
    const el = joint("elbow" + side, sh, X, 0.245, 0.13);
    const wr = joint("wrist" + side, el, X, 0.075, 0.148);
    const pw = joint("paw" + side, wr, X, 0.03, 0.152);
    fur(sh, limb(X, [0.215, 0.41], [0.133, 0.236], [0.032, 0.025], [0.036, 0.027], [0.024, 0.025], { bulge: 0.12 }));
    fur(el, limb(X, [0.131, 0.25], [0.148, 0.068], [0.02, 0.016], [0.021, 0.015], [0.019, 0.016]));
    fur(wr, limb(X, [0.147, 0.085], [0.152, 0.03], [0.015, 0.015], [0.014, 0.014], [0.016, 0.017]));
    fur(pw, paw(X, 0.162, 0.028, 0.018));
    // hind: hip -> stifle -> hock -> foot
    const hp = joint("hip" + side, body, HX, 0.37, -0.17);
    const st = joint("stifle" + side, hp, HX, 0.235, -0.11);
    const ho = joint("hock" + side, st, HX, 0.095, -0.215);
    const ft = joint("foot" + side, ho, HX, 0.03, -0.205);
    fur(hp, limb(HX, [-0.185, 0.42], [-0.115, 0.228], [0.047, 0.027], [0.057, 0.025], [0.03, 0.025], { bulge: 0.1 }));
    fur(st, limb(HX, [-0.11, 0.244], [-0.216, 0.088], [0.021, 0.017], [0.025, 0.018], [0.021, 0.017]));
    fur(ho, limb(HX, [-0.214, 0.105], [-0.205, 0.03], [0.016, 0.015], [0.016, 0.015], [0.016, 0.017]));
    fur(ft, paw(HX, -0.196, 0.026, 0.017));
    LEGS[side + "F"] = { A: sh, B: el, Cj: wr, P: pw, toe: [0.19, 0] };
    LEGS[side + "H"] = { A: hp, B: st, Cj: ho, P: ft, toe: [-0.17, 0] };
  }
  for (const L of Object.values(LEGS)) {
    L.u1 = [L.B.position.y, L.B.position.z];
    L.u2 = [L.Cj.position.y, L.Cj.position.z];
    L.r3 = [L.P.position.y, L.P.position.z];
    const pp = pivots[L.P.name];
    L.r4 = [L.toe[1] - pp[1], L.toe[0] - pp[2]];
    L.L1 = Math.hypot(...L.u1); L.L2 = Math.hypot(...L.u2);
  }

  // ---------- solver (as shiba.js) ----------
  const rot = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const ang = ([y, z]) => Math.atan2(z, y);
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function wristTarget(L, F, psi, phi) {
    const r4 = rot(L.r4, psi), r3 = rot(L.r3, phi);
    return [F[1] - r4[0] - r3[0], F[0] - r4[1] - r3[1]];
  }
  function solveLeg(L, F, psi, phi) {
    const Tw = wristTarget(L, F, psi, phi), bx = body.rotation.x;
    const t = rot([Tw[0] - body.position.y, Tw[1] - body.position.z], -bx);
    const A = [L.A.position.y, L.A.position.z], v = [t[0] - A[0], t[1] - A[1]];
    let d = Math.hypot(...v);
    const e = [v[0] / d, v[1] / d];
    d = Math.min(Math.max(d, Math.abs(L.L1 - L.L2) + 1e-4), L.L1 + L.L2 - 1e-5);
    const a = (L.L1 * L.L1 - L.L2 * L.L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L.L1 * L.L1 - a * a));
    const cr = (p, q) => p[0] * q[1] - p[1] * q[0], sgn = Math.sign(cr(L.u1, L.u2));
    let K = [e[0] * a - e[1] * h, e[1] * a + e[0] * h];
    if (Math.sign(cr(K, [e[0] * d - K[0], e[1] * d - K[1]])) !== sgn) K = [e[0] * a + e[1] * h, e[1] * a - e[0] * h];
    const tA = ang(K) - ang(L.u1), tAB = ang([e[0] * d - K[0], e[1] * d - K[1]]) - ang(L.u2);
    L.A.rotation.set(tA, 0, 0);
    L.B.rotation.set(tAB - tA, 0, 0);
    L.Cj.rotation.set(phi - bx - tAB, 0, 0);
    L.P.rotation.set(psi - phi, 0, 0);
  }
  function reachCap(stance) {
    let cap = Infinity;
    for (const [L, F, psi, phi] of stance) {
      const Tw = wristTarget(L, F, psi, phi), lim = 0.98 * (L.L1 + L.L2);
      const a = rot([L.A.position.y, L.A.position.z], body.rotation.x), dz = a[1] + body.position.z - Tw[1];
      if (Math.abs(dz) < lim) cap = Math.min(cap, Tw[0] + Math.sqrt(lim * lim - dz * dz) - a[0]);
    }
    return cap;
  }

  // ---------- poses and clips ----------
  // A frame: lift (m, the whole fox), body [y offset, rx, z offset], neck, head, ears [rx, ry, rz] (deg);
  // tails: base [rx, ry, rz], spread (deg, fan half-angle), and per tail [root rx, root rz, mid rx, mid rz] (deg) as a
  // constant or a function (u in -1..1 across the fan, i); feet: per leg [toe z, toe y, paw pitch, pastern pitch].
  const REST_FEET = { LF: [0.19, 0, 0, 0], RF: [0.19, 0, 0, 0], LH: [-0.17, 0, 0, 0], RH: [-0.17, 0, 0, 0] };
  const SPREAD = (deg) => (NT === 1 ? 0 : deg * Math.min(1, 0.45 + 0.55 * (NT - 1) / 8));
  const POSES = {
    rest: { tailBase: [-12, 0, 0], spread: 72, tail: (u) => [-6 * (1 - Math.abs(u)), 0, 6 * Math.abs(u), 0] },
    // sit: body pitched up 30 about the hips, haunches down, hind paws ahead of the folded hocks, forelegs straight;
    // tails swept back behind the haunches and fanned low
    sit: {
      body: [-0.13, -42, 0.03], neck: [24, 0, 0], head: [18, 0, 0], tailBase: [26, 0, 0], spread: 80,
      tail: (u) => [-4, 0, 10 * Math.abs(u), 0],
      feet: { LF: [0.185, 0, 0, 2], RF: [0.185, 0, 0, 2], LH: [-0.04, 0, 0, -80], RH: [-0.04, 0, 0, -80] },
    },
  };
  const CLIPS = { idle: 4, walk: 0.9, run: 0.42, float: 3 };
  const GAIT = {
    walk: { duty: 0.64, S: 0.21, off: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }, zc: { F: 0.195, H: -0.172 },
      lift: { F: 0.045, H: 0.038 }, phiF: [-4, 14], phiH: [-6, 18], roll: { F: 40, H: 34 }, fold: { F: [55, 40], H: [10, 20] },
      drop: -0.008, bob: 0.005, pitch: 1.2 },
    run: { duty: 0.3, S: 0.34, off: { LH: 0, RH: 0.09, RF: 0.38, LF: 0.47 }, zc: { F: 0.23, H: -0.19 },
      lift: { F: 0.1, H: 0.085 }, phiF: [-10, 24], phiH: [-12, 26], roll: { F: 60, H: 50 }, fold: { F: [90, 75], H: [30, 45] },
      drop: -0.035, bob: 0.018, pitch: 8 },
  };
  function foot(g, key, ph) {
    const end = key[1], u = (((ph - g.off[key]) % 1) + 1) % 1, zc = g.zc[end], S = g.S, du = g.duty;
    const phiR = end === "F" ? g.phiF : g.phiH, roll = g.roll[end], rollT = 0.32 * du;
    const st = (uu) => {
      const s = uu / du;
      return [zc + S / 2 - S * s, 0, roll * ease((uu - (du - rollT)) / rollT), phiR[0] + (phiR[1] - phiR[0]) * ease(s)];
    };
    if (u < du) return { v: st(u), stance: true };
    const w = (u - du) / (1 - du), span = 1 - du, e = 1e-4;
    const a = st(du - e), a0 = st(du - 2 * e), b = st(0), b1 = st(e);
    const h = [2 * w ** 3 - 3 * w * w + 1, w ** 3 - 2 * w * w + w, -2 * w ** 3 + 3 * w * w, w ** 3 - w * w];
    const z = h[0] * a[0] + h[1] * ((a[0] - a0[0]) / e) * span + h[2] * b[0] + h[3] * ((b1[0] - b[0]) / e) * span;
    const y = g.lift[end] * Math.sin(Math.PI * Math.pow(w, 0.85)) ** 2;
    const bump = Math.sin(Math.PI * w);
    const [fp, fq] = g.fold[end];
    const psi = a[2] * (1 - ease(w)) + fq * bump, phi = a[3] * (1 - ease(w)) + b[3] * ease(w) + fp * bump;
    return { v: [z, y, Math.max(0, psi), phi], stance: false };
  }

  function apply(F) {
    for (const j of Object.values(joints)) { j.rotation.set(0, 0, 0); j.position.copy(j.userData.rest); }
    fox.position.y = F.lift ?? 0;
    const b = F.body ?? [0, 0, 0];
    body.position.y += b[0];
    body.position.z += b[2] ?? 0;
    body.rotation.x = b[1] * D;
    for (const k of ["neck", "head", "earL", "earR", "tailBase"]) if (F[k]) joints[k].rotation.set(F[k][0] * D, F[k][1] * D, F[k][2] * D);
    const br = F.breath ?? 0;
    bodyMesh.scale.set(1 + 0.6 * br, 1 + br, 1);
    const sp = SPREAD(F.spread ?? 72);
    TAILS.forEach((T, i) => {
      const r = typeof F.tail === "function" ? F.tail(T.u, i) : F.tail ?? [0, 0, 0, 0];
      T.fan.rotation.set(0, 0, -T.u * sp * D);
      T.tr.rotation.set(r[0] * D, 0, r[1] * D);
      T.tm.rotation.set(r[2] * D, 0, r[3] * D);
    });
    const feet = { ...REST_FEET, ...(F.feet ?? {}) }, stance = [];
    for (const [k, f] of Object.entries(feet)) if (f.stance !== false && f[1] === 0) stance.push([LEGS[k], f, f[2] * D, f[3] * D]);
    if (F.cap) {
      const cap = reachCap(stance);
      if (body.position.y > cap) body.position.y = cap;
    }
    for (const [k, f] of Object.entries(feet)) solveLeg(LEGS[k], f, f[2] * D, f[3] * D);
    root.updateMatrixWorld(true);
  }

  const cyc = (n, ph, lag = 0) => Math.cos(TAU * n * (ph - lag));
  const syc = (n, ph, lag = 0) => Math.sin(TAU * n * (ph - lag));
  function clip(name, t) {
    const Tn = CLIPS[name], ph = (((t % Tn) + Tn) % Tn) / Tn;
    if (name === "idle") {
      // three breaths; ear twitches (left at 0.3, right at 0.72); the tails sway in a wave across the fan
      const b = syc(3, ph), tw = Math.exp(-(((ph - 0.3) / 0.04) ** 2)), tw2 = Math.exp(-(((ph - 0.72) / 0.04) ** 2));
      return {
        body: [0.0015 * b, -0.6 * b, 0], breath: 0.012 * b,
        neck: [0.8 * b, 0, 0], head: [-0.5 * b, 8 * syc(1, ph, 0.15), 3 * syc(1, ph, 0.2)],
        earL: [-20 * tw, 0, 10 * tw], earR: [-20 * tw2, 0, -10 * tw2],
        tailBase: [-12 + 1.5 * b, 0, 0], spread: 72,
        tail: (u, i) => {
          const lag = (i / Math.max(1, NT)) * 0.9;
          return [-6 * (1 - Math.abs(u)) + 3 * syc(2, ph, lag), 7 * syc(2, ph, lag), 6 * Math.abs(u) + 9 * syc(2, ph, lag + 0.1),
            8 * syc(2, ph, lag + 0.12)];
        },
      };
    }
    if (name === "float") {
      // hovering: a slow bob, legs tucked under like a leaping cat, tails fanned wide and rippling outward
      const b = syc(1, ph), w = syc(2, ph);
      return {
        lift: 0.09 + 0.012 * b, body: [0, -4 + 1.5 * b, 0], breath: 0.01 * w,
        neck: [-4, 0, 0], head: [-6 + 2 * b, 0, 2 * syc(1, ph, 0.2)],
        earL: [-6, 0, 4 * w], earR: [-6, 0, -4 * w],
        tailBase: [-4 + 2 * b, 0, 0], spread: 100,
        tail: (u, i) => {
          const lag = Math.abs(u) * 0.25;
          return [-10 + 4 * syc(2, ph, lag), 6 * u * syc(2, ph, lag), 4 + 10 * syc(2, ph, lag + 0.12), 6 * u * syc(2, ph, lag + 0.1)];
        },
        feet: {
          LF: [0.17, 0.15, 100, 60], RF: [0.15, 0.13, 100, 60], LH: [-0.1, 0.12, 30, -70], RH: [-0.12, 0.11, 30, -70],
        },
      };
    }
    const g = GAIT[name], feet = {};
    for (const k of Object.keys(g.off)) {
      const f = foot(g, k, ph);
      feet[k] = f.v;
      if (!f.stance) feet[k].stance = false;
    }
    const run = name === "run";
    return {
      cap: true,
      body: run ? [g.drop + g.bob * cyc(1, ph, 0.85), g.pitch * syc(1, ph, 0.1), 0] : [g.drop - g.bob * cyc(4, ph, 0.05), g.pitch * syc(2, ph), 0],
      neck: run ? [16 - 8 * syc(1, ph, 0.1), 0, 0] : [2 + 2 * cyc(4, ph, 0.1), 0, 0],
      head: run ? [-6 - 6 * syc(1, ph, 0.25), 0, 0] : [-1.5 - 1.5 * cyc(4, ph, 0.15), 2 * syc(1, ph), 0],
      earL: run ? [-30, 0, -6] : [-3, 0, 0], earR: run ? [-30, 0, 6] : [-3, 0, 0],
      // tails: streaming back and narrower in the run, a trailing wave in both gaits
      tailBase: run ? [-48 + 4 * cyc(1, ph), 0, 0] : [-22, 0, 0], spread: run ? 46 : 60,
      tail: (u, i) => {
        const lag = Math.abs(u) * 0.2;
        return run ? [-6 + 6 * syc(1, ph, lag), 3 * syc(1, ph, lag), -18 + 10 * syc(1, ph, lag + 0.15), 0]
          : [-4 + 3 * syc(2, ph, lag), 4 * syc(1, ph, lag), 4 * Math.abs(u) + 6 * syc(2, ph, lag + 0.12), 4 * syc(1, ph, lag + 0.1)];
      },
      feet,
    };
  }

  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`kitsune: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(clip(m[1], +m[2]));
    }
    if (!POSES[name]) throw new Error(`kitsune: unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    apply(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

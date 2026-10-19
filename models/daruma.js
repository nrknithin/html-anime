// Daruma — the round red Japanese wish doll: an egg-shaped papier-mache body with a weighted round bottom, a white
// face framed in ink, two big blank white eyes (paint one in when you make the wish, the other when it comes true),
// bold black eyebrows drawn as cranes' wings and a moustache and beard drawn as turtle-shell hooks, and gold scroll
// swirls on the belly and the flanks (an original crest; no characters). Static, plus a wobble clip.
//
// Construction: the body is one surface of revolution, profile Y(t) = H (1 - cos t) / 2, R(t) = Rm sin t (1 + e cos t)
// (t from the bottom pole to the top pole; e > 0 puts the widest ring below the middle). Plan: a circle behind and a
// superellipse in front (flatter face, so the hero three-quarter still looks into it), squashed to DEEP front-to-back. Every painted part is a decal: a closed slab authored in surface coordinates (u = arc length around
// the body from the front, +u toward the doll's left (+X), y = height), laid on the body at a small normal offset
// (face 3 mm, eyes and strokes on top of that), so the paint is raised a few mm as real daruma paint is. Patches are
// polar grids (star-shaped outlines), strokes are ribbons along Catmull-Rom paths with a brush taper. Winding comes
// from each piece's signed volume. Pieces are merged per material: body, white (face + eye discs), black, gold.
//
// Proportions (base unit H = height, default 0.25 m; a giant temple daruma is { height: 1.8 }): width 0.86 H, depth
// 0.83 H, widest ring at 0.45 H, bottom curvature radius ~0.45 H (rolls). Face: centre 0.60 H, 0.67 H wide arc,
// 0.52 H tall, a painted black border. Eyes: radius 0.094 H, centres +-0.146 H, at 0.64 H; pupils 0.066 H. Brows
// ~0.05-0.07 H thick (identity strokes stay above 1/15 H).
//
// Two-tone pairs (festival script): red body accent #ff4d6d / sky #24143a (low threshold, so the dark shade only
// takes the far side and the underside); white face and eyes sclera #f6f3ee / skin #f0c2ae (low threshold, the face
// looks at the camera); gold practical #ffb020 flat; brush black hair #1a1020 flat; ink #140c1c. White body: sclera /
// skin; gold body: practical / sky.
//
// Options: build(THREE, kit, colors, { height = 0.25, eyes = 0 | 1 | 2, color = "red" | "white" | "gold" }).
//   eyes   0 blank, 1 (default) the doll's left eye (+X, image right from the front) painted in, 2 both.
//   color  body paint; ornaments are gold on the red body, red (accent, flat) on the white and gold bodies.
// Rig: root -> body (the rocking pivot). Clip wobble 1.6 s (pose("wobble@0.4")): a push, then a decaying rock that
// rights itself, looping (20 deg first lean, 2.5 rocks, still for the last ~0.4 s). The body rolls without slipping on its round bottom: for each tilt the lowest profile point
// is found, the body is lifted so it touches y = 0 and slid by the rolled arc length, so nothing sinks or skids.

export const meta = {
  name: "daruma",
  height: 0.25,
  script: "festival",
  colors: {
    red: "#ff4d6d", redShade: "#24143a",
    white: "#f6f3ee", whiteShade: "#f0c2ae",
    gold: "#ffb020",
    black: "#1a1020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = { ...meta.colors, ...colors };
  const { height = meta.height, eyes = 1, color = "red" } = opts;
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const H = 0.25, Rm = 0.43 * H, E = 0.1, DEEP = 0.93;

  const root = new THREE.Group();
  root.name = "daruma";
  const scale = new THREE.Group();
  scale.name = "scale";
  scale.scale.setScalar(height / H);
  root.add(scale);
  const body = new THREE.Group();
  body.name = "body";
  scale.add(body);
  const joints = { body };

  // ---------- profile ----------
  const Yt = (t) => (H * (1 - Math.cos(t))) / 2;
  const Rt = (t) => Rm * Math.sin(t) * (1 + E * Math.cos(t));
  const tOf = (y) => Math.acos(Math.min(1, Math.max(-1, 1 - (2 * y) / H)));
  const R = (y) => Rt(tOf(y));

  // plan: a circle behind, a superellipse in front (flatter face, fuller front corners), so a three-quarter view
  // still looks into the face; at phi = +-90 deg both are r, so the rocking profile is the plain revolution profile
  const PF = 2.6;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  function P(phi, y) {
    const r = R(y), sn = Math.sin(phi), c = Math.cos(phi);
    return c > 0 ? [r * spow(sn, 2 / PF), y, DEEP * r * spow(c, 2 / PF)] : [r * sn, y, DEEP * r * c];
  }
  // a surface point at (u, y) lifted h along the normal; u is arc length around from the front at that height
  function surf(u, y, h) {
    const r = R(y), phi = u / r, e = 1e-4;
    const p = P(phi, y), a = P(phi + e, y), b = P(phi - e, y), c = P(phi, y + e), d = P(phi, y - e);
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dy = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n = [du[1] * dy[2] - du[2] * dy[1], du[2] * dy[0] - du[0] * dy[2], du[0] * dy[1] - du[1] * dy[0]];
    const l = Math.hypot(...n) || 1, sg = n[0] * p[0] + n[2] * p[2] < 0 ? -1 : 1;
    return [p[0] + (sg * n[0] / l) * h, p[1] + (sg * n[1] / l) * h, p[2] + (sg * n[2] / l) * h];
  }

  // ---------- geometry ----------
  function solid(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
         - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
         + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    return { pos, idx };
  }
  const pieces = { body: [], white: [], black: [], gold: [] };

  // body of revolution: poles + rings
  {
    const N = 30, S = 44, pos = [0, 0, 0], idx = [];
    for (let i = 1; i < N; i++) {
      const t = (i / N) * Math.PI, y = Yt(t);
      for (let j = 0; j < S; j++) pos.push(...P((j / S) * TAU, y));
    }
    const top = pos.length / 3;
    pos.push(0, H, 0);
    for (let j = 0; j < S; j++) idx.push(0, 1 + ((j + 1) % S), 1 + j);
    for (let i = 0; i < N - 2; i++)
      for (let j = 0; j < S; j++) {
        const a = 1 + i * S + j, b = 1 + i * S + ((j + 1) % S), c = a + S, d = b + S;
        idx.push(a, b, c, b, d, c);
      }
    const last = 1 + (N - 2) * S;
    for (let j = 0; j < S; j++) idx.push(top, last + j, last + ((j + 1) % S));
    pieces.body.push(solid(pos, idx));
  }

  // a closed slab from a 2D grid: rows of [u, y] points (row 0 may be a single centre point); the last row is the rim.
  // top at h1, bottom at h0, walls along the rim; `ring` marks the rim as a closed loop
  function slab(rows, h0, h1, { ring = true, hole = false } = {}) {
    const pos = [], idx = [], top = [], bot = [];
    for (const [k, row] of rows.entries()) {
      top[k] = []; bot[k] = [];
      for (const [u, y] of row) { top[k].push(pos.length / 3); pos.push(...surf(u, y, h1)); }
      for (const [u, y] of row) { bot[k].push(pos.length / 3); pos.push(...surf(u, y, h0)); }
    }
    const tri = (rev, a, b, c) => (rev ? idx.push(a, c, b) : idx.push(a, b, c));
    const grid = (L, rev) => {
      for (let k = 0; k < rows.length - 1; k++) {
        const A = L[k], B = L[k + 1], n = B.length;
        for (let j = 0; j < (ring ? n : n - 1); j++) {
          const j1 = (j + 1) % n;
          if (A.length === 1) tri(rev, A[0], B[j], B[j1]);
          else tri(rev, A[j], B[j], B[j1]), tri(rev, A[j], B[j1], A[j1]);
        }
      }
    };
    grid(top, false);
    grid(bot, true);
    // walls: along the last row, and along row 0 too for a ribbon or a ring with a hole (wound the other way)
    const rim = (k, rev) => {
      const n = top[k].length;
      for (let j = 0; j < (ring ? n : n - 1); j++) {
        const j1 = (j + 1) % n;
        tri(rev, top[k][j], bot[k][j], bot[k][j1]), tri(rev, top[k][j], bot[k][j1], top[k][j1]);
      }
    };
    rim(rows.length - 1, false);
    if (!ring || hole) rim(0, true);
    if (!ring) {
      const e = rows.length - 1, n = top[0].length - 1;
      tri(false, top[e][0], top[0][0], bot[0][0]), tri(false, top[e][0], bot[0][0], bot[e][0]);
      tri(false, top[0][n], top[e][n], bot[e][n]), tri(false, top[0][n], bot[e][n], bot[0][n]);
    }
    return solid(pos, idx);
  }
  // star-shaped patch: outline(s) -> [u, y] for s in [0, 1)
  function patch(cu, cy, outline, h0, h1, { K = 6, S = 40 } = {}) {
    const rim = Array.from({ length: S }, (_, j) => outline(j / S));
    const rows = [[[cu, cy]]];
    for (let k = 1; k <= K; k++) rows.push(rim.map(([u, y]) => [cu + ((u - cu) * k) / K, cy + ((y - cy) * k) / K]));
    return slab(rows, h0, h1);
  }
  const disc = (cu, cy, r, h0, h1) => patch(cu, cy, (s) => [cu + r * Math.cos(s * TAU), cy + r * Math.sin(s * TAU)], h0, h1, { K: 3, S: 28 });
  // brush stroke: a ribbon along keys [[u, y], ...], half-width w * taper(t)
  function stroke(keys, w, h0, h1, { steps = 24, head = 0.25, tail = 0.35, min = 0.15 } = {}) {
    const curve = new THREE.CatmullRomCurve3(keys.map(([u, y]) => new THREE.Vector3(u, y, 0)));
    const L = [], Rr = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = curve.getPointAt(t), d = curve.getTangentAt(t);
      const a = Math.min(1, t / head), b = Math.min(1, (1 - t) / tail);
      const k = min + (1 - min) * Math.sin((Math.PI / 2) * Math.min(a, b));
      const ww = (typeof w === "function" ? w(t) : w) * k;
      L.push([p.x - d.y * ww, p.y + d.x * ww]);
      Rr.push([p.x + d.y * ww, p.y - d.x * ww]);
    }
    // rows across the ribbon would leave a single closed rim; build it as two rows (left, right) with end walls
    return slab([L, Rr], h0, h1, { ring: false });
  }
  const mirror = (keys) => keys.map(([u, y]) => [-u, y]);
  // the face and its strokes are authored at FU = 1 and widened around the body, so a three-quarter view still
  // shows both eyes
  const FU = 1.14;
  const fu = (keys) => keys.map(([u, y]) => [u * FU, y]);

  // ---------- face ----------
  const FACE = { cy: 0.15, a: 0.073 * FU, top: 0.064, bot: 0.066, p: 2.3 };
  const faceRim = (s) => {
    const t = s * TAU, c = Math.cos(t), sn = Math.sin(t), e = 2 / FACE.p;
    const yy = sn >= 0 ? FACE.top * spow(sn, e) : FACE.bot * spow(sn, 0.85);
    // the chin narrows: the half-width shrinks toward the bottom
    const w = FACE.a * (sn < 0 ? 1 - 0.18 * (-sn) ** 2 : 1);
    return [w * spow(c, e), FACE.cy + yy];
  };
  pieces.white.push(patch(0, FACE.cy, faceRim, -0.003, 0.003, { K: 8, S: 64 }));
  // a painted black border round the face (the hull alone loses the edge where the face turns toward the camera)
  {
    const S = 96, inner = [], outer = [];
    for (let j = 0; j < S; j++) {
      const [u, y] = faceRim(j / S), du = u, dy = y - FACE.cy, l = Math.hypot(du, dy) || 1;
      inner.push([u - (du / l) * 0.0022, y - (dy / l) * 0.0022]);
      outer.push([u + (du / l) * 0.0012, y + (dy / l) * 0.0012]);
    }
    pieces.black.push(slab([inner, outer], 0.0, 0.0045, { hole: true }));
  }

  // eyes: blank white discs, pupils by option
  const EYE = { u: 0.032 * FU, y: 0.16, r: 0.0235 };
  // each eye: a black disc under a slightly smaller white disc, so the rim is a painted ring that never breaks
  for (const s of [1, -1]) {
    pieces.black.push(disc(s * EYE.u, EYE.y, EYE.r, 0.001, 0.0045));
    pieces.white.push(disc(s * EYE.u, EYE.y, EYE.r - 0.0028, 0.002, 0.0065));
  }
  const paint = eyes >= 2 ? [1, -1] : eyes >= 1 ? [1] : [];
  for (const s of paint) pieces.black.push(disc(s * EYE.u, EYE.y, EYE.r * 0.7, 0.004, 0.0085));

  // eyebrows (crane wings): thick sweeping strokes, rising outward with a flicked tip
  const BROW = fu([[0.008, 0.186], [0.026, 0.197], [0.047, 0.2], [0.064, 0.19], [0.07, 0.178]]);
  const browW = (t) => 0.0062 * (1 + 0.5 * Math.sin(Math.PI * t));
  for (const k of [BROW, mirror(BROW)]) pieces.black.push(stroke(k, browW, 0.001, 0.006, { head: 0.15, tail: 0.5 }));

  // nose: a small hooked curl
  pieces.black.push(stroke(fu([[-0.006, 0.137], [0, 0.132], [0.007, 0.136]]), 0.0032, 0.001, 0.006, { steps: 10, head: 0.3, tail: 0.3 }));
  // moustache (turtle head and flippers): two sweeping strokes from under the nose out and down
  const MOU = fu([[0.004, 0.126], [0.022, 0.128], [0.042, 0.12], [0.056, 0.104], [0.058, 0.093]]);
  for (const k of [MOU, mirror(MOU)]) pieces.black.push(stroke(k, 0.0055, 0.001, 0.006, { head: 0.12, tail: 0.55 }));
  // beard (turtle shell): a stroke down each cheek along the face rim to the chin, hooks curling out of it
  const CHEEK = fu([[0.066, 0.122], [0.06, 0.104], [0.044, 0.092], [0.022, 0.087], [0.006, 0.088]]);
  const HOOKS = [
    [[0.05, 0.1], [0.041, 0.107], [0.036, 0.104]],
    [[0.031, 0.093], [0.024, 0.101], [0.018, 0.099]],
  ].map(fu);
  for (const k of [CHEEK, mirror(CHEEK)]) pieces.black.push(stroke(k, 0.0045, 0.001, 0.006, { head: 0.2, tail: 0.35 }));
  for (const b of HOOKS) for (const k of [b, mirror(b)]) pieces.black.push(stroke(k, 0.0036, 0.001, 0.006, { steps: 12, head: 0.1, tail: 0.6 }));

  // ---------- ornament (gold scrolls) ----------
  function spiral(cu, cy, r0, turns, dir, start) {
    const pts = [];
    const n = Math.max(6, Math.round(turns * 10));
    for (let i = 0; i <= n; i++) {
      const f = i / n, a = start + dir * f * turns * TAU, r = r0 * (1 - 0.82 * f);
      pts.push([cu + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  const orn = [];
  // belly crest: a pair of scrolls curling inward under the chin, joined by a stem
  {
    const S1 = spiral(0.03, 0.058, 0.018, 1.25, 1, -Math.PI * 0.15);
    orn.push([[0, 0.034], [0.013, 0.039], ...S1]);
  }
  const ORN = [];
  for (const k of orn) ORN.push(k, mirror(k));
  // flank swirls: a big cloud scroll on each side
  const F = spiral(0.135, 0.085, 0.026, 1.4, -1, Math.PI * 1.1);
  ORN.push(F, mirror(F));
  for (const k of ORN) pieces.gold.push(stroke(k, 0.0042, -0.001, 0.0035, { steps: 40, head: 0.08, tail: 0.25, min: 0.35 }));

  // ---------- meshes (one per material) ----------
  function merged(list) {
    const pos = [], idx = [];
    for (const p of list) { const o = pos.length / 3; pos.push(...p.pos); for (const i of p.idx) idx.push(i + o); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const BODY = { red: [C.red, C.redShade], white: [C.white, C.whiteShade], gold: [C.gold, C.redShade] }[color] ?? [C.red, C.redShade];
  const ORNC = color === "gold" ? [C.red, C.red] : color === "white" ? [C.red, C.red] : [C.gold, C.gold];
  const MAT = {
    body: [BODY[0], BODY[1], -0.3, true],
    white: [C.white, C.whiteShade, 0.02, true],
    black: [C.black, C.black, 0.35, false],
    gold: [ORNC[0], ORNC[1], 0.35, false],
  };
  for (const [key, list] of Object.entries(pieces)) {
    if (!list.length) continue;
    const [base, shade, threshold, outline] = MAT[key];
    const mesh = kit.toon(merged(list), base, shade, { threshold, outline });
    mesh.name = key;
    body.add(mesh);
  }

  // ---------- rocking ----------
  // profile in the rocking plane (x, y): both sides, bottom pole to top; arc length from the bottom
  const PROF = [];
  {
    const n = 240;
    let s = 0, prev = null;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI, p = [Rt(t), Yt(t)];
      if (prev) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      PROF.push([p[0], p[1], s]);
      prev = p;
    }
  }
  // tilt theta about Z (+ tips the top toward -X); roll without slipping
  function rock(theta) {
    const c = Math.cos(theta), sn = Math.sin(theta), side = theta > 0 ? -1 : 1;
    let best = Infinity, bx = 0, bs = 0;
    for (const [r, y, s] of PROF) {
      const x = side * r, yy = x * sn + y * c;
      if (yy < best) { best = yy; bx = x * c - y * sn; bs = s; }
    }
    body.rotation.set(0, 0, theta);
    body.position.set(side * bs - bx, -best, 0);
  }

  const CLIPS = { wobble: 1.6 };
  function wobble(t) {
    const u = (((t / CLIPS.wobble) % 1) + 1) % 1;
    // a quick push (ease in to the first lean), then a decaying rock that settles before the loop
    const env = Math.min(1, u / 0.12) ** 0.6 * (1 - u) ** 2.2;
    return 20 * D * env * Math.sin(TAU * 2.5 * u);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`daruma: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      rock(wobble(+m[2]));
    } else if (name === "rest") rock(0);
    else throw new Error(`daruma: unknown pose "${name}" (rest, or wobble@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

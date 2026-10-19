// donkey.js - a grey-brown farm donkey (Equus asinus), procedural, animated: idle, walk, trot, bray.
// Contract: harness/lab/README.md. Metres, +Y up, faces +Z, its left is +X, hooves on y = 0.
//
// Construction (the horse's recipe, references/subjects/quadrupeds.md): every organic part is a two-rail loft
// authored in world side-view metres (rails [z, y], half-widths on X), so a misfit is one number. Broad markings
// (pale belly and muzzle, dark ear tips) are material groups on whole quads of the lofts (one mesh, one hull);
// narrow ones (dorsal stripe, shoulder cross, eye rings) are decals: thin shells laid on the loft's own surface
// (loftFn), so they follow it exactly and never stand out of the silhouette. Ears are lanceolate leaf lofts with a pale inner leaf, the mane a short
// upright brush (cap loft on the crest with a sawtooth top), the tail a thin cord with a dark teardrop tuft.
// The mouth is a real split: an upper-head loft ending on the mouth line and a hinged jaw loft, with a dark
// mouth interior hidden inside both at rest, so the bray can open it.
//
// What makes it a donkey and not a small horse (the five identity cues, in order): very long upright ears with
// dark tips; a big head with a pale muzzle and pale eye rings; the dorsal stripe and shoulder cross; a short
// upright mane and a thin tufted tail; a round barrel on straight legs with small upright hooves.
//
// Proportions (H = withers height = 1.20 m): ear tips 1.61 H (1.93 m), head poll to lip 0.52 H, ears 0.29 H, chest
// floor 0.51 H, point of shoulder to buttock 1.08 H, croup level with the withers, tail tuft to 0.33 H. ~6.5k tris.
// build(THREE, kit, colors, { height }) scales it uniformly to that top height (ear tips); default real size.
//
// Rig: body -> neck -> head -> jaw, earL/R; body -> tail -> tailTip; per leg a four-joint chain
//   fore: shoulder (point of shoulder, no mesh) -> elbow (forearm) -> knee (cannon) -> fetlockF (pastern + hoof)
//   hind: hip (thigh) -> stifle (gaskin) -> hock (cannon) -> fetlockH (pastern + hoof)
// Signs (rx, degrees): a hanging limb or the tail swings BACK with +rx; the front knee flexes with +rx, the hock
// with -rx; neck and head lift with -rx; the jaw opens with +rx; an upright ear tips back with -rx; +rz on the
// tail swings it to +X.
//
// Clips: build() returns clips { idle: 4, walk: 1.1, trot: 0.66, bray: 2.6 } (s); pose("walk@0.3") is that clip at
// 0.3 s, looping. In place: each hoof follows a ground track (carried back at ground speed in stance, rolling over
// the toe at breakover, a Hermite arc in swing), solved per leg by a two-bone IK (elbow / stifle) over a knee or
// hock flex scheduled by phase. Walk: lateral sequence LH LF RH RF; trot: diagonal pairs. idle and bray keep
// rest's footing. Bray is meant to play once (0 -> 2.6 s); it starts and ends on rest, so it also loops cleanly.
//
// Two-tone pairs from the "noon" script (base / shade):
//   coat   sky #f2d7ae / iris #5c3d32       threshold 0.5: grey-brown in shade, dun only where the sun lands
//   pale   practical #fffaf2 / sclera #f6f3ee threshold 0.1 (muzzle, eye rings, belly, inner ears)
//   dark   iris #5c3d32 / iris              (dorsal stripe, cross, ear tips, mane, tail tuft, hooves)
//   eye    hair #241c16, glint practical; mouth interior hair; nostrils iris

export const meta = {
  name: "donkey",
  height: 1.928,
  script: "noon",
  colors: {
    coat: "#f2d7ae", coatShade: "#5c3d32",
    pale: "#fffaf2", paleShade: "#f6f3ee",
    dark: "#5c3d32", darkShade: "#5c3d32",
    eye: "#241c16", glint: "#fffaf2",
    mouth: "#241c16",
  },
  poses: ["rest", "walk-a", "walk-b", "trot-a", "bray"],
};

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const C = colors;
  const { height = meta.height } = opts;
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // ---------- geometry helpers (references/geometry.md) ----------
  function geom(pos, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // winding from the signed volume, never by hand
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
  // closed skin over rings of equal length; both ends domed
  function skin(rings, { dome = 0.5 } = {}) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
        idx.push(a, b, c, b, d, c);
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
    const g = solid(pos, idx);
    g.userData.seg = seg;
    g.userData.quads = (R - 1) * seg; // side triangles come in quad pairs: groups() keeps a quad whole
    return g;
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
  // A, B: side rails [[z, y], ...]; W: half-widths on X. Rings span X and the A-B vector. at(i, t, k) is the
  // surface at a fractional ring index i and angle t (0 = rail A, +X side first), pushed out by the factor k.
  function loftFn(A, B, W, { steps = 3, n = 2.2, x0 = 0 } = {}) {
    const sp = (k) => (steps > 1 ? spline(k, steps) : k);
    const az = sp(A.map((p) => p[0])), ay = sp(A.map((p) => p[1])), bz = sp(B.map((p) => p[0])), by = sp(B.map((p) => p[1])), ww = sp(W);
    const R = az.length;
    const at = (i, t, k = 1) => {
      const i0 = Math.max(0, Math.min(R - 2, Math.floor(i))), f = i - i0, L = (a) => a[i0] + (a[i0 + 1] - a[i0]) * f;
      const z1 = L(az), y1 = L(ay), z2 = L(bz), y2 = L(by), u = spow(Math.sin(t), 2 / n), v = spow(Math.cos(t), 2 / n);
      return [x0 + L(ww) * k * u, (y1 + y2) / 2 + ((y1 - y2) / 2) * k * v, (z1 + z2) / 2 + ((z1 - z2) / 2) * k * v];
    };
    return { R, at };
  }
  function railLoft(A, B, W, { seg = 14, dome = 0.5, ...o } = {}) {
    const F = loftFn(A, B, W, o);
    return skin(Array.from({ length: F.R }, (_, i) => Array.from({ length: seg }, (_, s) => F.at(i, (s / seg) * TAU))), { dome });
  }
  // A thin shell on a loft's surface (a marking): map(a, b) -> [ring index, angle] over a, b in [0, 1]; the
  // outer face sits `lift` (fraction of the ring radius) proud, the inner as far inside.
  function decal(F, map, na, nb, lift = 0.015) {
    const rings = [];
    for (let a = 0; a <= na; a++) {
      const out = [], inn = [];
      for (let b = 0; b <= nb; b++) {
        const [i, t] = map(a / na, b / nb);
        out.push(F.at(i, t, 1 + lift));
        inn.push(F.at(i, t, 1 - lift));
      }
      rings.push(out.concat(inn.reverse()));
    }
    return skin(rings, { dome: 0 });
  }
  function tube(pts, r0, r1, { steps = 8, seg = 6, dome = 0.5 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));
    const rings = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, P = curve.getPointAt(t), T = curve.getTangentAt(t);
      const N = V().crossVectors(T, V(1, 0, 0)).normalize(), B = V().crossVectors(T, N).normalize();
      const r = Math.max(r0 + (r1 - r0) * t, 1e-4);
      rings.push(Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU;
        return P.clone().addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r).toArray();
      }));
    }
    return skin(rings, { dome });
  }
  // material groups by a test on the quad (or cap triangle) centroid, world rest coordinates, and its ring
  // (a quad between rings r and r + 1 is r + 0.5; the end caps are 0 and the last ring)
  function groups(g, test) {
    const p = g.attributes.position, ix = g.index.array, buckets = [], Q = (g.userData.quads ?? 0) * 6, S = g.userData.seg ?? 1;
    for (let i = 0; i < ix.length; ) {
      const n = i < Q ? 6 : 3, ring = i < Q ? Math.floor(i / 6 / S) + 0.5 : (i - Q) / 3 < S ? 0 : Q / 6 / S;
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < n; k++) { cx += p.getX(ix[i + k]) / n; cy += p.getY(ix[i + k]) / n; cz += p.getZ(ix[i + k]) / n; }
      (buckets[test(cx, cy, cz, ring)] ??= []).push(...ix.slice(i, i + n));
      i += n;
    }
    g.setIndex(buckets.flat());
    g.clearGroups();
    let start = 0;
    buckets.forEach((b, k) => { if (b) { g.addGroup(start, b.length, k); start += b.length; } });
    return g;
  }

  // ---------- rig helpers (world rest coordinates) ----------
  const root = new THREE.Group();
  root.name = "donkey";
  const space = new THREE.Group(); // uniform size scale for { height }
  space.name = "space";
  root.add(space);
  const joints = {}, pivots = { space: [0, 0, 0] };
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
  const TH = { coat: 0.5, pale: 0.1, dark: 0.35 }; // coat 0.5: more of the grey-brown shade, dun only where the sun lands
  const MAT = Object.fromEntries(Object.keys(TH).map((k) => [k, () => kit.cel(C[k], C[k + "Shade"], { threshold: TH[k] })]));
  // geometry in world rest coordinates, hung on joint j; tones: one role or a list of roles per material group
  function part(j, geo, tones, o) {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const list = Array.isArray(tones) ? tones : [tones];
    const m = kit.toon(geo, C[list[0]], C[list[0] + "Shade"] ?? C[list[0]], { threshold: TH[list[0]], ...o });
    if (list.length > 1) m.material = list.map((t) => MAT[t]());
    j.add(m);
    return m;
  }
  const flat = (j, geo, hex, o = { outline: false }) => {
    const p = pivots[j.name];
    geo.translate(-p[0], -p[1], -p[2]);
    const m = kit.toon(geo, hex, hex, o);
    j.add(m);
    return m;
  };

  // ---------- body ----------
  const body = joint("body", space, 0, 1.0, 0);
  const barrel = joint("barrel", body, 0, 0.9, 0); // breathing scales this group only (it has no children)
  {
    const Z = [0.63, 0.57, 0.46, 0.31, 0.1, -0.12, -0.32, -0.48, -0.6, -0.68, -0.72];
    const T = [0.97, 1.1, 1.18, 1.2, 1.175, 1.17, 1.19, 1.205, 1.165, 1.07, 0.96];
    const B = [0.8, 0.7, 0.635, 0.605, 0.58, 0.585, 0.625, 0.7, 0.8, 0.87, 0.92];
    const W = [0.1, 0.17, 0.21, 0.23, 0.25, 0.255, 0.245, 0.235, 0.205, 0.15, 0.06];
    const rails = [Z.map((z, i) => [z, T[i]]), Z.map((z, i) => [z, B[i]]), W], lo = { steps: 2, n: 2.3 };
    const g = railLoft(...rails, { ...lo, seg: 16 });
    groups(g, (x, y) => (y < 0.69 ? 1 : 0)); // pale belly
    part(barrel, g, ["coat", "pale"]);
    // dorsal stripe (withers to tail head) and the shoulder cross over the withers: thin shells on the barrel
    const F = loftFn(...rails, lo);
    part(barrel, decal(F, (a, b) => [4 + 14.3 * a, (b - 0.5) * 0.4], 18, 3), "dark", { outline: false });
    part(barrel, decal(F, (a, b) => {
      const t = (b - 0.5) * 2.5;
      return [5.8 - 1.0 * Math.abs(t) + (a - 0.5) * 0.87 * (1 - 0.35 * Math.abs(t)), t];
    }, 2, 14), "dark", { outline: false });
  }

  // ---------- neck + mane ----------
  const neck = joint("neck", body, 0, 1.08, 0.33); // pivot at the withers base
  const crest = [[0.27, 1.21], [0.42, 1.29], [0.55, 1.385], [0.66, 1.475], [0.745, 1.55]];
  const throat = [[0.58, 0.8], [0.69, 0.97], [0.775, 1.12], [0.83, 1.25], [0.85, 1.36]];
  const NECK_W = [0.19, 0.165, 0.14, 0.12, 0.105];
  part(neck, railLoft(crest, throat, NECK_W, { steps: 2, seg: 14 }), "coat");
  {
    // short upright brush: rail a stands 6-8 cm proud of the crest (sawtooth tips), rail b sinks 2.5 cm inside
    const cz = spline(crest.map((p) => p[0]), 3), cy = spline(crest.map((p) => p[1]), 3);
    const a = [], b = [], w = [];
    for (let i = 0; i < cz.length; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(cz.length - 1, i + 1);
      const tz = cz[i1] - cz[i0], ty = cy[i1] - cy[i0], tl = Math.hypot(tz, ty);
      const nz = -ty / tl, ny = tz / tl; // up-back normal of the crest
      const k = i / (cz.length - 1);
      const h = (0.045 + 0.035 * Math.sin(Math.PI * Math.min(1, k * 1.15))) * (i % 2 ? 0.8 : 1);
      a.push([cz[i] + nz * h, cy[i] + ny * h]);
      b.push([cz[i] - nz * 0.025, cy[i] - ny * 0.025]);
      w.push(0.03);
    }
    part(neck, railLoft(a, b, w, { steps: 1, seg: 8, dome: 0.4 }), "dark");
  }

  // ---------- head + jaw ----------
  const head = joint("head", neck, 0, 1.47, 0.79);
  // head axis poll -> lip, for the muzzle boundary
  const P0 = [0.76, 1.6], P1 = [1.1, 1.1], AX = [P1[0] - P0[0], P1[1] - P0[1]], AL2 = AX[0] ** 2 + AX[1] ** 2;
  const along = (z, y) => ((z - P0[0]) * AX[0] + (y - P0[1]) * AX[1]) / AL2;
  {
    // big deep head: round jowl, straight profile, a broad blunt muzzle
    const fore = [[0.71, 1.56], [0.79, 1.61], [0.87, 1.55], [0.95, 1.44], [1.02, 1.33], [1.075, 1.235], [1.105, 1.17]];
    const mline = [[0.7, 1.38], [0.73, 1.27], [0.8, 1.215], [0.89, 1.19], [0.97, 1.15], [1.04, 1.105], [1.09, 1.085]];
    const HW = [0.09, 0.125, 0.125, 0.11, 0.096, 0.092, 0.08], HL = { steps: 3, n: 2.4 };
    const g = railLoft(fore, mline, HW, { ...HL, seg: 14, dome: 0.75 });
    groups(g, (x, y, z, r) => (r > 10.6 ? 1 : 0));
    part(head, g, ["coat", "pale"]);
    const HF = loftFn(fore, mline, HW, HL);
    for (const s of [-1, 1]) {
      // pale eye ring: a disc decal on the head surface (thin ink), so it never sticks out of the silhouette;
      // the dark eye and its glint sit on it
      const I0 = 6.7, T0 = s * 1.12;
      const disc = (a, b) => { const u = (a * 2 - 1) * 0.97, v = (b * 2 - 1) * Math.sqrt(1 - u * u); return [I0 + 1.15 * u, T0 + 0.3 * v]; };
      part(head, decal(HF, disc, 6, 8, 0.02), "pale", { px: 2 });
      const [ex, ey, ez] = HF.at(I0, T0, 1.012);
      flat(head, new THREE.SphereGeometry(0.022, 10, 8).scale(0.32, 1.05, 1.2).translate(ex, ey, ez), C.eye);
      flat(head, new THREE.SphereGeometry(0.007, 6, 4).translate(ex + s * 0.008, ey + 0.009, ez + 0.01), C.glint);
      // round jowl plate, ~1 cm proud: its ink draws the big donkey cheek
      part(head, new THREE.SphereGeometry(0.1, 10, 6).scale(0.3, 1, 1.05).translate(s * 0.09, 1.34, 0.79), "coat");
      // nostril
      flat(head, new THREE.SphereGeometry(0.018, 8, 6).scale(0.55, 1.2, 0.9).rotateX(0.5).translate(s * 0.058, 1.165, 1.1), C.dark);
    }
    // dark mouth interior, hidden inside the head and jaw at rest
    flat(head, new THREE.SphereGeometry(1, 8, 6).scale(0.055, 0.03, 0.12).rotateX(0.55).translate(0, 1.165, 0.985), C.mouth);
  }
  const jaw = joint("jaw", head, 0, 1.235, 0.84);
  {
    const top = [[0.79, 1.26], [0.88, 1.2], [0.96, 1.16], [1.03, 1.115], [1.08, 1.09]];
    const bot = [[0.76, 1.19], [0.85, 1.12], [0.93, 1.075], [1.0, 1.045], [1.06, 1.04]];
    const g = railLoft(top, bot, [0.075, 0.078, 0.072, 0.066, 0.058], { steps: 2, seg: 12, dome: 0.7 });
    groups(g, (x, y, z, r) => (r > 2.6 ? 1 : 0));
    part(jaw, g, ["coat", "pale"]);
  }
  // ears: lanceolate leaves, widest at 40 %, dark tips; a pale inner leaf faces forward
  for (const [S, s] of [["L", 1], ["R", -1]]) {
    const ear = joint(`ear${S}`, head, s * 0.065, 1.585, 0.775);
    const LEN = 0.35;
    const leaf = (k, dz, wk, from, to) => {
      const rings = [];
      for (let i = 0; i <= 8; i++) {
        const t = from + ((to - from) * i) / 8;
        const w = (0.06 * Math.sin(Math.PI * (0.16 + 0.82 * t)) ** 0.8 + 0.003) * wk;
        const d = w * k, zc = dz * w - 0.012 * Math.sin(Math.PI * t);
        rings.push(Array.from({ length: 8 }, (_, j) => {
          const a = (j / 8) * TAU;
          return [w * Math.cos(a), t * LEN, zc + d * Math.sin(a)];
        }));
      }
      return skin(rings, { dome: 0.4 });
    };
    // local ear frame -> world: splay out, tip back a little
    const place = (g) => g.rotateX(-0.12).rotateZ(-s * 0.2).translate(s * 0.065, 1.585, 0.775);
    const outer = place(groups(leaf(0.42, 0, 1, 0, 1), (x, y) => (y > LEN * 0.78 ? 1 : 0)));
    part(ear, outer, ["coat", "dark"]);
    const inner = place(groups(leaf(0.12, 0.33, 0.66, 0.06, 0.82), (x, y) => (y > LEN * 0.74 ? 1 : 0)));
    part(ear, inner, ["pale", "dark"], { outline: false });
  }

  // ---------- tail: thin cord, dark tuft ----------
  const tail = joint("tail", body, 0, 1.1, -0.68);
  part(tail, tube([[0, 1.12, -0.64], [0, 1.09, -0.71], [0, 0.98, -0.745], [0, 0.82, -0.75]], 0.03, 0.02, { steps: 8, seg: 8 }), "coat");
  const tailTip = joint("tailTip", tail, 0, 0.84, -0.75);
  part(tailTip, tube([[0, 0.86, -0.75], [0, 0.7, -0.748], [0, 0.6, -0.742]], 0.02, 0.017, { steps: 6, seg: 8 }), "coat");
  part(tailTip, railLoft([[-0.735, 0.66], [-0.72, 0.58], [-0.725, 0.48], [-0.74, 0.4]], [[-0.76, 0.66], [-0.775, 0.58], [-0.775, 0.48], [-0.75, 0.395]],
    [0.012, 0.03, 0.03, 0.008], { steps: 2, seg: 8, dome: 0.7 }), "dark");

  // ---------- legs ----------
  const seg = (j, front, back, w, x0, tone = "coat", o = {}) => part(j, railLoft(front, back, w, { steps: 2, seg: 8, dome: 0.85, x0, ...o }), tone);
  // pastern + small upright hoof below a fetlock pivot at (zf, 0.12); toe zf + 0.055, heel zf - 0.03, flat sole
  const lower = (j, zf, x0) => {
    const sh = (pts) => pts.map(([z, y]) => [z + zf, y]);
    seg(j, sh([[0.025, 0.16], [0.03, 0.11], [0.036, 0.08]]), sh([[-0.032, 0.16], [-0.036, 0.11], [-0.026, 0.08]]), [0.031, 0.031, 0.033], x0, "coat", { steps: 2, seg: 8 });
    seg(j, sh([[0.04, 0.088], [0.055, 0.0]]), sh([[-0.03, 0.088], [-0.03, 0.0]]), [0.036, 0.041], x0, "dark", { steps: 1, seg: 10, dome: 0 });
  };
  const LEGS = {};
  for (const [S, s] of [["L", 1], ["R", -1]]) {
    const xf = s * 0.12, xh = s * 0.115;
    // fore: shoulder (point of shoulder, inside the chest) -> elbow -> knee -> fetlock
    const sh = joint(`shoulder${S}`, body, xf, 0.95, 0.55);
    const el = joint(`elbow${S}`, sh, xf, 0.64, 0.36);
    seg(el, [[0.5, 0.92], [0.52, 0.76], [0.5, 0.62], [0.47, 0.5], [0.452, 0.4], [0.447, 0.35]], [[0.33, 0.92], [0.32, 0.76], [0.34, 0.62], [0.372, 0.5], [0.383, 0.4], [0.385, 0.35]],
      [0.03, 0.068, 0.064, 0.05, 0.043, 0.042], xf);
    const kn = joint(`knee${S}`, el, xf, 0.36, 0.415);
    seg(kn, [[0.444, 0.39], [0.44, 0.3], [0.436, 0.2], [0.44, 0.14]], [[0.388, 0.39], [0.39, 0.3], [0.39, 0.2], [0.386, 0.14]], [0.034, 0.03, 0.03, 0.034], xf);
    const fF = joint(`fetlockF${S}`, kn, xf, 0.12, 0.415);
    lower(fF, 0.415, xf);
    // hind: hip -> stifle -> hock -> fetlock
    const hip = joint(`hip${S}`, body, xh, 1.02, -0.47);
    seg(hip, [[-0.36, 1.08], [-0.31, 0.9], [-0.3, 0.76], [-0.33, 0.68]], [[-0.6, 1.1], [-0.665, 0.92], [-0.6, 0.76], [-0.47, 0.64]], [0.04, 0.1, 0.095, 0.065], xh, "coat", { seg: 10 });
    const st = joint(`stifle${S}`, hip, xh, 0.7, -0.36);
    seg(st, [[-0.33, 0.75], [-0.42, 0.62], [-0.53, 0.5], [-0.578, 0.42], [-0.583, 0.38]], [[-0.47, 0.73], [-0.6, 0.62], [-0.648, 0.52], [-0.655, 0.44], [-0.65, 0.38]],
      [0.065, 0.062, 0.05, 0.044, 0.044], xh);
    const hk = joint(`hock${S}`, st, xh, 0.4, -0.615);
    seg(hk, [[-0.585, 0.43], [-0.58, 0.3], [-0.575, 0.2], [-0.578, 0.14]], [[-0.642, 0.44], [-0.638, 0.3], [-0.634, 0.2], [-0.634, 0.14]], [0.035, 0.031, 0.03, 0.034], xh);
    const fH = joint(`fetlockH${S}`, hk, xh, 0.12, -0.605);
    lower(fH, -0.605, xh);
    LEGS[`F${S}`] = { j: [sh, el, kn, fF], bend: 1, flexSign: 1 };
    LEGS[`H${S}`] = { j: [hip, st, hk, fH], bend: -1, flexSign: -1 };
  }
  // per leg, in the body's rest frame (y, z): bone vectors, the fetlock-to-sole offsets
  const yz = (n) => [pivots[n][1], pivots[n][2]];
  const ang = (y, z) => Math.atan2(-z, -y); // 0 = straight down, grows with +rx (backward)
  for (const L of Object.values(LEGS)) {
    const P = L.j.map((g) => yz(g.name));
    L.P = P;
    L.b1 = [P[1][0] - P[0][0], P[1][1] - P[0][1]];
    L.b2 = [P[2][0] - P[1][0], P[2][1] - P[1][1]];
    L.b3 = [P[3][0] - P[2][0], P[3][1] - P[2][1]];
    L.L1 = Math.hypot(...L.b1);
    L.sole = P[3][1] + 0.0125; // sole centre z at rest
    L.toe = P[3][1] + 0.055;
  }

  // ---------- clips ----------
  // Gait rows: duty = stance share per foot; S = metres a planted hoof travels; zc = track centre (sole z) for
  // fore / hind; lift = swing arc height fore / hind (m); flex = peak knee / hock flex in swing (deg); hockSt = hock
  // flex in stance; toe = breakover roll (deg) over the last toeT of stance; flip = extra hoof pitch mid-swing;
  // ph = phase of each foot's touchdown; drop / bob = body lowering and its two-per-cycle bob (m); pitch = body
  // rock (deg); nod = neck nod (deg, twice a cycle).
  const CLIPS = { idle: 4, walk: 1.1, trot: 0.66, bray: 2.6 };
  const GAIT = {
    walk: { duty: 0.64, S: 0.46, zc: [0.47, -0.55], lift: [0.085, 0.07], flex: [62, 42], hockSt: 4, toe: 28, toeT: 0.14, flip: [30, 20],
      ph: { HL: 0, FL: 0.25, HR: 0.5, FR: 0.75 }, drop: 0.012, bob: 0.008, bobAt: 0.1, pitch: 1, nod: 3.5 },
    trot: { duty: 0.42, S: 0.5, zc: [0.48, -0.545], lift: [0.13, 0.1], flex: [92, 58], hockSt: 6, toe: 30, toeT: 0.16, flip: [45, 25],
      ph: { FL: 0, HR: 0, FR: 0.5, HL: 0.5 }, drop: 0.02, bob: 0.018, bobAt: 0.2, pitch: 0.8, nod: 2.5 },
  };
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const rotYZ = ([y, z], a) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  // stance at u in [0, duty): fetlock [z, y] and world hoof pitch (deg, + toe down), rolling over the toe at the end
  function stance(g, L, k, u) {
    const zs = g.zc[k] + g.S / 2 - (g.S * u) / g.duty; // sole centre, carried back at ground speed
    const p = g.toe * ease((u - g.duty + g.toeT) / g.toeT);
    const piv = [0, zs + (L.toe - L.sole)]; // toe point on the ground
    const off = rotYZ([L.P[3][0] - 0, L.P[3][1] - L.toe], p * DEG); // fetlock relative to the toe, turned by the roll
    return [piv[1] + off[1], piv[0] + off[0], p];
  }
  function track(g, L, k, u) {
    if (u < g.duty) return stance(g, L, k, u);
    const w = (u - g.duty) / (1 - g.duty), e = 1e-4, span = 1 - g.duty;
    const a = stance(g, L, k, g.duty - e), a0 = stance(g, L, k, g.duty - 2 * e), b = stance(g, L, k, 0), b1 = stance(g, L, k, e);
    const h = [2 * w ** 3 - 3 * w * w + 1, w ** 3 - 2 * w * w + w, -2 * w ** 3 + 3 * w * w, w ** 3 - w * w];
    const v = a.map((v0, i) => h[0] * v0 + h[1] * ((v0 - a0[i]) / e) * span + h[2] * b[i] + h[3] * ((b1[i] - b[i]) / e) * span);
    v[1] += g.lift[k] * Math.sin(Math.PI * Math.pow(w, 0.85)) ** 2;
    v[2] += g.flip[k] * Math.sin(Math.PI * Math.pow(w, 0.7)) ** 2;
    return v;
  }
  let reach = 0; // worst IK overshoot of the last pose (m), for probing
  // Solve one leg: fetlock target (world z, y), world hoof pitch p (deg), knee/hock flex kappa (deg).
  function solve(L, B, tz, ty, p, kappa) {
    // into the body's rest frame
    const by = pivots.body[1] + B.dy, bz = pivots.body[2] + B.dz;
    const [ly, lz] = rotYZ([ty - by, tz - bz], -B.rx);
    const F = [ly + pivots.body[1], lz + pivots.body[2]];
    const k = kappa * DEG, b3 = rotYZ(L.b3, k), e = [L.b2[0] + b3[0], L.b2[1] + b3[1]], Le = Math.hypot(...e);
    const D = [F[0] - L.P[0][0], F[1] - L.P[0][1]];
    let d = Math.hypot(...D);
    const max = L.L1 + Le - 1e-5;
    if (d > max) { reach = Math.max(reach, d - max); d = max; }
    const al = Math.acos(Math.max(-1, Math.min(1, (L.L1 ** 2 + d * d - Le * Le) / (2 * L.L1 * d))));
    const f1 = ang(...D) + L.bend * al;
    const J1 = [L.P[0][0] - L.L1 * Math.cos(f1), L.P[0][1] - L.L1 * Math.sin(f1)];
    const fe = ang(F[0] - J1[0], F[1] - J1[1]);
    const r0 = f1 - ang(...L.b1), r1 = fe - ang(...e) - r0;
    const r3 = p * DEG - B.rx - (r0 + r1 + k);
    L.j[0].rotation.set(r0, 0, 0);
    L.j[1].rotation.set(r1, 0, 0);
    L.j[2].rotation.set(k, 0, 0);
    L.j[3].rotation.set(r3, 0, 0);
  }
  const REST_FEET = Object.fromEntries(Object.entries(LEGS).map(([n, L]) => [n, [L.P[3][1], L.P[3][0]]]));

  function reset() {
    for (const j of Object.values(joints)) { j.rotation.set(0, 0, 0); j.position.copy(j.userData.rest); j.scale.set(1, 1, 1); }
  }
  function setBody(B) {
    body.position.set(0, B.dy + pivots.body[1], B.dz + pivots.body[2]);
    body.rotation.set(B.rx, 0, 0);
  }
  const R = (j, x, y = 0, z = 0) => joints[j].rotation.set(x * DEG, y * DEG, z * DEG);
  const syc = (n, ph, lag = 0) => Math.sin(TAU * (n * ph - lag));
  const cyc = (n, ph, lag = 0) => Math.cos(TAU * (n * ph - lag));

  function clip(name, t) {
    const T = CLIPS[name], ph = (((t % T) + T) % T) / T, g = GAIT[name];
    reset();
    reach = 0;
    const B = { dy: 0, dz: 0, rx: 0 };
    if (g) {
      B.dy = -g.drop - g.bob * cyc(2, ph, g.bobAt);
      B.rx = g.pitch * DEG * syc(2, ph, g.bobAt + 0.1);
      setBody(B);
      for (const [n, L] of Object.entries(LEGS)) {
        const k = n[0] === "F" ? 0 : 1, u = (ph - g.ph[n] + 2) % 1;
        const [z, y, p] = track(g, L, k, u);
        const w = u < g.duty ? 0 : Math.sin(Math.PI * ((u - g.duty) / (1 - g.duty)) ** 0.8) ** 2;
        const kap = k === 0 ? g.flex[0] * w : -(g.hockSt + (g.flex[1] - g.hockSt) * w);
        solve(L, B, z, y, p, kap);
      }
      R("neck", g.nod * syc(2, ph, g.bobAt + 0.15));
      R("head", -0.6 * g.nod * syc(2, ph, g.bobAt + 0.2));
      R("tail", 12 + 4 * syc(2, ph, 0.3), 0, 7 * syc(1, ph, 0.2));
      R("tailTip", -6, 0, 9 * syc(1, ph, 0.35));
      R("earL", -6 + 3 * syc(2, ph, 0.1), 0, 0); R("earR", -6 + 3 * syc(2, ph, 0.15), 0, 0);
    } else if (name === "idle") {
      // two slow breaths, a small weight shift, one ear swivel each, a lazy tail swish
      const b = syc(2, ph);
      B.dy = -0.004 - 0.002 * b; B.dz = 0.006 * syc(1, ph, 0.1);
      setBody(B);
      for (const [n, L] of Object.entries(LEGS)) solve(L, B, ...REST_FEET[n], 0, 0);
      joints.barrel.scale.set(1 + 0.012 * b, 1 + 0.01 * b, 1);
      R("neck", 2 + 1.2 * syc(1, ph, 0.2));
      R("head", 1 - 1.5 * syc(1, ph, 0.25), 2 * syc(1, ph, 0.3));
      const eL = Math.max(0, Math.sin(TAU * ph)) ** 2, eR = Math.max(0, Math.sin(TAU * (ph - 0.45))) ** 2;
      R("earL", -14 * eL, 38 * eL, -10 * eL); R("earR", -10 * eR, -42 * eR, 12 * eR);
      R("tail", 6 + 3 * syc(1, ph), 0, 18 * syc(2, ph, 0.05));
      R("tailTip", -4, 0, 16 * syc(2, ph, 0.18));
    } else {
      // bray: 0-0.45 s lift, 0.45-2.1 s hee-haw (four pulses, the jaw open widest on the "hee"), 2.1-2.6 s settle
      const s = ph * T;
      const up = ease(s / 0.45) * (1 - ease((s - 2.1) / 0.5));
      const pulse = s > 0.45 && s < 2.1 ? Math.sin(Math.PI * ((s - 0.45) / 1.65) * 4) ** 2 : 0;
      const hee = s > 0.45 && s < 2.1 ? (Math.floor(((s - 0.45) / 1.65) * 4) % 2 ? 0.6 : 1) : 0;
      B.dy = -0.012 * up; B.dz = -0.025 * up; B.rx = -2.5 * DEG * up;
      setBody(B);
      for (const [n, L] of Object.entries(LEGS)) solve(L, B, ...REST_FEET[n], 0, 0);
      joints.barrel.scale.set(1 + 0.02 * pulse, 1 + 0.015 * pulse, 1);
      R("neck", -17 * up - 2 * pulse);
      R("head", -46 * up - 4 * pulse * hee);
      R("jaw", (6 * up + 22 * pulse * hee) * (up > 0 ? 1 : 0));
      R("earL", -55 * up, 0, -14 * up); R("earR", -55 * up, 0, 14 * up);
      R("tail", 10 * up + 18 * pulse, 0, 0);
      R("tailTip", -10 * up, 0, 0);
    }
    root.updateMatrixWorld(true);
    root.userData.reach = reach;
  }

  const POSES = { rest: null, "walk-a": ["walk", 0.1], "walk-b": ["walk", 0.6], "trot-a": ["trot", 0.15], bray: ["bray", 1.1] };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`donkey: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return clip(m[1], +m[2]);
    }
    if (!(name in POSES)) throw new Error(`donkey: unknown pose "${name}" (${Object.keys(POSES).join(", ")}, or <clip>@<seconds>)`);
    const p = POSES[name];
    if (p) return clip(p[0], p[1] * CLIPS[p[0]]);
    reset();
    root.userData.reach = 0;
    root.updateMatrixWorld(true);
  }
  space.scale.setScalar(height / meta.height);
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

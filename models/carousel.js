// carousel.js - an amusement-park merry-go-round (the anime date-scene ride), with a spin clip and a night variant.
// Contract: harness/lab/README.md. Meters, +Y up, faces +Z (the carousel is round: +Z is where horse slot 0 sits),
// its left is +X, stands on y = 0, centred on x = 0, z = 0.
//
// Construction (every part a closed solid, merged into one mesh per material group; normals given analytically or
// from geometry, every triangle wound to agree with its own normal, never by hand):
//   BASE     a static step ring on the ground.
//   ROTOR    a joint turning about Y (counter-clockwise from above, as most carousels). It holds:
//            platform  a lathe disk: pink skirt, gold lip, peach floor.
//            column    a 12-sided centre column with gold bands; arched gold frames on every face, alternately a
//                      dark mirror with two pale glints and a blank pink panel (extruded shapes).
//            ceiling   the rounding board drum (dark band, gold rails, a ring of bulbs) closed by a flat ceiling with
//                      radial sweeps, a row of bulbs under each; brass poles from the floor to the ceiling at every
//                      horse. Bulbs are flat (no hull) octahedra, all in one mesh.
//            canopy    a straight cone (25 deg) in 24 alternating pink / white stripes, its rim hung with a scalloped
//                      valance in the same stripes (a thin slab per stripe, one rounded lobe each), a bulb under
//                      every lobe and a row of bulbs up every stripe seam; a gold crown drum with points, a pink
//                      dome, and a gold finial with a ball and a pennant. Canopy, valance and crown share one hull.
//            chariots  two carriage benches (extruded scroll side panels, seat, back, dash) in the inner ring.
//   HORSES   one joint per horse (child of the rotor), bobbing up and down its pole. One horse geometry, built once
//            low-poly from lofted tubes (one body tube, arched neck, bowed head, crest mane, tail, four-sided legs
//            through the knee in the carousel "jumper" pose: fore legs tucked, hind legs stretched back), with ears,
//            eyes, a saddle blanket and seat and gilded hooves as material groups: one mesh and one hull per horse,
//            coloured per horse from a three-coat sequence (white, cream, pink).
// Proportions (real size, base unit the platform radius R = 6 m, a 12 m ride): floor 0.55 m up, ceiling 3.75 m, rounding
//   board to 4.62 m, canopy rim r 6.6 m at 4.6 m, cone to r 0.9 m at 7.3 m, crown 7.75 m, dome 8.2 m, finial and pennant
//   to 9.05 m. Column r 1.2 m. Horse rings r 4.9 m (outer) and 3.3 m (inner, two slots are chariots); horses 1.6 m nose
//   to tail, body 1.15 m over the floor at mid-stroke, bob +-0.22 m. About 21k triangles (770 a horse), 28 meshes.
// Options: build(THREE, kit, colors, { height, horses, night }): height scales uniformly (default meta.height); horses
//   = slots per ring, 8-12 (default 10: 10 outer horses, 8 inner horses and 2 chariots); night lights every bulb
//   (practical) and the column mirrors (moon).
// Clip spin (20 s, loops): one turn of the platform, each horse bobbing four times a turn, neighbours in opposite phase
//   and the inner ring a quarter cycle off: pose("spin@t").
// Colours (festival): stripes accent #ff4d6d / sky #24143a and sclera #f6f3ee / skin #f0c2ae; rounding board sky / hair
//   #1a1020; gold practical #ffb020 / accent; trim and poles moon #ffd7a1 / practical; floor iris #ffd0a1 / skin; skirt
//   accent / sky; column and ceiling sclera / skin; mirrors sky with line #fff1ea glints (moon at night); bulbs line by
//   day, practical at night. Horses: coats sclera / skin, moon / skin, accent / sky; manes practical / accent, accent /
//   sky, moon / practical; blankets accent / sky, sky / hair, sclera / skin; seats and hooves gold; eyes hair. Ink #140c1c.

export const meta = {
  name: "carousel",
  height: 9.05,
  script: "festival",
  colors: {
    stripe: "#ff4d6d", stripeShade: "#24143a",
    stripeAlt: "#f6f3ee", stripeAltShade: "#f0c2ae",
    board: "#24143a", boardShade: "#1a1020",
    gold: "#ffb020", goldShade: "#ff4d6d",
    trim: "#ffd7a1", trimShade: "#ffb020",
    floor: "#ffd0a1", floorShade: "#f0c2ae",
    skirt: "#ff4d6d", skirtShade: "#24143a",
    column: "#f6f3ee", columnShade: "#f0c2ae",
    mirror: "#24143a", mirrorLit: "#ffd7a1", glint: "#fff1ea",
    bulb: "#fff1ea", bulbLit: "#ffb020",
    coatWhite: "#f6f3ee", coatWhiteShade: "#f0c2ae",
    coatCream: "#ffd7a1", coatCreamShade: "#f0c2ae",
    coatPink: "#ff4d6d", coatPinkShade: "#24143a",
    eye: "#1a1020",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2;
  const height = opts.height ?? meta.height;
  const N = Math.max(8, Math.min(12, Math.round(opts.horses ?? 10)));
  const night = !!opts.night;

  const root = new THREE.Group();
  root.name = "carousel";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- dimensions ----------
  const FLOOR = 0.55, CEIL = 3.75, BOARD_TOP = 4.62, BOARD_R = 6.3;
  const RIM_R = 6.6, RIM_Y = 4.6, TOP_R = 0.9, TOP_Y = 7.3;
  const STRIPES = 24, COL_R = 1.2, R_OUT = 4.9, R_IN = 3.3;
  const HORSE_Y = FLOOR + 1.15, BOB = 0.22, HS = 0.92;
  const P = (r, a, y) => [r * Math.sin(a), y, r * Math.cos(a)]; // a = 0 on +Z, increasing toward +X

  // ---------- vector helpers ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));

  // ---------- bags: per-key triangle soups with normals ----------
  function bag() {
    const s = {};
    const S = (k) => (s[k] ??= { p: [], n: [] });
    // smooth triangle: wound so its face normal agrees with the given vertex normals
    function triS(k, a, b, e, na, nb, ne) {
      const f = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...f) < 1e-10) return;
      const o = S(k);
      if (dot(f, add(add(na, nb), ne)) < 0) { o.p.push(...a, ...e, ...b); o.n.push(...na, ...ne, ...nb); }
      else { o.p.push(...a, ...b, ...e); o.n.push(...na, ...nb, ...ne); }
    }
    // flat triangle facing the hint direction
    function tri(k, a, b, e, hint) {
      let f = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...f) < 1e-10) return;
      if (dot(f, hint) < 0) f = mul(f, -1);
      f = norm(f);
      triS(k, a, b, e, f, f, f);
    }
    const quad = (k, a, b, e, d, hint) => (tri(k, a, b, e, hint), tri(k, a, e, d, hint));
    const quadS = (k, a, b, e, d, na, nb, ne, nd) => (triS(k, a, b, e, na, nb, ne), triS(k, a, e, d, na, ne, nd));
    // any three.js geometry (with or without normals), optionally transformed
    function geo(k, g, m) {
      g = g.index ? g.toNonIndexed() : g.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (m) g.applyMatrix4(m);
      const o = S(k), p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { o.p.push(p[i]); o.n.push(n[i]); }
    }
    // merge another bag, transformed
    function put(other, m) {
      for (const [k, v] of Object.entries(other.s)) geo(k, buf(v), m);
    }
    // closed rod a -> b: smooth sides, flat caps
    function rod(k, a, b, r, seg = 8) {
      const d = norm(sub(b, a));
      const u = norm(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(d, u);
      const dir = (i) => { const t = (i / seg) * TAU; return add(mul(u, Math.cos(t)), mul(v, Math.sin(t))); };
      for (let i = 0; i < seg; i++) {
        const n0 = dir(i), n1 = dir(i + 1);
        const A0 = add(a, mul(n0, r)), A1 = add(a, mul(n1, r)), B0 = add(b, mul(n0, r)), B1 = add(b, mul(n1, r));
        quadS(k, A0, A1, B1, B0, n0, n1, n1, n0);
        tri(k, a, A0, A1, mul(d, -1));
        tri(k, b, B0, B1, d);
      }
    }
    function box(k, x0, x1, y0, y1, z0, z1) {
      const m = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      const v = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
      for (const f of [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]) {
        const q = f.map(v), c0 = mul(add(add(q[0], q[1]), add(q[2], q[3])), 0.25);
        quad(k, q[0], q[1], q[2], q[3], sub(c0, m));
      }
    }
    // a bulb: an octahedron (no hull; flat colour)
    function bulb(k, o, r) {
      for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1])
        tri(k, add(o, [r * sx, 0, 0]), add(o, [0, r * sy, 0]), add(o, [0, 0, r * sz]), [sx, sy, sz]);
    }
    // lathe about Y. prof: [[r, y], ...] walked so the solid lies on the left (axis-bottom -> out -> up -> axis-top,
    // or a closed loop for a ring); key(j, i) picks the key for angular segment j and profile segment i.
    // facet: flat faces around (a polygonal prism); smooth: average normals at interior profile vertices.
    function lathe(prof, segs, key, { facet = false, smooth = false, a0 = 0 } = {}) {
      const segN = [];
      for (let i = 0; i < prof.length - 1; i++) {
        const dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dr, dy) || 1;
        segN.push([dy / l, -dr / l]);
      }
      const vn = (i, end) => {
        if (!smooth) return segN[i];
        const j = end ? i + 1 : i, nb = end ? i + 1 : i - 1;
        if (nb < 0 || nb >= segN.length) return segN[i];
        const m = [segN[i][0] + segN[nb][0], segN[i][1] + segN[nb][1]], l = Math.hypot(...m) || 1;
        return j >= 0 ? [m[0] / l, m[1] / l] : segN[i];
      };
      for (let j = 0; j < segs; j++) {
        const t0 = a0 + (j / segs) * TAU, t1 = a0 + ((j + 1) / segs) * TAU, tm = (t0 + t1) / 2;
        for (let i = 0; i < prof.length - 1; i++) {
          const k = key(j, i);
          if (!k) continue;
          const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
          const n0 = vn(i, false), n1 = vn(i, true);
          const N = (n, t) => { const a = facet ? tm : t; return [n[0] * Math.sin(a), n[1], n[0] * Math.cos(a)]; };
          quadS(k, P(r0, t0, y0), P(r0, t1, y0), P(r1, t1, y1), P(r1, t0, y1), N(n0, t0), N(n0, t1), N(n1, t1), N(n1, t0));
        }
      }
    }
    return { s, tri, quad, triS, quadS, geo, put, rod, box, bulb, lathe };
  }
  function buf(v) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(v.n, 3));
    return g;
  }
  // one geometry with a material group per key, in the order of `keys`
  function grouped(b, keys) {
    const p = [], n = [], g = new THREE.BufferGeometry();
    let start = 0;
    keys.forEach((k, gi) => {
      const v = b.s[k];
      if (!v) return;
      p.push(...v.p); n.push(...v.n);
      g.addGroup(start, v.p.length / 3, gi);
      start += v.p.length / 3;
    });
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  }
  // MAT: key -> [base, shade, threshold]; one mesh (one hull) for all keys listed together
  function meshOf(b, keys, MAT, { px = 3, outline = true, name } = {}) {
    const g = keys.length === 1 ? buf(b.s[keys[0]]) : grouped(b, keys);
    const [b0, s0, t0] = MAT[keys[0]];
    const m = kit.toon(g, b0, s0, { threshold: t0, px, outline });
    if (keys.length > 1) m.material = keys.map((k) => kit.cel(MAT[k][0], MAT[k][1], { threshold: MAT[k][2] }));
    m.name = name ?? keys.join("+");
    return m;
  }

  // ---------- lofted tubes (horses) ----------
  const spow = (v, e) => Math.sign(v) * Math.abs(v) ** e;
  function solid(pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, e = idx[i + 2] * 3;
      v += pos[a] * (pos[b + 1] * pos[e + 2] - pos[b + 2] * pos[e + 1])
         - pos[a + 1] * (pos[b] * pos[e + 2] - pos[b + 2] * pos[e])
         + pos[a + 2] * (pos[b] * pos[e + 1] - pos[b + 1] * pos[e]);
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function skin(rings, dome = 0.5) {
    const seg = rings[0].length, R = rings.length, pos = rings.flat(2), idx = [];
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg), e = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
        idx.push(a, b, e, b, d, e);
      }
    const mid = (r) => r.reduce((s, q) => [s[0] + q[0] / seg, s[1] + q[1] / seg, s[2] + q[2] / seg], [0, 0, 0]);
    for (const [k, nb, first] of [[0, 1, true], [R - 1, R - 2, false]]) {
      const m = mid(rings[k]), q = mid(rings[nb]);
      const d = norm(sub(m, q));
      const rad = rings[k].reduce((s, p) => s + Math.hypot(...sub(p, m)), 0) / seg;
      const ci = pos.length / 3;
      pos.push(...add(m, mul(d, rad * dome)));
      for (let j = 0; j < seg; j++) {
        const a = k * seg + j, b = k * seg + ((j + 1) % seg);
        if (first) idx.push(ci, b, a); else idx.push(ci, a, b);
      }
    }
    return solid(pos, idx);
  }
  // tube through side-view points [x, y, z] (curves in a plane x = const), radii rad(t) -> [half-width on X, depth]
  function tube(pts, rad, { steps = 10, seg = 8, dome = 0.5 } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
    const rings = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, o = curve.getPointAt(t), T = curve.getTangentAt(t);
      const Nv = norm([0, -T.z, T.y]);
      const [rx, ry] = rad(t);
      const ring = [];
      for (let j = 0; j < seg; j++) {
        const f = (j / seg) * TAU;
        ring.push([o.x + Math.max(rx, 0.004) * Math.cos(f), o.y + Nv[1] * Math.max(ry, 0.004) * Math.sin(f), o.z + Nv[2] * Math.max(ry, 0.004) * Math.sin(f)]);
      }
      rings.push(ring);
    }
    return skin(rings, dome);
  }
  const lerp1 = (a, b, t) => a + (b - a) * t;
  const ell = (cx, cy, cz, rx, ry, rz, ws = 9, hs = 6) =>
    new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz).translate(cx, cy, cz);

  // ---------- one horse (local: faces +Z, origin on the pole at the body centre) ----------
  // Side-view landmarks [z, y] in metres before the HS scale: muzzle (0.97, 0.40), poll (0.64, 0.70), ear tips 0.84,
  // withers (0.28, 0.24), croup (-0.36, 0.26), tail tip (-0.82, -0.32), fore hooves (0.42, -0.46) and (0.36, -0.55),
  // hind hooves (-0.78, -0.60) and (-0.68, -0.66).
  const horseGeo = (() => {
    const H = bag();
    // barrel, chest and rump as one tube from the buttock to the breast
    H.geo("coat", tube([[0, 0.06, -0.58], [0, 0.04, -0.3], [0, 0, 0], [0, 0.04, 0.3], [0, 0.06, 0.54]],
      (t) => { const k = Math.sin(Math.PI * t) ** 0.4; return [0.175 * k, 0.215 * k]; }, { steps: 6, seg: 8, dome: 0.9 }));
    // arched neck from the chest up to the poll
    H.geo("coat", tube([[0, 0.06, 0.36], [0, 0.32, 0.5], [0, 0.55, 0.58], [0, 0.68, 0.63]],
      (t) => [lerp1(0.125, 0.075, t), lerp1(0.17, 0.1, t)], { steps: 4, seg: 6 }));
    // head bowed forward and down, deep at the jowl
    H.geo("coat", tube([[0, 0.71, 0.6], [0, 0.65, 0.74], [0, 0.53, 0.87], [0, 0.42, 0.95]],
      (t) => [lerp1(0.08, 0.06, t), lerp1(0.11, 0.068, t) + 0.015 * Math.sin(Math.PI * t)], { steps: 4, seg: 6, dome: 0.7 }));
    for (const s of [1, -1]) {
      const ear = new THREE.ConeGeometry(0.032, 0.13, 4);
      ear.rotateX(-0.35).translate(s * 0.045, 0.79, 0.6);
      H.geo("coat", ear);
      H.geo("eye", ell(s * 0.066, 0.64, 0.77, 0.022, 0.026, 0.03, 5, 3));
    }
    // mane along the crest, in lumps; forelock
    H.geo("mane", tube([[0, 0.17, 0.25], [0, 0.4, 0.4], [0, 0.6, 0.5], [0, 0.78, 0.58]],
      (t) => [0.05 - 0.015 * t, (0.07 + 0.03 * Math.abs(Math.sin(t * Math.PI * 3))) * (t < 0.88 ? 1 : 1 - (t - 0.88) * 6)], { steps: 8, seg: 4 }));
    // tail, flowing down
    H.geo("mane", tube([[0, 0.14, -0.5], [0, 0.12, -0.68], [0, -0.05, -0.8], [0, -0.32, -0.82]],
      (t) => [0.05 * (1 - t) + 0.01, (0.06 + 0.06 * Math.sin(Math.PI * Math.min(1, t * 1.4))) * (1 - t * 0.85)], { steps: 5, seg: 4 }));
    // legs: one four-sided tube each, shoulder -> knee -> fetlock, gilded hoof at the end
    const leg = (x, top, mid, end, r0, r1, r2) => {
      const d = norm(sub([x, ...end], [x, ...mid])), e2 = add([x, ...end], mul(d, -0.03));
      H.geo("coat", tube([[x, ...top], [x, ...mid], e2], (t) => {
        const r = t < 0.5 ? lerp1(r0, r1, t * 2) : lerp1(r1, r2, t * 2 - 1);
        return [r, r];
      }, { steps: 4, seg: 4, dome: 0.6 }));
      const hoof = new THREE.CylinderGeometry(r2 * 1.1, r2 * 1.35, 0.08, 4);
      hoof.rotateY(Math.PI / 4);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...d));
      hoof.applyQuaternion(q);
      hoof.translate(...add([x, ...end], mul(d, 0.005)));
      H.geo("hoof", hoof);
    };
    // [y, z] pairs
    const yz = (z, y) => [y, z];
    leg(0.085, yz(0.36, -0.06), yz(0.62, -0.2), yz(0.5, -0.44), 0.07, 0.05, 0.04); // near fore, tucked high
    leg(-0.085, yz(0.33, -0.06), yz(0.5, -0.36), yz(0.36, -0.55), 0.07, 0.05, 0.04); // off fore, lower
    leg(0.09, yz(-0.34, -0.02), yz(-0.58, -0.36), yz(-0.78, -0.6), 0.09, 0.055, 0.042); // near hind, stretched back
    leg(-0.09, yz(-0.32, -0.02), yz(-0.52, -0.38), yz(-0.68, -0.66), 0.09, 0.055, 0.042); // off hind
    // saddle blanket, seat with cantle, reins from the muzzle to the seat
    H.geo("blanket", ell(0, 0.04, 0.0, 0.2, 0.2, 0.21, 8, 4));
    H.geo("seat", ell(0, 0.2, 0.0, 0.13, 0.06, 0.17, 6, 4));
    H.geo("seat", ell(0, 0.24, -0.13, 0.11, 0.05, 0.05, 5, 3));
    H.geo("seat", tube([[0, 0.47, 0.9], [0, 0.48, 0.72], [0, 0.36, 0.42], [0, 0.26, 0.16]],
      () => [0.071, 0.012], { steps: 4, seg: 3 }));
    return grouped(H, ["coat", "mane", "blanket", "seat", "hoof", "eye"]);
  })();
  // coat, mane, blanket per variant
  const HORSE_SKINS = [
    [[c.coatWhite, c.coatWhiteShade], [c.gold, c.goldShade], [c.stripe, c.stripeShade]],
    [[c.coatCream, c.coatCreamShade], [c.stripe, c.stripeShade], [c.board, c.boardShade]],
    [[c.coatPink, c.coatPinkShade], [c.trim, c.trimShade], [c.column, c.columnShade]],
  ];

  // ---------- one chariot (local: faces +Z, x across the bench) ----------
  const chariot = (() => {
    const B = bag();
    B.box("chTrim", -0.64, 0.64, 0, 0.1, -0.56, 0.56);
    B.box("chSeat", -0.56, 0.56, 0.1, 0.48, -0.5, -0.06);
    B.box("chBody", -0.56, 0.56, 0.48, 1.08, -0.52, -0.4);
    B.box("chBody", -0.56, 0.56, 0.1, 0.66, 0.4, 0.52);
    const sh = new THREE.Shape();
    sh.moveTo(-0.56, 0.06);
    sh.lineTo(0.56, 0.06);
    sh.lineTo(0.6, 0.55);
    sh.quadraticCurveTo(0.68, 1.02, 0.42, 1.0);
    sh.quadraticCurveTo(0.24, 0.98, 0.26, 0.8);
    sh.quadraticCurveTo(0.12, 0.62, -0.1, 0.7);
    sh.quadraticCurveTo(-0.32, 0.8, -0.4, 1.22);
    sh.quadraticCurveTo(-0.5, 1.36, -0.62, 1.2);
    sh.lineTo(-0.56, 0.06);
    for (const s of [1, -1]) {
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false, curveSegments: 3 });
      const m = new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(s * 0.6 + 0.04, 0, 0);
      B.geo("chBody", g, m);
    }
    // gold scroll knobs on the side panels
    for (const s of [1, -1]) {
      B.geo("chTrim", ell(s * 0.6, 1.0, 0.44, 0.07, 0.07, 0.07, 6, 4));
      B.geo("chTrim", ell(s * 0.6, 1.24, -0.5, 0.07, 0.07, 0.07, 6, 4));
    }
    return B;
  })();

  // ---------- static base ----------
  const S0 = bag();
  S0.lathe([[0, 0], [6.4, 0], [6.4, 0.07], [6.2, 0.2], [0, 0.2]], 48, (j, i) => "base");
  body.add(meshOf(S0, ["base"], { base: [c.column, c.columnShade, 0.2] }, { px: 3, name: "base" }));

  // ---------- rotor ----------
  const rotor = new THREE.Group();
  rotor.name = "rotor";
  body.add(rotor);
  joints.rotor = rotor;
  const R = bag();
  // platform: skirt, gold lip, floor
  R.lathe([[0, 0.2], [6, 0.2], [6, 0.47], [6, 0.55], [0, 0.55]], 48, (j, i) => ["skirt", "skirt", "gold", "floor"][i]);
  // column: 12-gon with gold bands
  R.lathe([[0, FLOOR], [COL_R, FLOOR], [COL_R, CEIL], [0, CEIL]], 12, (j, i) => (i === 1 ? "column" : null), { facet: true });
  for (const [y0, y1] of [[FLOOR, FLOOR + 0.32], [CEIL - 0.3, CEIL]])
    R.lathe([[0, y0], [COL_R + 0.1, y0], [COL_R + 0.1, y1], [0, y1]], 12, (j, i) => (i === 1 ? "gold" : null), { facet: true });
  // panels: arched gold frames, dark mirrors with glints, blank pink panels
  const arch = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2);
    s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return s;
  };
  const ap = COL_R * Math.cos(Math.PI / 12);
  for (let k = 0; k < 12; k++) {
    const phi = ((k + 0.5) / 12) * TAU;
    const at = (d, y) => new THREE.Matrix4().makeRotationY(phi).setPosition(...P(ap + d, phi, y));
    R.geo("gold", new THREE.ExtrudeGeometry(arch(0.52, 2.3), { depth: 0.05, bevelEnabled: false, curveSegments: 3 }), at(-0.01, FLOOR + 0.46));
    R.geo(k % 2 ? "panel" : "mirror", new THREE.ExtrudeGeometry(arch(0.38, 2.12), { depth: 0.07, bevelEnabled: false, curveSegments: 3 }), at(-0.01, FLOOR + 0.55));
    if (k % 2 === 0)
      for (const [y, w] of [[1.25, 0.09], [1.5, 0.05]]) {
        const g = new THREE.Shape();
        g.moveTo(-0.17, y); g.lineTo(-0.17, y + w); g.lineTo(0.17, y + w + 0.32); g.lineTo(0.17, y + 0.32); g.lineTo(-0.17, y);
        R.geo("glint", new THREE.ExtrudeGeometry(g, { depth: 0.075, bevelEnabled: false }), at(-0.01, FLOOR));
      }
  }
  // ceiling, rounding board and its rails
  R.lathe([[0, CEIL], [BOARD_R, CEIL], [BOARD_R, BOARD_TOP], [0, BOARD_TOP]], 48, (j, i) => (i === 0 ? "ceiling" : i === 1 ? "board" : null));
  R.lathe([[BOARD_R - 0.05, CEIL - 0.06], [BOARD_R + 0.06, CEIL - 0.06], [BOARD_R + 0.06, CEIL + 0.06], [BOARD_R - 0.05, CEIL + 0.06], [BOARD_R - 0.05, CEIL - 0.06]], 48, () => "gold");
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    R.rod("trim", P(COL_R + 0.1, a, CEIL - 0.08), P(BOARD_R - 0.05, a, CEIL - 0.08), 0.06, 6);
  }
  // canopy cone in stripes, closed underneath
  const stripeKey = (j) => (j % 2 ? "stripeB" : "stripeA");
  R.lathe([[0, RIM_Y], [RIM_R, RIM_Y], [TOP_R, TOP_Y], [0, TOP_Y]], STRIPES, (j, i) => (i === 0 ? "ceiling" : i === 1 ? stripeKey(j) : "gold"));
  // scalloped valance: a thin slab per stripe hanging from the rim, one rounded lobe each
  const V_TOP = RIM_Y + 0.05, V_EDGE = RIM_Y - 0.3, V_DEPTH = 0.4, VR0 = RIM_R - 0.03, VR1 = RIM_R + 0.03, VSUB = 6;
  for (let s = 0; s < STRIPES; s++) {
    const k = s % 2 ? "stripeB" : "stripeA";
    const th = (u) => ((s + u) / STRIPES) * TAU;
    const yb = (u) => V_EDGE - V_DEPTH * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) ** 0.8;
    const rad = (t) => [Math.sin(t), 0, Math.cos(t)], tan = (t) => [Math.cos(t), 0, -Math.sin(t)];
    for (let i = 0; i < VSUB; i++) {
      const u0 = i / VSUB, u1 = (i + 1) / VSUB, t0 = th(u0), t1 = th(u1);
      const o0 = P(VR1, t0, 0), o1 = P(VR1, t1, 0), i0 = P(VR0, t0, 0), i1 = P(VR0, t1, 0);
      const at = (p, y) => [p[0], y, p[2]];
      R.quadS(k, at(o0, yb(u0)), at(o1, yb(u1)), at(o1, V_TOP), at(o0, V_TOP), rad(t0), rad(t1), rad(t1), rad(t0));
      R.quadS(k, at(i0, yb(u0)), at(i1, yb(u1)), at(i1, V_TOP), at(i0, V_TOP), mul(rad(t0), -1), mul(rad(t1), -1), mul(rad(t1), -1), mul(rad(t0), -1));
      const um = (u0 + u1) / 2, tm = th(um);
      const hint = add(mul(tan(tm), um - 0.5), [0, yb(um) - V_EDGE - 0.01, 0]);
      R.quad(k, at(o0, yb(u0)), at(o1, yb(u1)), at(i1, yb(u1)), at(i0, yb(u0)), hint);
      R.quad(k, at(o0, V_TOP), at(o1, V_TOP), at(i1, V_TOP), at(i0, V_TOP), [0, 1, 0]);
    }
    for (const u of [0, 1]) {
      const t = th(u), o = P(VR1, t, 0), ii = P(VR0, t, 0);
      R.quad(k, [o[0], V_EDGE, o[2]], [ii[0], V_EDGE, ii[2]], [ii[0], V_TOP, ii[2]], [o[0], V_TOP, o[2]], mul(tan(t), u ? 1 : -1));
    }
  }
  // crown: gold drum with points, pink dome, gold finial, ball and pennant
  const CR = 0.95, C0 = TOP_Y - 0.02, C1 = TOP_Y + 0.45;
  R.lathe([[0, C0], [CR, C0], [CR, C1], [0, C1]], 24, (j, i) => (i === 1 ? "gold" : i === 2 ? "gold" : null));
  for (let k = 0; k < 12; k++) {
    const g = new THREE.ConeGeometry(0.09, 0.26, 6);
    g.translate(...P(CR - 0.08, (k / 12) * TAU, C1 + 0.11));
    R.geo("gold", g);
  }
  const dome = [[0, C1], [0.86, C1]];
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); dome.push([0.86 * Math.cos(a), C1 + 0.5 * Math.sin(a)]); }
  R.lathe(dome, 24, (j, i) => (i === 0 ? null : "domeK"), { smooth: true });
  const FIN = C1 + 0.5;
  R.rod("gold", [0, FIN - 0.05, 0], [0, FIN + 0.62, 0], 0.05, 8);
  R.geo("gold", ell(0, FIN + 0.22, 0, 0.13, 0.13, 0.13, 10, 8));
  { const g = new THREE.ConeGeometry(0.07, 0.25, 8); g.translate(0, FIN + 0.72, 0); R.geo("gold", g); }
  {
    const fl = new THREE.Shape();
    fl.moveTo(0, 0); fl.quadraticCurveTo(0.35, 0.05, 0.75, -0.08); fl.quadraticCurveTo(0.35, -0.1, 0, -0.3); fl.lineTo(0, 0);
    R.geo("domeK", new THREE.ExtrudeGeometry(fl, { depth: 0.04, bevelEnabled: false, curveSegments: 5 }),
      new THREE.Matrix4().setPosition(0.04, FIN + 0.58, -0.02));
  }
  // poles at every slot, with sleeves; chariots in two inner slots
  const slots = [];
  for (let i = 0; i < N; i++) slots.push({ r: R_OUT, a: (i / N) * TAU, ring: 0, i });
  const chairs = [0, Math.floor(N / 2)];
  for (let i = 0; i < N; i++) slots.push({ r: R_IN, a: ((i + 0.5) / N) * TAU, ring: 1, i, chariot: chairs.includes(i) });
  for (const sl of slots) {
    if (sl.chariot) {
      R.put(chariot, new THREE.Matrix4().makeRotationY(sl.a + Math.PI / 2).setPosition(...P(sl.r, sl.a, FLOOR)));
      continue;
    }
    R.rod("pole", P(sl.r, sl.a, FLOOR), P(sl.r, sl.a, CEIL), 0.045, 6);
    R.rod("trim", P(sl.r, sl.a, FLOOR), P(sl.r, sl.a, FLOOR + 0.14), 0.075, 6);
    R.rod("trim", P(sl.r, sl.a, CEIL - 0.14), P(sl.r, sl.a, CEIL), 0.075, 6);
  }
  // bulbs: under every lobe, between lobes on the board, up every stripe seam, round the crown
  const B = bag();
  for (let s = 0; s < STRIPES; s++) {
    const a = (s / STRIPES) * TAU, am = ((s + 0.5) / STRIPES) * TAU;
    B.bulb("bulb", P(RIM_R + 0.05, am, V_EDGE - V_DEPTH - 0.08), 0.1);
    B.bulb("bulb", P(BOARD_R + 0.04, a, CEIL + 0.33), 0.1);
    for (const t of [0.25, 0.6]) {
      const r = lerp1(RIM_R, TOP_R, t), y = lerp1(RIM_Y, TOP_Y, t);
      B.bulb("bulb", add(P(r, a, y), mul(norm(P(2.7, a, 5.7)), 0.06)), 0.1);
    }
  }
  // a row of bulbs under every ceiling sweep
  for (let k = 0; k < 12; k++)
    for (let r = 2.2; r < BOARD_R - 0.3; r += 1.3) B.bulb("bulb", P(r, (k / 12) * TAU, CEIL - 0.17), 0.08);
  for (let k = 0; k < 12; k++) B.bulb("bulb", P(CR + 0.03, ((k + 0.5) / 12) * TAU, (C0 + C1) / 2), 0.09);
  const lit = night ? c.bulbLit : c.bulb;
  rotor.add(meshOf(B, ["bulb"], { bulb: [lit, lit, -0.25] }, { outline: false, name: "bulbs" }));

  const MAT = {
    skirt: [c.skirt, c.skirtShade, 0.15],
    gold: [c.gold, c.goldShade, 0.1],
    floor: [c.floor, c.floorShade, 0.2],
    column: [c.column, c.columnShade, 0.1],
    mirror: night ? [c.mirrorLit, c.mirrorLit, 0] : [c.mirror, c.mirror, 0],
    glint: [c.glint, c.glint, 0],
    panel: [c.stripe, c.stripeShade, 0.05],
    ceiling: [c.column, c.columnShade, 0.2],
    board: [c.board, c.boardShade, 0.2],
    trim: [c.trim, c.trimShade, 0.15],
    pole: [c.trim, c.trimShade, 0.15],
    stripeA: [c.stripe, c.stripeShade, 0.05],
    stripeB: [c.stripeAlt, c.stripeAltShade, 0.05],
    domeK: [c.stripe, c.stripeShade, 0.1],
    chTrim: [c.gold, c.goldShade, 0.1],
    chSeat: [c.column, c.columnShade, 0.2],
    chBody: [c.stripe, c.stripeShade, 0.1],
  };
  rotor.add(meshOf(R, ["skirt", "gold", "floor"], MAT, { px: 3, name: "platform" }));
  const keys = Object.keys(R.s);
  for (const k of keys) {
    if (["skirt", "floor", "gold", "stripeA", "stripeB", "domeK", "chTrim", "chSeat", "chBody", "mirror", "glint", "panel", "column"].includes(k)) continue;
    rotor.add(meshOf(R, [k], MAT, { px: 2 }));
  }
  rotor.add(meshOf(R, ["column", "mirror", "glint", "panel"], MAT, { px: 2, name: "column" }));
  rotor.add(meshOf(R, ["stripeA", "stripeB", "domeK"], MAT, { px: 3, name: "canopy" }));
  rotor.add(meshOf(R, ["chBody", "chSeat", "chTrim"], MAT, { px: 2, name: "chariots" }));

  // ---------- horses ----------
  const horses = [];
  let hn = 0;
  for (const sl of slots) {
    if (sl.chariot) continue;
    const j = new THREE.Group();
    j.name = `horse${hn}`;
    j.position.set(...P(sl.r, sl.a, HORSE_Y));
    j.rotation.y = sl.a + Math.PI / 2; // nose along the direction of travel (counter-clockwise from above)
    j.scale.setScalar(HS);
    rotor.add(j);
    joints[j.name] = j;
    const [coat, mane, blanket] = HORSE_SKINS[hn % 3];
    const m = kit.toon(horseGeo, coat[0], coat[1], { threshold: 0.2, px: 2 });
    m.material = [
      kit.cel(coat[0], coat[1], { threshold: 0.2 }),
      kit.cel(mane[0], mane[1], { threshold: 0.2 }),
      kit.cel(blanket[0], blanket[1], { threshold: 0.15 }),
      kit.cel(c.gold, c.goldShade, { threshold: 0.1 }),
      kit.cel(c.gold, c.goldShade, { threshold: 0.1 }),
      kit.cel(c.eye, c.eye, { threshold: 0 }),
    ];
    m.name = "horse";
    j.add(m);
    horses.push({ j, phase: (sl.i % 2) * Math.PI + sl.ring * (Math.PI / 2) });
    hn++;
  }

  // ---------- poses and clips ----------
  // sign: rotor.rotation.y > 0 turns the ride counter-clockwise seen from above; the horses face that way.
  const CLIPS = { spin: 20 };
  const BOBS = 4; // bobs per turn
  function apply(ph) {
    rotor.rotation.y = TAU * ph;
    for (const h of horses) h.j.position.y = HORSE_Y + BOB * Math.sin(TAU * BOBS * ph + h.phase);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`carousel: no clip "${m[1]}" (clips: spin)`);
      const T0 = CLIPS[m[1]];
      return apply((((+m[2] % T0) + T0) % T0) / T0);
    }
    if (name !== "rest") throw new Error(`carousel: unknown pose "${name}" (rest, or spin@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

// school-gate.js - the main gate (seimon) of a Japanese school: the first-day-of-school shot. Static set; the sliding
// gate rides on joints. Contract: harness/lab/README.md. Meters, +Y up, the street side faces +Z, its left is +X,
// stands on y = 0, centred on x = 0, z = 0. One set with models/school.js (same script, same wall and fence colours).
//
// Construction (boxes and octagonal prisms, triangle soups merged per material and per moving part; flat-shaded, so
// the concrete reads as slabs):
//   PILLARS  two square concrete gate posts (mon-chu) either side of a 5 m opening: a plinth course, the shaft, a
//            thin dark shadow joint, then an overhanging cap with a raised top. The +X post carries the name plate
//            on its street face: a tall pale board in a dark frame, blank (no lettering, ever).
//   WALLS    a low concrete wall runs 3 m outward from each post, with a flat coping and a green steel picket fence
//            standing on it (posts, top and bottom rail, pickets). The coping is flat and the fence is open, so a
//            cherry tree placed behind the wall reads through and over it.
//   GATE     a rolling steel gate between the posts, telescoping in two leaves on two floor rails behind the posts:
//            each leaf a frame (top / bottom rail, stiles, posts) filled with horizontal bars, riding on small dark
//            wheels in a flush rail. Open slides both leaves behind the -X wall: the lead leaf (joint `gate`) travels
//            the whole opening, the tail leaf (joint `gateTail`) half of it, so at open = 1 both park behind the wall.
// Proportions (real size, base unit the post width P = 0.6 m): post 0.6 square, 1.68 shaft + 0.18 cap = 1.86 tall
//   (cap 0.72 square); opening 5.0 (8.3 P) between the posts; walls 3.0 long, 0.2 thick, 1.2 tall with a 0.26 coping,
//   fence 0.42 over the coping (1.62); gate leaves 2.65 long, 1.25 tall, 6 cm stiles, 8 bars; wheels r 5 cm.
// Options: build(THREE, kit, colors, { height, open }) - height scales the whole gate uniformly to that top (as the
//   torii and the school do); open 0..1 (default 0) slides the gate. slide(open) does the same after build.
// Poses: rest (opts.open), closed, open. Clip: slide (6 s: closed, opens, holds, closes) - pose("slide@2.5").
// Colours (meadow, as models/school.js), base / shade:
//   posts, walls, coping, caps   moon #f7f3e1 / skin #f0c2ae, threshold 0.1 (the street face, dot 0.30, stays lit)
//   plinths, cap tops            sky #d7ecef / skin #f0c2ae (pale stone courses, off the cream)
//   name plate                   sclera #f6f3ee / sky #d7ecef, threshold -0.4 (always the pale board)
//   plate frame, shadow joints, rails, wheels   hair #2c5131 (one tone: they are lines)
//   gate and fence steel         iris #3f8a47 / hair #2c5131, threshold 0.1, ink 2 px

export const meta = {
  name: "school-gate",
  height: 1.86,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    stone: "#d7ecef", stoneShade: "#f0c2ae",
    plate: "#f6f3ee", plateShade: "#d7ecef",
    dark: "#2c5131",
    steel: "#3f8a47", steelShade: "#2c5131",
  },
  poses: ["rest", "closed", "open"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const root = new THREE.Group();
  root.name = "school-gate";
  const body = new THREE.Group(); // uniform size scale lives here
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const groups = {}; // part -> material key -> flat positions
  let part = "static";
  const S = (key) => ((groups[part] ??= {})[key] ??= []);
  // one triangle wound away from `ref` (a point inside the solid)
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a centred box: centre x, y, z and half sizes
  const cbox = (key, x, y, z, hx, hy, hz) => box(key, x - hx, x + hx, y - hy, y + hy, z - hz, z + hz);
  // an n-gon prism along z (a wheel): centre, radius, half depth
  function wheel(key, x, y, z, r, hd, n = 8) {
    const ref = [x, y, z];
    const P = (i, s) => [x + r * Math.cos((i / n) * Math.PI * 2 + Math.PI / n), y + r * Math.sin((i / n) * Math.PI * 2 + Math.PI / n), z + s * hd];
    for (let i = 0; i < n; i++) {
      quad(key, P(i, -1), P(i + 1, -1), P(i + 1, 1), P(i, 1), ref);
      tri(key, [x, y, z - hd], P(i, -1), P(i + 1, -1), ref);
      tri(key, [x, y, z + hd], P(i, 1), P(i + 1, 1), ref);
    }
  }

  // ---------- dimensions ----------
  const OPEN = 5.0, P = 0.6, HP = P / 2; // opening, post width
  const XI = OPEN / 2, XC = XI + HP, XO = XI + P; // post inner face, centre, outer face
  const SH = 1.68, CAP = 0.18, TOP = SH + CAP; // shaft, cap
  const WL = 3.0, WT = 0.2, WH = 1.2, XE = XO + WL; // wall length, thickness, height, end
  const FH = 0.42; // fence over the coping (top 1.62, so the posts stand proud of it)
  const ZA = -0.42, ZB = -0.56, GT = 0.05; // gate leaf planes (tail, lead), leaf half thickness
  const k = opts.height ? opts.height / TOP : 1;
  body.scale.setScalar(k);
  body.position.z = 0.12 * k; // centre the depth (posts' front to the rear rail) on z = 0

  // ---------- posts ----------
  for (const s of [-1, 1]) {
    const x = s * XC;
    cbox("stone", x, 0.09, 0, HP + 0.03, 0.09, HP + 0.03); // plinth course
    box("wall", x - HP, x + HP, 0.18, SH - 0.05, -HP, HP); // shaft
    box("dark", x - HP + 0.015, x + HP - 0.015, SH - 0.05, SH, -HP + 0.015, HP - 0.015); // shadow joint under the cap
    box("wall", x - HP - 0.06, x + HP + 0.06, SH, SH + 0.12, -HP - 0.06, HP + 0.06); // cap slab
    box("stone", x - HP + 0.02, x + HP - 0.02, SH + 0.12, TOP, -HP + 0.02, HP - 0.02); // raised cap top
  }
  // name plate on the +X post's street face: tall pale board in a dark frame, blank
  const PW = 0.36, PY0 = 0.42, PY1 = 1.5;
  box("dark", XC - PW / 2 - 0.035, XC + PW / 2 + 0.035, PY0 - 0.035, PY1 + 0.035, HP - 0.01, HP + 0.035);
  box("plate", XC - PW / 2, XC + PW / 2, PY0, PY1, HP, HP + 0.05);

  // ---------- walls and fences ----------
  for (const s of [-1, 1]) {
    const [x0, x1] = s > 0 ? [XO - 0.02, XE] : [-XE, -XO + 0.02];
    box("stone", x0, x1, 0, 0.12, -WT / 2 - 0.02, WT / 2 + 0.02); // footing course
    box("wall", x0, x1, 0.12, WH - 0.06, -WT / 2, WT / 2);
    box("wall", x0 - (s < 0 ? 0.04 : 0), x1 + (s > 0 ? 0.04 : 0), WH - 0.06, WH, -WT / 2 - 0.04, WT / 2 + 0.04); // flat coping
    // fence: posts every ~1 m, rails, pickets
    const a = Math.min(Math.abs(x0), Math.abs(x1)) + 0.12, b = Math.max(Math.abs(x0), Math.abs(x1)) - 0.06;
    const n = Math.round((b - a) / 1.0);
    for (let i = 0; i <= n; i++) cbox("steel", s * (a + ((b - a) * i) / n), WH + FH / 2, 0, 0.025, FH / 2, 0.025);
    const xm = s * (a + b) / 2, hl = (b - a) / 2;
    cbox("steel", xm, WH + FH - 0.02, 0, hl, 0.02, 0.03); // top rail
    cbox("steel", xm, WH + 0.07, 0, hl, 0.015, 0.02); // bottom rail
    const m = Math.round((b - a) / 0.13);
    for (let i = 1; i < m; i++) cbox("steel", s * (a + ((b - a) * i) / m), WH + FH / 2 - 0.01, 0, 0.009, FH / 2 - 0.03, 0.009);
  }

  // ---------- floor rails (flush steel strips), from the +X post to past the -X parking spot ----------
  for (const z of [ZA, ZB]) box("dark", -XC - 2.9, XC, 0, 0.012, z - 0.025, z + 0.025);

  // ---------- gate leaves (each its own group, so it can slide) ----------
  const LL = OPEN / 2 + 0.15; // leaf length: half the opening plus a lap behind a post and over the other leaf
  const GH = 1.25, Y0 = 0.1; // leaf top, bottom rail
  function leaf(name, z) {
    part = name;
    const x0 = -LL / 2, x1 = LL / 2;
    box("steel", x0, x1, GH - 0.06, GH, z - GT, z + GT); // top rail
    box("steel", x0, x1, Y0, Y0 + 0.07, z - GT, z + GT); // bottom rail
    for (const x of [x0, x1 - 0.06]) box("steel", x, x + 0.06, Y0, GH, z - GT, z + GT); // end stiles
    const posts = 3;
    for (let i = 1; i < posts; i++) {
      const x = x0 + ((x1 - x0) * i) / posts;
      box("steel", x - 0.02, x + 0.02, Y0 + 0.07, GH - 0.06, z - GT * 0.8, z + GT * 0.8);
    }
    const bars = 8, yb0 = Y0 + 0.07, yb1 = GH - 0.06;
    for (let i = 1; i <= bars; i++) {
      const y = yb0 + ((yb1 - yb0) * i) / (bars + 1);
      box("steel", x0 + 0.03, x1 - 0.03, y - 0.018, y + 0.018, z - GT * 0.6, z + GT * 0.6);
    }
    for (const x of [x0 + 0.3, x1 - 0.3]) {
      box("dark", x - 0.07, x + 0.07, Y0 - 0.02, Y0 + 0.01, z - GT * 0.9, z + GT * 0.9); // wheel housing
      wheel("dark", x, 0.05 * Math.cos(Math.PI / 8), z, 0.05, 0.02);
    }
    part = "static";
  }
  leaf("gateTail", ZA);
  leaf("gate", ZB);

  // ---------- meshes ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, {}],
    stone: [c.stone, c.stoneShade, 0.1, {}],
    plate: [c.plate, c.plateShade, -0.4, {}],
    dark: [c.dark, c.dark, 0.1, { outline: false }],
    steel: [c.steel, c.steelShade, 0.1, { px: 2 }],
  };
  const holders = { static: body };
  for (const name of ["gateTail", "gate"]) {
    const j = new THREE.Group();
    j.name = name;
    body.add(j);
    joints[name] = holders[name] = j;
  }
  for (const [pname, soups] of Object.entries(groups)) {
    for (const [key, arr] of Object.entries(soups)) {
      const [base, shade, threshold, o] = MAT[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      const mesh = kit.toon(g, base, shade, { threshold, ...o });
      mesh.name = pname === "static" ? key : `${pname}-${key}`;
      holders[pname].add(mesh);
    }
  }

  // ---------- slide ----------
  // open 0: tail leaf centred on the -X half of the opening, lead leaf on the +X half (lapping 0.15 at the middle).
  // open 1: both parked behind the -X wall. joints.gate.position.x and joints.gateTail.position.x are the travel.
  const TAIL0 = -XI + LL / 2 - 0.1, LEAD0 = XI - LL / 2 + 0.1, PARK = -XO - LL / 2 + 0.1;
  function slide(open) {
    const o = Math.min(1, Math.max(0, open));
    joints.gateTail.position.x = TAIL0 + (PARK - TAIL0) * o;
    joints.gate.position.x = LEAD0 + (PARK - 0.05 - LEAD0) * o;
    root.updateMatrixWorld(true);
  }
  const CLIPS = { slide: 6 };
  const ease = (t) => t * t * (3 - 2 * t);
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`school-gate: no clip "${m[1]}" (clips: slide)`);
      const t = ((+m[2] % 6) + 6) % 6; // 0-1 closed, 1-3 opens, 3-4 open, 4-6 closes
      return slide(t < 1 ? 0 : t < 3 ? ease((t - 1) / 2) : t < 4 ? 1 : 1 - ease((t - 4) / 2));
    }
    if (name === "rest") return slide(opts.open ?? 0);
    if (name === "closed") return slide(0);
    if (name === "open") return slide(1);
    throw new Error(`school-gate: unknown pose "${name}" (rest, closed, open, or slide@<seconds>)`);
  }
  pose("rest");
  return { root, joints, pose, slide, clips: { ...CLIPS } };
}

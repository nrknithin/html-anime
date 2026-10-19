// chashitsu.js - a small tea-ceremony room (the tea club's four-and-a-half-mat room), cutaway set with a steam loop.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in; the -Z wall holds the tokonoma (left) and the round shoji window (right), the -X wall
// the low crawl-in door. Stands on y = 0 (the tatami top is y = 0.06, joints.floor), centred on the room.
//
// Construction (boxes, profile lathes, polygon tubes and flat ribbons, triangle soups merged per material; boxes flat
// shaded so mats and walls read crisp, lathes smooth around the axis and across gentle profile bends, creased at
// rims; every closed part is wound away from a point inside it, or by the outward normal of its lathe profile):
//   FLOOR    4.5 tatami in the pinwheel layout: four 1.82 x 0.91 mats around a centre half-mat, T-junctions only.
//            Dark heri on each long edge, faint rush lines. The half-mat is cut for the ro (yojohan-giri).
//   RO       a 0.42 m sunken hearth in the half-mat: black lacquer frame (robuchi), pale ash, charcoal, and the iron
//            kettle (kama) on it: a lathe body with a lid, knob and two lugs. Its steam is the clip.
//   WALLS    pale plaster walls on the -X and -Z sides with a paper skirting (koshibari), dark posts at the corners
//            and cut ends, a top rail. Plaster carries no hull (its split boxes would ink their seams); the posts,
//            rails and frames edge it. The -Z wall right half has a round window (marumado): a plaster ring panel
//            around a circle, a wood frame ring, a paper disc and a kumiko grid clipped to the circle.
//   DOOR     the nijiriguchi in the -X wall: a 0.65 x 0.72 opening at the floor, wood sill and lintel, a plank door
//            slid part open on the outside, and bright daylight (a glow panel) past it.
//   TOKONOMA a 1.2 m alcove: raised toko-datami with a lacquer front band, a natural tokobashira post, otoshigake
//            lintel, a hanging scroll (wood mounting, paper, an abstract ink wash of two mountain masses, rods) and
//            a dark vase with one red camellia and two leaves.
//   UTENSILS a red lacquer natsume with its scoop (chashaku) on the mat, a bamboo whisk (chasen: handle, a tine bulb
//            curling in at the top, dark tine lines), a pale tea bowl on the host side and a dark raku bowl set out
//            before the guest's red cushion (zabuton). Utensils are 1.6x real size so they survive the thumbnail.
//   STEAM    nine puffs in ONE mesh (smooth sphere normals, thin ink). pose("steam@t") rewrites their vertices:
//            each puff rises from the lid along a slow S-curve, swelling then shrinking to nothing, phases 1/9 apart,
//            so the loop is seamless. Uniform scale + translation only, so normals and hull normals stay valid.
// Proportions (real size, base unit the mat 1.82 x 0.91): room 2.73 x 2.73 inside, tatami top 0.06, walls 0.1 thick
//   and 2.2 tall (meta.height, chashitsu are low); tokonoma 1.2 wide, 0.5 deep (shallow so the scroll shows),
//   floor 0.16; scroll 0.4 x 0.94; ro 0.42 square; kettle r 0.155, top 0.30; round window r 0.42 at y 1.15;
//   nijiriguchi 0.65 x 0.72.
// Options: build(THREE, kit, colors, { height }) scales the whole set so the wall top is `height` (default 2.2).
// Poses: rest (steam at t = 0). Clips: steam (3 s loop), pose("steam@1.2").
// Colours (noon, the washitsu's set): tatami sky #f2d7ae / skin #f0c2ae, heri and ink hair #241c16 (flat), rush lines
//   skin (flat); wood and the iron kettle iris #5c3d32 / hair; trim iris (flat); plaster moon #fff6e4 / sky; paper
//   (window, koshibari) practical #fffaf2 / sclera #f6f3ee; red lacquer, cushion, camellia accent #c4452d / iris;
//   ceramic (pale bowl, ash, scroll paper) moon / sclera; bamboo sky / iris (threshold -0.3, so nearly all sky);
//   lacquer (robuchi, toko band) hair flat; leaves and the scroll's ink wash trim;
//   steam practical / moon; daylight practical (glow, threshold -1).
// Meshes: 13, one per material; the steam mesh is rewritten per frame. 4.9k triangles (steam 1.1k).
// Joints: anchors floor, kettle, steam (puff source), host, guest, tokonoma, door.

export const meta = {
  name: "chashitsu",
  height: 2.2,
  script: "noon",
  colors: {
    tatami: "#f2d7ae", tatamiShade: "#f0c2ae",
    dark: "#241c16",
    weave: "#f0c2ae",
    wood: "#5c3d32", woodShade: "#241c16",
    trim: "#5c3d32",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    red: "#c4452d", redShade: "#5c3d32",
    ceramic: "#fff6e4", ceramicShade: "#f6f3ee",
    bamboo: "#f2d7ae", bambooShade: "#5c3d32",
    lacquer: "#241c16",
    steam: "#fffaf2", steamShade: "#fff6e4",
    glow: "#fffaf2",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "chashitsu";
  const set = new THREE.Group(); // uniform size scale lives here
  set.name = "room";
  set.scale.setScalar(height / meta.height);
  root.add(set);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const soups = {};
  const S = (key) => (soups[key] ??= []);
  // one triangle facing along `out` (outward direction)
  // `vn` optional per-vertex normals [na, nb, ne] (smooth lathes); otherwise the flat face normal
  const norms = {};
  function triOut(key, a, b, e, out, vn) {
    const n = cross(sub(b, a), sub(e, a));
    const l = Math.hypot(...n);
    if (l < 1e-10) return;
    const flip = dot(n, out) < 0;
    S(key).push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    const f = n.map((v) => (flip ? -v : v) / l);
    (norms[key] ??= []).push(...(vn ? (flip ? [vn[0], vn[2], vn[1]] : vn).flat() : [...f, ...f, ...f]));
  }
  // one triangle wound away from `ref` (a point inside the solid)
  function tri(key, a, b, e, ref) {
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    triOut(key, a, b, e, sub(m, ref));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a beam from a to b, w wide and h tall
  function beam(key, a, b, w, h) {
    const d = sub(b, a), s = nrm(cross(d, [0, 1, 0])), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // surface of revolution about the vertical axis at (cx, cz). prof [[r, y], ...] runs counter-clockwise in the
  // (r, y) half-plane (bottom centre -> out -> up -> back in), so its outward normal is (dy, -dr): open bowls work.
  function lathe(key, prof, cx, cz, n = 16) {
    // 2D outward normal of each profile segment, then per-end vertex normals: averaged with the neighbour where the
    // profile bends less than ~45 deg (smooth bellies), kept where it creases (rims, feet, lids)
    const seg = [];
    for (let i = 0; i + 1 < prof.length; i++) {
      const dr = prof[i + 1][0] - prof[i][0], dy = prof[i + 1][1] - prof[i][1], l = Math.hypot(dr, dy) || 1;
      seg.push([dy / l, -dr / l]);
    }
    const endN = (i, k) => { // normal of segment i at its end k (0 start, 1 end)
      const j = k ? i + 1 : i - 1, o = seg[j];
      if (!o || seg[i][0] * o[0] + seg[i][1] * o[1] < 0.7) return seg[i];
      const m = [seg[i][0] + o[0], seg[i][1] + o[1]], l = Math.hypot(...m);
      return [m[0] / l, m[1] / l];
    };
    for (let i = 0; i + 1 < prof.length; i++) {
      const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
      const [nr, ny] = seg[i], e0 = endN(i, 0), e1 = endN(i, 1);
      for (let j = 0; j < n; j++) {
        const a0 = (j / n) * Math.PI * 2, a1 = ((j + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const P = (r, y, a) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
        const out = [nr * Math.cos(am), ny, nr * Math.sin(am)];
        const A = P(r0, y0, a0), B = P(r0, y0, a1), C = P(r1, y1, a1), D = P(r1, y1, a0);
        const N = (e, a) => [e[0] * Math.cos(a), e[1], e[0] * Math.sin(a)];
        triOut(key, A, B, C, out, [N(e0, a0), N(e0, a1), N(e1, a1)]);
        triOut(key, A, C, D, out, [N(e0, a0), N(e1, a1), N(e1, a0)]);
      }
    }
  }
  // tapered polygon tube along a polyline, rad(t) for t in 0..1, closed at both ends
  function tube(key, pts, rad, n = 5) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d), r = rad(i / (pts.length - 1));
      return Array.from({ length: n }, (_, j) => {
        const t = (j / n) * Math.PI * 2;
        return [0, 1, 2].map((k) => p[k] + r * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = pts[i].map((v, k) => (v + pts[i + 1][k]) / 2);
      for (let j = 0; j < n; j++) quad(key, rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], ref);
    }
    const a = pts[0], b = pts[pts.length - 1], L = rings.length - 1;
    const ra = pts[1].map((v, k) => (v + a[k]) / 2), rb = pts[L - 1].map((v, k) => (v + b[k]) / 2);
    for (let j = 0; j < n; j++) {
      tri(key, a, rings[0][j], rings[0][(j + 1) % n], ra);
      tri(key, b, rings[L][j], rings[L][(j + 1) % n], rb);
    }
  }
  // flat shapes on a plane: W(u, v) maps plane coordinates to world, back(u, v) is a point behind the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z (s = 1)
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X (s = 1)
  const floorY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] }); // facing +Y
  function rect(key, P, u0, u1, v0, v1) {
    quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  }
  function fan(key, P, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, P.W(cu, cv), P.W(a[0], a[1]), P.W(b[0], b[1]), P.back(cu, cv));
    }
  }
  // a ribbon along a plane path [[u, v], ...] with width w(t)
  function ribbon(key, P, path, w) {
    const side = path.map((p, i) => {
      const q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)];
      const d = nrm([q[0] - o[0], q[1] - o[1], 0]), h = w(i / (path.length - 1)) / 2;
      return [[p[0] - d[1] * h, p[1] + d[0] * h], [p[0] + d[1] * h, p[1] - d[0] * h]];
    });
    for (let i = 0; i + 1 < path.length; i++) {
      const [a, b] = side[i], [e, d] = side[i + 1];
      quad(key, P.W(...a), P.W(...b), P.W(...d), P.W(...e), P.back(...path[i]));
    }
  }
  // a closed annulus along Z (window frame): radii r0 < r1 about (cx, cy), from z0 to z1
  function ringZ(key, cx, cy, z0, z1, r0, r1, n = 32) {
    for (let j = 0; j < n; j++) {
      const a0 = (j / n) * Math.PI * 2, a1 = ((j + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const P = (r, a, z) => [cx + r * Math.cos(a), cy + r * Math.sin(a), z];
      const ref = [cx + ((r0 + r1) / 2) * Math.cos(am), cy + ((r0 + r1) / 2) * Math.sin(am), (z0 + z1) / 2];
      quad(key, P(r0, a0, z0), P(r0, a1, z0), P(r0, a1, z1), P(r0, a0, z1), ref);
      quad(key, P(r1, a0, z0), P(r1, a1, z0), P(r1, a1, z1), P(r1, a0, z1), ref);
      quad(key, P(r0, a0, z0), P(r0, a1, z0), P(r1, a1, z0), P(r1, a0, z0), ref);
      quad(key, P(r0, a0, z1), P(r0, a1, z1), P(r1, a1, z1), P(r1, a0, z1), ref);
    }
  }

  // ---------- dimensions ----------
  const X1 = 1.365, Z1 = 1.365, T = 0.1, FT = 0.06, TOP = 2.2;
  const TK = { x0: -X1, x1: -0.165, z0: -Z1 - 0.5, y: 0.16, lintel: 1.62 }; // tokonoma recess
  const RO = { x: 0, z: 0, s: 0.424, rim: 0.045 };
  const WIN = { x: 0.68, y: 1.15, r: 0.42, h: 0.56 }; // round window centre, radius, half-size of its ring panel
  const DOOR = { z0: 0.42, z1: 1.07, h: 0.72 }; // nijiriguchi in the -X wall

  // ---------- tatami ----------
  const MATS = [
    [-X1, 0.455, -Z1, -0.455], [0.455, X1, -Z1, 0.455], [-0.455, X1, 0.455, Z1], [-X1, -0.455, -0.455, Z1],
  ];
  const HERI = 0.038, g = 0.0015;
  function mat(x0, x1, z0, z1, heri = true) {
    box("tatami", x0 + g, x1 - g, 0, FT, z0 + g, z1 - g);
    const top = floorY(FT + 0.0012), wv = floorY(FT + 0.0008);
    const alongX = x1 - x0 > z1 - z0;
    if (alongX) for (let z = z0 + HERI + 0.06; z < z1 - HERI - 0.04; z += 0.07) rect("weave", wv, x0 + 0.01, x1 - 0.01, z - 0.003, z + 0.003);
    else for (let x = x0 + HERI + 0.06; x < x1 - HERI - 0.04; x += 0.07) rect("weave", wv, x - 0.003, x + 0.003, z0 + 0.01, z1 - 0.01);
    if (!heri) return;
    if (alongX) {
      rect("dark", top, x0 + g, x1 - g, z0 + g, z0 + g + HERI);
      rect("dark", top, x0 + g, x1 - g, z1 - g - HERI, z1 - g);
    } else {
      rect("dark", top, x0 + g, x0 + g + HERI, z0 + g, z1 - g);
      rect("dark", top, x1 - g - HERI, x1 - g, z0 + g, z1 - g);
    }
  }
  for (const m of MATS) mat(...m);
  // the half-mat, cut around the ro: four pieces, no heri (a half-mat's heri runs along its long side only; skipped)
  const H = 0.455, R0 = RO.s / 2;
  box("tatami", -H + g, H - g, 0, FT, -H + g, RO.z - R0);
  box("tatami", -H + g, H - g, 0, FT, RO.z + R0, H - g);
  box("tatami", -H + g, RO.x - R0, 0, FT, RO.z - R0, RO.z + R0);
  box("tatami", RO.x + R0, H - g, 0, FT, RO.z - R0, RO.z + R0);
  for (let x = -H + 0.06; x < H - 0.04; x += 0.07) {
    if (x > RO.x - R0 - 0.01 && x < RO.x + R0 + 0.01) {
      rect("weave", floorY(FT + 0.0008), x - 0.003, x + 0.003, -H + 0.01, RO.z - R0 - 0.005);
      rect("weave", floorY(FT + 0.0008), x - 0.003, x + 0.003, RO.z + R0 + 0.005, H - 0.01);
    } else rect("weave", floorY(FT + 0.0008), x - 0.003, x + 0.003, -H + 0.01, H - 0.01);
  }

  // ---------- ro and kettle ----------
  {
    const { x, z, rim } = RO, o = R0, i = R0 - rim, ty = FT + 0.008;
    box("lacquer", x - o, x + o, 0.0, ty, z - o, z - i);
    box("lacquer", x - o, x + o, 0.0, ty, z + i, z + o);
    box("lacquer", x - o, x - i, 0.0, ty, z - i, z + i);
    box("lacquer", x + i, x + o, 0.0, ty, z - i, z + i);
    box("ceramic", x - i, x + i, 0.0, 0.018, z - i, z + i); // ash
    for (const [dx, dz, s] of [[-0.09, -0.07, 0.04], [0.08, -0.09, 0.035], [0.1, 0.08, 0.04], [-0.07, 0.1, 0.03]])
      box("dark", x + dx - s / 2, x + dx + s / 2, 0.018, 0.034, z + dz - s / 2, z + dz + s / 2); // charcoal
  }
  const KET = { x: RO.x, z: RO.z, y: 0.03 };
  const kprof = [[0, 0], [0.09, 0.004], [0.14, 0.04], [0.155, 0.09], [0.15, 0.13], [0.12, 0.18], [0.075, 0.208], [0.068, 0.222],
    [0.078, 0.224], [0.078, 0.232], [0.05, 0.24], [0.02, 0.242], [0.02, 0.256], [0.03, 0.262], [0.02, 0.272], [0, 0.274]];
  lathe("wood", kprof.map(([r, y]) => [r, KET.y + y]), KET.x, KET.z, 18);
  for (const s of [-1, 1]) { // the lugs (kan-tsuki), on the x axis
    box("wood", KET.x + s * 0.12, KET.x + s * 0.168, KET.y + 0.16, KET.y + 0.19, KET.z - 0.018, KET.z + 0.018);
  }
  const STEAM0 = [KET.x + 0.01, KET.y + 0.275, KET.z];

  // ---------- walls ----------
  // -X wall with the nijiriguchi
  const WX = -X1, WZ = -Z1;
  box("plaster", WX - T, WX, 0, TOP, WZ, DOOR.z0);
  box("plaster", WX - T, WX, 0, TOP, DOOR.z1, Z1);
  box("plaster", WX - T, WX, FT + DOOR.h + 0.06, TOP, DOOR.z0, DOOR.z1);
  box("wood", WX - T - 0.01, WX + 0.01, FT + DOOR.h, FT + DOOR.h + 0.06, DOOR.z0 - 0.03, DOOR.z1 + 0.03); // lintel
  box("wood", WX - T - 0.01, WX + 0.01, 0, FT + 0.006, DOOR.z0 - 0.03, DOOR.z1 + 0.03); // sill
  box("wood", WX - T - 0.005, WX + 0.008, FT, FT + DOOR.h, DOOR.z0 - 0.03, DOOR.z0 + 0.006); // jambs, proud of the
  box("wood", WX - T - 0.005, WX + 0.008, FT, FT + DOOR.h, DOOR.z1 - 0.006, DOOR.z1 + 0.03); // plaster on every face
  // the plank door, slid toward -Z on the outside, and daylight past it
  const DX = WX - T - 0.03, DS = 0.4;
  box("wood", DX - 0.012, DX + 0.012, FT + 0.007, FT + DOOR.h - 0.01, DOOR.z0 - DS, DOOR.z1 - DS);
  for (let k = 1; k < 4; k++) {
    const zz = DOOR.z0 - DS + (k * (DOOR.z1 - DOOR.z0)) / 4;
    if (zz > DOOR.z0 + 0.01) rect("dark", wallX(DX + 0.0135), zz - 0.004, zz + 0.004, FT + 0.03, FT + DOOR.h - 0.03);
  }
  box("wood", DX + 0.013, DX + 0.022, FT + 0.18, FT + 0.24, DOOR.z1 - DS - 0.07, DOOR.z1 - DS - 0.04); // pull
  rect("glow", wallX(WX - T - 0.2), DOOR.z0 - 0.1, DOOR.z1 + 0.1, 0, FT + DOOR.h + 0.1);
  rect("glow", floorY(0.002), WX - T - 0.2, WX - T, DOOR.z0 - 0.1, DOOR.z1 + 0.1); // the bright ground outside
  // -Z wall: tokonoma opening on the left, round window panel on the right
  const wx0 = WIN.x - WIN.h, wx1 = WIN.x + WIN.h, wy0 = WIN.y - WIN.h, wy1 = WIN.y + WIN.h;
  box("plaster", TK.x1, X1, 0, wy0, WZ - T, WZ);
  box("plaster", TK.x1, X1, wy1, TOP, WZ - T, WZ);
  box("plaster", TK.x1, wx0, wy0, wy1, WZ - T, WZ);
  box("plaster", wx1, X1, wy0, wy1, WZ - T, WZ);
  {
    // the ring panel: square boundary to circle, front (+Z) and back faces; the frame ring covers the reveal
    const n = 32, faces = [[WZ, 1], [WZ - T, -1]];
    const Q = (a) => { const cs = Math.cos(a), sn = Math.sin(a), m = Math.max(Math.abs(cs), Math.abs(sn)); return [WIN.x + (WIN.h * cs) / m, WIN.y + (WIN.h * sn) / m]; };
    const C = (a) => [WIN.x + WIN.r * Math.cos(a), WIN.y + WIN.r * Math.sin(a)];
    for (const [z, s] of faces) {
      const P = wallZ(z, s);
      for (let j = 0; j < n; j++) {
        const a0 = (j / n) * Math.PI * 2, a1 = ((j + 1) / n) * Math.PI * 2;
        const q0 = Q(a0), q1 = Q(a1), c0 = C(a0), c1 = C(a1);
        tri("plaster", P.W(...q0), P.W(...q1), P.W(...c1), P.back(...c0));
        tri("plaster", P.W(...q0), P.W(...c1), P.W(...c0), P.back(...c0));
      }
    }
    ringZ("wood", WIN.x, WIN.y, WZ - T - 0.005, WZ + 0.015, WIN.r - 0.035, WIN.r + 0.012, 32);
    // paper disc (a thin closed slab) and the kumiko grid on the room side, clipped to the circle
    const disc = Array.from({ length: 32 }, (_, k) => [WIN.x + (WIN.r - 0.03) * Math.cos((k / 32) * Math.PI * 2), WIN.y + (WIN.r - 0.03) * Math.sin((k / 32) * Math.PI * 2)]);
    fan("paper", wallZ(WZ - 0.045, 1), disc);
    fan("paper", wallZ(WZ - 0.055, -1), disc);
    const rr = WIN.r - 0.032, k = 0.008, G = wallZ(WZ - 0.04, 1);
    for (const d of [-0.25, 0, 0.25]) {
      const half = Math.sqrt(rr * rr - d * d);
      rect("trim", G, WIN.x + d - k, WIN.x + d + k, WIN.y - half, WIN.y + half);
    }
    for (const d of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const half = Math.sqrt(rr * rr - d * d);
      rect("trim", G, WIN.x - half, WIN.x + half, WIN.y + d - k, WIN.y + d + k);
    }
  }
  // paper skirting (koshibari), top rail, posts
  const KB = 0.36;
  box("paper", WX, WX + 0.004, FT, KB, WZ, DOOR.z0 - 0.025);
  box("paper", WX, WX + 0.004, FT, KB, DOOR.z1 + 0.025, Z1);
  box("paper", TK.x1 + 0.06, X1, FT, KB, WZ, WZ + 0.004);
  rect("trim", wallX(WX + 0.0045), WZ, DOOR.z0 - 0.03, KB - 0.012, KB);
  rect("trim", wallX(WX + 0.0045), DOOR.z1 + 0.03, Z1, KB - 0.012, KB);
  rect("trim", wallZ(WZ + 0.0045), TK.x1 + 0.06, X1, KB - 0.012, KB);
  box("wood", TK.x0 - T, TK.x1 + 0.08, TOP - 0.07, TOP, TK.z0 - T - 0.01, TK.z0 + 0.03); // alcove top rail
  box("wood", WX - T - 0.01, WX + 0.03, TOP - 0.07, TOP, WZ - T, Z1 + 0.04);
  box("wood", WX - T, X1 + 0.04, TOP - 0.07, TOP, WZ - T - 0.01, WZ + 0.03);
  const post = (x, z, s = 0.055) => box("wood", x - s, x + s, 0, TOP, z - s, z + s);
  post(WX - 0.045, WZ - 0.045);
  post(WX - 0.045, Z1 + 0.0);
  post(X1 + 0.0, WZ - 0.045);

  // ---------- tokonoma ----------
  box("tatami", TK.x0, TK.x1, 0, TK.y, TK.z0, WZ); // toko-datami on its base
  rect("weave", floorY(TK.y + 0.0008), TK.x0 + 0.04, TK.x1 - 0.04, WZ - 0.25, WZ - 0.244);
  rect("weave", floorY(TK.y + 0.0008), TK.x0 + 0.04, TK.x1 - 0.04, WZ - 0.45, WZ - 0.444);
  box("lacquer", TK.x0, TK.x1, TK.y - 0.06, TK.y + 0.006, WZ - 0.035, WZ + 0.004); // toko-gamachi
  box("wood", TK.x0, TK.x1, TK.lintel, TK.lintel + 0.06, WZ - 0.04, WZ + 0.005); // otoshigake
  box("plaster", TK.x0 - T, TK.x1, TK.lintel + 0.06, TOP - 0.07, WZ - T, WZ);
  box("plaster", TK.x0 - T, TK.x1 + 0.08, 0, TOP, TK.z0 - T, TK.z0); // alcove back
  box("plaster", TK.x0 - T, TK.x0, 0, TOP, TK.z0, WZ - T); // alcove side (the -X wall carries on)
  box("plaster", TK.x1, TK.x1 + 0.08, TK.y, TOP, TK.z0, WZ - 0.06); // alcove side by the post
  // tokobashira: a natural round post
  lathe("wood", [[0, 0], [0.058, 0], [0.056, 0.7], [0.06, 1.4], [0.057, TOP], [0, TOP]], TK.x1 + 0.0, WZ + 0.0, 10);
  // hanging scroll: wood mounting, paper, abstract ink mountain and mist, rods, cord
  const SX = TK.x0 + 0.4, SB = TK.z0, sy0 = 0.62, sy1 = 1.56;
  box("wood", SX - 0.2, SX + 0.2, sy0, sy1, SB, SB + 0.006);
  box("ceramic", SX - 0.15, SX + 0.15, sy0 + 0.13, sy1 - 0.2, SB + 0.006, SB + 0.009);
  // ink-wash landscape: two washed mountain masses (iris) with a dark ridge stroke, mist bands left as paper
  const ridge = (x0, x1, base, hgt, cu, w) => Array.from({ length: 15 }, (_, q) => {
    const u = q / 14;
    return [x0 + u * (x1 - x0), base + hgt * Math.exp(-((u - cu) ** 2) / w)];
  });
  const back = ridge(SX - 0.14, SX + 0.14, sy0 + 0.44, 0.3, 0.62, 0.03);
  const front = ridge(SX - 0.14, SX + 0.14, sy0 + 0.22, 0.2, 0.3, 0.025);
  const wash = (pts, base, P) => {
    for (let q = 0; q + 1 < pts.length; q++)
      quad("trim", P.W(pts[q][0], base), P.W(pts[q + 1][0], base), P.W(...pts[q + 1]), P.W(...pts[q]), P.back(pts[q][0], base));
  };
  wash(back, sy0 + 0.4, wallZ(SB + 0.0098));
  ribbon("dark", wallZ(SB + 0.0105), back, (t) => 0.006 + 0.014 * Math.sin(Math.PI * t));
  wash(front, sy0 + 0.17, wallZ(SB + 0.0112));
  ribbon("dark", wallZ(SB + 0.0119), front, (t) => 0.006 + 0.016 * Math.sin(Math.PI * t));
  box("dark", SX - 0.22, SX + 0.22, sy1 - 0.01, sy1 + 0.015, SB, SB + 0.02); // top rod
  box("dark", SX - 0.23, SX + 0.23, sy0 - 0.03, sy0 + 0.005, SB + 0.002, SB + 0.03); // jiku
  ribbon("dark", wallZ(SB + 0.004), [[SX - 0.18, sy1 + 0.01], [SX, sy1 + 0.17], [SX + 0.18, sy1 + 0.01]], () => 0.008);
  // a dark vase with one camellia
  const VX = TK.x1 - 0.32, VZ = TK.z0 + 0.26, VY = TK.y;
  lathe("wood", [[0, VY], [0.05, VY], [0.07, VY + 0.06], [0.06, VY + 0.16], [0.032, VY + 0.22], [0.03, VY + 0.25], [0.045, VY + 0.265], [0, VY + 0.265]], VX, VZ, 12);
  const stem = [[VX, VY + 0.24, VZ], [VX - 0.01, VY + 0.33, VZ + 0.01], [VX - 0.04, VY + 0.42, VZ + 0.03], [VX - 0.08, VY + 0.48, VZ + 0.05]];
  tube("wood", stem, (t) => 0.007 - 0.003 * t, 5);
  // leaves: lens-shaped thin solids
  const leaf = (a, b, w) => {
    const d = sub(b, a), m = a.map((v, k) => (v + b[k]) / 2), s = nrm(cross(d, [0.3, 1, 0.4])), up = nrm(cross(s, d));
    const L = (u, side) => [0, 1, 2].map((k) => a[k] + d[k] * u + s[k] * side * w * Math.sin(Math.PI * u));
    for (let q = 0; q < 6; q++) {
      const u0 = q / 6, u1 = (q + 1) / 6;
      for (const side of [-1, 1]) {
        const top = (p) => p.map((v, k) => v + up[k] * 0.003), bot = (p) => p.map((v, k) => v - up[k] * 0.003);
        quad("trim", top(L(u0, 0)), top(L(u1, 0)), top(L(u1, side)), top(L(u0, side)), m);
        quad("trim", bot(L(u0, 0)), bot(L(u1, 0)), bot(L(u1, side)), bot(L(u0, side)), m);
        quad("trim", top(L(u0, side)), top(L(u1, side)), bot(L(u1, side)), bot(L(u0, side)), m);
      }
    }
  };
  leaf([VX - 0.01, VY + 0.34, VZ + 0.015], [VX + 0.1, VY + 0.38, VZ + 0.06], 0.028);
  leaf([VX - 0.035, VY + 0.42, VZ + 0.03], [VX - 0.14, VY + 0.43, VZ + 0.09], 0.024);
  {
    const [fx, fy, fz] = stem[stem.length - 1];
    const r = 0.065;
    lathe("red", [[0, fy - 0.03], [r * 0.6, fy - 0.022], [r, fy + 0.005], [r * 1.02, fy + 0.03], [r * 0.85, fy + 0.034], [r * 0.4, fy + 0.012], [0, fy + 0.012]], fx, fz, 10);
    lathe("bamboo", [[0, fy + 0.008], [0.022, fy + 0.008], [0.024, fy + 0.03], [0, fy + 0.034]], fx, fz, 8); // stamens
  }

  // ---------- utensils and the guest's cushion (about 1.6x real, so they survive the thumbnail) ----------
  const HOST = { x: 0.8, z: 0.02 }, GUEST = { x: -0.05, z: 0.92 }, U = 1.6;
  // lathe with the profile [[r, height above the mat], ...] in real metres, scaled by U
  const ware = (key, prof, x, z, n = 14) => lathe(key, prof.map(([r, y]) => [r * U, FT + y * U]), x, z, n);
  const BOWL = [[0, 0], [0.028, 0], [0.03, 0.01], [0.042, 0.013], [0.062, 0.038], [0.066, 0.072], [0.061, 0.076], [0.056, 0.052], [0.04, 0.028], [0, 0.024]];
  // pale tea bowl on the host side, the whisk standing beside it (handle down, tines curling in at the top)
  ware("ceramic", BOWL, HOST.x - 0.3, HOST.z + 0.22, 16);
  {
    const wx = HOST.x - 0.02, wz = HOST.z + 0.4;
    ware("bamboo", [[0, 0], [0.011, 0], [0.011, 0.035], [0.014, 0.04], [0, 0.04]], wx, wz, 10); // handle and its node
    const TP = [[0.011, 0.034], [0.015, 0.04], [0.028, 0.06], [0.031, 0.08], [0.027, 0.095], [0.02, 0.1], [0.016, 0.096], [0.008, 0.086], [0, 0.086]];
    ware("bamboo", [[0, 0.03], ...TP], wx, wz, 14); // the tine bulb, curling in at the top
    for (let k = 0; k < 10; k++) { // tine lines on the bulb
      const a = (k / 10) * Math.PI * 2 + 0.15;
      tube("dark", TP.slice(1, 6).map(([r, y]) => [wx + (r * U + 0.0015) * Math.cos(a), FT + y * U, wz + (r * U + 0.0015) * Math.sin(a)]), () => 0.0016, 3);
    }
  }
  // red lacquer natsume with its lid seam, the scoop laid before it
  const NX = HOST.x - 0.28, NZ = HOST.z - 0.24;
  ware("red", [[0, 0], [0.03, 0], [0.036, 0.008], [0.038, 0.034], [0.036, 0.056], [0.027, 0.064], [0, 0.066]], NX, NZ, 16);
  ware("dark", [[0, 0.04], [0.0386, 0.04], [0.0386, 0.044], [0, 0.044]], NX, NZ, 16);
  beam("bamboo", [NX + 0.11, FT + 0.007, NZ + 0.14], [NX + 0.11, FT + 0.007, NZ - 0.14], 0.026, 0.01);
  beam("bamboo", [NX + 0.11, FT + 0.007, NZ - 0.14], [NX + 0.108, FT + 0.022, NZ - 0.18], 0.028, 0.01);
  // the guest's dark raku bowl and red cushion
  ware("wood", BOWL, GUEST.x + 0.24, GUEST.z - 0.44, 16);
  {
    const x = GUEST.x, z = GUEST.z + 0.08, sx = 0.58, sz = 0.62;
    const R = (y, i) => [[x - sx / 2 + i, y, z - sz / 2 + i], [x + sx / 2 - i, y, z - sz / 2 + i], [x + sx / 2 - i, y, z + sz / 2 - i], [x - sx / 2 + i, y, z + sz / 2 - i]];
    hex("red", [...R(FT, 0.02), ...R(FT + 0.04, 0)]);
    hex("red", [...R(FT + 0.04, 0), ...R(FT + 0.1, 0.07)]);
    lathe("dark", [[0, FT + 0.097], [0.018, FT + 0.097], [0.018, FT + 0.106], [0, FT + 0.106]], x, z, 6);
  }

  // ---------- meshes ----------
  const MAT = {
    tatami: [c.tatami, c.tatamiShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    weave: [c.weave, c.weave, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    trim: [c.trim, c.trim, 0.1, 0],
    plaster: [c.plaster, c.plasterShade, 0.1, 0], // no hull: split boxes would ink their seams; posts and rails edge it
    paper: [c.paper, c.paperShade, 0.0, 0],
    red: [c.red, c.redShade, 0.2, 2],
    ceramic: [c.ceramic, c.ceramicShade, 0.1, 2],
    bamboo: [c.bamboo, c.bambooShade, -0.3, 2],
    lacquer: [c.lacquer, c.lacquer, 0.1, 2],
    glow: [c.glow, c.glow, -1, 0],
  };
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.setAttribute("normal", new THREE.Float32BufferAttribute(norms[key], 3));
    const mesh = kit.toon(gm, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  }

  // ---------- steam: five puffs in one mesh, rewritten per frame ----------
  const PUFFS = 9, LAT = 6, LON = 12;
  const unit = []; // unit-sphere triangle list (positions = normals)
  {
    const V = (i, j) => { const th = (i / LAT) * Math.PI, ph = (j / LON) * Math.PI * 2; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
    for (let i = 0; i < LAT; i++)
      for (let j = 0; j < LON; j++) {
        const a = V(i, j), b = V(i, j + 1), e = V(i + 1, j + 1), d = V(i + 1, j);
        for (const [p, q, r] of [[a, b, e], [a, e, d]]) {
          const n = cross(sub(q, p), sub(r, p));
          if (Math.hypot(...n) < 1e-9) continue;
          const m = [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3, (p[2] + q[2] + r[2]) / 3];
          unit.push(...(dot(n, m) < 0 ? [p, r, q] : [p, q, r]));
        }
      }
  }
  const per = unit.length; // vertices per puff
  const sp = new Float32Array(per * PUFFS * 3), sn = new Float32Array(per * PUFFS * 3);
  for (let k = 0; k < PUFFS; k++) for (let v = 0; v < per; v++) sn.set(unit[v], (k * per + v) * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("normal", new THREE.BufferAttribute(sn, 3));
  sg.setAttribute("hullNormal", new THREE.BufferAttribute(sn.slice(), 3)); // sphere normals are already smooth
  const steam = kit.toon(sg, c.steam, c.steamShade, { threshold: 0.0, px: 2 });
  steam.name = "steam";
  steam.frustumCulled = false;
  for (const h of steam.children) h.frustumCulled = false;
  set.add(steam);
  const STEAM_T = 3, RISE = 0.7;
  // a puff at phase u (0 at the lid, 1 at the top): position along a slow S-curve, radius swelling then gone
  function puff(u, k) {
    const y = STEAM0[1] + RISE * u;
    const sway = 0.1 * Math.sin(u * Math.PI * 1.5) * u; // the wisp leans and curls toward the open +X side
    const x = STEAM0[0] + sway + 0.03 * u;
    const z = STEAM0[2] - 0.6 * sway + 0.02 * Math.sin(k * 2.3) * u;
    const r = Math.max(0.0005, (0.035 + 0.07 * u) * (1 + 0.18 * Math.sin(k * 2.1)) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.5));
    return [x, y, z, r];
  }
  function steamAt(t) {
    const w = (((t / STEAM_T) % 1) + 1) % 1;
    for (let k = 0; k < PUFFS; k++) {
      const u = (w + k / PUFFS) % 1;
      const [x, y, z, r] = puff(u, k);
      for (let v = 0; v < per; v++) {
        const n = unit[v], i = (k * per + v) * 3;
        sp[i] = x + n[0] * r;
        sp[i + 1] = y + n[1] * r * 0.85;
        sp[i + 2] = z + n[2] * r;
      }
    }
    sg.attributes.position.needsUpdate = true;
    sg.computeBoundingSphere();
    sg.computeBoundingBox();
  }

  // anchors for placing figures and cameras
  const anchor = (name, x, y, z) => { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; };
  anchor("floor", 0, FT, 0);
  anchor("kettle", KET.x, KET.y, KET.z);
  anchor("steam", ...STEAM0);
  anchor("host", HOST.x, FT, HOST.z);
  anchor("guest", GUEST.x, FT + 0.1, GUEST.z + 0.08);
  anchor("tokonoma", (TK.x0 + TK.x1) / 2, TK.y, (TK.z0 + WZ) / 2);
  anchor("door", WX, FT, (DOOR.z0 + DOOR.z1) / 2);

  // ---------- poses and clips ----------
  // The only motion is the steam: pose("steam@t") is absolute in t (seconds, looping every STEAM_T), rest is t = 0.
  const CLIPS = { steam: STEAM_T };
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`chashitsu: no clip "${m[1]}" (clips: steam)`);
      steamAt(+m[2]);
    } else if (name === "rest") steamAt(0);
    else throw new Error(`chashitsu: unknown pose "${name}" (rest, or steam@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

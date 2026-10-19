// nurse-office.js - the school nurse's office (hokenshitsu) of every slice-of-life anime, a cutaway set at real size.
// Contract: harness/lab/README.md. Meters, +Y up; the open (cutaway) sides face +X and +Z, so the lab's front-left
// cameras look in; the window wall is -X and the back wall -Z. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, 4-6 sided rods, pleated lofts, lofted convex sections and flat quads, all triangle soups merged
// per material; only the curtains are their own meshes, one per sway pivot). Every triangle is wound away from a point
// inside its solid (box centre, rod axis, loft column, section centre), never by hand.
//   SHELL     floor quad with lighter board seams; two walls 12 cm thick, the -X wall cut into sill wall, piers and lintel
//             round one window; dark skirting; dark 2 cm section caps on the cut wall tops, so the cut reads as a cut.
//   WINDOW    (-X) aluminium casing, two sashes on two tracks, the room-side one slid open 0.4 m; glass is two unlined sky
//             plates back to back. A sheer curtain on a wall-bracketed rail: one panel drawn over the open gap, one bunched.
//   BEDS      (against -Z) two white-painted steel pipe beds: four posts on dark casters, side and end rails, a barred head
//             end and a lower foot end; a white sheet over the mattress, a pillow (lofted rounded section). Bed A (by the
//             window) has its green blanket pulled up, bed B a blanket folded at the foot.
//   TRACK     the privacy-curtain track at 2.4 m, a 35 x 30 mm channel: a foot rail from the window wall across both bed
//             feet, a side rail back to the -Z wall past bed B, and a divider between the beds to the -Z wall. Every rail
//             ends in a wall plate, so nothing hangs in the air without a ceiling. Curtains are pleated slabs (zigzag
//             faces that alternate base / shade) whose fold depth comes from a fixed fabric width over the drawn length.
//   SCHOOL    a Landolt-C eye chart (rows of ever smaller broken rings) and a wooden stadiometer with a sliding head
//             bar on the -Z wall, a dial scale on a column beside it, the nurse's steel desk with a drawer pedestal,
//             folders, a pen cup, a red first-aid box, a swivel chair, a notice board with health posters, a wall clock.
//   -X WALL   a glass medicine cabinet (solid lower doors, framed glass upper doors with glints, shelves of bottles) and
//             a small sink on a base cabinet with a mirror and a wall tap. A three-panel folding screen stands free in
//             the front corner by the window wall.
// Proportions (real size, base unit the storey H = 2.7 m, meta.height, the wall top): interior 6.0 (x) by 4.8 (z);
//   window sill 0.85, head 2.15; beds 0.90 x 1.95, sheet top 0.56, head end 0.95, foot end 0.75; track 2.4; desk
//   0.70 (1.1 x 0.7); medicine cabinet 1.8 x 0.9 x 0.4; sink counter 0.86; stadiometer 2.05; scale dial 1.05; screen 1.6.
// Options: build(THREE, kit, colors, { height = 2.7, curtains = 0.5 }).
//   height    scales the whole room uniformly so the wall top is `height`.
//   curtains  0..1, how far the bed curtains are drawn: bed A's foot curtain is drawn `curtains` of its rail (0.5: half
//             closed, the default); bed B's L curtain (side rail, then foot) is drawn 2 * curtains - 1, so it stays
//             bunched against the wall until curtains passes 0.5 and closes at 1. 0 leaves both bunched open.
// Clip (build() returns clips { breeze: 4 }; pose("breeze@1.3")): the window sheer billows into the room and the bed
//   curtains sway on their rails, all harmonics of 4 s so it loops. Signs: the sheer pivots on its rail (axis z), +rz
//   swings its hem into the room (+X); a foot-rail curtain (axis x) +rx swings its hem to -Z; a side-rail curtain (axis
//   z) +rz swings its hem to +X. Rest is all zero.
// Budget: ~5.0k triangles (5.3k with the curtains fully drawn), 17-18 meshes (13 material groups + one per curtain run).
// Ink in pixels: walls, beds, furniture 3; rods, curtains, small props 2 (a room is seen small).
// Colours (meadow), base / shade:
//   walls, cabinet and desk carcass  moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//   floor, wood (stadiometer, desk top, sill)  skin #f0c2ae flat / moon seams; wood skin / practical #f2c94c
//   steel (bed pipes, sashes, track, chair, scale, sink)  sclera #f6f3ee / sky #d7ecef
//   sheets, pillows, eye chart, posters  sclera #f6f3ee / sky #d7ecef
//   bed curtains and sheer  sky #d7ecef / sclera #f6f3ee (sheer sclera / sky), folds at threshold 0.45
//   blankets, chair seat, screen fabric, folders  line #a9d16e / iris #3f8a47
//   glass  sky one tone; lines, caps, casters, eye-chart rings, ticks, clock  hair #2c5131 flat
//   first-aid box, red bottles  accent #d9483b; yellow bottles, poster  practical #f2c94c

export const meta = {
  name: "nurse-office",
  height: 2.7,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    floor: "#f0c2ae", seam: "#f7f3e1",
    wood: "#f0c2ae", woodShade: "#f2c94c",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    sheet: "#f6f3ee", sheetShade: "#d7ecef",
    curtain: "#d7ecef", curtainShade: "#f6f3ee",
    sheer: "#f6f3ee", sheerShade: "#d7ecef",
    green: "#a9d16e", greenShade: "#3f8a47",
    glass: "#d7ecef",
    dark: "#2c5131",
    red: "#d9483b", yellow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.7;
  const { height = NATURAL } = opts;
  const draw = Math.max(0, Math.min(1, opts.curtains ?? 0.5));
  const root = new THREE.Group();
  root.name = "nurse-office";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [] });
  let M = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const put = (s, q, nq) => {
    v3.set(...q).applyMatrix4(M);
    s.p.push(v3.x, v3.y, v3.z);
    v3.set(...nq).transformDirection(M);
    s.n.push(v3.x, v3.y, v3.z);
  };
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // a flat quad facing `n` (unit axis), centred on a point
  function plate(key, ctr, n, w, h) {
    const up = Math.abs(n[1]) > 0.5 ? [0, 0, 1] : [0, 1, 0];
    const r = nrm(cross(up, n)), u = cross(n, r);
    const P = (a, b) => add(ctr, add(mul(r, (a * w) / 2), mul(u, (b * h) / 2)));
    quad(key, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), sub(ctr, n));
  }
  const pane = (ctr, n, w, h) => {
    plate("glass", add(ctr, mul(n, 0.001)), n, w, h);
    plate("glass", sub(ctr, mul(n, 0.001)), mul(n, -1), w, h);
  };
  // capped rod from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 4) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2 + Math.PI / sides, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const A = ring(a), B = ring(b), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
      tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
    }
    for (const [R, s] of [[A, -1], [B, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid, mul(T, s), mul(T, s), mul(T, s));
  }
  // a loft of convex sections along z: sec(t) -> [[x, y], ...] (one convex ring), z(t); capped. Smooth normals from
  // each section's centre, so a pillow or a blanket reads soft.
  function loftZ(key, n, sec, zAt) {
    const R = Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, pts = sec(t), z = zAt(t);
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return { C: [cx, cy, z], ring: pts.map(([x, y]) => ({ q: [x, y, z], n: nrm([x - cx, y - cy, 0]) })) };
    });
    const m = R[0].ring.length;
    for (let i = 0; i < n; i++) {
      const A = R[i], B = R[i + 1], ref = mul(add(A.C, B.C), 0.5);
      for (let j = 0; j < m; j++) {
        const k = (j + 1) % m;
        tri(key, A.ring[j].q, A.ring[k].q, B.ring[k].q, ref, A.ring[j].n, A.ring[k].n, B.ring[k].n);
        tri(key, A.ring[j].q, B.ring[k].q, B.ring[j].q, ref, A.ring[j].n, B.ring[k].n, B.ring[j].n);
      }
    }
    for (const [E, F] of [[R[0], R[1]], [R[n], R[n - 1]]])
      for (let j = 1; j < m - 1; j++) tri(key, E.ring[0].q, E.ring[j].q, E.ring[j + 1].q, F.C);
  }
  // a rounded rectangle section (half widths a, b, corner radius r, k points per corner), centred on (cx, cy)
  const rrect = (cx, cy, a, b, r, k = 2) => {
    const out = [];
    for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]])
      for (let i = 0; i <= k; i++) {
        const t = ((a0 + (90 * i) / k) * Math.PI) / 180;
        out.push([cx + sx * (a - r) + Math.cos(t) * r, cy + sy * (b - r) + Math.sin(t) * r]);
      }
    return out;
  };
  // an annulus in a plane facing +Z (or +X with onX), with a gap (Landolt C) or full, as quads
  function ring(key, ctr, r0, r1, { n = 12, gap = 0, gapAt = 0, axis = "z" } = {}) {
    const P = (r, t) => (axis === "z" ? add(ctr, [Math.cos(t) * r, Math.sin(t) * r, 0]) : add(ctr, [0, Math.sin(t) * r, -Math.cos(t) * r]));
    const nn = axis === "z" ? [0, 0, 1] : [1, 0, 0];
    for (let j = 0; j < n; j++) {
      const t0 = gapAt + gap / 2 + ((Math.PI * 2 - gap) * j) / n, t1 = gapAt + gap / 2 + ((Math.PI * 2 - gap) * (j + 1)) / n;
      quad(key, P(r0, t0), P(r1, t0), P(r1, t1), P(r0, t1), sub(ctr, nn));
    }
  }
  const disc = (key, ctr, r, n = 12, axis = "z") => {
    const nn = axis === "z" ? [0, 0, 1] : [1, 0, 0];
    for (let j = 0; j < n; j++) {
      const t0 = (j / n) * Math.PI * 2, t1 = ((j + 1) / n) * Math.PI * 2;
      const P = (t) => (axis === "z" ? add(ctr, [Math.cos(t) * r, Math.sin(t) * r, 0]) : add(ctr, [0, Math.sin(t) * r, Math.cos(t) * r]));
      tri(key, ctr, P(t0), P(t1), sub(ctr, nn));
    }
  };
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 3.0, L = 2.4, H = 2.7, T = 0.12, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 16; i++) { // board seams across the room
    const z = -L + (i * 2 * L) / 16;
    quad("seam", [-W, 0.0015, z - 0.006], [W, 0.0015, z - 0.006], [W, 0.0015, z + 0.006], [-W, 0.0015, z + 0.006], [0, -1, z]);
  }
  const SILL = 0.85, HEAD = 2.15, WZ0 = -2.05, WZ1 = -0.35;
  const wx0 = -W - T, wx1 = -W;
  box("wall", wx0, wx1, 0, SILL, -L - T, L);
  box("wall", wx0, wx1, HEAD, H - CAP, -L - T, L);
  box("cap", wx0, wx1, H - CAP, H, -L - T, L);
  box("wall", wx0, wx1, SILL, HEAD, -L - T, WZ0);
  box("wall", wx0, wx1, SILL, HEAD, WZ1, L);
  box("wall", -W, W, 0, H - CAP, -L - T, -L);
  box("cap", -W, W, H - CAP, H, -L - T, -L);
  // cut ends of the walls at the open sides
  box("cap", wx0, wx1, 0, H, L - 0.002, L);
  box("cap", W - 0.002, W, 0, H, -L - T, -L);
  // skirting
  box("dark", -W, -W + 0.012, 0, 0.08, -L, L);
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);

  // ---------- window (-X) ----------
  {
    const FR = 0.035, xm = (wx0 + wx1) / 2, zc = (WZ0 + WZ1) / 2;
    const fx0 = wx0 - 0.005, fx1 = wx1 + 0.012;
    box("steel", fx0, fx1, SILL, SILL + FR, WZ0, WZ1);
    box("steel", fx0, fx1, HEAD - FR, HEAD, WZ0, WZ1);
    box("steel", fx0, fx1, SILL, HEAD, WZ0, WZ0 + FR);
    box("steel", fx0, fx1, SILL, HEAD, WZ1 - FR, WZ1);
    // outer sash (closed, the +z half) and the room-side sash slid 0.4 m over it, leaving the -z end open
    const OPEN = 0.4;
    for (const [dx, z0, z1] of [[-0.03, zc - 0.03, WZ1 - FR], [0.03, WZ0 + FR + OPEN, zc + 0.03 + OPEN]]) {
      const x0 = xm + dx - 0.014, x1 = xm + dx + 0.014, y0 = SILL + FR, y1 = HEAD - FR;
      box("steel", x0, x1, y0, y0 + 0.05, z0, z1);
      box("steel", x0, x1, y1 - 0.045, y1, z0, z1);
      box("steel", x0, x1, y0, y1, z0, z0 + 0.04);
      box("steel", x0, x1, y0, y1, z1 - 0.04, z1);
      pane([xm + dx, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], z1 - z0 - 0.07, y1 - y0 - 0.09);
    }
    box("wood", wx1, wx1 + 0.14, SILL - 0.03, SILL, WZ0 - 0.05, WZ1 + 0.05); // sill board
    // sheer rail on two wall brackets
    const RY = HEAD + 0.1;
    box("steel", wx1 + 0.1, wx1 + 0.125, RY, RY + 0.025, WZ0 - 0.2, WZ1 + 0.2);
    for (const z of [WZ0 - 0.15, WZ1 + 0.15]) box("steel", wx1, wx1 + 0.125, RY + 0.005, RY + 0.02, z - 0.012, z + 0.012);
  }

  // ---------- curtains: pleated slabs, each straight run its own mesh on a pivot at its rail ----------
  const curtainKeys = [];
  // a run from a to b (points on the floor plan, y0..y1), `faces` fold faces, fold depth `depth`, slab thickness t
  function pleat(key, a, b, y0, y1, faces, depth, t = 0.008) {
    const d = nrm(sub(b, a)), side = [d[2], 0, -d[0]]; // horizontal normal of the run
    const cols = [];
    for (let i = 0; i <= faces; i++) {
      const P = add(a, mul(sub(b, a), i / faces)), o = mul(side, (i % 2 ? 0.5 : -0.5) * depth);
      const f = add(P, o), k = add(f, mul(side, -t));
      cols.push([[f[0], y0, f[2]], [f[0], y1, f[2]], [k[0], y1, k[2]], [k[0], y0, k[2]]]);
    }
    const mid = (A, B) => mul(add(add(A[0], A[2]), add(B[0], B[2])), 0.25);
    for (let i = 0; i < faces; i++)
      for (let k = 0; k < 4; k++) quad(key, cols[i][k], cols[i][(k + 1) % 4], cols[i + 1][(k + 1) % 4], cols[i + 1][k], mid(cols[i], cols[i + 1]));
    for (const [A, B] of [[cols[0], cols[1]], [cols[faces], cols[faces - 1]]]) quad(key, A[0], A[1], A[2], A[3], mid(A, B));
  }
  // a curtain along a polyline path (plan points at the rail), drawn over the first `cover` metres of it, fabric
  // 1.3 x the path length; one mesh per straight run, keyed name0, name1 ...
  function curtain(name, path, cover, y0, y1, mat) {
    const lens = path.slice(1).map((p, i) => Math.hypot(...sub(p, path[i])));
    const total = lens.reduce((s, l) => s + l, 0), cov = Math.max(0.3, Math.min(total, cover));
    const nAll = 2 * Math.max(2, Math.round(cov / 0.24)), fabric = Math.max(cov * 1.3, 0.75);
    const step = cov / nAll, f = fabric / nAll;
    const depth = Math.min(0.07, Math.sqrt(Math.max(f * f - step * step, 0.0004)));
    let left = cov;
    lens.forEach((len, i) => {
      if (left <= 1e-4) return;
      const run = Math.min(len, left);
      left -= run;
      const faces = Math.max(2, 2 * Math.round(nAll * run / cov / 2));
      const a = path[i], b = add(a, mul(nrm(sub(path[i + 1], a)), run));
      const key = `${name}${i}`;
      pleat(key, a, b, y0, y1, faces, depth);
      curtainKeys.push({ key, mat, pivot: [a[0], y1, a[2]], axis: Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]) ? "x" : "z" });
    });
  }
  // sheer at the window: one panel over the open end, one bunched at the far end
  {
    const x = wx1 + 0.08, y0 = SILL + 0.06, y1 = HEAD + 0.1;
    curtain("sheerA", [[x, 0, WZ0 - 0.12], [x, 0, WZ1 + 0.1]], 0.85, y0, y1, "sheer");
    curtain("sheerB", [[x, 0, WZ1 + 0.12], [x, 0, WZ0 - 0.1]], 0.3, y0, y1, "sheer");
  }

  // ---------- privacy-curtain track ----------
  const TY = 2.4, TH = 0.03, TW = 0.0175, FZ = -0.15, DX = -1.65, SX = -0.3;
  box("steel", -W, SX + TW, TY, TY + TH, FZ - TW, FZ + TW); // foot rail, from the window wall
  box("steel", SX - TW, SX + TW, TY, TY + TH, -L, FZ + TW); // side rail, back to the -Z wall
  box("steel", DX - TW, DX + TW, TY, TY + TH, -L, FZ - TW); // divider between the beds
  box("steel", -W, -W + 0.012, TY - 0.03, TY + TH + 0.03, FZ - 0.04, FZ + 0.04); // wall plates
  for (const x of [SX, DX]) box("steel", x - 0.04, x + 0.04, TY - 0.03, TY + TH + 0.03, -L, -L + 0.012);
  const CY0 = 0.32, CY1 = TY + 0.01;
  curtain("bedA", [[DX - 0.03, 0, FZ], [-W + 0.03, 0, FZ]], draw * (DX - -W), CY0, CY1, "curtain");
  curtain("bedB", [[SX, 0, -L + 0.03], [SX, 0, FZ], [DX + 0.03, 0, FZ]], Math.max(0, 2 * draw - 1) * ((FZ + L) + (SX - DX)), CY0, CY1, "curtain");

  // ---------- beds (local: head at z = 0, foot toward +z, centred on x = 0) ----------
  const BL = 1.95, BW = 0.45, PR = 0.02;
  function bed(blanketUp) {
    const zh = 0.03, zf = zh + BL, RY = 0.36;
    for (const [x, z, top] of [[-BW, zh, 0.95], [BW, zh, 0.95], [-BW, zf, 0.75], [BW, zf, 0.75]]) {
      rod("steel", [x, 0.06, z], [x, top, z], PR, 6);
      box("dark", x - 0.025, x + 0.025, 0, 0.06, z - 0.03, z + 0.03); // caster
    }
    for (const s of [-1, 1]) rod("steel", [s * BW, RY, zh], [s * BW, RY, zf], 0.016);
    for (const [z, top, mid, bars] of [[zh, 0.95, 0.62, 5], [zf, 0.75, 0.56, 3]]) {
      rod("steel", [-BW, top, z], [BW, top, z], PR, 6);
      rod("steel", [-BW, mid, z], [BW, mid, z], 0.014);
      rod("steel", [-BW, RY, z], [BW, RY, z], 0.016);
      for (let k = 1; k <= bars; k++) {
        const x = -BW + (2 * BW * k) / (bars + 1);
        rod("steel", [x, mid, z], [x, top, z], 0.01);
      }
    }
    // mattress under a white sheet, its corners a little rounded
    loftZ("sheet", 1, () => rrect(0, 0.465, 0.435, 0.095, 0.03), (t) => zh + 0.04 + t * (BL - 0.08));
    // pillow: a soft section, fuller in the middle
    loftZ("sheet", 6, (t) => {
      const s = Math.sin(t * Math.PI) ** 0.5;
      return rrect(0, 0.56 + 0.05 * s, 0.24 + 0.06 * s, 0.015 + 0.05 * s, 0.012 + 0.04 * s, 2);
    }, (t) => zh + 0.08 + t * 0.36);
    if (blanketUp) {
      // blanket pulled up to the pillow, a soft lump down the middle; the sheet turned back over its top edge
      const z0 = zh + 0.48, z1 = zf - 0.02;
      loftZ("green", 10, (t) => {
        const b = 0.06 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.7;
        return [[-0.46, 0.4], [0.46, 0.4], [0.465, 0.56], [0.36, 0.585], [0.12, 0.59 + b], [-0.12, 0.59 + b], [-0.36, 0.585], [-0.465, 0.56]];
      }, (t) => z0 + t * (z1 - z0));
      loftZ("sheet", 1, () => [[-0.47, 0.5], [0.47, 0.5], [0.47, 0.57], [0.35, 0.6], [-0.35, 0.6], [-0.47, 0.57]], (t) => z0 - 0.02 + t * 0.14);
    } else {
      loftZ("green", 1, () => rrect(0, 0.585, 0.4, 0.03, 0.015, 1), (t) => zf - 0.5 + t * 0.42); // folded at the foot
      loftZ("green", 1, () => rrect(0, 0.635, 0.39, 0.022, 0.012, 1), (t) => zf - 0.48 + t * 0.38);
    }
  }
  const BZ = -L + 0.02;
  place(-2.3, BZ, 0, () => bed(true));
  place(-0.98, BZ, 0, () => bed(false));

  // ---------- -Z wall: eye chart, stadiometer, scale, desk, notice board, clock ----------
  const wz = -L;
  { // Landolt-C eye chart: a white board, rows of broken rings shrinking downward, gaps turned by a hash
    const cx = 0.3, y0 = 1.0, y1 = 1.95, hw = 0.24;
    box("steel", cx - hw - 0.02, cx + hw + 0.02, y0 - 0.02, y1 + 0.02, wz, wz + 0.015);
    box("sheet", cx - hw, cx + hw, y0, y1, wz, wz + 0.02);
    const rows = [[1, 0.06], [2, 0.042], [3, 0.03], [4, 0.022], [5, 0.017], [6, 0.013], [6, 0.01]];
    let y = y1 - 0.11;
    rows.forEach(([nr, r], ri) => {
      for (let k = 0; k < nr; k++) {
        const x = cx + (nr === 1 ? 0 : -hw * 0.75 + (k * 1.5 * hw) / (nr - 1));
        ring("dark", [x, y, wz + 0.021], r * 0.6, r, { n: 10, gap: 0.9, gapAt: Math.floor(hash(ri * 9 + k) * 4) * (Math.PI / 2) });
      }
      y -= r * 2.2 + 0.035;
    });
  }
  { // stadiometer: a wooden base board, a graduated post, a sliding head bar
    const x0 = 0.68, x1 = 1.12, xm = (x0 + x1) / 2;
    box("wood", x0, x1, 0, 0.05, wz, wz + 0.42);
    box("wood", xm - 0.04, xm + 0.04, 0.05, 2.05, wz + 0.01, wz + 0.07);
    for (let k = 0; k < 18; k++) {
      const y = 0.3 + k * 0.1;
      box("dark", xm - 0.035, xm + (k % 5 === 0 ? 0.035 : 0.005), y, y + 0.006, wz + 0.07, wz + 0.073);
    }
    const hy = 1.58;
    box("wood", xm - 0.055, xm + 0.055, hy - 0.04, hy + 0.04, wz + 0.005, wz + 0.09); // slider
    box("wood", xm - 0.05, xm + 0.05, hy - 0.015, hy + 0.01, wz + 0.09, wz + 0.36); // head bar
  }
  { // dial scale: platform, column, round dial facing the room
    const x = 1.45, z = wz + 0.35;
    box("steel", x - 0.17, x + 0.17, 0, 0.07, z - 0.2, z + 0.2);
    box("dark", x - 0.14, x + 0.14, 0.07, 0.075, z - 0.12, z + 0.17); // rubber mat
    box("steel", x - 0.03, x + 0.03, 0.07, 0.95, z - 0.2, z - 0.15);
    const dc = [x, 1.07, z - 0.13];
    loftZ("steel", 1, () => Array.from({ length: 12 }, (_, j) => [x + Math.cos((j / 12) * Math.PI * 2) * 0.14, 1.07 + Math.sin((j / 12) * Math.PI * 2) * 0.14]), (t) => z - 0.22 + t * 0.08);
    disc("sheet", [dc[0], dc[1], z - 0.139], 0.115, 12);
    ring("dark", [dc[0], dc[1], z - 0.138], 0.1, 0.112, { n: 12 });
    quad("dark", [x - 0.004, 1.07, z - 0.137], [x + 0.004, 1.07, z - 0.137], [x + 0.05, 1.14, z - 0.137], [x + 0.045, 1.145, z - 0.137], [x, 1.07, z - 0.3]);
  }
  { // nurse's desk: steel carcass, warm top, drawer pedestal on the right, kneehole on the left
    const x0 = 1.78, x1 = 2.88, z0 = wz, z1 = wz + 0.7, ty = 0.7;
    box("wood", x0, x1, ty, ty + 0.03, z0, z1 + 0.01);
    box("wall", x1 - 0.42, x1 - 0.02, 0.03, ty, z0 + 0.02, z1 - 0.02); // pedestal
    box("wall", x0 + 0.02, x0 + 0.05, 0.03, ty, z0 + 0.02, z1 - 0.02); // left side panel
    box("wall", x0 + 0.05, x1 - 0.42, ty - 0.12, ty, z0 + 0.02, z1 - 0.04); // centre drawer
    box("wall", x0 + 0.05, x1 - 0.42, 0.2, ty - 0.12, z0 + 0.02, z0 + 0.04); // modesty panel at the wall
    box("dark", x0 + 0.02, x1 - 0.02, 0, 0.03, z0 + 0.04, z1 - 0.04); // plinth
    for (const [ya, yb] of [[0.03, 0.27], [0.27, 0.48], [0.48, ty]]) {
      box("dark", x1 - 0.42, x1 - 0.02, yb - 0.008, yb, z1 - 0.02, z1 - 0.015);
      box("dark", x1 - 0.28, x1 - 0.16, (ya + yb) / 2 - 0.01, (ya + yb) / 2 + 0.01, z1 - 0.02, z1 + 0.005);
    }
    box("dark", x0 + 0.25, x0 + 0.45, ty - 0.07, ty - 0.05, z1 - 0.04, z1 - 0.015);
    // on the desk: a row of folders against the wall, a pen cup, an open log book, a red first-aid box
    [["green", 0.05], ["red", 0.04], ["yellow", 0.045], ["green", 0.05], ["sheet", 0.04]].reduce((x, [k, w], i) => {
      box(k, x, x + w, ty + 0.03, ty + 0.3 - 0.02 * hash(i), z0 + 0.02, z0 + 0.26);
      return x + w + 0.004;
    }, x0 + 0.06);
    rod("steel", [x0 + 0.42, ty + 0.03, z0 + 0.12], [x0 + 0.42, ty + 0.13, z0 + 0.12], 0.035, 8);
    for (const [dx, dz, k] of [[0.01, 0.005, "red"], [-0.012, 0.01, "dark"], [0.004, -0.014, "green"]])
      rod(k, [x0 + 0.42 + dx, ty + 0.12, z0 + 0.12 + dz], [x0 + 0.42 + dx * 2, ty + 0.2, z0 + 0.12 + dz * 2], 0.005);
    box("sheet", x0 + 0.42, x0 + 0.72, ty + 0.03, ty + 0.045, z0 + 0.32, z0 + 0.55);
    box("sheet", x0 + 0.72, x0 + 1.0, ty + 0.03, ty + 0.045, z0 + 0.31, z0 + 0.54);
    box("dark", x0 + 0.715, x0 + 0.725, ty + 0.045, ty + 0.047, z0 + 0.32, z0 + 0.54);
    box("red", x1 - 0.33, x1 - 0.05, ty + 0.03, ty + 0.18, z0 + 0.04, z0 + 0.24);
    box("dark", x1 - 0.23, x1 - 0.15, ty + 0.18, ty + 0.2, z0 + 0.13, z0 + 0.15);
    // notice board with health posters, and the clock
    box("steel", x0 + 0.05, x1 - 0.05, 1.15, 1.95, wz, wz + 0.015);
    box("green", x0 + 0.07, x1 - 0.07, 1.17, 1.93, wz, wz + 0.02);
    [[0.22, 1.6, 0.24, 0.32, "sheet"], [0.52, 1.66, 0.22, 0.3, "yellow"], [0.8, 1.55, 0.22, 0.3, "sheet"], [0.4, 1.32, 0.3, 0.16, "sheet"]].forEach(([dx, y, w, h, k]) => {
      plate(k, [x0 + dx, y, wz + 0.022], [0, 0, 1], w, h);
    });
    for (const [dx, y] of [[0.22, 1.66], [0.22, 1.6], [0.8, 1.6], [0.8, 1.52]]) plate("dark", [x0 + dx, y, wz + 0.023], [0, 0, 1], 0.16, 0.012);
    plate("red", [x0 + 0.22, 1.71, wz + 0.023], [0, 0, 1], 0.12, 0.04);
    const ccx = (x0 + x1) / 2, ccy = 2.25;
    loftZ("dark", 1, () => Array.from({ length: 14 }, (_, j) => [ccx + Math.cos((j / 14) * Math.PI * 2) * 0.15, ccy + Math.sin((j / 14) * Math.PI * 2) * 0.15]), (t) => wz + t * 0.04);
    disc("sheet", [ccx, ccy, wz + 0.041], 0.125, 14);
    const hand = (ang, len, w) => {
      const d = [Math.sin(ang), Math.cos(ang), 0], p = [Math.cos(ang), -Math.sin(ang), 0], z = wz + 0.043;
      const a = add([ccx, ccy, z], mul(d, -0.015)), b = add([ccx, ccy, z], mul(d, len));
      quad("dark", add(a, mul(p, w)), add(b, mul(p, w * 0.5)), add(b, mul(p, -w * 0.5)), add(a, mul(p, -w)), [ccx, ccy, wz]);
    };
    hand(((2 + 10 / 60) / 12) * Math.PI * 2, 0.07, 0.01);
    hand((10 / 60) * Math.PI * 2, 0.105, 0.007);
  }
  // swivel chair at the desk, turned a little toward the room
  place(2.25, wz + 1.05, 0.35, () => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2, e = [Math.sin(a) * 0.27, 0.05, Math.cos(a) * 0.27];
      rod("steel", [0, 0.07, 0], e, 0.013);
      box("dark", e[0] - 0.022, e[0] + 0.022, 0, 0.04, e[2] - 0.022, e[2] + 0.022);
    }
    rod("dark", [0, 0.07, 0], [0, 0.42, 0], 0.025, 6);
    loftZ("green", 1, () => rrect(0, 0.45, 0.23, 0.04, 0.03), (t) => -0.22 + t * 0.44);
    rod("steel", [0, 0.44, 0.2], [0, 0.74, 0.26], 0.015); // back post, into the backrest
    loftZ("green", 1, () => rrect(0, 0.8, 0.21, 0.15, 0.05), (t) => 0.24 + t * 0.06);
  });

  // ---------- -X wall: medicine cabinet, sink ----------
  { // glass medicine cabinet: solid lower doors, framed glass upper doors, shelves of bottles
    const x0 = -W, x1 = -W + 0.4, z0 = 0.9, z1 = 1.8, LO = 0.85, TOP = 1.8, fx = x1;
    box("wall", x0, x1, 0, LO, z0, z1);
    box("dark", x1, x1 + 0.004, 0.06, LO - 0.02, (z0 + z1) / 2 - 0.004, (z0 + z1) / 2 + 0.004);
    box("dark", x0 + 0.02, x1 + 0.002, 0, 0.05, z0 + 0.02, z1 - 0.02);
    for (const z of [(z0 + z1) / 2 - 0.06, (z0 + z1) / 2 + 0.04]) box("dark", x1, x1 + 0.015, LO - 0.2, LO - 0.1, z, z + 0.02);
    box("wall", x0, x1, TOP - 0.04, TOP, z0, z1); // top
    box("wall", x0, x1, LO, TOP, z0, z0 + 0.025); // sides
    box("wall", x0, x1, LO, TOP, z1 - 0.025, z1);
    box("glass", x0, x0 + 0.015, LO, TOP, z0, z1); // back panel
    const shelves = [LO, 1.17, 1.48];
    for (const y of shelves.slice(1)) box("sheet", x0, x1 - 0.03, y - 0.012, y, z0, z1);
    // bottles: a fixed hash picks height, width and colour
    shelves.forEach((y, si) => {
      let z = z0 + 0.05;
      for (let k = 0; z < z1 - 0.1; k++) {
        const h = hash(si * 17 + k), w = 0.025 + 0.02 * hash(k + si * 5), bh = 0.1 + 0.12 * h;
        const kk = ["sheet", "red", "yellow", "glass", "green", "sheet"][Math.floor(hash(k * 3 + si) * 6)];
        const x = x0 + 0.13 + 0.12 * hash(k + 40);
        if (h > 0.8) box(kk, x - 0.05, x + 0.05, y, y + 0.08, z, z + 0.1); // a pill box
        else {
          rod(kk === "glass" ? "steel" : kk, [x, y + 0.005, z + w], [x, y + bh, z + w], w, 6);
          rod("dark", [x, y + bh, z + w], [x, y + bh + 0.025, z + w], w * 0.6, 6);
        }
        z += 2 * w + 0.03 + (h > 0.8 ? 0.05 : 0);
      }
    });
    // glass doors: frames and two glints each
    const zm = (z0 + z1) / 2;
    for (const [a, b] of [[z0, zm], [zm, z1]]) {
      box("steel", fx - 0.02, fx, LO, LO + 0.04, a, b);
      box("steel", fx - 0.02, fx, TOP - 0.08, TOP - 0.04, a, b);
      box("steel", fx - 0.02, fx, LO, TOP - 0.04, a, a + 0.035);
      box("steel", fx - 0.02, fx, LO, TOP - 0.04, b - 0.035, b);
      const g = (za, ya, zb, yb, w) => quad("glint", [fx - 0.01, ya, za], [fx - 0.01, ya, za + w], [fx - 0.01, yb, zb + w], [fx - 0.01, yb, zb], [fx - 0.5, (ya + yb) / 2, za]);
      g(a + 0.035, TOP - 0.3, a + 0.2, TOP - 0.08, 0.03);
      g(a + 0.035, TOP - 0.42, a + 0.29, TOP - 0.08, 0.012);
    }
    box("dark", fx, fx + 0.015, LO + 0.35, LO + 0.45, zm - 0.03, zm - 0.012);
    box("dark", fx, fx + 0.015, LO + 0.35, LO + 0.45, zm + 0.012, zm + 0.03);
  }
  { // sink: base cabinet, counter with a basin, wall tap, mirror above
    const x0 = -W, x1 = -W + 0.5, z0 = 0.08, z1 = 0.63, CT = 0.86;
    box("wall", x0, x1 - 0.02, 0, CT - 0.04, z0 + 0.02, z1 - 0.02);
    box("dark", x1 - 0.02, x1 - 0.015, 0.08, CT - 0.08, (z0 + z1) / 2 - 0.003, (z0 + z1) / 2 + 0.003);
    box("steel", x0, x1, CT - 0.04, CT, z0, z1);
    box("glass", x0 + 0.1, x1 - 0.06, CT, CT + 0.002, z0 + 0.07, z1 - 0.07);
    box("dark", x0 + 0.22, x0 + 0.26, CT + 0.002, CT + 0.004, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02);
    const zm = (z0 + z1) / 2;
    rod("steel", [x0, CT + 0.2, zm], [x0 + 0.2, CT + 0.2, zm], 0.012, 6);
    rod("steel", [x0 + 0.2, CT + 0.2, zm], [x0 + 0.2, CT + 0.14, zm], 0.012, 6);
    box("steel", x0 + 0.03, x0 + 0.07, CT + 0.18, CT + 0.24, zm - 0.03, zm + 0.03);
    box("steel", x0, x0 + 0.02, 1.15, 1.65, z0 + 0.04, z1 - 0.04);
    box("glass", x0 + 0.02, x0 + 0.024, 1.18, 1.62, z0 + 0.07, z1 - 0.07);
    quad("glint", [x0 + 0.026, 1.35, z0 + 0.1], [x0 + 0.026, 1.39, z0 + 0.1], [x0 + 0.026, 1.58, z0 + 0.26], [x0 + 0.026, 1.54, z0 + 0.26], [x0, 1.4, z0 + 0.2]);
    // a towel on a ring beside the mirror
    rod("steel", [x0, 1.25, z1 + 0.08], [x0 + 0.06, 1.25, z1 + 0.08], 0.008);
    box("green", x0 + 0.05, x0 + 0.07, 0.85, 1.26, z1 + 0.0, z1 + 0.16);
  }

  // ---------- folding screen, front-left corner: three hinged panels on feet ----------
  {
    const pts = [[-2.9, 1.98], [-2.5, 2.28], [-2.1, 1.98], [-1.7, 2.28]];
    for (let i = 0; i < 3; i++) {
      const A = [pts[i][0], 0, pts[i][1]], B = [pts[i + 1][0], 0, pts[i + 1][1]];
      const d = nrm(sub(B, A)), Ai = add(A, mul(d, 0.02)), Bi = sub(B, mul(d, 0.02));
      const at = (P, y) => [P[0], y, P[2]];
      for (const P of [Ai, Bi]) {
        rod("steel", at(P, 0.03), at(P, 1.6), 0.013, 6);
        box("dark", P[0] - 0.03, P[0] + 0.03, 0, 0.03, P[2] - 0.03, P[2] + 0.03);
      }
      rod("steel", at(Ai, 1.6), at(Bi, 1.6), 0.013, 6);
      rod("steel", at(Ai, 0.22), at(Bi, 0.22), 0.011, 6);
      // fabric: a thin slab between the posts
      const side = mul([d[2], 0, -d[0]], 0.005);
      const F = (P, y, s) => add(at(P, y), mul(side, s));
      const ctr = mul(add(Ai, Bi), 0.5);
      const ref = at(ctr, 0.95);
      const corners = [[Ai, 0.24], [Bi, 0.24], [Bi, 1.57], [Ai, 1.57]];
      const fr = corners.map(([P, y]) => F(P, y, 1)), bk = corners.map(([P, y]) => F(P, y, -1));
      quad("screen", fr[0], fr[1], fr[2], fr[3], ref);
      quad("screen", bk[0], bk[1], bk[2], bk[3], ref);
      for (let k = 0; k < 4; k++) quad("screen", fr[k], fr[(k + 1) % 4], bk[(k + 1) % 4], bk[k], ref);
    }
  }

  // ---------- meshes: one per material signature; curtains one per pivot ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    cap: [c.dark, c.dark, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    wood: [c.wood, c.woodShade, 0.1, 3],
    steel: [c.steel, c.steelShade, 0.1, 2],
    sheet: [c.sheet, c.sheetShade, 0.1, 3],
    green: [c.green, c.greenShade, 0.1, 2],
    screen: [c.green, c.greenShade, 0.1, 2],
    glass: [c.glass, c.glass, 0.1, 0],
    glint: [c.sheet, c.sheet, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
    red: [c.red, c.red, 0.1, 2],
    yellow: [c.yellow, c.yellow, 0.1, 2],
    curtain: [c.curtain, c.curtainShade, 0.45, 2],
    sheer: [c.sheer, c.sheerShade, 0.45, 2],
  };
  const toMesh = (key, m, p, n) => {
    const [base, shade, threshold, px] = m;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    return mesh;
  };
  const curtainSet = new Set(curtainKeys.map((k) => k.key));
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    if (curtainSet.has(key)) continue;
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) body.add(toMesh(key, m, p, n));
  const sway = [];
  for (const { key, mat, pivot, axis } of curtainKeys) {
    const j = new THREE.Group();
    j.name = key;
    j.position.set(...pivot);
    const { p, n } = soups[key];
    const mesh = toMesh(key + "Cloth", MAT[mat], p, n);
    mesh.position.set(-pivot[0], -pivot[1], -pivot[2]);
    j.add(mesh);
    body.add(j);
    joints[key] = j;
    sway.push({ j, key, axis, len: Math.hypot(...p.slice(0, 3).map((v, i) => v - pivot[i])) });
  }

  // ---------- rest and the breeze clip ----------
  const CLIPS = { breeze: 4 };
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  // per curtain: [mean, amplitude 1, amplitude 2 (deg), phase (cycles)]; harmonics 1 and 2 of the clip length
  const BREEZE = {
    sheerA0: [9.5, 6, 2.5, 0], sheerB0: [2.8, 1.6, 0.6, 0.1],
    bedA0: [0, 2.2, 0.8, 0.25],
    bedB0: [0.8, 1.4, 0.5, 0.35], bedB1: [0, 1.6, 0.6, 0.45],
  };
  function pose(name) {
    for (const s of sway) s.j.rotation.set(0, 0, 0);
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`nurse-office: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const u = ((((+m[2]) / CLIPS[m[1]]) % 1) + 1) % 1;
      for (const s of sway) {
        const [mean, a1, a2, ph] = BREEZE[s.key] ?? [0, 0, 0, 0];
        const ang = (mean + a1 * Math.sin(TAU * (u + ph)) + a2 * Math.sin(2 * TAU * (u + ph) + 1.1)) * DEG;
        if (s.axis === "x") s.j.rotation.x = ang;
        else s.j.rotation.z = ang;
      }
    } else if (name !== "rest") throw new Error(`nurse-office: unknown pose "${name}" (rest, or breeze@<seconds>)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

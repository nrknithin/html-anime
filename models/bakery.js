// bakery.js - a cosy neighbourhood bakery (pan-ya) interior from anime, built as a cutaway set: two walls and a floor.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in; the -X wall holds the shop window (a striped awning outside it), a bread bench under
// it and the self-serve tray and tong station by the door side; the -Z wall holds the tall bread shelves on the left
// and the brick oven with its big arched iron door on the right, behind the glass cake counter and the register.
// Stands on y = 0 (floor top 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, tapered polygon tubes, flat panels, fans and prisms, all triangle soups merged per
// material; every closed part is wound away from a point inside it, never by hand):
//   SHELL    a plank floor (sky boards, skin seams); -X and -Z walls with wood wainscot to a dark rail at 0.92 and
//            cream plaster above to a cornice; the window in the -X wall: frame, mullions, sill, glass with a sheen,
//            the awning's scalloped red-and-cream edge seen through the top of the glass; outside, the awning itself
//            (canopy, scalloped valance, two iron arms) is fixed to the wall.
//   BREAD    melon pan (domes with a scored grid), croissants (tapered crescent tubes), baguettes (long tapered
//            capsules standing in a tall basket), anpan (dark glossy buns with a pale seed dot), shokupan loaves
//            (box body, three-bump top, a cut face and leaning slices), country boules with crossed scores. Baskets
//            are dark wicker with a red cloth liner, trays are pale enamel.
//   DISPLAY  a five-board wall shelf unit (-Z, left); a two-tier centre table with baskets; a bench under the window.
//   SERVE    a self-serve table with a stack of trays and a tong pot (three tongs); a small blackboard menu above it
//            (squiggle lines and price dots, no lettering).
//   COUNTER  a glass cake case (corner posts, glass shelf, round cakes and slices with strawberries, sheen stripes)
//            and a wooden register section with the register and a tray of fresh buns that steams.
//   OVEN     a red brick surround in the back wall with skin mortar joints, a cream arch, a big arched iron door with
//            a glowing peep window and a brass bar handle, a firebox slot below; a bread peel leans on it.
//   LIGHTS   a dark rail along the room at 2.3 m, its end buried in the -X wall and held by two arms from the -Z wall;
//            four dome pendant lamps hang from it on cords.
// Proportions (real size, base unit the wall height 2.5): room 4.4 x 3.2, walls 0.1; shelves 1.6 wide, 0.42 deep,
//   boards at 0.12 / 0.55 / 1.0 / 1.45 / 1.9; centre table 1.0 x 0.8 at 0.72 with a 0.95 riser; counter top 1.0,
//   case 1.4 x 0.5; oven surround 1.7 x 2.15, door 0.8 x 0.8 at 1.05; window 0.95-2.0 over z -0.55..0.95;
//   lamps r 0.17 hanging to 1.84. Bread a touch oversized (anime): melon pan r 0.075, baguettes 0.62 long.
// Options: build(THREE, kit, colors, { height }): height scales the whole set so the wall top is `height` (default 2.5).
// Poses: rest. Clip: steam (3 s, loops): three puffs rise and swell over the fresh buns on the register counter,
//   one mesh whose vertices pose() rewrites (each puff a sphere translated and uniformly scaled, so normals and
//   hull normals stay valid). rest is steam@0.
// Colours (noon, the warm bread browns): wood and dark crust iris #5c3d32 (flat); iron, rail and lines hair #241c16
//   (flat); plaster moon #fff6e4 / sky #f2d7ae; floor sky / skin #f0c2ae with skin seams (also the mortar); brick
//   accent #c4452d / iris; bread sky / iris (golden tops, browned sides); red cloth, stripes and strawberries accent / iris; enamel, cream and
//   glass shelf moon / sclera #f6f3ee; window glass sky / skin; lamp shades, brass and cake sponge sky / skin; glow (bulbs, oven
//   window, sheen) practical #fffaf2; steam practical / sclera.
// Meshes: 13, one per material. 14.5k triangles (bread 5.8k).
// Joints: anchors floor, counter, register, oven, centreTable, serve, window.

export const meta = {
  name: "bakery",
  height: 2.5,
  script: "noon",
  colors: {
    wood: "#5c3d32",
    dark: "#241c16",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    floor: "#f2d7ae", floorShade: "#f0c2ae",
    line: "#f0c2ae",
    brick: "#c4452d", brickShade: "#5c3d32",
    bread: "#f2d7ae", breadShade: "#5c3d32",
    red: "#c4452d", redShade: "#5c3d32",
    enamel: "#fff6e4", enamelShade: "#f6f3ee",
    glass: "#f2d7ae", glassShade: "#f0c2ae",
    lamp: "#f2d7ae", lampShade: "#f0c2ae",
    glow: "#fffaf2",
    steam: "#fffaf2", steamShade: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "bakery";
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
  function tri(key, a, b, e, ref) {
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
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
  // a frustum: bottom rect at y0 inset i0, top rect at y1 inset i1
  const frust = (key, x0, x1, z0, z1, y0, y1, i0, i1) => hex(key, [[x0 + i0, y0, z0 + i0], [x1 - i0, y0, z0 + i0], [x1 - i0, y0, z1 - i0], [x0 + i0, y0, z1 - i0],
    [x0 + i1, y1, z0 + i1], [x1 - i1, y1, z0 + i1], [x1 - i1, y1, z1 - i1], [x0 + i1, y1, z1 - i1]]);
  // surface of revolution about (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre
  function lathe(key, prof, cx, cz, n = 12) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const P = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), ref);
  }
  const cyl = (key, cx, cz, r, y0, y1, n = 12) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // polygon tube along a polyline, radius r (a number or one per point, may taper to 0), closed at both ends
  function tube(key, pts, r, n = 6) {
    const R = (i) => (Array.isArray(r) ? r[i] : r);
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
      return Array.from({ length: n }, (_, j) => {
        const t = (j / n) * Math.PI * 2;
        return [0, 1, 2].map((k) => p[k] + R(i) * (Math.cos(t) * e1[k] + Math.sin(t) * e2[k]));
      });
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const ref = pts[i].map((v, k) => (v + pts[i + 1][k]) / 2);
      for (let j = 0; j < n; j++) quad(key, rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], ref);
    }
    const a = pts[0], b = pts[pts.length - 1], L = rings.length - 1;
    const ra = pts[1].map((v, k) => (v + a[k]) / 2), rb = pts[L - 1].map((v, k) => (v + b[k]) / 2);
    for (let j = 0; j < n; j++) {
      if (R(0) > 1e-6) tri(key, a, rings[0][j], rings[0][(j + 1) % n], ra);
      if (R(L) > 1e-6) tri(key, b, rings[L][j], rings[L][(j + 1) % n], rb);
    }
  }
  // flat shapes on a plane: W(u, v) -> world, back(u, v) a point behind the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X
  const flatY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] });
  const rect = (key, P, u0, u1, v0, v1) => quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  function fan(key, P, poly) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      tri(key, P.W(cu, cv), P.W(a[0], a[1]), P.W(b[0], b[1]), P.back(cu, cv));
    }
  }
  // a convex polygon on wallZ extruded from z0 to z1
  function prismZ(key, poly, z0, z1) {
    const cu = poly.reduce((s, p) => s + p[0], 0) / poly.length, cv = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const ref = [cu, cv, (z0 + z1) / 2];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      quad(key, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], ref);
      tri(key, [cu, cv, z1], [a[0], a[1], z1], [b[0], b[1], z1], ref);
      tri(key, [cu, cv, z0], [a[0], a[1], z0], [b[0], b[1], z0], ref);
    }
  }
  const arch = (u0, u1, v0, v1, n = 8) => { // rect u0..u1 from v0 up to the arch spring v1, half-round top
    const cu = (u0 + u1) / 2, r = (u1 - u0) / 2, p = [[u0, v0], [u1, v0]];
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; p.push([cu + r * Math.cos(a), v1 + r * Math.sin(a)]); }
    return p;
  };
  const disc = (u, v, r, n = 12) => Array.from({ length: n }, (_, i) => [u + r * Math.cos((i / n) * 2 * Math.PI), v + r * Math.sin((i / n) * 2 * Math.PI)]);

  // ---------- dimensions ----------
  const X0 = -2.2, X1 = 2.2, Z0 = -1.6, Z1 = 1.6, T = 0.1, H = 2.5, FT = 0.02, WS = 0.92;
  const WIN = { z0: -0.55, z1: 0.95, y0: 0.98, y1: 2.0 };

  // ---------- bread and baskets ----------
  // melon pan: a dome with a scored grid (bread-shade seams on the crown)
  function melonpan(x, y, z, r = 0.075) {
    lathe("bread", [[0, y], [r * 0.9, y], [r, y + 0.018], [r * 0.9, y + 0.045], [r * 0.6, y + 0.068], [0, y + 0.078]], x, z, 8);
    for (const d of [-0.35, 0.35]) {
      quad("line", [x + d * r - 0.005, y + 0.073, z - r * 0.55], [x + d * r + 0.005, y + 0.073, z - r * 0.55], [x + d * r + 0.005, y + 0.073, z + r * 0.55], [x + d * r - 0.005, y + 0.073, z + r * 0.55], [x, y, z]);
      quad("line", [x - r * 0.55, y + 0.0732, z + d * r - 0.005], [x + r * 0.55, y + 0.0732, z + d * r - 0.005], [x + r * 0.55, y + 0.0732, z + d * r + 0.005], [x - r * 0.55, y + 0.0732, z + d * r + 0.005], [x, y, z]);
    }
  }
  // anpan: a dark glossy bun with a pale seed dot
  function anpan(x, y, z, r = 0.07) {
    lathe("wood", [[0, y], [r * 0.92, y], [r, y + 0.02], [r * 0.82, y + 0.05], [r * 0.45, y + 0.064], [0, y + 0.067]], x, z, 8);
    lathe("enamel", [[0, y + 0.064], [0.014, y + 0.064], [0, y + 0.072]], x, z, 6);
  }
  // croissant: a tapered crescent tube, horns pointing along yaw a
  function croissant(x, y, z, a = 0, s = 1) {
    const N = 7, R = 0.075 * s, pts = [], rs = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), ang = -1.25 + 2.5 * t, rr = 0.036 * s * (0.25 + 0.75 * Math.sin(Math.PI * t));
      const lx = R * Math.sin(ang), lz = -R * Math.cos(ang) + R * 0.55;
      pts.push([x + lx * Math.cos(a) - lz * Math.sin(a), y + rr * 0.85, z + lx * Math.sin(a) + lz * Math.cos(a)]);
      rs.push(rr);
    }
    tube("bread", pts, rs, 7);
  }
  // baguette from foot point p along direction d (unit), length L
  function baguette(p, d, L = 0.62, r = 0.03) {
    const N = 6, pts = [], rs = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pts.push(p.map((v, k) => v + d[k] * L * t));
      rs.push(r * (t < 0.12 || t > 0.88 ? 0.55 : 1));
    }
    tube("bread", pts, rs, 7);
    // diagonal scores along the top side
    const side = nrm(cross(d, [0, 0, 1])), out = nrm(cross(side, d));
    for (let i = 1; i <= 4; i++) {
      const t = i / 5.4, q = p.map((v, k) => v + d[k] * L * t + out[k] * r * 1.0);
      const e = 0.04;
      quad("line", q.map((v, k) => v - d[k] * e - side[k] * 0.012), q.map((v, k) => v - d[k] * e + side[k] * 0.012), q.map((v, k) => v + d[k] * e + side[k] * 0.012), q.map((v, k) => v + d[k] * e - side[k] * 0.012), p.map((v, k) => v + d[k] * L * t));
    }
  }
  // shokupan: a pan loaf along x, three-bump top; cut = show a pale cut face on the +X end
  function loaf(x, y, z, L = 0.26, W = 0.13, Hh = 0.1, cut = false) {
    box("bread", x - L / 2, x + L / 2, y, y + Hh, z - W / 2, z + W / 2);
    for (let i = 0; i < 3; i++) {
      const cx = x - L / 2 + (i + 0.5) * (L / 3);
      lathe("bread", [[0, y + Hh - 0.01], [W * 0.5, y + Hh - 0.01], [W * 0.48, y + Hh + 0.02], [W * 0.32, y + Hh + 0.045], [0, y + Hh + 0.055]], cx, z, 9);
    }
    if (cut) {
      const P = wallX(x + L / 2 + 0.002, -1);
      rect("enamel", P, z - W / 2 + 0.012, z + W / 2 - 0.012, y + 0.012, y + Hh - 0.005);
    }
  }
  // a leaning bread slice in a plane facing +X at x, its foot at y
  function slice(x, y, z, lean = 0.2) {
    const W = 0.13, Hh = 0.13, poly = arch(-W / 2, W / 2, 0, Hh - W / 2 + 0.01, 6);
    const P = (u, v, dx) => [x + dx + v * Math.sin(lean), y + v * Math.cos(lean), z + u];
    const ring = poly, ref = P(0, Hh / 2, 0);
    for (const [key, ins, d0, d1] of [["bread", 0, -0.008, 0.008], ["enamel", 0.012, -0.0095, 0.0095]]) {
      const pp = ring.map(([u, v]) => [u * (1 - (2 * ins) / W), ins + v * (1 - (2 * ins) / Hh)]);
      for (let i = 0; i < pp.length; i++) {
        const a = pp[i], b = pp[(i + 1) % pp.length];
        quad(key, P(a[0], a[1], d0), P(b[0], b[1], d0), P(b[0], b[1], d1), P(a[0], a[1], d1), ref);
        tri(key, P(0, Hh / 2, d1), P(a[0], a[1], d1), P(b[0], b[1], d1), ref);
        tri(key, P(0, Hh / 2, d0), P(a[0], a[1], d0), P(b[0], b[1], d0), ref);
      }
    }
  }
  // a country boule with a crossed score
  function boule(x, y, z, r = 0.12) {
    lathe("bread", [[0, y], [r * 0.9, y], [r, y + 0.03], [r * 0.88, y + 0.08], [r * 0.55, y + 0.115], [0, y + 0.125]], x, z, 12);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const w = 0.008, l = r * 0.55;
      quad("wood", [x - dx * l - dz * w, y + 0.122, z - dz * l - dx * w], [x + dx * l - dz * w, y + 0.122, z + dz * l - dx * w], [x + dx * l + dz * w, y + 0.122, z + dz * l + dx * w], [x - dx * l + dz * w, y + 0.122, z - dz * l + dx * w], [x, y, z]);
    }
  }
  // a round wicker basket with a red cloth liner; returns the top y the bread sits on
  function roundBasket(x, y, z, r = 0.16, h = 0.08) {
    lathe("wood", [[0, y], [r * 0.78, y], [r, y + h], [0, y + h]], x, z, 12);
    lathe("red", [[0, y + h], [r + 0.012, y + h - 0.012], [r * 0.95, y + h + 0.01], [0, y + h + 0.01]], x, z, 12);
    return y + h + 0.01;
  }
  function rectBasket(x0, x1, z0, z1, y, h = 0.08) {
    frust("wood", x0, x1, z0, z1, y, y + h, 0.03, 0);
    frust("red", x0 - 0.012, x1 + 0.012, z0 - 0.012, z1 + 0.012, y + h - 0.012, y + h + 0.01, 0, 0.02);
    return y + h + 0.01;
  }
  // a pale enamel tray with a rim
  function tray(x0, x1, z0, z1, y) {
    box("enamel", x0, x1, y, y + 0.012, z0, z1);
    for (const [a, b, e, f] of [[x0, x1, z0, z0 + 0.012], [x0, x1, z1 - 0.012, z1], [x0, x0 + 0.012, z0, z1], [x1 - 0.012, x1, z0, z1]]) box("enamel", a, b, y, y + 0.03, e, f);
    return y + 0.012;
  }
  // fill a basket with a pile of melon pan / anpan / croissants on a grid
  function pile(kind, cx, cz, y, cols, rows, pitch) {
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = cx + (i - (cols - 1) / 2) * pitch, z = cz + (j - (rows - 1) / 2) * pitch;
        if (kind === "melon") melonpan(x, y, z);
        else if (kind === "anpan") anpan(x, y, z);
        else croissant(x, y, z, 0.4 * ((i + j) % 2 ? 1 : -1));
      }
  }

  // ---------- floor: planks along x ----------
  box("floor", X0 - T, X1, 0, FT, Z0 - T, Z1);
  for (let z = Z0 + 0.2; z < Z1 - 0.05; z += 0.2) rect("line", flatY(FT + 0.0008), X0, X1, z - 0.006, z + 0.006);
  for (let k = 0, z = Z0; z < Z1 - 0.05; z += 0.2, k++)
    for (let x = X0 + 0.6 + (k % 3) * 0.45; x < X1 - 0.1; x += 1.35) rect("line", flatY(FT + 0.0008), x - 0.006, x + 0.006, z, z + 0.2);

  // ---------- walls ----------
  // back wall (-Z), room face at z = Z0
  box("wood", X0 - T, X1, 0, WS, Z0 - T, Z0);
  box("plaster", X0 - T, X1, WS, H, Z0 - T, Z0 - 0.02);
  box("dark", X0, X1, WS - 0.03, WS + 0.03, Z0, Z0 + 0.035); // wainscot rail
  box("wood", X0, X1, H - 0.08, H, Z0 - 0.02, Z0 + 0.05); // cornice
  for (let x = X0 + 0.3; x < X1; x += 0.3) rect("dark", wallZ(Z0 + 0.001), x - 0.008, x + 0.008, FT, WS - 0.03); // boards
  // window wall (-X), room face at x = X0; the window opening is cut out of the boxes
  box("wood", X0 - T, X0, 0, WS, Z0, Z1);
  box("plaster", X0 - T, X0 - 0.02, WS, H, Z0, WIN.z0);
  box("plaster", X0 - T, X0 - 0.02, WS, H, WIN.z1, Z1);
  box("plaster", X0 - T, X0 - 0.02, WS, WIN.y0, WIN.z0, WIN.z1);
  box("plaster", X0 - T, X0 - 0.02, WIN.y1, H, WIN.z0, WIN.z1);
  box("dark", X0, X0 + 0.035, WS - 0.03, WS + 0.03, Z0, Z1);
  box("wood", X0 - 0.02, X0 + 0.05, H - 0.08, H, Z0, Z1);
  for (let z = Z0 + 0.3; z < Z1; z += 0.3) rect("dark", wallX(X0 + 0.001), z - 0.008, z + 0.008, FT, WS - 0.03);
  // the window: frame, sill, mullions, glass, the awning's edge seen through the top of the glass
  {
    const fw = 0.06, GX = X0 - 0.06;
    box("wood", GX - 0.01, X0 + 0.03, WIN.y1, WIN.y1 + fw, WIN.z0 - fw, WIN.z1 + fw); // head
    box("wood", GX - 0.01, X0 + 0.12, WIN.y0 - 0.04, WIN.y0, WIN.z0 - fw - 0.03, WIN.z1 + fw + 0.03); // sill
    box("wood", GX - 0.01, X0 + 0.03, WIN.y0, WIN.y1, WIN.z0 - fw, WIN.z0);
    box("wood", GX - 0.01, X0 + 0.03, WIN.y0, WIN.y1, WIN.z1, WIN.z1 + fw);
    rect("glass", wallX(GX), WIN.z0, WIN.z1, WIN.y0, WIN.y1);
    // the awning edge: alternating red and cream bands with a scalloped hem, painted on the glass's room side
    const n = 8, w = (WIN.z1 - WIN.z0) / n, top = WIN.y1, hem = WIN.y1 - 0.2;
    for (let i = 0; i < n; i++) {
      const za = WIN.z0 + i * w, poly = [[za, top], [za, hem]];
      for (let k = 1; k < 6; k++) { const t = k / 6; poly.push([za + t * w, hem - 0.045 * Math.sin(Math.PI * t)]); }
      poly.push([za + w, hem], [za + w, top]);
      fan(i % 2 ? "enamel" : "red", wallX(GX + 0.003), poly);
    }
    for (const [u0, u1] of [[0.15, 0.27], [0.32, 0.37], [0.7, 0.82]]) { // sheen stripes
      const za = WIN.z0 + u0 * (WIN.z1 - WIN.z0), zb = WIN.z0 + u1 * (WIN.z1 - WIN.z0);
      quad("glow", [GX + 0.004, WIN.y0 + 0.05, za], [GX + 0.004, WIN.y0 + 0.05, zb], [GX + 0.004, hem - 0.1, zb + 0.25], [GX + 0.004, hem - 0.1, za + 0.25], [GX - 1, 1.4, za]);
    }
    for (const z of [WIN.z0 + (WIN.z1 - WIN.z0) / 2]) box("wood", GX, X0 + 0.02, WIN.y0, WIN.y1, z - 0.025, z + 0.025);
    box("wood", GX, X0 + 0.02, 1.38, 1.42, WIN.z0, WIN.z1); // transom
  }
  // the awning outside, fixed to the wall: canopy, valance, two iron arms
  {
    const OX = X0 - T, out = 0.55, yTop = 2.28, yEdge = 2.02, za = WIN.z0 - 0.2, zb = WIN.z1 + 0.2, n = 10, w = (zb - za) / n;
    for (let i = 0; i < n; i++) {
      const z0 = za + i * w, z1 = z0 + w, key = i % 2 ? "enamel" : "red";
      const zm = (z0 + z1) / 2;
      quad(key, [OX, yTop, z0], [OX, yTop, z1], [OX - out, yEdge, z1], [OX - out, yEdge, z0], [OX - out / 2, yTop - 0.6, zm]); // top, faces up
      quad(key, [OX, yTop - 0.012, z0], [OX, yTop - 0.012, z1], [OX - out, yEdge - 0.012, z1], [OX - out, yEdge - 0.012, z0], [OX - out / 2, yTop + 0.4, zm]); // underside
      const poly = [[z0, yEdge], [z0, yEdge - 0.16]];
      for (let k = 1; k < 6; k++) { const t = k / 6; poly.push([z0 + t * w, yEdge - 0.16 - 0.04 * Math.sin(Math.PI * t)]); }
      poly.push([z1, yEdge - 0.16], [z1, yEdge]);
      fan(key, wallX(OX - out - 0.002, 1), poly); // valance, outer face
      fan(key, wallX(OX - out + 0.002, -1), poly); // valance, wall-side face
    }
    for (const z of [za + 0.05, zb - 0.05]) tube("dark", [[OX, yTop - 0.3, z], [OX - out + 0.02, yEdge - 0.02, z]], 0.012, 5);
  }

  // a small blackboard menu by the window (squiggle lines, no lettering)
  {
    const P = wallX(X0 + 0.022), z0 = 1.08, z1 = 1.5, y0 = 1.3, y1 = 1.82;
    box("wood", X0, X0 + 0.02, y0 - 0.03, y1 + 0.03, z0 - 0.03, z1 + 0.03);
    rect("dark", P, z0, z1, y0, y1);
    const P2 = wallX(X0 + 0.024);
    for (let i = 0; i < 6; i++) {
      const v = y1 - 0.08 - i * 0.075, l = [0.3, 0.22, 0.27, 0.18, 0.28, 0.2][i];
      rect("line", P2, z0 + 0.05, z0 + 0.05 + l, v - 0.008, v + 0.008);
      rect(i % 2 ? "line" : "red", P2, z1 - 0.07, z1 - 0.04, v - 0.012, v + 0.012); // price dots
    }
  }

  // ---------- wall shelves (-Z, left) ----------
  {
    const x0 = -2.15, x1 = -0.55, z0 = Z0, z1 = Z0 + 0.42, B = [0.12, 0.55, 1.0, 1.45, 1.9];
    box("wood", x0, x1, FT, B[0], z0, z1); // plinth
    for (const x of [x0, x1]) box("wood", x - 0.03, x + 0.03, FT, B[4] + 0.04, z0, z1);
    B.slice(1).forEach((v) => box("wood", x0, x1, v - 0.035, v, z0, z1 + 0.02));
    box("wood", x0, x1, B[4], B[4] + 0.05, z1 - 0.02, z1 + 0.02); // crown lip
    const mx = (x0 + x1) / 2, mz = z0 + 0.22;
    // bottom: two country boules and a basket of baguette ends
    boule(x0 + 0.3, B[0], mz, 0.13);
    boule(x0 + 0.68, B[0], mz, 0.12);
    let y = rectBasket(x1 - 0.62, x1 - 0.1, mz - 0.14, mz + 0.14, B[0]);
    for (let i = 0; i < 3; i++) baguette([x1 - 0.58, y + 0.03, mz - 0.08 + i * 0.08], [1, 0, 0], 0.44, 0.03);
    // second: two trays of anpan
    y = tray(x0 + 0.08, mx - 0.04, mz - 0.15, mz + 0.15, B[1]);
    pile("anpan", (x0 + 0.08 + mx - 0.04) / 2, mz, y, 4, 2, 0.15);
    y = tray(mx + 0.04, x1 - 0.08, mz - 0.15, mz + 0.15, B[1]);
    pile("melon", (mx + 0.04 + x1 - 0.08) / 2, mz, y, 4, 2, 0.16);
    // third: baskets of croissants and melon pan
    y = roundBasket(x0 + 0.27, B[2], mz, 0.18);
    pile("crois", x0 + 0.27, mz, y, 2, 2, 0.11);
    y = roundBasket(mx + 0.02, B[2], mz, 0.18);
    pile("melon", mx + 0.02, mz, y, 2, 2, 0.12);
    melonpan(mx + 0.02, y + 0.05, mz);
    y = roundBasket(x1 - 0.27, B[2], mz, 0.18);
    pile("crois", x1 - 0.27, mz, y, 2, 2, 0.11);
    // fourth: shokupan loaves, one cut with slices leaning on it
    loaf(x0 + 0.27, B[3], mz, 0.28, 0.14, 0.1);
    loaf(mx - 0.08, B[3], mz, 0.26, 0.14, 0.1, true);
    slice(mx + 0.1, B[3], mz, 0.25);
    slice(mx + 0.16, B[3], mz, 0.35);
    loaf(x1 - 0.25, B[3], mz, 0.28, 0.14, 0.1);
    // top: two empty baskets stacked
    y = roundBasket(x0 + 0.35, B[4], mz, 0.15, 0.09);
    roundBasket(x0 + 0.35, y, mz, 0.13, 0.07);
    rectBasket(x1 - 0.55, x1 - 0.12, mz - 0.12, mz + 0.12, B[4], 0.1);
  }

  // ---------- baguettes in a tall basket (back corner by the oven) ----------
  {
    const x = -0.28, z = -1.3;
    lathe("wood", [[0, FT], [0.13, FT], [0.16, 0.5], [0, 0.5]], x, z, 12);
    lathe("red", [[0, 0.5], [0.175, 0.485], [0.16, 0.515], [0, 0.515]], x, z, 12);
    for (const [dx, dz, lx, lz] of [[-0.06, -0.04, -0.28, -0.1], [0.05, -0.05, 0.2, -0.18], [0.0, 0.06, 0.05, 0.25], [-0.07, 0.05, -0.2, 0.18], [0.07, 0.04, 0.26, 0.1]]) {
      const d = nrm([lx, 1, lz]);
      baguette([x + dx, 0.25, z + dz], d, 0.68, 0.03);
    }
  }

  // ---------- centre display table: two tiers ----------
  const CTB = { x0: -1.35, x1: -0.35, z0: -0.15, z1: 0.65, y: 0.72 };
  {
    const { x0, x1, z0, z1, y } = CTB, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box("wood", x0, x1, y - 0.04, y, z0, z1);
    box("wood", x0 + 0.04, x1 - 0.04, y - 0.14, y - 0.04, z0 + 0.04, z1 - 0.04); // apron
    for (const [x, z] of [[x0 + 0.07, z0 + 0.07], [x1 - 0.07, z0 + 0.07], [x0 + 0.07, z1 - 0.07], [x1 - 0.07, z1 - 0.07]]) box("wood", x - 0.035, x + 0.035, FT, y - 0.04, z - 0.035, z + 0.035);
    box("wood", x0 + 0.1, x1 - 0.1, 0.16, 0.19, z0 + 0.1, z1 - 0.1); // stretcher shelf
    box("wood", cx - 0.25, cx + 0.25, y, y + 0.24, cz - 0.18, cz + 0.18); // riser
    let t = roundBasket(x0 + 0.2, y, z0 + 0.2, 0.16);
    pile("anpan", x0 + 0.2, z0 + 0.2, t, 2, 2, 0.12);
    t = roundBasket(x1 - 0.2, y, z0 + 0.2, 0.16);
    pile("crois", x1 - 0.2, z0 + 0.2, t, 2, 2, 0.1);
    t = roundBasket(x0 + 0.2, y, z1 - 0.2, 0.16);
    pile("crois", x0 + 0.2, z1 - 0.2, t, 2, 2, 0.1);
    t = roundBasket(x1 - 0.2, y, z1 - 0.2, 0.16);
    pile("melon", x1 - 0.2, z1 - 0.2, t, 2, 2, 0.11);
    t = rectBasket(cx - 0.22, cx + 0.22, cz - 0.15, cz + 0.15, y + 0.24);
    pile("melon", cx, cz, t, 3, 2, 0.14);
    melonpan(cx, t + 0.055, cz);
    for (const x of [x0 + 0.2, x1 - 0.2]) boule(x, 0.19, cz, 0.11); // under-shelf boules
    anchor("centreTable", cx, y, cz);
  }

  // ---------- bench under the window ----------
  {
    const x0 = X0, x1 = X0 + 0.45, z0 = WIN.z0 - 0.05, z1 = WIN.z1 + 0.05, y = 0.72;
    box("wood", x0, x1, y - 0.04, y, z0, z1);
    for (const z of [z0 + 0.05, z1 - 0.05]) box("wood", x1 - 0.08, x1 - 0.03, FT, y - 0.04, z - 0.03, z + 0.03);
    let t = rectBasket(x0 + 0.04, x1 - 0.04, z0 + 0.05, z0 + 0.62, y);
    pile("crois", (x0 + x1) / 2, z0 + 0.335, t, 2, 3, 0.15);
    t = rectBasket(x0 + 0.04, x1 - 0.04, z0 + 0.72, z0 + 1.27, y);
    pile("anpan", (x0 + x1) / 2, z0 + 0.995, t, 2, 3, 0.15);
    loaf((x0 + x1) / 2, y, z1 - 0.15, 0.13, 0.24, 0.1); // a loaf turned across
    anchor("window", X0, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
  }

  // ---------- self-serve station: trays and tongs ----------
  {
    const x0 = X0 + 0.02, x1 = X0 + 0.52, z0 = 1.08, z1 = 1.52, y = 0.86;
    box("wood", x0, x1, y - 0.04, y, z0, z1);
    box("wood", x0, x1, 0.12, 0.15, z0 + 0.02, z1 - 0.02); // low shelf
    for (const [x, z] of [[x1 - 0.05, z0 + 0.04], [x1 - 0.05, z1 - 0.04], [x0 + 0.05, z0 + 0.04], [x0 + 0.05, z1 - 0.04]]) box("wood", x - 0.025, x + 0.025, FT, y - 0.04, z - 0.025, z + 0.025);
    // a stack of trays
    let t = y;
    for (let i = 0; i < 5; i++) t = tray(x0 + 0.04, x0 + 0.36, z0 + 0.05, z0 + 0.3, t) + 0.006;
    for (let i = 0; i < 4; i++) box("enamel", x0 + 0.04, x0 + 0.34, 0.15 + i * 0.016, 0.16 + i * 0.016, z0 + 0.06, z1 - 0.06); // spares below
    // the tong pot and three tongs
    const px = x1 - 0.1, pz = z1 - 0.12;
    lathe("brick", [[0, y], [0.055, y], [0.06, y + 0.14], [0, y + 0.14]], px, pz, 10);
    for (const [a, l] of [[-0.6, 0.2], [0.5, 0.21], [2.2, 0.19]]) {
      const d = [Math.cos(a) * 0.25, 1, Math.sin(a) * 0.25], b = [px, y + 0.06, pz], tip = b.map((v, k) => v + nrm(d)[k] * (l + 0.06));
      const side = nrm(cross(nrm(d), [0, 0, 1])).map((v) => v * 0.022);
      tube("dark", [b, tip.map((v, k) => v + side[k])], [0.007, 0.007], 4);
      tube("dark", [b, tip.map((v, k) => v - side[k])], [0.007, 0.007], 4);
    }
    anchor("serve", (x0 + x1) / 2, y, (z0 + z1) / 2);
  }

  // ---------- the oven: brick surround, arch, big iron door ----------
  const OV = { x0: -0.05, x1: 1.62, z1: Z0 + 0.18, top: 2.15 };
  {
    const { x0, x1, z1, top } = OV, cx = (x0 + x1) / 2;
    box("brick", x0, x1, FT, top, Z0, z1);
    box("brick", x0 - 0.05, x1 + 0.05, top, top + 0.07, Z0, z1 + 0.04); // cap course
    // mortar: courses every 0.1, staggered joints, kept off the door arch and firebox
    const P = wallZ(z1 + 0.001), door = { u0: cx - 0.5, u1: cx + 0.5, v0: 0.95, v1: 2.0 };
    const inDoor = (u, v) => (u > door.u0 && u < door.u1 && v > door.v0 && v < door.v1) || (u > cx - 0.32 && u < cx + 0.32 && v > 0.3 && v < 0.62);
    for (let k = 0, v = FT + 0.1; v < top - 0.02; v += 0.1, k++) {
      let u0 = null; // horizontal bed joints as runs broken only by the door and firebox
      for (let u = x0; u <= x1 + 1e-6; u += 0.02) {
        const open = u < x1 - 1e-6 && !inDoor(u, v);
        if (open && u0 === null) u0 = u;
        if (!open && u0 !== null) { rect("line", P, u0, Math.min(u, x1), v - 0.008, v + 0.008); u0 = null; }
      }
      if (u0 !== null) rect("line", P, u0, x1, v - 0.008, v + 0.008);
      for (let u = x0 + (k % 2 ? 0.12 : 0.24); u < x1 - 0.05; u += 0.24) if (!inDoor(u, v + 0.05)) rect("line", P, u - 0.008, u + 0.008, v + 0.008, v + 0.092);
    }
    // cream stone arch and the iron door
    prismZ("plaster", arch(cx - 0.5, cx + 0.5, 0.96, 1.5, 10), z1, z1 + 0.03);
    prismZ("dark", arch(cx - 0.4, cx + 0.4, 1.04, 1.5, 10), z1 + 0.03, z1 + 0.07);
    tube("lamp", arch(cx - 0.4, cx + 0.4, 1.04, 1.5, 10).slice(1).concat([[cx - 0.4, 1.04]]).map(([u, v]) => [u, v, z1 + 0.072]), 0.014, 5); // brass rim
    for (const v of [1.16, 1.4]) box("dark", cx - 0.42, cx - 0.3, v - 0.035, v + 0.035, z1 + 0.06, z1 + 0.085); // hinges
    fan("dark", wallZ(z1 + 0.071), disc(cx, 1.5, 0.15, 14)); // peep window bezel
    fan("glow", wallZ(z1 + 0.073), disc(cx, 1.5, 0.11, 14));
    for (const du of [-0.04, 0.04]) rect("dark", wallZ(z1 + 0.075), cx + du - 0.008, cx + du + 0.008, 1.39, 1.61); // grille bars
    // brass bar handle on two posts
    const hz = z1 + 0.15;
    tube("lamp", [[cx - 0.22, 1.2, hz], [cx + 0.22, 1.2, hz]], 0.017, 6);
    for (const u of [cx - 0.2, cx + 0.2]) tube("lamp", [[u, 1.2, z1 + 0.06], [u, 1.2, hz]], 0.012, 5);
    // firebox slot with embers
    box("dark", cx - 0.3, cx + 0.3, 0.32, 0.6, z1, z1 + 0.04);
    rect("glow", wallZ(z1 + 0.041), cx - 0.22, cx + 0.22, 0.36, 0.43);
    box("dark", cx - 0.34, cx + 0.34, 0.6, 0.64, z1, z1 + 0.07); // ledge
    // a bread peel leaning on the right of the surround
    const foot = [x1 + 0.12, FT + 0.02, z1 + 0.18], topP = [x1 + 0.02, 1.95, z1 + 0.02];
    tube("wood", [foot, topP], 0.018, 6);
    const pd = nrm(sub(topP, foot)), pb = foot.map((v, k) => v + pd[k] * 0.03);
    hex("wood", [[pb[0] - 0.13, pb[1], pb[2] - 0.006], [pb[0] + 0.13, pb[1], pb[2] - 0.006], [pb[0] + 0.13, pb[1], pb[2] + 0.006], [pb[0] - 0.13, pb[1], pb[2] + 0.006],
      [pb[0] - 0.13 - 0.005, pb[1] + 0.32, pb[2] - 0.05], [pb[0] + 0.13 - 0.005, pb[1] + 0.32, pb[2] - 0.05], [pb[0] + 0.13 - 0.005, pb[1] + 0.32, pb[2] - 0.038], [pb[0] - 0.13 - 0.005, pb[1] + 0.32, pb[2] - 0.038]]);
    anchor("oven", cx, 1.4, z1 + 0.07);
  }

  // ---------- the counter: glass cake case and the register section ----------
  const CT = { x0: -0.1, xm: 1.3, x1: 2.2, z0: -0.95, z1: -0.45, y: 1.0 };
  {
    const { x0, xm, x1, z0, z1, y } = CT;
    // case base and the glass box
    box("wood", x0, xm, FT, 0.42, z0, z1);
    box("dark", x0 - 0.01, xm + 0.01, 0.42, 0.45, z0, z1 + 0.01);
    for (let x = x0 + 0.35; x < xm - 0.1; x += 0.35) rect("dark", wallZ(z1 + 0.001), x - 0.008, x + 0.008, 0.06, 0.4);
    for (const [x, z] of [[x0 + 0.015, z1 - 0.015], [xm - 0.015, z1 - 0.015], [x0 + 0.015, z0 + 0.015], [xm - 0.015, z0 + 0.015]]) box("wood", x - 0.015, x + 0.015, 0.45, y, z - 0.015, z + 0.015);
    box("wood", x0, xm, y - 0.03, y, z0, z0 + 0.03);
    box("wood", x0, xm, y - 0.03, y, z1 - 0.03, z1);
    box("wood", x0, x0 + 0.03, y - 0.03, y, z0, z1);
    rect("enamel", wallZ(z0 + 0.03), x0 + 0.03, xm - 0.03, 0.45, y - 0.03); // inner back
    box("enamel", x0 + 0.03, xm - 0.03, 0.71, 0.72, z0 + 0.03, z1 - 0.05); // glass shelf
    const zc = (z0 + z1) / 2 + 0.02;
    const cake = (x, yb, kind) => {
      lathe("enamel", [[0, yb], [0.1, yb], [0.1, yb + 0.008], [0, yb + 0.008]], x, zc, 12);
      if (kind === "round") {
        cyl("lamp", x, zc, 0.08, yb + 0.008, yb + 0.08, 12);
        lathe("enamel", [[0, yb + 0.08], [0.083, yb + 0.08], [0.083, yb + 0.096], [0, yb + 0.098]], x, zc, 12);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; lathe("red", [[0, yb + 0.096], [0.016, yb + 0.096], [0.014, yb + 0.112], [0, yb + 0.124]], x + 0.052 * Math.cos(a), zc + 0.052 * Math.sin(a), 6); }
        lathe("red", [[0, yb + 0.096], [0.02, yb + 0.096], [0.018, yb + 0.118], [0, yb + 0.132]], x, zc, 6);
      } else {
        const a = [x - 0.065, yb + 0.008, zc - 0.05], b = [x + 0.065, yb + 0.008, zc - 0.05], e = [x, yb + 0.008, zc + 0.08];
        const up = (p, h) => [p[0], p[1] + h, p[2]], ref = [x, yb + 0.04, zc];
        for (const [p, q] of [[a, b], [b, e], [e, a]]) quad("lamp", p, q, up(q, 0.075), up(p, 0.075), ref);
        tri("enamel", up(a, 0.075), up(b, 0.075), up(e, 0.075), ref);
        tri("lamp", a, b, e, ref);
        for (const [p, q] of [[b, e], [e, a]]) { // cream layer bands on the two front faces
          const n = nrm(cross(sub(q, p), [0, 1, 0])), o = n.map((v) => v * -0.002);
          quad("enamel", up(p, 0.034).map((v, k) => v + o[k]), up(q, 0.034).map((v, k) => v + o[k]), up(q, 0.046).map((v, k) => v + o[k]), up(p, 0.046).map((v, k) => v + o[k]), ref);
        }
        lathe("red", [[0, yb + 0.083], [0.018, yb + 0.083], [0.016, yb + 0.1], [0, yb + 0.113]], x, zc - 0.005, 6);
      }
    };
    [["round", 0.18], ["slice", 0.5], ["round", 0.85], ["slice", 1.15]].forEach(([k, dx]) => cake(x0 + dx, 0.45, k));
    [["slice", 0.2], ["round", 0.52], ["slice", 0.82], ["round", 1.15]].forEach(([k, dx]) => cake(x0 + dx, 0.72, k));
    // glass sheen on the front
    for (const u of [0.12, 0.62, 1.05]) quad("glow", [x0 + u, 0.5, z1 + 0.002], [x0 + u + 0.05, 0.5, z1 + 0.002], [x0 + u + 0.19, y - 0.06, z1 + 0.002], [x0 + u + 0.14, y - 0.06, z1 + 0.002], [x0 + u, 0.7, z1 - 1]);
    for (const u of [0.3, 0.9]) quad("glow", [x0 + u, y - 0.002, z0 + 0.05], [x0 + u + 0.05, y - 0.002, z0 + 0.05], [x0 + u + 0.15, y - 0.002, z1 - 0.05], [x0 + u + 0.1, y - 0.002, z1 - 0.05], [x0 + u, y - 1, (z0 + z1) / 2]);
    // register section: a wood counter with a dark top
    box("wood", xm, x1, FT, y - 0.05, z0, z1);
    box("dark", xm - 0.01, x1, y - 0.05, y, z0 - 0.02, z1 + 0.04);
    for (let x = xm + 0.3; x < x1 - 0.1; x += 0.3) rect("dark", wallZ(z1 + 0.001), x - 0.008, x + 0.008, 0.06, y - 0.08);
    // the register
    {
      const x = x1 - 0.24, z = (z0 + z1) / 2 - 0.02;
      hex("wood", [[x - 0.17, y, z - 0.15], [x + 0.17, y, z - 0.15], [x + 0.17, y, z + 0.17], [x - 0.17, y, z + 0.17],
        [x - 0.17, y + 0.22, z - 0.15], [x + 0.17, y + 0.22, z - 0.15], [x + 0.17, y + 0.1, z + 0.17], [x - 0.17, y + 0.1, z + 0.17]]);
      box("dark", x - 0.18, x + 0.18, y, y + 0.05, z - 0.16, z + 0.18); // drawer band
      box("wood", x - 0.08, x + 0.08, y + 0.2, y + 0.34, z - 0.12, z - 0.04); // display tower
      rect("glow", wallZ(z - 0.039), x - 0.06, x + 0.06, y + 0.26, y + 0.31);
      const slope = (u, t) => [u, y + 0.22 - 0.12 * t + 0.006, z - 0.15 + 0.32 * t];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const u = x - 0.12 + i * 0.08, t = 0.25 + j * 0.22;
        quad("enamel", slope(u - 0.025, t - 0.08), slope(u + 0.025, t - 0.08), slope(u + 0.025, t + 0.08), slope(u - 0.025, t + 0.08), [u, y, z]);
      }
      anchor("register", x, y, z);
    }
    // a tray of fresh buns, the steam source
    const ty = tray(xm + 0.05, xm + 0.41, z0 + 0.05, z1 - 0.05, y);
    pile("melon", xm + 0.23, (z0 + z1) / 2, ty, 2, 2, 0.17);
    anchor("counter", (x0 + x1) / 2, y, z1);
  }

  // ---------- pendant rail and lamps ----------
  {
    const RY = 2.3, RZ = -0.3, RX1 = 1.85;
    tube("dark", [[X0 - 0.03, RY, RZ], [RX1, RY, RZ]], 0.022, 6);
    box("dark", X0, X0 + 0.02, RY - 0.08, RY + 0.08, RZ - 0.06, RZ + 0.06); // wall plate
    for (const x of [-1.2, 1.4]) {
      tube("dark", [[x, RY, Z0 - 0.02], [x, RY, RZ]], 0.015, 6);
      box("dark", x - 0.05, x + 0.05, RY - 0.08, RY + 0.08, Z0, Z0 + 0.02); // wall plate
    }
    const lamp = (x, yb) => {
      tube("dark", [[x, RY, RZ], [x, yb + 0.19, RZ]], 0.006, 4);
      lathe("dark", [[0, yb + 0.17], [0.025, yb + 0.17], [0.025, yb + 0.21], [0, yb + 0.21]], x, RZ, 8);
      lathe("lamp", [[0, yb + 0.06], [0.17, yb], [0.175, yb + 0.02], [0.14, yb + 0.1], [0.07, yb + 0.16], [0.025, yb + 0.18], [0, yb + 0.18]], x, RZ, 14);
      lathe("dark", [[0.16, yb - 0.004], [0.178, yb - 0.004], [0.178, yb + 0.016], [0.16, yb + 0.016], [0.16, yb - 0.004]], x, RZ, 14);
      lathe("glow", [[0, yb + 0.02], [0.04, yb + 0.035], [0.035, yb + 0.07], [0, yb + 0.08]], x, RZ, 8);
    };
    for (const x of [-1.75, -0.85, 0.15, 1.15]) lamp(x, 1.84);
  }

  // ---------- steam over the fresh buns (rewritten by pose) ----------
  const PUFFS = 3, STEAM = { x: CT.xm + 0.23, y: CT.y + 0.12, z: (CT.z0 + CT.z1) / 2, rise: 0.62 };
  const puffStart = [];
  {
    const n = 10, m = 6;
    for (let i = 0; i < PUFFS; i++) {
      puffStart.push(S("steam").length);
      const prof = [];
      for (let k = 0; k <= m; k++) { const a = -Math.PI / 2 + (k / m) * Math.PI; prof.push([Math.cos(a), Math.sin(a)]); }
      prof[0][0] = 0; prof[m][0] = 0;
      lathe("steam", prof, 0, 0, n);
    }
    puffStart.push(S("steam").length);
  }

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.wood, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 2],
    plaster: [c.plaster, c.plasterShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    line: [c.line, c.line, 0.1, 0],
    brick: [c.brick, c.brickShade, 0.1, 2.5],
    bread: [c.bread, c.breadShade, 0.45, 2],
    red: [c.red, c.redShade, 0.1, 2],
    enamel: [c.enamel, c.enamelShade, 0.1, 1.5],
    glass: [c.glass, c.glassShade, 0.1, 0],
    lamp: [c.lamp, c.lampShade, 0.1, 2],
    glow: [c.glow, c.glow, -0.25, 0],
    steam: [c.steam, c.steamShade, 0.2, 1.5],
  };
  const geo = (arr) => {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.computeVertexNormals();
    return gm;
  };
  let steamMesh = null, steamBase = null;
  for (const [key, arr] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = geo(arr);
    if (key === "steam") { // smooth sphere normals so the hull and the tone stay round
      const p = g.attributes.position.array, nn = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 3) { const l = Math.hypot(p[i], p[i + 1], p[i + 2]) || 1; nn[i] = p[i] / l; nn[i + 1] = p[i + 1] / l; nn[i + 2] = p[i + 2] / l; }
    }
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
    if (key === "steam") { steamMesh = mesh; steamBase = Float32Array.from(arr); mesh.frustumCulled = false; }
  }

  function anchor(name, x, y, z) { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; }
  anchor("floor", 0, FT, 0);

  // ---------- poses and clips ----------
  // steam: puff i rises with phase u = (t / T + i / PUFFS) mod 1, swelling then shrinking away near the top
  const CLIPS = { steam: 3 };
  function steam(t) {
    const T = CLIPS.steam, P3 = steamMesh.geometry.attributes.position.array;
    for (let i = 0; i < PUFFS; i++) {
      const u = (((t / T + i / PUFFS) % 1) + 1) % 1;
      const s = (0.035 + 0.055 * Math.sin(Math.min(u / 0.75, 1) * Math.PI * 0.5)) * (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
      const cx = STEAM.x + 0.06 * Math.sin(u * Math.PI * 2 + i * 1.7), cy = STEAM.y + u * STEAM.rise, cz = STEAM.z + 0.04 * Math.cos(u * Math.PI * 2 + i);
      for (let v = puffStart[i]; v < puffStart[i + 1]; v += 3) {
        P3[v] = cx + steamBase[v] * s;
        P3[v + 1] = cy + steamBase[v + 1] * s * 0.85;
        P3[v + 2] = cz + steamBase[v + 2] * s;
      }
    }
    const g = steamMesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`bakery: no clip "${m[1]}" (clips: steam)`);
      return steam(+m[2]);
    }
    if (name !== "rest") throw new Error(`bakery: unknown pose "${name}" (rest, or steam@<seconds>)`);
    steam(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

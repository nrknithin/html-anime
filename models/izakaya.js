// izakaya.js - the interior of a small anime izakaya (Japanese pub) as a cutaway set: an L counter with a raised
// glass fish case, a back bar of bottles, menu slips, red paper lanterns and a raised tatami corner. Static.
// Contract: harness/lab/README.md. Meters, +Y up, the open (cutaway) sides face +X and +Z so a camera in the lit
// front-left quadrant sees in; the -Z wall holds the back bar behind the counter, the -X wall the tatami platform.
// Stands on y = 0 (floor top 0.02, joints.floor), centred on the room.
//
// Construction (boxes, lathes, polygon tubes, flat panels, all triangle soups merged per material; flat shaded so
// planes read crisp; every closed part is wound away from a point inside it, never by hand):
//   SHELL    a dark plank floor (board seams as flat dark bands); -X and -Z walls: dark wood koshiita boarding to a rail
//            at 0.95 (board seams), cream plaster above, dark corner posts at the corner and both open ends, a dark
//            skirting. An L of lantern beams runs from the -X wall along the counter front and back to the -Z wall
//            over the return, so the lanterns hang from something.
//   COUNTER  an L of dark wood: the long leg along x faces +Z, the short return runs back to the -Z wall at the +X
//            end; pale hinoki tops overhang the customer sides; a dark kick plinth. Seven round hinoki stools on four
//            splayed legs with a stretcher ring (five along the long leg, two at the return). On the counter: small
//            plates with food, beer mugs (pale beer, foam, handle), sake carafes (tokkuri) with cups.
//   CASE     a raised glass cold case (neta case) on a raised hinoki ledge along the long leg: dark base and end plates, an ice bed, tuna and
//            salmon blocks, whole fish, shrimp; its sloped front and top are glass, drawn as a frame with sheen stripes.
//   BACK BAR a low cabinet with sliding-door seams along the -Z wall, two open shelves above it: rows of tall sake
//            bottles (blank paper labels) and dark and brown bottles.
//   WALLS    dark menu boards on the -Z wall over the back bar and on the -X wall over the tatami, each hung with a row
//            of blank paper slips (no text).
//   TATAMI   a raised platform (koagari) along the -X wall: dark wood skirt, hinoki edge frame, four mats with dark
//            heri borders, a low table with dishes, four red zabuton cushions, a step stone.
//   LANTERNS four red paper lanterns (akachochin) on cords from the beams: smooth lathes, dark caps and rib bands.
// Proportions (real size, base unit the wall height 2.6): room 6.4 x 4.8, walls 0.1; counter top 1.0, long leg
//   3.2 x 0.55 (+0.15 overhang), return 0.55 x 1.4; stools seat 0.68 r 0.17 at 0.62 pitch; fish case 1.5 x 0.32 x
//   0.3; back bar cabinet 0.9 high, shelves 1.42 and 1.85; platform 0.4 high, 1.6 deep, 3.0 long; low table 0.72 x
//   1.2 at 0.73; lanterns r 0.17 x 0.42 hanging to 1.75 from a beam at 2.4; menu slips 0.09 x 0.5 and 0.07 x 0.28.
// Options: build(THREE, kit, colors, { height, night }).
//   height  scales the whole set so the wall top is `height` (default 2.6).
//   night   the lanterns glow (practical, threshold -0.25), the plaster dims to sky / skin, so the lanterns are the
//           brightest thing in the room.
// Poses: rest.
// Colours (noon, warm wood): dark wood iris #5c3d32 / hair #241c16 (walls, floor, counter body, shelves, table);
//   seams, caps, frames, dark bottles hair (flat); hinoki sky #f2d7ae / skin #f0c2ae (counter tops, stools, tatami,
//   beer); plaster moon #fff6e4 / sky (night sky / skin); paper slips practical #fffaf2 / sclera #f6f3ee; lanterns,
//   cushions, tuna accent #c4452d / iris (night lanterns practical, glowing); china and fish sclera / moon;
//   salmon skin / accent.
// Meshes: one per material, 12 (night 13: the glowing band). 13.4k triangles.
// Joints: anchors floor, counter, stool0..stool6, table, fishCase.

export const meta = {
  name: "izakaya",
  height: 2.6,
  script: "noon",
  colors: {
    wood: "#5c3d32", woodShade: "#241c16",
    dark: "#241c16",
    hinoki: "#f2d7ae", hinokiShade: "#f0c2ae",
    plaster: "#fff6e4", plasterShade: "#f2d7ae",
    nightPlaster: "#f2d7ae", nightPlasterShade: "#f0c2ae",
    floor: "#f0c2ae", floorShade: "#f2d7ae", seam: "#f2d7ae",
    paper: "#fffaf2", paperShade: "#f6f3ee",
    lantern: "#c4452d", lanternShade: "#5c3d32",
    glow: "#fffaf2",
    red: "#c4452d", redShade: "#5c3d32",
    china: "#f6f3ee", chinaShade: "#fff6e4",
    salmon: "#f0c2ae", salmonShade: "#c4452d",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const { height = meta.height, night = false } = opts;
  const c = { ...meta.colors, ...colors };
  const root = new THREE.Group();
  root.name = "izakaya";
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
    if (Math.hypot(...n) < 1e-10) return;
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
  // a cushion: bottom rect at y0 inset i0, widest at ym, top at y1 inset i1
  function pillow(key, x0, x1, z0, z1, y0, ym, y1, i0, i1) {
    const R = (y, i) => [[x0 + i, y, z0 + i], [x1 - i, y, z0 + i], [x1 - i, y, z1 - i], [x0 + i, y, z1 - i]];
    hex(key, [...R(y0, i0), ...R(ym, 0)]);
    hex(key, [...R(ym, 0), ...R(y1, i1)]);
  }
  // surface of revolution about (cx, cz): profile [[r, y], ...] from the bottom centre to the top centre
  function lathe(key, prof, cx, cz, n = 12) {
    const ym = prof.reduce((s, p) => s + p[1], 0) / prof.length;
    const ref = [cx, ym, cz];
    const P = (p, j) => { const a = (j / n) * Math.PI * 2; return [cx + p[0] * Math.cos(a), p[1], cz + p[0] * Math.sin(a)]; };
    for (let i = 0; i + 1 < prof.length; i++)
      for (let j = 0; j < n; j++) {
        const yr = [cx, (prof[i][1] + prof[i + 1][1]) / 2, cz];
        const r = Math.abs(prof[i][1] - prof[i + 1][1]) < 1e-6 ? ref : yr;
        const cap = prof[i][0] < 1e-6 || prof[i + 1][0] < 1e-6;
        quad(key, P(prof[i], j), P(prof[i], j + 1), P(prof[i + 1], j + 1), P(prof[i + 1], j), cap ? ref : r);
      }
  }
  const cyl = (key, cx, cz, r, y0, y1, n = 12) => lathe(key, [[0, y0], [r, y0], [r, y1], [0, y1]], cx, cz, n);
  // polygon tube along a polyline with radius r, closed at both ends
  function tube(key, pts, r, n = 6) {
    const rings = pts.map((p, i) => {
      const d = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = nrm(cross(d, up)), e2 = cross(e1, d);
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
  // flat shapes on a plane: W(u, v) -> world, back(u, v) a point behind the plane
  const wallZ = (z, s = 1) => ({ W: (u, v) => [u, v, z], back: (u, v) => [u, v, z - s] }); // facing +Z (s = 1)
  const wallX = (x, s = 1) => ({ W: (u, v) => [x, v, u], back: (u, v) => [x - s, v, u] }); // facing +X (s = 1)
  const flatY = (y) => ({ W: (u, v) => [u, y, v], back: (u, v) => [u, y - 1, v] });
  function rect(key, P, u0, u1, v0, v1) {
    quad(key, P.W(u0, v0), P.W(u1, v0), P.W(u1, v1), P.W(u0, v1), P.back((u0 + u1) / 2, (v0 + v1) / 2));
  }
  // smooth surface of revolution (core LatheGeometry, keeps its normals), merged per material into `smooth`
  const smooth = {};
  function slathe(key, prof, cx, cz, n) {
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), n).toNonIndexed();
    g.translate(cx, 0, cz);
    const s = (smooth[key] ??= { pos: [], nor: [] });
    s.pos.push(...g.attributes.position.array);
    s.nor.push(...g.attributes.normal.array);
    g.dispose();
  }
  // vertical board seams every `bay` on a plane between u0..u1, v0..v1
  function seams(P, u0, u1, v0, v1, bay, w = 0.01) {
    const n = Math.max(1, Math.round((u1 - u0) / bay)), s = (u1 - u0) / n;
    for (let i = 1; i < n; i++) rect("dark", P, u0 + i * s - w, u0 + i * s + w, v0, v1);
  }

  // ---------- dimensions ----------
  const X0 = -3.2, X1 = 3.2, Z0 = -2.4, Z1 = 2.4, T = 0.1, H = 2.6, FT = 0.02, KO = 0.95;
  const CT = { x0: -0.9, x1: 2.3, z0: -1.0, z1: -0.45, y: 1.0, ov: 0.15 }; // long leg; the return is x1 - 0.55..x1
  const RX0 = CT.x1 - 0.55; // return inner face
  const TA = { x1: -1.6, z0: -0.6, y: 0.4 }; // tatami platform from the -X wall to x1, z0..Z1
  const BEAM = { z: -0.15, x1: 2.4, y0: 2.4, y1: 2.52 }; // an L of beams from the -X wall and the -Z wall

  // ---------- floor: dark planks along x ----------
  box("floor", X0, X1, 0, FT, Z0, Z1);
  for (let z = Z0 + 0.6; z < Z1 - 0.05; z += 0.6) rect("seam", flatY(FT + 0.0008), X0, X1, z - 0.006, z + 0.006);
  for (let x = X0 + 0.6; x < X1 - 0.05; x += 0.6) rect("seam", flatY(FT + 0.0008), x - 0.006, x + 0.006, Z0, Z1);

  // ---------- walls ----------
  // back wall (-Z): koshiita boarding, rail, plaster, skirting
  box("wood", X0 - T, X1, 0, KO, Z0 - T, Z0);
  box("plaster", X0 - T, X1, KO, H, Z0 - T, Z0 - 0.02);
  box("wood", X0, X1, KO - 0.01, KO + 0.05, Z0, Z0 + 0.04); // rail
  box("dark", X0, X1, FT, 0.1, Z0, Z0 + 0.02); // skirting
  box("wood", X0 - T, X1, H - 0.08, H, Z0, Z0 + 0.05); // cornice
  seams(wallZ(Z0 + 0.001), X0, X1, 0.1, KO - 0.01, 0.2);
  // side wall (-X)
  box("wood", X0 - T, X0, 0, KO, Z0, Z1);
  box("plaster", X0 - T, X0 - 0.02, KO, H, Z0, Z1);
  box("wood", X0, X0 + 0.04, KO - 0.01, KO + 0.05, Z0, Z1);
  box("dark", X0, X0 + 0.02, FT, 0.1, Z0, Z1);
  box("wood", X0, X0 + 0.05, H - 0.08, H, Z0, Z1);
  seams(wallX(X0 + 0.001), Z0, Z1, 0.1, KO - 0.01, 0.2);
  // posts: the corner and both open ends
  box("wood", X0, X0 + 0.12, 0, H, Z0, Z0 + 0.12);
  box("wood", X1 - 0.12, X1, 0, H, Z0, Z0 + 0.1);
  box("wood", X0, X0 + 0.1, 0, H, Z1 - 0.12, Z1);
  // lantern beam from the -X wall to a post on the open +X edge
  box("wood", X0, BEAM.x1 + 0.06, BEAM.y0, BEAM.y1, BEAM.z - 0.06, BEAM.z + 0.06);
  box("wood", BEAM.x1 - 0.06, BEAM.x1 + 0.06, BEAM.y0, BEAM.y1, Z0, BEAM.z - 0.06);

  // ---------- menu boards with blank paper slips ----------
  function menu(P, u0, u1, v0, v1, sw, sh, gap) {
    const n = Math.floor((u1 - u0 - 0.06) / (sw + gap)), m = (u1 - u0 - n * (sw + gap) + gap) / 2;
    for (let i = 0; i < n; i++) {
      const a = u0 + m + i * (sw + gap);
      P.slip(a, a + sw, v1 - 0.04 - sh, v1 - 0.04);
    }
    P.bar(u0, u1, v1 - 0.03);
  }
  menu({
    off: (d) => wallZ(Z0 + 0.003 + d),
    slip: (a, b, v0, v1) => box("paper", a, b, v0, v1, Z0 + 0.005, Z0 + 0.012),
    bar: (a, b, v) => box("wood", a - 0.02, b + 0.02, v - 0.015, v + 0.02, Z0, Z0 + 0.04),
  }, -0.95, 1.7, 2.06, 2.46, 0.07, 0.3, 0.06);
  menu({
    off: (d) => wallX(X0 + 0.003 + d),
    slip: (a, b, v0, v1) => box("paper", X0 + 0.005, X0 + 0.012, v0, v1, a, b),
    bar: (a, b, v) => box("wood", X0, X0 + 0.04, v - 0.015, v + 0.02, a - 0.02, b + 0.02),
  }, -0.35, 2.1, 1.55, 2.2, 0.09, 0.5, 0.06);
  // a short board on the back wall over the tatami corner
  menu({
    off: (d) => wallZ(Z0 + 0.003 + d),
    slip: (a, b, v0, v1) => box("paper", a, b, v0, v1, Z0 + 0.005, Z0 + 0.012),
    bar: (a, b, v) => box("wood", a - 0.02, b + 0.02, v - 0.015, v + 0.02, Z0, Z0 + 0.04),
  }, -2.9, -1.4, 1.55, 2.2, 0.09, 0.5, 0.06);

  // ---------- counter (L) ----------
  {
    const { x0, x1, z0, z1, y, ov } = CT;
    // long leg body and return body (the return runs back to the wall)
    box("wood", x0, RX0, FT, y - 0.05, z0, z1);
    box("wood", RX0, x1, FT, y - 0.05, Z0 + 0.02, z1);
    box("dark", x0 - 0.01, x1 + 0.01, FT, 0.09, z1 - 0.03, z1 + 0.01); // kick plinth front
    box("dark", x1 - 0.03, x1 + 0.01, FT, 0.09, Z0 + 0.02, z1); // kick plinth side
    // tops: hinoki slabs overhanging the customer sides
    box("hinoki", x0 - 0.03, x1 + ov, y - 0.05, y, z0 - 0.03, z1 + ov);
    box("hinoki", RX0 - 0.03, x1 + ov, y - 0.05, y, Z0 + 0.02, z0 - 0.03);
    // board seams on the customer faces
    seams(wallZ(z1 + 0.001), x0, x1, 0.09, y - 0.05, 0.16);
    seams(wallX(x1 + 0.001), Z0 + 0.02, z1, 0.09, y - 0.05, 0.16);
    seams(wallX(x0 - 0.001, -1), z0, z1, 0.09, y - 0.05, 0.16);
  }
  // stools: hinoki seat on four splayed dark legs with a stretcher ring
  const STOOLS = [[-0.55, -0.12], [0.07, -0.12], [0.69, -0.12], [1.31, -0.12], [1.93, -0.12], [2.75, -1.05], [2.75, -1.7]];
  STOOLS.forEach(([x, z]) => {
    const sy = 0.68;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
      tube("wood", [[x + 0.19 * ca, FT, z + 0.19 * sa], [x + 0.11 * ca, sy - 0.04, z + 0.11 * sa]], 0.02, 4);
    }
    const ring = Array.from({ length: 9 }, (_, i) => { const t = (i / 8) * 2 * Math.PI; return [x + 0.165 * Math.cos(t), 0.26, z + 0.165 * Math.sin(t)]; });
    tube("dark", ring, 0.011, 4);
    lathe("hinoki", [[0, sy - 0.05], [0.16, sy - 0.05], [0.175, sy - 0.02], [0.17, sy], [0, sy]], x, z, 14);
  });

  // ---------- on the counter ----------
  const CY = CT.y;
  function plate(x, z, y = CY, r = 0.075, food = "red") {
    lathe("china", [[0, y], [r * 0.6, y], [r, y + 0.018], [r * 0.9, y + 0.02], [0, y + 0.012]], x, z, 12);
    if (food === "red") { // a few slices of sashimi
      for (let i = 0; i < 3; i++) box("red", x - 0.045 + i * 0.032, x - 0.02 + i * 0.032, y + 0.012, y + 0.03, z - 0.03, z + 0.03);
    } else if (food === "yakitori") { // two skewers
      for (const dz of [-0.018, 0.018]) {
        tube("hinoki", [[x - r * 0.95, y + 0.03, z + dz], [x + r * 0.95, y + 0.03, z + dz]], 0.004, 4);
        for (let i = 0; i < 3; i++) box("wood", x - 0.04 + i * 0.028, x - 0.018 + i * 0.028, y + 0.016, y + 0.044, z + dz - 0.012, z + dz + 0.012);
      }
    } else if (food === "edamame") {
      lathe("salmon", [[0, y + 0.01], [0.04, y + 0.01], [0.03, y + 0.04], [0, y + 0.045]], x, z, 8);
    }
  }
  function mug(x, z, y = CY) {
    lathe("hinoki", [[0, y], [0.042, y], [0.044, y + 0.13], [0, y + 0.13]], x, z, 10); // beer
    lathe("china", [[0, y + 0.13], [0.046, y + 0.13], [0.046, y + 0.165], [0.03, y + 0.172], [0, y + 0.172]], x, z, 10); // foam
    tube("china", [[x + 0.04, y + 0.12, z], [x + 0.075, y + 0.115, z], [x + 0.075, y + 0.04, z], [x + 0.04, y + 0.035, z]], 0.008, 4);
  }
  function tokkuri(x, z, y = CY) {
    lathe("china", [[0, y], [0.035, y], [0.045, y + 0.06], [0.03, y + 0.12], [0.014, y + 0.15], [0.02, y + 0.165], [0, y + 0.165]], x, z, 10);
    lathe("dark", [[0.042, y + 0.04], [0.0465, y + 0.04], [0.0465, y + 0.055], [0.042, y + 0.055], [0.042, y + 0.04]], x, z, 10); // glaze band
    for (const dx of [0.08, 0.13]) lathe("china", [[0, y], [0.016, y], [0.026, y + 0.03], [0, y + 0.03]], x + dx, z + 0.03, 8);
  }
  const FZ = CT.z1 + 0.06; // the customer half of the long leg
  plate(-0.65, FZ, CY, 0.075, "red"); mug(-0.45, FZ - 0.04);
  plate(0.0, FZ, CY, 0.08, "yakitori"); tokkuri(0.15, FZ - 0.04);
  mug(0.62, FZ - 0.03); plate(0.8, FZ + 0.01, CY, 0.07, "edamame");
  plate(1.25, FZ, CY, 0.08, "red"); mug(1.45, FZ - 0.05);
  tokkuri(1.85, FZ - 0.04); plate(2.05, FZ, CY, 0.075, "yakitori");
  const RXF = CT.x1 + 0.06; // the customer half of the return
  mug(RXF, -1.25); plate(RXF + 0.01, -1.05 + 0.3, CY, 0.07, "edamame");
  plate(RXF, -1.75, CY, 0.08, "red"); tokkuri(RXF - 0.02, -1.95);

  // ---------- glass cold case on the long leg ----------
  {
    // a raised ledge (tsukeba) along the staff half of the long leg carries the case
    const LY = CY + 0.12;
    box("wood", CT.x0 - 0.03, RX0 - 0.03, CY, LY - 0.03, CT.z0 - 0.03, CT.z0 + 0.38);
    box("hinoki", CT.x0 - 0.05, RX0 - 0.03, LY - 0.03, LY, CT.z0 - 0.03, CT.z0 + 0.4);
    const x0 = -0.1, x1 = 1.5, zb = CT.z0 + 0.0, zf = CT.z0 + 0.36, y0 = LY, yt = LY + 0.3;
    const zt = zf - 0.16; // top front edge (the front glass slopes back)
    box("dark", x0, x1, y0, y0 + 0.05, zb, zf); // base
    box("plaster", x0 + 0.02, x1 - 0.02, y0 + 0.05, y0 + 0.08, zb + 0.02, zf - 0.02); // ice bed
    // end plates: trapezoids
    for (const xe of [x0, x1 - 0.02]) hex("dark", [[xe, y0 + 0.05, zb], [xe + 0.02, y0 + 0.05, zb], [xe + 0.02, y0 + 0.05, zf], [xe, y0 + 0.05, zf],
      [xe, yt, zb], [xe + 0.02, yt, zb], [xe + 0.02, yt, zt], [xe, yt, zt]]);
    // frame: top back and front edges, the bottom front edge, a back rail, a lamp strip under the top
    box("dark", x0, x1, yt - 0.015, yt + 0.01, zb, zb + 0.025);
    box("dark", x0, x1, yt - 0.015, yt + 0.01, zt - 0.025, zt);
    box("dark", x0, x1, y0 + 0.05, y0 + 0.07, zf - 0.02, zf);
    box("china", x0 + 0.02, x1 - 0.02, yt - 0.012, yt - 0.004, zb + 0.025, zt - 0.025);
    // glass sheen on the sloped front: thin pale slanted stripes
    const fy = (t) => y0 + 0.07 + (yt - y0 - 0.085) * t, fz = (t) => zf - 0.01 - (zf - zt - 0.01) * t;
    for (const [u, w] of [[x0 + 0.12, 0.05], [x0 + 0.2, 0.02], [x0 + 0.85, 0.05], [x0 + 0.93, 0.02]]) {
      const a = [u, fy(0.08), fz(0.08) + 0.004], b = [u + w, fy(0.08), fz(0.08) + 0.004];
      const e = [u + w + 0.12, fy(0.92), fz(0.92) + 0.004], d = [u + 0.12, fy(0.92), fz(0.92) + 0.004];
      quad("paperFlat", a, b, e, d, [u, fy(0.5) - 0.3, fz(0.5) - 0.3]);
    }
    // fish on the ice
    const iy = y0 + 0.08;
    box("red", x0 + 0.06, x0 + 0.3, iy, iy + 0.05, zb + 0.06, zb + 0.16); // tuna block
    box("red", x0 + 0.06, x0 + 0.22, iy, iy + 0.045, zb + 0.19, zb + 0.28);
    box("salmon", x0 + 0.36, x0 + 0.58, iy, iy + 0.05, zb + 0.07, zb + 0.17); // salmon block with fat lines
    for (let i = 0; i < 4; i++) { const xx = x0 + 0.38 + i * 0.055; quad("paperFlat", [xx, iy + 0.0505, zb + 0.07], [xx + 0.012, iy + 0.0505, zb + 0.07], [xx + 0.03, iy + 0.0505, zb + 0.17], [xx + 0.018, iy + 0.0505, zb + 0.17], [xx, iy - 1, zb + 0.1]); }
    // whole fish lying on their sides: a flattened spindle along x, a tail fin, a dark eye
    function fish(xa, xb, z, w) {
      const n = 6, L = xb - xa, rings = [];
      const ts = [0, 0.12, 0.35, 0.65, 0.88, 1];
      const rs = [0.0, 0.7, 1.0, 0.75, 0.25, 0.0];
      for (let i = 0; i < ts.length; i++) {
        const x = xa + L * ts[i];
        rings.push(Array.from({ length: n }, (_, j) => { const t = (j / n) * 2 * Math.PI; return [x, iy + 0.02 + 0.018 * rs[i] * Math.sin(t), z + w * rs[i] * Math.cos(t)]; }));
      }
      for (let i = 0; i + 1 < rings.length; i++) {
        const ref = [xa + L * (ts[i] + ts[i + 1]) / 2, iy + 0.02, z];
        for (let j = 0; j < n; j++) quad("china", rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], ref);
      }
      const tx = xb;
      hex("china", [[tx - 0.01, iy + 0.016, z - 0.004], [tx + 0.05, iy + 0.016, z - w * 0.9], [tx + 0.05, iy + 0.016, z + w * 0.9], [tx - 0.01, iy + 0.016, z + 0.004],
        [tx - 0.01, iy + 0.024, z - 0.004], [tx + 0.05, iy + 0.024, z - w * 0.9], [tx + 0.05, iy + 0.024, z + w * 0.9], [tx - 0.01, iy + 0.024, z + 0.004]]);
      rect("dark", flatY(iy + 0.0385), xa + L * 0.1, xa + L * 0.1 + 0.014, z + w * 0.15, z + w * 0.15 + 0.014); // eye
      rect("dark", flatY(iy + 0.0383), xa + L * 0.18, xa + L * 0.85, z - w * 0.55, z - w * 0.2); // dark back
    }
    fish(x0 + 0.66, x0 + 0.98, zb + 0.1, 0.045);
    fish(x0 + 0.62, x0 + 0.94, zb + 0.23, 0.045);
    fish(x0 + 1.06, x0 + 1.32, zb + 0.12, 0.04);
    // shrimp: curled red tubes
    for (let i = 0; i < 3; i++) {
      const sx = x0 + 1.12 + i * 0.1, sz = zb + 0.24;
      tube("red", [[sx - 0.035, iy + 0.012, sz + 0.01], [sx - 0.01, iy + 0.02, sz - 0.02], [sx + 0.025, iy + 0.02, sz - 0.015], [sx + 0.035, iy + 0.012, sz + 0.015]], 0.011, 5);
    }
    anchor("fishCase", (x0 + x1) / 2, yt, (zb + zf) / 2);
  }

  // ---------- back bar: cabinet, shelves, bottles ----------
  {
    const x0 = -0.95, x1 = RX0 - 0.05, z0 = Z0, z1 = Z0 + 0.45, y = 0.9;
    box("wood", x0, x1, FT, y - 0.04, z0, z1);
    box("hinoki", x0 - 0.02, x1 + 0.0, y - 0.04, y, z0, z1 + 0.03);
    const P = wallZ(z1 + 0.001), n = 4, w = (x1 - x0) / n;
    for (let i = 1; i < n; i++) rect("dark", P, x0 + i * w - 0.012, x0 + i * w + 0.012, 0.08, y - 0.08);
    rect("dark", P, x0, x1, 0.08, 0.1);
    for (let i = 0; i < n; i++) rect("dark", P, x0 + i * w + (i % 2 ? 0.06 : w - 0.1), x0 + i * w + (i % 2 ? 0.1 : w - 0.06), 0.42, 0.56); // door pulls
    const sd = 0.24, sy = [1.42, 1.85];
    for (const x of [x0, (x0 + x1) / 2, x1]) box("wood", x - 0.025, x + 0.025, y, 2.0, z0, z0 + sd);
    sy.forEach((v) => box("wood", x0, x1, v - 0.03, v, z0, z0 + sd));
    box("wood", x0 - 0.02, x1 + 0.02, 1.98, 2.02, z0, z0 + sd + 0.02);
    // bottles: k = 0 tall sake (isshobin), 1 brown beer, 2 small white shochu
    function bottle(x, z, yb, k, key) {
      const P2 = { tall: [0.05, 0.27, 0.36, 0.4], beer: [0.035, 0.15, 0.22, 0.25], small: [0.038, 0.12, 0.18, 0.21] }[k];
      const [r, sh, nk, top] = P2;
      lathe(key, [[0, yb], [r, yb], [r, yb + sh], [r * 0.4, yb + nk], [r * 0.38, yb + top], [0, yb + top]], x, z, 8);
      if (k !== "beer") rect("paper", wallZ(z + r * 0.93 + 0.001), x - r * 0.62, x + r * 0.62, yb + sh * 0.3, yb + sh * 0.85);
    }
    const bz = z0 + 0.12;
    const rows = [
      { y, k: "tall", step: 0.15, keys: ["dark", "wood", "dark", "china", "dark", "wood"] },
      { y: sy[0], k: "beer", step: 0.11, keys: ["wood", "wood", "dark", "wood"] },
      { y: sy[1], k: "small", step: 0.12, keys: ["china", "dark", "china", "wood", "china"] },
    ];
    rows.forEach(({ y: yb, k, step, keys }, r) => {
      let i = 0;
      for (let x = x0 + 0.1 + (r % 2) * 0.03; x < x1 - 0.06; x += step) {
        if (Math.abs(x - (x0 + x1) / 2) < 0.07) continue;
        if (r === 0 && ((i * 7) % 9) === 4) { i++; continue; } // gaps in the tall row
        bottle(x, k === "tall" ? bz + 0.04 : bz, yb, k, keys[i % keys.length]);
        i++;
      }
    });
  }

  // ---------- tatami platform ----------
  {
    const { x1, z0, y } = TA;
    box("wood", X0, x1, FT, y - 0.05, z0, Z1); // body
    box("hinoki", x1 - 0.06, x1 + 0.01, y - 0.06, y + 0.005, z0 - 0.01, Z1); // edge frame (front)
    box("hinoki", X0, x1 + 0.01, y - 0.06, y + 0.005, z0 - 0.01, z0 + 0.06); // edge frame (end)
    seams(wallX(x1 + 0.011), z0, Z1, 0.05, y - 0.07, 0.3);
    seams(wallZ(z0 - 0.011, -1), X0, x1, 0.05, y - 0.07, 0.3);
    // four mats across z, each with dark heri borders along its long edges
    const mz0 = z0 + 0.06, mz1 = Z1, mw = (mz1 - mz0) / 4;
    box("hinoki", X0, x1 - 0.06, y - 0.05, y, mz0, mz1);
    const P = flatY(y + 0.0008);
    for (let i = 0; i < 4; i++) {
      const a = mz0 + i * mw, b = a + mw;
      rect("dark", P, X0, x1 - 0.06, a, a + 0.028);
      rect("dark", P, X0, x1 - 0.06, b - 0.028, b);
    }
    // step stone
    box("hinoki", x1 + 0.08, x1 + 0.42, FT, 0.2, 0.35, 0.95);
    // low table
    const tx0 = -2.75, tx1 = -2.05, tz0 = 0.5, tz1 = 1.7, ty = y + 0.33;
    box("wood", tx0, tx1, ty - 0.035, ty, tz0, tz1);
    box("dark", tx0 + 0.03, tx1 - 0.03, ty - 0.07, ty - 0.035, tz0 + 0.03, tz1 - 0.03);
    for (const [lx, lz] of [[tx0 + 0.05, tz0 + 0.05], [tx1 - 0.05, tz0 + 0.05], [tx0 + 0.05, tz1 - 0.05], [tx1 - 0.05, tz1 - 0.05]])
      box("wood", lx - 0.03, lx + 0.03, y, ty - 0.035, lz - 0.03, lz + 0.03);
    anchor("table", (tx0 + tx1) / 2, ty, (tz0 + tz1) / 2);
    // zabuton
    const zab = (cx, cz) => pillow("red", cx - 0.25, cx + 0.25, cz - 0.25, cz + 0.25, y, y + 0.05, y + 0.075, 0.02, 0.05);
    zab(-1.88, 0.8); zab(-1.88, 1.42); zab(-2.4, 2.03); zab(-2.4, 0.15);
    // dishes on the table
    plate(-2.3, 0.85, ty, 0.08, "red");
    plate(-2.5, 1.35, ty, 0.085, "yakitori");
    mug(-2.2, 1.25, ty); mug(-2.55, 0.68, ty);
    tokkuri(-2.55, 1.55, ty);
    plate(-2.2, 1.55, ty, 0.06, "edamame");
  }

  // ---------- red paper lanterns on cords from the beam ----------
  function lantern(x, z, yb, r = 0.17, h = 0.42) {
    tube("dark", [[x, BEAM.y0 + 0.01, z], [x, yb + h + 0.03, z]], 0.006, 4);
    lathe("dark", [[0, yb + h - 0.01], [r * 0.48, yb + h - 0.01], [r * 0.48, yb + h + 0.04], [0, yb + h + 0.04]], x, z, 12); // top cap
    lathe("dark", [[0, yb - 0.03], [r * 0.52, yb - 0.03], [r * 0.52, yb + 0.02], [0, yb + 0.02]], x, z, 12); // bottom cap
    // the paper: smooth lathes (true normals, so the round body shades in one clean crescent); at night the middle
    // band glows and the red ends stay, a lit akachochin
    const rad = (t) => r * Math.max(0.5, Math.sin(Math.PI * t) ** 0.55);
    const part = (key, t0, t1) => {
      const pts = [];
      if (t0 === 0) pts.push([0, yb]);
      const m = Math.max(2, Math.round(8 * (t1 - t0)));
      for (let i = 0; i <= m; i++) { const t = t0 + ((t1 - t0) * i) / m; pts.push([rad(t), yb + h * t]); }
      if (t1 === 1) pts.push([0, yb + h]);
      slathe(key, pts, x, z, 18);
    };
    if (night) { part("lantern", 0, 0.25); part("glow", 0.25, 0.75); part("lantern", 0.75, 1); }
    else part("lantern", 0, 1);
    for (const t of [0.25, 0.5, 0.75]) { // rib bands
      const rr = rad(t) + 0.004, v = yb + h * t;
      lathe("dark", [[rr - 0.006, v - 0.007], [rr, v - 0.007], [rr, v + 0.007], [rr - 0.006, v + 0.007], [rr - 0.006, v - 0.007]], x, z, 14);
    }
  }
  for (const x of [-0.35, 0.85, 2.05]) lantern(x, BEAM.z, 1.78);
  lantern(-2.4, BEAM.z, 1.72, 0.15, 0.36);

  // ---------- meshes ----------
  const MAT = {
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 0],
    hinoki: [c.hinoki, c.hinokiShade, 0.1, 2.5],
    plaster: night ? [c.nightPlaster, c.nightPlasterShade, 0.1, 2.5] : [c.plaster, c.plasterShade, 0.1, 2.5],
    floor: [c.floor, c.floorShade, 0.1, 2.5],
    seam: [c.seam, c.seam, 0.1, 0],
    paper: [c.paper, c.paperShade, 0.1, 1.5],
    paperFlat: [c.paper, c.paper, 0.1, 0],
    lantern: [c.lantern, c.lanternShade, 0.1, 2],
    glow: [c.glow, c.glow, -0.25, 2],
    red: [c.red, c.redShade, 0.1, 1.5],
    china: [c.china, c.chinaShade, 0.1, 1.5],
    salmon: [c.salmon, c.salmonShade, 0.1, 1.5],
  };
  const geo = (arr) => {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    gm.computeVertexNormals();
    return gm;
  };
  const add = (key, gm) => {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(gm, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    set.add(mesh);
  };
  for (const [key, arr] of Object.entries(soups)) add(key, geo(arr));
  for (const [key, { pos, nor }] of Object.entries(smooth)) {
    const gm = new THREE.BufferGeometry();
    gm.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gm.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    add(key, gm);
  }

  function anchor(name, x, y, z) { const a = new THREE.Group(); a.name = name; a.position.set(x, y, z); set.add(a); joints[name] = a; }
  anchor("floor", 0, FT, 0);
  anchor("counter", (CT.x0 + CT.x1) / 2, CT.y, CT.z1 + 0.05);
  STOOLS.forEach(([x, z], i) => anchor("stool" + i, x, 0.68, z));

  function pose(name) {
    if (name !== "rest") throw new Error(`izakaya: unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}

// getabako.js - the school entrance shoe lockers (getabako) of every love-letter scene; one unit or a row.
// Contract: harness/lab/README.md. Meters, +Y up, the doors face +Z (toward the pupil at the entrance), the cabinet's
// left is +X, stands on y = 0, centred on x = 0, z = 0 (the footprint of the cabinets and their duckboards).
//
// Construction (flat-shaded boxes and quads, triangle soups merged per material across every unit, so a row of
// three is still eight meshes; every triangle is wound away from the centre of its box, never by hand):
//   CARCASS  a grey-green steel cabinet: two sides, a top slab, a recessed plinth, a back, and a grid of shelves and
//            dividers. Full-width shelves and full-height dividers cross inside one merged mesh (same material, so the
//            crossings never show). One dark quad in front of the back panel gives every open cubby its depth.
//   DOORS    one small steel door per cubby, inset in the face frame so a green line of frame shows between doors:
//            the grid is the identity cue. On each door a dark name-card holder with a pale card in it (top), a small
//            pull on the free edge and two vent slits (bottom): quads and a box with no hull (the colour is the line).
//            Doors hinge on their -X edge (the pupil's left) and swing out toward +Z: rotation.y = -angle.
//   OPEN     a door in `open` is built round its own pivot `door<i>` (one door mesh and one detail mesh), so a film
//            can swing it with pose() or door(a). Its cubby holds a pair of uwabaki and, for the first open door,
//            the love letter propped against the heels.
//   UWABAKI  indoor slippers stowed heel-out: a tapered white block each, a dark opening on top, a red heel band.
//   SUNOKO   the raised duckboard step in front: five slats across two bearers, as wide as the unit.
// Proportions (real size, base unit the cabinet height H = 1.8 m): width 1.1, depth 0.35; plinth 0.08 (toe kick
//   2 cm deep), top slab 0.025, sides 0.022, shelves and dividers 0.016; 5 x 6 cubbies at 0.211 x 0.283 m pitch;
//   doors 0.19 x 0.262 x 0.012, name card 0.11 x 0.04 (1/16 H, it survives the thumbnail as a dash); uwabaki
//   0.23 long, 0.08 wide; sunoko 0.057 high, 0.55 deep, 5 cm off the cabinet's front.
// Options: build(THREE, kit, colors, { cols, rows, doors, open, openDoor, hinge, angle, letter, count, sunoko, ink }).
//   cols, rows  cubby grid (default 5 x 6); the cabinet keeps its 1.1 x 1.8 m size, the cubbies resize.
//   doors       false: open cubbies, each with its uwabaki (a deterministic few empty) and a name card on the shelf lip.
//   open        door indices to swing open (row-major from the top-left as the pupil sees it, -X to +X; unit k's
//               doors follow unit k-1's). openDoor: n is open: [n]. angle: how far, degrees (default 105).
//   hinge       door indices that get a pivot but stay shut (for a film to open them).
//   letter      the love letter in the first open cubby (default true).
//   count       units side by side along X, 4 mm apart; one sunoko per unit. ink: hull factor (default 1, 0.7 for a row).
// Poses: rest (doors in `open` at `angle`), shut (every pivoted door closed), open (every pivoted door at `angle`);
//   door(a, i) sets pivot i (or all) to a degrees, absolute, for a film's swing.
// Budget: closed 5 x 6 unit 1226 triangles; one door open 1292; doors off 1842 (a row of three, one open, 3744).
// Ink in pixels: carcass 3.5, sunoko 2.5, doors and slippers 2, so the thin door edges stay steel at hero size. Hull
//   normals are each corner's octant from its box centre (all axes alike): the kit's per-triangle sums gave a box
//   uneven edges, and a straight-on view draws a diagonal push at 0.7 px per px, hence 2 px on the doors, not 1.5.
// Colours (meadow, the school building's script: its rooftop fence is the same green steel), base / shade:
//   carcass, sunoko bearers   iris #3f8a47 / hair #2c5131, threshold 0.1 (the front, dot 0.30, stays lit)
//   doors                     sky #d7ecef / line #a9d16e, threshold 0.1 (pale steel; the swung door's -X face is lime)
//   card holders, pulls, vents, cubby backs, uwabaki openings   hair #2c5131 flat (they are lines and holes)
//   name cards, letter        moon #f7f3e1 flat; uwabaki sclera #f6f3ee / sky #d7ecef; heel bands, seal accent #d9483b
//   sunoko slats              practical #f2c94c / skin #f0c2ae, threshold 0.35 (lit tops, the front edges pale skin)

export const meta = {
  name: "getabako",
  height: 1.8,
  script: "meadow",
  colors: {
    steel: "#3f8a47", steelShade: "#2c5131",
    door: "#d7ecef", doorShade: "#a9d16e",
    dark: "#2c5131", darkShade: "#2c5131",
    card: "#f7f3e1", cardShade: "#f7f3e1",
    shoe: "#f6f3ee", shoeShade: "#d7ecef",
    band: "#d9483b", bandShade: "#d9483b",
    slat: "#f2c94c", slatShade: "#f0c2ae",
  },
  poses: ["rest", "shut", "open"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { cols = 5, rows = 6, doors = true, angle = 105, letter = true, count = 1, sunoko = true } = opts;
  const { ink = count > 1 ? 0.7 : 1 } = opts;
  const NC = Math.max(1, Math.floor(cols)), NR = Math.max(1, Math.floor(rows)), NU = Math.max(1, Math.floor(count));
  const openSet = new Set([...(opts.open ?? []), ...(opts.openDoor !== undefined ? [opts.openDoor] : [])].map(Number));
  const hingeSet = new Set([...openSet, ...(opts.hinge ?? []).map(Number)]);
  const root = new THREE.Group();
  root.name = "getabako";
  const body = new THREE.Group();
  body.name = "body";
  root.add(body);
  const joints = {};

  // ---------- triangle soups, keyed "target|material", through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  let target = "body";
  let M = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    const len = Math.hypot(...n);
    if (len < 1e-12) return;
    const m = [0, 1, 2].map((i) => (a[i] + b[i] + e[i]) / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    n = n.map((x) => (flip ? -x : x) / len);
    const s = (soups[`${target}|${key}`] ??= { p: [], n: [], h: [] });
    for (const q of flip ? [a, e, b] : [a, b, e]) {
      v3.set(...q).applyMatrix4(M);
      s.p.push(v3.x, v3.y, v3.z);
      v3.set(...n).transformDirection(M);
      s.n.push(v3.x, v3.y, v3.z);
      // hull normal: the corner's octant from the solid's centre, every axis weighted alike, so a thin box gets
      // the same ink on all four edges (the kit's own sums weight a corner by how many triangles meet there)
      v3.set(...q.map((x, i) => Math.sign(Math.round((x - ref[i]) * 1e5)))).transformDirection(M);
      s.h.push(v3.x, v3.y, v3.z);
    }
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a flat rectangle in the plane z, facing +Z
  const panel = (key, x0, x1, y0, y1, z) => quad(key, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [0, 0, z - 1]);

  // ---------- one unit (local: back at z = 0, front at z = D, centred on x = 0) ----------
  const W = 1.1, H = 1.8, D = 0.35, PL = 0.08, TOP = 0.025, SIDE = 0.022, SH = 0.016, BK = 0.012;
  const pitchX = (W - 2 * SIDE + SH) / NC, pitchY = (H - TOP - PL + SH) / NR;
  const cellX = (col) => -W / 2 + SIDE - SH / 2 + (col + 0.5) * pitchX; // cubby centre
  const cellY = (row) => H - TOP + SH / 2 - (row + 0.5) * pitchY;
  const DW = pitchX - SH - 0.006, DH = pitchY - SH - 0.006, DT = 0.012;
  const hash = (i) => ((i * 2654435761) >>> 0) % 7;

  function carcass() {
    box("steel", -W / 2, -W / 2 + SIDE, 0, H - TOP, 0, D);
    box("steel", W / 2 - SIDE, W / 2, 0, H - TOP, 0, D);
    box("steel", -W / 2 - 0.004, W / 2 + 0.004, H - TOP, H, -0.004, D + 0.008); // top slab, a lip all round
    box("steel", -W / 2 + SIDE, W / 2 - SIDE, 0, PL, 0, D - 0.02); // plinth, toe kick
    box("steel", -W / 2 + SIDE, W / 2 - SIDE, PL - SH, H - TOP, 0, BK); // back
    for (let r = 0; r <= NR; r++) {
      const y = H - TOP - r * pitchY; // shelf tops step down from under the top slab to the plinth
      if (r === 0) continue;
      box("steel", -W / 2 + SIDE, W / 2 - SIDE, y - SH, y, BK, D);
    }
    for (let k = 1; k < NC; k++) {
      const x = -W / 2 + SIDE - SH / 2 + k * pitchX;
      box("steel", x - SH / 2, x + SH / 2, PL, H - TOP, BK, D);
    }
    panel("dark", -W / 2 + SIDE, W / 2 - SIDE, PL, H - TOP, BK + 0.001); // the cubby backs
  }

  // a door in its own frame: hinge at x = 0, z = 0 (the door's back face), it spans +X
  function doorLeaf() {
    const z1 = DT;
    box("door", 0, DW, -DH / 2, DH / 2, 0, z1);
    const cx = DW / 2, f = z1 + 0.0012, cy = DH / 2 - 0.045;
    panel("dark", cx - 0.055, cx + 0.055, cy - 0.02, cy + 0.02, f); // name-card holder
    panel("card", cx - 0.047, cx + 0.047, cy - 0.014, cy + 0.012, f + 0.0012); // the card, a dark lip under it
    for (const vy of [-DH / 2 + 0.045, -DH / 2 + 0.062]) panel("dark", cx - 0.045, cx + 0.045, vy - 0.0035, vy + 0.0035, f);
    box("dark", DW - 0.03, DW - 0.012, -0.022, 0.022, z1, z1 + 0.013); // pull on the free edge
  }

  function shoes(x, y, withLetter) {
    const L = 0.23, zh = D - 0.015, zt = zh - L; // heel at the front
    for (const s of [-1, 1]) {
      const cx = x + s * 0.044, hw = 0.04, tw = 0.032, hh = 0.05, th = 0.065;
      hex("shoe", [[cx - hw, y, zh], [cx + hw, y, zh], [cx + tw, y, zt], [cx - tw, y, zt],
        [cx - hw + 0.004, y + hh, zh], [cx + hw - 0.004, y + hh, zh], [cx + tw - 0.006, y + th, zt], [cx - tw + 0.006, y + th, zt]]);
      const oy = y + hh + 0.001, slope = (th - hh) / L;
      quad("dark", [cx - hw + 0.012, oy + 0.01 * slope, zh - 0.01], [cx + hw - 0.012, oy + 0.01 * slope, zh - 0.01],
        [cx + hw - 0.014, oy + 0.13 * slope, zh - 0.13], [cx - hw + 0.014, oy + 0.13 * slope, zh - 0.13], [cx, y, zh - 0.07]);
      box("band", cx - hw - 0.0015, cx + hw + 0.0015, y - 0.001, y + 0.014, zh - 0.045, zh + 0.002); // heel band (rubber)
    }
    if (!withLetter) return;
    // the love letter, laid on the slippers: front edge on the heel collars, leaning back toward the toes
    const lw = 0.065, ly = y + 0.053, lz = zh - 0.004, rise = 0.06, back = 0.08, t = 0.004;
    hex("card", [[x - lw, ly, lz], [x + lw, ly, lz], [x + lw, ly + t, lz + 0.002], [x - lw, ly + t, lz + 0.002],
      [x - lw, ly + rise, lz - back], [x + lw, ly + rise, lz - back], [x + lw, ly + rise + t, lz - back + 0.002], [x - lw, ly + rise + t, lz - back + 0.002]]);
    const u = 0.5, sy = ly + t + rise * u + 0.0015, sz = lz + 0.002 - back * u + 0.001, e = 0.011, dy = (e * rise) / Math.hypot(rise, back), dz = (e * back) / Math.hypot(rise, back);
    quad("band", [x - e, sy - dy, sz + dz], [x + e, sy - dy, sz + dz], [x + e, sy + dy, sz - dz], [x - e, sy + dy, sz - dz], [x, sy - 0.05, sz - 0.05]);
  }

  function duckboard() {
    const z0 = D + 0.05, z1 = D + 0.6, sw = W, bh = 0.035, st = 0.022;
    for (const z of [z0 + 0.06, z1 - 0.06]) box("steel", -sw / 2 + 0.03, sw / 2 - 0.03, 0, bh, z - 0.025, z + 0.025);
    const n = 5, gap = 0.016, slatD = (z1 - z0 - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) {
      const z = z0 + i * (slatD + gap);
      box("slat", -sw / 2, sw / 2, bh, bh + st, z, z + slatD);
    }
  }

  // ---------- assemble: units along X, pivoted doors as their own groups ----------
  const pivots = [];
  let firstOpen = true;
  const UX = W + 0.004;
  for (let u = 0; u < NU; u++) {
    const ux = (u - (NU - 1) / 2) * UX;
    M = new THREE.Matrix4().makeTranslation(ux, 0, -D / 2 - 0.3); // whole footprint (0..D+0.6) centred on z = 0
    const unitM = M.clone();
    carcass();
    if (sunoko) duckboard();
    for (let r = 0; r < NR; r++)
      for (let col = 0; col < NC; col++) {
        const idx = u * NR * NC + r * NC + col, x = cellX(col), y = cellY(r), floor = y - pitchY / 2 + SH / 2;
        if (!doors) {
          if (hash(idx + 3) !== 0) shoes(x, floor, false);
          panel("dark", x - 0.05, x + 0.05, floor - SH + 0.002, floor - 0.002, D + 0.0012);
          panel("card", x - 0.044, x + 0.044, floor - SH + 0.004, floor - 0.004, D + 0.0024);
          continue;
        }
        if (openSet.has(idx)) { shoes(x, floor, letter && firstOpen); firstOpen = false; }
        const hx = x - DW / 2, hz = D + 0.001;
        if (!hingeSet.has(idx)) {
          M = unitM.clone().multiply(new THREE.Matrix4().makeTranslation(hx, y, hz));
          doorLeaf();
          M = unitM;
          continue;
        }
        const pivot = new THREE.Group();
        pivot.name = `door${idx}`;
        pivot.position.set(hx, y, hz).applyMatrix4(unitM);
        body.add(pivot);
        joints[pivot.name] = pivot;
        pivots.push({ pivot, idx });
        target = pivot.name;
        M = new THREE.Matrix4();
        doorLeaf();
        target = "body";
        M = unitM;
      }
  }

  // ---------- meshes: one per material per target ----------
  const MAT = {
    steel: [c.steel, c.steelShade, 0.1, 3.5],
    door: [c.door, c.doorShade, 0.1, 2],
    dark: [c.dark, c.darkShade, 0.1, 0],
    card: [c.card, c.cardShade, 0.1, 0],
    shoe: [c.shoe, c.shoeShade, 0.1, 2],
    band: [c.band, c.bandShade, 0.1, 0],
    slat: [c.slat, c.slatShade, 0.35, 2.5],
  };
  for (const [k, { p, n, h }] of Object.entries(soups)) {
    const [tname, key] = k.split("|");
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute("hullNormal", new THREE.Float32BufferAttribute(h, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px: Math.max(1, px * ink) } : { threshold, outline: false });
    mesh.name = tname === "body" ? key : `${tname}-${key}`;
    (tname === "body" ? body : joints[tname]).add(mesh);
  }

  // ---------- poses: +a degrees swings a door open (its -X hinge, out toward +Z): rotation.y = -a ----------
  const RAD = Math.PI / 180;
  function door(a, i) {
    for (const { pivot, idx } of pivots) if (i === undefined || i === idx) pivot.rotation.set(0, -a * RAD, 0);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    if (!["rest", "shut", "open"].includes(name)) throw new Error(`unknown pose "${name}" (rest, shut, open)`);
    for (const { pivot, idx } of pivots) {
      const a = name === "open" || (name === "rest" && openSet.has(idx)) ? angle : 0;
      pivot.rotation.set(0, -a * RAD, 0);
    }
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, door };
}

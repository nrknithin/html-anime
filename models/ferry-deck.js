// ferry-deck.js - the open upper deck of a small island ferry from summer anime, a section of it at real size: the
// green-painted deck behind a white railing with red lifebuoys hung on it, a row of fixed benches facing the sea, the
// white cabin wall with portholes and a door, a funnel stub and a mast with a flag on the cabin roof, and a band of
// sea along the hull with wake foam.
// Contract: harness/lab/README.md. Meters, +Y up, the railing side faces +Z (toward the sea and the camera), the bow
// is +X (the model's left), stands on y = 0 (the sea), centred on x = 0, z = 0 (the deck's middle).
//
// Construction (boxes, elliptical lathes, tori, prisms and tubes as triangle soups merged per material, so the whole
// section is 10 meshes at any length; every triangle is wound away from a point inside its solid, never by hand):
//   HULL     the topsides as one white box from the waterline to the deck, a red boot band at the waterline and a dark
//            rubbing strake; the deck a green slab on top with a white toe rail along the edge. The section's cut ends
//            are left square, like a set.
//   RAILING  square posts every ~1.1 m, a heavy top rail and two mid rails, all white boxes; two (or more) red
//            lifebuoys with four white straps hung on the outside of the rail.
//   SEATING  fixed benches (seat, two-slat back, dark end frames) facing the sea; the cabin wall behind them, white,
//            with round portholes (white rims standing proud, dark glass), a door (dark frame, pale leaf, dark window,
//            a coaming) and a roof slab with an overhang.
//   ROOF     a raked elliptical funnel stub (white, red band, dark top) near the stern end; a mast with a yard and a
//            ball cap near the bow end, a red flag at its head.
//   SEA      a pale slab along the hull; the wake is foam blobs (flat ellipse prisms) in three bands, densest at the
//            hull, plus a static strip at the waterline.
//   MOVING   flag and foam are one mesh each whose vertices pose() rewrites (the ufo-catcher's owner trick): the flag
//            stores every vertex's (u, v, side) on the cloth and is re-evaluated as a travelling wave, the foam stores
//            each vertex's blob centre and offset, and the blob slides to -X (the ferry steams to +X), wrapping at the
//            ends and shrinking to nothing at them so nothing pops or overhangs the cut.
// Proportions (real size; base unit the freeboard F = 1.2 m): deck top 1.25 (sea top 0.04), railing 1.0 above the
//   deck, deck 3.2 deep (edge z 1.6, cabin face z -1.6), sea band 2.0 wide to z 3.6. Benches seat 0.45, back 0.88,
//   1.8 long. Cabin wall 2.2 tall to 3.45, roof to 3.55, portholes r 0.22 at 2.5 every 1.0 m, door 0.8 x 1.9.
//   Funnel 1.0 x 0.76 to 4.75; mast to 6.4, ball cap top 6.51; flag 0.95 x 0.6. Lifebuoy 0.76 across.
// Options: build(THREE, kit, colors, { height, length }).
//   height  scales everything uniformly so the ball cap's top is `height` (default 6.51 m).
//   length  the section's length along X, 4..20 (default 8 m); posts, benches, portholes, lifebuoys and foam refill it.
// Joints: flag (the flag's luff at the mast head), funnel, mast.
// Clips: { sail: 4 } (build() returns clips; pose("sail@1.5")): the flag flaps six waves through in 4 s and the wake
//   foam scrolls one section length to -X in 4 s, so the clip loops seamlessly. rest is sail@0.
// Budget: ~4.6k triangles at the default length (7.3k at length 14), 10 meshes.
// Colours (meadow): white paint (hull, cabin, rails, posts, mast, funnel, rims, straps) sclera #f6f3ee / sky #d7ecef;
//   benches moon #f7f3e1 / sky; deck iris #3f8a47 / hair #2c5131; red (boot band, lifebuoys, funnel band, flag)
//   accent #d9483b / hair; door leaf sky / hair; dark (strake, bench frames, funnel top) hair flat; glass and door
//   frame hair flat, no hull; sea sky flat; foam sclera flat with a thin hull. Pale parts use threshold 0.1 so the
//   camera-facing +Z faces stay lit, as the torii's and house's do.

export const meta = {
  name: "ferry-deck",
  height: 6.51,
  script: "meadow",
  colors: {
    white: "#f6f3ee", whiteShade: "#d7ecef",
    bench: "#f7f3e1", benchShade: "#d7ecef",
    deck: "#3f8a47", deckShade: "#2c5131",
    red: "#d9483b", redShade: "#2c5131",
    door: "#d7ecef", doorShade: "#2c5131",
    dark: "#2c5131",
    sea: "#d7ecef",
    foam: "#f6f3ee",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = meta.height;
  const height = opts.height ?? NATURAL;
  const L = Math.max(4, Math.min(20, opts.length ?? 8));
  const HL = L / 2;
  const TAU = Math.PI * 2;
  const root = new THREE.Group();
  root.name = "ferry-deck";
  const body = new THREE.Group();
  body.name = "ferry";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};

  // ---------- triangle soups ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = null; // per-vertex record for the moving soups
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    n = nrm(flip ? mul(n, -1) : n);
    const s = S(key);
    const vs = flip ? [[a, na], [e, ne], [b, nb]] : [[a, na], [b, nb], [e, ne]];
    for (const [q, nq] of vs) s.p.push(...q), s.n.push(...(nq ?? n)), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function box(key, x0, x1, y0, y1, z0, z1) {
    const p = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  // cylinder along Z: centre (x, y), z0..z1, radius r, capped
  function cylZ(key, x, y, z0, z1, r, seg = 16) {
    const ref = [x, y, (z0 + z1) / 2];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      const [c0, s0, c1, s1] = [Math.cos(a0), Math.sin(a0), Math.cos(a1), Math.sin(a1)];
      const b0 = [x + r * c0, y + r * s0, z0], b1 = [x + r * c1, y + r * s1, z0];
      const t0 = [x + r * c0, y + r * s0, z1], t1 = [x + r * c1, y + r * s1, z1];
      const n0 = [c0, s0, 0], n1 = [c1, s1, 0];
      tri(key, b0, b1, t1, ref, n0, n1, n1);
      tri(key, b0, t1, t0, ref, n0, n1, n0);
      tri(key, [x, y, z1], t0, t1, ref);
      tri(key, [x, y, z0], b0, b1, ref);
    }
  }
  // flat disc facing +Z at (x, y, z), radius r (single-sided)
  function discZ(key, x, y, z, r, seg = 16) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      tri(key, [x, y, z], [x + r * Math.cos(a0), y + r * Math.sin(a0), z], [x + r * Math.cos(a1), y + r * Math.sin(a1), z], [x, y, z - 1]);
    }
  }
  // elliptical lathe on the Y axis: rings [y, rx, rz, cx] with a material per band, capped top and bottom
  function lathe(rings, z, keys, seg = 18, capTop = keys[keys.length - 1]) {
    const pt = (R, a) => [R[3] + R[1] * Math.cos(a), R[0], z + R[2] * Math.sin(a)];
    const nm = (R, a) => nrm([Math.cos(a) / R[1], 0, Math.sin(a) / R[2]]);
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1];
      const ref = [(A[3] + B[3]) / 2, (A[0] + B[0]) / 2, z];
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
        tri(keys[k], pt(A, a0), pt(A, a1), pt(B, a1), ref, nm(A, a0), nm(A, a1), nm(B, a1));
        tri(keys[k], pt(A, a0), pt(B, a1), pt(B, a0), ref, nm(A, a0), nm(B, a1), nm(B, a0));
      }
    }
    const T = rings[rings.length - 1], Bm = rings[0];
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      tri(capTop, [T[3], T[0], z], pt(T, a0), pt(T, a1), [T[3], T[0] - 1, z]);
      tri(keys[0], [Bm[3], Bm[0], z], pt(Bm, a0), pt(Bm, a1), [Bm[3], Bm[0] + 1, z]);
    }
  }
  // flat prism from a 2D outline in XZ (star-shaped about its centroid), y0..y1
  function prismY(key, pts, y0, y1) {
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const ref = [cx, (y0 + y1) / 2, cz];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      tri(key, [cx, y1, cz], [a[0], y1, a[1]], [b[0], y1, b[1]], ref);
      tri(key, [cx, y0, cz], [a[0], y0, a[1]], [b[0], y0, b[1]], ref);
      quad(key, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], ref);
    }
  }
  // tube through points, radius r, closed with cone caps
  function tube(key, pts, r, seg = 8) {
    const rings = pts.map((P, i) => {
      const T = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const t = nrm(cross(T, Math.abs(T[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), s = cross(T, t);
      return Array.from({ length: seg }, (_, j) => {
        const a = (j / seg) * TAU, d = add(mul(t, Math.cos(a)), mul(s, Math.sin(a)));
        return [add(P, mul(d, r)), d];
      });
    });
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < seg; j++) {
        const [a, b, e, d] = [rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j]];
        const ref = mul(add(pts[i], pts[i + 1]), 0.5);
        tri(key, a[0], b[0], e[0], ref, a[1], b[1], e[1]);
        tri(key, a[0], e[0], d[0], ref, a[1], e[1], d[1]);
      }
    for (const [k, dir] of [[0, -1], [rings.length - 1, 1]]) {
      const P = pts[k], T = nrm(sub(pts[Math.min(k + 1, pts.length - 1)], pts[Math.max(k - 1, 0)])), tip = add(P, mul(T, dir * r * 0.6));
      for (let j = 0; j < seg; j++) tri(key, rings[k][j][0], rings[k][(j + 1) % seg][0], tip, sub(P, mul(T, dir * r)));
    }
  }
  function ball(key, C, r, seg = 10, rows = 6) {
    const pt = (th, ph) => {
      const u = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      return [add(C, mul(u, r)), u];
    };
    for (let k = 0; k < rows; k++)
      for (let i = 0; i < seg; i++) {
        const t0 = (k / rows) * Math.PI, t1 = ((k + 1) / rows) * Math.PI, p0 = (i / seg) * TAU, p1 = ((i + 1) / seg) * TAU;
        const [a, b, e, d] = [pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)];
        if (k > 0) tri(key, a[0], b[0], e[0], C, a[1], b[1], e[1]);
        if (k < rows - 1) tri(key, a[0], e[0], d[0], C, a[1], e[1], d[1]);
      }
  }
  const hash = (i) => {
    let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- hull and deck ----------
  const DECK = 1.25, ZE = 1.6, ZC = -1.6, ZB = -2.6, SEA = 0.04, ZS = 3.6;
  box("white", -HL, HL, 0, 1.2, ZB, ZE);                              // topsides
  box("red", -HL - 0.01, HL + 0.01, 0, 0.32, ZB, ZE + 0.012);          // boot band at the waterline
  box("dark", -HL - 0.012, HL + 0.012, 0.86, 0.94, ZE - 0.02, ZE + 0.045); // rubbing strake
  box("deck", -HL, HL, 1.2, DECK, ZC - 0.02, ZE - 0.12);               // painted deck
  box("white", -HL, HL, 1.2, 1.31, ZE - 0.12, ZE + 0.01);              // toe rail / deck edge

  // ---------- railing ----------
  const RZ = ZE - 0.06, RT = DECK + 1.0;
  const nPost = Math.max(3, Math.round(L / 1.1) + 1);
  const postX = Array.from({ length: nPost }, (_, i) => -HL + 0.06 + (i * (L - 0.12)) / (nPost - 1));
  for (const x of postX) box("white", x - 0.03, x + 0.03, 1.31, RT - 0.04, RZ - 0.03, RZ + 0.03);
  box("white", -HL, HL, RT - 0.06, RT + 0.01, RZ - 0.05, RZ + 0.05);   // top rail (the hand rail)
  for (const y of [DECK + 0.36, DECK + 0.66]) box("white", -HL, HL, y - 0.02, y + 0.02, RZ - 0.022, RZ + 0.022);

  // lifebuoys on the outside of the rail: red tori with four white straps
  const nBuoy = Math.max(1, Math.round(L / 4.5));
  const BR = 0.29, Br = 0.085, BZ = RZ + 0.05 + Br, BY = DECK + 0.6;
  function buoy(x) {
    const C = [x, BY, BZ], SEG = 32, SIDES = 8;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * TAU, a1 = ((i + 1) / SEG) * TAU, am = (a0 + a1) / 2;
      const q = ((am / (Math.PI / 2)) % 1 + 1) % 1;                     // position within each quarter
      const key = Math.abs(q - 0.5) < 0.09 ? "white" : "red";
      for (let j = 0; j < SIDES; j++) {
        const b0 = (j / SIDES) * TAU, b1 = ((j + 1) / SIDES) * TAU;
        const P = (a, b) => [C[0] + (BR + Br * Math.cos(b)) * Math.cos(a), C[1] + (BR + Br * Math.cos(b)) * Math.sin(a), C[2] + Br * Math.sin(b)];
        const N = (a, b) => [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
        const ref = [C[0] + BR * Math.cos(am), C[1] + BR * Math.sin(am), C[2]];
        tri(key, P(a0, b0), P(a1, b0), P(a1, b1), ref, N(a0, b0), N(a1, b0), N(a1, b1));
        tri(key, P(a0, b0), P(a1, b1), P(a0, b1), ref, N(a0, b0), N(a1, b1), N(a0, b1));
      }
    }
    box("white", x - 0.025, x + 0.025, BY + BR - 0.02, RT - 0.03, RZ + 0.04, BZ - Br * 0.5); // lashing to the rail
  }
  const gap = (L - 0.12) / (nPost - 1);
  for (let k = 0; k < nBuoy; k++) {
    const i = Math.round(((k + 0.5) / nBuoy) * (nPost - 1) - 0.5);
    buoy(postX[Math.max(0, Math.min(nPost - 2, i))] + gap / 2);
  }

  // ---------- benches ----------
  const nBench = Math.max(1, Math.floor((L - 0.8) / 2.4));
  const BL = 1.8, SZ0 = -1.02, SZ1 = -0.58, SY = DECK + 0.45;
  for (let k = 0; k < nBench; k++) {
    const x = -HL + ((k + 0.5) * L) / nBench;
    box("bench", x - BL / 2, x + BL / 2, SY - 0.05, SY, SZ0, SZ1);              // seat
    box("bench", x - BL / 2, x + BL / 2, SY + 0.12, SY + 0.22, SZ0 - 0.02, SZ0 + 0.03); // back slats
    box("bench", x - BL / 2, x + BL / 2, SY + 0.3, SY + 0.4, SZ0 - 0.04, SZ0 + 0.01);
    for (const ex of [x - BL / 2 + 0.12, x + BL / 2 - 0.12]) {
      box("dark", ex - 0.03, ex + 0.03, DECK, SY - 0.05, SZ1 - 0.08, SZ1 - 0.02);   // front leg
      box("dark", ex - 0.03, ex + 0.03, DECK, SY + 0.42, SZ0 - 0.1, SZ0 - 0.04);    // back leg and back post
      box("dark", ex - 0.03, ex + 0.03, DECK + 0.12, DECK + 0.17, SZ0 - 0.06, SZ1 - 0.04); // foot rail
    }
  }

  // ---------- cabin wall, door, portholes, roof ----------
  const WT = 3.45;
  box("white", -HL, HL, DECK, WT, ZB, ZC);
  box("white", -HL, HL, WT, WT + 0.1, ZB - 0.04, ZC + 0.16);           // roof slab with an overhang
  box("dark", -HL, HL, WT - 0.03, WT, ZC, ZC + 0.12);                  // shadow line under the overhang
  const DX = Math.min(HL - 0.9, L * 0.12 + 0.3), DW = 0.4, DT = DECK + 1.9;
  box("darkFlat", DX - DW - 0.07, DX + DW + 0.07, DECK + 0.12, DT + 0.07, ZC, ZC + 0.02); // door frame
  box("door", DX - DW, DX + DW, DECK + 0.15, DT, ZC, ZC + 0.04);                          // leaf
  box("darkFlat", DX - 0.16, DX + 0.16, DECK + 1.25, DECK + 1.65, ZC + 0.04, ZC + 0.045); // window
  box("dark", DX + DW - 0.14, DX + DW - 0.06, DECK + 0.95, DECK + 1.0, ZC + 0.04, ZC + 0.09); // handle
  box("white", DX - DW - 0.07, DX + DW + 0.07, DECK, DECK + 0.15, ZC, ZC + 0.08);       // coaming
  const PY = DECK + 1.25;
  for (let x = -HL + 0.5; x < HL - 0.3; x += 1.0) {
    if (Math.abs(x - DX) < DW + 0.4) continue;
    cylZ("white", x, PY, ZC - 0.02, ZC + 0.06, 0.22, 18);
    discZ("darkFlat", x, PY, ZC + 0.062, 0.155, 18);
  }

  // ---------- funnel stub ----------
  const FX = -HL + Math.min(1.4, L * 0.18), FZ = -2.1, RAKE = -0.18;
  const fy = (y) => [y, 0.5 - (y - WT) * 0.04, 0.38 - (y - WT) * 0.03, FX + RAKE * ((y - WT - 0.1) / 1.1)];
  const funnel = new THREE.Object3D();
  funnel.name = "funnel";
  funnel.position.set(FX, WT + 0.1, FZ);
  body.add(funnel);
  joints.funnel = funnel;
  lathe([fy(WT + 0.1), fy(4.25), fy(4.5), fy(4.62), fy(4.75)], FZ, ["white", "red", "white", "dark"], 20);

  // ---------- mast ----------
  const MX = HL - Math.min(1.3, L * 0.16), MZ = -2.1, MTOP = 6.4;
  const mast = new THREE.Object3D();
  mast.name = "mast";
  mast.position.set(MX, WT + 0.1, MZ);
  body.add(mast);
  joints.mast = mast;
  lathe([[WT + 0.1, 0.12, 0.12, MX], [WT + 0.3, 0.12, 0.12, MX], [WT + 0.34, 0.06, 0.06, MX], [MTOP, 0.045, 0.045, MX]], MZ, ["white", "white", "white"], 10);
  ball("white", [MX, MTOP + 0.035, MZ], 0.075, 10, 6);
  tube("white", [[MX, 5.45, MZ - 0.6], [MX, 5.45, MZ + 0.6]], 0.03, 6);   // yard

  // ---------- flag: one mesh, every vertex keeps its (u, v, side) on the cloth ----------
  const FW = 0.95, FH = 0.6, FT = 0.018, FY = MTOP - 0.04, NU = 12, NV = 4;
  const flagJ = new THREE.Object3D();
  flagJ.name = "flag";
  flagJ.position.set(MX - 0.05, FY, MZ);
  body.add(flagJ);
  joints.flag = flagJ;
  const flagRest = (u, v, s) => [MX - 0.05 - u * FW, FY - v * FH, MZ + s * FT / 2];
  const flagRef = flagRest(0.5, 0.5, 0);
  function flagTri(A, B, E) {
    owner = null;
    const pa = flagRest(...A), pb = flagRest(...B), pe = flagRest(...E);
    let n = cross(sub(pb, pa), sub(pe, pa));
    const flip = dot(n, sub(mul(add(add(pa, pb), pe), 1 / 3), flagRef)) < 0;
    const s = S("flag");
    for (const q of flip ? [A, E, B] : [A, B, E]) s.p.push(...flagRest(...q)), s.n.push(0, 0, q[2]), s.o.push(q);
  }
  const fq = (A, B, E, D) => (flagTri(A, B, E), flagTri(A, E, D));
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++) {
      const [u0, u1, v0, v1] = [i / NU, (i + 1) / NU, j / NV, (j + 1) / NV];
      for (const s of [-1, 1]) fq([u0, v0, s], [u1, v0, s], [u1, v1, s], [u0, v1, s]);
    }
  for (let i = 0; i < NU; i++) {
    const [u0, u1] = [i / NU, (i + 1) / NU];
    for (const v of [0, 1]) fq([u0, v, -1], [u1, v, -1], [u1, v, 1], [u0, v, 1]);
  }
  for (let j = 0; j < NV; j++) {
    const [v0, v1] = [j / NV, (j + 1) / NV];
    for (const u of [0, 1]) fq([u, v0, -1], [u, v1, -1], [u, v1, 1], [u, v0, 1]);
  }

  // ---------- sea and wake foam ----------
  owner = null;
  box("sea", -HL, HL, 0, SEA, ZE, ZS);
  const FOAM0 = SEA - 0.004, FOAM1 = SEA + 0.012;
  owner = null;
  box("foam", -HL, HL, FOAM0, FOAM1, ZE, ZE + 0.07);                   // static strip at the waterline
  const ellipse = (rx, rz, k = 12) => Array.from({ length: k }, (_, i) => [rx * Math.cos((i / k) * TAU), rz * Math.sin((i / k) * TAU)]);
  const BANDS = [
    { step: 0.42, z0: 0.1, z1: 0.32, rx: [0.26, 0.5], rz: [0.08, 0.15] },
    { step: 0.75, z0: 0.45, z1: 0.85, rx: [0.2, 0.38], rz: [0.05, 0.1] },
    { step: 1.3, z0: 0.95, z1: 1.8, rx: [0.12, 0.26], rz: [0.035, 0.07] },
  ];
  let seed = 1;
  BANDS.forEach((B) => {
    const n = Math.max(2, Math.round(L / B.step));
    for (let i = 0; i < n; i++, seed++) {
      const h = (k) => hash(seed * 7 + k);
      const cx = -HL + ((i + 0.3 + h(1) * 0.4) * L) / n;
      const cz = ZE + B.z0 + h(2) * (B.z1 - B.z0);
      const rx = B.rx[0] + h(3) * (B.rx[1] - B.rx[0]), rz = B.rz[0] + h(4) * (B.rz[1] - B.rz[0]);
      owner = { cx, cz, rx };
      const lift = (seed % 5) * 0.003;                                    // stagger so overlapping blobs never z-fight
      prismY("foam", ellipse(rx, rz).map(([x, z]) => [cx + x, cz + z]), FOAM0 + lift, FOAM1 + lift);
    }
  });
  owner = null;

  // ---------- meshes: one per material ----------
  const MAT = {
    white: [c.white, c.whiteShade, 0.1, 3], bench: [c.bench, c.benchShade, 0.1, 3], deck: [c.deck, c.deckShade, 0.1, 3],
    red: [c.red, c.redShade, 0.1, 3], door: [c.door, c.doorShade, 0.1, 3], dark: [c.dark, c.dark, -1, 2],
    darkFlat: [c.dark, c.dark, -1, 0], sea: [c.sea, c.sea, -1, 3], foam: [c.foam, c.foam, -1, 2],
    flag: [c.red, c.redShade, -0.2, 3],
  };
  const live = {};
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [b, s, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, b, s, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
    if (key === "flag" || key === "foam") {
      mesh.frustumCulled = false;
      live[key] = { mesh, base: Float32Array.from(p), o };
    }
  }

  // ---------- clip: flag flap and wake scroll ----------
  const T = 4, WAVES = 6;
  const CLIPS = { sail: T };
  function flagAt(t) {
    const { mesh, o } = live.flag, g = mesh.geometry, P = g.attributes.position.array;
    const ph = (WAVES * t) / T;
    for (let v = 0; v < o.length; v++) {
      const [u, w, s] = o[v];
      const amp = 0.11 * Math.pow(u, 1.1);
      const wave = Math.sin(TAU * (1.4 * u - ph) + 0.6 * w);
      const dz = amp * wave + 0.03 * u * Math.sin(TAU * (0.7 * u - ph / 2));
      const x = MX - 0.05 - u * FW * (1 - 0.05 * Math.abs(wave) * u);
      const y = FY - w * FH - 0.05 * u * u;
      P.set([x, y, MZ + dz + s * FT / 2], v * 3);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    if (g.attributes.hullNormal) {
      const old = g.attributes.hullNormal;
      g.deleteAttribute("hullNormal");
      kit.hullNormals(g);
      old.array.set(g.attributes.hullNormal.array);
      old.needsUpdate = true;
      g.setAttribute("hullNormal", old);
    }
    g.computeBoundingSphere(), g.computeBoundingBox();
  }
  function foamAt(t) {
    if (!live.foam) return;
    const { mesh, base, o } = live.foam, g = mesh.geometry, P = g.attributes.position.array;
    const d = (L * (((t % T) + T) % T)) / T;
    for (let v = 0; v < o.length; v++) {
      const rec = o[v], i = v * 3;
      if (!rec) continue;
      const x = -HL + ((((rec.cx + HL - d) % L) + L) % L);
      const edge = Math.min(x + HL, HL - x);
      const k = Math.max(0, Math.min(1, edge / (rec.rx + 0.04)));
      const s = k * k * (3 - 2 * k);
      P[i] = x + (base[i] - rec.cx) * s;
      P[i + 2] = rec.cz + (base[i + 2] - rec.cz) * s;
    }
    g.attributes.position.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
  }
  function sail(t) {
    flagAt(t);
    foamAt(t);
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`ferry-deck: no clip "${m[1]}" (clips: sail)`);
      return sail(+m[2]);
    }
    if (name !== "rest") throw new Error(`ferry-deck: unknown pose "${name}" (rest, or sail@<seconds>)`);
    sail(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

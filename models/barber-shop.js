// barber-shop.js - an old neighbourhood barber (tokoya) of every anime shopping street, as a cutaway set piece at real
// size, with one clip: the red-white-blue barber pole by the door turning, its stripes spiralling up for ever.
// Contract: harness/lab/README.md. Meters, +Y up, the street front (glass door, pole) faces +Z; the shop is cut away
// on the +X side and on the +Z front right of the door, so the lab's front-left cameras look in past the pole. The
// back wall (the mirror wall) is -Z, the waiting wall -X. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, vertical cylinders, tilted slabs and helical bands, all triangle soups merged per material, so
// the whole shop is 12 meshes; boxes are flat-shaded, cylinders and bands carry radial normals). Every triangle is
// wound away from a point inside its solid (box centre, cylinder axis), never by hand.
//   SHELL     a floor slab with a black-and-white checker of 0.4 m tiles, a pavement strip outside the front, the back
//             and -X walls and the front facade as boxes 12 cm thick with dark caps on the cut tops and ends, a dark
//             wainscot rail round the lower walls. The facade runs only from the -X corner to just past the door.
//   FRONT     the glass front door in its opening: a dark aluminium frame, dark glass with two highlight streaks, a
//             chrome push bar and a blank hanging plate; a short canopy over it. The barber pole stands proud of the
//             facade beside the door on two chrome brackets: chrome caps and a dome, the striped barrel between.
//   MIRROR    the long mirror on the back wall in a wood frame (dark glass and highlight streaks, as anime paints a
//             mirror at night), a chrome ledge under it with a row of tonic bottles, a wood counter below with drawer
//             seams and a chrome top, a white wash basin with a chrome tap and spray in the counter between the chairs.
//   CHAIRS    two heavy hydraulic chairs facing the mirror: chrome foot disc and hydraulic column with a pump pedal, a
//             white enamel body, a red vinyl seat, a reclining back with a headrest on a chrome stem, two armrests on
//             chrome posts and a chrome footrest plate.
//   AROUND    a waiting bench along the -X wall with a pile of magazines and one lying open; a standing coat rack between
//             the bench and the counter with a coat and a hat on its hooks; a wall clock over the bench.
// Proportions (real size, base unit the wall height H = 2.6 m): interior 4.4 (x) by 3.2 (z); counter 0.78 high,
//   0.45 deep; mirror 1.0-1.9 over the floor, 3.6 long; chair seat 0.56, back top 1.32, foot disc 0.6 across, chairs
//   2.0 apart; bench seat 0.42; door 0.85 x 2.05; pole barrel 0.8 long, 0.19 across, at 1.1-1.9.
// Options: build(THREE, kit, colors, { height }): height scales the whole shop uniformly so the wall top is `height`
//   (default 2.6 m).
// Clip `spin` (3 s, loops): the pole joint turns one full revolution about its axis (counter-clockwise from above), so
//   the helical stripes climb the barrel; at 3 s it is back where it began. pose("spin@1.2"); rest is spin@0.
// Joints: pole (the barrel, rotation y). It holds no meshes: the stripes live in their material's meshes, and pose()
//   rewrites that vertex range (positions, normals) through the joint's matrix.
// Budget: ~9k triangles (5.1k of them the pole stripes, fine enough that the inked core 1.5 mm inside never pokes
//   through), 12 meshes. Ink in pixels: shell 3, furniture 2.5, small parts 2 (a room is seen small).
// Colours (festival, the warm night script), base / shade:
//   walls                    line #fff1ea / moon #ffd7a1 at threshold 0.45 (-X wall lit, back wall in its shade)
//   wood (counter, frames, bench, rack, wainscot, canopy)   practical #ffb020 / accent #ff4d6d
//   dark (caps, door frame, slab, rack feet, coat)          sky #24143a, inked; glass, seams, dark tiles sky flat
//   tiles, basin well rim     sclera #f6f3ee flat; pavement moon #ffd7a1 flat
//   chrome, enamel            sclera #f6f3ee / skin #f0c2ae
//   vinyl (seats, plate)      accent #ff4d6d / sky #24143a
//   streaks                   line #fff1ea glowing; pole stripes accent / sclera / sky glowing (the pole is lit inside)

export const meta = {
  name: "barber-shop",
  height: 2.6,
  script: "festival",
  colors: {
    wall: "#fff1ea", wallShade: "#ffd7a1",
    wood: "#ffb020", woodShade: "#ff4d6d",
    dark: "#24143a",
    tile: "#f6f3ee", pave: "#ffd7a1",
    chrome: "#f6f3ee", chromeShade: "#f0c2ae",
    vinyl: "#ff4d6d", vinylShade: "#24143a",
    glow: "#fff1ea",
    red: "#ff4d6d", white: "#f6f3ee", blue: "#24143a",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 2.6;
  const { height = NATURAL } = opts;
  const root = new THREE.Group();
  root.name = "barber-shop";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / NATURAL);
  root.add(body);
  const joints = {};
  const TAU = Math.PI * 2, D = Math.PI / 180;

  // ---------- triangle soups with normals, through a placement matrix ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (v) => mul(v, 1 / (Math.hypot(...v) || 1));
  let soups = {};
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
  const FACES = { bottom: [0, 1, 2, 3], top: [4, 5, 6, 7], back: [0, 1, 5, 4], right: [1, 2, 6, 5], front: [2, 3, 7, 6], left: [3, 0, 4, 7] };
  function hex(key, p, skip = []) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const [name, f] of Object.entries(FACES)) if (!skip.includes(name)) quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, x0, x1, y0, y1, z0, z1, skip = []) {
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], skip);
  }
  // vertical cylinder (frustum r0 at y0 .. r1 at y1) about (cx, cz), radial normals, flat caps
  function cyl(key, cx, cz, r0, r1, y0, y1, seg = 12) {
    const P = (r, a, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU, b = ((j + 1) / seg) * TAU;
      const ref = [cx, (y0 + y1) / 2, cz];
      const na = [Math.cos(a), 0, Math.sin(a)], nb = [Math.cos(b), 0, Math.sin(b)];
      tri(key, P(r0, a, y0), P(r0, b, y0), P(r1, b, y1), ref, na, nb, nb);
      tri(key, P(r0, a, y0), P(r1, b, y1), P(r1, a, y1), ref, na, nb, na);
      if (r1 > 0) tri(key, [cx, y1, cz], P(r1, a, y1), P(r1, b, y1), [cx, y1 - 1, cz]);
      if (r0 > 0) tri(key, [cx, y0, cz], P(r0, a, y0), P(r0, b, y0), [cx, y0 + 1, cz]);
    }
  }
  const place = (x, y, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };
  const own = (fn) => {
    const [savedS, savedM] = [soups, M];
    soups = {};
    M = new THREE.Matrix4();
    fn();
    const out = soups;
    [soups, M] = [savedS, savedM];
    return out;
  };

  // ---------- shell ----------
  const XL = -2.2, XR = 2.2, ZB = -1.6, ZF = 1.6, T = 0.12, F = 0.06, H = 2.6;
  box("dark", XL - T, XR, 0, F, ZB - T, ZF + T, ["top"]); // slab (its top is the tiles)
  quad("tile", [XL - T, F, ZB - T], [XR, F, ZB - T], [XR, F, ZF + T], [XL - T, F, ZF + T], [0, 0, 0]);
  const TL = 0.4;
  for (let i = 0; i * TL < XR - XL - 1e-6; i++)
    for (let k = 0; k * TL < ZF - ZB - 1e-6; k++) {
      if ((i + k) % 2) continue;
      const x0 = XL + i * TL, z0 = ZB + k * TL, x1 = Math.min(XR, x0 + TL), z1 = Math.min(ZF, z0 + TL);
      quad("darkFlat", [x0, F + 0.002, z0], [x1, F + 0.002, z0], [x1, F + 0.002, z1], [x0, F + 0.002, z1], [0, 0, 0]);
    }
  box("pave", XL - T, XR, 0, 0.04, ZF + T, ZF + 0.75); // pavement outside the front
  box("darkFlat", XL - T, XR, 0.04, 0.042, ZF + T + 0.02, ZF + T + 0.04); // curb line
  box("wall", XL - T, XR, F, H, ZB - T, ZB); // back wall
  box("wall", XL - T, XL, F, H, ZB, ZF + T); // -X wall
  box("dark", XL - T - 0.004, XR + 0.004, H, H + 0.004, ZB - T - 0.004, ZB + 0.004); // caps on the cut tops
  box("dark", XL - T - 0.004, XL + 0.004, H, H + 0.004, ZB, ZF + T + 0.004);
  box("dark", XR, XR + 0.004, F, H, ZB - T, ZB); // cut end of the back wall
  // facade with the door opening (x DX0..DX1, up to DH)
  const DX0 = -1.62, DX1 = -0.77, DH = F + 2.05, FX1 = -0.22;
  box("wall", XL, DX0, F, H, ZF, ZF + T);
  box("wall", DX1, FX1, F, H, ZF, ZF + T);
  box("wall", DX0, DX1, DH, H, ZF, ZF + T);
  box("dark", XL, FX1 + 0.004, H, H + 0.004, ZF, ZF + T + 0.004);
  box("dark", FX1, FX1 + 0.004, F, H, ZF, ZF + T); // cut end of the facade
  // wainscot rail round the lower walls, and the facade's outer skirting
  box("wood", XL - 0.004, XR, F + 0.86, F + 0.9, ZB, ZB + 0.02);
  box("wood", XL, XL + 0.02, F + 0.86, F + 0.9, ZB, ZF);
  box("dark", XL - T, FX1, F, F + 0.22, ZF + T, ZF + T + 0.01);
  // door: frame, glass, streaks, push bar, blank plate; canopy above
  const dz = ZF + 0.05;
  box("dark", DX0, DX0 + 0.06, F, DH, ZF - 0.005, ZF + T + 0.005);
  box("dark", DX1 - 0.06, DX1, F, DH, ZF - 0.005, ZF + T + 0.005);
  box("dark", DX0, DX1, DH - 0.06, DH, ZF - 0.005, ZF + T + 0.005);
  box("dark", DX0 + 0.06, DX1 - 0.06, F, F + 0.14, dz - 0.02, dz + 0.02); // kick rail
  box("dark", DX0 + 0.06, DX1 - 0.06, F + 0.98, F + 1.04, dz - 0.02, dz + 0.02); // mid rail
  box("darkFlat", DX0 + 0.06, DX1 - 0.06, F + 0.14, DH - 0.06, dz - 0.004, dz + 0.004); // glass
  const gz = dz + 0.006;
  for (const [x0, w] of [[DX0 + 0.16, 0.09], [DX0 + 0.3, 0.035]]) {
    quad("streak", [x0, F + 1.1, gz], [x0 + w, F + 1.1, gz], [x0 + w + 0.2, F + 1.9, gz], [x0 + 0.2, F + 1.9, gz], [0, 0, 0]);
    quad("streak", [x0 + 0.05, F + 0.22, gz], [x0 + w + 0.05, F + 0.22, gz], [x0 + w + 0.2, F + 0.86, gz], [x0 + 0.2, F + 0.86, gz], [0, 0, 0]);
  }
  box("chrome", DX0 + 0.12, DX1 - 0.12, F + 0.98, F + 1.04, dz + 0.04, dz + 0.065); // push bar
  for (const x of [DX0 + 0.14, DX1 - 0.14]) box("chrome", x - 0.012, x + 0.012, F + 0.995, F + 1.025, dz + 0.02, dz + 0.04);
  box("vinyl", DX0 + 0.25, DX1 - 0.25, F + 1.5, F + 1.66, dz + 0.012, dz + 0.022); // blank hanging plate
  box("dark", (DX0 + DX1) / 2 - 0.004, (DX0 + DX1) / 2 + 0.004, F + 1.66, F + 1.78, dz + 0.014, dz + 0.02);
  box("wood", DX0 - 0.14, DX1 + 0.14, DH + 0.08, DH + 0.15, ZF + T, ZF + T + 0.42); // canopy
  box("dark", DX0 - 0.15, DX1 + 0.15, DH + 0.04, DH + 0.08, ZF + T + 0.36, ZF + T + 0.43); // canopy fascia

  // ---------- mirror wall: counter, basin, ledge with tonic bottles, mirror ----------
  const CX0 = -1.85, CX1 = 1.95, CZ1 = ZB + 0.45, CY = F + 0.78;
  box("wood", CX0, CX1, F + 0.08, CY - 0.03, ZB, CZ1);
  box("dark", CX0 + 0.03, CX1 - 0.03, F, F + 0.08, ZB, CZ1 - 0.05); // kick
  box("chrome", CX0 - 0.02, CX1 + 0.02, CY - 0.03, CY, ZB, CZ1 + 0.03); // top
  for (const x of [-1.15, -0.65, 0.4, 0.85, 1.4]) box("darkFlat", x - 0.006, x + 0.006, F + 0.12, CY - 0.07, CZ1, CZ1 + 0.003); // door seams
  for (const x of [-1.6, -0.9, 0.62, 1.12, 1.68]) box("chrome", x - 0.03, x + 0.03, CY - 0.18, CY - 0.15, CZ1, CZ1 + 0.02); // pulls
  // wash basin between the chairs: a white bowl block standing out of the counter, the dark well, a tap and spray
  const BX = -0.12, BZ = ZB + 0.24;
  box("chrome", BX - 0.3, BX + 0.3, CY, CY + 0.1, BZ - 0.2, BZ + 0.24);
  box("darkFlat", BX - 0.24, BX + 0.24, CY + 0.1, CY + 0.102, BZ - 0.15, BZ + 0.18);
  box("chrome", BX - 0.025, BX + 0.025, CY + 0.1, CY + 0.32, BZ - 0.19, BZ - 0.15); // tap riser
  box("chrome", BX - 0.022, BX + 0.022, CY + 0.28, CY + 0.32, BZ - 0.15, BZ - 0.02); // spout
  cyl("chrome", BX + 0.2, BZ - 0.17, 0.03, 0.03, CY + 0.1, CY + 0.26, 8); // spray in its holder
  cyl("dark", BX + 0.2, BZ - 0.17, 0.034, 0.034, CY + 0.26, CY + 0.31, 8);
  // mirror
  const MX0 = -1.78, MX1 = 1.88, MY0 = F + 1.0, MY1 = F + 1.9, mz = ZB;
  box("wood", MX0 - 0.06, MX1 + 0.06, MY0 - 0.06, MY0, mz, mz + 0.035);
  box("wood", MX0 - 0.06, MX1 + 0.06, MY1, MY1 + 0.06, mz, mz + 0.035);
  for (const x of [MX0 - 0.06, -0.15, MX1]) box("wood", x, x + 0.06, MY0, MY1, mz, mz + 0.035);
  box("darkFlat", MX0, MX1, MY0, MY1, mz, mz + 0.015);
  for (const x0 of [-1.55, -1.32, 0.2, 0.46]) {
    const w = x0 === -1.32 || x0 === 0.46 ? 0.06 : 0.16;
    quad("streak", [x0, MY0 + 0.05, mz + 0.017], [x0 + w, MY0 + 0.05, mz + 0.017], [x0 + w + 0.42, MY1 - 0.05, mz + 0.017], [x0 + 0.42, MY1 - 0.05, mz + 0.017], [x0, MY0, mz - 1]);
  }
  // ledge and tonic bottles
  const LY = MY0 - 0.08;
  box("chrome", MX0 - 0.06, MX1 + 0.06, LY - 0.025, LY, mz, mz + 0.15);
  const BOTTLES = [ // x, radius, height, body key, cap key
    [-1.68, 0.03, 0.17, "vinyl", "chrome"], [-1.6, 0.025, 0.13, "wood", "dark"], [-1.52, 0.032, 0.2, "dark", "chrome"],
    [-1.41, 0.026, 0.15, "chrome", "vinyl"], [-1.0, 0.03, 0.18, "wood", "chrome"], [-0.92, 0.024, 0.12, "vinyl", "dark"],
    [-0.5, 0.03, 0.19, "dark", "wood"], [-0.42, 0.026, 0.14, "chrome", "dark"], [0.3, 0.032, 0.21, "wood", "dark"],
    [0.4, 0.025, 0.13, "vinyl", "chrome"], [0.48, 0.028, 0.17, "dark", "chrome"], [1.2, 0.03, 0.18, "chrome", "vinyl"],
    [1.29, 0.026, 0.14, "wood", "chrome"], [1.66, 0.03, 0.2, "vinyl", "dark"], [1.75, 0.024, 0.12, "dark", "wood"],
  ];
  for (const [x, r, h, bk, ck] of BOTTLES) {
    const z = mz + 0.08;
    cyl(bk, x, z, r, r, LY, LY + h * 0.7, 8);
    cyl(bk, x, z, r, r * 0.4, LY + h * 0.7, LY + h * 0.85, 8);
    cyl(ck, x, z, r * 0.45, r * 0.45, LY + h * 0.85, LY + h, 6);
  }

  // ---------- barber chairs (local: seat centred on x = z = 0, facing +Z) ----------
  function chair() {
    cyl("chrome", 0, 0, 0.3, 0.29, F, F + 0.04, 16); // foot disc
    cyl("chrome", 0, 0, 0.085, 0.085, F + 0.04, F + 0.3, 12); // hydraulic column
    cyl("dark", 0, 0, 0.1, 0.1, F + 0.04, F + 0.075, 12); // column collar
    box("chrome", 0.08, 0.26, F + 0.06, F + 0.08, -0.03, 0.03); // pump pedal arm
    box("dark", 0.24, 0.32, F + 0.05, F + 0.1, -0.05, 0.05); // pedal pad
    box("chrome", -0.22, 0.22, F + 0.3, F + 0.42, -0.24, 0.22); // enamel body
    box("vinyl", -0.27, 0.27, F + 0.42, F + 0.56, -0.26, 0.28); // seat cushion
    box("darkFlat", -0.271, 0.271, F + 0.47, F + 0.48, -0.261, 0.281); // piping seam
    // reclining back: a slab leaning 10 deg, its foot on the seat's rear edge
    const lean = 10 * D, by0 = F + 0.5, by1 = F + 1.18, bz = -0.2, th = 0.13;
    const bk = (y, f) => [bz - th * f - (y - by0) * Math.tan(lean), y];
    const pt = (x, y, f) => { const [z, yy] = bk(y, f); return [x, yy, z]; };
    hex("vinyl", [pt(-0.26, by0, 1), pt(0.26, by0, 1), pt(0.26, by0, 0), pt(-0.26, by0, 0), pt(-0.26, by1, 1), pt(0.26, by1, 1), pt(0.26, by1, 0), pt(-0.26, by1, 0)]);
    // headrest on a chrome stem
    const [hz] = bk(by1 + 0.08, 0.5);
    box("chrome", -0.025, 0.025, by1 - 0.06, by1 + 0.06, hz - 0.08, hz - 0.04);
    box("vinyl", -0.13, 0.13, by1 + 0.04, by1 + 0.16, hz - 0.03, hz + 0.06);
    // armrests: chrome posts, a vinyl pad on a chrome rail
    for (const s of [-1, 1]) {
      const x0 = s * 0.27, x1 = s * 0.36;
      box("chrome", Math.min(x0, x1), Math.max(x0, x1), F + 0.66, F + 0.69, -0.24, 0.27);
      box("vinyl", Math.min(x0, x1) - 0.005, Math.max(x0, x1) + 0.005, F + 0.69, F + 0.75, -0.22, 0.24);
      box("chrome", Math.min(x0, x1) + 0.02, Math.max(x0, x1) - 0.02, F + 0.42, F + 0.66, 0.18, 0.24);
      box("chrome", Math.min(x0, x1) + 0.02, Math.max(x0, x1) - 0.02, F + 0.42, F + 0.66, -0.2, -0.14);
    }
    // footrest: a chrome plate out front on a sloping bar
    hex("chrome", [[-0.05, F + 0.3, 0.2], [0.05, F + 0.3, 0.2], [0.05, F + 0.36, 0.2], [-0.05, F + 0.36, 0.2], [-0.05, F + 0.14, 0.46], [0.05, F + 0.14, 0.46], [0.05, F + 0.19, 0.46], [-0.05, F + 0.19, 0.46]]);
    box("chrome", -0.2, 0.2, F + 0.12, F + 0.16, 0.4, 0.58);
    box("dark", -0.2, 0.2, F + 0.16, F + 0.165, 0.42, 0.56);
  }
  for (const x of [-1.12, 0.92]) place(x, 0, -0.5, Math.PI, chair);

  // ---------- waiting bench with magazines, wall clock ----------
  const BY = F + 0.42, BZ0 = -0.05, BZ1 = 1.3, BX1 = XL + 0.44;
  box("wood", XL + 0.02, BX1, BY - 0.05, BY, BZ0, BZ1);
  for (const z of [BZ0 + 0.08, BZ1 - 0.08]) box("dark", XL + 0.06, BX1 - 0.05, F, BY - 0.05, z - 0.03, z + 0.03);
  box("dark", XL + 0.06, BX1 - 0.05, F + 0.12, F + 0.15, BZ0 + 0.08, BZ1 - 0.08); // stretcher
  box("wood", XL + 0.02, XL + 0.06, BY + 0.12, BY + 0.42, BZ0, BZ1); // back board on the wall
  place(XL + 0.24, BY, 1.0, 6 * D, () => { // a pile of magazines
    box("vinyl", -0.11, 0.11, 0, 0.012, -0.14, 0.14);
    box("chrome", -0.105, 0.105, 0.012, 0.022, -0.135, 0.135);
    box("wood", -0.11, 0.11, 0.022, 0.034, -0.14, 0.14);
    box("dark", -0.1, 0.1, 0.034, 0.044, -0.13, 0.13);
  });
  place(XL + 0.24, BY, 0.35, -22 * D, () => { // one lying open
    box("chrome", -0.11, 0.11, 0, 0.008, -0.27, 0.27);
    box("vinyl", -0.08, 0.08, 0.008, 0.01, -0.24, -0.04);
    box("darkFlat", -0.08, 0.08, 0.008, 0.01, 0.05, 0.08);
    box("darkFlat", -0.08, 0.08, 0.008, 0.01, 0.12, 0.14);
  });
  // wall clock over the bench (a round face on the -X wall)
  place(XL + 0.02, F + 1.95, 0.65, 0, () => {
    const seg = 16, P = (r, a, x) => [x, r * Math.sin(a), r * Math.cos(a)];
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU, b = ((j + 1) / seg) * TAU;
      quad("wood", P(0.17, a, 0), P(0.17, b, 0), P(0.17, b, 0.05), P(0.17, a, 0.05), [0.025, 0, 0]);
      tri("wood", [0.05, 0, 0], P(0.17, a, 0.05), P(0.17, b, 0.05), [0, 0, 0]);
      tri("chrome", [0.052, 0, 0], P(0.14, a, 0.052), P(0.14, b, 0.052), [0, 0, 0]);
    }
    box("dark", 0.053, 0.057, -0.012, 0.1, -0.01, 0.01);
    box("dark", 0.053, 0.057, -0.01, 0.01, -0.01, 0.075);
  });

  // ---------- coat rack in the back corner ----------
  place(XL + 0.3, 0, -0.62, 0, () => {
    for (const a of [0, 90, 180, 270]) place(0, 0, 0, a * D, () => box("dark", -0.02, 0.02, F, F + 0.05, 0, 0.24));
    cyl("wood", 0, 0, 0.022, 0.022, F + 0.03, F + 1.78, 8);
    cyl("wood", 0, 0, 0.04, 0.04, F + 1.78, F + 1.82, 8);
    for (const a of [45, 135, 225, 315]) place(0, F + 1.62, 0, a * D, () => hex("wood", [[-0.012, 0, 0], [0.012, 0, 0], [0.012, 0.02, 0], [-0.012, 0.02, 0], [-0.012, 0.1, 0.16], [0.012, 0.1, 0.16], [0.012, 0.12, 0.16], [-0.012, 0.12, 0.16]]));
    // a coat on the +Z hooks: shoulders, a long tapering body, a collar
    hex("dark", [[-0.2, F + 0.75, 0.07], [0.2, F + 0.75, 0.07], [0.2, F + 0.75, 0.25], [-0.2, F + 0.75, 0.25], [-0.15, F + 1.66, 0.1], [0.15, F + 1.66, 0.1], [0.15, F + 1.66, 0.22], [-0.15, F + 1.66, 0.22]]);
    box("vinyl", -0.06, 0.06, F + 1.6, F + 1.7, 0.08, 0.24); // scarf at the collar
    // a hat on the top
    cyl("wood", 0, 0, 0.16, 0.16, F + 1.82, F + 1.84, 12);
    cyl("dark", 0, 0, 0.1, 0.09, F + 1.84, F + 1.95, 12);
  });

  // ---------- barber pole beside the door ----------
  const PX = -0.47, PZ = ZF + T + 0.17, PR = 0.095, PY0 = F + 1.08, PY1 = F + 1.88;
  box("chrome", PX - 0.07, PX + 0.07, PY0 - 0.15, PY1 + 0.15, ZF + T, ZF + T + 0.02); // back plate
  for (const y of [PY0 - 0.08, PY1 + 0.08]) box("chrome", PX - 0.025, PX + 0.025, y - 0.02, y + 0.02, ZF + T + 0.02, PZ);
  cyl("chrome", PX, PZ, 0.115, 0.115, PY0 - 0.11, PY0, 16); // bottom cap
  cyl("chrome", PX, PZ, 0.03, 0.08, PY0 - 0.18, PY0 - 0.11, 12);
  cyl("chrome", PX, PZ, 0.115, 0.115, PY1, PY1 + 0.1, 16); // top cap
  cyl("chrome", PX, PZ, 0.1, 0.06, PY1 + 0.1, PY1 + 0.16, 16); // dome
  cyl("chrome", PX, PZ, 0.06, 0.0, PY1 + 0.16, PY1 + 0.19, 16);
  cyl("chrome", PX, PZ, PR - 0.0015, PR - 0.0015, PY0, PY1, 32); // inked core inside the stripes (draws the outline)
  // stripes: 8 helical bands (red, white, blue, white, twice round), one turn every PITCH up the barrel, in the joint's frame
  const pole = new THREE.Group();
  pole.name = "pole";
  pole.position.set(PX, (PY0 + PY1) / 2, PZ);
  body.add(pole);
  joints.pole = pole;
  const NB = 8, PITCH = 0.62, NY = 80, SUB = 4, BANDS = ["red", "white", "blue", "white"];
  const stripes = own(() => place(0, -(PY0 + PY1) / 2, 0, 0, () => {
    for (let j = 0; j < NB; j++)
      for (let i = 0; i < NY; i++) {
        const ya = PY0 + ((PY1 - PY0) * i) / NY, yb = PY0 + ((PY1 - PY0) * (i + 1)) / NY;
        for (let m = 0; m < SUB; m++) {
          const at = (y, f) => { const a = TAU * ((j + f) / NB) + (TAU * (y - PY0)) / PITCH; return { q: [PR * Math.cos(a), y, PR * Math.sin(a)], n: [Math.cos(a), 0, Math.sin(a)] }; };
          const A = at(ya, m / SUB), B = at(ya, (m + 1) / SUB), C = at(yb, (m + 1) / SUB), E = at(yb, m / SUB);
          const ref = [0, (ya + yb) / 2, 0];
          tri(BANDS[j % 4], A.q, B.q, C.q, ref, A.n, B.n, C.n);
          tri(BANDS[j % 4], A.q, C.q, E.q, ref, A.n, C.n, E.n);
        }
      }
  }));
  const movers = [{ j: pole, set: stripes }];

  // ---------- centre the footprint on x = z = 0 ----------
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  const sc = height / NATURAL;
  body.position.set((-(lo[0] + hi[0]) / 2) * sc, 0, (-(lo[1] + hi[1]) / 2) * sc);

  // ---------- meshes: one per material; the stripes' vertices join their material's mesh ----------
  for (const mv of movers) {
    mv.ranges = [];
    for (const [key, { p, n }] of Object.entries(mv.set)) {
      const s = S(key), i0 = s.p.length;
      s.p.push(...p), s.n.push(...n);
      mv.ranges.push({ key, i0, P: Float32Array.from(p), N: Float32Array.from(n) });
    }
    delete mv.set;
  }
  const MAT = {
    wall: [c.wall, c.wallShade, 0.45, 3],
    wood: [c.wood, c.woodShade, 0.1, 2.5],
    dark: [c.dark, c.dark, 0.1, 2.5],
    darkFlat: [c.dark, c.dark, 0.1, 0],
    tile: [c.tile, c.tile, 0.1, 0],
    pave: [c.pave, c.pave, 0.1, 3],
    chrome: [c.chrome, c.chromeShade, 0.1, 2],
    vinyl: [c.vinyl, c.vinylShade, 0.1, 2.5],
    streak: [c.glow, c.glow, -0.25, 0],
    red: [c.red, c.red, -0.25, 0],
    white: [c.white, c.white, -0.25, 0],
    blue: [c.blue, c.blue, -0.25, 0],
  };
  const geo = {};
  for (const [key, { p, n }] of Object.entries(soups)) {
    const g = (geo[key] = new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
  }
  const rel = new THREE.Matrix4(), inv = new THREE.Matrix4(), nm = new THREE.Matrix3(), w3 = new THREE.Vector3();
  function writeMovers() {
    body.updateMatrixWorld(true);
    inv.copy(body.matrixWorld).invert();
    const touched = new Set();
    for (const mv of movers) {
      rel.multiplyMatrices(inv, mv.j.matrixWorld);
      nm.getNormalMatrix(rel);
      for (const r of mv.ranges) {
        const g = geo[r.key], P = g.attributes.position.array, N = g.attributes.normal.array;
        for (let i = 0; i < r.P.length; i += 3) {
          w3.fromArray(r.P, i).applyMatrix4(rel).toArray(P, r.i0 + i);
          w3.fromArray(r.N, i).applyMatrix3(nm).normalize().toArray(N, r.i0 + i);
        }
        touched.add(r.key);
      }
    }
    for (const key of touched) {
      const g = geo[key];
      g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  }

  // ---------- clip: spin ----------
  // The pole turns one revolution a loop. A band sits at body angle a = phase + TAU * y / PITCH; rotation.y = r moves it
  // to world angle a - r, so at a fixed world angle a band's height grows with r: a positive r (counter-clockwise seen
  // from above) makes the stripes climb.
  const CLIPS = { spin: 3 };
  const frac = (x) => x - Math.floor(x);
  function apply(t) {
    pole.rotation.set(0, TAU * frac(t / CLIPS.spin), 0);
    writeMovers();
    root.updateMatrixWorld(true);
  }
  apply(0);
  for (const [key, g] of Object.entries(geo)) {
    const [base, shade, threshold, px] = MAT[key];
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`barber-shop: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      return apply(+m[2]);
    }
    if (name !== "rest") throw new Error(`barber-shop: unknown pose "${name}" (rest, or spin@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

// locker-room.js - the school sports club locker room of every anime club arc, a cutaway set at real size.
// Contract: harness/lab/README.md. Meters, +Y up; the open (cutaway) sides face +X and +Z, so the lab's front-left
// cameras look in; the locker wall is -Z (with the high window strip) and the whiteboard wall -X. Floor on y = 0,
// centred on x = z = 0.
//
// Construction (boxes, 4-8 sided rods and frustums, convex prisms, lofted rounded sections and flat plates, all
// triangle soups merged per material; only the open locker door is its own group of meshes, on a hinge pivot). Every
// triangle is wound away from a point inside its solid (box centre, rod axis, loft column, prism centre), never by hand.
//   SHELL     floor quad of pale 0.5 m tiles with moon grout; two walls 12 cm thick, the -Z wall cut round one long high
//             window strip (steel mullions, sky glass); dark skirting; dark 2 cm caps on the cut wall tops and ends.
//   LOCKERS   tall steel lockers (0.38 x 0.5 x 1.85) on a dark plinth: `lockers` along the -Z wall, three more along the
//             -X wall. Each door: two vent banks (dark slits), a blank name-card slot (dark frame, pale card), a handle.
//             Door gaps are a dark plate behind inset doors, so every locker reads as its own door. One locker is a
//             hollow carcass with a shelf, a hook, a hanging red jersey (a T prism, pale band, dark collar) and a
//             yellow sports bag; its door swings on a hinge at its -X edge.
//   BENCH     a long wooden bench down the middle on two steel leg frames; on it a red duffel with dark handles, a
//             folded white towel with one end draped over the edge, and a green water bottle.
//   FITTINGS  a whiteboard on the -X wall (steel frame, tray, abstract dark and red marks: rings, crosses, arrows), a
//             fluorescent fixture hung under a steel beam that is anchored in the -X wall with a plate and a diagonal
//             brace, a yellow mop bucket with wringer and a mop leaning into the front -X corner, and a wooden hook rail
//             right of the lockers with a white and a green towel.
// Proportions (real size, base unit the storey H = 2.7 m, meta.height, the wall top): interior 5.0 (x) by 4.0 (z);
//   lockers 0.38 wide, 1.85 tall, 0.5 deep; window strip 2.1-2.5; bench seat 0.43, 2.4 long; whiteboard 0.85-1.85;
//   beam 2.52 (light tube 2.3); bucket 0.36.
// Options: build(THREE, kit, colors, { height = 2.7, lockers = 8 }).
//   height    scales the whole room uniformly so the wall top is `height`.
//   lockers   3..10, lockers in the -Z row (the -X row always has three); the open one is second from the right.
// Clip (build() returns clips { door: 4 }; pose("door@1.3")): the open door swings gently about its hinge, harmonics
//   1 and 2 of 4 s so it loops. Sign: the hinge is a y-rotation, door angle a opens it by rotation.y = -a (toward +Z,
//   then -X). Rest is open 115 degrees.
// Budget: ~2.6k triangles, 13 meshes (10 material groups + 3 on the door).
// Ink in pixels: walls, floor, lockers, wood 3; steel, props 2.
// Colours (meadow), base / shade:
//   walls        moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//   lockers      line #a9d16e / iris #3f8a47 (pale green steel)
//   floor sky #d7ecef flat, grout and the light tube moon #f7f3e1 flat (tube glows, threshold -0.25)
//   wood (bench, hook rail) skin #f0c2ae / practical #f2c94c
//   steel, whiteboard, towel, name cards  sclera #f6f3ee / sky #d7ecef
//   glass sky flat; vents, gaps, plinths, caps, marks, handles  hair #2c5131 flat
//   jersey, duffel, marker  accent #d9483b; locker bag, mop bucket  practical #f2c94c

export const meta = {
  name: "locker-room",
  height: 2.7,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    locker: "#a9d16e", lockerShade: "#3f8a47",
    floor: "#d7ecef", seam: "#f7f3e1",
    wood: "#f0c2ae", woodShade: "#f2c94c",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    glass: "#d7ecef",
    dark: "#2c5131",
    red: "#d9483b", yellow: "#f2c94c",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const NATURAL = 2.7;
  const height = opts.height ?? NATURAL;
  const nRow = Math.max(3, Math.min(10, Math.round(opts.lockers ?? 8)));
  const root = new THREE.Group();
  root.name = "locker-room";
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
  // a strip from p to q (in a plane facing n), width w
  function stroke(key, p, q, w, n) {
    const d = nrm(sub(q, p)), s = mul(nrm(cross(n, d)), w / 2);
    quad(key, add(p, s), add(q, s), sub(q, s), sub(p, s), sub(p, n));
  }
  // capped frustum from a to b, radii ra, rb
  function rod(key, a, b, ra, sides = 4, rb = ra, pushEnds = true) {
    const T = nrm(sub(b, a));
    if (pushEnds) a = sub(a, mul(T, ra * 0.6)), b = add(b, mul(T, rb * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P, r) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2 + Math.PI / sides, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
      return { q: add(P, mul(d, r)), n: d };
    });
    const A = ring(a, ra), B = ring(b, rb), mid = mul(add(a, b), 0.5);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      tri(key, A[j].q, A[k].q, B[k].q, mid, A[j].n, A[k].n, B[k].n);
      tri(key, A[j].q, B[k].q, B[j].q, mid, A[j].n, B[k].n, B[j].n);
    }
    for (const [R, s] of [[A, -1], [B, 1]])
      for (let j = 1; j < sides - 1; j++) tri(key, R[0].q, R[j].q, R[j + 1].q, mid, mul(T, s), mul(T, s), mul(T, s));
  }
  // a convex polygon [[x, y], ...] extruded between z0 and z1
  function prism(key, pts, z0, z1) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const ref = [cx, cy, (z0 + z1) / 2], m = pts.length;
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      quad(key, [...pts[j], z0], [...pts[k], z0], [...pts[k], z1], [...pts[j], z1], ref);
    }
    for (const z of [z0, z1]) for (let j = 1; j < m - 1; j++) tri(key, [...pts[0], z], [...pts[j], z], [...pts[j + 1], z], ref);
  }
  // a loft of convex sections along z: sec(t) -> [[x, y], ...], z(t); capped; smooth normals from each section centre
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
  const rrect = (cx, cy, a, b, r, k = 2) => {
    const out = [];
    for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]])
      for (let i = 0; i <= k; i++) {
        const t = ((a0 + (90 * i) / k) * Math.PI) / 180;
        out.push([cx + sx * (a - r) + Math.cos(t) * r, cy + sy * (b - r) + Math.sin(t) * r]);
      }
    return out;
  };
  // an annulus in the plane x = const facing +X
  function ringX(key, ctr, r0, r1, n = 12) {
    const P = (r, t) => add(ctr, [0, Math.sin(t) * r, Math.cos(t) * r]);
    for (let j = 0; j < n; j++) {
      const t0 = (j / n) * Math.PI * 2, t1 = ((j + 1) / n) * Math.PI * 2;
      quad(key, P(r0, t0), P(r1, t0), P(r1, t1), P(r0, t1), sub(ctr, [1, 0, 0]));
    }
  }
  const place = (x, z, yaw, fn, y = 0) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the shell ----------
  const W = 2.5, L = 2.0, H = 2.7, T = 0.12, CAP = 0.02;
  quad("floor", [-W, 0, -L], [W, 0, -L], [W, 0, L], [-W, 0, L], [0, -1, 0]);
  for (let i = 1; i < 8; i++) {
    const z = -L + i * 0.5;
    quad("seam", [-W, 0.0015, z - 0.007], [W, 0.0015, z - 0.007], [W, 0.0015, z + 0.007], [-W, 0.0015, z + 0.007], [0, -1, z]);
  }
  for (let i = 1; i < 10; i++) {
    const x = -W + i * 0.5;
    quad("seam", [x - 0.007, 0.0016, -L], [x + 0.007, 0.0016, -L], [x + 0.007, 0.0016, L], [x - 0.007, 0.0016, L], [x, -1, 0]);
  }
  const WY0 = 2.1, WY1 = 2.5, WX0 = -2.2, WX1 = 2.2;
  const wz0 = -L - T, wz1 = -L;
  box("wall", -W - T, W, 0, WY0, wz0, wz1); // -Z wall below the window
  box("wall", -W - T, W, WY1, H - CAP, wz0, wz1); // above it
  box("wall", -W - T, WX0, WY0, WY1, wz0, wz1); // piers
  box("wall", WX1, W, WY0, WY1, wz0, wz1);
  box("cap", -W - T, W, H - CAP, H, wz0, wz1);
  box("wall", -W - T, -W, 0, H - CAP, -L, L); // -X wall
  box("cap", -W - T, -W, H - CAP, H, -L, L);
  box("cap", -W - T, -W, 0, H, L - 0.002, L); // cut ends at the open sides
  box("cap", W - 0.002, W, 0, H, wz0, wz1);
  box("dark", -W, -W + 0.012, 0, 0.08, -L, L); // skirting
  box("dark", -W, W, 0, 0.08, -L, -L + 0.012);
  { // the high window strip: frame, mullions, glass
    const FR = 0.03, zm = (wz0 + wz1) / 2;
    box("steel", WX0, WX1, WY0, WY0 + FR, wz0 - 0.005, wz1 + 0.012);
    box("steel", WX0, WX1, WY1 - FR, WY1, wz0 - 0.005, wz1 + 0.012);
    const nP = 5, pw = (WX1 - WX0) / nP;
    for (let i = 0; i <= nP; i++) {
      const x = WX0 + i * pw;
      box("steel", x - (i === 0 ? 0 : FR / 2) , x + (i === nP ? 0 : FR / 2), WY0, WY1, wz0 - 0.005, wz1 + 0.012);
    }
    for (let i = 0; i < nP; i++) {
      const ctr = [WX0 + (i + 0.5) * pw, (WY0 + WY1) / 2, zm];
      plate("glass", add(ctr, [0, 0, 0.001]), [0, 0, 1], pw - FR, WY1 - WY0 - 2 * FR);
      plate("glass", add(ctr, [0, 0, -0.001]), [0, 0, -1], pw - FR, WY1 - WY0 - 2 * FR);
      // a glint per pane
      stroke("seam", add(ctr, [-pw * 0.3, -0.1, 0.004]), add(ctr, [-pw * 0.1, 0.1, 0.004]), 0.025, [0, 0, 1]);
    }
    box("wall", WX0, WX1, WY0 - 0.025, WY0, wz1, wz1 + 0.06); // sill
  }

  // ---------- lockers ----------
  // local frame: back on z = 0, front toward +z, x from 0 to LW, standing on y = 0
  const LW = 0.38, LD = 0.5, LH = 1.85, PL = 0.1, DT = 0.02, GAP = 0.01;
  const DW = LW - 2 * GAP, DY0 = PL + GAP, DY1 = LH - GAP;
  // the door, in its hinge frame: hinge on x = 0, the door runs to +x, front face on z = 0, back face z = -DT
  function door(g, d, s) {
    box(g, 0, DW, DY0, DY1, -DT, 0);
    const vw = DW * 0.56, vx = DW * 0.48;
    for (const y0 of [DY1 - 0.2, DY0 + 0.1])
      for (let k = 0; k < 4; k++) plate(d, [vx, y0 + k * 0.032, 0.0015], [0, 0, 1], vw, 0.013);
    // blank name-card slot
    plate(d, [vx, DY1 - 0.32, 0.0015], [0, 0, 1], 0.13, 0.055);
    plate(s, [vx, DY1 - 0.32, 0.003], [0, 0, 1], 0.11, 0.037);
    // handle with a small lock
    box(s, DW - 0.06, DW - 0.035, 0.95, 1.1, 0, 0.022);
    box(d, DW - 0.056, DW - 0.039, 1.13, 1.15, 0, 0.004);
  }
  function locker(open) {
    box("dark", 0.015, LW - 0.015, 0, PL, 0.02, LD - 0.02); // plinth
    if (!open) {
      box("locker", 0, LW, PL, LH, 0, LD - DT);
      plate("dark", [LW / 2, (PL + LH) / 2, LD - DT + 0.001], [0, 0, 1], LW, LH - PL);
      place(GAP, LD, 0, () => door("locker", "dark", "steel"));
      return;
    }
    const t = 0.012, F = LD - DT;
    box("locker", 0, LW, PL, PL + t, 0, F); // floor
    box("locker", 0, LW, LH - t, LH, 0, F); // top
    box("locker", 0, LW, PL, LH, 0, t); // back
    box("locker", 0, t, PL, LH, 0, F); // sides
    box("locker", LW - t, LW, PL, LH, 0, F);
    box("locker", t, LW - t, 1.45, 1.47, t, F - 0.02); // shelf
    box("dark", 0, LW, PL, PL + 0.02, F - 0.02, F + 0.001); // sill lip
    // hook under the shelf, a hanger, the jersey
    const hx = LW / 2, hz = LD * 0.45;
    rod("steel", [hx, 1.45, hz], [hx, 1.39, hz], 0.006, 4);
    rod("steel", [hx - 0.13, 1.33, hz], [hx, 1.38, hz], 0.006, 4);
    rod("steel", [hx + 0.13, 1.33, hz], [hx, 1.38, hz], 0.006, 4);
    const jz0 = hz - 0.03, jz1 = hz + 0.03;
    prism("red", [[hx - 0.12, 0.86], [hx + 0.12, 0.86], [hx + 0.125, 1.3], [hx - 0.125, 1.3]], jz0, jz1); // torso
    prism("red", [[hx + 0.09, 1.34], [hx + 0.17, 1.17], [hx + 0.12, 1.14], [hx + 0.09, 1.22]], jz0 + 0.004, jz1 - 0.004);
    prism("red", [[hx - 0.09, 1.34], [hx - 0.17, 1.17], [hx - 0.12, 1.14], [hx - 0.09, 1.22]], jz0 + 0.004, jz1 - 0.004);
    prism("red", [[hx - 0.125, 1.3], [hx + 0.125, 1.3], [hx + 0.09, 1.34], [hx - 0.09, 1.34]], jz0, jz1); // shoulders
    plate("steel", [hx, 1.1, jz1 + 0.002], [0, 0, 1], 0.242, 0.04); // a pale band
    plate("steel", [hx, 1.04, jz1 + 0.002], [0, 0, 1], 0.242, 0.015);
    prism("dark", [[hx - 0.05, 1.341], [hx + 0.05, 1.341], [hx, 1.28]], jz1, jz1 + 0.003); // V collar
    // a yellow sports bag on the floor of the locker, a dark strap over it
    loftZ("yellow", 1, () => rrect(hx, PL + t + 0.12, 0.15, 0.12, 0.07, 2), (u) => 0.06 + u * 0.36);
    box("dark", hx - 0.152, hx + 0.152, PL + t + 0.06, PL + t + 0.075, 0.18, 0.21);
    box("dark", hx - 0.04, hx + 0.04, PL + t + 0.235, PL + t + 0.245, 0.06, 0.42);
  }
  // -Z row
  const RX0 = -W + 0.02, OPEN = nRow - 2;
  let hinge = null;
  for (let i = 0; i < nRow; i++) {
    place(RX0 + i * LW, -L, 0, () => {
      locker(i === OPEN);
      if (i === OPEN) hinge = M.clone().multiply(new THREE.Matrix4().makeTranslation(GAP, 0, LD));
    });
  }
  box("locker", RX0, RX0 + nRow * LW, LH, LH + 0.012, -L, -L + LD - DT); // a continuous top sheet
  // -X row: local x runs to -z (yaw +90), fronts face +X
  const ZA = -L + LD + 0.04;
  for (let i = 0; i < 3; i++) place(-W, ZA + (i + 1) * LW, Math.PI / 2, () => locker(false));
  box("locker", -W, -W + LD - DT, LH, LH + 0.012, ZA, ZA + 3 * LW);

  // ---------- bench and props ----------
  const BX = 0.25, BZ = 0.35, BL = 1.2, BD = 0.17, SEAT = 0.43;
  box("wood", BX - BL, BX + BL, SEAT - 0.05, SEAT, BZ - BD, BZ - 0.006);
  box("wood", BX - BL, BX + BL, SEAT - 0.05, SEAT, BZ + 0.006, BZ + BD);
  box("dark", BX - BL + 0.01, BX + BL - 0.01, SEAT - 0.048, SEAT - 0.003, BZ - 0.006, BZ + 0.006);
  for (const x of [BX - BL + 0.2, BX + BL - 0.2]) {
    box("steel", x - 0.025, x + 0.025, SEAT - 0.09, SEAT - 0.05, BZ - BD + 0.02, BZ + BD - 0.02); // cross bearer
    for (const z of [BZ - BD + 0.04, BZ + BD - 0.04]) box("steel", x - 0.022, x + 0.022, 0.03, SEAT - 0.09, z - 0.022, z + 0.022);
    box("steel", x - 0.03, x + 0.03, 0, 0.03, BZ - BD + 0.01, BZ + BD - 0.01); // foot
  }
  // red duffel along the bench, handles over the top, a dark zip
  place(BX - 0.5, BZ, Math.PI / 2, () => {
    loftZ("red", 6, (t) => {
      const s = 0.82 + 0.18 * Math.sin(t * Math.PI) ** 0.6;
      return rrect(0, SEAT + 0.13 * s, 0.14 * s, 0.13 * s, 0.1 * s, 2);
    }, (t) => -0.3 + t * 0.6);
    box("dark", -0.006, 0.006, SEAT + 0.255, SEAT + 0.262, -0.24, 0.24);
    for (const zz of [-0.1, 0.1]) {
      rod("dark", [-0.05, SEAT + 0.24, zz], [-0.04, SEAT + 0.34, zz], 0.009, 4);
      rod("dark", [0.05, SEAT + 0.24, zz], [0.04, SEAT + 0.34, zz], 0.009, 4);
      rod("dark", [-0.04, SEAT + 0.34, zz], [0.04, SEAT + 0.34, zz], 0.009, 4);
    }
    box("red", -0.09, 0.09, SEAT + 0.07, SEAT + 0.19, 0.29, 0.32); // end pocket
  });
  // folded towel, one end draped over the front edge
  {
    const x0 = BX + 0.2, x1 = BX + 0.52;
    box("steel", x0, x1, SEAT, SEAT + 0.05, BZ - 0.1, BZ + BD + 0.012);
    box("steel", x0, x1, SEAT - 0.24, SEAT + 0.05, BZ + BD + 0.006, BZ + BD + 0.026);
    box("dark", x0 - 0.001, x1 + 0.001, SEAT - 0.2, SEAT - 0.185, BZ + BD + 0.02, BZ + BD + 0.027);
    box("dark", x0 - 0.001, x1 + 0.001, SEAT + 0.015, SEAT + 0.025, BZ - 0.101, BZ + BD + 0.013);
  }
  // water bottle
  {
    const x = BX + 0.85, z = BZ - 0.02;
    rod("locker", [x, SEAT + 0.003, z], [x, SEAT + 0.2, z], 0.038, 8, 0.038, false);
    rod("locker", [x, SEAT + 0.2, z], [x, SEAT + 0.23, z], 0.038, 8, 0.024, false);
    rod("dark", [x, SEAT + 0.23, z], [x, SEAT + 0.27, z], 0.022, 8, 0.016, false);
    rod("steel", [x, SEAT + 0.06, z], [x, SEAT + 0.1, z], 0.04, 8, 0.04, false);
  }

  // a hook rail right of the lockers: a white towel and a green club towel hanging
  {
    const x0 = 1.55, x1 = 2.35, y = 1.62, z = -L;
    box("wood", x0, x1, y - 0.05, y + 0.05, z, z + 0.025);
    for (const [x, k, len] of [[x0 + 0.2, "steel", 0.55], [x0 + 0.55, "locker", 0.45]]) {
      rod("steel", [x, y, z + 0.025], [x, y + 0.02, z + 0.08], 0.008, 4);
      box(k, x - 0.13, x + 0.13, y - len, y + 0.03, z + 0.06, z + 0.085);
      box("dark", x - 0.131, x + 0.131, y - len + 0.06, y - len + 0.075, z + 0.06, z + 0.087);
    }
  }

  // ---------- whiteboard on the -X wall ----------
  {
    const x = -W, za = -0.05, zb = 1.25, ya = 0.88, yb = 1.85, zc = (za + zb) / 2, yc = (ya + yb) / 2;
    box("steel", x, x + 0.03, ya - 0.03, yb + 0.03, za - 0.03, zb + 0.03); // frame
    plate("steel", [x + 0.031, yc, zc], [1, 0, 0], zb - za, yb - ya);
    box("steel", x, x + 0.08, ya - 0.05, ya - 0.025, za + 0.1, zb - 0.1); // tray
    rod("red", [x + 0.055, ya - 0.012, za + 0.3], [x + 0.055, ya - 0.012, za + 0.43], 0.011, 6);
    rod("dark", [x + 0.055, ya - 0.012, za + 0.5], [x + 0.055, ya - 0.012, za + 0.63], 0.011, 6);
    box("dark", x + 0.035, x + 0.075, ya - 0.025, ya + 0.01, zb - 0.32, zb - 0.2); // eraser
    const px = x + 0.033, N = [1, 0, 0];
    const at = (u, v) => [px, ya + v * (yb - ya), za + u * (zb - za)];
    // abstract marks: rings and crosses, arrows between them, a dashed line
    for (const [u, v] of [[0.2, 0.7], [0.38, 0.35], [0.55, 0.62]]) ringX("dark", at(u, v), 0.045, 0.058, 10);
    for (const [u, v] of [[0.7, 0.3], [0.82, 0.7], [0.62, 0.86]]) {
      const P = at(u, v);
      stroke("dark", add(P, [0, -0.05, -0.05]), add(P, [0, 0.05, 0.05]), 0.013, N);
      stroke("dark", add(P, [0, -0.05, 0.05]), add(P, [0, 0.05, -0.05]), 0.013, N);
    }
    const arrow = (a, b) => {
      const A = at(...a), B = at(...b), d = nrm(sub(B, A)), s = nrm(cross(N, d));
      stroke("red", A, B, 0.013, N);
      stroke("red", B, add(B, add(mul(d, -0.06), mul(s, 0.04))), 0.013, N);
      stroke("red", B, add(B, add(mul(d, -0.06), mul(s, -0.04))), 0.013, N);
    };
    arrow([0.24, 0.62], [0.35, 0.42]);
    arrow([0.43, 0.4], [0.52, 0.56]);
    arrow([0.6, 0.6], [0.78, 0.66]);
    for (let k = 0; k < 6; k++) stroke("dark", at(0.08 + k * 0.14, 0.12), at(0.15 + k * 0.14, 0.12), 0.01, N);
  }

  // ---------- fluorescent light under a wall-anchored beam ----------
  {
    const by0 = 2.48, by1 = 2.56, z = BZ, xe = BX + 1.0;
    box("steel", -W, xe, by0, by1, z - 0.04, z + 0.04); // beam
    box("steel", -W, -W + 0.015, by0 - 0.12, by1 + 0.06, z - 0.1, z + 0.1); // wall plate
    box("dark", xe - 0.002, xe, by0, by1, z - 0.04, z + 0.04); // cut end of the beam section
    rod("steel", [-W + 0.01, 1.95, z], [-W + 0.85, by0, z], 0.018, 4); // diagonal brace
    box("steel", -W, -W + 0.015, 1.88, 2.02, z - 0.06, z + 0.06);
    const lx0 = BX - 0.65, lx1 = BX + 0.65, ly = 2.3;
    for (const x of [lx0 + 0.12, lx1 - 0.12]) rod("dark", [x, by0, z], [x, ly + 0.05, z], 0.007, 4);
    box("steel", lx0, lx1, ly, ly + 0.06, z - 0.09, z + 0.09); // fixture body
    rod("seam", [lx0 + 0.05, ly - 0.012, z - 0.04], [lx1 - 0.05, ly - 0.012, z - 0.04], 0.018, 6);
    rod("seam", [lx0 + 0.05, ly - 0.012, z + 0.04], [lx1 - 0.05, ly - 0.012, z + 0.04], 0.018, 6);
    for (const x of [lx0 + 0.02, lx1 - 0.04]) box("steel", x, x + 0.02, ly - 0.04, ly, z - 0.08, z + 0.08); // end caps
  }

  // ---------- mop bucket in the front -X corner ----------
  {
    const x = -W + 0.3, z = L - 0.35, h = 0.32;
    for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) box("dark", x + dx - 0.02, x + dx + 0.02, 0, 0.04, z + dz - 0.02, z + dz + 0.02);
    rod("yellow", [x, 0.04, z], [x, 0.04 + h, z], 0.15, 10, 0.19, false);
    rod("glass", [x, 0.04 + h, z], [x, 0.04 + h + 0.004, z], 0.17, 10, 0.17, false); // water
    box("yellow", x + 0.12, x + 0.24, h - 0.04, h + 0.16, z - 0.1, z + 0.1); // wringer
    box("dark", x + 0.13, x + 0.23, h + 0.16, h + 0.17, z - 0.08, z + 0.08);
    box("dark", x + 0.13, x + 0.15, h + 0.17, h + 0.4, z - 0.012, z + 0.012); // lever
    // the mop: strands in the water, handle leaning on the -X wall
    rod("steel", [x - 0.06, 0.3, z - 0.02], [-W + 0.015, 1.5, z - 0.02], 0.014, 6);
    rod("steel", [-W + 0.004, 1.5, z - 0.02], [-W + 0.03, 1.55, z - 0.02], 0.018, 6);
  }

  // ---------- meshes: one per material signature; the door on its hinge ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    cap: [c.dark, c.dark, 0.1, 0],
    dark: [c.dark, c.dark, 0.1, 0],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, -0.25, 0],
    locker: [c.locker, c.lockerShade, 0.1, 3],
    wood: [c.wood, c.woodShade, 0.1, 3],
    steel: [c.steel, c.steelShade, 0.1, 2],
    glass: [c.glass, c.glass, 0.1, 0],
    red: [c.red, c.red, 0.1, 2],
    yellow: [c.yellow, c.yellow, 0.1, 2],
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
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) body.add(toMesh(key, m, p, n));

  // the open door: built in its hinge frame, in a mount placed at the hinge, turning on a joint about y
  for (const k of Object.keys(soups)) delete soups[k];
  M = new THREE.Matrix4();
  door("dG", "dD", "dS");
  const mount = new THREE.Group();
  mount.name = "doorMount";
  hinge.decompose(mount.position, mount.quaternion, mount.scale);
  const doorJ = new THREE.Group();
  doorJ.name = "door";
  mount.add(doorJ);
  body.add(mount);
  joints.door = doorJ;
  const DM = { dG: MAT.locker, dD: MAT.dark, dS: MAT.steel };
  for (const [key, { p, n }] of Object.entries(soups)) doorJ.add(toMesh(key === "dG" ? "doorLocker" : key === "dD" ? "doorDark" : "doorSteel", DM[key], p, n));

  // ---------- rest and the door clip ----------
  const CLIPS = { door: 4 };
  const TAU = Math.PI * 2, DEG = Math.PI / 180, REST = 115;
  function pose(name) {
    let a = REST;
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`locker-room: no clip "${m[1]}" (clips: ${Object.keys(CLIPS).join(", ")})`);
      const u = ((((+m[2]) / CLIPS[m[1]]) % 1) + 1) % 1;
      a = REST + 9 * Math.sin(TAU * u) + 2.5 * Math.sin(2 * TAU * u + 0.9);
    } else if (name !== "rest") throw new Error(`locker-room: unknown pose "${name}" (rest, or door@<seconds>)`);
    doorJ.rotation.set(0, -a * DEG, 0);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

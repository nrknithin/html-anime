// planetarium.js - a planetarium interior for an anime date scene, built as a cutaway: a half dome open toward the
// camera over concentric rows of reclining seats, the dumbbell star projector at the centre, and a star field that
// turns about the polar axis (clip rotate).
// Contract: harness/lab/README.md. Meters, +Y up, the open (cut) side faces +Z, its left is +X, stands on y = 0,
// centred on x = 0, z = 0 (the dome centre sits behind the bbox centre; the cut plane is at z = SHIFT).
//
// Construction (triangle soups merged per material, every triangle wound to agree with its own normal):
//   SHELL    one lathe over the back half (azimuth +X -> -Z -> -X) of a closed profile: the cove wall (r 7.6, to the
//            springline at 2.6 m), the cove ledge out to the dome, the inner dome (R 8), the outer dome (R 8.3) and the
//            outer wall; the two cut ends are the profile polygon, so the section reads as one pale arch. A thin lip
//            juts 0.15 m inward on the cut face, hiding where stars leave the dome. Inner faces / outer + section.
//   FLOOR    a slab: the half disc plus a front apron (to z = 2.2) the projector stands on.
//   SEATS    concentric rows (opts.rows) around the projector, cut by two radial aisles; each seat a stem, a pan and a
//            steeply reclined back, facing the centre. The outer row's centre block is couple seats (one double pan
//            and back, a second material). Low aisle lights: small glowing blocks at both aisle edges of every row.
//   PROJECTOR  a stand (base disc, column, a fork with bearing hubs) holding a dumbbell on the polar axis (35 deg,
//            pointing up the back wall): two star balls with glowing lens dots, a truss, a centre cage ringed with
//            six planet projectors. The dumbbell is a joint that spins with the sky.
//   SKY      one mesh on the `sky` joint at the dome centre, its local +Y the polar axis: a full sphere (r 7.9) of
//            small diamond stars and bright four-point stars, eight constellations (dot-and-line shapes, the pole
//            star fixed on the axis), a ragged milky-way band on a great circle 62 deg off the pole with a dark rift.
//            Each element (star, line piece, band piece) is a few triangles of its own; pose() turns the joint, then
//            collapses (to the dome centre, zero area) every element that has left the half dome: in front of the
//            cut or below the springline. So the field turns as a whole and the cut slices it, as a section should.
// Proportions (real size, base unit the dome radius R = 8 m, a 16 m dome): springline 2.6 m, dome top 10.6 m inside,
//   10.9 m outside; cove wall r 7.6; rows at r 3.0 + 1.0 i; seats 0.56 m wide on a 0.62 m pitch, pan 0.45 m up, back
//   reclined 50 deg; projector centre at the dome centre, star balls r 0.6 at 1.25 m along the axis; about 11.7k tris (12.7k at rows 5), 9 meshes.
// Options: build(THREE, kit, colors, { height, rows }): height scales uniformly (default meta.height, the outer dome
//   top); rows = seat rows, 2-5 (default 4).
// Clip rotate (40 s, loops): one turn of the sky and the projector about the polar axis, counter-clockwise as seen
//   facing the pole (the back wall): pose("rotate@t").
// Colours (indigo): dome inside, cove wall and ledge sky #1b2d6b (flat); outside and the section line #e7eefc / moon
//   #d5e2ff; floor hair #16141c (flat, a dark carpet); seats accent #e23b4a / sky; couple seats iris #e7a04a / accent;
//   projector and stand moon / sky; lens dots, aisle lights and bright stars practical #f0c36a (flat, no hull); small
//   stars, constellation lines and the milky way moon (flat); the rift sky. Ink #101628.

export const meta = {
  name: "planetarium",
  height: 10.9,
  script: "indigo",
  colors: {
    domeIn: "#1b2d6b",
    shell: "#e7eefc", shellShade: "#d5e2ff",
    floor: "#16141c",
    seat: "#e23b4a", seatShade: "#1b2d6b",
    couple: "#e7a04a", coupleShade: "#e23b4a",
    machine: "#d5e2ff", machineShade: "#1b2d6b",
    glow: "#f0c36a",
    star: "#d5e2ff", starBright: "#f0c36a", rift: "#1b2d6b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const TAU = Math.PI * 2, D = Math.PI / 180;
  const height = opts.height ?? meta.height;
  const ROWS = Math.max(2, Math.min(5, Math.round(opts.rows ?? 4)));

  // ---------- dimensions (set frame: dome centre at (0, HW, 0), cut plane z = 0) ----------
  const R = 8, T = 0.3, HW = 2.6, RC = 7.6, W = R + T, FZ = 2.2, FT = 0.12;
  const LAT = 35 * D, AX = [0, Math.sin(LAT), -Math.cos(LAT)]; // polar axis, toward the back wall
  const SHIFT = (W - FZ) / 2; // centres the bbox on z = 0
  const P = (r, a, y) => [r * Math.sin(a), y, r * Math.cos(a)]; // a = 0 on +Z, PI/2 on +X, PI on -Z

  const root = new THREE.Group();
  root.name = "planetarium";
  const body = new THREE.Group();
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const set = new THREE.Group();
  set.name = "set";
  set.position.z = SHIFT;
  body.add(set);
  const joints = {};

  // ---------- vector helpers ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
  // deterministic hash in [0, 1)
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- bags: per-key triangle soups with normals ----------
  function bag() {
    const s = {};
    const S = (k) => (s[k] ??= { p: [], n: [] });
    function triS(k, a, b, e, na, nb, ne) {
      const f = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...f) < 1e-10) return;
      const o = S(k);
      if (dot(f, add(add(na, nb), ne)) < 0) { o.p.push(...a, ...e, ...b); o.n.push(...na, ...ne, ...nb); }
      else { o.p.push(...a, ...b, ...e); o.n.push(...na, ...nb, ...ne); }
    }
    function tri(k, a, b, e, hint) {
      let f = cross(sub(b, a), sub(e, a));
      if (Math.hypot(...f) < 1e-10) return;
      if (dot(f, hint) < 0) f = mul(f, -1);
      f = norm(f);
      triS(k, a, b, e, f, f, f);
    }
    const quad = (k, a, b, e, d, hint) => (tri(k, a, b, e, hint), tri(k, a, e, d, hint));
    const quadS = (k, a, b, e, d, na, nb, ne, nd) => (triS(k, a, b, e, na, nb, ne), triS(k, a, e, d, na, ne, nd));
    // oriented box: centre o, half-extent vectors ex, ey, ez
    function obox(k, o, ex, ey, ez) {
      const v = (i) => add(add(add(o, mul(ex, i & 1 ? 1 : -1)), mul(ey, i & 2 ? 1 : -1)), mul(ez, i & 4 ? 1 : -1));
      for (const f of [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]) {
        const q = f.map(v), m = mul(add(add(q[0], q[1]), add(q[2], q[3])), 0.25);
        quad(k, q[0], q[1], q[2], q[3], sub(m, o));
      }
    }
    // closed cylinder a -> b: smooth sides, flat caps
    function rod(k, a, b, r, seg = 10) {
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
    function sphere(k, o, r, ws = 14, hs = 9) {
      const pt = (i, j) => { const th = (j / hs) * Math.PI, ph = (i / ws) * TAU; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; };
      for (let j = 0; j < hs; j++)
        for (let i = 0; i < ws; i++) {
          const n = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)], q = n.map((x) => add(o, mul(x, r)));
          if (j === 0) triS(k, q[0], q[2], q[3], n[0], n[2], n[3]);
          else if (j === hs - 1) triS(k, q[0], q[1], q[2], n[0], n[1], n[2]);
          else quadS(k, q[0], q[1], q[2], q[3], n[0], n[1], n[2], n[3]);
        }
    }
    return { s, tri, quad, triS, quadS, obox, rod, sphere };
  }
  function buf(v) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(v.n, 3));
    return g;
  }
  function grouped(b, keys) {
    const p = [], n = [], g = new THREE.BufferGeometry();
    let start = 0;
    keys.forEach((k, gi) => {
      const v = b.s[k];
      if (!v) return;
      for (let i = 0; i < v.p.length; i++) { p.push(v.p[i]); n.push(v.n[i]); }
      g.addGroup(start, v.p.length / 3, gi);
      start += v.p.length / 3;
    });
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    return g;
  }
  // MAT: key -> [base, shade, threshold]
  const MAT = {
    domeIn: [c.domeIn, c.domeIn, 0],
    shell: [c.shell, c.shellShade, 0.1],
    floor: [c.floor, c.floor, 0],
    seat: [c.seat, c.seatShade, 0.15],
    couple: [c.couple, c.coupleShade, 0.15],
    machine: [c.machine, c.machineShade, 0.2],
    glow: [c.glow, c.glow, 0],
    star: [c.star, c.star, 0], starBright: [c.starBright, c.starBright, 0], rift: [c.rift, c.rift, 0],
  };
  function meshOf(b, keys, { px = 3, outline = true, name } = {}) {
    const g = keys.length === 1 ? buf(b.s[keys[0]]) : grouped(b, keys);
    const [b0, s0, t0] = MAT[keys[0]];
    const m = kit.toon(g, b0, s0, { threshold: t0, px, outline });
    if (keys.length > 1) m.material = keys.map((k) => kit.cel(MAT[k][0], MAT[k][1], { threshold: MAT[k][2] }));
    m.name = name ?? keys.join("+");
    return m;
  }

  // ---------- shell: cove wall, ledge and dome (one lathe over the back half) ----------
  const shell = bag();
  {
    const ARC = 18;
    // profile [r, y, normal2, key]: closed, solid on the left; per-vertex normals for the arcs
    const prof = [];
    const seg = (pts, key) => prof.push({ pts, key });
    seg([[RC, 0, [0, -1]], [W, 0, [0, -1]]], "shell");
    seg([[W, 0, [1, 0]], [W, HW, [1, 0]]], "shell");
    const outer = [], inner = [];
    for (let i = 0; i <= ARC; i++) {
      const t = (i / ARC) * (Math.PI / 2); // 0 at the springline, PI/2 at the top
      outer.push([W * Math.cos(t), HW + W * Math.sin(t), [Math.cos(t), Math.sin(t)]]);
      inner.push([R * Math.cos(t), HW + R * Math.sin(t), [-Math.cos(t), -Math.sin(t)]]);
    }
    seg(outer, "shell");
    seg(inner.slice().reverse(), "domeIn");
    seg([[R, HW, [0, 1]], [RC, HW, [0, 1]]], "domeIn");
    seg([[RC, HW, [-1, 0]], [RC, 0, [-1, 0]]], "domeIn");
    const SEGS = 36, A0 = Math.PI / 2;
    for (let j = 0; j < SEGS; j++) {
      const t0 = A0 + (j / SEGS) * Math.PI, t1 = A0 + ((j + 1) / SEGS) * Math.PI;
      const N = (n, t) => [n[0] * Math.sin(t), n[1], n[0] * Math.cos(t)];
      for (const { pts, key } of prof)
        for (let i = 0; i < pts.length - 1; i++) {
          const [r0, y0, n0] = pts[i], [r1, y1, n1] = pts[i + 1];
          if (r0 < 1e-6 && r1 < 1e-6) continue;
          shell.quadS(key, P(r0, t0, y0), P(r0, t1, y0), P(r1, t1, y1), P(r1, t0, y1), N(n0, t0), N(n0, t1), N(n1, t1), N(n1, t0));
        }
    }
    // the two cut ends: the profile polygon (outer arc up, inner arc down), facing +Z
    const loop = [[RC, 0], [W, 0], ...outer.map((q) => [q[0], q[1]]), ...inner.slice().reverse().map((q) => [q[0], q[1]]), [RC, HW]];
    const clean = loop.filter((q, i) => i === 0 || Math.hypot(q[0] - loop[i - 1][0], q[1] - loop[i - 1][1]) > 1e-6);
    const tris = THREE.ShapeUtils.triangulateShape(clean.map((q) => new THREE.Vector2(q[0], q[1])), []);
    for (const side of [1, -1])
      for (const [i0, i1, i2] of tris) {
        const v = (i) => [side * clean[i][0], clean[i][1], 0];
        shell.tri("shell", v(i0), v(i1), v(i2), [0, 0, 1]);
      }
    // the lip on the cut face: a thin arch, r R-0.15 .. R, z 0 .. 0.05
    const LS = 36, ri = R - 0.15, z1 = 0.05;
    for (let i = 0; i < LS; i++) {
      const a0 = (i / LS) * Math.PI, a1 = ((i + 1) / LS) * Math.PI;
      const q = (r, a, z) => [r * Math.cos(a), HW + r * Math.sin(a), z];
      const nIn = (a) => [-Math.cos(a), -Math.sin(a), 0];
      shell.quad("shell", q(ri, a0, 0), q(ri, a1, 0), q(ri, a1, z1), q(ri, a0, z1), nIn((a0 + a1) / 2));
      shell.quad("shell", q(R, a0, z1), q(R, a1, z1), q(ri, a1, z1), q(ri, a0, z1), [0, 0, 1]);
      shell.quad("shell", q(R, a0, 0), q(R, a1, 0), q(R, a1, z1), q(R, a0, z1), mul(nIn((a0 + a1) / 2), -1));
    }
    for (const a of [0, Math.PI]) {
      const q = (r, z) => [r * Math.cos(a), HW, z];
      shell.quad("shell", q(ri, 0), q(R, 0), q(R, z1), q(ri, z1), [0, -1, 0]);
    }
  }
  set.add(meshOf(shell, ["shell", "domeIn"], { px: 4, name: "shell" }));

  // ---------- floor ----------
  const floor = bag();
  {
    const poly = [[W, FZ], [W, 0]];
    const FS = 36;
    for (let i = 1; i < FS; i++) { const a = Math.PI / 2 + (i / FS) * Math.PI; poly.push([W * Math.sin(a), W * Math.cos(a)]); }
    poly.push([-W, 0], [-W, FZ]);
    const tris = THREE.ShapeUtils.triangulateShape(poly.map((q) => new THREE.Vector2(q[0], q[1])), []);
    for (const [i0, i1, i2] of tris) {
      const v = (i, y) => [poly[i][0], y, poly[i][1]];
      floor.tri("floor", v(i0, FT), v(i1, FT), v(i2, FT), [0, 1, 0]);
      floor.tri("floor", v(i0, 0), v(i1, 0), v(i2, 0), [0, -1, 0]);
    }
    const cx = 0, cz = -2; // a point inside, for the side hints
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const e = [b[0] - a[0], b[1] - a[1]];
      let n = [e[1], 0, -e[0]];
      if (dot(n, [m[0] - cx, 0, m[1] - cz]) < 0) n = mul(n, -1);
      floor.quad("floor", [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], FT, b[1]], [a[0], FT, a[1]], n);
    }
  }
  set.add(meshOf(floor, ["floor"], { px: 3, name: "floor" }));

  // ---------- seats, couple seats and aisle lights ----------
  const seats = bag(), lights = bag();
  {
    const PITCH = 0.62, SW = 0.28, AISLE = 0.5; // seat half width, aisle half width (m)
    const AISLES = [Math.PI / 3, (2 * Math.PI) / 3]; // b: 0 at +X (the cut), PI/2 at the back, PI at -X
    const at = (r, b) => [r * Math.cos(b), FT, -r * Math.sin(b)];
    function seat(key, r, b, hw) {
      const o = at(r, b);
      const f = [-Math.cos(b), 0, Math.sin(b)]; // toward the centre
      const t = [Math.sin(b), 0, Math.cos(b)];
      const up = [0, 1, 0];
      // stem
      seats.obox(key, add(o, [0, 0.16, 0]), mul(t, hw * 0.35), mul(up, 0.16), mul(f, 0.12));
      // pan, tipped back 8 deg
      const pt = 8 * D, pf = add(mul(f, Math.cos(pt)), mul(up, Math.sin(pt))), pu = add(mul(up, Math.cos(pt)), mul(f, -Math.sin(pt)));
      seats.obox(key, add(o, [0, 0.4, 0]), mul(t, hw), mul(pu, 0.06), mul(pf, 0.26));
      // back, reclined 50 deg from vertical, rising from the pan's rear edge
      const rc = 50 * D, bd = add(mul(up, Math.cos(rc)), mul(f, -Math.sin(rc))), bn = add(mul(up, Math.sin(rc)), mul(f, Math.cos(rc)));
      const rear = add(add(o, [0, 0.42, 0]), mul(f, -0.22));
      seats.obox(key, add(add(rear, mul(bd, 0.42)), mul(bn, -0.04)), mul(t, hw), mul(bd, 0.42), mul(bn, 0.06));
    }
    for (let i = 0; i < ROWS; i++) {
      const r = 3.0 + i * 1.0;
      const bEdge = Math.asin(0.55 / r); // keep clear of the cut
      const blocks = [[bEdge, AISLES[0] - AISLE / r], [AISLES[0] + AISLE / r, AISLES[1] - AISLE / r], [AISLES[1] + AISLE / r, Math.PI - bEdge]];
      blocks.forEach(([b1, b2], bi) => {
        const L = r * (b2 - b1);
        const couple = i === ROWS - 1 && bi === 1;
        const pitch = couple ? PITCH * 2 : PITCH;
        const n = Math.floor(L / pitch);
        const span = n * pitch, s0 = b1 + (L - span) / 2 / r;
        for (let k = 0; k < n; k++) {
          const b = s0 + ((k + 0.5) * pitch) / r;
          if (couple) seat("couple", r, b, SW * 2 + 0.03);
          else seat("seat", r, b, SW);
        }
      });
      // aisle lights at both edges of both aisles, at the row's front
      for (const a of AISLES)
        for (const sgn of [-1, 1]) {
          const b = a + (sgn * (AISLE - 0.1)) / r;
          const o = add(at(r + 0.25, b), [0, 0.035, 0]);
          lights.obox("glow", o, [0.06, 0, 0], [0, 0.035, 0], [0, 0, 0.06]);
        }
    }
    // a light at the foot of the cove wall at the end of each aisle
    for (const a of AISLES) lights.obox("glow", add(at(RC - 0.12, a), [0, 0.05, 0]), [0.08, 0, 0], [0, 0.05, 0], [0, 0, 0.08]);
  }
  set.add(meshOf(seats, ["seat"], { px: 2, name: "seats" }));
  set.add(meshOf(seats, ["couple"], { px: 2, name: "coupleSeats" }));
  set.add(meshOf(lights, ["glow"], { outline: false, name: "aisleLights" }));

  // ---------- projector: stand (static) and dumbbell (joint) ----------
  const stand = bag();
  {
    stand.rod("machine", [0, FT, 0], [0, FT + 0.15, 0], 0.7, 16);
    stand.rod("machine", [0, FT + 0.15, 0], [0, 1.8, 0], 0.2, 10);
    stand.obox("machine", [0, 1.85, 0], [0.68, 0, 0], [0, 0.08, 0], [0, 0, 0.14]);
    for (const sx of [-1, 1]) {
      stand.obox("machine", [sx * 0.62, (1.85 + HW) / 2, 0], [0.06, 0, 0], [0, (HW - 1.85) / 2 + 0.06, 0], [0, 0, 0.12]);
      stand.rod("machine", [sx * 0.5, HW, 0], [sx * 0.72, HW, 0], 0.13, 10);
    }
  }
  set.add(meshOf(stand, ["machine"], { px: 3, name: "stand" }));

  const centre = new THREE.Group();
  centre.name = "centre";
  centre.position.set(0, HW, 0);
  set.add(centre);
  const qPole = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...AX));
  const polar = new THREE.Group(); // local +Y = the polar axis
  polar.name = "polar";
  polar.quaternion.copy(qPole);
  centre.add(polar);

  const projector = new THREE.Group();
  projector.name = "projector";
  polar.add(projector);
  joints.projector = projector;
  const dumb = bag(), lens = bag();
  {
    const HL = 1.25, SR = 0.6;
    for (const sy of [-1, 1]) {
      dumb.sphere("machine", [0, sy * HL, 0], SR, 14, 9);
      dumb.rod("machine", [0, sy * (HL + SR - 0.05), 0], [0, sy * (HL + SR + 0.08), 0], 0.14, 8); // end lens
      // lens dots: a Fibonacci spread over the ball, skipping the neck side
      const N = 26;
      for (let i = 0; i < N; i++) {
        const yy = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - yy * yy), ph = i * 2.39996;
        const n = [rr * Math.cos(ph), yy * sy, rr * Math.sin(ph)];
        if (n[1] * sy < -0.55) continue;
        const o = add([0, sy * HL, 0], mul(n, SR + 0.012));
        const u = norm(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = cross(n, u);
        const rad = 0.07;
        for (let k = 0; k < 6; k++) {
          const a0 = (k / 6) * TAU, a1 = ((k + 1) / 6) * TAU;
          lens.tri("glow", o, add(o, add(mul(u, Math.cos(a0) * rad), mul(v, Math.sin(a0) * rad))), add(o, add(mul(u, Math.cos(a1) * rad), mul(v, Math.sin(a1) * rad))), n);
        }
      }
    }
    dumb.rod("machine", [0, -HL, 0], [0, HL, 0], 0.13, 8); // truss
    dumb.rod("machine", [0, -0.5, 0], [0, 0.5, 0], 0.34, 12); // centre cage
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU, o = [0.4 * Math.cos(a), 0, 0.4 * Math.sin(a)];
      const rdir = [Math.cos(a), 0, Math.sin(a)], tdir = [-Math.sin(a), 0, Math.cos(a)];
      dumb.obox("machine", o, mul(rdir, 0.07), [0, 0.3, 0], mul(tdir, 0.07));
    }
  }
  projector.add(meshOf(dumb, ["machine"], { px: 3, name: "dumbbell" }));
  projector.add(meshOf(lens, ["glow"], { outline: false, name: "lensDots" }));

  // ---------- sky: a star sphere on its own joint ----------
  const sky = new THREE.Group();
  sky.name = "sky";
  polar.add(sky);
  joints.sky = sky;
  const RS = R - 0.12, RB = R - 0.06, RR = R - 0.09;
  const els = { star: [], starBright: [], rift: [] }; // per key: elements, each an array of triangles' vertices
  const tangent = (n) => { const u = norm(cross(n, Math.abs(n[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0])); return [u, cross(n, u)]; };
  // wind every triangle to face the centre (the field is seen from inside the dome)
  function elem(key, trisList) {
    const out = [];
    for (const [a, b, e] of trisList) {
      const f = cross(sub(b, a), sub(e, a)), m = add(add(a, b), e);
      if (dot(f, m) > 0) out.push(a, e, b); else out.push(a, b, e);
    }
    els[key].push(out);
  }
  function diamond(key, n, r, rr = RS) {
    const [u, v] = tangent(n), o = mul(n, rr);
    const q = [add(o, mul(u, r)), add(o, mul(v, r)), add(o, mul(u, -r)), add(o, mul(v, -r))];
    elem(key, [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]);
  }
  function sparkle(key, n, r, rr = RS) {
    const [u, v] = tangent(n), o = mul(n, rr), tr = [];
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, l = k % 2 ? r * 0.28 : r;
      pts.push(add(o, add(mul(u, Math.cos(a) * l), mul(v, Math.sin(a) * l))));
    }
    for (let k = 0; k < 8; k++) tr.push([o, pts[k], pts[(k + 1) % 8]]);
    elem(key, tr);
  }
  // a line between two directions, in pieces of <= 0.45 m along the great circle
  function line(key, n0, n1, w, rr = RS) {
    const ang = Math.acos(Math.max(-1, Math.min(1, dot(n0, n1))));
    const pieces = Math.max(1, Math.ceil((ang * rr) / 0.45));
    const slerp = (t) => norm(add(mul(n0, Math.sin((1 - t) * ang)), mul(n1, Math.sin(t * ang))));
    for (let i = 0; i < pieces; i++) {
      const a = slerp(i / pieces), b = slerp((i + 1) / pieces);
      const d = norm(sub(b, a)), side = norm(cross(a, d));
      const A = mul(a, rr), B = mul(b, rr);
      elem(key, [[add(A, mul(side, w)), add(B, mul(side, w)), add(B, mul(side, -w))], [add(A, mul(side, w)), add(B, mul(side, -w)), add(A, mul(side, -w))]]);
    }
  }
  // direction from a centre direction plus a tangent-plane offset in metres
  const offDir = (cn, u, v, x, y) => norm(add(mul(cn, RS), add(mul(u, x), mul(v, y))));
  const fromSph = (dec, ra) => [Math.cos(dec) * Math.cos(ra), Math.sin(dec), Math.cos(dec) * Math.sin(ra)]; // local +Y = pole

  // the pole star, fixed on the axis
  sparkle("starBright", [0, 1, 0], 0.3);
  // field stars: a jittered Fibonacci sphere
  const NS = 1100;
  for (let i = 0; i < NS; i++) {
    const y = 1 - (2 * (i + hash(i))) / NS, rr = Math.sqrt(Math.max(0, 1 - y * y)), ph = i * 2.39996 + hash(i + 7) * 0.8;
    const n = [rr * Math.cos(ph), y, rr * Math.sin(ph)];
    if (n[1] > 0.995) continue;
    const h = hash(i + 13);
    if (h > 0.94) sparkle("starBright", n, 0.16 + 0.1 * hash(i + 3));
    else diamond("star", n, 0.035 + 0.05 * h * h);
  }
  // constellations: [dec, ra, points [x, y] m, edges]
  const CONS = [
    [62 * D, 20 * D, [[0, 0], [0.9, 0.2], [1.8, 0.1], [2.5, -0.25], [2.7, -1.05], [3.7, -1.15], [3.8, -0.3]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]],
    [60 * D, 200 * D, [[0, 0], [0.8, -0.9], [1.6, -0.2], [2.5, -1.0], [3.3, 0.15]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
    [8 * D, 110 * D, [[0, 2.2], [1.9, 2.4], [0.65, 1.0], [0.95, 0.92], [1.25, 0.84], [0.1, -0.5], [2.0, -0.3], [0.95, 3.0]], [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [1, 7], [0, 1]]],
    [25 * D, 300 * D, [[0, 0], [2.6, 0.5], [1.0, 2.4]], [[0, 1], [1, 2], [2, 0]]],
    [-20 * D, 250 * D, [[0, 1.6], [0.1, -1.4], [-1.0, 0.3], [1.0, 0.1]], [[0, 1], [2, 3]]],
    [-5 * D, 20 * D, [[0, 0], [0.7, 0.5], [1.5, 0.6], [2.2, 0.1], [2.5, -0.7], [2.2, -1.5], [1.5, -2.0], [0.8, -1.9], [0.5, -1.4]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]],
    [38 * D, 150 * D, [[0, 0], [0.9, 0.6], [1.9, 0.4], [2.2, -0.6], [1.2, -0.8]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 4]]],
    [30 * D, 60 * D, [[0, 0], [1.2, 1.0], [2.4, 0.2], [1.3, -1.1], [1.2, 0]], [[0, 4], [1, 4], [2, 4], [3, 4]]],
  ];
  for (const [dec, ra, pts, edges] of CONS) {
    const cn = fromSph(dec, ra), [u, v] = tangent(cn);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const dirs = pts.map(([x, y]) => offDir(cn, u, v, x - cx, y - cy));
    for (const [a, b] of edges) line("star", dirs[a], dirs[b], 0.028, RS + 0.01);
    dirs.forEach((d, i) => sparkle("starBright", d, 0.2 + 0.08 * hash(i + dec * 100)));
  }
  // milky way: a great circle 62 deg off the pole, ragged edges, a dark rift along part of it
  {
    const tilt = 62 * D, gn = [Math.sin(tilt), Math.cos(tilt), 0]; // band plane normal
    const e1 = norm(cross(gn, [0, 0, 1])), e2 = cross(gn, e1);
    const STEPS = 170;
    const wob = (s) => 0.35 * Math.sin(3 * s) + 0.2 * Math.sin(7 * s + 1.3);
    const wA = (s) => 0.55 + 0.35 * Math.sin(5 * s + 2) ** 2 + 0.22 * Math.sin(13 * s + 0.4) + 0.12 * Math.sin(29 * s);
    const wB = (s) => 0.5 + 0.3 * Math.sin(4 * s + 0.7) ** 2 + 0.2 * Math.sin(11 * s + 2.1) + 0.12 * Math.sin(31 * s + 1);
    // a point at arc s (rad) and offset y (m) off the band's centre line
    const bp = (s, y, rr) => mul(norm(add(add(mul(e1, Math.cos(s)), mul(e2, Math.sin(s))), mul(gn, y / R))), rr);
    for (let i = 0; i < STEPS; i++) {
      const s0 = (i / STEPS) * TAU, s1 = ((i + 1) / STEPS) * TAU;
      const lo0 = wob(s0) - wA(s0), hi0 = wob(s0) + wB(s0), lo1 = wob(s1) - wA(s1), hi1 = wob(s1) + wB(s1);
      for (let k = 0; k < 3; k++) {
        const f0 = k / 3, f1 = (k + 1) / 3, L = (a, b, f) => a + (b - a) * f;
        const A = bp(s0, L(lo0, hi0, f0), RB), B = bp(s1, L(lo1, hi1, f0), RB), C = bp(s1, L(lo1, hi1, f1), RB), E = bp(s0, L(lo0, hi0, f1), RB);
        elem("star", [[A, B, C], [A, C, E]]);
      }
      // the rift: a thin dark lane along most of the band, in broken lengths
      const rw = (s) => 0.07 + 0.09 * Math.sin(3 * s + 0.3) + 0.05 * Math.sin(17 * s);
      const ry = (s) => wob(s) + 0.3 * (wB(s) - wA(s)) + 0.1 * Math.sin(9 * s);
      if (rw(s0) > 0.03 && rw(s1) > 0.03) {
        const w0 = rw(s0), w1 = rw(s1), y0 = ry(s0), y1 = ry(s1);
        elem("rift", [[bp(s0, y0 - w0, RR), bp(s1, y1 - w1, RR), bp(s1, y1 + w1, RR)], [bp(s0, y0 - w0, RR), bp(s1, y1 + w1, RR), bp(s0, y0 + w0, RR)]]);
      }
      // cloudy lobes off the band's edges
      if (i % 4 === 0) {
        const side = hash(i + 41) > 0.5 ? 1 : -1, rl = 0.25 + 0.3 * hash(i + 43);
        const yc = wob(s0) + (side > 0 ? wB(s0) : -wA(s0)) * 0.8;
        const ctr = norm(bp(s0, yc, 1)), [u, v] = tangent(ctr), tr = [], o = mul(ctr, RB);
        const ring = Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * TAU; return add(o, add(mul(u, Math.cos(a) * rl * 1.6), mul(v, Math.sin(a) * rl))); });
        for (let k = 0; k < 7; k++) tr.push([o, ring[k], ring[(k + 1) % 7]]);
        elem("star", tr);
      }
      // a few clumps of bright star dust along the band
      if (hash(i + 500) > 0.72) {
        const yy = wob(s0) + (hash(i + 900) - 0.5) * 1.6;
        diamond("starBright", norm(bp(s0, yy, 1)), 0.05 + 0.04 * hash(i + 77), RS);
      }
    }
  }
  // flatten the elements into one geometry, one material group per key
  const KEYS = ["star", "starBright", "rift"];
  const skyPos = [], skyNrm = [], skyEls = []; // skyEls: [first float index, float count]
  const skyGeo = new THREE.BufferGeometry();
  {
    let start = 0;
    KEYS.forEach((k, gi) => {
      const first = start;
      for (const e of els[k]) {
        skyEls.push([skyPos.length, e.length * 3]);
        for (const p of e) { skyPos.push(...p); skyNrm.push(...mul(norm(p), -1)); }
        start += e.length;
      }
      skyGeo.addGroup(first, start - first, gi);
    });
  }
  const REST = new Float32Array(skyPos);
  skyGeo.setAttribute("position", new THREE.Float32BufferAttribute(skyPos, 3));
  skyGeo.setAttribute("normal", new THREE.Float32BufferAttribute(skyNrm, 3));
  const skyMesh = kit.toon(skyGeo, c.star, c.star, { threshold: 0, outline: false });
  skyMesh.material = KEYS.map((k) => kit.cel(MAT[k][0], MAT[k][1], { threshold: 0 }));
  skyMesh.name = "skyField";
  sky.add(skyMesh);

  // ---------- poses and clips ----------
  // sign: theta < 0 about the polar axis turns the sky counter-clockwise as seen facing the pole (the back wall).
  const CLIPS = { rotate: 40 };
  const mSky = new THREE.Matrix4(), tmp = new THREE.Vector3();
  function apply(ph) {
    const th = -TAU * ph;
    sky.rotation.set(0, th, 0);
    projector.rotation.set(0, th, 0);
    // cut the field to the half dome: an element survives only if every vertex is behind the cut and above the
    // springline (in the dome-centre frame); the rest collapse to the centre
    sky.updateMatrix(); polar.updateMatrix();
    mSky.multiplyMatrices(polar.matrix, sky.matrix);
    const pos = skyGeo.attributes.position.array;
    for (const [f0, cnt] of skyEls) {
      let keep = true;
      for (let i = f0; i < f0 + cnt; i += 3) {
        tmp.set(REST[i], REST[i + 1], REST[i + 2]).applyMatrix4(mSky);
        if (tmp.z > -0.03 || tmp.y < 0.05) { keep = false; break; }
      }
      for (let i = f0; i < f0 + cnt; i++) pos[i] = keep ? REST[i] : 0;
    }
    skyGeo.attributes.position.needsUpdate = true;
    skyGeo.computeBoundingBox();
    skyGeo.computeBoundingSphere();
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      if (!CLIPS[m[1]]) throw new Error(`planetarium: no clip "${m[1]}" (clips: rotate)`);
      const T0 = CLIPS[m[1]];
      return apply((((+m[2] % T0) + T0) % T0) / T0);
    }
    if (name !== "rest") throw new Error(`planetarium: unknown pose "${name}" (rest, or rotate@<seconds>)`);
    apply(0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

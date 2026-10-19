// bike-shed.js - the bicycle parking shed (churinjo) of a Japanese school: a long open shed with a single-slope
// corrugated roof on green steel posts, a concrete pad, and a row of parked city bicycles (mamachari) in a rack.
// Static. Contract: harness/lab/README.md. Meters, +Y up, the open (front) side faces +Z, its left is +X, stands on
// y = 0, centred on x = 0, z = 0 (the bbox of the set). One set with models/school.js (same script, same fence green).
//
// Construction (boxes, swept tubes, tori and one corrugated sheet; all triangle soups merged per material across the
// shed and every bike, so twenty bikes add no meshes; boxes and the sheet are flat-shaded, tubes and tori carry
// radial normals so a 6-sided tube reads round):
//   SHED   a concrete pad; two rows of square steel posts (one per bay, about 2.4 m), a beam along the top of each row,
//          a sloping rafter over every post pair, four purlins along X and a gutter at the low back edge. ROOF: a
//          mono-pitch sheet falling to the back, a closed corrugated solid (top and underside follow one 1 - cos wave
//          across X, so the front edge is the scalloped profile). Each corrugation's +X flank faces the light and the
//          -X flank does not, so the top and (with its own threshold) the underside both band lit / shade.
//   RACK   a diagonal rack (naname-oki, every slot turned 34 deg toward -X, so handlebars and baskets clear each other
//          at 0.62 m and the front-left camera sees the bikes' left sides): two low steel rails along X and a pair of
//          hoop guides per slot straddling the front wheel; empty slots show their hoops.
//   BIKE   bike(): one mamachari, local frame (faces +Z, centred on its own x = z = 0, wheels on y = 0). 26" wheels
//          (dark tori with a thin rim and hub), a step-through frame (one curved down tube from the head tube to the
//          bottom bracket, seat tube, chain and seat stays, fork), upright swept-back handlebar on a tall stem, a wide
//          saddle, a wire front basket over the front wheel (a tapered open box with a wire rim), a flat rear rack,
//          two mudguards (arc bands), a chain case on the -X side, a centre kickstand down behind the rear wheel,
//          crank and pedals, a small yellow dynamo lamp. Rims, spokes, struts and the stand carry no hull (too thin).
//          Bikes stand in slots 0.62 m apart; a hash of the slot index (sin hash, no Math.random) picks which slots
//          stay empty, the frame colour and a small extra yaw (+-4 deg) and shift, so the row is varied but the same
//          every build.
//   Every triangle is wound away from a point inside its solid (box centre, tube or torus axis, below / above the
//   sheet), never by hand.
// Proportions (real size; base unit the bay B = 2.4 m): shed 12 m long (5 bays) x 3 m deep between the post faces;
//   roof top 2.40 at the front eave, 2.12 at the back, overhanging 0.35 front, 0.2 back and ends; posts 0.08 square.
//   Bike: wheel r 0.33, wheelbase 1.1, saddle top 0.88, handlebar 1.0, 0.58 wide; basket 0.36 x 0.28 x 0.24, top 0.95.
// Options: build(THREE, kit, colors, { height, length, bikes }).
//   height  scales everything uniformly so the front eave top is `height` (default 2.40 m).
//   length  shed length in metres (default 12; bays of about 2.4 m are recomputed, at least 2 m).
//   bikes   how many bikes are parked (default: about 80 % of the slots, 14 of 18); clamped to the slot count.
// Budget: 25.1k triangles in 11 meshes at defaults (about 1.45k a bike, the shed and rack 4.8k); 18 m / 40 bikes 48k.
//   Ink: shed 2.5-3.5 px, bike parts 1.5 px, so a bike seen 40 px tall keeps its colour.
// Colours (meadow, as models/school.js), base / shade:
//   pad                    sky #d7ecef / skin #f0c2ae, threshold 0.1
//   posts, beams, rack     iris #3f8a47 / hair #2c5131 (the school fence green)
//   roof top / underside   line #a9d16e / iris #3f8a47 (green corrugated sheet), bands by threshold
//   tyres, saddles, grips  hair #2c5131, one tone (also the black bikes' frames)
//   chrome (bars, basket, rack, mudguards, stand)   sclera #f6f3ee / sky #d7ecef
//   frames                 red accent #d9483b / hair; white moon #f7f3e1 / skin; yellow practical #f2c94c / skin;
//                          pink skin #f0c2ae / accent; black hair (the tyres' material); lamp practical / skin

export const meta = {
  name: "bike-shed",
  height: 2.4,
  script: "meadow",
  colors: {
    pad: "#d7ecef", padShade: "#f0c2ae",
    steel: "#3f8a47", steelShade: "#2c5131",
    roof: "#a9d16e", roofShade: "#3f8a47",
    rubber: "#2c5131",
    chrome: "#f6f3ee", chromeShade: "#d7ecef",
    red: "#d9483b", redShade: "#2c5131",
    white: "#f7f3e1", whiteShade: "#f0c2ae",
    yellow: "#f2c94c", yellowShade: "#f0c2ae",
    pink: "#f0c2ae", pinkShade: "#d9483b",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { height = meta.height } = opts;
  const length = Math.max(2, opts.length ?? 12);
  const root = new THREE.Group();
  root.name = "bike-shed";
  const body = new THREE.Group(); // the uniform size scale lives here
  body.name = "body";
  body.scale.setScalar(height / meta.height);
  root.add(body);
  const joints = {};

  // ---------- triangle soups with normals, through a placement matrix ----------
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
  // one triangle wound away from `ref`; normals per vertex, or the face normal
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const m = mul(add(add(a, b), e), 1 / 3);
    const flip = dot(n, sub(m, ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    put(s, a, na ?? n), put(s, B, NB ?? n), put(s, E, NE ?? n);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  // convex hexahedron: p[0..3] one face, p[4..7] the opposite face in the same order
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  const box = (key, x0, x1, y0, y1, z0, z1) =>
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  // a box whose top and bottom follow y = f(z) + const (the roof slope)
  const slopeBox = (key, x0, x1, z0, z1, bot, top) =>
    hex(key, [[x0, bot(z0), z0], [x1, bot(z0), z0], [x1, bot(z1), z1], [x0, bot(z1), z1], [x0, top(z0), z0], [x1, top(z0), z0], [x1, top(z1), z1], [x0, top(z1), z1]]);
  // a swept tube along a polyline with rounded corners; pn: a direction off the tube's plane for the ring basis
  function tube(key, pts, r, pn = [1, 0, 0], { bend = 0.04, sides = 6 } = {}) {
    const path = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const P = pts[i];
      if (i === 0 || i === n - 1 || bend <= 0) { path.push(P); continue; }
      const A = pts[i - 1], C = pts[i + 1];
      const da = nrm(sub(A, P)), dc = nrm(sub(C, P));
      const t = Math.min(bend, Math.hypot(...sub(A, P)) / 2.2, Math.hypot(...sub(C, P)) / 2.2);
      const p0 = add(P, mul(da, t)), p2 = add(P, mul(dc, t));
      for (const u of [0, 0.5, 1]) path.push([0, 1, 2].map((k) => (1 - u) * (1 - u) * p0[k] + 2 * u * (1 - u) * P[k] + u * u * p2[k]));
    }
    const L = path.length;
    const rings = path.map((P, i) => {
      const T = nrm(sub(path[Math.min(L - 1, i + 1)], path[Math.max(0, i - 1)]));
      let u = sub(pn, mul(T, dot(pn, T)));
      if (Math.hypot(...u) < 1e-4) u = sub([0, 1, 0], mul(T, T[1]));
      u = nrm(u);
      const w = cross(T, u);
      const ring = [];
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const d = add(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
        ring.push({ q: add(P, mul(d, r)), n: d });
      }
      return { P, T, ring };
    });
    for (let i = 0; i < L - 1; i++) {
      const R0 = rings[i], R1 = rings[i + 1];
      const ref = mul(add(R0.P, R1.P), 0.5);
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const [a, b, e, d] = [R0.ring[j], R0.ring[k], R1.ring[k], R1.ring[j]];
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
    }
    for (const [R, s] of [[rings[0], -1], [rings[L - 1], 1]]) {
      const ref = sub(R.P, mul(R.T, s * r)), cn = mul(R.T, s);
      for (let j = 1; j < sides - 1; j++) tri(key, R.ring[0].q, R.ring[j].q, R.ring[j + 1].q, ref, cn, cn, cn);
    }
  }
  // a torus in the YZ plane (a wheel turning about X): centre (y, z), ring radius R, tube radius r
  function torus(key, y, z, R, r, { segs = 18, sides = 5, sx = 1 } = {}) {
    const pt = (i, j) => {
      const a = (i / segs) * Math.PI * 2, b = (j / sides) * Math.PI * 2;
      const d = [0, Math.cos(a), Math.sin(a)];
      const nq = [Math.sin(b) * sx, d[1] * Math.cos(b), d[2] * Math.cos(b)];
      return { q: [r * Math.sin(b) * sx, y + d[1] * (R + r * Math.cos(b)), z + d[2] * (R + r * Math.cos(b))], n: nrm(nq), ref: [0, y + d[1] * R, z + d[2] * R] };
    };
    for (let i = 0; i < segs; i++)
      for (let j = 0; j < sides; j++) {
        const a = pt(i, j), b = pt(i + 1, j), e = pt(i + 1, j + 1), d = pt(i, j + 1);
        const ref = mul(add(a.ref, b.ref), 0.5);
        tri(key, a.q, b.q, e.q, ref, a.n, b.n, e.n);
        tri(key, a.q, e.q, d.q, ref, a.n, e.n, d.n);
      }
  }
  // a flat band on an arc in the YZ plane (a mudguard): centre (y, z), radius R, angles a0..a1 (0 = +Z, pi/2 = up)
  function arcBand(key, y, z, R, a0, a1, w, t, segs = 8) {
    const P = (a, rr, x) => [x, y + Math.sin(a) * rr, z + Math.cos(a) * rr];
    for (let i = 0; i < segs; i++) {
      const u0 = a0 + ((a1 - a0) * i) / segs, u1 = a0 + ((a1 - a0) * (i + 1)) / segs;
      hex(key, [P(u0, R, -w / 2), P(u0, R, w / 2), P(u0, R + t, w / 2), P(u0, R + t, -w / 2),
        P(u1, R, -w / 2), P(u1, R, w / 2), P(u1, R + t, w / 2), P(u1, R + t, -w / 2)]);
    }
  }
  const place = (x, z, yaw, fn) => {
    const saved = M;
    M = saved.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, z)).multiply(new THREE.Matrix4().makeRotationY(yaw));
    fn();
    M = saved;
  };

  // ---------- the bicycle (local: faces +Z, wheels on y = 0, centred on x = z = 0) ----------
  const WR = 0.33, ZF = 0.55, ZR = -0.55;
  function bike(frame) {
    // wheels: tyre, thin rim, hub, three spoke lines
    for (const zc of [ZF, ZR]) {
      torus("rubber", WR, zc, WR - 0.024, 0.024, { segs: 14, sx: 1.05 });
      torus("chromeThin", WR, zc, WR - 0.06, 0.009, { segs: 10, sides: 3 });
      tube("chrome", [[-0.05, WR, zc], [0.05, WR, zc]], 0.018, [0, 1, 0], { sides: 6 });
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI + 0.3;
        const d = [0, Math.sin(a) * (WR - 0.06), Math.cos(a) * (WR - 0.06)];
        tube("chromeThin", [sub([0, WR, zc], d), add([0, WR, zc], d)], 0.004, [1, 0, 0], { sides: 3 });
      }
    }
    // frame: head tube, step-through down tube, seat tube, stays, fork
    const FT = 0.022;
    const headLo = [0, 0.64, 0.4], headHi = [0, 0.8, 0.35], bb = [0, 0.27, -0.06], seatTop = [0, 0.74, -0.22];
    tube(frame, [headLo, headHi], 0.026, [1, 0, 0]);
    tube(frame, [add(headLo, [0, 0.03, -0.01]), [0, 0.42, 0.26], [0, 0.29, 0.06], bb], FT, [1, 0, 0], { bend: 0.12 });
    tube(frame, [bb, seatTop], FT, [1, 0, 0]);
    for (const s of [-1, 1]) {
      tube(frame, [[s * 0.012, 0.27, -0.06], [s * 0.05, WR, ZR]], 0.013, [1, 0, 0]);
      tube(frame, [[s * 0.012, 0.7, -0.205], [s * 0.05, WR + 0.01, ZR + 0.02]], 0.012, [1, 0, 0]);
      tube(frame, [[s * 0.035, 0.66, 0.395], [s * 0.05, WR + 0.03, ZF - 0.01], [s * 0.05, WR, ZF]], 0.014, [1, 0, 0], { bend: 0.04 });
    }
    box(frame, -0.05, 0.05, 0.62, 0.67, 0.37, 0.43); // fork crown
    // chain case on the -X side, from the bottom bracket to the rear hub
    hex(frame, [[-0.06, 0.2, 0.02], [-0.06, 0.37, 0.02], [-0.06, 0.42, ZR - 0.06], [-0.06, 0.24, ZR - 0.06],
      [-0.04, 0.2, 0.02], [-0.04, 0.37, 0.02], [-0.04, 0.42, ZR - 0.06], [-0.04, 0.24, ZR - 0.06]]);
    // crank and pedals
    tube("chromeThin", [[0.07, 0.27, -0.06], [0.07, 0.15, 0.0]], 0.01, [1, 0, 0], { sides: 4 });
    tube("chromeThin", [[-0.07, 0.27, -0.06], [-0.07, 0.39, -0.12]], 0.01, [1, 0, 0], { sides: 4 });
    box("rubber", 0.07, 0.17, 0.135, 0.165, -0.03, 0.04);
    box("rubber", -0.17, -0.07, 0.375, 0.405, -0.155, -0.085);
    // seat post and the wide saddle
    tube("chrome", [seatTop, [0, 0.84, -0.26]], 0.014, [1, 0, 0]);
    hex("rubber", [[-0.11, 0.84, -0.36], [0.11, 0.84, -0.36], [0.06, 0.85, -0.12], [-0.06, 0.85, -0.12],
      [-0.12, 0.895, -0.37], [0.12, 0.895, -0.37], [0.065, 0.89, -0.12], [-0.065, 0.89, -0.12]]);
    // stem and the upright swept-back handlebar, grips
    tube("chrome", [headHi, [0, 0.95, 0.32]], 0.016, [1, 0, 0]);
    tube("chrome", [[-0.2, 0.99, 0.14], [-0.17, 0.98, 0.25], [0, 0.95, 0.33], [0.17, 0.98, 0.25], [0.2, 0.99, 0.14]], 0.012, [0, 1, 0], { bend: 0.08, sides: 5 });
    for (const s of [-1, 1]) tube("rubber", [[s * 0.205, 0.99, 0.15], [s * 0.235, 0.995, 0.03]], 0.018, [0, 1, 0]);
    // front basket: an open wire box over the front wheel, on two struts to the hub
    {
      // tapered: the bottom 3 cm in from the top on every side; walls 8 mm thick, a wire rim round the top
      const x = 0.18, z0 = 0.46, z1 = 0.76, y0 = 0.72, y1 = 0.95, t = 0.008, k = 0.03, cz = (z0 + z1) / 2;
      const cn = (sx, sz, y, ins) => { const tp = y === y1; const q = tp ? 0 : k; return [sx * (x - q - ins), y, cz + sz * ((z1 - z0) / 2 - q - ins)]; };
      box("chrome", -x + k, x - k, y0, y0 + t, z0 + k, z1 - k);
      for (const [a, b] of [[[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]], [[1, -1], [1, 1]]])
        hex("chrome", [cn(...a, y0, 0), cn(...b, y0, 0), cn(...b, y0, t), cn(...a, y0, t), cn(...a, y1, 0), cn(...b, y1, 0), cn(...b, y1, t), cn(...a, y1, t)]);
      tube("chrome", [[x, y1, z1], [-x, y1, z1], [-x, y1, z0], [x, y1, z0], [x, y1, z1], [-x * 0.9, y1, z1]], 0.009, [0, 1, 0], { bend: 0, sides: 4 });
      for (const s of [-1, 1]) tube("chromeThin", [[s * 0.05, WR, ZF], [s * 0.1, y0, z1 - 0.04]], 0.007, [1, 0, 0], { sides: 4 });
    }
    // rear rack: a flat frame over the rear wheel, struts to the hub
    {
      const y = 0.74;
      box("chrome", -0.08, 0.08, y, y + 0.014, -0.82, -0.26);
      for (const s of [-1, 1]) tube("chromeThin", [[s * 0.075, y, -0.8], [s * 0.05, WR, ZR]], 0.008, [1, 0, 0], { sides: 4 });
      tube("chromeThin", [[0, y, -0.26], [0, 0.72, -0.2]], 0.008, [1, 0, 0], { sides: 4 });
    }
    // mudguards: arc bands over both wheels
    arcBand("chrome", WR, ZF, WR + 0.03, -0.25, Math.PI * 0.95, 0.06, 0.008, 5);
    arcBand("chrome", WR, ZR, WR + 0.03, 0.15, Math.PI + 0.25, 0.06, 0.008, 5);
    // centre kickstand (down): a U from the rear hub to the floor behind the wheel
    tube("chromeThin", [[0.06, WR, ZR], [0.085, 0.012, ZR - 0.09], [-0.085, 0.012, ZR - 0.09], [-0.06, WR, ZR]], 0.012, [0, 0, 1], { bend: 0.02, sides: 4 });
    // dynamo lamp on the fork
    box("yellow", -0.03, 0.03, 0.62, 0.67, 0.44, 0.5);
  }

  // ---------- shed ----------
  const D = 3.0, L = length, PS = 0.08;
  const nb = Math.max(1, Math.round(L / 2.4));
  const zF = D / 2 - PS / 2, zB = -D / 2 + PS / 2; // post centre lines
  const zf = D / 2 + 0.35, zb = -D / 2 - 0.2; // roof edges
  const T = 0.012, A = 0.035, top = 2.4;
  const under = (z) => top - T - A + ((z - zf) / (zf - zb)) * 0.28; // the sheet's lowest points, falling to the back
  const PH = 0.06; // purlin height
  const beamTop = (z) => under(z) - 0.004;
  const rT = (z) => beamTop(z) - PH; // rafter tops
  box("pad", -L / 2 - 0.3, L / 2 + 0.3, 0, 0.08, -D / 2 - 0.3, D / 2 + 0.3);
  for (let i = 0; i <= nb; i++) {
    const x = -L / 2 + (i * L) / nb;
    for (const zc of [zF, zB]) box("steel", x - PS / 2, x + PS / 2, 0.08, rT(zc) - 0.1, zc - PS / 2, zc + PS / 2);
    // rafter on the post pair, under the purlins
    slopeBox("steel", x - 0.03, x + 0.03, zb + 0.05, zf - 0.05, (z) => rT(z) - 0.09, rT);
  }
  // eave beams along each post row, under the rafters
  for (const zc of [zF, zB]) slopeBox("steel", -L / 2 - 0.06, L / 2 + 0.06, zc - 0.04, zc + 0.04, (z) => rT(z) - 0.2, (z) => rT(z) - 0.09);
  for (const zc of [zf - 0.1, zf - 1.2, zb + 1.1, zb + 0.08]) slopeBox("steel", -L / 2 - 0.15, L / 2 + 0.15, zc - 0.025, zc + 0.025, rT, beamTop);
  // gutter along the low back edge
  box("steel", -L / 2 - 0.2, L / 2 + 0.2, under(zb) - 0.1, under(zb) + 0.01, zb - 0.1, zb + 0.02);
  // corrugated roof: one closed solid, the wave across X
  {
    const x0 = -L / 2 - 0.2, x1 = L / 2 + 0.2, Pw = 0.26;
    const nw = Math.round((x1 - x0) / Pw), per = 4, N = nw * per;
    const xs = Array.from({ length: N + 1 }, (_, i) => x0 + (i / N) * (x1 - x0));
    const wave = (i) => A * 0.5 * (1 - Math.cos((2 * Math.PI * i) / per));
    const bot = (i, z) => [xs[i], under(z) + wave(i), z];
    const tp = (i, z) => [xs[i], under(z) + wave(i) + T, z];
    const up = [0, 1, 0];
    for (let i = 0; i < N; i++) {
      const tq = [tp(i, zf), tp(i + 1, zf), tp(i + 1, zb), tp(i, zb)];
      quad("roof", ...tq, sub(mul(add(tq[0], tq[2]), 0.5), up));
      const bq = [bot(i, zf), bot(i + 1, zf), bot(i + 1, zb), bot(i, zb)];
      quad("roofUnder", ...bq, add(mul(add(bq[0], bq[2]), 0.5), up));
      quad("roof", bot(i, zf), bot(i + 1, zf), tp(i + 1, zf), tp(i, zf), [xs[i], under(zf), zf - 1]);
      quad("roof", bot(i, zb), bot(i + 1, zb), tp(i + 1, zb), tp(i, zb), [xs[i], under(zb), zb + 1]);
    }
    for (const [i, s] of [[0, 1], [N, -1]]) quad("roof", bot(i, zf), bot(i, zb), tp(i, zb), tp(i, zf), [xs[i] + s, under(0), 0]);
  }

  // ---------- rack and bikes ----------
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const pitch = 0.62, slots = Math.max(1, Math.floor((L - 0.4) / pitch));
  const nBikes = Math.max(0, Math.min(slots, Math.round(opts.bikes ?? slots * 0.8)));
  // a diagonal rack (naname-oki): every slot turned Y0 toward -X, so neighbouring handlebars and baskets clear each
  // other at 0.62 m and the front-left camera sees the bikes' left sides; the rack holds the front wheels
  const Y0 = -0.6, zBike = -0.05, cy = Math.cos(Y0), syw = Math.sin(Y0);
  const hz0 = ZF - 0.26, hz1 = ZF + 0.06; // hoop ends, bike-local z
  const sx0 = -((slots - 1) * pitch) / 2 + 0.2;
  for (const [hz, r] of [[hz1, 0.022], [hz0, 0.018]]) {
    const z = zBike + cy * hz, xa = sx0 + syw * hz - 0.35, xb = -sx0 + 0.4 + syw * hz + 0.35;
    tube("steel", [[xa, 0.08, z], [xa, 0.12, z], [xb, 0.12, z], [xb, 0.08, z]], r, [0, 0, 1], { bend: 0.02 });
  }
  // which slots stay empty: the lowest hashes
  const order = Array.from({ length: slots }, (_, i) => i).sort((a, b) => hash(a, 1) - hash(b, 1));
  const empty = new Set(order.slice(0, slots - nBikes));
  const FRAMES = ["white", "red", "pink", "rubber", "yellow", "white", "red", "white"];
  for (let i = 0; i < slots; i++) {
    const x = sx0 + i * pitch;
    place(x, zBike, Y0, () => {
      for (const s of [-1, 1]) // a hoop guide either side of the front wheel
        tube("steel", [[s * 0.045, 0.12, hz0], [s * 0.045, 0.42, hz0 + 0.1], [s * 0.045, 0.42, hz1 - 0.06], [s * 0.045, 0.12, hz1]], 0.012, [1, 0, 0], { bend: 0.06, sides: 5 });
    });
    if (empty.has(i)) continue;
    const yaw = Y0 + (hash(i, 2) - 0.5) * 0.14, dx = (hash(i, 3) - 0.5) * 0.04, dz = (hash(i, 4) - 0.5) * 0.06;
    const frame = FRAMES[Math.floor(hash(i, 5) * FRAMES.length)];
    place(x + dx, zBike + dz, yaw, () => bike(frame));
  }

  // centre the footprint on x = z = 0
  const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const { p } of Object.values(soups))
    for (let i = 0; i < p.length; i += 3)
      for (const [k, j] of [[0, 0], [1, 2]]) (lo[k] = Math.min(lo[k], p[i + j])), (hi[k] = Math.max(hi[k], p[i + j]));
  body.position.set((-(lo[0] + hi[0]) / 2) * body.scale.x, 0, (-(lo[1] + hi[1]) / 2) * body.scale.x);

  // ---------- meshes: one per material ----------
  const MAT = {
    pad: [c.pad, c.padShade, 0.1, 3],
    steel: [c.steel, c.steelShade, 0.1, 2.5],
    roof: [c.roof, c.roofShade, 0.55, 3.5], // the -X flank of every corrugation falls to shade: bands on the top
    roofUnder: [c.roof, c.roofShade, -0.64, 0], // bands on the underside too; the sheet's hull inks it
    rubber: [c.rubber, c.rubber, 0.1, 1.5],
    chrome: [c.chrome, c.chromeShade, 0.1, 1.5],
    chromeThin: [c.chrome, c.chromeShade, 0.1, 0],
    red: [c.red, c.redShade, 0.1, 1.5],
    white: [c.white, c.whiteShade, 0.1, 1.5],
    yellow: [c.yellow, c.yellowShade, 0.1, 1.5],
    pink: [c.pink, c.pinkShade, 0.1, 1.5],
  };
  for (const [key, { p, n }] of Object.entries(soups)) {
    const [base, shade, threshold, px] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, px ? { threshold, px } : { threshold, outline: false });
    mesh.name = key;
    body.add(mesh);
  }

  function pose(name) {
    if (name !== "rest") throw new Error(`unknown pose "${name}" (rest)`);
    root.updateMatrixWorld(true);
  }
  pose("rest");
  return { root, joints, pose };
}

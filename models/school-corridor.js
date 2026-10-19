// school-corridor.js - the long school hallway of every slice-of-life anime, static, at real size: a set piece.
// Contract: harness/lab/README.md. Meters, +Y up, the corridor runs along X; the window wall is +Z (the open,
// cutaway side, so the lab's front-left cameras look in) and the classroom wall -Z, its doors facing +Z. The far
// (-X) end wall holds the hand-washing sinks under an end window. Floor on y = 0, centred on x = z = 0.
//
// Construction (boxes, 4/8-sided tubes and flat quads, all triangle soups merged per material, so the whole set is
// about a dozen meshes; boxes are flat-shaded). Every triangle is wound away from a point inside its solid (box
// centre, tube axis, a point behind a plate), never by hand. The helpers follow the classroom model's.
//   SHELL      floor quad with fine light tile joints across the run; a polished-floor reflection band (cool sky strips
//              broken at each window pier) down the middle; the sun's window patches nearer the windows. Walls are
//              boxes 12 cm thick; a top left open by the cutaway gets a dark 2 cm section cap so the cut reads as a cut.
//   CLASSROOMS (-Z wall) three classrooms in equal bays from the sink alcove to the +X end. Each has a front and a
//              back sliding door (pale green panel, a tall glass light, a dark pull, a steel casing and head, a dark
//              floor rail), a blank class-name plate sticking out into the corridor over each door (a dark frame with
//              pale faces on a short bracket), and a row of high transom lights in steel frames over the whole bay.
//              Skirting and a waist rail as dark bands. In the walls between doors: an indoor fire-hydrant box
//              (red, door lines, a round red lamp on top) at the first partition, a green felt bulletin board with
//              pinned sheets in the middle classroom (left out when a short `length` leaves no room between its doors).
//   WINDOWS    (+Z wall) bays of ~2 m on 0.2 m piers: low sill wall (0.8), aluminium casing, two sashes on two tracks,
//              a transom bar and transom lights; a sill board; a steel panel heater on feet under every bay with
//              dark louvre and fin lines and a feed pipe. With the cutaway only a 10 cm capped stub of the wall stays;
//              the heaters and the sun patches stay, and carry the window side.
//   END        (-X) the end wall with a two-sash window, under it the sink row: a concrete-coloured counter, a
//              stainless trough, a pipe along the wall and five taps, a yellow soap in a net by every other tap.
//              The +X end is open (capped) with the cutaway, a plain wall without.
//   CEILING    only with { cutaway: false }: the slab and a line of flush fluorescent fittings.
// Proportions (real size, base unit the storey H = 3.0 m): interior 3.0 wide (z), `length` long (x, default 20);
//   window sill 0.8, sash head 2.05, transoms to 2.55; doors 0.9 x 1.9, plates 1.97-2.15 sticking out 0.4;
//   classroom transoms 2.25-2.7; hydrant box 0.76 x 1.0; bulletin board 2.0 x 0.9; sinks 0.75 high, 0.6 deep.
// Options: build(THREE, kit, colors, { height = 3.0, length = 20, cutaway = true, evening = false }).
//   height   scales the whole set uniformly so the wall top is `height` (default 3.0 m), as the torii's.
//   length   the corridor run in metres, 12-40 (the sink alcove is 1.3 m, the rest splits into three classrooms;
//            length 29 gives 9.2 m classrooms that line up with the classroom model's 9 m room and its doors).
//   cutaway  true (default): the window wall (down to a stub), the ceiling and the +X end wall are left out, so
//            cameras on the +X / +Z side look straight in. false: the closed corridor, for cameras inside it.
//   evening  warm low sun, same script: the window glass turns practical yellow and the sun patches turn practical
//            and stretch toward the classroom wall; the ceiling tubes (closed corridor) go off.
// Composing with the classroom model (its corridor side is +X): rotate the classroom -90 deg about Y and set it
//   behind the -Z wall, centre z = -(1.62 + 3.75); its cutaway leaves its corridor wall out, this wall stands in.
// Budget: ~4.7k triangles at the defaults (6k at length 29), 12 meshes; closed ~6.9k, 12 meshes (tubes in, caps out).
// Ink in pixels: walls, doors, caps 3, steel, plates and small parts 2.
// Colours (meadow, the school models' script), base / shade:
//   walls, sill boards, sink counter     moon #f7f3e1 / skin #f0c2ae, threshold 0.1
//   floor                                skin #f0c2ae flat, tile joints moon
//   steel (frames, sashes, casings, heaters, trough, taps, plates' brackets)  sclera #f6f3ee / sky #d7ecef
//   glass, floor reflection band         sky #d7ecef flat (evening glass practical #f2c94c)
//   sun patches                          moon #f7f3e1 flat (evening practical #f2c94c)
//   doors                                line #a9d16e / iris #3f8a47
//   bulletin felt                        iris #3f8a47 / hair #2c5131
//   bands, caps, rails, pulls, louvres, door lines   hair #2c5131 flat (they are lines)
//   plate faces, sheets                  sclera #f6f3ee flat; hydrant box and lamp, red sheets accent #d9483b;
//   soap, yellow sheets                  practical #f2c94c flat; ceiling tubes moon glow (threshold -0.25)

export const meta = {
  name: "school-corridor",
  height: 3.0,
  script: "meadow",
  colors: {
    wall: "#f7f3e1", wallShade: "#f0c2ae",
    floor: "#f0c2ae", seam: "#f7f3e1",
    steel: "#f6f3ee", steelShade: "#d7ecef",
    glass: "#d7ecef", shine: "#d7ecef", sun: "#f7f3e1",
    door: "#a9d16e", doorShade: "#3f8a47",
    felt: "#3f8a47", feltShade: "#2c5131",
    dark: "#2c5131",
    paper: "#f6f3ee", red: "#d9483b", yellow: "#f2c94c",
    tube: "#f7f3e1",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const NATURAL = 3.0;
  const { height = NATURAL, cutaway = true, evening = false } = opts;
  const LEN = Math.max(12, Math.min(40, Number(opts.length ?? 20)));
  const root = new THREE.Group();
  root.name = "school-corridor";
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
  function tri(key, a, b, e, ref, na, nb, ne) {
    let n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-12) return;
    const flip = dot(n, sub(mul(add(add(a, b), e), 1 / 3), ref)) < 0;
    if (flip) n = mul(n, -1);
    n = nrm(n);
    const s = S(key);
    const [B, NB, E, NE] = flip ? [e, ne, b, nb] : [b, nb, e, ne];
    for (const [q, nq] of [[a, na ?? n], [B, NB ?? n], [E, NE ?? n]]) s.p.push(...q), s.n.push(...nq);
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
  // glass: two plates back to back (1 mm apart), so a pane reads from both sides
  const pane = (ctr, n, w, h, key = "glass") => {
    plate(key, add(ctr, mul(n, 0.001)), n, w, h);
    plate(key, sub(ctr, mul(n, 0.001)), mul(n, -1), w, h);
  };
  // a capped tube from a to b, radius r; ends pushed out by 0.6 r so joints overlap
  function rod(key, a, b, r, sides = 4) {
    const T = nrm(sub(b, a));
    a = sub(a, mul(T, r * 0.6)), b = add(b, mul(T, r * 0.6));
    const up = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(up, T)), w = cross(T, u);
    const ring = (P) => Array.from({ length: sides }, (_, j) => {
      const t = (j / sides) * Math.PI * 2, d = add(mul(u, Math.cos(t)), mul(w, Math.sin(t)));
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
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- the shell ----------
  const X0 = -LEN / 2, X1 = LEN / 2, W = 1.5, H = 3.0, T = 0.12, CAP = 0.02;
  const wall = (x0, x1, y0, y1, z0, z1, cut = cutaway) => {
    box("wall", x0, x1, y0, cut ? y1 - CAP : y1, z0, z1);
    if (cut) box("cap", x0, x1, y1 - CAP, y1, z0, z1);
  };
  quad("floor", [X0, 0, -W], [X1, 0, -W], [X1, 0, W + T], [X0, 0, W + T], [0, -1, 0]);
  for (let i = 1; i < 3 * Math.round(LEN / 2); i++) { // tile joints across the run, every ~0.67 m, under everything
    const x = X0 + (i * LEN) / (3 * Math.round(LEN / 2));
    quad("seam", [x - 0.006, 0.001, -W], [x + 0.006, 0.001, -W], [x + 0.006, 0.001, W], [x - 0.006, 0.001, W], [x, -1, 0]);
  }

  // ---------- window wall (+Z) ----------
  const SILL = 0.8, SASH = 2.05, HEAD = 2.55, PIER = 0.2;
  const NB = Math.round(LEN / 2.0), BAYW = LEN / NB;
  const wz0 = W, wz1 = W + T, zm = (wz0 + wz1) / 2;
  const bayC = Array.from({ length: NB }, (_, i) => X0 + BAYW * (i + 0.5));
  if (cutaway) wall(X0, X1, 0, 0.1, wz0, wz1); // a capped stub of the cut wall
  else {
    box("wall", X0, X1, 0, SILL, wz0, wz1);
    box("wall", X0, X1, SILL - 0.03, SILL, wz0 - 0.14, wz0); // sill board
    box("dark", X0, X1, 0, 0.08, wz0 - 0.012, wz0); // skirting
    box("wall", X0, X1, HEAD, H, wz0, wz1);
    for (let i = 0; i <= NB; i++) {
      const x = X0 + i * BAYW;
      box("wall", Math.max(X0, x - PIER / 2), Math.min(X1, x + PIER / 2), SILL, HEAD, wz0, wz1);
    }
    const FR = 0.035;
    for (const xc of bayC) {
      const x0 = xc - BAYW / 2 + PIER / 2, x1 = xc + BAYW / 2 - PIER / 2;
      const cz0 = wz0 - 0.012, cz1 = wz1 + 0.005;
      box("steel", x0, x1, SILL, SILL + FR, cz0, cz1);
      box("steel", x0, x1, HEAD - FR, HEAD, cz0, cz1);
      box("steel", x0, x0 + FR, SILL, HEAD, cz0, cz1);
      box("steel", x1 - FR, x1, SILL, HEAD, cz0, cz1);
      box("steel", x0, x1, SASH - FR / 2, SASH + FR / 2, cz0, cz1);
      for (const [s, dz] of [[-1, -0.03], [1, 0.03]]) {
        const sx0 = s < 0 ? x0 + FR : xc - 0.03, sx1 = s < 0 ? xc + 0.03 : x1 - FR;
        const z0 = zm + dz - 0.014, z1 = zm + dz + 0.014;
        box("steel", sx0, sx1, SILL + FR, SILL + FR + 0.05, z0, z1);
        box("steel", sx0, sx1, SASH - FR / 2 - 0.045, SASH - FR / 2, z0, z1);
        box("steel", sx0, sx0 + 0.04, SILL + FR, SASH - FR / 2, z0, z1);
        box("steel", sx1 - 0.04, sx1, SILL + FR, SASH - FR / 2, z0, z1);
        pane([(sx0 + sx1) / 2, (SILL + SASH) / 2 + 0.01, zm + dz], [0, 0, -1], sx1 - sx0 - 0.07, SASH - SILL - 0.12);
      }
      for (let k = 0; k < 2; k++) {
        const a = x0 + FR + (k * (x1 - x0 - 2 * FR)) / 2, b = x0 + FR + ((k + 1) * (x1 - x0 - 2 * FR)) / 2;
        if (k > 0) box("steel", a - 0.015, a + 0.015, SASH, HEAD - FR, zm - 0.015, zm + 0.015);
        pane([(a + b) / 2, (SASH + HEAD - FR) / 2, zm], [0, 0, -1], b - a - 0.01, HEAD - FR - SASH);
      }
    }
  }
  // heaters under every bay: a steel panel on two feet, louvre lines on top, standing off the wall
  for (const xc of bayC) {
    const hx = 0.6, hz0 = wz0 - 0.2, hz1 = wz0 - 0.06, hy0 = 0.14, hy1 = 0.58;
    box("steel", xc - hx, xc + hx, hy0, hy1, hz0, hz1);
    for (const s of [-1, 1]) box("dark", xc + s * (hx - 0.08) - 0.025, xc + s * (hx - 0.08) + 0.025, 0, hy0, hz0 + 0.03, hz1 - 0.03);
    for (let k = 0; k < 5; k++) {
      const z = hz0 + 0.025 + k * 0.022;
      box("dark", xc - hx + 0.06, xc + hx - 0.06, hy1, hy1 + 0.003, z, z + 0.01);
    }
    for (let k = 0; k < 3; k++) { // fin lines on both faces
      const y = hy0 + 0.1 + k * 0.1;
      box("dark", xc - hx + 0.05, xc + hx - 0.05, y, y + 0.012, hz0 - 0.003, hz0);
      box("dark", xc - hx + 0.05, xc + hx - 0.05, y, y + 0.012, hz1, hz1 + 0.003);
    }
    rod("steel", [xc + hx + 0.06, 0.012, (hz0 + hz1) / 2], [xc + hx + 0.06, hy0 + 0.08, (hz0 + hz1) / 2], 0.018, 6); // feed pipe
    rod("steel", [xc + hx - 0.02, hy0 + 0.08, (hz0 + hz1) / 2], [xc + hx + 0.06, hy0 + 0.08, (hz0 + hz1) / 2], 0.018, 6);
  }
  // sun patches: each sash and transom light thrown down across the floor (sun high in the +Z sky, a little to +X)
  {
    const elev = evening ? 0.42 : 0.9, az = evening ? 0.55 : 0.35; // tan of the sun's height, x shift per metre of run
    const zAt = (y) => wz0 - y / Math.tan(elev);
    const zl = -W + 0.03;
    const patch = (xa, xb, ya, yb) => {
      let za = zAt(ya), zb = zAt(yb);
      if (za <= zl) return;
      zb = Math.max(zb, zl);
      const sa = (wz0 - za) * az, sb = (wz0 - zb) * az;
      const X = (x) => Math.max(X0 + 0.02, x); // the first bay's patches stop at the end wall
      quad("sun", [X(xa - sa), 0.004, za], [X(xb - sa), 0.004, za], [X(xb - sb), 0.004, zb], [X(xa - sb), 0.004, zb], [0, -1, 0]);
    };
    for (const xc of bayC) {
      const x0 = xc - BAYW / 2 + PIER / 2 + 0.04, x1 = xc + BAYW / 2 - PIER / 2 - 0.04;
      patch(x0, xc - 0.04, SILL + 0.08, SASH - 0.06);
      patch(xc + 0.04, x1, SILL + 0.08, SASH - 0.06);
      patch(x0, xc - 0.03, SASH + 0.04, HEAD - 0.05);
      patch(xc + 0.03, x1, SASH + 0.04, HEAD - 0.05);
    }
  }
  // polished floor: the reflection band down the middle, broken where each pier reflects
  for (const xc of bayC) {
    const x0 = xc - BAYW / 2 + PIER / 2 + 0.05, x1 = xc + BAYW / 2 - PIER / 2 - 0.05;
    quad("shine", [x0, 0.002, -0.62], [x1, 0.002, -0.62], [x1, 0.002, -0.3], [x0, 0.002, -0.3], [0, -1, 0]);
    quad("shine", [x0 + 0.1, 0.002, -0.85], [x1 - 0.1, 0.002, -0.85], [x1 - 0.1, 0.002, -0.76], [x0 + 0.1, 0.002, -0.76], [0, -1, 0]);
  }

  // ---------- classroom wall (-Z) ----------
  const cz0 = -W - T, cz1 = -W;
  const ALC = 1.3, P = (LEN - ALC) / 3, xs = X0 + ALC;
  const DOOR = 1.9, DW = 0.9, TR0 = 2.25, TR1 = 2.7;
  const doors = [];
  for (let i = 0; i < 3; i++) {
    const a = xs + i * P;
    doors.push(a + 0.75 + DW / 2, a + P - 0.75 - DW / 2);
  }
  // wall: under the door heads between openings, a band to the transoms, the transom piers, the frieze above
  {
    let x = X0;
    for (const d of doors) {
      box("wall", x, d - DW / 2, 0, DOOR, cz0, cz1);
      x = d + DW / 2;
    }
    box("wall", x, X1, 0, DOOR, cz0, cz1);
    box("wall", X0, X1, DOOR, TR0, cz0, cz1);
    wall(X0, X1, TR1, H, cz0, cz1);
    box("wall", X0, xs + 0.15, TR0, TR1, cz0, cz1);
    for (let i = 1; i <= 3; i++) box("wall", xs + i * P - 0.15, Math.min(X1, xs + i * P + 0.15), TR0, TR1, cz0, cz1);
  }
  if (cutaway) box("cap", X1 - CAP, X1, 0, H - CAP, cz0, cz1); // the open +X end, cut
  // transom lights over each classroom
  const czm = (cz0 + cz1) / 2;
  for (let i = 0; i < 3; i++) {
    const a = xs + i * P + 0.15, b = xs + (i + 1) * P - 0.15, n = Math.max(3, Math.round((b - a) / 0.9));
    const f0 = cz1 - 0.012, f1 = cz1 + 0.012;
    box("steel", a, b, TR0, TR0 + 0.04, cz1 - 0.04, f1);
    box("steel", a, b, TR1 - 0.04, TR1, cz1 - 0.04, f1);
    for (let k = 0; k <= n; k++) {
      const x = a + ((b - a) * k) / n;
      box("steel", Math.max(a, x - 0.02), Math.min(b, x + 0.02), TR0, TR1, f0 - 0.03, f1);
      if (k < n) pane([x + (b - a) / n / 2, (TR0 + TR1) / 2, czm], [0, 0, 1], (b - a) / n - 0.04, TR1 - TR0 - 0.08);
    }
  }
  // doors: panel in the opening, glass light, pull, casing, head, floor rail, and the class-name plate over it
  doors.forEach((d, i) => {
    const x0 = d - DW / 2, x1 = d + DW / 2, pz0 = cz1 - 0.07, pz1 = cz1 - 0.03;
    box("door", x0 - 0.02, x1 + 0.02, 0.012, DOOR - 0.01, pz0, pz1);
    const gx = i % 2 ? x0 + 0.35 : x1 - 0.35; // the light on the panel's far side from the pull
    box("dark", gx - 0.27, gx + 0.27, 0.95, 1.75, pz1, pz1 + 0.004);
    pane([gx, 1.35, pz1 + 0.006], [0, 0, 1], 0.5, 0.76);
    box("dark", x0 + 0.12, x1 - 0.12, 0.35, 0.37, pz1, pz1 + 0.004); // kick-panel line
    const px = i % 2 ? x1 - 0.09 : x0 + 0.09;
    box("dark", px - 0.02, px + 0.02, 0.85, 1.1, pz1, pz1 + 0.006); // pull
    const f1 = cz1 + 0.02;
    box("steel", x0 - 0.06, x0, 0, DOOR + 0.05, cz1 - 0.01, f1);
    box("steel", x1, x1 + 0.06, 0, DOOR + 0.05, cz1 - 0.01, f1);
    box("steel", x0 - 0.06, x1 + 0.06, DOOR, DOOR + 0.05, cz1 - 0.01, f1);
    box("dark", x0 - 0.06, x1 + 0.06, 0, 0.006, cz1 - 0.01, cz1 + 0.05); // floor rail
    // plate: a dark frame on a bracket, sticking 0.4 out into the corridor, blank pale faces both sides
    const qx = i % 2 ? x1 - 0.12 : x0 + 0.12, qy0 = 1.98, qy1 = 2.19, qz0 = cz1 + 0.06, qz1 = cz1 + 0.5;
    box("steel", qx - 0.025, qx + 0.025, qy1, qy1 + 0.035, cz1, qz1 - 0.02);
    box("dark", qx - 0.013, qx + 0.013, qy0, qy1, qz0, qz1);
    for (const s of [-1, 1]) plate("paper", [qx + s * 0.0145, (qy0 + qy1) / 2, (qz0 + qz1) / 2], [s, 0, 0], qz1 - qz0 - 0.04, qy1 - qy0 - 0.04);
  });
  // skirting and waist rail on the classroom wall, between the openings
  {
    let x = X0;
    for (const d of [...doors, X1 + 10]) {
      const xe = Math.min(X1, d - DW / 2 - 0.06);
      box("dark", x, xe, 0, 0.09, cz1, cz1 + 0.012);
      box("dark", x, xe, 0.92, 0.95, cz1, cz1 + 0.014);
      x = d + DW / 2 + 0.06;
    }
    box("dark", X0, X1, TR1 + 0.06, TR1 + 0.09, cz1, cz1 + 0.012);
  }
  // fire-hydrant box at the first partition: red box, door lines, the round red lamp on top
  {
    const hx = xs + P, z1 = cz1 + 0.17, y0 = 0.3, y1 = 1.3;
    box("red", hx - 0.38, hx + 0.38, y0, y1, cz1, z1);
    box("dark", hx - 0.004, hx + 0.004, y0 + 0.05, y1 - 0.25, z1, z1 + 0.003);
    box("dark", hx - 0.33, hx + 0.33, y1 - 0.22, y1 - 0.208, z1, z1 + 0.003);
    box("dark", hx + 0.05, hx + 0.09, y0 + 0.35, y0 + 0.42, z1, z1 + 0.012); // handle
    box("steel", hx - 0.06, hx + 0.06, y1, y1 + 0.06, cz1, cz1 + 0.08);
    rod("red", [hx, y1 + 0.17, cz1 + 0.02], [hx, y1 + 0.17, cz1 + 0.09], 0.075, 10);
  }
  // bulletin board in the middle classroom's wall, sheets pinned on it
  {
    const bx = xs + 1.5 * P, B0 = 1.0, B1 = 1.9, BX = Math.min(1.0, P / 2 - 0.75 - DW - 0.15), z1 = cz1 + 0.025;
    if (BX > 0.3) {
    box("felt", bx - BX, bx + BX, B0, B1, cz1, z1);
    box("steel", bx - BX - 0.03, bx + BX + 0.03, B1, B1 + 0.03, cz1, z1 + 0.01);
    box("steel", bx - BX - 0.03, bx + BX + 0.03, B0 - 0.03, B0, cz1, z1 + 0.01);
    box("steel", bx - BX - 0.03, bx - BX, B0, B1, cz1, z1 + 0.01);
    box("steel", bx + BX, bx + BX + 0.03, B0, B1, cz1, z1 + 0.01);
    const ns = Math.floor((2 * BX - 0.1) / 0.38);
    for (let k = 0; k < ns; k++) {
      const h = hash(k + 40), w = 0.24 + 0.1 * hash(k + 60), hh = 0.3 + 0.12 * h;
      const x = bx - ((ns - 1) / 2) * 0.38 + k * 0.38, y = B1 - 0.08 - hh / 2 - 0.2 * hash(k + 70);
      plate(h > 0.75 ? "yellow" : h > 0.55 ? "red" : "paper", [x, y, z1 + 0.002], [0, 0, 1], w, hh);
    }
    }
  }

  // ---------- -X end: wall with a window, sink row ----------
  {
    const ex0 = X0 - T, ex1 = X0, EW0 = 1.15, EW1 = 2.5, EZ = 0.95, xm = (ex0 + ex1) / 2;
    box("wall", ex0, ex1, 0, EW0, -W - T, W + T);
    wall(ex0, ex1, EW1, H, -W - T, W + T);
    box("wall", ex0, ex1, EW0, EW1, -W - T, -EZ);
    box("wall", ex0, ex1, EW0, EW1, EZ, W + T);
    const FR = 0.035, f0 = ex0 - 0.005, f1 = ex1 + 0.012;
    box("steel", f0, f1, EW0, EW0 + FR, -EZ, EZ);
    box("steel", f0, f1, EW1 - FR, EW1, -EZ, EZ);
    box("steel", f0, f1, EW0, EW1, -EZ, -EZ + FR);
    box("steel", f0, f1, EW0, EW1, EZ - FR, EZ);
    for (const [s, dx] of [[-1, -0.03], [1, 0.03]]) {
      const z0 = s < 0 ? -EZ + FR : -0.03, z1 = s < 0 ? 0.03 : EZ - FR, x0 = xm + dx - 0.014, x1 = xm + dx + 0.014;
      box("steel", x0, x1, EW0 + FR, EW0 + FR + 0.05, z0, z1);
      box("steel", x0, x1, EW1 - FR - 0.05, EW1 - FR, z0, z1);
      box("steel", x0, x1, EW0 + FR, EW1 - FR, z0, z0 + 0.04);
      box("steel", x0, x1, EW0 + FR, EW1 - FR, z1 - 0.04, z1);
      pane([xm + dx, (EW0 + EW1) / 2, (z0 + z1) / 2], [1, 0, 0], z1 - z0 - 0.07, EW1 - EW0 - 0.17);
    }
    box("wall", ex1, ex1 + 0.14, EW0 - 0.03, EW0, -EZ - 0.05, EZ + 0.05); // sill
    // sink row: counter, trough, pipe and taps, soaps
    const SZ = 1.38, SH = 0.75, SD = 0.6;
    box("wall", X0, X0 + SD, 0, SH - 0.06, -SZ, SZ);
    box("dark", X0 + SD - 0.005, X0 + SD + 0.002, 0, 0.08, -SZ, SZ);
    box("steel", X0, X0 + SD + 0.02, SH - 0.06, SH, -SZ - 0.02, SZ + 0.02);
    plate("shine", [X0 + 0.32, SH + 0.002, 0], [0, 1, 0], 0.4, 2 * SZ - 0.1);
    box("dark", X0 + 0.11, X0 + 0.53, SH, SH + 0.003, -SZ + 0.04, -SZ + 0.06);
    box("dark", X0 + 0.11, X0 + 0.53, SH, SH + 0.003, SZ - 0.06, SZ - 0.04);
    box("dark", X0 + 0.51, X0 + 0.53, SH, SH + 0.003, -SZ + 0.04, SZ - 0.04);
    const py = 1.02;
    rod("steel", [X0 + 0.05, py, -SZ], [X0 + 0.05, py, SZ], 0.018, 6);
    for (let k = 0; k < 5; k++) {
      const z = -SZ + 0.28 + (k * (2 * SZ - 0.56)) / 4;
      rod("steel", [X0 + 0.05, py, z], [X0 + 0.2, py, z], 0.013, 6);
      rod("steel", [X0 + 0.2, py, z], [X0 + 0.2, py - 0.08, z], 0.011, 6);
      box("dark", X0 + 0.08, X0 + 0.1, py + 0.02, py + 0.06, z - 0.03, z + 0.03); // tap handle
      if (k % 2 === 0) {
        rod("dark", [X0 + 0.06, py - 0.02, z + 0.14], [X0 + 0.06, py - 0.12, z + 0.14], 0.004, 4);
        box("yellow", X0 + 0.035, X0 + 0.085, py - 0.2, py - 0.12, z + 0.11, z + 0.17);
      }
    }
    box("dark", ex1, ex1 + 0.012, 0, 0.09, -W, W); // skirting
  }
  // +X end: a plain wall when closed
  if (!cutaway) box("wall", X1, X1 + T, 0, H, -W - T, W + T);

  // ---------- ceiling ----------
  if (!cutaway) {
    box("wall", X0, X1, H - 0.08, H - 0.001, -W, W);
    for (let x = X0 + 1.5; x < X1 - 1; x += 3) {
      box("steel", x - 0.6, x + 0.6, H - 0.12, H - 0.08, -0.12, 0.12);
      for (const dz of [-0.05, 0.05]) rod("tube", [x - 0.58, H - 0.13, dz], [x + 0.58, H - 0.13, dz], 0.014);
    }
  }

  // ---------- meshes: one per material signature ----------
  const MAT = {
    wall: [c.wall, c.wallShade, 0.1, 3],
    floor: [c.floor, c.floor, 0.1, 3],
    seam: [c.seam, c.seam, 0.1, 0],
    shine: [c.shine, c.shine, 0.1, 0],
    sun: evening ? [c.yellow, c.yellow, 0.1, 0] : [c.sun, c.sun, 0.1, 0],
    steel: [c.steel, c.steelShade, 0.1, 2],
    glass: evening ? [c.yellow, c.yellow, 0.1, 0] : [c.glass, c.glass, 0.1, 0],
    door: [c.door, c.doorShade, 0.1, 3],
    felt: [c.felt, c.feltShade, 0.1, 2],
    dark: [c.dark, c.dark, 0.1, 0],
    cap: [c.dark, c.dark, 0.1, 3],
    paper: [c.paper, c.paper, 0.1, 0],
    red: [c.red, c.red, 0.1, 2],
    yellow: [c.yellow, c.yellow, 0.1, 0],
    tube: evening ? [c.steel, c.steelShade, 0.1, 0] : [c.tube, c.tube, -0.25, 0],
  };
  const groups = new Map();
  for (const [key, soup] of Object.entries(soups)) {
    const sig = MAT[key].join("|");
    if (!groups.has(sig)) groups.set(sig, { key, m: MAT[key], p: [], n: [] });
    const g = groups.get(sig);
    for (let i = 0; i < soup.p.length; i++) g.p.push(soup.p[i]), g.n.push(soup.n[i]);
  }
  for (const { key, m, p, n } of groups.values()) {
    const [base, shade, threshold, px] = m;
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

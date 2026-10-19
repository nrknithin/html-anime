// shoro.js - a Buddhist temple bell tower (shoro) with its bronze bonsho and log striker (shumoku), animated.
// One set with models/torii.js, models/shrine.js and models/pagoda.js.
// Contract: harness/lab/README.md. Meters, +Y up, the steps face +Z, its left is +X (the striker side, toward the light),
// stands on y = 0, centred on x = 0, z = 0.
//
// Construction (triangle soups merged per material, as house-japanese and pagoda; flat-shaded so planes read crisp,
// smooth lathes for the bell and the log):
//   KIDAN    a stone platform: plinth band, body and cap slab, three steps on +Z, a footing stone under every post.
//   FRAME    four round posts (12-sided) splayed inward (shibi-style lean, 0.2 m over 3.6 m), a low tie (nuki) and a top
//            tie (kashiragi) on all four sides with their ends past the posts, bracket blocks (masu) and an eave beam
//            ring. The bell beam runs along X between the side ties; the bell and both striker ropes hang from it.
//   ROOF     roof(): one closed solid from the eave rectangle, as the house's, but the slope is concave (rise
//            D (0.38 v + 0.32 v^2), v = inset / D): steep near the short ridge, flat toward the eave, a heavy curved
//            hip roof. Sori lifts the eave toward the corners (k |2u-1|^3, fading up the slope). The soffit rises inward
//            into the roof. Dark tile courses run down every slope, eave-tile squares sit on the fascia; segmented inked
//            caps follow the curved hips and the ridge, raised end tiles (onigawara) at both ridge ends.
//   BELL     a lathe (24 sides) from a bonsho profile: flat crown, rounded shoulder, a near-straight body flaring to a
//            thick lip, a hollow mouth (inner dome, so the underside is closed). Raised bands (dark, 12 mm proud): two
//            horizontal rings round the striking zone, two under the boss zone, and four double vertical ribbons at
//            45 deg + k 90 deg. Four boss panels (chi-no-ma) of 3 x 3 bosses each centre on +-X / +-Z; the lotus striking
//            pads (tsukiza) sit on +-X between the lower bands. The lug (ryuzu) is a half-torus arch over the crown,
//            hung on an iron pin under the bell beam: the bell pivot.
//   STRIKER  a pale log (shumoku) along X on the +X side at striking-pad height, its tip 15 mm off the pad at rest, hung
//            on two parallel ropes (so it swings level, a parallelogram) with a rope loop round the log at each.
// Proportions (real size, base unit the bell mouth diameter B = 1.16 m): platform 5.0 x 0.9 x 6.3 (x y z), steps to
// z 4.1; posts 0.3 thick, bottom centres +-1.95 / +-2.6, tops +-1.75 / +-2.4 at 4.6 (one bay, deeper than wide, so the
// hero camera at az 52 sees the bell between the posts, not behind the near corner post); bell 1.55 tall (1.34 B) + lug,
// mouth at 2.265 (1.37 m over the floor), pivot 3.95; pads at mouth + 0.44; log 1.5 long, 0.28 thick, ropes 1.44; eave
// rectangle 6.3 x 7.7 at 4.95 (1.4 m past the post tops), ridge along Z 1.4 long at 7.16, onigawara tops 7.605 (6.6 B).
// Scaling: build(THREE, kit, colors, { height }) scales the whole tower uniformly (default: its real size); or scale the
// film's placement group.
// Colours (noon, base / shade): timber (posts, ties, beams) accent #c4452d / iris #5c3d32 at threshold 0.1, red-lacquered
// warm wood as the torii; bronze (bell, lug, bosses, pads) iris / hair #241c16 at 0.35, dark bronze; bands hair (lines,
// no hull); tile (roof, caps, iron hanger) iris / hair at 0.25 (the house and pagoda); tile courses hair; stone sky
// #f2d7ae / skin #f0c2ae (the house); log moon #fff6e4 / sky, bare hinoki; rope skin / sky with a thin hull.
// hair sits next to ink #2c261f only on the bell's shade side, the soffit and back fascias (noon has nothing between
// iris and ink), the compromise the house, shrine and pagoda document.
//
// Rig: bell (pivot at the hanger pin; rz sways it in the X-Y plane, + swings the mouth toward +X); striker (the log group,
// translated along its rope arc). The ropes are one mesh whose vertices pose() rewrites: each rope rotates about its own
// top point by theta (rz, + swings the log back toward +X and up), the loops ride the log.
// Poses: rest. Clip (build() returns clips {name: seconds}; pose("strike@1.2")): strike 4 s, looping: 0-1.25 the log is
// drawn back to 30 deg, 1.25-1.45 held, 1.45-2.0 released (a pendulum quarter), it hits the pad at 2.0, rebounds 9 deg
// (2.0-3.2) and 2 deg (3.2-3.8), rests; the bell sways a damped 2 deg from the hit (mouth toward -X first), 0 by 4.0.

export const meta = {
  name: "shoro",
  height: 7.605,
  script: "noon",
  colors: {
    timber: "#c4452d", timberShade: "#5c3d32",
    bronze: "#5c3d32", bronzeShade: "#241c16",
    band: "#241c16",
    tile: "#5c3d32", tileShade: "#241c16",
    tileLine: "#241c16",
    stone: "#f2d7ae", stoneShade: "#f0c2ae",
    log: "#fff6e4", logShade: "#f2d7ae",
    rope: "#f0c2ae", ropeShade: "#f2d7ae",
  },
  poses: ["rest"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { height = meta.height } = opts;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const root = new THREE.Group();
  root.name = "shoro";
  const tower = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  tower.name = "tower";
  tower.scale.setScalar(height / meta.height);
  root.add(tower);

  // ---------- triangle soups with flat normals; o = owner (for the rewritten rope mesh) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const soups = {};
  const S = (key) => (soups[key] ??= { p: [], n: [], o: [] });
  let owner = -1;
  // one triangle wound away from `ref` (a point inside the solid); slivers dropped
  function tri(key, a, b, e, ref) {
    let n = cross(sub(b, a), sub(e, a));
    const l = Math.hypot(...n);
    if (l < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    const s = S(key), flip = dot(n, sub(m, ref)) < 0;
    n = n.map((v) => ((flip ? -v : v) / l));
    s.p.push(...a, ...(flip ? [...e, ...b] : [...b, ...e]));
    for (let i = 0; i < 3; i++) s.n.push(...n), s.o.push(owner);
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  // a beam from a to b, w wide and h tall, its height along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a);
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + s[k] * i * w / 2 + u[k] * j * h / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a closed rectangular tube along a polyline (w wide, h tall, height along world up), one continuous solid
  function loft(key, pts, w, h) {
    const rings = pts.map((p, i) => {
      const tg = nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
      const s = nrm(cross(tg, [0, 1, 0])), u = cross(s, tg);
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i2, j]) => [0, 1, 2].map((k) => p[k] + s[k] * i2 * w / 2 + u[k] * j * h / 2));
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const ref = [0, 1, 2].map((k) => (pts[i][k] + pts[i + 1][k]) / 2);
      for (let j = 0; j < 4; j++) quad(key, rings[i][j], rings[i][(j + 1) % 4], rings[i + 1][(j + 1) % 4], rings[i + 1][j], ref);
    }
    for (const [i, nb] of [[0, 1], [pts.length - 1, pts.length - 2]]) {
      const ref = [0, 1, 2].map((k) => (pts[i][k] + pts[nb][k]) / 2);
      quad(key, ...rings[i], ref);
    }
  }
  // a closed prism (seg sides) from a to b, radius ra at a and rb at b, capped; flat facets
  function prism(key, a, b, ra, rb, seg = 12) {
    const d = nrm(sub(b, a));
    const t = nrm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), w = cross(d, t);
    const ring = (o, r) => Array.from({ length: seg }, (_, i) => {
      const q = (i / seg) * TAU;
      return [0, 1, 2].map((k) => o[k] + (t[k] * Math.cos(q) + w[k] * Math.sin(q)) * r);
    });
    const A = ring(a, ra), B = ring(b, rb), ref = [0, 1, 2].map((k) => (a[k] + b[k]) / 2);
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      quad(key, A[i], A[j], B[j], B[i], ref);
      tri(key, a, A[i], A[j], ref);
      tri(key, b, B[i], B[j], ref);
    }
  }
  // an indexed smooth solid appended to a soup (winding from its signed volume)
  function smooth(key, pos, idx) {
    let v = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, e = idx[i + 2] * 3;
      v += dot([pos[a], pos[a + 1], pos[a + 2]], cross([pos[b], pos[b + 1], pos[b + 2]], [pos[e], pos[e + 1], pos[e + 2]]));
    }
    if (v < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const ng = g.toNonIndexed(), P = ng.attributes.position.array, N = ng.attributes.normal.array, s = S(key);
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
    for (let i = 0; i < P.length / 3; i++) s.o.push(owner);
  }
  // lathe about the Y axis (centre cx, cz) from a profile [[r, y], ...]; r = 0 points become poles. Closed.
  function lathe(key, prof, seg, cx = 0, cz = 0) {
    const pos = [], idx = [], rows = [];
    for (const [r, y] of prof) {
      if (r < 1e-6) { rows.push([pos.length / 3]); pos.push(cx, y, cz); continue; }
      const row = [];
      for (let i = 0; i < seg; i++) {
        const q = (i / seg) * TAU;
        row.push(pos.length / 3);
        pos.push(cx + r * Math.cos(q), y, cz + r * Math.sin(q));
      }
      rows.push(row);
    }
    for (let k = 0; k < rows.length - 1; k++) {
      const A = rows[k], B = rows[k + 1];
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        if (A.length === 1) idx.push(A[0], B[i], B[j]);
        else if (B.length === 1) idx.push(A[i], A[j], B[0]);
        else idx.push(A[i], A[j], B[j], A[i], B[j], B[i]);
      }
    }
    smooth(key, pos, idx);
  }

  // ---------- stone platform (kidan) ----------
  box("stone", 0, 0.1, 0, 5.3, 0.2, 6.6);
  box("stone", 0, 0.5, 0, 5.0, 0.62, 6.3);
  box("stone", 0, 0.855, 0, 5.15, 0.11, 6.45);
  for (let k = 1; k <= 3; k++) {
    const top = 0.9 - 0.225 * k, z1 = 3.2 + 0.3 * k;
    box("stone", 0, top / 2, (3.05 + z1) / 2, 1.8, top, z1 - 3.05);
  }

  // ---------- frame ----------
  const Y0 = 0.98, YT = 4.6;
  const px = (y) => 1.95 - 0.2 * (y - Y0) / (YT - Y0);
  const pz = (y) => 2.6 - 0.2 * (y - Y0) / (YT - Y0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box("stone", sx * px(Y0), 0.94, sz * pz(Y0), 0.56, 0.12, 0.56); // footing stone (sobaishi)
    prism("timber", [sx * px(Y0), Y0, sz * pz(Y0)], [sx * px(YT), YT, sz * pz(YT)], 0.16, 0.145);
    box("timber", sx * px(YT), YT + 0.07, sz * pz(YT), 0.4, 0.14, 0.4); // masu block
  }
  // ties on all four sides: along X at z = +-pz(y), along Z at x = +-px(y); ends reach `out` past the posts
  function ties(y, w, h, out) {
    for (const s of [-1, 1]) {
      beam("timber", [-px(y) - out, y, s * pz(y)], [px(y) + out, y, s * pz(y)], w, h);
      beam("timber", [s * px(y), y, -pz(y) - out], [s * px(y), y, pz(y) + out], w, h);
    }
  }
  ties(1.65, 0.13, 0.2, 0.22); // nuki
  ties(4.42, 0.2, 0.32, 0.3); // kashiragi
  // eave beam ring (keta) over the masu blocks
  for (const s of [-1, 1]) {
    beam("timber", [-px(YT) - 0.6, 4.82, s * pz(YT)], [px(YT) + 0.6, 4.82, s * pz(YT)], 0.2, 0.2);
    beam("timber", [s * px(YT), 4.82, -pz(YT) - 0.6], [s * px(YT), 4.82, pz(YT) + 0.6], 0.2, 0.2);
  }
  // bell beam along X, its ends inside the side ties
  const BEAM_Y = 4.42, BEAM_B = BEAM_Y - 0.16;
  beam("timber", [-px(BEAM_Y), BEAM_Y, 0], [px(BEAM_Y), BEAM_Y, 0], 0.28, 0.32);
  // iron hanger: a strap down from the beam and the pin through the bell lug (static)
  const PIV = 3.95;
  box("tile", 0, (BEAM_B + PIV) / 2 + 0.02, 0, 0.07, BEAM_B - PIV + 0.06, 0.06);
  box("tile", 0, PIV + 0.012, 0, 0.06, 0.05, 0.42);

  // ---------- roof ----------
  {
    const x0 = -3.15, x1 = 3.15, z0 = -3.85, z1 = 3.85, e = 4.95, D = 3.15, k = 0.24, t = 0.22, n = 14, m = 6, gap = 0.34;
    const rise = (v) => D * (0.38 * v + 0.32 * v * v);
    const cx = 0, cz = 0;
    const sori = (u) => k * Math.pow(Math.abs(2 * u - 1), 3);
    const sides = [
      [[x1, z1], [x0, z1], [0, -1]], [[x0, z1], [x0, z0], [1, 0]],
      [[x0, z0], [x1, z0], [0, 1]], [[x1, z0], [x1, z1], [-1, 0]],
    ];
    const surf = (A, B, N, a, d) => {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const v = Math.min(1, d / D), span = Math.max(1e-6, L - 2 * v * D), u = (a - v * D) / span;
      return [A[0] + dir[0] * a + N[0] * d, e + rise(v) + sori(Math.min(1, Math.max(0, u))) * (1 - v) * (1 - v), A[1] + dir[1] * a + N[1] * d];
    };
    const ref = [cx, e + 0.5, cz];
    const ceil = [cx, e + 0.45, cz]; // the soffit rises inward to here
    const top = [cx, e + rise(1), cz];
    for (const [A, B, N] of sides) {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const row = (v) => Array.from({ length: n + 1 }, (_, i) => surf(A, B, N, v * D + (i / n) * (L - 2 * v * D), v * D));
      const rows = Array.from({ length: m + 1 }, (_, j) => row(j / m));
      for (let j = 0; j < m; j++)
        for (let i = 0; i < n; i++) quad("tile", rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i], ref);
      const edge = rows[0], drop = edge.map((q) => [q[0], q[1] - t, q[2]]);
      for (let i = 0; i < n; i++) {
        quad("tile", edge[i], edge[i + 1], drop[i + 1], drop[i], ref);
        tri("tile", drop[i], drop[i + 1], ceil, ref);
        tri("tile", rows[m][i], rows[m][i + 1], top, ref);
      }
      const dir = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      for (let a = gap * 0.75; a < L - gap * 0.5; a += gap) {
        const E = surf(A, B, N, a, 0), o = 0.012, h = 0.055;
        const F = (s, y) => [E[0] + dir[0] * s * h - N[0] * o, y, E[2] + dir[1] * s * h - N[1] * o];
        quad("tileLine", F(-1, E[1] - 0.03), F(1, E[1] - 0.03), F(1, E[1] - 0.03 - 2 * h), F(-1, E[1] - 0.03 - 2 * h), [E[0] + N[0], E[1], E[2] + N[1]]);
        const dMax = Math.min(a, L - a, D) - 0.05;
        if (dMax < 0.15) continue;
        const steps = Math.max(2, Math.ceil((dMax / D) * m * 2));
        const lift = 0.02, hw = 0.03;
        for (let s = 0; s < steps; s++) {
          const d0 = (s / steps) * dMax, d1 = ((s + 1) / steps) * dMax;
          const q = [surf(A, B, N, a - hw, d0), surf(A, B, N, a + hw, d0), surf(A, B, N, a + hw, d1), surf(A, B, N, a - hw, d1)];
          for (const r of q) r[1] += lift;
          quad("tileLine", q[0], q[1], q[2], q[3], [q[0][0], q[0][1] - 1, q[0][2]]);
        }
      }
    }
    // hip caps: segmented along the curved hip, and the ridge
    const capW = 0.2, capH = 0.14, hm = 6;
    const ytop = e + rise(1);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const P = (v) => [sx * (x1 - v * D), e + rise(v) + k * (1 - v) * (1 - v) + 0.07, sz * (z1 - v * D)];
      const pts = Array.from({ length: hm + 1 }, (_, j) => P(j / hm));
      const d0 = sub(pts[0], pts[1]);
      pts[0] = pts[0].map((v, i) => v + d0[i] * 0.15);
      loft("ridge", pts, capW, capH);
    }
    const zi = z1 - D; // the ridge runs along Z
    beam("ridge", [0, ytop + 0.1, -zi - 0.1], [0, ytop + 0.1, zi + 0.1], 0.28, 0.22);
    for (const z of [-zi - 0.14, zi + 0.14]) {
      box("ridge", 0, ytop + 0.24, z, 0.42, 0.42, 0.18); // onigawara
    }
  }

  // ---------- bell (pivot group at the hanger pin) ----------
  const bell = new THREE.Group();
  bell.name = "bell";
  bell.position.set(0, PIV, 0);
  tower.add(bell);
  const MOUTH = -1.685; // local y of the mouth: crown at -0.135, body 1.55 tall
  const PROF = [
    [0, 1.55], [0.22, 1.55], [0.36, 1.53], [0.45, 1.48], [0.505, 1.4], [0.525, 1.3], [0.53, 1.1], [0.535, 0.8],
    [0.545, 0.5], [0.56, 0.25], [0.575, 0.1], [0.585, 0.03], [0.58, 0], [0.51, 0], [0.5, 0.12], [0.42, 0.3], [0.25, 0.38], [0, 0.4],
  ];
  const rAt = (y) => { // outer radius at body height y
    for (let i = 1; i < 12; i++) {
      const [r0, y0] = PROF[i], [r1, y1] = PROF[i + 1];
      if (y <= y0 && y >= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0.53;
  };
  const bellSoup = { bronze: true, band: true };
  lathe("bronze", PROF.map(([r, y]) => [r, MOUTH + y]), 24);
  // lug: half-torus arch in the Y-Z plane over the crown, its inner apex at the pivot
  {
    const R = 0.15, r = 0.05, cy = -(R - r), segA = 10, segT = 8, pos = [], idx = [];
    for (let i = 0; i <= segA; i++) {
      const a = Math.PI * (i / segA); // 0..PI over the top
      const cyy = cy + Math.sin(a) * R, czz = Math.cos(a) * R;
      const ext = i === 0 || i === segA ? -0.06 : 0; // legs dip into the crown
      for (let j = 0; j < segT; j++) {
        const q = (j / segT) * TAU;
        const nx = Math.cos(q), nr = Math.sin(q);
        pos.push(nx * r, cyy + ext + Math.sin(a) * nr * r, czz + Math.cos(a) * nr * r);
      }
    }
    for (let i = 0; i < segA; i++)
      for (let j = 0; j < segT; j++) {
        const a = i * segT + j, b = i * segT + ((j + 1) % segT), e2 = a + segT, d = b + segT;
        idx.push(a, b, d, a, d, e2);
      }
    for (const [k, cz2] of [[0, R], [segA, -R]]) { // caps buried in the crown
      const cI = pos.length / 3;
      pos.push(0, cy - 0.06, cz2);
      for (let j = 0; j < segT; j++) idx.push(cI, k * segT + ((j + 1) % segT), k * segT + j);
    }
    // winding: check one quad against the tube centre
    const g = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const [a, b, d] = [g(idx[0]), g(idx[1]), g(idx[2])];
    const cen = [0, cy + Math.sin(0) * R, R];
    if (dot(cross(sub(b, a), sub(d, a)), sub(a, cen)) < 0) for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gg.setIndex(idx);
    gg.computeVertexNormals();
    const ng = gg.toNonIndexed(), P = ng.attributes.position.array, N = ng.attributes.normal.array, s = S("bronze");
    for (let i = 0; i < P.length; i++) s.p.push(P[i]), s.n.push(N[i]);
    for (let i = 0; i < P.length / 3; i++) s.o.push(-1);
    // crown knob under the lug
    lathe("bronze", [[0, -0.15], [0.14, -0.15], [0.12, -0.1], [0, -0.085]], 12);
  }
  // raised bands: horizontal rings (flat strips 12 mm proud) and double vertical ribbons
  const PROUD = 0.012;
  function ring(y0, y1) {
    const seg = 24;
    for (let i = 0; i < seg; i++) {
      const q0 = (i / seg) * TAU, q1 = ((i + 1) / seg) * TAU;
      const P = (q, y) => { const r = rAt(y) + PROUD; return [r * Math.cos(q), MOUTH + y, r * Math.sin(q)]; };
      quad("band", P(q0, y0), P(q1, y0), P(q1, y1), P(q0, y1), [0, MOUTH + (y0 + y1) / 2, 0]);
    }
  }
  ring(0.27, 0.31); ring(0.57, 0.61); ring(0.98, 1.02); ring(1.08, 1.11); ring(1.36, 1.39);
  function ribbon(q, y0, y1, w = 0.03) {
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const ya = y0 + ((y1 - y0) * s) / steps, yb = y0 + ((y1 - y0) * (s + 1)) / steps;
      const P = (y, side) => { const r = rAt(y) + PROUD; const dq = (side * w) / 2 / r; return [r * Math.cos(q + dq), MOUTH + y, r * Math.sin(q + dq)]; };
      quad("band", P(ya, -1), P(ya, 1), P(yb, 1), P(yb, -1), [0, MOUTH + ya, 0]);
    }
  }
  for (let k = 0; k < 4; k++) {
    const q = Math.PI / 4 + (k * Math.PI) / 2;
    ribbon(q - 0.05, 0.61, 1.36); ribbon(q + 0.05, 0.61, 1.36);
  }
  // bosses (chi): 3 x 3 per panel, panels centred on +-X and +-Z, between the bands at 1.11 and 1.36
  function boss(q, y, rb = 0.032, hb = 0.04) {
    const r = rAt(y), o = [r * Math.cos(q), MOUTH + y, r * Math.sin(q)];
    const out = [Math.cos(q), 0, Math.sin(q)], tq = [-Math.sin(q), 0, Math.cos(q)], up = [0, 1, 0];
    const seg = 6, inner = o.map((v, i) => v - out[i] * 0.01), ref = o.map((v, i) => v - out[i] * 0.03);
    const P = (a, rr, h) => [0, 1, 2].map((i) => inner[i] + out[i] * h + (tq[i] * Math.cos(a) + up[i] * Math.sin(a)) * rr);
    const apex = P(0, 0, hb + 0.01);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU, a1 = ((i + 1) / seg) * TAU;
      quad("bronze", P(a0, rb, 0), P(a1, rb, 0), P(a1, rb * 0.75, hb * 0.75), P(a0, rb * 0.75, hb * 0.75), ref);
      tri("bronze", P(a0, rb * 0.75, hb * 0.75), P(a1, rb * 0.75, hb * 0.75), apex, ref);
    }
  }
  for (let k = 0; k < 4; k++) {
    const qc = (k * Math.PI) / 2;
    for (const dq of [-0.32, 0, 0.32]) for (const y of [1.16, 1.235, 1.31]) boss(qc + dq, y);
  }
  // lotus striking pads (tsukiza) on +-X
  const PAD_Y = 0.44;
  for (const sx of [1, -1]) {
    const r = rAt(PAD_Y);
    prism("bronze", [sx * (r - 0.03), MOUTH + PAD_Y, 0], [sx * (r + 0.025), MOUTH + PAD_Y, 0], 0.115, 0.1, 12);
    prism("band", [sx * (r + 0.024), MOUTH + PAD_Y, 0], [sx * (r + 0.03), MOUTH + PAD_Y, 0], 0.045, 0.045, 8);
  }

  // ---------- striker ----------
  const LOG_Y = PIV + MOUTH + PAD_Y; // world height of the pad centre = log axis
  const LOG_R = 0.14, LOG_LEN = 1.5, LOG_X0 = rAt(PAD_Y) + 0.03 + 0.015;
  const striker = new THREE.Group();
  striker.name = "striker";
  tower.add(striker);
  {
    // log along X: a lathe about Y built upright, then turned (author along y, map (r cos, y, r sin) -> (y, ., .))
    const prof = [[0, 0], [0.1, 0], [LOG_R, 0.04], [LOG_R, LOG_LEN - 0.04], [0.12, LOG_LEN], [0, LOG_LEN]];
    const before = S("log").p.length;
    lathe("log", prof, 14);
    const s = S("log");
    for (let i = before; i < s.p.length; i += 3) {
      const [x, y, z] = [s.p[i], s.p[i + 1], s.p[i + 2]], [nx, ny, nz] = [s.n[i], s.n[i + 1], s.n[i + 2]];
      s.p[i] = LOG_X0 + y; s.p[i + 1] = LOG_Y + x; s.p[i + 2] = z;
      s.n[i] = ny; s.n[i + 1] = nx; s.n[i + 2] = nz;
    }
    // the swap (x,y) mirrors: flip each triangle's winding back
    for (let i = before; i < s.p.length; i += 9)
      for (let k = 0; k < 3; k++) [s.p[i + 3 + k], s.p[i + 6 + k]] = [s.p[i + 6 + k], s.p[i + 3 + k]];
    for (let i = before; i < s.n.length; i += 9)
      for (let k = 0; k < 3; k++) [s.n[i + 3 + k], s.n[i + 6 + k]] = [s.n[i + 6 + k], s.n[i + 3 + k]];
  }
  // ropes: two parallel ropes from the beam to the log top; loops round the log (owner 2 rides the log)
  const ROPE_X = [LOG_X0 + 0.3, LOG_X0 + 1.0], ROPE_TOP = BEAM_B + 0.02, ROPE_BOT = LOG_Y + LOG_R;
  const ROPE_L = ROPE_TOP - ROPE_BOT;
  ROPE_X.forEach((x, i) => {
    owner = i;
    prism("rope", [x, ROPE_TOP + 0.04, 0], [x, ROPE_BOT - 0.01, 0], 0.022, 0.022, 6);
    owner = 2;
    prism("rope", [x - 0.035, LOG_Y, 0], [x + 0.035, LOG_Y, 0], LOG_R + 0.018, LOG_R + 0.018, 12);
  });
  owner = -1;

  // ---------- meshes ----------
  const MAT = {
    stone: [c.stone, c.stoneShade, 0.1, true],
    timber: [c.timber, c.timberShade, 0.1, true],
    tile: [c.tile, c.tileShade, 0.25, true],
    tileLine: [c.tileLine, c.tileLine, 0.1, false],
    ridge: [c.tile, c.tileShade, 0.25, true],
    bronze: [c.bronze, c.bronzeShade, 0.15, true],
    band: [c.band, c.band, 0.1, false],
    log: [c.log, c.logShade, 0.2, true],
    rope: [c.rope, c.ropeShade, 0.2, 2],
  };
  let rope = null;
  for (const [key, { p, n, o }] of Object.entries(soups)) {
    const [base, shade, threshold, outline] = MAT[key];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    const mesh = kit.toon(g, base, shade, outline === true ? { threshold } : outline ? { threshold, px: outline } : { threshold, outline: false });
    mesh.name = key;
    (bellSoup[key] ? bell : key === "log" ? striker : tower).add(mesh);
    if (bellSoup[key]) mesh.position.y = 0; // authored in the bell's local frame
    if (key === "rope") {
      kit.hullNormals(g);
      const hn = g.attributes.hullNormal;
      rope = { mesh, p: Float32Array.from(p), n: Float32Array.from(n), h: hn ? Float32Array.from(hn.array) : null, o };
      mesh.frustumCulled = false;
    }
  }

  // ---------- rig ----------
  const joints = { bell, striker };
  // theta: rope swing (rad, + draws the log back toward +X and up); phi: bell rz (rad, + mouth toward +X)
  function apply(theta, phi) {
    bell.rotation.set(0, 0, phi);
    const dx = ROPE_L * Math.sin(theta), dy = ROPE_L * (1 - Math.cos(theta));
    striker.position.set(dx, dy, 0);
    const g = rope.mesh.geometry, P3 = g.attributes.position.array, N3 = g.attributes.normal.array, H = g.attributes.hullNormal?.array;
    const cs = Math.cos(theta), sn = Math.sin(theta);
    for (let v = 0; v < rope.o.length; v++) {
      const k = rope.o[v], i = v * 3;
      if (k === 2) {
        P3[i] = rope.p[i] + dx; P3[i + 1] = rope.p[i + 1] + dy; P3[i + 2] = rope.p[i + 2];
        continue;
      }
      const ox = ROPE_X[k], oy = ROPE_TOP, x = rope.p[i] - ox, y = rope.p[i + 1] - oy;
      P3[i] = ox + x * cs - y * sn; P3[i + 1] = oy + x * sn + y * cs; P3[i + 2] = rope.p[i + 2];
      const rot = (src, dst) => { const a = src[i], b = src[i + 1]; dst[i] = a * cs - b * sn; dst[i + 1] = a * sn + b * cs; dst[i + 2] = src[i + 2]; };
      rot(rope.n, N3);
      if (H && rope.h) rot(rope.h, H);
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    if (H) g.attributes.hullNormal.needsUpdate = true;
    g.computeBoundingSphere(), g.computeBoundingBox();
    root.updateMatrixWorld(true);
  }
  const CLIPS = { strike: 4 };
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  function strike(t) {
    t = ((t % 4) + 4) % 4;
    const A = 30 * DEG;
    let th = 0, ph = 0;
    if (t < 1.25) th = A * ease(t / 1.25);
    else if (t < 1.45) th = A;
    else if (t < 2.0) th = A * Math.cos((Math.PI / 2) * ((t - 1.45) / 0.55));
    else if (t < 3.2) th = 9 * DEG * Math.sin((Math.PI * (t - 2.0)) / 1.2);
    else if (t < 3.8) th = 2 * DEG * Math.sin((Math.PI * (t - 3.2)) / 0.6);
    if (t >= 2.0) {
      const s = t - 2.0, w = 1 - s / 2;
      ph = -2 * DEG * Math.exp(-s / 0.9) * Math.sin(TAU * s) * w * w;
    }
    return [th, ph];
  }
  function pose(name) {
    const mm = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (mm) {
      if (!CLIPS[mm[1]]) throw new Error(`shoro: no clip "${mm[1]}" (clips: strike)`);
      return apply(...strike(+mm[2]));
    }
    if (name !== "rest") throw new Error(`shoro: unknown pose "${name}" (rest, or strike@<seconds>)`);
    apply(0, 0);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

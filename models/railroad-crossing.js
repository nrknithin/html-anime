// railroad-crossing.js - a Japanese railroad crossing post (fumikiri) with its boom gate, the classic anime street-set
// piece: the evening crossing, the lamps blinking, the barrier coming down between two characters.
// Contract: harness/lab/README.md. Meters, +Y up, the road side (signs, lamps, boom) faces +Z, its left is +X, stands
// on y = 0; the rest pose (boom up) is centred on x = 0, z = 0, so the pole stands at x = -0.3 (left side).
//
// Construction (boxes, prisms and cylinders as triangle soups merged per material and per moving part; flat-shaded, so
// boards and plates read crisp; every closed part is wound from a point inside it, never by hand):
//   POLE      a 0.14 m post on a concrete footing, its lower 1.2 m in yellow / black bands (the tiger stripes), grey above.
//   CROSSBUCK the X sign (fumikiri keihyo) at the top: two boards in yellow / black diagonal bands across each board,
//             the second board 6 mm behind the first so they never z-fight.
//   LAMPS     a black crossbar under the X with two round lamps side by side, front and back: a black back plate, a red
//             lens and a half-round hood over each. Each lamp's two lenses are one mesh (joints lampL / lampR) whose
//             material is swapped: lit = accent at threshold -1 (one flat tone all round, a practical, as the chochin's
//             lit paper), dark = sky / hair (unlit glass). No emissive in the kit; halo and bloom are the film's job.
//   ARROWS    the direction indicator under the lamps: a black box with a left and a right arrow front and back,
//             unlit sky, lit practical (flat) while the alarm runs (opts.train picks which).
//   BELL      the alarm bell housing on top of the pole: a black drum under a grey dome.
//   BOOM      a gate machine cabinet beside the pole, a hub on its road face (joint "boom", rotates about Z), the arm in
//             0.35 m yellow / black bands toward the road and a short counterweight arm with a black weight behind.
// Proportions (real size, base unit the pole 3.7 m): footing 0-0.12; stripes 0-1.2 (8 bands); arrow box 2.12-2.34;
//   lamps centre 2.6, x +-0.32 off the pole, plate r 0.2, lens r 0.135; X centre 3.25, boards 1.1 x 0.13 at +-38 deg;
//   bell 3.7-3.97. Cabinet 0.32 x 0.95 x 0.32, 0.95 m from the pole toward the road and 0.2 m back; pivot y 0.8; arm 0.09 x 0.06,
//   { boomLength } default 5 m (rest top = pivot + boomLength + 0.03).
// Options build(THREE, kit, colors, { side, boomLength, train, height }):
//   side "left" (default: the post stands on the road's left, the arm swings out toward +X) or "right" (mirrored in x;
//   the geometry is mirrored, not scaled, so winding stays right); boomLength in m; train "left" | "right" | "both"
//   (which arrow lights in the alarm); height scales the whole post uniformly (meta.height is the default boom-up top).
// Rig: root -> post (scale) -> boom, the one joint (pivot on the hub, rotates about Z; +rz lifts the arm on the left
//   side, the mirror flips the sign). The lens meshes are named lampL / lampR (lampL on +X), the arrows arrowL / arrowR.
// Poses: rest = up (boom vertical, lamps dark), up, down (boom horizontal, lamps dark). Clips (build() returns
//   clips { name: seconds }; pose("alarm@0.3")): alarm 1.2 s looping (boom down, the two lamps alternate 0.6 s each,
//   arrow lit); lower 5 s, plays once (t clamped): lamps alternate from t = 0, the boom holds up 0.6 s, swings down with
//   an ease-in-out to 4.0 s, dips 2 deg below level and settles by 4.8 s.
// Colours (indigo, the night crossing): yellow practical #f0c36a / iris #e7a04a; black (stripes, plates, crossbar,
//   arrow box, bell, weight) hair #16141c flat, next to ink as hair is on the torii; pole, cabinet, dome and footing moon
//   #d5e2ff / sky #1b2d6b; lens lit accent #e23b4a flat, dark sky #1b2d6b / hair; arrows dark sky / hair, lit
//   practical flat. Yellow and grey at threshold 0.1, so faces square to the camera stay lit.

export const meta = {
  name: "railroad-crossing",
  height: 5.8,
  script: "indigo",
  colors: {
    yellow: "#f0c36a", yellowShade: "#e7a04a",
    black: "#16141c", blackShade: "#16141c",
    grey: "#d5e2ff", greyShade: "#1b2d6b",
    lamp: "#e23b4a", lampCore: "#f6f3ee",
    lens: "#1b2d6b", lensShade: "#16141c",
    arrow: "#f0c36a",
  },
  poses: ["rest", "up", "down"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = { ...meta.colors, ...colors };
  const { side = "left", boomLength = 5, train = "left", height = meta.height } = opts;
  const sx = side === "right" ? -1 : 1;
  const D = Math.PI / 180;
  const root = new THREE.Group();
  root.name = "railroad-crossing";
  const post = new THREE.Group(); // uniform size scale lives here, so root stays the plain contract node
  post.name = "post";
  post.scale.setScalar(height / meta.height);
  root.add(post);
  const joints = {};

  // ---------- triangle soups (per group, per material); x is mirrored by sx at write time ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const M = (p) => [p[0] * sx, p[1], p[2]];
  const soups = {};
  let G = "post"; // current group
  const S = (key) => ((soups[G] ??= {})[key] ??= []);
  function tri(key, a, b, e, ref) {
    [a, b, e, ref] = [M(a), M(b), M(e), M(ref)];
    const n = cross(sub(b, a), sub(e, a));
    if (Math.hypot(...n) < 1e-9) return;
    const m = [(a[0] + b[0] + e[0]) / 3, (a[1] + b[1] + e[1]) / 3, (a[2] + b[2] + e[2]) / 3];
    S(key).push(...a, ...(dot(n, sub(m, ref)) < 0 ? [...e, ...b] : [...b, ...e]));
  }
  const quad = (key, a, b, e, d, ref) => (tri(key, a, b, e, ref), tri(key, a, e, d, ref));
  function hex(key, p) {
    const ref = [0, 1, 2].map((i) => p.reduce((s, q) => s + q[i], 0) / 8);
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      quad(key, p[f[0]], p[f[1]], p[f[2]], p[f[3]], ref);
  }
  function box(key, cx, cy, cz, w, h, d) {
    const [x0, x1, y0, y1, z0, z1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cz - d / 2, cz + d / 2];
    hex(key, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
  }
  // a beam from a to b, w wide and h thick along `up`
  function beam(key, a, b, w, h, up = [0, 1, 0]) {
    const d = sub(b, a), nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const s = nrm(cross(d, up)), u = nrm(cross(s, d));
    const P = (o, i, j) => [0, 1, 2].map((k) => o[k] + (s[k] * i * w) / 2 + (u[k] * j * h) / 2);
    hex(key, [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1), P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)]);
  }
  // a closed cylinder along axis "y" or "z", centre (cx, cy, cz), radius r, length len, n sides
  // tilt (axis "y" only) slants both end caps: y += tilt * x, so stacked sleeves make diagonal stripes
  function cyl(key, cx, cy, cz, r, len, axis = "y", n = 12, r1 = r, tilt = 0) {
    const P = (a, t, rr) => {
      const u = Math.cos(a) * rr, v = Math.sin(a) * rr;
      return axis === "y" ? [cx + u, cy + t + tilt * u, cz + v] : [cx + u, cy + v, cz + t];
    };
    const ref = [cx, cy, cz], h = len / 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI;
      quad(key, P(a0, -h, r), P(a1, -h, r), P(a1, h, r1), P(a0, h, r1), ref);
      tri(key, P(a0, -h, 0), P(a0, -h, r), P(a1, -h, r), ref);
      tri(key, P(a0, h, 0), P(a0, h, r1), P(a1, h, r1), ref);
    }
  }
  // a half-round hood over a lamp facing dir (+1 / -1 in z): an annular half-sector shell r0..r1, from z0 out by depth
  function hood(key, cx, cy, z0, dir, r0, r1, depth, n = 8) {
    const P = (a, r, dz) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0 + dir * dz];
    const span = (i) => (-10 + (200 * i) / n) * D; // a little past half round, so it shades the lens sides
    for (let i = 0; i < n; i++) {
      const a0 = span(i), a1 = span(i + 1), am = (a0 + a1) / 2;
      const zin = z0 + (dir * depth) / 2;
      quad(key, P(a0, r1, 0), P(a1, r1, 0), P(a1, r1, depth), P(a0, r1, depth), [cx, cy, zin]);
      quad(key, P(a0, r0, 0), P(a1, r0, 0), P(a1, r0, depth), P(a0, r0, depth),
        [cx + Math.cos(am) * 2 * r1, cy + Math.sin(am) * 2 * r1, zin]);
      const mid = (dz) => [cx + Math.cos(am) * (r0 + r1) / 2, cy + Math.sin(am) * (r0 + r1) / 2, z0 + dir * dz];
      quad(key, P(a0, r0, 0), P(a1, r0, 0), P(a1, r1, 0), P(a0, r1, 0), mid(depth));
      quad(key, P(a0, r0, depth), P(a1, r0, depth), P(a1, r1, depth), P(a0, r1, depth), mid(0));
    }
    for (const a of [span(0), span(n)]) {
      const t = [-Math.sin(a), Math.cos(a)].map((v) => v * (a > 0 ? -1 : 1) * 0.01); // ref just inside the end
      const ref = [cx + Math.cos(a) * (r0 + r1) / 2 + t[0], cy + Math.sin(a) * (r0 + r1) / 2 + t[1], z0 + (dir * depth) / 2];
      quad(key, P(a, r0, 0), P(a, r1, 0), P(a, r1, depth), P(a, r0, depth), ref);
    }
  }
  // a flat arrow prism on a z face, pointing +X (pt = 1) or -X (pt = -1), proud by t from z0 in dir
  function arrow(key, cx, cy, z0, dir, pt, t = 0.012) {
    const L = 0.085, H = 0.075, sh = 0.026; // head length, head half-height, shaft half-height
    const outline = [[L, 0], [0.01, H], [0.01, sh], [-0.085, sh], [-0.085, -sh], [0.01, -sh], [0.01, -H]].map(([u, v]) => [cx + pt * u, cy + v]);
    const z1 = z0 + dir * t, zm = (z0 + z1) / 2;
    const parts = [[0, 1, 6], [2, 3, 4, 5]]; // head triangle + shaft quad (both convex)
    for (const part of parts) {
      const pts = part.map((i) => outline[i]);
      const ref = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length, zm];
      const A = pts.map(([x, y]) => [x, y, z0]), B = pts.map(([x, y]) => [x, y, z1]);
      for (let i = 1; i < pts.length - 1; i++) (tri(key, A[0], A[i], A[i + 1], ref), tri(key, B[0], B[i], B[i + 1], ref));
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        quad(key, A[i], A[j], B[j], B[i], ref);
      }
    }
  }

  // ---------- the post ----------
  const PX = -0.3; // the pole's x: the rest-pose bbox (pole to boom) is centred on x = 0
  const PR = 0.07, TOP = 3.7;
  // Banded parts are an inked yellow core under black sleeves a few mm proud with no hull of their own: separate inked
  // bands let each band's hull eat into its yellow neighbours (keys ending in "-" are drawn without a hull).
  box("grey", PX, 0.06, 0, 0.42, 0.12, 0.42); // footing
  cyl("grey", PX, (1.2 + TOP) / 2, 0, PR, TOP - 1.2, "y", 12);
  cyl("yellow", PX, 0.66, 0, PR + 0.004, 1.08, "y", 12);
  for (let i = 0; i < 7; i++) cyl("black-", PX, 0.2 + i * 0.15, 0, PR + 0.009, 0.075, "y", 12, PR + 0.009, 0.9);

  // bell housing on top: black drum, grey dome
  cyl("black", PX, TOP + 0.06, 0, 0.13, 0.12, "y", 12, 0.12);
  cyl("grey", PX, TOP + 0.17, 0, 0.12, 0.1, "y", 12, 0.04);

  // crossbuck X (front of the pole), boards with bands across, black ends
  const XY = 3.25, XL = 1.1, XW = 0.13, XT = 0.022;
  for (const [k, ang] of [[0, 38], [1, -38]]) {
    const z = PR + 0.03 + XT / 2 + k * (XT + 0.006);
    const dx = Math.cos(ang * D), dy = Math.sin(ang * D), N = 9, at = (t) => [PX + dx * t, XY + dy * t, z];
    beam("yellow", at(-XL / 2), at(XL / 2), XW, XT, [0, 0, 1]);
    for (let i = 0; i < N; i += 2)
      beam("black-", at(-XL / 2 + (XL * i) / N), at(-XL / 2 + (XL * (i + 1)) / N), XW + 0.006, XT + 0.006, [0, 0, 1]);
  }
  box("black", PX, XY, PR / 2 + 0.02, 0.06, 0.06, PR + 0.04); // the X's bracket

  // lamp unit: crossbar, back plates, hoods; lenses are their own meshes below
  const LY = 2.6, LX = 0.33, PLR = 0.21, LR = 0.165;
  box("black", PX, LY, 0, 2 * LX, 0.07, 0.07);
  for (const s of [1, -1]) {
    for (const dir of [1, -1]) {
      cyl("black", PX + s * LX, LY, dir * 0.06, PLR, 0.03, "z", 16);
      hood("black", PX + s * LX, LY, dir * 0.075, dir, LR + 0.005, LR + 0.028, 0.08, 8);
    }
  }
  // arrow indicator box
  const AY = 2.23;
  box("black", PX, AY, 0, 0.5, 0.22, 0.12);
  box("black", PX, (AY + LY) / 2, 0, 0.05, LY - AY, 0.05); // its hanger, behind the pole line

  // gate machine cabinet beside the pole, toward the road (+X)
  // set back 0.2 m so the arm runs close to the pole's plane (z 0.08): from the hero three-quarter the raised arm then
  // stands clear of the lamp head on either side, where a road-side arm crossed in front of it
  const CX = PX + 0.95, CZ = -0.2, PY = 0.8, PZ = CZ + 0.16;
  box("grey", CX, 0.475, CZ, 0.32, 0.95, 0.32);
  box("black", CX, 0.97, CZ, 0.36, 0.04, 0.36); // lid
  cyl("black", CX, PY, PZ + 0.03, 0.09, 0.06, "z", 12); // hub boss

  // ---------- the boom (local frame at the pivot; built horizontal, along +X) ----------
  G = "boom";
  const AZ = 0.09, AW = 0.09, AD = 0.06, BAND = 0.35;
  cyl("black", 0, 0, AZ - 0.03, 0.065, 0.05, "z", 10); // hub cap
  const nb = Math.max(2, Math.round(boomLength / BAND));
  box("yellow", boomLength / 2, 0, AZ, boomLength, AW, AD);
  for (let i = 1; i < nb; i += 2) {
    const x0 = (boomLength * i) / nb, x1 = (boomLength * (i + 1)) / nb;
    box("black-", (x0 + x1) / 2, 0, AZ, x1 - x0, AW + 0.008, AD + 0.008);
  }
  box("black", -0.28, 0, AZ, 0.56, 0.07, 0.05); // counterweight arm
  box("black", -0.48, 0, AZ - 0.02, 0.2, 0.2, 0.12); // the weight

  // ---------- meshes ----------
  const MAT = {
    yellow: [c.yellow, c.yellowShade, 0.1],
    black: [c.black, c.blackShade, 0.35],
    grey: [c.grey, c.greyShade, 0.1],
  };
  const boom = new THREE.Group();
  boom.name = "boom";
  boom.position.set(CX * sx, PY, PZ + 0.03);
  post.add(boom);
  joints.boom = boom;
  const mesh = (arr, mat, outline = true) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    return outline ? kit.outline(m) : m;
  };
  for (const [grp, keys] of Object.entries(soups))
    for (const [key, arr] of Object.entries(keys)) {
      const [b, s, threshold] = MAT[key.replace("-", "")];
      const m = mesh(arr, kit.cel(b, s, { threshold }), !key.endsWith("-"));
      m.name = key;
      (grp === "boom" ? boom : post).add(m);
    }

  // lenses (one mesh a lamp, front and back) and arrows (one mesh a direction): their material is the light
  const litMat = kit.cel(c.lamp, c.lamp, { threshold: -1 });
  const lensMat = kit.cel(c.lens, c.lensShade, { threshold: 0.1 });
  const coreMat = kit.cel(c.lampCore, c.lampCore, { threshold: -1 });
  const arrowLit = kit.cel(c.arrow, c.arrow, { threshold: -1 });
  const arrowOff = kit.cel(c.lens, c.lensShade, { threshold: 0.1 });
  const lamps = {}, arrows = {};
  const head = new THREE.Group(); // a marker at the lamp centre (for a film's glow sprite or a close-up), not posed
  head.name = "lamps";
  head.position.set(PX * sx, LY, 0);
  post.add(head);
  joints.lamps = head;
  G = "lens";
  for (const [name, s] of [["lampL", 1], ["lampR", -1]]) {
    soups.lens = {};
    for (const dir of [1, -1]) {
      cyl("lens", PX + s * LX, LY, dir * 0.088, LR, 0.026, "z", 16);
      cyl("core", PX + s * LX, LY, dir * 0.092, 0.055, 0.026, "z", 10); // the hot spot, 4 mm proud
    }
    const m = mesh([...soups.lens.lens, ...soups.lens.core], [lensMat, lensMat], false);
    m.geometry.addGroup(0, soups.lens.lens.length / 3, 0);
    m.geometry.addGroup(soups.lens.lens.length / 3, soups.lens.core.length / 3, 1);
    m.name = name;
    post.add(m);
    lamps[name] = m;
  }
  for (const [name, pt] of [["arrowL", 1], ["arrowR", -1]]) {
    soups.lens = {};
    for (const dir of [1, -1]) arrow("lens", PX + pt * 0.115, AY, dir * 0.06, dir, pt);
    const m = mesh(soups.lens.lens, arrowOff, false);
    m.name = name;
    post.add(m);
    arrows[name] = m;
  }

  // ---------- poses and clips ----------
  const CLIPS = { alarm: 1.2, lower: 5 };
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  function boomAngle(t) { // lower clip: degrees above level
    if (t < 0.6) return 90;
    if (t < 4.0) return 90 * (1 - smooth((t - 0.6) / 3.4)) - 2 * smooth((t - 3.4) / 0.6);
    return -2 * (1 - smooth((t - 4.0) / 0.8));
  }
  function apply(angle, flash) { // flash: null (dark) or the alarm time
    boom.rotation.set(0, 0, sx * angle * D);
    const on = flash === null ? null : (((flash % 1.2) + 1.2) % 1.2) < 0.6 ? "lampL" : "lampR";
    lamps.lampL.material = on === "lampL" ? [litMat, coreMat] : [lensMat, lensMat];
    lamps.lampR.material = on === "lampR" ? [litMat, coreMat] : [lensMat, lensMat];
    const lit = flash !== null;
    arrows.arrowL.material = lit && (train === "left" || train === "both") ? arrowLit : arrowOff;
    arrows.arrowR.material = lit && (train === "right" || train === "both") ? arrowLit : arrowOff;
    root.updateMatrixWorld(true);
  }
  function pose(name) {
    const m = /^(\w+)@(-?[\d.]+)$/.exec(name);
    if (m) {
      const t = +m[2];
      if (m[1] === "alarm") return apply(0, t);
      if (m[1] === "lower") { const u = Math.min(Math.max(t, 0), CLIPS.lower); return apply(boomAngle(u), u); }
      throw new Error(`railroad-crossing: no clip "${m[1]}" (clips: alarm, lower)`);
    }
    if (name === "rest" || name === "up") return apply(90, null);
    if (name === "down") return apply(0, null);
    throw new Error(`railroad-crossing: unknown pose "${name}" (rest, up, down, or <clip>@<seconds>)`);
  }
  pose("rest");
  return { root, joints, pose, clips: { ...CLIPS } };
}

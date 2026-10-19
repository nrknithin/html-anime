// yumi.js - a Japanese longbow (yumi) as held in a kyudo club scene, with an optional nocked arrow (ya).
// Contract: harness/lab/README.md. Meters, +Y up, stands upright on its lower tip at y = 0, centred on x = 0, z = 0.
//
// Orientation (the same axes as the library `bow`, so a film can swap one for the other): the bow lies in the x = 0
// plane, its back (the side away from the archer) faces +Z = the arrow's flight direction, the string is at -Z
// toward the archer. The arrow rides on the archer's right of the bow (-X), as in kyudo. To hold it, parent a group
// to the left hand and put the bow inside it at -joints.grip.position (the grip pivot is the centre of the wrap,
// 0.68 m up); the arrow nock follows the string, so a right hand can be placed at joints.nock.
//
// Construction (one centreline, everything lofted on it):
//   CENTRELINE  two limbs measured outward from the grip centre, each a Catmull-Rom through literal (y, z) points,
//               resampled at equal arc length and stored as tangent angles. draw(a) adds bend to those angles (none
//               inside the grip, most mid-limb, easing toward the tips, a little opening of the reflex tips) and integrates again, so the
//               limbs keep their length. The bend is solved by bisection so that the string keeps its braced length
//               while its nock point is pulled back to the drawn z (solve, don't guess).
//   STAVE       a rounded-rectangle loft (8 per ring, plane-locked to the YZ tangent), width in x, thickness in z,
//               tapering from the grip to the tips, ends closed with fans. Grip wrap, tip lacquer and two thin rattan
//               bands are short lofts on the same frames, 1.5-3 mm proud of the stave. Positions are rewritten in
//               place on every draw (fixed topology, hull normals rebuilt), no morph targets.
//   STRING      a 3-point tube (bottom nock, nock point, top nock) with mitred rings, thin hull.
//   YA          optional ({ arrow: true }): shaft, three feathers, iron head, aimed from the nock point past the
//               right side of the grip.
// Proportions (base unit the length L = 2.21 m, nami-sun): lower limb 0.70 (tip to grip centre), upper 1.53, so the
//   grip sits at 0.32 L, the arrow at 0.35 L; grip wrap 0.15 m; brace height ~0.16 m; drawn nock 0.88 m behind the
//   grip front (yazuka); stave 30 x 26 mm at the grip, 15 x 11 mm at the tips (about +12 % for the ink); arrow 1.0 m.
// Colours (noon): bamboo stave sky #f2d7ae / iris #5c3d32 at threshold 0.1 (the lit +X flank and the back stay pale,
//   the belly and far side go brown). Grip leather accent #c4452d / iris. Tip lacquer, rattan bands and the arrow head
//   iris on iris (a flat dark lacquer: noon's only colour darker than iris is hair #241c16, which is darker than the
//   ink, so it can't be a shade). String practical #fffaf2 / sky. Feathers practical / iris.
//   { finish: "black" } lacquers the whole stave iris on iris (glass / carbon club bows), keeping the red grip and a
//   sky-coloured rattan so the asymmetry still reads.
// Poses: rest (braced, string straight), drawn (full draw, kai). draw(a) for anything between; pose() is absolute.
// The grip stays put in every draw (it is the hand); the tips come in, so in `drawn` the lower tip lifts 3 cm off
// y = 0 and the top drops to 2.0 m. With { arrow: true } the bbox reaches 0.85 m forward of the bow (the lab warns
// about z-centring then; that is the arrow, not an error).

export const meta = {
  name: "yumi",
  height: 2.22,
  script: "noon",
  colors: {
    stave: "#f2d7ae", staveShade: "#5c3d32",
    grip: "#c4452d", gripShade: "#5c3d32",
    lacquer: "#5c3d32", lacquerShade: "#5c3d32",
    string: "#fffaf2", stringShade: "#f2d7ae",
    feather: "#fffaf2", featherShade: "#5c3d32",
  },
  poses: ["rest", "drawn"],
};

export function build(THREE, kit, colors = meta.colors, opts = {}) {
  const c = colors;
  const { arrow = false, finish = "bamboo" } = opts;
  const root = new THREE.Group();
  root.name = "yumi";
  const joints = {};
  const DEG = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ---------- centreline ----------
  // Rest shape in (y, z), from the grip centre outward. Back of the bow is +Z; the tips recurve back toward +Z.
  const G = [0.68, 0.15];
  const UPPER = [G, [0.86, 0.163], [1.15, 0.142], [1.5, 0.084], [1.84, 0.006], [2.06, -0.04], [2.155, -0.03], [2.21, 0.014]];
  const LOWER = [G, [0.52, 0.131], [0.34, 0.081], [0.17, 0.029], [0.065, -0.002], [0.028, 0.006], [0.0, 0.032]];
  const M = 64; // samples per limb for the integration
  function limb(pts) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([y, z]) => new THREE.Vector3(0, y, z)), false, "centripetal");
    const sp = curve.getSpacedPoints(M);
    const len = curve.getLength();
    const ang = [];
    for (let i = 0; i < M; i++) ang.push(Math.atan2(sp[i + 1].z - sp[i].z, sp[i + 1].y - sp[i].y));
    return { len, ds: len / M, ang };
  }
  const LIMBS = { up: limb(UPPER), lo: limb(LOWER) };
  const LU = LIMBS.up.len, LL = LIMBS.lo.len, L = LU + LL; // s runs 0 (bottom tip) .. L (top tip), grip at s = LL
  const GRIP_HALF = 0.075;
  // bend weight along a limb (u = distance from grip / limb length): zero in the grip, peak mid-limb, the reflex tips
  // open slightly (negative weight near the end) as they do under draw.
  const bendW = (u) => smooth(0.05, 0.3, u) * (1 - 0.2 * smooth(0.5, 0.92, u)) - smooth(0.9, 1.0, u) * 0.5;
  const lineY = new Float32Array(2 * M + 1), lineZ = new Float32Array(2 * M + 1);
  // shape(k): k = bend (rad of tangent change per metre at weight 1). Upper bends toward -Z (angle down), lower too.
  function shape(k) {
    const ys = [], zs = [];
    for (const key of ["lo", "up"]) {
      const Lb = LIMBS[key], sign = key === "up" ? -1 : 1;
      let y = G[0], z = G[1], acc = 0;
      const out = [[y, z]];
      for (let i = 0; i < M; i++) {
        acc += sign * k * bendW((i + 0.5) / M) * Lb.ds;
        const a = Lb.ang[i] + acc;
        y += Math.cos(a) * Lb.ds; z += Math.sin(a) * Lb.ds;
        out.push([y, z]);
      }
      if (key === "lo") for (let i = M; i >= 1; i--) { ys.push(out[i][0]); zs.push(out[i][1]); }
      else for (let i = 0; i <= M; i++) { ys.push(out[i][0]); zs.push(out[i][1]); }
    }
    lineY.set(ys); lineZ.set(zs);
  }
  // s -> index space: lower limb samples are spaced LL/M, upper LU/M.
  function at(s) {
    s = Math.min(L, Math.max(0, s));
    const f = s < LL ? (s / LL) * M : M + ((s - LL) / LU) * M;
    const i = Math.min(2 * M - 1, Math.floor(f)), t = f - i;
    const y = lerp(lineY[i], lineY[i + 1], t), z = lerp(lineZ[i], lineZ[i + 1], t);
    let ty = lineY[i + 1] - lineY[i], tz = lineZ[i + 1] - lineZ[i];
    const l = Math.hypot(ty, tz);
    return { y, z, ty: ty / l, tz: tz / l };
  }
  // stave half-width (x) and half-thickness (z) along s
  function section(s) {
    const d = s < LL ? (LL - s) / LL : (s - LL) / LU; // 0 at grip, 1 at a tip
    const t = smooth(0.0, 1.0, d);
    return [lerp(0.015, 0.0075, t), lerp(0.013, 0.0055, t)];
  }

  // ---------- lofts on the centreline ----------
  const RING = 8;
  const SUPER = 0.6; // superellipse exponent < 1 squares the section
  const ringXY = [];
  for (let j = 0; j < RING; j++) {
    const th = ((j + 0.5) / RING) * Math.PI * 2, cx = Math.cos(th), cy = Math.sin(th);
    ringXY.push([Math.sign(cx) * Math.abs(cx) ** SUPER, Math.sign(cy) * Math.abs(cy) ** SUPER]);
  }
  const lofts = [];
  // A closed loft from s0 to s1 in n segments, section grown by `grow` metres. Fixed topology, filled by fillLoft.
  function loft(s0, s1, n, grow, base, shade, o = {}) {
    const g = new THREE.BufferGeometry();
    const nv = (n + 1) * RING + 2;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    const idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < RING; j++) {
      const a = i * RING + j, b = i * RING + ((j + 1) % RING), e = a + RING, f = b + RING;
      idx.push(a, b, e, b, f, e);
    }
    const c0 = (n + 1) * RING, c1 = c0 + 1;
    for (let j = 0; j < RING; j++) {
      const j2 = (j + 1) % RING;
      idx.push(c0, j2, j, c1, n * RING + j, n * RING + j2);
    }
    g.setIndex(idx);
    const L0 = { g, s0, s1, n, grow, flipped: false };
    fillLoft(L0);
    // winding from geometry: signed volume of the closed solid must be positive
    const p = g.attributes.position.array;
    let vol = 0;
    for (let k = 0; k < idx.length; k += 3) {
      const [a, b, e] = [idx[k] * 3, idx[k + 1] * 3, idx[k + 2] * 3];
      vol += p[a] * (p[b + 1] * p[e + 2] - p[b + 2] * p[e + 1]) - p[a + 1] * (p[b] * p[e + 2] - p[b + 2] * p[e]) + p[a + 2] * (p[b] * p[e + 1] - p[b + 1] * p[e]);
    }
    if (vol < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); }
    finish0(g);
    const mesh = kit.toon(g, base, shade, o);
    lofts.push(L0);
    return mesh;
  }
  function fillLoft({ g, s0, s1, n, grow }) {
    const p = g.attributes.position;
    const put = (v, x, y, z) => p.setXYZ(v, x, y, z);
    for (let i = 0; i <= n; i++) {
      const s = lerp(s0, s1, i / n), f = at(s), [w, d] = section(s);
      const ny = -f.tz, nz = f.ty; // in-plane normal (toward +Z on the upper limb)
      for (let j = 0; j < RING; j++) {
        const [u, v] = ringXY[j];
        put(i * RING + j, u * (w + grow), f.y + ny * v * (d + grow), f.z + nz * v * (d + grow));
      }
    }
    // end points: just past each end ring along the tangent, so the cap is a shallow cone, never a flat hole
    const a = at(s0), b = at(s1), [, d0] = section(s0), [, d1] = section(s1);
    put((n + 1) * RING, 0, a.y - a.ty * (d0 + grow) * 0.6, a.z - a.tz * (d0 + grow) * 0.6);
    put((n + 1) * RING + 1, 0, b.y + b.ty * (d1 + grow) * 0.6, b.z + b.tz * (d1 + grow) * 0.6);
    p.needsUpdate = true;
  }
  function finish0(g) {
    g.computeVertexNormals();
    if (g.attributes.hullNormal) g.deleteAttribute("hullNormal");
    kit.hullNormals(g);
    g.computeBoundingSphere();
    g.computeBoundingBox();
  }

  shape(0);
  const body = new THREE.Group(); // centres the braced bow's bbox on z = 0 and lifts the tip cap onto y = 0
  body.name = "body";
  body.position.set(0, 0.004, -0.064);
  root.add(body);
  const bow = new THREE.Group();
  bow.name = "bow";
  body.add(bow);
  const black = finish === "black";
  const stv = black ? [c.lacquer, c.lacquerShade] : [c.stave, c.staveShade];
  const band = black ? [c.stave, c.staveShade] : [c.lacquer, c.lacquerShade];
  const add = (m, name) => ((m.name = name), bow.add(m), m);
  add(loft(0.004, L - 0.004, 46, 0, ...stv, { threshold: 0.1, px: 3 }), "stave");
  add(loft(LL - GRIP_HALF, LL + GRIP_HALF, 6, 0.0025, c.grip, c.gripShade, { threshold: 0.1, px: 3 }), "grip");
  add(loft(LL + GRIP_HALF, LL + GRIP_HALF + 0.018, 1, 0.0035, ...band, { threshold: 0.1, px: 3 }), "gripBandTop");
  add(loft(LL - GRIP_HALF - 0.018, LL - GRIP_HALF, 1, 0.0035, ...band, { threshold: 0.1, px: 3 }), "gripBandLow");
  add(loft(L - 0.15, L - 0.002, 6, 0.0018, ...band, { threshold: 0.1, px: 3 }), "tipTop");
  add(loft(0.002, 0.11, 5, 0.0018, ...band, { threshold: 0.1, px: 3 }), "tipLow");
  add(loft(L - 0.5, L - 0.48, 1, 0.0018, ...band, { threshold: 0.1, px: 3 }), "bandTop");
  add(loft(0.3, 0.32, 1, 0.0018, ...band, { threshold: 0.1, px: 3 }), "bandLow");

  // ---------- string ----------
  const S_TOP = L - 0.06, S_LOW = 0.045; // the nocks (hazu), just inside the tips
  const SR = 0.0028, SN = 5; // string radius (thickened), sides
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array((3 * SN + 2) * 3), 3));
  {
    const idx = [];
    for (let i = 0; i < 2; i++) for (let j = 0; j < SN; j++) {
      const a = i * SN + j, b = i * SN + ((j + 1) % SN), e = a + SN, f = b + SN;
      idx.push(a, e, b, b, e, f);
    }
    for (let j = 0; j < SN; j++) { const j2 = (j + 1) % SN; idx.push(3 * SN, j, j2, 3 * SN + 1, 2 * SN + j2, 2 * SN + j); }
    sg.setIndex(idx);
  }
  add(kit.toon(sg, c.string, c.stringShade, { threshold: -0.2, px: 2 }), "string");
  const nockPt = new THREE.Vector3();
  function nockEnd(s) {
    const f = at(s), [, d] = section(s);
    return new THREE.Vector3(0, f.y + f.tz * (d + SR), f.z - f.ty * (d + SR)); // on the belly face (-Z side upper limb)
  }
  function fillString(P) {
    const p = sg.attributes.position;
    for (let i = 0; i < 3; i++) {
      // mitred ring: in the plane bisecting the two segments at the middle point
      const t = new THREE.Vector3().subVectors(P[Math.min(2, i + 1)], P[Math.max(0, i - 1)]).normalize();
      const nrm = new THREE.Vector3(0, -t.z, t.y);
      const scale = i === 1 ? 1 / Math.max(0.3, new THREE.Vector3().subVectors(P[2], P[1]).normalize().dot(t)) : 1;
      for (let j = 0; j < SN; j++) {
        const th = (j / SN) * Math.PI * 2;
        p.setXYZ(i * SN + j, Math.cos(th) * SR, P[i].y + nrm.y * Math.sin(th) * SR * scale, P[i].z + nrm.z * Math.sin(th) * SR * scale);
      }
    }
    const t0 = new THREE.Vector3().subVectors(P[1], P[0]).normalize(), t2 = new THREE.Vector3().subVectors(P[2], P[1]).normalize();
    p.setXYZ(3 * SN, P[0].x - t0.x * SR, P[0].y - t0.y * SR, P[0].z - t0.z * SR);
    p.setXYZ(3 * SN + 1, P[2].x + t2.x * SR, P[2].y + t2.y * SR, P[2].z + t2.z * SR);
    p.needsUpdate = true;
    finish0(sg);
  }
  {
    // winding check once on a straight string (y up): flip if the volume is negative
    fillString([nockEnd(S_LOW), nockEnd(S_LOW).lerp(nockEnd(S_TOP), 0.5), nockEnd(S_TOP)]);
    const pp = sg.attributes.position.array, idx = Array.from(sg.index.array);
    let vol = 0;
    for (let k = 0; k < idx.length; k += 3) {
      const [a, b, e] = [idx[k] * 3, idx[k + 1] * 3, idx[k + 2] * 3];
      vol += pp[a] * (pp[b + 1] * pp[e + 2] - pp[b + 2] * pp[e + 1]) - pp[a + 1] * (pp[b] * pp[e + 2] - pp[b + 2] * pp[e]) + pp[a + 2] * (pp[b] * pp[e + 1] - pp[b + 1] * pp[e]);
    }
    if (vol < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; sg.setIndex(idx); }
  }
  const BRACE = nockEnd(S_TOP).distanceTo(nockEnd(S_LOW)); // string length, kept in every draw

  // ---------- joints ----------
  const grip = new THREE.Group();
  grip.name = "grip";
  grip.position.set(0, G[0], G[1]);
  body.add(grip);
  joints.grip = grip;
  const nock = new THREE.Group();
  nock.name = "nock";
  body.add(nock);
  joints.nock = nock;

  // ---------- ya (arrow) ----------
  const ARROW_Y = G[0] + GRIP_HALF + 0.012, ARROW_LEN = 1.0, AR = 0.0055;
  const ya = new THREE.Group();
  ya.name = "ya";
  if (arrow) {
    nock.add(ya);
    ya.position.x = -(0.015 + 0.0025 + AR + 0.001);
    // built along local +Z from the nock (z = 0) to the tip (z = ARROW_LEN)
    const shaft = new THREE.CylinderGeometry(AR, AR, ARROW_LEN - 0.03, 6, 1);
    shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, (ARROW_LEN - 0.03) / 2);
    const sm = kit.toon(shaft, c.stave, c.staveShade, { threshold: 0.1, px: 2 });
    sm.name = "shaft"; ya.add(sm);
    const head = new THREE.ConeGeometry(AR * 1.3, 0.045, 6);
    head.rotateX(Math.PI / 2); head.translate(0, 0, ARROW_LEN - 0.03 + 0.0225);
    const hm = kit.toon(head, c.lacquer, c.lacquerShade, { px: 2 });
    hm.name = "head"; ya.add(hm);
    const nk = new THREE.CylinderGeometry(AR * 1.15, AR * 1.15, 0.03, 6, 1);
    nk.rotateX(Math.PI / 2); nk.translate(0, 0, 0.015);
    const nm = kit.toon(nk, c.lacquer, c.lacquerShade, { px: 2 });
    nm.name = "hazu"; ya.add(nm);
    for (let k = 0; k < 3; k++) {
      // a feather: a thin slab, low at the ends, 18 mm tall, 0.15 m long, 0.04 m from the nock
      const f = new THREE.BoxGeometry(0.0025, 0.016, 0.15);
      const fp = f.attributes.position;
      for (let v = 0; v < fp.count; v++) {
        const z = fp.getZ(v), y = fp.getY(v);
        if (y > 0) fp.setY(v, y * (z < 0 ? 1.2 : 0.55)); // taller toward the nock end, swept at the front
      }
      f.translate(0, AR + 0.008, 0.04 + 0.075);
      f.rotateZ((k * 120 + 90) * DEG);
      const fm = kit.toon(f, c.feather, c.featherShade, { threshold: 0.1, px: 2 });
      fm.name = `feather${k}`; ya.add(fm);
    }
  }

  // ---------- draw ----------
  const Z_DRAWN = G[1] - 0.88; // full draw: the nock 0.88 m behind the grip front
  function draw(a) {
    a = Math.min(1, Math.max(0, a));
    shape(0);
    const top0 = nockEnd(S_TOP), low0 = nockEnd(S_LOW);
    const zRest = lerp(low0.z, top0.z, (ARROW_Y - low0.y) / (top0.y - low0.y));
    const zN = lerp(zRest, Z_DRAWN, a);
    let k = 0;
    if (a > 0) {
      // bisection: more bend brings the nocks closer, shortening the string path through the nock point
      let lo = 0, hi = 4;
      for (let it = 0; it < 32; it++) {
        k = (lo + hi) / 2;
        shape(k);
        const N = new THREE.Vector3(0, ARROW_Y, zN);
        const len = nockEnd(S_TOP).distanceTo(N) + N.distanceTo(nockEnd(S_LOW));
        if (len > BRACE) lo = k; else hi = k;
      }
    }
    shape(k);
    for (const l of lofts) { fillLoft(l); finish0(l.g); }
    const top = nockEnd(S_TOP), low = nockEnd(S_LOW);
    nockPt.set(0, ARROW_Y, zN);
    fillString([low, nockPt.clone(), top]);
    nock.position.copy(nockPt);
    // the arrow flies level along +Z; it rides parallel to the bow on its -X side (the archer's right), clear of
    // the grip wrap, so a nocked arrow at rest doesn't swing 8 deg off the bow plane.
    root.updateMatrixWorld(true);
  }

  const POSES = { rest: 0, drawn: 1 };
  function pose(name) {
    if (!(name in POSES)) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
    draw(POSES[name]);
  }
  pose("rest");
  return { root, joints, pose, draw };
}

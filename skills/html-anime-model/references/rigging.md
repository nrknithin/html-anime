# Rigging and poses

No skinning API, no animation system. A rig is a tree of `Group` pivots at the real joints, rigid parts hung on them, and `pose(name)` setting rotations from literal tables. The two exceptions (a CPU-skinned spine loft, a rebuilt membrane) are in geometry.md and run at the end of `pose()`.

## Pivots

Author joints and geometry in world rest coordinates, read straight off the reference; each mesh is translated by minus its joint's world pivot (horse, ox, knight).

```js
const joints = {}, pivots = {};
// A pivot at a WORLD rest position; Group.position is relative to the parent's pivot.
function joint(name, parent, x, y, z) {
  const g = new THREE.Group();
  g.name = name; // --hide, --only, --focus and the probe find parts by name
  const pp = pivots[parent.name] ?? [0, 0, 0];
  g.position.set(x - pp[0], y - pp[1], z - pp[2]);
  g.userData.rest = g.position.clone();
  parent.add(g);
  joints[name] = g;
  pivots[name] = [x, y, z];
  return g;
}
// Geometry written in world rest coordinates, hung on joint j.
function part(j, geo, base, shade, opts) {
  const p = pivots[j.name];
  geo.translate(-p[0], -p[1], -p[2]);
  const m = kit.toon(geo, base, shade, opts);
  j.add(m);
  return m;
}
```

- Put the pivot where the part's visible root is. The horse's neck pivoted mid-base and lifted a step above the withers in every gallop; at the withers base the crest root stays put and the hidden throat end swings into the chest (horse T15).
- Pick body pivots for the motion: the ox body pivots at hip level so pitching it keeps the rear planted. Wheels hang from the root, not the body, so the body rolls over them (ae86).
- Rotate the joint whose segment is mostly outside the body. A buried mass (upper arm, thigh) rotated more than ~30 deg pulls out of the barrel as a blob: rear with the elbow, not the shoulder (horse T14).
- Pivot height is a lever. A low neck pivot drops the crest far; a pivot low in the neck gives a long reach. Compute the chain with 2D rotations before shooting (ox T28).
- After splitting a chain, re-check every child's parent: the ox's poll stayed on neckBase and got 55 of 100 deg (ox T16).
- Parent armour and gear to the joint it rides: pauldrons on the shoulder joint, not the chest, or the raised arm pierces them (knight T15). A pleated skirt on its own joint (rx -8 in a run) keeps the front thigh inside the hem (heroine T11).
- Never parent rotated limbs to a non-uniformly scaled node: S x R x S^-1 shears. Make them sibling joints and compute their positions (frog T10).
- Name every group you may want to isolate. `--only elbowR` and `--hide sword` only reach named objects.

## Joints without seams: taper-through

Rigid segments overlap at each joint. Done carelessly, every joint draws a cuff, a sock, a doll ring.

1. The knob (knee, fetlock, hock, elbow) belongs to the upper segment.
2. The lower segment starts inside the knob at <= 80 % of its girth, hidden.
3. After the knob, the upper segment tapers below the lower segment's girth while inside it, so no down-facing dome shows (ox T9-T11).
4. Hidden ends taper to a point inside the neighbour; never leave a flat cap outside it (horse T6). Knee balls as separate parts draw `|||` rings: delete them and bury the segment ends (heroine T2).
5. Visible joints overlap with near-hemispherical caps (`dome` 0.8-0.9), so a bend shows a knuckle, not a gap (horse T6, dragon T1).

Whatever a moving part hides at rest becomes silhouette in the pose. The ox's drink bow exposed the body's front end as a wall; the neck was split into two overlapping lofts on a two-joint chain, each running ~0.12 m into the other ~5 % thinner, and the hidden root rows were raised so that after the bow they become the crest that meets the withers (ox T14-T17, T32). Design hidden overlap rows for the bent pose, and check each kink by rotating the offending ring's top point by hand.

## Sign conventions

Write the convention for each chain at the top of the pose tables and check it once with `--joints`. three.js Euler `XYZ` is `Rx * Ry * Rz`: the vector is turned by rz first, in the joint's own frame.

| chain points | +rx | -rx | +rz |
|---|---|---|---|
| down (-Y), a hanging limb | swings it back (-Z) | forward | toward +X |
| forward/up (+Z), a neck | lowers the far end | lifts it | |
| back (-Z), a tail | lifts it | lowers it | |

`Rx(+t)` maps `(0, -1, 0)` to `(0, -cos t, -sin t)`. The horse's tail vanished into the body because -rx swings a hanging part forward (horse T13); the dragon's roar tail went underground with the neck's sign (dragon T6).

For a part that must point along a known oblique direction, build a basis instead of guessing Euler triples: a large rz applied first sent a spike's "up" to -X (dragon T14).

```js
// flat part whose local +Y should point along `up` and local +Z along `fwd` (side = up x fwd):
const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, fwd));
```

## Pose tables

```js
const DEG = Math.PI / 180;
// Degrees [rx, ry, rz], absolute. Hanging limb (-Y): +rx swings it back, +rz toward +X.
// A key without L/R sets both sides (the right side is mirrored, so one row is symmetric).
const REST = { body: [0, 0, 0], hip: [0, 0, 4], knee: [0, 0, 0], ankle: [0, 0, -4] };
const POSES = {
  rest: {},
  // legs 0.38 + 0.42: drop = 0.38 cos(-30) + 0.42 cos(-5) = 0.747 m, so the body sinks 0.053; ankle = -(hip + knee)
  crouch: { hip: [-30, 0, 4], knee: [25, 0, 0], ankle: [5, 0, -4], pos: { body: [0, -0.053, 0] } },
};
function pose(name) {
  const rows = POSES[name];
  if (!rows) throw new Error(`unknown pose "${name}" (${Object.keys(POSES).join(", ")})`);
  const { pos = {}, ...rot } = rows;
  for (const j of Object.values(joints)) { j.rotation.set(0, 0, 0); j.position.copy(j.userData.rest); }
  for (const [k, [rx, ry, rz]] of Object.entries({ ...REST, ...rot }))
    for (const j of joints[k] ? [joints[k]] : [joints[k + "L"], joints[k + "R"]]) j?.rotation.set(rx * DEG, ry * DEG, rz * DEG);
  for (const [k, [x, y, z]] of Object.entries(pos)) joints[k].position.add(new THREE.Vector3(x, y, z));
  root.updateMatrixWorld(true);
  // then: skinNow(), membrane updates, anything rebuilt from joint positions
}
```

- Absolute, literal, REST underneath, so poses never depend on call order (the lab applies `rest` first, then the pose you asked for).
- A pose may move a joint (`pos`, a per-pose `LIFT`) for crouches, and may scale a joint for cartoon reach: the frog's pointing arm scales its shoulder joint `(1.15, 1.6, 1.15)` (frog T14).
- Continuous controls go next to `pose`: `return { root, joints, pose, puff }`. `puff(a)` sets the whole inflation state and can be called after `pose()` for in-between drawings; `pose(name)` resets everything and applies its own amount (frog). The film can then tween an amount on its own clock.

## Mirrored sides

```js
// Build both sides with the LEFT (+X) numbers; the right side is a mirror. three flips the winding for a negative
// determinant, and the kit's normal and hull matrices stay correct (dragon T13).
for (const [k, sx] of [["L", 1], ["R", -1]]) {
  const side = new THREE.Group();
  side.name = "side" + k;
  side.scale.x = sx;
  joints.body.add(side);
  pivots[side.name] = pivots.body;
  const hip = joint("hip" + k, side, 0.23, 0.98, -0.15);
  // ... knee, ankle, parts, all at +X coordinates
}
```

The body pivot must sit on x = 0 for the mirror to land in place. A mirrored pose row is symmetric; give L and R their own rows when the pose is not (a gallop, a walk, a guard).

## Planted feet and hands

- **Flat hand or foot:** the angles down the chain sum to the target. A hand flat forward on the ground: shoulder + elbow + wrist = -90 (frog: 30 - 62 - 58). Make the last joint cancel the rest; never bake an absolute angle into the child mesh (frog T2).
- **A prop straight down** from a chain of X rotations: prop angle = 90 + the sum of the parent X angles (the knight's planted sword: shoulder -20, elbow -35, sword 145). Keep rz out of that chain or it skews sideways (knight T5).
- **Two-segment leg drop:** `drop = L1 cos(h) + L2 cos(h + k)`, `ankle = -(h + k)`; lower the pelvis by `L1 + L2 - drop` (knight T11). For longer chains, `drop = sum(len_i x cos(world angle_i))` from the hip height (frog T18).
- Hip ry and rz lift or sink a sole by 2-11 mm; re-solve with the probe and add a per-pose lift (knight T17).
- **Ground every pose numerically.** `npm run probe -- --model models/<name>.js --poses all` prints the lowest y and the contacts (meshes within 5 mm of y = 0) per pose. Hoof caps 8 mm under the ground and a gallop 2 cm under were found this way (horse T17).
- Gaits are asymmetric: a gallop frame has different L and R rows, copied from which hooves touch the ground in the reference frame (horse T13).

## Folds: plane first

A folded wing that hangs like a sail or flares like a cape has a bad fold plane, and no amount of in-plane rotation fixes it. Choose the plane first (hugging the body's flank: the dragon's drapes 0.25 m outward per metre down over the barrel chest), then the bone directions inside it, and give the in-plane joints rotations about local Y only (dragon T9). Shoot `--joints` before changing numbers: the dots showed the fold was right and only the drape was off (dragon T2).

Solve the Eulers offline (a scratch node script with the probe's three, see lab.md) and paste literals:

```js
// Local Euler (degrees, XYZ) that points a bone's +X along `dir` with its fold axis (+Y) along `axis`,
// given the parent's world quaternion. Joints have no rest rotation, so this is the joint's rotation.
function solveJoint(THREE, parentQuat, dir, axis) {
  const X = dir.clone().normalize();
  const Y = axis.clone().addScaledVector(X, -axis.dot(X)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  const world = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const e = new THREE.Euler().setFromQuaternion(parentQuat.clone().invert().multiply(world), "XYZ");
  return [e.x, e.y, e.z].map((r) => Math.round(r / (Math.PI / 180)));
}
```

- Raised wings belong over the trunk (root to hip) in the side view; judge them in `left`, the hero view hides a wing swept forward over the neck (dragon T11).
- Flap extremes follow the real stroke: up = back and up, down = forward and down. That also keeps both extremes readable from a low front three-quarter camera; a 40-58 deg sweep left them edge-on (dragon T12, T18).

## Props and hands

- **Sword:** its own joint in the fist, built along local +Y. The iconic planted sword needs the guard across the body: twist about the blade axis (rz on the sword joint), not the wrist (knight T6). An overhead wind-up reads from the front only if the blade clears the head silhouette: aim it up-back ~30 deg above horizontal (knight T18).
- **Shield:** strap it across the forearm on a fixed mount, shield-up = forearm +Z, face = forearm +X (`makeBasis`), so it stays upright whenever the forearm is level (rest carry at elbow -95, guard with the forearm across the chest). A shield whose up-axis runs along the forearm turns sideways the moment the arm comes up (knight T9).
- Anything on the shield arm that sticks outward crosses the shield in some pose: check every pose for prop-vs-armour piercing, not just rest (knight T21).
- **Open hand:** fingers on knuckle groups fanned ~0.13 rad apart, thumb splayed (rx -0.6), hand x1.15; a 7 cm palm reads as a fist at full-body scale (heroine T11, T12).
- **Pointing or closed hand:** scale the finger-fan group's x to 0.4 and the fingers collapse into one bundle (frog T14).
- **Vehicles:** steer pivot (y) -> spin pivot (x) -> wheel parts. A pop-up lamp is a box hinged at its rear-top edge, rotated -86 deg about x, no translation (ae86 T10). Drift = body roll ~4 deg about z at a pivot ~0.4 m up, toward the outside of the turn, plus counter-steer.

## Pose for the camera

- Keep trunk yaw small and let arms and legs carry the stance: a correct fencing yaw of -20 turned the knight into a profile in the hero thumbnail (knight T16, T17).
- The hero camera (7 deg below, front-left) foreshortens a forward point into an up-pointing blob; check `left` too and pick the pose that reads in the film's camera (frog T14).
- Shoot the shield or wing obliquely: a shield square to the hero camera hides the torso; turning it out-back (shoulder ry +25) shows both (knight T16).
- Use `--montage rest,a,b,c --views left` to see every pose at one scale; stride, lift and growth are measurable between cells.

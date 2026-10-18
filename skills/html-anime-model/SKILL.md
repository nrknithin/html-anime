---
name: html-anime-model
description: Build procedural three.js models for html-anime films (characters, creatures, vehicles, armour, props) in the two-tone cel look with an ink hull, measured against reference photos in the model lab. Use when a film needs a solid subject that turns, poses or takes a dolly, or when creating or fixing anything in models/.
---

# Model

A model is code: rings, tubes and pivots, two tones and an ink hull, posed from literal tables. It is built against a measured reference photo in the lab, one shot at a time, until it reads as the subject at thumbnail size. Seven case studies (horse, ox, frog, dragon, knight, heroine, AE86) took 17-32 logged trials each. This skill is what they learned; a wolf built from it alone took 6 (`models/wolf.js`, references/subjects/quadrupeds.md).

## Model or paint

Model it when the subject changes angle in the shot, takes a dolly, or poses in depth. If it always faces the lens, paint it flat in SVG (`skills/html-anime-cel/SKILL.md`). Start from `models/` when a model there is close: re-pose or re-colour it before building a new one. The 3D layer itself (canvas, shader, drawing on `hf-seek`) is `skills/html-anime-3d/SKILL.md`.

## The contract

```js
// models/<name>.js: no imports, no Math.random, Date, performance.now, requestAnimationFrame or Clock.
export const meta = {
  name: "wolf",
  height: 0.85,                                    // m, top of the rest pose (within 2 %)
  script: "noon",                                  // one script from harness/compile.js SCRIPTS
  colors: { coat: "#5c3d32", coatShade: "#241c16" }, // role -> hex, every hex from that script
  poses: ["rest", "run"],
};
export function build(THREE, kit, colors = meta.colors) {
  const root = new THREE.Group();
  const joints = {};
  // ... geometry and pivots: metres, +Y up, faces +Z, its left is +X, stands on y = 0, centred on x = 0, z = 0
  function pose(name) { /* absolute rotations from literal tables, REST underneath */ root.updateMatrixWorld(true); }
  pose("rest");
  return { root, joints, pose };
}
```

Only the kit makes materials: `kit.toon(geometry, base, shade, { threshold, outline: false, px, ink })` is a mesh with its hull, `kit.cel(base, shade, { threshold })` a bare material, `kit.outline(mesh)`, `kit.hullNormals(geometry)`, `kit.rgb(hex)`, `kit.LIGHT`, `kit.resolution`. Plain `Mesh` only: no `SkinnedMesh`, `InstancedMesh` or morph targets. `harness/lab/README.md` is the lab manual.

Open every model with a header comment, as `models/*.js` do: the construction strategy and why, the proportions with their base unit, and the two-tone pairs by material (base / shade, from the film's script; the scripts are `SCRIPTS` in `harness/compile.js`). Keep shots and trial notes outside the repo.

## The loop

Shoot, look at every PNG, change one thing, shoot again. Write each trial down as Saw / Fix / Lesson.

0. **References.** One true side view (camera parallel, all limbs visible), a front, a three-quarter, a pose frame, published specs. Measure ratios to one base unit, write a landmark table in model metres, and rank five identity cues: they decide what must survive the thumbnail. `references/references.md`, then the family file in `references/subjects/`.
1. **Blockout against the photo.** Proportions and silhouette before any detail, judged by the red model outline over the full-opacity photo:
   `node harness/lab/shoot.mjs --model models/<name>.js --views left --mode sil --ref <photo> --ref-view left --ref-flip --ref-mode edge --ref-crop x,y,w,h --size 1200x900 --out <png>`
   `--ref-flip` only when the photo faces image-right (or shoot `right` without it). The crop must cover exactly what the bbox covers, and the lab scales the photo by crop height = bbox height: author with `m/px = model height / crop height px`, not a body landmark (references.md). Done when every landmark sits within ~5 % of the height.
2. **Clay for form.** `--mode clay --views three4,front,top,back`. Shelves, slabs, flat caps, intersections show here, never in sil.
3. **Cel for the look.** `--mode cel` default views, then one big view. Outlines closed, no specks, two tones landing on forms. Inverted winding only shows here.
4. **Thumbnail.** `--views hero --size 480x300`. It must read as the subject at a glance.
5. **Rig.** Pivots at the real joints, checked with `--joints --joint-names`; close-ups with `--focus <joint>`, `--only <joint>`. `references/rigging.md`.
6. **Poses.** `npm run probe -- --model models/<name>.js --poses all` for the lowest y and ground contacts, then `--pose <p> --views hero,left --joints` and `--montage rest,<p1>,<p2> --views left`.
7. **Finals.** `models/renders/<name>.png` (cel, default views, 1600x1000) and `<name>-<pose>.png` per pose; one `--ref-mode beside` per reference, and an honest list of what still differs.

Batch a trial's shots (`--batch shots.json`, ~0.3 s a shot). `references/lab.md` has the recipes, scratch probes and traps.

## Budgets

- **Shots:** blockout and edge fits 3-6 trials, clay 2-3, cel and detail 4-8, poses 4-8, finals 2-3. Past budget, change the method (world-coordinate rails, plane-locked rings, a skinned loft), not the tenth number.
- **Triangles:** 7-15k for a hero subject (frog 7.1k, AE86 7.9k, dragon and knight 10.7k, horse and ox 12.7-12.9k, heroine 14.3k). Small parts 5-8 segments. Read `tris=` on every shot; the probe lists the heaviest meshes.
- **Lines:** the case studies run 300-580 lines. A film inlines the model, and hyperframes warns past 300 structural lines: budget a film copy (see below).

## The quality bar

- Recognized instantly at 480x300 in the hero view, in rest and every pose.
- Landmarks within ~5 % of the reference in the edge overlay (finals reached 1-3 %).
- Ink closed everywhere; no holes, specks, cuff rings or stray seams; no lab warnings.
- Identity details at least ~1/15 of the figure's height, or they vanish.
- Every hex from the one script; the shade of every part lighter than ink and distinct from the base of what it overlaps.
- Feet, hooves, wheels on y = 0 in every pose (probe `minY`, contacts).

## Non-negotiables

Every one of these cost a case study at least one trial.

1. **Winding from geometry.** Pick it from the signed volume or rail handedness, never by hand. A part all ink, or ink with a light rim, is inside-out. Check cel right after writing any custom geometry (horse T7, ox T7, frog T4).
2. **Close every end.** An open end with a radius is a black hole in cel (dragon T13). Hidden ends taper to a point inside the neighbour (horse T6).
3. **Author in the reference's coordinates.** World metres read off the side photo, two rails per part, so a misfit maps to one number (horse T3). Lock ring planes to the view axis; rings perpendicular to a sloped spine shear the profile (ox T2).
4. **Taper-through joints.** The knob belongs to the upper segment; the lower starts inside it at <= 80 %; no separate joint balls (ox T9-T11, heroine T2).
5. **Pivots at the visible root.** The neck pivots at the withers, armour rides the joint it covers, nothing rotated hangs off a scaled node (horse T15, knight T15, frog T10).
6. **Write each chain's sign convention** above the pose tables and check it once with `--joints`. On a hanging limb +rx swings it back (horse T13, dragon T6).
7. **Solve, don't guess.** Chain sums for planted hands and props, drop formulas for feet, offline Eulers for folds; ground every pose with the probe (frog T2, knight T5, T11, dragon T9).
8. **Respect the light.** A face square to the camera is shade at 0.35; the -X side is shade. Use per-material thresholds and normals, shoot three-quarter from the lit side; never move the light (heroine T2, knight T11).
9. **The hull draws silhouettes only.** Creases, camera-facing plate edges and panel lines need ink bands, inked tubes or dark material groups (knight T13, ae86 T6).
10. **Thicken thin parts ~12 %** and keep layered surfaces >= 5 mm apart (ox T12, knight T19).
11. **Hair and cloth hug the parent.** Caps on the parent's rails or surface, edges as warped grid rows, strand roots buried (horse T11, heroine T7, T12).
12. **Fit the bare body first.** Props skew the bbox the reference aligns to (knight T1).
13. **Pose for the camera.** Small trunk yaw, blades clear of the head, wings over the trunk, flaps along the real stroke (knight T17, T18, dragon T11, T18).
14. **Verify by measuring.** `--info`, the probe, a raycast pick, sampled pixels. A downscaled crop lies (heroine T8).
15. **Original designs only.** References are for study; no logos, badges or lettering; never rebuild an existing character.

## Into a film

1. Paste `makeKit` from `harness/lab/kit.js` (no imports) into the film's module script, then each model whole inside its own scope with the `export`s stripped, so helper names never collide: `const OX = (() => { /* models/ox.js */ return { meta, build }; })();`.
2. `const kit = makeKit(THREE, { ink: "<sheet ink>" }); kit.resolution.set(W, H);` (the sheet's frame size) then `const ox = OX.build(THREE, kit, colors);`. Map every colour role to the film sheet's hexes through `colors` when the sheet's script differs from the model's.
3. Put `ox.root` in a placement group and scale that uniformly to the story (models are real size: the frog is 0.09 m, the ox 1.75 m). Squash and stretch go on the group too.
4. From `draw(t)`, call `ox.pose(name)` for the shot's held drawing, continuous controls (the frog's `puff(a)`) after it, and only when that key changes. `pose` is absolute, so seeking works.
5. The light is world space: the lit flank faces world +X. Keep the camera in the subject's +X/+Z quadrant (front-left three-quarter at rest) and turn the subject, not the light.
6. Budget the copy: drop poses the film doesn't use, comments and spare segments. Then lint and validate as `skills/html-anime-3d/SKILL.md` says.

## Reference map

| file | read it when |
|---|---|
| `references/references.md` | finding, vetting and measuring photos and specs; licensing; proportion tables per class |
| `references/geometry.md` | writing geometry: closed ring skins, superellipse and two-rail lofts, tubes, skinned spines, material groups, seam bands, shells, membranes, decals, hair, morphs, flat panels, triangle budgets |
| `references/cel-and-ink.md` | tones, thresholds, normals, what the hull can't draw, z-fighting, the symptom -> cause table |
| `references/rigging.md` | pivots, taper-through, sign conventions, pose tables, mirrors, planted feet, folds, props, posing for the camera |
| `references/lab.md` | exact shot recipes per stage, batches, close-ups, the probe, scratch pick scripts, shot budgets, traps |
| `references/subjects/quadrupeds.md` | horse, ox; wolves, deer, cattle, big cats |
| `references/subjects/creatures.md` | frog, dragon; lizards, serpents, wyverns, inflating or transforming creatures |
| `references/subjects/humanoids.md` | anime heroine (face, eyes, hair, uniform), knight (armour over a body, props in hands); samurai |
| `references/subjects/vehicles.md` | AE86; motorcycles, carts, mechs |

# Creatures: frog and dragon

`models/frog.js` (common frog at real scale, 0.09 m long, 7.1k tris, poses rest, crouch, leap, point, puff-1/2/3, plus `puff(0..1)`) and `models/dragon.js` (four-legged Western dragon with bat wings, 5.5 m long, 10.7k tris, poses rest, wings-up, wings-down, roar). Lizards, snakes, sea serpents, wyverns and small cartoon animals borrow from both.

## Frog

**Proportions** (SVL = 0.09 m): head 0.37 SVL; eye 0.09 across at the skull line, 0.18 behind the snout, half protruding so the front view shows two bumps; back peaks at the hips (0.65 SVL behind the snout); folded Z hind legs (thigh 0.34, shank 0.44, foot 0.6-0.7); short forelegs with long fingers. Identity: bulging eyes high on a flat head, wide mouth sweeping up behind the eye, no neck, sloped body, Z-folded hind legs.

**Construction.**
- One lofted skin for head and trunk: 36 rings of 24 points from 14 hand-placed stations read off the side photo (Catmull-Rom), superellipse exponent 2.4. Rings have no seam duplicates.
- Pale belly and throat: a second loft over the bottom arc, outline-free: the colour change is the line, offset 0.3-0.8 mm along the normal.
- Mouth line and dorsolateral folds: thin tubes on the skin. Mask, tympanum, nostrils, blush and 8 dorsal blotches: flattened-sphere decals seated at `(u, theta)` and aligned to the normal (~100 tris each, frog T12).
- Eyes: a skin socket sphere around a sclera globe; iris, pupil and glint are flattened discs facing out-and-forward `(0.55 side, 0.22, 0.8)`, about 35 deg off +Z, so they read from the front and the side (frog T6).
- Limbs: tapered lathe capsules in pivots; a webbed foot = extruded fan + 5 toes; hand = 4 splayed fingers on a `hand` joint.

**Rig and poses.** root -> body -> belly (skin, strip, tubes: rewritten, never scaled). Eyes, shoulders, hips and decals are siblings of `belly`, seated on the live skin. Flat hands: shoulder + elbow + wrist = -90. Rest hind chain hip -63, knee 146, ankle -171. Point = shoulder scaled (1.15, 1.6, 1.15) for reach and the finger fan closed by scaling `handL` x to 0.4 (frog T14).

**Inflation (puff).** A second ring table (a sphere R 0.065 sitting on the ground) lerped by ring index with the rest table, plus the exponent 2.4 -> 2.0. Skin vertices rewritten in place; `hullNormal` deleted and recomputed; tubes regenerated; every rider has a rest anchor and its own balloon anchor (eyes higher and further apart, outside the skin, scale 1.5); limb angles lerped toward a full-puff table solved so the feet stay on the ground. Puff-3 is a true sphere ~2.7x the rest height (frog T16-T18).

| trial | saw | fix |
|---|---|---|
| T1 | 11.3k tris (budget 8k): 10 toes + 8 fingers | 6-point profiles, 5-8 segments on small parts |
| T2 | decals 2x too big; fingers vertical | sphere decals scale by semi-axes, not diameters; last joint cancels the chain sum |
| T4 | body nearly black in cel, fine in clay | inverted hand-written loft winding |
| T7-T8 | eyes perched on top of the head; palms below ground | eye centre at the skull line, ~38 % down the head; probe the chain for below-ground parts |
| T10 | eye pivot buried 1 cm when the belly was scaled | surface anchors with explicit depth; never parent to the scaled node |
| T13 | non-uniform scale kept a pear; face decals stretched to tall ovals | ring-table morph; decal growth ~sqrt(scale) |
| T14 | hero camera turned the forward point into an up-pointing blob | check left; pick the pose that reads in the film camera |
| T17 | eyes left at the rest anchor looked sunken on the ball | the balloon anchor is designed, not carried through |
| T18 | feet 24 mm under ground after the morph; z-fighting rings in the belly strip | solve drop = sum(len x cos(angle)) per puff; offset the strip with the puff amount |

Remaining: no skin texture beyond blotches; the back peak sits ~8 % forward; webbing nearly invisible (light-on-light); the face is all shade from straight front (shoot three-quarter); an anime eye (round pupil) by choice, not the gold horizontal frog eye.

## Dragon

**Proportions** (B = snout to hip = 2.3-2.5 m): head 0.27 B, S-curved neck 0.36 B, trunk 0.37-0.40 B, tail 1.3 B lying low with a lifted arrow tip, standing legs 0.35-0.39 B, wing bones from a bat (humerus 0.48, forearm 0.85, digits 0.72 / 1.38 / 1.25 / 1.10 m), span ~1.9 B (heraldic; a real bat would be 3.6 B). An upright S-neck is a deliberate departure from the crouching engraving: it reads "dragon" in silhouette. Identity: bat wing (arm + 4 finger spars + scalloped membrane), S-neck with a horned crested toothy head, four clawed legs, long arrow-tipped tail, spine row, saturated colour with a pale belly.

**Construction.**
- Neck + torso + tail: ONE loft, 16 seg, superellipse 2.2, rings every ~7.7 cm along a Catmull-Rom spine, CPU-skinned to tail5..tail0, body, neck0..neck3, head (../geometry.md). The single biggest quality win: no seams, one hull, a smooth two-tone split.
- Belly band = material group on the bottom ring arc (230-310 deg); every second ring from mid-tail to the throat gets a twin 2 cm behind it, and the band faces between the pair are a dark group: segmented belly plates for free (dragon T16).
- Head and jaw: profile-driven lofts ([z, yTop, yBottom, halfWidth] tables), superellipse 2.6 for an angular anime snout, mouth as a material group. Horns, brow, claws: tapered tubes. Spines and the tail spade: `ExtrudeGeometry` placed with a basis from the spine frame.
- Limbs: lofts with rounded caps (stations at 0.55r / 0.83r and 0.95r / 0); feet = palm ellipsoid + three toes with claws.
- Wings: humerus, forearm, thumb claw and four finger spars on joints; membranes are two-layer ruled panels rebuilt in `pose()` from joint positions (../geometry.md `sheet`). Right side under a `scale.x = -1` group: one pose row mirrors itself.
- Colour (noon): hide accent/iris (red), belly moon/sky, membrane skin/iris, bone iris/hair, horn sky/iris, teeth practical/sky, eye practical at -0.25.

**Rig and poses.** Bind pose = every rotation zero, wings spread along +X. REST folds them: humerus back along the flank, forearm up-forward so the wrist knuckle peaks above the back (a strong thumbnail cue), fingers back. Fold Eulers solved offline from a fold plane hugging the flank. Wing bones lie along +X; ry folds in the wing plane, rz lifts. Neck (+Z): -rx lifts; tail (-Z): +rx lifts. Wings-up sweeps back and up over the trunk; wings-down forward and down; roar raises the head, opens the jaw 38 deg, spreads a threat display.

| trial | saw | fix |
|---|---|---|
| T0 | build threw NaN in `getPoint` | one arc table only (own s -> t mapping) |
| T1 | pointed limb caps floated above the feet like stakes | hemispherical caps |
| T4 | needed a crop outside the image to scale by body length | pad the image (now `--ref-crop` beyond 0..1, `--ref-scale`) |
| T6 | membrane shade = body red, so a wing seen from below merged with the body; roar tail underground | membrane shade iris; per-chain sign convention |
| T7 | front legs read as stilts | elbow back 0.16 m, forearm forward, bigger feet, legs splayed 4-5 deg with the wrist compensating so the feet stay flat |
| T8 | an "egg" on the flank | it was the wing-root bump, not the humerus: delete it |
| T9 | folded wings flared like a cape (bbox x 1.10 m) | fold plane chosen first, draping over the barrel (bbox x 0.86 m) |
| T11 | spread wings sat over the neck in side view | sweep back over the trunk; judge in `left` |
| T12, T18 | swept wings edge-on to the hero camera | follow the real stroke: up = back and up, down = forward and down |
| T13 | black holes in the brow tubes | cap every end with radius > 0 |
| T14 | jaw frill spikes pointing inward (Euler with a large rz first) | build a basis; deleted the frills (cheek horns already carry the read) |
| T14 | eyes bulged past the head silhouette from the front | smaller eye, tucked 6 mm into the head |

Remaining: the haunch is lighter than the engraving's; legs read as jointed capsules at elbow and knee in clay (cel hides most of it); the near wing goes edge-on in some three-quarter poses; heraldic wings are larger relative to the body than these.

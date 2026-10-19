# Quadrupeds: horse and ox

`models/horse.js` (chestnut, 2.33 m to the ear tips, 12.7k tris, poses rest, gallop-a, gallop-b, rear) and `models/ox.js` (dark bull, 1.75 m to the horn tips, 12.9k tris, poses rest, walk-a, walk-b, drink, stomp). Wolves, deer, dogs, big cats and cattle follow the same recipe; measure their own numbers (../references.md has the table layout).

## Proportions

H = withers height (horse 1.55 m, bull 1.50 m). Full tables in ../references.md. What decides the read:

- **Horse:** square body (length ~1.0-1.13 H), deep chest to a tucked flank (depth 0.44 H), elbow at half the height (0.55 H), long arched neck rising ~40 deg, wedge head 0.36 H at ~47-49 deg, ear tips ~1.5 H, croup = withers.
- **Ox:** front-heavy: withers highest, topline sloping down ~0.09 H to the tail head, short thick neck, dewlap keel to the brisket (chest depth 0.6 H), short legs (elbow ~0.4 H), big head carried low (-38 deg), lyre horns from the poll corners.

Identity cues to protect at thumbnail size, in order. Horse: arched neck and mane; wedge head with pricked ears; deep chest and tucked flank; withers and rounded croup with a high tail; slender legs with knobbly knees, hocks and fetlocks, small hooves; knees bending forward, hocks back. Ox: horns (the #1 bull signal); front-heavy mass with dewlap; big low head with a broad dark muzzle and ears sideways under the horns; cloven hooves; a tufted tail to fetlock height.

## Construction

| part | horse | ox |
|---|---|---|
| barrel | rail loft: top rail vs belly rail along z, 13 stations, 24 seg, n 2.3 | loft with rings at constant z, separate upper and lower half-widths (keel), smooth blend below the equator |
| neck | rail loft crest vs throat, pivot at the withers base | two lofts on a two-joint chain (neckBase low in the chest, neckMid low in the neck), overlapping ~0.12 m |
| head | world-space rail loft forehead vs jaw: a triangle poll / muzzle / throatlatch with a nearly level jaw line | loft along the straight head axis (perpendicular rings are fine on a straight axis), forehead half-width 0.152, muzzle flare 0.098 |
| mane / hair | cap loft on the neck's dense rails, width 1.12x, sawtooth lower rail, steps 1 | - |
| horns, tail | tail: two jointed rail lofts with a counter-bend | tapered tubes along Catmull-Rom curves; tuft = teardrop loft |
| legs | rail loft per segment (front rail vs back rail), near-hemispherical overlapping caps, hidden upper ends tapered inside the barrel | `limb()` lofts at constant y with 2-ring domes, taper-through joints, lower legs x1.12 girth |
| feet | hoof = short loft with a flat sole (dome 0.01) | two claws per foot: wedge lofts (toe wall 0.085, heel 0.05) 6 mm apart, plus dewclaws |
| face | ears = flattened cones; eye + glint spheres on the side; nostril; cheek plate 1 cm proud draws the jowl | leaf ears (outer leaf + skin-coloured inner); lidded eyes with a brow, 0.03 m, bulging past the face outline; dark muzzle ellipsoid whose hull draws the muzzle line; poll ridge mostly buried |
| markings | blaze and socks as unlined decals within 3 mm | - |

Colour: horse chestnut coat accent/iris, hair and hooves hair/ink, markings practical/sky (noon). Ox coat iris/hair, horn practical/sky, hoof and muzzle hair/ink. Bay (iris/hair) failed the thumbnail (horse T12).

## Rig

Horse: body -> neck (withers base) -> head; tail -> tailTip; per side shoulder -> elbow -> knee -> fetlockF and hip -> stifle -> hock -> fetlockH. Ox: body (pivot at hip level) -> neckBase -> neckMid -> poll; tailRoot -> tailMid; the same leg chains. +rx swings a hanging limb back; the front knee flexes with +rx, the hock with -rx (horse header).

## Poses

- **Gallop:** copy a Muybridge frame per pose and give L and R their own rows: frame 3 (gathered, all four hooves under the belly) and frame 7 (extension, one fore planted angled back, one hind planted). Lift the body (`pos`) and ground it with the probe (horse T13, T16, T17).
- **Rear:** body -45 deg about the hip, hocks flexed under it, forelegs folded at the elbow (shoulder only -22) (horse T14).
- **Walk:** diagonal pairs: one fore swinging forward with the knee folded 55, the opposite hind planted forward, the other two behind with the trailing heel lifting (ox).
- **Drink:** neckBase 40, neckMid 70, poll -64: one convex crest from withers to poll, muzzle at the ground. Compute the chain with 2D rotations first (ox T28).
- **Stomp:** forearm near horizontal (shoulder -38, elbow -55), cannon hanging (knee 112), sole facing down: "about to come down" (ox T24).

## Failures and fixes

| trial | saw | fix |
|---|---|---|
| horse T1-T2, ox T1, T22 | opacity overlay ambiguous; crop included a far hoof | red edge overlay (now `--ref-mode edge`); crop x-range = model z-range |
| horse T3 | head 10 cm forward, jaw 12 cm high: built in a tilted local frame | rails in world side-view coordinates |
| ox T2 | neck underside 0.19 m forward: perpendicular rings on a 27 deg spine | rings locked to constant z (body, neck) and constant y (legs) |
| ox T3 | tail root bump above the rump | sink the tube by its radius |
| horse T6 | cap shelves at upper arm and thigh; a disc between the forelegs | hidden ends taper to a point inside the barrel |
| ox T4 | shoulder and thigh lofts read as slabs | lateral extent < body half-width minus 1 cm at rest; continuous half-width blend |
| horse T7, ox T7 | dark dots at loft ends; horns dark with pale rims | winding from geometry (rail handedness / signed volume); tube winding vs Frenet order |
| horse T9, ox T9-T11 | ink rings at stifle, hock, knee, fetlock ("stacked boots") | knob on the upper segment, lower starts at <= 80 % inside, upper tapers below it (taper-through) |
| horse T10-T11 | rigid mane cards buried or spiked; alternating cap depths gave square teeth | cap loft on the neck rails with a sawtooth rail |
| ox T6, T12 | horns thin with a white tip blob; legs spindly under the ink | thicker horns; lower legs x1.12 |
| ox T14-T17 | drink exposed the body front as a wall; a single rigid neck read "charging" | two-joint neck, overlapping lofts, hidden body front sloped |
| ox T26-T32 | crest kinks after the bow | low pivot dropped the crest: neckBase 40 + long-lever neckMid 70; hidden root rows raised so they become the crest when bent |
| horse T13 | tail vanished into the body | +rx swings a hanging part back |
| horse T15 | step above the withers in gallops | neck pivot at the withers base |
| horse T17 | hoof caps 8 mm under ground | flat sole (dome 0.01); `--info`/probe min y per pose |
| ox T19-T20 | horse-like narrow head from the front; poll ridge read as a beret | broader forehead and muzzle, horn bases apart; ridge sunk |
| ox T6-T7 | pink inner ears facing the camera read as cheeks (a pig); dot eyes | leaf ears with the inner leaf set back; lidded eyes with a brow |
| ox T25-T26 | top view stepped where a 0.22 m neck top met a 0.28 m body front | widen the neck root to the body (a thick bull neck) |

## Wolf: the skill's validation build

`models/wolf.js` was built from this skill alone, as a test of it: 6 trials, 6.8k tris, poses rest, run-a, run-b, howl (indigo: coat moon/sky, saddle sky/sky).

- **Proportions:** H 0.75 m; ear tips 1.16 H, elbow 0.49 H, chest depth ~0.52 H, trunk 1.3 H shoulder point to buttock, head 0.33 H, tail hanging to 0.3 H. Long legs on a deep, narrow chest; belly tucked up toward the loin.
- **What made it read as a wolf:** not the proportions (trial 2 matched the photo within ~3 % and still read "fat white dog") but the coat pattern: a dark saddle over neck, back and tail tip plus a dark facial mask down the bridge, both as material groups on the lofts, with slanted almond eyes under a dark lid. The saddle's shade cannot be `hair` in indigo: it is as dark as ink; use one flat tone (sky/sky).
- **Ruff:** two thin flat cheek tubes per side scribbled; one flattened cone per cheek is safe but pale on pale it barely shows — the toothed mask edge does the ruff's job.
- **Poses:** run-a as a sighthound's gathered frame (fores back, hinds forward, legs crossing under the belly; carpus <= 45 or the paws flip into stubs), run-b extension with one hind planted (probe contacts 1). Howl: neck -28, head -52; at neck -45 the neck's hidden root and the head's back dome showed (the ox's lesson again). Ground each pose in one step: `pos.y = pos.y - minY + clearance`.

## Remaining weaknesses to watch

The barrel is a smooth tube: no rib, flank or point-of-hip landmarks. Tails are planks with no strand break-up. The mane is symmetric; a real mane falls to one side. Thin seams remain at stifle and hock in extreme poses (taper-through softens, it does not remove). The -X side of a dark coat is a near-black silhouette under the film light: shoot from the subject's left or front-left. The ox's horns are one symmetric lyre; the reference sweeps forward-up.

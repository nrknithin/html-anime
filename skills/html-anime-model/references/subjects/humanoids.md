# Humanoids: anime heroine and armoured knight

`models/heroine.js` (original schoolgirl in a sailor uniform, 1.56 m, 6.2 heads, 14.3k tris, poses rest, wave, run) and `models/knight.js` (Gothic plate, sallet and bevor, arming sword and heater shield, 1.80 m, 7.5 heads, 10.7k tris, poses rest, guard, strike). A samurai is the knight's method (armour over a body, a prop in the hands) with the heroine's face if the face shows.

## Body and proportions

- **Anime teen:** H 1.56, head 0.25 m (hair top to chin). Landmarks (y, m): eye 1.395, chin 1.31, shoulders 1.22, waist 0.96, skirt hem 0.665, knee 0.45, sock top 0.40. Anchor the body to a teen model sheet (Mirai, ~5-6 heads) and use the chibi mascot only for face ratios (heroine T1).
- **Armoured adult:** H 1.80, h 0.24 (helmet apex to bevor bottom). Shoulder line 1.51, pauldron span 0.58, breastplate 0.36 wide x 0.31 deep, waist and fauld 1.04, crotch 0.86, knee 0.52, ankle 0.10, sabaton 0.44 long. The armour widens the shoulders and elbows; torso and legs stay close to a slim human.
- Pauldron span = shoulder-joint spacing + cop radius + tilt x height; 18 deg of tilt added ~2 cm a side (knight T4).

## Face (when it shows)

The far eye in three-quarter is make-or-break.

- Head = a `SphereGeometry(1, 32, 24)` deformed per vertex: superellipse (n 2.6-3.2) on the front half in xz for a flat, wide face plane; jaw narrows toward the chin, chin drops and juts a little; nape tucks. Average seam normals by position (heroine T3, T13).
- Normal transfer toward a sphere centred behind the mouth, face threshold -0.25 (../cel-and-ink.md). Without it the carved jaw goes all shade at any threshold (heroine T5, T6).
- Face features are decals conformed by raycast along -Z (../geometry.md), lifted 0.6-1 mm per layer: sclera (level 2), iris, lower iris light, pupil, a dark lash-shadow crescent over the iris top (the anime iris gradient in two flat tones), two highlights on the light side (+X) in BOTH eyes (not mirrored), upper lash on top, lower lash tick, brows, nose tick, mouth. `curveSegments` 5 pays for the extra subdivision (heroine T19).
- Eyes big and low: centre 0.34 h above the chin, ~0.045 x 0.04 m scaled 1.24, spaced +-0.04. Eye size and spacing dominate far-eye visibility once the face is a superellipse; flattening past n 3 barely helps (heroine T13).
- Brows: soft arch, inner end raised, or they frown (heroine T4). No blush strokes on a 10-hex script (heroine T10). Ears small, flattened, tucked under the hairline.
- Neck: short, threshold 0.25 so its front takes a chin shadow; flare the base so the lower neck is lit (heroine T4, T22).

## Hair

- Skull cap: an (az, el) grid whose rows run from a hairline curve to the crown (../geometry.md `hairCap`); the hairline drops behind the ears. Offset ~1.5 cm off the skull so the head does not read narrow (heroine T2, T7).
- Bangs, side locks and the ponytail: tapered elliptical tubes along Catmull-Rom curves with the width across the outward direction, roots buried 6-8 mm inside the cap; each strand's own hull draws the strand lines.
- Side locks behind the cheek plane (z at the head centre, not forward of it) and overlapping the cheek outline from the front, so no background shows between lock and cheek and no lock crosses the far eye (heroine T3, T8).
- Black hair: base = the script's darkest blue (`sky #1b2d6b`), shade = hair black, threshold 0.62: the crown's light-facing top reads as a navy sheen (heroine T10).
- A hair tie is one fat torus around the tail root; spheres read as a ball, a torus bow as a donut (heroine T3, T12).

## Clothes

- Torso: a loft of elliptical rings on two joints (spine, chest), 28 segments.
- Collar and stripes: column strips over angle `a` around the analytic torso surface, from an outer-edge curve to the neckline, offset along the numeric normal; duplicate columns at the flap corners give vertical edges. Flat-reading details only within ~40 deg of the view normal: a back flap wrapped 2.28 rad turned its stripes edge-on; 2.25 rad and 6 mm stripes read (heroine T16-T18).
- Pleated skirt: sawtooth lathe, flat normals, inner shell; on its own joint. Hem narrower and higher than first guessed (0.665, rx 0.2 / rz 0.165): measured on the uncropped sheet (heroine T14).
- Blouse hem over the skirt to the hip (heroine T7). Neckerchief: a flattened knot and two tube tails offset 1.2 cm off the blouse; a standing-off knot reads as a lollipop in profile (heroine T14).
- Loafers: a loft along the foot, rotated so loft-Y is +Z, with the sole clamped flat at y 0.003.

## Armour over a body

- One superellipse ring loft for every rounded plate (../geometry.md `loftY`): cuirass globose in front, flatter at the back, medial ridge, pinched waist (chest w .19 at 1.34, waist .142 at 1.08); sallet with a drop tail over three rings (exponent 1.5: a broad flare, not a spike); greaves with a calf swell; sabatons as three shingles; the heater shield as a wide flat section `p 6` with `bend` (knight T5).
- Cups (pauldrons, couters, poleyns, fans) are thick closed shells; pauldrons are bell-shaped cops flaring to the rim (knight T5).
- Lames are overlapping shingles, each lower one a little wider; the visible seams that face the camera get outline-free seam bands from the plate's edge ring (knight T13-T14).
- The visor slit is a dark outline-free band just proud of the helmet front; the face is never visible.
- Dark "under" tone (mail, doublet) at the elbow and knee gaps; keep layered plates >= 5 mm apart (the belt z-fought the fauld at 0.5 mm, knight T19).
- Steel threshold 0.45 with smooth normals; the 4-segment diamond blade flat-shaded at 0.3; the shield field and heraldry at 0.05 so the red survives facing the camera (knight T8, T10, T11).
- A plume swept back and drooping (per-ring z offsets, tilted -78 deg) keeps the height within `meta.height` (knight T9).
- Identity details >= 1/15 of the figure height: the couter spike went 0.07 -> 0.12 m (knight T20). Spike on the sword arm only (knight T21).

## Props in hands

- Fit the bare body first: a `GEAR` constant (false = no sword or shield) and a symmetric-arm scratch copy, because props skew the bbox centre the reference aligns to (knight T1, T2). With the new lab, `--hide sword` does the same for named parts.
- Sword on its own joint in the fist, built along local +Y; rest: shoulder -20, elbow -35, sword 145 (= 90 + 55) points it straight down, rz 90 turns the guard across the body (knight T5, T6).
- Shield strapped across the forearm on a fixed mount (`makeBasis`: shield-up = forearm +Z, face = forearm +X); rest carry elbow -95 keeps it level and upright; guard lays the forearm across the chest with shoulder ry -80 and elbow ry +60 (knight T9, T12).
- A bent shield face eats clearance at the fist: bend 2.0 -> 1.2 and mount offset 0.075 -> 0.09 cleared the gauntlet (knight T9).

## Rig and poses

Heroine: pelvis -> spine -> chest -> neck -> head; skirt on pelvis; shoulder -> elbow -> wrist (hand group x1.15, four knuckle groups + thumb); hip -> knee -> ankle. Knight: the same trunk, plus a sword joint in the right wrist and the shield mount under the left elbow. Hanging limb: -rx swings it forward, +rz toward +X.

- Run: forward lean, opposite arm and leg, back shin kicked up (knee 85), skirt joint rx -8; no thigh poke-through at 42 deg hip flexion (heroine T11).
- Wave: shoulder rz -112, elbow -48, wrist ry -90, open fanned hand (heroine T12).
- Guard and strike: legs solved so both soles stay on y = 0 (drop formula, ankle = -(hip + knee)) with a per-pose pelvis lift; hips splay ry +-10 for the pointed sabatons; trunk yaw only -6 / -12 so the hero camera still sees the chest; strike's blade rises up-back above the helmet (knight T11, T16-T18).

## Remaining weaknesses to watch

Heroine: the far eye is 40-50 % visible in three-quarter (a drawn 3/4 shows it fully, compressed); rest hands are small dark mittens (palm faces the thigh = shade side); legs are straight lofts with no calf curve; the neck still reads a little long from the front; the back and right views are legitimately dark under the film light. Knight: no fluting, rivets or pierced borders; gauntlets are mittens; pauldrons ride the upper arm, so overhead they sit beside the helmet like balls; sabatons splay 10 deg vs ~20 in the photo.

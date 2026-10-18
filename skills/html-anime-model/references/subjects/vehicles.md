# Vehicles: AE86

`models/ae86.js`: a 1980s three-door liftback with pop-up headlamps, 4.21 x 1.335 m, 7.9k tris, poses rest, steer-left, drift, lights-up. Motorcycles, carts, ships and mechs share the method: published specs first, flat-shaded panels, inked creases added on purpose, wheels as their own pivots.

## Proportions

Trust published specs over pixels: L 4.20 (4.185-4.215), W 1.625, H 1.335, wheelbase 2.40 (axles z +1.12 / -1.28), track 1.34, tyre diameter ~0.58, overhangs 0.98 front / 0.82 rear, clearance 0.15. Photo landmarks as fractions of length: beltline (glass lower edge) ~0.86-0.90 m, cowl 0.90 at z 0.74, roof flat 1.335 for ~0.65 m, hatch glass ~21 deg, hood nose 0.64-0.69.

Identity cues: wedge nose with closed pop-ups (dark lens band under the leading edge), long flat roof, steeply raked hatch glass, panda paint (white upper, black band low), small wheels filling squared arches, tail-lamp panel. Read them off the three-quarter photo before choosing which parts are black (ae86 T12).

## Construction

- **Tub:** ~70 cross-sections along z, each a 7-point half-ring (top centre, top edge, shoulder, split line, rocker, bottom centre) mirrored, as a triangle soup oriented away from an inside point and flat-shaded (../geometry.md). Wheel arches are cut by raising each section's bottom edge along a squircle (exponent 2.6) around the axle, so the tub stays one closed shell; a dark half-disc liner fills each arch so you never see through it.
- **Two strips:** white upper body above the split line, black lower body below it. Keep lit walls vertical down to ~85 % of the rocker, bevel only the underside (ae86 T11).
- **Cabin:** a 4-section prism (belt, roof front, roof rear, hatch foot), sides leaning 12 deg inward. Elements on the leaning cabin lean with it (ae86 T7).
- **Glass:** planar polygons 4 mm proud, glass iris/hair, plus one or two pale streak parallelograms 6 mm proud; the body-colour borders read as pillars (ae86 T4).
- **Arch flares:** body-colour tubes (r 16 mm) along each squircle opening with their own hull, because the hull never draws a crease cut into the tub (ae86 T6).
- **Bumpers:** bevelled extruded slabs, white top + black chin spoiler; an all-black bumper slab read as a toy (ae86 T12). Slab height 0.17: taller hid the nose (ae86 T4).
- **Pop-ups:** a body-colour cover on a box hinged at its rear-top edge, lens on the underside; the dark recess under each pod sits 2.5 mm below the hood plane (ae86 T7, T10).
- **Lamps:** tail lamps and amber corners (accent: no amber on the noon script) at glow threshold -0.7 so they keep their base facing away from the light (ae86 T8). Blank plates are inked toon slabs; a flat plate in the shade tone vanished (ae86 T13).
- **Wheels:** lathe tyre (rotated to the X axis), dark face disc, a thin iris sidewall ring so the tyre separates from the black lower body, a pale rim lip, 5 box spokes, hub. Mirrors: small boxes (0.075 x 0.08 x 0.12); 0.1 m boxes read as junk (ae86 T4).
- **No badges, no lettering, no logos** (rule).

## Rig and poses

`body` (pivot y 0.4, for roll and pitch) holds the shell, cabin, glass, bumpers and pods (`podL`, `podR`). Wheels hang from the root: `steerFL/FR/RL/RR` (y rotation) -> `spinXX` (x rotation) -> tyre and rim. Steer-left: front steer ry 25. Drift: body roll ~4 deg about z toward the outside of the turn, nose dipped 1.2, counter-steer -18. Lights-up: pods rx -86.

## Failures and fixes

| trial | saw | fix |
|---|---|---|
| T1 | black sil on a dark photo at 0.5 opacity unreadable | (then) cel at 0.45; (now) `--ref-mode edge` |
| T2, T12 | black lower body merged with black tyres and the hull | iris sidewall ring; white bumper tops; black is a band |
| T3 | glass bottom 0.12 m above the photo belt | measure the beltline in photo px x (height / roof px) first |
| T5 | flat roof too long, cowl too far back | `--ref-mode beside`, landmarks as fractions of length; yaw-skewed wheelbase ignored for the spec |
| T6 | arches showed no line | inked tubes along the arch |
| T7 | brown recess boxes poked through the pods; door seams floated as antennae | hide parts >= 2.5-4 mm below, re-check after reshaping; lean seams with the cabin |
| T8 | tail lamps brown from behind | glow threshold -0.7 |
| T9 | faint stray line from a 14 mm hood crown | crown removed (flat-shaded two-tone shows tiny ridges as seams) |
| T11 | the lit rocker wall went black after a bevel | vertical lit wall, bevel the underside only |

## Remaining weaknesses to watch

All glass and cabin panels are planar: the greenhouse reads slightly "folded paper"; no pillars, frames, wipers or interior. No grille slats or real pod cavities; fenders don't rise above the hood. Mirrors are plain boxes. The whole -X side is the shade tone under the film light, so the right view is flat. Photo-derived overhangs disagree with the spec; the spec won.

For a motorcycle: wheelbase as the base unit; tyres as lathes on steer and spin pivots; the frame as tapered tubes (../geometry.md `tube`) with hulls; tank and fairings as flat-shaded or superellipse lofts; the rider is a humanoid (humanoids.md) parented to the bike with planted feet and hands solved by chain sums.

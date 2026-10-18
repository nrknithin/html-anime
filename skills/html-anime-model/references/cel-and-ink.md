# Cel and ink on a model

The kit draws two tones and an ink hull: `dot(normal, LIGHT) > threshold ? base : shade`, plus a BackSide copy pushed 5 px out in clip space. Nothing else. Every lesson below follows from those two lines and the fixed light.

## The light

`kit.LIGHT` is `(0.62, 0.72, 0.3)` normalized = `(0.622, 0.723, 0.301)`. It lives in world space: up, toward +X, a little toward +Z.

| surface normal | dot | at threshold 0.35 |
|---|---|---|
| +Y (tops) | 0.72 | lit |
| +X (model's left flank at rest) | 0.62 | lit |
| +X+Z diagonal (front-left) | 0.65 | lit |
| +Z (the front, square on) | 0.30 | **shade** |
| -Z (the back) | -0.30 | shade |
| -X (model's right flank) | -0.62 | shade |
| -Y (undersides) | -0.72 | shade |

Consequences every modeler hit:

- A face, cuirass, grille or shield turned square to the camera is one flat shade at 0.35 (frog T9, knight T7, heroine T2). That is the film light, not a bug. Fix it with a per-material threshold, normals, or the camera, never by moving the light.
- The right view (`-X`) is near-total shade on every model (horse T19, ox final, knight T16, ae86 final). The rest-pose -X side reads as a dark silhouette, worst on dark coats.
- Because the light is in world space, the lit flank is whichever side faces world +X. In a film, keep the camera in the +X/+Z quadrant of the subject (front-left three-quarter at rest) and turn the subject, not the camera, to choose which flank shows.
- Vertical walls are lit at 0.35 from about 34 deg behind +X to about 85 deg toward the front. A +X wall can tilt down about 19 deg before it flips (0.35); a +Z wall tilted up 5 deg goes lit (0.36). Bevels on a lit wall flip it to shade fast: keep lit walls vertical and put bevels on undersides (ae86 T11).
- Undersides are what a low hero camera sees. Check a wing, a chin, a belly from `hero` (dragon T6).

## Thresholds by material

| material | threshold | why | source |
|---|---|---|---|
| solids (coat, cloth, hide, body panels) | 0.35 | kit default; one hard terminator | html-anime-3d, all models |
| skin (limbs, hands) | -0.2 | camera-facing skin must read lit; shade only on the far side | heroine T2 |
| face | -0.25 with normal transfer | lit face plane, shade wraps the far cheek and under the jaw | heroine T6 |
| neck | 0.25 | its front goes shade: a free chin shadow | heroine T22 |
| black hair over a navy base | 0.62 | mostly shade; base shows only on the light-facing crown as sheen | heroine T10 |
| polished steel | 0.45 | more shade = metal bands; smooth normals | knight T8 |
| flat 4-segment blade | 0.3 | one bevel lit, one dark | knight T10 |
| heraldry, identity colour on a forward face | 0.05 | the shield stays red when it faces the camera | knight T11 |
| glowing practical (lamp, eye) on sides/top | -0.25 | a thin shade rim only | html-anime-3d, dragon eye |
| glowing practical facing away (-Z tail lamps) | -0.7 | a back face is -0.30, below -0.25 | ae86 T8 |

Single-tone parts (decals, ink bands, pupils) use the same hex for base and shade, so the threshold does not matter.

## Choosing the two tones

- The shade must stay lighter than the ink and any hair colour. A bay horse with shade `#241c16` next to ink `#2c261f` merged neck, legs, belly and mane into one mass at thumbnail size; chestnut (accent/iris) kept three values (horse T12).
- Pick each part's shade so it differs from the base of every part it overlaps in the main views. The dragon's membrane shade was the body's red base, so a wing seen from below vanished into the body; iris fixed it (dragon T6).
- Never use ink or hair tones for big surfaces next to tyres or hair: the AE86's black lower body merged with black tyres and the hull. Separate them with a contrasting thin ring (an iris sidewall torus) and keep black a band, not half the car (ae86 T2, T12).
- Two near-identical darks on adjacent parts (navy hair, navy collar) merge in three-quarter; push one with the threshold (heroine T9).
- A 10-hex script has no soft blush. Thin saturated strokes on a curved cheek read as cuts once foreshortened: skip them (heroine T10).
- A dark coat with two tones gets its volume from the underside shade for free; put detail in the silhouette, not inside it (ox T6).

## Normals do the lighting

**Smooth vs flat.** On 16-28 segment curved plate, flat normals give stair-stepped terminators; smooth normals plus a raised threshold read as polished metal (knight T8). Flat normals only for true facets: a 4-segment diamond blade, car panels, skirt pleats. In flat-shaded two-tone, a crown under ~3 deg draws a stray seam: make it real or remove it (ae86 T9).

**Normal transfer (faces).** A carved jaw points its normals down, and under an up-light the whole lower face goes shade at any threshold (heroine T5). Blend the face normals toward a sphere centred behind the mouth (not the eyes), weighted by depth across the face front:

```js
// After computeVertexNormals + seam averaging, before kit.toon. centre: behind the face at MOUTH height.
// z0: where the blend starts (face front minus a few cm); full weight `ramp` metres further forward.
function normalTransfer(g, centre, z0, ramp = 0.04) {
  const p = g.attributes.position, n = g.attributes.normal, q = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const w = Math.min(1, Math.max(0, (p.getZ(i) - z0) / ramp));
    if (w <= 0) continue;
    q.set(p.getX(i), p.getY(i), p.getZ(i)).sub(centre).normalize();
    m.set(n.getX(i), n.getY(i), n.getZ(i)).lerp(q, w).normalize();
    n.setXYZ(i, m.x, m.y, m.z);
  }
  return g;
}
// heroine: normalTransfer(headGeo, new THREE.Vector3(0, HEAD.cy - 0.06, HEAD.cz - 0.05), HEAD.cz, 0.04)
```

**Fake cast shadows with the normal.** Tilt normals up (flare a loft) where you want light and keep them horizontal where you want shade: the heroine's neck flares at the base so only the upper neck takes the chin shadow (heroine T4).

**Read the normals, don't guess thresholds.** When a region won't respond, find which mesh it is and what its normals are: a headless probe or pick (lab.md) found the "face wedge" was the jaw underside and the "neck shade" was the head's own underside (heroine T5, T8, T23). Verify colour claims by sampling pixels, not by eyeballing a downscaled crop: a 15 px band looked like half the face (heroine T8).

## What the hull can and cannot draw

The inverted hull inks silhouettes and back-facing rims. That is all.

- **It can't draw creases inside a mesh.** An arch cut into the AE86 tub showed no line (ae86 T6). A plate edge lying flat on another plate and facing the camera gets no line: the Gothic plackart's point vanished (knight T13). Lame lines from overlapping shingles are view-dependent: seen from above, lost from below.
  - Fix: an outline-free ink band built from the plate's own edge ring, grown 1-2.5 mm (knight seam bands, geometry.md); a thin tube with its own hull along the crease (ae86 arch flares); twin rings with a dark material group (dragon belly plates).
- **It draws wherever one silhouette overlaps another mesh.** Use it on purpose: a flattened sphere 1 cm proud of the jowl draws the horse's cheek curve for free (horse T9); a dark muzzle ellipsoid draws the ox's muzzle line. Avoid it where you don't want it: a child segment whose top is wider than the parent's end draws a cuff ring at every joint (horse T9, ox T9, heroine T2).
- **An add-on blob reads as anatomy only if most of its outline is buried.** The ox's poll ridge read as a beret until it was smaller and sunk 1.3 cm deeper (ox T20). The dragon's wing-root "shoulder bump" read as an egg and was deleted (dragon T8).
- **The ink eats about 10-12 % of a thin part's girth.** 5 px of hull on each side: model limbs, horns and tails ~12 % fatter than the photo (ox T12). A 0.1 m horn lost 10 px.
- **Identity details must be at least ~1/15 of the figure height** to survive a thumbnail. A 7 cm couter spike on a 1.8 m knight vanished at 1400 px; 12 cm read (knight T20).
- **Membranes and sheets** need thickness and rim hull normals (geometry.md `sheet`), or the hull has nothing to push.

## Layering and z-fighting

| case | rule | source |
|---|---|---|
| two concentric lofts at one height | keep >= 5 mm apart or tuck one fully inside; 0.5 mm apart z-fought orange/pale | knight T19 |
| a part that should hide under a surface | at least 4 mm below, re-checked whenever the surface slope changes | ae86 T7 |
| outline-free strip over a skin | offset along the normal; the frog's belly strip needed 0.3-0.8 mm as the body inflated | frog T18 |
| decals | 0.6-1 mm lift per layer; within 3 mm of the surface in total | heroine T19, horse T9 |
| stripes, emblems on a wrapped surface | keep within ~40 deg of the view normal you care about; a stripe on an edge-on flap projects to < 1 px | heroine T17 |
| curved props over a hand | a bent shield face pulled 5 cm back toward the fist; check clearance at the curve's edge | knight T9 |
| elements on a leaning surface | lean them too; vertical door-seam boxes on an 18 deg cabin floated as antennae | ae86 T7 |

## Symptom -> cause

| you see (cel) | cause | fix |
|---|---|---|
| a part all ink colour, or ink with a light rim | winding inside-out: the BackSide hull draws where the front should be | `solid()` signed-volume winding; check cel right after any custom geometry |
| a black hole or dark dot at a loft end | open end with radius > 0, or cap wound against the strip | close every end; wind caps to match the strip (`skin()`) |
| dark specks in a surface | holes or back faces showing the hull | find the open seam or flipped triangles; clay won't show it |
| ink rings / "socks" / doll joints at knees and fetlocks | child segment's domed top wider than the parent's end, or a separate joint ball | taper-through (rigging.md): the knob belongs to the upper segment, the lower starts inside at <= 80 % |
| a short shade band under a joint knob | the knob's domed underside faces down | taper the upper segment below the lower's girth inside it; it softens, not removes (ox T10, T11) |
| a shelf or disc poking out of a body | a hidden loft end with a flat cap outside its neighbour | taper hidden ends to a point inside the neighbour (horse T6) |
| a slab glued to a flank | a limb loft wider than the body at that height | lateral extent < body half-width minus 1 cm at rest; check clay top + front (ox T4) |
| a ledge line across a crown or hairband | an exposed strand root cap and its hull | bury roots 6-8 mm inside the cap (heroine T12) |
| staircase edge on hair, collar, stripe | grid cells masked off | warp the grid so the boundary row is the edge |
| horizontal ink line at a stifle or hock | the child's top wider than the parent's bottom | nest the child end inside the parent |
| speckled two-colour band | z-fighting between near-coplanar layers | >= 5 mm apart, or tuck inside |
| a big front surface one flat shade | +Z normal dot 0.30 < 0.35 | lower that material's threshold, tilt normals, or shoot three-quarter |
| a lit wall went black after a bevel | wall normal tipped below the 0.35 cone | keep lit walls vertical; bevel undersides |
| the whole lower face shaded at any threshold | carved jaw normals point down | normal transfer centred at mouth height |
| skin slivers inside the eye white | decal chords dip under the curved skin | subdivide that decal more (level 2) or lift more |
| decal floats outside the profile | lifted more than ~3 mm | lift less |
| background speckle in a limb gap | sub-pixel gaps between overlapping parts | widen the overlap; minor (ox final) |
| thin parts look spindly | the ink eats ~10 % of their girth | +12 % girth |
| crossing ink scribbles at a cheek ruff or tuft | thin flattened tubes overlapping in silhouette, each drawing its own hull | one solid tuft per side, e.g. a flattened cone (wolf T3) |
| an identity detail that never shows | same tone as the mass it sits on, and inside that mass's silhouette | give it the other tone, or push it past the silhouette (wolf T4) |
| a lid or brow line cutting across an eye | drawn at the eye's unrotated height after the eye was slanted | trace the rotated edge: `y' = y cos a - z sin a`, `z' = y sin a + z cos a` (wolf T4) |
| a toothed edge between two colours of one mesh | a centroid group test cutting across rings | on fur (saddle, mask) it reads as tufts: keep it; on plate or cloth align the test with a ring; adjacent parts share one rule (wolf T3) |

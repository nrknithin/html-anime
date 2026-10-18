---
name: html-anime-3d
description: Draw the solid things of a code-drawn anime in three.js as two-tone cels with an ink hull, drawn only on HyperFrames' hf-seek. Use when an html-anime sheet's medium is 3D cel, or a shot needs a solid that turns, rises, or takes a dolly.
---

# 3D

three.js draws the solid things. It does not draw the sky, the dip, or the line. It is still a cel: two flat tones and an ink line. Use it when the subject is a solid that changes angle in the shot: a lantern rising past roofs, rooftops the camera dollies over. If everything faces the lens, stay in SVG.

## Three layers

1. SVG paint, behind: sky, moon, far skyline, stars. `skills/html-anime-cel/SKILL.md` owns it. The sky gradient is still the only gradient.
2. One transparent `<canvas>`, one clip across the whole runtime: rooftops, tanks, antennas, the subject.
3. DOM on top: `#dip`, the last-8-frame fade to `ink`, the line, and effects that must cross the solids, like speed lines.

Each shot owns an SVG clip and a 3D set. `draw` shows only that shot's set. The camera changes under the dip.

## File

```html
<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js" } }</script>
<script type="module">
  import * as THREE from "three";
  window.THREE = THREE; // HyperFrames waits on THREE.DefaultLoadingManager
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.setClearColor(0x000000, 0);
  addEventListener("hf-seek", (e) => draw(e.detail.time));
  draw(window.__hfThreeTime || 0);
</script>
```

`draw(t)` is a pure function of `t`: pick the shot, place the camera, set the pose, render once. CSS stretches the canvas to the root. Build geometry in code. No loaders, textures, or models. The GSAP timeline stays in a classic script, built synchronously, as `skills/html-anime-render/SKILL.md` says.

## Two tones

Every surface is a base and a shade, both hexes from the color script. Write the pairs in a comment at the top of the module.

```glsl
// vertex
varying vec3 vN;
void main() {
  vN = transpose(inverse(mat3(modelMatrix))) * normal; // stays correct when a pose squashes
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
// fragment
uniform vec3 base, shade, light;
uniform float threshold;
varying vec3 vN;
void main() { gl_FragColor = vec4(dot(normalize(vN), light) > threshold ? base : shade, 1.0); }
```

- Use `ShaderMaterial`. Pass each hex as a raw sRGB `Vector3`: `0xf0c36a` is `(0xf0 / 255, 0xc3 / 255, 0x6a / 255)`. `THREE.Color` and the built-in materials go through linear color, lights, and tone mapping, and the pixel stops being the hex. With no `colorspace_fragment` or `tonemapping_fragment`, the framebuffer gets the sheet hex exactly.
- One light direction for the film, from the moon. It picks the side, never the brightness. Solids use a threshold of `0.35`. The glowing practical uses `-0.25`, so its shade is a thin rim.
- No scene lights, `MeshToonMaterial`, shadows, fog, or gradient maps. Nothing tinted.

## Ink

The outline is an inverted hull: the same geometry again, `side: THREE.BackSide`, in `ink`, pushed out a fixed number of pixels in clip space.

```glsl
attribute vec3 hullNormal;
uniform float px; // 5 at 1080
uniform vec2 res;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec2 d = (projectionMatrix * vec4(normalMatrix * hullNormal, 0.0)).xy * res;
  c.xy += d / max(length(d), 1e-4) * (2.0 * px / res) * c.w;
  gl_Position = c;
}
```

- Boxes and cylinder caps have split normals. A hull pushed along them cracks at every corner. Average the normals of vertices that share a position into `hullNormal`, or scale a lone box's hull uniformly.
- Push in pixels, not world units, so a far parapet and the near subject carry the same line.
- Interior lines (ribs, seams) are thin meshes with their own tone pair and no hull.

## Poses

Read "drawing" as "pose": a held set of transforms. Poses step. They do not ease.

```js
const frame = Math.floor(t * 24 + 1e-6);
const held = shot === SAKUGA ? frame : frame - (frame % 2);
let pose = POSES[shot][0];
for (const p of POSES[shot]) if (p[0] <= held) pose = p;
```

- A pose table is rows of `[start frame, offset, scale, tilt]`, written as literals. The budget is in `skills/html-anime-timing/SKILL.md`: 3 poses a shot, 8 in the sakuga shot.
- Squash and stretch are scale on the pose. Build the mesh up from `y = 0` so it pivots at its base.
- A smear is one frame of stretch along the travel, tilted into it, on ones. Speed lines are DOM, `tl.set` on those frames.

## Camera

The camera moves on ones, from continuous `t`. Only the establish moves. It is a dolly in: the subject grows about 6% in frame, `power1.inOut`.

```js
const power1InOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
from.lerp(subject, (1 - 1 / 1.06) * power1InOut(t / shotEnd));
```

- The sakuga and button shots are locked. No orbit, no handheld, no shake.
- Frame solids three-quarter on: a lit side, a shaded front, lit tops. A front faced square-on is one flat shade.
- The painted SVG does not dolly. The parallax is the point.

## Forbidden

`requestAnimationFrame`, `setAnimationLoop`, `THREE.Clock`, `AnimationMixer`, `Date`, `performance.now`, `Math.random`, async loaders, post-processing, any pixel ratio other than 1.

## Done

In the film directory, `npx hyperframes lint` and `npx hyperframes validate` pass. Lint warns over 300 lines, so keep the file under that.

Then `npx hyperframes snapshot --at` one time per shot plus a smear frame, and look at every still. Check for a blank canvas, cracked corners, and a subject off its third. Count the pixel colors of a still: everything is a sheet hex or the sky gradient, except antialiased edges. `grep -nE "requestAnimationFrame|setAnimationLoop|Date\.|performance\.now|Math\.random" index.html` returns nothing.

`films/lantern/index.html` shows the 3D layer: the two-tone shader, the ink outline, and drawing on hf-seek.

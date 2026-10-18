# Model lab

Build a procedural three.js model, shoot it from fixed views in three modes, look at the PNG, fix, repeat. Zero dependencies: Node 22+ and Chrome or Edge. three.js 0.186.1 comes from jsdelivr through a disk cache.

```
node harness/lab/shoot.mjs --model models/horse.js --views left,front,three4,top --mode cel --pose rest --out out.png
npm run lab -- --model models/horse.js --out out.png        # same thing
```

It prints one line, and warnings on stderr:

```
wrote out.png 1600x1000 880ms tris=10164 bbox=0.62x1.70x0.33m
[lab] warn: meta.height 2.5 m but the model's top at rest is 1.4 m
```

Look at every PNG you make. `--model` is a repo-relative path or any file path. A model outside the repo works too.

## Flags

| flag | meaning |
|---|---|
| `--model <path>` | the model module (required) |
| `--views <list>` | any of `front back left right top three4 hero`. Default `front,left,three4,top` |
| `--mode <m>` | `cel` (film look), `clay` (smooth gray, no ink), `sil` (black on white). Default `cel` |
| `--pose <name>` | a name from `meta.poses`. Default `rest` |
| `--out <file.png>` | output. Default is a unique name under the OS temp dir, so give one |
| `--size <WxH>` | window size, default `1600x1000`. Four views are four 800x500 cells; shoot one or two views for detail |
| `--ref <img>` `--ref-view <view>` `--ref-mode overlay\|beside` `--ref-opacity 0.5` `--ref-crop x,y,w,h` `--ref-flip` | reference photo, see below. `--ref-view` defaults to the first view |
| `--joints` / `--joint-names` | yellow dots at every joint pivot, with names |
| `--batch shots.json` | a JSON array of shots, one browser session (about 0.3 s a shot after the first) |
| `--info` | also print the page's `__labInfo` as one JSON line: exact bbox, mm per pixel, every cell and the model's projected box in pixels, the ref rect |
| `--lax` | contract violations warn instead of fail |
| `--swiftshader` | software GL. Default lets Chrome pick; if WebGL cannot start, one retry on software GL is automatic |
| `--cols n` `--mpp m/px` `--bg #hex` `--no-ref-box` `--timeout s` `--verbose` | layout columns, pin the ortho scale (compare shots at one scale), background, hide the crop box, page timeout (30 s), phase timings |
| `--serve [--port n]` | only serve; prints the lab URL to open in your own browser |

Batch items use the same keys in camelCase and sit on top of any flags: `[{"model":"models/horse.js","mode":"sil","views":"left","pose":"rest","out":"a.png"},{"model":"models/horse.js","mode":"cel","pose":"gallop-a","out":"b.png"}]`. Exit code is 1 if any shot failed; the others still run.

Safe to run many at once: every run has its own server port, Chrome profile and debugging port, and cleans up after itself. `CHROME_PATH` picks the browser (else Chrome, then Edge, on Windows, macOS, Linux).

## Views

1 unit = 1 meter, +Y up, the model faces +Z and its left is +X.

| view | camera | you see |
|---|---|---|
| `front` | +Z, orthographic | the face; the model's left on the image right |
| `back` | -Z | the back; the model's left on the image left |
| `left` | +X | the model's left side, face to the image left |
| `right` | -X | the right side, face to the image right |
| `top` | +Y | face to the top of the image, the model's left on the image left |
| `three4` | perspective, front-left, 20 degrees above | lit side, shaded front, lit top |
| `hero` | perspective, front-left, 7 degrees below | low three-quarter |

All orthographic cells share one meters-per-pixel scale (the footer prints it), so proportions compare across views. Each has a ground line, faint lines every 0.25 m (coarser or finer for big or small models), `0`/`1 m` labels, a scale bar, a dotted line at the model's x=0 / z=0, and its name. Perspective cells are fit to the silhouette. Backgrounds: white in `sil`, light gray in `clay`, mid gray in `cel`, so the ink reads on any script. The footer prints name, pose, mode, bbox (x y z), triangles, meshes and the scale, plus up to two warnings.

## Reference photos

`--ref photo.jpg --ref-view left --ref-crop 0.1,0.2,0.8,0.7` : `--ref-crop` is a box tightly around the subject, as fractions of the image (x, y, width, height). The crop is scaled uniformly so its height equals the model's projected bbox height in that cell; bottoms and horizontal centers are aligned. `overlay` draws it over the cell at `--ref-opacity`; `beside` puts it at the same scale in its own cell next to it. A dashed magenta box shows the placed crop, so you can see what to tighten. `--ref-flip` mirrors the image: a horse facing right in the photo fits the `right` view as is, or the `left` view flipped. Make the crop tight. The match is only as good as that box: the model's top and bottom land on the crop's top and bottom.

## The model contract

```js
// models/<name>.js  (no imports, no Math.random/Date/clock; procedural geometry only)
export const meta = {
  name: "horse",
  height: 1.65,            // meters, top of the model in the rest pose
  script: "noon",          // a color script from harness/compile.js SCRIPTS
  colors: { coat: "#5c3d32", coatShade: "#241c16" },   // role -> hex, all from that one script
  poses: ["rest", "gallop-a"],
};
export function build(THREE, kit, colors = meta.colors) {
  // 1 unit = 1 meter, +Y up, the model faces +Z, stands on y=0, centered on x=0, z=0
  return { root /* THREE.Group */, joints /* name -> Object3D pivots */, pose(name) /* sets joint rotations from literal tables */ };
}
```

Models only call the kit: `kit.toon(geometry, base, shade, opts)` is a Mesh with its ink hull; `kit.cel(base, shade, { threshold })` is just the material (use `-0.25` for glowing practicals) for meshes without ink, like interior lines; `kit.outline(mesh, { px, ink })` inks a mesh you made yourself; `kit.rgb(hex)`; `kit.hullNormals(geometry)`. `opts` also takes `{ outline: false }`. Because they only touch the kit, a model renders in `cel`, `clay` and `sil` unchanged. `sample.js` is a complete example: a jointed mannequin with capsules, balls, boxes, and two poses.

Rules the lab enforces:

- Errors (exit 1, message on stderr and on the page, `window.__labError`): `meta` or `build` missing or malformed; `meta.script` not in SCRIPTS; the source uses `Math.random`, `Date`, `performance.now`, `requestAnimationFrame`, `Clock`, or any `import` (comments are ignored; `--lax` makes this a warning); `build` or `pose` throws; no meshes.
- Warnings: a color that is not on the script; `meta.height` more than 2% (or 1 cm) off the top of the rest pose; the model does not stand on y=0; it is more than 15% off x=0 or z=0; the pose is not in `meta.poses`; no `rest` pose.
- Build with plain `Mesh` objects (no `InstancedMesh`, `SkinnedMesh`, morph targets): the lab measures their vertices for bbox, fits and the reference match.
- `pose(name)` must set every joint it uses, absolutely (a table per pose, a rest table underneath), so poses do not depend on call order. The lab always applies `rest` first, then the pose you asked for.
- Colors are raw sRGB hex, exact in the PNG. Shade pairs both come from the script. Hull pixels are 5 at any cell size; `kit.resolution` is updated per cell.

To use a model in a film, strip the `export`s and paste `kit.js` (it has no imports) and the model's `build` into the film's module script, then `const kit = makeKit(THREE, { ink: "#..." }); kit.resolution.set(1920, 1080);`. hyperframes lints a film past 300 structural lines, so budget the model: fewer parts, fewer segments.

## The loop

1. Blockout in `sil`: `--mode sil --views left,front --ref photo.jpg --ref-view left --ref-crop ... --ref-opacity 0.5`. Match proportions and silhouette before any detail. Move the crop box, not the model, when the photo is the problem.
2. `clay` for form: `--mode clay --views three4,front,top`. No ink to hide behind; look for flat spots, intersecting parts, bad curvature.
3. `cel` for the final look: `--mode cel`. Check that the ink closes at corners and the two tones land on forms. Watch the triangle count in the footer: a film draws the model every frame.
4. Poses: `--pose gallop-a --joints` (add `--joint-names` for labels); put poses in one `--batch`. Check the pivots sit where the limb bends.

Notes: `window.__labReady` goes true after the final render; `window.__labError` holds the message and stack on failure. Page console output and exceptions are forwarded to stderr as `[page] ...`. The CDN cache lives in `<tmp>/html-anime-lab-cache` and is only filled once; it is safe to delete. Stale Chrome profiles in the temp dir are swept on the next run. `LAB_CDN_BASE` swaps jsdelivr for a mirror. If Chrome dies or a model loops forever, the shot fails at `--timeout` and the next shot of a batch gets a fresh browser.

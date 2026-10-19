# Model lab

Build a procedural three.js model, shoot it from fixed views in three modes, look at the PNG, fix, repeat. Zero dependencies: Node 22+ and Chrome or Edge. three.js 0.186.1 comes from jsdelivr through a disk cache.

```
node harness/lab/shoot.mjs --model models/horse.js --views left,front,three4,top --mode cel --pose rest --out renders/out.png
npm run lab -- --model models/horse.js --out renders/out.png        # same thing
```

It prints one line, and warnings on stderr:

```
wrote out.png 1600x1000 880ms tris=10164 bbox=0.62x1.70x0.33m
[lab] warn: meta.height 2.5 m but the model's top at rest is 1.4 m
```

Look at every PNG you make. `--model` is a repo-relative path or any file path (see Paths). A model outside the repo works too.

## Flags

| flag | meaning |
|---|---|
| `--model <path>` | the model module (required) |
| `--views <list>` | any of `front back left right top three4 hero`. Default `front,left,three4,top` |
| `--mode <m>` | `cel` (film look), `clay` (smooth gray, no ink), `sil` (black on white). Default `cel` |
| `--pose <name>` | a name from `meta.poses`. Default `rest` |
| `--opts '<json>'` | a JSON object passed to `build(THREE, kit, colors, opts)` as its 4th argument, so one model shoots as its variants: `--opts '{"flavor":"mitarashi","plate":true}'`. The footer (and `--info`) shows it. Invalid JSON or a non-object is an error before Chrome starts. Library entries ignore it, with a warning. Default: none, `build()` uses its own defaults |
| `--out <file.png>` | output. Default is a unique name under the OS temp dir, so give one |
| `--size <WxH>` | window size, default `1600x1000`. Four views are four 800x500 cells; shoot one or two views for detail |
| `--ref <img>` `--ref-view <view>` `--ref-mode overlay\|beside\|edge` `--ref-opacity 0.5` `--ref-crop x,y,w,h` `--ref-flip` | reference photo, see below. `--ref-view` defaults to the first view |
| `--ref-scale <s>` `--ref-offset <dx,dy>` | scale and shift the placed reference (overlay, beside, edge), see below |
| `--focus <joint>` `--radius <m>` | frame one joint in every view, see below |
| `--light <x,y,z>` | preview another light direction (cel mode) |
| `--hide <a,b>` `--only <joint>` | hide objects by name, or show one joint's subtree only |
| `--montage <p1,p2,...>` | one cell per pose at one shared scale, see below |
| `--az <deg>` `--el <deg>` | aim the perspective cells (`hero`, `three4`): azimuth around +Y from +Z toward +X (the model's left), elevation above the horizon. Distance and framing stay automatic; a given `--el` is used as is, without the hero's floor stepping. See below |
| `--strip-view <view>` | the view `--strip` renders its clip frames in. Default `left` |
| `--joints` / `--joint-names` | yellow dots at every joint pivot, with names |
| `--batch shots.json` | a JSON array of shots, one browser session (about 0.3 s a shot after the first) |
| `--info` | also print the page's `__labInfo` as one JSON line: exact bbox, mm per pixel, every cell and the model's projected box in pixels, the ref rect, and `jointPositions` (every joint's world position in meters, 3 decimals; one entry per pose under `poses` in a montage) |
| `--lax` | contract violations warn instead of fail |
| `--swiftshader` | software GL. Default lets Chrome pick; if WebGL cannot start, one retry on software GL is automatic |
| `--cols n` `--mpp m/px` `--bg #hex` `--no-ref-box` `--timeout s` `--verbose` | layout columns, pin the ortho scale (compare shots at one scale), background, hide the crop box, page timeout (30 s), phase timings |
| `--serve [--port n]` | only serve; prints the lab URL to open in your own browser |

Batch items use the same keys in camelCase and sit on top of any flags: `[{"model":"models/horse.js","mode":"sil","views":"left","pose":"rest","out":"a.png"},{"model":"models/horse.js","mode":"cel","pose":"gallop-a","out":"b.png"}]`. `opts` may be the object itself: `{"model":"models/toro.js","opts":{"lit":true},"out":"lit.png"}`. Exit code is 1 if any shot failed; the others still run.

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
| `hero` | perspective, front-left, 7 degrees below (raised in steps for low, wide sets so the camera stays above the floor; 12 degrees above for very flat sets) | low three-quarter |

All orthographic cells share one meters-per-pixel scale (the footer prints it), so proportions compare across views. Each has a ground line, faint lines every 0.25 m (coarser or finer for big or small models), `0`/`1 m` labels, a scale bar, a dotted line at the model's x=0 / z=0, and its name. Perspective cells are fit to the silhouette. Backgrounds: white in `sil`, light gray in `clay`, mid gray in `cel`, so the ink reads on any script. The footer prints name, pose, mode, bbox (x y z), triangles, meshes and the scale, plus up to two warnings.

## Reference photos

`--ref photo.jpg --ref-view left --ref-crop 0.1,0.2,0.8,0.7` : `--ref-crop` is a box tightly around the subject, as fractions of the image (x, y, width, height). The crop is scaled uniformly so its height equals the model's projected bbox height in that cell; bottoms and horizontal centers are aligned. `overlay` draws it over the cell at `--ref-opacity`; `beside` puts it at the same scale in its own cell next to it. A dashed magenta box shows the placed crop, so you can see what to tighten. `--ref-flip` mirrors the image: a horse facing right in the photo fits the `right` view as is, or the `left` view flipped. Make the crop tight. The match is only as good as that box: the model's top and bottom land on the crop's top and bottom.

`--ref-mode edge` shows the photo at full opacity in the reference cell (`--ref-opacity` is ignored) and draws the model's silhouette on top as a 2 px pure red (`#ff0000`) line. The model itself is not drawn in that cell, so you judge the outline against the photo's real edges. Same placement as overlay. Use it with a one-view shot or next to the plain view: `--views left,right --ref-view right --ref-mode edge`.

`--ref-scale s` multiplies the automatic scale (default 1; 1.05 = 5% larger). `--ref-offset dx,dy` shifts the placed crop in meters in the view plane: +x is image-right, +y is up (so `0,0.1` lifts the photo 10 cm). `--ref-crop` may reach outside 0..1; the part outside the image is transparent, which lets you pad a tight photo or move the box past its edge. All three apply to overlay, beside and edge.

```
node harness/lab/shoot.mjs --model models/ox.js --views right --ref photo.jpg --ref-view right --ref-mode edge --ref-crop 0.102,0.052,0.854,0.875 --ref-scale 0.97 --ref-offset 0.02,0 --out renders/out.png
```

## Focus, light, hide, montage

**`--focus <joint> [--radius r]`** frames that joint's world position in every view. Orthographic cells get half-height `r` meters (all of them share the scale, the footer prints it); perspective cells aim at the joint from the distance where a sphere of radius `r` fills the cell. Without `--radius`, `r` is the joint subtree's bounding radius around the joint times 1.15. An unknown joint is an error that lists the valid names. The footer shows `focus <joint> r <m>`.

```
node harness/lab/shoot.mjs --model models/frog.js --views front,left,three4,top --focus eyeL --radius 0.035 --out renders/eye.png
```

**`--light x,y,z`** points the one light of every cel material at that direction (normalized) for this shot; the threshold logic is unchanged. Light is world space, +Y up, +Z in front of the model, +X its left. The default is `0.62,0.72,0.3`. `clay` is lit relative to the camera and ignores it. The footer shows the vector.

```
node harness/lab/shoot.mjs --model models/knight.js --views three4,front --light -0.6,0.7,0.3 --out lit-right.png
```

**`--hide a,b`** hides every Object3D whose `.name` equals a name, or that is the joint with that key, together with its subtree (names are exact and case-sensitive; one that matches nothing is a warning). **`--only <joint>`** shows only that joint's subtree. Both run after every `pose()`, leave the contract checks alone, and shrink the bbox, scale and triangle count to what is shown. They can only reach things that have a name: give groups `.name`s in the model (`probe.mjs` prints every mesh's path, unnamed ones as `Group#2`).

```
node harness/lab/shoot.mjs --model models/knight.js --views three4,left --hide sword,elbowL --out renders/bare.png
node harness/lab/shoot.mjs --model models/knight.js --views three4,front --only elbowR --out sword-arm.png
```

**`--montage pose1,pose2,...`** makes one image with one cell per pose, in the first view of `--views` (default `left`). All cells share one scale, fitted to the union bbox of all those poses and aligned on the same ground and origin, so growth, stride and lift read at true size. Each cell is labeled with its pose. `--cols` sets the layout; `--joints`, `--focus`, `--hide`, `--light` work; `--ref` is ignored. It works as a batch item (`"montage":"rest,puff-1,puff-2"` or an array).

```
node harness/lab/shoot.mjs --model models/frog.js --montage rest,puff-1,puff-2,puff-3 --out renders/puff.png
```

**`--az <deg>` `--el <deg>`** replace the azimuth and elevation of every perspective cell (`hero`, `three4`); the auto distance and centering are unchanged. `0` looks at the model's front from +Z, `90` at its left side from +X, `180` at its back; `--el` is degrees above the horizon (negative looks up from below). Without `--el` each view keeps its own elevation, with the hero's floor stepping; with it the camera sits exactly there, even if that is under the floor. The footer shows `camera az .. el ..`. Shoot a long alley down its length, or a riverbank square to its face:

```
node harness/lab/shoot.mjs --model models/horse.js --views hero --az 0 --el 8 --out renders/head-on.png
node harness/lab/shoot.mjs --model models/horse.js --views hero,three4 --az 90 --out renders/side.png
```

**`--strip-view <view>`** picks which view `--strip` draws its frames in (default `left`); any of the seven views, so a front-facing part (a washer drum, a face) can be watched turning:

```
node harness/lab/shoot.mjs --model models/yokocho.js --views hero --strip sway --strip-view front --out renders/sway.png
```

## Library models

`--model models/library/<id>` (the folder or its `meta.json`) loads a library entry: its GLB through GLTFLoader and `library.js`, cel-shaded with the kit's skinned shader and hull. Every flag works. Poses are `rest`, a `meta.poseDefs` name, or `<clip>@<seconds>`; `--clip run --at 0.4` is one frame, `--clip run --frames 6` a montage across the clip, `--strip run` adds a row of clip frames after the views. `--info` adds `palette` (share of non-edge pixels that are exact script hexes) for any cel shot. `probe.mjs` takes the same folder, plus `--clip <name> --frames n`. The pipeline that makes entries is `harness/library/README.md`.

## probe: numbers without a picture

`node harness/lab/probe.mjs --model models/ox.js [--pose stomp | --poses all | --poses rest,walk-a] [--opts '<json>'] [--json] [--lax]` (or `npm run probe -- --model ...`). `--opts` is the same as shoot's: the 4th argument to `build()`, printed in the header line (and as `opts` in `--json`). No browser: it loads three.js from the lab's CDN cache (fetching it there when missing), builds the model and applies each pose, about 0.2 s for the whole run. Per pose it prints the bbox (m), the lowest y, total triangles and the 10 heaviest meshes (by object path, `root>joint>...>Mesh#i`), every joint's world position (m, 3 decimals), the contacts (meshes whose lowest point is within 5 mm of y=0), then the same contract warnings the lab prints on stderr. `--json` prints one JSON object (`poses[]` with `bbox`, `minY`, `triangles`, `topMeshes`, `joints`, `contacts`, plus `warnings`). Exit code 1 on a contract error.

## Paths

`--model`, `--out`, `--ref` and `--batch` (and the same keys inside a batch file) accept forward or backward slashes. Relative paths resolve against the repo root, not the current directory (`--model`, `--ref` and `--batch` fall back to the current directory when the file is not under the root). On Windows a Git Bash path `/c/Users/me/x.png` (or `/cygdrive/c/...`) means `C:/Users/me/x.png`; it never creates a folder like `D:\c\`. Output folders are created.

## Recipes

- **Silhouette edge compare against a photo.** `--views left,right --ref-view right --ref photo.jpg --ref-crop <tight box> --ref-mode edge` (a bull facing image-right fits the `right` view). If the outline is off everywhere by the same amount, correct it with `--ref-scale` and `--ref-offset` rather than the model; read the misfit as model error.
- **Close-up of a joint.** `--focus <joint> --views front,left,three4`; add `--joints --joint-names` to check the pivot, `--radius` to zoom. Find joint names with `probe.mjs` or `--info`.
- **Montage of poses at one scale.** `--montage rest,walk-a,walk-b,stomp --views left`: every cell has the same mm/px, so a stride or a hoof lift is measurable between cells.
- **Previewing another light.** `--light -0.6,0.7,0.3` before you decide which side of the model the film's light must favor; the default light leaves the model's right side and a straight-on front in shade.
- **Probing poses before shooting.** `node harness/lab/probe.mjs --model models/ox.js --poses all`: check the lowest y and contacts (feet on the ground?), the bbox and the joint positions for every pose in a fraction of a second, then shoot only the ones that need a look.

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
export function build(THREE, kit, colors = meta.colors, opts = {}) {   // opts: the model's own variants (--opts)
  // 1 unit = 1 meter, +Y up, the model faces +Z, stands on y=0, centered on x=0, z=0
  return { root /* THREE.Group */, joints /* name -> Object3D pivots */, pose(name) /* sets joint rotations from literal tables */ };
}
```

Models only call the kit: `kit.toon(geometry, base, shade, opts)` is a Mesh with its ink hull; `kit.cel(base, shade, { threshold })` is just the material (use `-0.25` for glowing practicals) for meshes without ink, like interior lines; `kit.outline(mesh, { px, ink })` inks a mesh you made yourself; `kit.rgb(hex)`; `kit.hullNormals(geometry)`. `opts` also takes `{ outline: false }`. Because they only touch the kit, a model renders in `cel`, `clay` and `sil` unchanged. `sample.js` is a complete example: a jointed mannequin with capsules, balls, boxes, and two poses.

Rules the lab enforces:

- Errors (exit 1, message on stderr and on the page, `window.__labError`): `meta` or `build` missing or malformed; `meta.script` not in SCRIPTS; the source uses `Math.random`, `Date`, `performance.now`, `requestAnimationFrame`, `Clock`, or any `import` (comments are ignored; `--lax` makes this a warning); `build` or `pose` throws; no meshes.
- Warnings: a color that is not on the script; `meta.height` more than 2% (or 1 cm) off the top of the rest pose; the model does not stand on y=0; it is more than 15% off x=0 or z=0; the pose is not in `meta.poses`; no `rest` pose.
- Build with plain `Mesh` objects (no `InstancedMesh`, `SkinnedMesh`, morph targets) in code models. (Library models are skinned; the lab measures skinned and morphed vertices where they are drawn.)
- A model with continuous motion may also return `clips: { name: seconds }` (as library entries do); `pose("swim@0.3")` then shows that clip at 0.3 s, looping, and `--clip` / `--strip` / `--frames` work on it.
- `pose(name)` must set every joint it uses, absolutely (a table per pose, a rest table underneath), so poses do not depend on call order. When `meta.poses` lists `rest`, the lab applies it first (the height, ground and centering checks are against it), then the pose you asked for.
- Colors are raw sRGB hex, exact in the PNG. Shade pairs both come from the script. Hull pixels are 5 at any cell size; `kit.resolution` is updated per cell.

To use a model in a film, strip the `export`s and paste `kit.js` (it has no imports) and the model's `build` into the film's module script, then `const kit = makeKit(THREE, { ink: "#..." }); kit.resolution.set(W, H);` with the sheet's frame size. hyperframes lints a film past 300 structural lines, so budget the model: fewer parts, fewer segments.

## The loop

1. Blockout in `sil`: `--mode sil --views left,front --ref photo.jpg --ref-view left --ref-crop ... --ref-opacity 0.5`. Match proportions and silhouette before any detail. Move the crop box, not the model, when the photo is the problem.
2. `clay` for form: `--mode clay --views three4,front,top`. No ink to hide behind; look for flat spots, intersecting parts, bad curvature.
3. `cel` for the final look: `--mode cel`. Check that the ink closes at corners and the two tones land on forms. Watch the triangle count in the footer: a film draws the model every frame.
4. Poses: `--pose gallop-a --joints` (add `--joint-names` for labels); put poses in one `--batch`. Check the pivots sit where the limb bends.

Notes: `window.__labReady` goes true after the final render; `window.__labError` holds the message and stack on failure. Page console output and exceptions are forwarded to stderr as `[page] ...`. The CDN cache lives in `<tmp>/html-anime-lab-cache` and is only filled once; it is safe to delete. Stale Chrome profiles in the temp dir are swept on the next run. `LAB_CDN_BASE` swaps jsdelivr for a mirror. If Chrome dies or a model loops forever, the shot fails at `--timeout` and the next shot of a batch gets a fresh browser.

The checks and measuring shared by the page and `probe.mjs` live in `inspect.js` (no imports, THREE passed in); `paths.mjs` holds the path fixes.

# Lab recipes

`harness/lab/README.md` is the manual. This file is the order of shots that worked, the inspection tricks the seven case studies needed, and the traps they fell into. Run from the repo root. Give every shot an `--out`.

## Stage by stage

**1. Blockout against the photo (silhouette edge).** One view, the photo at full opacity, the model's outline in red. This replaced opacity blending in every case study that tried it: at 35-50 % opacity "model-only vs ref-only" areas are ambiguous, the red line is not (horse T2, ox T22, ae86 T1).

```
node harness/lab/shoot.mjs --model models/<name>.js --views left --mode sil --ref <refs>/<name>/side.jpg --ref-view left --ref-flip --ref-mode edge --ref-crop 0.21,0.08,0.61,0.86 --size 1200x900 --out <scratch>/01-edge.png
```

- `--ref-view` must be the view the photo was taken from; a photo facing image-right fits `right` as is, or `left` with `--ref-flip`.
- The crop's height is scaled to the model's bbox height and bottoms and centres are aligned. So the crop must cover exactly the features the bbox covers: exclude a far leg or stretched foot the model doesn't have, the log a frog sits on, a jockey's head (horse T1, frog T7, horse T13). Fit the bare body first: a sword or shield skews the bbox centre (knight T1). Centre the crop on a stable landmark (the helmet) when the subject is asymmetric (knight T2).
- If the outline is off everywhere by the same amount, fix the placement, not the model: `--ref-scale 0.97 --ref-offset 0.02,0`. To compare in a different pose or scale by a body-length landmark instead of height, compute the crop; `--ref-crop` may reach outside 0..1 (the dragon padded its image by hand before this existed, dragon T4).
- Read misfits in metres: `--info` prints the bbox, mm per pixel and the model's projected box in pixels.
- `--ref-mode beside` for proportions as fractions when the photo is perspective or the pose differs (ae86 T5, heroine T14).

**2. Clay for form.** `--mode clay --views three4,front,top,back`. Sil hides every cap and seam problem; clay shows shelves, slabs, flat spots and intersections (horse T6, ox T4). Clay does not show inverted winding: the hull is absent there.

**3. Cel for the look.** `--mode cel` default views, then a big single view for detail (`--views three4 --size 1400x900`). Check: outlines closed, no specks, tones land on forms, the right side is expected shade.

**4. Thumbnail.** The quality bar is recognition at film-thumbnail size:

```
node harness/lab/shoot.mjs --model models/<name>.js --views hero --size 480x300 --out <scratch>/thumb.png
```

**5. Poses.** Ground them with the probe first, then look:

```
npm run probe -- --model models/<name>.js --poses all
node harness/lab/shoot.mjs --model models/<name>.js --pose run --views hero,left,front --joints --out <scratch>/run.png
node harness/lab/shoot.mjs --model models/<name>.js --montage rest,walk-a,walk-b,run --views left --out <scratch>/poses.png
```

**6. Finals.** Rest in cel default views at 1600x1000 into `models/renders/<name>.png`, each pose as `models/renders/<name>-<pose>.png` (hero + one ortho view), and one `cel --ref-mode beside` per reference for the honest list of remaining differences.

## Batch

One browser session, ~0.3 s a shot after the first. Keys are the flags in camelCase.

```json
[
  { "model": "models/<name>.js", "views": "left", "mode": "sil", "ref": "<refs>/<name>/side.jpg", "refView": "left", "refFlip": true, "refMode": "edge", "refCrop": "0.21,0.08,0.61,0.86", "out": "<scratch>/edge.png" },
  { "model": "models/<name>.js", "mode": "clay", "views": "three4,front,top,back", "out": "<scratch>/clay.png" },
  { "model": "models/<name>.js", "mode": "cel", "out": "<scratch>/cel.png" },
  { "model": "models/<name>.js", "mode": "cel", "views": "hero", "size": "480x300", "out": "<scratch>/thumb.png" }
]
```

`node harness/lab/shoot.mjs --batch <scratch>/shots.json`. Paths may be repo-relative, `C:/...`, or Git Bash `/c/...` (the lab now normalizes them; before, `/c/...` in a batch file wrote into `D:\c\...`, frog T11).

## Close-ups and isolation

- `--focus <joint> [--radius r]` frames one joint in every view: a hoof, an eye, a hand (`--focus eyeL --radius 0.035`). This replaces the scratch "delete everything outside one subtree" copies the ox and dragon wrote (ox T9, dragon T13).
- `--only <joint>` shows one subtree; `--hide a,b` removes named parts (`--hide sword` takes the knight's sword away; name a group, like the shield mount, to make it hideable). Both need `.name`s on your groups.
- `--light x,y,z` previews the shaded side lit: `--light -0.6,0.7,0.3` shows the -X flank's forms that the film light hides.
- `--joints --joint-names` puts a dot on every pivot: check that pivots sit on the bends before touching pose numbers (dragon T2).
- `--mpp m/px` pins the ortho scale but not the framing; to zoom on a part, use `--focus` (ox T8).

## Numbers without a picture

`npm run probe -- --model <path> [--pose p | --poses all] [--json]` builds the model headless in ~0.2 s and prints, per pose: bbox, lowest y, triangles and the 10 heaviest meshes by path, every joint's world position, the ground contacts, and the contract warnings. Use it to ground feet, find a triangle hog, read a joint position for a formula, and catch a build error without a browser.

For a question the probe doesn't answer (a sword tip's world position, which mesh and normal sit under a pixel, why a region is shade), write a scratch script with a stub kit. Keep it outside the repo.

```js
// pick.mjs <model.js> <x> <y> [pose]: which mesh, tone pair, threshold and normal is under world (x, y) seen from +Z.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dir = path.join(os.tmpdir(), "html-anime-lab-cache"); // filled by the first lab or probe run
const THREE = await import(pathToFileURL(path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith("three.core.js")))).href);
const L = new THREE.Vector3(0.62, 0.72, 0.3).normalize();
const kit = {
  mode: "cel", LIGHT: L, resolution: new THREE.Vector2(1920, 1080), rgb: () => new THREE.Vector3(),
  hullNormals: (g) => g, outline: (m) => m, cel: () => new THREE.MeshBasicMaterial(),
  toon: (g, base, shade, o = {}) => {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    m.userData = { base, shade, t: o.threshold ?? 0.35 };
    return m;
  },
};
const [model, x, y, poseName] = process.argv.slice(2);
const mod = await import(pathToFileURL(path.resolve(model)).href);
const { root, pose } = mod.build(THREE, kit, mod.meta.colors);
pose("rest");
if (poseName) pose(poseName);
root.updateMatrixWorld(true);
const pathOf = (o) => (o.parent ? pathOf(o.parent) + ">" : "") + (o.name || o.type);
const ray = new THREE.Raycaster(new THREE.Vector3(+x, +y, 10), new THREE.Vector3(0, 0, -1));
for (const h of ray.intersectObject(root, true).slice(0, 3)) {
  const n = (h.normal ?? h.face.normal).clone().transformDirection(h.object.matrixWorld);
  const d = n.dot(L), u = h.object.userData;
  console.log(pathOf(h.object), u.base, u.shade, "t", u.t, "n", n.toArray().map((v) => v.toFixed(2)).join(","), "dot", d.toFixed(2), d > u.t ? "BASE" : "SHADE");
}
```

The same stub kit answers "which front vertices of the head are shade at threshold t" (iterate the geometry's normals against `L`, heroine T5) and solves fold Eulers offline (`solveJoint` in rigging.md). Verify colour claims by sampling the PNG's pixels too: a downscaled crop lies (heroine T8).

## Budgets

- **Shots.** The case studies took 17-32 logged trials each: blockout and edge fits 3-6, clay 2-3, cel and detail 4-8, poses 4-8, finals 2-3. Batch the shots of one trial. If a stage is past its budget, the construction is wrong, not the numbers: change the method (rails in world coordinates, plane-locked rings, a skinned loft), not the tenth key.
- **Triangles.** See geometry.md. Read `tris=` on every shot and the probe's heaviest meshes.

## Traps

- A model at real scale is fine: the frog is 0.09 m, the dragon 5.5 m long. The lab frames the bbox; the film scales `root`.
- A long tail moves the bbox centre: shift the model in a group so it centres on z = 0, or the lab warns (dragon).
- `meta.height` must match the rest top within 2 % (a plume once pushed the knight to 1.90 m, knight T9).
- The lab rejects `Math.random`, `Date`, `performance.now`, `requestAnimationFrame`, `Clock` and any `import`, even in a comment-free helper you pasted; comments are ignored.
- No python on the Windows box used for these models: script file edits with node string replacement and check that each replacement matched (ae86 T4).

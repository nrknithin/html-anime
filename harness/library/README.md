# Model library pipeline

An artist-made model (free licence, see below) becomes a film-ready cel model in `models/library/<id>/`: a normalized, compressed `model.glb`, a `meta.json` that maps its materials to two-tone colour roles and its clips to a shared vocabulary, and a `preview.png`. Code models (`models/*.js`) are unchanged; both kinds load in the same lab.

```
models/library/<id>/meta.json     recipe + colours + clips + source + measured facts (hand-written, then filled by the scripts)
models/library/<id>/model.glb     normalized and meshopt-compressed (written by ingest)
models/library/<id>/preview.png   cel, four views at rest + a clip strip (written by check)
models/library/manifest.json      every entry (generated)
models/CATALOG.md                 thumbnails, clips, licences (generated)
CREDITS.md                        attribution for CC-BY entries (generated)
```

## One model, start to finish

```
npm run library:ingest -- horse        # fetch (sha256-pinned) -> unzip -> Blender convert + normalize -> gltf-transform
npm run lab -- --model models/library/horse --strip run --cols 4 --out renders/horse.png   # look; fix meta.json; repeat
npm run library:check -- horse         # acceptance checks + preview.png + meta.qa
npm run library:catalog                # manifest.json, CATALOG.md, CREDITS.md
npm test                               # includes: every committed entry is complete
```

Look at every PNG. One model per branch and per PR; the PR carries `meta.json`, `model.glb`, `preview.png` and the regenerated catalog files.

### Tools

- **Node 22+** for everything; no npm install. `gltf-transform` runs through `npx @gltf-transform/cli@4.5.1` (pinned).
- **Blender's Python module** for conversion: `python3.11 -m venv bpyenv && bpyenv/bin/pip install bpy==4.2.0`, then `LIBRARY_PYTHON=bpyenv/bin/python` (default `python3.11`). Keep the venv outside the repo. `convert.py` is run with `-I` from a scratch folder: downloads are data, nothing inside them runs (and `.blend` auto-run scripts stay off).
- **Chrome/Chromium** for the lab (Playwright's `/opt/pw-browsers` is found automatically; as root the lab adds `--no-sandbox`).

## meta.json

```jsonc
{
  "id": "horse",                       // = folder name
  "name": "Horse",
  "category": "mammal",                // catalog section
  "tags": ["animal", "farm"],
  "style": "low-poly, flat colours",
  "height": 1.7,                       // m, top of the rest pose (checked within 5 %)
  "script": "noon",                    // default colour script, as code models
  "colors": { "coat": "#c4452d", "coatShade": "#5c3d32", "hair": "#241c16", "hairShade": "#2c261f" },
  "materials": { "Material.003": "coat", "Material.006": "hair" },   // source material -> role (every material needs one)
  "thresholds": { "skin": -0.2 },      // optional, per role (default 0.35)
  "noInk": [],                         // optional: roles drawn without a hull (eyes, decals)
  "smooth": true,                      // default: shade on per-position averaged normals (false keeps low-poly facets)
  "doubleSided": ["cloth"],            // optional: roles drawn from both sides (one-sided capes, flags, leaves)
  "clips": { "idle": "Idle", "walk": "Walk", "run": "Run", "jump": "Jump", "death": "Death" },  // vocabulary -> source clip
  "poseDefs": { "gallop-a": ["run", 0.2] },          // optional named poses: [clip, seconds]
  "preview": { "clip": "run", "pose": "idle@0" },     // optional: the strip's clip, and the views' pose (a T-pose rig)
  "source": {
    "license": "CC0",                  // CC0 | CC-BY-4.0 | CC-BY-3.0 (free licences only; CC-BY lands in CREDITS.md)
    "author": "Quaternius",
    "pack": "Quaternius · Farm Animals",
    "page": "https://opengameart.org/content/lowpoly-animated-farm-animal-pack",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/"
  },
  "ingest": {
    "fetch": { "type": "zip", "url": "https://opengameart.org/sites/default/files/Farm%20Animals%20by%20%40Quaternius.zip" },
    "member": "Farm Animals by @Quaternius/FBX/Horse.fbx",
    "height": 1.7, "yaw": 0, "drop": [], "keepActions": [],
    "attach": []                       // optional: props parented to bones, see "Props on bones, and kit pieces"
  }
  // written by the scripts: file, sha256, bytes, triangles, bones, sourceMaterials, clipInfo, ingest.fetch.sha256, qa
}
```

`clipInfo` is written by ingest (`seconds`, and `loop` guessed from the name: death, hit, jump and attack clamp, the rest wrap). Edit `loop` by hand when the guess is wrong, and add `lift` to a clip that sinks into the ground (a body lying down in a death clip): metres, or keys `[[seconds, metres], ...]` interpolated linearly and held past both ends, so a fall can stay planted while standing and lift only once it lies down. `npm run probe -- --model models/library/<id> --clip death --frames 16` gives the lowest point per frame to key from. Simpler and usually better: `"ground": "clamp"` on a clip measures the posed model every frame and lifts it by exactly enough to keep its lowest point on y = 0 (never lowers it), so a toe strike or a fall never sinks and nothing floats; it costs one pass over the vertices per pose. Keyed `lift` stays for clips where clamping would be wrong. When only a thin part crosses the ground while the feet stay planted (a tail sweeping down in a howl), lifting would float the body: set `sinkAllowed: "<why>"` on that clip instead, and the check reports it as a note.

Shared clip vocabulary: `idle`, `walk`, `run`, `jump`, `attack`, `hit`, `death`, `eat`, `sit`, `wave`, `dance`, `fly`, `swim`. Map the ones the source has; keep source names for the rest (they still play under their own name).

### Fetch types

| type | fields | used for |
|---|---|---|
| `file` | `url`, `extraFiles` | a GLB or file on a static host (GitHub raw, Poly Haven, jsdelivr). A multi-file source (a `.gltf` with its `.bin` and textures) lists the rest in `extraFiles: [{ "url", "path" }]`: each is sha256-pinned like the main file and saved at `path` relative to it (Poly Haven's API `include` map gives both) |
| `zip` | `url`, `member`, `extraMembers` | OpenGameArt zips, any zip with a stable URL. `extraMembers` (a .bin, textures) are listed by their full path in the zip (`"Models/GLB format/Textures/colormap.png"`); the member and its extras keep the zip's folder layout, so a GLB's `Textures/colormap.png` or a .blend's `//../Textures/palette.png` resolves; an image still missing (a .blend expecting `//Ghost_Texture.png` beside itself while the zip keeps it in `Textures/`) is relinked by file name to any unpacked file of that name |
| `kenney` | `page` (`https://kenney.nl/assets/<kit>`), `member` | Kenney kits: the zip link changes on every update, so it is read from the page |
| `itch` | `page`, `upload` (the file name on the download page), `member` | free itch.io packs (KayKit, Quaternius): the same form posts as the "No thanks, just take me to the downloads" button |

The first fetch pins `ingest.fetch.sha256`; a later fetch that differs stops with an error. Downloads are cached in `<tmp>/html-anime-library-cache` (`--refetch` skips the cache). Requests go one at a time with a pause. Never work around a bot check: `poly.pizza` (Cloudflare challenge) and Quaternius's Google Drive (quota) are off limits; find the pack on OpenGameArt or itch.io instead.

### `ingest.via`: Blender or glTF as is

By default every source goes through Blender (`"via": "blender"`). A GLB source can instead keep its own nodes, skins, morphs and clips untouched with `"via": "gltf"` (`normalize.mjs`): its rest pose is measured with three.js and the normalization is one added `root` node. Use it when Blender's round trip damages a rig. That happens with meshes parented rigidly to bones, which RobotExpressive has: after Blender its legs sank into its torso. Check the raw source in the lab first if a converted rig looks wrong. On this path textures are not flattened and clip names stay as the source wrote them. Node-animated sources (Kenney Cube Pets: rigid parts moved by node tracks, no skin) work on both paths; Blender splits their clips into one action per object, so `clipInfo` is always read from the exported GLB, one entry per clip.

### Textured sources

KayKit's gradient atlas, Kenney's colour map and Poly Haven photos are textures, and the cel look has no textures. `convert.py` turns every textured material into flat ones: each face takes the texel at its UV centroid, the faces of one source material are clustered into at most `ingest.maxColors` colours (default 12, k-means, deterministic), and each cluster becomes a material named `<material>#rrggbb`. ingest lists them in `sourceMaterials`; map each to a role like any other material (several greys of one armour all go to `steel`).

### Normalizing

`convert.py` puts everything under one `root` node: scaled so the rest pose is `ingest.height` metres tall, turned by `ingest.yaw` degrees (about up) so the face points +Z, the lowest rest point on y = 0 and the bbox centred on x = z = 0. Find the yaw once per pack: shoot the `left` view; the face must point to the image's left. A prop modelled lying down (a key on its side) is stood up with `ingest.pitch` (degrees about +X) and `ingest.roll` (degrees about +Z, the facing axis), applied in that order before the yaw, all before measuring; Blender path only. Clip names lose their `Armature|` prefixes and a suffix they all share with the armature's name (`Idle_Rig` -> `Idle`). Before measuring, any action an importer assigned is unassigned and every pose bone cleared, so the exported bones are the measured rest pose; bone display shapes (rig widgets) and render-hidden objects are deleted. Alternative props a pack ships on the rig (KayKit's four shields and three swords) go with `ingest.drop` by object name. A part that shares one mesh with the body (a witch's hat) goes with `ingest.dropMaterials`: every face using those source materials is deleted before measuring. A source that ships every triangle twice, back to back (Kenney's Tower Defense saucers, so the model shows from inside), gets `ingest.dropBackfaces: true`: one face of each pair is deleted and the mesh wound outward again, otherwise the inward copy's ink hull paints the visible surface black.

### Two armatures: follower rigs are merged

Blender 4.2's glTF exporter (actions mode) writes every action only when the scene has exactly one armature; with two it writes only the active actions, and `convert.py` unassigns those, so the export would have no clips. Some packs hang a part on a second rig: the 2018 Quaternius monsters skin their eyes to an `EyeArmature` whose one bone follows `BatArmature`'s `Face` bone through a Child Of constraint (dropping that rig leaves the eyes on the floor). Before measuring, `convert.py` folds such a follower into the armature it follows, when:

- the follower is not animated (no action, NLA or drivers), and every bone of it is parentless and held by one enabled Child Of constraint (influence 1, all nine channels on) to a bone of one other armature;
- every mesh it deforms is deformed by it alone (empty armature modifiers aside) and has no shape keys.

Each of its meshes is baked where it sits with the main rig at rest and the constraints evaluated, then skinned rigidly to the constraint target bone (weight 1.0; a vertex weighted across several follower bones splits its weight among their targets, and a vertex with no weight goes whole to the target of a one-bone follower) and parented to the main armature; other children of the follower move to the main armature (bone children to the target bone), and the follower is deleted. The part then follows the target bone through every clip exactly as the constraint did. The report lists `mergedArmatures`; a source still left with several armatures prints a warning. A source with one armature is untouched (its GLB is byte-identical). Look at a clip that moves the head a lot (`death`, `attack`) in the `left` and `front` views: the part stays on the face.

### Props on bones, and kit pieces: `ingest.attach`

Some packs ship a character without what it holds: KayKit's Skeletons rigs come empty-handed, and the blades and shields are separate files meant for the `handslot.r` / `handslot.l` bones. `ingest.attach` puts them on:

```jsonc
"fetch": { "type": "file", "url": ".../Characters/gltf/Skeleton_Warrior.glb", "extraFiles": [
  { "url": ".../Assets/gltf/Skeleton_Blade.gltf", "path": "Assets/gltf/Skeleton_Blade.gltf" },
  { "url": ".../Assets/gltf/Skeleton_Blade.bin", "path": "Assets/gltf/Skeleton_Blade.bin" },
  { "url": ".../Assets/gltf/skeleton_texture.png", "path": "Assets/gltf/skeleton_texture.png" } ] },
"attach": [
  { "file": "Assets/gltf/Skeleton_Blade.gltf", "bone": "handslot.r" },
  { "file": "Assets/gltf/Skeleton_Shield_Small_A.gltf", "bone": "handslot.l", "offset": [0, 0, 0], "rotation": [0, 0, 0], "scale": 1 }
]
```

`file` is a file the entry already fetches (`fetch.extraFiles` works beside a zip `member` too, so a prop from another source can join a pack character), so every prop is sha256-pinned like the model: an `extraFiles` `path` (with its `.bin` and textures), or an `extraMembers` path for a zip. ingest stops on a file it did not fetch. `convert.py` imports each prop (glTF, FBX or OBJ) at the rest pose, before anything is measured, and parents its objects rigidly to the bone (bone parenting, no weights): the prop's origin on the bone's head and the prop file's own axes on the bone's axes, the way an engine hangs a weapon on a hand slot (KayKit's slots are already oriented for it). `offset` (the bone's frame, source units), `rotation` (degrees about the bone's X, Y, Z) and `scale` adjust it. The prop follows every clip, counts in the rest bbox (the height, the ground and the centring include it) and exports with the model. Its materials keep their names, except that one sharing a name with a material already in the model becomes `<name>@<file stem>` (the Skeleton blade's atlas material `skeleton` becomes `skeleton@Skeleton_Blade`, split as usual into `skeleton@Skeleton_Blade#rrggbb`), so its colours map to roles apart from the body's. Look at the attack clip in the `left` and `right` views: the grip sits in the fist and the blade follows the swing. Not on the `"via": "gltf"` path.

Leave `bone` out to build a static model from several kit pieces (a monitor plus its keyboard, a bookcase plus its books): the prop becomes a fixed part of the model, its origin on the model file's origin and its axes on the model file's axes (Y up, +Z front), then `offset` (those axes, the model's source units), `rotation` and `scale`. It counts in the bbox like the rest. Materials follow the same `@<file stem>` rule. Every named material reaches the GLB on its own, even when two share a colour: `convert.py` nudges each repeat's colour by 1e-4 so gltf-transform's dedup cannot merge them (an FBX that exports every material grey, a keyboard's `metalDark` beside the monitor's). An entry built before that rule may need roles for the materials that now survive when it is ingested again; `library:check` names them.

```jsonc
"member": "Models/GLTF format/computerScreen.glb",
"extraMembers": ["Models/GLTF format/computerKeyboard.glb"],
"attach": [{ "file": "Models/GLTF format/computerKeyboard.glb", "offset": [0, 0, 0.2] }]
```

## In the lab

Library entries take every lab flag. `--model` is the entry's folder (or its `meta.json`). The pose is `rest`, a `poseDefs` name, or `<clip>@<seconds>`.

| flag | meaning |
|---|---|
| `--clip run [--at 0.4]` | one frame of a clip |
| `--clip run --frames 6` | a montage of 6 frames across the clip, one scale |
| `--strip run [--frames 4]` | the views at rest, then a row of clip frames in the `left` view (the preview layout; add `--cols 4`) |
| `--info` | also reports `palette`: the share of non-edge pixels that are exact script hexes (cel mode, code models too) |

`npm run probe -- --model models/library/horse --clip run --frames 8` prints the lowest point and contacts per frame without a browser.

## Acceptance (`npm run library:check -- <id>`)

From `models/PLAN.md` section 6. The checker writes `meta.qa` and `preview.png`, and fails on:

- rest top more than 5 % off `meta.height`; lowest rest point more than 2 % of the height off y = 0; bbox centre more than 5 % of the width off x = 0 or z = 0;
- a clip frame sinking more than 3 % of the height below the ground (notes, not failures: a ground clip that never touches the ground);
- under 99 % of non-edge pixels on the script in the cel preview; any lab warning;
- one clip frame rendered twice differing by a byte.

Things only eyes catch, so look at the preview and a `--clip <c> --frames 8` montage of every clip: the face turned the wrong way, exploded or missing parts, ink holes, two tones that do not land on forms, colours that make the subject unreadable.

## Into a film

1. Copy `model.glb` to `films/<slug>/models/<id>.glb`, next to the film like its font.
2. Add `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"` to the importmap, import `GLTFLoader` and `MeshoptDecoder`, paste `makeKit` (`harness/lab/kit.js`) and `buildLibrary` (`harness/lab/library.js`) with their `export`s stripped, and inline the entry's `name`, `colors`, `materials`, `clips` and `clipInfo` as a constant (map the roles to the sheet's hexes when the film's script differs).
3. Load before the first frame: `new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(url, (gltf) => { horse = buildLibrary(THREE, kit, gltf, META); scene.add(horse.root); draw(window.__hfThreeTime || 0); })`. GLTFLoader goes through `THREE.DefaultLoadingManager`, which HyperFrames waits on; `draw` returns early until the model exists.
4. Animate only from `hf-seek`: `const f = Math.floor(t * 24 + 1e-6); horse.pose("run@" + (f - (f % 2)) / 24);` (acting on twos). `pose` is absolute, so seeking anywhere is exact.
5. `npx hyperframes lint` and `validate` in the film folder, then snapshot and look, as `skills/html-anime-3d/SKILL.md` says.

## Files

| file | what |
|---|---|
| `ingest.mjs` | fetch, pin, unzip, convert, compress, write facts |
| `convert.py` | Blender: import FBX / .blend / glTF / OBJ, merge follower armatures, attach props to bones, normalize, export GLB, report |
| `check.mjs` | acceptance checks, `preview.png`, `meta.qa` |
| `catalog.mjs` | `manifest.json`, `CATALOG.md`, `CREDITS.md`; `--check` fails on stale files or incomplete entries |
| `library.test.mjs` | zip reader, attach arguments, catalog, entry completeness, no clock in pasted files (`npm test`) |
| `../lab/library.js` | runtime: glTF -> cel model with `pose()` (lab, probe and films share it) |
| `../lab/kit.js` | the cel and hull shaders, skinning- and morph-aware |

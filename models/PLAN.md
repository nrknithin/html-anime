# Model library plan

> **Status: plan only.** Nothing is downloaded, converted or built until the owner approves this plan.
> Every candidate we found (all sources, ranked high to low priority): [CANDIDATES.md](CANDIDATES.md).
> Wave 1, the first ~200 models to build: [section 9](#9-wave-1-the-first-200-models).

## 1. Why the current models don't look right

The eight models in `models/*.js` (horse, ox, frog, dragon, knight, heroine, AE86, wolf) were written as code by agents, one number at a time:

1. **They are typed, not sculpted.** Every body is a stack of oval rings and tubes. Matching a photo's outline gets the silhouette right (that is what the lab measures), but not the form inside it: no muscle masses, no skull shape, no fur volume, no real joints. They read as clean toy blockouts, not as the animal.
2. **The two-tone shader flattens what form there is.** One fixed light splits each part into one flat lit colour and one flat shade. There are no gradients to describe shape, so a weakly sculpted form has nothing to hide behind. Real anime CG gets away with two tones because the meshes underneath are sculpted by artists.
3. **The budget per model was small.** 7–15k triangles and 6–32 trials. A production anime model takes an artist days.

**What fixes it:** start from meshes that artists already sculpted and rigged, released under CC0 (public domain), and run them through our cel look (palette two-tone, ink outline, deterministic animation). Code-built models stay for what code does best: morphs like the frog's puff, simple props, effects, and subjects no library has.

## 2. The approach: three tiers

| tier | what | used for | cost per model (est.) |
|---|---|---|---|
| **Library** (default) | an artist-made CC0 mesh, rigged and animated where the source is, normalized and cel-shaded by our pipeline | animals, people, creatures, vehicles, buildings, nature, props | ~10–40k tokens, mostly scripted |
| **Procedural** | a `models/<name>.js` code model, as today | morphing/transforming subjects, anime-specific subjects with no library source, effects | ~200–350k tokens |
| **Kitbash** | library parts + code parts (a prop in a hand, a recolour, an outfit) | variants and story-specific props | ~20–60k tokens |

<!-- PROCEDURAL_DECISIONS -->

## 3. Where the models come from (verified)

Three research agents checked every source end to end (a real download, the licence text, the file format). Counts are what can be fetched automatically today.

| source | licence | how we download | usable models | animated | style |
|---|---|---|---|---|---|
| **Quaternius** | CC0 (quaternius.com/license.html: "No attribution is required") | static GLB files on the poly.pizza CDN, `https://static.poly.pizza/<uuid>.glb` (the Google Drive route hits "quota exceeded") | 1,395 | ~220 (animals, dinosaurs, sea life, monsters, robots, people) | low-poly, flat colours |
| **KayKit** (Kay Lousberg) | CC0 (repo LICENSE.txt) | GitHub raw files, `KayKit-Game-Assets/*` (10 repos) | ~900 | 9 characters with 76–95 clips each (Knight, Barbarian, Mage, Rogue, four Skeletons) | low-poly, one gradient texture atlas |
| **Kenney** | CC0 (License.txt in every zip) | one direct zip per kit, link scraped from the kit page (the link changes on updates) | 1,181 standalone subjects in 50 kits | 12 rigged humans with 32 clips; 18 blocky characters; 24 cube pets; graveyard monsters | low-poly, flat colours or a colour map |
| **Poly Haven** | CC0 | `api.polyhaven.com/files/<id>`, the 1k glTF | 133 selected props | none | photoreal scans: need a toon restyle |
| **Khronos glTF samples** | CC0 or CC-BY 4.0 per model | GitHub raw GLB | 45 | Fox (walk, run), CesiumMan | mixed, mostly realistic |
| **three.js examples** | CC0 | GitHub raw | 1 (RobotExpressive, 14 clips) | yes | low-poly |
| **Open Source Avatars** | CC0 per the registry | URLs listed in `ToxSam/open-source-avatars` | 318 fetchable VRMs | rigged humanoids, no clips | cute low-poly avatars |
| **Universal Animation Library 1 + 2** (Quaternius) | CC0 | OpenGameArt zips with GLBs | 89 clips (not models) | — | for retargeting onto rigged humans |

Excluded, with reasons (they appear at the bottom of [CANDIDATES.md](CANDIDATES.md)): KayKit's itch.io packs (downloads go through a browser handshake; can be downloaded by hand), Kenney's FBX-only animated characters (need conversion), the Smithsonian scans (licence not verified per item), IPFS avatar collections (rate-limited, unverified), OpenGameArt .blend/FBX archives (need Blender), three.js examples credited to mirada or Mixamo (no licence or not redistributable), Poly Haven trees and cliffs (215–958 MB), and the Poly Pizza API (needs a key).

## 4. How a library model becomes film-ready

Each step is a script or a lab command, so most of the work is automatic. A batch agent's job is to run it, look at the renders and fix what the automatic steps get wrong.

1. **Fetch.** `npm run models:fetch -- <id>` downloads from the manifest into `models/library/<id>/`, checks the sha256, and records source URL, licence and author. Requests are throttled (one file at a time, a pause between requests); poly.pizza HTML is never crawled, only its static files.
2. **Normalize.** Scale to the subject's real height (a per-subject table: a wolf 0.85 m to the ear tips, a sedan 1.45 m), turn it to face +Z, put its lowest rest point on y = 0 and centre it. Each pack's own convention is measured once.
3. **Compress.** `gltf-transform` (via `npx`): weld, dedupe, meshopt compression, textures down to 512 px or baked away. Exact settings fixed in phase 1.
4. **Cel-ify.** Replace every material with the kit's two-tone shader, extended with three.js's skinning and morph chunks so rigged models work. Colours map to the film's script: each source material colour → nearest script colour (in Lab space) as the base, and a per-script shade partner. Textured sources (KayKit's atlas, Poly Haven photos) are sampled at each vertex's UV into vertex colours first, then mapped. Exact sheet hexes, as now.
5. **Ink.** The inverted-hull outline, with skinning, so it follows a walking leg; hull normals averaged per position so corners close.
6. **Animate.** One `AnimationMixer` per character. A film calls `mixer.setTime(t)` from `hf-seek`, never the clock, so every frame is a pure function of time. Acting steps on twos by rounding `t` to 2-frame steps. Clip names are mapped to a shared vocabulary (`idle`, `walk`, `run`, `jump`, `attack`, `hit`, `death`, `wave`, `sit`, ...).
7. **QA in the lab.** Lab v3 loads a library entry (`--model models/library/<id>`), plays a clip at a time (`--clip run --at 0.4`), shows a montage of clip frames, and the probe reports clips, bbox per frame and ground contact. Every model gets `preview.png`: cel, four views plus a clip strip.
8. **Catalog.** `models/library/manifest.json` is the source of truth; `models/CATALOG.md` (thumbnails, tags, clips, licence) is generated from it. CC-BY entries also go into `CREDITS.md`.
9. **Into a film.** Copy the GLBs a film uses into `films/<slug>/models/` (next to the file, like its font) and load them with `GLTFLoader` before the first frame. HyperFrames' three.js adapter already waits for `THREE.DefaultLoadingManager` to finish, so loading is render-safe. A strict single-file film can embed them as base64 instead.

This changes two rules written earlier: the 3D skill's "no loaders, no model files" and the model contract's "plain Mesh only, no SkinnedMesh". Library models get their own contract (`meta.json` + GLB); code models keep theirs.

## 5. Phases and agents (at most 8 at a time)

| phase | agents | what | gate before the next phase |
|---|---|---|---|
| **1. Pipeline + pilot** | 2 (1 for lab v3, the skinned cel shader, hull and loader; 1 for the fetch, normalize, compress and catalog scripts) | build the pipeline, then run 6 pilot models end to end: a Quaternius wolf (animated), a Quaternius horse, the KayKit Knight (76 clips), a Kenney mini-character, a Kenney car, a Poly Haven sofa (photoreal → toon) | **The owner approves the pilot renders**, side by side with the current procedural wolf and horse. If the look isn't right, we fix the pipeline before ingesting 200. |
| **2. Wave 1** | 8 in parallel, one per batch B1–B8 (~25 models each) | fetch → normalize → cel-ify → QA → catalog for every P1 model | every model passes the checks in section 6; independent reviewer pass on the catalog |
| **3. Waves 2+** | up to 8 | P2 next, then P3, in chunks (~50 per agent), on request | same checks |
| **4. Wrap-up** | 2 | skill update (how to pick and use library models), README, one demo film using library models, decide on the procedural eight, final review | reviewer approves |

Routing: batch agents start on `sonnet`; a batch that fails its checks twice moves to `opus`.

## 6. Acceptance checks (every library model)

- WHEN a model is fetched, THE manifest SHALL record its source URL, licence, author and sha256, and a refetch SHALL match the hash.
- WHEN it is normalized, THE rest pose SHALL face +Z, stand on y = 0 within 2 % of its height, be centred on x = z = 0, and match its target real-world height within 5 %.
- WHEN it renders in the lab in cel mode, AT LEAST 99 % of non-edge pixels SHALL be exact hexes of the chosen script, and the ink outline SHALL be closed (no holes, specks or inside-out parts).
- WHEN an animated model is sampled at the same time twice, THE two renders SHALL be identical.
- WHEN a clip is listed in `meta.json`, IT SHALL play in a lab montage with no missing or exploded parts, and feet SHALL meet the ground in contact frames.
- WHEN the catalog is regenerated, EVERY manifest entry SHALL have a `preview.png` and a CATALOG.md row.
- WHEN a film uses library models, `npx hyperframes lint` and `validate` SHALL pass, and the first frame SHALL not render before the models have loaded.

## 7. Risks

| risk | mitigation |
|---|---|
| Low-poly library models are stylized, not detailed anime; the owner may still find them off | the phase 1 pilot is a visual sign-off before any volume work |
| Packs differ in shape language (Kenney blocky, Quaternius rounder, Poly Haven photoreal) | the cel palette unifies colour; each film picks one style family; `style` is a catalog field |
| Quaternius comes through a third-party CDN | fetch once, keep our copy (CC0 allows it), pin by hash |
| Anime/Japan subjects (torii, shrine, sakura, katana, ramen, school) are thin in Western packs | marked as procedural or kitbash rows; built in phase 4 if wanted |
| Repo size | compress (meshopt, small or baked textures); measure in phase 1; Git LFS if it grows past ~200 MB |
| Skinned outlines and many characters slow a render | probe reports triangles; budget per film |
| Licences | CC0 by default; CC-BY only with `CREDITS.md`; nothing NC, ND or unverified |

## 8. Decisions needed from the owner

1. **Approach.** Library-first, code models for morphs and gaps, and lifting the "geometry in code only" rule for library models. *Recommended: yes.*
2. **Storage.** (a) Commit the compressed GLBs (wave 1 estimated at tens of MB) or (b) commit only the manifest plus a fetch script. *Recommended: (a), so a fresh clone can render films.*
3. **Licences.** CC0 only, or also CC-BY with a `CREDITS.md`? The CC0 VRM avatars carry a creator request not to resell them unmodified; include them or not? *Recommended: CC0 plus the few CC-BY models that fill a gap; avatars only if you're comfortable with that request.*
4. **The current procedural eight.** Replace where a library model is better, keep the frog (puff morph) and the AE86 (no library equivalent)? See section 2.
5. **Pilot sign-off.** Approve the look on six pilot models before wave 1.

<!-- COUNTS -->

## 9. Wave 1: the first ~200 models

<!-- WAVE1_TABLE -->

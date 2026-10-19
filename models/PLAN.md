# Model library plan

> **Status: approved; pipeline built.** The owner's decisions are in [section 8](#8-decisions-owner-answered). The pipeline is `harness/library/` (manual: [harness/library/README.md](../harness/library/README.md)); models land one per branch and PR in `models/library/<id>/`.
> Every candidate we found (all sources, ranked high to low priority): [CANDIDATES.md](CANDIDATES.md).
> Wave 1, the first ~200 models to build: [section 10](#10-wave-1-the-first-200-models).

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

### What happens to the current eight

**Owner's decision: none are replaced.** All eight code models stay; a library horse, ox, wolf or knight is added beside them, not instead of them. A code model is improved where there is a real opportunity (a pipeline feature it can use, a flaw the library version exposes), in its own PR.

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

**Verified again from the cloud container when the pipeline was built (Oct 2026), and it changes the routes:**

- `static.poly.pizza` and `poly.pizza` now answer with a Cloudflare bot challenge (403), and the Poly Pizza API needs a key. The plan's route for the 130 wave-1 Quaternius rows is gone; we do not work around the challenge.
- Quaternius's own Google Drive folders answer "Quota exceeded" for every file, even the 1 KB licence, from this network.
- **Quaternius packs come from OpenGameArt** (zip files with FBX, OBJ and .blend, CC0), for example the Farm Animals, Animal Pack Vol.2, Animated Fish, Animated Monsters, Animated Human, Animated Knight, Universal Animation Library 1 and 2, Animated Mech, RPG Characters, Food, Furniture, Cars, Houses, Nature, Stylized Nature MegaKit, Medieval Weapons and Ultimate Space Kit packs, and **from itch.io**. The itch.io free download is three plain requests (the page's form token, the download page, the upload's signed URL), not a bot check. `ingest.mjs` does both. FBX and .blend go through Blender's Python module.
- **itch.io also unblocks the 1,170 KayKit itch.io rows** marked X in CANDIDATES.md; they move to their scored tier as they are ingested.
- **Not reachable: Quaternius "Ultimate Animated Animals"** (horse, bull, wolf, fox, deer, stag, Shiba Inu, husky, cow, donkey, alpaca) and the other Drive-only packs. Wave-1 rows from them are substituted with the nearest reachable Quaternius pack (Farm Animals for horse and cow, Animal Pack Vol.2 for wolf and dog; Vol.2 holds only cat, dog, eagle, piranha and wolf, so the fox is the Khronos sample Fox, CC0 mesh with CC-BY 4.0 rig and clips), and the swap is written in the entry's `meta.json` and its PR. `plan/wave1.json` keeps the original rows as the record of intent; an entry's `meta.json` is the truth.
- Poly Haven's katana is `antique_katana_01` (`katana` and `katana_01` do not exist).
- Licences (owner): CC0, CC-BY with `CREDITS.md`, and free avatars. Nothing paid, nothing NC or ND.

Excluded, with reasons (they appear at the bottom of [CANDIDATES.md](CANDIDATES.md)): KayKit's itch.io packs (downloads go through a browser handshake; can be downloaded by hand), Kenney's FBX-only animated characters (need conversion), the Smithsonian scans (licence not verified per item), IPFS avatar collections (rate-limited, unverified), OpenGameArt .blend/FBX archives (need Blender), three.js examples credited to mirada or Mixamo (no licence or not redistributable), Poly Haven trees and cliffs (215–958 MB), and the Poly Pizza API (needs a key).

## 4. How a library model becomes film-ready

Each step becomes a script or a lab command in phase 1, so most of the work is automatic. A batch agent's job is to run it, look at the renders and fix what the automatic steps get wrong.

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

### As built

| step | command / file | notes |
|---|---|---|
| 1-3 | `npm run library:ingest -- <id>` (`harness/library/ingest.mjs`, `convert.py`) | recipe in the entry's `meta.json` (`ingest`); fetch types `file`, `zip`, `kenney`, `itch`; download sha256 pinned on first fetch; zips read in Node; Blender 4.2 (`pip install bpy==4.2.0`, Python 3.11) imports FBX/.blend/glTF/OBJ, normalizes under one `root` node and exports GLB with every action; `gltf-transform optimize` 4.5.1 with meshopt, no simplify, no palette, materials and meshes kept |
| 4-5 | `harness/lab/library.js` + `harness/lab/kit.js` | material name -> role -> two-tone pair, as code models; the kit's cel and hull shaders now carry three.js's skinning and morph chunks (code models render byte-identical); smooth shading normals by default, so faceted low-poly sources read as clean tone shapes |
| 6 | `model.pose("run@0.25")` | absolute: stops all actions, restores the rest pose, sets one action's time; loops wrap, one-shot clips clamp; `clipInfo[clip].lift` corrects a clip that sinks |
| 7 | `npm run lab -- --model models/library/<id> --clip/--frames/--strip`, `npm run probe -- ... --clip`, `npm run library:check -- <id>` | the check runs section 6 and writes `preview.png` (four views at rest plus a clip strip) and `meta.qa` |
| 8 | `npm run library:catalog` | `models/library/manifest.json`, `models/CATALOG.md`, `CREDITS.md`; `npm test` fails on an incomplete entry |
| 9 | `harness/library/README.md` "Into a film" | verified with a scratch film: GLB loaded through GLTFLoader before the first frame, lint and validate 0 errors |

## 5. Phases and agents (at most 8 at a time)

| phase | agents | what | gate before the next phase |
|---|---|---|---|
| **1. Pipeline** | 1 | build the pipeline on its own branch and PR (`harness/library/`, lab v3, the skinned cel shader and hull) | none: the owner waived the pilot sign-off; models start as soon as the pipeline PR is open |
| **2. Wave 1** | up to 8 in parallel, **one model per agent, branch and PR** (each in its own git worktree), P1 first in the order of section 10 | fetch → normalize → cel-ify → QA → catalog for one model; its PR carries `meta.json`, `model.glb`, `preview.png` and the regenerated catalog files | every model passes the checks in section 6; the owner merges each PR |
| **3. Waves 2+** | up to 8 | P2 next, then P3, in chunks (~50 per agent), on request | same checks |
| **4. Wrap-up** | 2 | skill update (how to pick and use library models), README, one demo film using library models, decide on the procedural eight, final review | reviewer approves |

Branches: the pipeline is `models/pipeline`; each model branch starts from it and its PR targets it, so a model PR shows only that model. When the pipeline PR merges into `main` and its branch is deleted, GitHub retargets the open model PRs to `main`. The batch labels below still group the work; they are no longer one agent each.

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

## 8. Decisions (owner answered)

1. **Approach: library-first**, with real artist-made models; the "geometry in code only" rule is lifted for library models. The goal is quality: models that look properly modelled and good when rendered.
2. **Storage: commit the compressed model files.** One model at a time per branch; several agents may run in parallel, each in its own git worktree and branch, one model each; each finished model is a PR to `nrknithin/html-anime`. The owner merges by hand.
3. **Licences: free only.** CC0, CC-BY with `CREDITS.md`, and free avatars. Nothing paid.
4. **The procedural eight stay.** Do not replace them; improve them where there is a real opportunity.
5. **No pilot sign-off.** Start one model at a time; fix this plan in a PR when it is missing something or wrong.

## 9. Totals and batches

**All candidates** ([CANDIDATES.md](CANDIDATES.md)): 4,965 rows (4,943 library candidates + 22 wave-1 gap and code rows), each listed once and ranked by one formula written at the top of that file: subject demand, animated, licence, style fit, file size, an anime/Japan bonus, a penalty for duplicate variants and tiles.

| tier | rows | meaning |
|---|---|---|
| P1 | 216 | wave 1 (section 10) |
| P2 | 235 | usable, score ≥ 70 |
| P3 | 1,502 | usable, score 40–69 |
| P4 | 1,684 | usable, score < 40: variants, tiles, odds and ends |
| X | 1,328 | blocked: 1,170 KayKit itch.io files, 96 avatars pending the licence decision, 36 OpenGameArt files needing conversion, 23 Smithsonian scans with unverified licences, 3 Kenney FBX-only characters, 3 oversized |

**Wave 1:** 216 rows = 194 library models + 14 gaps + 8 code rows. 101 animated. 191 CC0, 3 pending the licence decision. About 95 MB of single files before compression, plus 18 Kenney kit zips. By source: Quaternius 130, Kenney 53, KayKit 6, three.js 1, Poly Haven 1 (the katana), avatars 3.

Machine-readable: [`plan/wave1.json`](plan/wave1.json) has the exact download URL, licence, author, clips and batch of every wave-1 row; [`plan/candidates.json`](plan/candidates.json) has all 4,965 rows with their scores.

### Wave 1 findings (sources actually used)

Where the plan's source was unreachable, each model PR names the substitute and why in its `meta.json` (`source.note`). The pattern so far:

| plan row | shipped as | source | note |
|---|---|---|---|
| 1 Horse | `horse` | Quaternius Farm Animals (OpenGameArt) | coarser than the Ultimate Animated Animals horse |
| 2 Bull / Ox | `cow` | Quaternius Farm Animals | no free animated bull or ox anywhere; `ox.js` stays the bull |
| 3 Wolf | `wolf` | "[Animated] Wolf" by CoinCoin (OpenGameArt, CC-BY 4.0) | stronger than the Quaternius Vol.2 wolf (2 clips, 1 material) |
| 4 Fox | `fox` | Khronos glTF sample Fox (CC0 mesh, CC-BY 4.0 rig) | Animal Pack Vol.2 has no fox |
| 5 Deer | `deer` | "Old Deer Male" by CDmir (OpenGameArt, CC0) | no reachable Quaternius deer |
| 7, 9 Shiba / Dog | `dog` (a pug) | Quaternius Farm Animals `Pug.blend` | no free animated Shiba |
| 10 Cat | `cat` | Quaternius Animal Pack Vol.2 (OpenGameArt) | two clips |
| 58 T-Rex | `t-rex` | Quaternius Animated LowPoly Dinosaurs (itch.io) | the plan's pack, other route |
| 14, 15 Sheep, Pig | `sheep`, `pig` | Quaternius Farm Animals `.blend` files | the FBX files hold only Idle and Jump; no eat clip |
| 32 Small bird | gap | none good (the CC0 OpenGameArt cardinal is one material with a near-static idle) | a code model |
| 36 Crow / raven | `crow` | "Raven" by Teh_Bucket (OpenGameArt, CC0) | crow-sized; one-frame perch idle; flap loop |
| 37, 38, 39, 43 Shark, whale, dolphin, clownfish | `shark`, `whale`, `dolphin`, `clownfish` | Quaternius Animated Fish (OpenGameArt) | the plan's pack, other route; Swim only (no attack, death or fast swim) |
| 41 Koi | `koi` | Quaternius Animated Fish `Fish1` | no koi in the pack: a red-and-white carp shape without black patches; a code koi for close-ups |
| 64 Man | `man-casual` | Quaternius Ultimate Animated Character Pack (OpenGameArt) | chibi proportions, 11 clips, no run |
| 144 Torii | gap | none free and verified | build as a code model (vermilion pillars, black caps, nuki, curved kasagi, ~4 m) |
| 145 Sliding door, 146 Shoji wall, 147 Shrine hall | gap | none free and verified (the only OpenGameArt shrine is LGPL / CC-BY-SA; the rest are paid or unlicensed) | code models, with the torii as one Japanese-architecture set |
| 175 Classroom desk | `desk-teacher` | Kenney Furniture Kit | an all-wood teacher's desk; a student desk (wood top on a metal frame) is a code model |
| 187 Ramen | `ramen` | "Ramen" by DREAM_SEARCH_REPEAT (OpenGameArt, CC0) | noodles and toppings were painted on the texture and vanish in cel; a code model would read better |
| 205 Vending machine | `vending-machine` | "Voxel Vending Machine" by MonoTone (OpenGameArt, CC0) | Kenney's is a small snack box |
| 112, 114 Cars; 124, 125 Trains; 153, 154 Buildings | Kenney kits | as planned | chunky toy proportions at real height (a 3.7 m train car is 6.3 m long) |

Not used yet, worth a later kitbash: Quaternius **Universal Base Characters** (itch.io, CC0) are realistic-proportion bodies, but unclothed "superhero" meshes with separate hair; their clips live in the separate **Universal Animation Library** GLB (same skeleton). Everyday people from them need outfits and a clip-merge step in the pipeline.

### Gaps: no library source, built in phase 4 as code or kitbash

Torii gate, stone and paper lanterns (tōrō, chōchin), shoji screen and Japanese sliding door, shrine and temple halls (the Quaternius rows 144-148 are poly.pizza only), Japanese house, schoolgirl and schoolboy (outfit and recolour a Kenney mini character, or the heroine rig), samurai (man-kimono plus the katana via ingest.attach), dango, koi (with patches, for close-ups), a yumi (the only free one is CC-BY-SA), a clock tower, a food truck, a traditional windmill (Kenney's is a turbine), orc and mech. Better ramen and lanterns stay on the list too.

Found in a source search after wave 1 started, now being built or queued (all CC0 unless marked): bicycle (Quaternius Public Transport, OGA), sakura (OGA lowpoly-sakura-tree), bamboo (Kenney Nature Kit), airplane and helicopter (OGA low-poly singles), umbrella and fire hydrant (KayKit Mixed Bag 1 on itch, KayKit City Builder Bits on GitHub), udon (Kenney Food Kit bowl-broth), staff (Quaternius RPG Pack, OGA), pickaxe (Kenney Survival Kit), dumpster (Kenney City Kit Roads), guitar (KayKit Mixed Bag 1 or OGA classical-guitar), water tower (Kenney City Kit Industrial), bell tower (Quaternius Medieval Village Pack, OGA), songbird (Asset Quest Free Pond Kit, OGA), butterfly (OGA butterfly-animated), turtle (OGA turtle-0), lizard (OGA lizard, CC-BY 3.0), goblin and zombie (Quaternius Ultimate Animated Character Pack), Japanese school (OGA japanese-school, CC-BY 4.0, unchecked). The search notes are in the session scratchpad; quaternius.com packs link to Google Drive or Patreon only and stay out of reach.

A second search covered the rows 6–99 that had no entry yet. Results:
- **Already covered:** stag (`deer`), static bird (`songbird`), business man (`man-suit`), casual character (`man-casual`), hooded rogue (`rogue-kaykit`).
- **Built from new CC0 sources:** rat, frog, snake and spider (Quaternius Easy Animated Enemy Pack, itch); zebra and alpaca (Farm Animals, the alpaca is the llama); manta ray (Animated Fish); bee (Ultimate Platformer Pack); chick (Kenney Cube Pets); pigeon (OGA mujtaba-io .blend); mech (Animated Mech Pack); SWAT stand-in (UACP BlueSoldier_Male); blocky character (Kenney Blocky Characters).
- **CC-BY, credited:** orc (OGA umask007 "Ork"), food cart stand-in (OGA ouren "Chinese Food Cart").
- **Built as code:** torii, tōrō, chōchin, shrine hall, Japanese house, dango; goldfish, koi with patches, better ramen and a bamboo grove in progress.
- **No usable source:** husky, donkey, raccoon, pufferfish, cartoon lizard, Japanese temple (only LGPL/SA), astronaut (the only animated one is a third-party repost of the Ultimate Space Kit, not used).
- **Blocked:** VRM avatars (licence decision pending).

Limits found on the way: no colour script has green (dango, bamboo, orc skin and leaves fall back to tan, red or blue); the pipeline flattens a texture to one colour per triangle, so painted faces on box characters (Kenney Blocky) are lost.

### Batches for wave 1 (8 agents in parallel)

| batch | rows | contents |
|---|---|---|
| B1 | 29 | animals: Quaternius Ultimate Animals and Animated Animals, Kenney Cube Pets, frog, snake |
| B2 | 34 | creatures, dinosaurs, sea life, birds, insects |
| B3a | 17 | KayKit characters (Knight, Barbarian, Mage, two Rogues, Skeleton), RobotExpressive, Kenney mini and blocky characters, avatars (if approved) |
| B3b | 17 | Quaternius people (man, woman, suit, dress, Shaun, Sam, Matt, the 24-clip set) and the ninja |
| B4 | 28 | land, water and space vehicles |
| B5 | 28 | buildings and nature |
| B7 | 20 | household props and food |
| B8 | 21 | weapons, tools, street props, misc |

The 22 gap and code rows are not download work; they move to phase 4.

**Style flag:** Kenney's Cube Pets (elephant, giraffe, lion, monkey, parrot, penguin, crab, caterpillar) are deliberately blocky. They are the only animated versions found, so they stand in until a better source turns up, and the catalog marks them.

## 10. Wave 1: the first ~200 models

Grouped by category. *Pri* is the order inside wave 1 (P1 first). *Batch* is the agent that ingests it. Exact URLs are in `plan/wave1.json`.

### Mammals (28)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 1 | Horse | Quaternius · Ultimate Animated Animals | 26 (Attack_Headbutt, Attack_Kick, Death, Gallop_Jump) | CC0 | 1.1 MB | P1 | B1 |
| 2 | Bull / Ox | Quaternius · Ultimate Animated Animals | 25 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.0 MB | P1 | B1 |
| 3 | Wolf | Quaternius · Ultimate Animated Animals | 24 (Attack, Death, Gallop, Gallop_Jump) | CC0 | 990 KB | P1 | B1 |
| 4 | Fox | Quaternius · Ultimate Animated Animals | 24 (Attack, Death, Gallop, Gallop_Jump) | CC0 | 960 KB | P1 | B1 |
| 5 | Deer | Quaternius · Ultimate Animated Animals | 26 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.0 MB | P1 | B1 |
| 6 | Stag | Quaternius · Ultimate Animated Animals | 26 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.0 MB | P2 | B1 |
| 7 | Shiba Inu | Quaternius · Ultimate Animated Animals | 24 (Attack, Death, Gallop, Gallop_Jump) | CC0 | 850 KB | P1 | B1 |
| 8 | Husky | Quaternius · Ultimate Animated Animals | 24 (Attack, Death, Gallop, Gallop_Jump) | CC0 | 930 KB | P2 | B1 |
| 9 | Dog | Quaternius · Animated Animals | 8 (Death, Idle, Idle_Eating, Jump_Loop) | CC0 | 300 KB | P1 | B1 |
| 10 | Cat | Quaternius · Animated Animals | 8 (Death, Idle, Idle_Eating, Jump_Loop) | CC0 | 240 KB | P1 | B1 |
| 11 | Cow | Quaternius · Ultimate Animated Animals | 25 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.0 MB | P2 | B1 |
| 12 | Donkey | Quaternius · Ultimate Animated Animals | 26 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.1 MB | P3 | B1 |
| 13 | Alpaca | Quaternius · Ultimate Animated Animals | 26 (Attack_Headbutt, Attack_Kick, Death, Gallop) | CC0 | 1.1 MB | P3 | B1 |
| 14 | Sheep | Quaternius · Animated Animals | 8 (Death, Idle, Idle_Eating, Jump_Loop) | CC0 | 220 KB | P2 | B1 |
| 15 | Pig | Quaternius · Animated Animals | 8 (Death, Idle, Idle_Eating, Jump_Loop) | CC0 | 300 KB | P2 | B1 |
| 16 | Rabbit | Quaternius · Animated Animals (kitchen rig) | 30 (Death, Idle, Idle_Holding, Jump) | CC0 | 640 KB | P1 | B1 |
| 17 | Panda | Quaternius · Animated Animals (kitchen rig) | 30 (Death, Idle, Idle_Holding, Jump) | CC0 | 630 KB | P2 | B1 |
| 18 | Bat | Quaternius · Animated Creatures/Dinosaurs | 5 (Bat_Attack, Bat_Attack2, Bat_Death, Bat_Flying) | CC0 | 230 KB | P2 | B1 |
| 19 | Rat | Quaternius · Animated Creatures/Dinosaurs | 6 (Rat_Attack, Rat_Death, Rat_Idle, Rat_Jump) | CC0 | 550 KB | P3 | B1 |
| 20 | Zebra | Quaternius · Animated models (misc) | 6 (Death, Idle, Jump, Run) | CC0 | 380 KB | P3 | B1 |
| 21 | Elephant | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 140 KB | P2 | B1 |
| 22 | Giraffe | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 130 KB | P3 | B1 |
| 23 | Lion | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 170 KB | P2 | B1 |
| 24 | Monkey | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 170 KB | P3 | B1 |
| 25 | Raccoon (tanuki stand-in) | Quaternius · Animated Animals | 8 (Death, Idle, Idle_Eating, Jump_Loop) | CC0 | 240 KB | P3 | B1 |
| 26 | Horse (procedural horse.js) | procedural (code) | yes | project | - | P2 | B8 |
| 27 | Ox (procedural ox.js) | procedural (code) | yes | project | - | P2 | B8 |
| 28 | Wolf (procedural wolf.js) | procedural (code) | yes | project | - | P2 | B8 |

### Birds (8)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 29 | Chicken | Quaternius · Animated models (misc) | 5 (Attack, Death, Idle, Idle_Peck) | CC0 | 170 KB | P2 | B2 |
| 30 | Chick | Quaternius · Animated models (misc) | 5 (Attack, Death, Idle, Idle_Peck) | CC0 | 160 KB | P3 | B2 |
| 31 | Pigeon | Quaternius · Cute Creatures | 9 (Dance, Death, Idle, Jump) | CC0 | 110 KB | P2 | B2 |
| 32 | Small bird (Birb) | Quaternius · Cute Creatures | 9 (Dance, Death, Idle, Jump) | CC0 | 170 KB | P1 | B2 |
| 33 | Parrot | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 150 KB | P3 | B2 |
| 34 | Penguin | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 130 KB | P3 | B2 |
| 35 | Bird (static) | Quaternius · Static models | - | CC0 | 50 KB | P3 | B2 |
| 36 | Crow / raven | Teh_Bucket · Raven (OpenGameArt; filled from row 32, see `models/library/crow`) | 2 (idle perch, fly) | CC0 | 80 KB | P2 | B8 |

### Sea life (10)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 37 | Shark | Quaternius · Ultimate Fish | 6 (Attack, Death, Swimming_Fast, Swimming_Impulse) | CC0 | 140 KB | P2 | B2 |
| 38 | Whale | Quaternius · Low Poly Sea Animals | (Swim) | CC0 | 70 KB | P2 | B2 |
| 39 | Dolphin | Quaternius · Low Poly Sea Animals | (Swim) | CC0 | 60 KB | P2 | B2 |
| 40 | Manta ray | Quaternius · Low Poly Sea Animals | (Swim) | CC0 | 100 KB | P3 | B2 |
| 41 | Koi | Quaternius · Ultimate Fish | 6 (Attack, Death, Swimming_Fast, Swimming_Impulse) | CC0 | 160 KB | P1 | B2 |
| 42 | Goldfish | Quaternius · Ultimate Fish | 6 (Attack, Death, Swimming_Fast, Swimming_Impulse) | CC0 | 180 KB | P2 | B2 |
| 43 | Clownfish | Quaternius · Ultimate Fish | 6 (Attack, Death, Swimming_Fast, Swimming_Impulse) | CC0 | 170 KB | P2 | B2 |
| 44 | Pufferfish | Quaternius · Ultimate Fish | 6 (Attack, Death, Swimming_Fast, Swimming_Impulse) | CC0 | 240 KB | P3 | B2 |
| 45 | Crab | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 150 KB | P3 | B2 |
| 46 | Squid | Quaternius · Static models | - | CC0 | 50 KB | P3 | B2 |

### Reptiles & amphibians (7)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 47 | Frog | Quaternius · Animated Creatures/Dinosaurs | (Frog_Attack, Frog_Death, Frog_Idle, Frog_Jump) | CC0 | 590 KB | P2 | B1 |
| 48 | Frog (cute) | Quaternius · Animated models (misc) | 14 (Death, Idle, Jump, Jump_Idle) | CC0 | 380 KB | P3 | B1 |
| 49 | Snake | Quaternius · Animated Creatures/Dinosaurs | (Snake_Attack, Snake_Idle, Snake_Jump, Snake_Walk) | CC0 | 220 KB | P3 | B1 |
| 50 | Cartoon dino lizard | Quaternius · Animated models (misc) | 14 (Death, Idle, Jump, Jump_Idle) | CC0 | 400 KB | P3 | B1 |
| 51 | Turtle / tortoise | gap | - | - | - | P3 | B8 |
| 52 | Lizard / crocodile | gap | - | - | - | P3 | B8 |
| 53 | Frog (procedural frog.js) | procedural (code) | yes | project | - | P1 | B8 |

### Insects (4)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 54 | Bee | Quaternius · Cute Creatures | (Death, Flying, Bite_Front, HitRecieve) | CC0 | 190 KB | P2 | B2 |
| 55 | Spider | Quaternius · Animated Creatures/Dinosaurs | 5 (Spider_Attack, Spider_Death, Spider_Idle, Spider_Jump) | CC0 | 450 KB | P3 | B2 |
| 56 | Butterfly | gap | - | - | - | P1 | B8 |
| 57 | Caterpillar | Kenney · Cube Pets | 8 (idle, walk, run, dance) | CC0 | 130 KB | P3 | B2 |

### Dinosaurs (6)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 58 | T-Rex | Quaternius · Animated Creatures/Dinosaurs | 6 (TRex_Attack, TRex_Death, TRex_Idle, TRex_Jump) | CC0 | 340 KB | P1 | B2 |
| 59 | Triceratops | Quaternius · Animated Creatures/Dinosaurs | 6 (Triceratops_Attack, Triceratops_Death, Triceratops_Idle, Triceratops_Jump) | CC0 | 310 KB | P2 | B2 |
| 60 | Velociraptor | Quaternius · Animated Creatures/Dinosaurs | 6 (Velociraptor_Attack, Velociraptor_Death, Velociraptor_Idle, Velociraptor_Jump) | CC0 | 290 KB | P2 | B2 |
| 61 | Stegosaurus | Quaternius · Animated Creatures/Dinosaurs | 6 (Stegosaurus_Attack, Stegosaurus_Death, Stegosaurus_Idle, Stegosaurus_Jump) | CC0 | 420 KB | P3 | B2 |
| 62 | Apatosaurus | Quaternius · Animated Creatures/Dinosaurs | 6 (Apatosaurus_Attack, Apatosaurus_Idle, Apatosaurus_Jump, Apatosaurus_Run) | CC0 | 380 KB | P3 | B2 |
| 63 | Parasaurolophus | Quaternius · Animated Creatures/Dinosaurs | 6 (Parasaurolophus_Attack, Parasaurolophus_Death, Parasaurolophus_Idle, Parasaurolophus_Jump) | CC0 | 290 KB | P3 | B2 |

### Human characters (29)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 64 | Man (casual) | Quaternius · Animated Man/Woman | 11 (Man_Death, Man_Idle, Man_Jump, Man_Punch) | CC0 | 500 KB | P1 | B3b |
| 65 | Woman (casual) | Quaternius · Animated Man/Woman | 11 (Female_Death, Female_Idle, Female_Jump, Female_Punch) | CC0 | 590 KB | P1 | B3b |
| 66 | Woman in dress | Quaternius · Animated Man/Woman | 11 (Female_Death, Female_Idle, Female_Jump, Female_Punch) | CC0 | 480 KB | P1 | B3b |
| 67 | Man in suit | Quaternius · Animated Man/Woman | 11 (Man_Death, Man_Idle, Man_Jump, Man_Punch) | CC0 | 580 KB | P2 | B3b |
| 68 | Character Shaun | Quaternius · Animated models (misc) | 20 (Death, Idle, Idle_Gun, Jump) | CC0 | 860 KB | P2 | B3b |
| 69 | Character Sam | Quaternius · Animated models (misc) | 20 (Death, Idle, Idle_Gun, Jump) | CC0 | 730 KB | P3 | B3b |
| 70 | Character Matt | Quaternius · Animated models (misc) | 20 (Death, Idle, Idle_Gun, Jump) | CC0 | 670 KB | P3 | B3b |
| 71 | Adventurer | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.6 MB | P2 | B3b |
| 72 | Animated Woman | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.5 MB | P1 | B3b |
| 73 | Punk | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.5 MB | P3 | B3b |
| 74 | Business man | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.5 MB | P2 | B3b |
| 75 | Farmer | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.4 MB | P3 | B3b |
| 76 | SWAT | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.6 MB | P3 | B3b |
| 77 | Worker | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.3 MB | P3 | B3b |
| 78 | Casual character | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.4 MB | P2 | B3b |
| 79 | Astronaut | Quaternius · Animated Characters (24-clip rig) | 24 (Death, Idle, Idle_Gun, Idle_Gun_Pointing) | CC0 | 1.9 MB | P3 | B3b |
| 80 | Mini character female A | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 270 KB | P1 | B3a |
| 81 | Mini character female B | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 250 KB | P2 | B3a |
| 82 | Mini character female C | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 250 KB | P3 | B3a |
| 83 | Mini character male A | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 240 KB | P1 | B3a |
| 84 | Mini character male B | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 240 KB | P2 | B3a |
| 85 | Mini character male C | Kenney · Mini Characters | 32 (idle, walk, jump, sit) | CC0 | 260 KB | P3 | B3a |
| 86 | Blocky character A | Kenney · Blocky Characters | 27 (idle, walk, sit, sprint) | CC0 | 110 KB | P3 | B3a |
| 87 | Schoolgirl | gap | - | - | - | P1 | B8 |
| 88 | Schoolboy | gap | - | - | - | P1 | B8 |
| 89 | VRoid anime girl (pixiv sample) | pixiv three-vrm examples | - | VRM 1.0 (pending licence decision) | 10.8 MB | P3 | B3a |
| 90 | Olivia (VRM) | VRM · 100avatars-r1 | - | CC0 (pending licence decision) | 1.7 MB | P3 | B3a |
| 91 | Shiro (VRM) | VRM · 100avatars-r1 | - | CC0 (pending licence decision) | 1.3 MB | P3 | B3a |
| 92 | Heroine (procedural heroine.js) | procedural (code) | yes | project | - | P1 | B8 |

### Fantasy & monsters (19)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 93 | Knight | KayKit · Character Pack Adventures | 76 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab) | CC0 | 3.7 MB | P1 | B3a |
| 94 | Barbarian | KayKit · Character Pack Adventures | 76 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab) | CC0 | 3.6 MB | P2 | B3a |
| 95 | Mage | KayKit · Character Pack Adventures | 76 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab) | CC0 | 3.6 MB | P2 | B3a |
| 96 | Rogue | KayKit · Character Pack Adventures | 76 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab) | CC0 | 3.6 MB | P3 | B3a |
| 97 | Rogue (hooded) | KayKit · Character Pack Adventures | 76 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab) | CC0 | 3.6 MB | P3 | B3a |
| 98 | Skeleton warrior | KayKit · Character Pack Skeletons | 95 (1H_Melee_Attack_Chop, 1H_Melee_Attack_Jump_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal) | CC0 | 4.9 MB | P2 | B3a |
| 99 | Ninja | Quaternius · Animated models (misc) | 14 (Death, Idle, Jump, Jump_Idle) | CC0 | 460 KB | P1 | B3b |
| 100 | Samurai | gap | - | - | - | P1 | B8 |
| 101 | Goblin | Quaternius · Animated models (misc) | 7 (Attack, Death, Idle, Jump) | CC0 | 220 KB | P3 | B2 |
| 102 | Orc | Quaternius · Animated models (misc) | 14 (Death, Idle, Jump, Jump_Idle) | CC0 | 510 KB | P3 | B2 |
| 103 | Ghost | Quaternius · Cute Monsters | 8 (Death, Fast_Flying, Flying_Idle, Punch) | CC0 | 200 KB | P2 | B2 |
| 104 | Zombie | Quaternius · Animated models (misc) | 32 (Death, Idle, Idle_Attack, Jump) | CC0 | 980 KB | P3 | B2 |
| 105 | Demon (oni stand-in) | Quaternius · Animated models (misc) | 14 (Death, Idle, Jump, Jump_Idle) | CC0 | 490 KB | P2 | B2 |
| 106 | Slime | Quaternius · Animated Creatures/Dinosaurs | (Slime_Attack, Slime_Death, Slime_Idle, Slime_Walk) | CC0 | 170 KB | P3 | B2 |
| 107 | Robot (RobotExpressive) | three.js examples | 14 (Dance, Death, Idle, Jump) | CC0 | 450 KB | P1 | B3a |
| 108 | Mech | Quaternius · Robots & Mechs | 17 (Dance, Death, Idle, Jump) | CC0 | 670 KB | P2 | B2 |
| 109 | Dragon | Quaternius · Cute Monsters | 8 (Death, Fast_Flying, Flying_Idle, Punch) | CC0 | 250 KB | P2 | B2 |
| 110 | Dragon (procedural dragon.js) | procedural (code) | yes | project | - | P2 | B8 |
| 111 | Knight (procedural knight.js) | procedural (code) | yes | project | - | P2 | B8 |

### Land vehicles (20)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 112 | Sports sedan (AE86-like stand-in) | Kenney · Car Kit | - | CC0 | 170 KB | P1 | B4 |
| 113 | Hatchback sports | Kenney · Car Kit | - | CC0 | 190 KB | P2 | B4 |
| 114 | Sedan | Kenney · Car Kit | - | CC0 | 170 KB | P1 | B4 |
| 115 | SUV | Kenney · Car Kit | - | CC0 | 200 KB | P2 | B4 |
| 116 | Taxi | Kenney · Car Kit | - | CC0 | 170 KB | P2 | B4 |
| 117 | Police car | Kenney · Car Kit | - | CC0 | 190 KB | P2 | B4 |
| 118 | Ambulance | Kenney · Car Kit | - | CC0 | 230 KB | P3 | B4 |
| 119 | Fire truck | Kenney · Car Kit | - | CC0 | 230 KB | P3 | B4 |
| 120 | Van | Kenney · Car Kit | - | CC0 | 170 KB | P2 | B4 |
| 121 | Delivery truck | Kenney · Car Kit | - | CC0 | 240 KB | P2 | B4 |
| 122 | Tractor | Kenney · Car Kit | - | CC0 | 170 KB | P3 | B4 |
| 123 | Race kart | Kenney · Car Kit | - | CC0 | 250 KB | P3 | B4 |
| 124 | Bullet train (shinkansen) | Kenney · Train Kit | - | CC0 | 110 KB | P1 | B4 |
| 125 | City commuter train | Kenney · Train Kit | - | CC0 | 100 KB | P1 | B4 |
| 126 | Tram | Kenney · Train Kit | - | CC0 | 130 KB | P2 | B4 |
| 127 | Steam locomotive | Kenney · Train Kit | - | CC0 | 150 KB | P3 | B4 |
| 128 | Sushi truck / food truck | Quaternius · Static models | - | CC0 | 550 KB | P3 | B4 |
| 129 | Kick scooter | Kenney · Mini Skate | - | CC0 | 40 KB | P3 | B4 |
| 130 | Bicycle | gap | - | - | - | P1 | B8 |
| 131 | AE86 (procedural ae86.js) | procedural (code) | yes | project | - | P1 | B8 |

### Air / water / space vehicles (12)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 132 | Fishing boat | Kenney · Watercraft Kit | - | CC0 | 20 KB | P2 | B4 |
| 133 | Row boat | Kenney · Watercraft Kit | - | CC0 | 20 KB | P3 | B4 |
| 134 | Sail boat | Kenney · Watercraft Kit | - | CC0 | 30 KB | P2 | B4 |
| 135 | Speed boat | Kenney · Watercraft Kit | - | CC0 | 20 KB | P3 | B4 |
| 136 | Pirate ship | Kenney · Pirate Kit | - | CC0 | 160 KB | P2 | B4 |
| 137 | Ocean liner | Kenney · Watercraft Kit | - | CC0 | 220 KB | P3 | B4 |
| 138 | Spaceship | Quaternius · Static models | - | CC0 | 160 KB | P2 | B4 |
| 139 | Speeder craft | Kenney · Space Kit | - | CC0 | 20 KB | P3 | B4 |
| 140 | Planetary rover | Kenney · Space Kit | - | CC0 | 10 KB | P3 | B4 |
| 141 | UFO | Kenney · Tower Defense Kit | - | CC0 | 40 KB | P3 | B4 |
| 142 | Airplane | gap | - | - | - | P2 | B8 |
| 143 | Helicopter | gap | - | - | - | P3 | B8 |

### Buildings (15)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 144 | Torii gate | Quaternius · Static models | - | CC0 | 20 KB | P1 | B5 |
| 145 | Japanese sliding door | Quaternius · Static models | - | CC0 | 10 KB | P1 | B5 |
| 146 | Shoji wall | Quaternius · Static models | - | CC0 | 30 KB | P1 | B5 |
| 147 | Temple / shrine hall | Quaternius · Static models | - | CC0 | 30 KB | P1 | B5 |
| 148 | Wooden temple | Quaternius · Static models | - | CC0 | 340 KB | P2 | B5 |
| 149 | Japanese house | gap | - | - | - | P1 | B8 |
| 150 | School building | gap | - | - | - | P1 | B8 |
| 151 | House | Quaternius · Static models | - | CC0 | 160 KB | P1 | B5 |
| 152 | Town house | Quaternius · Static models | - | CC0 | 280 KB | P2 | B5 |
| 153 | Suburban house | Kenney · City Kit Suburban | - | CC0 | 100 KB | P1 | B5 |
| 154 | Apartment / office block | Kenney · City Kit Commercial | - | CC0 | 110 KB | P1 | B5 |
| 155 | Skyscraper | Kenney · City Kit Commercial | - | CC0 | 110 KB | P2 | B5 |
| 156 | Windmill | Kenney · City Kit Industrial | - | CC0 | 50 KB | P3 | B5 |
| 157 | Water tower | Quaternius · Static models | - | CC0 | 60 KB | P3 | B5 |
| 158 | Bell / clock tower | Quaternius · Static models | - | CC0 | 730 KB | P3 | B5 |

### Nature (16)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 159 | Cherry blossom (sakura) tree | gap | - | - | - | P1 | B8 |
| 160 | Tree | Quaternius · Static models | - | CC0 | 50 KB | P1 | B5 |
| 161 | Pine tree | Quaternius · Static models | - | CC0 | 90 KB | P2 | B5 |
| 162 | Autumn tree | Quaternius · Static models | - | CC0 | 160 KB | P2 | B5 |
| 163 | Bamboo | Quaternius · Static models | - | CC0 | 30 KB | P1 | B5 |
| 164 | Palm tree | Quaternius · Static models | - | CC0 | 120 KB | P3 | B5 |
| 165 | Willow | Quaternius · Static models | - | CC0 | 150 KB | P3 | B5 |
| 166 | Dead tree | Quaternius · Static models | - | CC0 | 40 KB | P3 | B5 |
| 167 | Flower group | Quaternius · Static models | - | CC0 | 1.3 MB | P2 | B5 |
| 168 | Grass | Quaternius · Static models | - | CC0 | 20 KB | P2 | B5 |
| 169 | Bush | Quaternius · Static models | - | CC0 | 80 KB | P2 | B5 |
| 170 | Mushroom | Kenney · Nature Kit | - | CC0 | 10 KB | P3 | B5 |
| 171 | Rock | Quaternius · Static models | - | CC0 | 30 KB | P2 | B5 |
| 172 | Lily pad | Quaternius · Static models | - | CC0 | 20 KB | P3 | B5 |
| 173 | Cactus | Quaternius · Static models | - | CC0 | 20 KB | P3 | B5 |
| 174 | Cloud | Quaternius · Static models | - | CC0 | 30 KB | P2 | B5 |

### Household props (12)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 175 | Classroom desk | Kenney · Furniture Kit | - | CC0 | 20 KB | P1 | B7 |
| 176 | Classroom chair | Kenney · Furniture Kit | - | CC0 | 40 KB | P1 | B7 |
| 177 | Sofa | Quaternius · Static models | - | CC0 | 20 KB | P2 | B7 |
| 178 | Table | Quaternius · Static models | - | CC0 | 50 KB | P2 | B7 |
| 179 | Bed (single) | Quaternius · Static models | - | CC0 | 20 KB | P2 | B7 |
| 180 | Bookcase | Quaternius · Static models | - | CC0 | 590 KB | P3 | B7 |
| 181 | Table lamp | Quaternius · Static models | - | CC0 | 10 KB | P3 | B7 |
| 182 | TV | Quaternius · Static models | - | CC0 | 30 KB | P2 | B7 |
| 183 | Computer | Quaternius · Static models | - | CC0 | 40 KB | P3 | B7 |
| 184 | Radio | Quaternius · Static models | - | CC0 | 30 KB | P3 | B7 |
| 185 | Fridge | Quaternius · Static models | - | CC0 | 20 KB | P3 | B7 |
| 186 | Bench | Quaternius · Static models | - | CC0 | 20 KB | P3 | B7 |

### Food (8)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 187 | Ramen | Quaternius · Static models | - | CC0 | 200 KB | P1 | B7 |
| 188 | Sushi nigiri | Quaternius · Static models | - | CC0 | 10 KB | P1 | B7 |
| 189 | Onigiri | Quaternius · Static models | - | CC0 | 20 KB | P1 | B7 |
| 190 | Dango | Quaternius · Static models | - | CC0 | 50 KB | P2 | B7 |
| 191 | Udon | Quaternius · Static models | - | CC0 | 150 KB | P2 | B7 |
| 192 | Sushi roll | Quaternius · Static models | - | CC0 | 10 KB | P2 | B7 |
| 193 | Pizza | Quaternius · Static models | - | CC0 | 60 KB | P3 | B7 |
| 194 | Cake | Kenney · Food Kit | - | CC0 | 70 KB | P3 | B7 |

### Weapons & tools (10)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 195 | Katana | Poly Haven | - | CC0 | 650 KB | P1 | B8 |
| 196 | Sword | Quaternius · Static models | - | CC0 | 50 KB | P2 | B8 |
| 197 | Bow | Quaternius · Static models | - | CC0 | 40 KB | P2 | B8 |
| 198 | Axe | Quaternius · Static models | - | CC0 | 50 KB | P3 | B8 |
| 199 | Spear | Quaternius · Static models | - | CC0 | 150 KB | P3 | B8 |
| 200 | Round shield | Quaternius · Static models | - | CC0 | 70 KB | P3 | B8 |
| 201 | Staff | Quaternius · Static models | - | CC0 | 10 KB | P3 | B8 |
| 202 | Dagger | Quaternius · Static models | - | CC0 | 40 KB | P3 | B8 |
| 203 | Scythe | Quaternius · Static models | - | CC0 | 80 KB | P3 | B8 |
| 204 | Pickaxe | Quaternius · Static models | - | CC0 | 20 KB | P3 | B8 |

### Street props (8)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 205 | Vending machine | Kenney · Mini Arcade | - | CC0 | 20 KB | P1 | B8 |
| 206 | Traffic light | Quaternius · Static models | - | CC0 | 40 KB | P2 | B8 |
| 207 | Street light | Quaternius · Static models | - | CC0 | 20 KB | P2 | B8 |
| 208 | Fire hydrant | Quaternius · Static models | - | CC0 | 50 KB | P3 | B8 |
| 209 | Bench (street) | Kenney · Mini Skate | - | CC0 | 20 KB | P3 | B8 |
| 210 | Lantern (stone/paper stand-in) | Kenney · Fantasy Town Kit | - | CC0 | 20 KB | P1 | B8 |
| 211 | Traffic cone | Kenney · Car Kit | - | CC0 | 20 KB | P3 | B8 |
| 212 | Dumpster | Quaternius · Static models | - | CC0 | 20 KB | P3 | B8 |

### Misc props (4)

| # | Model | Source · pack | Animated (key clips) | Licence | Size | Pri | Batch |
|---|---|---|---|---|---|---|---|
| 213 | Treasure chest (animated) | Quaternius · Animated models (misc) | (Chest_Close, Chest_Open, Chest_Close, Chest_Open) | CC0 | 400 KB | P3 | B8 |
| 214 | Guitar | Quaternius · Static models | - | CC0 | 130 KB | P3 | B8 |
| 215 | Key | Quaternius · Static models | - | CC0 | 30 KB | P3 | B8 |
| 216 | Umbrella | gap | - | - | - | P2 | B8 |

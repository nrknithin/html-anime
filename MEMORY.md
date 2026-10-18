repo: cloned from nrknithin/html-anime, a copy of upstream blixvip/html-anime (author wasely); blixvip URLs in README/site.js/LICENSE were set deliberately upstream (d86b15a), change only if this fork is published separately
site: site.js imports SCRIPTS + compileBrief from harness/compile.js, so compile.js is the single source of plans/palettes
site: .preview stage (SVG, timeline, Hold) hidden on purpose in b50d124 "Let the film lead the page"; its markup + JS loop are still live but invisible
tests: `npm test` = one assert script (harness/compile.test.mjs), prints "compile: ok"; films are checked with `npx hyperframes@0.8.171 lint` in the film dir (writes no files)
3d: compileBrief takes medium "cel"(default, output byte-identical)|"3d"; 3d sheet adds "## 3D" + skills/html-anime-3d/SKILL.md (between camera and render) + films/lantern reference
3d-lib: three.js 0.186.1 via importmap CDN, window.THREE set; GSAP stays the only clock (anime.js not used; HyperFrames would seek window.__hfAnime in ms)
3d-render: draw only from hf-seek e.detail.time (seconds) + draw(window.__hfThreeTime||0) at init; renderer at the sheet size, pixelRatio 1, alpha, preserveDrawingBuffer
3d-color: two-tone ShaderMaterial, uniforms raw sRGB hex/255, no colorspace/tonemapping chunks = exact sheet hex; one LIGHT (0.62,0.72,0.3) normalized; threshold 0.35 solids, -0.25 glowing practicals
3d-hull: BackSide hull pushed 5px in clip space; hullNormals() averages normals per position so box/cylinder corners close
3d-camera: three-quarter angles, a face aimed straight at camera reads as one flat tone
lint: hyperframes warns past 300 structural lines (composition_file_too_large expected once models are inlined); nested_structure_needs_subcomposition warnings accepted (roof has them)
fps: every film root carries data-fps="24" (roof, lantern, ox-and-frog, render skill template); without it hyperframes renders at 30
stills: `npx hyperframes@0.8.171 snapshot --at <t> --no-end` on a scratch copy of the film dir (keeps .hyperframes/ out of repo)
render: `npx hyperframes render <scratch copy> -o <mp4>` needs ffmpeg (ffmpeg-static lives in scratch tools)
lab: `npm run lab -- --model <path> --views left,front,three4,top --mode cel|clay|sil --pose <p> --out <png>` ~1.1 s/shot, ~0.3 s/shot with --batch; --info prints bbox/mpp JSON; relative --out resolves against the repo root (use renders/); harness/lab/README.md is the manual
lab-views: front = camera +Z, left = camera +X (subject faces image-left), right = -X, top = +Y; ortho cells share one m/px
lab-ref: --ref-mode overlay|beside|edge (edge = red model outline on the full-opacity photo); the photo is scaled so crop height = model bbox height, centred on the bbox; --ref-scale, --ref-offset (m); author landmarks at m/px = model height / crop height px
lab-v2: --focus <joint> [--radius r], --light x,y,z (cel only), --hide a,b / --only <joint> (needs .name or joint key), --montage p1,p2 (first view, one scale); /c/ paths normalized
probe: `npm run probe -- --model <p> --poses all [--json]` (node, no browser, ms per pose): bbox, minY, tris by mesh, joint world positions, contacts; ground a pose with pos.y = pos.y - minY + clearance
models: models/<name>.js = meta{name,height,script,colors,poses} + build(THREE, kit, colors) -> {root, joints, pose(name)}; meters, +Y up, faces +Z, feet on y=0; no imports/random/clock (lab rejects them)
model-skill: skills/html-anime-model (SKILL.md + references/{references,geometry,cel-and-ink,rigging,lab}.md + references/subjects/{quadrupeds,creatures,humanoids,vehicles}.md); into a film = each model in its own IIFE returning {meta, build}, root in a placement group, re-pose only on pose-key change
models-done: horse, ox, frog, dragon, knight, heroine, ae86, wolf in models/*.js; finals in models/renders/ (tracked: .gitignore ignores only the root /renders/); scripts noon (horse, ox, frog, dragon, ae86), indigo (knight, heroine, wolf)
wolf: built in the main session from the model skill alone as its validation (6 trials, 6.8k tris, poses rest/run-a/run-b/howl); the gaps it found were patched into the skill
frog: real scale ~0.1 m; build() also returns puff(0..1) (ring-table morph to a sphere); poses puff-1/2/3 = puff(0.33/0.66/1.0)
ox: poses rest, walk-a, walk-b, drink (muzzle ~0.04 m above ground), stomp (front hoof ~0.3 m up); 1.75 m tall
light-side: fixed LIGHT (0.62,0.72,0.3) puts every model's -X side and straight-on front in shade; film cameras favour the subject's left / front-left three-quarter
thresholds: solids 0.35, skin ~-0.2, face -0.25, steel 0.45, glow facing away from light -0.7
fable: films/ox-and-frog/index.html (kit + frog + ox inlined, each model in an IIFE; 1468 lines; lint 0 errors, 11 warnings); MP4 at renders/ox-and-frog.mp4 (gitignored)
compile-bugs (pre-existing, unfixed): prototype keys pass aspect/script lookup (compile.js:187,192), compileBrief(null) throws (:174), multi-line dialogue breaks the quote (:224), slugFrom drops non-ASCII ("Kokuyō"→"kokuy") (:156)

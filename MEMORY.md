repo: cloned from nrknithin/html-anime, a copy of upstream blixvip/html-anime (author wasely); blixvip URLs in README/site.js/LICENSE were set deliberately upstream (d86b15a), change only if this fork is published separately
site: site.js imports SCRIPTS + compileBrief from harness/compile.js, so compile.js is the single source of plans/palettes
site: .preview stage (SVG, timeline, Hold) hidden on purpose in b50d124 "Let the film lead the page"; its markup + JS loop are still live but invisible
tests: `npm test` = one assert script (harness/compile.test.mjs), prints "compile: ok"; no hyperframes lint/validate run locally
3d: compileBrief takes medium "cel"(default, output byte-identical)|"3d"; 3d sheet adds "## 3D" + skills/html-anime-3d/SKILL.md (between camera and render) + films/lantern reference
3d-lib: three.js 0.186.1 via importmap CDN, window.THREE set; GSAP stays the only clock (anime.js not used; HyperFrames would seek window.__hfAnime in ms)
3d-render: draw only from hf-seek e.detail.time (seconds) + draw(window.__hfThreeTime||0) at init; renderer 1920x1080, pixelRatio 1, alpha, preserveDrawingBuffer
3d-color: two-tone ShaderMaterial, uniforms raw sRGB hex/255, no colorspace/tonemapping chunks = exact sheet hex; one LIGHT (0.62,0.72,0.3) normalized; threshold 0.35 solids, -0.25 glowing practicals
3d-hull: BackSide hull pushed 5px in clip space; hullNormals() averages normals per position so box/cylinder corners close
3d-camera: three-quarter angles, a face aimed straight at camera reads as one flat tone
lint: hyperframes warns past 300 structural lines; nested_structure_needs_subcomposition warnings accepted (roof has them)
stills: `npx hyperframes@0.8.171 snapshot --at <t> --no-end` on a scratch copy of the film dir (keeps .hyperframes/ out of repo)
compile-bugs: prototype keys pass aspect/script lookup (compile.js:172,177), compileBrief(null) throws (:159), multi-line dialogue breaks the quote (:203), slugFrom drops non-ASCII ("Kokuyō"→"kokuy") (:142)

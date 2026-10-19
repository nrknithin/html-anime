# References and specs

Proportions come from measured references, not memory. Every case study that started from a measured ratio table landed its gross proportions within ~5 % on the first or second edge fit (knight T3); every one that eyeballed something fixed it later.

## Rule: study, don't copy

References are for study: proportions, structure, how a part is built. The model is an original design. No logos, badges, emblems, lettering or brand marks, ever (the AE86 has no badge and no tyre lettering by rule). A real vehicle's or animal's shape is fine to study; an existing character is not yours to rebuild. The heroine used Wikipe-tan and the Mirai Suenaga sheet only for proportions and eye placement, and is an original design (her own hair, uniform and colours). Keep reference files outside the repo, with their licences.

## Finding them

Wikimedia Commons, through its API, with a descriptive User-Agent, thumbnails no wider than 1600 px (never originals), and the licence, author and source page recorded for every file. CC0, public domain, CC BY and CC BY-SA images are fine for study. Blueprint sites without a free licence are not used (ae86 BRIEF).

```js
// commons.mjs  search "<terms>"  |  get "File:Name.jpg" <out.jpg>   (Node 22, no dependencies)
import fs from "node:fs";
const UA = "html-anime-model-refs/0.1 (study references for procedural models; contact: <you>)";
const API = "https://commons.wikimedia.org/w/api.php";
const INFO = { prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1600", iiextmetadatafilter: "LicenseShortName|Artist|ImageDescription" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return r.json();
  }
  throw new Error("too many retries");
}
const row = (p) => {
  const ii = p.imageinfo?.[0] ?? {}, m = ii.extmetadata ?? {}, s = (k) => (m[k]?.value ?? "").replace(/<[^>]*>/g, "").trim();
  return { title: p.title, w: ii.width, h: ii.height, license: s("LicenseShortName"), author: s("Artist"), page: ii.descriptionurl, thumb: ii.thumburl ?? ii.url };
};
const [cmd, arg, out] = process.argv.slice(2);
if (cmd === "search") {
  const j = await api({ action: "query", generator: "search", gsrsearch: arg, gsrnamespace: "6", gsrlimit: "20", ...INFO });
  for (const p of j.query?.pages ?? []) console.log(JSON.stringify(row(p)));
} else if (cmd === "get") {
  const r = row((await api({ action: "query", titles: arg, ...INFO })).query.pages[0]);
  const img = await fetch(r.thumb, { headers: { "User-Agent": UA } });
  if (!img.ok) throw new Error(`HTTP ${img.status} ${r.thumb}`);
  fs.writeFileSync(out, Buffer.from(await img.arrayBuffer()));
  fs.writeFileSync(out + ".json", JSON.stringify(r, null, 2));
  console.log(r.title, "|", r.license, "|", r.author);
  await sleep(700); // be polite between downloads
}
```

Search Commons categories too (`list=search` with `srnamespace=14`): conformation photos, museum objects and engravings sit in categories the file search misses.

## What to collect, per subject

| slot | why | example that worked |
|---|---|---|
| true side view: camera parallel, level ground, all limbs visible | the edge-fit reference; most landmarks | Barb horse (CC0), Hungarian Grey bull, Met Gothic harness side |
| front view | spacing ratios (leg gap, ear splay, shoulder span) | Met harness front (same object as the side: the only true pair) |
| three-quarter | identity, which parts are black, how forms turn | AE86 panda museum shot |
| action or pose frame | poses | Muybridge 1878 gallop plate, a drinking cow |
| detail | head, horns, hands, lamps | longhorn heads, bat skeleton for wing bones |
| published specs | absolute size and ratios you can cite | AE86 dimensions, frog body length, harness weight and height |

Write a `BRIEF.md` per subject: a files table (file, WxH, view, facing, crop box, source page, author, licence, quirks), a proportion table with each ratio marked [P] published (with source) or [V] measured (with the image and pixel values), five ranked identity cues, and notes for the modeler. Keep an index with one line per subject: best side file, its crop box, facing. Draw every crop box over its image once to check it.

## Vetting a photo

- **Yaw.** Compare left and right wheel diameters, hoof baselines, near and far eyes. The AE86 side photo's front wheel is 13 % bigger than the rear (front nearer the camera); a second photo with the opposite yaw averages it out; for metrics trust the published numbers (ae86 BRIEF). A hoof baseline sloping 55 px means the hindquarters are nearer (Sybari horse).
- **Camera height.** A high camera puts the far hooves lower in the image (the bull's rear hooves 50 px below the front ones). A low close camera inflates near parts: a perspective front shows a wider head and chest than the side measurements; use it for spacing ratios only, never absolute widths (horse T5).
- **Pose.** A leg placed forward in the photo shows as an 8 cm misfit against a square-standing model (horse T18); a head turned toward the camera shortens it. Note it; don't chase it.
- **The crop.** A crop that clips the subject lies about widths: the Mirai skirt ran past her crop box, so measure widths on the uncropped image (heroine T14). A crop that includes a log, a stretched foot or a jockey lies about the scale (frog T7, horse T13).
- **Character references** should match the build you want. Anchor body proportions to a teen model sheet (~5-6 heads), not a chibi mascot (4 heads); use the mascot for face construction only (heroine T1).
- **Reject** reflections, glass cases, heavy occlusion, low resolution.

## What to measure

Pick a base unit for the class and express everything as a ratio of it; then choose the model's absolute size.

| class | base unit | case study |
|---|---|---|
| quadruped | H = height at withers | horse H 1.55 m, ox H 1.50 m |
| amphibian, small animal | SVL = snout-vent length | frog SVL 0.09 m |
| creature with a long neck and tail | B = snout tip to hip joint | dragon B 2.3-2.5 m |
| humanoid | h = head height (hair top or helmet apex to chin or bevor) | heroine h 0.25 m (6.2 h), knight h 0.24 m (7.5 h) |
| vehicle | WB = wheelbase | AE86 WB 2.40 m |

Map photo pixels to model metres once and write the mapping down: `z = (x_px - x0) * m_per_px`, `y = (y_ground - y_px) * m_per_px` (horse: Barb H = 435 px gives 3.563 mm/px). Then build a landmark table you can type straight into rails:

| landmark | photo px (x, y) | model (z, y) m |
|---|---|---|
| withers (highest topline) | 1000, 203 | 0.27, 1.50 |
| muzzle tip | 1530, 440 | 1.20, 1.085 (head axis -41 deg) |
| brisket bottom | 1100, 715 | 0.45, 0.60 |

(ox study, Hungarian Grey bull, 1.755 mm/px.) Measure in the photo's own view; the most visible landmark on a car is the glass lower edge (ae86 T3).

The overlay does not use your landmark scale: the lab scales the photo so the crop height equals the model's bbox height and centres the crop on the bbox. So take `m_per_px = target model height / crop height in px`, put x0 at the crop's horizontal centre, and land the model's top and both ends on the photo's (check `--info` bbox) before judging anything else. A wolf mapped from its withers (1.53 mm/px) whose ear tips came out 2 % low saw the photo shrink 2 % and every z miss by the same ratio; refit at 1.485 mm/px it sat within ~3 % in one trial (wolf T1-T2).

## Proportion tables from the case studies

**Quadrupeds** (H = withers height).

| ratio | horse (Barb, Childe Harold) | ox / bull (Hungarian Grey) |
|---|---|---|
| body length, shoulder to buttock | 1.00-1.13 | 1.00-1.05 |
| nose to buttock | 1.4-1.5 | ~1.5 (model 1.57) |
| head length | 0.35-0.39, axis ~47-49 deg down | 0.31-0.34, axis ~38-41 deg down |
| neck | crest chord 0.47-0.61 at 38-40 deg up | short, thick, withers to poll ~0.41, about level |
| body depth, withers to underline | 0.41-0.50 | 0.53-0.62 (deep brisket, dewlap) |
| elbow height | 0.51-0.55 | 0.38-0.45 |
| knee / hock / fetlock | 0.28-0.31 / 0.35 / 0.09 | knee 0.24, fetlock 0.14, hoof 0.07 |
| topline | croup = withers; back dips 0.03-0.07 | withers highest; slopes down ~0.09 to the tail head |
| top of the figure | ear tips ~1.5 (head carried high) | horn tips ~1.17 |
| tail | high set | ~0.85 long, tuft ends ~0.06 above ground |
| front | chest ~0.38 wide; forelegs ~0.23 of poll height apart | barrel ~0.45-0.48 wide (estimate) |

**Frog** (SVL): head 0.37; eye 0.09 across, centre 0.18 behind the snout, bulging ~0.04 above the skull line; tympanum about eye-sized behind the eye; back peak 0.65 behind the snout, sitting height 0.56; thigh 0.34, shank 0.44, foot 0.6-0.7, extended hind limb 1.5-1.9; forearm 0.21, hand 0.17; body width 0.62 of the front-view width, head 0.77 of body width; vocal sac up to 0.52 SVL across.

**Dragon** (B = snout to hip; Bertuch crouching / Welsh rearing / model): head 0.25 / 0.33 / 0.27; neck 0.35 / 0.32 / 0.36; trunk 0.40 / 0.50 / 0.37-0.40; tail ~1.3; legs 0.21 crouched, 0.33-0.35 standing; wing bones from a bat with forearm F: humerus 0.55 F, digit II 0.87 F, III 1.63 F, IV 1.50 F, V 1.38 F; bat span ~3.6 B, heraldic ~2 B (model 1.9-2.2 B).

**Humanoids** (h = head height).

| | anime teen (heroine, Mirai sheet) | armoured adult (knight, Met harness) |
|---|---|---|
| heads tall | 6.2 (Mirai 5.2, Wikipe-tan 4.1, chibi 2-3, typical anime adult 7-8) | 7.5 (7.2-7.9) |
| landmarks, fraction of height from the top | eye 0.10, chin 0.155, shoulder 0.22, waist 0.40, hem 0.58, knee 0.69, sock top 0.71 | shoulder line 1.2 h below the crown, crotch 0.48-0.50 H up, knee 0.29 H up |
| widths | shoulders ~1.0 h; face ~0.72 h; eye ~0.29 of face width, eye centre 0.27-0.37 h above the chin | pauldron span 2.0-2.4 h; couter span 3.3-3.5 h; breastplate 1.25-1.5 h wide, 1.3 h deep |
| feet | small loafers | Gothic sabaton heel to toe ~2.0 h |
| gear | - | arming sword ~1.05-1.1 m, cross-guard 0.22; heater 0.62 x 0.46 m |

**Car** (AE86, WB = 2.40 m): length 1.744-1.756 WB (4.185-4.215 m); width 0.677 (1.625 m); height 0.556 (1.335 m); track 0.556-0.565; clearance 0.0625; tyre diameter ~0.24 (0.58 m); total overhang ~0.75, model 0.98 m front / 0.82 m rear; beltline 0.60-0.67 of the height (model 0.86-0.90 m); roof flat for ~0.65 m in the photo; hatch glass 15-21 deg from horizontal.

For a new subject in a known class (a wolf is a quadruped, a samurai an armoured humanoid, a motorcycle a vehicle), fill the same rows from its own references. The structure transfers; the numbers do not.

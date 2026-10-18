import assert from "node:assert/strict";
import { ASPECTS, compileBrief, MEDIUMS, SCRIPTS, shotPlan } from "./compile.js";

for (const seconds of [8, 12, 20]) {
  const shots = shotPlan(seconds);
  const sum = shots.reduce((total, shot) => total + shot.dur, 0);
  assert.equal(Math.round(sum * 1000), seconds * 1000);
  assert.equal(shots.filter((shot) => shot.sakuga).length, 1);
}

assert.throws(() => shotPlan(15), /8, 12, or 20/);

const brief = compileBrief({
  logline: "On a roof in the rain, a red moon opens and a line of light falls.",
  seconds: 8,
  aspect: "16:9",
  script: "indigo",
  dialogue: "The rain hid the sound of the blade.",
});

assert.equal(brief.ok, true);
assert.equal(brief.frames, 192);
assert.equal(brief.slug, "roof-rain-red-moon");
assert.match(brief.markdown, /^# html-anime\n/);
assert.match(brief.markdown, /1920×1080/);
assert.match(brief.markdown, /192 frames/);
assert.match(brief.markdown, /Do not translate/);
assert.match(brief.markdown, /> The rain hid the sound of the blade\./);
assert.match(brief.markdown, /Sakuga — the expensive shot/);
assert.doesNotMatch(brief.markdown, /tall frame/);

const listed = new Set([...brief.markdown.matchAll(/#[0-9a-f]{6}/g)].map((match) => match[0]));
const allowed = new Set(Object.values(SCRIPTS.indigo.colors));
assert.deepEqual(listed, allowed);

const spans = [...brief.markdown.matchAll(/(\d+\.\d+)–(\d+\.\d+)/g)];
assert.equal(spans[0][1], "0.00");
assert.equal(spans.at(-1)[2], "8.00");
let cursor = 0;
for (const span of spans) {
  assert.equal(Number(span[1]), cursor);
  cursor = Number(span[2]);
}
assert.equal(cursor, 8);

const tall = compileBrief({
  logline: "A bell rings once.",
  seconds: 12,
  aspect: "9:16",
  script: "noon",
  dialogue: "",
});
assert.equal(tall.ok, true);
assert.match(tall.markdown, /1080×1920/);
assert.match(tall.markdown, /288 frames/);
assert.match(tall.markdown, /No dialogue/);
assert.doesNotMatch(tall.markdown, /Do not translate/);
const noonHexes = new Set([...tall.markdown.matchAll(/#[0-9a-f]{6}/g)].map((match) => match[0]));
assert.deepEqual(noonHexes, new Set(Object.values(SCRIPTS.noon.colors)));
assert.equal(noonHexes.has("#e23b4a"), false);
assert.match(tall.markdown, /tall frame/);
assert.equal(tall.slug, "bell-rings-once");

assert.equal(compileBrief({ logline: "   ", seconds: 8, aspect: "16:9", script: "indigo" }).ok, false);
assert.equal(
  compileBrief({ logline: "a".repeat(401), seconds: 8, aspect: "16:9", script: "indigo" }).ok,
  false,
);
assert.equal(
  compileBrief({ logline: "A bell.", seconds: 9, aspect: "16:9", script: "indigo" }).ok,
  false,
);
assert.equal(
  compileBrief({ logline: "A bell.", seconds: 8, aspect: "1:1", script: "indigo" }).ok,
  false,
);

const base = {
  logline: "A lantern drifts over a quiet canal.",
  seconds: 8,
  aspect: "16:9",
  script: "indigo",
  dialogue: "",
};
const plain = compileBrief(base);
const cel = compileBrief({ ...base, medium: "cel" });
assert.equal(plain.markdown, cel.markdown);
assert.equal(plain.medium, "cel");
assert.equal(cel.medium, "cel");
assert.doesNotMatch(plain.markdown, /## 3D|Medium:|html-anime-3d|films\/lantern\/index/);

const solid = compileBrief({ ...base, medium: "3d" });
assert.equal(solid.ok, true);
assert.equal(solid.medium, "3d");
assert.match(solid.markdown, /^## 3D$/m);
assert.match(solid.markdown, /^Medium: 3D cel \(three\.js\)$/m);
assert.match(
  solid.markdown,
  /html-anime-camera\/SKILL\.md, skills\/html-anime-3d\/SKILL\.md, skills\/html-anime-render\/SKILL\.md\./,
);
assert.match(solid.markdown, /films\/lantern\/index\.html shows the 3D layer/);
assert.ok(solid.markdown.indexOf("## Drawing budget") < solid.markdown.indexOf("## 3D"));
assert.ok(solid.markdown.indexOf("## 3D") < solid.markdown.indexOf("## Shots"));

for (const medium of ["4d", "constructor", "__proto__", "toString"]) {
  assert.equal(compileBrief({ ...base, medium }).ok, false);
}

assert.deepEqual(MEDIUMS, ["cel", "3d"]);

for (const script of Object.values(SCRIPTS)) {
  for (const hex of Object.values(script.colors)) {
    assert.match(hex, /^#[0-9a-f]{6}$/);
  }
}

assert.deepEqual(Object.keys(ASPECTS), ["16:9", "9:16"]);

console.log("compile: ok");

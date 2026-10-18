// library.test.mjs — the model library's pipeline pieces that run without a browser, Blender or the network:
// the zip reader, the catalog render, the entry checks, and the no-clock rule for the files a film pastes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { unzipMember, zipList } from "./ingest.mjs";
import { render, entryProblems, readEntries } from "./catalog.mjs";
import { scanSource } from "../lab/inspect.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// A zip with one stored and one deflated member, built by hand (local headers, central directory, end record).
function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data, deflate] of files) {
    const body = deflate ? zlib.deflateRawSync(data) : data;
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(deflate ? 8 : 0, 8);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(deflate ? 8 : 0, 10);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, body);
    centrals.push(ch, n);
    offset += 30 + n.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const big = Buffer.from("horse ".repeat(500));
const zip = makeZip([
  ["Pack/License.txt", Buffer.from("CC0"), false],
  ["Pack/FBX/Horse.fbx", big, true],
]);
assert.deepEqual(zipList(zip), ["Pack/License.txt", "Pack/FBX/Horse.fbx"]);
assert.equal(unzipMember(zip, "Pack/License.txt").toString(), "CC0");
assert.ok(unzipMember(zip, "Pack\\FBX\\Horse.fbx").equals(big), "backslash member paths work");
assert.throws(() => unzipMember(zip, "Pack/FBX/Cow.fbx"), /Horse\.fbx/, "a missing member lists the near names");

// Catalog: deterministic, sorted, credits only for attribution licences.
const entry = (id, license) => ({
  id,
  dir: "/nowhere",
  meta: { id, name: id, height: 1, script: "noon", category: "mammal", clips: { run: "Run" }, bytes: 1048576, triangles: 10, source: { license, author: "A", page: "https://example.org", pack: "P" } },
});
const a = render([entry("b", "CC0"), entry("a", "CC-BY-4.0")]);
assert.equal(a.catalog, render([entry("b", "CC0"), entry("a", "CC-BY-4.0")]).catalog);
assert.match(a.credits, /\*\*a\*\*.*CC BY 4\.0/);
assert.doesNotMatch(a.credits, /\*\*b\*\*/);
assert.equal(JSON.parse(a.manifest).count, 2);
assert.match(a.catalog, /\| `a` \|/);

// Entry checks: a non-free licence and a missing GLB are problems.
const probs = entryProblems({ ...entry("c", "CC-BY-NC-4.0"), dir: "/nowhere" });
assert.ok(probs.some((p) => /license "CC-BY-NC-4.0"/.test(p)));
assert.ok(probs.some((p) => /model\.glb is missing/.test(p)));

// Every committed entry is complete.
for (const e of readEntries()) assert.deepEqual(entryProblems(e), [], `models/library/${e.id}`);

// Files a film pastes stay deterministic: no clock, no randomness, no imports.
for (const f of ["../lab/library.js", "../lab/kit.js"]) assert.deepEqual(scanSource(fs.readFileSync(path.join(HERE, f), "utf8")), [], f);

console.log("library: ok");

// paths.mjs — path handling shared by shoot.mjs and probe.mjs.
import path from "node:path";

// Git Bash hands out /c/Users/x (and Cygwin /cygdrive/c/...): on Windows that is C:/Users/x, never <cwd drive>:\c\Users\x.
// Elsewhere, and for anything that is not a one-letter drive prefix (/models/horse.js), the path is left alone.
export function fixPath(spec, platform = process.platform) {
  spec = String(spec);
  if (platform === "win32") {
    const m = /^[\\/]+(?:cygdrive[\\/])?([a-zA-Z])(?:[\\/]+(.*))?$/.exec(spec);
    if (m && !/^[\\/]{2}/.test(spec)) return `${m[1].toUpperCase()}:/${m[2] || ""}`;
  }
  return spec;
}

/** Absolute path for a user-given spec: drive fixes applied, relative paths resolved against the repo root. */
export const resolveFromRoot = (root, spec) => path.resolve(root, fixPath(spec));

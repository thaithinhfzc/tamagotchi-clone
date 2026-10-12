// Syntax + import-graph check for every module under src/ (browser-only modules are parsed, not executed).
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes:true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}
const files = [...await walk(join(root, "src")), ...await walk(join(root, "scripts")), ...await walk(join(root, "tests"))];
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ["--check", f], { stdio:"pipe" }); }
  catch (e) { bad++; console.error("✗", f.replace(root + "/", ""), "\n", e.stderr.toString()); }
}
// modules that must stay DOM-free so tests can import them
for (const dir of ["core", "data", "games"]) {
  for (const f of await walk(join(root, "src", dir))) {
    try { await import(f); } catch (e) { bad++; console.error("✗ import", f.replace(root + "/", ""), e.message); }
  }
}
console.log(bad ? `${bad} problem(s)` : `ok · ${files.length} files`);
process.exit(bad ? 1 : 0);

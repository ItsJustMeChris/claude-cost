#!/usr/bin/env bun

import { $ } from "bun";

console.log("Building claude-cost...");

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  sourcemap: "none",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Add shebang to the output file if not present
const outFile = "./dist/index.js";
const content = await Bun.file(outFile).text();
if (!content.startsWith("#!/")) {
  await Bun.write(outFile, `#!/usr/bin/env bun\n${content}`);
}

// Make it executable
await $`chmod +x ${outFile}`;

console.log("✓ Built to dist/index.js");
console.log("  Run with: bun dist/index.js");
console.log("  Or:       ./dist/index.js");

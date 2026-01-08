#!/usr/bin/env bun

import { $ } from "bun";

console.log("Building claude-cost...");

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  target: "node",
  minify: true,
  sourcemap: "none",
  external: ["react", "ink", "chalk", "date-fns"],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Ensure proper shebang for npm distribution
const outFile = "./dist/index.js";
let content = await Bun.file(outFile).text();

// Remove any existing shebang and bun-specific comments
content = content.replace(/^#!.*\n/, '').replace(/^\/\/ @bun\n/, '');

// Add node shebang
await Bun.write(outFile, `#!/usr/bin/env node\n${content}`);

// Make it executable
await $`chmod +x ${outFile}`;

console.log("✓ Built to dist/index.js");
console.log("  Run with: node dist/index.js");
console.log("  Or:       bunx claude-cost");
console.log("  Or:       npx claude-cost");

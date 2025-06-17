/**
 * Test the CLI functionality
 */
import { spawn } from "child_process";
import { join, dirname } from "path";

const __dirname = dirname(new URL(import.meta.url).pathname);
const cliPath = join(__dirname, "../src/cli/cli.ts");
const targetDir = join(__dirname, "sample_project/src");

console.log("🔍 Testing TypeScript Function Similarity CLI\n");
console.log(`CLI Path: ${cliPath}`);
console.log(`Target Directory: ${targetDir}\n`);

// Run the CLI with tsx
const child = spawn("npx", ["tsx", cliPath, targetDir, "-t", "0.6"], {
  stdio: "inherit",
  shell: true,
});

child.on("error", (error) => {
  console.error("Failed to start CLI:", error);
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error(`CLI exited with code ${code}`);
  }
});

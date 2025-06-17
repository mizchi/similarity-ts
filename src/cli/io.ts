// IO operations for file system access
import { readFileSync } from "fs";
import { join, relative } from "path";
import { glob } from "glob";

interface FileInfo {
  id: string;
  path: string;
  content: string;
}

/**
 * Load files from a directory pattern
 */
export async function loadFilesFromPattern(pattern: string, basePath: string = "."): Promise<FileInfo[]> {
  const files = await glob(pattern, { cwd: basePath });
  const results: FileInfo[] = [];

  for (const file of files) {
    const fullPath = join(basePath, file);
    const content = readFileSync(fullPath, "utf-8");
    const id = relative(basePath, fullPath);

    results.push({ id, path: fullPath, content });
  }

  return results;
}

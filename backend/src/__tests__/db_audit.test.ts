import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const backendSrcDir = path.resolve(import.meta.dirname, "..");

function collectFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("db audit", () => {
  it("keeps runtime code free of SQLite-only SQL and raw driver imports outside db adapters", () => {
    const files = collectFiles(backendSrcDir).filter((filePath) => {
      const relativePath = path.relative(backendSrcDir, filePath).replace(/\\/gu, "/");
      return !relativePath.startsWith("__tests__/") && !relativePath.startsWith("db/");
    });

    const forbiddenPatterns = [
      { label: "better-sqlite3 import", pattern: /better-sqlite3/u },
      { label: "sqlite-only datetime()", pattern: /datetime\s*\(/iu },
      { label: "sqlite json_extract", pattern: /json_extract/iu },
      { label: "sqlite_master introspection", pattern: /sqlite_master/iu },
      { label: "PRAGMA usage", pattern: /\bPRAGMA\b/iu },
      { label: "INSERT OR IGNORE", pattern: /INSERT\s+OR\s+IGNORE/iu },
      { label: "INSERT OR REPLACE", pattern: /INSERT\s+OR\s+REPLACE/iu },
      { label: "last_insert_rowid()", pattern: /last_insert_rowid\s*\(/iu },
      { label: "AUTOINCREMENT", pattern: /AUTOINCREMENT/iu }
    ];

    const offenders: string[] = [];

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      const relativePath = path.relative(backendSrcDir, filePath).replace(/\\/gu, "/");

      for (const { label, pattern } of forbiddenPatterns) {
        if (pattern.test(contents)) {
          offenders.push(`${label}: ${relativePath}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

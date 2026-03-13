import path from "node:path";

import dotenv from "dotenv";

export function loadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env")
  ];

  for (const candidate of candidates) {
    dotenv.config({ path: candidate, override: false });
  }
}

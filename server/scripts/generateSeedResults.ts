import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { analyzeMeeting } from "../src/lib/analyzeMeeting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "..", "seed");
const RESULTS_DIR = path.join(SEED_DIR, "results");

interface SeedEntry {
  slug: string;
  title: string;
  agenda: string[];
  file: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const force = process.argv.includes("--force");

  const seeds: SeedEntry[] = JSON.parse(
    readFileSync(path.join(SEED_DIR, "seeds.json"), "utf-8"),
  );

  let didWork = false;

  for (const entry of seeds) {
    const resultPath = path.join(RESULTS_DIR, `${entry.slug}.json`);

    if (existsSync(resultPath) && !force) {
      console.log(`${entry.slug}: skipped (result already exists)`);
      continue;
    }

    if (didWork) {
      await sleep(15_000);
    }

    const transcriptPath = path.join(SEED_DIR, entry.file);
    const transcript = readFileSync(transcriptPath, "utf-8");

    const result = await analyzeMeeting(entry.title, entry.agenda, transcript);

    const output = {
      id: entry.slug,
      title: entry.title,
      createdAt: new Date().toISOString(),
      result,
    };

    writeFileSync(resultPath, JSON.stringify(output, null, 2));

    console.log(
      `${entry.slug}: verifiedCount=${result.meta.verifiedCount} unverifiedCount=${result.meta.unverifiedCount}`,
    );

    didWork = true;
  }
}

main().catch((err) => {
  const name = err instanceof Error ? err.name : "Error";
  const message = err instanceof Error ? err.message : String(err);
  console.error(name, message);
  process.exit(1);
});

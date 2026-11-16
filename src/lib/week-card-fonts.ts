import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Geist (a fonte do app) em regular e negrito: a fonte padrão do next/og não tem negrito. */
export async function weekCardFonts() {
  const dir = join(process.cwd(), "src", "assets", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "geist-latin-400.woff")),
    readFile(join(dir, "geist-latin-800.woff")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 800 as const, style: "normal" as const },
  ];
}

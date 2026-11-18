import { describe, expect, it } from "vitest";
import { isHeifFile } from "../../src/lib/image";

function ftyp(major: string, ...compatible: string[]): Blob {
  const text = "\0\0\0\x18ftyp" + major + "\0\0\0\0" + compatible.join("");
  return new Blob([Uint8Array.from(text, (c) => c.charCodeAt(0))]);
}

describe("isHeifFile", () => {
  it("reconhece HEIC da galeria Samsung/iPhone", async () => {
    expect(await isHeifFile(ftyp("heic", "mif1", "heic"))).toBe(true);
    expect(await isHeifFile(ftyp("mif1", "heic"))).toBe(true);
    expect(await isHeifFile(ftyp("heix"))).toBe(true);
  });

  it("não confunde AVIF, JPEG ou arquivo curto", async () => {
    expect(await isHeifFile(ftyp("avif", "mif1", "miaf"))).toBe(false);
    expect(await isHeifFile(new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])]))).toBe(false);
    expect(await isHeifFile(new Blob([Uint8Array.from([1, 2, 3])]))).toBe(false);
  });
});

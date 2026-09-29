import { it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { safePackPath, verifiedDownload } from "../../electron/packs/files";
it("prevents pack traversal and keeps the private user data outside pack operations", () => {
  const base=mkdtempSync(join(tmpdir(),"tosha-packs-"));
  expect(()=>safePackPath(base,"../data")).toThrow();
  expect(()=>safePackPath(base,"C:/Windows")).toThrow();
  expect(safePackPath(base,"maia-cpu")).toBe(join(base,"maia-cpu"));
});
it("writes only checksum-verified artifacts and resumes an interrupted part", async () => {
  const folder=mkdtempSync(join(tmpdir(),"tosha-packs-")), file=join(folder,"model.bin");
  const contents=Buffer.from("portable verified model"), hash=createHash("sha256").update(contents).digest("hex");
  writeFileSync(file+".part",contents.subarray(0,5));
  await verifiedDownload({url:"https://example.org/model",sha256:hash,size:contents.length},file,new AbortController().signal,()=>{},async (_url,opts)=>{
    expect(new Headers(opts?.headers).get("Range")).toBe("bytes=5-");
    return new Response(contents.subarray(5),{status:206,headers:{"Content-Range":`bytes 5-${contents.length-1}/${contents.length}`}});
  });
  expect(readFileSync(file)).toEqual(contents);
  expect(existsSync(file+".part")).toBe(false);
});
it("does not trust a server ignoring the range and refuses checksum mismatch", async () => {
  const file=join(mkdtempSync(join(tmpdir(),"tosha-packs-")),"model.bin");
  writeFileSync(file+".part","old");
  await expect(verifiedDownload({url:"https://example.org/model",sha256:"0".repeat(64),size:5},file,new AbortController().signal,()=>{},async()=>new Response("wrong"))).rejects.toThrow("checksum");
  expect(existsSync(file)).toBe(false);
});

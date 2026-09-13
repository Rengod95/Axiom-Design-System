import type { TargetDigest, TargetPack } from "./contracts.ts";
import { getTargetFiles } from "./pack-inventory.ts";

const ZIP_LOCAL = 0x04034b50; const ZIP_CENTRAL = 0x02014b50; const ZIP_END = 0x06054b50;
const ZIP_VERSION = 20; const ZIP_UTF8 = 0x0800; const ZIP_DATE = 33; const CRC_POLYNOMIAL = 0xedb88320;
const ENCODER = new TextEncoder();
const CRC_TABLE = Array.from({ length: 256 }, (_, value) => { for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? CRC_POLYNOMIAL : 0); return value >>> 0; });

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 255]!;
  return (crc ^ 0xffffffff) >>> 0;
}

/** Emit deterministic, uncompressed UTF-8 ZIP entries without timestamps, host paths or private state. */
export function createSourceArchive(pack: TargetPack, digest: TargetDigest): Uint8Array {
  const files = getTargetFiles(pack, digest).map((file) => ({ name: ENCODER.encode(file.path), bytes: ENCODER.encode(file.text) }));
  const localBytes = files.reduce((sum, file) => sum + 30 + file.name.length + file.bytes.length, 0);
  const centralBytes = files.reduce((sum, file) => sum + 46 + file.name.length, 0);
  const output = new Uint8Array(localBytes + centralBytes + 22); const view = new DataView(output.buffer);
  let local = 0; let central = localBytes;
  for (const file of files) {
    const crc = crc32(file.bytes);
    view.setUint32(local, ZIP_LOCAL, true); view.setUint16(local + 4, ZIP_VERSION, true); view.setUint16(local + 6, ZIP_UTF8, true); view.setUint16(local + 12, ZIP_DATE, true);
    view.setUint32(local + 14, crc, true); view.setUint32(local + 18, file.bytes.length, true); view.setUint32(local + 22, file.bytes.length, true); view.setUint16(local + 26, file.name.length, true);
    output.set(file.name, local + 30); output.set(file.bytes, local + 30 + file.name.length);
    view.setUint32(central, ZIP_CENTRAL, true); view.setUint16(central + 4, ZIP_VERSION, true); view.setUint16(central + 6, ZIP_VERSION, true); view.setUint16(central + 8, ZIP_UTF8, true); view.setUint16(central + 14, ZIP_DATE, true);
    view.setUint32(central + 16, crc, true); view.setUint32(central + 20, file.bytes.length, true); view.setUint32(central + 24, file.bytes.length, true); view.setUint16(central + 28, file.name.length, true); view.setUint32(central + 42, local, true); output.set(file.name, central + 46);
    local += 30 + file.name.length + file.bytes.length; central += 46 + file.name.length;
  }
  view.setUint32(central, ZIP_END, true); view.setUint16(central + 8, files.length, true); view.setUint16(central + 10, files.length, true); view.setUint32(central + 12, centralBytes, true); view.setUint32(central + 16, localBytes, true);
  return output;
}

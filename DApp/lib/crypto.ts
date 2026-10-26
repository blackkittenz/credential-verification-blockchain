import { ethers } from "ethers";

/**
 * Calculates Keccak-256 hash of a File object in the browser (client-side).
 * Privacy by Design: File content never leaves the user's browser.
 */
export async function hashFileKeccak256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return ethers.keccak256(uint8Array);
}

/**
 * Converts any text string (like ID Ijazah or NIM) into a 32-byte hash (bytes32).
 * If the input is already a valid 32-byte hex string (0x followed by 64 hex chars),
 * returns it as-is. Otherwise computes Keccak-256 hash of the UTF-8 text.
 */
export function stringToBytes32(text: string): string {
  const trimmed = text.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed;
  }
  return ethers.keccak256(ethers.toUtf8Bytes(trimmed));
}

/**
 * Truncate long hash for UI display (e.g., 0xabcd...1234)
 */
export function truncateHash(hash: string, startChars = 8, endChars = 6): string {
  if (!hash || hash.length <= startChars + endChars) return hash || "";
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format unix timestamp (seconds) into human-readable Indonesian date.
 */
export function formatUnixDate(seconds: number | bigint): string {
  const sec = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!sec || sec === 0) return "Berlaku Selamanya (Seumur Hidup)";
  const date = new Date(sec * 1000);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

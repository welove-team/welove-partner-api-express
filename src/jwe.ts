import { CompactEncrypt, compactDecrypt } from "jose";

/**
 * Secret Key 문자열을 그대로 32바이트 AES-256 대칭키로 변환합니다.
 *
 * welove가 발급하는 Secret Key는 정확히 32바이트(ASCII) 문자열이며,
 * 별도 해싱/변환 없이 그대로 키로 사용합니다.
 */
export function keyFromSecret(secretKey: string): Uint8Array {
  const buf = Buffer.from(secretKey, "utf-8");
  if (buf.length !== 32) {
    throw new Error(`Secret Key는 정확히 32바이트여야 합니다. (현재 ${buf.length}바이트)`);
  }
  return new Uint8Array(buf);
}

/**
 * 평문 데이터를 JWE compact serialization으로 암호화합니다.
 *
 * - 알고리즘: dir (Direct Key Agreement)
 * - 암호화: A256GCM (AES-256-GCM)
 */
export async function encryptJwe(data: unknown, key: Uint8Array): Promise<string> {
  const plaintext = new TextEncoder().encode(
    typeof data === "string" ? data : JSON.stringify(data),
  );
  return new CompactEncrypt(new Uint8Array(plaintext))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
}

/**
 * JWE compact serialization 토큰을 복호화하여 평문 문자열로 반환합니다.
 */
export async function decryptJwe(token: string, key: Uint8Array): Promise<string> {
  const { plaintext } = await compactDecrypt(token, key);
  return new TextDecoder().decode(plaintext);
}

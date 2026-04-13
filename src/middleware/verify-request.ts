import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { decryptJwe, keyFromSecret } from "../jwe.js";

/**
 * welove 서버 요청 검증 미들웨어
 *
 * 두 가지를 순서대로 처리합니다:
 * 1. API Key 검증 — `X-API-Key` 헤더로 파트너 포털에서 발급받은 API Key 확인
 * 2. JWE 복호화 — 요청 본문(JWE compact serialization)을 Secret Key로 복호화해 req.body에 주입
 *
 * Secret Key는 헤더로 전송되지 않고, 오직 JWE 암복호화 키로만 사용됩니다.
 */
export async function verifyRequest(req: Request, res: Response, next: NextFunction) {
  // ── 1. API Key 검증 ──
  const apiKey = (req.headers["x-api-key"] ?? "") as string;
  const expectedApiKey = process.env.WELOVE_API_KEY ?? "";

  if (!apiKey || !expectedApiKey || !safeEqual(apiKey, expectedApiKey)) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "X-API-Key 헤더가 없거나 올바르지 않습니다.",
    });
    return;
  }

  // ── 2. JWE 복호화 ──
  // Content-Type: application/jose 로 전송된 JWE compact serialization 복호화
  const rawBody = typeof req.body === "string" ? req.body : String(req.body ?? "");
  if (!rawBody) {
    res.status(400).json({
      error: "DECRYPTION_FAILED",
      message: "요청 본문이 비어 있습니다.",
    });
    return;
  }

  const secretKey = process.env.WELOVE_SECRET ?? "";
  try {
    const key = keyFromSecret(secretKey);
    const plaintext = await decryptJwe(rawBody, key);
    req.body = JSON.parse(plaintext);
  } catch {
    res.status(400).json({
      error: "DECRYPTION_FAILED",
      message: "JWE 복호화에 실패했습니다.",
    });
    return;
  }

  next();
}

/**
 * timing-safe 문자열 비교
 *
 * 길이가 달라도 timing attack에 안전하도록 처리합니다.
 */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

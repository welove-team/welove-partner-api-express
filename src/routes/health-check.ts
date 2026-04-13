import { Router } from "express";

export const healthCheckRouter = Router();

/**
 * GET /health-check
 *
 * welove가 서버 가용성을 확인하기 위해 주기적으로 호출합니다.
 * 인증 없이 호출됩니다.
 */
healthCheckRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    version: process.env.APP_VERSION ?? "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

import "dotenv/config";
import express from "express";
import { healthCheckRouter } from "./routes/health-check.js";
import { verifyMemberRouter } from "./routes/verify-member.js";
import { verifyRequest } from "./middleware/verify-request.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// JWE compact serialization은 텍스트 형태이므로 text 파서 사용
app.use(express.text({ type: "application/jose" }));
app.use(express.json());

// GET /health-check — 인증 없이 호출됩니다
app.use("/health-check", healthCheckRouter);

// POST /verify-member — Basic Auth + JWE 종단 암호화 검증 후 처리됩니다
app.use("/verify-member", verifyRequest, verifyMemberRouter);

app.listen(port, () => {
  console.log(`welove 파트너 API 서버가 실행 중입니다: http://localhost:${port}`);
});

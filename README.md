# welove-partner-api-express

welove 파트너 교회 API 보일러플레이트 (Express + TypeScript)

welove와 제휴한 교회 개발자가 `.env` 설정만으로 바로 실행할 수 있는 보일러플레이트입니다. 인증 미들웨어(API Key + JWE 종단 암호화)가 이미 구현되어 있으므로, 교적 DB 조회 로직만 추가하면 됩니다.

> 📖 상세 API 문서: **[partners.welove-app.com/guides](https://partners.welove-app.com/guides)**

---

## 빠른 시작

### 1. 클론

```bash
git clone https://github.com/welove-team/welove-partner-api-express.git
cd welove-partner-api-express
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 [파트너 포털](https://partners.welove-app.com/dashboard/api-keys)에서 발급받은 값을 입력하세요:

```env
WELOVE_API_KEY=발급받은-api-key
WELOVE_SECRET=발급받은-32바이트-secret-key
PORT=3000
APP_VERSION=1.0.0
```

> ⚠️ `WELOVE_SECRET`은 정확히 **32바이트(ASCII 32자)** 여야 합니다. 파트너 포털에서 발급된 값을 그대로 붙여넣으세요.

### 4. 서버 실행

```bash
npm run dev
```

### 5. 동작 확인

```bash
curl http://localhost:3000/health-check
# {"status":"ok","version":"1.0.0","timestamp":"2026-04-13T00:00:00.000Z"}
```

---

## API 엔드포인트

### `GET /health-check`

welove가 서버 가용성을 확인하기 위해 주기적으로 호출합니다. **인증 없이** 호출됩니다.

**응답 `200 OK`:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-13T00:00:00.000Z"
}
```

---

### `POST /verify-member`

welove 서버가 사용자의 교회 소속을 확인하기 위해 호출합니다. **`X-API-Key` 헤더** 검증 후, **JWE(RFC 7516)** 로 암호화된 요청 본문을 복호화하여 처리합니다.

**Request Headers:**
```
X-API-Key: {apiKey}
Content-Type: application/jose
Accept: application/jose
```

**Request Body** (JWE compact serialization):
```
eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0...(JWE 토큰)
```

복호화된 평문 JSON:
```json
{
  "phoneNumber": "01012345678",
  "name": "김철수"
}
```

**Response `200 OK`** (Content-Type: `application/jose`):

JWE compact serialization 형태로 응답합니다. 복호화된 평문:
```json
{
  "leadership": true,
  "community": "갈렙공동체",
  "group": "3목장"
}
```

**Error Responses:**

| HTTP | error | 설명 |
|------|-------|------|
| 400 | `DECRYPTION_FAILED` | JWE 복호화 실패 |
| 400 | `INVALID_REQUEST` | 필수 파라미터 누락 |
| 401 | `UNAUTHORIZED` | API Key 검증 실패 |
| 404 | `MEMBER_NOT_FOUND` | 교인 정보 없음 |

---

## 인증 및 암호화 방식

welove 서버는 모든 요청에 두 가지 보안 메커니즘을 사용합니다.

### 1. API Key 인증

`X-API-Key` 헤더에 파트너 포털에서 발급받은 API Key를 그대로 전송합니다.

```
X-API-Key: {apiKey}
```

Secret Key는 헤더로 전송되지 않으며, JWE 암복호화 키로만 사용됩니다.

### 2. JWE 종단 암호화 (RFC 7516)

요청/응답 본문을 JWE(JSON Web Encryption)로 종단 암호화합니다.

- **알고리즘**: `dir` (Direct Key Agreement)
- **암호화**: `A256GCM` (AES-256-GCM)
- **키**: Secret Key 문자열(ASCII 32바이트)을 **그대로** 32바이트 AES-256 대칭키로 사용. 해싱/변환 없음.

```typescript
const key = new Uint8Array(Buffer.from(secretKey, "utf-8"));
// Secret Key는 정확히 32바이트여야 합니다.
```

> 자세한 내용: [partners.welove-app.com/guides/authentication](https://partners.welove-app.com/guides/authentication)

---

## 교적 DB 연동 가이드

`src/routes/verify-member.ts` 파일에 TODO 주석으로 연동 위치가 표시되어 있습니다.

```typescript
// src/routes/verify-member.ts

// ─────────────────────────────────────────────────────────────
// TODO: 아래 더미 데이터를 실제 교적 DB 조회 로직으로 교체하세요.
// ─────────────────────────────────────────────────────────────
const MEMBERS: Record<string, Member> = { ... };

verifyMemberRouter.post("/", async (req, res) => {
  // ─────────────────────────────────────────────────────────────
  // TODO: 여기에 교회 교적 DB 조회 로직을 구현하세요.
  // ─────────────────────────────────────────────────────────────
  const member = MEMBERS[phoneNumber];
  ...
});
```

응답 형식만 아래를 지키면 어떤 DB든 자유롭게 연동하면 됩니다:

```typescript
// 교인 발견 시 (200 OK) — JWE 암호화는 자동 처리됩니다
{ leadership: boolean, community: string | null, group: string | null }

// 교인 미발견 시 (404)
res.status(404).json({ error: "MEMBER_NOT_FOUND", message: "교인 정보를 찾을 수 없습니다." });
```

---

## 테스트 방법

### Node.js로 JWE 암호화 후 curl 호출

```typescript
import { CompactEncrypt } from "jose";

const apiKey = "발급받은-api-key";
const secretKey = "발급받은-32바이트-secret-key"; // 반드시 32바이트
const body = { phoneNumber: "01012345678", name: "김철수" };

// 1. Secret Key를 그대로 32바이트 키로 사용
const key = new Uint8Array(Buffer.from(secretKey, "utf-8"));

// 2. JWE 암호화
const plaintext = new TextEncoder().encode(JSON.stringify(body));
const jweToken = await new CompactEncrypt(new Uint8Array(plaintext))
  .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
  .encrypt(key);

console.log(`X-API-Key: ${apiKey}`);
console.log(`JWE Token: ${jweToken}`);
```

```bash
# curl 호출 (위에서 출력된 값 사용)
curl -X POST http://localhost:3000/verify-member \
  -H "Content-Type: application/jose" \
  -H "Accept: application/jose" \
  -H "X-API-Key: $API_KEY" \
  -d "$JWE_TOKEN"
```

**기본 제공 더미 데이터:**

| 전화번호 | 이름 | leadership | community | group |
|----------|------|------------|-----------|-------|
| 01012345678 | 김철수 | true | 갈렙공동체 | 3목장 |
| 01098765432 | 이영희 | false | 여호수아공동체 | 1목장 |
| 01011112222 | 박민수 | false | null | null |

---

## 스크립트

| 커맨드 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (tsx watch, 자동 재시작) |
| `npm run build` | TypeScript 빌드 |
| `npm start` | 빌드된 결과물 실행 |

---

## 라이선스

[MIT](./LICENSE) © welove

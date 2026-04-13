import { Router } from "express";
import type { Request, Response } from "express";
import { encryptJwe, keyFromSecret } from "../jwe.js";

export const verifyMemberRouter = Router();

/**
 * 교인 데이터 타입
 *
 * 실제 연동 시 각 교적 DB 타입에 맞게 조회 결과를 반환하면 됩니다.
 */
type Member = {
	name: string;
	leadership: boolean;
	community: string | null;
	group: string | null;
};

// ─────────────────────────────────────────────────────────────
// TODO: 아래 더미 데이터를 실제 교적 DB 조회 로직으로 교체하세요.
//
// 교적 DB 연동 예시:
//   const member = await db.query(
//     "SELECT * FROM members WHERE phone = ? AND name = ?",
//     [phoneNumber, name]
//   );
// ─────────────────────────────────────────────────────────────
const MEMBERS: Record<string, Member> = {
	"01012345678": { name: "김철수", leadership: true, community: "갈렙공동체", group: "3목장" },
	"01098765432": { name: "이영희", leadership: false, community: "여호수아공동체", group: "1목장" },
	"01011112222": { name: "박민수", leadership: false, community: null, group: null },
};

/**
 * POST /verify-member
 *
 * welove 서버가 사용자의 교회 소속을 확인하기 위해 호출합니다.
 * verifyRequest 미들웨어(Basic Auth + JWE 복호화)를 통과한 요청만 도달합니다.
 *
 * 요청 본문(복호화 후): { phoneNumber: string, name: string }
 * 응답(JWE 암호화):     { leadership: boolean, community: string | null, group: string | null }
 */
verifyMemberRouter.post("/", async (req: Request, res: Response) => {
	const { phoneNumber, name } = req.body as { phoneNumber?: string; name?: string };

	// 필수 파라미터 검증
	if (!phoneNumber || !name) {
		res.status(400).json({
			error: "INVALID_REQUEST",
			message: "phoneNumber와 name은 필수 값입니다.",
		});
		return;
	}

	// ─────────────────────────────────────────────────────────────
	// TODO: 여기에 교회 교적 DB 조회 로직을 구현하세요.
	//       현재는 테스트용 더미 데이터를 사용합니다.
	// ─────────────────────────────────────────────────────────────
	const member = MEMBERS[phoneNumber];

	if (!member || member.name !== name) {
		res.status(404).json({
			error: "MEMBER_NOT_FOUND",
			message: "교인 정보를 찾을 수 없습니다.",
		});
		return;
	}

	// 응답을 JWE로 암호화하여 반환
	const secretKey = process.env.WELOVE_SECRET ?? "";
	const key = keyFromSecret(secretKey);
	const jweToken = await encryptJwe(
		{ leadership: member.leadership, community: member.community, group: member.group },
		key,
	);

	res.setHeader("Content-Type", "application/jose");
	res.send(jweToken);
});

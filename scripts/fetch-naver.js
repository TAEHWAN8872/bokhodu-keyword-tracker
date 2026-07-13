// scripts/fetch-naver.js
// 네이버 검색광고(SearchAd) API에서 키워드 검색량(PC/모바일)을 가져와 data.json에 누적 저장합니다.
// 실행: node scripts/fetch-naver.js
// 필요한 환경변수: NAVER_API_KEY, NAVER_SECRET_KEY, NAVER_CUSTOMER_ID

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data.json");

// 추적하고 싶은 키워드 목록. 필요한 만큼 자유롭게 추가하세요.
const KEYWORDS = ["복호두"];

const BASE_URL = "https://api.naver.com";
const URI = "/keywordstool";
const METHOD = "GET";
const MAX_HISTORY_DAYS = 90; // 하루 1개씩, 최근 90일치만 보관

function getHeaders() {
  const apiKey = process.env.NAVER_API_KEY;
  const secretKey = process.env.NAVER_SECRET_KEY;
  const customerId = process.env.NAVER_CUSTOMER_ID;

  if (!apiKey || !secretKey || !customerId) {
    throw new Error(
      "NAVER_API_KEY / NAVER_SECRET_KEY / NAVER_CUSTOMER_ID 환경변수가 필요합니다."
    );
  }

  const timestamp = Date.now().toString();
  const message = `${timestamp}.${METHOD}.${URI}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return {
    "X-Timestamp": timestamp,
    "X-API-KEY": apiKey,
    "X-Customer": customerId,
    "X-Signature": signature,
  };
}

async function fetchKeywordVolume(keyword) {
  const url = new URL(URI, BASE_URL);
  // 네이버 API는 공백 없는 키워드를 요구합니다.
  url.searchParams.set("hintKeywords", keyword.replace(/\s/g, ""));
  url.searchParams.set("showDetail", "1");

  const res = await fetch(url, { method: METHOD, headers: getHeaders() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`네이버 API 오류 (${res.status}): ${body}`);
  }

  const json = await res.json();
  const rows = json.keywordList ?? [];

  // 정확히 일치하는 키워드를 우선 찾고, 없으면 첫 결과를 사용
  const normalized = keyword.replace(/\s/g, "").toLowerCase();
  const match =
    rows.find((r) => (r.relKeyword ?? "").toLowerCase() === normalized) ??
    rows[0];

  if (!match) {
    return { keyword, pc: 0, mobile: 0, total: 0, found: false };
  }

  const toNumber = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.includes("<")) return 5; // "< 10" 같은 값 처리
    return Number(v) || 0;
  };

  const pc = toNumber(match.monthlyPcQcCnt);
  const mobile = toNumber(match.monthlyMobileQcCnt);

  return { keyword, pc, mobile, total: pc + mobile, found: true };
}

async function loadExistingData() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { updatedAt: null, keywords: {} };
  }
}

async function main() {
  const data = await loadExistingData();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  for (const keyword of KEYWORDS) {
    console.log(`조회 중: ${keyword}`);
    const result = await fetchKeywordVolume(keyword);

    if (!data.keywords[keyword]) {
      data.keywords[keyword] = { history: [] };
    }

    const entry = data.keywords[keyword];
    const todayRow = { date: today, pc: result.pc, mobile: result.mobile, total: result.total };

    // 같은 날짜 데이터가 있으면 덮어쓰고, 없으면 추가
    const existingIdx = entry.history.findIndex((h) => h.date === today);
    if (existingIdx >= 0) {
      entry.history[existingIdx] = todayRow;
    } else {
      entry.history.push(todayRow);
    }

    entry.history = entry.history.slice(-MAX_HISTORY_DAYS);
    entry.found = result.found;

    // API 호출 간 짧은 텀 (레이트리밋 대비)
    await new Promise((r) => setTimeout(r, 300));
  }

  data.updatedAt = new Date().toISOString();

  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`저장 완료: ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

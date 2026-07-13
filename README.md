# 복호두 키워드 검색량 트래커

네이버 검색광고(SearchAd) API로 키워드의 월간 검색량(PC/모바일)을 매일 오전 9시(KST)에 자동 수집하고,
`index.html`에서 추이를 보여주는 정적 사이트입니다.

## 구조

```
naver-keyword-tracker/
├── index.html                     # 프론트엔드 (data.json을 읽어 렌더링)
├── data.json                      # 수집된 데이터 (자동 갱신됨)
├── scripts/fetch-naver.js         # 네이버 API 호출 + data.json 갱신 스크립트
├── package.json
└── .github/workflows/update-data.yml   # 매일 자동 실행되는 GitHub Actions
```

## 1. 네이버 검색광고 API 키 발급

1. https://searchad.naver.com 에 광고주 계정으로 로그인
2. 우측 상단 **도구 > API 사용 관리** 이동
3. **API 사용 신청** 후 발급되는 3가지 값을 확인
   - `ACCESS LICENSE` → `NAVER_API_KEY`
   - `SECRET KEY` → `NAVER_SECRET_KEY`
   - **고객 ID (CUSTOMER ID)** → `NAVER_CUSTOMER_ID` (계정 정보에 표시되는 숫자)

> ⚠️ SECRET KEY는 절대 코드나 `data.json`, 커밋 이력에 직접 넣지 마세요. 반드시 GitHub Secrets로만 다룹니다.

## 2. GitHub 저장소 준비

1. 이 폴더 전체를 GitHub 저장소에 업로드(push)
2. 저장소 **Settings > Secrets and variables > Actions** 로 이동
3. **New repository secret** 으로 아래 3개를 등록
   - `NAVER_API_KEY`
   - `NAVER_SECRET_KEY`
   - `NAVER_CUSTOMER_ID`

등록해두면 `.github/workflows/update-data.yml` 워크플로우가 매일 00:00 UTC(=오전 9시 KST)에
자동으로 `scripts/fetch-naver.js`를 실행하고, 결과를 `data.json`에 커밋합니다.

바로 테스트하고 싶다면 저장소의 **Actions** 탭 → `Update Naver Keyword Data` → **Run workflow** 로 수동 실행할 수 있습니다.

## 3. 키워드 추가/변경

`scripts/fetch-naver.js` 상단의 배열을 수정하세요.

```js
const KEYWORDS = ["복호두"]; // 예: ["복호두", "호두과자", "천안호두과자"]
```

키워드를 추가하면 `index.html`에서도 해당 키워드를 보여주도록 수정이 필요합니다
(현재는 `복호두` 한 개만 카드로 표시하도록 되어 있습니다). 여러 키워드를 동시에 보여주는
버전이 필요하면 말씀해주세요.

## 4. 사이트 배포

### GitHub Pages
1. 저장소 **Settings > Pages**
2. **Source**: `Deploy from a branch` → 브랜치 `main`, 폴더 `/ (root)` 선택
3. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 에서 확인 가능

### Netlify
1. Netlify에서 **Add new site > Import an existing project**
2. GitHub 저장소 연결, 빌드 명령 없음 / publish directory `/` 로 설정
3. 배포 완료

두 방식 모두 `index.html`이 `fetch("data.json")`으로 같은 저장소의 파일을 읽으므로
별도 서버나 백엔드가 필요 없습니다.

## 로컬 테스트

`index.html`은 `fetch()`로 `data.json`을 불러오므로 `file://`로 직접 열면 브라우저 보안 정책 때문에
로딩이 실패할 수 있습니다. 아래처럼 간단한 로컬 서버로 확인하세요.

```bash
python3 -m http.server 8000
# 이후 http://localhost:8000 접속
```

API 호출을 로컬에서 테스트하려면:

```bash
export NAVER_API_KEY=...
export NAVER_SECRET_KEY=...
export NAVER_CUSTOMER_ID=...
node scripts/fetch-naver.js
```

# 인수인계 — 에덴 편성 연구실

어나더 에덴(한국 서버) 파티 편성 계산 페이지입니다. 보유 캐릭터·천명치·글래스터를 넣으면 성향(종합·보스·약점·최고점 등)별 1~5위 파티, 턴별 운영, 장비 추천을 계산합니다. 화면 설명은 `README.md`, 날짜별 결정·사용자 확인값·계산 규칙은 `CLAUDE.md`(작업 메모, 가장 자세함)에 있습니다.

- 마지막 정리: 2026-11-13 (코드 기준 커밋 5b595e7, 2026-10-28)
- 데이터: 캐릭터 324명(스타일별), 보스 173개, 데이터 기준일 `src/data/meta.json`
- 배포: GitHub Pages `https://wlrajrgksmsrpwjd.github.io/eden-party-lab/` (공용 비밀번호로 잠긴 페이지)

## 1. 이 압축에 든 것 / 뺀 것

| 들어 있음 | 설명 |
|---|---|
| `src/` | 원본 전부 — 엔진·화면·데이터·빌드 스크립트 |
| `vendor/` | 장비 빌더(출처: 딩). 아래 '지켜야 할 것' 참고 |
| `index.html`, `builder.html` | 지금 배포 중인 **잠긴** 페이지(비밀번호 없이는 못 엶) |
| `README.md`, `CLAUDE.md`, `LICENSE`, `.gitignore`, `.nojekyll` | 설명·작업 메모·이용 조건·배포 설정 |

| 뺀 것 | 이유 · 다시 만드는 법 |
|---|---|
| `access.json` | 비밀번호 파일. 운영자에게 따로 받거나 새로 정함 → 2-2 |
| `dist/` | 잠기지 않은 전체 페이지. 빌드하면 생김 → 2-3 |
| `.git` (커밋 기록 223개, 290MB) | 용량이 크고 잠금 전 페이지·개인 정보가 들어 있음. 기록이 필요하면 GitHub 저장소에서 받음 |

## 2. 처음 할 일

### 2-1. 준비물
- Python 3.10 이상(3.13에서 확인), 추가 패키지 없음
- Node.js 18 이상(22에서 확인) — 빌드 중 `src/tools/*.js`를 부름
- (선택) playwright — 예시 결과 캐시 만들기·화면 점검에만: `npm i -g playwright && npx playwright install chromium`

### 2-2. 비밀번호 넣기
```
node src/tools/access.js set "공용" 지금쓰는비밀번호     # 영문·숫자 8자 이상
node src/tools/access.js list                            # 확인
```
비밀번호를 바꾸면 새 비밀번호로 빌드·배포한 순간부터 예전 비밀번호로는 안 열립니다(테스터에게 다시 알려야 함). 사람마다 따로 주려면 `add "이름"`(새 코드 발급)·`remove "이름"`.

### 2-3. 빌드
```
python3 -I src/build.py
```
- `dist/index.html`·`dist/builder.html` = 잠기지 않은 전체 페이지(확인용, 저장소에 안 올림)
- `access.json`이 있으면 루트 `index.html`·`builder.html`을 새 잠긴 페이지로 다시 만듦(없으면 루트는 그대로 두고 경고)
- 확인: `python3 -m http.server` 후 브라우저에서 `http://localhost:8000/dist/index.html`

빌드 출력에 `※ sample_cache.json이 지난 계산 버전입니다`가 나오면 2-4를 하세요.

### 2-4. 예시 결과 캐시(엔진·캐릭터·보스 데이터를 바꿨을 때)
처음 방문자(예시 보유)에게 바로 보여 주는 결과입니다. 계산 버전이 다르면 앱이 무시하고 직접 계산하므로 틀리진 않지만 첫 화면이 느려집니다.
```
python3 -I src/build.py && NODE_PATH=$(npm root -g) node src/tools/sample_cache.js && python3 -I src/build.py
```

## 3. 폴더 구조

| 경로 | 내용 |
|---|---|
| `src/engine.js` | 계산 엔진(브라우저·Node 공용). 대미지 식, AF·SB, 존, 실전 N턴 시뮬, 처치 턴, 탐색 |
| `src/app.js`, `src/app.css`, `src/body.html` | 화면. 무거운 계산은 엔진을 Blob 워커로 띄워 나눠 돌림 |
| `src/eqopt.js` | 장비 추천 |
| `src/build.py` | 데이터 합치기·한국어 표시·계산 버전·잠금까지 한 번에 |
| `src/ko.py`, `src/data/hanja_ko.json`, `src/data/skill_ko.json` | 일본어 → 한국어 표시(계산용 원문은 그대로) |
| `src/data/chars_*.json` | 캐릭터(형식 `src/data/SCHEMA.md`) |
| `src/data/bosses*.json` | 보스(흉성·서약·HP 구조·기믹 포함) |
| `src/data/*.json` 그 밖 | 조건부 버프·디버프·체인·요격·AF 타이밍·누적·버디 등 보강 데이터(형식 SCHEMA.md·EXTRA_BRIEF.md) |
| `src/builder_theme.css`, `src/builder_plus.js` | 장비 빌더에 붙이는 테마·캐릭터 불러오기 |
| `src/tools/` | `access.js`(비밀번호) · `lock.js`(잠금, 빌드가 부름) · `bchars.js` · `sample_cache.js` · `check_nan.js` · `smoke.js` |
| `vendor/ae-builder`, `vendor/ae-builder-core` | 딩 님 장비 빌더·계산 코어(원본 그대로) |

## 4. 고치는 흐름

1. `src/` 아래를 고침(루트 `index.html`·`builder.html`은 직접 고치지 않음 — 빌드 결과물)
2. `python3 -I src/build.py` (엔진·데이터를 바꿨으면 2-4까지)
3. 점검(5장)
4. 올리기 전에 `git status`로 **`access.json`·`dist/`가 목록에 없는지** 확인 → commit → push
5. GitHub Pages가 main 브랜치 루트를 1~2분 안에 반영

데이터만 손볼 때는 `README.md`의 '데이터 업데이트 절차'가 순서대로 정리돼 있습니다.

## 5. 점검

| 명령 | 통과 기준 | 시간 |
|---|---|---|
| `node -e "const E=require('./src/engine.js'); console.log(Object.keys(E).length)"` | 오류 없이 숫자 | 즉시 |
| `node src/tools/check_nan.js` | 마지막 줄 `bad 0` (캐릭터마다 조합 계산해 NaN·음수·오류 찾기) | 약 5분 |
| `NODE_PATH=$(npm root -g) node src/tools/smoke.js` | `errors []` 세 줄 (휴대폰·데스크톱·장비 빌더 화면 오류·가로 넘침) | 약 3분 |

엔진 결과 모양을 바꾸면 `src/app.js`의 `workerMain`·`calcOptimize`·`calcPerChar`도 같이 맞춰야 합니다(워커와 화면이 같은 값을 주고받음).

## 6. 잠금 방식과 한계

- 빌드마다 새 키로 전체 HTML을 압축 + AES-256-GCM 암호화, 비밀번호마다 PBKDF2-SHA256(250,000회)로 그 키를 감쌈. 브라우저가 WebCrypto로 풀어서 띄움. '기억하기'를 누르면 비밀번호가 그 브라우저(localStorage `aeopt_ac`)에 남음.
- **한계**: 공개 저장소라 `src/`(원본)와 예전 커밋(잠그기 전 페이지)은 누구나 볼 수 있음. 막으려면 원본을 비공개 저장소로 옮기고, 공개 저장소는 잠긴 페이지만 남긴 새 기록으로 다시 만들어야 함(되돌릴 수 없음). 운영자는 2026-10-18에 번거로워서 보류하고 지금 방식을 유지하기로 함.

## 7. GitHub 넘기는 방법(운영자와 정할 것)

- 지금 저장소를 계속 쓰기: 운영자가 GitHub 저장소 Settings → Collaborators에 새 담당자를 추가하거나, 저장소 자체를 넘김(Transfer). 주소가 바뀌면 테스터에게 새 주소를 알려야 함.
- 새로 시작하기: 이 압축으로 새 저장소를 만들고 Settings → Pages에서 main 브랜치 루트를 배포. `.gitignore`가 `access.json`·`dist/`를 막아 둠.

## 8. 지켜야 할 것

- **장비 빌더·계산 공식 출처: 딩.** `vendor/`와 대미지 식(딩 계산기 v4.016)·스킬 DB 대조는 딩 님 허락·출처 표기 조건으로 씀. 화면의 출처 표기를 지우지 말 것.
- 이용 조건은 `LICENSE`(저작권자 허락 없이 사용·복제·재배포 금지). 넘겨받아 운영하는 범위는 원래 운영자와 정할 것.
- 게임 그림·로고는 쓰지 않음(테마는 직접 그린 시계·별 무늬).
- aecheck.com 연동은 사용자가 붙여 넣은 데이터만 읽음 — 남의 API 토큰을 쓰지 않음.
- 커밋에 회사·개인 이메일이 남지 않게(지금 기록은 `Claude <noreply@anthropic.com>`으로 통일). 자기 이름으로 올릴 거면 GitHub의 noreply 주소를 쓰는 걸 권장.
- `src/engine.js`는 한 줄이 긴 코드가 많음 — 줄 중간에 `//` 주석을 달지 말고 `/* */`를 쓸 것(뒤 코드가 주석이 되는 버그가 실제로 두 번 있었음).

## 9. CLAUDE.md 읽는 법

날짜별로 '무엇을 왜 바꿨는지'와 운영자가 게임에서 확인해 준 값('사용자 확인')이 쌓여 있습니다. 계산이 이상해 보이면 그 항목 이름(예: 'SB 존 규칙', 'AF 한 번 총 피해 상한')을 이 파일에서 찾아보세요. 본문의 '스크래치 …/…' 경로는 작업 중 임시 폴더라 압축에 없습니다(결과는 이미 데이터·코드에 반영됨). Claude로 이어서 작업하면 이 파일을 프로젝트 지시로 읽습니다.

## 10. 확인이 남은 것

게임에서 확인하면 계산이 더 정확해지는 것들입니다(지금은 괄호 안 가정으로 계산).

- 극 무기 존에서 다른 타입 공격: −60(딩 코어, 지금 값) vs −30(위키·알테마·biligame)
- 성영의 서가 챌린지: AF 중 점수 상한 9.99억이 타격당인지(지금 타격당 — 투고 72건 대조로 고름), 챌린지 HP는 첫 턴부터 50% 아래로 봄, 편성 보너스 1000이 후열까지 전원 조건인지
- AF 도중 보스가 부활하면 남은 AF가 다음 목숨에 들어가는지(지금: AF 턴은 목숨 하나까지)
- ES EX 필살기: 레벨이 오르는 시점(턴 시작/끝), 50%에서 켠 AF도 레벨이 초기화되는지
- 스즈누이 미공개 수치(스탯·宿縁 1개당 양), 토비노오사마 게이지 파괴 조건
- 버프가 AF 턴에도 지속 턴을 쓰는지(지금 씀)

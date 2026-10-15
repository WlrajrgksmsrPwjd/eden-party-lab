# 어나더에덴 빌더 코어 (`ae-core.js`)

어나더 에덴 장비 빌드의 **대미지 계산**과 **최적 빌드 탐색**만 담은 라이브러리입니다. 화면은 없습니다.

- 파일 하나(`ae-core.js`, 약 580KB)에 장비 데이터가 들어 있고, 의존하는 것이 없습니다.
- 브라우저와 Node 18 이상에서 돌아갑니다.
- 어나더에덴 빌더 웹앱과 **같은 코드**에서 자동으로 뽑아 만든 파일이라, 같은 입력이면 앱과 같은 값이 나옵니다(`test/check.js`로 확인).

## 설치
npm 패키지(`ae-builder-core`)로 받은 `.tgz` 파일을 그대로 설치합니다.
```
npm install ./ae-builder-core-1.0.0.tgz
```
- 공개 npm에는 올리지 않았습니다. 그래서 `package.json`에 `"private": true`를 넣어, 실수로 공개 저장소에 올라가지 않게 막아 두었습니다.
- 사내 저장소에 올리려면 이 줄을 지우고 `npm publish`를 하면 됩니다. 공개 npm에 올리려면 먼저 아래 '출처'의 허락 범위를 원작자에게 확인하세요.
- 부르는 방법:
  ```js
  const AECore = require('ae-builder-core');   // CommonJS
  import AECore from 'ae-builder-core';         // ESM (기본 내보내기만 — import { evaluate } 형태는 안 됨)
  ```
- 브라우저에서는 `<script src="…/ae-core.js">`로 불러 `window.AECore`로 쓰거나, 번들러(Vite·webpack)로 위처럼 `import`합니다.
- TypeScript 타입 정의(`ae-core.d.ts`)가 들어 있습니다.
  - 타입은 `AECore.State`, `AECore.EvaluateResult`, `AECore.OptimizeOptions` …로 씁니다.
  - `settings`는 키 84개가 모두 타입으로 정해져 있습니다. 선택 칸은 고를 수 있는 값만 받습니다.
  - TypeScript 5.6, `strict`로 CommonJS·ESM 둘 다 검사했습니다.
- 버전: `AECore.version`

## 출처 (반드시 유지)
- 계산 공식: **AE 대미지 계산기 v4.016 (원작자: 딩)**의 '계산기' 시트를 JS로 옮긴 것입니다.
- 장비 데이터: **딩** 님의 장비 정리 시트입니다. https://cafe.naver.com/anothereden/160785
- 이 라이브러리를 쓰는 앱에도 "계산 공식·장비 데이터 출처: 딩"을 남겨 주세요. 문구는 `AECore.credit`에 있습니다.

## 파일
| 파일 | 내용 |
|---|---|
| `ae-core.js` | 라이브러리 (자동 생성 파일) |
| `ae-core.d.ts` | TypeScript 타입 정의 (`Settings`는 자동 생성) |
| `package.json` | npm 패키지 정보 (`npm test` = 전체 검사, `npm run test:quick` = 대미지만) |
| `FIELDS.md` | `settings`에 넣을 수 있는 키 84개: 화면 이름, 종류, 기본값, 고를 수 있는 값 |
| `example.js` | 사용 예시 (`node example.js`) |
| `test/check.js`, `test/golden.json` | 앱에서 계산해 둔 정답과 비교하는 검사. 대미지 300개, 최적 빌드 4개 |

## 빠른 시작
```js
// Node
const AECore = require('./ae-core.js');
// 브라우저: <script src="ae-core.js"></script> → window.AECore

const state = {
  settings: { str: 237, int: 420, power: 250, hits: 3, elem: '불', aff: '약점', tlv: 140 },
  weaponType: '지팡이',
  equip: { weapon: '성천의 지팡이 Ⅹ', g1: '치명격의 힘' },   // id('w1') 또는 정확한 이름
  ore: { g1: 'pot' },
  lunatic: [{ t: '심안' }],
};
const r = AECore.evaluate(state);                          // r.exp = 기대 대미지 (타수 합)
const o = await AECore.optimize(state, { weaponType: '지팡이' });
console.log(o.best.value, o.best.names);
```

## 상태(state) 형식
모든 키는 생략할 수 있고, 생략하면 앱의 기본값을 씁니다.

| 키 | 형식 | 뜻 |
|---|---|---|
| `settings` | `{ 키: 값 }` | 앱 입력칸 값. 키 목록은 `FIELDS.md`(= `AECore.fields`)에 있습니다. 숫자 칸은 숫자, 체크는 true/false, 선택은 문자열입니다. 모르는 키를 넣으면 오류가 납니다. |
| `weaponType` | `'검'` 등 8종 | 무기를 안 꼈을 때 기준이 되는 무기 종류 |
| `equip` | `{ weapon, armor, badge1, badge2, g1, g2, g3, g4, gs }` | 장비 id 또는 정확한 이름. `null`이면 빈 칸. `gs`는 전용 글래스터 칸입니다. |
| `ore` | `{ g1..g4, gs }` | `''` = 각성만, `'pot'` = 각성 + 잠재 연성, 그 밖은 광석 id(`'o12'`) 또는 광석 이름 |
| `lunatic` | `[{ t: '솔선'\|'결사'\|'심안' }]` | 루나틱 상태. 솔선에 `eqManual: true, eqEnd, eqSpr`를 주면 장비 내구·정신을 직접 넣습니다(기본은 장착 장비에서 자동). |
| `pgl` | `[{ n, c, o }]` | 파티원 P글래스터. `settings.pMode: 'pick'`일 때만 씁니다. `n` = 이름(`AECore.partyGlasters`), `c` = 장착 조건(예: `'<검>'`), `o` = `'pot'`이면 잠재 연성 |
| `pledge` | `{ pj: [[스탯, 값]×3], pn: [...] }` | 진 증표(`pj`)·일반 증표(`pn`)의 스탯 3줄. 예: `[['int', 30], ['spd', 20], ['', 0]]` |
| `gChoice` | `{ 글래스터id: ['int', …] }` | '(○○ 중 하나)+N' 글래스터에서 고른 스탯. 없으면 스킬 종류에 맞게 자동으로 고릅니다. |
| `wChoice` | `{ 장비id: ['', 1] }` | 'N종류 중 하나' 무기·방어구에서 고른 옵션 번호. `''`이면 대미지가 가장 높은 쪽을 자동으로 고릅니다. |
| `badgeVal` | `{ badge1: [{ s: 'spd', v: 35 }], badge2: [] }` | 수치가 정해지지 않은 배지(속도 배지 등)에 넣은 값 |
| `customs` | `[{ id: 'c1', slot, n, t, gwt, atk, mag, st: {str…}, fx: [{ type, v, … }] }]` | 커스텀 장비. `slot`은 weapon·armor·badge·glaster·gs 중 하나입니다. 만든 뒤에는 `equip`에 `'c1'`처럼 id로 넣습니다. `fx.type` 목록은 아래 '커스텀 효과'에 있습니다. |
| `myAttr` | `['동방', …]` | 내 캐릭터가 해당하는 성격·소속·속성. 특수 장착 조건 글래스터와 P글래 조건 판정에 씁니다. |
| `condPick` | `{ 'slot:g1': '동방' }` | 조건이 여러 개인 글래스터에서 그 칸에 고른 조건. 없으면 `myAttr`에 있는 조건을 자동으로 고릅니다. |

설정에서 자주 쓰는 키는 다음과 같습니다.

| 분류 | 키 |
|---|---|
| 캐릭터 스탯 (장비 제외) | `str int spd luck mp fate` |
| 스킬 | `power` (1타 위력 %), `hits`, `atkCls` (물리/마법), `kind` (기반 스탯), `elem`, `range`, `skMul` |
| 대상 | `tlv tdef tmdef aff` (통상/약점/저항), `tPoison tPain` |
| 전투 조건 | `hpPct af zoneT zone turns enemies` |
| 파티원 P글래 | `pMode` (`direct`/`pick`), `pHp pElem pZone` (직접 입력), `pAddHp pAddElem pAddZone` (선택 모드에 더하기) |

## API
| 함수 | 돌려주는 값 |
|---|---|
| `evaluate(state?)` | 아래 '`evaluate` 결과' 참고. 앱 메인 화면 합계와 같은 값입니다. |
| `detail(build?, state?)` | 빌드의 능력치(`atk mag str int spd luck mp crit`), 적용된 계산기 행 요약(`rows`), 칸별 효과 적용 여부(`per[칸] = [{t, ok}]`). `build = { equip, ore }`이고, 없으면 지금 장착한 빌드를 씁니다. |
| `optimize(state?, opt?)` → Promise | 아래 '`optimize` 옵션과 결과' 참고 |
| `find(q, { slot, type })` | 이름에 `q`가 들어간 장비 `[{ id, n, slot, t, wt, conds }]`. `slot`은 weapon·armor·badge·glaster, `type`은 무기 종류입니다. |
| `setState(state)` / `getState()` | 상태를 넣어 두거나 꺼냅니다. `evaluate()`처럼 인자를 생략하면 마지막 상태를 씁니다. |
| `calc(inp)` | 계산기 시트 그대로 계산합니다(셀 이름 입력: `D3..D10, G3..G6, J3..J6, F67, FM, rows`). `evaluate().input`이 이 입력입니다. |
| `items`, `ores`, `data`, `partyGlasters`, `fields`, `slots`, `weaponTypes`, `armorOf` | 데이터. 읽기만 하세요. |

### `evaluate` 결과
| 키 | 뜻 |
|---|---|
| `exp` | 기대 대미지 (크리율 반영, 타수 합) |
| `n` | 크리티컬이 없을 때 |
| `c` | 크리티컬 확정일 때 |
| `max` | 최대 |
| `crit` | 크리율 % |
| `mp` | 버프 반영 최대 MP |
| `per` | 타수별 `[{ exp, raw, n, c }]`. `raw`는 25억 경감 전 값입니다. |
| `raw` | 25억 경감에 걸렸을 때 경감 전 합. 안 걸리면 `null`입니다. |
| `kind` | 스킬 종류 |
| `input` | 계산기 입력 |
| `items` | 계산에 들어간 장비 이름 |

### `optimize` 옵션과 결과
옵션은 다음과 같습니다.

| 옵션 | 뜻 |
|---|---|
| `weaponType` | 찾을 무기 종류. 기본은 장착한 무기의 종류입니다. |
| `metric` | `'exp'` (기대값, 기본) / `'c'` (크리티컬 확정) / `'n'` (크리티컬 없음) |
| `af` | `'page'` = `settings.af` 그대로, `'on'`, `'off'` |
| `pins` | `[{ kind: 'weapon'\|'armor'\|'badge'\|'gl'\|'gs', id, ore }]` 고정 장비. `id: ''`이면 그 부위를 비워 둡니다. |
| `excl` | `[id 또는 이름]` 미보유 장비 |
| `dupEx` | `[{ n: 이름, kind: 'gl'\|'badge', max }]` 같은 이름을 여러 개 끼울 수 있게 하는 예외 |
| `dupOff` | `[이름]` 기본 중복 예외(중급 글래스터·HP 최대 시 강화·전능의 힘, 최대 4개)를 끌 이름 |
| `signal` | AbortController로 멈춥니다. 멈추면 그때까지 찾은 것 중 최선을 돌려줍니다. 아무것도 못 찾았으면 `best`는 `undefined`입니다. |
| `onTick(계산 횟수)` | 진행 상황을 받습니다. |
| 고급 | `restarts` (무작위 출발점 수, 기본 6), `climb` (`'both'`/`'first'`/`'steep'`), `routeCut` (0.9), `pairK` (8), `topN`, `pair` |

결과는 다음과 같습니다.

| 키 | 뜻 |
|---|---|
| `best` | `{ equip, ore, value, names }` |
| `alts` | 차점 최대 3개 |
| `current` | 지금 장착한 빌드의 값 |
| `evals` | 계산 횟수 |
| `stopped` | 중간에 멈췄는지 |
| `pinPlan` | 고정 장비 배치와 빠진 이유 |

- 걸리는 시간은 PC Node 기준 보통 10~50초이고, 계산은 4만~8만 번쯤 합니다.
- 40ms마다 잠깐씩 쉬어서 브라우저 화면이 멈추지는 않습니다. 그래도 Web Worker에서 돌리는 것을 권합니다.

## 꼭 알아 둘 것
- **한 번에 하나만 계산할 수 있습니다.**
  - 앱 코드가 전역 상태를 쓰기 때문에, `optimize`가 도는 동안 다른 함수를 부르면 오류가 납니다.
  - 동시에 여러 개를 돌리려면 Worker(또는 프로세스)마다 따로 불러오세요.
- 저장소(localStorage)는 쓰지 않습니다. 상태는 부르는 쪽이 들고 있다가 넘겨야 합니다.
- 장비 id(`w12`, `g40` …)는 데이터 순서로 붙습니다. 데이터가 바뀌면 id가 달라질 수 있으니, 오래 저장할 때는 **이름**으로 저장하세요.
- 같은 이름의 글래스터가 무기 종류별로 여러 개 있으면, 이름으로 지정했을 때 첫 번째를 고릅니다. 정확히 고르려면 `find(이름, { slot: 'glaster', type: '검' })`으로 id를 찾아 쓰세요.

## 계산 규칙 (앱과 같음, 사용자와 합의한 것)
- **행 번호**(26행, 43행 …)는 AE 대미지 계산기 v4.016 '계산기' 시트의 행입니다. 같은 행 안은 합연산, 행끼리는 곱연산입니다.
- **공격 타입·기반 스탯**:
  - 스킬의 물리/마법은 공격 타입에만 영향을 줍니다. 기반 스탯은 무기 기준입니다(지팡이 = 지능, 그 외 = 힘).
  - 마법 스킬이면 공격 타입은 '마법'입니다.
  - 무기를 안 끼면 `weaponType`의 '효과 없는 무기'로 계산합니다.
- **다단 강화** (`bMulti`): n번째 타 위력 +0/25/50/100/200%(25행 합연산).
- **스킬 위력 강화** (`skMul`): ×N → 25행 (N−1)×100%.
- **최종 대미지 배율** (`bFinal`, 피격 대미지 감소 등): 단일 공격 보정 다음, 25억 경감 전에 곱합니다. 25억 경감은 1타 기준입니다.
- **무속성**은 '모든 속성 공격' 효과를 받지 않습니다.
- **P글래**:
  - HP 조건(36행)·속성 공격(35행)은 장비 효과와 합연산입니다.
  - ZONE 각성 시(49행)는 따로 곱합니다.
- **ZONE**:
  - 49행 = 'ZONE 각성 중' + '극 ○○진 전개 시' (합연산)
  - 50행 = '○○진 전개 시'
  - 56행 = ZONE 자체 + ZONE 어빌리티
- **심안**: 대미지 ×1.5(44행)입니다. 약점이면 약점 배율 +1(26행)도 더합니다.
- **결사**: 대미지 ×1.7, 크리티컬 확정.
- **약점 대미지 강화**(포박의 공격 등):
  - 약점 배율을 건드리지 않고 43행에서 대미지에 바로 곱합니다(약점일 때만).
  - 중복되지 않고 가장 큰 값 하나만 씁니다.
  - 43행 순서: 약점 → MP 소비 공격 → 적 수.
- **중복 불가 효과**(겨누어 쏘기·약점·MP 소비·적 수·인핸스)는 가장 큰 값 하나만 씁니다.
- **루나틱 솔선**:
  - 초기 내구만큼 힘, 초기 정신만큼 지능이 늘어납니다(14·15행, 상태 효과 고정값).
  - 초기 값 = `settings.baseEnd`/`baseSpr`(장비 제외) + 장비가 주는 내구·정신입니다.
- **천명 잠김**: 천명 120 미만이면 배지 2 칸, 200 미만이면 글래스터 4 칸이 잠겨서 계산에서 빠집니다.
- **전용 글래스터 칸**(캐릭터 전용·특수계)은 광석을 연성할 수 없습니다.
- **특수 장착 조건 글래스터**는 `myAttr`에 조건이 없으면 계산에서 빠집니다.
  - 최적 빌드는 '조건 중 하나라도 충족'으로 판정합니다.
  - `evaluate`는 칸별로 고른 조건(`condPick`)으로 판정합니다.
- **최적 빌드**:
  - 같은 이름은 기본 1개만 끼웁니다. 중복 예외와 여러 번 고정한 수만큼은 더 끼울 수 있습니다.
  - 탐색 순서:
    1. 지배 관계로 후보 줄이기
    2. 출발점 8개마다 두 가지 방식으로 다듬기
    3. 방식별 1등에 중복 불가 효과 경로 분기와 두 칸 동시 교체
  - 근사 탐색이라 정답(완전 탐색)을 보장하지는 않습니다. 원본 저장소의 개발용 검증에서는 작은 문제 20개 모두 정답을 찾았습니다.

## 커스텀 효과 (`customs[].fx[].type`)
`elem` (+`e`: all·none·불…), `crit`, `mcrit`, `cpow`, `mcpow`, `hpmax`, `hplow` (+`th`), `tpain`, `tpoison`, `enh` (+`st`: 독·페인·봉인·도발), `normal`, `weak`, `aim`, `mpatk`, `enemies`, `growth` (+`max`), `gekoku` (`v` = 계수), `zone`, `zonet` (+`z`: 진 이름, `zk`: 극), `fateally` (+`who`: 천·명), `fallen` (+`max`), `wins`, `mppct`.

모든 효과에 `env`(가열·특수·날씨·지표·대기)를 붙이면 그 환경일 때만 적용됩니다.

## 검사
```
npm test               # 대미지 300개 + 최적 빌드 4개 (약 1~2분)
npm run test:quick     # 대미지만 (몇 초)
```

## 고치거나 다시 만들 때
- **원본 저장소(어나더에덴 빌더 전체)가 있으면**: `ae-core.js`를 직접 고치지 말고 `src/`를 고친 뒤 다시 만드세요.
  ```
  npm run build:core     # 앱 빌드 + 코어 다시 만들기
  npm run golden:core    # 앱에서 정답표 다시 뽑기 (계산 규칙을 일부러 바꿨을 때)
  npm run test:core      # 코어 = 앱 확인
  npm run pack:core      # → ae-builder-core-<버전>.tgz (버전은 core/package.json의 version을 올린 뒤)
  ```
  - `tools/build_core.js`는 앱 모듈에서 필요한 선언만 골라 붙입니다(목록은 그 파일의 `PLAN`).
  - 화면을 건드리는 코드가 새로 섞이면 빌드가 멈춥니다.
- **이 코어만 있으면**: `ae-core.js`를 직접 고쳐도 됩니다.
  - 구조: 계산 엔진(`AECalc`) → 가짜 입력칸(`FIELD_DEF`, `$`) → 앱 코드 → 공개 API(`AECore`)
  - 고친 뒤 `test/check.js`로 다른 결과가 바뀌지 않았는지 확인하세요. 계산 규칙을 일부러 바꿨다면 정답표도 새로 만들어야 합니다.

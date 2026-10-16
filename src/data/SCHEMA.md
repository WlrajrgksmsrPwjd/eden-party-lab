# 캐릭터 데이터 스키마 (JSON 배열, 파일 1개에 여러 캐릭터)

모든 값은 최대 강화 기준(성도각성 완료, 현현무기/진현현 있으면 적용, 스킬 강화 완료)으로 적는다.
수치를 모르면 null 대신 0, 텍스트는 "" 로.

```json
{
  "id": "melito",                      // 영문 소문자 식별자 (스타일 포함: "sesta_as", "tsukiha_es")
  "name_kr": "메리트",                  // 한국어 이름 (스타일 접미: "세스타(AS)", "츠키하(ES)", 이시층은 한국어 칭호 "도회의 자객")
  "name_jp": "メリト",
  "style": "NS",                       // NS / AS / ES / AC(얼터) 
  "element": ["fire"],                 // fire water earth wind thunder shade crystal none  (주력 1~2개)
  "weapon": "fist",                    // staff sword katana ax lance bow fist hammer
  "align": "shadow",                   // light(천) / shadow(명)
  "stellar": true,                     // 성도각성 가능 여부
  "release_jp": "2025-11",             // 출시 연월(모르면 "")
  "tier": "SS",                        // altema 총합 랭킹 SS/S/A/B/C, 없으면 ""
  "score": 99,                         // altema 평가점
  "roles": ["dps","support"],          // dps support healer tank debuffer zone breaker
  "main": {                            // 비(非)스텔라버스트 상황의 주력 공격 1개
    "skill": "燃命百掌",
    "target": "aoe",                   // st / aoe
    "kind": "phys",                    // phys / mag
    "stat": "pwr",                     // pwr / int / spd
    "element": "fire",
    "weapon_type": "blunt",            // slash pierce blunt magic
    "mult": 15,                        // 위력 배수 (특대=1x 기준으로 "威力15倍" 이면 15, "極大"는 1.25, 표기 없으면 1). 크기×배율은 스킬 한 번의 전체 위력(타수 합) — 1타 = ÷ hits
    "size": "xl",                      // s m l xl xxl (威力 小中大特大極大 -> s m l xl xxl)
    "hits": 3,
    "repeat": 1,                       // 재공격/재행동 횟수 (없으면 0). 조건 있으면 condition에 기술
    "rep_p": {"n": 1, "af": 1},         // (선택) 재공격 조건이 맞을 확률(숫자 또는 평상 n·AF af). 없고 condition이 있으면 0.7
    "execs": 1,                        // (선택) 한 행동의 실행 수(다른 스킬 연속 실행 포함, 재공격 제외). AF 게이지는 실행마다 찬다
    "repeat_af": 0,                    // (선택) AF 중 재공격 횟수가 다를 때
    "uses": 4, "alt": {…},             // (선택) 전투 중 횟수 제한(예: 狼志 4) — 허수아비 AF에서 다 쓰면 alt(스킬 필드 덮어쓰기, mcond 가능)로
    "crit_sure": false,                // 확정 크리티컬
    "def_ignore": false,
    "barrier_pierce": false,
    "af_combo_x": 1,                   // AF 콤보 배율 증가 (2배면 2)
    "condition": "자상 5000 이상이면 재공격"
  },
  "sb": {                              // 스텔라 버스트 시 주력(성도 스킬). 없으면 null
    "skill": "イブの秤・断罪炎撃", "target":"aoe","kind":"phys","stat":"pwr","element":"fire","weapon_type":"blunt",
    "mult": 50, "size": "xxl", "hits": 3, "repeat": 0, "crit_sure": false, "def_ignore": false, "barrier_pierce": true, "af_combo_x": 1,
    "condition": "HP 소모량 20000 이상일 때 50배"
  },
  "self_buff": {                       // 자신이 받는 버프 최대치 (%) — 자기 파티 버프 포함. 엔진은 같은 항목의 자기 파티 버프를 또 더하지 않음
    "pwr": 100, "int": 100, "spd": 0,
    "elem_atk": 100,                   // 자기 속성 공격 버프
    "weapon_atk": 50,                  // 무기종 대미지 버프
    "crit_rate": 300, "crit_dmg": 0,
    "over_crit": true,                 // 오버 크리티컬
    "singular_focus": true,            // 심기일체(MP최대치 물리대미지)
    "mental_focus": false,             // 정신통일(MP최대치 마법대미지)
    "overthrow": true,                 // 하극상
    "eagle_eyes": false,               // 호시탐탐
    "weak_dmg": 0,                     // 약점 시 대미지 UP %
    "multihit": false,                 // 다단강화(多段強化)
    // 선택 항목: extra_hit·barrier_pierce(자기 연격수+1·배리어 관통), mp_up·mp_flat(최대 MP %·고정값), pwr_flat·int_flat·spd_flat,
    // kesshi·shinan(루나틱 결사·심안), dmg_up+dmg_src+dmg_on(자기 주는 대미지 UP).
    // kesshi·shinan·dmg_on 은 true 또는 조건 {"sb":true}(SB 때·그 AF 남은 행동) {"req":{…}}(편성) {"zone":[키],"zlv":2}
  },
  "party_buff": {                      // 아군(전체 또는 인접)에게 주는 버프 최대치. 대상 제한은 scope에
    "scope": "adjacent",               // all / adjacent / right / left / none
    "restrict": "",                    // 예: "불 속성 아군만", "권갑 장비자만"
    "pwr": 50, "int": 50, "spd": 0,
    "all_elem_atk": 0,                 // 전속성 공격 버프
    "elem_atk": {"fire": 50},          // 특정 속성 공격 버프
    "weapon_atk": {"fist":0},          // 무기종별 공격 버프 (all 키 = 전무기종)
    "crit_rate": 0, "crit_dmg": 0,
    "over_crit": true, "singular_focus": false, "mental_focus": false, "overthrow": false, "eagle_eyes": false,
    "weak_dmg": 0, "multihit": false,
    "link": false,                     // 연계(連携) 부여
    "barrier_pierce": false,           // 아군 배리어 관통 부여
    "extra_hit": false,                // 연격수 +1 부여
    "mp_cost_zero": false,
    "dmg_up": 0, "dmg_src": "prayer",  // 주는 대미지 %UP(与ダメージ). dmg_src: prayer(기도)·song(가창)·other — 같은 종류는 최댓값 하나, 종류끼리 곱
    "dmg_el": "fire",                  // (선택) 그 속성 공격에만 주는 대미지 UP (○属性で与えるダメージ)
    "kesshi": false,                   // 루나틱<捨身>(결사) 부여: 대미지 ×1.7·크리 확정
    "shinan": false,                   // 루나틱<心眼>(심안) 부여: 대미지 ×1.5·약점 배율 +1
    "mp_up": 0,                        // 최대 MP %UP (정신통일·심기일체 계산에 들어감)
    "pwr_flat": 0, "int_flat": 0, "spd_flat": 0 // 스탯 고정값 UP(＋100 등, % 아님)
  },
  "debuff": {                          // 적에게 거는 디버프 최대치 (%)
    "pwr": 0, "int": 0, "spd": 0,
    "all_elem_res": 100,               // 전속성 내성 DOWN
    "elem_res": {"fire": 0},           // 특정 속성 내성 DOWN
    "phys_res": 100,                   // 물리 내성 DOWN
    "mag_res": 0,
    "weapon_res": {"blunt": 0},        // 참/타/돌 내성 DOWN (slash blunt pierce)
    "break": "fire",                   // 브레이크 종류 (속성명/slash/blunt/pierce/"")
    "weak_expose": "",                 // 약점 부여 (속성명 등)
    "weak_expose_start": false,        // (선택) 전투 시작 시 자동 부여(그 밖엔 부여한 사람이 행동한 뒤부터, 문구에 SB가 있으면 SB 때부터)
    "weak_expose_noaf": false,         // (선택) 긴 축적이 필요한 부여(예: 니나 理の再縫) → AF·SB 계산(축적 0에서 시작)엔 없음
    "pain_poison": true                // 페인/독 부여
  },
  "zone": {                            // ZONE 전개 (없으면 null)
    "type": "fire",                    // fire water earth wind thunder shade crystal / slash blunt pierce magic / 별도명
    "awakened": true,                  // 極/絶 존 전개 가능
    "condition": "전방 불 속성 3명 이상"
  },
  "support": {                         // 0~3 등급 (2026-10-15 알테마 전수 재조사 기준: 3 아군 전체에 반복·강하게, 2 전체지만 제한적(SB·1회·적은 양)이거나 한 명에게 강하게, 1 자신만·아주 작음, 0 없음)
    "heal": 1, "barrier": 2, "dmg_cut": 2, "cleanse": 0, "status_immune": 0, "debuff_guard": 0,
    "knockback_immune": 0, "guard": 0, "taunt": 0, "mp_recover": 0, "af_gauge": 0, "revive": false
  },
  "support_to": {"knockback_immune": {"pers": ["拳","槌"]}}, // (선택) 받는 사람 조건(buff_rules to 형식 또는 pos) — 생존 점수는 전열 중 해당 비율만큼
  "support_src": {"knockback_immune": "ツィタデーリ"},     // (선택) 담당 스킬(화면 표시)
  "play_kr": "운용 요약 2~4문장(화면 '운용 포인트')",
  "req": "",                           // 본령 발휘 조건 (예: "전방 권갑 4명", "불 ZONE", "AF 중")
  "tags": ["self_damage","fixed_damage"], // 자유 태그
  "note_kr": "자상 기반 초고화력 전체 딜러. 양옆 아군에 버프."
}
```

# 파티 버프 조건 규칙 (`buff_rules.json`)

`party_buff.restrict`에 적힌 조건을 계산용 규칙으로 옮긴 파일. 키는 캐릭터 id, 값은 규칙 배열. 빌드 때 각 캐릭터의 `party_rules`로 들어간다.
규칙에 없는 버프 항목은 기존처럼 전방 전원에게 100% 들어간다. 같은 항목에 규칙이 여러 개면 곱한다.

```json
{"f":["stat","weap"], "to":{"elem":["water"]}, "when":{"zone":["thunder"],"zlv":2}, "x":1, "e":0.5, "me":1}
```

- `f` 대상 버프 묶음: `stat`(pwr·int·spd) `pwr` `int` `spd` `elem`(전속성+속성) `allel`(전속성) `elat`(속성) `elat:fire`(특정 속성만) `weap` `crit` `critd` `sf` `mf` `focus`(sf+mf) `ot` `eagle` `oc` `mh` `xhit` `pierce` `weak` `link` `kou`(리나리아 巧撃: 크리율·오버크리·완력 고정값 `pwr_flat`) `shinan`(심안) `kesshi`(결사) `dmg`(주는 대미지) `mp`(최대 MP) `flat`(스탯 고정값) `*`(전부)
- `to` 받는 사람 조건: `pos`(`self` `one` `adj` `selfone` `selfadj` `others`) + `side`(`r` 오른쪽/`l` 왼쪽), `elem` `weap` `wt` `align` `kind`(phys/mag) `kof` `pers`(퍼스널리티 일본어 원문 배열, extra 데이터로 판정), `p`(판정 불가 조건 → 맞을 확률)
- `when` 발동 조건: `zone`(`any` `elem` `weap` 또는 존 키 배열: fire…crystal, slash/pierce/blunt/magic, slash_pierce, slash_magic, all(성해진), all_weapon(섬격진), moonlight), `zlv`(2=극/어나더 존, 3=절), `sb`, `af`, `noaf`(AF 중엔 없음: AF는 축적 0에서 시작하므로 긴 축적이 필요한 스킬, 예 니나 理の再縫), `req`(전방 구성, parseReq 형식. 퍼스널리티는 `{"kind":"pers","vals":["アルカディア"],"n":2}`), `reqAny`(편성 조건 중 하나만 맞아도), `pain`(파티에 독·페인), `up`(켜져 있는 비율), `t`(짧은 버프: SB·AF 땐 100%, 평상 턴엔 이 비율)
- `x` 조건 충족 시 배율(기본 1), `e` 미충족 시 배율(기본 0), `en` 평상 턴에만 쓰는 미충족 배율(지속 턴이 짧아 SB·AF 땐 다 받지만 평상엔 일부만), `me` 1이면 버퍼 자신은 조건과 무관하게 `x`
- `{"zel":true}`: 속성 공격 버프가 펼친 속성 존의 속성을 따라감

# 보강 데이터 (`extra/*.json`)

EXTRA_BRIEF.md 형식. 빌드 때 각 캐릭터의 `ex`(personality·mp·turns·buff_how·manifest)로 들어가고, `ko`가 있으면 공식 한국어 스킬명으로 표시한다.
엔진은 `mp.main`·`mp.buff`·`turns.buff`·`buff_how`로 일반 턴 시뮬레이션(MP·버프 지속)을, `personality`로 퍼스널리티 조건을 판정한다.

# 디버프 조건 규칙 (`debuff_rules.json`)

적에게 거는 디버프의 지속 턴·조건·단일 대상 여부. 형식은 파티 버프 규칙과 같고(`when`·`x`·`e`·`en`), 받는 사람 조건 `to`는 쓰지 않는다.

- `f` 디버프 묶음: `allres`(전속성 내성) `elres`(속성 내성) `res`(둘 다) `pres`(물리·마법 내성) `wres`(참·타·돌 내성) `def`(내구·정신)
- `st: true` 단일 대상 디버프 → 적이 여럿인데 전체 공격이면 맞는 적 비율만큼만
- 지속 턴 가이드(`when.t`): 매 턴 다시 걸어야 하는 1턴 효과 0.4~0.5, 2턴 0.65, 3턴 0.85

캐릭터 `debuff`에 `end`(내구 DOWN %)·`spr`(정신 DOWN %)를 둘 수 있다. 화력 효과는 빌더 계산식 기준 −50%에 물리 약 +8%, 마법 약 +6.5%.

# 체인 어빌리티 (`chain.json`)

키 = 캐릭터 id, 값 = 배열. `on`(발동 조건: `by` other/any, `act` attack/skill/buff/debuff/heal/any, `elem`·`wt`·`kind`·`tgt` 필터, `rand` 턴마다 무작위 조건 목록), `max`(턴당 최대), `atk`(추격: target kind stat element weapon_type size mult hits, 선택 `mult_seq`·`mult_max`), `every`(N회마다 공격), `when`(규칙 when 형식), `af`(AF 중 발동 여부, 모르면 null).
턴당 발동 수 = min(max, 조건에 맞는 아군 행동 수). 평상 턴은 시뮬레이션의 행동 비율, SB 턴은 전원 1회. AF 중에는 발동하지 않는다(사용자 확인).

# AF 타이밍 보정 (`af_timing.json`)

1턴 AF 허수아비(개전 즉시 AF 100%, 세팅 턴 없음)에서 다 받지 못하는 효과. 키 = 캐릭터 id, 빌드 때 `af_t`로 들어간다(2026-10-15 알테마 전수 대조, 근거는 `why`·`src`).
- `party`·`self`·`deb`: 항목(party_buff/self_buff/debuff 키)마다 숫자(AF·SB 계산 때 그 비율, 평상 턴은 그대로) 또는 `"sb"`(SB를 쓴 뒤에만: SB 턴·그 AF의 남은 행동, 평상 턴엔 없음). 자기 파티 버프 보정은 자기 몫에도 들어간다. `deb.break`·`deb.weak_expose`가 0.5 미만이면 AF 땐 없음.
- `zone`: `"none"`(AF에선 그 사람이 존을 못 폄), `"base"`(AF에선 극 없이 일반 존).
- 체인 어빌리티·오더 스킬·요격·카운터는 AF 중 발동하지 않는다(사용자 확인). 체인 추격은 평상 턴(평상 턴 SB 포함)만.

캐릭터에 `sb_normal`(SB가 아닐 때 성도 스킬, 스킬 형식 + mcond·af_x 가능)을 두면 AF 행동마다 주력과 비교해 큰 쪽을 쓴다(AF 중 MP 0, 사용자 확인). party_buff `mp_atk`(MP消費攻撃 대미지 %, 최댓값 하나·장비 +15%를 대체).

스킬(main·sb)에는 `af_x`(AF·SB 때 위력 배율: 턴 종료 공격·요격형·HP 소모 조건 등)와 `repeat_af`(AF·SB 때 재공격 횟수)를 둘 수 있다. `af_note`는 근거.

# 스킬 위력 조건 (`skill_cond.json`)

키 = 캐릭터 id, 값 = `{"main": {...}, "sb": {...}}`. 스킬의 `mult`(최대 배율)는 `need` 조건이 모두 맞을 때만 쓰고, 아니면 `base`. `steps`는 중간 단계 `[[배율, [조건…]], …]`.
조건: `{"zone":[키],"zlv":2}` `{"req":{…}}` `{"stack":"이름","turns":N}`(이름에 '소비형'이면 쓸 때마다 다 소모) `{"hp":"self|max|low"}` `{"mp":"high"}` `{"af":true|false}` `{"enemy":"poison|pain|weak|break|debuffs"}` `{"turn":">=N"}`(AF·SB = 1턴째로 판정) `{"noaf":true}`(AF·SB 땐 불충족) `{"other":"…"}`(판정 불가 → 60%로 계산). 조건마다 `af_p`(AF·SB 때 충족 비율 직접 지정: 개전 축적량·AF 중 안 느는 축적, 대조 근거는 알테마)를 둘 수 있다. `{"af":…}`는 SB도 AF 안에서 쓰는 것으로 본다.

# 결실 현현 보스 (`bosses_kesshitsu.json`)

보스 스키마 + `required`(필수 캐릭터 id), `required_alt`(AS 등 대체 가능 후보), `enemies`(적 구성), `pledges`(페이지에 실린 서약 예시: `as_of`, `list[].conds[]` — kind `nokill` `size` `comp`(elem·weap·n, `gender`) `turns` `all` `other`). 서약은 매주 화요일 12:00(JST) 바뀌고 모든 보스가 같은 서약을 쓴다.

# 캐릭터 기본 스탯 (`stats.json`)

키 = 캐릭터 id, 값 = `[hp, mp, pwr, int, spd, end, spr, lck]` — 레벨 최대·천명치 0·장비 없음(영문 위키 Stats Index, 2026-10 사용자 제공 PDF). 빌드 때 캐릭터 `stats`로 들어간다.
천명치 t의 값 = 기본 + `fate.json` 단계 보너스 합(t 이하) + t≥255이면 힘·지성·속도·내구·정신·운 +10 (엔진 `statsAt`). 위키 영문 이름 ↔ id 대응은 천명 보너스 순서로 검증했다.
엔진 사용: 주 스탯 대미지 (스탯/기준)^지수(물리 기준 221·지수 1.0, 마법 232·1.1, 빌더 계산식에서 잰 값), 물리 크리율 +(운−156)/1600, 속도(1턴 버프 순서·AF 249 판정, 빌드 코드가 있으면 장비 포함 속도, 없으면 기본 + 무기종별 장비 속도 자동값 GEAR_SPD_AUTO: 딩 빌더 대미지 최적 장비 측정치).

# 천명치 보너스 (`fate.json`)

키 = 캐릭터 id, 값 = `[[단계, {스탯: 값}], …]` (단계 5·15·30·50·75·105·140·175·215·255, 스탯 키 hp mp pwr int spd end spr luck). altema 표에 위키 Stats Index로 어긋난 표를 바로잡았다.

# AF 연출 시간 (`af_anim.json`)

키 = 캐릭터 id, 값 = AF 중 스킬 연출 시간(초). 없으면 계산 방식 탭의 기본값(2초). 재행동·연속 실행 스킬은 엔진이 실행 횟수만큼 곱한다.

# 요격 (`counter.json`)

키 = 캐릭터 id, 값 = `{trig, taunt, copy?, atk, skill?, modes?, heal?}`. 맞은 타수마다 1번 반격(`copy`: 루나틱<복사>면 2번 — true 또는 가동률 0~1), 행동불능 상태이상이면 발동 안 함.
`skill`: 요격을 거는 스킬 이름(buff_acts 행동 이름과 같으면 그 행동을 달고 써야 요격, 평상 턴 유지율). `modes`: `[{p, mult, cover:"aoe", heal_x}]` 상태별 요격(가동률 p, 위력 mult, 그동안 守護로 아군 대신 맞기, 회복 배율) — 나머지 1−Σp는 기본.
`heal`: `{hp, mp}` 요격 1번마다 아군 전체 회복 %(MP는 평상 턴 MP 계산에 들어감). 요격도 공격이라 AF 게이지가 참(존이 있으면 요격 1번 = 행동 1번, 복사 2번째는 없음).
`_cover` = `{id: "aoe"|"sb"}` 아군 대신 맞기(수세·전체공격 대신 받기). aoe면 적 전체공격 1번이 전열 수만큼 그 캐릭터에게 들어온다. 빌드 때 캐릭터 `cover`로 들어간다.

# 전투 시작 AF 게이지 (`af_start.json`)

키 = 캐릭터 id, 값 = `{start, need?, buddy?}`: 그 캐릭터가 전열이고 조건(전열 속성 수 `need:{elem,n}`, 메인·서브 버디 `buddy:[키]`)이 맞으면 시작 게이지 %. `_refill` = `{id: {on:"sb", to, cost}}` SB 사용 시 AF 게이지 회복(cost: 먼저 비AF 턴에 쓰는 게이지).

# 캐릭터 묶음 (`char_base.json`)

키 = 캐릭터 id, 값 = 같은 캐릭터 스타일(NS·AS·ES)의 공통 키. 한 파티(전열·후열)에 같은 키는 하나만. 영문 위키 이름 기준, 위키에 없는 캐릭터는 `jp:일본어 이름`.

# 스킬 위력 조건 추가 (`skill_cond.json`)

`top`: 최대 배율을 스킬 데이터 대신 이 값으로. 조건 `{"stat":"spr","full":500,"buff":0.5,"sum":"front"}`: 기본 스탯(천명치 반영)×(1+buff) ÷ full 비율(sum이 front면 전열 합).

# 스텔라 보드 (`stellar.json`)

키 = 캐릭터 id. `stats`: 성도각성 스텔라 보드 스탯 합계(hp mp pwr int spd end spr lck, `all` = HP·MP 외 전 스탯). 성도각성한 캐릭터의 기본 스탯에 더한다(자료가 있으면 천명 30·50·80 근사 배율은 쓰지 않음). `fill`: 天冥 어빌리티(행동할 때 쌓이는 天/冥의 힘 증가 = SB 게이지 충전 보너스) 조건, parseReq 형식(`align`·`pers`). 조건이 안 맞으면 충전 보너스 없음. `tenmei`: 원문 요약.

## revive.json
키 = 캐릭터 id, 값 = `{"g": 등급 0~3, "fx": [{"k": "revive|prevent", "t": "all|front|single|back|self", "w": "any|auto|sb|once|stack|null", "s": "스킬 이름", "c": "조건"}]}`. g = 3×min(1, 최고 효과 + 0.3×둘째), 효과값 = 종류(부활 0.8·방지 1.0) × 대상(전체 1·한 명 0.6·후열만 0.3·자신 0.25) × 시점(평소·턴 자동 1, 개전 1회 0.7, SB 0.55, 1회 0.45, 축적 0.35, 미상 0.4). 빌드 때 `c.revive`로, 엔진 `sup.revive`(숫자)·`sup.reviveFx`.

## lunatic.json
`teishin`: 루나틱<솔선(挺身)> 캐릭터 id → 출처. 엔진은 자신의 기본 내구(힘 공격)·정신(지성 공격)을 고정값으로 더함.

## inflict.json `dummy`
허수아비 1턴에서 독·페인이 걸리는 시점: `start`(개전 자동), `start_sb`(성도보드 개전 자동 — 성도각성 시만), `main`(주력 공격 뒤), `skill`(주력이 아닌 스킬, AF 행동 한 번 필요).

## turn_end.json
턴 종료(행동을 쓰지 않고 자동으로 나가는) 공격·고정 대미지. 키 = 캐릭터 id, 값 = `[{name, atk: 스킬 형식(target kind stat element weapon_type size mult hits) | null, fixed: {v: 1타 고정 대미지, n: 타수, target} | null, when: 규칙 when 형식, up: 평상 턴 발동 비율, sb_only, note}]`. 평상 턴(실전 N턴·지속)에만 더함(허수아비 1턴 AF엔 없음 — 턴 종료는 AF 뒤). 고정 대미지는 버프·내성 무관, 1타 상한만. 엔진 `turnEndCalc`.

## self_stk.json
자기 스택 → 자기 버프. 키 = 캐릭터 id, 값 = `{self_buff 키: skill_cond stack 조건 형식(stack·turns·start·af_grows·af_p)}`. 그 self_buff 최대치에 축적 채움 비율(condP)을 곱함(숫자는 곱, true/조건은 0.5 이상이면 켬).

## buff_acts.json attack 행동 위력
`k: "attack"` 행동에 `el`(속성/none) `wt`(slash/pierce/blunt/magic) `size` `mult` `hits`가 있으면 그 위력으로 계산(허수아비 AF 행동, 평상 턴 시뮬은 주력 대비 위력 비율, 최대 1). 없으면 특대 1배.

## 아군 挺身
`party_buff.teishin: true` + buff_rules `f:["teishin"]`(조건: 絶 존·가창 등) → 받는 사람 기본 내구(힘 공격)·정신(지성 공격)을 고정값으로 더함(자기 挺身과 겹치지 않음).

## 2026-10-16 엔진 2차 보강 데이터

- `buff_acts.json` 행동 g의 `self.<self_buff 키>`: 그 자기 버프의 출처 행동(auto 처음부터 · main 주력 뒤 · buff/attack 그 행동 뒤 · sb SB 뒤). g에 없는 self 키는 늘 켜짐. 행동 `z: "deploy"|"awaken"`(존 전개·각성, g가 비어도 행동), `zk`(존 종류), `lv`(2면 그 행동으로 바로 극), `afx`(공격 버프기 AF 콤보 배율).
- `state.json`: 시간 한정 상태(루나틱 3턴·개전 N턴·모드). 데이터 값 = ON. `self_off`(OFF 때 0이 되는 self 키, "teishin" = 자기 挺身), `main_off`/`sb_off`(OFF 때 바뀌는 스킬 필드, mcond 포함), `pow`(+`pow_to`), `on_self`, `party_off`, `start`·`dur`·`uses`·`cd`·`cycle`·`up`(평상 턴 가동률), `af`(허수아비 AF·SB 0~1 또는 "sb"), `res`(자원 소비형: `{start, exec: 실행마다 소비, step: 행동 소비}` — 테오도로스 闘魂).
- `alts.json`: 주력 후보(스킬 형식 + `when`·`normal`·`af`·`cycle`·`attack:false`). 상황마다 가장 센 것.
- `once.json`: 전투 중 1회·첫 사용·N턴마다 강공격(`atk`, `per`: battle | every:N, `af`, `first`).
- 스킬 필드 `combo_scale: {lo, hi, full, when?}`(AF 콤보 0.75→full에서 lo→hi배), `combo_add: k`(위력 += k×콤보). party_buff `combo_up`(타수당 콤보 증가 +%p, 규칙 묶음 combo).
- chars `zone.vc_only`(VC로만 전개 → 1턴 AF 존 없음), `zone.breaks`(존 파괴 후 전개, "sb"면 SB만), `zone.awaken_any: {kinds, skill}`(남이 편 일반 존을 극으로).
- 스킬 칸(사용자 확인): 천명치 80 미만 3칸, 이상 4칸. 주력(통상 공격 변화 제외)·AF 전용·비SB 성도 스킬이 먼저 쓰고 남는 칸에 buff/attack 행동(앞쪽부터).
- `style_bonus.json`: 다른 스타일 5성 보드 완성 보너스 `[{from: 스타일 id, add: {스탯: 고정값}}]` — 그 스타일을 보유하면 완성으로 봄(설정 styleBonus=false로 끔, app settings의 ownedIds).
- `stellar.json` `stats`(2026-10-16 위키 시트: 6스탯은 모든 능력 +20 포함, all 없음)·`lv100`(Lv80→100 성장분 HP·MP·6스탯). `fate.json` 255 단계에 공통 +10 포함(엔진 규칙 삭제).

## 2026-10-16 帯電·행동 순서

- self_buff/party_buff `charge`(帯電, 루나틱<帯電>): 자기 공격 1타마다 雷 추격(小) 1회 — 위력은 알테마 ウツハラ 「雷属性の追撃(小)」 기준(다른 캐릭터는 미기재라 같게), 공격 종류는 그 공격을 따름, 추격도 AF 콤보·게이지 타수에 들어간다고 가정. self 값은 0~1(가동률), state `on_self.charge`로도 켬(雷帝·歴戦 등), party는 SB 행동(sb)으로(시온(ES) 雲外蒼天).
- `buff_acts.json` 행동 필드: `na: true`(통상 공격 칸 행동 — 루나틱 등, 스킬 칸을 안 씀), `once: true`(평상 턴 시뮬에서 전투 중 한 번), `dur`(지속 턴, 없으면 turns.buff/debuff), `mp: 0`(MP 소비 없음), main 행동 `acts: N`(주력이 거는 자기 버프가 N회 행동만 — AF 공격이 성도 스킬이면 '주력 1 + 성도 N' 순환과 비교, 이즈나 雷神滅閃).
- 행동 순서: 데이터 순서(존 전개 먼저)가 기본, 정밀 계산(탐색 2단계·화면)은 stepValues가 그 캐릭터 행동을 하나씩 더해 AF 팀 대미지가 가장 많이 느는 순서로 다시 줄 세움(스킬 칸 장착·AF 사용 순서). 다른 아군의 개전 자동 존이 이 캐릭터 존 이상이면 그 캐릭터의 존 전개 행동은 효과 없는 행동(효과가 없으면 뺌).
- SB 행동(sb)으로만 거는 항목은 행동 단위 마스크가 없는 AF(실전 N턴의 AF)에서 SB 뒤만(af_timing 'sb'와 같음). 자기 버프 출처가 여럿이면 auto > main > 행동 > sb 중 먼저 켜지는 쪽.
- 개전 자동 존이 있으면 '존 없음'이나 그 존을 못 덮어쓰는 존은 후보에서 뺌(zoneForce). 셔틀 P글래 배분 가중치는 각자 AF 공격 1회 대미지 비중(muleDmgW, 예전 고정 위력 추정 pow).

## 2026-10-16 실전 N턴의 AF(real)

허수아비(1턴, AF 100% 시작)와 달리 실전 N턴 시뮬의 AF·SB는 그 AF가 몇 턴째인지(A.realT)에 따라 상태가 다르다: 1턴째 = 허수아비와 같은 보정, 3턴째 이후 = 1·2턴 세팅 뒤(미리 건 버프·턴 종료 축적 2번·루나틱 등), 2턴째 = 중간. 지속 딜의 AF는 3턴째 값.
- `af_timing.json` 항목 `real: {party, self, deb, zone}`: 3턴째 AF 값(0~1 또는 "sb"), 근거 `why_real`. 없는 항목은 af 값 그대로.
- skill_cond·self_stk 조건 `af_r`: 3턴째 AF·SB의 충족 비율(af_p와 짝). 조건 `turn`(>=·<=)은 그 AF의 턴으로 판정.
- `state.json` `real`: 3턴째 AF의 켜짐 비율. 없으면 af 값과 '개전·사용 구간에 3턴째가 들어가는지(start·dur·uses)' 중 큰 쪽, 구간 정보가 없으면 평상 턴 가동률(up).
- stackFill·규칙 축적은 세팅 턴 S0 = 2(3턴째).
- buff_rules `when.stack.fill: {n, af, real, sb, sbr}`(평상 턴·1턴째 AF·3턴째 AF·1턴째 SB·3턴째 SB 채움 비율) + `req`/`no`(조건을 못 채울 때의 fill) — 개전 축적·AF 중 소모가 있는 ZONE 어빌리티(錬魔·鋭魔·脆禍). party_buff `dmg_src: "zone"`(ZONE 어빌리티, 다른 출처와 곱).

## 2026-10-16 스킬 로직 점검(62명 176건)

- VC: `buff_acts.json` 행동 이름이 `ヴァリアブルチャント`·`VC…`인 auto 행동은 교대해 들어올 때 1턴 효과 → 평상 턴 1/6, AF·SB·허수아비엔 없음(엔진 VC_UP). VC를 buff/attack 행동으로 두지 않는다(스킬 칸·AF 행동이 아님). VC로만 거는 항목인데 행동에 없으면 VC auto 행동을 넣는다(시리즈 물리 내성).
- `EX必殺技` 행동은 `na: true`(EX 커맨드라 스킬 칸 아님), 전투 중 한 번 꼴이면 `once`.
- SB 행동 `dur: 1` = SB 그 턴만(ターン終了まで) → 평상 턴에 안 남음. af_timing 값 `"sb1"`, 규칙 `when.sb1`도 같은 뜻.
- chars `debuff.weak_expose_up: {n, af, real}`: 약점 간파가 켜진 비율(평상 턴·1턴째 AF·3턴째 AF). 개전 1턴만·스킬 쓴 턴만·N턴 한정일 때. 약점 부여는 이제 켜짐/꺼짐이 아니라 비율로 섞음.
- `counter.json` `zone`: 그 존일 때만 요격(질퍼니(AS) 水天陣). 스킬 `afx_zone`: 그 존일 때만 af_combo_x(질퍼니(AS) 輝晶陣).
- `self_stk.json` 항목에 `req`(편성 조건, 맞으면 1·아니면 0)만 둬도 됨(테오도로스 下克上, 메릿 赫灼の心臓).
- 성도 스킬이 공격이 아니면(sb·sb_normal 없음, 주력도 아님) 성도 칸을 따로 세지 않고 그 버프 행동이 칸을 씀(밀디).
- (K2) 규칙 `when.cnt: {wt:[…]} | {el:[…]} | {kind:'mag'} | req 형식, n: 4` — 'ZONE 중 ○ 공격 수만큼 전체 강화'(1회 15%~4회 60% 등): 전열에서 그 공격을 하는 인원수 ÷ n, 턴 종료 효과라 1턴째 AF(허수아비)엔 0·평상 턴은 (N−1)/N. self_stk 항목도 `cnt`(+`zone`)로 자기 몫.
- (K2) skill_cond·self_stk 축적 조건 `per: {kind, vals, full}` — 턴마다 전열 조건 인원수만큼 쌓여 full개에서 가득(프레메아(AS) サジタ·멜로디(AS) デザイア). buff_rules `when.stack.turnPer`도 같은 뜻(턴 축적 × 인원수).

## 2026-10-16 보스 공격·요격(사용자: '보스가 때린다고 봐야 안정성·유지력 평가가 된다')

- 요격 횟수 = 적 1체 턴당 타수(계산 방식 탭, 기본 2) × (전체 공격 비율 × 맞는 인원 + 단일 비율 × 맞을 확률) × (1 + 복사 가동률). 守護·수세면 전체 공격 1번에 전열 수만큼, 단일 공격은 전부.
- 알마(AS): リフレクトバレット(3턴) 도발·요격, アルケミーハイ(2턴, p 0.65) 중 위력 15배·회복 2배·守護, 복사(루나틱 3턴) 0.7, 요격 1번에 아군 HP 30%·MP 10%. 생존 guard 2. 복사는 state.json `ルナティック(複写)`(주력 pow 2)로도.
- `chain.json` 공격 `hits_max`(+`hits_avg`): 축적으로 타수가 느는 체인은 평상 턴 평균 타수(1타 위력은 같음). `stk: {res, avg, brk}`: 맞은 적에 턴 종료까지 쌓이는 물리·마법 내성 DOWN(1개 res%, 발동 1번 avg개 — 엔진 상한 100%)·브레이크(brk 속성, 두 번째 발동부터) — 같은 턴의 다음 체인·요격에 반영(벨벳(AS) イレクトリ レヴマ).
- state.json `pow`(상태 중 위력 배율)는 '축적형 큰 한 방 평상시 ×0.4' 판정에 안 들어감(데이터 배율로 판정).
- 커뮤니티 추천 덱(`meta_decks.json`)은 편성 탐색의 시작점(input.seeds) — 4명을 다 가졌으면 같은 기준으로 평가(점수 보정 없음). 속성덱 판정은 아군 전체 속성 변환(네코코(ES) 変幻自在 + 그 속성 ZONE)이 있으면 전원을 그 속성으로 셈(focusN).


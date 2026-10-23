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
`heal`: `{hp, mp}` 요격 1번마다 아군 전체 회복 %(MP는 평상 턴 MP 계산에 들어감). 요격은 AF 게이지를 채우지 않음(사용자 확인 2026-10-16), AF 턴엔 적이 공격하지 못해 요격도 없음.
`_cover` = `{id: "aoe"|"sb"}` 아군 대신 맞기(수세·전체공격 대신 받기). aoe면 적 전체공격 1번이 전열 수만큼 그 캐릭터에게 들어온다. 빌드 때 캐릭터 `cover`로 들어간다.

# 전투 시작 AF 게이지 (`af_start.json`)

키 = 캐릭터 id, 값 = `{start, need?, buddy?}`: 그 캐릭터가 전열이고 조건(전열 속성 수 `need:{elem,n}`, 메인·서브 버디 `buddy:[키]`)이 맞으면 시작 게이지 %. `_refill` = `{id: {on:"sb", to, cost}}` SB 사용 시 AF 게이지 회복(cost: 먼저 비AF 턴에 쓰는 게이지).

# 캐릭터 묶음 (`char_base.json`)

키 = 캐릭터 id, 값 = 같은 캐릭터 스타일(NS·AS·ES)의 공통 키. 한 파티(전열·후열)에 같은 키는 하나만. 영문 위키 이름 기준, 위키에 없는 캐릭터는 `jp:일본어 이름`.

# 스킬 위력 조건 추가 (`skill_cond.json`)

`top`: 최대 배율을 스킬 데이터 대신 이 값으로. 조건 `{"stat":"spr","full":500,"buff":0.5,"sum":"front"}`: 기본 스탯(천명치 반영)×(1+buff) ÷ full 비율(sum이 front면 전열 합). `"live":true`(2026-10-18)면 그 순간 공격 스탯(기본·장비 + 고정값 버프) × (1 + 그때 걸린 스탯 버프) ÷ full — 공격 스탯과 같은 stat일 때만(셴화 지성·베네딕트 힘·키쿄 속도), buff·af_p·buff_k는 안 씀.

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

## stacks.json (누적 효과 예열, 2026-10-18)
키 = 캐릭터 id, 값 = `[{g, n, k0, how, per, rate, gate, share, lin, t0, also}]`. `g` 엔진 키(`party.X`·`self.X`·`debuff.X`, 하위 칸 없이), `n` 최고 누적, `k0` 개전 누적, `how` 쌓이는 때(`main` 주력 쓸 때마다 · `attack` 그 공격 행동(기본 턴당 0.7번) · `buff` 그 버프 행동(0.5번) · `turn_start`/`turn_end` 턴 시작·끝 자동 · `sb` SB 때 · `hit`/`chain`/`counter`/`ally`/`auto` 사건, 기본 턴당 1번), `per` 한 번에 쌓이는 수, `rate` 평상 턴 1턴당 횟수, `gate:"sb"` SB를 쓴 뒤부터(첫 SB를 2턴째 끝으로 봄), `share` 그 키 값 중 누적 몫(나머지는 그대로), `lin` 누적 수에 비례(k/N), `t0` 그 턴부터 쌓임, `also` 다른 how로도 쌓임. 데이터 값은 최대 누적(1회분 × (N+1)/2). 엔진: 평상 턴 t에 쌓인 수 k = k0 + per×rate×(t − 0.5)(턴 시작 t, 턴 종료 t−1)로 (k+1)/(N+1)(k=0 → 0, 정수 사이 직선) — 실전 N턴의 평상 턴(1~3턴째 다시 계산, 그 뒤는 다 쌓이는 턴까지 직선)·턴 화력 줄·지속 딜(전투 H턴 평균). AF·SB는 af_timing.json이 따로.

## 2026-10-18 추가 칸
- `party_buff.link_brk`(숫자, 보통 3): 연계를 받은 아군이 공격할 때마다 그 공격 타입 웨폰 브레이크 N축적(짭코코 猫染め御免ニャ). 받는 사람은 연계 위치 규칙(buff_rules link pos)으로 정해지고, 이득 = N ÷ 그 타입 한 바퀴 타수 × 연계 켜진 비율.
- 버디(buddy_fx main·main2)·버디 장비(buddy_gear fx.main·main2)의 `brk`(once·속성·무기 타입, `req` 편성 조건): 버디 오토 스킬이 매 턴 거는 브레이크 — 평상 턴은 매 턴, AF는 앞 턴에 건 축적만(1턴째 AF엔 없음, AF 한 번에 1번).
- 버디 장비 `fx.inflict {poison, pain}`: 평상 턴·2턴째 이후 AF의 독·페인 가동률에 더함(허수아비·1턴째 AF엔 없음).
- buff_rules `when.stack.fill`에 `s0`(개전 채움 비율)·`flat`(턴마다 같은 값): 누적 예열에서 t턴째 = s0 + 2(n−s0)·t/(H+1)(평균 n, n<s0면 줄어듦).
- state.json `from`: 그 턴부터 켜짐(평상 턴 평균은 up 그대로). up 없이 start·dur·uses면 누적 예열에서 턴마다 그 구간이면 켜짐.
- skill_cond 소비형(stack 문자열에 '소비형'): 평상 턴 평균 = max(start, 2/turns)(한 방 주기 turns/2턴), 누적 예열에서 처음 가득 차기 전 턴((1−start)·turns/2 전)은 start만큼.
- af_start.json `need.align`(천·명, 배열이면 어느 쪽이든 n명)·`_refill.<id>.start`(개전 축적)·`af:false`(AF 안 SB로는 안 채움). turn_end `sb_only`: SB를 쓴 턴의 종료 공격(실전 SB 턴·지속 딜 SB 주기마다).
- `weak_dmg`(약점 시 대미지 UP): 딩 DB 32건 전부 효과량 1 = **100**(26행 약점 배율 +1, 심안의 약점 몫과 같은 크기). 여러 명이 걸어도 같은 상태라 가장 큰 것 하나. 심안(shinan)은 따로 +1.
- once.json `when`(규칙 조건 — 편성·존)·`sb:true`(그 캐릭터가 SB를 쓸 수 있을 때만): 가리유 炎帝 タイラントブレイズ.
- buff_acts 행동 `aw:'auto'`: 성도각성(스텔라 보드 어빌리티 획득)이면 개전 자동, 아니면 k(버프 행동, mp·dur) — 빙무의 가희 機略.
- state `party_off`: 상태가 꺼지면 같이 꺼지는 파티 버프 — 다른 아군이 받는 몫도 상태 가동률만큼(예전엔 자기 공격에서만 꺼짐).
- 보스 흉성 `fx.counter {fixed, per:'attack', skip:['af','sb']}` → 보스 `counter`: 평상 턴 공격 실행 수(ev.atkN) × fixed 피해, 턴당 6번 넘으면 점수 감점(회복 2등급 이상이면 절반)·경고.
- 보스 `gauntlet` {n, absorb_prev, note_kr, src}: N연전(앱 '연전 편성'). 흉성 `trigger`(앞 전투를 이 조건으로 격파하면 다음 전투에 붙음, 앱 전용·계산 버전 제외): `{kt_le:10}`(10턴 안 격파 — 11턴 넘겨 이긴다고 보고 안내만), `{weak_hit:true}`(약점 공격 → 흡수, absorb_prev로), `{af_turn_hp:0.6}`(AF 턴 피해 ≥ 라이프 1개 HP × 0.6), `{reversal:true}`(버프·디버프 리버설 — 태그 *reversal*·SB/주력 문구), `{zone:'elem'|'nonelem'}`(그 종류 존 전개 — 평상·SB 존), `{atk_n:9}`(평상 턴 공격 실행 수 ≥ 9).
- 보스 `hp_model` {bar 한 번에 깎아야 할 HP(억), bars 횟수(목숨·부활·전회복·페이즈 포함), reset 턴 종료 전회복(그 턴에 깎은 비율만 진행), step 진행 단위(예 0.2), carry 넘친 피해가 다음 줄로 넘어가는지, stopper [HP%], kt_min 최소 턴, dmg_cut [{turns, x, when start|revive}], note_kr} → engine killTurnsM(턴별 피해 = 실전 N턴 + 그 뒤 평상 턴·AF 주기, 피해 ÷ 1.15 여유). 없으면 예전처럼 hp × 1.3 ÷ 피해.
- 보스 `threat` {lvl 1~3, tank 도발·수호 필요, heal 회복·배리어 필요, single, aoe, status, note_kr} → needPenalty(tank 없으면 lvl 3 ×0.6·그 밖 ×0.8, heal 부족 ×0.75/×0.88)·보스 성향 생존 가중치(lvl 3 +0.2, lvl 2 +0.08, 안정성 lvl 3 +0.1).
- 보스 `punish` {only_wt, only_el, only_kind, x, label}: 이 조건 밖 공격은 보스를 강화(갑개룡 타격 외) → 그 비중 × x만큼 감점·경고.
- 보스 `turn_limit`(앱은 성영의 서가에 5를 붙임 — 챌린지 5턴 제한): 실전 N턴 = 턴 제한, optimize가 results3('N턴 최대 딜': 실전 N턴 총딜 순 + 필요 요소·위협 감점)도 냄.
- 보스 `zone_boss` {key, lv 1|2, every, note}: 보스가 까는 존(앱 effBoss → S.bossZone) → runSit 존 후보: 아군 존은 보스 존보다 등급이 높을 때만, every(매 턴 다시 깔기)면 평상 턴은 보스 존 고정. `zone_bonus` {keys, lv, x, label}: 그 존이면 점수 × (1 + (x−1)/2)(x<1이면 손해 — 마크바브).
- 보스 `zone_late` [{key, lv, every, from 턴 | after 깬 줄(목숨) 수 + hp 그 줄 HP%, aff {weak, resist, null, absorb}(그 단계 상성, 적은 종류만 바꿈), note}]: 전투 중에 바뀌는 보스 존·상성(앱 effBoss → S.bossZoneLate, bar·bars를 붙임) → engine evalTeam이 단계마다 한 번 더 계산(ev.zLate): 실전 N턴은 바뀌는 턴부터 그 단계 턴 기록, 지속 딜은 긴 전투 15턴·HP 비율로 섞음, killTurnsM은 단계마다 평상 턴·AF 주기. 보스 극 존(every 아님)은 2턴 뒤 일반 존 단계를 자동으로 붙임(그 뒤엔 아군 극 존이 덮어씀 — 처음부터 까는 zone_boss 극도). 탐색 어림 단계는 처음 상태만.
- 보스 `hp_model.dmg_cut` `when: 'af_full'` {x}: AF 게이지가 꽉 차 있으면 아군 주는 피해 × x(앱 → S.afFull, battleSim이 게이지 100%에 닿은 뒤 몫의 평상 턴·SB에 곱함 → 100% 전에 AF를 쓰는 계획).
- 보스 `hitgim` [{k, s0, …}] (hp_model 바깥 — gim/merge.py가 hp_model 줄을 다시 쓰므로, 2026-10-19): 타수로 벗기는 기믹 → engine hgList(앱 effBoss → S.hitGim)가 실전 N턴(battleSim, 개시·n턴째부터 켜지는 것)과 처치 턴(killTurnsM, 부활 뒤 것까지)에서 그 턴 타수로 스택을 깎으며 피해 × 평균 배율. k `stack`: 스택 s마다 ×max(fl, (1−r·s)^pw), 맞는 타격(only_el·only_wt·only_kind)마다 per개 감소(end면 턴 종료에 그 턴 타수만큼, 최대 cap), regen 턴 종료 증가(최대 max), decay 턴 종료 감소, zero {turns} 0이 되면 그 턴 수 뒤 s0, unit `act` = 타수 대신 공격 행동 수. k `barrier`: s0회 동안 ×x, refill 매 턴 시작에 다시. k `multihit`: 스킬 한 번 안 2타째부터 step씩 덜 들어감(실행당 타수). 공통 on start|revive|revive2, off revive2, from 턴, reset_on revive|stop, turns 최대 지속, label. `hitgim_nocut: true`면 hp_model.dmg_cut의 hits(경감 배리어 N회)를 쓰지 않음 — 없으면 dmg_cut hits도 barrier로(턴 통째 경감 대신). 턴 구간 순서는 AF → 평상 → SB(타수로 먼저 벗기고 큰 한 방을 뒤에), 타격당 피해는 고르게 가정.
- 보스 `hp_model.kpt`: 한 턴에 깰 수 있는 줄 수(기본 1 — 넘친 피해는 안 넘어감). 같은 때 여러 마리가 나오는 줄(결실 애니 박쥐 2마리)은 전체 공격으로 한 턴에 그만큼.
- 보스 `score_bonus` {pers {퍼스널리티(일본어, chars pers와 같은 이름 — FFⅨ는 FFIX): 행동 보너스}, af 50, comp 1000, top 최고 보상 점수, src} (서가 챌린지, 2026-10-19 알테마 보스 페이지): 앱 effBoss → S.scoreBonus → evalTeam 점수 = 피해(AF 1회 999,999,999까지) × 보너스 × 10⁻⁵, 보너스 = Σ AF 아닌 턴마다 캐릭터별(맞는 퍼스널리티 값 합 × 피해 없는 행동 비율만큼 1.5배) + AF 1회 50 + 편성 1000(전열 전원이 하나 이상 가짐). 보스 `diff: 'stella'` = 서가 보스지만 데이터가 스텔라 난이도(처치형) → 점수 계산 안 함.
- 보스 `shoka_part` (서가 소분류, 화면 전용 — 앱 bossSub·SHOKA_PARTS 순: 메인 1부·1.5부·2부 전/중/후편·3부·외전·외경·외사·협주·군상·해후·호걸, 한국 서버 분류(딩 빌더 데이터) 우선), `posts` [{score, dmg, team(일본어 이름), src, note, bonus?, raw?}] (서가 챌린지 투고 기록 — 알테마 파티 투고·game-info 스코어 어택 기록집(2023, 1타 상한 21억 시절)·유튜브, 보스 요약 '투고 기록'에 점수 상위 3개; 점수인지 피해인지 모르는 숫자는 raw로만), `name_src`(한국어 이름 근거). 셋 다 계산 버전(build _BV_SKIP)에서 뺌. 서가 추가분 63개는 `bosses_shoka.json`(id `sk_<알테마 slug>`, 스크래치 shoka/merge.py — 다시 돌려도 됨).

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
- chars `zone.vc_only`(VC로만 전개 → 1턴 AF 존 없음), `zone.breaks`(존 파괴 후 전개, "sb"면 SB만), `zone.sb_force`(true: SB를 쓰면 반드시 존 파괴 후 그 존 전개 — `breaks: "sb"`도 같은 뜻으로 봄(9명 문구 전부 'SB 시 (미전개면) 파괴 후 전개'). 엔진은 한 SB 턴 안의 순서를 맞출 수 있다고 보고, 그 존이 남거나·뒤에 다른 SB가 덮어쓰거나(다른 파괴 캐릭터·일반 위의 극)·그 캐릭터가 SB를 안 쓰는 쪽 중 나은 쪽. 다른 아군 SB는 깔린 존·그 존 중 나은 때에 씀), `zone.awaken_any: {kinds, skill}`(남이 편 일반 존을 극으로).
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
- chars `debuff.weak_expose_up: {n, af, real}`: 약점 간파가 켜진 비율(평상 턴·1턴째 AF·3턴째 AF). 개전 1턴만·스킬 쓴 턴만·N턴 한정일 때. 약점 부여는 이제 켜짐/꺼짐이 아니라 비율로 섞음. `t`(2026-10-20): 개전 t턴 한정이고 다시 걸 수단이 없으면 — 그 턴이 지난 AF(긴 전투 지속 딜·실전 N턴의 t+1턴째 이후 AF)엔 없음(베르단타 3).
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

## 2026-10-16 남은 항목 정리

- 스킬 `hit_w: [[타수, 위력]…]`: 이어 치는 스킬의 타격 묶음별 위력(타수 합 = hits일 때만, 상태로 스킬이 바뀌면 무시). 25억 경감을 묶음마다 따로 받음 — 세스타(AS) 二刀神狼・改(凶狼薙 2타가 67%), 세스타 餓狼断, 빅트 SB·비SB 성도 스킬, 베르단타 蒼氷連閃, 가리유 SB, 엑구레 SB·AF 스킬, 아나벨(ES)·헬레나·마이·펠미나 SB.
- skill_cond `self: "키"`: 조건 배율을 그 자기 버프 키가 켜진 만큼만(그 키를 주는 버프 행동을 못 달거나 아직 안 썼으면 기본 배율) — 류제 牙龍驟滅 6배 = 破竜の構え(self mp_up).
- self_stk 항목 `e`: 조건(zone·req) 밖에서 남는 비율 — '招雷陣이면 2배'(이즈나 神轟雷嵐の舞 지성·속도), '전열 杖 2명 이상이면 2배'(紺色の夢魔 アバドンズコール)는 e 0.5, 조건 때만이면 e 0(이즈나 雷 공격 100%).
- 성도 스킬을 안 다는 쪽(sbOff)이면 'SB 시' 존 전개·각성 후보도 없음.
- 버디: 서브는 오라 발동 안 함(사용자 확인) — buddy_fx aura는 메인일 때만.
- 버디 party 키(2026-10-18): stat·all_elem_atk·weapon_atk·wt_dmg·crit_rate·crit_dmg·dmg에 더해 pwr/int/spd_flat(고정값)·mp_up(최대 MP)·shinan·kesshi·charge도 계산. `to:{elem}`이면 그 속성 캐릭터만(건스 アクティーナ 帯電 = 雷). 차지 스킬 존 각성(sb/sb2 `zone_aw` 키, `zone_dep` level 2)은 팀의 평상 턴 존이 같은 존일 때만: 차지가 모인 턴(1 + ⌈cost ÷ 턴당 차지⌉)부터 주기(⌈cost ÷ 턴당 차지⌉)마다 그 턴·다음 턴 극(battleSim o.budAw, 지속 딜은 2/주기 비율). 존이 없는 팀에 새로 까는 효과·level 1 전개(튜시아 星海陣)·속성 변환(echg)은 아직 계산 안 함.
- optimize·perCharBest 입력 `backN`(후열 인원 0~2, 결현현은 pledge.size가 우선): 후열 셔틀·아군 전체 글래·후열 추천 수, 0이면 VC·VC 존 없음.
- 스킬(main) `zone_need: {zone, zlv?, off?}`: 그 존(등급)이 아니면 off 필드로 바꾸거나(off 없으면 main.alt) — 존이 있어야 연속 실행되는 주력(세스타 二刀神狼, 월화의 영애(AS) ヴァイスドルン).

## 2026-10-16 유니즌·연속 실행 AF 게이지·실전 AF 횟수 제한

- 캐릭터 태그 `singer`: 歌唱 상태가 되는 캐릭터(알테마 프로필 '歌唱発動' 17명 — 'song' 태그와 다름: 시엘 エレメントソング는 歌唱 아님, 메리나·메리나(AS)는 歌唱). 편성 조건 req `{"kind":"tag","vals":["singer"],"n":1,"others":true}`.
- self_buff 상태 키 `{req, pow, pow0}`(예: `unison`): req를 채우고 그 키를 주는 버프 행동(buff_acts `self.unison`)을 단 뒤부터 켜짐. `pow`는 그 캐릭터 모든 스킬 위력 배율(성도각성이면 pow, 아니면 pow0).
- 스킬 `self_on: {k, on:{repeat, af_combo_x…}}`: 자기 상태 키 k가 켜진 비율만큼 on 필드로(재공격은 확률 rep_p). 미스트레아 オウル・ナカル = repeat 0 + self_on unison {repeat 1, af_combo_x 2}.
- buff_rules when `uni: true|false`: 유니즌 중인지(self_buff.unison req 충족 + 그 변형에서 끄지 않음). evalTeam이 유니즌을 쓸 수 있는 조합은 끄는 쪽(progs uniOff: 다른 가창보다 먼저 혼자 歌唱)도 계산해 나은 쪽(ev.uni).
- 스킬 `af_seq: [속성…]`: 연속 실행 중 AF 게이지가 차는 공격 실행만(버프 실행 제외, 'none' = 무속성 → 속성 존에서 1.5%). 연계 횟수·다단강화 실행당 타수도 이 수로. 세스타 ["none","wind","wind"], 세스타(AS) ["wind","none","wind","wind"], 에이미 AF 스킬 ["wind","none"].
- 주력 `uses`+`alt`는 허수아비뿐 아니라 실전 AF(afRun·지속 딜의 AF)에서도 행동 uses번까지만, 나머지는 alt(상태로 주력이 바뀌는 캐릭터는 상태가 맡음).

## 2026-10-16 점검 3차(시전 없이 켜진 효과·조건 범위) 새 표현

- counter.json `req`: 편성 조건(전열 구성, req 형식) — 못 채우면 요격 없음(아나벨(ES) 冥の誘い).
- debuff `break_req`(req 형식)·`break_zone` {zone, zlv}·`break_up` {n, af, real}: 브레이크의 편성·존 조건과 켜진 비율(평상 턴 n, 허수아비 AF af, 실전 3턴째 real). `weak_expose_req`: 약점 부여의 편성 조건.
- link.json 항목 `st: true`: 받는 아군이 단체 공격할 때만(마츠리카 魂の力 연계).
- zone `late: true`: 전투 몇 턴 뒤에야 펼 수 있는 존 — 계산에서 뺌(펠미나(ES) 氷爆符 50). `awaken_once: true`: 존 각성이 전투 중 1회(루나틱 등) — how '1회 각성', 실전은 개전 자동처럼 1·2턴째만 극, 계속 각성(awConst) 아님.
- turn_end.json `act`: 그 턴 종료 공격을 거는 스킬 이름 — 버프 행동이면 장착·유지율만큼(buff_acts 행동 g에 'te<번호>').
- 스킬 `self_on.on`의 `mult`(대미지 비율로)·불리언 필드(crit_sure·barrier_pierce·def_ignore는 켜진 비율로 섞음). self_buff 상태 키는 `{req}`·`{zone, zlv}`만 있어도 됨(행동 출처가 없으면 조건만으로 0/1).
- self_stk 조건 키: stack·turns·start·af_grows·af_p·af_r·sb_fill·req·cnt·zone·zlv·per·e + hp·mp·af·enemy·turn·other·noaf·stat(condP 형식, 빌드가 넘김).
- (4차) self_buff 상태 키에 `e`(조건 밖 비율)·`af1`(1턴째 허수아비·실전 1턴째 AF는 늘 충족). VC 행동 `dur`(평상 턴 VC 1/6 × dur, 최대 1). zone.awaken_any.kinds에 존 키(water 등)도. 약점 부여를 조건으로 쓰는 skill_cond `{enemy:'weak'}`·버디 약점 오라는 약점 부여의 켜진 비율(weak_expose_up·noaf·SB 그 턴)을 따름.

## 2026-10-16 남은 엔진 표현(5차)

- state.json `req`·`zone`·`zlv`: 상태 자체의 편성·존 조건 — 못 채우면 가동률 × `e`(기본 0). `gate: "normal"`이면 평상 턴만(SB로 들어간 그 턴은 조건 무관 — 가리유 炎帝). `full_req`: 채우면 평상 턴도 늘 켜짐(헬레나 宵の明星 전열 合成人間 2명). 캄라녜쥬 雷帝 = zone thunder/moonlight·zlv 2, 코마치(AS) 戦姫 = 전열 地 3명.
- zone `switch: {need: req, yes, no}`: 편성 조건으로 존 종류가 바뀜(선택 아님) — 테오도로스 プロボカティオ: 전열 拳·槌 퍼스널리티 3명이면 轟打陣, 아니면 地裂陣.
- inflict.json: `dummy`가 이제 빌드에서 넘어감(예전엔 빠져 start·start_sb가 'skill'로 계산). 새 키 `p`(걸릴 확률), `up`(평상 턴 가동률), `af`(허수아비 AF에서 걸 수 있는 비율), `req`, `zone`/`zlv`(이 조합에서 그 존을 펼 수 있을 때만), `split {poison|pain: {dummy, up}}`.
- elem_change `buff: true`(el ally): 파티 elem_atk(특정 속성 키)·디버프 elem_res도 변환 상대 아군의 속성 퍼스널리티 전부로(이벨라(AS)·노나(AS)). 'ally' 상대 = 그 캐릭터 위치 규칙(1명 대상)이 고른 받는 사람, 위치 규칙이 없으면 가장 센 아군(넣은 순서 무관).
- 스킬 `adapt`(臨機応変): `weak`(적 물리 타입 약점 → 없으면 아군 약점 간파 타입, 니르야) · `front`(전열 최다 물리 타입, 월화의 영애) · `ally`(변환 상대의 무기 타입, 이벨라(AS)·노나(AS)) · `zone`(전개 중 무기 타입 존, 유인(AS)). skill_cond `{enemy:'weak'}`는 이제 공격 타입 약점도 봄.
- skill_cond need `buff_k`: stat 조건의 `buff` 몫을 그 자기 버프 키가 켜진 만큼만(엘레노아 정신 ×1.5 = 祈誓の導き). need `n_p`: 평상 턴 충족 비율 직접(아자미(AS) 後攻 0.15).
- 스킬 `n_over {필드}`: 평상 턴만 바뀌는 필드(유인 ラーヴァインパクト execs 1·hits 4). `crit_sure`는 0~1 숫자도(키쿄 0.5·스제트(ES) 0.8). sb `once_t`: 그 턴까지·전투 중 1번만 SB(틸릴(ES) 心の剣 3) — 실전 N턴은 두 번째부터 빼고, 지속 딜은 전투(H턴)에 한 번.
- turn_end `when.af`: AF를 쓴 턴의 종료 공격 — 실전 N턴 AF 턴과 지속 딜 AF 주기에 더함(빅트(AS) オスクロ・カーパ, 콤보 최대 위력, 그 스킬 칸·AF 행동은 따로 안 셈).
- buff_acts 행동 `req`(한국어 편성 문구도 해석): lv 2 전개(바로 극)의 조건 — 못 채우면 허수아비는 일반 존(각성 행동이 있으면 그 뒤 극).
- req kind `nodup`: 전열 속성 퍼스널리티가 서로 안 겹침(뮤르스(ES)). 규칙 to `any: [to…]`: OR 조건(로키드 天 또는 魔獣).
- state `copy`(루나틱<複写>): ON이면 그 스킬(copy_to 또는 pow_to, 기본 main)에 `copy: true` — 2번째 실행은 AF 게이지가 안 차서 게이지는 실행 수의 절반, 연출 시간은 실행 수대로. 값 `x2`(실행·타수 2배, 위력은 pow) · `ex2`(실행만 2배, 타수·위력은 데이터가 ON 값) · `rep`(재공격으로 표현된 경우 게이지만 절반).
- 실전 N턴: AF를 쓴 턴은 AF가 끝나면 턴 종료(평상 행동·적 공격·요격·체인 없음, AF 게이지·SB 게이지는 AF 안에서만, 턴 종료 공격은 남음). 지속 딜의 AF 주기 = 100 ÷ 턴당 충전(평상 턴 수) + AF 턴 1, 평상 턴 몫 = (주기−1)/주기(ev.susNW).
- debuff `weak_expose: "zone"` + `weak_expose_dflt`: 약점 간파 속성이 깔린 속성 존을 따라감(없으면 기본) — 네코코(ES) 猫又巫女神楽(슈퍼 상태).
- 지속 딜의 AF: 극 존이 계속 유지되지 않으면(개전 자동·1회 각성, SB 재각성 없음) 일반 존 AF와 0.6:0.4로 섞음(평상 턴 susOf와 같은 비율).


## 2026-10-17 딩 DB 대조 — 누적 버프 규칙

- '최고 누적 N회' 버프·디버프의 최대치 = 1회분 × (N+1)/2(첫 회 전량, 2회째부터 절반씩: 3누적 2배, 4누적 2.5배, 5누적 3배). party_buff·self_buff·debuff에는 이 최대치를 넣는다(1회분×N 아님).
- 누적 진행 비율(af_timing `self/party/deb`·`real`, self_stk·skill_cond `af_p`·`af_r`)은 k누적 = (k+1)/(N+1). self_stk `turns`/`start`로 쓸 때는 turns N+1·start 1/(N+1)(0회는 주력 행동 마스크가 맡음).

## 2026-10-17 엔진 6차

- once.json 항목 `combo: N`(+`per: "af"`): AF 콤보 배율이 N(엔진 콤보 단위, 600% = 6) 이상이면 통상 공격이 바뀌는 공격 — AF 1회에 한 번, 평상 턴엔 없음. atk에 `af_combo_x`도 받음.
- counter.json: atk `crit_sure`·`def_ignore`·`barrier_pierce`가 이제 계산에 들어감. modes 원소에 `trig`(phys·fire·slash·pierce·blunt — 한 물리 타입은 0.3)·`atk`(그 상태의 요격 공격 필드 덮어쓰기).
- party_buff `elem_down: {fire: 40, …}`: 같은 스킬(elem_atk와 같은 마스크)로 아군 그 속성 공격 DOWN — 버프와 따로 ×(1−값).
- debuff `side: [{src: "mag_res", ally: {pwr: 50}, enemy: {phys_res: 50}}]`: 그 디버프(src)가 켜진 만큼 아군 스탯 DOWN(버프에서 뺌)·적 저항 UP(내성 다운에서 뺌).
- link 항목 `follow: true`: 연계 속성이 연계를 일으킨 공격 속성(무속성이면 el).
- buff_rules `sb_all: true`: 위치 규칙(pos one 등)이 SB 때(그 AF의 SB 뒤 포함)는 아군 전원.
- zone `sb_fresh: true`: SB 극 전개가 '그 존이 아닐 때'만 — 평상 턴 같은 존(일반)이면 SB로 극 안 됨, 허수아비는 AF 중 그 존이 이미 깔려 있으면 안 됨.
- 스킬 `no_aw {필드}`: 성도각성 전(prog.sbOK·sbAw 둘 다 없음)일 때 바뀌는 필드.

## 2026-10-20 EX必殺技(`ex.json`)

game-info AF まとめ: EX 레벨은 1에서 시작해 캐릭터 조건마다 오르고(최대 10), **게이지 100%(200)에서 켠 AF**가 끝날 때 누적 AF 행동 ≥ ⌈1200 ÷ 레벨²⌉(Lv4 75·Lv5 48·Lv6 34·Lv10 12)이면 AF 필살기 뒤에 자동으로 나감. 누적은 AF끼리 이어지고 EX를 쓰면 0. 50%대에서 켠 AF에선 안 나감.
- `ex.json` {id: {lv 시작 레벨(1 + 개전 조건), lv_sa 성도각성(스텔라 보드 어빌리티)이면 더함, turn 턴마다(조건부면 기대값), af AF를 쓸 때마다, sb SB를 쓸 때마다(`"max"` = 최대), zone 극 존 턴마다, ctr 턴마다(요격 등), dur 효과 턴(다음 턴부터), max, off(게이트 안 함)}}.
- `buff_acts.json`의 `EX必殺技` 행동은 스킬·평상 턴·AF 행동이 아님 — 그 항목(다른 출처가 없는 것만)은 EX 게이트: 허수아비(1턴)엔 없음, 실전 N턴은 EX가 나간 다음 턴부터 dur턴(엔진 evalTeamX가 EX 끈 계산의 계획에서 그 턴을 찾고 EX 켠 계산 기록을 이어 붙임), 지속 딜은 긴 전투(15턴) 중 켜진 턴 비율. af_timing에 EX 항목을 따로 두지 않는다.
- EX 피해 = 그 AF 피해 × 0.35(1타 상한 99.99억). `afg`(%, 배열이면 쓸 때마다 다음 값): EX가 나간 다음 턴 끝 AF 게이지.
- chars `adapt_all: "left"`(2026-10-21, 고답의 요묘(짭코코) 猫染め御免ニャ): 전열 왼쪽 아군의 무기로 斬·突·打·魔 臨機応変을 아군 전체에 영구로. 엔진은 아군 무기 타입 중 적 약점 → 약점 간파 → 전열이 펼 수 있는 공격 타입 존(원래 그 타입인 멤버가 많은 쪽) 순으로 하나 골라 모든 공격 타입을 바꾸고(스탯·물리/마법 계산은 그대로), 바꾸지 않는 배치(짭코코 맨 왼쪽)와 성향 기준으로 비교(evalTeam → ev.adT·adNone). 그 스킬(link 항목)을 평상 턴 시뮬이 달 때만.
- self_buff/party_buff `over_tough: {stat: 'int'|'pwr'|'spd', per: 50}`(2026-10-21, 오버터프니스 — 스즈네 魔法オーバータフネス 대비): 그 스탯 고정값 = 받는 사람 최대 HP × (1 + 아군 최대 HP UP 중 최대) ÷ per, 같은 상태라 가장 큰 것 하나, 파티 몫은 그 아군의 같은 스탯 고정값 항목(int_flat 등) 켜진 비율만큼. party_buff `hp_up`(%): 최대 HP UP(지금은 오버터프니스에만). 테오도로스 残夢燃ゆ는 예전 값(pwr_flat 178, SB 때만) 그대로.
- af_start.json `sa`: 스텔라 보드 어빌리티라 성도각성(sbOK·sbAw)해야 켜짐(뮬루스(ES) 강화 후 100%). EX AF 게이지(ex.json `afg`)가 있는 조합은 게이지 100%인데 AF를 안 쓴 실전 턴마다 'EX가 그 턴에 나갔다면'에서도 계획을 세워 보고(evalTeamX 시작점, S.exSeed=false면 끔) EX 시점이 맞는 쪽 중 성향 기준이 큰 쪽.

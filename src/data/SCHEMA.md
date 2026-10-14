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
    "mult": 15,                        // 위력 배수 (특대=1x 기준으로 "威力15倍" 이면 15, "極大"는 1.25, 표기 없으면 1)
    "size": "xl",                      // s m l xl xxl (威力 小中大特大極大 -> s m l xl xxl)
    "hits": 3,
    "repeat": 1,                       // 재공격/재행동 횟수 (없으면 0). 조건 있으면 condition에 기술
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
  "self_buff": {                       // 자신에게 거는 버프 최대치 (%)
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
    "multihit": false                  // 다단강화(多段強化)
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
    "mp_cost_zero": false
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
    "pain_poison": true                // 페인/독 부여
  },
  "zone": {                            // ZONE 전개 (없으면 null)
    "type": "fire",                    // fire water earth wind thunder shade crystal / slash blunt pierce magic / 별도명
    "awakened": true,                  // 極/絶 존 전개 가능
    "condition": "전방 불 속성 3명 이상"
  },
  "support": {                         // 0~3 등급 (0 없음, 1 소소, 2 쓸만, 3 전담급)
    "heal": 1, "barrier": 2, "cleanse": 0, "revive": false, "guard": 0, "taunt": 0,
    "mp_recover": 0, "af_gauge": 0, "status_immune": 0
  },
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

- `f` 대상 버프 묶음: `stat`(pwr·int·spd) `pwr` `int` `spd` `elem`(전속성+속성) `allel`(전속성) `elat`(속성) `elat:fire`(특정 속성만) `weap` `crit` `critd` `sf` `mf` `focus`(sf+mf) `ot` `eagle` `oc` `mh` `xhit` `pierce` `weak` `link` `*`(전부)
- `to` 받는 사람 조건: `pos`(`self` `one` `adj` `selfone` `selfadj` `others`) + `side`(`r` 오른쪽/`l` 왼쪽), `elem` `weap` `wt` `align` `kind`(phys/mag) `kof` `pers`(퍼스널리티 일본어 원문 배열, extra 데이터로 판정), `p`(판정 불가 조건 → 맞을 확률)
- `when` 발동 조건: `zone`(`any` `elem` `weap` 또는 존 키 배열: fire…crystal, slash/pierce/blunt/magic, slash_pierce, slash_magic, all(성해진), all_weapon(섬격진), moonlight), `zlv`(2=극/어나더 존, 3=절), `sb`, `af`, `req`(전방 구성, parseReq 형식. 퍼스널리티는 `{"kind":"pers","vals":["アルカディア"],"n":2}`), `reqAny`(편성 조건 중 하나만 맞아도), `pain`(파티에 독·페인), `up`(켜져 있는 비율), `t`(짧은 버프: SB·AF 땐 100%, 평상 턴엔 이 비율)
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

# 스킬 위력 조건 (`skill_cond.json`)

키 = 캐릭터 id, 값 = `{"main": {...}, "sb": {...}}`. 스킬의 `mult`(최대 배율)는 `need` 조건이 모두 맞을 때만 쓰고, 아니면 `base`. `steps`는 중간 단계 `[[배율, [조건…]], …]`.
조건: `{"zone":[키],"zlv":2}` `{"req":{…}}` `{"stack":"이름","turns":N}`(이름에 '소비형'이면 쓸 때마다 다 소모) `{"hp":"self|max|low"}` `{"mp":"high"}` `{"af":true|false}` `{"enemy":"poison|pain|weak|break|debuffs"}` `{"turn":">=N"}` `{"other":"…"}`(판정 불가 → 60%로 계산).

# 결실 현현 보스 (`bosses_kesshitsu.json`)

보스 스키마 + `required`(필수 캐릭터 id), `required_alt`(AS 등 대체 가능 후보), `enemies`(적 구성), `pledges`(페이지에 실린 서약 예시: `as_of`, `list[].conds[]` — kind `nokill` `size` `comp`(elem·weap·n, `gender`) `turns` `all` `other`). 서약은 매주 화요일 12:00(JST) 바뀌고 모든 보스가 같은 서약을 쓴다.

# 캐릭터 기본 스탯 (`stats.json`)

키 = 캐릭터 id, 값 = `[hp, mp, pwr, int, spd, end, spr, lck]` — 레벨 최대·천명치 0·장비 없음(영문 위키 Stats Index, 2026-10 사용자 제공 PDF). 빌드 때 캐릭터 `stats`로 들어간다.
천명치 t의 값 = 기본 + `fate.json` 단계 보너스 합(t 이하) + t≥255이면 힘·지성·속도·내구·정신·운 +10 (엔진 `statsAt`). 위키 영문 이름 ↔ id 대응은 천명 보너스 순서로 검증했다.
엔진 사용: 주 스탯 대미지 (스탯/기준)^지수(물리 기준 221·지수 1.0, 마법 232·1.1, 빌더 계산식에서 잰 값), 물리 크리율 +(운−156)/1600, 속도(1턴 버프 순서·AF 249 판정, 빌드 코드가 있으면 장비 포함 속도).

# 천명치 보너스 (`fate.json`)

키 = 캐릭터 id, 값 = `[[단계, {스탯: 값}], …]` (단계 5·15·30·50·75·105·140·175·215·255, 스탯 키 hp mp pwr int spd end spr luck). altema 표에 위키 Stats Index로 어긋난 표를 바로잡았다.

# AF 연출 시간 (`af_anim.json`)

키 = 캐릭터 id, 값 = AF 중 스킬 연출 시간(초). 없으면 계산 방식 탭의 기본값(2초). 재행동·연속 실행 스킬은 엔진이 실행 횟수만큼 곱한다.

# 요격 (`counter.json`)

키 = 캐릭터 id, 값 = `{trig, taunt, copy?, atk}`. 맞은 타수마다 1번 반격(`copy`: 루나틱<복사>면 2번), 행동불능 상태이상이면 발동 안 함.
`_cover` = `{id: "aoe"|"sb"}` 아군 대신 맞기(수세·전체공격 대신 받기). aoe면 적 전체공격 1번이 전열 수만큼 그 캐릭터에게 들어온다. 빌드 때 캐릭터 `cover`로 들어간다.

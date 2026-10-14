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
- `to` 받는 사람 조건: `pos`(`self` `one` `adj` `selfone` `selfadj` `others`) + `side`(`r` 오른쪽/`l` 왼쪽), `elem` `weap` `wt` `align` `kind`(phys/mag) `kof`, `p`(판정 불가 퍼스널리티 → 맞을 확률)
- `when` 발동 조건: `zone`(`any` `elem` `weap` 또는 존 키 배열: fire…crystal, slash/pierce/blunt/magic, slash_pierce, slash_magic, all(성해진), all_weapon(섬격진), moonlight), `zlv`(2=극/어나더 존, 3=절), `sb`, `af`, `req`(전방 구성, parseReq 형식), `pain`(파티에 독·페인), `up`(켜져 있는 비율), `t`(짧은 버프: SB·AF 땐 100%, 평상 턴엔 이 비율)
- `x` 조건 충족 시 배율(기본 1), `e` 미충족 시 배율(기본 0), `me` 1이면 버퍼 자신은 조건과 무관하게 `x`
- `{"zel":true}`: 속성 공격 버프가 펼친 속성 존의 속성을 따라감

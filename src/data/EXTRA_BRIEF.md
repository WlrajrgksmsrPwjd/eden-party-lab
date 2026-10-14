# 보강 데이터 수집 지시 (MP·지속 턴·퍼스널리티·현현·한국어 스킬명)

목표: 맡은 `src/data/chars_<X>.json`의 캐릭터마다 아래 보강 정보를 조사해 `src/data/extra/<X>.json` 하나에 저장한다.
기존 chars 파일은 절대 수정하지 않는다. 다른 파일도 건드리지 않는다.

## 정보원
1. altema 캐릭터 페이지 (일본어). 캐릭터의 `name_jp`로 `WebSearch` "アナデン <name_jp> 評価 altema" 를 해서 `https://altema.jp/anaden/chara/<숫자>` 주소를 찾고 `WebFetch`로 읽는다.
   WebFetch 프롬프트 예: "스킬 일람의 각 스킬 이름·소비MP·효과(지속 턴 포함), 어빌리티, VC, 성도 스킬, パーソナリティ 목록, ステータス 표의 MP 최대치, 顕現武器/真顕現 유무를 그대로 알려줘".
   한 번에 다 안 나오면 프롬프트를 바꿔 2회까지 재시도.
2. 보조: anothereden.wiki (영문) `https://anothereden.wiki/w/<영문명>` — MP·지속 턴·Personality 확인용.
3. 한국어 공식 스킬명: tier가 SS·S·A인 캐릭터만. 나무위키 `https://namu.wiki/w/<name_kr에서 괄호 스타일 표기를 뺀 이름>(어나더 에덴)` 또는 WebSearch "어나더 에덴 <name_kr> 스킬" 로 확인된 경우에만 적는다. 추측 금지. 못 찾으면 생략.

## 출력 형식 (키 = 캐릭터 id, 유효한 JSON 객체 하나)
```json
{
  "jilfany_as": {
    "src": "https://altema.jp/anaden/chara/1234",
    "personality": ["剣", "水", "晶", "アルカディア"],
    "mp": {"main": 120, "sb": 180, "buff": 90},
    "turns": {"buff": 3, "debuff": 3},
    "buff_how": "skill",
    "mp_max": 520,
    "manifest": 1,
    "ko": {"main": "인키데레", "sb": "크루오르 엔시스"}
  }
}
```
- `personality`: altema의 パーソナリティ 목록을 일본어 원문 그대로 전부.
- `mp.main`: chars 파일 `main.skill` 스킬의 소비 MP. `mp.sb`: `sb.skill`(성도 스킬)의 소비 MP. `mp.buff`: 파티 버프(`party_buff`)를 거는 주된 스킬의 소비 MP. 버프가 어빌리티·자동이라 행동이 필요 없으면 0. 모르면 null.
- `turns.buff`: 그 파티 버프의 지속 턴. 상시(어빌리티·오라·기도/가창 유지형)는 99, "1ターン"·VC 1턴은 1, "N回行動"이면 N. `turns.debuff`: 주된 디버프 지속 턴(같은 규칙). 없거나 모르면 null.
- `buff_how`: 파티 버프를 거는 방식. `skill`(행동 필요) / `auto`(전투 시작·턴 시작 자동) / `passive`(상시 어빌리티) / `chain`(체인 어빌리티) / `none`(파티 버프 없음).
- `mp_max`: 스테이터스 표의 MP 최대치(가장 높은 성장 기준 숫자). 모르면 null.
- `manifest`: 0 없음, 1 顕現武器 있음, 2 真顕現(진현현)까지 있음.
- `ko`: 한국어 공식 스킬명 (확인된 것만). 없으면 키 자체를 뺀다.
- 조사 실패한 캐릭터도 키는 넣고 아는 값만 채우며, 나머지는 null.

## 마무리
- 저장 후 `python3 -I -c "import json;d=json.load(open('<파일>'));print(len(d))"` 로 검증.
- 완료 보고는 "저장 파일, 캐릭터 수, mp.main을 못 찾은 id 목록, ko를 채운 수" 만 짧게.

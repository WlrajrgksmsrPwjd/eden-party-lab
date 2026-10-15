# 설정 목록 (`settings`)

자동 생성 파일 (`node tools/build_core.js`). 앱 화면 입력칸과 1:1로 대응합니다. 빠진 키는 기본값을 씁니다.

| 키 | 화면 이름 | 종류 | 기본값 | 고를 수 있는 값 |
|---|---|---|---|---|
| `baseEnd` | 캐릭터 내구 (장비 제외 · 루나틱 솔선용) | hidden | "0" |  |
| `baseSpr` | 캐릭터 정신 (장비 제외 · 루나틱 솔선용) | hidden | "0" |  |
| `str` | 힘 | number | 237 |  |
| `int` | 지능 | number | 162 |  |
| `spd` | 속도 | number | 249 |  |
| `luck` | 행운 | number | 150 |  |
| `mp` | 최대 MP | number | 512 |  |
| `fate` | 천명 | number | 255 |  |
| `atkAdj` | 공격 추가 보정 | number | 0 |  |
| `magAdj` | 마력 추가 보정 | number | 0 |  |
| `who` | 캐릭터 이름 (전용 무기 판별) | text | "" |  |
| `hideOther` | 다른 캐릭터 전용 장비 숨기기 | checkbox | true |  |
| `atkCls` | 공격 유형 (스킬 배율 표 · 빈 값 = 무기 기준) | select | "" | (빈 값=자동/없음), 물리, 마법 |
| `elem` | 스킬 속성 (스킬 배율 표) | select | "불" | 무속성, 불, 물, 땅, 바람, 번개, 그림자, 결정 |
| `range` | 범위 (스킬 배율 표) | select | "전체" | 전체, 단일 |
| `normalAtk` | 일반 공격 (스킬 배율 표) | checkbox | false |  |
| `power` | 1Hit 위력 (%) | number | 60 |  |
| `hits` | 타수 | number | 1 |  |
| `kind` | 기반 스탯 | select | "" | (빈 값=자동/없음), 힘, 지능, 속도 |
| `atkType` | 공격 타입 (ZONE 판정) | select | "" | (빈 값=자동/없음), 베기, 찌르기, 타격, 마법 |
| `tlv` | 레벨 | number | 91 |  |
| `aff` | 상성 | select | "통상" | 통상, 약점, 저항 |
| `tdef` | 방어 | number | 174 |  |
| `tmdef` | 마방 | number | 174 |  |
| `tPoison` | 대상 독 | checkbox | false |  |
| `tPain` | 대상 페인 | checkbox | false |  |
| `hpPct` | 현재 HP (%) | number | 100 |  |
| `afGauge` | 어나더 포스 게이지 (%) | number | 0 |  |
| `zoneT` | 전개 중인 진 (ZONE) | select | "" | (빈 값=자동/없음), 열화진, 수천진, 지열진, 풍왕진, 초뢰진, 각음진, 휘정진, 황참진, 순돌진, 굉타진, 환마진, 성해진, 쌍격진 참마, 쌍격진 참돌, 섬격진, 월광진, 견수진 |
| `zoneAb` | ZONE 어빌리티 대미지 % | number | 0 |  |
| `af` | 어나더 포스 중 | checkbox | false |  |
| `zone` | ZONE 각성 중 | checkbox | false |  |
| `wins` | 누계 승리 최대치 | checkbox | true |  |
| `sPoison` | 독 | checkbox | false |  |
| `sPain` | 페인 | checkbox | false |  |
| `sSeal` | 봉인 | checkbox | false |  |
| `sTaunt` | 도발 | checkbox | false |  |
| `eHeat` | 가열 | checkbox | false |  |
| `eSpecial` | 특수 | checkbox | false |  |
| `eWeather` | 날씨 계통 | checkbox | false |  |
| `eGround` | 지표 계통 | checkbox | false |  |
| `eAir` | 대기 계통 | checkbox | false |  |
| `turns` | 경과 턴 (성장) | number | 10 |  |
| `enemies` | 적 수 | number | 1 |  |
| `fateAllies` | 천 아군 수 (전후방) | number | 0 |  |
| `meiAllies` | 명 아군 수 (전후방) | number | 0 |  |
| `skMul` | 스킬 위력 강화 (×) | number | 1 |  |
| `fallen` | 쓰러진 아군 수 | number | 0 |  |
| `pMode` | 파티원 P글래스터 | select | "direct" | direct, pick |
| `pHp` | HP 조건 대미지 증가 % | number | 0 |  |
| `pElem` | 속성 공격 % | number | 0 |  |
| `pZone` | ZONE 각성 시 대미지 증가 % | number | 0 |  |
| `pAddHp` | HP 조건 % | number | 0 |  |
| `pAddElem` | 속성 공격 % | number | 0 |  |
| `pAddZone` | ZONE 각성 % | number | 0 |  |
| `cu1` | 정신 통일 | checkbox | false |  |
| `cu2` | 심기일체 | checkbox | false |  |
| `mpFix` | 최대 MP 고정값 (버프) | number | 0 |  |
| `mpPct` | 최대 MP % (버프·디버프) | number | 0 |  |
| `bStr` | 힘 % | number | 0 |  |
| `bInt` | 지능 % | number | 0 |  |
| `bSpd` | 속도 % | number | 0 |  |
| `bWield` | 장착자 대미지 % | number | 0 |  |
| `bElemNE` | 속성 대미지 (버프) % | number | 0 |  |
| `hoshi` | 호시탐탐 % | number | 0 |  |
| `bGeko` | 하극상 버프 (계수 · 기본 200) | number | 0 |  |
| `bMulti` | 다단 강화 | checkbox | false |  |
| `bDef` | (대상) 내구 % | number | 0 |  |
| `bMdef` | (대상) 정신 % | number | 0 |  |
| `bRes` | (대상) 물리/마법 내성 % | number | 0 |  |
| `bERes` | (대상) 속성 내성 % | number | 0 |  |
| `bCrit` | 크리티컬율 (기타) % | number | 0 |  |
| `bMcrit` | 마법 크리티컬율 (기타) % | number | 0 |  |
| `bCpow` | 크리티컬 위력 (기타) % | number | 0 |  |
| `bMcpow` | 마법 크리티컬 위력 (기타) % | number | 0 |  |
| `bCombo` | 콤보 배율 % | number | 100 |  |
| `gStr` | 힘 고정값 (기타 합) | number | 0 |  |
| `gInt` | 지능 고정값 (기타 합) | number | 0 |  |
| `gSpd` | 속도 고정값 (기타 합) | number | 0 |  |
| `bWeak` | 약점 배율 증가 % | number | 0 |  |
| `bFinal` | 최종 대미지 배율 (×) | number | 1 |  |
| `dmgOnly` | 대미지 관련만 | checkbox | true |  |
| `withOre` | 연성 광석까지 함께 고르기 | checkbox | false |  |
| `sort` | 정렬 | select | "exp" | exp, n, c, max |

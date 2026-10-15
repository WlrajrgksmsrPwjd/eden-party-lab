# 작업 메모

- 배포: GitHub Pages (main 브랜치 루트의 index.html). index.html은 직접 고치지 말고 `src/`를 고친 뒤 `python3 -I src/build.py`로 다시 생성한다.
- 구성: `src/engine.js`(계산 엔진, 브라우저·Node 공용), `src/app.js`(화면), `src/app.css`, `src/body.html`, `src/data/chars_*.json`(캐릭터, 스키마는 src/data/SCHEMA.md), `src/data/bosses*.json`.
- 데이터 보강: `src/data/buff_rules.json`(조건부 버프 규칙, 형식은 SCHEMA.md), `src/data/extra/*.json`(MP·버프 지속 턴·퍼스널리티·현현, EXTRA_BRIEF.md), `src/data/meta.json`(데이터 기준일), `src/ko.py`(빌드 때 일본어 → 한국어 표시, 계산용 원문은 유지).
- 무거운 계산은 app.js가 엔진 코드를 Blob Worker로 띄워 돌린다(실패하면 메인 스레드). 엔진 결과 모양을 바꾸면 app.js의 workerMain·calcOptimize·calcPerChar도 맞춘다.
- 커밋 작성자는 Claude <noreply@anthropic.com> 로 둔다. 회사·개인 이메일이 기록에 남지 않게 한다.
- 엔진 확인: `node -e "const E=require('./src/engine.js')"` 로 로드한 뒤 optimize/perCharBest 를 돌려 본다.
- 계산 규칙(사용자 확인값): 절존 배율 = 극존, 오버크리티컬 = 크리율 100% 초과분÷10 확률로 대미지 2배, 1타 상한 9,999,999,999.
- 장비 효과 묶음(딩 계산기 행 기준, 사용자 확인): 속성 공격·HP 최대/저하 강화·P글래 속성은 한 합연산 묶음(35~37행), 각성의 힘(ZONE 각성)은 49행 합 후 곱, 대상 독·페인(39·40행)은 칸마다 곱. '효과 중복 불가'(약점 대미지 강화·MP 소비 공격·겨누어 쏘기·적 수 비례·인핸스)는 같은 종류 중 최댓값 하나. 포박의 공격 등 약점 대미지 강화는 약점 배율(26행)을 건드리지 않고 대미지에 바로 곱한다(eqopt.js에서 43행으로).
- 기본 대미지 = 딩 계산기 v4.016 식(engine.js dingHit: 공격력·방어·기준 스탯/32·속성 보정·크리 방어/4×3.25·물리 약점 1.85+마력 비례, 엑셀 대조 오차 0.65% 이내). 스탯 = 위키 스탯+천명 보너스+무기종 표준 장비(GEAR_STD·GEAR_FX, 딩 빌더 최적 빌드 측정값). 심기일체·정신통일 = 최대 MP×0.16%/0.23%(최대 250%). 1타는 일반·크리 나눠 25억 초과 경감(dingCap). 엔진 출력은 실제 대미지 추정치(억·조).
- 최고점 딜 = 허수아비(대두타) 기준 어포딜(engine.js dummySim): 1턴, AF 100% 시작(사용자 확인). AF를 행동 단위로(버퍼부터, 버프는 행동 후, 쿨타임 증가, 연출 중에도 게이지 감소), SB는 AF 도중 SB 게이지 100% 순간(AF 끝나면 불가), SB 효과는 남은 AF에, 연계(data/link.json) 추가타, 후열 연성 P글래 셔틀 가정. 1타 = 25억 경감 → × AF 콤보 → 상한 99.99억(사용자 확인). 스킬 배율은 1타당(타수만큼). 탐색은 어림 → 상위만 정밀. 약점·보스·직접 조절은 실전 = N턴 시뮬(out.bsim). 배치는 위치 버프 우선, 같으면 버퍼 왼쪽·주 딜러 오른쪽(AF 자동 선택이 왼쪽부터).
- 추가 데이터: `src/data/debuff_rules.json`(디버프 지속·조건), `chain.json`(체인 어빌리티), `skill_cond.json`(조건부 스킬 배율), `bosses_kesshitsu.json`(결실 현현·서약), `stats.json`(기본 스탯, 위키 Stats Index), `fate.json`(천명 보너스), `af_anim.json`(AF 연출 시간), `counter.json`(요격·`_cover` 수세), `af_start.json`(시작 AF 게이지), `char_base.json`(같은 캐릭터 스타일 묶음), `meta_decks.json`(보편 추천 덱, 출처·날짜 포함, 빌드 때 id 검사). 장비 계산은 `src/eqopt.js` + `vendor/ae-builder`(출처: 딩).

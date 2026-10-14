# 작업 메모

- 배포: GitHub Pages (main 브랜치 루트의 index.html). index.html은 직접 고치지 말고 `src/`를 고친 뒤 `python3 -I src/build.py`로 다시 생성한다.
- 구성: `src/engine.js`(계산 엔진, 브라우저·Node 공용), `src/app.js`(화면), `src/app.css`, `src/body.html`, `src/data/chars_*.json`(캐릭터, 스키마는 src/data/SCHEMA.md), `src/data/bosses*.json`.
- 데이터 보강: `src/data/buff_rules.json`(조건부 버프 규칙, 형식은 SCHEMA.md), `src/data/extra/*.json`(MP·버프 지속 턴·퍼스널리티·현현, EXTRA_BRIEF.md), `src/data/meta.json`(데이터 기준일), `src/ko.py`(빌드 때 일본어 → 한국어 표시, 계산용 원문은 유지).
- 무거운 계산은 app.js가 엔진 코드를 Blob Worker로 띄워 돌린다(실패하면 메인 스레드). 엔진 결과 모양을 바꾸면 app.js의 workerMain·calcOptimize·calcPerChar도 맞춘다.
- 커밋 작성자는 Claude <noreply@anthropic.com> 로 둔다. 회사·개인 이메일이 기록에 남지 않게 한다.
- 엔진 확인: `node -e "const E=require('./src/engine.js')"` 로 로드한 뒤 optimize/perCharBest 를 돌려 본다.
- 계산 규칙(사용자 확인값): 절존 배율 = 극존, 오버크리티컬 = 크리율 100% 초과분÷10 확률로 대미지 2배, 1타 상한 9,999,999,999.

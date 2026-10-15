// 어나더에덴 빌더 코어 타입 정의 — Settings 부분은 자동 생성 (node tools/build_core.js)
// 계산 공식: AE 대미지 계산기 v4.016 (원작자: 딩) · 장비 데이터: 딩 님의 장비 정리 시트
// 사용: const AECore = require('ae-builder-core') / import AECore from 'ae-builder-core' (esModuleInterop)
//       타입은 AECore.State, AECore.EvaluateResult …

declare namespace AECore {
  export type SlotKey = 'weapon' | 'armor' | 'badge1' | 'badge2' | 'g1' | 'g2' | 'g3' | 'g4' | 'gs';
  export type GlasterSlot = 'g1' | 'g2' | 'g3' | 'g4' | 'gs';
  export type WeaponType = '지팡이' | '검' | '도' | '도끼' | '창' | '활' | '권갑' | '망치';
  export type StatKey = 'str' | 'int' | 'spd' | 'luck' | 'mp' | 'end' | 'spr' | 'hp';
  /** 장비 id('w12') 또는 정확한 이름 */
  export type ItemRef = string;

  /** 앱 입력칸 값 (FIELDS.md). 빠진 키는 기본값 */
  export interface Settings {
    /** 캐릭터 내구 (장비 제외 · 루나틱 솔선용) (기본 "0") */
    baseEnd?: number | string;
    /** 캐릭터 정신 (장비 제외 · 루나틱 솔선용) (기본 "0") */
    baseSpr?: number | string;
    /** 힘 (기본 237) */
    str?: number;
    /** 지능 (기본 162) */
    int?: number;
    /** 속도 (기본 249) */
    spd?: number;
    /** 행운 (기본 150) */
    luck?: number;
    /** 최대 MP (기본 512) */
    mp?: number;
    /** 천명 (기본 255) */
    fate?: number;
    /** 공격 추가 보정 (기본 0) */
    atkAdj?: number;
    /** 마력 추가 보정 (기본 0) */
    magAdj?: number;
    /** 캐릭터 이름 (전용 무기 판별) (기본 "") */
    who?: string;
    /** 다른 캐릭터 전용 장비 숨기기 (기본 true) */
    hideOther?: boolean;
    /** 공격 유형 (스킬 배율 표 · 빈 값 = 무기 기준) (기본 "") */
    atkCls?: "" | "물리" | "마법";
    /** 스킬 속성 (스킬 배율 표) (기본 "불") */
    elem?: "무속성" | "불" | "물" | "땅" | "바람" | "번개" | "그림자" | "결정";
    /** 범위 (스킬 배율 표) (기본 "전체") */
    range?: "전체" | "단일";
    /** 일반 공격 (스킬 배율 표) (기본 false) */
    normalAtk?: boolean;
    /** 1Hit 위력 (%) (기본 60) */
    power?: number;
    /** 타수 (기본 1) */
    hits?: number;
    /** 기반 스탯 (기본 "") */
    kind?: "" | "힘" | "지능" | "속도";
    /** 공격 타입 (ZONE 판정) (기본 "") */
    atkType?: "" | "베기" | "찌르기" | "타격" | "마법";
    /** 레벨 (기본 91) */
    tlv?: number;
    /** 상성 (기본 "통상") */
    aff?: "통상" | "약점" | "저항";
    /** 방어 (기본 174) */
    tdef?: number;
    /** 마방 (기본 174) */
    tmdef?: number;
    /** 대상 독 (기본 false) */
    tPoison?: boolean;
    /** 대상 페인 (기본 false) */
    tPain?: boolean;
    /** 현재 HP (%) (기본 100) */
    hpPct?: number;
    /** 어나더 포스 게이지 (%) (기본 0) */
    afGauge?: number;
    /** 전개 중인 진 (ZONE) (기본 "") */
    zoneT?: "" | "열화진" | "수천진" | "지열진" | "풍왕진" | "초뢰진" | "각음진" | "휘정진" | "황참진" | "순돌진" | "굉타진" | "환마진" | "성해진" | "쌍격진 참마" | "쌍격진 참돌" | "섬격진" | "월광진" | "견수진";
    /** ZONE 어빌리티 대미지 % (기본 0) */
    zoneAb?: number;
    /** 어나더 포스 중 (기본 false) */
    af?: boolean;
    /** ZONE 각성 중 (기본 false) */
    zone?: boolean;
    /** 누계 승리 최대치 (기본 true) */
    wins?: boolean;
    /** 독 (기본 false) */
    sPoison?: boolean;
    /** 페인 (기본 false) */
    sPain?: boolean;
    /** 봉인 (기본 false) */
    sSeal?: boolean;
    /** 도발 (기본 false) */
    sTaunt?: boolean;
    /** 가열 (기본 false) */
    eHeat?: boolean;
    /** 특수 (기본 false) */
    eSpecial?: boolean;
    /** 날씨 계통 (기본 false) */
    eWeather?: boolean;
    /** 지표 계통 (기본 false) */
    eGround?: boolean;
    /** 대기 계통 (기본 false) */
    eAir?: boolean;
    /** 경과 턴 (성장) (기본 10) */
    turns?: number;
    /** 적 수 (기본 1) */
    enemies?: number;
    /** 천 아군 수 (전후방) (기본 0) */
    fateAllies?: number;
    /** 명 아군 수 (전후방) (기본 0) */
    meiAllies?: number;
    /** 스킬 위력 강화 (×) (기본 1) */
    skMul?: number;
    /** 쓰러진 아군 수 (기본 0) */
    fallen?: number;
    /** 파티원 P글래스터 (기본 "direct") */
    pMode?: "direct" | "pick";
    /** HP 조건 대미지 증가 % (기본 0) */
    pHp?: number;
    /** 속성 공격 % (기본 0) */
    pElem?: number;
    /** ZONE 각성 시 대미지 증가 % (기본 0) */
    pZone?: number;
    /** HP 조건 % (기본 0) */
    pAddHp?: number;
    /** 속성 공격 % (기본 0) */
    pAddElem?: number;
    /** ZONE 각성 % (기본 0) */
    pAddZone?: number;
    /** 정신 통일 (기본 false) */
    cu1?: boolean;
    /** 심기일체 (기본 false) */
    cu2?: boolean;
    /** 최대 MP 고정값 (버프) (기본 0) */
    mpFix?: number;
    /** 최대 MP % (버프·디버프) (기본 0) */
    mpPct?: number;
    /** 힘 % (기본 0) */
    bStr?: number;
    /** 지능 % (기본 0) */
    bInt?: number;
    /** 속도 % (기본 0) */
    bSpd?: number;
    /** 장착자 대미지 % (기본 0) */
    bWield?: number;
    /** 속성 대미지 (버프) % (기본 0) */
    bElemNE?: number;
    /** 호시탐탐 % (기본 0) */
    hoshi?: number;
    /** 하극상 버프 (계수 · 기본 200) (기본 0) */
    bGeko?: number;
    /** 다단 강화 (기본 false) */
    bMulti?: boolean;
    /** (대상) 내구 % (기본 0) */
    bDef?: number;
    /** (대상) 정신 % (기본 0) */
    bMdef?: number;
    /** (대상) 물리/마법 내성 % (기본 0) */
    bRes?: number;
    /** (대상) 속성 내성 % (기본 0) */
    bERes?: number;
    /** 크리티컬율 (기타) % (기본 0) */
    bCrit?: number;
    /** 마법 크리티컬율 (기타) % (기본 0) */
    bMcrit?: number;
    /** 크리티컬 위력 (기타) % (기본 0) */
    bCpow?: number;
    /** 마법 크리티컬 위력 (기타) % (기본 0) */
    bMcpow?: number;
    /** 콤보 배율 % (기본 100) */
    bCombo?: number;
    /** 힘 고정값 (기타 합) (기본 0) */
    gStr?: number;
    /** 지능 고정값 (기타 합) (기본 0) */
    gInt?: number;
    /** 속도 고정값 (기타 합) (기본 0) */
    gSpd?: number;
    /** 약점 배율 증가 % (기본 0) */
    bWeak?: number;
    /** 최종 대미지 배율 (×) (기본 1) */
    bFinal?: number;
    /** 대미지 관련만 (기본 true) */
    dmgOnly?: boolean;
    /** 연성 광석까지 함께 고르기 (기본 false) */
    withOre?: boolean;
    /** 정렬 (기본 "exp") */
    sort?: "exp" | "n" | "c" | "max";
  }

  export interface CustomItem {
    id: string;
    slot: 'weapon' | 'armor' | 'badge' | 'glaster' | 'gs';
    n?: string;
    /** 무기 종류(무기) 또는 '팔찌'|'목걸이'|'반지'(방어구) */
    t?: string;
    /** 글래스터 무기 제한 */
    gwt?: WeaponType | '';
    atk?: number;
    mag?: number;
    st?: Partial<Record<StatKey, number>>;
    fx?: Array<{ type: string; v: number; e?: string; th?: number; st?: string; max?: number; z?: string; zk?: boolean; who?: '천' | '명'; env?: '가열' | '특수' | '날씨' | '지표' | '대기' }>;
  }

  export interface State {
    settings?: Settings;
    /** 무기를 안 꼈을 때 기준 무기 종류 */
    weaponType?: WeaponType | '전체';
    equip?: Partial<Record<SlotKey, ItemRef | null>>;
    /** '' = 각성, 'pot' = 각성 + 잠재 연성, 그 밖은 광석 id 또는 이름 */
    ore?: Partial<Record<GlasterSlot, string>>;
    lunatic?: Array<{ t: '솔선' | '결사' | '심안'; eqManual?: boolean; eqEnd?: number; eqSpr?: number }>;
    /** 파티원 P글래스터 (settings.pMode = 'pick'일 때) */
    pgl?: Array<{ n: string; c?: string; o?: '' | 'pot' }>;
    /** 진 증표(pj)·일반 증표(pn)의 [스탯, 값] 3줄 */
    pledge?: { pj: Array<[string, number]>; pn: Array<[string, number]> };
    gChoice?: Record<string, string[]>;
    wChoice?: Record<string, Array<number | ''>>;
    badgeVal?: { badge1?: Array<{ s: StatKey; v: number }>; badge2?: Array<{ s: StatKey; v: number }> };
    customs?: CustomItem[];
    /** 내 캐릭터가 해당하는 성격·소속·속성 */
    myAttr?: string[];
    /** 칸별로 고른 장착 조건 { 'slot:g1': '동방' } */
    condPick?: Record<string, string>;
  }

  /** 계산기 시트 입력 (셀 이름) */
  export interface CalcInput {
    D3: string; D4: number; D5: number; D6: number; D7: number; D8: number; D9: number; D10: number;
    G3: string; G4: string; G5: string; G6: number; J3: number; J4: number; J5: number; J6: string;
    F67: 'ON' | 'OFF'; FM: number;
    /** 계산기 시트 행 번호 → 칸 값들 */
    rows: Record<number, Array<number | null>>;
  }

  export interface HitResult {
    /** 기대 대미지 (25억 경감 반영) */
    exp: number;
    /** 25억 경감 전 */
    raw: number;
    /** 크리티컬 없음 */
    n: number;
    /** 크리티컬 확정 */
    c: number;
  }

  export interface EvaluateResult {
    /** 기대 대미지 (크리율 반영, 타수 합) */
    exp: number;
    n: number;
    c: number;
    max: number;
    /** 크리율 % */
    crit: number;
    /** 버프 반영 최대 MP */
    mp: number;
    /** 25억 경감에 걸렸을 때 경감 전 합 (안 걸리면 null) */
    raw: { n: number; c: number; exp: number } | null;
    per: HitResult[];
    /** 스킬 종류 (물리공격, 마법공격 …) */
    kind: string;
    input: CalcInput;
    /** 계산에 들어간 장비 이름 */
    items: string[];
  }

  export interface Build {
    equip: Partial<Record<SlotKey, string | null>>;
    ore: Partial<Record<GlasterSlot, string>>;
  }

  export interface DetailResult {
    kind: string;
    phys: boolean;
    atk: number; mag: number; str: number; int: number; spd: number; luck: number; mp: number; crit: number;
    n: number; c: number; exp: number;
    /** [항목, 값 설명] — 적용된 계산기 행 요약 */
    rows: Array<[string, string]>;
    /** 칸별 효과: t = 설명, ok = 지금 조건에서 적용되는지 */
    per: Partial<Record<SlotKey, Array<{ t: string; ok: boolean }>>>;
  }

  export interface OptimizeOptions {
    weaponType?: WeaponType;
    /** exp = 기대값 (기본) · c = 크리티컬 확정 · n = 크리티컬 없음 */
    metric?: 'exp' | 'c' | 'n';
    /** page = settings.af 그대로 */
    af?: 'page' | 'on' | 'off';
    /** 고정 장비. id ''이면 그 부위를 비움 */
    pins?: Array<{ kind: 'weapon' | 'armor' | 'badge' | 'gl' | 'gs'; id: ItemRef | ''; ore?: string }>;
    /** 미보유 장비 (id 또는 이름) */
    excl?: ItemRef[];
    dupEx?: Array<{ n: string; kind: 'gl' | 'badge'; max: number }>;
    /** 끌 기본 중복 예외 이름 */
    dupOff?: string[];
    signal?: AbortSignal;
    onTick?: (evals: number) => void;
    onStart?: (done: number, total: number) => void;
    restarts?: number;
    climb?: 'both' | 'first' | 'steep' | 'mix';
    routeCut?: number;
    topN?: number;
    pairK?: number;
    pair?: boolean;
  }

  export interface FoundBuild extends Build {
    value: number;
    /** 칸별 장비 이름 (글래스터는 [연성 상태] 포함) */
    names: Record<SlotKey, string | null>;
  }

  export interface OptimizeResult {
    /** 찾은 최선 (멈춘 시점에 아무것도 못 찾았으면 undefined) */
    best: FoundBuild | undefined;
    alts: FoundBuild[];
    /** 지금 장착한 빌드의 값 */
    current: number;
    evals: number;
    stopped: boolean;
    metric: 'exp' | 'c' | 'n';
    weaponType: WeaponType;
    /** 고정 장비 배치 (why: 빠진 이유) */
    pinPlan: { map: Record<string, { id: string | null; ore: string }>; why: string[]; note: string[]; choose: Record<string, unknown> };
  }

  export interface Item {
    id: string;
    /** 이름 */
    n: string;
    slot: 'weapon' | 'armor' | 'badge' | 'glaster';
    /** 무기 종류 / 방어구 종류 */
    t?: string;
    /** 글래스터 무기 제한 */
    wt?: string;
    [k: string]: unknown;
  }

  export interface FieldDef {
    type: 'number' | 'checkbox' | 'select' | 'text' | 'hidden';
    def: number | boolean | string;
    label: string;
    options?: string[];
  }

  export interface AECoreApi {
    /** 패키지 버전 */
    version: string;
    /** 출처 문구 — 쓰는 앱에도 남겨 주세요 */
    credit: string;
    items: Record<string, Item>;
    ores: Record<string, { id: string; n: string; fx: unknown[] }>;
    data: { w: Item[]; armor: Item[]; badges: Item[]; gl: Item[]; ores: unknown[] };
    partyGlasters: Array<{ n: string; fam: string; party: boolean; dmg: boolean; vars: Array<{ c: string; potOk: boolean }> }>;
    fields: Record<keyof Settings, FieldDef>;
    slots: Array<[SlotKey, string]>;
    weaponTypes: WeaponType[];
    armorOf: Record<WeaponType, '팔찌' | '목걸이' | '반지'>;
    /** 계산기 시트 그대로 */
    calc(inp: CalcInput): { n: { avg: number; max: number }; c: { avg: number; max: number }; [k: string]: unknown };
    find(q: string, opt?: { slot?: Item['slot']; type?: string }): Array<{ id: string; n: string; slot: string; t: string; wt: string; conds: string[] }>;
    setState(st: State): AECoreApi;
    getState(): State;
    evaluate(st?: State): EvaluateResult;
    detail(build?: Partial<Build>, st?: State): DetailResult;
    /** 한 번에 하나만 (도는 동안 다른 호출은 오류) */
    optimize(st?: State, opt?: OptimizeOptions): Promise<OptimizeResult>;
  }
}

declare const AECore: AECore.AECoreApi;
export = AECore;

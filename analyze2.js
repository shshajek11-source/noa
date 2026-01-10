const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/shsha/OneDrive/바탕 화면/hiton2/dorong_data.json', 'utf8'));

console.log('▶ 마석 상세');
const equipment = data.equipment?.equipmentList || [];
for (const item of equipment) {
    if (item.manastoneList && item.manastoneList.length > 0) {
        console.log('  [' + item.slotPos + '] ' + item.name + ':');
        for (const m of item.manastoneList) {
            console.log('    - ' + (m.type || m.name) + ' (' + m.grade + ')');
        }
    }
}

console.log('\n▶ 대바니온 스탯 계산 (비례 계산)');
const boards = data.daevanion?.boardList || [];

// DAEVANION_BOARD_STATS 참조값 (최대 노드 기준)
const maxStats = {
    '네자칸': { 생명력: 1100, 정신력: 450, '치명타 저항': 90, '추가 공격력': 50, 치명타: 100, '재사용 시간 감소': 5, '전투 속도': 5, '추가 방어력': 500 },
    '지켈': { '피해 내성': 10, 생명력: 700, 정신력: 250, '피해 증폭': 10, '치명타 저항': 70, '추가 공격력': 55, 치명타: 100, '추가 방어력': 450 },
    '바이젤': { 생명력: 700, '치명타 피해 증폭': 10, 정신력: 450, '치명타 저항': 80, '추가 공격력': 50, '치명타 피해 내성': 10, 치명타: 110, '추가 방어력': 500 },
    '트리니엘': { 생명력: 1200, 정신력: 600, '다단 히트 저항': 9, '치명타 저항': 90, '추가 공격력': 70, 치명타: 150, '다단 히트 적중': 9, '추가 방어력': 650 },
    '아리엘': { 'PVE 공격력': 10, 'PVE 회피': 20, 정신력: 50, '보스 공격력': 5, '보스 방어력': 50, 'PVE 명중': 20, 'PVE 방어력': 50 },
    '아스펠': { 'PVP 치명타 저항': 5, 정신력: 50, 'PVP 치명타': 5, 'PVP 회피': 10, 'PVP 공격력': 10 }
};

let totalDaevanionStats = {};

for (const board of boards) {
    const name = board.name;
    const open = board.openNodeCount;
    const total = board.totalNodeCount;
    const baseStats = maxStats[name];

    if (!baseStats) continue;

    const ratio = open / total;
    console.log('\n  ' + name + ' (' + open + '/' + total + ', 비율: ' + (ratio * 100).toFixed(1) + '%)');

    for (const [stat, value] of Object.entries(baseStats)) {
        const scaled = Math.floor(value * ratio);
        console.log('    ' + stat + ': ' + scaled + ' (max ' + value + ')');

        if (!totalDaevanionStats[stat]) totalDaevanionStats[stat] = 0;
        totalDaevanionStats[stat] += scaled;
    }
}

console.log('\n▶ 대바니온 스탯 총합');
for (const [stat, value] of Object.entries(totalDaevanionStats)) {
    console.log('  ' + stat + ': ' + value);
}

// 최종 합산
console.log('\n\n========================================');
console.log('▶ 최종 예상 스탯 (장비 + 대바니온 + 기본스탯%)');
console.log('========================================');

// 장비에서 오는 고정값
let equipAttack = 0, equipDefense = 0, equipHP = 0, equipCrit = 0;
let equipAccuracy = 0, equipEvasion = 0, equipBlock = 0;

for (const item of equipment) {
    const detail = item.detail;
    if (!detail) continue;
    const raw = detail._raw || detail;

    if (raw.mainStats) {
        for (const stat of raw.mainStats) {
            const base = parseInt(stat.value) || 0;
            const extra = parseInt(stat.extra) || 0;
            const total = base + extra;

            if (stat.name === '공격력') equipAttack += total;
            if (stat.name === '방어력') equipDefense += total;
            if (stat.name === '생명력') equipHP += total;
            if (stat.name === '치명타') equipCrit += total;
            if (stat.name === '명중') equipAccuracy += total;
            if (stat.name === '회피') equipEvasion += total;
            if (stat.name === '막기') equipBlock += total;
        }
    }

    // 영혼각인
    if (raw.subStats) {
        for (const stat of raw.subStats) {
            const val = parseInt(stat.value) || 0;
            if (stat.name === '공격력') equipAttack += val;
            if (stat.name === '방어력') equipDefense += val;
            if (stat.name === '생명력') equipHP += val;
            if (stat.name === '치명타') equipCrit += val;
            if (stat.name === '명중') equipAccuracy += val;
            if (stat.name === '회피') equipEvasion += val;
            if (stat.name === '막기') equipBlock += val;
        }
    }
}

// 대바니온에서 오는 고정값
const daevanionAttack = (totalDaevanionStats['추가 공격력'] || 0);
const daevanionDefense = (totalDaevanionStats['추가 방어력'] || 0);
const daevanionHP = (totalDaevanionStats['생명력'] || 0);
const daevanionCrit = (totalDaevanionStats['치명타'] || 0);

// 기본 스탯 % 증가
const attackPercent = 15.5;  // 위력 11.5% + 파괴[지켈] 4%
const defensePercent = 15.2; // 정의[네자칸] 15.2%
const hpPercent = 15.7;      // 체력 5.1% + 생명[유스티엘] 10.6%
const critPercent = 15.4;    // 죽음[트리니엘] 15.4%

// 타이틀에서 오는 값
const titleDefense = 300; // 알트가르드의 성자 추가 방어력
const titleHP = 800;      // 지켈의 근원을 마주하다 생명력
const titleBlock = 110;   // 알트가르드의 성자 막기

// 최종 계산
const baseAttack = equipAttack + daevanionAttack;
const baseDefense = equipDefense + daevanionDefense + titleDefense;
const baseHP = equipHP + daevanionHP + titleHP;
const baseCrit = equipCrit + daevanionCrit;

const finalAttack = Math.floor(baseAttack * (1 + attackPercent / 100));
const finalDefense = Math.floor(baseDefense * (1 + defensePercent / 100));
const finalHP = Math.floor(baseHP * (1 + hpPercent / 100));
const finalCrit = Math.floor(baseCrit * (1 + critPercent / 100));

console.log('\n  공격력:');
console.log('    장비 기본: ' + equipAttack);
console.log('    대바니온: +' + daevanionAttack);
console.log('    소계: ' + baseAttack);
console.log('    증가 적용 (+' + attackPercent + '%): ' + finalAttack);

console.log('\n  방어력:');
console.log('    장비 기본: ' + equipDefense);
console.log('    대바니온: +' + daevanionDefense);
console.log('    타이틀: +' + titleDefense);
console.log('    소계: ' + baseDefense);
console.log('    증가 적용 (+' + defensePercent + '%): ' + finalDefense);

console.log('\n  생명력:');
console.log('    장비 기본: ' + equipHP);
console.log('    대바니온: +' + daevanionHP);
console.log('    타이틀: +' + titleHP);
console.log('    소계: ' + baseHP);
console.log('    증가 적용 (+' + hpPercent + '%): ' + finalHP);

console.log('\n  치명타:');
console.log('    장비 기본: ' + equipCrit);
console.log('    대바니온: +' + daevanionCrit);
console.log('    소계: ' + baseCrit);
console.log('    증가 적용 (+' + critPercent + '%): ' + finalCrit);

console.log('\n  명중: ' + equipAccuracy);
console.log('  회피: ' + equipEvasion);
console.log('  막기: ' + (equipBlock + titleBlock));

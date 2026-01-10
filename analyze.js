const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/shsha/OneDrive/바탕 화면/hiton2/dorong_data.json', 'utf8'));

console.log('\n▶ 장비 목록 (마석 + 영혼각인)');
const equipment = data.equipment?.equipmentList || [];
for (const item of equipment) {
    const slot = item.slotPos;
    const name = item.name;
    const enchant = item.enchantLevel || 0;
    const exceed = item.exceedLevel || 0;
    const itemLevel = item.itemLevel || 0;

    console.log('\n  [' + slot + '] ' + name + ' (+' + enchant + ', 돌파:' + exceed + ', IL:' + itemLevel + ')');

    // 마석
    if (item.manastoneList && item.manastoneList.length > 0) {
        console.log('    마석:', item.manastoneList.map(m => m.type || m.name).join(', '));
    }

    // 상세 정보
    const detail = item.detail;
    if (detail) {
        const raw = detail._raw || detail;

        // mainStats (기본 옵션 + 강화 보너스)
        if (raw.mainStats && raw.mainStats.length > 0) {
            console.log('    기본옵션:');
            for (const stat of raw.mainStats) {
                const extra = (stat.extra && stat.extra !== '0') ? ' (+' + stat.extra + ')' : '';
                console.log('      ' + stat.name + ': ' + stat.value + extra);
            }
        }

        // subStats (영혼각인)
        if (raw.subStats && raw.subStats.length > 0) {
            console.log('    영혼각인:');
            for (const stat of raw.subStats) {
                console.log('      ' + stat.name + ': ' + stat.value);
            }
        }
    }
}

// 타이틀
console.log('\n\n▶ 타이틀 스탯');
const titles = data.titles?.titleList || [];
let equippedTitle = titles.find(t => t.id === data.profile?.titleId);
if (equippedTitle) {
    console.log('  장착 타이틀:', equippedTitle.name);
    if (equippedTitle.equipStatList) {
        for (const stat of equippedTitle.equipStatList) {
            console.log('    장착효과:', stat.desc);
        }
    }
}

// 카테고리 대표 타이틀
const categoryTitles = titles.filter(t => t.equipCategory);
for (const title of categoryTitles) {
    if (title.equipStatList && title.equipStatList.length > 0) {
        console.log('  [' + title.equipCategory + '] ' + title.name + ':');
        for (const stat of title.equipStatList) {
            console.log('    ', stat.desc);
        }
    }
}

// 스탯 합산
console.log('\n\n▶ 스탯 합산 분석');

// 1. 기본 스탯에서 오는 퍼센트 증가
let attackPercent = 0;
let defensePercent = 0;
let hpPercent = 0;
let critPercent = 0;

const statList = data.stats?.statList || [];
for (const s of statList) {
    const secondList = s.statSecondList || [];
    for (const second of secondList) {
        if (second.includes('공격력 증가')) {
            const match = second.match(/\+?([\d.]+)%/);
            if (match) attackPercent += parseFloat(match[1]);
        }
        if (second.includes('방어력 증가')) {
            const match = second.match(/\+?([\d.]+)%/);
            if (match) defensePercent += parseFloat(match[1]);
        }
        if (second.includes('생명력 증가')) {
            const match = second.match(/\+?([\d.]+)%/);
            if (match) hpPercent += parseFloat(match[1]);
        }
        if (second.includes('치명타 증가')) {
            const match = second.match(/\+?([\d.]+)%/);
            if (match) critPercent += parseFloat(match[1]);
        }
    }
}

console.log('  기본 스탯에서 오는 % 증가:');
console.log('    공격력 증가:', attackPercent.toFixed(1) + '%');
console.log('    방어력 증가:', defensePercent.toFixed(1) + '%');
console.log('    생명력 증가:', hpPercent.toFixed(1) + '%');
console.log('    치명타 증가:', critPercent.toFixed(1) + '%');

// 장비에서 오는 고정값
let totalAttack = 0;
let totalDefense = 0;
let totalHP = 0;
let totalCrit = 0;

for (const item of equipment) {
    const detail = item.detail;
    if (!detail) continue;
    const raw = detail._raw || detail;

    if (raw.mainStats) {
        for (const stat of raw.mainStats) {
            const base = parseInt(stat.value) || 0;
            const extra = parseInt(stat.extra) || 0;
            const total = base + extra;

            if (stat.name === '공격력') totalAttack += total;
            if (stat.name === '방어력') totalDefense += total;
            if (stat.name === '생명력') totalHP += total;
            if (stat.name === '치명타') totalCrit += total;
        }
    }
}

console.log('\n  장비 기본옵션에서 오는 고정값:');
console.log('    공격력:', totalAttack);
console.log('    방어력:', totalDefense);
console.log('    생명력:', totalHP);
console.log('    치명타:', totalCrit);

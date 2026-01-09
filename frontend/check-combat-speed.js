const data = require('./debug_daevanion.json');

const equip = data.full_info_sample?.equipment?.equipmentList || [];

console.log('=== Equipment with Combat Speed substats ===\n');

equip.forEach(e => {
  if (e.detail && e.detail.subStats) {
    const combatSpeed = e.detail.subStats.find(s => s.name && s.name.includes('전투'));
    if (combatSpeed) {
      console.log(`${e.name || e.slotName || 'Unknown'}: ${combatSpeed.name} ${combatSpeed.value}`);
    }
  }
});

console.log('\n=== All substats (for reference) ===\n');
let totalCombatSpeed = 0;

equip.forEach(e => {
  if (e.detail && e.detail.subStats && e.detail.subStats.length > 0) {
    console.log(`\n${e.name || e.slotName || 'Unknown'}:`);
    e.detail.subStats.forEach(stat => {
      console.log(`  - ${stat.name}: ${stat.value}`);
      if (stat.name && stat.name.includes('전투 속도') && stat.value) {
        const match = stat.value.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          totalCombatSpeed += parseFloat(match[1]);
        }
      }
    });
  }
});

console.log(`\n=== Total Combat Speed from Equipment: ${totalCombatSpeed}% ===`);
console.log(`Base Combat Speed (시간[시엘] 96): +19.2%`);
console.log(`Expected Total: ${totalCombatSpeed + 19.2}%`);
console.log(`In-game actual: 38.4%`);
console.log(`Difference: ${38.4 - (totalCombatSpeed + 19.2)}%`);

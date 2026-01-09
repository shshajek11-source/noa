const data = require('./debug_daevanion.json');

const equip = data.full_info_sample?.equipment?.equipmentList || [];

console.log(`Total equipment items: ${equip.length}\n`);

// Check first few items for structure
equip.slice(0, 3).forEach((item, idx) => {
  console.log(`\n=== Item ${idx + 1}: ${item.name || item.slotName || 'Unknown'} ===`);
  console.log(`Has detail? ${!!item.detail}`);
  if (item.detail) {
    console.log(`Detail keys: ${Object.keys(item.detail).join(', ')}`);
    console.log(`mainStats: ${item.detail.mainStats?.length || 0} items`);
    console.log(`subStats: ${item.detail.subStats?.length || 0} items`);

    if (item.detail.subStats && item.detail.subStats.length > 0) {
      console.log('SubStats:');
      item.detail.subStats.forEach(s => {
        console.log(`  - ${s.name}: ${s.value}`);
      });
    }
  }
});

// Check if equipment field exists vs equipmentList
console.log('\n=== Checking data structure ===');
console.log(`full_info_sample.equipment exists: ${!!data.full_info_sample?.equipment}`);
if (data.full_info_sample?.equipment) {
  console.log(`Keys in equipment: ${Object.keys(data.full_info_sample.equipment).join(', ')}`);
}

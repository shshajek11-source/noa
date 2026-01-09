const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mnbngmdjiszyowfvnzhk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'
);

const API_BASE = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateCharacter(char) {
  try {
    const url = `${API_BASE}/api/character?id=${encodeURIComponent(char.character_id)}&server=${char.server_id}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.log(`  ❌ ${char.name} - HTTP ${res.status}`);
      return false;
    }

    const data = await res.json();
    if (data.profile) {
      console.log(`  ✅ ${char.name} - 아이템Lv: ${data.stats?.statList?.find(s => s.name === '아이템레벨')?.value || '?'}`);
      return true;
    }
    return false;
  } catch (err) {
    console.log(`  ❌ ${char.name} - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== 캐릭터 일괄 업데이트 시작 ===\n');

  // item_level이 없거나 0인 캐릭터만 가져오기
  const { data: characters, error } = await supabase
    .from('characters')
    .select('character_id, server_id, name')
    .or('item_level.is.null,item_level.eq.0')
    .order('noa_score', { ascending: false, nullsFirst: false })
    .limit(100); // 한번에 100개씩

  if (error) {
    console.error('DB 조회 에러:', error);
    return;
  }

  console.log(`업데이트 대상: ${characters.length}개 캐릭터\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    console.log(`[${i + 1}/${characters.length}] ${char.name} 업데이트 중...`);

    const result = await updateCharacter(char);
    if (result) success++;
    else failed++;

    // API 부하 방지를 위해 1초 대기
    if (i < characters.length - 1) {
      await sleep(1000);
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`성공: ${success}개`);
  console.log(`실패: ${failed}개`);
}

main();

/**
 * 가계부(Ledger) 전용 인증/검증 유틸리티
 */

import { getSupabase } from './auth'

/**
 * 캐릭터 소유권 검증
 * @param characterId - 검증할 캐릭터 ID
 * @param userId - 유저 ID (ledger_users.id)
 * @returns 소유권 여부
 */
export async function verifyCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
  const supabase = getSupabase()

  const { data: character } = await supabase
    .from('ledger_characters')
    .select('user_id')
    .eq('id', characterId)
    .single()

  if (!character) return false

  return character.user_id === userId
}

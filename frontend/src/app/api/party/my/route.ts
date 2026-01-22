import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

// GET: 내 파티 목록 (만든 파티 / 참여 중 / 신청 대기)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. 내가 만든 파티 (파티장) - 완료된 파티 제외
    const { data: createdParties } = await supabase
      .from('party_posts')
      .select(`
        *,
        slots:party_slots(*),
        members:party_members(*)
      `)
      .eq('user_id', user.id)
      .in('status', ['recruiting', 'full', 'in_progress'])
      .order('created_at', { ascending: false })

    // 내가 만든 파티의 대기 중인 신청 수 계산
    const createdPartiesWithPending = createdParties?.map(party => {
      const pendingCount = party.members?.filter(
        (m: { status: string }) => m.status === 'pending'
      ).length || 0
      const currentMembers = party.members?.filter(
        (m: { status: string }) => m.status === 'approved'
      ).length || 0
      return {
        ...party,
        pending_count: pendingCount,
        current_members: currentMembers
      }
    }) || []

    // 2. 참여 중인 파티 (승인된 멤버)
    const { data: joinedMembers } = await supabase
      .from('party_members')
      .select(`
        *,
        party:party_posts(
          *,
          slots:party_slots(*),
          members:party_members(*)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .neq('role', 'leader')

    // 완료된 파티 제외
    const joinedParties = joinedMembers?.map(member => {
      const party = member.party
      if (!party) return null
      const currentMembers = party.members?.filter(
        (m: { status: string }) => m.status === 'approved'
      ).length || 0
      return {
        ...party,
        current_members: currentMembers,
        my_member: {
          id: member.id,
          slot_id: member.slot_id,
          character_name: member.character_name,
          character_class: member.character_class,
          role: member.role
        }
      }
    }).filter(p => p && ['recruiting', 'full', 'in_progress'].includes(p.status)) || []

    // 3. 신청 대기 중인 파티
    const { data: pendingMembers } = await supabase
      .from('party_members')
      .select(`
        *,
        party:party_posts(
          *,
          slots:party_slots(*),
          members:party_members(*)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')

    const pendingParties = pendingMembers?.map(member => {
      const party = member.party
      if (!party) return null
      const currentMembers = party.members?.filter(
        (m: { status: string }) => m.status === 'approved'
      ).length || 0
      return {
        ...party,
        current_members: currentMembers,
        my_application: {
          id: member.id,
          slot_id: member.slot_id,
          character_name: member.character_name,
          character_class: member.character_class,
          applied_at: member.applied_at
        }
      }
    }).filter(p => p && ['recruiting', 'full'].includes(p.status)) || []

    return NextResponse.json({
      created: createdPartiesWithPending,
      joined: joinedParties,
      pending: pendingParties,
      counts: {
        created: createdPartiesWithPending.length,
        joined: joinedParties.length,
        pending: pendingParties.length,
        total: createdPartiesWithPending.length + joinedParties.length + pendingParties.length
      }
    })
  } catch (err) {
    console.error('[My Parties] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

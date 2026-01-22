/**
 * API 인증 유틸리티
 * 모든 API route에서 공통으로 사용하는 인증 함수들
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient'

// Supabase 클라이언트 생성 (Service Role 키 우선 사용)
export function getSupabase(): SupabaseClient {
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, supabaseKey)
}

// 유저 타입 정의
export interface LedgerUser {
  id: string
}

/**
 * device_id로 유저 조회 또는 자동 생성
 * @param device_id - 클라이언트 디바이스 ID
 * @returns 유저 정보 또는 null
 */
export async function getOrCreateUserByDeviceId(device_id: string): Promise<LedgerUser | null> {
  const supabase = getSupabase()

  // 기존 유저 조회
  const { data: existingUser } = await supabase
    .from('ledger_users')
    .select('id')
    .eq('device_id', device_id)
    .single()

  if (existingUser) return existingUser

  // 유저가 없으면 자동 생성
  const { data: newUser, error } = await supabase
    .from('ledger_users')
    .insert({ device_id })
    .select('id')
    .single()

  if (error) {
    console.error('[Auth] Failed to create user:', error)
    return null
  }

  return newUser
}

/**
 * Request에서 인증된 유저 조회 (Google 로그인 전용)
 * Bearer 토큰으로만 인증합니다.
 * 크로스 기기 동기화를 위해 google_user_id로 조회합니다.
 *
 * @param request - HTTP Request 객체
 * @returns 유저 정보 또는 null
 */
export async function getUserFromRequest(request: Request): Promise<LedgerUser | null> {
  const supabase = getSupabase()

  // Bearer 토큰으로 인증 확인 (Google 로그인)
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (!user || error) {
    return null
  }

  // google_user_id로 먼저 조회 (link-device로 연동된 경우)
  let { data: ledgerUser } = await supabase
    .from('ledger_users')
    .select('id')
    .eq('google_user_id', user.id)
    .single()

  // google_user_id로 없으면 auth_user_id로 조회 (기존 방식 호환)
  if (!ledgerUser) {
    const { data: authUser } = await supabase
      .from('ledger_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    ledgerUser = authUser
  }

  // ledger_users 레코드가 없으면 자동 생성
  if (!ledgerUser) {
    console.log('[Auth] Creating ledger_users for google_user_id:', user.id)
    const { data: newLedgerUser, error: createError } = await supabase
      .from('ledger_users')
      .insert({
        google_user_id: user.id,
        auth_user_id: user.id,
        google_email: user.email,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (createError) {
      console.error('[Auth] Failed to create ledger_users:', createError)
      return null
    }

    ledgerUser = newLedgerUser
  }

  return ledgerUser
}

/**
 * Request에서 인증된 유저 조회 (device_id 또는 Bearer 토큰)
 * 가계부 등 비로그인 사용자도 사용하는 기능용
 * 우선순위: 1. device_id 2. Bearer 토큰
 *
 * @param request - HTTP Request 객체
 * @returns 유저 정보 또는 null
 */
export async function getUserFromRequestWithDevice(request: Request): Promise<LedgerUser | null> {
  // 1. device_id로 먼저 조회 (가계부 등 비로그인 기능)
  const device_id = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')
  if (device_id) {
    return getOrCreateUserByDeviceId(device_id)
  }

  // 2. Bearer 토큰으로 폴백
  return getUserFromRequest(request)
}

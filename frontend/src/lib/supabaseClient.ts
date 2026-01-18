import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 연결 상수
 *
 * 이 파일은 Supabase 연결의 "단일 진실 소스(Single Source of Truth)"입니다.
 * 다른 파일에서 SUPABASE_URL이나 SUPABASE_ANON_KEY가 필요하면 여기서 import하세요.
 *
 * 프로젝트 ID: mnbngmdjiszyowfvnzhk
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mnbngmdjiszyowfvnzhk.supabase.co'
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

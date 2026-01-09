import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/adminAuth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
    // Rate Limiting
    const rateLimit = checkRateLimit(request, RATE_LIMITS.admin)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Execute Truncate using raw SQL via rpc if available, or just delete all rows if RLS permits
        // Since we don't have a direct truncate RPC usually, we can use delete with no filter if allowed,
        // or we can use the postgres-meta approach if we were strictly admin.
        // But for this environment with the mcp tool I can just run SQL. 
        // Wait, I cannot run SQL from the frontend API route directly unless I have a function for it or use the service role to delete all.
        // Let's try deleting all rows.

        const { error } = await supabase
            .from('characters')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows where ID is not a dummy value (effectively all)

        if (error) {
            console.error('[Reset API] Delete failed:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'All data deleted' })

    } catch (err: any) {
        console.error('[Reset API] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

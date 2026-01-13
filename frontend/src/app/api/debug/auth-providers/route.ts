import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try to get auth settings
    const { data: session } = await supabase.auth.getSession()

    // Get available providers by trying to initiate OAuth
    const testProviders = ['google', 'github', 'facebook']
    const providerStatus: any = {}

    for (const provider of testProviders) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provider as any,
          options: {
            redirectTo: 'http://localhost:3001/test',
            skipBrowserRedirect: true
          }
        })

        providerStatus[provider] = {
          enabled: !error,
          error: error?.message || null,
          data: data
        }
      } catch (e: any) {
        providerStatus[provider] = {
          enabled: false,
          error: e.message
        }
      }
    }

    return NextResponse.json({
      supabaseUrl,
      hasAnonKey: !!supabaseKey,
      providerStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

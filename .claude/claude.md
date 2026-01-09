# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AION 2 character search and ranking service. A web application providing character information, rankings, equipment data, and stats for the AION 2 game.

**Tech Stack:**
- Frontend: Next.js 14 (App Router), TypeScript, CSS Variables (Dark + Yellow theme)
- Backend: Supabase Edge Functions (Deno)
- Database: Supabase PostgreSQL
- Deployment: Netlify (Frontend), Supabase (Backend)

## Commands

```bash
# From project root
cd frontend && npm run dev      # Dev server at http://localhost:3000
cd frontend && npm run build    # Production build
cd frontend && npm run lint     # ESLint check
cd frontend && npm run test:e2e # E2E health check

# Supabase Edge Functions (from supabase/)
supabase functions serve        # Local function testing
supabase functions deploy <fn>  # Deploy: get-character, search-character, etc.
```

## Architecture

```
hiton2/
├── frontend/src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes (Next.js)
│   │   ├── c/[server]/[name]/  # Character detail page
│   │   ├── ranking/            # Ranking page
│   │   ├── admin/              # Admin tools
│   │   └── components/         # Page-specific components
│   ├── components/             # Shared React components
│   ├── lib/                    # Core utilities
│   │   ├── supabaseApi.ts      # Supabase client wrapper
│   │   ├── statsAggregator.ts  # Character stats calculation
│   │   ├── chzzk.ts            # Live streaming integration
│   │   └── theme.ts            # Theme configuration
│   ├── types/                  # TypeScript type definitions
│   ├── hooks/                  # Custom React hooks
│   └── data/                   # Static data files
│
└── supabase/
    ├── functions/              # Edge Functions (Deno)
    │   ├── get-character/      # Character detail fetch
    │   ├── search-character/   # External API search
    │   ├── search-local-character/  # Local DB search
    │   └── refresh-character/  # Force data refresh
    └── migrations/             # Database schema
```

## Key Patterns

**Hybrid Search:** Searches combine local DB (fast) + external API (fresh) in parallel:
```typescript
// Local search first, then live API
supabaseApi.searchLocalCharacter(term).then(...)
supabaseApi.searchCharacter(term, serverId, race, 1).then(...)
```

**API Routes:** Use Next.js route handlers with proper error handling:
```typescript
export async function GET(request: NextRequest) {
    try {
        const [data1, data2] = await Promise.all([fetch(url1), fetch(url2)])
        return NextResponse.json(transformedData)
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
```

**Client Components:** Mark with `'use client'` at top when using hooks/interactivity.

## Project Guidelines

1. **Compact UI**: Keep fonts, cards, buttons reasonably sized to minimize scrolling
2. **Korean Language**: All explanations and reports in Korean
3. **Error Handling**: Display user-friendly error messages with copy button for debugging
4. **TypeScript Strict**: Maintain type safety throughout
5. **AION2 Data**: Apply game-specific race/class board ID rules accurately

## Environment Variables

Frontend `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## CSS Theme

Uses CSS Variables for Dark + Yellow accent theme:
```css
--bg-main: #0B0D12
--primary: #FACC15
--text-main: #E5E7EB
```

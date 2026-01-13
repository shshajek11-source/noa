'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface MainCharacter {
  characterId?: string
  server: string
  name: string
  className: string
  level: number
  race?: string
  item_level?: number
  hit_score?: number
  imageUrl?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  nickname: string | null
  isNicknameLoading: boolean
  mainCharacter: MainCharacter | null
  isMainCharacterLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  setNickname: (nickname: string) => Promise<void>
  refreshNickname: () => Promise<void>
  setMainCharacter: (character: MainCharacter | null) => Promise<void>
  refreshMainCharacter: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nickname, setNicknameState] = useState<string | null>(null)
  const [isNicknameLoading, setIsNicknameLoading] = useState(false)
  const [mainCharacter, setMainCharacterState] = useState<MainCharacter | null>(null)
  const [isMainCharacterLoading, setIsMainCharacterLoading] = useState(false)

  const fetchNickname = useCallback(async (accessToken: string) => {
    setIsNicknameLoading(true)
    try {
      const res = await fetch('/api/ledger/nickname', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setNicknameState(data.nickname)
      }
    } catch (err) {
      console.error('Failed to fetch nickname:', err)
    } finally {
      setIsNicknameLoading(false)
    }
  }, [])

  const fetchMainCharacter = useCallback(async (accessToken: string) => {
    setIsMainCharacterLoading(true)
    try {
      const res = await fetch('/api/user/main-character', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('[AuthContext] Fetched main character:', data.mainCharacter)
        setMainCharacterState(data.mainCharacter)
      }
    } catch (err) {
      console.error('Failed to fetch main character:', err)
    } finally {
      setIsMainCharacterLoading(false)
    }
  }, [])

  const refreshNickname = useCallback(async () => {
    if (session?.access_token) {
      await fetchNickname(session.access_token)
    }
  }, [session?.access_token, fetchNickname])

  const refreshMainCharacter = useCallback(async () => {
    if (session?.access_token) {
      await fetchMainCharacter(session.access_token)
    }
  }, [session?.access_token, fetchMainCharacter])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Fetch nickname and main character for authenticated users
      if (session?.access_token) {
        fetchNickname(session.access_token)
        fetchMainCharacter(session.access_token)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)

        // Fetch nickname and main character when user signs in
        if (event === 'SIGNED_IN' && session?.access_token) {
          fetchNickname(session.access_token)
          fetchMainCharacter(session.access_token)
        }

        // Clear nickname and main character when user signs out
        if (event === 'SIGNED_OUT') {
          setNicknameState(null)
          setMainCharacterState(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchNickname, fetchMainCharacter])

  const signInWithGoogle = async () => {
    console.log('[Auth] Google 로그인 시도 시작')
    console.log('[Auth] Redirect URL:', `${window.location.origin}/auth/callback`)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('[Auth] signInWithOAuth 응답:', { data, error })

      if (error) {
        console.error('[Auth] Google 로그인 오류:', error)
        throw error
      }

      console.log('[Auth] Google 로그인 성공, 리디렉션 중...')
    } catch (err) {
      console.error('[Auth] Google 로그인 예외:', err)
      throw err
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const setNickname = async (newNickname: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const res = await fetch('/api/ledger/nickname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ nickname: newNickname })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to set nickname')
    }

    const data = await res.json()
    setNicknameState(data.nickname)
  }

  const setMainCharacter = async (character: MainCharacter | null) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    console.log('[AuthContext] Setting main character:', character)

    const res = await fetch('/api/user/main-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(
        character
          ? {
              characterId: character.characterId,
              server: character.server,
              name: character.name,
              className: character.className,
              level: character.level,
              race: character.race,
              item_level: character.item_level,
              hit_score: character.hit_score,
              imageUrl: character.imageUrl
            }
          : {
              characterId: null,
              server: null,
              name: null,
              className: null,
              level: null,
              race: null,
              item_level: null,
              hit_score: null,
              imageUrl: null
            }
      )
    })

    if (!res.ok) {
      const error = await res.json()
      const errorMessage = error.error || 'Failed to set main character'
      console.error('[AuthContext] Main character set error:', errorMessage)
      throw new Error(errorMessage)
    }

    const data = await res.json()
    console.log('[AuthContext] Main character set response:', data.mainCharacter)
    setMainCharacterState(data.mainCharacter)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      nickname,
      isNicknameLoading,
      mainCharacter,
      isMainCharacterLoading,
      signInWithGoogle,
      signOut,
      setNickname,
      refreshNickname,
      setMainCharacter,
      refreshMainCharacter
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

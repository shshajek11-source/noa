'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface MainCharacter {
  server: string
  name: string
  className: string
  level: number
  characterId?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  nickname: string | null
  setNickname: (nickname: string) => Promise<void>
  mainCharacter: MainCharacter | null
  setMainCharacter: (character: MainCharacter) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const NICKNAME_KEY = 'ledger_nickname'
const MAIN_CHARACTER_KEY = 'ledger_main_character'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nickname, setNicknameState] = useState<string | null>(null)
  const [mainCharacter, setMainCharacterState] = useState<MainCharacter | null>(null)

  useEffect(() => {
    // Load nickname and main character from localStorage
    if (typeof window !== 'undefined') {
      const savedNickname = localStorage.getItem(NICKNAME_KEY)
      const savedMainCharacter = localStorage.getItem(MAIN_CHARACTER_KEY)
      if (savedNickname) setNicknameState(savedNickname)
      if (savedMainCharacter) {
        try {
          setMainCharacterState(JSON.parse(savedMainCharacter))
        } catch (e) {
          console.error('Failed to parse main character:', e)
        }
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const setNickname = async (newNickname: string) => {
    setNicknameState(newNickname)
    if (typeof window !== 'undefined') {
      localStorage.setItem(NICKNAME_KEY, newNickname)
    }
  }

  const setMainCharacter = async (character: MainCharacter) => {
    setMainCharacterState(character)
    if (typeof window !== 'undefined') {
      localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(character))
    }
  }

  const isAuthenticated = !!user && !!session

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated,
      nickname,
      setNickname,
      mainCharacter,
      setMainCharacter,
      signInWithGoogle,
      signOut
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

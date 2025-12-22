import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Role = 'USER' | 'MANAGER_FILIALE' | 'MANAGER_GENERAL'

interface Profile {
  id: string
  email: string
  role: Role
  filiale_code?: string | null
  display_name?: string | null
}

interface AuthContextType {
  user: Profile | null
  loading: boolean
  error?: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      // Demo Mode if Supabase is missing
      if (!supabase) {
        console.warn('Supabase not configured. Entering DEMO MODE.')
        setUser({
          id: 'demo-user',
          email: 'demo@kpi-filiales.com',
          role: 'MANAGER_GENERAL',
          display_name: 'Demo User',
          filiale_code: 'SN' // Example from Excel (Senegal?)
        })
        setLoading(false)
        return
      }

      const failTimeout = setTimeout(() => {
        setError('Impossible de recuperer la session (timeout). Verifiez la connexion ou les variables VITE_SUPABASE_*.')
        setLoading(false)
      }, 4000)

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Supabase getSession error:', error)
          setError('Impossible de recuperer la session. Verifiez la connexion ou les variables VITE_SUPABASE_*.')
        }
        if (data?.session?.user) await loadProfile(data.session.user.id)
      } catch (err: any) {
        console.error('Auth init error:', err)
        setError('Erreur d initialisation de l auth.')
      } finally {
        clearTimeout(failTimeout)
        setLoading(false)
      }
    }
    init()

    const { data: listener } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await loadProfile(session.user.id)
      else setUser(null)
    }) || { data: null }

    return () => listener?.subscription?.unsubscribe?.()
  }, [])

  const loadProfile = async (id: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,role,filiale_code,display_name')
      .eq('id', id)
      .single()
    if (error) {
      console.error('Load profile error:', error)
      setError('Impossible de charger le profil.')
      return
    }
    if (data) setUser(data as Profile)
  }

  const login = async (email: string, password: string) => {
    // Backdoor for Demo
    if (email === 'demo@kpi-filiales.com') {
      setUser({
        id: 'demo-user',
        email: 'demo@kpi-filiales.com',
        role: 'MANAGER_GENERAL',
        display_name: 'Demo User',
        filiale_code: 'SN'
      })
      return
    }

    if (!supabase) throw new Error('Supabase non initialise (variables manquantes)')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session?.user) await loadProfile(data.session.user.id)
  }

  const logout = async () => {
    if (!supabase) {
      setUser(null)
      return
    }
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

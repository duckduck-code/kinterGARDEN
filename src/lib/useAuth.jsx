import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not checked yet
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setProfileChecked(true)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data ?? null)
    setProfileChecked(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user?.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setProfileChecked(false)
      loadProfile(newSession?.user?.id)
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  // Password auth — no redirect hop, so no dependency on redirect-URL config,
  // in-app browsers, or session persistence surviving a cross-domain jump.
  // Accounts still only ever exist via manual invite (see supabase/schema.sql);
  // this just changes how an already-invited person proves who they are.
  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isLoading: session === undefined || (session && !profileChecked),
    isAuthenticated: !!session,
    isAuthorized: !!profile,
    isAdmin: profile?.role === 'admin',
    signInWithPassword,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

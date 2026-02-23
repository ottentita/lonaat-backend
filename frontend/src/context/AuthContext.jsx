import React, { createContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { getUser, setUser, setTokens, clearAuth } from '../utils/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try to refresh user on mount if token exists
    async function fetchMe() {
      try {
        setLoading(true)
        const resp = await authAPI.getMe()
        if (resp?.data?.user) {
          setUser(resp.data.user)
          setUserState(resp.data.user)
        }
      } catch (err) {
        // ignore silently, user might be unauthenticated
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
  }, [])

  const login = async (credentials) => {
    const resp = await authAPI.login(credentials)
    const data = resp?.data || {}
    // Support backend returning `token` (legacy) or `access_token`
    const token = data.access_token || data.token || null
    const refresh = data.refresh_token || null
    if (token) {
      setTokens(token, refresh)
    }

    if (data.user) {
      setUser(data.user)
      setUserState(data.user)
    } else if (token) {
      // try getMe when token present
      try {
        const me = await authAPI.getMe()
        if (me?.data?.user) {
          setUser(me.data.user)
          setUserState(me.data.user)
        } else if (me?.data?.id) {
          // some /me endpoints return flat user object
          setUser(me.data)
          setUserState(me.data)
        }
      } catch (e) {}
    }

    return data
  }

  const register = async (payload) => {
    const resp = await authAPI.register(payload)
    return resp?.data
  }

  const logout = () => {
    clearAuth()
    setUserState(null)
    // redirect to login (safe fallback)
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, setUser: setUserState, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext

import React, { createContext, useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import { authAPI, api } from '../services/api'
import { getUser, setUser, clearAuth } from '../utils/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser())
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate();

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
    // server sets httpOnly cookie; fetch fresh user from /me
    if (data.user) {
      setUser(data.user)
      setUserState(data.user)
    } else {
      try {
        const me = await authAPI.getMe()
        if (me?.data?.user) {
          setUser(me.data.user)
          setUserState(me.data.user)
        } else if (me?.data?.id) {
          setUser(me.data)
          setUserState(me.data)
        }
      } catch (e) {
        // ignore
      }
    }

    return data
  }

  const register = async (payload) => {
    const resp = await authAPI.register(payload)
    return resp?.data
  }

  const logout = () => {
    // clear local cached user and notify server to clear cookie
    clearAuth()
    setUserState(null)
    // call server logout to clear cookie
    try {
      api.post('/auth/logout')
    } catch (e) {}
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ user, token, setUser: setUserState, setToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext

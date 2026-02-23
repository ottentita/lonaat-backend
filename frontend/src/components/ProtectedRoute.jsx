import React from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

export default function ProtectedRoute({ children, adminOnly = false }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly) {
    // keep admin gating minimal here - pages can re-check using isAdmin()
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!(user?.is_admin === true || user?.role === 'admin')) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

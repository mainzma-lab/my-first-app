'use client'

import { createContext, useContext } from 'react'

export type UserProfile = {
  id: string
  email: string
  role: 'admin' | 'mitarbeiter'
  full_name: string
}

const UserContext = createContext<UserProfile | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: UserProfile
  children: React.ReactNode
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser(): UserProfile {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser muss innerhalb von UserProvider verwendet werden')
  return context
}

'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface UserRoles {
  loggedIn: boolean
  isAdmin: boolean
  isTeacher: boolean
  // A signed-in user without teacher or admin role. Students get their own
  // start page with the tools as cards, and no «KI-verktøy» menu.
  isStudent: boolean
}

const defaultRoles: UserRoles = { loggedIn: false, isAdmin: false, isTeacher: false, isStudent: false }

const UserRolesContext = createContext<UserRoles>(defaultRoles)

// Provided once from the root layout, so client components such as the navbar
// know the user's role without every page having to pass it down.
export function UserRolesProvider({ roles, children }: { roles: UserRoles; children: ReactNode }) {
  return <UserRolesContext.Provider value={roles}>{children}</UserRolesContext.Provider>
}

export function useUserRoles() {
  return useContext(UserRolesContext)
}

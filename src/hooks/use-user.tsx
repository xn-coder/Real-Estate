
'use client'

import * as React from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { User } from "@/types/user"

type UserContextType = {
  user: User | null
  isLoading: boolean
  fetchUser: () => Promise<void>
}

const UserContext = React.createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchUser = React.useCallback(async () => {
    setIsLoading(true);
    const userId = localStorage.getItem("userId")
    if (!userId) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const userDocRef = doc(db, "users", userId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.dob && data.dob.toDate) {
            data.dob = data.dob.toDate();
        }
        setUser({ id: userDoc.id, ...data } as User)
      } else {
        console.warn("User not found in Firestore")
        setUser(null)
        localStorage.removeItem("userId")
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <UserContext.Provider value={{ user, isLoading, fetchUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = React.useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

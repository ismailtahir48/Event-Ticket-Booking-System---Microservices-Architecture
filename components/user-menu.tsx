'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User, LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'

export function UserMenu() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  // Hide login/signup buttons on auth pages
  const isAuthPage = pathname === '/login' || pathname === '/register'

  const checkAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })
      
      console.log('Auth check response:', response.status, response.statusText)
      
      if (response.ok) {
        const userData = await response.json()
        console.log('User data received:', userData)
        setUser(userData)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.log('Auth check failed:', response.status, errorData)
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkAuth()
    
    // Listen for custom auth state change event (triggered after login)
    const handleAuthStateChange = () => {
      // Delay slightly to ensure cookie is available
      setTimeout(() => {
        checkAuth()
      }, 100)
    }
    
    // Re-check auth when pathname changes (after login redirect)
    const handleStorageChange = () => {
      checkAuth()
    }
    
    // Also check on focus (user might have logged in in another tab)
    const handleFocus = () => {
      checkAuth()
    }
    
    window.addEventListener('auth-state-changed', handleAuthStateChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [pathname]) // Re-check when pathname changes

  // Also check when pathname changes (after redirect)
  useEffect(() => {
    // Delay to ensure cookie is available after redirect
    const timer = setTimeout(() => {
      checkAuth()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [pathname])

  const handleLogout = async () => {
    await logoutAction()
    setUser(null)
    router.refresh()
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="h-5 w-5" />
      </Button>
    )
  }

  if (!user) {
    // Don't show login/signup buttons on auth pages
    if (isAuthPage) {
      return null
    }
    
    const handleLoginClick = () => {
      router.push('/login')
    }
    
    const handleSignUpClick = () => {
      router.push('/register')
    }
    
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleLoginClick}>
          Login
        </Button>
        <Button size="sm" onClick={handleSignUpClick}>
          Sign Up
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline text-sm text-[hsl(var(--muted-foreground))]">
        {user.email}
      </span>
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { loginAction, registerAction } from '@/app/actions/auth'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      console.log('Auth form submitting...', { mode, email });
      
      let result;
      if (mode === 'register') {
        result = await registerAction(formData)
        console.log('Register result:', result);
      } else {
        result = await loginAction(email, password)
        console.log('Login result:', result);
      }

      console.log('Auth successful, showing toast...');
      toast({
        title: mode === 'register' ? 'Account created!' : 'Welcome back!',
        description: 'You have been successfully authenticated.',
      })

      // Trigger custom event to notify UserMenu that login succeeded
      window.dispatchEvent(new CustomEvent('auth-state-changed'))
      
      console.log('Waiting before redirect...');
      // Small delay to ensure cookie is set before redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Redirecting to home...');
      // Force full page reload to ensure cookie is available
      // This is necessary because httpOnly cookies need a full page load
      window.location.href = '/'
    } catch (err) {
      console.error('Auth form error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast({
        title: 'Authentication failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          disabled={isLoading}
          minLength={6}
        />
      </div>

      {mode === 'register' && (
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Role (optional)
          </label>
          <select
            id="role"
            name="role"
            className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
            disabled={isLoading}
          >
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Login'}
      </Button>
    </form>
  )
}


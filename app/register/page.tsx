import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/components/auth-form'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Sign up to start booking events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="register" />
            <div className="mt-4 text-center text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Already have an account? </span>
              <Link href="/login" className="text-[hsl(var(--primary))] hover:underline">
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


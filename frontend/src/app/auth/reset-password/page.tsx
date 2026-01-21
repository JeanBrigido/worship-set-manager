'use client'

import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

import { AuthLayout, PasswordInput, PasswordStrength } from '@/components/auth'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/auth-schemas'

function ResetPasswordForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  })

  const password = form.watch('password')

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
    } else {
      setTokenValid(true)
    }
  }, [token])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.error?.message || result.error || 'Failed to reset password'
        if (typeof errorMessage === 'string' && (errorMessage.includes('expired') || errorMessage.includes('Invalid'))) {
          setTokenValid(false)
        }
        throw new Error(errorMessage)
      }

      setSuccess(true)

      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (tokenValid === false) {
    return (
      <AuthLayout title="Invalid link" description="This password reset link is invalid or expired">
        <div className="space-y-4 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">
            This link may have expired or already been used.
          </p>
          <Button asChild>
            <Link href="/auth/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout title="Password reset!" description="Your password has been updated">
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-muted-foreground">
            Redirecting to sign in...
          </p>
          <Link href="/auth/signin" className="text-primary hover:underline">
            Sign in now
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (tokenValid === null) {
    return (
      <AuthLayout title="Reset password" description="Loading...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password" description="Enter your new password">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <PasswordStrength password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}

function ResetPasswordLoading() {
  return (
    <AuthLayout title="Reset password" description="Loading...">
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

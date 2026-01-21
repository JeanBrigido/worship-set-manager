'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2, CheckCircle } from 'lucide-react'

import { AuthLayout } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/auth-schemas'

export default function ForgotPasswordPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (!response.ok) {
        const result = await response.json()
        const errorMessage = result.error?.message || result.error || 'Failed to send reset email'
        if (typeof errorMessage === 'string' && errorMessage.includes('Too many')) {
          setError('Too many attempts. Please try again later.')
          return
        }
        throw new Error(errorMessage)
      }

      setSuccess(true)

      // Start countdown for resend
      setCountdown(60)
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleResend = () => {
    setSuccess(false)
    form.handleSubmit(onSubmit)()
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" description="We've sent you a password reset link">
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-muted-foreground">
            If an account exists with <strong>{form.getValues('email')}</strong>,
            we've sent a reset link. Check your inbox.
          </p>
          <div className="pt-4 space-y-2">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend available in {countdown}s
              </p>
            ) : (
              <Button variant="outline" onClick={handleResend}>
                Resend email
              </Button>
            )}
            <div>
              <Link href="/auth/signin" className="text-sm text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password?" description="Enter your email and we'll send you a reset link">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
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
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-sm">
        <Link href="/auth/signin" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}

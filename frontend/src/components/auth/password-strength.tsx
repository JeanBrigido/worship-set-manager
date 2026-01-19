'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
}

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  if (!password) {
    return { score: 0, label: '', color: '' }
  }

  let score = 0

  // Length checks
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character type checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) {
    return { score: 1, label: 'Weak', color: 'bg-red-500' }
  } else if (score <= 4) {
    return { score: 2, label: 'Fair', color: 'bg-yellow-500' }
  } else {
    return { score: 3, label: 'Strong', color: 'bg-green-500' }
  }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = getPasswordStrength(password)
  const meetsMinLength = password.length >= 8

  if (!password) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              score >= level ? color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label && `Password strength: ${label}`}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            meetsMinLength ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {meetsMinLength && <Check className="h-3 w-3" />}
          8+ characters
        </span>
      </div>
    </div>
  )
}

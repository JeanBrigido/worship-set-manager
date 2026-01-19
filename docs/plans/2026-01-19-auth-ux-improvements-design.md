# Auth UX Improvements Design

**Date:** 2026-01-19
**Status:** Approved
**Scope:** Sign-in, sign-up, password reset flows + token handling

---

## Overview

Improve the authentication user experience across the Worship Set Manager application. This includes visual consistency, better validation feedback, working password reset, and improved token handling.

## Goals

1. **Visual consistency** - Unified auth pages using shadcn/ui components
2. **Better validation feedback** - Inline validation, real-time feedback
3. **Missing features** - Password visibility toggle, forgot password (working), password strength indicator
4. **Navigation improvements** - Return to previous page after login, session expiration handling

## Technical Decisions

- **UI Components:** shadcn/ui (already in project)
- **Form Handling:** React Hook Form + Zod (already in project)
- **Email Provider:** Resend (test domain initially, production domain later)
- **Token Caching:** In-memory on client side

---

## Component Architecture

### Shared Auth Components

```
frontend/src/components/auth/
├── auth-layout.tsx       # Shared wrapper (logo, card, background)
├── auth-form-field.tsx   # Input with label, error, and validation state
├── password-input.tsx    # Input with visibility toggle
└── password-strength.tsx # Strength indicator bar
```

### Page Structure

```
frontend/src/app/auth/
├── signin/page.tsx          # Rewritten with shared components
├── signup/page.tsx          # Rewritten with shared components
├── forgot-password/page.tsx # New: enter email
└── reset-password/page.tsx  # New: enter new password (with token)
```

### Form Handling Approach

- Use React Hook Form + Zod for declarative validation
- Validate on blur (when user leaves field)
- Show inline errors immediately below each field
- Disable submit button until form is valid
- Show success checkmarks on valid fields

---

## Sign-In Page

### Layout

- Centered card on subtle gradient background
- App logo/name at top (use shadcn Card component)
- Clean, focused form with minimal distractions

### Form Fields

1. **Email**
   - Text input with email validation
   - Validates format on blur
   - Error: "Please enter a valid email address"

2. **Password**
   - Password input with visibility toggle (eye icon)
   - No validation beyond "required" (don't reveal if password is wrong vs user doesn't exist)

### Actions

- Primary "Sign in" button (full width, shadcn Button)
- "Forgot password?" link below password field, right-aligned
- "Don't have an account? Sign up" link at bottom

### Error Handling

- Generic error for auth failure: "Invalid email or password" (security best practice)
- Network error: "Unable to connect. Please try again."
- Rate limited: "Too many attempts. Please wait a few minutes."

### Navigation

- Capture `callbackUrl` from query params (e.g., `/auth/signin?callbackUrl=/services/123`)
- After successful login, redirect to `callbackUrl` or home if none
- "Back to home" link in footer

### Loading State

- Button shows spinner and "Signing in..." text
- All inputs disabled during submission

---

## Sign-Up Page

### Form Fields

1. **Full Name**
   - Text input, required, minimum 2 characters
   - Error: "Name is required"

2. **Email**
   - Text input with email validation
   - Validates format on blur
   - Error: "Please enter a valid email address"

3. **Password**
   - Password input with visibility toggle
   - Minimum 8 characters
   - Real-time password strength indicator below the field:
     - **Weak** (red): < 8 chars or common password
     - **Fair** (yellow): 8+ chars, basic complexity
     - **Strong** (green): 12+ chars with mixed case/numbers/symbols
   - Shows requirements as user types: "8+ characters" with checkmark when met

4. **Confirm Password**
   - Password input with visibility toggle
   - Validates match on blur
   - Error: "Passwords don't match"
   - Shows checkmark when matching

### Actions

- Primary "Create account" button
- "Already have an account? Sign in" link at bottom

### Post-Registration

- Auto sign-in after successful registration (keep current behavior)
- Redirect to `callbackUrl` or home
- If auto sign-in fails, redirect to sign-in page with success message

### Duplicate Email Handling

- Clear error: "An account with this email already exists. Sign in instead?" with link

---

## Password Reset Flow

### Forgot Password Page (`/auth/forgot-password`)

**Form:**
- Single email field
- "Send reset link" button

**Success state:**
- Don't reveal whether email exists (security)
- Always show: "If an account exists with this email, we've sent a reset link. Check your inbox."
- Show "Back to sign in" link
- Allow resending after 60 seconds (with countdown)

**Email sent:**
- From: `onboarding@resend.dev` (Resend test domain initially)
- Subject: "Reset your Worship Set Manager password"
- Contains link: `/auth/reset-password?token=<secure-token>`
- Token expires in 1 hour

### Reset Password Page (`/auth/reset-password`)

**Form:**
- New password field (with visibility toggle + strength indicator)
- Confirm password field
- "Reset password" button

**Token validation:**
- Check token on page load
- Invalid/expired token: Show error with "Request a new reset link" button
- Valid token: Show the form

**Success:**
- "Password updated successfully"
- Auto-redirect to sign-in after 3 seconds, or "Sign in now" link

---

## Backend Changes

### New Database Model

Add `PasswordResetToken` to Prisma schema:

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

### New API Endpoints

**POST `/api/auth/forgot-password`** (public, rate-limited)
- Input: `{ email }`
- Creates token (cryptographically secure, 32 bytes hex)
- Stores hashed token in database (don't store raw token)
- Sends email via Resend
- Always returns success (don't leak user existence)
- Rate limit: 3 requests per hour per email

**POST `/api/auth/reset-password`** (public, rate-limited)
- Input: `{ token, password }`
- Validates token exists and not expired
- Hashes new password with bcrypt
- Updates user password
- Marks token as used
- Returns success/failure
- Rate limit: 5 requests per hour per IP

### Resend Integration

New file `backend/src/services/email.ts`:
- Initialize Resend client with API key
- `sendPasswordResetEmail(to, resetUrl)` function
- Uses Resend test domain initially (`onboarding@resend.dev`)

---

## Token Handling Improvements

### Client-Side Token Caching

Update `jwt-bridge.ts` to:
1. Cache the JWT in memory (not localStorage for security)
2. Store token expiration time
3. Only fetch new token when current one expires (or within 5 min of expiring)
4. Clear cache on sign-out

```typescript
let cachedToken: { token: string; expiresAt: number } | null = null

async function generateBackendJWT() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token  // Reuse valid token
  }
  // Fetch new token...
}
```

### Session Expiration Handling

Update `api-client.ts` to:
1. Detect 401 responses
2. Clear the cached token
3. Redirect to `/auth/signin?callbackUrl=<current-page>&expired=true`
4. Sign-in page shows message: "Your session has expired. Please sign in again."

---

## File Changes Summary

### New Files

```
frontend/src/components/auth/
├── auth-layout.tsx
├── auth-form-field.tsx
├── password-input.tsx
└── password-strength.tsx

frontend/src/app/auth/
├── forgot-password/page.tsx
└── reset-password/page.tsx

backend/src/services/
└── email.ts

backend/src/controllers/
└── authController.ts

backend/src/validation/
└── authSchemas.ts
```

### Modified Files

```
frontend/src/app/auth/signin/page.tsx    # Rewrite with shared components
frontend/src/app/auth/signup/page.tsx    # Rewrite with shared components
frontend/src/lib/jwt-bridge.ts           # Add token caching
frontend/src/lib/api-client.ts           # Add 401 handling + redirect
backend/prisma/schema.prisma             # Add PasswordResetToken model
backend/src/routes/users.ts              # Add password reset routes
backend/package.json                     # Add resend dependency
```

### New Environment Variables

```
RESEND_API_KEY=re_xxxxxxxxxxxx
APP_URL=http://localhost:3000  # For reset link generation
```

---

## Future Considerations (Out of Scope)

- Social login (Google, GitHub OAuth)
- Two-factor authentication (2FA)
- Email verification on sign-up
- "Remember me" functionality
- Session management UI (view/revoke active sessions)

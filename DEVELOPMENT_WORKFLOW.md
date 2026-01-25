# Development Workflow Guide

This guide explains how to develop and deploy changes safely without affecting production.

## Branch Strategy

```
main (production) ◄─────── Only merge when ready to deploy
    │
    └── develop (integration) ◄─── Feature branches merge here first
            │
            ├── feature/add-song-import
            ├── feature/dark-mode
            └── fix/login-bug
```

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | sab-worship.com (Vercel) + Railway prod |
| `develop` | Integration/staging | Vercel preview URLs |
| `feature/*` | New features | Local only |
| `fix/*` | Bug fixes | Local only |

## Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Local** | localhost:3000 | localhost:3001 | Supabase Dev |
| **Preview** | *.vercel.app | Railway (or local) | Supabase Dev |
| **Production** | sab-worship.com | sab-music.up.railway.app | Supabase Prod |

## Quick Start: Making Changes

### 1. Start a new feature

```bash
# Make sure you're on develop and it's up to date
git checkout develop
git pull origin develop

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Make your changes

```bash
# Run the app locally
npm run dev

# Make changes, test locally
```

### 3. Commit and push

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 4. Create a Pull Request

1. Go to GitHub
2. Create PR: `feature/your-feature-name` → `develop`
3. Vercel will create a preview deployment automatically
4. Test on the preview URL
5. Merge when ready

### 5. Deploy to production

1. Create PR: `develop` → `main`
2. Review changes
3. Merge to deploy to production

## Database Setup

### Production Database (Already Set Up)
- Project: Your current Supabase project
- Used by: sab-worship.com

### Development Database (Set Up Below)
- Project: New Supabase project for development
- Used by: Local development and preview deployments

## Setting Up Supabase Development Project

### Step 1: Create a new Supabase project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name it: `worship-set-manager-dev`
4. Choose a strong password (save it!)
5. Select the same region as production
6. Click "Create new project"

### Step 2: Get connection strings

1. Go to Project Settings → Database
2. Copy the "Connection string" (URI format)
3. You'll need two URLs:
   - **Pooler URL** (port 6543): For `DATABASE_URL`
   - **Direct URL** (port 5432): For `DIRECT_URL`

### Step 3: Update your local .env files

**Backend (.env):**
```
DATABASE_URL="postgresql://postgres.[DEV-PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[DEV-PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

**Frontend (.env.local):**
```
DATABASE_URL="postgresql://postgres.[DEV-PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

### Step 4: Push schema to dev database

```bash
cd backend
npx prisma db push
```

### Step 5: Seed with test data (optional)

```bash
npm run db:seed --workspace=backend
```

## Environment Variables Reference

### Development (Local)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase DEV pooler URL |
| `DIRECT_URL` | Supabase DEV direct URL |
| `JWT_SECRET` | Different from production! |
| `ALLOWED_ORIGINS` | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |
| `NEXTAUTH_URL` | `http://localhost:3000` |

### Production (Already configured)

| Variable | Location |
|----------|----------|
| See `DEPLOYMENT_SECRETS.md` | Vercel & Railway dashboards |

## Common Tasks

### Sync develop with main

```bash
git checkout develop
git pull origin main
git push origin develop
```

### Reset dev database

```bash
cd backend
npx prisma db push --force-reset
npm run db:seed
```

### Run migrations

```bash
# Development
cd backend
npx prisma migrate dev --name your_migration_name

# Production (happens automatically on Railway deploy)
npx prisma migrate deploy
```

## Commit Message Convention

Use conventional commits for clear history:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructure
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: add song import from CSV
fix: resolve login timeout issue
docs: update API documentation
```

## Troubleshooting

### Preview deployment not working
- Check Vercel dashboard for build errors
- Ensure environment variables are set in Vercel project settings

### Database schema out of sync
```bash
npx prisma generate  # Regenerate client
npx prisma db push   # Push schema to database
```

### CORS errors in preview
- Add preview URL to `ALLOWED_ORIGINS` in Railway
- Or test with local backend instead

# Railway Backend Deployment Guide

This guide will walk you through deploying the Worship Set Manager backend to Railway.

## Prerequisites

- GitHub account with your repository
- Railway account (sign up at [railway.app](https://railway.app))
- Your code committed and pushed to GitHub

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Login" and sign in with your GitHub account
3. Authorize Railway to access your repositories

### 2. Create New Project

1. Click "New Project" on the Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your `worship-set-manager` repository
4. Railway will detect your configuration automatically

### 3. Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically provision a PostgreSQL database
3. The `DATABASE_URL` environment variable will be automatically set

### 4. Configure Environment Variables

Click on your backend service, then go to "Variables" tab and add:

```env
# Database (automatically set by Railway, but verify it's there)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Server Configuration
NODE_ENV=production
PORT=3001

# JWT Authentication
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRES_IN=7d

# CORS - Add your Vercel frontend URL here
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000

# Optional: Email Configuration (for notifications)
# EMAIL_API_KEY=your-sendgrid-api-key

# Optional: SMS Configuration (for notifications)
# TWILIO_ACCOUNT_SID=your-twilio-sid
# TWILIO_AUTH_TOKEN=your-twilio-token

# Optional: Redis (for job queue - add later if needed)
# REDIS_URL=your-redis-url
```

**To generate a secure JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use an online generator:
# https://www.grc.com/passwords.htm
```

### 5. Configure Build Settings

Railway should auto-detect your configuration from `railway.toml`, but verify:

1. Go to "Settings" tab
2. Check "Build Command":
   ```bash
   cd backend && npm install && npx prisma generate && npm run build
   ```

3. Check "Start Command":
   ```bash
   cd backend && npx prisma migrate deploy && npm start
   ```

4. Set "Root Directory" to `/` (Railway will navigate to backend via commands)

### 6. Deploy

1. Click "Deploy" or push a new commit to trigger deployment
2. Railway will:
   - Install dependencies
   - Generate Prisma client
   - Build TypeScript code
   - Run database migrations
   - Start the server

3. Monitor the deployment logs in real-time

### 7. Verify Deployment

Once deployed, Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)

Test your deployment:

```bash
# Health check
curl https://your-app.up.railway.app/health

# Should return:
# {"status":"ok","message":"Server is running"}
```

### 8. Run Database Seed (Optional)

To populate initial data:

1. Go to your service in Railway
2. Click on "Settings" → "Deploy"
3. In the deployment logs, you can run commands
4. Or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run seed command
railway run npm run db:seed --workspace=backend
```

### 9. Get Your Backend URL

1. In Railway dashboard, go to your backend service
2. Click "Settings" → "Networking"
3. You'll see your public domain (e.g., `worship-backend.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel frontend configuration

### 10. Enable Custom Domain (Optional)

1. Go to "Settings" → "Networking"
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `api.yourchurch.com`)
4. Follow DNS configuration instructions
5. Railway will automatically provision SSL certificate

## Database Management

### Access Database

1. In Railway dashboard, click on your PostgreSQL service
2. Go to "Data" tab to view tables
3. Or use "Connect" to get connection details for external tools

### Run Migrations

Migrations run automatically on deployment, but to run manually:

```bash
railway run npm run db:migrate:deploy --workspace=backend
```

### View Database with Prisma Studio

```bash
# Using Railway CLI
railway run npx prisma studio --workspace=backend

# Then open: http://localhost:5555
```

## Monitoring & Logs

### View Logs

1. Click on your backend service
2. Go to "Deployments" tab
3. Click on active deployment to view logs
4. Use the search and filter options

### Set Up Alerts

1. Go to "Settings" → "Notifications"
2. Add webhooks or email notifications
3. Configure alerts for deployment failures, crashes, etc.

## Troubleshooting

### Common Issues

#### **Build Fails**

```
Error: Cannot find module 'prisma'
```

**Solution:** Ensure `postinstall` script in package.json runs `prisma generate`

#### **Database Connection Error**

```
Error: Can't reach database server
```

**Solution:**
1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL service is running
3. Restart the backend service

#### **Migration Fails**

```
Error: Migration failed to apply
```

**Solution:**
1. Check migration files are committed to Git
2. Reset database (destructive): In PostgreSQL settings → "Reset"
3. Redeploy to run migrations again

#### **CORS Errors from Frontend**

```
Access to fetch blocked by CORS policy
```

**Solution:**
1. Add your Vercel URL to `ALLOWED_ORIGINS`
2. Format: `https://your-app.vercel.app` (no trailing slash)
3. Redeploy backend

### View Environment Variables

```bash
# Using Railway CLI
railway variables

# Or check in Railway dashboard → Service → Variables
```

### Restart Service

1. Go to backend service
2. Click "Settings" → "Service"
3. Click "Restart"

## Cost Estimation

Railway pricing (as of 2024):

- **Hobby Plan**: $5/month usage-based
  - Free trial credit: $5
  - Includes: 500 hours execution time
  - PostgreSQL: Included

- **Pro Plan**: $20/month
  - More resources and priority support

**Estimated monthly cost for this app:**
- Backend service: ~$5-10
- PostgreSQL database: Included
- **Total: ~$5-10/month** (very affordable for small church use)

## Security Best Practices

1. ✅ **Never commit `.env` files** - Already in `.gitignore`
2. ✅ **Use strong JWT secrets** - Generate with `openssl rand -base64 32`
3. ✅ **Limit CORS origins** - Only allow your Vercel domain
4. ✅ **Keep dependencies updated** - Run `npm update` regularly
5. ✅ **Enable Railway's built-in DDoS protection**
6. ✅ **Use environment variables** for all secrets

## Next Steps

Once Railway backend is deployed:

1. ✅ Save your Railway backend URL
2. ➡️ Deploy frontend to Vercel (next guide)
3. ➡️ Configure frontend to use Railway backend URL
4. ➡️ Test end-to-end functionality
5. ➡️ Set up custom domains (optional)
6. ➡️ Configure monitoring and alerts

## Useful Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# View logs
railway logs

# Run commands in Railway environment
railway run <command>

# Open Railway dashboard
railway open
```

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Rollback Deployment

If something goes wrong:

1. Go to "Deployments" tab
2. Find a previous successful deployment
3. Click "..." → "Redeploy"
4. Confirm rollback

---

**Your backend is now live on Railway! 🚀**

Save your backend URL and proceed to Vercel frontend deployment.

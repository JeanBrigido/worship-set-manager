# Security Guidelines

## 🚨 CRITICAL: Never Commit Secrets

**The following should NEVER be committed to version control:**

- ❌ Database passwords
- ❌ API keys
- ❌ JWT secrets
- ❌ OAuth client secrets
- ❌ Private keys
- ❌ `.env` files (except `.env.example`)

## ✅ Proper Secret Management

### Environment Variables

1. **Use `.env` files locally** - already in `.gitignore`
2. **Use `.env.example` for documentation** - safe to commit
3. **Store production secrets in deployment platform:**
   - Railway: Project Settings → Variables
   - Vercel: Project Settings → Environment Variables

### For Testing

1. **Create `.env.test` locally** (not committed)
2. **Copy from `.env.test.example`** (safe template)
3. **Use separate test database** - never use production database for tests

## 🔐 Current Security Measures

### In Place

✅ Strong `.gitignore` rules for all secret files
✅ Helmet.js for HTTP security headers
✅ CORS protection with configurable origins
✅ JWT token-based authentication
✅ Bcrypt password hashing
✅ Input validation with Zod
✅ SQL injection protection via Prisma ORM
✅ Rate limiting on auth endpoints (planned)

### Required Actions

⚠️ **IMMEDIATE:** Rotate your Supabase database password
⚠️ **BEFORE DEPLOYMENT:** Generate new JWT_SECRET
⚠️ **RECOMMENDED:** Enable 2FA on GitHub, Railway, and Vercel accounts

## 🔄 If You've Exposed Secrets

### 1. Rotate Immediately

**Database Password (Supabase):**
1. Go to Supabase Dashboard
2. Settings → Database → Reset Database Password
3. Update `.env` files locally
4. Update Railway environment variables

**JWT Secret:**
```bash
# Generate new secret
openssl rand -base64 32

# Update all .env files
# Update Railway variables
```

**API Keys (SendGrid, Twilio, etc.):**
1. Revoke exposed key in service dashboard
2. Generate new key
3. Update environment variables

### 2. Remove from Git History

```bash
# Install BFG Repo Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove exposed secrets from all commits
bfg --replace-text passwords.txt

# Force push (CAUTION!)
git push --force
```

**Note:** Force pushing rewrites history and affects all collaborators!

### 3. Notify GitHub

If secrets were pushed to GitHub:
1. GitHub will auto-detect some secrets (via GitGuardian)
2. Follow their recommendations
3. Consider making repo private temporarily

## 🛡️ Security Best Practices

### Development

```bash
# ✅ GOOD: Use environment variables
const secret = process.env.JWT_SECRET;

# ❌ BAD: Hardcode secrets
const secret = "my-super-secret-key";
```

### Code Reviews

Before every commit, check:
- [ ] No hardcoded passwords or API keys
- [ ] No `.env` files staged
- [ ] All secrets use environment variables
- [ ] Test files don't contain real credentials

### Testing

```bash
# ✅ GOOD: Use test database
DATABASE_URL="postgresql://localhost:5432/test_db"

# ❌ BAD: Use production database
DATABASE_URL="postgresql://prod.example.com/real_data"
```

## 📋 Pre-Deployment Security Checklist

- [ ] All secrets removed from code
- [ ] `.env.example` files updated (no real values)
- [ ] Production database password rotated
- [ ] New JWT_SECRET generated for production
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled on authentication routes
- [ ] HTTPS enforced in production
- [ ] Helmet.js configured
- [ ] All dependencies updated (`npm audit`)
- [ ] Security headers tested

## 🔍 Regular Security Audits

### Weekly

```bash
# Check for dependency vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix
```

### Monthly

- Review GitHub security alerts
- Update all dependencies
- Rotate API keys
- Review access logs for suspicious activity

### Before Major Releases

- Full security audit
- Penetration testing (if budget allows)
- Code review with security focus

## 🚨 Incident Response

If you suspect a security breach:

1. **Immediately:** Rotate all credentials
2. **Check logs:** Look for unauthorized access
3. **Notify users:** If data compromised (GDPR requirement)
4. **Document:** Record what happened and how you responded
5. **Improve:** Update security measures to prevent recurrence

## 📞 Security Contacts

- **GitHub Security:** https://github.com/security
- **Railway Security:** security@railway.app
- **Vercel Security:** security@vercel.com
- **Report vulnerability:** Create private security advisory on GitHub

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Remember: Security is not a one-time task, it's an ongoing practice!**

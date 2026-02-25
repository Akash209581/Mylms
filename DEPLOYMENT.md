# Deploying LMS to Render

## Prerequisites
- GitHub account
- Render account (free tier available)
- Your Neon PostgreSQL database URL

## Step-by-Step Deployment

### 1. Prepare Your Code

Create a `.gitignore` file (if not exists):
```bash
node_modules/
.next/
.env*.local
.DS_Store
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 2. Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial LMS deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/lms.git
git branch -M main
git push -u origin main
```

### 3. Create Render Web Service

1. Go to https://render.com and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure deployment settings:

**Basic Settings:**
- **Name**: `lms-app` (or any name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (use root)
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment:**
- **Node Version**: 18.x or higher

### 4. Set Environment Variables

In Render dashboard, add these environment variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_4ObjVs9miMuW@ep-shiny-boat-aisyrbuv-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars-recommended

NODE_ENV=production
```

**IMPORTANT**: Generate a new JWT_SECRET for production:
```bash
# Run this locally to generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Run `npm run build`
   - Start your app with `npm start`
3. Wait 3-5 minutes for first deployment

### 6. Access Your Live App

Once deployed, Render provides a URL like:
```
https://lms-app.onrender.com
```

Your LMS is now live! 🎉

## Post-Deployment

### Verify Everything Works

1. **Test Login**: Try logging in with existing accounts
2. **Test Database**: Check if dashboard data loads
3. **Test API Routes**: Verify all API endpoints work
4. **Check Console**: Open browser DevTools, check for errors

### Custom Domain (Optional)

1. In Render dashboard, go to **Settings**
2. Scroll to **Custom Domain**
3. Add your domain (e.g., `lms.yourdomain.com`)
4. Update DNS records as instructed by Render

### Monitor Your App

Render provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory usage
- **Events**: Deployment history

## Troubleshooting

### Build Fails

**Check build logs for errors:**
- Missing dependencies? → Update `package.json`
- TypeScript errors? → Run `npm run build` locally first

### App Crashes After Deploy

**Common issues:**
1. Environment variables not set correctly
2. Database connection fails (check DATABASE_URL)
3. Port binding issues (Next.js handles this automatically)

### Database Connection Issues

**Verify:**
```bash
# Test database connection locally
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(res => console.log('Connected:', res.rows[0])).catch(err => console.error('Error:', err));"
```

## Scaling (When Needed)

### Free Tier Limitations:
- App sleeps after 15 min of inactivity
- 750 hours/month free

### Upgrade to Paid ($7/month):
- No sleep
- Better performance
- More memory/CPU

## Continuous Deployment

Every time you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Render automatically:
1. Detects the push
2. Rebuilds your app
3. Deploys new version
4. Zero downtime deployment! 🚀

## Security Checklist

Before going to production:

- [ ] Change JWT_SECRET to secure random string
- [ ] Enable SSL (Render provides free SSL)
- [ ] Update CORS settings if needed
- [ ] Review database connection pooling
- [ ] Enable Neon connection pooling (already done)
- [ ] Set up monitoring/alerts
- [ ] Create database backups strategy

## Cost Estimate

**Render Pricing:**
- Free Tier: $0/month (with limitations)
- Starter: $7/month (recommended)
- Standard: $25/month (production apps)

**Neon Pricing:**
- Free Tier: $0/month (0.5 GB storage, 3 GB bandwidth)
- Pro: $19/month (if you need more)

**Total Monthly Cost:** $7-$26 depending on tier

## Support

If deployment fails, check:
1. Render deployment logs
2. Next.js build output
3. Database connectivity
4. Environment variables

---

**Your LMS is production-ready with this single deployment! 🎓**

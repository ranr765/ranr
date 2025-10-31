# 🚀 Deployment Guide for Schweizer Deutsch Coach

## Quick Deployment Steps

### 1️⃣ Create Production D1 Database

```bash
cd /home/user/webapp
source /home/user/.bashrc
npx wrangler d1 create webapp-production
```

This will output something like:
```
✅ Successfully created DB 'webapp-production'!
database_id = "abc123xyz-your-actual-id-here"
```

### 2️⃣ Update wrangler.jsonc

Copy the `database_id` from above and update the file:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "schweizer-deutsch-coach",
  "compatibility_date": "2025-10-31",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "PUT-YOUR-ACTUAL-DATABASE-ID-HERE"
    }
  ]
}
```

### 3️⃣ Apply Migrations to Production

```bash
npx wrangler d1 migrations apply webapp-production
```

This will create all tables and seed the content in production.

### 4️⃣ Create Cloudflare Pages Project

```bash
npx wrangler pages project create schweizer-deutsch-coach \
  --production-branch main \
  --compatibility-date 2025-10-31
```

### 5️⃣ Build and Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name schweizer-deutsch-coach
```

### 6️⃣ Get Your Public URL

After deployment, you'll see:
```
✨ Deployment complete!
🌎 Deployed to: https://schweizer-deutsch-coach.pages.dev
```

Share this URL with anyone! 🎉

---

## Alternative: Deploy Without D1 (Simpler but no data persistence)

If you want to skip the D1 database setup temporarily:

1. **Remove D1 binding from wrangler.jsonc**
2. **Comment out database calls in src/index.tsx**
3. **Use in-memory storage** (data resets on deploy)

This is only recommended for quick demos, not production use.

---

## Option 3: Deploy to Other Platforms

### Deploy to Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify (Alternative)

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod
```

**Note**: For Vercel/Netlify, you'll need to adapt the code to use their database solutions instead of D1.

---

## Current Status

✅ **Cloudflare Authentication**: Configured  
⚠️ **API Token Permissions**: Need to add D1 + Pages permissions  
⚠️ **Production Database**: Not yet created  
⚠️ **Deployment**: Pending permission updates  

---

## Once Deployed, Your App Will Have:

- **Permanent URL**: `https://schweizer-deutsch-coach.pages.dev`
- **Custom domain**: Optional (e.g., `learn-german.com`)
- **Global CDN**: Fast loading worldwide
- **Auto SSL**: HTTPS enabled by default
- **Zero downtime**: Instant deployments

---

## Need Help?

If you encounter issues:

1. **Check API token permissions** at https://dash.cloudflare.com/profile/api-tokens
2. **Verify account access** with `npx wrangler whoami`
3. **Check logs** in `.wrangler/logs/`
4. **Contact Cloudflare support** if permissions issues persist

---

## Sharing Your App

Once deployed, you can share:

✅ **Public URL**: Give to anyone  
✅ **QR Code**: Generate for mobile access  
✅ **Embed**: Use iframe on other sites  
✅ **Custom domain**: Point your own domain  

**Share freely - no login required for users!**

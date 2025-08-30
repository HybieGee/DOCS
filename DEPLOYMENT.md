# Droplets of Creation - Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **GitHub Account**: Code should be pushed to your GitHub repository
3. **Node.js**: Version 18+ installed locally
4. **Wrangler CLI**: Install with `npm install -g wrangler`

## Step 1: Set up Cloudflare Resources

### D1 Database
```bash
# Create D1 database
wrangler d1 create droplets-db

# Note the database ID from output and update wrangler.toml
# Run migration
wrangler d1 migrations apply droplets-db --local  # Test locally first
wrangler d1 migrations apply droplets-db          # Apply to production
```

### KV Namespace
```bash
# Create KV namespace for caching
wrangler kv:namespace create "CACHE"

# Note the namespace ID and update wrangler.toml
```

### R2 Bucket (Optional)
```bash
# Create R2 bucket for media storage
wrangler r2 bucket create droplets-media
```

## Step 2: Configure Environment Variables

### Update wrangler.toml
```toml
name = "droplets-api"
main = "workers/api/index.ts"
compatibility_date = "2024-08-30"
node_compat = true

[[d1_databases]]
binding = "DB"
database_name = "droplets-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"  # Replace with your ID

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_ACTUAL_KV_ID"  # Replace with your ID

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "droplets-media"

[[durable_objects.bindings]]
name = "WORLD"
class_name = "WorldRoom"

[vars]
JWT_SECRET = "your-super-secret-jwt-key-at-least-32-chars-long"
TURNSTILE_SECRET_KEY = "your-turnstile-secret-key"
ENVIRONMENT = "production"
```

### Set up Turnstile (Optional but recommended)
1. Go to Cloudflare Dashboard > Turnstile
2. Create a new site
3. Add your domain
4. Get Site Key and Secret Key
5. Add Site Key to `.env.local` and Secret Key to wrangler.toml

## Step 3: Deploy Worker

```bash
# Deploy the Worker
wrangler deploy

# Test the deployment
curl https://your-worker.your-subdomain.workers.dev/health
```

## Step 4: Set up Cloudflare Pages

### Option A: Via Dashboard
1. Go to Cloudflare Dashboard > Pages
2. Connect to Git and select your repository
3. Set build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/` (leave empty)

### Option B: Via CLI
```bash
npm run build
wrangler pages deploy .next --project-name droplets-of-creation
```

### Environment Variables for Pages
Add these in Pages Dashboard > Settings > Environment Variables:

**Production:**
```
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

**Preview (optional):**
```
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

## Step 5: Configure Custom Domain (Optional)

### For the Frontend (Pages)
1. Pages Dashboard > Custom domains > Set up a custom domain
2. Add your domain (e.g., `dropletsofcreation.com`)
3. Update DNS records as instructed

### For the API (Worker)
1. Workers Dashboard > your-worker > Triggers > Custom Domains
2. Add subdomain (e.g., `api.dropletsofcreation.com`)
3. Update `NEXT_PUBLIC_API_URL` in Pages environment variables

## Step 6: Initialize Database

After deployment, you can initialize some test data:

```bash
# Connect to your D1 database
wrangler d1 execute droplets-db --command "INSERT INTO world_state (id) VALUES (1) ON CONFLICT DO NOTHING;"
```

## Step 7: Test the Application

1. Visit your Pages URL or custom domain
2. Connect a Solana wallet (Phantom recommended)
3. Create an account
4. Mint a test character
5. Try watering characters
6. Check the leaderboard

## Monitoring and Maintenance

### View Logs
```bash
# Worker logs
wrangler tail

# Pages deployment logs
# Available in Cloudflare Dashboard > Pages > your-project > Deployments
```

### Database Management
```bash
# Query database
wrangler d1 execute droplets-db --command "SELECT COUNT(*) FROM characters;"

# Backup database (export to file)
wrangler d1 export droplets-db --output backup.sql
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check that your Pages domain is added to the allowed origins in `workers/api/index.ts`

2. **Database Errors**: Ensure migrations have been applied and database ID is correct

3. **WebSocket Connection Failed**: Check that Durable Objects are properly configured

4. **Authentication Issues**: Verify JWT_SECRET is set and consistent

### Debug Commands

```bash
# Test Worker locally
wrangler dev

# Test Pages locally
npm run dev

# Check D1 database
wrangler d1 info droplets-db
```

## Security Considerations

1. **Secrets Management**: Never commit secrets to Git. Use Cloudflare's secret management.
2. **Rate Limiting**: Consider adding rate limiting for minting and other actions
3. **Input Validation**: All user inputs are validated, but review regularly
4. **Wallet Verification**: Signature verification prevents wallet spoofing

## Performance Optimization

1. **Caching**: KV is used for caching leaderboards and world state
2. **Database Indexes**: All necessary indexes are created in migrations
3. **Real-time**: Durable Objects provide efficient WebSocket handling
4. **CDN**: Cloudflare's global CDN serves the frontend

## Support

For issues or questions:
1. Check the application logs
2. Review this deployment guide
3. Create an issue on GitHub

---

**Estimated Deployment Time**: 30-45 minutes  
**Estimated Monthly Cost**: $5-15 USD (depends on usage)
# 🚀 Droplets of Creation - Deployment Guide

## ✅ Completed Steps
- [x] Created Cloudflare Pages deployment
- [x] Set up Wrangler CLI
- [x] Created D1 Database
- [x] Created KV Namespace  
- [x] Created R2 Bucket

## 📝 Next Steps

### 1. Update wrangler.toml with your IDs

Open `wrangler.toml` and replace:
- `YOUR_D1_DATABASE_ID_HERE` with your actual D1 Database ID
- `YOUR_KV_NAMESPACE_ID_HERE` with your actual KV Namespace ID

### 2. Run Database Migrations

Open a terminal in the project directory and run:

```bash
# This creates all the tables in your D1 database
npx wrangler d1 execute droplets-db --file=./migrations/0001_initial_schema.sql
```

### 3. Deploy the API to Cloudflare Workers

```bash
# This deploys your API
npx wrangler deploy
```

After deployment, you'll get a URL like:
`https://droplets-api.YOUR-SUBDOMAIN.workers.dev`

**SAVE THIS URL!** You'll need it for the next step.

### 4. Update Frontend Configuration

1. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=https://droplets-api.YOUR-SUBDOMAIN.workers.dev
```

2. Or update `lib/config/api.ts` with your Worker URL

### 5. Rebuild and Deploy Frontend

Push your changes to trigger a new build:
```bash
git add .
git commit -m "Update API configuration"
git push
```

## 🎮 Testing Your Deployment

Once both frontend and backend are deployed:

1. Visit your Cloudflare Pages URL
2. Try creating an account
3. Mint a character
4. Test the features!

## 🛠️ Troubleshooting

### If migrations fail:
- Make sure the D1 database ID is correct in wrangler.toml
- Check that you're logged in with `wrangler login`

### If Worker deployment fails:
- Verify all IDs in wrangler.toml are correct
- Make sure you have the required permissions in Cloudflare

### If the frontend can't connect to the API:
- Check that CORS is enabled (it is in our code)
- Verify the API URL is correct in your environment variables
- Check browser console for specific errors

## 📞 Need Help?

If you run into issues:
1. Check the error messages carefully
2. Verify all IDs and URLs are correct
3. Make sure both frontend and backend are deployed
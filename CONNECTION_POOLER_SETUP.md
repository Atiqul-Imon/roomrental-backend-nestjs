# Supabase Connection Pooler Setup Guide

This guide will walk you through setting up the Connection Pooler to fix IPv4 connectivity issues.

## Step-by-Step Instructions

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Click on your project: **"imonatikulislam@gmail.com's Project"** (or whatever you named it)

### Step 2: Navigate to Database Settings

1. In the left sidebar, look for **"Settings"** (gear icon ⚙️ at the bottom)
2. Click on **"Settings"**
3. In the settings menu, click on **"Database"**

### Step 3: Find Connection Pooling Section

1. Scroll down on the Database Settings page
2. Look for a section titled **"Connection pooling"** or **"Connection Pooler"**
3. You should see information about:
   - Pool Size
   - Max Client Connections
   - Connection strings for different modes

### Step 4: Get the Connection Pooler URL

1. In the Connection Pooling section, you'll see different connection modes:
   - **Session mode** (recommended for most applications)
   - **Transaction mode** (for transaction pooling)
   - **Statement mode** (for statement pooling)

2. **Select "Session mode"** (this is the recommended option)

3. You'll see a connection string that looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   Example:
   ```
   postgresql://postgres.jxppxyjkkwseipgsrnfu:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

4. **Click the copy icon** (📋) next to the connection string, OR manually copy it

### Step 5: Update Your .env File

1. Open your `.env` file in the `backend-nestjs` directory

2. Find the line that says:
   ```env
   DATABASE_URL=postgresql://postgres:DySxzcz9psUD_U6@db.jxppxyjkkwseipgsrnfu.supabase.co:5432/postgres?schema=public
   ```

3. Replace it with your Connection Pooler URL, making sure to:
   - Replace `[YOUR-PASSWORD]` with your actual password: `DySxzcz9psUD_U6`
   - Add `?schema=public` at the end

4. Your new `DATABASE_URL` should look like:
   ```env
   DATABASE_URL=postgresql://postgres.jxppxyjkkwseipgsrnfu:DySxzcz9psUD_U6@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
   ```

   **Key differences from direct connection:**
   - Uses `postgres.[PROJECT-REF]` instead of just `postgres`
   - Uses port `6543` instead of `5432`
   - Uses `pooler.supabase.com` domain instead of `db.xxxxx.supabase.co`

### Step 6: Save the .env File

1. Save the `.env` file
2. Make sure there are no extra spaces or line breaks in the connection string

### Step 7: Test the Connection

Run the Prisma migration to test the connection:

```bash
cd backend-nestjs
npm run prisma:migrate
```

If successful, you should see:
- Prisma connecting to the database
- Migration files being created
- Database tables being created

## Troubleshooting

### If you can't find Connection Pooling section:

1. Make sure you're in **Settings → Database** (not API settings)
2. Scroll down - it might be below other sections
3. Some projects might have it under "Connection string" → "Connection pooling" tab

### If the connection still fails:

1. **Verify the password is correct** - Make sure `DySxzcz9psUD_U6` is the correct password
2. **Check the URL format** - Ensure there are no extra spaces
3. **Verify the region** - Make sure the region in the URL matches your project's region
4. **Try Transaction mode** - If Session mode doesn't work, try Transaction mode

### Connection String Format Reference

**Direct Connection (current - not working):**
```
postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public
```

**Connection Pooler (what you need):**
```
postgresql://postgres.xxxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?schema=public
```

## What's Different About Connection Pooler?

1. **Port**: Uses `6543` instead of `5432`
2. **Domain**: Uses `pooler.supabase.com` instead of `db.xxxxx.supabase.co`
3. **User**: Uses `postgres.[PROJECT-REF]` format
4. **IPv4 Compatible**: Works with IPv4 networks (fixes your current issue)
5. **Better Performance**: Handles connection pooling automatically
6. **Production Ready**: Recommended for production applications

## Next Steps After Connection Works

Once the connection is working:

1. ✅ Run migrations: `npm run prisma:migrate`
2. ✅ Generate Prisma client: `npm run prisma:generate` (if needed)
3. ✅ Start your backend: `npm run dev`
4. ✅ Test your API endpoints

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/database/connecting-to-postgres
- Prisma Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate


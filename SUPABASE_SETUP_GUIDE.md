# Supabase Setup Guide - Step by Step

This guide will walk you through registering with Supabase and getting your database connection string for the RoomRental NestJS backend.

## Step 1: Create a Supabase Account

1. **Go to Supabase Website**
   - Open your browser and navigate to: https://supabase.com
   - Click the **"Start your project"** or **"Sign Up"** button (usually in the top right)

2. **Sign Up Options**
   - You can sign up using:
     - GitHub account (recommended for developers)
     - Google account
     - Email address
   - Choose your preferred method and complete the sign-up process

3. **Verify Your Email** (if using email sign-up)
   - Check your inbox for a verification email
   - Click the verification link to activate your account

## Step 2: Create a New Project

1. **Access Dashboard**
   - After signing in, you'll be taken to your Supabase dashboard
   - If you're new, you'll see an empty projects list

2. **Create New Project**
   - Click the **"New Project"** button (usually green, top right or center)
   - You'll see a form to create your project

3. **Fill Project Details**
   - **Organization**: Select or create an organization (you can use your personal org)
   - **Name**: Enter a project name (e.g., `roomrental-backend` or `roomrental-dev`)
   - **Database Password**: 
     - **IMPORTANT**: Create a strong password and **SAVE IT SECURELY**
     - You'll need this password for the connection string
     - Supabase will show you the password once - make sure to copy it!
   - **Region**: Choose the region closest to you or your users
     - Examples: `US East (North Virginia)`, `EU West (Ireland)`, `Asia Pacific (Singapore)`
   - **Pricing Plan**: Select **Free** (for development) or **Pro** (for production)

4. **Create Project**
   - Click **"Create new project"**
   - Wait 2-3 minutes for Supabase to provision your database

## Step 3: Get Your Database Connection String

1. **Navigate to Project Settings**
   - Once your project is ready, click on your project name in the dashboard
   - In the left sidebar, click on **"Settings"** (gear icon at the bottom)
   - Then click on **"Database"** in the settings menu

2. **Find Connection String**
   - Scroll down to the **"Connection string"** section
   - You'll see different connection string formats:
     - **URI** (recommended for Prisma)
     - **JDBC**
     - **Node.js**
     - **Python**

3. **Copy the Connection String**
   - **For Prisma/NestJS, use the URI format**
   - Click the **"URI"** tab
   - You'll see a connection string that looks like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
     ```
   - **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 2
   - Click the **copy icon** (📋) next to the connection string
   - Or manually copy the string and replace `[YOUR-PASSWORD]` with your actual password

4. **Alternative: Use Connection Pooling (Recommended for Production)**
   - In the same Database settings page, scroll to **"Connection pooling"**
   - Use the **"Session"** or **"Transaction"** mode connection string
   - This is better for production as it handles connection pooling automatically
   - Format: `postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

## Step 4: Format Your Connection String

Your final connection string should look like this:

```
postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public
```

**Key Components:**
- `postgresql://` - Protocol
- `postgres` - Database user (default)
- `YOUR_ACTUAL_PASSWORD` - The password you created in Step 2
- `db.xxxxx.supabase.co` - Your Supabase database host
- `5432` - PostgreSQL port
- `postgres` - Database name (default)
- `?schema=public` - Schema parameter (important for Prisma)

## Step 5: Add Connection String to Your Project

### Option A: Using the Setup Script (Recommended)

1. Navigate to your backend directory:
   ```bash
   cd backend-nestjs
   ```

2. Run the setup script:
   ```bash
   bash setup-env.sh
   ```

3. When prompted:
   - Choose option **1** (Supabase)
   - Paste your connection string when asked
   - The script will create/update your `.env` file

### Option B: Manual Setup

1. Create or edit `.env` file in `backend-nestjs` directory:
   ```bash
   cd backend-nestjs
   nano .env
   # or
   code .env
   ```

2. Add your connection string:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public
   ```

3. Make sure to include other required variables (see `.env.example` if available)

## Step 6: Verify Connection

1. **Test the Connection**
   ```bash
   cd backend-nestjs
   npm run prisma:generate
   npm run prisma:migrate
   ```

2. **If connection fails**, check:
   - Password is correct (no extra spaces)
   - Connection string format is correct
   - Your IP is allowed (Supabase allows all IPs by default on free tier)
   - Database is fully provisioned (wait a few more minutes if just created)

## Step 7: Additional Supabase Information

### API Keys (Optional - for Supabase Client SDK)

If you need to use Supabase client SDK in the future:

1. Go to **Settings** → **API**
2. You'll find:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: For client-side usage
   - **service_role key**: For server-side usage (keep secret!)

### Database Management

- **SQL Editor**: Use the SQL Editor in Supabase dashboard to run queries
- **Table Editor**: Visual interface to manage your tables
- **Database**: View tables, relationships, and data

## Troubleshooting

### Connection Refused
- Check if your database password is correct
- Verify the host URL is correct
- Ensure the database is fully provisioned (wait 2-3 minutes after creation)

### Authentication Failed
- Double-check your password (case-sensitive)
- Make sure you replaced `[YOUR-PASSWORD]` in the connection string
- Try resetting your database password in Supabase settings

### SSL/TLS Errors
- Add `?sslmode=require` to your connection string:
  ```
  postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public&sslmode=require
  ```

### Connection Pooling Issues
- Use the connection pooling URL instead of direct connection
- Found in Settings → Database → Connection pooling

## Security Best Practices

1. **Never commit `.env` file to Git**
   - Already in `.gitignore` (should be)
   - Use environment variables in production

2. **Use Connection Pooling for Production**
   - Better performance
   - Handles many concurrent connections

3. **Rotate Passwords Regularly**
   - Change database password in Supabase settings
   - Update `.env` file accordingly

4. **Use Different Projects for Dev/Prod**
   - Create separate Supabase projects
   - Use different connection strings

## Next Steps

After setting up your connection string:

1. ✅ Run Prisma migrations: `npm run prisma:migrate`
2. ✅ Generate Prisma client: `npm run prisma:generate`
3. ✅ Start your development server: `npm run dev`
4. ✅ Verify database connection in your application logs

## Quick Reference

**Supabase Dashboard**: https://supabase.com/dashboard

**Connection String Location**: 
- Settings → Database → Connection string → URI tab

**Connection Pooling Location**:
- Settings → Database → Connection pooling

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Prisma Docs: https://www.prisma.io/docs


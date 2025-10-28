# Prisma Migration Fix Guide

## Problem

The tables (`public.verification`, `public.collection`, etc.) don't exist in the database, causing the application to fail at runtime.

## Root Causes Fixed

1. **Improved entrypoint.sh**: Added better error handling, debugging output, and verification steps
2. **Fixed Dockerfile.prod**: Removed duplicate prisma schema copy that was potentially causing issues
3. **Added migration verification**: The entrypoint now shows migration status before starting the app

## Steps to Fix on Your Server

### Option 1: Rebuild and Redeploy (Recommended)

1. **Rebuild the Docker image** (the GitHub Actions workflow will do this automatically on push):

   ```bash
   # The workflow will build the new image with the fixed Dockerfile
   git add .
   git commit -m "Fix Prisma migration issues"
   git push
   ```

2. **On your server, pull the new image**:

   ```bash
   cd ~/cwx/file-transfer
   docker compose pull
   docker compose down
   docker compose up -d
   ```

3. **Check the logs**:

   ```bash
   docker compose logs -f
   ```

   You should now see detailed output about the migration process.

### Option 2: Manual Database Migration (Quick Fix)

If you need a quick fix without rebuilding:

1. **Run migrations manually in the container**:

   ```bash
   docker compose exec file-transfer sh -c "npx prisma migrate deploy"
   ```

2. **If that fails, check the database connection**:

   ```bash
   docker compose exec file-transfer sh -c "npx prisma migrate status"
   ```

3. **Restart the container**:
   ```bash
   docker compose restart file-transfer
   ```

### Option 3: Reset Database (If Nothing Else Works)

⚠️ **WARNING**: This will delete all data!

```bash
# Stop the container
docker compose down

# Connect to your database and drop the schema
# (adjust connection details as needed)
psql -U your_user -d your_database -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Start the container again (migrations will run on fresh database)
docker compose up -d
```

## Debugging Tools

### Check Current Migration Status

Run the debug script inside the container:

```bash
docker compose exec file-transfer sh /app/debug-migrations.sh
```

### Check Environment Variables

```bash
docker compose exec file-transfer env | grep DATABASE_URL
```

### View Detailed Logs

```bash
docker compose logs file-transfer --tail=100 -f
```

### Check What Migrations Exist

```bash
docker compose exec file-transfer ls -la /app/prisma/migrations/
```

## Common Issues

### Issue: "DATABASE_URL is not set"

- Check your docker-compose.yml or .env file
- Ensure the DATABASE_URL environment variable is properly configured

### Issue: "Cannot connect to database"

- Verify the database is running
- Check database credentials
- Ensure the database host is reachable from the container

### Issue: "Migration failed"

- Check if another application is holding locks on the database
- Verify database user has CREATE/ALTER permissions
- Check database logs for more details

## Expected Successful Output

After the fix, you should see logs like this:

```
=== File Transfer App Startup ===
Working directory: /app
Node version: v20.x.x
Checking Prisma files...
✓ Prisma directory exists
Running database migrations...
Available migrations:
  20251008110556_init
  20251008110626_init
  ...
Prisma Migrate applied migrations:
  All migrations have been applied successfully
Database migrations completed successfully!
Starting application...
▲ Next.js 15.5.4
✓ Ready in 1338ms
```

## Need More Help?

If you're still having issues:

1. Share the complete output of:

   ```bash
   docker compose logs file-transfer --tail=200
   ```

2. Share your DATABASE_URL format (masked):

   ```bash
   docker compose exec file-transfer sh -c 'echo $DATABASE_URL | sed "s/:\/\/[^:]*:[^@]*@/:\/\/***:***@/"'
   ```

3. Check if tables exist in the database:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

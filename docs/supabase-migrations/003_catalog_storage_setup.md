# Catalog Storage Setup for Supabase

This guide helps you set up Supabase Storage for the Catalog app so that uploaded images are saved to Supabase and accessible via public URLs.

## Prerequisites

1. Supabase project created
2. Migration scripts run:
   - `001_create_tables.sql` (creates orgs table)
   - `002_catalog_tables.sql` (creates products, lookbooks, store_settings tables)

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Create a bucket named: `product-images`
5. Set it as **Public** (so images are accessible via public URLs)
6. Click **"Create bucket"**

## Step 2: Configure Bucket Policies (Required if using ANON_KEY)

**If you're using `SUPABASE_SERVICE_ROLE_KEY` (recommended):**
- You can skip this step - the service role key bypasses RLS policies
- Just make sure the bucket is set to **Public** so images are accessible via public URLs

**If you're using `SUPABASE_ANON_KEY` (not recommended for backend):**
You'll need to configure bucket policies:

```sql
-- Allow public read access to product-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

Or use the Supabase Dashboard:
1. Go to **Storage** → **Policies**
2. Select `product-images` bucket
3. Add policies for upload/read as needed

## Step 3: Verify Environment Variables

Make sure your root `.env` file has:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** Use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_ANON_KEY`) for backend operations. The service role key bypasses RLS policies, which is required for file uploads and database operations from your backend server.

You can find your service role key in:
- Supabase Dashboard → **Settings** → **API** → **service_role** key (keep this secret!)

If you don't have a service role key, you can also use `SUPABASE_ANON_KEY`, but you'll need to configure bucket policies to allow uploads (see Step 2).

## Step 4: Test Upload

Upload an image via the test page:
```
http://localhost:4023/upload-test.html
```

The image should:
- Upload to Supabase Storage bucket `product-images`
- Be accessible via a public URL
- Work with OpenAI Vision API for analysis

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket `product-images` exists in Supabase
- Check that it's set to Public
- The system will automatically fall back to local storage if bucket doesn't exist

### "new row violates row-level security policy" error
- **Use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY`** in your `.env` file
- The service role key bypasses RLS policies, which is required for backend file uploads
- If you must use anon key, configure bucket policies (see Step 2)

### "Table not found" error
- Run the migration scripts: `001_create_tables.sql` and `002_catalog_tables.sql`
- The system will automatically fall back to local storage if tables don't exist

### Images not accessible
- Ensure the bucket is set to **Public**
- Check bucket policies allow public read access
- Verify the URL format matches: `https://[project].supabase.co/storage/v1/object/public/product-images/...`

## Local Storage Fallback

If Supabase is not configured or tables/buckets don't exist, the system automatically falls back to:
- **Files**: Saved to `.sb/uploads/` directory
- **Products**: Saved to `.sb/data/products.json`

To force local storage, add to `.env`:
```env
STORAGE_MODE=local
```


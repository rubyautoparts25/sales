# 🗄️ New Supabase Database Setup Guide

## Step 1: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: "Ruby Auto Parts - Batch"
5. Set a strong database password
6. Choose a region close to you
7. Click "Create new project"

## Step 2: Get Database Credentials
1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 3: Run Database Setup
1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy and paste the entire contents of `complete_database_setup.sql`
4. Click "Run" button
5. Wait for all tables to be created successfully

## Step 4: Update Application Configuration
1. Open `src/supabaseClient.js`
2. Replace the URL and key with your new database credentials:

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'YOUR_NEW_PROJECT_URL_HERE',
  'YOUR_NEW_ANON_KEY_HERE'
);
```

## Step 5: Test the Application
1. Open `inventory.html` in your browser
2. Try adding a new product with batch information
3. Verify that:
   - Batch ID is auto-generated
   - Arrival time is auto-filled
   - Product appears in inventory table with batch info
   - Batch record is created in database

## ✅ What's Included
- **Complete database schema** with all existing tables
- **Batch functionality** with 4 minimal columns
- **Sample data** for testing
- **All indexes and constraints** for performance
- **Row Level Security** enabled
- **Automatic triggers** for quantity calculations

## 🎯 Batch Features
- **8-character batch IDs** (auto-generated)
- **Vendor tracking** (name and invoice)
- **Arrival timestamp** (date and time)
- **Product linking** to batches
- **Inventory display** with batch information

Your new database is ready to use with full batch functionality! 🚀


# Supabase Integration for Ruby Auto Parts

## Overview
This document explains how to connect your Ruby Auto Parts inventory management system to Supabase using the new normalized database structure.

## Setup Steps

### 1. Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `ruby-auto-parts-v2`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your location
5. Click "Create new project"

### 2. Run Database Setup
1. In your new Supabase project, go to **SQL Editor**
2. Copy the entire contents of `supabase_new_database.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the script

### 3. Get Your Project Credentials
1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### 4. Update Configuration
1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your actual credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

3. Update `supabase.config.js` if needed:
   ```javascript
   export const supabaseConfig = {
     url: 'https://your-project-id.supabase.co',
     anonKey: 'your-actual-anon-key-here',
     // ... rest of config
   };
   ```

### 5. Test the Connection
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your application in the browser
3. Try adding a product to test the database connection

## Database Structure

### Tables
- **products** - Main product catalog
- **batches** - Vendor delivery batches  
- **inventory** - Product-batch relationships with quantities
- **sales** - Sales transactions
- **bills** - Customer bills
- **suppliers** - Supplier information

### Views
- **inventory_summary** - Aggregated inventory data
- **active_inventory** - Products with active stock
- **onhold_inventory** - Products with on-hold stock
- **batch_details** - Batch information with products

### Functions
- **activate_inventory()** - Move stock from on-hold to active
- **sell_inventory()** - Process sales and reduce stock
- **get_next_barcode_sequence()** - Generate unique sequences

## Key Features

### Random Barcode Generation
- 8-character random barcodes
- Collision detection
- Database uniqueness constraints

### Batch Management
- Proper vendor tracking
- Invoice number tracking
- Multiple products per batch

### Inventory Tracking
- Separate on-hold and active quantities
- FIFO processing
- Expiry date tracking

## File Structure

```
src/
├── database.js          # Database service functions
├── main.js             # Main application logic
├── supabase.config.js  # Supabase configuration
└── ...

supabase_new_database.sql  # Complete database setup
env.example               # Environment variables template
```

## Usage Examples

### Adding a Product
```javascript
import { createProduct, addInventory, createBatch } from './src/database.js';

// Create batch first
const batch = await createBatch('Vendor Name', 'INV-001');

// Create product
const product = await createProduct({
  part_name: 'Brake Pad',
  variant: 'Front',
  brand: 'Bosch',
  class: 'Brake',
  price: 1500,
  shelf_code: 'A1'
}, 'BRK001FP');

// Add to inventory
await addInventory(product.id, batch.id, 10);
```

### Loading Inventory
```javascript
import { loadInventory } from './src/database.js';

// Load all inventory with aggregated quantities
const inventory = await loadInventory();
console.log(inventory);
```

### Activating Stock
```javascript
import { activateInventory } from './src/database.js';

// Move 5 units from on-hold to active
await activateInventory(productId, 5);
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check your Supabase URL and API key
   - Verify the project is active
   - Check network connectivity

2. **Permission Errors**
   - Ensure RLS policies are configured correctly
   - Check if you're using the right API key
   - Verify table permissions

3. **Data Not Loading**
   - Check if tables exist in your database
   - Verify the SQL setup script ran successfully
   - Check browser console for errors

### Debug Mode
Enable debug logging by adding this to your browser console:
```javascript
localStorage.setItem('supabase.debug', 'true');
```

## Security Considerations

### API Keys
- **Anon Key**: Safe for client-side use (public)
- **Service Role Key**: Keep secret, server-side only
- Never commit API keys to version control

### Row Level Security
The setup includes commented RLS policies. To enable:
1. Uncomment RLS sections in the SQL script
2. Run the script again
3. Configure authentication as needed

## Production Deployment

### Environment Variables
Set these in your production environment:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Backups
- Supabase provides automated daily backups
- Configure backup retention in project settings
- Test restore procedures

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Community**: https://github.com/supabase/supabase/discussions
- **Discord**: https://discord.supabase.com

## Next Steps

1. **Test all functionality** with sample data
2. **Implement error handling** for database operations
3. **Add user authentication** if needed
4. **Set up monitoring** and alerts
5. **Plan data migration** from old system

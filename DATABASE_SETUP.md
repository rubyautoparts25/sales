# Ruby Auto Parts - New Database Setup

## Overview
This document provides instructions for setting up a fresh Supabase database with the new normalized structure for the Ruby Auto Parts inventory management system.

## Database Structure

### Tables
1. **products** - Main product catalog
2. **batches** - Vendor delivery batches
3. **inventory** - Junction table linking products to batches with quantities
4. **sales** - Sales transactions
5. **bills** - Customer bills
6. **suppliers** - Supplier information

### Views
1. **inventory_summary** - Aggregated inventory data
2. **active_inventory** - Products with active stock
3. **onhold_inventory** - Products with on-hold stock
4. **batch_details** - Batch information with product details

### Functions
1. **activate_inventory()** - Move stock from on-hold to active
2. **sell_inventory()** - Process sales and reduce active stock
3. **get_next_barcode_sequence()** - Generate unique barcode sequences

## Setup Instructions

### 1. Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `ruby-auto-parts-new`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your location)
5. Click "Create new project"

### 2. Run Database Setup Script
1. In your new Supabase project, go to the SQL Editor
2. Copy the entire contents of `supabase_new_database.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the script

### 3. Update Application Configuration
1. Go to Settings > API in your Supabase project
2. Copy the following values:
   - Project URL
   - Anon public key
3. Update your application files with the new credentials

### 4. Test the Setup
The script includes sample data:
- 1 sample batch
- 3 sample products (Brake Pad, Oil Filter, Air Filter)
- Sample inventory entries

## Key Features

### Random Barcode Generation
- 8-character random barcodes
- Collision detection
- Database uniqueness constraints

### Batch Management
- Proper vendor tracking
- Invoice number tracking
- Date/time stamps
- Multiple products per batch

### Inventory Tracking
- Separate on-hold and active quantities
- FIFO (First In, First Out) processing
- Expiry date tracking
- Low stock detection

### Sales Processing
- Automatic stock reduction
- Price tracking at time of sale
- Bill association
- Transaction history

## Migration from Old System

If you have existing data in the old system:

1. **Export existing data** from the old database
2. **Create mapping** between old and new structures
3. **Run custom migration script** (not included in this setup)
4. **Verify data integrity** after migration

## Security Considerations

### Row Level Security (RLS)
The setup script includes commented RLS policies. To enable:

1. Uncomment the RLS sections in the SQL script
2. Run the script again
3. Configure authentication as needed

### API Keys
- Use environment variables for API keys
- Never commit API keys to version control
- Rotate keys regularly

## Performance Optimization

### Indexes
The setup includes optimized indexes for:
- Barcode lookups
- Product searches
- Batch queries
- Inventory aggregations

### Views
Pre-computed views for common queries:
- Inventory summaries
- Active/on-hold stock
- Batch details

## Backup and Recovery

### Automated Backups
Supabase provides automated daily backups. Configure:
1. Go to Settings > Database
2. Set backup retention period
3. Configure point-in-time recovery if needed

### Manual Backups
```sql
-- Export specific tables
COPY products TO '/path/to/backup/products.csv' WITH CSV HEADER;
COPY batches TO '/path/to/backup/batches.csv' WITH CSV HEADER;
COPY inventory TO '/path/to/backup/inventory.csv' WITH CSV HEADER;
```

## Monitoring and Maintenance

### Database Monitoring
- Monitor query performance
- Check index usage
- Review slow queries
- Monitor storage usage

### Regular Maintenance
- Update statistics
- Vacuum tables
- Check for unused indexes
- Monitor connection limits

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Check RLS policies
   - Verify user roles
   - Check API key permissions

2. **Performance Issues**
   - Check query execution plans
   - Verify indexes are being used
   - Consider query optimization

3. **Data Integrity**
   - Check foreign key constraints
   - Verify unique constraints
   - Monitor for duplicate data

### Support
- Supabase Documentation: https://supabase.com/docs
- Community Forum: https://github.com/supabase/supabase/discussions
- Discord: https://discord.supabase.com

## Next Steps

After setting up the database:

1. **Update application code** to use new table structure
2. **Test all functionality** with sample data
3. **Implement error handling** for database operations
4. **Add logging** for audit trails
5. **Set up monitoring** and alerts
6. **Train users** on new features
7. **Plan data migration** from old system (if applicable)

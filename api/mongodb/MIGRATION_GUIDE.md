# Migration Guide: Supabase to MongoDB

## Prerequisites

1. **MongoDB Installation**
   ```bash
   # Install MongoDB locally
   # Windows: Download from https://www.mongodb.com/try/download/community
   # macOS: brew install mongodb-community
   # Linux: sudo apt install mongodb
   
   # Start MongoDB service
   mongod --dbpath ./mongodb-data
   ```

2. **Install Dependencies**
   ```bash
   npm install mongodb mongoose @supabase/supabase-js
   ```

3. **Get Supabase Credentials**
   - Go to your Supabase project dashboard
   - Get your project URL (Settings > API)
   - Get your service role key (Settings > API > service_role key)
   - **IMPORTANT**: Use service_role key, not anon key, for full database access

## Migration Steps

### 1. Configure Migration Script

Edit `api/mongodb/migrate.js` and replace:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY';
```

With your actual Supabase credentials.

### 2. Run Migration

```bash
node api/mongodb/migrate.js
```

### 3. Verify Migration

```bash
# Connect to MongoDB
mongo

# Check databases
show dbs

# Use legal-glide database
use legal-glide

# Check collections
show collections

# Count documents
db.clients.countDocuments()
db.profiles.countDocuments()
db.invoices.countDocuments()
# ... check other collections
```

## Post-Migration Steps

### 1. Update Environment Variables

Create a new `.env.local` file for MongoDB configuration:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/legal-glide

# Disable Supabase (optional)
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
```

### 2. Update Frontend Code

Replace Supabase client with MongoDB API calls in your React components.

### 3. Create API Endpoints

You'll need to create Express.js API endpoints to replace Supabase functionality.

## Data Mapping

### Key Changes from SQL to MongoDB

1. **UUID to ObjectId**: All UUID fields are converted to MongoDB ObjectIds
2. **Foreign Keys**: References are stored as ObjectId references
3. **Arrays**: PostgreSQL arrays become MongoDB arrays
4. **JSONB**: PostgreSQL JSONB becomes MongoDB Mixed types
5. **Timestamps**: Automatic createdAt/updatedAt fields

### Collection Structure

- `clients` - Client information and visa applications
- `profiles` - User profiles and roles
- `invoices` - Invoice generation and management
- `transactions` - Financial transactions
- `appointments` - Client appointments
- `applications` - Visa application tracking
- `employees` - Employee management
- `client_activity_logs` - Activity tracking

## Rollback Plan

If you need to rollback:

1. Keep your Supabase project active during transition
2. Export MongoDB data before making changes
3. Test thoroughly before switching production

## Troubleshooting

### Common Issues

1. **Connection Errors**: Ensure MongoDB is running on localhost:27017
2. **Permission Errors**: Use service_role key, not anon key for Supabase
3. **Memory Issues**: For large datasets, consider batch processing
4. **UUID Conversion**: The script uses MD5 hashing for consistent ObjectId generation

### Performance Tips

1. **Indexing**: All important fields are indexed in the models
2. **Batch Processing**: Data is inserted in batches for better performance
3. **Connection Pooling**: Mongoose handles connection pooling automatically

## Next Steps

After successful migration:

1. Update your frontend to use MongoDB API endpoints
2. Implement authentication (replace Supabase Auth)
3. Set up file storage (replace Supabase Storage)
4. Configure backups for MongoDB
5. Monitor performance and optimize queries
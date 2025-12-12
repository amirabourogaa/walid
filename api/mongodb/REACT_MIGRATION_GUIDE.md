# React App Migration Guide: Supabase to MongoDB

## Step 1: Install Additional Dependencies

```bash
npm install axios
```

## Step 2: Update Environment Variables

Update your `.env` file:

```env
# MongoDB API
REACT_APP_MONGODB_API_URL=http://localhost:3001/api

# Disable Supabase (optional)
# REACT_APP_SUPABASE_URL=
# REACT_APP_SUPABASE_ANON_KEY=
```

## Step 3: Replace Supabase Imports

### Before (Supabase):
```typescript
import { supabase } from '@/integrations/supabase/client';
```

### After (MongoDB):
```typescript
import mongoDBService from '@/integrations/mongodb/mongodbService';
```

## Step 4: Update API Calls

### Clients Page Example

#### Before:
```typescript
const { data: clients, error } = await supabase
  .from('clients')
  .select('*')
  .order('created_at', { ascending: false });
```

#### After:
```typescript
const { data: clients, error } = await mongoDBService.getClients({
  page: 1,
  limit: 50
});
```

### Create Client Example

#### Before:
```typescript
const { data, error } = await supabase
  .from('clients')
  .insert([clientData])
  .select()
  .single();
```

#### After:
```typescript
const data = await mongoDBService.createClient(clientData);
```

### Update Client Example

#### Before:
```typescript
const { data, error } = await supabase
  .from('clients')
  .update(clientData)
  .eq('id', clientId)
  .select()
  .single();
```

#### After:
```typescript
const data = await mongoDBService.updateClient(clientId, clientData);
```

### Delete Client Example

#### Before:
```typescript
const { error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId);
```

#### After:
```typescript
await mongoDBService.deleteClient(clientId);
```

## Step 5: Update Authentication

### Before:
```typescript
const { data: { user }, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

### After:
```typescript
const { user, token } = await mongoDBService.signIn(email, password);
```

## Step 6: Update Real-time Subscriptions

### Before:
```typescript
const subscription = supabase
  .channel('clients-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'clients' },
    handleClientsChange
  )
  .subscribe();
```

### After:
```typescript
// MongoDB doesn't have built-in real-time like Supabase
// You'll need to implement polling or WebSocket connection
const subscription = mongoDBService.subscribe('clients', handleClientsChange);
```

## Step 7: Update File Uploads

### Before:
```typescript
const { data, error } = await supabase.storage
  .from('client-files')
  .upload(filePath, file);
```

### After:
```typescript
const { data } = await mongoDBService.uploadFile(file, 'client-files', filePath);
```

## Step 8: Common Patterns Update

### Fetch with Filters

#### Before:
```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('status', 'جديد')
  .order('created_at', { ascending: false });
```

#### After:
```typescript
const { data } = await mongoDBService.getClients({ 
  status: 'جديد',
  sortBy: 'created_at',
  sortOrder: 'desc'
});
```

### Pagination

#### Before:
```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .range((page - 1) * pageSize, page * pageSize - 1)
  .order('created_at', { ascending: false });
```

#### After:
```typescript
const { data, total } = await mongoDBService.getClients({
  page,
  limit: pageSize
});
```

## Step 9: Update Error Handling

### Before:
```typescript
const { data, error } = await supabase.from('clients').select('*');
if (error) {
  console.error('Error:', error.message);
  return;
}
// Use data
```

### After:
```typescript
try {
  const data = await mongoDBService.getClients();
  // Use data
} catch (error) {
  console.error('Error:', error.message);
}
```

## Step 10: Testing Checklist

- [ ] Client CRUD operations
- [ ] Invoice generation
- [ ] Transaction management
- [ ] Appointment scheduling
- [ ] Application tracking
- [ ] Authentication flow
- [ ] File uploads
- [ ] Statistics/dashboard
- [ ] Search and filtering
- [ ] Pagination

## Migration Helper Script

You can create a helper script to automate some of the replacements:

```bash
# Create a script to help with migration
#!/bin/bash

# Replace Supabase imports
grep -rl "import.*supabase" src/ | xargs sed -i 's|@/integrations/supabase/client|@/integrations/mongodb/mongodbService|g'

# Replace supabase calls (basic patterns)
grep -rl "supabase\.from" src/ | xargs sed -i 's/supabase\.from/mongoDBService/g'
```

## Important Notes

1. **Real-time**: MongoDB doesn't have built-in real-time like Supabase. You'll need to implement polling or WebSocket connections.

2. **Authentication**: The MongoDB service includes a simplified auth. You'll need to implement proper JWT-based authentication for production.

3. **File Storage**: File upload is simplified. Consider using services like AWS S3, Cloudinary, or implement proper local file storage.

4. **Transactions**: MongoDB supports transactions, but the API is different from Supabase.

5. **RLS (Row Level Security)**: MongoDB doesn't have RLS. Implement access control in your API layer.

## Need Help?

1. Check the MongoDB API server logs
2. Verify your MongoDB connection
3. Test API endpoints manually with curl or Postman
4. Check browser console for frontend errors
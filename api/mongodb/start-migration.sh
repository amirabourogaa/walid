#!/bin/bash

# Legal Glide MongoDB Migration Startup Script

echo "🚀 Starting Legal Glide MongoDB Migration Setup..."

# Check if MongoDB is running
echo "🔍 Checking MongoDB status..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first:"
    echo "   mongod --dbpath ./mongodb-data"
    exit 1
fi

echo "✅ MongoDB is running"

# Install dependencies for MongoDB API server
echo "📦 Installing MongoDB API server dependencies..."
cd api/mongodb
npm install
cd ../..

# Start MongoDB API server
echo "🌐 Starting MongoDB API server..."
cd api/mongodb
npm run dev &
API_PID=$!
cd ../..

echo "⏳ Waiting for API server to start..."
sleep 5

# Test API connection
echo "🔌 Testing API connection..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ MongoDB API server is running"
else
    echo "❌ MongoDB API server failed to start"
    kill $API_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Setup complete! MongoDB API server is running on port 3001"
echo ""
echo "📋 Next steps:"
echo "1. Configure your Supabase credentials in api/mongodb/migrate.js"
echo "2. Run migration: node api/mongodb/migrate.js"
echo "3. Update your React app to use MongoDB service"
echo "4. Check the migration guides in api/mongodb/"
echo ""
echo "📝 API Documentation:"
echo "   - Clients: GET/POST/PUT/DELETE /api/clients"
echo "   - Invoices: GET/POST /api/invoices"
echo "   - Transactions: GET/POST /api/transactions"
echo "   - Appointments: GET/POST /api/appointments"
echo "   - Applications: GET/POST /api/applications"
echo "   - Statistics: GET /api/statistics"
echo ""
echo "To stop the API server, run: kill $API_PID"
echo "API Server PID: $API_PID"
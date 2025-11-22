#!/bin/bash

# Start script for Job Research System UI
# This runs both the HTTP API server and the React UI

echo "🚀 Starting AI Job Research System..."
echo ""

# Check if we're in the right directory
if [ ! -d "job-research-mcp" ] || [ ! -d "job-research-ui" ]; then
    echo "❌ Error: Please run this script from the job-research-system directory"
    exit 1
fi

# Build MCP server if needed
echo "📦 Building MCP server..."
cd job-research-mcp
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build MCP server"
    exit 1
fi

# Start HTTP API server in background
echo "🌐 Starting HTTP API server on port 3001..."
npm run start:express &
API_PID=$!
echo "   PID: $API_PID"

# Wait for API to be ready
echo "⏳ Waiting for API server to start..."
sleep 3

# Check if API is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ API server failed to start"
    kill $API_PID 2>/dev/null
    exit 1
fi
echo "✅ API server running at http://localhost:3001"

# Start UI dev server
echo ""
echo "🎨 Starting UI dev server..."
cd ../job-research-ui
npm run dev &
UI_PID=$!

echo ""
echo "✨ ============================================"
echo "   AI Job Research System is running!"
echo "============================================"
echo ""
echo "📊 UI:  http://localhost:5173"
echo "🔧 API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C to kill both processes
trap "echo ''; echo '🛑 Shutting down...'; kill $API_PID $UI_PID 2>/dev/null; exit" INT TERM

# Wait for both processes
wait

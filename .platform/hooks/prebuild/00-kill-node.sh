#!/bin/bash
echo "🛠 Forcing any old node processes on port 8080 to stop..."

# Kill any process using port 8080
fuser -k 8080/tcp || echo "✅ No process running on port 8080."

# Alternatively, find PID manually and kill it if still running
PID=$(lsof -t -i:8080)

if [ -n "$PID" ]; then
  echo "🔪 Killing process ID $PID using port 8080..."
  kill -9 $PID
else
  echo "✅ No process running on port 8080."
fi

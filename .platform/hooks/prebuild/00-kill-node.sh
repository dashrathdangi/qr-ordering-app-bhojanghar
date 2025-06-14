#!/bin/bash
echo "🛠 Forcing any old node processes on port 8080 to stop..."
PID=$(lsof -t -i:8080)

if [ -n "$PID" ]; then
  echo "🔪 Killing process ID $PID using port 8080..."
  kill -9 $PID
else
  echo "✅ No process running on port 8080."
fi

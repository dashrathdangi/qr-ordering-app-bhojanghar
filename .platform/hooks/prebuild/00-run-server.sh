#!/bin/bash
echo "🛠 Killing old node process on port 8080 (if any)..."
fuser -k 8080/tcp || true

echo "📝 Setting Node.js start command in Procfile"
echo 'web: node server.js' > Procfile

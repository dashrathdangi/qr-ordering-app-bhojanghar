#!/bin/bash
echo "🛠 Killing old node process on port 8080 (if any)..."
fuser -k 8080/tcp || true


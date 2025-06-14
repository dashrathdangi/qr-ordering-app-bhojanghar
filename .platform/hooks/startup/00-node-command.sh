#!/bin/bash
echo "🚀 Starting server.js on port 8080..."
node server.js > /var/log/node-server.log 2>&1 &

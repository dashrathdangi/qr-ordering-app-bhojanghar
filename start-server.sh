#!/bin/bash
source .env
pm2 start server.js --name server

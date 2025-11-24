
## Quick Start Commands with PM2 for Digital Ocean

### 1. Install PM2
```bash
npm install -g pm2
```

### 2. Start Your App Directly
```bash
# Method 1: Direct start
pm2 start server/index.js --name "grants-gateway"

# Method 2: Using npm script
pm2 start npm --name "grants-gateway" -- run dev

# Method 3: With environment variables
pm2 start server/index.js --name "grants-gateway" --env production --watch
```

### 3. Create Ecosystem File (Optional but Recommended)
```bash
# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: "grants-gateway",
    script: "server/index.js",
    instances: 1,
    env: {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/grants_gateway"
    },
    watch: true,
    max_memory_restart: "500M"
  }]
}
EOF

# Start with ecosystem file
pm2 start ecosystem.config.js
```

### 4. Essential PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Monitor in real-time
pm2 monit

# Restart app
pm2 restart grants-gateway

# Stop app
pm2 stop grants-gateway

# Delete app
pm2 delete grants-gateway
```

### 5. Setup Auto-Start on Reboot
```bash
# Save current PM2 processes
pm2 save

# Generate startup script (run the command it gives you)
pm2 startup

# Example output might be:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u yourusername --hp /home/yourusername
```

## Quick One-Liner Setup
```bash
# Install PM2 and start your app
npm install -g pm2 && pm2 start server/index.js --name "grants-gateway" --watch && pm2 save && pm2 startup
```

## Verify It's Working
```bash
# Check if app is running
pm2 list

# Check logs for errors
pm2 logs grants-gateway --lines 50

# Test your API endpoint
curl http://localhost:3000/health
```

## Most Common Workflow:
```bash
# 1. Start the app
pm2 start server/index.js --name "grants-gateway"

# 2. Check it's running
pm2 status

# 3. Save and setup auto-start
pm2 save
pm2 startup  # Run the command it outputs

# 4. Monitor
pm2 monit
```

That's it! Your app should now be running managed by PM2 and will automatically restart if it crashes or when the server reboots.

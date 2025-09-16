# Deploying OpenGrants Gateway API to Render

This guide walks you through deploying the OpenGrants Gateway API to Render, a modern cloud platform that makes deployment simple and scalable.

## 🚀 Quick Deployment

### Prerequisites
- GitHub repository with your code
- Render account (free tier available)
- PostgreSQL database (Render provides this)

### Step 1: Prepare Your Repository

1. **Ensure your code is pushed to GitHub**:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

2. **Verify required files exist**:
- ✅ `package.json` with build scripts
- ✅ `Dockerfile` (optional, we'll use Node.js buildpack)
- ✅ Environment variables documented

### Step 2: Create PostgreSQL Database on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"PostgreSQL"**
3. **Configure database**:
   - **Name**: `grants-gateway-db`
   - **Database**: `grants_gateway`
   - **User**: `grants_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free tier for testing, paid for production
4. **Click "Create Database"**
5. **Copy the connection details** (you'll need these)

### Step 3: Deploy the Web Service

1. **Click "New +"** → **"Web Service"**
2. **Connect your GitHub repository**
3. **Configure the service**:

#### Basic Settings
- **Name**: `grants-gateway-api`
- **Region**: Same as your database
- **Branch**: `main`
- **Root Directory**: Leave empty (unless in subdirectory)
- **Runtime**: `Node`

#### Build & Deploy Settings
- **Build Command**: `pnpm install && pnpm run build`
- **Start Command**: `pnpm start`

#### Advanced Settings
- **Plan**: Free tier for testing, Starter+ for production
- **Node Version**: `18` (or latest LTS)

### Step 4: Configure Environment Variables

In the Render dashboard, go to your web service → **Environment** tab and add:

#### Required Variables
```bash
# Database (copy from your PostgreSQL service)
DATABASE_URL=postgresql://grants_user:password@dpg-xxx.oregon-postgres.render.com/grants_gateway

# Node Environment
NODE_ENV=production
PORT=10000

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-for-production

# Frontend URL (your Render app URL)
FRONTEND_URL=https://your-app-name.onrender.com
```

#### Optional Variables
```bash
# API Keys for enhanced features
COINGECKO_API_KEY=your-coingecko-api-key
KARMA_API_KEY=your-karma-api-key

# Performance Settings
DEFAULT_RATE_LIMIT=1000
CACHE_TTL_MINUTES=15
BACKGROUND_REFRESH_INTERVAL_HOURS=6

# Feature Flags
ENABLE_HISTORICAL_PRICES=true
ENABLE_DATA_VALIDATION=true
ENABLE_CORS_PROXY=true
```

### Step 5: Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** (5-10 minutes)
3. **Check logs** for any errors
4. **Test your deployment** at `https://your-app-name.onrender.com`

## 🔧 Advanced Configuration

### Custom Dockerfile (Optional)

If you need more control, create a `Dockerfile`:

```dockerfile
# Use Node.js LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose port
EXPOSE 10000

# Start the application
CMD ["pnpm", "start"]
```

### Build Script Optimization

Update your `package.json` for better Render compatibility:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "render-build": "pnpm install && pnpm run db:push && pnpm run build",
    "render-start": "pnpm start"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### Database Migration on Deploy

Create a `render.yaml` for automated deployments:

```yaml
services:
  - type: web
    name: grants-gateway-api
    env: node
    plan: starter
    buildCommand: pnpm install && pnpm run db:push && pnpm run build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: grants-gateway-db
          property: connectionString
```

## 🌐 Custom Domain (Optional)

1. **Go to your web service** → **Settings** → **Custom Domains**
2. **Add your domain**: `api.yourdomain.com`
3. **Configure DNS** with your domain provider:
   - Type: `CNAME`
   - Name: `api`
   - Value: `your-app-name.onrender.com`
4. **Wait for SSL certificate** (automatic)

## 📊 Monitoring & Scaling

### Health Checks
Render automatically monitors your app using:
- **Health Check Path**: `/api/health`
- **Expected Status**: `200`

### Scaling Options
- **Free Tier**: Sleeps after 15 minutes of inactivity
- **Starter Plan**: Always on, auto-scaling
- **Pro Plan**: Advanced scaling options

### Logs & Debugging
- **View logs**: Dashboard → Your Service → Logs
- **Real-time logs**: Use Render CLI
```bash
npm install -g @render/cli
render logs -f your-service-id
```

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit secrets to Git
- ✅ Use Render's environment variable encryption
- ✅ Rotate secrets regularly

### Database Security
- ✅ Use connection pooling
- ✅ Enable SSL (automatic on Render)
- ✅ Regular backups (automatic on paid plans)

### API Security
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ Input validation

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check Node.js version
"engines": {
  "node": ">=18.0.0"
}

# Ensure pnpm is available
RUN npm install -g pnpm
```

#### Database Connection Issues
```bash
# Verify DATABASE_URL format
postgresql://user:password@host:port/database

# Check database status in Render dashboard
# Ensure database and web service are in same region
```

#### Memory Issues
```bash
# Increase memory limit in package.json
"scripts": {
  "start": "NODE_OPTIONS='--max-old-space-size=1024' node dist/index.js"
}
```

#### Port Issues
```bash
# Render uses PORT environment variable
const port = process.env.PORT || 5000;
```

### Performance Optimization

#### Enable Compression
```javascript
// In your Express app
import compression from 'compression';
app.use(compression());
```

#### Database Connection Pooling
```javascript
// Already configured in db.ts
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## 📈 Production Checklist

### Before Deployment
- [ ] Environment variables configured
- [ ] Database schema pushed
- [ ] Build process tested locally
- [ ] Health check endpoint working
- [ ] CORS configured for production domain

### After Deployment
- [ ] Test all API endpoints
- [ ] Verify dashboard loads correctly
- [ ] Check database connectivity
- [ ] Monitor logs for errors
- [ ] Test data accuracy endpoints

### Ongoing Maintenance
- [ ] Monitor performance metrics
- [ ] Regular database backups
- [ ] Update dependencies
- [ ] Monitor API rate limits
- [ ] Review security logs

## 🆘 Support

### Render Support
- **Documentation**: https://render.com/docs
- **Community**: https://community.render.com
- **Status**: https://status.render.com

### Application Support
- **Health Check**: `https://your-app.onrender.com/api/health`
- **API Docs**: `https://your-app.onrender.com/endpoints`
- **Dashboard**: `https://your-app.onrender.com/dashboard`

---

**Your OpenGrants Gateway API will be live at**: `https://your-app-name.onrender.com/dashboard`

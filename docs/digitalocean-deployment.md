# Deploying OpenGrants Gateway API to DigitalOcean

This guide covers multiple ways to deploy your OpenGrants Gateway API on DigitalOcean, from simple App Platform deployment to advanced Kubernetes setups.

## 🚀 Option 1: DigitalOcean App Platform (Recommended)

### Quick Deploy (5 minutes)

The easiest way to deploy with automatic scaling and managed infrastructure.

#### Step 1: Prepare Your Repository

1. **Push to GitHub**:
```bash
git add .
git commit -m "Deploy to DigitalOcean"
git push origin main
```

2. **Ensure required files exist**:
- ✅ `package.json` with correct scripts
- ✅ `.env.example` for reference
- ✅ `app.yaml` (we'll create this)

#### Step 2: Create App Spec File

Create `app.yaml` in your project root:

```yaml
name: grants-gateway-api
services:
- name: api
  source_dir: /
  github:
    repo: your-username/your-repo-name
    branch: main
    deploy_on_push: true
  run_command: pnpm start
  build_command: pnpm install && pnpm run db:push && pnpm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8080
  health_check:
    http_path: /api/health
  env:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
  - key: SESSION_SECRET
    value: your-secure-random-session-secret-32-chars
  - key: DEFAULT_RATE_LIMIT
    value: "1000"
  - key: CACHE_TTL_MINUTES
    value: "15"
  - key: ENABLE_HISTORICAL_PRICES
    value: "true"
  - key: ENABLE_DATA_VALIDATION
    value: "true"
  - key: ENABLE_CORS_PROXY
    value: "true"

databases:
- name: grants-db
  engine: PG
  version: "14"
  size: db-s-1vcpu-1gb
  num_nodes: 1
```

#### Step 3: Deploy via DigitalOcean Console

1. **Go to DigitalOcean Console**: https://cloud.digitalocean.com/apps
2. **Click "Create App"**
3. **Choose "GitHub"** as source
4. **Select your repository** and branch
5. **Configure app**:
   - **App name**: `grants-gateway-api`
   - **Region**: Choose closest to your users
   - **Plan**: Basic ($5/month) or Pro ($12/month)

#### Step 4: Add Database

1. **In the app creation flow**, click **"Add Database"**
2. **Choose PostgreSQL**:
   - **Name**: `grants-db`
   - **Version**: 14
   - **Size**: Basic ($15/month)
3. **DigitalOcean will automatically set `DATABASE_URL`**

#### Step 5: Configure Environment Variables

Add these in the **Environment Variables** section:

```bash
# Required
NODE_ENV=production
SESSION_SECRET=generate-a-secure-32-character-random-string
PORT=8080

# Optional API Keys
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

#### Step 6: Deploy

1. **Review configuration**
2. **Click "Create Resources"**
3. **Wait 5-10 minutes** for deployment
4. **Test your app** at the provided URL

### App Platform Features

- ✅ **Auto-scaling**: Handles traffic automatically
- ✅ **SSL certificates**: Free automatic HTTPS
- ✅ **CI/CD**: Auto-deploy on git push
- ✅ **Managed database**: Automatic backups
- ✅ **Health monitoring**: Built-in health checks
- ✅ **Custom domains**: Easy domain setup

## 🐳 Option 2: DigitalOcean Droplets with Docker

### For more control and cost optimization

#### Step 1: Create a Droplet

1. **Go to DigitalOcean Console** → **Droplets** → **Create**
2. **Choose image**: Ubuntu 22.04 LTS
3. **Choose plan**: 
   - **Basic**: $6/month (1GB RAM, 1 vCPU)
   - **Regular**: $12/month (2GB RAM, 1 vCPU) - Recommended
4. **Add SSH key** for secure access
5. **Choose datacenter** closest to your users
6. **Create Droplet**

#### Step 2: Set Up the Server

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Node.js and pnpm (for local development)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pnpm

# Create app directory
mkdir -p /opt/grants-gateway
cd /opt/grants-gateway
```

#### Step 3: Create Docker Compose Setup

Create `/opt/grants-gateway/docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:8080"
      - "443:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - DATABASE_URL=postgresql://grants_user:${DB_PASSWORD}@db:5432/grants_gateway
      - SESSION_SECRET=${SESSION_SECRET}
      - COINGECKO_API_KEY=${COINGECKO_API_KEY}
      - DEFAULT_RATE_LIMIT=1000
      - CACHE_TTL_MINUTES=15
      - ENABLE_HISTORICAL_PRICES=true
      - ENABLE_DATA_VALIDATION=true
      - ENABLE_CORS_PROXY=true
    depends_on:
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=grants_gateway
      - POSTGRES_USER=grants_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U grants_user -d grants_gateway"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Step 4: Create Environment File

Create `/opt/grants-gateway/.env`:

```bash
# Generate secure passwords
DB_PASSWORD=your-secure-database-password-here
SESSION_SECRET=your-secure-32-character-session-secret

# Optional API keys
COINGECKO_API_KEY=your-coingecko-api-key
KARMA_API_KEY=your-karma-api-key
```

#### Step 5: Deploy Your Code

```bash
# Clone your repository
git clone https://github.com/your-username/your-repo-name.git .

# Build and start services
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f app
```

#### Step 6: Set Up SSL (Optional)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🎛️ Option 3: DigitalOcean Kubernetes (Advanced)

### For high availability and enterprise needs

#### Step 1: Create Kubernetes Cluster

1. **Go to DigitalOcean Console** → **Kubernetes**
2. **Create cluster**:
   - **Name**: `grants-gateway-cluster`
   - **Region**: Choose your region
   - **Version**: Latest stable
   - **Node pool**: 2 nodes, 2GB RAM each

#### Step 2: Install kubectl and doctl

```bash
# Install doctl (DigitalOcean CLI)
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init

# Get kubeconfig
doctl kubernetes cluster kubeconfig save grants-gateway-cluster

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

#### Step 3: Create Kubernetes Manifests

Create `k8s/` directory with these files:

**`k8s/namespace.yaml`**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: grants-gateway
```

**`k8s/configmap.yaml`**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: grants-gateway
data:
  NODE_ENV: "production"
  PORT: "8080"
  DEFAULT_RATE_LIMIT: "1000"
  CACHE_TTL_MINUTES: "15"
  ENABLE_HISTORICAL_PRICES: "true"
  ENABLE_DATA_VALIDATION: "true"
  ENABLE_CORS_PROXY: "true"
```

**`k8s/secret.yaml`**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: grants-gateway
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/grants_gateway"
  SESSION_SECRET: "your-secure-session-secret"
  COINGECKO_API_KEY: "your-api-key"
```

**`k8s/deployment.yaml`**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grants-gateway-api
  namespace: grants-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grants-gateway-api
  template:
    metadata:
      labels:
        app: grants-gateway-api
    spec:
      containers:
      - name: api
        image: your-registry/grants-gateway-api:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**`k8s/service.yaml`**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: grants-gateway-service
  namespace: grants-gateway
spec:
  selector:
    app: grants-gateway-api
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

#### Step 4: Deploy to Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n grants-gateway
kubectl get services -n grants-gateway

# Get external IP
kubectl get service grants-gateway-service -n grants-gateway
```

## 💰 Cost Comparison

| Option | Monthly Cost | Best For |
|--------|-------------|----------|
| **App Platform** | $20-50 | Simple deployment, managed infrastructure |
| **Droplet + Docker** | $12-24 | Cost optimization, more control |
| **Kubernetes** | $40-100 | High availability, enterprise scale |

## 🔧 Management & Monitoring

### App Platform
- **Logs**: DigitalOcean Console → Your App → Runtime Logs
- **Metrics**: Built-in CPU, memory, request metrics
- **Scaling**: Automatic or manual scaling options

### Droplet
```bash
# View logs
docker-compose logs -f app

# Monitor resources
docker stats

# Update application
git pull
docker-compose up -d --build
```

### Kubernetes
```bash
# View logs
kubectl logs -f deployment/grants-gateway-api -n grants-gateway

# Monitor resources
kubectl top pods -n grants-gateway

# Scale application
kubectl scale deployment grants-gateway-api --replicas=3 -n grants-gateway
```

## 🚨 Troubleshooting

### Common Issues

**App Platform build fails**:
- Check Node.js version in `package.json`
- Verify build command includes `pnpm install`
- Check environment variables are set

**Database connection issues**:
- Verify `DATABASE_URL` format
- Check database is in same region
- Ensure database is running

**SSL certificate issues**:
- Verify domain DNS points to your server
- Check firewall allows ports 80 and 443
- Restart nginx after certificate installation

## 📚 Additional Resources

- **DigitalOcean App Platform Docs**: https://docs.digitalocean.com/products/app-platform/
- **DigitalOcean Kubernetes Docs**: https://docs.digitalocean.com/products/kubernetes/
- **Docker Compose Reference**: https://docs.docker.com/compose/
- **Kubernetes Documentation**: https://kubernetes.io/docs/

---

**🎉 Your OpenGrants Gateway API is now running on DigitalOcean with production-grade infrastructure!**

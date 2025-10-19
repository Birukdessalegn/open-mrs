# Deployment Guide - OpenMRS Pro

This guide covers deploying the OpenMRS Pro healthcare management system to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Vercel Deployment](#vercel-deployment)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [SSL Configuration](#ssl-configuration)
- [Monitoring](#monitoring)
- [Backup Strategy](#backup-strategy)
- [Security Checklist](#security-checklist)

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Domain name (for production)
- SSL certificate (recommended)

## Environment Setup

### 1. Create Production Environment File

Create a `.env.production` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_NAME=OpenMRS Pro
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_CLINIC_NAME=Your Clinic Name
NEXT_PUBLIC_CLINIC_ADDRESS=Your Clinic Address
NEXT_PUBLIC_CLINIC_PHONE=+1234567890
NEXT_PUBLIC_CLINIC_EMAIL=info@yourclinic.com

# Security
NEXTAUTH_SECRET=your-very-secure-secret-key-here
NEXTAUTH_URL=https://your-domain.com

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourclinic.com

# File Storage
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=medical-documents

# Monitoring
LOG_LEVEL=info
ENABLE_ERROR_TRACKING=true

# Feature Flags
NEXT_PUBLIC_ENABLE_AUDIT_LOGS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true
```

### 2. Generate Secure Secrets

```bash
# Generate a secure secret for NextAuth
openssl rand -base64 32

# Generate a secure secret for JWT
openssl rand -hex 32
```

## Database Setup

### 1. Supabase Production Setup

1. Create a new Supabase project for production
2. Run all migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 2. Set Up Row Level Security (RLS)

Ensure all tables have proper RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Create policies (these should be in your migrations)
-- See supabase/migrations/ for complete policies
```

### 3. Create Initial Admin User

```sql
-- Insert initial admin user (replace with your details)
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'your-admin-user-id',
  'admin@yourclinic.com',
  'System Administrator',
  'Admin'
);
```

## Vercel Deployment

### 1. Connect to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

### 2. Configure Environment Variables

In the Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add all production environment variables
4. Set them for Production environment

### 3. Configure Domain

1. In Vercel dashboard, go to Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable SSL certificate

## Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      # Add other environment variables
    env_file:
      - .env.production
    restart: unless-stopped

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
```

### 3. Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Manual Deployment

### 1. Build the Application

```bash
# Install dependencies
npm ci --production

# Build the application
npm run build

# Start the application
npm start
```

### 2. Set Up Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'openmrs-pro',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## SSL Configuration

### 1. Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### 1. Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
curl https://your-domain.com/api/health
```

### 2. Log Monitoring

Set up log aggregation with tools like:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana + Loki
- CloudWatch (if using AWS)
- DataDog
- New Relic

### 3. Application Monitoring

Recommended monitoring tools:
- Sentry (error tracking)
- LogRocket (session replay)
- Vercel Analytics (if using Vercel)
- Google Analytics

## Backup Strategy

### 1. Database Backups

```bash
# Automated Supabase backups (recommended)
# Enable automatic backups in Supabase dashboard

# Manual backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
```

### 2. File Storage Backups

```bash
# Backup Supabase storage
# Use Supabase CLI or API to backup files

# Example script
#!/bin/bash
supabase storage download --bucket medical-documents ./backups/storage/
```

### 3. Configuration Backups

```bash
# Backup environment files and configurations
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env.production \
  docker-compose.yml \
  nginx.conf \
  ecosystem.config.js
```

## Security Checklist

### Pre-Deployment

- [ ] All environment variables are set securely
- [ ] Database has proper RLS policies
- [ ] SSL certificate is configured
- [ ] Firewall rules are in place
- [ ] Strong passwords are used
- [ ] Two-factor authentication is enabled
- [ ] Regular security updates are scheduled

### Post-Deployment

- [ ] Test all authentication flows
- [ ] Verify HTTPS redirects work
- [ ] Check that sensitive endpoints are protected
- [ ] Validate file upload restrictions
- [ ] Test backup and restore procedures
- [ ] Monitor for security vulnerabilities
- [ ] Set up security alerts

### Ongoing Security

- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Access log monitoring
- [ ] User permission reviews
- [ ] Data retention policy compliance
- [ ] Incident response plan

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Verify RLS policies

3. **Performance Issues**
   - Enable caching
   - Optimize database queries
   - Use CDN for static assets
   - Monitor resource usage

### Support

For deployment issues:
1. Check application logs
2. Review Supabase logs
3. Test in staging environment
4. Contact support team

## Maintenance

### Regular Tasks

- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Annual disaster recovery tests

### Monitoring Alerts

Set up alerts for:
- Application downtime
- High error rates
- Database performance issues
- Disk space usage
- SSL certificate expiration

---

For additional support, refer to the [troubleshooting guide](TROUBLESHOOTING.md) or contact the development team.

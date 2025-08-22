# RentPal Production Deployment Guide

This document provides comprehensive instructions for deploying RentPal to production environments.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd rentpal
npm install

# Configure environment
cp .env.production .env.local
# Edit .env.local with your actual values

# Run production deployment
npm run deploy
```

## 📋 Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Docker (optional, for containerized deployment)

### External Services
- **Supabase**: Database, authentication, and storage
- **Stripe**: Payment processing
- **Google Maps API**: Location services
- **Sentry**: Error tracking and monitoring
- **SendGrid/SMTP**: Email services
- **CDN**: Content delivery (optional but recommended)

## 🔧 Configuration

### Environment Variables

Copy `.env.production` to `.env.local` and configure:

#### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

#### Optional but Recommended
```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_GA_ID=your-google-analytics-id
CDN_URL=your-cdn-url
```

### Database Setup

1. **Create Supabase Project**
   ```bash
   # Run database migrations
   npx supabase db push
   
   # Seed initial data
   npx supabase db seed
   ```

2. **Configure Row Level Security**
   - All tables have RLS policies configured
   - Review policies in `supabase/schema.sql`

### Payment Setup

1. **Stripe Configuration**
   - Set up webhook endpoints
   - Configure product catalog
   - Test payment flows

2. **Webhook Endpoints**
   ```
   https://your-domain.com/api/webhooks/stripe
   ```

## 🏗️ Build Process

### Production Build

```bash
# Full production build with optimizations
npm run build:prod

# Build with bundle analysis
npm run build:analyze

# Build and deploy
npm run deploy
```

### Build Optimizations

The production build includes:
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Remove unused code
- **Minification**: JavaScript and CSS minification
- **Image Optimization**: WebP/AVIF conversion and compression
- **Bundle Analysis**: Size optimization reports
- **Static Generation**: Pre-rendered pages where possible

## 🚢 Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build:prod",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### Option 2: Docker Deployment

```bash
# Build Docker image
docker build -t rentpal .

# Run container
docker run -p 3000:3000 --env-file .env.local rentpal
```

**Dockerfile**:
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build:prod

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

### Option 3: Traditional Server

```bash
# Build application
npm run build:prod

# Start production server
npm run start:prod

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

## 📊 Monitoring and Analytics

### Error Tracking (Sentry)

Automatic error tracking is configured for:
- JavaScript errors
- API errors
- Performance monitoring
- User session tracking

### Analytics (Google Analytics)

Track key metrics:
- Page views and user sessions
- Conversion funnels
- User behavior flows
- Performance metrics

### Performance Monitoring

Built-in monitoring for:
- Web Vitals (CLS, FID, LCP)
- API response times
- Database query performance
- Cache hit rates

### Health Checks

Monitor application health:
```bash
# Health check endpoint
curl https://your-domain.com/api/health

# Detailed system status
curl https://your-domain.com/api/admin/status
```

## 🔒 Security

### Security Headers

Configured security headers:
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`

### Content Security Policy

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.googletagmanager.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: *.supabase.co;
      font-src 'self';
      connect-src 'self' *.supabase.co *.stripe.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

### Authentication Security

- JWT tokens with secure httpOnly cookies
- CSRF protection
- Rate limiting on authentication endpoints
- Account lockout after failed attempts

## 🎯 Performance Optimization

### Caching Strategy

1. **Static Assets**: Long-term caching (1 year)
2. **API Responses**: Short-term caching (5-60 minutes)
3. **Database Queries**: In-memory and Redis caching
4. **Images**: CDN caching with WebP/AVIF formats

### Database Optimization

- Connection pooling
- Query optimization
- Proper indexing
- Read replicas for scaling

### CDN Configuration

Recommended CDN setup:
- Static assets (images, CSS, JS)
- API response caching
- Geographic distribution
- Automatic compression

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Build application
        run: npm run build:prod
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Monitoring alerts set up
- [ ] Backup procedures in place
- [ ] Load testing completed
- [ ] Security scan passed

## 📈 Scaling Considerations

### Horizontal Scaling

- Load balancer configuration
- Multiple application instances
- Database read replicas
- CDN for static assets

### Vertical Scaling

- Server resource monitoring
- Database performance tuning
- Memory optimization
- CPU usage optimization

### Auto-scaling

Configure auto-scaling based on:
- CPU utilization
- Memory usage
- Request rate
- Response time

## 🔧 Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check performance metrics
   - Update dependencies
   - Backup verification

2. **Monthly**
   - Security updates
   - Performance optimization
   - Cost analysis
   - Capacity planning

3. **Quarterly**
   - Disaster recovery testing
   - Security audit
   - Performance review
   - Architecture review

### Backup Strategy

- **Database**: Daily automated backups
- **Files**: Continuous backup to cloud storage
- **Code**: Git repository with tags
- **Configuration**: Environment variable backup

### Rollback Procedures

```bash
# Quick rollback using deployment script
npm run deploy -- --rollback

# Manual rollback
git checkout previous-stable-tag
npm run deploy
```

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   - Check connection string
   - Verify network access
   - Review connection pool settings

3. **Performance Issues**
   - Check monitoring dashboard
   - Review slow query logs
   - Analyze bundle size

### Support Contacts

- **Technical Issues**: tech-support@your-domain.com
- **Security Issues**: security@your-domain.com
- **Emergency**: emergency-contact

## 📚 Additional Resources

- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Supabase Production Guide](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Production Checklist](https://stripe.com/docs/development/checklist)
- [Web Performance Best Practices](https://web.dev/fast/)

---

For questions or issues, please refer to the [main README](./README.md) or contact the development team.
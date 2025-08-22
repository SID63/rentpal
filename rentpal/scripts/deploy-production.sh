#!/bin/bash

# Production deployment script for RentPal
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="rentpal"
BUILD_DIR="build"
BACKUP_DIR="backups"
LOG_FILE="deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        error "Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
    fi
    
    # Check if required environment variables are set
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        error "NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        error "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set"
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    if [ -d "$BUILD_DIR" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"
        
        mkdir -p $BACKUP_DIR
        cp -r $BUILD_DIR "$BACKUP_DIR/$BACKUP_NAME"
        
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        warning "No existing build directory to backup"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Clean install for production
    rm -rf node_modules package-lock.json
    npm ci --only=production
    
    success "Dependencies installed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Install dev dependencies for testing
    npm ci
    
    # Run linting
    npm run lint || error "Linting failed"
    
    # Run type checking
    npx tsc --noEmit || error "Type checking failed"
    
    # Run unit tests
    npm run test:run || error "Unit tests failed"
    
    # Run integration tests
    npm run test:integration || error "Integration tests failed"
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Use production Next.js config
    cp next.config.prod.js next.config.js
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build || error "Build failed"
    
    # Generate sitemap
    npm run generate-sitemap || warning "Sitemap generation failed"
    
    success "Application built successfully"
}

# Optimize build
optimize_build() {
    log "Optimizing build..."
    
    # Compress static assets
    if command -v gzip &> /dev/null; then
        find .next/static -name "*.js" -o -name "*.css" | while read file; do
            gzip -k "$file"
        done
        success "Static assets compressed"
    else
        warning "gzip not available, skipping compression"
    fi
    
    # Generate bundle analysis
    if [ "$ANALYZE_BUNDLE" = "true" ]; then
        ANALYZE=true npm run build
        success "Bundle analysis generated"
    fi
}

# Security checks
security_checks() {
    log "Running security checks..."
    
    # Check for vulnerabilities
    npm audit --audit-level=high || warning "Security vulnerabilities found"
    
    # Check for secrets in code
    if command -v git &> /dev/null; then
        git secrets --scan || warning "Potential secrets found in code"
    fi
    
    success "Security checks completed"
}

# Performance checks
performance_checks() {
    log "Running performance checks..."
    
    # Check bundle size
    BUNDLE_SIZE=$(du -sh .next | cut -f1)
    log "Bundle size: $BUNDLE_SIZE"
    
    # Check for large files
    find .next -size +1M -type f | while read file; do
        SIZE=$(du -h "$file" | cut -f1)
        warning "Large file detected: $file ($SIZE)"
    done
    
    success "Performance checks completed"
}

# Deploy to staging (optional)
deploy_staging() {
    if [ "$DEPLOY_STAGING" = "true" ]; then
        log "Deploying to staging..."
        
        # Add your staging deployment logic here
        # This could be deploying to Vercel, Netlify, or your own servers
        
        success "Deployed to staging"
    fi
}

# Deploy to production
deploy_production() {
    log "Deploying to production..."
    
    # Add your production deployment logic here
    # Examples:
    
    # For Vercel:
    # npx vercel --prod
    
    # For Docker:
    # docker build -t $PROJECT_NAME .
    # docker push your-registry/$PROJECT_NAME:latest
    
    # For traditional servers:
    # rsync -avz --delete .next/ user@server:/path/to/app/
    # ssh user@server "pm2 restart $PROJECT_NAME"
    
    success "Deployed to production"
}

# Post-deployment checks
post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Health check
    if [ -n "$HEALTH_CHECK_URL" ]; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")
        if [ "$HTTP_STATUS" = "200" ]; then
            success "Health check passed"
        else
            error "Health check failed with status: $HTTP_STATUS"
        fi
    fi
    
    # Performance check
    if [ -n "$PERFORMANCE_CHECK_URL" ] && command -v lighthouse &> /dev/null; then
        lighthouse "$PERFORMANCE_CHECK_URL" --output=json --output-path=lighthouse-report.json
        success "Performance report generated"
    fi
    
    success "Post-deployment checks completed"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove temporary files
    rm -f next.config.js
    
    # Clean old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
    fi
    
    success "Cleanup completed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        rm -rf $BUILD_DIR
        cp -r "$BACKUP_DIR/$LATEST_BACKUP" $BUILD_DIR
        
        # Restart application
        # Add your restart logic here
        
        success "Rollback completed using backup: $LATEST_BACKUP"
    else
        error "No backup found for rollback"
    fi
}

# Signal handlers
trap 'error "Deployment interrupted"' INT TERM

# Main deployment process
main() {
    log "Starting production deployment for $PROJECT_NAME"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --staging)
                DEPLOY_STAGING=true
                shift
                ;;
            --analyze)
                ANALYZE_BUNDLE=true
                shift
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-tests    Skip running tests"
                echo "  --skip-backup   Skip creating backup"
                echo "  --staging       Deploy to staging first"
                echo "  --analyze       Generate bundle analysis"
                echo "  --rollback      Rollback to previous version"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    
    if [ "$SKIP_BACKUP" != "true" ]; then
        create_backup
    fi
    
    install_dependencies
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    build_application
    optimize_build
    security_checks
    performance_checks
    
    if [ "$DEPLOY_STAGING" = "true" ]; then
        deploy_staging
    fi
    
    deploy_production
    post_deployment_checks
    cleanup
    
    success "Production deployment completed successfully!"
    log "Deployment log saved to: $LOG_FILE"
}

# Run main function
main "$@"
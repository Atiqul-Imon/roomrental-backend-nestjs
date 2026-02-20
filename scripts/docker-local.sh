#!/bin/bash

# Docker Local Development Helper Script
# Usage: ./scripts/docker-local.sh [command]

set -e

PROJECT_NAME="roomrental-api"
COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log_info "Create .env file with required variables:"
        log_info "  DATABASE_URL, JWT_SECRET, etc."
        exit 1
    fi
    log_info ".env file found ✓"
}

# Start containers
start() {
    log_info "Starting Docker containers..."
    check_env
    docker-compose -f $COMPOSE_FILE up -d
    log_info "Containers started!"
    log_info "API: http://localhost:5000"
    log_info "Health: http://localhost:5000/api/health"
}

# Stop containers
stop() {
    log_info "Stopping Docker containers..."
    docker-compose -f $COMPOSE_FILE down
    log_info "Containers stopped!"
}

# Restart containers
restart() {
    log_info "Restarting Docker containers..."
    docker-compose -f $COMPOSE_FILE restart
    log_info "Containers restarted!"
}

# Rebuild and start
rebuild() {
    log_info "Rebuilding Docker images..."
    check_env
    docker-compose -f $COMPOSE_FILE up -d --build
    log_info "Rebuild complete!"
}

# View logs
logs() {
    log_info "Viewing container logs (Ctrl+C to exit)..."
    docker-compose -f $COMPOSE_FILE logs -f
}

# Show status
status() {
    log_info "Container status:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    log_info "Health check:"
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_info "API is healthy ✓"
    else
        log_error "API is not responding ✗"
    fi
}

# Shell into container
shell() {
    log_info "Opening shell in container..."
    docker exec -it $PROJECT_NAME sh
}

# Run migrations
migrate() {
    log_info "Running database migrations..."
    docker exec -it $PROJECT_NAME npx prisma migrate deploy
    log_info "Migrations complete!"
}

# Clean up
clean() {
    log_warn "This will remove all containers and images!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        docker-compose -f $COMPOSE_FILE down -v
        docker image prune -f
        log_info "Cleanup complete!"
    else
        log_info "Cleanup cancelled"
    fi
}

# Show help
help() {
    echo "Docker Local Development Helper"
    echo ""
    echo "Usage: ./scripts/docker-local.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start containers"
    echo "  stop      - Stop containers"
    echo "  restart   - Restart containers"
    echo "  rebuild   - Rebuild images and restart"
    echo "  logs      - View container logs (live)"
    echo "  status    - Show container status and health"
    echo "  shell     - Open shell in container"
    echo "  migrate   - Run database migrations"
    echo "  clean     - Remove containers and images"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/docker-local.sh start"
    echo "  ./scripts/docker-local.sh logs"
    echo "  ./scripts/docker-local.sh shell"
}

# Main command dispatcher
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    rebuild)
        rebuild
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    shell)
        shell
        ;;
    migrate)
        migrate
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac

#!/bin/bash
set -e

log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

start_mesh() {
    log_info "Starting MESH Platform with Docker..."
    
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        log_info "Copying .env.example to .env"
        cp .env.example .env
    fi
    
    docker-compose up -d --build
    
    log_info "Waiting for MESH to start..."
    sleep 15
    
    if curl -f http://localhost:3978/healthz >/dev/null 2>&1; then
        log_success "✅ MESH Platform is running!"
        echo ""
        echo "🌐 Health Check: http://localhost:3978/healthz"
        echo "🤖 Bot Endpoint: http://localhost:3978/api/messages"
        echo ""
        echo "Test command:"
        echo 'curl -X POST http://localhost:3978/api/messages -H "Content-Type: application/json" -d '\''{"type":"message","text":"oi","from":{"id":"test","name":"User"}}'\'''
    else
        log_error "❌ MESH failed to start"
        docker-compose logs mesh-platform
    fi
}

case "${1:-start}" in
    "start"|"up") start_mesh ;;
    "stop"|"down") docker-compose down; log_success "MESH stopped" ;;
    "logs") docker-compose logs -f mesh-platform ;;
    "status") docker-compose ps && curl -f http://localhost:3978/healthz 2>/dev/null && echo "✅ Healthy" || echo "❌ Not responding" ;;
    *) echo "Usage: $0 [start|stop|logs|status]" ;;
esac

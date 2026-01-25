#!/bin/bash

# Environment Switcher for Worship Set Manager
# Usage: ./scripts/switch-env.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

show_status() {
    echo ""
    echo -e "${BLUE}Current Status:${NC}"
    echo -e "  Git Branch: ${GREEN}$(git branch --show-current)${NC}"

    # Check which database is configured
    if grep -q "uoftbqnlfvhyfzwcrkfc" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
        echo -e "  Database:   ${GREEN}DEV${NC} (uoftbqnlfvhyfzwcrkfc)"
    elif grep -q "alnclerrwasslbefywjx" "$PROJECT_ROOT/backend/.env" 2>/dev/null; then
        echo -e "  Database:   ${YELLOW}PROD${NC} (alnclerrwasslbefywjx)"
    else
        echo -e "  Database:   ${RED}Unknown${NC}"
    fi
    echo ""
}

switch_to_dev() {
    echo -e "${BLUE}Switching to DEVELOPMENT environment...${NC}"

    # Switch git branch
    echo "  → Switching to develop branch..."
    git checkout develop 2>/dev/null || git checkout -b develop origin/develop 2>/dev/null || echo "    Already on develop or branch doesn't exist"

    # Switch environment files
    echo "  → Copying dev environment files..."
    cp "$PROJECT_ROOT/backend/.env.development" "$PROJECT_ROOT/backend/.env"
    cp "$PROJECT_ROOT/frontend/.env.development.local" "$PROJECT_ROOT/frontend/.env.local"

    echo -e "${GREEN}✓ Switched to DEVELOPMENT${NC}"
    show_status
}

switch_to_prod() {
    echo -e "${YELLOW}Switching to PRODUCTION environment...${NC}"
    echo -e "${RED}⚠ WARNING: You will be connected to the PRODUCTION database!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi

    # Switch git branch
    echo "  → Switching to main branch..."
    git checkout main

    # Switch environment files
    echo "  → Copying prod environment files..."
    cp "$PROJECT_ROOT/frontend/.env.production.local" "$PROJECT_ROOT/frontend/.env.local"

    # For backend, we need to restore from the original .env or a backup
    if [ -f "$PROJECT_ROOT/backend/.env.production" ]; then
        cp "$PROJECT_ROOT/backend/.env.production" "$PROJECT_ROOT/backend/.env"
    else
        echo -e "${YELLOW}  Note: backend/.env.production not found. Please restore manually.${NC}"
    fi

    echo -e "${GREEN}✓ Switched to PRODUCTION${NC}"
    show_status
}

case "$1" in
    dev|development)
        switch_to_dev
        ;;
    prod|production)
        switch_to_prod
        ;;
    status|"")
        show_status
        ;;
    *)
        echo "Usage: $0 [dev|prod|status]"
        echo ""
        echo "Commands:"
        echo "  dev, development  - Switch to development environment"
        echo "  prod, production  - Switch to production environment (with confirmation)"
        echo "  status            - Show current environment status"
        exit 1
        ;;
esac

#!/bin/bash
# ============================================================
# Having this will help me and you avoid the multiple terminal mess
# and missing commands
# Stops everything started by deploy.sh:
#   1. Frontend dev server
#   2. Backend server
#   3. Org3
#   4. Fabric test-network (containers, volumes, chaincode images)
#   5. Wallet identities
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }
info()   { echo -e "${GREEN}[✔] $1${NC}"; }
warn()   { echo -e "${YELLOW}[!] $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FABRIC_SAMPLES="$PROJECT_ROOT/hyperledger/fabric-samples"
TEST_NETWORK="$FABRIC_SAMPLES/test-network"
BACKEND_DIR="$SCRIPT_DIR/backend"


# Stop frontend 
banner "Stopping frontend"
# Kill anything on port 5173 first
VITE_PID=$(lsof -ti :5173 2>/dev/null || true)
if [ -n "$VITE_PID" ]; then
    kill $VITE_PID 2>/dev/null || true
    info "Frontend stopped (port 5173)"
else
    warn "No frontend process found on port 5173"
fi
# Also try the saved PID as fallback
if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    FRONTEND_PID=$(cat "$SCRIPT_DIR/.frontend.pid")
    kill "$FRONTEND_PID" 2>/dev/null || true
    pkill -P "$FRONTEND_PID" 2>/dev/null || true
    rm -f "$SCRIPT_DIR/.frontend.pid"
fi


# Stop backend
banner "Stopping backend"
# Kill anything on port 4000 first
NODE_PID=$(lsof -ti :4000 2>/dev/null || true)
if [ -n "$NODE_PID" ]; then
    kill $NODE_PID 2>/dev/null || true
    info "Backend stopped (port 4000)"
else
    warn "No backend process found on port 4000"
fi
# Also try the saved PID as fallback
if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    BACKEND_PID=$(cat "$SCRIPT_DIR/.backend.pid")
    kill "$BACKEND_PID" 2>/dev/null || true
    rm -f "$SCRIPT_DIR/.backend.pid"
fi


# Tear down Org3
banner "Tearing down Org3"
if [ -d "$TEST_NETWORK/addOrg3" ]; then
    cd "$TEST_NETWORK/addOrg3"
    ./addOrg3.sh down 2>/dev/null || true
    info "Org3 removed"
else
    warn "addOrg3 directory not found — skipping"
fi


# Tear down Fabric network 
banner "Tearing down Fabric network"
cd "$TEST_NETWORK"
./network.sh down

info "Fabric network is DOWN"


# Clean wallet
banner "Cleaning wallet"

if [ -d "$BACKEND_DIR/wallet" ]; then
    rm -rf "$BACKEND_DIR/wallet"
    info "Wallet cleared"
else
    warn "No wallet found"
fi


# Clean PID files
rm -f "$SCRIPT_DIR/.backend.pid" "$SCRIPT_DIR/.frontend.pid"


# Done 
banner "Teardown complete"
echo -e "${GREEN}  All services stopped and network destroyed.${NC}"
echo -e "${YELLOW}  To redeploy, run:  ./deploy.sh${NC}"
echo ""

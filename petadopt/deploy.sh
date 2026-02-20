#!/bin/bash
# ============================================================
# Having this will help me and you avoid the multiple terminal mess
# and missing commands
#   1. Fabric test-network + channel + CouchDB + CAs
#   2. Org3 (adopter organisation) stored separately,
#   3. Chaincode ("adoption") deployment
#   4. Backend npm install + pet data import + server start
#   5. Frontend npm install + dev server start
# ============================================================


set -e  # exit on any error

#  Color on terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

banner() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }
info()   { echo -e "${GREEN}[✔] $1${NC}"; }
warn()   { echo -e "${YELLOW}[!] $1${NC}"; }
fail()   { echo -e "${RED}[✘] $1${NC}"; exit 1; }

# project root and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FABRIC_SAMPLES="$PROJECT_ROOT/hyperledger/fabric-samples"
TEST_NETWORK="$FABRIC_SAMPLES/test-network"
CHAINCODE_PATH="$FABRIC_SAMPLES/asset-transfer-basic/chaincode-typescript"
PDC_CONFIG="$CHAINCODE_PATH/pdc/collections_config.json"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Pre-deploy checks 
banner "Pre-deploy checks"
command -v docker  >/dev/null 2>&1 || fail "Docker is not installed"
command -v node    >/dev/null 2>&1 || fail "Node.js is not installed"
command -v npm     >/dev/null 2>&1 || fail "npm is not installed"

# Make sure docker is running
docker info >/dev/null 2>&1 || fail "Docker daemon is not running — please start Docker first"

# Add Fabric binaries to PATH if any
if [ -d "$FABRIC_SAMPLES/bin" ]; then
    export PATH="$FABRIC_SAMPLES/bin:$PATH"
    info "Fabric binaries added to PATH"
fi

# Export Fabric config path
export FABRIC_CFG_PATH="$FABRIC_SAMPLES/config"

info "All pre-deploy checks passed"



# Step 1: Tear down any previous work
banner "Step 1/6 — Cleaning up previous network (if any)"
cd "$TEST_NETWORK"

# Force-remove any leftover Org3
docker rm -f peer0.org3.example.com ca_org3 couchdb3 2>/dev/null || true
./network.sh down 2>/dev/null || true
rm -rf "$TEST_NETWORK/organizations/peerOrganizations/org3.example.com" 2>/dev/null || true
rm -rf "$TEST_NETWORK/organizations/fabric-ca/org3" 2>/dev/null || true

# any dangling docker networks from previous runs
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

# Clean old wallet
if [ -d "$BACKEND_DIR/wallet" ]; then
    rm -rf "$BACKEND_DIR/wallet"
    info "Cleared old wallet"
fi
info "Previous network cleaned"


# Step 2: Bring up Fabric network
# I use CAs for better simulation of real-world scenarios
banner "Step 2/6 — Starting Fabric network + channel"
cd "$TEST_NETWORK"
./network.sh up createChannel -ca -s couchdb

info "Fabric network is UP  |  Channel: mychannel"


# Step 3: Add Org3
banner "Step 3/6 — Adding Org3 (adopter organisation)"

cd "$TEST_NETWORK/addOrg3"
./addOrg3.sh up -ca -s couchdb

info "Org3 joined the network"


# Step 4a: Deploy chaincode
banner "Step 4/6 — Deploying 'adoption' chaincode"

cd "$TEST_NETWORK"
./network.sh deployCC \
    -ccn adoption \
    -ccp "$CHAINCODE_PATH" \
    -ccl typescript \
    -cccg "$PDC_CONFIG"

info "Chaincode 'adoption' deployed on Org1 & Org2"


# Step 4b: Install & approve chaincode on Org3
# Org3 is stored separately, so needs another setup
banner "Step 4b — Installing chaincode on Org3 peer"

cd "$TEST_NETWORK"

# Source the helper scripts used by test-network
export PATH="$FABRIC_SAMPLES/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES/config"

. scripts/utils.sh
. scripts/envVar.sh
. scripts/ccutils.sh

# Set the same variables that deployCC.sh uses
CHANNEL_NAME="mychannel"
CC_NAME="adoption"
CC_VERSION="1.0"
DELAY=3
MAX_RETRY=5
VERBOSE=false

# the package ID from the existing file
setGlobals 1
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)
if [ -z "$PACKAGE_ID" ]; then
    fail "Could not calculate chaincode package ID — is ${CC_NAME}.tar.gz present?"
fi
infoln "Package ID: $PACKAGE_ID"

# Set collection config for approval
CC_COLL_CONFIG="--collections-config $PDC_CONFIG"
CC_END_POLICY=""
INIT_REQUIRED=""

# setGlobals for the peer command has a valid address
setGlobals 1
CC_SEQUENCE=$(peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} --output json 2>/dev/null | jq -r '.sequence // 1')

# temp fix for accessing Org3, 
set +e
infoln "Installing chaincode on peer0.org3..."
installChaincode 3

infoln "Querying installed chaincode on peer0.org3..."
queryInstalled 3

infoln "Approving chaincode definition for Org3..."
approveForMyOrg 3

# retry commit until ready
set -e
info "Chaincode 'adoption' installed and approved on Org3"


# Step 5: Start backend
banner "Step 5/6 — Setting up & starting backend"

cd "$BACKEND_DIR"
npm install

# Import sample pet data from .json
info "Importing pet data..."
npm run import || warn "Pet data import failed — you might need to import manually later"

info "Starting backend server on port 4000..."
node backend.js &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$SCRIPT_DIR/.backend.pid"

# Wait for port 4000 to become available
for i in $(seq 1 15); do
    if curl -s -o /dev/null http://localhost:4000 2>/dev/null; then
        break
    fi
    sleep 1
done

if curl -s -o /dev/null http://localhost:4000 2>/dev/null; then
    info "Backend running on port 4000 (PID $BACKEND_PID)"
else
    fail "Backend failed to start — check logs above"
fi


# Step 6: Start frontend
banner "Step 6/6 — Setting up & starting frontend"

cd "$FRONTEND_DIR"
npm install

info "Starting frontend dev server..."
npx vite --host &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$SCRIPT_DIR/.frontend.pid"

for i in $(seq 1 15); do
    if curl -s -o /dev/null http://localhost:5173 2>/dev/null; then
        break
    fi
    sleep 1
done

if curl -s -o /dev/null http://localhost:5173 2>/dev/null; then
    info "Frontend running on port 5173 (PID $FRONTEND_PID)"
else
    fail "Frontend failed to start — check logs above"
fi


# Done
banner "🎉 YAYYY PawLedger is READY on browser!"

echo -e "${GREEN}  Click to open Frontend:  ${NC}http://localhost:5173"
echo -e "${GREEN}  Backend:   ${NC}http://localhost:4000"
echo ""
echo -e "${YELLOW}  To stop everything later, run:${NC}"
echo -e "    ${CYAN}cd $(realpath --relative-to="$PWD" "$SCRIPT_DIR") && ./teardown.sh${NC}"
echo ""
echo -e "${YELLOW}  Process PIDs saved to .backend.pid and .frontend.pid${NC}"
echo ""

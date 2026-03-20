# PawLedger Demo Run (Minimal)

This README covers only the basic demo workflow.
Upon running the footsteps of the deployment will be on terminal, and the demo will be available on the frontend UI. The log of the application will appear on the terminal.

## Start the system

From the `petadopt` directory:

```bash
./deploy.sh
```

This script:
- starts the Fabric test network and channel,
- deploys the chaincode,
- starts backend and frontend services,
- imports demo pet data,
- seeds allowed login users.

Default local URLs after startup:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Stop and clean the system

From the `petadopt` directory:

```bash
./teardown.sh
```

This script stops frontend/backend, tears down Org3 and the Fabric network, and clears local wallet state.

## Demo data used by `deploy.sh`

The demo import command in `deploy.sh` runs:

```bash
npm run import
```

which uses the default file:

```text
pet_data/pet_data.json
```

This default file is intended for normal demo usage (UI walkthrough and user demonstration), not for latency benchmarking.

## Demo images

Pet images are served from:

```text
pet_data/images
```

through the backend static route:

```text
/pet_images
```

#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$HOME/eta_project"

echo "--- STEP 1: Loading Docker Images ---"
cd "$SCRIPT_DIR/images"
for f in *.tar; do
    if [ -f "$f" ]; then
        echo "Loading $f..."
        sudo docker load < "$f"
    fi
done

echo "--- STEP 2: Setting up Configs ---"
mkdir -p "$PROJECT_DIR/backend" "$PROJECT_DIR/salesforce_api" "$PROJECT_DIR/sheet_poller/data" "$PROJECT_DIR/frontend"
cp -r "$SCRIPT_DIR/configs/"* "$PROJECT_DIR/"

# Move and rename .env files to their correct locations
[ -f "$PROJECT_DIR/backend.env" ] && mv "$PROJECT_DIR/backend.env" "$PROJECT_DIR/backend/.env"
[ -f "$PROJECT_DIR/sf-api.env" ] && mv "$PROJECT_DIR/sf-api.env" "$PROJECT_DIR/salesforce_api/.env"
[ -f "$PROJECT_DIR/sheet-poller.env" ] && mv "$PROJECT_DIR/sheet-poller.env" "$PROJECT_DIR/sheet_poller/.env"
[ -f "$PROJECT_DIR/frontend.env" ] && mv "$PROJECT_DIR/frontend.env" "$PROJECT_DIR/frontend/.env"

# Move credentials
[ -f "$PROJECT_DIR/sheet-poller-credentials.json" ] && mv "$PROJECT_DIR/sheet-poller-credentials.json" "$PROJECT_DIR/sheet_poller/data/credentials.json"

echo "--- STEP 3: Starting the Project ---"
cd "$PROJECT_DIR"

# Check if docker-compose exists, otherwise use 'docker compose'
if command -v docker-compose &> /dev/null; then
    sudo docker-compose up -d
else
    sudo docker compose up -d
fi

echo ""
echo "DONE! Your project is now running at 10.20.13.82"

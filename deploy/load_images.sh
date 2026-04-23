#!/bin/bash

echo "--- STEP 1: Loading Docker Images ---"
cd /root/deploy/images
for f in *.tar; do
    echo "Loading $f..."
    docker load < "$f"
done

echo "--- STEP 2: Setting up Configs ---"
mkdir -p /root/eta_project
cp -r /root/deploy/configs/* /root/eta_project/

# Rename .env files to their correct names in subdirectories
mv /root/eta_project/backend.env /root/eta_project/backend/.env 2>/dev/null
mv /root/eta_project/sf-api.env /root/eta_project/salesforce_api/.env 2>/dev/null
mv /root/eta_project/sheet-poller.env /root/eta_project/sheet_poller/.env 2>/dev/null
mv /root/eta_project/frontend.env /root/eta_project/frontend/.env 2>/dev/null

echo "--- STEP 3: Starting the Project ---"
cd /root/eta_project
docker-compose up -d

echo ""
echo "DONE! Your project is now running at 10.20.13.82"

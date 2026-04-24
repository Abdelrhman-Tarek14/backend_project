# Create deployment directories
New-Item -ItemType Directory -Force -Path ".\deploy\images"
New-Item -ItemType Directory -Force -Path ".\deploy\configs"

Write-Host "--- STEP 1: Building All Services ---" -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "--- STEP 2: Saving Images ---" -ForegroundColor Cyan
# Ensure nginx:alpine is present
docker pull nginx:alpine

$images = @(
    @{ name = "eta_project-app"; file = "app.tar" },
    @{ name = "eta_project-frontend"; file = "frontend.tar" },
    @{ name = "eta_project-sf-api"; file = "sf-api.tar" },
    @{ name = "eta_project-sheet-poller"; file = "sheet-poller.tar" },
    @{ name = "nginx:alpine"; file = "nginx.tar" }
)

foreach ($img in $images) {
    Write-Host "Saving $($img.name)..."
    docker save -o ".\deploy\images\$($img.file)" $($img.name)
}

Write-Host "--- STEP 3: Collecting Config Files ---" -ForegroundColor Cyan
Copy-Item ".\docker-compose.yml" ".\deploy\configs\"
Copy-Item ".\backend\.env" ".\deploy\configs\backend.env"
Copy-Item ".\salesforce_api\.env" ".\deploy\configs\sf-api.env"
Copy-Item ".\sheet_poller\.env" ".\deploy\configs\sheet-poller.env"
Copy-Item ".\frontend\.env" ".\deploy\configs\frontend.env"
Copy-Item ".\sheet_poller\data\credentials.json" ".\deploy\configs\sheet-poller-credentials.json" -ErrorAction SilentlyContinue
Copy-Item -Recurse ".\nginx" ".\deploy\configs\"

# IMPORTANT: Copy the UPDATED server-side script to the root of deploy folder
Copy-Item ".\deploy\load_images.sh" ".\deploy\configs\"

Write-Host "`nPreparation complete! Run these commands now:" -ForegroundColor Green
Write-Host "1. scp -r .\deploy a.tarek@10.20.13.82:~/" -ForegroundColor Yellow
Write-Host "2. ssh a.tarek@10.20.13.82" -ForegroundColor Yellow
Write-Host "3. sed -i 's/\r$//' ~/deploy/load_images.sh" -ForegroundColor Yellow
Write-Host "4. chmod +x ~/deploy/load_images.sh && ~/deploy/load_images.sh" -ForegroundColor Yellow

# Create deployment directories
New-Item -ItemType Directory -Force -Path ".\deploy\images"
New-Item -ItemType Directory -Force -Path ".\deploy\configs"

Write-Host "--- STEP 1: Building All Services ---" -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "--- STEP 2: Saving Images (This may take a few minutes) ---" -ForegroundColor Cyan
$images = @(
    @{ name = "eta_project-app"; file = "app.tar" },
    @{ name = "eta_project-frontend"; file = "frontend.tar" },
    @{ name = "eta_project-sf-api"; file = "sf-api.tar" },
    @{ name = "eta_project-sheet-poller"; file = "sheet-poller.tar" },
    @{ name = "nginx:alpine"; file = "nginx.tar" }
)

foreach ($img in $images) {
    Write-Host "Saving $($img.name)..."
    docker save $($img.name) > ".\deploy\images\$($img.file)"
}

Write-Host "--- STEP 3: Collecting Config Files ---" -ForegroundColor Cyan
Copy-Item ".\docker-compose.yml" ".\deploy\configs\"
Copy-Item ".\backend\.env" ".\deploy\configs\backend.env"
Copy-Item ".\salesforce_api\.env" ".\deploy\configs\sf-api.env"
Copy-Item ".\sheet_poller\.env" ".\deploy\configs\sheet-poller.env"
Copy-Item ".\frontend\.env" ".\deploy\configs\frontend.env"
Copy-Item -Recurse ".\nginx" ".\deploy\configs\"

# Copy the server-side script to configs so it's transferred
Copy-Item ".\deploy\load_images.sh" ".\deploy\configs\"

Write-Host "`nSuccessfully prepared deployment package in .\deploy" -ForegroundColor Green
Write-Host "Next Step: Run 'scp -r .\deploy root@10.20.13.82:/root/'" -ForegroundColor Yellow

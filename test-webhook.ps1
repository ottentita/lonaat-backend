# Test Digistore24 Webhook Endpoint
# This script tests if the webhook accepts external POST requests and returns HTTP 200

Write-Host "Testing Digistore24 Webhook Endpoint..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:4000/api/webhooks/digistore24" -ForegroundColor Yellow
Write-Host ""

$body = @{
    event = "sale"
    data = @{
        email = "titasembi@gmail.com"
        amount = 100
        order_id = "TEST-WEBHOOK-$(Get-Date -Format 'yyyyMMddHHmmss')"
    }
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $body
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/webhooks/digistore24" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status: HTTP 200 OK" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}

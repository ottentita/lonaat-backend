# PowerShell script to test conversion webhook
$headers = @{
    "Content-Type" = "application/json"
    "x-webhook-secret" = "your-secure-webhook-secret-here"
}

$body = @{
    reference = "test_debug_001"
    amount = 1000
    userId = 1
    productId = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/conversion/webhook-v2" -Method Post -Headers $headers -Body $body
    Write-Host "✅ SUCCESS" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
    Write-Host "Error:" $_.Exception.Message
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response:" $responseBody
}

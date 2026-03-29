$r = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"user1+1771819327616@example.com","password":"Password1!"}'
$token = $r.token
$map = Invoke-RestMethod -Uri 'http://localhost:4000/api/land-registry/map' -Method Get -Headers @{ Authorization = "Bearer $token" }
@{ login = $r; map = $map } | ConvertTo-Json -Compress

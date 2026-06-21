param(
  [string]$BackendUrl = ""
)

$CLIENT_DIR = "$PSScriptRoot\..\client"
Set-Location $CLIENT_DIR

# If a backend URL is provided, update vercel.json and env var
if ($BackendUrl -ne "") {
  # Update vercel.json proxy URL
  $vercelJson = Get-Content "vercel.json" -Raw
  $vercelJson = $vercelJson -replace 'https://[a-z0-9-]+\.trycloudflare\.com', $BackendUrl
  Set-Content "vercel.json" $vercelJson

  # Update VITE_WS_URL env var for production
  npx vercel env rm VITE_WS_URL production --yes 2>$null
  $BackendUrl | npx vercel env add VITE_WS_URL production --yes

  Write-Output "Backend URL updated to: $BackendUrl"
}

# Deploy
npx vercel deploy --prod --yes

Write-Output "Deployed! Visit: https://nexar-beta-seven-89.vercel.app"

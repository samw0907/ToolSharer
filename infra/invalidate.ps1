Param(
  [string]$Path = "/*"
)

# 1) Read your CDN domain from the stack outputs
$outs = aws cloudformation describe-stacks --stack-name InfraStack --query "Stacks[0].Outputs" | ConvertFrom-Json
$cdnUrl = ($outs | Where-Object { $_.OutputKey -eq 'CdnDomain' }).OutputValue
# $cdnUrl looks like: https://d2wy8l4c3d4g5g.cloudfront.net
$distDomain = $cdnUrl -replace '^https?://','' -replace '/$',''

# 2) Resolve distribution ID by domain name
$distId = aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$distDomain'].Id | [0]" --output text
if (-not $distId -or $distId -eq 'None') {
  Write-Error "Could not find CloudFront distribution for domain: $distDomain"
  exit 1
}

# 3) Build the invalidation batch JSON (CLI expects a file)
$ref = (Get-Date -Format "yyyyMMddHHmmssffff")
$batch = @{
  Paths = @{ Quantity = 1; Items = @($Path) }
  CallerReference = $ref
} | ConvertTo-Json -Compress

$tmp = New-TemporaryFile
Set-Content -Path $tmp -Value $batch -Encoding ASCII

# 4) Create invalidation
aws cloudfront create-invalidation --distribution-id $distId --invalidation-batch file://$tmp | Out-Null
Remove-Item $tmp -Force

Write-Host "Invalidation requested for $Path (distribution: $distId, ref: $ref)"

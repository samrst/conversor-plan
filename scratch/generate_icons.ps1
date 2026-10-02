Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\img\logo-conversor.png"
$srcPath = [System.IO.Path]::GetFullPath($srcPath)
$destDir = Join-Path $PSScriptRoot "..\img\icons"
$destDir = [System.IO.Path]::GetFullPath($destDir)

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Original dimensions: $($srcImg.Width) x $($srcImg.Height)"

function Generate-Icon([System.Drawing.Image]$source, [int]$targetSize, [string]$outputPath) {
    # We want a square bitmap of targetSize x targetSize (e.g. 192x192 or 512x512)
    # Maskable safe zone is 80% of targetSize (margin of 10% on each side)
    $safeSize = [Math]::Floor($targetSize * 0.82)
    
    # Calculate scale to fit source inside safeSize maintaining aspect ratio
    $scale = [Math]::Min($safeSize / $source.Width, $safeSize / $source.Height)
    $newWidth = [Math]::Round($source.Width * $scale)
    $newHeight = [Math]::Round($source.Height * $scale)
    
    $offsetX = [Math]::Round(($targetSize - $newWidth) / 2)
    $offsetY = [Math]::Round(($targetSize - $newHeight) / 2)
    
    $bmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, $offsetX, $offsetY, $newWidth, $newHeight)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Saved: $outputPath ($targetSize x $targetSize, image: $newWidth x $newHeight at offset $offsetX,$offsetY)"
}

Generate-Icon -source $srcImg -targetSize 192 -outputPath (Join-Path $destDir "icon-192.png")
Generate-Icon -source $srcImg -targetSize 512 -outputPath (Join-Path $destDir "icon-512.png")

$srcImg.Dispose()

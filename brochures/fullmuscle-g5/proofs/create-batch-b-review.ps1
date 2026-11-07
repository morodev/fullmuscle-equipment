$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = 'C:\Users\lucam\WebstormProjects\fullmuscle-equipment'
$allReviewJobs = Get-Content -LiteralPath (Join-Path $taskRoot 'brochures/fullmuscle-g5/image-jobs.json') -Raw | ConvertFrom-Json
$reviewJobs = @($allReviewJobs | Where-Object { $_.batch -eq 'batch-b' })
$proofRoot = Join-Path $taskRoot 'brochures/fullmuscle-g5/proofs'
$fontReview = New-Object System.Drawing.Font('Arial', 14)
for ($pageReview = 0; $pageReview -lt 8; $pageReview++) {
  $bitmapReview = New-Object System.Drawing.Bitmap(1000, 2160)
  $graphicsReview = [System.Drawing.Graphics]::FromImage($bitmapReview)
  $graphicsReview.Clear([System.Drawing.Color]::White)
  $graphicsReview.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for ($rowReview = 0; $rowReview -lt 4; $rowReview++) {
    $reviewJob = $reviewJobs[$pageReview * 4 + $rowReview]
    $rowYReview = $rowReview * 540
    $graphicsReview.FillRectangle([System.Drawing.Brushes]::LightGray, 0, $rowYReview, 1000, 40)
    $graphicsReview.DrawString(($reviewJob.sku + ' ORIGINAL'), $fontReview, [System.Drawing.Brushes]::Black, 10, $rowYReview + 8)
    $graphicsReview.DrawString(($reviewJob.sku + ' FULL MUSCLE'), $fontReview, [System.Drawing.Brushes]::Black, 510, $rowYReview + 8)
    $reviewPaths = @($reviewJob.originalPath, $reviewJob.output)
    for ($columnReview = 0; $columnReview -lt 2; $columnReview++) {
      $reviewImage = [System.Drawing.Image]::FromFile((Join-Path $taskRoot $reviewPaths[$columnReview]))
      $scaleReview = [Math]::Min(500.0 / $reviewImage.Width, 500.0 / $reviewImage.Height)
      $widthReview = [int]($reviewImage.Width * $scaleReview)
      $heightReview = [int]($reviewImage.Height * $scaleReview)
      $rectReview = New-Object System.Drawing.Rectangle(($columnReview * 500 + [int]((500 - $widthReview) / 2)), ($rowYReview + 40 + [int]((500 - $heightReview) / 2)), $widthReview, $heightReview)
      $graphicsReview.DrawImage($reviewImage, $rectReview)
      $reviewImage.Dispose()
    }
  }
  $outputReview = Join-Path $proofRoot ('review-batch-b-' + ($pageReview + 1) + '.png')
  $bitmapReview.Save($outputReview, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphicsReview.Dispose()
  $bitmapReview.Dispose()
}
$fontReview.Dispose()
Write-Output '8 source/output comparison sheets created for analysis only.'

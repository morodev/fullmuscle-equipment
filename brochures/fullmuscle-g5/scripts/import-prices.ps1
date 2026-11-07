param(
    [string]$SourceFile = 'TZFITNESS Price List for GC Series-20261103.xlsx'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$sourcePath = if ([System.IO.Path]::IsPathRooted($SourceFile)) { $SourceFile } else { Join-Path $projectRoot $SourceFile }
$sourcePath = (Resolve-Path -LiteralPath $sourcePath).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($sourcePath)

function Read-ArchiveXml([string]$Name) {
    $entry = $archive.GetEntry($Name)
    if ($null -eq $entry) { throw "Missing XLSX entry: $Name" }
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

try {
    $shared = Read-ArchiveXml 'xl/sharedStrings.xml'
    $strings = @($shared.sst.si | ForEach-Object { $_.InnerText })
    $sheet = Read-ArchiveXml 'xl/worksheets/sheet1.xml'
    $styles = Read-ArchiveXml 'xl/styles.xml'
    $workbook = Read-ArchiveXml 'xl/workbook.xml'
    if (@($workbook.workbook.sheets.sheet).Count -ne 1 -or $workbook.workbook.sheets.sheet.name -ne 'Sheet1') {
        throw 'Expected the single Sheet1 worksheet; review the workbook before importing.'
    }
    $records = [System.Collections.Generic.List[object]]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($row in $sheet.worksheet.sheetData.row) {
        $values = @{}
        $priceCell = $null
        foreach ($cell in $row.c) {
            $column = $cell.r -replace '\d', ''
            $value = [string]$cell.v
            if ($cell.t -eq 's') { $value = $strings[[int]$cell.v] }
            if ($cell.t -eq 'inlineStr') { $value = $cell.is.InnerText }
            $values[$column] = $value
            if ($column -eq 'G') { $priceCell = $cell }
        }
        if ($values.A -notmatch '^[A-Z]+-?\d+[A-Z]?(?:-[A-Z0-9]+)*$') { continue }
        $sku = $values.A
        $amount = 0.0
        if ([string]::IsNullOrWhiteSpace($values.B) -or
            -not [double]::TryParse($values.G, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$amount) -or
            [double]::IsNaN($amount) -or [double]::IsInfinity($amount) -or $amount -le 0) {
            throw "Missing or invalid purchase price: $sku at row $($row.r)"
        }
        $numberFormatId = $styles.styleSheet.cellXfs.xf[[int]$priceCell.s].numFmtId
        $numberFormat = @($styles.styleSheet.numFmts.numFmt | Where-Object { $_.numFmtId -eq $numberFormatId })
        if ($numberFormat.Count -ne 1 -or $numberFormat[0].formatCode -notmatch 'US\$') {
            throw "Expected an explicit USD price format: $sku at row $($row.r)"
        }
        if (-not $seen.Add($sku)) { throw "Duplicate purchase SKU: $sku" }
        $records.Add([ordered]@{ sourceSku = $sku; row = [int]$row.r; name = $values.B; currency = 'USD'; amountUsd = $amount })
    }
    if ($records.Count -ne 127) { throw "Expected 127 price rows, found $($records.Count). Review the source change." }
    $snapshot = [ordered]@{
        schemaVersion = 1
        source = [ordered]@{
            filename = [System.IO.Path]::GetFileName($sourcePath)
            sha256 = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
            sheet = 'Sheet1'
            priceColumn = 'G'
            priceLabel = 'FOB Tianjin'
            currency = 'USD'
        }
        rows = @($records.ToArray())
    }
    $destination = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../content/purchase-prices.json'))
    [System.IO.File]::WriteAllText($destination, ($snapshot | ConvertTo-Json -Depth 8) + "`n", [System.Text.UTF8Encoding]::new($false))
    Write-Output "Imported $($records.Count) USD purchase prices into $destination"
} finally {
    $archive.Dispose()
}

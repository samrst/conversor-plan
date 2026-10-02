$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $filePath = "C:\Users\sam.sampaio\Downloads\Alunos Matriculados 26.1 CHP - SAEP 2026.2.xls"
    $wb = $excel.Workbooks.Open($filePath)
    Write-Output "File opened successfully. Total Sheets: $($wb.Sheets.Count)"
    for ($i = 1; $i -le $wb.Sheets.Count; $i++) {
        $ws = $wb.Sheets.Item($i)
        $rCount = $ws.UsedRange.Rows.Count
        $cCount = $ws.UsedRange.Columns.Count
        Write-Output "`n=========================================="
        Write-Output "Sheet $i : $($ws.Name) (Rows: $rCount, Cols: $cCount)"
        Write-Output "=========================================="
        for ($r = 1; $r -le [Math]::Min(10, $rCount); $r++) {
            $vals = @()
            for ($c = 1; $c -le [Math]::Min(25, $cCount); $c++) {
                $vals += $ws.Cells.Item($r, $c).Text
            }
            Write-Output ("Row {0:D2}: {1}" -f $r, ($vals -join ' | '))
        }
    }
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}

$f = 'd:\My Projects\carecast-command-main\src\components\patient-portal.tsx'
$t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)

# The corrupted em-dash is chars: U+00E2 U+20AC U+201D (â€")
$badDash = [string][char]0x00E2 + [string][char]0x20AC + [string][char]0x201D

$t = $t.Replace('Offline ' + $badDash + ' saved locally', 'Offline — saved locally')
$t = $t.Replace('Backend Offline ' + $badDash + ' saved locally on this device.', 'Backend offline — reports saved locally on this device.')
$t = $t.Replace('Backend Offline ' + $badDash + ' saved locally and synced when reconnected.', 'Backend offline — report will be saved locally and synced when reconnected.')
$t = $t.Replace('{selectedCause.label} ' + $badDash + ' Required Resources', '{selectedCause.label} — Required Resources')

[IO.File]::WriteAllText($f, $t, [Text.Encoding]::UTF8)
Write-Output 'Done'

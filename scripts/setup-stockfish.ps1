$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $projectRoot 'stockfish'
if (Test-Path -LiteralPath (Join-Path $destination 'stockfish-windows-x86-64-universal.exe')) {
  Write-Output 'Stockfish already present.'
  exit 0
}
$archive = Join-Path ([IO.Path]::GetTempPath()) ('toshachess-stockfish-' + [guid]::NewGuid() + '.zip')
$url = 'https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-windows-x86-64-universal.zip'
Invoke-WebRequest -Uri $url -OutFile $archive
$expected = '3c8bf1f9ea66a09350a40df4f632288285ac206d99f33ab5842c408fc30b48a7'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Stockfish archive checksum mismatch' }
Expand-Archive -LiteralPath $archive -DestinationPath $projectRoot -Force
if (!(Test-Path -LiteralPath (Join-Path $destination 'stockfish-windows-x86-64-universal.exe'))) { throw 'Stockfish executable not found after extraction' }
Write-Output 'Stockfish 19 installed with upstream source and license.'

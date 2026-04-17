# Script de configuracion automatica de Claude Code en VS Code
# Ejecutar UNA SOLA VEZ como administrador

Write-Host "Configurando Claude Code en VS Code para Senti..." -ForegroundColor Cyan

# 1. Instalar extension de Claude Code en VS Code
Write-Host "`n[1/3] Instalando extension Claude Code..." -ForegroundColor Yellow
try {
    code --install-extension anthropic.claude-code 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Extension instalada OK" -ForegroundColor Green
    } else {
        Write-Host "Intentando con ID alternativo..." -ForegroundColor Yellow
        code --install-extension Anthropic.claude-vscode 2>$null
    }
} catch {
    Write-Host "VS Code no encontrado en PATH - continua igual" -ForegroundColor Yellow
}

# 2. Verificar que claude esta instalado
Write-Host "`n[2/3] Verificando Claude Code CLI..." -ForegroundColor Yellow
$claudeVersion = & claude --version 2>$null
if ($claudeVersion) {
    Write-Host "Claude Code CLI: $claudeVersion" -ForegroundColor Green
} else {
    Write-Host "Instalando Claude Code CLI..." -ForegroundColor Yellow
    npm install -g @anthropic-ai/claude-code
}

# 3. Abrir VS Code con el proyecto Senti
Write-Host "`n[3/3] Abriendo VS Code con Senti..." -ForegroundColor Yellow
Set-Location "C:\Projects\senti"
code .

Write-Host "`nListo\! Cuando VS Code abra:" -ForegroundColor Green
Write-Host "  - Usa Ctrl+Shift+A para abrir Claude Code" -ForegroundColor White
Write-Host "  - O abre la terminal integrada y escribe: claude" -ForegroundColor White
Write-Host "  - Claude lee todos los archivos solo, sin pantallazos" -ForegroundColor White

Read-Host "`nPresiona Enter para cerrar"

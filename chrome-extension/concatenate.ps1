# ================================================
# SCRIPT DE CONCATENACIÓN PARA POKEREYE+
# ================================================
# 
# Este script combina pokersolver.js y main.js en un solo archivo
# para facilitar la carga en la consola de Chrome
#
# USO:
#   .\concatenate.ps1
#
# OUTPUT:
#   pokereye-combined.js (listo para copiar/pegar)
#
# ================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🎰 POKEREYE+ - Script de Concatenación          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if files exist
$pokersolverPath = "pokersolver.js"
$mainPath = "main.js"
$outputPath = "pokereye-combined.js"

if (-not (Test-Path $pokersolverPath)) {
    Write-Host "❌ ERROR: No se encuentra $pokersolverPath" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la carpeta chrome-extension" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $mainPath)) {
    Write-Host "❌ ERROR: No se encuentra $mainPath" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la carpeta chrome-extension" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Archivos encontrados:" -ForegroundColor Green
Write-Host "   ✅ $pokersolverPath" -ForegroundColor Gray
Write-Host "   ✅ $mainPath" -ForegroundColor Gray
Write-Host ""

# Get file sizes
$pokersolverSize = (Get-Item $pokersolverPath).Length / 1KB
$mainSize = (Get-Item $mainPath).Length / 1KB

Write-Host "📊 Tamaños de archivo:" -ForegroundColor Cyan
Write-Host "   pokersolver.js: $([math]::Round($pokersolverSize, 2)) KB" -ForegroundColor Gray
Write-Host "   main.js: $([math]::Round($mainSize, 2)) KB" -ForegroundColor Gray
Write-Host ""

# Create combined file
Write-Host "🔨 Concatenando archivos..." -ForegroundColor Yellow

$header = @"
// ================================================
// POKEREYE+ WITH POKERSOLVER - COMBINED FILE
// ================================================
// 
// Este archivo combina:
// - pokersolver.js (evaluación de manos de poker)
// - main.js (PokerEye+ core)
//
// Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
// 
// INSTRUCCIONES:
// 1. Abre la consola de Chrome en Ignition Casino
// 2. Copia TODO este archivo (Ctrl+A, Ctrl+C)
// 3. Pega en la consola (Ctrl+V)
// 4. Presiona Enter
// 5. Espera mensaje de confirmación
//
// VERIFICACIÓN:
// Ejecuta: checkIntegration()
//
// ================================================

console.log('🎰 Cargando PokerEye+ con PokerSolver...');

"@

$separator = @"


// ================================================
// MAIN.JS - POKEREYE+ CORE
// ================================================

"@

# Combine files
$header | Out-File $outputPath -Encoding UTF8
Get-Content $pokersolverPath | Out-File $outputPath -Append -Encoding UTF8
$separator | Out-File $outputPath -Append -Encoding UTF8
Get-Content $mainPath | Out-File $outputPath -Append -Encoding UTF8

# Add verification footer
$footer = @"


// ================================================
// VERIFICATION FUNCTION
// ================================================

window.checkIntegration = function() {
  console.log('\n🔍 Verificando integración...\n');
  
  const checks = {
    'PokerSolver disponible': !!window.PokerSolver,
    'PokerSolver.Hand existe': !!(window.PokerSolver && window.PokerSolver.Hand),
    'myPlayer existe': !!window.myPlayer,
    'evaluatePostflopHand existe': !!(window.myPlayer && window.myPlayer.evaluatePostflopHand),
  };
  
  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    const icon = passed ? '✅' : '❌';
    console.log(`\${icon} \${check}: \${passed ? 'OK' : 'FALTA'}`);
    if (!passed) allPassed = false;
  }
  
  if (allPassed) {
    console.log('\n🎉 PokerEye+ cargado correctamente!');
    
    // Quick test
    try {
      const testHand = window.PokerSolver.Hand.solve(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
      console.log(`✅ Test: \${testHand.descr}`);
    } catch (error) {
      console.error('❌ Error en test:', error);
    }
  } else {
    console.log('\n⚠️ Algunos componentes no se cargaron correctamente');
  }
};

console.log('✅ PokerEye+ con PokerSolver cargado');
console.log('💡 Ejecuta checkIntegration() para verificar');

"@

$footer | Out-File $outputPath -Append -Encoding UTF8

# Get combined file size
$combinedSize = (Get-Item $outputPath).Length / 1KB

Write-Host "✅ Archivo combinado creado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Resultado:" -ForegroundColor Cyan
Write-Host "   📄 Archivo: $outputPath" -ForegroundColor Gray
Write-Host "   📦 Tamaño: $([math]::Round($combinedSize, 2)) KB" -ForegroundColor Gray
Write-Host "   📈 Total: $([math]::Round($pokersolverSize + $mainSize, 2)) KB → $([math]::Round($combinedSize, 2)) KB" -ForegroundColor Gray
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 LISTO PARA USAR                              ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                  ║" -ForegroundColor Green
Write-Host "║  OPCIÓN 1 (Recomendada):                        ║" -ForegroundColor Green
Write-Host "║  ────────────────────────────────────────────    ║" -ForegroundColor Green
Write-Host "║  Get-Content pokereye-combined.js | clip        ║" -ForegroundColor White
Write-Host "║  (Copia automáticamente al portapapeles)         ║" -ForegroundColor Green
Write-Host "║                                                  ║" -ForegroundColor Green
Write-Host "║  OPCIÓN 2:                                       ║" -ForegroundColor Green
Write-Host "║  ────────────────────────────────────────────    ║" -ForegroundColor Green
Write-Host "║  1. Abre pokereye-combined.js                   ║" -ForegroundColor White
Write-Host "║  2. Ctrl+A (seleccionar todo)                   ║" -ForegroundColor White
Write-Host "║  3. Ctrl+C (copiar)                             ║" -ForegroundColor White
Write-Host "║  4. Pega en consola Chrome (Ctrl+V)             ║" -ForegroundColor White
Write-Host "║  5. Presiona Enter                              ║" -ForegroundColor White
Write-Host "║                                                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Offer to copy to clipboard
$copy = Read-Host "¿Copiar al portapapeles ahora? (S/N)"
if ($copy -eq "S" -or $copy -eq "s") {
    Get-Content $outputPath | clip
    Write-Host ""
    Write-Host "✅ ¡Copiado al portapapeles!" -ForegroundColor Green
    Write-Host "   Ahora puedes pegar directamente en la consola de Chrome" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✨ ¡Listo! Disfruta PokerEye+ con PokerSolver" -ForegroundColor Cyan
Write-Host ""

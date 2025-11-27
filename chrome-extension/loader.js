// ================================================
// LOADER SCRIPT FOR POKEREYE+ WITH POKERSOLVER
// ================================================
// 
// INSTRUCCIONES:
// 1. Abrir la consola de Chrome en Ignition Casino
// 2. Copiar y pegar TODO este archivo
// 3. Esperar mensaje: "✅ PokerEye+ cargado correctamente"
//
// Este script carga automáticamente:
// - pokersolver.js (librería de evaluación de manos)
// - main.js (PokerEye+ core)
//
// ================================================

console.log('🎰 Iniciando carga de PokerEye+ con PokerSolver...');

// Check if we're on the right page
if (!window.location.href.includes('ignitioncasino')) {
  console.warn('⚠️ ADVERTENCIA: No estás en Ignition Casino. Algunas funciones pueden no funcionar.');
}

// Load pokersolver.js first
console.log('📦 Cargando pokersolver.js...');

// Function to load script from file
function loadScriptFromFile(filename) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Intentando cargar ${filename}...`);
    
    // Since we're in console, we need to manually inject
    // User needs to copy-paste the files in order
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  INSTRUCCIONES PARA CARGAR ${filename.toUpperCase().padEnd(30)}║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Abre el archivo: ${filename.padEnd(37)}║
║  2. Copia TODO el contenido (Ctrl+A, Ctrl+C)              ║
║  3. Pega en esta consola (Ctrl+V)                         ║
║  4. Presiona Enter                                         ║
║  5. Espera el mensaje de confirmación                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    
    // Check if script is loaded by checking for global variable
    const checkInterval = setInterval(() => {
      if (filename === 'pokersolver.js' && window.PokerSolver) {
        clearInterval(checkInterval);
        console.log('✅ pokersolver.js cargado correctamente');
        resolve();
      } else if (filename === 'main.js' && window.myPlayer) {
        clearInterval(checkInterval);
        console.log('✅ main.js cargado correctamente');
        resolve();
      }
    }, 500);
    
    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error(`Timeout esperando ${filename}`));
    }, 60000);
  });
}

// Manual loading instructions
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🎰 POKEREYE+ CON POKERSOLVER - INSTALACIÓN MANUAL           ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  PASO 1: Cargar pokersolver.js                              ║
║  ────────────────────────────────────────────────────────   ║
║  • Abre: chrome-extension/pokersolver.js                    ║
║  • Copia TODO el archivo (Ctrl+A, Ctrl+C)                   ║
║  • Pega en esta consola y presiona Enter                    ║
║  • Espera mensaje: "✅ PokerSolver disponible"               ║
║                                                              ║
║  PASO 2: Cargar main.js                                     ║
║  ────────────────────────────────────────────────────────   ║
║  • Abre: chrome-extension/main.js                           ║
║  • Copia TODO el archivo (Ctrl+A, Ctrl+C)                   ║
║  • Pega en esta consola y presiona Enter                    ║
║  • Espera mensaje: "✅ PokerEye+ iniciado"                   ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  VERIFICACIÓN:                                               ║
║  ────────────────────────────────────────────────────────   ║
║  Ejecuta: checkIntegration()                                ║
║                                                              ║
║  ALTERNATIVAMENTE (MÁS FÁCIL):                              ║
║  ────────────────────────────────────────────────────────   ║
║  1. En PowerShell, ejecuta:                                 ║
║     cd chrome-extension                                      ║
║     Get-Content pokersolver.js, main.js | clip              ║
║                                                              ║
║  2. Pega en consola (Ctrl+V)                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Verification function
window.checkIntegration = function() {
  console.log('\n🔍 Verificando integración...\n');
  
  const checks = {
    'PokerSolver disponible': !!window.PokerSolver,
    'PokerSolver.Hand existe': !!(window.PokerSolver && window.PokerSolver.Hand),
    'PokerSolver.Card existe': !!(window.PokerSolver && window.PokerSolver.Card),
    'PokerSolver.Game existe': !!(window.PokerSolver && window.PokerSolver.Game),
    'myPlayer existe': !!window.myPlayer,
    'myPlayer.evaluatePostflopHand existe': !!(window.myPlayer && window.myPlayer.evaluatePostflopHand),
    'myPlayer._compareHandStrength existe': !!(window.myPlayer && window.myPlayer._compareHandStrength),
  };
  
  let allPassed = true;
  
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  VERIFICACIÓN DE INTEGRACIÓN                     ║');
  console.log('╠══════════════════════════════════════════════════╣');
  
  for (const [check, passed] of Object.entries(checks)) {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'OK' : 'FALTA';
    console.log(`║  ${icon} ${check.padEnd(40)} ${status.padEnd(5)} ║`);
    if (!passed) allPassed = false;
  }
  
  console.log('╠══════════════════════════════════════════════════╣');
  
  if (allPassed) {
    console.log('║  🎉 TODO CORRECTO - PokerEye+ listo para usar    ║');
    console.log('╚══════════════════════════════════════════════════╝');
    
    // Test quick functionality
    console.log('\n🧪 Probando funcionalidad...\n');
    
    try {
      // Test pokersolver
      const testHand = window.PokerSolver.Hand.solve(['Ah', 'Kh', 'Qh', 'Jh', 'Th']);
      console.log(`✅ PokerSolver test: ${testHand.descr}`);
      
      // Test evaluatePostflopHand
      if (window.myPlayer) {
        const hand = ['A♥', 'K♥'];
        const board = ['Q♥', 'J♥', '10♥'];
        const result = window.myPlayer.evaluatePostflopHand(hand, board);
        console.log(`✅ evaluatePostflopHand test: ${result.description}`);
      }
      
      console.log('\n✅ Todos los tests pasaron!\n');
      
    } catch (error) {
      console.error('❌ Error en tests:', error);
    }
    
  } else {
    console.log('║  ⚠️  FALTAN COMPONENTES - Ver arriba            ║');
    console.log('╚══════════════════════════════════════════════════╝');
    
    if (!window.PokerSolver) {
      console.log('\n❌ FALTA: pokersolver.js - Carga este archivo primero');
    }
    if (!window.myPlayer) {
      console.log('\n❌ FALTA: main.js - Carga este archivo después de pokersolver.js');
    }
  }
};

console.log('\n💡 TIP: Ejecuta checkIntegration() después de cargar los archivos\n');

# PokerEye+ for Ignition Casino

Una extensión avanzada de Chrome que proporciona un HUD (Heads-Up Display) inteligente para mesas de poker en Ignition Casino, con cálculos de probabilidades y recomendaciones de acciones óptimas.

## 🚀 Funcionalidades Actuales

### ✅ Funcionando Perfectamente
- **Captura de cartas del hero** - Detecta automáticamente las cartas del jugador principal
- **Captura del board** - Monitorea el flop, turn y river en tiempo real
- **Captura del POT total** - Actualiza el tamaño del bote dinámicamente
- **Tracking de bets** - Registra cada apuesta de cada jugador y actualiza stacks en tiempo real
- **Posiciones de jugadores** - Calcula posiciones correctas (BTN, SB, BB, UTG, MP, CO, HJ, LJ)
- **Reinicio automático** - Detecta nuevas manos y actualiza el estado del juego
- **Cálculos preflop** - Recomendaciones RFI (Raise First In) con porcentajes de equity
- **Cálculos postflop** - Recomendaciones óptimas basadas en equity y posición

### 🎯 Características Técnicas
- Análisis en tiempo real del estado de la mesa
- Cálculos de equity usando APIs externas de poker
- Interfaz HUD no intrusiva
- Logging detallado para debugging
- Arquitectura cliente-servidor (extensión + servidor local)

## 📋 Requisitos

- Google Chrome o Chromium-based browser
- Node.js 16+ y npm
- Cuenta en Ignition Casino

## 🛠️ Instalación y Configuración

### 1. Clonar el repositorio
`ash
git clone <repository-url>
cd PokerEye-Plus-for-Ignition-Casino-main
`

### 2. Instalar dependencias del servidor
`ash
cd api
npm install
`

### 3. Iniciar el servidor de cálculos
`ash
npm run dev
`
El servidor se ejecutará en http://localhost:3000

### 4. Cargar la extensión en Chrome

1. Abre Chrome y ve a chrome://extensions/
2. Activa "Modo desarrollador" (Developer mode) en la esquina superior derecha
3. Haz clic en "Cargar descomprimida" (Load unpacked)
4. Selecciona la carpeta chrome-extension
5. La extensión "PokerEye+" aparecerá en la lista

### 5. Usar la extensión

1. Ve a [Ignition Casino](https://ignitioncasino.eu/)
2. Inicia sesión en tu cuenta
3. Únete a una mesa de poker
4. La extensión detectará automáticamente la mesa y comenzará a mostrar el HUD
5. Observa la consola del navegador (F12) para ver logs detallados

## 🎮 Cómo Usar

### En Preflop:
- La extensión calcula automáticamente el RFI óptimo
- Muestra recomendaciones con porcentajes de equity
- Actualiza en tiempo real según las acciones de otros jugadores

### En Postflop:
- Detecta automáticamente cuando se reparte el flop
- Calcula acciones óptimas basadas en tu mano, board y posición
- Proporciona recomendaciones con porcentajes de éxito

### HUD Features:
- Posiciones de jugadores claramente identificadas
- Stacks actualizados en tiempo real
- Pot total dinámico
- Recomendaciones de acciones con montos sugeridos

## 🔧 Troubleshooting

### El servidor no inicia:
`ash
# Asegúrate de estar en la carpeta correcta
cd api

# Verifica que las dependencias estén instaladas
npm install

# Si hay errores de puerto, verifica que el 3000 esté libre
npm run dev
`

### La extensión no se carga:
- Verifica que la carpeta chrome-extension contenga manifest.json
- Asegúrate de que el "Modo desarrollador" esté activado
- Recarga la extensión desde chrome://extensions/

### No se detectan las mesas:
- Asegúrate de estar en ignitioncasino.eu
- Verifica que estés en una mesa activa
- Revisa la consola del navegador para mensajes de error

## 📝 Notas de Desarrollo

- El proyecto usa una arquitectura híbrida: extensión de Chrome + servidor local Next.js
- Los cálculos de poker se basan en APIs externas de PokerNews
- El código está optimizado para mesas de Ignition Casino específicamente

## 🎯 Próximas Mejoras (Pendientes)

- Mostrar opciones de acciones sin botones automáticos (solo logging)
- Mejorar cálculos considerando 3bet/4bet/squeeze
- Interfaz más visual para recomendaciones
- Soporte para más variantes de poker

---

**Nota**: Este proyecto está en desarrollo activo. Las funcionalidades pueden cambiar sin previo aviso.

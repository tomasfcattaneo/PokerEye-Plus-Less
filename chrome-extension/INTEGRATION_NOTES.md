# PokerSolver Integration Notes

## Archivos Modificados

### 1. `pokersolver.js` (NUEVO)
- Librería pokersolver v2.1.2 integrada
- Simplificada para incluir solo clases necesarias
- Exporta como `window.PokerSolver`

### 2. `main.js` (MODIFICADO)

#### Función: `evaluatePostflopHand(hand, board)`
**ANTES:** Evaluación manual con ~40 líneas de código
**DESPUÉS:** Usa pokersolver con fallback
- Convierte cartas al formato pokersolver ('Ah', 'Td', etc.)
- Mapea símbolos de suits (♥→h, ♦→d, ♣→c, ♠→s)
- Normaliza 10→T
- Retorna mismo formato: `{ type, strength, description, rank, cards }`
- Incluye `solvedHand` para comparaciones avanzadas

#### Función: `_compareHandStrength(hand1, hand2, board)`
**ANTES:** Usa EquityCalculator._evaluateHand() 
**DESPUÉS:** Usa pokersolver.Hand.compare()
- Más preciso con kickers
- Maneja edge cases (wheel, etc.)
- Fallback a método anterior si falla

#### Funciones Nuevas:
- `_evaluatePostflopHandFallback()` - Backup si pokersolver falla
- `_hasStraightFallback()` - Helper para fallback

**Última actualización**: 2025-11-24
**Versión**: 1.0.0
**Estado**: ✅ FUNCIONAL - Probado en dev

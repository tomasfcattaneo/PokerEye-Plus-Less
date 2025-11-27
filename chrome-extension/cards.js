;(function(){
  // Central card utilities for PokerEye
  // Canonical internal representation: rank as '2'..'10','J','Q','K','A' and suits 'h','d','c','s'
  // Provide conversions to solver format (PokerSolver expects 'T' for ten) and helpers to expand ranges.

  function _normalizeRankChar(r) {
    if (!r) return r;
    const s = String(r).toUpperCase();
    if (s === 'T') return '10';
    return s;
  }

  function normalizeCard(card) {
    if (!card) return card;
    const s = String(card).trim();
    // Accept forms: 'Ah', 'As', '10h', 'Th', 'AH', 'aH', 'A♥', '10♣'
    if (s.length === 2) {
      const r = s[0].toUpperCase();
      const suit = s[1].toLowerCase();
      if (r === 'T') return '10' + suit; // normalize T -> 10
      return _normalizeRankChar(r) + suit;
    }
    // length >=3 (e.g. '10h' or 'A♥')
    const rankRaw = s.slice(0, -1);
    let suit = s.slice(-1);
    // normalize suit symbols
    const suitMap = { '♥': 'h', '♦': 'd', '♣': 'c', '♠': 's' };
    suit = suitMap[suit] || suit.toLowerCase();
    const rank = rankRaw.toUpperCase();
    if (rank === 'T') return '10' + suit;
    if (rank === '10') return '10' + suit;
    return rank + suit;
  }

  function normalizeHand(hand) {
    if (!Array.isArray(hand)) return null;
    return hand.map(normalizeCard);
  }

  function normalizeBoard(board) {
    if (!Array.isArray(board)) return [];
    return board.map(normalizeCard);
  }

  // Convert to PokerSolver-style card (rank 'T' for ten, suits h/d/c/s)
  function toSolverCard(card) {
    if (!card) return card;
    // Accept both canonical and loose formats
    const s = String(card).trim();
    const suitMap = { '♥': 'h', '♦': 'd', '♣': 'c', '♠': 's' };
    let value = s.slice(0, -1).toUpperCase();
    let suit = s.slice(-1);
    suit = suitMap[suit] || suit.toLowerCase();
    if (value === '10') value = 'T';
    if (value === 'T') value = 'T';
    return value + suit;
  }

  function toSolverHand(cards) {
    if (!Array.isArray(cards)) return [];
    return cards.map(toSolverCard);
  }

  // Hand to range format (delegates to PositionStrategy if available)
  function handToRangeFormat(hand) {
    try {
      if (window.PositionStrategy && typeof window.PositionStrategy.handToRangeFormat === 'function') {
        return window.PositionStrategy.handToRangeFormat(hand);
      }
    } catch (e) {}
    // Fallback: derive from cards
    if (!hand || hand.length !== 2) return null;
    const r1 = String(hand[0]).replace('10','T').slice(0, -1);
    const r2 = String(hand[1]).replace('10','T').slice(0, -1);
    const s1 = String(hand[0]).slice(-1);
    const s2 = String(hand[1]).slice(-1);
    const sortOrder = 'AKQJT98765432';
    const sorted = [r1, r2].sort((a,b)=> sortOrder.indexOf(a) - sortOrder.indexOf(b));
    const suffix = r1 === r2 ? '' : (s1 === s2 ? 's' : 'o');
    return `${sorted[0]}${sorted[1]}${suffix}`;
  }

  function expandRange(rangeNotations) {
    try {
      if (window.PositionStrategy && typeof window.PositionStrategy.expandRange === 'function') {
        return window.PositionStrategy.expandRange(rangeNotations);
      }
    } catch (e) {}
    // Fallback: return input as-is (assume already expanded)
    return Array.isArray(rangeNotations) ? rangeNotations : [];
  }

  window.PokerEyeCards = {
    normalizeCard,
    normalizeHand,
    normalizeBoard,
    toSolverCard,
    toSolverHand,
    handToRangeFormat,
    expandRange
  };

})();

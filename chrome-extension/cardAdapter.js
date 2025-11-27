(function(){
  // Backwards-compatible wrapper: prefer centralized PokerEyeCards when available
  function fallbackNormalizeCard(card) {
    if (!card) return card;
    const s = String(card).trim();
    if (s.length === 2) {
      const r = s[0].toUpperCase();
      const suit = s[1].toLowerCase();
      if (r === 'T') return '10' + suit;
      return r + suit;
    }
    const rank = s.slice(0, -1).toUpperCase();
    const suit = s.slice(-1).toLowerCase();
    if (rank === 'T') return '10' + suit;
    return rank + suit;
  }

  const adapter = {
    normalizeCard: (c) => { try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(c); } catch (e) {} return fallbackNormalizeCard(c); },
    normalizeHand: (h) => { try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeHand === 'function') return window.PokerEyeCards.normalizeHand(h); } catch (e) {} return Array.isArray(h) ? h.map(fallbackNormalizeCard) : null; },
    normalizeBoard: (b) => { try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeBoard === 'function') return window.PokerEyeCards.normalizeBoard(b); } catch (e) {} return Array.isArray(b) ? b.map(fallbackNormalizeCard) : []; },
    handsToCardGroups: (hands) => { try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeHand === 'function') return (hands || []).map(h => window.PokerEyeCards.normalizeHand(h)); } catch (e) {} return (hands || []).map(h => Array.isArray(h) ? h.map(fallbackNormalizeCard) : null); }
  };

  window.PokerEyeCardAdapter = adapter;
})();

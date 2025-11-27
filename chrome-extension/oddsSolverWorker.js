// oddsSolverWorker.js
// Worker that loads a PokerSolver script (path provided during init) and evaluates hands using PokerSolver
let solverLoaded = false;

self.addEventListener('message', (ev) => {
  const m = ev.data;
  if (!m || !m.type) return;

  if (m.type === 'init') {
    const solverUrl = m.pokerSolverUrl;
    try {
      importScripts(solverUrl);
      solverLoaded = !!(self.PokerSolver && self.PokerSolver.Hand);
      self.postMessage({ type: 'init', ok: solverLoaded });
    } catch (e) {
      solverLoaded = false;
      self.postMessage({ type: 'init', ok: false, error: String(e) });
    }
    return;
  }

  if (m.type === 'evalHands') {
    // m.hands: array of arrays like [['Ah','Kh', '2h','7d','Tc','..'], ...] each a full 5+2=7 cards
    if (!solverLoaded) {
      self.postMessage({ type: 'evalHands', error: 'Solver not loaded' });
      return;
    }

    try {
      const results = m.hands.map(handCards => {
        // Convert ranks: ensure '10' -> 'T' for PokerSolver if necessary
        // Convert ranks: ensure '10' -> 'T' for PokerSolver if necessary
        const conv = handCards.map(c => {
          if (!c || typeof c !== 'string') return c;
          // try to reuse a centralized conversion if present (in worker we cannot access window of page, so fallback to inline)
          try {
            if (self.PokerEyeCards && typeof self.PokerEyeCards.toSolverHand === 'function') {
              // toSolverHand expects array; but we'll call toSolverCard per element
              return self.PokerEyeCards.toSolverHand([c])[0];
            }
          } catch (e) {}
          const rank = c.slice(0, -1).toUpperCase();
          const suit = c.slice(-1).toLowerCase();
          const r = (rank === '10') ? 'T' : rank;
          return r + suit;
        });
        const solved = self.PokerSolver.Hand.solve(conv);
        return { pretty: solved.toString(), rankValue: solved.rank, evalObj: solved };
      });
      self.postMessage({ type: 'evalHands', results: results, id: m.id });
    } catch (e) {
      self.postMessage({ type: 'evalHands', error: String(e) });
    }
    return;
  }

});

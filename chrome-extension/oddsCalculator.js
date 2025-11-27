(function(){
  // Lightweight Odds Calculator wrapper for the extension.
  // Uses the existing EquityCalculator internal functions in main.js when available.
  // Exposes: window.PokerEyeOdds.calculate(cardGroups, board, variant, iterations, onProgress)
  // - cardGroups: Array of player hands: [ ['Ah','Kh'], ['Qc','Qs'], ... ]
  // - board: Array of board cards (0,3,4,5) e.g. ['2h','7d','Tc']
  // - variant: 'full' | 'short' (ignored for now)
  // - iterations: number of MonteCarlo iterations (optional)
  // - onProgress: optional callback(progressFraction, interimResult)

  function normalizeCard(card) {
    // Prefer centralized adapter when available
    try {
      if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(card);
    } catch (e) {}
    if (!card || typeof card !== 'string') return card;
    const s = card.trim();
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

  function normalizeHand(hand) {
    return hand.map(normalizeCard);
  }

  function createDeckExcluding(knownCards) {
    // Try to reuse EquityCalculator._createDeck if available (it also shuffles)
    if (window.EquityCalculator && typeof window.EquityCalculator._createDeck === 'function') {
      return window.EquityCalculator._createDeck(knownCards || []);
    }

    // Fallback simple deck
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const suits = ['h','d','c','s'];
    const deck = [];
    for (const r of ranks) for (const s of suits) {
      const card = r + s;
      if (!((knownCards||[]).includes(card))) deck.push(card);
    }
    // Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function evaluate7(cards) {
    // cards: array of 7 strings (hole+board)
    if (window.EquityCalculator && typeof window.EquityCalculator._evaluateHand === 'function') {
      return window.EquityCalculator._evaluateHand(cards);
    }
    // Fallback simple evaluator: use naive ranking by string (very crude)
    // This fallback is only a last-resort; encourage using EquityCalculator present in main.js
    return cards.join('|').length;
  }

  async function calculate(cardGroups, board = [], variant = 'full', iterations = 10000, onProgress = null) {
    // Overload: allow passing a config object { hero: [...], numOpponents: N }
    let players = null;
    let numOpponents = 0;

    if (cardGroups && typeof cardGroups === 'object' && !Array.isArray(cardGroups) && cardGroups.hero) {
      // config mode: simulate hero vs N random opponents
      const heroHand = normalizeHand(cardGroups.hero || []);
      numOpponents = Number(cardGroups.numOpponents) || 1;
      players = [heroHand];
      // Optionally accept villainRanges: array of range notations per opponent (e.g. [['AKs','QQ'], ['...']])
      var villainRanges = cardGroups.villainRanges || null;
      // We'll treat opponents as random each iteration (no fixed hole cards)
      // Mark mode for internal use
      cardGroups = { _randomOpponents: true, _villainRanges: villainRanges };
    } else {
      // Normalize inputs
      if (!Array.isArray(cardGroups) || cardGroups.length === 0) {
        throw new Error('cardGroups must be an array with at least one hand');
      }
      players = cardGroups.map(h => normalizeHand(h));
      numOpponents = Math.max(0, players.length - 1);
    }
    const knownBoard = (board || []).map(normalizeCard);

    // Build known cards set
    const known = new Set();
    players.forEach(h => h.forEach(c => known.add(c)));
    knownBoard.forEach(c => known.add(c));

    // If board is already complete (5 cards) do a deterministic showdown
    if (knownBoard.length === 5) {
      const ranks = players.map(h => evaluate7([...h, ...knownBoard]));
      // Determine winners/ties
      const maxRank = Math.max(...ranks);
      const results = players.map((_, i) => ({ wins: 0, ties: 0 }));
      const winners = ranks.reduce((acc, r, idx) => { if (r === maxRank) acc.push(idx); return acc; }, []);
      if (winners.length === 1) {
        const idx = winners[0];
        results[idx].wins = 1;
      } else {
        winners.forEach(i => results[i].ties = 1);
      }
      // Convert to equity percentages
      const out = results.map(r => ({ equity: r.wins * 100 + r.ties * (100 / winners.length) }));
      return { method: 'showdown', iterations: 1, results: out };
    }

  // Monte Carlo: simulate runouts
  const cardsNeeded = 5 - knownBoard.length;
  const iter = iterations || 5000;
  const wins = new Array(players.length).fill(0);
  const ties = new Array(players.length).fill(0);

  const knownArray = Array.from(known);

    const randomOpponentsMode = !!(cardGroups && cardGroups._randomOpponents);
    const configuredVillainRanges = cardGroups && cardGroups._villainRanges ? cardGroups._villainRanges : null;
    // If ranges provided, expand them via PositionStrategy.expandRange if available
    let expandedVillainRanges = null;
    if (configuredVillainRanges && Array.isArray(configuredVillainRanges)) {
      expandedVillainRanges = configuredVillainRanges.map(r => {
        try {
          if (window.PositionStrategy && typeof window.PositionStrategy.expandRange === 'function') {
            return window.PositionStrategy.expandRange(Array.isArray(r) ? r : [r]);
          }
        } catch (e) {}
        // fallback: if r is an array of hands already, return as-is
        return Array.isArray(r) ? r : [];
      });
    }

    // Determine per-iteration batches to yield to UI
    const batchSize = 500;
    const numBatches = Math.ceil(iter / batchSize);

    let simulated = 0;
    for (let b = 0; b < numBatches; b++) {
      const currentBatch = Math.min(batchSize, iter - b * batchSize);
      for (let k = 0; k < currentBatch; k++) {
        const deck = createDeckExcluding(knownArray);
        // draw runout
        const runout = [];
        for (let i = 0; i < cardsNeeded; i++) runout.push(deck.pop());
        const fullBoard = [...knownBoard, ...runout];

        // Prefer using PokerSolver when available (for accurate showdown evaluation)
        const pokerSolverAvailable = !!(window.PokerSolver && window.PokerSolver.Hand && typeof window.PokerSolver.Hand.solve === 'function');

        if (randomOpponentsMode && pokerSolverAvailable) {
          // Use PokerSolver to evaluate hero vs sampled opponents (optionally from ranges)
          // Prefer centralized adapter to convert cards to solver format
          const heroCards = (window.PokerEyeCards && typeof window.PokerEyeCards.toSolverHand === 'function')
            ? window.PokerEyeCards.toSolverHand([...players[0], ...fullBoard])
            : [...players[0], ...fullBoard].map(c => {
                if (!c) return c;
                const rank = c.slice(0, -1).toUpperCase();
                const suit = c.slice(-1).toLowerCase();
                const r = (rank === '10') ? 'T' : rank;
                return r + suit;
              });
          const heroSolved = window.PokerSolver.Hand.solve(heroCards);

          let anyBetter = false;
          let anyEqual = false;

          // prepare a temporary deck for sampling when ranges not provided
          let tempDeckBase = createDeckExcluding(knownArray);

          for (let oi = 0; oi < numOpponents; oi++) {
            let oppHand = null;
            // If expanded ranges exist for this opponent, sample from them (ensuring available cards)
            if (expandedVillainRanges && expandedVillainRanges[oi] && expandedVillainRanges[oi].length > 0) {
              const possible = expandedVillainRanges[oi];
              // try to pick one that's available in deck
              for (let attempt = 0; attempt < possible.length; attempt++) {
                const candidate = possible[Math.floor(Math.random() * possible.length)];
                const c1 = candidate[0];
                const c2 = candidate[1];
                if (!knownArray.includes(c1) && !knownArray.includes(c2)) {
                  oppHand = [c1, c2];
                  break;
                }
              }
            }

            if (!oppHand) {
              // fallback sample random from temp deck base
              if (tempDeckBase.length < 2) tempDeckBase = createDeckExcluding(knownArray);
              const c1 = tempDeckBase.pop();
              const c2 = tempDeckBase.pop();
              oppHand = [c1, c2];
            }

            const oppCards = [...oppHand, ...fullBoard].map(convertCardForSolver);
            const oppSolved = window.PokerSolver.Hand.solve(oppCards);
            const comp = heroSolved.compare(oppSolved); // compare: -1 hero wins, 0 tie, 1 hero loses
            if (comp === 1) { anyBetter = true; break; }
            if (comp === 0) anyEqual = true;
          }

          // Determine outcome for hero
          if (!anyBetter && !anyEqual) {
            wins[0]++;
          } else if (!anyBetter && anyEqual) {
            ties[0]++;
          } else {
            // hero lost: do nothing to wins/ties (other players implicitly get the win)
          }

        } else if (randomOpponentsMode) {
          // players[0] is hero, simulate random opponent hands for this iteration (no solver)
          const heroRank = evaluate7([...players[0], ...fullBoard]);
          // sample opponent hands from deck
          const oppRanks = [];
          let tempDeck = [...createDeckExcluding(knownArray)];
          for (let oi = 0; oi < numOpponents; oi++) {
            // draw two cards for opponent
            const c1 = tempDeck.pop();
            const c2 = tempDeck.pop();
            const oppRank = evaluate7([c1, c2, ...fullBoard]);
            oppRanks.push(oppRank);
          }
          const ranksLocal = [heroRank, ...oppRanks];
          const maxRank = Math.max(...ranksLocal);
          const winners = ranksLocal.reduce((acc, r, idx) => { if (r === maxRank) acc.push(idx); return acc; }, []);
          if (winners.length === 1) {
            if (winners[0] === 0) wins[0]++; else { /* opponent won - nothing to increment for hero */ }
          } else {
            // if hero is among winners, count tie for hero
            if (winners.includes(0)) ties[0]++; else { /* opponent(s) tied/won */ }
          }

        } else {
          const ranksLocal = players.map(h => evaluate7([...h, ...fullBoard]));
          const maxRank = Math.max(...ranksLocal);
          const winners = ranksLocal.reduce((acc, r, idx) => { if (r === maxRank) acc.push(idx); return acc; }, []);
          if (winners.length === 1) {
            wins[winners[0]]++;
          } else {
            winners.forEach(i => ties[i]++);
          }
        }

        simulated++;
      }

      // Progress callback
      if (typeof onProgress === 'function') {
        const interim = players.map((_, i) => ({ wins: wins[i], ties: ties[i], samples: simulated }));
        try { onProgress(Math.min(1, simulated / iter), interim); } catch (e) {}
      }

      // yield to UI
      await new Promise(r => setTimeout(r, 0));
    }

    const results = players.map((_, i) => {
      const totalEquity = (wins[i] + ties[i] * 0.5) / simulated * 100;
      return { equity: totalEquity, wins: wins[i], ties: ties[i], samples: simulated };
    });

    return { method: 'monte_carlo', iterations: simulated, results };
  }

  // Expose
  window.PokerEyeOdds = {
    calculate,
    _normalizeCard: normalizeCard
  };
})();

// If running in a page context, provide a helper to load the worker
(function(){
  window.PokerEyeOdds._useWorker = true;
  window.PokerEyeOdds._worker = null;
  window.PokerEyeOdds._ensureWorker = function() {
    try {
      if (window.PokerEyeOdds._worker) return window.PokerEyeOdds._worker;
      // Create a blob URL for the worker script path relative to extension
      // Try to fetch the worker file via fetch to inline it if needed
      const workerUrl = chrome?.runtime?.getURL ? chrome.runtime.getURL('chrome-extension/oddsWorker.js') : 'chrome-extension/oddsWorker.js';
      const w = new Worker(workerUrl);
      window.PokerEyeOdds._worker = w;
      return w;
    } catch (e) {
      console.warn('[PokerEyeOdds] Worker creation failed, falling back to main thread', e);
      window.PokerEyeOdds._useWorker = false;
      return null;
    }
  };

  // New calculate wrapper that uses worker when available
  const _origCalculate = window.PokerEyeOdds.calculate;
  window.PokerEyeOdds.calculate = async function(cardGroupsOrConfig, board = [], variant = 'full', iterations = 10000, onProgress = null) {
    // If caller supplied { validateWithPokerSolver: true } in config use main-thread validation later
    let cfgMode = false;
    let config = null;
    if (cardGroupsOrConfig && typeof cardGroupsOrConfig === 'object' && !Array.isArray(cardGroupsOrConfig) && cardGroupsOrConfig.hero) {
      cfgMode = true; config = cardGroupsOrConfig;
    }

    // If worker enabled and supported, dispatch to worker (heroMode)
    if (window.PokerEyeOdds._useWorker && typeof Worker !== 'undefined') {
      const worker = window.PokerEyeOdds._ensureWorker();
      if (worker) {
        return new Promise((resolve, reject) => {
          const id = Math.random().toString(36).slice(2);
          const onMsg = (ev) => {
            const m = ev.data;
            if (!m || m.id !== id) return;
            if (m.type === 'progress') {
              if (typeof onProgress === 'function') onProgress(m.progress, m.interim);
            } else if (m.type === 'result') {
              worker.removeEventListener('message', onMsg);
              // Optionally validate small-sample with PokerSolver
              if (config && config.validateWithPokerSolver && window.PokerSolver && window.PokerSolver.Hand) {
                // run a small validation sample using PokerSolver in main thread
                try {
                  // For simplicity, call original calculate in main thread for a small number of iterations
                  _origCalculate(cardGroupsOrConfig, board, variant, Math.min(500, iterations), () => {}).then(val => {
                    m.result.meta = { validated: true };
                    resolve(Object.assign({}, m.result, { validated: val }));
                  }).catch(() => resolve(m.result));
                } catch (e) { resolve(m.result); }
              } else {
                resolve(m.result);
              }
            } else if (m.type === 'error') {
              worker.removeEventListener('message', onMsg);
              reject(new Error(m.error || 'Worker error'));
            }
          };
          worker.addEventListener('message', onMsg);

          // Prepare payload
          const payload = { type: 'simulate', id, config: {} };
          if (cfgMode) {
            payload.config.heroMode = true;
            payload.config.players = [ (config.hero||[]).map(c => {
              try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(c); } catch (e) {}
              try { if (window.PokerEyeOdds && typeof window.PokerEyeOdds._normalizeCard === 'function') return window.PokerEyeOdds._normalizeCard(c); } catch (e) {}
              return c;
            }) ];
            payload.config.numOpponents = config.numOpponents || 1;
            payload.config.villainRanges = config.villainRanges || null;
            payload.config.board = (board || []).map(c => {
              try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(c); } catch (e) {}
              try { if (window.PokerEyeOdds && typeof window.PokerEyeOdds._normalizeCard === 'function') return window.PokerEyeOdds._normalizeCard(c); } catch (e) {}
              return c;
            });
            payload.config.iterations = iterations;
            payload.config.knownArray = Array.from(new Set([].concat(payload.config.players[0]||[], payload.config.board||[])));
          } else {
            payload.config.players = (cardGroupsOrConfig || []).map(h => (h||[]).map(c => {
              try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(c); } catch (e) {}
              try { if (window.PokerEyeOdds && typeof window.PokerEyeOdds._normalizeCard === 'function') return window.PokerEyeOdds._normalizeCard(c); } catch (e) {}
              return c;
            }));
            payload.config.board = (board || []).map(c => {
              try { if (window.PokerEyeCards && typeof window.PokerEyeCards.normalizeCard === 'function') return window.PokerEyeCards.normalizeCard(c); } catch (e) {}
              try { if (window.PokerEyeOdds && typeof window.PokerEyeOdds._normalizeCard === 'function') return window.PokerEyeOdds._normalizeCard(c); } catch (e) {}
              return c;
            });
            payload.config.iterations = iterations;
            payload.config.knownArray = Array.from(new Set([].concat(...payload.config.players, payload.config.board)));
          }

          worker.postMessage(payload);
        });
      }
    }

    // Fallback: run original calculate on main thread
    return _origCalculate(cardGroupsOrConfig, board, variant, iterations, onProgress);
  };
})();

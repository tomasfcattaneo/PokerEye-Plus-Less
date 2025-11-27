// oddsWorker.js
// WebWorker implementing a fast Monte Carlo simulator for poker equity.
// Listens to messages {type: 'simulate', id, config}

self.addEventListener('message', async (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'simulate') return;
  const id = msg.id;
  const cfg = msg.config || {};

  try {
    const players = cfg.players || []; // array of hole hands or null when using hero+numOpponents
    const heroMode = cfg.heroMode || false; // if true, players[0] is hero and numOpponents provided
    const numOpponents = cfg.numOpponents || Math.max(0, (players.length - 1));
    const board = cfg.board || [];
    const iterations = Math.max(1, cfg.iterations || 5000);
    const batchSize = Math.max(64, cfg.batchSize || 500);
    const knownArray = cfg.knownArray || [];
    const villainRanges = cfg.villainRanges || null; // not expanded here

    // Utility: create deck excluding known cards
    function createDeckExcluding(excludeCards) {
      const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
      const suits = ['h','d','c','s'];
      const deck = [];
      for (const r of ranks) for (const s of suits) {
        const card = r + s;
        if (!((excludeCards||[]).includes(card))) deck.push(card);
      }
      // Fisher-Yates
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    // Simple evaluator port (fast but not bit-optimized) - adapted from main.js _evaluateHand/_rankHand
    function cardRankCharToNum(ch) {
      const rankMap = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'T':10,'J':11,'Q':12,'K':13,'A':14 };
      return rankMap[ch] || 0;
    }

    function _cardRank(rankStr) {
      return cardRankCharToNum(rankStr);
    }

    function _isStraight(ranks) {
      const sorted = Array.from(new Set(ranks)).sort((a,b)=>a-b);
      if (sorted.length < 5) return false;
      for (let i=0;i<=sorted.length-5;i++) if (sorted[i+4]-sorted[i]===4) return true;
      if (sorted.includes(14) && sorted.includes(2) && sorted.includes(3) && sorted.includes(4) && sorted.includes(5)) return true;
      return false;
    }

    function _rankHand(cards) {
      // cards: array of 5 strings like 'Ah','10d'
      const ranks = cards.map(c => _cardRank(c.slice(0, -1)));
      const suits = cards.map(c => c.slice(-1));
      const rankCounts = {};
      ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
      const counts = Object.values(rankCounts).sort((a,b)=>b-a);
      const uniqueRanks = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a);
      const isFlush = suits.every(s => s === suits[0]);
      const isStraight = _isStraight(ranks);
      if (isFlush && isStraight) return 9000000 + Math.max(...ranks);
      if (counts[0] === 4) {
        const quad = uniqueRanks.find(r => rankCounts[r]===4);
        const kicker = uniqueRanks.find(r => rankCounts[r]===1);
        return 8000000 + quad*100 + kicker;
      }
      if (counts[0]===3 && counts[1]===2) {
        const trip = uniqueRanks.find(r=>rankCounts[r]===3);
        const pair = uniqueRanks.find(r=>rankCounts[r]===2);
        return 7000000 + trip*100 + pair;
      }
      if (isFlush) return 6000000 + uniqueRanks.reduce((sum,r,i)=>sum + r * Math.pow(100,4-i),0);
      if (isStraight) return 5000000 + Math.max(...ranks);
      if (counts[0]===3) {
        const trip = uniqueRanks.find(r=>rankCounts[r]===3);
        const kickers = uniqueRanks.filter(r=>rankCounts[r]===1).sort((a,b)=>b-a);
        return 4000000 + trip*10000 + kickers[0]*100 + kickers[1];
      }
      if (counts[0]===2 && counts[1]===2) {
        const pairs = uniqueRanks.filter(r=>rankCounts[r]===2).sort((a,b)=>b-a);
        const kicker = uniqueRanks.find(r=>rankCounts[r]===1);
        return 3000000 + pairs[0]*10000 + pairs[1]*100 + kicker;
      }
      if (counts[0]===2) {
        const pair = uniqueRanks.find(r=>rankCounts[r]===2);
        const kickers = uniqueRanks.filter(r=>rankCounts[r]===1).sort((a,b)=>b-a);
        return 2000000 + pair*1000000 + kickers[0]*10000 + kickers[1]*100 + kickers[2];
      }
      return 1000000 + uniqueRanks.reduce((sum,r,i)=>sum + r * Math.pow(100,4-i),0);
    }

    function _getCombinations(arr, k) {
      const result = [];
      function helper(start, combo) {
        if (combo.length===k) { result.push([...combo]); return; }
        for (let i=start;i<arr.length;i++){ combo.push(arr[i]); helper(i+1, combo); combo.pop(); }
      }
      helper(0,[]);
      return result;
    }

    function evaluate7(cards) {
      if (cards.length !== 7) return 0;
      const combos = _getCombinations(cards,5);
      let best = 0;
      for (const c of combos) {
        const r = _rankHand(c);
        if (r > best) best = r;
      }
      return best;
    }

    // Simulation loop
    let wins = 0, ties = 0, losses = 0;
    let total = 0;
    const numBatches = Math.ceil(iterations / batchSize);

    for (let b=0;b<numBatches;b++) {
      const curBatch = Math.min(batchSize, iterations - b*batchSize);
      for (let i=0;i<curBatch;i++) {
        const deck = createDeckExcluding(knownArray);
        const cardsNeeded = 5 - board.length;
        const runout = [];
        for (let r=0;r<cardsNeeded;r++) runout.push(deck.pop());
        const fullBoard = [...board, ...runout];

        if (heroMode) {
          // players[0] is hero
          const heroRank = evaluate7([...players[0], ...fullBoard]);
          // draw opponents
          const oppRanks = [];
          const tempDeck = [...createDeckExcluding(knownArray)];
          for (let oi=0; oi<numOpponents; oi++) {
            const c1 = tempDeck.pop(); const c2 = tempDeck.pop();
            oppRanks.push(evaluate7([c1,c2,...fullBoard]));
          }
          const ranks = [heroRank, ...oppRanks];
          const maxRank = Math.max(...ranks);
          const winners = ranks.reduce((acc,r,idx)=>{ if (r===maxRank) acc.push(idx); return acc;}, []);
          if (winners.length===1) {
            if (winners[0]===0) wins++; else losses++;
          } else {
            if (winners.includes(0)) ties++; else losses++;
          }
        } else {
          const ranks = players.map(h=> evaluate7([...h, ...fullBoard]));
          const maxRank = Math.max(...ranks);
          const winners = ranks.reduce((acc,r,idx)=>{ if (r===maxRank) acc.push(idx); return acc;}, []);
          if (winners.length===1) wins+= (winners[0]===0?1:0);
          if (winners.length>1) winners.forEach(w=>{ if (w===0) ties++; });
          // Note: for non-hero mode we only increment counts for player 0 semantics in this worker.
        }
        total++;
      }
      // progress
      const progress = Math.min(1, total / iterations);
      self.postMessage({ type: 'progress', id, progress, interim: { wins, ties, total } });
    }

    // build results for player 0 (hero)
    const equity = (wins + ties*0.5) / total * 100;
    const result = { method: 'worker_monte_carlo', iterations: total, results: [{ equity, wins, ties, samples: total }] };
    self.postMessage({ type: 'result', id, result });
  } catch (err) {
    self.postMessage({ type: 'error', id, error: String(err) });
  }
});

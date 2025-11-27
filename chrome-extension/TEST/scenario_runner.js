const fs = require('fs');
const path = require('path');

// Minimal sandbox for running the in-page evaluator in Node
global.window = {};
global.window.PokerEyeCards = {
  normalizeHand: (h) => Array.isArray(h) ? h.map(c => c.replace(/10/, 'T')) : h,
  normalizeBoard: (b) => Array.isArray(b) ? b.map(c => c.replace(/10/, 'T')) : b,
  handToRangeFormat: (hand) => {
    if (!Array.isArray(hand) || hand.length !== 2) return null;
    const r1 = hand[0].replace(/10/, 'T').slice(0, -1);
    const r2 = hand[1].replace(/10/, 'T').slice(0, -1);
    const s1 = hand[0].slice(-1), s2 = hand[1].slice(-1);
    const sortOrder = 'AKQJT98765432';
    const sorted = [r1, r2].sort((a,b)=> sortOrder.indexOf(a) - sortOrder.indexOf(b));
    const suffix = (r1 === r2) ? '' : (s1 === s2 ? 's' : 'o');
    return `${sorted[0]}${sorted[1]}${suffix}`;
  }
};

// Fake VillainProfiler (used by evaluator)
global.VillainProfiler = {
  analyzeVillain: (v) => ({ aggressionFreq: (v && v.aggression) || 0.25, isTight: !!v.isTight, isAggressive: !!v.isAggressive })
};

// Multiway factors used by evaluator
global.MULTIWAY_MODE_FACTOR = { conservative: 0.85, normal: 1.0, aggressive: 1.15 };
global.MULTIWAY_RESPOND_MODE = 'normal';
global.BOARD_RESPOND_FACTOR = { dry: 0.75, medium: 1.0, wet: 1.2, very_wet: 1.3, paired: 1.1, highly_connected: 1.2 };

// Mirror globals onto window so evaluator's window.* lookups succeed in the Node sandbox
try {
  window.VillainProfiler = global.VillainProfiler;
  window.MULTIWAY_MODE_FACTOR = global.MULTIWAY_MODE_FACTOR;
  window.MULTIWAY_RESPOND_MODE = global.MULTIWAY_RESPOND_MODE;
  window.BOARD_RESPOND_FACTOR = global.BOARD_RESPOND_FACTOR;
} catch (e) {}

// Minimal EquityCalculator stub used by evaluator.computeEquity
global.EquityCalculator = {
  _getPreflopEquityFromTable: (handKey, numOpponents) => {
    const map = { AA: 85, KK: 82, AKs: 67, AKo: 65, T9s: 43, QJs: 51 };
    return map[handKey] || null;
  },
  getSmartEquity: async (heroHand, board, numOpponents) => {
    // Simple deterministic heuristic for tests
    const hk = global.window.PokerEyeCards.handToRangeFormat(heroHand) || 'XX';
    const map = { AA: 85, KK: 82, AKs: 67, AKo: 65, T9s: 43, QJs: 51, '72o': 15 };
    let base = map[hk] || 40;
    if (board && board.length >= 3) base = Math.max(10, base - numOpponents * 6);
    return { equity: base, winPct: base, tiePct: 0, lossPct: 100 - base, method: 'fake' };
  }
};

// Expose EquityCalculator on window as well so evaluator can find it
try { window.EquityCalculator = global.EquityCalculator; } catch (e) {}

// Read evaluator.js (strip code fence if present) and eval it to populate window.PokerEyeEvaluator
const evaluatorPath = path.join(__dirname, '..', 'evaluator.js');
let code = fs.readFileSync(evaluatorPath, 'utf8');
code = code.replace(/^```(?:\w+)?\n/, '').replace(/\n```$/, '');
try {
  eval(code);
  console.log('Loaded PokerEyeEvaluator.');
} catch (e) {
  console.error('Failed to load evaluator.js', e);
  process.exit(1);
}

if (!window.PokerEyeEvaluator || typeof window.PokerEyeEvaluator.getRecommendation !== 'function') {
  console.error('Evaluator not available after eval.');
  process.exit(1);
}

// Scenario generator - expanded with advanced spots (3-bet, all-in, bluff, multiway)
const scenarios = [
  {
    name: 'Preflop HU: AKs vs 1',
    hero: ['Ah','Kh'],
    board: [],
    players: [{ name: 'Villain1', isHero: false }],
    potSize: 2, toCall: 1, raiseSize: 3
  },
  {
    name: 'Preflop 3-way: QQ (3-bet spot)',
    hero: ['Qh','Qs'],
    board: [],
    players: [{name:'Opener'},{name:'3bettor'}],
    potSize: 6, toCall: 4, raiseSize: 12, // simulate facing a 3-bet
    meta: { preflopStage: '3bet' }
  },
  {
    name: 'Preflop multiway: 5 players at table (loose)',
    hero: ['Kh','Kd'],
    board: [],
    players: [{n:'p1'},{n:'p2'},{n:'p3'},{n:'p4'}],
    potSize: 4, toCall: 1.5, raiseSize: 6
  },
  {
    name: 'Flop dry pair: Hero has top pair',
    hero: ['Ah','Kh'],
    board: ['Ad','7c','2s'],
    players: [{name:'V1'},{name:'V2'},{name:'V3'}],
    potSize: 10, toCall: 2, raiseSize: 6
  },
  {
    name: 'Flop wet: many draws (bluff opportunity)',
    hero: ['Th','9h'],
    board: ['Jh','8h','2d'],
    players: [{name:'V1'},{name:'V2'}],
    potSize: 12, toCall: 3, raiseSize: 8,
    meta: { bluffSpot: true }
  },
  {
    name: 'Turn: low equity but possible river outs (all-in conceivable)',
    hero: ['7h','6h'],
    board: ['2h','3h','Kc','9s'],
    players: [{name:'V1'}],
    potSize: 20, toCall: 5, raiseSize: 15,
    meta: { canAllIn: true }
  },
  {
    name: 'River: hero huge stack (all-in / value)',
    hero: ['As','Ad'],
    board: ['Ah','Ac','Kc','Qc','2d'],
    players: [{name:'V1'},{name:'V2'}],
    potSize: 50, toCall: 20, raiseSize: 100,
    meta: { stackHero: 500 }
  },
  {
    name: 'Multiway wet flop: 4 villains (complex fold-equity)',
    hero: ['9h','9d'],
    board: ['Jh','Th','8s'],
    players: [{n:'a'},{n:'b'},{n:'c'},{n:'d'}],
    potSize: 8, toCall: 2, raiseSize: 10
  }
];

(async () => {
  for (const s of scenarios) {
    console.log('\n=== Scenario:', s.name, '===');
    try {
      const rec = await window.PokerEyeEvaluator.getRecommendation({
        heroHand: s.hero,
        board: s.board,
        players: s.players,
        potSize: s.potSize,
        toCall: s.toCall,
        raiseSize: s.raiseSize,
        context: { iterations: 500 }
      });
      console.log('Result meta:', rec.meta || rec.method || {});
      console.log('Actions:');
      // Enrich display: label raise as 3-bet or All-In heuristically
      for (const a of rec.actions) {
        const prob = (a.prob || a.percentage || 0);
        const ev = (a.ev || a.e || 0);
        let label = a.action || a.actionName || '';

        // Heuristic: if raiseSize >= stackHero (meta) -> All-In
        if (s.meta && s.meta.stackHero && (s.raiseSize || 0) >= s.meta.stackHero) label = 'All-In';

        // Heuristic: if scenario marked preflop 3bet and action is Raise with large raiseSize -> 3-Bet
        if (s.meta && s.meta.preflopStage === '3bet' && /raise/i.test(label) && s.raiseSize >= (s.potSize * 1.5)) label = '3-Bet';

        // Heuristic: bluff spot -> if Raise probability high but EV small -> label Bluff
        if (s.meta && s.meta.bluffSpot && /raise/i.test(label) && Math.abs(ev) < 1 && prob > 0.25) label = 'Bluff-Raise';

        console.log(` - ${label}: prob=${prob.toFixed(3)}, ev=${ev.toFixed(2)}`);
      }
    } catch (e) {
      console.error('Scenario failed', e);
    }
  }
})();

Test scenarios for PokerEye unified evaluator

This folder contains a simple Node.js script to run scenario tests locally by loading the `evaluator.js` code into a small sandbox and calling `window.PokerEyeEvaluator.getRecommendation`.

How to run (PowerShell):

```powershell
# From the repository root
cd chrome-extension/TEST
node .\scenario_runner.js
```

Notes:
- The test runner uses light stubs for `EquityCalculator` and `PokerEyeCards` so it runs in Node without browser APIs.
- The goal is to validate recommended actions across a variety of scenarios (preflop/postflop, different board textures and opponent counts).
- The evaluator used here is the in-repo `chrome-extension/evaluator.js`. The script strips Markdown-style code fences if present in that file before evaluating it.
- This is a local developer tool; results are deterministic according to the stubbed equity heuristics.
 
Puppeteer runner
-----------------

There's also a headless browser runner `puppeteer_runner.js` that injects the `evaluator.js` into a Chromium page and provides an in-page Monte Carlo equity helper. To use it you'll need to install puppeteer first:

```powershell
cd chrome-extension/TEST
npm install puppeteer
node .\puppeteer_runner.js
```

This runner gives more realistic equities because it runs a Monte Carlo sampling inside the browser context. It's a lightweight scaffold — if you want the full extension environment loaded into Puppeteer (and to use exact PokerSolver solves / workers), I can extend this script to load the extension files or spawn a real browser with the extension installed.

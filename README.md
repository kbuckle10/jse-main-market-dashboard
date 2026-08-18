# JSE Main Market Equity Research & Buy-Zone Tracker

Private dark-mode SPA for the JSE Main Market research workflow.

## Data hierarchy

1. Official Jamaica Stock Exchange (JSE): latest completed closing price, last traded price and official announcements.
2. Company/JSE financial statements: authoritative company fundamentals.
3. StockAnalysis JMSE: historical trends, financial metrics and secondary fundamental data.

A delayed StockAnalysis quote must never override a newer completed official JSE closing price.

## Valuation calculations

Price-dependent ratios are recalculated using the latest completed official JSE close whenever the underlying financial input is available:

- EPS = attributable net income / weighted-average ordinary shares
- P/E = latest completed JSE close / EPS
- BVPS = ordinary shareholders' equity / ordinary shares outstanding
- P/B = latest completed JSE close / BVPS
- ROE = attributable net income / average ordinary shareholders' equity
- Dividend yield = trailing DPS / latest completed JSE close

P/B must be interpreted together with ROE, especially for banks, insurers and investment companies.

## Opportunity Score / 100

- Valuation: 25
- Business quality: 20
- Earnings/growth: 20
- Financial strength: 15
- Dividend quality: 10
- Momentum/catalysts: 10

Momentum cannot by itself make an expensive stock a Strong Buy.

## Weekly workflow

Every Saturday analysis should use Friday's completed JSE close, compare against the prior snapshot, and highlight only material changes: rating changes, Buy Zone entries/exits, >=5% weekly moves, major earnings/dividend/corporate announcements, Top-10 ranking changes and recommended portfolio-allocation changes.

The SPA reads `data.json` at runtime. Each completed weekly dataset should also be archived under `history/YYYY-MM-DD.json`.

## Files

- `index.html` — responsive SPA
- `data.json` — latest research dataset
- `history/` — weekly snapshots

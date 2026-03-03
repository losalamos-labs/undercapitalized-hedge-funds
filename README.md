# MarketSim 📈

A full-stack virtual investment simulator — like Investopedia's Stock Simulator, but supporting **any global asset**. Practice investing with $100,000 virtual cash, zero risk.

## Features

- **$100,000 virtual cash** — no real money involved
- **Global stocks** — any Yahoo Finance ticker (AAPL, TSLA, 7203.T, VOW3.DE, RELIANCE.NS, etc.)
- **ETFs** — SPY, QQQ, VUSA.L, ARKK, and more
- **Crypto** — BTC, ETH, SOL, and thousands more via CoinGecko
- **Forex** — EURUSD=X, GBPJPY=X, and any currency pair
- **Commodities** — Gold (GC=F), Oil (CL=F), Silver (SI=F), and more
- **Interactive charts** — 1D / 1W / 1M / 3M / 1Y with Recharts
- **Portfolio tracking** — live P&L, sparklines, holdings table
- **Transaction history** — full trade log with filtering
- **Leaderboard** — compete with other simulated portfolios
- **Dark theme** — easy on the eyes

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **better-sqlite3** for local SQLite database
- **yahoo-finance2** for stocks, ETFs, forex, commodities
- **CoinGecko API** (free, no key) for crypto
- **Recharts** for charts

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first visit, enter a display name to create your portfolio with $100,000 virtual cash.

## Building for Production

```bash
npm run build
npm start
```

## Asset Coverage

| Asset Class | Source | Example Symbols |
|-------------|--------|-----------------|
| US Stocks | Yahoo Finance | AAPL, TSLA, MSFT, NVDA |
| International Stocks | Yahoo Finance | 7203.T (Toyota), VOW3.DE (VW), RELIANCE.NS |
| ETFs | Yahoo Finance | SPY, QQQ, VUSA.L, ARKK |
| Crypto | CoinGecko | bitcoin, ethereum, solana, dogecoin |
| Forex | Yahoo Finance | EURUSD=X, GBPJPY=X, USDJPY=X |
| Commodities | Yahoo Finance | GC=F (Gold), CL=F (Crude Oil), SI=F (Silver) |

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/quote?symbol=AAPL&type=stock` | Get current price |
| `GET /api/search?q=apple` | Search assets |
| `GET /api/chart?symbol=AAPL&type=stock&range=1mo` | Price history |
| `GET /api/portfolio?id=xxx` | Get portfolio data |
| `POST /api/portfolio` | Create portfolio |
| `POST /api/trade` | Execute a trade |
| `GET /api/leaderboard` | All portfolios ranked |
| `GET /api/history?portfolioId=xxx` | Transaction history |

## API Limitations

- **Yahoo Finance**: Unofficial API — may rate-limit with heavy usage. Quotes are cached for 60 seconds.
- **CoinGecko**: Free tier has rate limits (~30 req/min). Chart data cached for 5 minutes.
- **Price delays**: Yahoo Finance data may have 15-minute delays for some markets.
- **Crypto symbols**: Use CoinGecko IDs (e.g., `bitcoin`, `ethereum`, `solana`) not ticker symbols.

## Database

SQLite database stored at `./data/marketsim.db`. Portfolios identified by UUID stored in browser localStorage.

## License

MIT

# Undercapitalized Hedge Funds 🐖💸

A full‑stack paper‑trading simulator for people who want the **hedge fund fantasy** without the hedge fund capital.

Run your own tiny fund with **$100,000 of pretend AUM**, trade **global stocks/ETFs/forex/commodities** (Yahoo Finance) and **crypto** (CoinGecko), track P&L, and climb the leaderboard.

## Features

- **Secure login** (NextAuth credentials)
- **$100,000 starting cash** per fund
- **Global assets**
  - Stocks / ETFs: `AAPL`, `7203.T`, `VOW3.DE`, `RELIANCE.NS`, `VUSA.L`
  - Forex: `EURUSD=X`, `USDJPY=X`
  - Commodities: `GC=F` (Gold), `CL=F` (Crude Oil), `SI=F` (Silver)
  - Crypto (CoinGecko IDs): `bitcoin`, `ethereum`, `solana`
- **Charts** (1D / 1W / 1M / 3M / 1Y)
- **Portfolio dashboard** with live valuations + sparklines
- **Trade history** + filters
- **Leaderboard** using live prices, cached server‑side (default: 15 min)

## Tech Stack

- **Next.js 14** (App Router + TypeScript)
- **Tailwind CSS**
- **PostgreSQL** (`pg`)
- **NextAuth** (credentials + bcrypt)
- **yahoo-finance2** (stocks/ETFs/forex/commodities)
- **CoinGecko API** (crypto)
- **Recharts** (charts)

## Local Development

1) Install deps
```bash
npm install
```

2) Set env vars
```bash
cp .env.example .env.local
# Set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

3) Run
```bash
npm run dev
```

Open http://localhost:3000

> Tables are created automatically on first API usage (`initDb()`).

### Postgres via Docker (quick start)
```bash
docker run -d --name uhf-pg \
  -e POSTGRES_DB=undercapitalized_hedge_funds \
  -e POSTGRES_USER=uhf \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 postgres:16

# .env.local
# DATABASE_URL=postgresql://uhf:secret@localhost:5432/undercapitalized_hedge_funds
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`

## API Notes / Limitations

- **Yahoo Finance** is unofficial; expect occasional rate limiting or partial data. Quotes are cached briefly.
- **CoinGecko** free tier is rate‑limited (~30 req/min). Crypto uses **CoinGecko IDs** (e.g. `bitcoin`).
- Some exchanges have delayed quotes.

## License

MIT — see `LICENSE`.

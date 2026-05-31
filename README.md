# 🏦 bitcoio · DeFi Trading Dashboard

Dashboard premium para trading DeFi na **Stacks Blockchain** — preços live via **Bitflow**, wallet integrada, swap execution, P&L tracking, e alertas no **Telegram**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Framer](https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer)
![Stacks](https://img.shields.io/badge/Stacks-Bitcoin_L2-5546FF?logo=stacks)

---

## ✨ Features

- 🔐 **Wallet integrada** — unlock/lock com keystore AES-256-GCM
- 📊 **Preços live** — DOG, sBTC, STX via Bitflow Swap Aggregator (async, não-blocante)
- 🛒 **Buy & Sell** — execução real de swaps on-chain com confirmação
- 📈 **P&L tracking** — lucro/prejuízo calculado com preço de venda real
- 🎨 **UX premium** — animações Framer Motion, glassmorphism, modo escuro
- 📱 **App-like** — zoom bloqueado, header fixo, scroll nativo
- 📟 **Ticker banner** — rolagem infinita com variação de preços e volatilidade
- 🔔 **Alertas Telegram** — lucro ≥3%, alta volatilidade ≥5%, resumo a cada 4h
- ⏳ **Transações pendentes** — barra de status no rodapé
- 🎉 **Confetes** — celebração visual ao concluir trades

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/ghpo2k/bitcoio-dashboard.git
cd bi***

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your Bitflow endpoints and Telegram bot token

# 4. Ensure Bun is installed (for Bitflow CLI)
# https://bun.sh

# 5. Ensure Bitflow swap-aggregator is available
# Clone aibtcdev/skills into ~/.openclaw/workspace/.agents/

# 6. Ensure wallet keystore is at ~/.aibtc/wallets/

# 7. Build & Run (production)
npm run build
npm start -p 3002
```

## 🏗️ Architecture

```
app/
  page.tsx          → Server Component (force-dynamic)
  dashboard.tsx      → Client Component (full UI)
  layout.tsx         → Root layout + viewport config
  api/
    wallet/          → Unlock/Lock wallet
    trade/           → Buy/Sell via Bitflow (async exec)
    prices/          → Live prices (cached, parallel)
    quote/           → Real-time swap quotes
    balance/         → USDCx balance
    monitor/         → Telegram alert system
components/
  dashboard/
    header.tsx       → Wallet status, balance, unlock
    stats-bar.tsx    → Invested, Sold, P&L, Open
    trade-panel.tsx  → Token selector, buy card
    positions-panel.tsx → Open positions, sell modal
    history-panel.tsx   → Trade history table
    price-ticker.tsx    → Live price display
    ticker-banner.tsx   → Marquee with price changes
    pending-bar.tsx     → Transaction status footer
    confetti.tsx        → Celebration animation
  ui/
    button.tsx, card.tsx, modal.tsx, skeleton.tsx
providers/
  dashboard-provider.tsx → Central state (useReducer)
  pending-provider.tsx   → Pending transactions
lib/
  bitflow-price.ts   → Price client (async, cached)
  telegram.ts        → Bot messaging
  wallet-server.ts   → Keystore management
  db.ts              → SQLite positions DB
  utils.ts           → Formatting helpers
```

## 🛠️ Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Animations | Framer Motion 12 |
| Language | TypeScript 5 |
| Blockchain | Stacks (via Bitflow SDK) |
| Wallet | @stacks/wallet-sdk + AES-256-GCM |
| DB | better-sqlite3 |
| Alerts | Telegram Bot API |
| Swap Engine | Bitflow Swap Aggregator CLI (Bun) |

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/prices` | GET | Live prices for DOG, sBTC, STX |
| `/api/trade` | GET | Get all positions |
| `/api/trade` | POST | Execute buy/sell swap |
| `/api/quote` | GET | Real-time swap quote |
| `/api/wallet` | POST | Unlock/lock wallet |
| `/api/balance` | GET | USDCx balance |
| `/api/monitor` | GET | Profit monitor + Telegram alerts |
| `/api/monitor` | POST | Full position summary |

## 🔔 Telegram Alerts

Configure `.env.local`:
```
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

Cron jobs (optional):
```bash
# Profit check every 5 min
*/5 * * * * curl http://localhost:3002/api/monitor

# Full summary every 4 hours  
0 */4 * * * curl -X POST http://localhost:3002/api/monitor
```

## 📄 License

MIT

---

Built with ❤️ for the **Bitflow** and **AIBTC** community.
